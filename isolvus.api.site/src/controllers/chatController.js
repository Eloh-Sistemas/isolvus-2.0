import { iaConsultarDados } from "../models/iaModel.js";
import { GetIAAgenteSQL, GetIADecideView, GetIARotearIntencao, iaAnalisaDados, iaGeraJsonDashboard } from "../IA/deepseekService.js";
import { ElohOrquestrar, gerarSugestoesDeAcompanhamento } from '../IA/elohAgente.js';
import { appendConversationTurn, clearConversation, getConversationContext, getConversationHistory, getConversationMetadata, listUserConversations, registerConversationFeedback, resolveConversationId } from "../services/iaConversationMemory.service.js";
import { getDatabaseTableMetadataForSqlAgent, listDatabaseTablesForSqlAgent, listSqlAgentConfiguration, loadSqlAgentPromptBundle, removeSqlAgentTable, saveSqlAgentConfiguration } from '../services/iaAgentSql.service.js';
import { isSqlSelectSafe, isSqlUsingOnlyAllowedTables } from '../utils/sqlValidator.js';


export const IAAgenteSQL = async (req, res) => {
  try {
    const { message, conversationId, id_usuario, id_grupo_empresa } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'O campo "message" é obrigatório.' });
    }

    const resolvedConversationId = resolveConversationId(conversationId);
    const conversationPayload = {
      conversationId: resolvedConversationId,
      id_usuario,
      id_grupo_empresa,
    };

    const { context: contextoConversa } = await getConversationContext(conversationPayload);

    const resultado = await ElohOrquestrar(message, contextoConversa, { id_usuario, id_grupo_empresa });

    // Gera sugestões de acompanhamento contextual em paralelo com o registro da conversa
    const [, sugestoes] = await Promise.all([
      appendConversationTurn(conversationPayload, message, {
        respostaAnalista: resultado.respostaAnalista,
        tabela: resultado.tabela,
        dashboard: resultado.dashboard,
      }),
      gerarSugestoesDeAcompanhamento(message, resultado.respostaAnalista || ''),
    ]);

    resultado.sugestoes = sugestoes;
    resultado.conversation = await getConversationMetadata(conversationPayload);

    res.json(resultado);

  } catch (error) {
    console.error('Erro IAAgenteSQL:', error.message);
    res.status(500).json({
      error: 'Erro ao processar sua solicitação.',
      detalhes: error.message
    });
  }
};

export const IAHistoricoConversa = async (req, res) => {
  try {
    const { conversationId, id_usuario, id_grupo_empresa } = req.body;

    const messages = await getConversationHistory({
      conversationId,
      id_usuario,
      id_grupo_empresa,
    });

    return res.json({ messages });
  } catch (error) {
    console.error('Erro IAHistoricoConversa:', error.message);
    return res.status(500).json({
      error: 'Erro ao carregar o histórico da conversa.',
      detalhes: error.message,
    });
  }
};

export const IALimparConversa = async (req, res) => {
  try {
    const { conversationId, id_usuario, id_grupo_empresa } = req.body;

    const result = await clearConversation({
      conversationId,
      id_usuario,
      id_grupo_empresa,
    });

    return res.json({
      message: result.deleted ? 'Conversa removida com sucesso.' : 'Conversa não encontrada.',
      deleted: result.deleted,
    });
  } catch (error) {
    console.error('Erro IALimparConversa:', error.message);
    return res.status(500).json({
      error: 'Erro ao limpar a conversa.',
      detalhes: error.message,
    });
  }
};

export const IAListarConversas = async (req, res) => {
  try {
    const { id_usuario, id_grupo_empresa, limit } = req.body;

    const conversations = await listUserConversations(
      { id_usuario, id_grupo_empresa },
      limit
    );

    return res.json({ conversations });
  } catch (error) {
    console.error('Erro IAListarConversas:', error.message);
    return res.status(500).json({
      error: 'Erro ao listar conversas da IA.',
      detalhes: error.message,
    });
  }
};

export const IARegistrarFeedback = async (req, res) => {
  try {
    const { conversationId, id_usuario, id_grupo_empresa, messageId, feedbackType, comment } = req.body;

    const result = await registerConversationFeedback({
      conversationId,
      id_usuario,
      id_grupo_empresa,
      messageId,
      feedbackType,
      comment,
    });

    return res.status(201).json({
      message: 'Feedback registrado com sucesso.',
      result,
    });
  } catch (error) {
    console.error('Erro IARegistrarFeedback:', error.message);

    const knownError = /conversa|feedback|inválido|obrigatória/i.test(error.message);

    return res.status(knownError ? 400 : 500).json({
      error: 'Erro ao registrar feedback da IA.',
      detalhes: error.message,
    });
  }
};

export const IAAgenteSqlConfigListar = async (req, res) => {
  try {
    const config = await listSqlAgentConfiguration(req.body || {});

    return res.json(config);
  } catch (error) {
    console.error('Erro IAAgenteSqlConfigListar:', error.message);
    return res.status(500).json({
      error: 'Erro ao listar configuração do agente SQL.',
      detalhes: error.message,
    });
  }
};

export const IAAgenteSqlConfigSalvar = async (req, res) => {
  try {
    const result = await saveSqlAgentConfiguration(req.body || {});

    return res.status(201).json({
      message: 'Configuração do agente SQL salva com sucesso.',
      result,
    });
  } catch (error) {
    console.error('Erro IAAgenteSqlConfigSalvar:', error.message);

    const knownError = /agente|regras|nome|tabela/i.test(error.message);

    return res.status(knownError ? 400 : 500).json({
      error: 'Erro ao salvar configuração do agente SQL.',
      detalhes: error.message,
    });
  }
};

export const IAAgenteSqlTabelaRemover = async (req, res) => {
  try {
    const result = await removeSqlAgentTable(req.body || {});

    return res.json({
      message: result.deleted ? 'Tabela removida com sucesso.' : 'Tabela não encontrada.',
      result,
    });
  } catch (error) {
    console.error('Erro IAAgenteSqlTabelaRemover:', error.message);

    const knownError = /inválido|registro|tabela/i.test(error.message);

    return res.status(knownError ? 400 : 500).json({
      error: 'Erro ao remover tabela do agente SQL.',
      detalhes: error.message,
    });
  }
};

export const IAAgenteSqlBuscarTabelasBanco = async (req, res) => {
  try {
    const tables = await listDatabaseTablesForSqlAgent(req.body || {});
    return res.json({ tables });
  } catch (error) {
    console.error('Erro IAAgenteSqlBuscarTabelasBanco:', error.message);
    return res.status(500).json({
      error: 'Erro ao buscar tabelas no banco.',
      detalhes: error.message,
    });
  }
};

export const IAAgenteSqlMetadadosTabelaBanco = async (req, res) => {
  try {
    const metadata = await getDatabaseTableMetadataForSqlAgent(req.body || {});
    return res.json({ metadata });
  } catch (error) {
    console.error('Erro IAAgenteSqlMetadadosTabelaBanco:', error.message);

    const knownError = /tabela|nome/i.test(error.message);

    return res.status(knownError ? 400 : 500).json({
      error: 'Erro ao consultar metadados da tabela no banco.',
      detalhes: error.message,
    });
  }
};



