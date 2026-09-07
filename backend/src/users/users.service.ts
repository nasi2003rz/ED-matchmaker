import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RoleName } from '../generated/prisma/enums.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findRoles(userId: string): Promise<RoleName[]> {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      select: { role: true },
    });
    return roles.map((r) => r.role);
  }

  async findMeWithRoles(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, roles: true },
    });
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profile: user.profile,
      roles: user.roles.map((r) => r.role),
    };
  }

  create(data: { email: string; passwordHash: string; name: string }) {
    return this.prisma.user.create({
      data: {
        ...data,
        profile: { create: {} },
      },
    });
  }

  async assignRole(userId: string, role: RoleName): Promise<RoleName[]> {
    await this.prisma.userRole.upsert({
      where: { userId_role: { userId, role } },
      update: {},
      create: { userId, role },
    });

    switch (role) {
      case RoleName.INSTRUCTOR:
        await this.prisma.instructor.upsert({
          where: { userId },
          update: {},
          create: { userId },
        });
        break;
      case RoleName.STUDENT:
        await this.prisma.student.upsert({
          where: { userId },
          update: {},
          create: { userId },
        });
        break;
      case RoleName.PARENT:
        await this.prisma.parent.upsert({
          where: { userId },
          update: {},
          create: { userId },
        });
        break;
    }

    return this.findRoles(userId);
  }
}
