import express from 'express';
import { cadastrarCliente,consultarCliente } from '../controllers/clienteCadastroController.js';

const router = express.Router();

router.post('/clientes', cadastrarCliente);
router.get('/clientes/:cgcEnt', consultarCliente);

export default router;
