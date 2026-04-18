import express from 'express';
import { consultarFilial, consultarSetor, consultarFilialCompleto, cadastarFilial, AlterarFilial } from '../controllers/filialController.js';

const router = express.Router();

router.post('/consultarFilial', consultarFilial);
router.post('/consultarSetor', consultarSetor);
router.post('/consultarFilialCompleto', consultarFilialCompleto);
router.post('/cadastrarFilial', cadastarFilial);
router.put('/cadastrarFilial/:id_empresa', AlterarFilial)

export default router;