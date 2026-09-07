import { IsEnum } from 'class-validator';
import { InvitationLinkStatus } from '../../generated/prisma/enums.js';

export class UpdateInvitationStatusDto {
  @IsEnum(InvitationLinkStatus)
  status!: InvitationLinkStatus;
}
