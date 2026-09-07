import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ClassType, DeliveryMode, Weekday } from '../../generated/prisma/enums.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateClassDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsEnum(DeliveryMode)
  deliveryMode?: DeliveryMode;

  @IsOptional()
  @IsEnum(ClassType)
  classType?: ClassType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(Weekday, { each: true })
  days?: Weekday[];

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'startTime باید به قالب HH:mm باشد.' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'endTime باید به قالب HH:mm باشد.' })
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  numberOfSessions?: number;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | number | boolean>;
}

export { TIME_PATTERN };
