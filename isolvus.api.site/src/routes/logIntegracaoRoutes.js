import express from 'express';
import { ConsultarLogs, ConsultarDetalhes, Reprocessar, ConsultarResumo } from '../controllers/logIntegracaoController.js';

const router = express.Router();

router.get('/Integracao/Logs',              ConsultarLogs);
router.get('/Integracao/Logs/:id_log/Detalhes', ConsultarDetalhes);
router.get('/Integracao/Resumo',            ConsultarResumo);
router.post('/Integracao/Reprocessar',      Reprocessar);

export default router;
