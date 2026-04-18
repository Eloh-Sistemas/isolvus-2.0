export function isSqlSelectSafe(sql) {
  const sqlUpper = sql.trim().toUpperCase();

  const comandosProibidos = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP'
  ];

  const contemComandoProibido = comandosProibidos.some(cmd => sqlUpper.includes(cmd));
  return sqlUpper.startsWith('SELECT') && !contemComandoProibido;
}

function normalizeTableToken(value = '') {
  return String(value || '')
    .trim()
    .replace(/["'`;]/g, '')
    .replace(/\s+/g, '')
    .toUpperCase();
}

export function extractSqlReferencedTables(sql = '') {
  const normalizedSql = String(sql || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const matches = [];
  const regex = /\b(?:FROM|JOIN)\s+([A-Z0-9_$."']+)/gi;
  let match;

  while ((match = regex.exec(normalizedSql)) !== null) {
    const token = normalizeTableToken(match[1]);

    if (!token || token.startsWith('(') || token === 'SELECT') {
      continue;
    }

    matches.push(token);
  }

  return [...new Set(matches)];
}

export function isSqlUsingOnlyAllowedTables(sql = '', allowedTables = []) {
  const referencedTables = extractSqlReferencedTables(sql);
  const allowedSet = new Set(
    (allowedTables || [])
      .flatMap((tableName) => {
        const normalized = normalizeTableToken(tableName);

        if (!normalized) {
          return [];
        }

        if (normalized.includes('.')) {
          return [normalized, normalized.split('.').pop()];
        }

        return [normalized];
      })
  );

  const invalidTables = referencedTables.filter((tableName) => !allowedSet.has(tableName) && tableName !== 'DUAL');

  return {
    referencedTables,
    invalidTables,
    isValid: invalidTables.length === 0,
  };
}
