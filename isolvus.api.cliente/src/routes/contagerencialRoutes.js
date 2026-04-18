import express from 'express';
import { consultaContaGerencial } from '../controllers/contagerencialController.js';


const router = express.Router();

router.get('/ContaGerencial', consultaContaGerencial);

export default router;