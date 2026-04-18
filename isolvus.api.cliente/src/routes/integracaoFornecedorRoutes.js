import express from 'express';
import { integracaoFornecedorDadosArquivo } from '../controllers/integracaoFornecedorController.js';

const router = express.Router();

router.post('/integracaofornecedor/dadosarquivo', integracaoFornecedorDadosArquivo);

export default router;