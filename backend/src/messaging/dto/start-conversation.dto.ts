import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// Either side may start a new conversation. An instructor sets studentId or
// parentId (never both); a student/parent sets instructorId. Exactly one
// "other party" field is expected per caller — validated in the service.
export class StartConversationDto {
  @IsOptional()
  @IsUUID()
  instructorId?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}
