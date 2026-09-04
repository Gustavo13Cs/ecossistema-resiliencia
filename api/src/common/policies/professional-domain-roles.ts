export const DOMAIN_ROLES = Object.freeze({
  nutrition: Object.freeze(['NUTRITIONIST'] as const),
  training: Object.freeze(['PERSONAL'] as const),
  rehabilitation: Object.freeze(['PHYSIO'] as const),
  sharedAssessment: Object.freeze([
    'NUTRITIONIST',
    'PERSONAL',
    'PHYSIO',
  ] as const),
});
