import express from 'express';
import { AceitarGeoLocalizacaoCliente, RejeitarGeoLocalizacaoCliente,  ListarGeoLocalizacaoPendenteCliente } from '../controllers/auditarLocalizacaoController.js';

const router = express.Router();

router.post('/Auditar/Localizacao/Aceitar', AceitarGeoLocalizacaoCliente);
router.post('/Auditar/Localizacao/Rejeitar', RejeitarGeoLocalizacaoCliente);
router.post('/Auditar/Localizacao/Listar', ListarGeoLocalizacaoPendenteCliente);

export default router;