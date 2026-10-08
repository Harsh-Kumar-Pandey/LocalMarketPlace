import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const schemaPath = fileURLToPath(new URL('../schema.sql', import.meta.url));
const args = process.env.DATABASE_URL
  ? ['-d', process.env.DATABASE_URL, '-f', schemaPath]
  : [
      '-h', process.env.DB_HOST,
      '-p', process.env.DB_PORT,
      '-U', process.env.DB_USER,
      '-d', process.env.DB_NAME,
      '-f', schemaPath,
    ];

if (!process.env.DATABASE_URL && (!process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_USER || !process.env.DB_NAME)) {
  console.error('Set DATABASE_URL or all of DB_HOST, DB_PORT, DB_USER, and DB_NAME in .env.');
  process.exit(1);
}

const result = spawnSync('psql', args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    ...(process.env.DB_PASSWORD ? { PGPASSWORD: process.env.DB_PASSWORD } : {}),
  },
});

if (result.error) {
  console.error(`Could not run psql: ${result.error.message}`);
  process.exit(1);
}

process.exitCode = result.status ?? 1;
