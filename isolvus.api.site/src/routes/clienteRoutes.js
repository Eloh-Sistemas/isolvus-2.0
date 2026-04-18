import express from 'express';
import { consultarClientEditcomplet, consultarClienteID } from '../controllers/clienteController.js';

const route = express.Router();

route.post('/consultarClientEditcomplet',consultarClientEditcomplet);
route.post('/consultarClienteID',consultarClienteID);

export default route;