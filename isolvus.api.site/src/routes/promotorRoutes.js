import express from 'express';
import {atividadeevidencia, atividadeporcliente, checkout, checkoutpercentualrealizado, dashboardn1, exluiratividadeevidencia, listaratividadespromotor, listarHistoricoDeVisita, listarjustificativa, promotorcheckin, proximoIdEvidencia, updateatividadeevidencia } from '../controllers/promotorController.js';

const router = express.Router();
router.post('/promotor/listaratividadespromotor', listaratividadespromotor);
router.post('/promotor/checkin', promotorcheckin);
router.post('/promotor/listarHistoricoDeVisita', listarHistoricoDeVisita);
router.post('/promotor/atividadeevidencia', atividadeevidencia);
router.post('/promotor/updateatividadeevidencia', updateatividadeevidencia);
router.post('/promotor/exluiratividadeevidencia', exluiratividadeevidencia);
router.post('/promotor/checkoutpercentualrealizado', checkoutpercentualrealizado);
router.post('/promotor/checkout', checkout);
router.post('/promotor/listarjustificativa', listarjustificativa);
router.post('/proximoIdEvidencia', proximoIdEvidencia);


// DASBOARD ACOMPANHAMENTO
router.post('/promotor/dashboardn1', dashboardn1);
router.post('/promotor/atividadeporcliente', atividadeporcliente);


export default router;