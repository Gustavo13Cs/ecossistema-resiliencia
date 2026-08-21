import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMetricCheckInDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  itemName!: string;
}
