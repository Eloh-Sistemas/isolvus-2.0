import express from 'express';
import { cadastrarCliente ,consultarCliente, alterargeolocalizacao, CadastrarClienteFull} from '../controllers/clienteCadastroController.js';

const router = express.Router();

router.post('/clientes', cadastrarCliente);
router.post('/clientesfull', CadastrarClienteFull);
router.get('/clientes/:cgcEnt', consultarCliente);
router.post('/clientes/alterar/geolocalizacao', alterargeolocalizacao);

export default router;

