import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ClientOptionalFieldsDto } from './client-optional-fields.dto';

export class UpdateClientDto extends ClientOptionalFieldsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
