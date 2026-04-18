import express from 'express';
import { camposformulario } from '../controllers/formularioController.js';


const router = express.Router();

router.post('/camposformulario',camposformulario);

export default router;