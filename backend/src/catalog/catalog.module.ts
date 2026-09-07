import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
