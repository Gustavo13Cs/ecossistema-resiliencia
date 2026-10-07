import { SetMetadata } from '@nestjs/common';
import { ReadAuditDomain } from '@prisma/client';

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
      domain: ReadAuditDomain;
      shape: 'client' | 'overview' | 'resource' | 'resource-page' | 'ack';
      isolation?: 'Serializable';
      lookup?:
        | 'dietPlan'
        | 'workout'
        | 'rehabPlan'
        | 'meal'
        | 'labExam'
        | 'labOrder'
        | 'clientGoal';
      parameter?: string;
    };
export const ClinicalResponse = (policy: ClinicalResponsePolicy) =>
  SetMetadata(CLINICAL_RESPONSE, Object.freeze(policy));
