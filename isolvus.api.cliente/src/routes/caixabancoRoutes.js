import express from 'express';
import { consultarCaixaBanco } from '../controllers/caixabancoController.js';

const router = express.Router();
router.get('/caixabanco', consultarCaixaBanco);

export default router;