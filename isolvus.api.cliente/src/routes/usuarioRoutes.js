import express from 'express';
import { consultaUsuario, credencias } from '../controllers/usuarioController.js';

const router = express.Router();
router.get('/Usuario',consultaUsuario);
router.post('/Usuario/Credencias',credencias);

export default router;