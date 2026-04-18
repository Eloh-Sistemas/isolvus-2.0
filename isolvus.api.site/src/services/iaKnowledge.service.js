import { deactivateKnowledgeRecord, listKnowledgeRecords, saveKnowledgeRecord } from '../models/iaKnowledgeModel.js';

function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim();
}

export async function listKnowledgeBase(payload = {}) {
  return listKnowledgeRecords(payload);
}

export async function saveKnowledgeBaseRule(payload = {}) {
  const titulo = normalizeText(payload.titulo);
  const regrasNegocio = normalizeText(payload.regrasNegocio);

  if (titulo.length < 3) {
    throw new Error('Informe um título válido para o conhecimento.');
  }

  if (regrasNegocio.length < 5) {
    throw new Error('Informe regras de negócio mais detalhadas para o treinamento.');
  }

  return saveKnowledgeRecord({
    ...payload,
    titulo,
    regrasNegocio,
    objetivoAnalise: normalizeText(payload.objetivoAnalise),
    exemplosPerguntas: normalizeText(payload.exemplosPerguntas),
    exemplosResposta: normalizeText(payload.exemplosResposta),
    tabelasAlvo: normalizeText(payload.tabelasAlvo),
  });
}

export async function removeKnowledgeBaseRule(payload = {}) {
  const id = Number(payload.id || 0);

  if (!id) {
    throw new Error('Registro de conhecimento inválido para remoção.');
  }

  return deactivateKnowledgeRecord(id, payload.id_usuario, payload.id_grupo_empresa);
}
