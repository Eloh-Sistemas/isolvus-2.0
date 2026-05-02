import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

export function errorHandler(err, req, res, next) {

  // 0️⃣ Cliente abortou a requisição durante upload/download
  // Comum em cenários de stream/fallback com timeout curto.
  const isRequestAborted =
    err?.code === 'ECONNABORTED'
    || err?.type === 'request.aborted'
    || String(err?.message || '').toLowerCase().includes('request aborted');

  if (isRequestAborted) {
    // Nao polui log com stack de erro esperado de rede.
    console.warn('[http] request aborted:', {
      method: req?.method,
      url: req?.originalUrl,
      ip: req?.ip,
      expected: err?.expected,
      received: err?.received,
    });

    if (res.headersSent) return;
    return res.status(499).json({ error: 'Request aborted by client' });
  }

  // 1️⃣ Erro de validação (Zod)
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      detalhes: err.errors
    });
  }

  // 2️⃣ Erro de regra de negócio
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  // 3️⃣ Erro inesperado
  console.error(err);

  return res.status(500).json({
    error: 'Erro interno do servidor',
    message: err?.message || 'Erro interno do servidor'
  });
}
