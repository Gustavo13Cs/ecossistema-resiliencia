import type { Response } from 'express';
import type { PageQueryDto } from './page-query.dto';

export function pageWindow(query: Partial<PageQueryDto> = {}) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 25;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
export function paginationMeta(
  total: number,
  query: Partial<PageQueryDto> = {},
) {
  const { page, pageSize } = pageWindow(query);
  return {
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}
export function setPaginationHeaders(
  response: Response,
  meta: ReturnType<typeof paginationMeta>,
) {
  response.setHeader('X-Pagination-Page', String(meta.page));
  response.setHeader('X-Pagination-Page-Size', String(meta.pageSize));
  response.setHeader('X-Pagination-Total', String(meta.total));
}
export const PAGINATION_EXPOSED_HEADERS = [
  'X-Pagination-Page',
  'X-Pagination-Page-Size',
  'X-Pagination-Total',
  'Retry-After',
];

export function literalLike(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}

// Prisma usa LIKE/ILIKE; a busca da tela interpreta estes caracteres literalmente.
export function literalContains(value: string) {
  return literalLike(value.trim());
}
