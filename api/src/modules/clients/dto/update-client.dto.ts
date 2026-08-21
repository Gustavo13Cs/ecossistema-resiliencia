import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import {
  ClientOptionalFieldsDto,
  trimRequiredText,
} from './client-optional-fields.dto';

export class UpdateClientDto extends ClientOptionalFieldsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Transform(trimRequiredText)
  name?: string;
}
