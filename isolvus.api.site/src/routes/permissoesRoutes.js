import express from 'express';
import { ConsultarPermissoesDoUsuario, AlterarPermissoesDoUsuario, ConsultarPermissoes } from '../controllers/permissoesController.js';

const router = express.Router();

router.post('/consultarPermissoesDoUsuario', ConsultarPermissoesDoUsuario);
router.post('/consultarPermissoes', ConsultarPermissoes);
router.post('/AlterarPermissoesDoUsuario', AlterarPermissoesDoUsuario);

export default router;