import {
  probeApprovedAsset,
  verifyExerciseDemonstrations,
} from '../../../scripts/verify-exercise-demonstrations';
import { EXERCISE_DEMONSTRATION_MANIFEST } from './exercise-demonstration-manifest';
import type { MediaProbeRequest } from '../../../scripts/verify-exercise-demonstrations';

const asset = EXERCISE_DEMONSTRATION_MANIFEST[0].assets[0];
describe('explicit demonstration maintenance probes (offline)', () => {
  it('accepts_an_approved_svg_head_without_downloading_content', async () => {
    const request = jest
      .fn<ReturnType<MediaProbeRequest>, Parameters<MediaProbeRequest>>()
      .mockResolvedValue({
        status: 200,
        contentType: 'image/svg+xml; charset=utf-8',
      });
    await expect(probeApprovedAsset(asset, request)).resolves.toMatchObject({
      status: 200,
    });
    expect(request.mock.calls).toEqual([[asset.url, 'HEAD']]);
  });
  it('uses_bounded_get_only_when_head_is_unsupported', async () => {
    const request = jest
      .fn<ReturnType<MediaProbeRequest>, Parameters<MediaProbeRequest>>()
      .mockResolvedValueOnce({ status: 405, contentType: '' })
      .mockResolvedValueOnce({ status: 206, contentType: 'image/svg+xml' });
    await expect(probeApprovedAsset(asset, request)).resolves.toMatchObject({
      status: 206,
    });
    expect(request.mock.calls).toEqual([
      [asset.url, 'HEAD'],
      [asset.url, 'GET'],
    ]);
  });
  it.each([301, 302, 404, 500])(
    'rejects_http_%i_without_following_redirect_or_retrying',
    async (status) => {
      const request = jest
        .fn<ReturnType<MediaProbeRequest>, Parameters<MediaProbeRequest>>()
        .mockResolvedValue({ status, contentType: 'image/svg+xml' });
      await expect(probeApprovedAsset(asset, request)).rejects.toThrow(
        `HTTP ${status}`,
      );
      expect(request).toHaveBeenCalledTimes(1);
    },
  );
  it('rejects_html_even_on_http_200', async () => {
    await expect(
      probeApprovedAsset(asset, () =>
        Promise.resolve({
          status: 200,
          contentType: 'text/html',
        }),
      ),
    ).rejects.toThrow('text/html');
  });
  it('rejects_unapproved_input_before_network_and_reports_timeout', async () => {
    const request = jest.fn<
      ReturnType<MediaProbeRequest>,
      Parameters<MediaProbeRequest>
    >();
    await expect(
      probeApprovedAsset({ ...asset, url: 'https://example.com/' }, request),
    ).rejects.toThrow('Unapproved');
    expect(request).not.toHaveBeenCalled();
    request.mockRejectedValue(new Error('timeout'));
    await expect(probeApprovedAsset(asset, request)).rejects.toThrow('timeout');
  });
  it('checks_locally_and_rejects_unknown_modes', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await expect(
        verifyExerciseDemonstrations('--check'),
      ).resolves.toBeUndefined();
      await expect(verifyExerciseDemonstrations('--unknown')).rejects.toThrow(
        'Use --check, --probe or --write-public-rules',
      );
    } finally {
      log.mockRestore();
    }
  });
});
