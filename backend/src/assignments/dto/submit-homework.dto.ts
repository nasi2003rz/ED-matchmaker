import { IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitHomeworkDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;
}
