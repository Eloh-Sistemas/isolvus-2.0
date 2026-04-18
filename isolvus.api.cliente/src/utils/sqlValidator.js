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
