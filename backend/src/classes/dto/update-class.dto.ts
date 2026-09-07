import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { ClassStatus } from '../../generated/prisma/enums.js';
import { CreateClassDto } from './create-class.dto.js';

export class UpdateClassDto extends PartialType(CreateClassDto) {
  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;
}
