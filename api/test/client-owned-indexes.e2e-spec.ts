import { Pool } from 'pg';
import { assertIsolationDatabase } from './fixtures/client-isolation';

type IndexRow = { table_name: string; index_name: string; columns: string[] };
const HOT_QUERIES: Array<[string, string[]]> = [
  ['workouts', ['creatorId', 'clientId', 'isActive']],
  ['rehab_plans', ['creatorId', 'clientId', 'isActive']],
  ['physio_assessments', ['creatorId', 'clientId', 'date']],
  ['anamneses', ['creatorId', 'clientId', 'createdAt']],
  ['consultation_notes', ['creatorId', 'clientId', 'createdAt']],
  ['supplement_plans', ['creatorId', 'clientId', 'createdAt']],
  ['lab_exams', ['creatorId', 'clientId', 'date']],
  ['physical_assessments', ['clientId', 'date']],
  ['DailyTracking', ['professionalId', 'clientId', 'type', 'completedAt']],
  ['client_goals', ['professionalId', 'updatedAt']],
  ['lab_orders', ['professionalId', 'issuedAt']],
];
const ACTIVE_CHILDREN = [
  'workout_splits',
  'workout_exercises',
  'rehab_sessions',
  'rehab_exercises',
  'supplement_items',
  'lab_markers',
  'meals',
  'meal_items',
];
const INDEX_QUERY = `SELECT t.relname AS table_name, x.relname AS index_name,
 ARRAY(SELECT a.attname::text FROM unnest(i.indkey::smallint[]) WITH ORDINALITY k(n,o)
 JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.n WHERE o<=i.indnkeyatts ORDER BY k.o) AS columns
 FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_class x ON x.oid=i.indexrelid
 WHERE t.relnamespace='public'::regnamespace AND i.indisvalid AND i.indpred IS NULL AND i.indexprs IS NULL`;

describe('Client-owned query and FK indexes (PostgreSQL)', () => {
  let pool: Pool;
  let indexes: IndexRow[];
  beforeAll(async () => {
    assertIsolationDatabase();
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    indexes = (await pool.query<IndexRow>(INDEX_QUERY)).rows;
  });
  afterAll(async () => {
    await pool?.end();
  });
  it.each(HOT_QUERIES)(
    'supports hot %s predicate/order %j',
    (table, columns) => {
      expect(
        indexes.some(
          (index) =>
            index.table_name === table &&
            columns.every((column, offset) => index.columns[offset] === column),
        ),
      ).toBe(true);
    },
  );
  it('covers every Client FK and active nested-resource FK with a leading index', async () => {
    const fks = (
      await pool.query<{
        table_name: string;
        columns: string[];
      }>(`SELECT t.relname AS table_name,
      ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(n,o) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.n ORDER BY k.o) AS columns
      FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid WHERE c.contype='f' AND t.relnamespace='public'::regnamespace`)
    ).rows;
    const relevant = fks.filter(
      (fk) =>
        fk.columns.includes('clientId') ||
        (ACTIVE_CHILDREN.includes(fk.table_name) &&
          !fk.columns.includes('recipeVersionId')),
    );
    expect(relevant.length).toBeGreaterThan(20);
    const missing = relevant.filter(
      (fk) =>
        !indexes.some(
          (index) =>
            index.table_name === fk.table_name &&
            fk.columns.every(
              (column, offset) => index.columns[offset] === column,
            ),
        ),
    );
    expect(missing).toEqual([]);
  });
  it('has no duplicate ordered index definition', () => {
    const definitions = indexes.map(
      (index) => `${index.table_name}:${index.columns.join(',')}`,
    );
    expect(new Set(definitions).size).toBe(definitions.length);
  });
  it('does not add a redundant single-column Client or child index', () => {
    const newSingles = indexes.filter(
      (index) =>
        index.columns.length === 1 &&
        ((['workouts', 'rehab_plans'].includes(index.table_name) &&
          index.columns[0] === 'clientId') ||
          ACTIVE_CHILDREN.includes(index.table_name)),
    );
    for (const index of newSingles) {
      expect(
        indexes.some(
          (other) =>
            other.table_name === index.table_name &&
            other.index_name !== index.index_name &&
            other.columns[0] === index.columns[0],
        ),
      ).toBe(false);
    }
  });
  it('allows the planner to use the author/client/time index for tracking', async () => {
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      // Em tabelas pequenas o planner prefere seqscan; aqui verificamos elegibilidade.
      await connection.query('SET LOCAL enable_seqscan=off');
      const result = await connection.query<{
        'QUERY PLAN': string;
      }>(`EXPLAIN SELECT "completedAt" FROM "DailyTracking"
        WHERE "professionalId"='fixture' AND "clientId"='fixture' AND type='WORKOUT' AND "completedAt">now()-interval '21 days'
        ORDER BY "completedAt" DESC`);
      expect(result.rows.map((row) => row['QUERY PLAN']).join('\n')).toContain(
        'DailyTracking_professionalId_clientId_type_completedAt_idx',
      );
    } finally {
      await connection.query('ROLLBACK');
      connection.release();
    }
  });
});
