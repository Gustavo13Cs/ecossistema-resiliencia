import { ClientStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListClientsQueryDto {
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
