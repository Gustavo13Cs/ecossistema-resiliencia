/** Ferramenta explícita de manutenção; nunca importar no caminho de requests clínicos. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { EXERCISE_DEMONSTRATION_MANIFEST } from '../src/modules/workouts/exercise-demonstration-manifest';
import {
  isApprovedDemonstrationAsset,
  validateDemonstrationManifest,
} from '../src/modules/workouts/exercise-demonstration';
import type { DemonstrationAsset } from '../src/modules/workouts/exercise-demonstration.types';

const execute = promisify(execFile);
export interface ProbeResponse {
  status: number;
  contentType: string;
}
export type MediaProbeRequest = (
  url: string,
  method: 'HEAD' | 'GET',
) => Promise<ProbeResponse>;

// curl herda proxy/CA do ambiente, sem shell, cookies ou credenciais da aplicação.
// Sem -L: nenhum redirect é seguido, inclusive para outro host autorizado.
export const requestMediaStatus: MediaProbeRequest = async (url, method) => {
  const args = [
    '--silent',
    '--show-error',
    '--proto',
    '=https',
    '--max-time',
    '10',
    '--max-redirs',
    '0',
    '--max-filesize',
    '1048576',
    '--output',
    '/dev/null',
    '--write-out',
    '%{http_code}\n%{content_type}',
    ...(method === 'HEAD' ? ['--head'] : ['--range', '0-0']),
    '--url',
    url,
  ];
  const { stdout } = await execute('curl', args, {
    timeout: 11000,
    maxBuffer: 4096,
  });
  const [status, contentType] = stdout.trim().split('\n');
  return { status: Number(status), contentType: contentType ?? '' };
};

export async function probeApprovedAsset(
  asset: DemonstrationAsset,
  request: MediaProbeRequest = requestMediaStatus,
): Promise<ProbeResponse> {
  if (!isApprovedDemonstrationAsset(asset))
    throw new Error('Unapproved media probe');
  let response = await request(asset.url, 'HEAD');
  if (response.status === 405 || response.status === 501)
    response = await request(asset.url, 'GET');
  if (
    ![200, 206].includes(response.status) ||
    response.contentType.split(';')[0].trim().toLowerCase() !== 'image/svg+xml'
  )
    throw new Error(
      `Unavailable media: HTTP ${response.status}, type ${response.contentType}`,
    );
  return response;
}

export async function verifyExerciseDemonstrations(
  mode: string,
): Promise<void> {
  if (!['--check', '--probe'].includes(mode))
    throw new Error('Use --check or --probe');
  validateDemonstrationManifest(EXERCISE_DEMONSTRATION_MANIFEST);
  const groups = EXERCISE_DEMONSTRATION_MANIFEST.map((entry) =>
    ['QUADRICEPS', 'HAMSTRINGS'].includes(entry.muscleGroup)
      ? 'LEGS'
      : entry.muscleGroup,
  );
  if (
    EXERCISE_DEMONSTRATION_MANIFEST.length < 20 ||
    ['CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'CORE'].some(
      (group) => groups.filter((value) => value === group).length < 4,
    )
  )
    throw new Error('Insufficient verified exercise coverage');
  console.log(
    `CHECK OK: ${EXERCISE_DEMONSTRATION_MANIFEST.length} exercises, ${EXERCISE_DEMONSTRATION_MANIFEST.flatMap((entry) => entry.assets).length} illustrations, five groups`,
  );
  if (mode === '--check') return;
  let failures = 0;
  for (const asset of EXERCISE_DEMONSTRATION_MANIFEST.flatMap(
    (entry) => entry.assets,
  )) {
    try {
      const response = await probeApprovedAsset(asset);
      console.log(
        `PROBE OK ${asset.id}: HTTP ${response.status} ${response.contentType}`,
      );
    } catch (error) {
      failures++;
      console.error(
        `PROBE FAIL ${asset.id}: ${error instanceof Error ? error.message : 'Unknown failure'}`,
      );
    }
  }
  if (failures) throw new Error(`${failures} media probes failed`);
}

if (require.main === module) {
  if (process.argv.length !== 3) {
    console.error('Use --check or --probe');
    process.exitCode = 1;
  } else
    void verifyExerciseDemonstrations(process.argv[2]).catch(
      (error: unknown) => {
        console.error(
          error instanceof Error ? error.message : 'Verification failed',
        );
        process.exitCode = 1;
      },
    );
}
