import { defineConfig, env } from '@prisma/config';
import { config } from 'dotenv';

config({ path: '.env.migrate', quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DIRECT_URL'),
  },
});
