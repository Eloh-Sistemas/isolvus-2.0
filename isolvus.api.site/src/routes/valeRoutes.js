import express from 'express';
import { consultarVale } from '../controllers/valeController.js';


const router = express.Router();

router.post('/consultarVale', consultarVale);

export default router; 