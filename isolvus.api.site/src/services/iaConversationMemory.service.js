import { randomUUID } from 'crypto';
import {
  countConversationMessages,
  createConversationRecord,
  deleteConversationRecord,
  findConversationRecord,
  insertConversationFeedbackRecord,
  insertConversationMessages,
  listConversationsByOwner,
  listConversationHistoryRecords,
  listPendingConversationMessagesForSummary,
  listRecentConversationMessages,
  purgeInactiveConversations,
  touchConversationRecord,
  updateConversationSummaryRecord,
} from '../models/iaConversationModel.js';

const MAX_CONTEXT_MESSAGES = 6;
const MAX_CONTENT_LENGTH = 1500;
const MAX_SUMMARY_LENGTH = 6000;
const MAX_HISTORY_MESSAGES = 100;
const MAX_SUMMARY_LINES = 40;
const DEFAULT_RETENTION_DAYS = 90;
const RETENTION_SWEEP_INTERVAL_MS = 15 * 60 * 1000;
const SUMMARY_TITLE_PREFIX = 'Titulo:';

let lastRetentionSweepAt = 0;

function normalizeOwnership(payload = {}) {
  const parsedUserId = Number(payload.userId ?? payload.id_usuario ?? 0);
  const parsedGroupId = Number(payload.groupId ?? payload.id_grupo_empresa ?? 0);

  return {
    conversationId: typeof payload.conversationId === 'string' ? payload.conversationId.trim() : '',
    userId: Number.isFinite(parsedUserId) ? parsedUserId : 0,
    groupId: Number.isFinite(parsedGroupId) ? parsedGroupId : 0,
  };
}

function truncateContent(content, maxLength = MAX_CONTENT_LENGTH) {
  if (!content) {
    return '';
  }

  const normalizedContent = String(content).replace(/\s+/g, ' ').trim();

  if (normalizedContent.length <= maxLength) {
    return normalizedContent;
  }

  return `${normalizedContent.slice(0, maxLength)}...`;
}

function sanitizeConversationTitle(content) {
  if (!content) {
    return 'Nova conversa';
  }

  const normalizedContent = String(content)
    .replace(/\s+/g, ' ')
    .replace(/[?.!]+$/g, '')
    .trim();

  if (!normalizedContent) {
    return 'Nova conversa';
  }

  return truncateContent(normalizedContent, 80);
}

function extractSummaryTitle(summary) {
  if (!summary) {
    return '';
  }

  const [firstLine = ''] = String(summary).split('\n');
  const trimmedLine = firstLine.trim();

  if (trimmedLine.toLowerCase().startsWith(SUMMARY_TITLE_PREFIX.toLowerCase())) {
    return trimmedLine.slice(SUMMARY_TITLE_PREFIX.length).trim();
  }

  return trimmedLine.replace(/^Usuario:\s*/i, '').trim();
}

function stripSummaryTitle(summary) {
  if (!summary) {
    return '';
  }

  const lines = String(summary)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return '';
  }

  const [firstLine, ...remainingLines] = lines;

  if (firstLine.toLowerCase().startsWith(SUMMARY_TITLE_PREFIX.toLowerCase())) {
    return remainingLines.join('\n');
  }

  return lines.join('\n');
}

function buildSummaryWithTitle(title, body = '') {
  const normalizedTitle = sanitizeConversationTitle(title);
  const normalizedBody = stripSummaryTitle(body);

  if (!normalizedBody) {
    return `${SUMMARY_TITLE_PREFIX} ${normalizedTitle}`;
  }

  return `${SUMMARY_TITLE_PREFIX} ${normalizedTitle}\n${normalizedBody}`;
}

function generateConversationPreview(resumoExistente) {
  const extractedTitle = extractSummaryTitle(resumoExistente);

  if (!extractedTitle) {
    return 'Nova conversa...';
  }

  return truncateContent(extractedTitle, 100);
}

function parseMessagePayload(rawPayload) {
  if (!rawPayload) {
    return null;
  }

  try {
    return JSON.parse(rawPayload);
  } catch (error) {
    return null;
  }
}

function buildTableMessage(rawData = []) {
  return {
    role: 'Eloh',
    type: 'table-prompt',
    showTable: false,
    rawData,
  };
}

function summarizeMessageForContext(messagePayload = {}, isFirstMessage = false) {
  // Primeira mensagem deve SEMPRE ser a pergunta (nunca descartar)
  if (messagePayload.type === 'text') {
    return truncateContent(messagePayload.content);
  }

  // Mensagens de tabelas e dashboards NÃO devem ser incluídas no resumo/preview
  // Isso evita que apareça "Tabela com 18 registros" como título da conversa
  if (messagePayload.type === 'table-prompt') {
    return ''; // Vazio = não incluir no resumo de preview
  }

  if (messagePayload.type === 'dashboard') {
    return ''; // Vazio = não incluir no resumo de preview
  }

  return '';
}

function buildPersistedMessages(userMessage, assistantPayload = {}) {
  const persistedMessages = [
    {
      role: 'user',
      type: 'text',
      payload: {
        role: 'user',
        type: 'text',
        content: userMessage,
      },
    },
  ];

  if (assistantPayload.respostaAnalista) {
    persistedMessages.push({
      role: 'assistant',
      type: 'text',
      payload: {
        role: 'Eloh',
        type: 'text',
        content: assistantPayload.respostaAnalista,
      },
    });
  }

  if (Array.isArray(assistantPayload.tabela) && assistantPayload.tabela.length > 0) {
    persistedMessages.push({
      role: 'assistant',
      type: 'table-prompt',
      payload: buildTableMessage(assistantPayload.tabela),
    });
  }

  if (assistantPayload.dashboard?.chart) {
    persistedMessages.push({
      role: 'assistant',
      type: 'dashboard',
      payload: {
        role: 'Eloh',
        type: 'dashboard',
        dashboard: assistantPayload.dashboard,
      },
    });
  }

  return persistedMessages.map((message) => ({
    ...message,
    summary: summarizeMessageForContext(message.payload),
  }));
}

function hydrateHistoryMessage(record) {
  const parsedPayload = parseMessagePayload(record.conteudo_json);

  if (parsedPayload) {
    return parsedPayload;
  }

  return {
    role: record.papel === 'user' ? 'user' : 'Eloh',
    type: record.tipo_mensagem || 'text',
    content: record.resumo_contexto || '',
  };
}

function buildContextText(summary, recentMessages = []) {
  const contextParts = [];
  const summaryWithoutTitle = stripSummaryTitle(summary);

  if (summaryWithoutTitle) {
    contextParts.push(`Resumo acumulado da conversa:\n${summaryWithoutTitle}`);
  }

  if (recentMessages.length > 0) {
    contextParts.push(
      `Mensagens recentes:\n${recentMessages
        .map((message) => `${message.papel === 'user' ? 'Usuario' : 'Eloh'}: ${truncateContent(message.resumo_contexto)}`)
        .join('\n')}`
    );
  }

  return contextParts.join('\n\n');
}

function mergeSummary(currentSummary, newLines = []) {
  const title = extractSummaryTitle(currentSummary);
  const summaryBody = stripSummaryTitle(currentSummary);
  const currentLines = summaryBody
    ? summaryBody
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  const nextLines = [
    ...currentLines,
    ...newLines.map((line) => line.trim()).filter(Boolean),
  ].slice(-MAX_SUMMARY_LINES);

  const mergedBody = truncateContent(nextLines.join('\n'), MAX_SUMMARY_LENGTH);

  if (!title) {
    return mergedBody;
  }

  return buildSummaryWithTitle(title, mergedBody);
}

async function resolveConversationRecord(payload = {}) {
  const normalizedPayload = normalizeOwnership(payload);
  const resolvedConversationId = normalizedPayload.conversationId || randomUUID();

  let conversation = await findConversationRecord(
    resolvedConversationId,
    normalizedPayload.userId,
    normalizedPayload.groupId
  );

  if (!conversation) {
    conversation = await createConversationRecord(
      resolvedConversationId,
      normalizedPayload.userId,
      normalizedPayload.groupId
    );
  }

  return conversation;
}

async function runRetentionSweepIfNeeded() {
  const now = Date.now();

  if (now - lastRetentionSweepAt < RETENTION_SWEEP_INTERVAL_MS) {
    return;
  }

  lastRetentionSweepAt = now;

  try {
    await purgeInactiveConversations(DEFAULT_RETENTION_DAYS);
  } catch (error) {
    console.error('Falha ao executar retenção automática das conversas IA:', error.message);
  }
}

async function compactConversationSummary(conversation) {
  const pendingMessages = await listPendingConversationMessagesForSummary(
    conversation.id_conversa,
    conversation.id_ultima_msg_resumo
  );

  if (pendingMessages.length <= MAX_CONTEXT_MESSAGES) {
    return conversation;
  }

  const messagesToCompact = pendingMessages.slice(0, pendingMessages.length - MAX_CONTEXT_MESSAGES);
  
  // Filtra apenas mensagens com resumo relevante (não vazio)
  // Isso evita que "Tabela com X" ou "Dashboard..." apareça no preview
  const relevantMessages = messagesToCompact
    .map((message) => {
      const summary = truncateContent(message.resumo_contexto);
      return summary ? `${message.papel === 'user' ? 'Usuario' : 'Eloh'}: ${summary}` : '';
    })
    .filter(msg => msg.trim().length > 0);

  // Se não há mensagens relevantes, mantém o resumo original
  if (relevantMessages.length === 0) {
    const lastSummarizedMessageId = messagesToCompact[messagesToCompact.length - 1]?.id_mensagem || 0;
    await updateConversationSummaryRecord(
      conversation.id_conversa,
      conversation.resumo_contexto,
      lastSummarizedMessageId
    );
    return conversation;
  }

  const updatedSummary = mergeSummary(
    conversation.resumo_contexto,
    relevantMessages
  );

  const lastSummarizedMessageId = messagesToCompact[messagesToCompact.length - 1]?.id_mensagem || 0;

  await updateConversationSummaryRecord(
    conversation.id_conversa,
    updatedSummary,
    lastSummarizedMessageId
  );

  return {
    ...conversation,
    resumo_contexto: updatedSummary,
    id_ultima_msg_resumo: lastSummarizedMessageId,
  };
}

export function resolveConversationId(conversationId) {
  if (typeof conversationId === 'string' && conversationId.trim()) {
    return conversationId.trim();
  }

  return randomUUID();
}

export async function getConversationContext(payload = {}) {
  await runRetentionSweepIfNeeded();

  let conversation = await resolveConversationRecord(payload);
  conversation = await compactConversationSummary(conversation);

  const recentMessagesDesc = await listRecentConversationMessages(
    conversation.id_conversa,
    conversation.id_ultima_msg_resumo,
    MAX_CONTEXT_MESSAGES
  );

  const recentMessages = [...recentMessagesDesc].reverse();

  await touchConversationRecord(conversation.id_conversa);

  return {
    conversationId: conversation.conversation_id,
    conversation,
    context: buildContextText(conversation.resumo_contexto, recentMessages),
  };
}

export async function appendConversationTurn(payload = {}, userMessage, assistantPayload = {}) {
  await runRetentionSweepIfNeeded();

  let conversation = await resolveConversationRecord(payload);
  const persistedMessages = buildPersistedMessages(userMessage, assistantPayload);

  // Contar mensagens antes de inserir
  const messageCountBefore = await countConversationMessages(conversation.id_conversa);

  // Se é a primeira mensagem, fixa um título no estilo ChatGPT a partir da pergunta inicial.
  if (messageCountBefore === 0 && !conversation.resumo_contexto) {
    const conversationTitle = sanitizeConversationTitle(userMessage);
    await updateConversationSummaryRecord(
      conversation.id_conversa,
      buildSummaryWithTitle(conversationTitle),
      0
    );

    conversation = {
      ...conversation,
      resumo_contexto: buildSummaryWithTitle(conversationTitle),
    };
  }

  await insertConversationMessages(conversation.id_conversa, persistedMessages);
  await touchConversationRecord(conversation.id_conversa);
  conversation = await compactConversationSummary(conversation);

  return conversation.conversation_id;
}

export async function getConversationMetadata(payload = {}) {
  await runRetentionSweepIfNeeded();

  const conversation = await resolveConversationRecord(payload);
  const totalMessages = await countConversationMessages(conversation.id_conversa);

  return {
    conversationId: conversation.conversation_id,
    totalMessages,
    updatedAt: conversation.dt_ultima_interacao ?? null,
  };
}

export async function getConversationHistory(payload = {}) {
  await runRetentionSweepIfNeeded();

  const normalizedPayload = normalizeOwnership(payload);

  if (!normalizedPayload.conversationId) {
    return [];
  }

  const conversation = await findConversationRecord(
    normalizedPayload.conversationId,
    normalizedPayload.userId,
    normalizedPayload.groupId
  );

  if (!conversation) {
    return [];
  }

  const historyDesc = await listConversationHistoryRecords(conversation.id_conversa, MAX_HISTORY_MESSAGES);

  return [...historyDesc].reverse().map(hydrateHistoryMessage);
}

export async function clearConversation(payload = {}) {
  await runRetentionSweepIfNeeded();

  const normalizedPayload = normalizeOwnership(payload);

  if (!normalizedPayload.conversationId) {
    return { deleted: false };
  }

  const conversation = await findConversationRecord(
    normalizedPayload.conversationId,
    normalizedPayload.userId,
    normalizedPayload.groupId
  );

  if (!conversation) {
    return { deleted: false };
  }

  await deleteConversationRecord(conversation.id_conversa);
  return { deleted: true };
}

export async function listUserConversations(payload = {}, limit = 30) {
  await runRetentionSweepIfNeeded();

  const normalizedPayload = normalizeOwnership(payload);

  const rows = await listConversationsByOwner(
    normalizedPayload.userId,
    normalizedPayload.groupId,
    limit
  );

  return rows.map((row) => ({
    conversationId: row.conversation_id,
    totalMessages: row.total_mensagens ?? 0,
    updatedAt: row.dt_ultima_interacao ?? null,
    createdAt: row.dt_cadastro ?? null,
    preview: generateConversationPreview(row.ultimo_resumo),
  }));
}

export async function registerConversationFeedback(payload = {}) {
  await runRetentionSweepIfNeeded();

  const normalizedPayload = normalizeOwnership(payload);
  const feedbackType = String(payload.feedbackType || '').trim().toLowerCase();

  if (!normalizedPayload.conversationId) {
    throw new Error('A conversa é obrigatória para registrar feedback.');
  }

  if (!['up', 'down'].includes(feedbackType)) {
    throw new Error('Tipo de feedback inválido. Use "up" ou "down".');
  }

  const conversation = await findConversationRecord(
    normalizedPayload.conversationId,
    normalizedPayload.userId,
    normalizedPayload.groupId
  );

  if (!conversation) {
    throw new Error('Conversa não encontrada para registrar feedback.');
  }

  const normalizedComment = payload.comment ? truncateContent(payload.comment, 600) : '';

  await insertConversationFeedbackRecord(conversation.id_conversa, {
    messageId: payload.messageId,
    feedbackType,
    comment: normalizedComment,
  });

  return {
    conversationId: conversation.conversation_id,
    feedbackType,
    savedAt: new Date().toISOString(),
  };
}