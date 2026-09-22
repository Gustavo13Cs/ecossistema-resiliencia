import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RecipeStatus } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateRecipeDto, RecipeIngredientDto } from './dto/create-recipe.dto';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { calculateRecipeNutrition } from './domain/recipe-nutrition';

const recipeInclude = {
  currentVersion: {
    include: {
      ingredients: {
        include: { food: true },
      },
    },
  },
} satisfies Prisma.RecipeInclude;

type RecipeTransaction = Prisma.TransactionClient;

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRecipeDto, professionalId: string) {
    return this.prisma.$transaction(async (tx) => {
      const versionData = await this.buildVersionCreateData(tx, dto);
      const recipe = await tx.recipe.create({
        data: { professionalId },
      });
      const version = await tx.recipeVersion.create({
        data: {
          recipeId: recipe.id,
          version: 1,
          ...versionData,
        },
      });
      await this.publishInitialVersion(
        tx,
        recipe.id,
        version.id,
        professionalId,
      );
      return this.findOwnedRecipe(tx, recipe.id, professionalId);
    });
  }

  list(query: ListRecipesQueryDto, professionalId: string) {
    const currentVersion: Prisma.RecipeVersionWhereInput = {};
    if (query.q !== undefined) {
      currentVersion.name = { contains: query.q, mode: 'insensitive' };
    }
    if (query.category !== undefined) currentVersion.category = query.category;
    if (query.isGlutenFree !== undefined) {
      currentVersion.isGlutenFree = query.isGlutenFree;
    }
    if (query.isLactoseFree !== undefined) {
      currentVersion.isLactoseFree = query.isLactoseFree;
    }
    if (query.isVegan !== undefined) currentVersion.isVegan = query.isVegan;

    return this.prisma.recipe.findMany({
      where: {
        professionalId,
        status: query.status,
        currentVersion: { is: currentVersion },
      },
      include: recipeInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  findOne(recipeId: string, professionalId: string) {
    return this.findOwnedRecipe(
      this.prisma as unknown as RecipeTransaction,
      recipeId,
      professionalId,
    );
  }

  async update(recipeId: string, dto: UpdateRecipeDto, professionalId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const recipe = await this.findOwnedRecipe(tx, recipeId, professionalId);
        if (
          !recipe.currentVersion ||
          recipe.currentVersion.version !== dto.expectedVersion
        ) {
          throw new ConflictException(
            'A receita foi atualizada por outra sessão.',
          );
        }

        const versionData = await this.buildVersionCreateData(tx, dto);
        const nextVersion = await tx.recipeVersion.create({
          data: {
            recipeId: recipe.id,
            version: recipe.currentVersion.version + 1,
            ...versionData,
          },
        });
        const switched = await tx.recipe.updateMany({
          where: {
            id: recipe.id,
            professionalId,
            currentVersionId: recipe.currentVersionId,
          },
          data: { currentVersionId: nextVersion.id },
        });
        if (switched.count !== 1) {
          throw new ConflictException(
            'A receita foi atualizada por outra sessão.',
          );
        }
        return this.findOwnedRecipe(tx, recipe.id, professionalId);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A receita foi atualizada por outra sessão.',
        );
      }
      throw error;
    }
  }

  duplicate(recipeId: string, professionalId: string) {
    return this.prisma.$transaction(async (tx) => {
      const source = await this.findOwnedRecipe(tx, recipeId, professionalId);
      if (!source.currentVersion) {
        throw new NotFoundException('Receita não encontrada');
      }
      const sourceVersion = source.currentVersion;
      const input: CreateRecipeDto = {
        name: sourceVersion.name,
        description: sourceVersion.description ?? undefined,
        category: sourceVersion.category,
        servings: sourceVersion.servings,
        instructions: sourceVersion.instructions ?? undefined,
        isGlutenFree: sourceVersion.isGlutenFree,
        isLactoseFree: sourceVersion.isLactoseFree,
        isVegan: sourceVersion.isVegan,
        ingredients: sourceVersion.ingredients.map((ingredient) => ({
          foodId: ingredient.foodId,
          quantity: ingredient.quantity,
          measure: ingredient.measure,
        })),
      };
      const versionData = await this.buildVersionCreateData(tx, input);
      const duplicate = await tx.recipe.create({ data: { professionalId } });
      const version = await tx.recipeVersion.create({
        data: {
          recipeId: duplicate.id,
          version: 1,
          ...versionData,
        },
      });
      await this.publishInitialVersion(
        tx,
        duplicate.id,
        version.id,
        professionalId,
      );
      return this.findOwnedRecipe(tx, duplicate.id, professionalId);
    });
  }

  archive(recipeId: string, professionalId: string) {
    return this.setStatus(recipeId, professionalId, RecipeStatus.ARCHIVED);
  }

  restore(recipeId: string, professionalId: string) {
    return this.setStatus(recipeId, professionalId, RecipeStatus.ACTIVE);
  }

  private async setStatus(
    recipeId: string,
    professionalId: string,
    status: RecipeStatus,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.findOwnedRecipe(tx, recipeId, professionalId);
      await tx.recipe.updateMany({
        where: {
          id: recipeId,
          professionalId,
          status: { not: status },
        },
        data: { status },
      });
      return this.findOwnedRecipe(tx, recipeId, professionalId);
    });
  }

  private async publishInitialVersion(
    tx: RecipeTransaction,
    recipeId: string,
    versionId: string,
    professionalId: string,
  ): Promise<void> {
    const published = await tx.recipe.updateMany({
      where: {
        id: recipeId,
        professionalId,
        currentVersionId: null,
      },
      data: { currentVersionId: versionId },
    });
    if (published.count !== 1) {
      throw new ConflictException('A receita foi atualizada por outra sessão.');
    }
  }

  private async loadFoods(
    tx: RecipeTransaction,
    ingredients: readonly RecipeIngredientDto[],
  ) {
    const foodIds = ingredients.map((ingredient) => ingredient.foodId);
    if (new Set(foodIds).size !== foodIds.length) {
      throw new BadRequestException(
        'Cada alimento pode aparecer apenas uma vez na receita.',
      );
    }
    const foods = await tx.food.findMany({
      where: { id: { in: foodIds } },
      select: {
        id: true,
        name: true,
        baseAmount: true,
        kcal: true,
        protein: true,
        carbs: true,
        fat: true,
        fiber: true,
        sodium: true,
        calcium: true,
        iron: true,
      },
    });
    if (foods.length !== foodIds.length) {
      throw new NotFoundException('Alimento não encontrado');
    }
    return foods;
  }

  private async buildVersionCreateData(
    tx: RecipeTransaction,
    dto: CreateRecipeDto,
  ): Promise<
    Omit<Prisma.RecipeVersionUncheckedCreateWithoutRecipeInput, 'version'>
  > {
    const foods = await this.loadFoods(tx, dto.ingredients);
    const foodsById = new Map(foods.map((food) => [food.id, food]));
    const nutrition = calculateRecipeNutrition(
      dto.ingredients.map((ingredient) => ({
        foodId: ingredient.foodId,
        quantity: ingredient.quantity,
        food: foodsById.get(ingredient.foodId)!,
      })),
      dto.servings,
    );

    return {
      name: dto.name,
      description: dto.description ?? null,
      category: dto.category,
      servings: dto.servings,
      instructions: dto.instructions ?? null,
      isGlutenFree: dto.isGlutenFree,
      isLactoseFree: dto.isLactoseFree,
      isVegan: dto.isVegan,
      ...nutrition,
      ingredients: {
        create: dto.ingredients.map((ingredient) => ({
          foodId: ingredient.foodId,
          quantity: ingredient.quantity,
          measure: ingredient.measure,
        })),
      },
    };
  }

  private async findOwnedRecipe(
    tx: RecipeTransaction,
    recipeId: string,
    professionalId: string,
  ) {
    const recipe = await tx.recipe.findFirst({
      where: { id: recipeId, professionalId },
      include: recipeInclude,
    });
    if (!recipe) throw new NotFoundException('Receita não encontrada');
    return recipe;
  }
}
