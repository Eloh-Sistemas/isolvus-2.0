import crypto from "node:crypto";
import { executeQuery } from "../config/database.js";

function gerarCodigoAtivacao() {
  const numero = Math.floor(100000 + Math.random() * 900000);
  return String(numero);
}

function gerarTokenBruto() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(tokenBruto) {
  return crypto.createHash("sha256").update(String(tokenBruto || "")).digest("hex");
}

export async function gerarAtivacaoMobile({
  id_empresa,
  razaosocial,
  id_usuario,
  id_usuario_destino,
  api_base_url,
  validade_minutos,
}) {
  const codigo_ativacao = gerarCodigoAtivacao();
  const token_bruto = gerarTokenBruto();
  const token_hash = hashToken(token_bruto);
  const minutos = Number(validade_minutos || 10);

  const ssql = `
    INSERT INTO BSTAB_MOBILE_ATIVACAO (
      ID_ATIVACAO,
      ID_EMPRESA,
      RAZAOSOCIAL,
      ID_USUARIO_CRIACAO,
      ID_USUARIO_DESTINO,
      API_BASE_URL,
      CODIGO_ATIVACAO,
      TOKEN_HASH,
      STATUS,
      DT_CRIACAO,
      DT_EXPIRACAO
    ) VALUES (
      SEQ_BSTAB_MOBILE_ATIVACAO.NEXTVAL,
      :id_empresa,
      :razaosocial,
      :id_usuario,
      :id_usuario_destino,
      :api_base_url,
      :codigo_ativacao,
      :token_hash,
      'P',
      SYSDATE,
      SYSDATE + (:minutos / 1440)
    )
  `;

  await executeQuery(ssql, {
    id_empresa: String(id_empresa || ""),
    razaosocial: String(razaosocial || ""),
    id_usuario: Number(id_usuario || 0),
    id_usuario_destino: id_usuario_destino ? Number(id_usuario_destino) : null,
    api_base_url: String(api_base_url || ""),
    codigo_ativacao,
    token_hash,
    minutos,
  }, true);

  return {
    codigo_ativacao,
    token_ativacao: token_bruto,
    validade_minutos: minutos,
  };
}

export async function listarAtivacoesMobile({ id_empresa }) {
  const ssql = `
    SELECT
      ID_ATIVACAO,
      ID_EMPRESA,
      RAZAOSOCIAL,
      ID_USUARIO_CRIACAO,
      ID_USUARIO_DESTINO,
      ID_USUARIO_ATIVACAO,
      API_BASE_URL,
      CODIGO_ATIVACAO,
      STATUS,
      DT_CRIACAO,
      DT_EXPIRACAO,
      DT_UTILIZACAO,
      DISPOSITIVO,
      IP_UTILIZACAO
    FROM BSTAB_MOBILE_ATIVACAO
    WHERE (:id_empresa IS NULL OR ID_EMPRESA = :id_empresa)
    ORDER BY ID_ATIVACAO DESC
  `;

  return executeQuery(ssql, {
    id_empresa: id_empresa ? String(id_empresa) : null,
  });
}

export async function revogarAtivacaoMobile({ id_ativacao, id_usuario }) {
  const ssql = `
    UPDATE BSTAB_MOBILE_ATIVACAO
       SET STATUS = 'R',
           DT_ALTERACAO = SYSDATE,
           ID_USUARIO_ALTERACAO = :id_usuario
     WHERE ID_ATIVACAO = :id_ativacao
       AND STATUS = 'P'
  `;

  const result = await executeQuery(ssql, {
    id_ativacao: Number(id_ativacao || 0),
    id_usuario: id_usuario != null ? Number(id_usuario) : null,
  }, true);

  return Number(result?.rowsAffected || 0);
}

export async function validarAtivacaoMobile({ token_ativacao, dispositivo, ip_utilizacao, id_usuario_ativacao }) {
  const token_hash = hashToken(token_ativacao);

  const updateSql = `
    UPDATE BSTAB_MOBILE_ATIVACAO
       SET STATUS = 'U',
           DT_UTILIZACAO = SYSDATE,
           DT_ALTERACAO = SYSDATE,
           DISPOSITIVO = :dispositivo,
           IP_UTILIZACAO = :ip_utilizacao,
           ID_USUARIO_ATIVACAO = :id_usuario_ativacao
     WHERE TOKEN_HASH = :token_hash
       AND STATUS = 'P'
       AND DT_EXPIRACAO >= SYSDATE
  `;

  const updateResult = await executeQuery(updateSql, {
    token_hash,
    dispositivo: String(dispositivo || "APP-MOBILE"),
    ip_utilizacao: String(ip_utilizacao || ""),
    id_usuario_ativacao: id_usuario_ativacao ? Number(id_usuario_ativacao) : null,
  }, true);

  if (Number(updateResult?.rowsAffected || 0) === 0) {
    const ssqlConsulta = `
      SELECT ID_ATIVACAO, STATUS, DT_EXPIRACAO
        FROM BSTAB_MOBILE_ATIVACAO
       WHERE TOKEN_HASH = :token_hash
    `;
    const consulta = await executeQuery(ssqlConsulta, { token_hash });

    if (!consulta.length) {
      return { ok: false, motivo: "TOKEN_INVALIDO" };
    }

    const registro = consulta[0];
    if (registro.status !== "P") {
      return { ok: false, motivo: "TOKEN_JA_UTILIZADO" };
    }

    return { ok: false, motivo: "TOKEN_EXPIRADO" };
  }

  const ssqlRetorno = `
    SELECT
      ID_EMPRESA,
      RAZAOSOCIAL,
      API_BASE_URL,
      CODIGO_ATIVACAO,
      DT_EXPIRACAO
    FROM BSTAB_MOBILE_ATIVACAO
    WHERE TOKEN_HASH = :token_hash
  `;

  const dados = await executeQuery(ssqlRetorno, { token_hash });
  const atual = dados[0] || {};

  return {
    ok: true,
    dados: {
      id_empresa: atual.id_empresa,
      razaosocial: atual.razaosocial,
      api_base_url: atual.api_base_url,
      codigo_ativacao: atual.codigo_ativacao,
      dt_expiracao: atual.dt_expiracao,
    },
  };
}
