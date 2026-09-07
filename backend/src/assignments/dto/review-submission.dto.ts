import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ReviewSubmissionDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
