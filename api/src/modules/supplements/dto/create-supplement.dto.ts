import { IsString, IsOptional, IsArray } from 'class-validator';
export class CreateSupplementDto {
  @IsString() patientId: string;
  @IsString() title: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() items: any[];
}