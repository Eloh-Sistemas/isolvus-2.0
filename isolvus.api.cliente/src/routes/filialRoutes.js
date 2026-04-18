import express from 'express';
import { consultaFilial } from '../controllers/filialController.js';

const router = express.Router();

router.get('/Filial', consultaFilial);

export default router;