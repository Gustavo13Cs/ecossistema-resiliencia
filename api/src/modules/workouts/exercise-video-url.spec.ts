import { BadRequestException } from '@nestjs/common';
import { normalizeExerciseVideoUrl } from './exercise-video-url';

describe('normalizeExerciseVideoUrl', () => {
  it.each([
    [
      'https://youtube.com/watch?v=abcdefghijk&list=ignored&t=12#x',
      'https://www.youtube.com/watch?v=abcdefghijk',
    ],
    [
      'https://www.youtube.com/watch?v=AbC_123-xyz&utm_source=tracking',
      'https://www.youtube.com/watch?v=AbC_123-xyz',
    ],
    [
      'https://youtu.be/abcdefghijk?si=tracking',
      'https://www.youtube.com/watch?v=abcdefghijk',
    ],
    [
      'https://youtube.com/shorts/abcdefghijk?feature=share',
      'https://www.youtube.com/watch?v=abcdefghijk',
    ],
    [
      'https://www.vimeo.com/12345678?share=copy#x',
      'https://vimeo.com/12345678',
    ],
  ])('canonicalizes_supported_video_urls %s', (input, canonical) => {
    expect(normalizeExerciseVideoUrl(input)).toBe(canonical);
  });
  it.each([
    'https://user:pass@youtube.com/watch?v=abcdefghijk',
    'https://youtube.com.evil/watch?v=abcdefghijk',
    'https://evil.youtube.com/watch?v=abcdefghijk',
    'javascript:alert(1)',
    '/watch?v=abcdefghijk',
    'http://youtu.be/abcdefghijk',
    'https://youtube.com/watch?v=',
    'https://youtu.be/',
    'https://youtube.com/watch?v=short',
    'https://youtube.com/playlist?list=abcdefghijk',
    'https://youtube.com/live/abcdefghijk',
    'https://youtube.com/watch?v=abcdefghijk&v=lmnopqrstuv',
    'https://vimeo.com/channels/example/123',
    'https://vimeo.com/123/private',
    'https://youtu.be:444/abcdefghijk',
    'https://vimeo.com/0',
    'https://youtu.be/abcdefghijk/extra',
    'https://youtu.be/abc%64efghijk',
    'https://youtu.be/abcdefghijk?x=' + 'x'.repeat(2048),
  ])('rejects_credentials_fake_hosts_and_protocols %s', (input) => {
    expect(() => normalizeExerciseVideoUrl(input)).toThrow(BadRequestException);
  });
});
