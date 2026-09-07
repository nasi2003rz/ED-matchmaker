import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { GradeType } from '../../generated/prisma/enums.js';

export class CreateGradeDto {
  @IsUUID()
  studentId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title!: string;

  @IsEnum(GradeType)
  type!: GradeType;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  value!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
