import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

export function errorHandler(err, req, res, next) {

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
    error: 'Erro interno do servidor'
  });
}
