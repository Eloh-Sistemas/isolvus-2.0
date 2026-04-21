import express from 'express';
import { comentar, excluirComentario, listarComentarios } from '../controllers/comentarioController.js';

const router = express.Router();
router.post('/comentario/comentar', comentar);
router.post('/comentario/excluir',  excluirComentario);
router.post('/comentario/listar',   listarComentarios);

export default router;
