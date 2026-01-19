const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

function loadDatabaseUrl() {
  const envPath = path.resolve(__dirname, '../../.env');
  const result = dotenv.config({ path: envPath });
  const databaseUrl = process.env.DATABASE_URL;
  return { databaseUrl, envPath, dotenvError: result.error };
}

function runPrisma(args) {
  const prismaCli = path.resolve(__dirname, '../../../../node_modules/prisma/build/index.js');
  const schemaPath = path.resolve(__dirname, '../schema.prisma');
  const { databaseUrl, envPath, dotenvError } = loadDatabaseUrl();

  if (!databaseUrl) {
    const hint = dotenvError
      ? `Falha ao carregar ${envPath}: ${dotenvError.message}`
      : `DATABASE_URL vazio; verifique ${envPath}`;
    console.error(`[db] ${hint}`);
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [prismaCli, ...args, '--schema', schemaPath], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl }
  });

  process.exit(result.status ?? 1);
}

module.exports = { runPrisma };

