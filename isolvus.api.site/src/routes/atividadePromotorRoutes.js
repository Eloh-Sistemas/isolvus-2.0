import express from 'express';
import { cadastrarItemAtividade, consultarAtividadePromotorEditcomplet, consultarAtividadePromotorGeral, consultarEquipeTreinamentoEditcomplet, consultarEquipeTreinamentoGeral, consultarItemAtividade, excluirItemAtividade } from '../controllers/atividadePromotorController.js';

const router = express.Router();
router.post('/consultarAtividadePromotorEditcomplet', consultarAtividadePromotorEditcomplet);
router.post('/consultarEquipeTreinamentoEditcomplet', consultarEquipeTreinamentoEditcomplet);
router.post('/cadastrarItemAtividade', cadastrarItemAtividade);
router.post('/consultarItemAtividade', consultarItemAtividade);
router.post('/excluirItemAtividade', excluirItemAtividade);
router.post('/getconsultarAtividadePromotorGeral', consultarAtividadePromotorGeral);
router.post('/consultarEquipeTreinamentoGeral', consultarEquipeTreinamentoGeral);


export default router;