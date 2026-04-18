import express from 'express';
import { consultarInstituicaoBancaria } from '../controllers/instituicaoBancariaController.js';

const router = express.Router();
router.post('/instituicaobancaria/consultar', consultarInstituicaoBancaria);

export default router;