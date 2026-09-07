import { PartialType } from '@nestjs/mapped-types';
import { CreateAssignmentDto } from './create-assignment.dto.js';

export class UpdateAssignmentDto extends PartialType(CreateAssignmentDto) {}
