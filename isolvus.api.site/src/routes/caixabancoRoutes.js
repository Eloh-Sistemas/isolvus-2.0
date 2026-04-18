import express from 'express';
import { consultarCaixaBanco } from '../controllers/caixaBancoController.js';

const router = express.Router();

router.post('/consultarCaixaBancoComplet', consultarCaixaBanco);

export default router;