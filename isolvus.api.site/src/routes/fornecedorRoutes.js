import express from 'express';
import { ConsultarFornecedor } from '../controllers/fornecedorController.js';

const router = express.Router();

router.post('/consultarFornecedor', ConsultarFornecedor);

export default router;