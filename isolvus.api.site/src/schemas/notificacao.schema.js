import { z } from '../docs/zod.js';

export const notificacaoSchema = z.object({
  id_usuario: z.number({
    required_error: 'Usuário é obrigatório'
  })
});

export const notificacaoLidoSchema = z.object({
    id_usuario: z.number({
    required_error: 'Usuário é obrigatório'
  }),
    id_notificacao: z.number({
        required_error: 'Id da notificação não informado.'
    })
});


export const notificacaoEnviarSchema = z.object({
  id_usuario: z.number({
    required_error: 'Usuário é obrigatório',
    invalid_type_error: 'Usuário deve ser um número'
  }).positive('ID do usuário deve ser maior que zero'),

  id_remetente: z.number({
    required_error: 'Remetente é obrigatório',
    invalid_type_error: 'Remetente deve ser um número'
  }).positive('ID do remetente deve ser maior que zero'),

  titulo: z.string({
    required_error: 'Título é obrigatório',
    invalid_type_error: 'Título deve ser uma string'
  }).min(3, 'Título deve ter pelo menos 3 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres'),

  mensagem: z.string({
    required_error: 'Mensagem é obrigatória',
    invalid_type_error: 'Mensagem deve ser uma string'
  }).min(1, 'Mensagem não pode ser vazia')
    .max(4000, 'Mensagem deve ter no máximo 4000 caracteres'),

  dados_tabela: z.string().nullable().optional()
});

