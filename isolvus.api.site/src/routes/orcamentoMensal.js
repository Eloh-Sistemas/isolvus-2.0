import express from 'express';
import { Receber, Consultar, Atualizar, Excluir } from '../controllers/orcamentoMensalControler.js';

const router = express.Router();
router.post('/orcamentomensal/:idusuario/:idgrupoempresa', Receber);
router.get('/orcamentomensal/:idgrupoempresa', Consultar);
router.put('/orcamentomensal/:idusuario/:idgrupoempresa', Atualizar);
router.delete('/orcamentomensal/:idusuario/:idgrupoempresa', Excluir);

export default router;