import 'dotenv/config';
import { runFlywayAction } from './flywayRunner.js';

const action = String(process.argv[2] || 'migrate').trim();

runFlywayAction(action).catch((error) => {
  console.error(`[flyway] Falha ao executar '${action}': ${error.message}`);
  process.exit(1);
});
