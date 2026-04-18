import { openai } from './openaiClient.js';
import { elohTools } from './tools/toolDefinitions.js';
import { handlerConsultarDados } from './tools/handlers/handlerConsultarDados.js';
import { handlerEnviarNotificacao } from './tools/handlers/handlerEnviarNotificacao.js';

const SYSTEM_PROMPT = `Você é Eloh, uma assistente inteligente de análise de dados empresariais.
Você tem acesso a ferramentas para consultar dados do sistema e enviar notificações internas.
Quando o usuário fizer uma pergunta que envolva dados do negócio, use a ferramenta consultar_dados.
Quando o usuário quiser avisar ou notificar alguém, use a ferramenta enviar_notificacao.
Para perguntas conceituais, gerais ou saudações, responda diretamente sem usar ferramentas.
Responda sempre em português do Brasil de forma clara e objetiva.`;

const handlers = {
  consultar_dados: handlerConsultarDados,
  enviar_notificacao: handlerEnviarNotificacao,
};

/**
 * Orquestrador principal da Eloh com Function Calling.
 * O LLM decide qual tool usar (ou responde diretamente).
 * Para adicionar um novo recurso: inclua o tool em toolDefinitions.js e o handler em handlers/.
 */
export async function ElohOrquestrar(pergunta, contextoConversa, metadata) {
  const contextBlock = contextoConversa
    ? `Contexto recente da conversa:\n${contextoConversa}\n\nConsidere esse contexto apenas como apoio para interpretar a pergunta atual.\n\n`
    : '';

  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `${contextBlock}${pergunta}` },
    ],
    tools: elohTools,
    tool_choice: 'auto',
    temperature: 0,
    max_tokens: 1000,
  });

  const choice = response.choices[0];

  // Sem tool call = pergunta conceitual / saudação → resposta direta do LLM
  if (!choice.message.tool_calls?.length) {
    return {
      respostaAnalista: choice.message.content,
    };
  }

  const toolCall = choice.message.tool_calls[0];
  const toolName = toolCall.function.name;
  let args;

  try {
    args = JSON.parse(toolCall.function.arguments);
  } catch {
    throw new Error(`Eloh retornou argumentos inválidos para a ferramenta "${toolName}".`);
  }

  const handler = handlers[toolName];

  if (!handler) {
    throw new Error(`Ferramenta "${toolName}" não possui um handler registrado.`);
  }

  return handler(pergunta, args, contextoConversa, metadata);
}

/**
 * Gera 3 perguntas de acompanhamento contextuais baseadas na pergunta e resposta reais.
 * Retorna array vazio em caso de falha (não deve interromper o fluxo principal).
 */
export async function gerarSugestoesDeAcompanhamento(pergunta, resposta) {
  try {
    const sugestaoResponse = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente que gera perguntas de acompanhamento. Dado uma pergunta e sua resposta, gere exatamente 3 perguntas curtas e relevantes que o usuário pode querer fazer em seguida. Retorne APENAS um array JSON com as 3 strings, sem explicações. Exemplo: ["Pergunta 1?","Pergunta 2?","Pergunta 3?"]',
        },
        {
          role: 'user',
          content: `Pergunta: ${pergunta}\n\nResposta: ${resposta}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const content = sugestaoResponse.choices[0]?.message?.content || '[]';
    const jsonMatch = content.match(/\[.*\]/s);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === 'string').slice(0, 3);
  } catch {
    return [];
  }
}
