import express from 'express';
import {
  listarComunicados, criarComunicado, excluirComunicado, editarComunicado, upload,
} from '../controllers/comunicadoController.js';

const router = express.Router();

router.post('/comunicado/listar',  listarComunicados);
router.post('/comunicado/criar',   upload.array('midias', 10), criarComunicado);
router.post('/comunicado/excluir', excluirComunicado);
router.post('/comunicado/editar',  editarComunicado);

export default router;
