import express from 'express';
import { alterarIntegracaoFornecedor, cadastrarIntegracaoFornecedor, consultarIntegracaoFornecedor, exluirIntegracaoFornecedor, gerararquivoIntegracaoFornecedor } from '../controllers/integracaoFornecedorController.js';

const router = express.Router();

router.post('/IntegracaoFornecedor/cadastrar', cadastrarIntegracaoFornecedor);
router.post('/IntegracaoFornecedor/alterar', alterarIntegracaoFornecedor);
router.post('/IntegracaoFornecedor/exluir', exluirIntegracaoFornecedor);
router.post('/IntegracaoFornecedor/consultar', consultarIntegracaoFornecedor);
router.post('/IntegracaoFornecedor/gerararquivo', gerararquivoIntegracaoFornecedor);

export default router;