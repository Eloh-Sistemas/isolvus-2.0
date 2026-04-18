import express from 'express';
import { ConsultarContaGerencial } from '../controllers/contaGerencialController.js';

const router = express.Router();

router.post('/consultarContaGerencial', ConsultarContaGerencial);

export default router;