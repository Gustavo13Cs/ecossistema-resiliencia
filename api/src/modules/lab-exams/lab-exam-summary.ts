import { pageWindow } from '../../common/pagination/pagination';
import { PageQueryDto } from '../../common/pagination/page-query.dto';
import { Prisma } from '@prisma/client';
import { alteredMarkerSql } from './lab-exam-filters';
export function labExamSummaryQuery(
  owner: string,
  query: Partial<PageQueryDto> = {},
) {
  const { skip, take } = pageWindow(query);
  return Prisma.sql`
        WITH owned_clients AS MATERIALIZED (SELECT id FROM clients WHERE "professionalId" = ${owner}),
        author_exams AS MATERIALIZED (
          SELECT id, "clientId", date FROM lab_exams WHERE "creatorId" = ${owner}
        ), owned_exams AS MATERIALIZED (
          SELECT e.id, e."clientId", e.date FROM author_exams e
          JOIN owned_clients c ON c.id = e."clientId"
        ), owned_markers AS (
          SELECT m.name, m.value FROM lab_markers m JOIN owned_exams e ON e.id = m."examId"
        )
        SELECT ARRAY(SELECT id FROM owned_exams ORDER BY date DESC,id DESC OFFSET ${skip} LIMIT ${take}) AS ids,
          (SELECT count(*)::int FROM owned_exams) AS total,
          (SELECT count(DISTINCT "clientId")::int FROM owned_exams) AS clients,
          count(*) FILTER (WHERE ${alteredMarkerSql()})::int AS altered,
          COALESCE(array_agg(DISTINCT m.name), ARRAY[]::text[]) AS names,
          (SELECT count(*)::int FROM lab_orders o
           WHERE o."professionalId" = ${owner} AND o."clientId" IN (SELECT id FROM owned_clients)) AS orders
        FROM owned_markers m
      `;
}
