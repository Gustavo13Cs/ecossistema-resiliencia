# Database migration baseline

The repository migration chain was rebuilt because the previous migrations did not describe the current schema.

For a new database, run `npx prisma migrate deploy` normally.

For an existing database, do not run `migrate deploy` or `migrate resolve` until an operator has:
1. backed up the database;
2. compared it with `prisma/schema.prisma` using `prisma migrate diff`;
3. reviewed the diff as empty;
4. explicitly approved marking `20260813000000_baseline` as applied.

The remote reconciliation is an operator action and is never executed by tests or application startup.
