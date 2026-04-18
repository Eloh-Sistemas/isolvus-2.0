export function parseDateBR(dateStr) {
  if (!dateStr) return null;

  // aceita DD/MM/YYYY
  const [dia, mes, ano] = dateStr.split('/').map(Number);

  const date = new Date(ano, mes - 1, dia);

  if (isNaN(date.getTime())) {
    throw new Error(`Data inválida: ${dateStr}`);
  }

  return date;
}
