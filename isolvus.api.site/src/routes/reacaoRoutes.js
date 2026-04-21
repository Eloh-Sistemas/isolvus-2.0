import express from 'express';
import { reagir, consultarReacoes } from '../controllers/reacaoController.js';

const router = express.Router();
router.post('/reacao/reagir',    reagir);
router.post('/reacao/consultar', consultarReacoes);

export default router;
