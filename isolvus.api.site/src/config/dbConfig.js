function normalizeConnectString(value = '') {
  return String(value || '').trim();
}

function buildOracleConnectString() {
  const directConnectString = normalizeConnectString(
    process.env.ORACLE_CONNECT_STRING || process.env.DB_CONNECT || ''
  );

  if (directConnectString) {
    return directConnectString;
  }

  const host = normalizeConnectString(process.env.ORACLE_HOST || process.env.DB_HOST || '');
  const port = normalizeConnectString(process.env.ORACLE_PORT || process.env.DB_PORT || '1521');
  const serviceName = normalizeConnectString(
    process.env.ORACLE_SERVICE_NAME || process.env.DB_SERVICE_NAME || process.env.DB_NAME || ''
  );

  if (!host || !serviceName) {
    return '';
  }

  return `${host}:${port}/${serviceName}`;
}

export const dbConfig = {
  user: normalizeConnectString(process.env.DB_USER || process.env.ORACLE_USER || ''),
  password: normalizeConnectString(process.env.DB_PASSWORD || process.env.ORACLE_PASSWORD || ''),
  connectString: buildOracleConnectString(),
};
