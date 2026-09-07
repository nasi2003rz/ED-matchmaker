import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  studentId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title!: string;

  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  amount!: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
