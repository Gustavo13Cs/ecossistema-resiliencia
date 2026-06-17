import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class MarkerDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsNumber() @IsNotEmpty() value!: number;
  @IsString() @IsNotEmpty() unit!: string;
}

export class CreateLabExamDto {
  @IsString() @IsNotEmpty() patientId!: string;
  @IsDateString() @IsNotEmpty() date!: string;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarkerDto)
  markers!: MarkerDto[];
}