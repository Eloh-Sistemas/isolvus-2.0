import express from 'express';
import { tabela, DashOrcamentoTotal, DashOrcamentoPorConta, DetalheCentroCusto, LancamentosCentroCusto } from '../controllers/acompanhamentodedespesacontrooler.js';

const router = express.Router();

router.post('/acompanhamentodedepsesa1/tabela', tabela);
router.post('/acompanhamentodedepsesa1/dashorcamentototal', DashOrcamentoTotal);
router.post('/acompanhamentodedepsesa1/dashorcamenporconta', DashOrcamentoPorConta);
router.post('/acompanhamentodedepsesa1/detalhecentrocusto', DetalheCentroCusto);
router.post('/acompanhamentodedepsesa1/lancamentoscentrocusto', LancamentosCentroCusto);

export default router;