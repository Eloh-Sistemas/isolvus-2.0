import express from 'express';
import { ListarFormadePagamento } from '../controllers/formaDePagamentoController.js';

const router = express.Router();

router.get('/formadepagamneto/listar',ListarFormadePagamento);

export default router;