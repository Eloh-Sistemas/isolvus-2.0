import express from 'express';
import { criarEnquete, votarEnquete, consultarEnquete, editarEnquete } from '../controllers/enqueteController.js';

const router = express.Router();

router.post('/enquete/criar',     criarEnquete);
router.post('/enquete/editar',    editarEnquete);
router.post('/enquete/votar',     votarEnquete);
router.post('/enquete/consultar', consultarEnquete);

export default router;
