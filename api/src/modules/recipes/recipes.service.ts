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

export const RECIPE_LIST_VERSION_SELECT = {
  id: true,
  recipeId: true,
  version: true,
  name: true,
  category: true,
  servings: true,
  isGlutenFree: true,
  isLactoseFree: true,
  isVegan: true,
  kcal: true,
  protein: true,
  carbs: true,
  fat: true,
  fiber: true,
  sodium: true,
  calcium: true,
  iron: true,
  createdAt: true,
} satisfies Prisma.RecipeVersionSelect;

export const RECIPE_LIST_SELECT = {
  id: true,
  professionalId: true,
  status: true,
  currentVersionId: true,
  createdAt: true,
  updatedAt: true,
  currentVersion: {
    select: RECIPE_LIST_VERSION_SELECT,
  },
} satisfies Prisma.RecipeSelect;

export const RECIPE_FOOD_SELECT = {
  id: true,
  name: true,
  baseUnit: true,
  baseAmount: true,
  kcal: true,
  protein: true,
  carbs: true,
  fat: true,
  fiber: true,
  sodium: true,
  calcium: true,
  iron: true,
} satisfies Prisma.FoodSelect;

export const RECIPE_DETAIL_VERSION_SELECT = {
  ...RECIPE_LIST_VERSION_SELECT,
  description: true,
  instructions: true,
  publishedAt: true,
  ingredients: {
    select: {
      id: true,
      recipeVersionId: true,
      foodId: true,
      quantity: true,
      measure: true,
      food: { select: RECIPE_FOOD_SELECT },
    },
  },
} satisfies Prisma.RecipeVersionSelect;

export const RECIPE_OWNED_SELECT = {
  id: true,
  professionalId: true,
  status: true,
  currentVersionId: true,
  createdAt: true,
  updatedAt: true,
  currentVersion: {
    select: RECIPE_DETAIL_VERSION_SELECT,
  },
} satisfies Prisma.RecipeSelect;

export const RECIPE_HISTORY_VERSION_SELECT = {
  id: true,
  recipeId: true,
  version: true,
  name: true,
  category: true,
  servings: true,
  isGlutenFree: true,
  isLactoseFree: true,
  isVegan: true,
  kcal: true,
  protein: true,
  carbs: true,
  fat: true,
  createdAt: true,
  ingredients: {
    select: {
      id: true,
      foodId: true,
      quantity: true,
      measure: true,
      food: {
        select: { id: true, name: true },
      },
    },
  },
} satisfies Prisma.RecipeVersionSelect;

export const RECIPE_DETAIL_SELECT = {
  ...RECIPE_OWNED_SELECT,
  versions: {
    select: RECIPE_HISTORY_VERSION_SELECT,
    orderBy: { version: 'asc' },
  },
} satisfies Prisma.RecipeSelect;

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
      select: RECIPE_LIST_SELECT,
      orderBy: { updatedAt: 'desc' },
    });
  }

  findOne(recipeId: string, professionalId: string) {
    return this.findOwnedRecipeDetails(
      this.prisma as unknown as RecipeTransaction,
      recipeId,
      professionalId,
    );
  }

  async update(recipeId: string, dto: UpdateRecipeDto, professionalId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const recipe = await tx.recipe.findFirst({
          where: { id: recipeId, professionalId },
          select: {
            id: true,
            currentVersionId: true,
            currentVersion: { select: { version: true } },
          },
        });
        if (!recipe) {
          throw new NotFoundException('Receita não encontrada');
        }
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
      const existing = await tx.recipe.findFirst({
        where: { id: recipeId, professionalId },
        select: { id: true },
      });
      if (!existing) {
        throw new NotFoundException('Receita não encontrada');
      }
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
    // O snapshot e suas referências usam a mesma versão do catálogo até o commit.
    // SHARE bloqueia alterações/exclusões, inclusive UPDATEs escalares comuns.
    if (foodIds.length > 0) {
      await tx.$queryRaw(Prisma.sql`
        SELECT "id" FROM "foods"
        WHERE "id" IN (${Prisma.join([...foodIds].sort())})
        ORDER BY "id" FOR SHARE
      `);
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
      select: RECIPE_OWNED_SELECT,
    });
    if (!recipe) throw new NotFoundException('Receita não encontrada');
    return recipe;
  }

  private async findOwnedRecipeDetails(
    tx: RecipeTransaction,
    recipeId: string,
    professionalId: string,
  ) {
    const recipe = await tx.recipe.findFirst({
      where: { id: recipeId, professionalId },
      select: RECIPE_DETAIL_SELECT,
    });
    if (!recipe) throw new NotFoundException('Receita não encontrada');
    return recipe;
  }
}
