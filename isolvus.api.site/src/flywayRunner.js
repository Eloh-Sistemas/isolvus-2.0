import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
    });
  });
}

function resolveRequiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Variavel obrigatoria nao definida para migration: ${name}`);
  }

  return value;
}

function isCommandNotFoundError(error) {
  return error && (error.code === 'ENOENT' || String(error.message || '').includes('ENOENT'));
}

export async function runFlywayAction(action = 'migrate') {
  const flywayCommand = String(process.env.FLYWAY_CMD || 'flyway').trim();
  const flywayConfigPath = path.resolve(process.cwd(), 'flyway/conf/flyway.conf');

  if (!existsSync(flywayConfigPath)) {
    throw new Error(`Arquivo de configuracao do Flyway nao encontrado: ${flywayConfigPath}`);
  }

  const dbConnect = resolveRequiredEnv('DB_CONNECT');
  const dbUser = resolveRequiredEnv('DB_USER');
  const dbPassword = resolveRequiredEnv('DB_PASSWORD');

  const args = [
    `-configFiles=${flywayConfigPath}`,
    `-url=jdbc:oracle:thin:@//${dbConnect}`,
    `-user=${dbUser}`,
    `-password=${dbPassword}`,
    action,
  ];

  try {
    await runProcess(flywayCommand, args);
  } catch (error) {
    if (isCommandNotFoundError(error)) {
      throw new Error(
        'Comando flyway nao encontrado no host. Instale o Flyway localmente e tente novamente.'
      );
    }

    throw error;
  }
}
