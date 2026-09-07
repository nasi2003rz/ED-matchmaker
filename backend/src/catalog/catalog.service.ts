import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { fieldDefinitions: { orderBy: { order: 'asc' } } },
    });
  }

  listLocations() {
    return this.prisma.location.findMany({ orderBy: { city: 'asc' } });
  }
}
