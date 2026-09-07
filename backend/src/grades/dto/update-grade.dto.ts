import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateGradeDto } from './create-grade.dto.js';

// studentId is fixed at creation — editing a grade never reassigns it to a
// different student, only its content.
export class UpdateGradeDto extends PartialType(OmitType(CreateGradeDto, ['studentId'] as const)) {}
