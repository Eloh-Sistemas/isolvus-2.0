import express from 'express';
import { consultarItemDespesa, consultarItemCadastro, cadastrarItem, alterarItem, consultarItemDespesaGeral } from '../controllers/itemDespesaController.js';

const router = express.Router();
router.post('/consultarItem', consultarItemDespesa);
router.post('/consultarItemGeral', consultarItemDespesaGeral);
router.post('/consultarItemCadastro', consultarItemCadastro);
router.post('/cadastrarItem', cadastrarItem);
router.post('/alterarItem', alterarItem);

export default router;