import { SAFEMOVE_EXERCISE_CATALOG } from './exercise-catalog';
import {
  DEMONSTRATION_MANIFEST_VERSION,
  EXERCISE_DEMONSTRATION_MANIFEST,
} from './exercise-demonstration-manifest';
import type {
  DemonstrationAsset,
  DemonstrationManifestEntry,
  DemonstrationSnapshot,
} from './exercise-demonstration.types';

export const DEMONSTRATION_MEDIA_RULES = Object.freeze([
  Object.freeze({
    origin: 'https://cdn.jsdelivr.net',
    pathPrefix:
      '/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/',
  }),
]);

// Retirada por direitos é explícita. Remover da seleção atual não revoga o histórico.
export const REVOKED_DEMONSTRATION_ASSET_IDS: ReadonlySet<string> =
  new Set<string>();

// Registro de variantes conferidas, independente do manifesto de seleção atual.
// Preservar entradas históricas autorizadas ao editar o manifesto; revogar pelo ID acima.
const VERIFIED_CATALOG_VARIANTS: Readonly<Record<string, string>> =
  Object.freeze({
    'cat-chest-01': 'exercise-bench-press',
    'cat-chest-02': 'exercise-dumbbell-bench-press',
    'cat-chest-03': 'exercise-incline-bench-press',
    'cat-chest-08': 'exercise-dumbbell-fly',
    'cat-back-04': 'exercise-pull-up',
    'cat-back-09': 'exercise-one-arm-dumbbell-row',
    'cat-back-10': 'exercise-seated-row',
    'cat-back-14': 'exercise-dumbbell-shrug',
    'cat-quads-01': 'exercise-squat',
    'cat-quads-02': 'exercise-front-squat',
    'cat-hams-05': 'exercise-leg-curl',
    'cat-hams-06': 'exercise-seated-leg-curl',
    'cat-shoulders-01': 'exercise-seated-dumbbell-press',
    'cat-shoulders-03': 'exercise-arnold-press',
    'cat-shoulders-05': 'exercise-lateral-raise',
    'cat-shoulders-08': 'exercise-front-raise',
    'cat-core-01': 'exercise-plank',
    'cat-core-02': 'exercise-side-plank',
    'cat-core-10': 'exercise-dead-bug',
    'cat-core-11': 'exercise-bird-dog',
  });
const VERIFIED_SOURCE_IDS = new Set(Object.values(VERIFIED_CATALOG_VARIANTS));

function validText(value: unknown, maximum: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maximum
  );
}

function canonicalHttps(value: unknown): URL | null {
  if (!validText(value, 2048)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.href === value
      ? url
      : null;
  } catch {
    return null;
  }
}

export function isApprovedDemonstrationAsset(
  asset: DemonstrationAsset,
): boolean {
  if (
    !asset ||
    asset.type !== 'IMAGE' ||
    !validText(asset.id, 300) ||
    REVOKED_DEMONSTRATION_ASSET_IDS.has(asset.id) ||
    !validText(asset.alt, 300) ||
    !validText(asset.author, 300) ||
    asset.licenseName !== 'CC BY-SA 4.0' ||
    asset.licenseUrl !== 'https://creativecommons.org/licenses/by-sa/4.0/'
  )
    return false;
  const url = canonicalHttps(asset.url);
  const rule = DEMONSTRATION_MEDIA_RULES[0];
  if (
    !url ||
    url.origin !== rule.origin ||
    !url.pathname.startsWith(rule.pathPrefix)
  )
    return false;
  const match = /^([a-z0-9-]+)\/frame-(1|3)\.svg$/.exec(
    url.pathname.slice(rule.pathPrefix.length),
  );
  if (!match) return false;
  const [, slug, frame] = match;
  if (
    !VERIFIED_SOURCE_IDS.has(`exercise-${slug}`) ||
    (frame === '3' && slug !== 'arnold-press') ||
    asset.id !== `workout-guide-${slug}-frame-${frame}`
  )
    return false;
  const source = canonicalHttps(asset.sourcePageUrl);
  const sourcePath = url.pathname.replace(
    '/gh/bryllim/workout-guide@',
    '/bryllim/workout-guide/blob/',
  );
  if (
    !source ||
    source.origin !== 'https://github.com' ||
    source.pathname !== sourcePath
  )
    return false;
  if (asset.upstreamSourcePageUrl !== undefined) {
    const upstream = canonicalHttps(asset.upstreamSourcePageUrl);
    if (
      !upstream ||
      upstream.origin !== 'https://github.com' ||
      !/^\/everkinetic\/data\/blob\/446bb9a3d0c3beb6b84f7c9d77dfc8af707a2ab6\/dist\/svg\/[0-9]{4}-tension\.svg$/.test(
        upstream.pathname,
      ) ||
      !validText(asset.changes, 2000)
    )
      return false;
  }
  return asset.changes === undefined || validText(asset.changes, 2000);
}

export function validateDemonstrationManifest(
  entries: readonly DemonstrationManifestEntry[],
): void {
  if (!Array.isArray(entries as unknown))
    throw new Error('Invalid demonstration manifest');
  const exerciseIds = new Set<string>();
  const assetIds = new Set<string>();
  for (const entry of entries) {
    const catalog = SAFEMOVE_EXERCISE_CATALOG.find(
      (item) => item.id === entry.exerciseId,
    );
    if (
      !catalog ||
      exerciseIds.has(entry.exerciseId) ||
      VERIFIED_CATALOG_VARIANTS[entry.exerciseId] !== entry.sourceExerciseId ||
      catalog.equipment !== entry.equipment ||
      catalog.muscleGroup !== entry.muscleGroup ||
      !validText(entry.originalName, 300) ||
      !/^[1-9][0-9]*$/.test(entry.itemRevision) ||
      !validText(entry.instruction, 2000)
    )
      throw new Error(`Invalid demonstration mapping: ${entry.exerciseId}`);
    exerciseIds.add(entry.exerciseId);
    const requiredFrames =
      entry.sourceExerciseId === 'exercise-arnold-press' ? 2 : 1;
    if (
      !Array.isArray(entry.assets as unknown) ||
      entry.assets.length !== requiredFrames
    )
      throw new Error(`Invalid demonstration assets: ${entry.exerciseId}`);
    for (const asset of entry.assets) {
      const slug = entry.sourceExerciseId.slice('exercise-'.length);
      if (
        !isApprovedDemonstrationAsset(asset) ||
        !asset.id.startsWith(`workout-guide-${slug}-frame-`) ||
        assetIds.has(asset.id)
      )
        throw new Error(`Unapproved demonstration asset: ${entry.exerciseId}`);
      assetIds.add(asset.id);
    }
  }
}

export function findCatalogDemonstration(
  exerciseId: string,
): DemonstrationSnapshot | null {
  const entry = EXERCISE_DEMONSTRATION_MANIFEST.find(
    (item) => item.exerciseId === exerciseId,
  );
  if (!entry) return null;
  return {
    revision: `${DEMONSTRATION_MANIFEST_VERSION}:${entry.itemRevision}`,
    instruction: entry.instruction,
    assets: entry.assets.map((asset) => ({ ...asset })),
  };
}
