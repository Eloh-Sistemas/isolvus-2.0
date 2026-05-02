import express from "express";
import {
  GerarAtivacao,
  ListarAtivacao,
  MonitorarAtivacao,
  RedefinirAtivacao,
  RedefinirAtivacaoPorUsuario,
  RegistrarErroAtivacao,
  RevogarAtivacao,
  RevogarAtivacaoPorId,
  ValidarAtivacao,
  ValidarAtivacaoPorCodigo,
} from "../controllers/mobileAtivacaoController.js";

const router = express.Router();

router.post("/mobile/ativacao/gerar", GerarAtivacao);
router.get("/mobile/ativacao/listar", ListarAtivacao);
router.post("/mobile/ativacao/revogar", RevogarAtivacao);
router.post("/mobile/ativacao/redefinir-por-usuario", RedefinirAtivacaoPorUsuario);
router.post("/mobile/ativacao/validar", ValidarAtivacao);
router.post("/mobile/ativacao/validar-por-codigo", ValidarAtivacaoPorCodigo);
router.post("/mobile/ativacao/:id_ativacao/monitorar", MonitorarAtivacao);
router.post("/mobile/ativacao/:id_ativacao/registrar-erro", RegistrarErroAtivacao);
router.post("/mobile/ativacao/:id_ativacao/revogar", RevogarAtivacaoPorId);
router.post("/mobile/ativacao/:id_ativacao/redefinir", RedefinirAtivacao);

export default router;
