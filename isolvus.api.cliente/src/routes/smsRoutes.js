import express from 'express';
import { consultaSms } from '../controllers/smsController.js';


const router = express.Router();

router.get('/SMS', consultaSms);

export default router;