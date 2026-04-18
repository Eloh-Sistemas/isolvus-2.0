import express from 'express';
import { Listar } from '../controllers/endpointsController.js';

const router = express.Router();

router.get('/EndPoints/:filtro', Listar);
router.get('/EndPoints', Listar);

export default router;