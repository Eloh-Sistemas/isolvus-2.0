import express from 'express';
import { atualizarVeiculo, cadastrarVeiculo, consultaDetalhes, 
         consultarCombustivelVeiculoEditComplet, 
         consultarMarcaVeiculoEditComplet, 
         consultarModeloVeiculoEditComplet, 
         consultarveiculo } from '../controllers/veiculoController.js';

const router = express.Router();

router.post('/consultarveiculo', consultarveiculo);
router.post('/consultaDetalhes', consultaDetalhes);
router.post('/consultarMarcaVeiculoEditComplet', consultarMarcaVeiculoEditComplet);
router.post('/consultarModeloVeiculoEditComplet', consultarModeloVeiculoEditComplet);
router.post('/consultarCombustivelVeiculoEditComplet', consultarCombustivelVeiculoEditComplet);
router.post('/cadastrarVeiculo', cadastrarVeiculo);
router.post('/atualizarVeiculo', atualizarVeiculo);

export default router;