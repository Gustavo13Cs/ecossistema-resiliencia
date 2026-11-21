import { Prisma } from '@prisma/client';
import { literalContains } from '../../common/pagination/pagination';
import {
  CLINICAL_MARKERS_DICTIONARY,
  type MarkerReference,
} from './lab-marker-reference';
import { ListLabExamsQueryDto } from './dto/list-lab-exams-query.dto';

function outside(
  ref: MarkerReference,
  optimal: boolean,
): Prisma.LabMarkerWhereInput[] {
  const min = optimal ? ref.optimalMin : ref.min;
  const max = optimal ? ref.optimalMax : ref.max;
  return [
    ...(min === undefined ? [] : [{ value: { lt: min } }]),
    ...(max === undefined ? [] : [{ value: { gt: max } }]),
  ];
}
export function markerStatusFilter(status: string): Prisma.LabMarkerWhereInput {
  const entries: Prisma.LabMarkerWhereInput[] = Object.entries(
    CLINICAL_MARKERS_DICTIONARY,
  ).flatMap(([name, ref]) => {
    const alerts = outside(ref, false),
      borders = outside(ref, true);
    if (
      (status === 'ALERT' && !alerts.length) ||
      (status === 'BORDERLINE' && !borders.length)
    )
      return [];
    const conditions: Prisma.LabMarkerWhereInput[] = [];
    if (status === 'ALERT') conditions.push({ OR: alerts });
    else {
      if (alerts.length) conditions.push({ NOT: { OR: alerts } });
      if (borders.length)
        conditions.push(
          status === 'BORDERLINE' ? { OR: borders } : { NOT: { OR: borders } },
        );
    }
    return [{ name, AND: conditions }];
  });
  if (status === 'OPTIMAL')
    entries.push({ name: { notIn: Object.keys(CLINICAL_MARKERS_DICTIONARY) } });
  return { OR: entries };
}
export function examWhere(
  owner: string,
  query: ListLabExamsQueryDto,
): Prisma.LabExamWhereInput {
  const AND: Prisma.LabExamWhereInput[] = [];
  if (query.q?.trim()) {
    const match: Prisma.StringFilter = {
      contains: literalContains(query.q),
      mode: 'insensitive',
    };
    AND.push({
      OR: [
        { client: { name: match } },
        { notes: match },
        { markers: { some: { name: match } } },
      ],
    });
  }
  if (query.status && query.status !== 'ALL')
    AND.push({ markers: { some: markerStatusFilter(query.status) } });
  if (query.category && query.category !== 'ALL')
    AND.push({
      markers: {
        some: {
          name: {
            in: Object.entries(CLINICAL_MARKERS_DICTIONARY)
              .filter(([, ref]) => ref.category === query.category)
              .map(([name]) => name),
          },
        },
      },
    });
  return {
    creatorId: owner,
    client: { professionalId: owner },
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(AND.length ? { AND } : {}),
  };
}
// Somente nomes de colunas fixos; valores do dicionário continuam parametrizados.
export function alteredMarkerSql() {
  const conditions = Object.entries(CLINICAL_MARKERS_DICTIONARY).flatMap(
    ([name, ref]) => {
      const bounds = [
        ...(ref.min === undefined ? [] : [Prisma.sql`m.value < ${ref.min}`]),
        ...(ref.max === undefined ? [] : [Prisma.sql`m.value > ${ref.max}`]),
        ...(ref.optimalMin === undefined
          ? []
          : [Prisma.sql`m.value < ${ref.optimalMin}`]),
        ...(ref.optimalMax === undefined
          ? []
          : [Prisma.sql`m.value > ${ref.optimalMax}`]),
      ];
      return bounds.length
        ? [Prisma.sql`(m.name = ${name} AND (${Prisma.join(bounds, ' OR ')}))`]
        : [];
    },
  );
  return Prisma.sql`(${Prisma.join(conditions, ' OR ')})`;
}
