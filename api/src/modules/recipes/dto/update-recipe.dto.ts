import { IsInt, Min } from 'class-validator';
import { CreateRecipeDto } from './create-recipe.dto';

export class UpdateRecipeDto extends CreateRecipeDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
