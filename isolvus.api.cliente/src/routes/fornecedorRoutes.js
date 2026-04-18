import express from 'express';
import { consultaFornecedor } from '../controllers/fornecedorController.js';

const router = express.Router();

router.get('/fornecedor', consultaFornecedor);

export default router;