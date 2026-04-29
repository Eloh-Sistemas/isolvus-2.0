import 'dotenv/config';
import { runFlywayAction } from './flywayRunner.js';

async function runFlywayMigrate() {
  const action = String(process.env.FLYWAY_COMMAND || 'migrate').trim();
  const allowStartWithoutMigrations = String(process.env.ALLOW_START_WITHOUT_MIGRATIONS || '').trim() === 'true';

  console.log(`[bootstrap] Executando Flyway (${action}) via instalacao local...`);

  try {
    await runFlywayAction(action);
    console.log('[bootstrap] Migrations aplicadas/validadas com sucesso.');
  } catch (error) {
    if (allowStartWithoutMigrations) {
      console.warn('[bootstrap] Falha ao executar migrations, iniciando API por ALLOW_START_WITHOUT_MIGRATIONS=true.');
      console.warn(`[bootstrap] Motivo: ${error.message}`);
      return;
    }

    throw error;
  }
}

async function bootstrap() {
  await runFlywayMigrate();
  await import('./index.js');
}

bootstrap().catch((error) => {
  console.error('[bootstrap] Falha ao iniciar aplicacao:', error.message);
  process.exit(1);
});
