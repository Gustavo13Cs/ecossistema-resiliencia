import { SetMetadata } from '@nestjs/common';

export const CLINICAL_RESPONSE = 'safemove.clinical-response';
export type ClinicalResponsePolicy =
  | {
      exception:
        | 'auth'
        | 'health'
        | 'profile'
        | 'catalog'
        | 'private-recipe'
        | 'private-template';
    }
  | {
      shape: 'client' | 'overview' | 'resource' | 'resource-page' | 'ack';
      isolation?: 'Serializable';
    };
export const ClinicalResponse = (policy: ClinicalResponsePolicy) =>
  SetMetadata(CLINICAL_RESPONSE, Object.freeze(policy));
