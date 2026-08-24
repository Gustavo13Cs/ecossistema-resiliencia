import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsString,
  ValidateIf,
} from 'class-validator';
import {
  ClientOptionalFieldsDto,
  trimRequiredText,
} from './client-optional-fields.dto';

export class UpdateClientDto extends ClientOptionalFieldsDto {
  @IsDateString()
  expectedUpdatedAt!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Transform(trimRequiredText)
  name?: string;
}
