import { IsNotEmpty, IsString } from 'class-validator';
import { ClientOptionalFieldsDto } from './client-optional-fields.dto';

export class CreateClientDto extends ClientOptionalFieldsDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
