import express from 'express';
import { Listar, Atualizar } from '../controllers/endpointsController.js';

const router = express.Router();

router.get('/EndPoints/:filtro', Listar);
router.get('/EndPoints', Listar);
router.put('/EndPoints', Atualizar);

export default router;