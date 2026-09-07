import { IsDateString, IsUUID } from 'class-validator';

export class CreateProposalDto {
  @IsUUID()
  studentId!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}
