import express from 'express';
import { consultarCentroDeCusto } from '../controllers/centroDeCustoController.js';

const router = express.Router();

router.post('/consultarCentroDeCusto', consultarCentroDeCusto);

export default router;