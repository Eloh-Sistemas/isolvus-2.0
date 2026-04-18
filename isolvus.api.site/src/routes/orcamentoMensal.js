import express from 'express';
import { Receber } from '../controllers/orcamentoMensalControler.js';

const router = express.Router();
router.post('/orcamentomensal/:idusuario/:idgrupoempresa', Receber);

export default router;