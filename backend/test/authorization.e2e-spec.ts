import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp, cleanupUsers, uniqueSuffix } from './utils/test-app.js';

/**
 * CLAUDE.md Section 9 is non-negotiable: "Every multi-tenant resource must
 * be authorization-checked server-side, never trust client-side role
 * checks alone." This suite tries the cross-tenant access this repo's
 * services are supposed to reject — a second, unrelated instructor
 * reaching into the first instructor's class; a student who never
 * enrolled reaching an assignment; an unrelated party reaching a
 * conversation they're not in; role-gated routes hit with the wrong role
 * or no auth at all — and asserts every one of them is refused.
 */
describe('Authorization boundaries (CLAUDE.md Section 9)', () => {
  let app: INestApplication;
  const suffix = uniqueSuffix();
  const password = 'TestPass123!';

  const instructorAEmail = `e2e.authz.instrA.${suffix}@test.local`;
  const instructorBEmail = `e2e.authz.instrB.${suffix}@test.local`;
  const studentAEmail = `e2e.authz.stuA.${suffix}@test.local`;
  const studentBEmail = `e2e.authz.stuB.${suffix}@test.local`;

  let instructorAToken: string;
  let instructorBToken: string;
  let studentAToken: string;
  let studentBToken: string;
  let studentAId: string;

  let classId: string;
  let assignmentId: string;
  let conversationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const api = () => request(app.getHttpServer());

    async function registerWithRole(email: string, name: string, role: string) {
      const res = await api()
        .post('/api/auth/register')
        .send({ email, password, name })
        .expect(201);
      await api()
        .post('/api/users/me/roles')
        .set('Authorization', `Bearer ${res.body.accessToken}`)
        .send({ role })
        .expect(201);
      return { token: res.body.accessToken as string, userId: res.body.user.id as string };
    }

    instructorAToken = (await registerWithRole(instructorAEmail, 'مربی الف', 'INSTRUCTOR')).token;
    instructorBToken = (await registerWithRole(instructorBEmail, 'مربی ب', 'INSTRUCTOR')).token;
    const studentA = await registerWithRole(studentAEmail, 'دانش‌آموز الف', 'STUDENT');
    studentAToken = studentA.token;
    studentBToken = (await registerWithRole(studentBEmail, 'دانش‌آموز ب', 'STUDENT')).token;

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 60);
    const weekdayMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const classRes = await api()
      .post('/api/classes')
      .set('Authorization', `Bearer ${instructorAToken}`)
      .send({
        name: 'کلاس محرمانه مربی الف',
        classType: 'GROUP',
        startDate: today.toISOString(),
        endDate: endDate.toISOString(),
        days: [weekdayMap[today.getDay()]],
        startTime: '16:00',
        endTime: '17:00',
        numberOfSessions: 1,
      })
      .expect(201);
    classId = classRes.body.id;

    await api()
      .post(`/api/join/class/${classId}`)
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({})
      .expect(201);

    // Student.id (the profile id) — not the User id — is what every
    // instructor-side "target this student" call below expects.
    const rosterRes = await api()
      .get(`/api/classes/${classId}/enrollments`)
      .set('Authorization', `Bearer ${instructorAToken}`)
      .expect(200);
    studentAId = rosterRes.body[0].student.id;

    const assignmentRes = await api()
      .post(`/api/classes/${classId}/assignments`)
      .set('Authorization', `Bearer ${instructorAToken}`)
      .send({ title: 'تکلیف محرمانه' })
      .expect(201);
    assignmentId = assignmentRes.body.id;

    const convoRes = await api()
      .post('/api/conversations/start')
      .set('Authorization', `Bearer ${instructorAToken}`)
      .send({ studentId: studentAId, content: 'سلام' })
      .expect(201);
    conversationId = convoRes.body.id;
  });

  afterAll(async () => {
    await cleanupUsers(app, [
      instructorAEmail,
      instructorBEmail,
      studentAEmail,
      studentBEmail,
    ]);
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  it('rejects every request with no Authorization header (401)', async () => {
    await api().get(`/api/classes/${classId}`).expect(401);
    await api().get('/api/homework/me').expect(401);
    await api().get('/api/dashboard/student').expect(401);
  });

  it('rejects a role-gated route hit with the wrong role (403)', async () => {
    // /api/classes is INSTRUCTOR-only — a student must be refused, not
    // silently scoped to "no results".
    await api()
      .post('/api/classes')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({ name: 'نباید ساخته شود' })
      .expect(403);
  });

  it("instructor B cannot read instructor A's class", async () => {
    await api()
      .get(`/api/classes/${classId}`)
      .set('Authorization', `Bearer ${instructorBToken}`)
      .expect(403);
  });

  it("instructor B cannot update instructor A's class", async () => {
    await api()
      .patch(`/api/classes/${classId}`)
      .set('Authorization', `Bearer ${instructorBToken}`)
      .send({ name: 'ربوده‌شده' })
      .expect(403);
  });

  it("instructor B cannot list instructor A's class roster", async () => {
    await api()
      .get(`/api/classes/${classId}/enrollments`)
      .set('Authorization', `Bearer ${instructorBToken}`)
      .expect(403);
  });

  it("instructor B cannot create a payment against instructor A's class", async () => {
    await api()
      .post(`/api/classes/${classId}/payments`)
      .set('Authorization', `Bearer ${instructorBToken}`)
      .send({ studentId: studentAId, title: 'نباید ساخته شود', amount: 1000 })
      .expect(403);
  });

  it("instructor B cannot grade a student in instructor A's class", async () => {
    await api()
      .post(`/api/classes/${classId}/grades`)
      .set('Authorization', `Bearer ${instructorBToken}`)
      .send({ studentId: studentAId, title: 'نباید ثبت شود', type: 'NUMERIC', value: '20' })
      .expect(403);
  });

  it('a student who never enrolled cannot submit to the assignment', async () => {
    await api()
      .put(`/api/homework/${assignmentId}/submit`)
      .set('Authorization', `Bearer ${studentBToken}`)
      .send({ content: 'نباید ثبت شود' })
      .expect(403);
  });

  it("student B's own homework list never includes student A's assignment", async () => {
    const res = await api()
      .get('/api/homework/me')
      .set('Authorization', `Bearer ${studentBToken}`)
      .expect(200);
    expect(res.body.some((h: { id: string }) => h.id === assignmentId)).toBe(false);
  });

  it('an unrelated student cannot read the conversation thread', async () => {
    await api()
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${studentBToken}`)
      .expect(403);
  });

  it('an unrelated instructor cannot read the conversation thread', async () => {
    await api()
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${instructorBToken}`)
      .expect(403);
  });

  it('an unrelated instructor cannot mark attendance in a class that is not theirs', async () => {
    const sessions = await api()
      .get(`/api/classes/${classId}/sessions`)
      .set('Authorization', `Bearer ${instructorAToken}`)
      .expect(200);
    await api()
      .put(
        `/api/classes/${classId}/sessions/${sessions.body[0].id}/attendance/${studentAId}`,
      )
      .set('Authorization', `Bearer ${instructorBToken}`)
      .send({ status: 'PRESENT' })
      .expect(403);
  });

  it('rejects an expired/garbage access token', async () => {
    await api()
      .get('/api/dashboard/student')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });
});
