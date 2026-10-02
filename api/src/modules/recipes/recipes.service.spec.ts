import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RecipeCategory, RecipeStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipesService } from './recipes.service';

const PROFESSIONAL_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_PROFESSIONAL_ID = '22222222-2222-4222-8222-222222222222';
const RECIPE_ID = '33333333-3333-4333-8333-333333333333';
const FOOD_ID = '44444444-4444-4444-8444-444444444444';
const SECOND_FOOD_ID = '55555555-5555-4555-8555-555555555555';

type FoodFixture = {
  id: string;
  name: string;
  baseAmount: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  calcium: number;
  iron: number;
};

type IngredientFixture = {
  id: string;
  recipeVersionId: string;
  foodId: string;
  quantity: number;
  measure: string;
};

type VersionFixture = {
  id: string;
  recipeId: string;
  version: number;
  name: string;
  description: string | null;
  category: RecipeCategory;
  servings: number;
  instructions: string | null;
  isGlutenFree: boolean;
  isLactoseFree: boolean;
  isVegan: boolean;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  calcium: number;
  iron: number;
  createdAt: Date;
  publishedAt: Date | null;
};

type RecipeFixture = {
  id: string;
  professionalId: string;
  status: RecipeStatus;
  currentVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type FakeState = {
  foods: FoodFixture[];
  recipes: RecipeFixture[];
  versions: VersionFixture[];
  ingredients: IngredientFixture[];
};

type HydratedIngredient = IngredientFixture & { food: FoodFixture | undefined };
type HydratedVersion = VersionFixture & { ingredients: HydratedIngredient[] };
type HydratedRecipe = RecipeFixture & {
  currentVersion: HydratedVersion | null;
  versions?: HydratedVersion[];
};

type FoodFindManyArguments = { where: { id: { in: string[] } } };
type RecipeCreateArguments = {
  data: { professionalId: string; status?: RecipeStatus };
};
type RecipeVersionCreateArguments = {
  data: Omit<VersionFixture, 'id' | 'createdAt' | 'publishedAt'> & {
    ingredients: {
      create: Array<Pick<IngredientFixture, 'foodId' | 'quantity' | 'measure'>>;
    };
  };
};
type RecipeUpdateManyArguments = {
  where: {
    id?: string;
    professionalId?: string;
    currentVersionId?: string | null;
    status?: { not: RecipeStatus };
  };
  data: { currentVersionId?: string; status?: RecipeStatus };
};
type RecipeFindFirstArguments = {
  where: { id: string; professionalId: string };
  include?: { versions?: { orderBy?: { version?: 'asc' | 'desc' } } };
};
type RecipeVersionFilter = {
  name?: { contains: string; mode: 'insensitive' };
  category?: RecipeCategory;
  isGlutenFree?: boolean;
  isLactoseFree?: boolean;
  isVegan?: boolean;
};
type RecipeFindManyArguments = {
  where: {
    professionalId: string;
    status: RecipeStatus;
    currentVersion: { is: RecipeVersionFilter };
  };
};

const firstFood: FoodFixture = {
  id: FOOD_ID,
  name: 'Aveia',
  baseAmount: 100,
  kcal: 400,
  protein: 20,
  carbs: 60,
  fat: 10,
  fiber: 8,
  sodium: 4,
  calcium: 50,
  iron: 5,
};

const secondFood: FoodFixture = {
  id: SECOND_FOOD_ID,
  name: 'Banana',
  baseAmount: 100,
  kcal: 100,
  protein: 2,
  carbs: 24,
  fat: 1,
  fiber: 3,
  sodium: 2,
  calcium: 10,
  iron: 1,
};

const validRecipeInput: CreateRecipeDto = {
  name: 'Mingau proteico',
  description: 'Café da manhã',
  category: RecipeCategory.BREAKFAST,
  servings: 2,
  instructions: 'Misture e cozinhe.',
  isGlutenFree: false,
  isLactoseFree: true,
  isVegan: true,
  ingredients: [
    { foodId: FOOD_ID, quantity: 50, measure: 'g' },
    { foodId: SECOND_FOOD_ID, quantity: 100, measure: 'g' },
  ],
};

function fakeQuery<Input, Output>(operation: (input: Input) => Output) {
  return (input: Input): Promise<Output> => {
    try {
      return Promise.resolve(operation(input));
    } catch (error) {
      return Promise.reject(
        error instanceof Error ? error : new Error('Fixture query failed'),
      );
    }
  };
}

class RecipePrismaFake {
  state: FakeState;
  forceCompareAndSwapConflict = false;
  forceInitialPublishConflict = false;
  recipeVersionCreateError: Error | undefined;
  lastRecipeFindManyArgs: RecipeFindManyArguments | undefined;
  lastRecipeUpdateManyArgs: RecipeUpdateManyArguments | undefined;
  private sequence = 0;

  constructor(state?: Partial<FakeState>) {
    this.state = {
      foods: state?.foods ?? [firstFood, secondFood],
      recipes: state?.recipes ?? [],
      versions: state?.versions ?? [],
      ingredients: state?.ingredients ?? [],
    };
  }

  food: { findMany: (args: FoodFindManyArguments) => Promise<FoodFixture[]> } =
    {
      findMany: (): Promise<FoodFixture[]> =>
        Promise.reject(new Error('Fake not initialized')),
    };

  recipe: {
    create: (args: RecipeCreateArguments) => Promise<RecipeFixture>;
    findFirst: (
      args: RecipeFindFirstArguments,
    ) => Promise<HydratedRecipe | null>;
    findMany: (args: RecipeFindManyArguments) => Promise<HydratedRecipe[]>;
    updateMany: (args: RecipeUpdateManyArguments) => Promise<{ count: number }>;
  } = {
    create: (): Promise<RecipeFixture> =>
      Promise.reject(new Error('Fake not initialized')),
    findFirst: (): Promise<HydratedRecipe | null> =>
      Promise.reject(new Error('Fake not initialized')),
    findMany: (): Promise<HydratedRecipe[]> =>
      Promise.reject(new Error('Fake not initialized')),
    updateMany: (): Promise<{ count: number }> =>
      Promise.reject(new Error('Fake not initialized')),
  };

  recipeVersion: {
    create: (args: RecipeVersionCreateArguments) => Promise<HydratedVersion>;
  } = {
    create: (): Promise<HydratedVersion> =>
      Promise.reject(new Error('Fake not initialized')),
  };

  $transaction = async <T>(
    callback: (transaction: this) => Promise<T>,
  ): Promise<T> => {
    const snapshot = structuredClone(this.state);
    const previousSequence = this.sequence;
    try {
      return await callback(this);
    } catch (error) {
      this.state = snapshot;
      this.sequence = previousSequence;
      throw error;
    }
  };

  initialize(): this {
    this.food.findMany = fakeQuery(({ where }: FoodFindManyArguments) => {
      const ids: string[] = where.id.in;
      return this.state.foods.filter((food) => ids.includes(food.id));
    });
    this.recipe.create = fakeQuery(({ data }: RecipeCreateArguments) => {
      const now = new Date('2026-09-22T12:00:00.000Z');
      const recipe: RecipeFixture = {
        id: this.nextId('recipe'),
        professionalId: data.professionalId,
        status: data.status ?? RecipeStatus.ACTIVE,
        currentVersionId: null,
        createdAt: now,
        updatedAt: now,
      };
      this.state.recipes.push(recipe);
      return { ...recipe };
    });
    this.recipeVersion.create = fakeQuery(
      ({ data }: RecipeVersionCreateArguments) => {
        if (this.recipeVersionCreateError) {
          throw this.recipeVersionCreateError;
        }
        if (
          this.state.versions.some(
            (version) =>
              version.recipeId === data.recipeId &&
              version.version === data.version,
          )
        ) {
          throw new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed on recipeId and version',
            {
              code: 'P2002',
              clientVersion: '7.10.0',
              meta: { modelName: 'RecipeVersion' },
            },
          );
        }
        const version: VersionFixture = {
          id: this.nextId('version'),
          recipeId: data.recipeId,
          version: data.version,
          name: data.name,
          description: data.description ?? null,
          category: data.category,
          servings: data.servings,
          instructions: data.instructions ?? null,
          isGlutenFree: data.isGlutenFree,
          isLactoseFree: data.isLactoseFree,
          isVegan: data.isVegan,
          kcal: data.kcal,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          fiber: data.fiber,
          sodium: data.sodium,
          calcium: data.calcium,
          iron: data.iron,
          createdAt: new Date('2026-09-22T12:00:00.000Z'),
          publishedAt: null,
        };
        this.state.versions.push(version);
        for (const ingredient of data.ingredients.create) {
          this.state.ingredients.push({
            id: this.nextId('ingredient'),
            recipeVersionId: version.id,
            foodId: ingredient.foodId,
            quantity: ingredient.quantity,
            measure: ingredient.measure,
          });
        }
        return this.hydrateVersion(version);
      },
    );
    this.recipe.updateMany = fakeQuery(
      ({ where, data }: RecipeUpdateManyArguments) => {
        this.lastRecipeUpdateManyArgs = { where, data };
        if (
          (this.forceCompareAndSwapConflict &&
            typeof where.currentVersionId === 'string') ||
          (this.forceInitialPublishConflict && where.currentVersionId === null)
        ) {
          return { count: 0 };
        }
        const recipes = this.state.recipes.filter(
          (recipe) =>
            (where.id === undefined || recipe.id === where.id) &&
            (where.professionalId === undefined ||
              recipe.professionalId === where.professionalId) &&
            (where.currentVersionId === undefined ||
              recipe.currentVersionId === where.currentVersionId) &&
            (where.status === undefined ||
              typeof where.status !== 'object' ||
              recipe.status !== where.status.not),
        );
        for (const recipe of recipes) {
          Object.assign(recipe, data);
          if (data.currentVersionId) {
            const version = this.state.versions.find(
              (candidate) => candidate.id === data.currentVersionId,
            );
            if (version)
              version.publishedAt = new Date('2026-09-22T12:00:00.000Z');
          }
        }
        return { count: recipes.length };
      },
    );
    this.recipe.findFirst = fakeQuery((args: RecipeFindFirstArguments) => {
      const { where } = args;
      const recipe = this.state.recipes.find(
        (candidate) =>
          candidate.id === where.id &&
          candidate.professionalId === where.professionalId,
      );
      return recipe
        ? this.hydrateRecipe(
            recipe,
            Boolean(args.include?.versions),
            args.include?.versions?.orderBy?.version,
          )
        : null;
    });
    this.recipe.findMany = fakeQuery((args: RecipeFindManyArguments) => {
      this.lastRecipeFindManyArgs = args;
      return this.state.recipes
        .filter((recipe) => this.matchesRecipeWhere(recipe, args.where))
        .map((recipe) => this.hydrateRecipe(recipe));
    });
    return this;
  }

  seedRecipe(
    options: {
      id?: string;
      professionalId?: string;
      status?: RecipeStatus;
      version?: number;
      name?: string;
      category?: RecipeCategory;
      isGlutenFree?: boolean;
      isLactoseFree?: boolean;
      isVegan?: boolean;
    } = {},
  ): RecipeFixture {
    const recipeId = options.id ?? this.nextId('recipe');
    const versionId = this.nextId('version');
    const now = new Date('2026-09-22T12:00:00.000Z');
    const recipe: RecipeFixture = {
      id: recipeId,
      professionalId: options.professionalId ?? PROFESSIONAL_ID,
      status: options.status ?? RecipeStatus.ACTIVE,
      currentVersionId: versionId,
      createdAt: now,
      updatedAt: now,
    };
    this.state.recipes.push(recipe);
    this.state.versions.push({
      id: versionId,
      recipeId,
      version: options.version ?? 1,
      name: options.name ?? validRecipeInput.name,
      description: validRecipeInput.description ?? null,
      category: options.category ?? validRecipeInput.category,
      servings: validRecipeInput.servings,
      instructions: validRecipeInput.instructions ?? null,
      isGlutenFree: options.isGlutenFree ?? validRecipeInput.isGlutenFree,
      isLactoseFree: options.isLactoseFree ?? validRecipeInput.isLactoseFree,
      isVegan: options.isVegan ?? validRecipeInput.isVegan,
      kcal: 150,
      protein: 6,
      carbs: 27,
      fat: 3,
      fiber: 3.5,
      sodium: 2,
      calcium: 17.5,
      iron: 1.75,
      createdAt: now,
      publishedAt: now,
    });
    this.state.ingredients.push({
      id: this.nextId('ingredient'),
      recipeVersionId: versionId,
      foodId: FOOD_ID,
      quantity: 50,
      measure: 'g',
    });
    return recipe;
  }

  private nextId(kind: string): string {
    this.sequence += 1;
    return `${kind}-${this.sequence}`;
  }

  private hydrateVersion(version: VersionFixture) {
    return {
      ...version,
      ingredients: this.state.ingredients
        .filter((ingredient) => ingredient.recipeVersionId === version.id)
        .map((ingredient) => ({
          ...ingredient,
          food: this.state.foods.find((food) => food.id === ingredient.foodId),
        })),
    };
  }

  private hydrateRecipe(
    recipe: RecipeFixture,
    includeVersions = false,
    versionOrder?: 'asc' | 'desc',
  ): HydratedRecipe {
    const currentVersion = this.state.versions.find(
      (version) => version.id === recipe.currentVersionId,
    );
    const hydrated: HydratedRecipe = {
      ...recipe,
      currentVersion: currentVersion
        ? this.hydrateVersion(currentVersion)
        : null,
    };
    if (includeVersions) {
      const versions = this.state.versions.filter(
        (version) => version.recipeId === recipe.id,
      );
      if (versionOrder) {
        versions.sort((left, right) =>
          versionOrder === 'asc'
            ? left.version - right.version
            : right.version - left.version,
        );
      }
      hydrated.versions = versions.map((version) =>
        this.hydrateVersion(version),
      );
    }
    return hydrated;
  }

  private matchesRecipeWhere(
    recipe: RecipeFixture,
    where: RecipeFindManyArguments['where'],
  ): boolean {
    if (
      recipe.professionalId !== where.professionalId ||
      recipe.status !== where.status
    ) {
      return false;
    }
    const version = this.state.versions.find(
      (candidate) => candidate.id === recipe.currentVersionId,
    );
    const versionWhere = where.currentVersion?.is;
    if (!version || !versionWhere) return Boolean(version);
    if (
      versionWhere.category !== undefined &&
      version.category !== versionWhere.category
    ) {
      return false;
    }
    for (const key of ['isGlutenFree', 'isLactoseFree', 'isVegan'] as const) {
      if (
        versionWhere[key] !== undefined &&
        version[key] !== versionWhere[key]
      ) {
        return false;
      }
    }
    const nameFilter = versionWhere.name;
    if (
      nameFilter?.contains &&
      !version.name.toLowerCase().includes(nameFilter.contains.toLowerCase())
    ) {
      return false;
    }
    return true;
  }
}

describe('RecipesService', () => {
  let prisma: RecipePrismaFake;
  let service: RecipesService;

  beforeEach(() => {
    prisma = new RecipePrismaFake().initialize();
    service = new RecipesService(prisma as never);
  });

  it('creates version 1 and calculates macros only from persisted foods', async () => {
    const inputWithForgedMacros = {
      ...validRecipeInput,
      kcal: 99999,
      protein: 99999,
    } as CreateRecipeDto;

    const created = await service.create(
      inputWithForgedMacros,
      PROFESSIONAL_ID,
    );

    expect(created).toMatchObject({
      professionalId: PROFESSIONAL_ID,
      status: RecipeStatus.ACTIVE,
      currentVersion: {
        version: 1,
        name: validRecipeInput.name,
        kcal: 150,
        protein: 6,
        carbs: 27,
        fat: 3,
        fiber: 3.5,
        sodium: 2,
        calcium: 17.5,
        iron: 1.75,
      },
    });
    expect(created.currentVersion!.ingredients).toHaveLength(2);
  });

  it('scopes the initial current-version switch to the professional owner', async () => {
    const created = await service.create(validRecipeInput, PROFESSIONAL_ID);

    expect(prisma.lastRecipeUpdateManyArgs).toEqual({
      where: {
        id: created.id,
        professionalId: PROFESSIONAL_ID,
        currentVersionId: null,
      },
      data: { currentVersionId: created.currentVersion!.id },
    });
  });

  it('rolls back create when the initial current-version publication conflicts', async () => {
    prisma.forceInitialPublishConflict = true;

    await expect(
      service.create(validRecipeInput, PROFESSIONAL_ID),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.state.recipes).toHaveLength(0);
    expect(prisma.state.versions).toHaveLength(0);
    expect(prisma.state.ingredients).toHaveLength(0);
  });

  it('rejects duplicate food ids before creating a recipe', async () => {
    const duplicateIngredientInput = {
      ...validRecipeInput,
      ingredients: [
        validRecipeInput.ingredients[0],
        { ...validRecipeInput.ingredients[0], measure: 'colher' },
      ],
    };

    await expect(
      service.create(duplicateIngredientInput, PROFESSIONAL_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.state.recipes).toHaveLength(0);
  });

  it('rejects an absent persisted food without leaving a recipe behind', async () => {
    const missingFoodInput = {
      ...validRecipeInput,
      ingredients: [
        ...validRecipeInput.ingredients,
        {
          foodId: '66666666-6666-4666-8666-666666666666',
          quantity: 10,
          measure: 'g',
        },
      ],
    };

    await expect(
      service.create(missingFoodInput, PROFESSIONAL_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.state.recipes).toHaveLength(0);
  });

  it('does not reveal a recipe owned by another professional', async () => {
    prisma.seedRecipe({ id: RECIPE_ID, professionalId: PROFESSIONAL_ID });

    await expect(
      service.findOne(RECIPE_ID, OTHER_PROFESSIONAL_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the owned immutable version history ordered with ingredients and foods', async () => {
    prisma.seedRecipe({ id: RECIPE_ID, version: 2, name: 'Versão atual' });
    const currentVersion = prisma.state.versions[0];
    prisma.state.versions.push({
      ...currentVersion,
      id: 'historical-version',
      version: 1,
      name: 'Versão histórica',
      createdAt: new Date('2026-09-21T12:00:00.000Z'),
    });
    prisma.state.ingredients.push({
      id: 'historical-ingredient',
      recipeVersionId: 'historical-version',
      foodId: SECOND_FOOD_ID,
      quantity: 100,
      measure: 'g',
    });

    const detail = await service.findOne(RECIPE_ID, PROFESSIONAL_ID);

    expect(detail.currentVersion).toMatchObject({
      version: 2,
      name: 'Versão atual',
    });
    expect(detail.versions).toMatchObject([
      {
        version: 1,
        name: 'Versão histórica',
        ingredients: [{ food: { id: SECOND_FOOD_ID, name: 'Banana' } }],
      },
      {
        version: 2,
        name: 'Versão atual',
        ingredients: [{ food: { id: FOOD_ID, name: 'Aveia' } }],
      },
    ]);
  });

  it('combines filters against currentVersion only', async () => {
    prisma.seedRecipe({
      id: RECIPE_ID,
      name: 'Bolo atual',
      category: RecipeCategory.DESSERT,
      isGlutenFree: true,
      isLactoseFree: true,
      isVegan: false,
    });
    const historicalVersionId = 'historical-version';
    prisma.state.versions.push({
      ...prisma.state.versions[0],
      id: historicalVersionId,
      version: 0,
      name: 'Sopa histórica',
      category: RecipeCategory.MAIN_MEAL,
      isVegan: true,
    });
    prisma.seedRecipe({
      name: 'Sopa atual',
      category: RecipeCategory.MAIN_MEAL,
      isGlutenFree: true,
      isLactoseFree: true,
      isVegan: true,
    });
    prisma.seedRecipe({
      professionalId: OTHER_PROFESSIONAL_ID,
      name: 'Sopa alheia',
      category: RecipeCategory.MAIN_MEAL,
      isGlutenFree: true,
      isLactoseFree: true,
      isVegan: true,
    });

    const result = await service.list(
      {
        q: 'sopa',
        category: RecipeCategory.MAIN_MEAL,
        isGlutenFree: true,
        isLactoseFree: true,
        isVegan: true,
        status: RecipeStatus.ACTIVE,
      },
      PROFESSIONAL_ID,
    );

    expect(result).toHaveLength(1);
    expect(result[0].currentVersion!.name).toBe('Sopa atual');
    expect(prisma.lastRecipeFindManyArgs).toMatchObject({
      where: {
        professionalId: PROFESSIONAL_ID,
        status: RecipeStatus.ACTIVE,
        currentVersion: {
          is: {
            name: { contains: 'sopa', mode: 'insensitive' },
            category: RecipeCategory.MAIN_MEAL,
            isGlutenFree: true,
            isLactoseFree: true,
            isVegan: true,
          },
        },
      },
    });
    expect(prisma.lastRecipeFindManyArgs).not.toHaveProperty('where.versions');
    expect(result[0]).not.toHaveProperty('versions');
  });

  it('updates by appending version 2 and switching the current snapshot', async () => {
    prisma.seedRecipe({ id: RECIPE_ID, version: 1 });

    await expect(
      service.update(
        RECIPE_ID,
        {
          ...validRecipeInput,
          name: 'Mingau revisado',
          expectedVersion: 1,
          kcal: 99999,
        } as UpdateRecipeDto,
        PROFESSIONAL_ID,
      ),
    ).resolves.toMatchObject({
      id: RECIPE_ID,
      currentVersion: {
        version: 2,
        name: 'Mingau revisado',
        kcal: 150,
      },
    });
    expect(
      prisma.state.versions.filter((version) => version.recipeId === RECIPE_ID),
    ).toHaveLength(2);
  });

  it('rejects an update whose expected version is stale', async () => {
    prisma.seedRecipe({ id: RECIPE_ID, version: 2 });

    await expect(
      service.update(
        RECIPE_ID,
        { ...validRecipeInput, expectedVersion: 1 },
        PROFESSIONAL_ID,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      prisma.state.versions.filter((version) => version.recipeId === RECIPE_ID),
    ).toHaveLength(1);
  });

  it('normalizes a real Prisma P2002 version race and leaves no new orphan data', async () => {
    prisma.seedRecipe({ id: RECIPE_ID, version: 1 });
    const versionOne = prisma.state.versions[0];
    prisma.state.versions.push({
      ...versionOne,
      id: 'competing-version-2',
      version: 2,
      name: 'Versão concorrente',
    });
    prisma.state.ingredients.push({
      ...prisma.state.ingredients[0],
      id: 'competing-ingredient',
      recipeVersionId: 'competing-version-2',
    });
    const before = structuredClone(prisma.state);

    await expect(
      service.update(
        RECIPE_ID,
        { ...validRecipeInput, expectedVersion: 1 },
        PROFESSIONAL_ID,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.state).toEqual(before);
  });

  it('does not normalize a non-P2002 recipe-version error', async () => {
    prisma.seedRecipe({ id: RECIPE_ID, version: 1 });
    const databaseError = new Error('database unavailable');
    prisma.recipeVersionCreateError = databaseError;
    const before = structuredClone(prisma.state);

    await expect(
      service.update(
        RECIPE_ID,
        { ...validRecipeInput, expectedVersion: 1 },
        PROFESSIONAL_ID,
      ),
    ).rejects.toBe(databaseError);

    expect(prisma.state).toEqual(before);
  });

  it('rolls back the orphan version when compare-and-swap affects zero rows', async () => {
    prisma.seedRecipe({ id: RECIPE_ID, version: 1 });
    prisma.forceCompareAndSwapConflict = true;

    await expect(
      service.update(
        RECIPE_ID,
        { ...validRecipeInput, expectedVersion: 1 },
        PROFESSIONAL_ID,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      prisma.state.versions.filter((version) => version.recipeId === RECIPE_ID),
    ).toHaveLength(1);
    expect(prisma.state.recipes[0].currentVersionId).toBe(
      prisma.state.versions[0].id,
    );
  });

  it('duplicates the current snapshot as version 1 under a new identity', async () => {
    prisma.seedRecipe({ id: RECIPE_ID, version: 4 });
    prisma.state.versions[0].kcal = 99999;

    const duplicated = await service.duplicate(RECIPE_ID, PROFESSIONAL_ID);

    expect(duplicated).toMatchObject({
      professionalId: PROFESSIONAL_ID,
      currentVersion: {
        version: 1,
        name: validRecipeInput.name,
        kcal: 100,
      },
    });
    expect(duplicated.id).not.toBe(RECIPE_ID);
    expect(duplicated.currentVersion!.id).not.toBe(
      prisma.state.recipes[0].currentVersionId,
    );
  });

  it('rolls back duplicate when its initial current-version publication conflicts', async () => {
    prisma.seedRecipe({ id: RECIPE_ID, version: 1 });
    prisma.forceInitialPublishConflict = true;
    const before = structuredClone(prisma.state);

    await expect(
      service.duplicate(RECIPE_ID, PROFESSIONAL_ID),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.state).toEqual(before);
  });

  it('duplicates an archived recipe into a new ACTIVE identity without changing the source', async () => {
    const source = prisma.seedRecipe({
      id: RECIPE_ID,
      version: 3,
      status: RecipeStatus.ARCHIVED,
    });
    const sourceBefore = structuredClone(source);

    const duplicated = await service.duplicate(RECIPE_ID, PROFESSIONAL_ID);

    expect(duplicated).toMatchObject({
      status: RecipeStatus.ACTIVE,
      currentVersion: { version: 1 },
    });
    expect(duplicated.id).not.toBe(RECIPE_ID);
    expect(
      prisma.state.recipes.find((recipe) => recipe.id === RECIPE_ID),
    ).toEqual(sourceBefore);
  });

  it('archives and restores only the owned recipe', async () => {
    prisma.seedRecipe({ id: RECIPE_ID });

    await expect(
      service.archive(RECIPE_ID, PROFESSIONAL_ID),
    ).resolves.toMatchObject({
      status: RecipeStatus.ARCHIVED,
    });
    await expect(
      service.restore(RECIPE_ID, PROFESSIONAL_ID),
    ).resolves.toMatchObject({
      status: RecipeStatus.ACTIVE,
    });
    await expect(
      service.archive(RECIPE_ID, OTHER_PROFESSIONAL_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('Recipe DTOs', () => {
  it('validates the complete nested recipe version shape', async () => {
    const valid = plainToInstance(CreateRecipeDto, validRecipeInput);
    const invalid = plainToInstance(CreateRecipeDto, {
      ...validRecipeInput,
      servings: 0,
      ingredients: [{ foodId: 'invalid', quantity: 0, measure: '' }],
    });

    await expect(validate(valid)).resolves.toHaveLength(0);
    await expect(validate(invalid)).resolves.not.toHaveLength(0);
  });

  it('requires expectedVersion to be a positive integer on updates', async () => {
    const missing = plainToInstance(UpdateRecipeDto, validRecipeInput);
    const fractional = plainToInstance(UpdateRecipeDto, {
      ...validRecipeInput,
      expectedVersion: 1.5,
    });
    const valid = plainToInstance(UpdateRecipeDto, {
      ...validRecipeInput,
      expectedVersion: 1,
    });

    await expect(validate(missing)).resolves.not.toHaveLength(0);
    await expect(validate(fractional)).resolves.not.toHaveLength(0);
    await expect(validate(valid)).resolves.toHaveLength(0);
  });

  it('transforms only explicit boolean query values and defaults status to ACTIVE', async () => {
    const valid = plainToInstance(ListRecipesQueryDto, {
      isGlutenFree: 'true',
      isLactoseFree: 'false',
    });
    const invalid = plainToInstance(ListRecipesQueryDto, { isVegan: 'yes' });

    expect(valid).toMatchObject({
      isGlutenFree: true,
      isLactoseFree: false,
      status: RecipeStatus.ACTIVE,
    });
    await expect(validate(valid)).resolves.toHaveLength(0);
    await expect(validate(invalid)).resolves.not.toHaveLength(0);
  });
});
