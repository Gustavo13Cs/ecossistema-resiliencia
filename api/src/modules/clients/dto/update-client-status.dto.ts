import { ClientStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateClientStatusDto {
  @IsEnum(ClientStatus)
  status!: ClientStatus;
}
