import express from 'express';
import { integracaoVale , baixarVale} from '../controllers/valeController.js';

const router = express.Router();
router.get('/integracao/vale', integracaoVale);
router.post('/integracao/baixarVale', baixarVale);

export default router;