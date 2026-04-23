import express from 'express';
import {
	ConsultarPermissoesDoUsuario,
	AlterarPermissoesDoUsuario,
	ConsultarPermissoes,
	AlterarSubPermissoesDoUsuario
} from '../controllers/permissoesController.js';

const router = express.Router();

router.post('/consultarPermissoesDoUsuario', ConsultarPermissoesDoUsuario);
router.post('/consultarPermissoes', ConsultarPermissoes);
router.post('/AlterarPermissoesDoUsuario', AlterarPermissoesDoUsuario);
router.post('/AlterarSubPermissoesDoUsuario', AlterarSubPermissoesDoUsuario);

export default router;