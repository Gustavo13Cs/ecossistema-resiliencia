import { createHash } from 'node:crypto';
import { SAFEMOVE_EXERCISE_CATALOG } from './exercise-catalog';
import {
  EXERCISE_DEMONSTRATION_MANIFEST,
  DEMONSTRATION_MANIFEST_VERSION,
} from './exercise-demonstration-manifest';
import {
  findCatalogDemonstration,
  isApprovedDemonstrationAsset,
  validateDemonstrationManifest,
  DEMONSTRATION_MEDIA_RULES,
  REVOKED_DEMONSTRATION_ASSET_IDS,
} from './exercise-demonstration';
import type { DemonstrationManifestEntry } from './exercise-demonstration.types';
const cloneEntry = (): DemonstrationManifestEntry => {
  expect(EXERCISE_DEMONSTRATION_MANIFEST.length).toBeGreaterThanOrEqual(20);
  return structuredClone(EXERCISE_DEMONSTRATION_MANIFEST[0]);
};
describe('verified exercise demonstrations', () => {
  it('manifest_preserves_existing_catalog_ids', () => {
    expect(SAFEMOVE_EXERCISE_CATALOG).toHaveLength(148);
    expect(
      createHash('sha256')
        .update(SAFEMOVE_EXERCISE_CATALOG.map((item) => item.id).join('\n'))
        .digest('hex'),
    ).toBe('96fdd08160a4585558f4fd53d673e037acdcc761cfa7ccc7f7e0f57791e5b458');
    for (const entry of EXERCISE_DEMONSTRATION_MANIFEST)
      expect(
        SAFEMOVE_EXERCISE_CATALOG.some((item) => item.id === entry.exerciseId),
      ).toBe(true);
  });
  it('has_twenty_verified_demonstrations_across_five_groups', () => {
    expect(EXERCISE_DEMONSTRATION_MANIFEST).toHaveLength(20);
    const groups = EXERCISE_DEMONSTRATION_MANIFEST.map((entry) =>
      ['QUADRICEPS', 'HAMSTRINGS'].includes(entry.muscleGroup)
        ? 'LEGS'
        : entry.muscleGroup,
    );
    for (const group of ['CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'CORE'])
      expect(groups.filter((value) => value === group)).toHaveLength(4);
    expect(() =>
      validateDemonstrationManifest(EXERCISE_DEMONSTRATION_MANIFEST),
    ).not.toThrow();
    expect(
      EXERCISE_DEMONSTRATION_MANIFEST.flatMap((entry) => entry.assets),
    ).toHaveLength(21);
  });
  it('rejects_missing_authorship_or_license', () => {
    for (const field of [
      'author',
      'licenseName',
      'licenseUrl',
      'sourcePageUrl',
      'alt',
    ] as const) {
      const entry = cloneEntry();
      entry.assets[0][field] = '';
      expect(() => validateDemonstrationManifest([entry])).toThrow();
      expect(isApprovedDemonstrationAsset(entry.assets[0])).toBe(false);
    }
  });
  it('rejects_nc_license_or_unknown_host', () => {
    for (const patch of [
      {
        licenseName: 'CC BY-NC 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
      },
      { url: 'https://cdn.jsdelivr.net.attacker.example/image.svg' },
      { url: 'https://cdn.jsdelivr.net/gh/another/repo/image.svg' },
      { url: 'javascript:alert(1)' },
    ]) {
      const entry = cloneEntry();
      Object.assign(entry.assets[0], patch);
      expect(() => validateDemonstrationManifest([entry])).toThrow();
      expect(isApprovedDemonstrationAsset(entry.assets[0])).toBe(false);
    }
  });
  it('rejects_wrong_equipment_mapping', () => {
    const entry = cloneEntry();
    entry.equipment = 'DUMBBELL';
    expect(() => validateDemonstrationManifest([entry])).toThrow();
    entry.equipment = 'BARBELL';
    entry.exerciseId = 'cat-chest-05';
    expect(() => validateDemonstrationManifest([entry])).toThrow();
  });
  it('rejects_duplicate_ids_and_missing_or_oversized_instructions', () => {
    const entry = cloneEntry();
    expect(() => validateDemonstrationManifest([entry, entry])).toThrow();
    for (const instruction of ['', ' '.repeat(10), 'x'.repeat(2001)])
      expect(() =>
        validateDemonstrationManifest([{ ...entry, instruction }]),
      ).toThrow();
    entry.assets.push({ ...entry.assets[0] });
    expect(() => validateDemonstrationManifest([entry])).toThrow();
  });
  it('rejects_noncanonical_media_urls_and_unreviewed_frames', () => {
    const entry = cloneEntry();
    const url = entry.assets[0].url;
    for (const invalid of [
      url.replace('https:', 'http:'),
      url + '?tracking=patient',
      url + '#fragment',
      url.replace('https://', 'https://user:password@'),
      url.replace('frame-1', 'frame-9'),
      url.replace('aac599224bb9780305239607ef98540b7e0ce389', 'main'),
    ])
      expect(
        isApprovedDemonstrationAsset({ ...entry.assets[0], url: invalid }),
      ).toBe(false);
    expect(DEMONSTRATION_MEDIA_RULES).toHaveLength(1);
  });
  it('rejects_excess_assets_and_metadata_limits_without_truncation', () => {
    for (const patch of [
      { alt: 'x'.repeat(301) },
      { author: 'x'.repeat(301) },
      { url: 'https://example.com/' + 'x'.repeat(2048) },
      { licenseUrl: 'https://example.com/' },
      { type: 'VIDEO' as const },
    ]) {
      const entry = cloneEntry();
      Object.assign(entry.assets[0], patch);
      expect(() => validateDemonstrationManifest([entry])).toThrow();
    }
    const entry = cloneEntry();
    entry.assets = [];
    expect(() => validateDemonstrationManifest([entry])).toThrow();
  });
  it('resolves_detached_snapshots_and_keeps_unmapped_exercises_manual', () => {
    const entry = cloneEntry();
    const snapshot = findCatalogDemonstration(entry.exerciseId);
    expect(snapshot).toMatchObject({
      revision: DEMONSTRATION_MANIFEST_VERSION + ':' + entry.itemRevision,
      instruction: entry.instruction,
      assets: entry.assets,
    });
    snapshot!.assets![0].author = 'modified';
    expect(findCatalogDemonstration(entry.exerciseId)!.assets![0].author).toBe(
      entry.assets[0].author,
    );
    expect(findCatalogDemonstration('cat-chest-20')).toBeNull();
    expect(findCatalogDemonstration('unknown')).toBeNull();
  });
  it('keeps_historical_assets_approved_without_current_selection_membership', () => {
    const asset = cloneEntry().assets[0];
    expect(isApprovedDemonstrationAsset(asset)).toBe(true);
    expect(
      isApprovedDemonstrationAsset({ ...asset, id: asset.id + '-forged' }),
    ).toBe(false);
    expect(REVOKED_DEMONSTRATION_ASSET_IDS.size).toBe(0);
  });
  it('selection_removal_does_not_revoke_a_historical_asset', () => {
    const asset = cloneEntry().assets[0];
    const selection =
      EXERCISE_DEMONSTRATION_MANIFEST as DemonstrationManifestEntry[];
    const original = selection.splice(0);
    try {
      expect(findCatalogDemonstration(original[0].exerciseId)).toBeNull();
      expect(isApprovedDemonstrationAsset(asset)).toBe(true);
    } finally {
      selection.push(...original);
    }
  });

  it('explicit_rights_revocation_blocks_only_the_selected_asset', () => {
    const asset = cloneEntry().assets[0];
    const revoked = REVOKED_DEMONSTRATION_ASSET_IDS as Set<string>;
    revoked.add(asset.id);
    try {
      expect(isApprovedDemonstrationAsset(asset)).toBe(false);
      expect(
        isApprovedDemonstrationAsset(
          EXERCISE_DEMONSTRATION_MANIFEST[1].assets[0],
        ),
      ).toBe(true);
      expect(
        findCatalogDemonstration(EXERCISE_DEMONSTRATION_MANIFEST[0].exerciseId)
          ?.assets?.[0],
      ).toEqual(asset);
    } finally {
      revoked.delete(asset.id);
    }
  });
});
