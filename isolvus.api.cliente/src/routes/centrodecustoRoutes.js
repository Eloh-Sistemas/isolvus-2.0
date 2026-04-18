import express from 'express';
import { consultaCentroDeCusto } from '../controllers/centrodecustoController.js';


const router = express.Router();

router.get('/CentroDeCusto', consultaCentroDeCusto);

export default router;