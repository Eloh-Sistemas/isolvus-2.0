import express from 'express';
import { consultarVinculoOrdenador, cadastrarVinculoOrdenador, excluirVinculoOrdenador } from '../controllers/ordenadorController.js';

const route = express.Router();

route.post('/consultarVinculoOrdenador', consultarVinculoOrdenador);
route.post('/cadastrarVinculoOrdenador', cadastrarVinculoOrdenador);
route.post('/excluirVinculoOrdenador', excluirVinculoOrdenador);

export default route;