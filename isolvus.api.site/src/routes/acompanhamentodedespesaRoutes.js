import express from 'express';
import { tabela, DashOrcamentoTotal, DashOrcamentoPorConta } from '../controllers/acompanhamentodedespesacontrooler.js';

const router = express.Router();

router.post('/acompanhamentodedepsesa1/tabela', tabela);
router.post('/acompanhamentodedepsesa1/dashorcamentototal', DashOrcamentoTotal);
router.post('/acompanhamentodedepsesa1/dashorcamenporconta', DashOrcamentoPorConta);

export default router;