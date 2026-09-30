import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateSupplementItemDto {
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(10000) composition?: string;
  @IsOptional() @IsString() @MaxLength(1000) dosage?: string;
  @IsOptional() @IsString() @MaxLength(10000) instructions?: string;
}
