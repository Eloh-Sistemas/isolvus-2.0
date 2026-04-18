import express from 'express';
import { IAAgenteSQL, IAAgenteSqlBuscarTabelasBanco, IAAgenteSqlConfigListar, IAAgenteSqlConfigSalvar, IAAgenteSqlMetadadosTabelaBanco, IAAgenteSqlTabelaRemover, IAHistoricoConversa, IALimparConversa, IAListarConversas, IARegistrarFeedback } from '../controllers/chatController.js';
import { validate } from '../middlewares/validate.js';
import { iaChatSchema, iaConversationLookupSchema, iaConversationListSchema, iaConversationFeedbackSchema, iaSqlAgentDbTableDetailsSchema, iaSqlAgentDbTableSearchSchema, iaSqlAgentListSchema, iaSqlAgentSaveSchema, iaSqlAgentTableDeleteSchema } from '../schemas/iaChat.schema.js';

const router = express.Router();

router.post('/ElohIA', validate(iaChatSchema), IAAgenteSQL);
router.post('/ElohIA/conversas', validate(iaConversationListSchema), IAListarConversas);
router.post('/ElohIA/historico', validate(iaConversationLookupSchema), IAHistoricoConversa);
router.post('/ElohIA/limpar', validate(iaConversationLookupSchema), IALimparConversa);
router.post('/ElohIA/feedback', validate(iaConversationFeedbackSchema), IARegistrarFeedback);
router.post('/ElohIA/agente-sql/config/listar', validate(iaSqlAgentListSchema), IAAgenteSqlConfigListar);
router.post('/ElohIA/agente-sql/config/salvar', validate(iaSqlAgentSaveSchema), IAAgenteSqlConfigSalvar);
router.post('/ElohIA/agente-sql/tabela/remover', validate(iaSqlAgentTableDeleteSchema), IAAgenteSqlTabelaRemover);
router.post('/ElohIA/agente-sql/db/tabelas', validate(iaSqlAgentDbTableSearchSchema), IAAgenteSqlBuscarTabelasBanco);
router.post('/ElohIA/agente-sql/db/tabela-detalhes', validate(iaSqlAgentDbTableDetailsSchema), IAAgenteSqlMetadadosTabelaBanco);

export default router;
