import express from 'express';
import { ElohIA } from '../controllers/IAController.js';

const router = express.Router();
router.post('/ElohIA', ElohIA);

export default router;