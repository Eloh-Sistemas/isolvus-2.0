import express from "express";
import {
  ConfirmarComandoMobile,
  ExcluirAtivacao,
  EnviarComandoInativarDispositivo,
  EnviarComandoLocalizacao,
  EnviarComandoPermissao,
  GerarAtivacao,
  ListarAtivacao,
  MonitorarAtivacao,
  RedefinirAtivacao,
  RedefinirAtivacaoPorUsuario,
  RegistrarErroAtivacao,
  ValidarAtivacao,
  ValidarAtivacaoPorCodigo,
} from "../controllers/mobileAtivacaoController.js";
import {
  ReceberFrameEspelho,
  ObterFrameAtual,
  IniciarEspelhamento,
  PararEspelhamento,
  ProcessarToque,
} from "../controllers/mobileEspelhoController.js";

const router = express.Router();

// Rotas de ativação
router.post("/mobile/ativacao/gerar", GerarAtivacao);
router.get("/mobile/ativacao/listar", ListarAtivacao);
router.post("/mobile/ativacao/redefinir-por-usuario", RedefinirAtivacaoPorUsuario);
router.post("/mobile/ativacao/validar", ValidarAtivacao);
router.post("/mobile/ativacao/validar-por-codigo", ValidarAtivacaoPorCodigo);
router.post("/mobile/ativacao/:id_ativacao/monitorar", MonitorarAtivacao);
router.post("/mobile/ativacao/:id_ativacao/comandos/solicitar-permissao", EnviarComandoPermissao);
router.post("/mobile/ativacao/:id_ativacao/comandos/solicitar-localizacao", EnviarComandoLocalizacao);
router.post("/mobile/ativacao/:id_ativacao/comandos/inativar-dispositivo", EnviarComandoInativarDispositivo);
router.post("/mobile/ativacao/:id_ativacao/comandos/ack", ConfirmarComandoMobile);
router.post("/mobile/ativacao/:id_ativacao/registrar-erro", RegistrarErroAtivacao);
router.post("/mobile/ativacao/:id_ativacao/excluir", ExcluirAtivacao);
router.post("/mobile/ativacao/:id_ativacao/redefinir", RedefinirAtivacao);

// Rotas de espelhamento de tela
router.post("/mobile/ativacao/:id_ativacao/espelho/frame", ReceberFrameEspelho);
router.get("/mobile/ativacao/:id_ativacao/espelho/frame-atual", ObterFrameAtual);
router.post("/mobile/ativacao/:id_ativacao/espelho/iniciar", IniciarEspelhamento);
router.post("/mobile/ativacao/:id_ativacao/espelho/parar", PararEspelhamento);
router.post("/mobile/ativacao/:id_ativacao/espelho/toque", ProcessarToque);

export default router;
