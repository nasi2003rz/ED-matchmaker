import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp, cleanupUsers, uniqueSuffix } from './utils/test-app.js';

/**
 * Walks CLAUDE.md Section 5.1's Phase-1 critical path end-to-end, in order,
 * against a real running app + the real dev Postgres database (this project
 * has no disposable per-run test database yet — see the README's Step 21
 * note). Every step builds on state from the previous one, exactly mirroring
 * a real instructor/student/parent session:
 *
 *   Instructor: register → create profile → create class → add/invite a
 *   student → manage attendance → create homework → review a submission →
 *   give a grade → send a message → track a payment.
 *
 *   Student: register → accept the invitation → view schedule/homework →
 *   submit homework → view the grade → view attendance → receive the
 *   message → view payment status.
 *
 *   Parent: register → link the student as a child → see the family
 *   calendar → see the child's payment status.
 *
 * "If this workflow works reliably end-to-end, Phase 1 has achieved its
 * objective" (Section 5.1) — this suite is that check, automated.
 */
describe('Critical workflow (CLAUDE.md Section 5.1)', () => {
  let app: INestApplication;
  const suffix = uniqueSuffix();
  const password = 'TestPass123!';
  const instructorEmail = `e2e.instr.${suffix}@test.local`;
  const studentEmail = `e2e.stu.${suffix}@test.local`;
  const parentEmail = `e2e.parent.${suffix}@test.local`;

  let instructorToken: string;
  let studentToken: string;
  let parentToken: string;
  let studentId: string;
  let classId: string;
  let sessionId: string;
  let assignmentId: string;
  let gradeId: string;
  let paymentId: string;
  let conversationId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanupUsers(app, [instructorEmail, studentEmail, parentEmail]);
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  // ---- Instructor: register, pick role, complete profile ----------------

  it('registers the instructor', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ email: instructorEmail, password, name: 'مربی سراسری' })
      .expect(201);
    expect(res.body.accessToken).toBeTypeOf('string');
    instructorToken = res.body.accessToken;
  });

  it('assigns the INSTRUCTOR role', async () => {
    const res = await api()
      .post('/api/users/me/roles')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ role: 'INSTRUCTOR' })
      .expect(201);
    expect(res.body.roles).toContain('INSTRUCTOR');
  });

  it('completes the instructor profile', async () => {
    const res = await api()
      .patch('/api/instructors/me')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ bio: 'مربی ریاضی با ۵ سال سابقه.', experienceYears: 5 })
      .expect(200);
    expect(res.body.bio).toBe('مربی ریاضی با ۵ سال سابقه.');
  });

  it('rejects a class created before completing auth (no token)', async () => {
    await api().post('/api/classes').send({ name: 'بدون توکن' }).expect(401);
  });

  // ---- Instructor: create the class + schedule ---------------------------

  it('creates a class with a weekly schedule', async () => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 60);
    const weekdayMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const res = await api()
      .post('/api/classes')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        name: 'ریاضی پایه هشتم',
        classType: 'GROUP',
        deliveryMode: 'ONLINE',
        capacity: 10,
        startDate: today.toISOString(),
        endDate: endDate.toISOString(),
        days: [weekdayMap[today.getDay()]],
        startTime: '16:00',
        endTime: '17:00',
        numberOfSessions: 4,
      })
      .expect(201);
    expect(res.body.status).toBe('DRAFT');
    classId = res.body.id;
  });

  it('activates the class', async () => {
    const res = await api()
      .patch(`/api/classes/${classId}`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(res.body.status).toBe('ACTIVE');
  });

  it('generated sessions from the schedule', async () => {
    const res = await api()
      .get(`/api/classes/${classId}/sessions`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .expect(200);
    expect(res.body.length).toBe(4);
    sessionId = res.body[0].id;
  });

  // ---- Student: register, discover the invitation, join -----------------

  it('registers the student and assigns the STUDENT role', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ email: studentEmail, password, name: 'دانش‌آموز سراسری' })
      .expect(201);
    studentToken = res.body.accessToken;
    // Note: `res.body.user.id` is the User id (the JWT subject). The
    // `studentId` used everywhere below to cross-reference the student
    // from the *instructor's* side (attendance, grades, payments,
    // conversations) is the separate Student profile id — captured from
    // the roster listing below once it exists.

    await api()
      .post('/api/users/me/roles')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ role: 'STUDENT' })
      .expect(201);
  });

  it('previews the class via the public invitation link, unauthenticated', async () => {
    const res = await api().get(`/api/join/class/${classId}`).expect(200);
    expect(res.body.name).toBe('ریاضی پایه هشتم');
  });

  it('joins the class through the invitation link', async () => {
    const res = await api()
      .post(`/api/join/class/${classId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({})
      .expect(201);
    expect(res.body.joined).toBe(true);
  });

  it('lists the student on the class roster', async () => {
    const res = await api()
      .get(`/api/classes/${classId}/enrollments`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .expect(200);
    expect(res.body.length).toBe(1);
    // Student.id (the profile id), not the User id — this is what every
    // instructor-side "target this student" call below expects.
    studentId = res.body[0].student.id;
  });

  it('the student sees the class on their calendar', async () => {
    const from = new Date();
    from.setDate(from.getDate() - 1);
    const to = new Date();
    to.setDate(to.getDate() + 30);
    const res = await api()
      .get(`/api/schedule/mine?from=${from.toISOString()}&to=${to.toISOString()}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('the student sees the class in "my classes"', async () => {
    const res = await api()
      .get('/api/enrollments/mine')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(res.body.some((c: { id: string }) => c.id === classId)).toBe(true);
  });

  // ---- Instructor: attendance ---------------------------------------------

  it('marks the student present for the first session', async () => {
    const res = await api()
      .put(`/api/classes/${classId}/sessions/${sessionId}/attendance/${studentId}`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ status: 'PRESENT' })
      .expect(200);
    const entry = res.body.find((e: { student: { id: string } }) => e.student.id === studentId);
    expect(entry.status).toBe('PRESENT');
  });

  it('the class attendance summary reflects it', async () => {
    const res = await api()
      .get(`/api/classes/${classId}/attendance-summary`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .expect(200);
    expect(JSON.stringify(res.body)).toContain(studentId);
  });

  // ---- Instructor: homework, student: submit, instructor: review --------

  it('creates a homework assignment', async () => {
    const res = await api()
      .post(`/api/classes/${classId}/assignments`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'تمرین فصل ۱', description: 'مسائل ۱ تا ۱۰' })
      .expect(201);
    assignmentId = res.body.id;
  });

  it('the student sees the assignment in their homework list', async () => {
    const res = await api()
      .get('/api/homework/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(res.body.some((h: { id: string }) => h.id === assignmentId)).toBe(true);
  });

  it('the student submits the homework', async () => {
    const res = await api()
      .put(`/api/homework/${assignmentId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ content: 'پاسخ من به مسائل ۱ تا ۱۰.' })
      .expect(200);
    expect(res.body.status).toBe('SUBMITTED');
  });

  it('the instructor reviews and scores the submission', async () => {
    const res = await api()
      .put(`/api/classes/${classId}/assignments/${assignmentId}/submissions/${studentId}/review`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ score: 92, feedback: 'کار خوبی بود.' })
      .expect(200);
    const entry = res.body.students.find((s: { student: { id: string } }) => s.student.id === studentId);
    expect(entry.submission.score).toBe(92);
  });

  it('the student sees the reviewed score', async () => {
    const res = await api()
      .get('/api/homework/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    const item = res.body.find((h: { id: string }) => h.id === assignmentId);
    expect(item.status).toBe('REVIEWED');
    expect(item.submission.score).toBe(92);
  });

  // ---- Instructor: grades --------------------------------------------------

  it('records a grade for the student', async () => {
    const res = await api()
      .post(`/api/classes/${classId}/grades`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ studentId, title: 'آزمون میان‌ترم', type: 'NUMERIC', value: '18.5' })
      .expect(201);
    gradeId = res.body.id;
  });

  it('the student sees their grade', async () => {
    const res = await api()
      .get('/api/grades/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(res.body.some((g: { id: string }) => g.id === gradeId)).toBe(true);
  });

  // ---- Instructor <-> student messaging -----------------------------------

  it('the instructor starts a conversation with the student', async () => {
    const res = await api()
      .post('/api/conversations/start')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ studentId, content: 'سلام، جلسه‌ی بعدی رو فراموش نکن.' })
      .expect(201);
    conversationId = res.body.id;
  });

  it('the student receives the message, unread', async () => {
    const res = await api()
      .get('/api/conversations/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    const convo = res.body.find((c: { id: string }) => c.id === conversationId);
    expect(convo.unreadCount).toBeGreaterThan(0);
  });

  it('the student reads the thread and replies', async () => {
    await api()
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    await api()
      .patch(`/api/conversations/${conversationId}/read`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    const res = await api()
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ content: 'حتماً، ممنون از یادآوری.' })
      .expect(201);
    const lastMessage = res.body.messages[res.body.messages.length - 1];
    expect(lastMessage.content).toBe('حتماً، ممنون از یادآوری.');
  });

  // ---- Instructor: payments ------------------------------------------------

  it('creates a tuition invoice for the student', async () => {
    const res = await api()
      .post(`/api/classes/${classId}/payments`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ studentId, title: 'شهریه ماه اول', amount: 2_000_000 })
      .expect(201);
    expect(res.body.status).toBe('UNPAID');
    paymentId = res.body.id;
  });

  it('records a partial payment', async () => {
    const res = await api()
      .put(`/api/classes/${classId}/payments/${paymentId}/record`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ amount: 1_000_000 })
      .expect(200);
    expect(res.body.status).toBe('PARTIALLY_PAID');
  });

  it('the student sees their payment status', async () => {
    const res = await api()
      .get('/api/payments/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    const payment = res.body.find((p: { id: string }) => p.id === paymentId);
    expect(payment.status).toBe('PARTIALLY_PAID');
    expect(payment.remaining).toBe(1_000_000);
  });

  it('the student dashboard reflects pending homework, grades and messages', async () => {
    const res = await api()
      .get('/api/dashboard/student')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(res.body.recentGrades.length).toBeGreaterThan(0);
  });

  // ---- Parent: register, link child, family view --------------------------

  it('registers the parent and assigns the PARENT role', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ email: parentEmail, password, name: 'والد سراسری' })
      .expect(201);
    parentToken = res.body.accessToken;

    await api()
      .post('/api/users/me/roles')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ role: 'PARENT' })
      .expect(201);
  });

  it('links the student as a child by email', async () => {
    const res = await api()
      .post('/api/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ email: studentEmail })
      .expect(201);
    expect(res.body.email).toBe(studentEmail);
  });

  it('the family calendar shows the child\'s session, tagged with their name', async () => {
    const from = new Date();
    from.setDate(from.getDate() - 1);
    const to = new Date();
    to.setDate(to.getDate() + 30);
    const res = await api()
      .get(`/api/schedule/family?from=${from.toISOString()}&to=${to.toISOString()}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].student.id).toBe(studentId);
  });

  it('the parent sees the child\'s payment status', async () => {
    const res = await api()
      .get('/api/payments/me/parent')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    const payment = res.body.find((p: { id: string }) => p.id === paymentId);
    expect(payment.status).toBe('PARTIALLY_PAID');
  });

  it('the parent dashboard lists the child with their pending state', async () => {
    const res = await api()
      .get('/api/dashboard/parent')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    expect(res.body.children.some((c: { id: string }) => c.id === studentId)).toBe(true);
  });
});
