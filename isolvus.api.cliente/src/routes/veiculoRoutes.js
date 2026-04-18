import express from 'express';
import { atualizarVeiculos, consultaVeiculo } from '../controllers/veiculoController.js';

const router = express.Router();
router.get('/Veiculo',consultaVeiculo);
router.post('/atualizarVeiculos', atualizarVeiculos);

export default router;