import { ClientStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PageQueryDto } from '../../../common/pagination/page-query.dto';

export class ListClientsQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  q?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
