import express from 'express';
import { validate } from '../middlewares/validate.js';
import { notificacaoEnviarSchema, notificacaoLidoSchema, notificacaoPushTokenSchema, notificacaoSchema } from '../schemas/notificacao.schema.js';
import { consultarNotificacoes, notificacaoEnviar, notificacaoLido, notificacaoRegistrarToken } from '../controllers/notificacaoController.js';

const router = express.Router();

router.post('/notificacoes', validate(notificacaoSchema) , consultarNotificacoes);
router.post('/notificacoes/lido', validate(notificacaoLidoSchema) , notificacaoLido);
router.post('/notificacoes/enviar', validate(notificacaoEnviarSchema) , notificacaoEnviar);
router.post('/notificacoes/registrarToken', validate(notificacaoPushTokenSchema), notificacaoRegistrarToken);

export default router; 