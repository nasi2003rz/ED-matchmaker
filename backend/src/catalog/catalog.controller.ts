import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CatalogService } from './catalog.service.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  categories() {
    return this.catalogService.listCategories();
  }

  @Get('locations')
  locations() {
    return this.catalogService.listLocations();
  }
}
