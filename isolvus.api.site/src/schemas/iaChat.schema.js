import { z } from 'zod';

export const iaChatSchema = z.object({
  message: z.string().trim().min(1, 'A mensagem é obrigatória').max(2000, 'A mensagem pode ter no máximo 2000 caracteres'),
  conversationId: z.string().trim().min(1).max(100).optional(),
  id_usuario: z.coerce.number().int().nonnegative().optional(),
  id_grupo_empresa: z.coerce.number().int().nonnegative().optional(),
});

export const iaConversationLookupSchema = z.object({
  conversationId: z.string().trim().min(1, 'A conversa é obrigatória').max(100),
  id_usuario: z.coerce.number().int().nonnegative().optional(),
  id_grupo_empresa: z.coerce.number().int().nonnegative().optional(),
});

export const iaConversationListSchema = z.object({
  id_usuario: z.coerce.number().int().nonnegative().optional(),
  id_grupo_empresa: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const iaConversationFeedbackSchema = z.object({
  conversationId: z.string().trim().min(1, 'A conversa é obrigatória').max(100),
  messageId: z.string().trim().min(1).max(120).optional(),
  feedbackType: z.enum(['up', 'down']),
  comment: z.string().trim().max(600).optional(),
  id_usuario: z.coerce.number().int().nonnegative().optional(),
  id_grupo_empresa: z.coerce.number().int().nonnegative().optional(),
});

export const iaSqlAgentListSchema = z.object({
  tipoAgente: z.string().trim().min(2).max(40).optional(),
  id_usuario: z.coerce.number().int().nonnegative().optional(),
  id_grupo_empresa: z.coerce.number().int().nonnegative().optional(),
  searchTerm: z.string().trim().max(200).optional(),
  tabela: z.string().trim().max(120).optional(),
  onlyActive: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const iaSqlAgentSaveSchema = z.object({
  id_agente: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().int().positive().optional()
  ),
  tipoAgente: z.string().trim().min(2).max(40),
  nomeAgente: z.string().trim().min(3).max(120),
  regrasGerais: z.string().trim().min(5).max(120000),
  tabelas: z.array(
    z.object({
      id: z.preprocess(
        (value) => (value === '' || value === null || value === undefined ? undefined : value),
        z.coerce.number().int().positive().optional()
      ),
      name: z.string().trim().min(2).max(120),
      businessName: z.string().trim().max(200).optional(),
      description: z.string().trim().max(300).optional(),
      columns: z.string().trim().min(2).max(120000),
      relationships: z.string().trim().max(120000).optional(),
      notes: z.string().trim().max(120000).optional(),
      active: z.coerce.boolean().optional(),
    })
  ).optional(),
  ativo: z.coerce.boolean().optional(),
  id_usuario: z.coerce.number().int().nonnegative().optional(),
  id_grupo_empresa: z.coerce.number().int().nonnegative().optional(),
});

export const iaSqlAgentTableDeleteSchema = z.object({
  id: z.coerce.number().int().positive(),
  id_usuario: z.coerce.number().int().nonnegative().optional(),
  id_grupo_empresa: z.coerce.number().int().nonnegative().optional(),
});

export const iaSqlAgentDbTableSearchSchema = z.object({
  searchTerm: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  id_usuario: z.coerce.number().int().nonnegative().optional(),
  id_grupo_empresa: z.coerce.number().int().nonnegative().optional(),
});

export const iaSqlAgentDbTableDetailsSchema = z.object({
  tableName: z.string().trim().min(1).max(120),
  id_usuario: z.coerce.number().int().nonnegative().optional(),
  id_grupo_empresa: z.coerce.number().int().nonnegative().optional(),
});