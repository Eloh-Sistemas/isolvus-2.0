import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { loadSqlAgentPromptBundle } from '../services/iaAgentSql.service.js';
import { openai } from './openaiClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptCache = new Map();
async function readPrompt(filePath) {
  if (!promptCache.has(filePath)) {
    promptCache.set(filePath, await readFile(filePath, 'utf8'));
  }
  return promptCache.get(filePath);
}

function buildConversationContext(contextoConversa) {
  if (!contextoConversa) {
    return '';
  }

  return `Contexto recente da conversa:\n${contextoConversa}\n\nConsidere esse contexto apenas como apoio para interpretar a pergunta atual, sem repetir respostas anteriores desnecessariamente.\n\n`;
}

async function buildKnowledgeContext(metadata = {}) {
  return '';
}

async function buildSqlAgentPromptBase(metadata = {}) {
  const sqlConfig = await loadSqlAgentPromptBundle({
    id_usuario: metadata.id_usuario,
    id_grupo_empresa: metadata.id_grupo_empresa,
    tipoAgente: 'SQL',
  });

  if (!sqlConfig?.agent) {
    throw new Error('Nenhum agente SQL configurado para este usuário.');
  }

  const baseRules = String(sqlConfig.agent.regras_gerais || '').trim();
  if (!baseRules) {
    throw new Error('O agente SQL está sem regras gerais configuradas.');
  }

  const allowedTableNames = (sqlConfig.tables || [])
    .map((row) => String(row.nome_tabela || '').trim().toUpperCase())
    .filter(Boolean);

  const dictionaryText = (sqlConfig.tables || [])
    .map((row) => {
      const lines = [
        `TABELA: ${row.nome_negocio ? `${row.nome_negocio} = ${row.nome_tabela}` : row.nome_tabela}`,
      ];

      if (row.descricao) {
        lines.push(`DESCRIÇÃO: ${row.descricao}`);
      }

      lines.push('COLUNAS:');
      lines.push(String(row.colunas_def || '').trim());

      if (row.relacionamentos) {
        lines.push('RELACIONAMENTOS:');
        lines.push(String(row.relacionamentos || '').trim());
      }

      if (row.observacoes) {
        lines.push('OBSERVAÇÕES:');
        lines.push(String(row.observacoes || '').trim());
      }

      return lines.filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');

  if (!dictionaryText.trim()) {
    throw new Error('O agente SQL está sem tabelas configuradas.');
  }

  const strictRules = [
    'Use exclusivamente as tabelas cadastradas pelo usuário no dicionário abaixo.',
    'Nunca invente, assuma ou mencione nomes de tabelas fora da lista permitida.',
    `Tabelas permitidas: ${allowedTableNames.join(', ')}.`,
    'Se a pergunta for sobre qual tabela guarda determinada informação, responda somente com base nessas tabelas permitidas.',
    'Se nenhuma tabela permitida atender claramente a pergunta, retorne uma consulta vazia compatível com Oracle que não cite tabelas não cadastradas.',
  ].join('\n- ');

  const promptText = [
    'Você é um assistente especializado em geração de SQL para Oracle.',
    '',
    '## Regras obrigatórias:',
    `- ${strictRules}`,
    '',
    '## Regras configuradas pelo usuário:',
    baseRules,
    '',
    '## Dicionário de Dados:',
    dictionaryText,
    '',
    'Agora, gere a consulta SQL exata para responder à seguinte pergunta:',
  ].join('\n');

  return { promptText, sqlConfig };
}

const cleanSQL = (sql) => {
  return sql
    .replace(/[“”‘’]/g, '"') // aspas erradas
    .replace(/[^\x00-\x7F]/g, '') // remove caracteres não ASCII
    .replace(/\u200B/g, '') // remove caracteres zero-width
    .replace(/\s+$/, '') // remove espaços em branco no fim
    .trim();
};

export const GetIAAgenteSQL = async (pergunta, contextoConversa = '', metadata = {}) => {
  try {
    const { promptText, sqlConfig } = await buildSqlAgentPromptBase(metadata);
    const prompt = `${buildConversationContext(contextoConversa)}${promptText}\n**"${pergunta}"**`;

    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 6000,
    });

    const respostaIA = response.choices[0].message.content;
    const respostaIaMatch = respostaIA.match(/```sql\n([\s\S]*?)\n```/);
    const sqlpronto = respostaIaMatch ? respostaIaMatch[1] : respostaIA;

    return { sql: cleanSQL(sqlpronto), sqlConfig };

  } catch (error) {
    console.log(error.message);
    throw new Error(`Erro ao consultar DeepSeek: ${error.message}`);
  }
};

export const GetIADecideView = async (pergunta, contextoConversa = '', metadata = {}) => {
  const fallback = { explicacaosobreosdados: 'S', demostraremtabela: 'S', demostraremdasboard: 'N' };

  try {
    const knowledgeContext = await buildKnowledgeContext(metadata);
    const promptPath = path.join(__dirname, 'promptIA', 'prompt-agente-analista-de-dados-decide-visao.txt');
    const promptBase = await readPrompt(promptPath);
    const prompt = `${knowledgeContext}${buildConversationContext(contextoConversa)}${promptBase}\n**"${pergunta}"**`;

    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 6000,
    });

    const respostaIA = response.choices[0].message.content;

    // Captura JSON entre ```json ou ```
    const respostaIaMatch = respostaIA.match(/```(?:json)?\n([\s\S]*?)\n```/);
    const jsonStr = respostaIaMatch ? respostaIaMatch[1] : respostaIA;

    try {
      return JSON.parse(jsonStr);
    } catch {
      console.log('GetIADecideView: falha ao parsear JSON, usando fallback.');
      return fallback;
    }

  } catch (error) {
    console.log(error.message);
    return fallback;
  }
};



export const iaAnalisaDados = async (dados, pergunta, decideview, contextoConversa = '', metadata = {}) => {

  const dadosString = Array.isArray(dados) ? JSON.stringify(dados, null, 2) : dados.toString();
  const knowledgeContext = await buildKnowledgeContext(metadata);

  const promptPath = path.join(__dirname, 'promptIA', 'prompt-agente-analista-de-dados.txt');
  const promptBase = await readPrompt(promptPath);

  const prompt = `${knowledgeContext}${buildConversationContext(contextoConversa)}${decideview}\n ${promptBase}\n ${dadosString}\n
  Agora, analise os dados e retorne de forma humanizada inside importantes e dados que responda a esta pergunta:  
  **"${pergunta.toString()}"**  
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 6000,
    });

    return response.choices[0].message.content;    

  } catch (error) {
    throw new Error(`Erro ao consultar DeepSeek: ${error.message}`);
  }
};


export const iaGeraJsonDashboard = async (dados, pergunta, contextoConversa = '', metadata = {}) => {

  const dadosString = Array.isArray(dados) ? JSON.stringify(dados, null, 2) : dados.toString();
  const knowledgeContext = await buildKnowledgeContext(metadata);

  const promptPath = path.join(__dirname, 'promptIA', 'prompt-agente-analista-de-dados-dashboard.txt');
  const promptBase = await readPrompt(promptPath);

  const prompt = `${knowledgeContext}${buildConversationContext(contextoConversa)}${dadosString}\n${promptBase}\n ${pergunta}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 8000,
    });

    const respostaIA = response.choices[0].message.content;

    // Captura JSON entre ```json ou ```
    const respostaIaMatch = respostaIA.match(/```(?:json)?\n([\s\S]*?)\n```/);
    const jsonStr = respostaIaMatch ? respostaIaMatch[1] : respostaIA;

    try {
      return JSON.parse(jsonStr);
    } catch {
      throw new Error('iaGeraJsonDashboard: o modelo não retornou um JSON válido.');
    }

  } catch (error) {
    throw new Error(`Erro ao consultar DeepSeek: ${error.message}`);
  }
};

export const GetIARotearIntencao = async (pergunta, contextoConversa = '') => {
  const fallback = { precisaBanco: 'S' };

  try {
    const promptPath = path.join(__dirname, 'promptIA', 'prompt-agente-roteador-intencao.txt');
    const promptBase = await readPrompt(promptPath);
    const prompt = `${buildConversationContext(contextoConversa)}${promptBase}\n**"${pergunta}"**`;

    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 50,
    });

    const respostaIA = response.choices[0].message.content;
    const respostaIaMatch = respostaIA.match(/```(?:json)?\n([\s\S]*?)\n```/);
    const jsonStr = respostaIaMatch ? respostaIaMatch[1] : respostaIA;

    try {
      const parsed = JSON.parse(jsonStr);
      return { precisaBanco: parsed.precisaBanco === 'N' ? 'N' : 'S' };
    } catch {
      console.log('GetIARotearIntencao: falha ao parsear JSON, assumindo precisaBanco = S.');
      return fallback;
    }

  } catch (error) {
    console.log('GetIARotearIntencao erro:', error.message);
    return fallback;
  }
};

