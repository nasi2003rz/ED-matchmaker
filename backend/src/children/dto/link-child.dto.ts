import { IsEmail } from 'class-validator';

export class LinkChildDto {
  @IsEmail()
  email!: string;
}
