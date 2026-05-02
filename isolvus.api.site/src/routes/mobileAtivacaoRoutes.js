import express from "express";
import {
  GerarAtivacao,
  ListarAtivacao,
  RevogarAtivacao,
  ValidarAtivacao,
} from "../controllers/mobileAtivacaoController.js";

const router = express.Router();

router.post("/mobile/ativacao/gerar", GerarAtivacao);
router.get("/mobile/ativacao/listar", ListarAtivacao);
router.post("/mobile/ativacao/revogar", RevogarAtivacao);
router.post("/mobile/ativacao/validar", ValidarAtivacao);

export default router;
