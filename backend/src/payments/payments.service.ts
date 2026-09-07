import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdatePaymentDto } from './dto/update-payment.dto.js';

type PaymentStatus = 'PAID' | 'OVERDUE' | 'PARTIALLY_PAID' | 'UNPAID';

function deriveStatus(amount: number, paidAmount: number, dueDate: Date | null): PaymentStatus {
  if (paidAmount >= amount) return 'PAID';
  if (dueDate && dueDate < new Date()) return 'OVERDUE';
  if (paidAmount > 0) return 'PARTIALLY_PAID';
  return 'UNPAID';
}

function toDto(payment: {
  id: string;
  title: string;
  amount: number;
  dueDate: Date | null;
  paidAmount: number;
  createdAt: Date;
}) {
  return {
    id: payment.id,
    title: payment.title,
    amount: payment.amount,
    dueDate: payment.dueDate,
    paidAmount: payment.paidAmount,
    remaining: payment.amount - payment.paidAmount,
    status: deriveStatus(payment.amount, payment.paidAmount, payment.dueDate),
    createdAt: payment.createdAt,
  };
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getInstructorId(userId: string): Promise<string> {
    const instructor = await this.prisma.instructor.findUnique({ where: { userId } });
    if (!instructor) {
      throw new NotFoundException('پروفایل مربی یافت نشد.');
    }
    return instructor.id;
  }

  private async getOwnedClass(userId: string, classId: string) {
    const instructorId = await this.getInstructorId(userId);
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('کلاس یافت نشد.');
    if (klass.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }
    return klass;
  }

  private async getOwnedPayment(userId: string, classId: string, paymentId: string) {
    await this.getOwnedClass(userId, classId);
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.classId !== classId) {
      throw new NotFoundException('فیش پرداخت یافت نشد.');
    }
    return payment;
  }

  // ---- Instructor side ----

  async create(userId: string, classId: string, dto: CreatePaymentDto) {
    await this.getOwnedClass(userId, classId);
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { classId_studentId: { classId, studentId: dto.studentId } },
    });
    if (!enrollment || enrollment.status !== 'ACTIVE') {
      throw new BadRequestException('این دانش‌آموز در این کلاس ثبت‌نام نکرده است.');
    }

    const payment = await this.prisma.payment.create({
      data: {
        classId,
        studentId: dto.studentId,
        title: dto.title,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });
    return toDto(payment);
  }

  async update(userId: string, classId: string, paymentId: string, dto: UpdatePaymentDto) {
    const existing = await this.getOwnedPayment(userId, classId, paymentId);
    const nextAmount = dto.amount ?? existing.amount;
    if (existing.paidAmount > nextAmount) {
      throw new BadRequestException('مبلغ نمی‌تواند کمتر از مبلغ پرداخت‌شده باشد.');
    }

    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        title: dto.title,
        amount: dto.amount,
        dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
      },
    });
    return toDto(payment);
  }

  async remove(userId: string, classId: string, paymentId: string) {
    await this.getOwnedPayment(userId, classId, paymentId);
    await this.prisma.payment.delete({ where: { id: paymentId } });
    return { success: true };
  }

  async recordPayment(userId: string, classId: string, paymentId: string, amount: number) {
    const existing = await this.getOwnedPayment(userId, classId, paymentId);
    const nextPaidAmount = existing.paidAmount + amount;
    if (nextPaidAmount > existing.amount) {
      throw new BadRequestException('مبلغ پرداختی از باقیمانده‌ی این فیش بیشتر است.');
    }

    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { paidAmount: nextPaidAmount },
    });
    return toDto(payment);
  }

  async listForClass(userId: string, classId: string) {
    await this.getOwnedClass(userId, classId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId, status: 'ACTIVE' },
      include: { student: { include: { user: true } } },
      orderBy: { enrolledAt: 'asc' },
    });
    const payments = await this.prisma.payment.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
    });
    const byStudentId = new Map<string, typeof payments>();
    for (const p of payments) {
      const list = byStudentId.get(p.studentId) ?? [];
      list.push(p);
      byStudentId.set(p.studentId, list);
    }

    return enrollments.map((e) => ({
      student: { id: e.student.id, name: e.student.user.name, email: e.student.user.email },
      payments: (byStudentId.get(e.student.id) ?? []).map(toDto),
    }));
  }

  // ---- Student side ----

  async listMine(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException('پروفایل دانش‌آموز یافت نشد.');

    const payments = await this.prisma.payment.findMany({
      where: { studentId: student.id },
      include: { class: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => ({ ...toDto(p), class: p.class }));
  }

  async listForParent(userId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
      include: { children: { include: { user: true } } },
    });
    if (!parent) throw new NotFoundException('پروفایل والد یافت نشد.');
    if (parent.children.length === 0) return [];

    const payments = await this.prisma.payment.findMany({
      where: { studentId: { in: parent.children.map((c) => c.id) } },
      include: { class: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const nameByStudentId = new Map(parent.children.map((c) => [c.id, c.user.name]));

    return payments.map((p) => ({
      ...toDto(p),
      class: p.class,
      student: { id: p.studentId, name: nameByStudentId.get(p.studentId)! },
    }));
  }
}
