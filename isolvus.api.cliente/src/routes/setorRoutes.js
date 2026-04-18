import express from 'express';
import { consultaSetor } from '../controllers/setorController.js';

const router = express.Router();

router.get('/Setor', consultaSetor);

export default router;