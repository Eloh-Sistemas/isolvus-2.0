import express from 'express';
import { gravaSolicitacao } from '../controllers/solicitacaoDeDespesaController.js';

const router = express.Router();
router.post('/SolicitaDespesa', gravaSolicitacao);

export default router;