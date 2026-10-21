import { BadRequestException } from '@nestjs/common';

/** Reconhece somente vídeos individuais. Nunca consulta o provedor. */
export function normalizeExerciseVideoUrl(input: string): string {
  const invalid = () =>
    new BadRequestException(
      'Informe um link HTTPS de vídeo individual do YouTube ou Vimeo.',
    );
  if (
    typeof input !== 'string' ||
    !input ||
    input.length > 2048 ||
    /[\\\s]/.test(input)
  )
    throw invalid();
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw invalid();
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port)
    throw invalid();
  const host = url.hostname;
  let id: string | undefined;
  if (host === 'youtube.com' || host === 'www.youtube.com') {
    if (url.pathname === '/watch') {
      const ids = url.searchParams.getAll('v');
      if (ids.length !== 1) throw invalid();
      id = ids[0];
    } else {
      id = /^\/shorts\/([A-Za-z0-9_-]{11})$/.exec(url.pathname)?.[1];
    }
  } else if (host === 'youtu.be') {
    id = /^\/([A-Za-z0-9_-]{11})$/.exec(url.pathname)?.[1];
  } else if (host === 'vimeo.com' || host === 'www.vimeo.com') {
    const vimeoId = /^\/([1-9][0-9]*)$/.exec(url.pathname)?.[1];
    if (!vimeoId) throw invalid();
    return `https://vimeo.com/${vimeoId}`;
  }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw invalid();
  return `https://www.youtube.com/watch?v=${id}`;
}
