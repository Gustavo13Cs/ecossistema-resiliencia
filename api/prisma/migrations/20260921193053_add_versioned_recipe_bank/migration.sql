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
CREATE INDEX "recipes_professionalId_status_updatedAt_idx" ON "recipes"("professionalId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "recipe_versions_recipeId_createdAt_idx" ON "recipe_versions"("recipeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_versions_recipeId_version_key" ON "recipe_versions"("recipeId", "version");

-- CreateIndex
CREATE INDEX "recipe_ingredients_foodId_idx" ON "recipe_ingredients"("foodId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipeVersionId_foodId_key" ON "recipe_ingredients"("recipeVersionId", "foodId");

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "recipe_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "recipe_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "recipe_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enforce that a meal item references either a food or a recipe version, never both.
ALTER TABLE "public"."meal_items"
ADD CONSTRAINT "meal_items_exactly_one_source_check"
CHECK (
  ("foodId" IS NOT NULL AND "recipeVersionId" IS NULL)
  OR ("foodId" IS NULL AND "recipeVersionId" IS NOT NULL)
);

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
