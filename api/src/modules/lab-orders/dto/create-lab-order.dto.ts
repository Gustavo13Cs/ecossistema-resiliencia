import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
export class CreateLabOrderDto {
  @IsUUID() clientId!: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(200, { each: true })
  markers!: string[];
  @IsOptional() @IsString() @MaxLength(10000) clinicalIndication?: string;
  @IsOptional() @IsString() @MaxLength(10000) preparationInstructions?: string;
}
