import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import {
  ClientOptionalFieldsDto,
  trimRequiredText,
} from './client-optional-fields.dto';

export class CreateClientDto extends ClientOptionalFieldsDto {
  @IsString()
  @IsNotEmpty()
  @Transform(trimRequiredText)
  name!: string;
}
