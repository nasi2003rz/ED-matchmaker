import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const PROPOSAL_INCLUDE = {
  class: { include: { instructor: { include: { user: true } }, location: true } },
} as const;

@Injectable()
export class ProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getStudentId(userId: string): Promise<string> {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) {
      throw new NotFoundException('پروفایل دانش‌آموز یافت نشد.');
    }
    return student.id;
  }

  async listMine(userId: string) {
    const studentId = await this.getStudentId(userId);
    const proposals = await this.prisma.sessionProposal.findMany({
      where: { studentId },
      include: PROPOSAL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return proposals.map((p) => this.toDto(p));
  }

  async respond(userId: string, proposalId: string, action: 'ACCEPT' | 'REJECT') {
    const studentId = await this.getStudentId(userId);
    const proposal = await this.prisma.sessionProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) {
      throw new NotFoundException('پیشنهاد یافت نشد.');
    }
    if (proposal.studentId !== studentId) {
      throw new ForbiddenException('شما به این پیشنهاد دسترسی ندارید.');
    }
    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('این پیشنهاد قبلاً پاسخ داده شده است.');
    }

    if (action === 'REJECT') {
      await this.prisma.sessionProposal.update({
        where: { id: proposalId },
        data: { status: 'REJECTED', respondedAt: new Date() },
      });
    } else {
      await this.prisma.$transaction(async (tx) => {
        const session = await tx.classSession.create({
          data: {
            classId: proposal.classId,
            startsAt: proposal.startsAt,
            endsAt: proposal.endsAt,
          },
        });
        await tx.sessionProposal.update({
          where: { id: proposalId },
          data: { status: 'ACCEPTED', respondedAt: new Date(), sessionId: session.id },
        });
      });
    }

    const updated = await this.prisma.sessionProposal.findUniqueOrThrow({
      where: { id: proposalId },
      include: PROPOSAL_INCLUDE,
    });
    return this.toDto(updated);
  }

  private toDto(proposal: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
    createdAt: Date;
    respondedAt: Date | null;
    class: {
      id: string;
      name: string;
      instructor: { user: { name: string } };
      location: { city: string } | null;
    };
  }) {
    return {
      id: proposal.id,
      startsAt: proposal.startsAt,
      endsAt: proposal.endsAt,
      status: proposal.status,
      createdAt: proposal.createdAt,
      respondedAt: proposal.respondedAt,
      class: {
        id: proposal.class.id,
        name: proposal.class.name,
        instructorName: proposal.class.instructor.user.name,
        location: proposal.class.location,
      },
    };
  }
}
