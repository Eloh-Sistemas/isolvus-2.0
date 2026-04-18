import express from 'express';
import { consultaCliente } from '../controllers/clienteController.js';

const router = express.Router();
router.get('/Cliente',consultaCliente);

export default router;