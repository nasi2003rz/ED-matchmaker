import { IsIn } from 'class-validator';

export class RespondProposalDto {
  @IsIn(['ACCEPT', 'REJECT'])
  action!: 'ACCEPT' | 'REJECT';
}
