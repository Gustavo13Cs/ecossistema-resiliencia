import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDateString,
  IsOptional,
  IsUUID,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MarkerDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @IsNumber() @Min(-1e12) @Max(1e12) value!: number;
  @IsString() @IsNotEmpty() @MaxLength(100) unit!: string;
}

export class CreateLabExamDto {
  @IsUUID() clientId!: string;
  @IsDateString() @IsNotEmpty() date!: string;
  @IsOptional() @IsString() @MaxLength(10000) notes?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => MarkerDto)
  markers!: MarkerDto[];
}
