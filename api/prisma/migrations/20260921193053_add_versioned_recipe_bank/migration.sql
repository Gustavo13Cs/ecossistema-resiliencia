-- CreateEnum
CREATE TYPE "RecipeStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RecipeCategory" AS ENUM ('BREAKFAST', 'MAIN_MEAL', 'SNACK', 'DESSERT', 'DRINK', 'OTHER');

-- DropForeignKey
ALTER TABLE "meal_items" DROP CONSTRAINT "meal_items_foodId_fkey";

-- AlterTable
ALTER TABLE "meal_items" ADD COLUMN     "recipeVersionId" TEXT,
ALTER COLUMN "foodId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "status" "RecipeStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_versions" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "RecipeCategory" NOT NULL,
    "servings" DOUBLE PRECISION NOT NULL,
    "instructions" TEXT,
    "isGlutenFree" BOOLEAN NOT NULL DEFAULT false,
    "isLactoseFree" BOOLEAN NOT NULL DEFAULT false,
    "isVegan" BOOLEAN NOT NULL DEFAULT false,
    "kcal" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION NOT NULL,
    "sodium" DOUBLE PRECISION NOT NULL,
    "calcium" DOUBLE PRECISION NOT NULL,
    "iron" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "recipe_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeVersionId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "measure" TEXT NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recipes_currentVersionId_key" ON "recipes"("currentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_id_currentVersionId_key" ON "recipes"("id", "currentVersionId");

-- CreateIndex
CREATE INDEX "recipes_professionalId_status_updatedAt_idx" ON "recipes"("professionalId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "recipe_versions_recipeId_createdAt_idx" ON "recipe_versions"("recipeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_versions_recipeId_version_key" ON "recipe_versions"("recipeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_versions_recipeId_id_key" ON "recipe_versions"("recipeId", "id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_foodId_idx" ON "recipe_ingredients"("foodId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipeVersionId_foodId_key" ON "recipe_ingredients"("recipeVersionId", "foodId");

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_currentVersionId_fkey" FOREIGN KEY ("id", "currentVersionId") REFERENCES "recipe_versions"("recipeId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "recipe_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "recipe_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce that a meal item references either a food or a recipe version, never both.
ALTER TABLE "public"."meal_items"
ADD CONSTRAINT "meal_items_exactly_one_source_check"
CHECK (
  ("foodId" IS NOT NULL AND "recipeVersionId" IS NULL)
  OR ("foodId" IS NULL AND "recipeVersionId" IS NOT NULL)
);

-- Recipe versions are append-only. The only permitted update is the one-way
-- publication marker written by the recipe publication trigger below.
CREATE FUNCTION "public"."prevent_recipe_version_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $recipe_version_immutable$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Recipe versions are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF OLD."publishedAt" IS NULL
     AND NEW."publishedAt" IS NOT NULL
     AND (to_jsonb(NEW) - 'publishedAt') = (to_jsonb(OLD) - 'publishedAt') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Recipe versions are immutable'
    USING ERRCODE = '55000';
END
$recipe_version_immutable$;

CREATE TRIGGER "recipe_versions_immutable"
BEFORE UPDATE OR DELETE ON "public"."recipe_versions"
FOR EACH ROW
EXECUTE FUNCTION "public"."prevent_recipe_version_mutation"();

CREATE FUNCTION "public"."publish_recipe_version_snapshot"()
RETURNS trigger
LANGUAGE plpgsql
AS $publish_recipe_version$
BEGIN
  IF NEW."currentVersionId" IS NOT NULL
     AND NEW."currentVersionId" IS DISTINCT FROM OLD."currentVersionId" THEN
    UPDATE "public"."recipe_versions"
    SET "publishedAt" = CURRENT_TIMESTAMP
    WHERE "id" = NEW."currentVersionId"
      AND "recipeId" = NEW."id"
      AND "publishedAt" IS NULL;
  END IF;

  RETURN NEW;
END
$publish_recipe_version$;

CREATE TRIGGER "recipes_publish_current_version"
AFTER UPDATE OF "currentVersionId" ON "public"."recipes"
FOR EACH ROW
EXECUTE FUNCTION "public"."publish_recipe_version_snapshot"();

CREATE FUNCTION "public"."protect_published_recipe_ingredients"()
RETURNS trigger
LANGUAGE plpgsql
AS $recipe_ingredients_immutable$
DECLARE
  published_snapshot boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT rv."publishedAt" IS NOT NULL
    INTO published_snapshot
    FROM "public"."recipe_versions" rv
    WHERE rv."id" = NEW."recipeVersionId";
  ELSIF TG_OP = 'DELETE' THEN
    SELECT rv."publishedAt" IS NOT NULL
    INTO published_snapshot
    FROM "public"."recipe_versions" rv
    WHERE rv."id" = OLD."recipeVersionId";
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM "public"."recipe_versions" rv
      WHERE rv."id" IN (OLD."recipeVersionId", NEW."recipeVersionId")
        AND rv."publishedAt" IS NOT NULL
    )
    INTO published_snapshot;
  END IF;

  IF COALESCE(published_snapshot, false) THEN
    RAISE EXCEPTION 'Published recipe ingredients are immutable'
      USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$recipe_ingredients_immutable$;

CREATE TRIGGER "published_recipe_ingredients_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "public"."recipe_ingredients"
FOR EACH ROW
EXECUTE FUNCTION "public"."protect_published_recipe_ingredients"();

-- Keep the Supabase Data API blocked for recipe data. Application ownership
-- remains enforced by the NestJS layer because Prisma connects with BYPASSRLS.
ALTER TABLE "public"."recipes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_data_api_access" ON "public"."recipes"
AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."recipe_versions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_data_api_access" ON "public"."recipe_versions"
AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."recipe_ingredients" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_data_api_access" ON "public"."recipe_ingredients"
AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

-- recipe-data-api-revoke:start
DO $revoke_data_api$
DECLARE
  data_api_role text;
BEGIN
  FOREACH data_api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = data_api_role) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public.recipes, public.recipe_versions, public.recipe_ingredients FROM %I',
        data_api_role
      );
    END IF;
  END LOOP;
END
$revoke_data_api$;
-- recipe-data-api-revoke:end
