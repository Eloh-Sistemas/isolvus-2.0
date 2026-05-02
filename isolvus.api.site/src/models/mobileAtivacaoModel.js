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

export async function obterApiBaseUrlPorParametro({ id_grupo_empresa, id_empresa }) {
  const ssql = `
    SELECT P.VALOR AS API_BASE_URL
      FROM BSTAB_PARAMETROPORGRUPOEMPRESA P
      JOIN BSTAB_EMPRESAS E
        ON E.ID_GRUPO_EMPRESA = P.ID_GRUPO_EMPRESA
     WHERE P.ID_PARAMETRO = 1
       AND (
            (:id_grupo_empresa IS NOT NULL AND P.ID_GRUPO_EMPRESA = :id_grupo_empresa)
         OR (:id_grupo_empresa IS NULL AND (TO_CHAR(E.ID_ERP) = :id_empresa OR LPAD(E.ID_ERP, 4, '0') = :id_empresa))
       )
       AND P.VALOR IS NOT NULL
       AND ROWNUM = 1
  `;

  const dados = await executeQuery(ssql, {
    id_grupo_empresa: id_grupo_empresa ? Number(id_grupo_empresa) : null,
    id_empresa: String(id_empresa || ""),
  });

  return String(dados?.[0]?.api_base_url || "").trim();
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

  if (id_usuario_destino) {
    const ssqlDeleteAnteriores = `
      DELETE FROM BSTAB_MOBILE_ATIVACAO
       WHERE ID_EMPRESA = :id_empresa
         AND ID_USUARIO_DESTINO = :id_usuario_destino
    `;

    await executeQuery(
      ssqlDeleteAnteriores,
      {
        id_empresa: String(id_empresa || ""),
        id_usuario_destino: Number(id_usuario_destino),
      },
      true
    );
  }

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
      A.ID_ATIVACAO,
      A.ID_EMPRESA,
      A.RAZAOSOCIAL,
      A.ID_USUARIO_CRIACAO,
      A.ID_USUARIO_DESTINO,
      A.ID_USUARIO_ATIVACAO,
      UA.NOME AS NOME_USUARIO_ATIVACAO,
      A.API_BASE_URL,
      A.CODIGO_ATIVACAO,
      A.STATUS,
      A.DT_CRIACAO,
      A.DT_EXPIRACAO,
      A.DT_UTILIZACAO,
      A.DISPOSITIVO,
      A.DISPOSITIVO_INFO_JSON,
      A.IP_UTILIZACAO
    FROM BSTAB_MOBILE_ATIVACAO A
    LEFT JOIN BSTAB_USUSARIOS UA
      ON UA.ID_USUARIO = A.ID_USUARIO_ATIVACAO
    WHERE (:id_empresa IS NULL OR A.ID_EMPRESA = :id_empresa)
    ORDER BY A.ID_ATIVACAO DESC
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
     WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)
       AND TRIM(UPPER(STATUS)) = 'P'
  `;

  const result = await executeQuery(ssql, {
    id_ativacao: String(id_ativacao || "0"),
    id_usuario: id_usuario != null ? Number(id_usuario) : null,
  }, true);

  const rowsAffected = Number(result?.rowsAffected || 0);

  const consultaSql = `
    SELECT STATUS, DT_ALTERACAO
      FROM BSTAB_MOBILE_ATIVACAO
     WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)
  `;

  const consulta = await executeQuery(consultaSql, {
    id_ativacao: String(id_ativacao || "0"),
  });

  return {
    rowsAffected,
    statusAtual: consulta?.[0]?.status || null,
    dtAlteracao: consulta?.[0]?.dt_alteracao || null,
  };
}

export async function redefinirAtivacaoMobilePorUsuario({ id_usuario }) {
  // Redefine a ativação mais recente utilizada pelo usuário (status U ou P)
  const ssql = `
    UPDATE BSTAB_MOBILE_ATIVACAO
       SET STATUS = 'D',
           DT_ALTERACAO = SYSDATE,
           ID_USUARIO_ALTERACAO = :id_usuario_alteracao
     WHERE ID_ATIVACAO = (
             SELECT MAX(ID_ATIVACAO)
               FROM BSTAB_MOBILE_ATIVACAO
              WHERE ID_USUARIO_DESTINO = :id_usuario_destino
                AND TRIM(UPPER(STATUS)) IN ('P', 'U')
           )
  `;

  const result = await executeQuery(ssql, {
    id_usuario_alteracao: id_usuario != null ? Number(id_usuario) : null,
    id_usuario_destino: id_usuario != null ? Number(id_usuario) : null,
  }, true);

  return {
    rowsAffected: Number(result?.rowsAffected || 0),
  };
}

export async function redefinirAtivacaoMobile({ id_ativacao, id_usuario }) {
  const ssql = `
    UPDATE BSTAB_MOBILE_ATIVACAO
       SET STATUS = 'D',
           DT_ALTERACAO = SYSDATE,
           ID_USUARIO_ALTERACAO = :id_usuario
     WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)
       AND TRIM(UPPER(STATUS)) IN ('P', 'U')
  `;

  const result = await executeQuery(ssql, {
    id_ativacao: String(id_ativacao || "0"),
    id_usuario: id_usuario != null ? Number(id_usuario) : null,
  }, true);

  const rowsAffected = Number(result?.rowsAffected || 0);

  const consultaSql = `
    SELECT STATUS, DT_ALTERACAO
      FROM BSTAB_MOBILE_ATIVACAO
     WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)
  `;

  const consulta = await executeQuery(consultaSql, {
    id_ativacao: String(id_ativacao || "0"),
  });

  return {
    rowsAffected,
    statusAtual: consulta?.[0]?.status || null,
    dtAlteracao: consulta?.[0]?.dt_alteracao || null,
  };
}

export async function validarAtivacaoPorCodigo({ codigo_ativacao, dispositivo, dispositivo_info, ip_utilizacao, id_usuario_ativacao }) {
  // Busca o registro com o codigo e status P ainda valido
  const ssqlBusca = `
    SELECT ID_ATIVACAO, TOKEN_HASH, STATUS, DT_EXPIRACAO
      FROM (
        SELECT ID_ATIVACAO, TOKEN_HASH, STATUS, DT_EXPIRACAO
          FROM BSTAB_MOBILE_ATIVACAO
         WHERE CODIGO_ATIVACAO = :codigo_ativacao
         ORDER BY ID_ATIVACAO DESC
      )
     WHERE ROWNUM = 1
  `;

  const busca = await executeQuery(ssqlBusca, { codigo_ativacao: String(codigo_ativacao || "") });

  if (!busca.length) {
    return { ok: false, motivo: "TOKEN_INVALIDO" };
  }

  const registro = busca[0];

  if (String(registro.status || "").trim() !== "P") {
    return { ok: false, motivo: "TOKEN_JA_UTILIZADO" };
  }

  const expiracao = new Date(registro.dt_expiracao);
  if (expiracao < new Date()) {
    return { ok: false, motivo: "TOKEN_EXPIRADO" };
  }

  // Reutiliza a validação por token_hash
  return validarAtivacaoMobile({
    token_ativacao: null,
    _token_hash_direto: registro.token_hash,
    dispositivo,
    dispositivo_info,
    ip_utilizacao,
    id_usuario_ativacao,
  });
}

export async function validarAtivacaoMobile({ token_ativacao, _token_hash_direto, dispositivo, dispositivo_info, ip_utilizacao, id_usuario_ativacao }) {
  const token_hash = _token_hash_direto || hashToken(token_ativacao);
  const dispositivoInfoJson = dispositivo_info
    ? JSON.stringify(dispositivo_info)
    : null;

  const updateSql = `
    UPDATE BSTAB_MOBILE_ATIVACAO
       SET STATUS = 'U',
           DT_UTILIZACAO = SYSDATE,
           DT_ALTERACAO = SYSDATE,
           DISPOSITIVO = :dispositivo,
           DISPOSITIVO_INFO_JSON = :dispositivo_info_json,
           IP_UTILIZACAO = :ip_utilizacao,
           ID_USUARIO_ATIVACAO = :id_usuario_ativacao
     WHERE TOKEN_HASH = :token_hash
       AND STATUS = 'P'
       AND DT_EXPIRACAO >= SYSDATE
  `;

  const updateResult = await executeQuery(updateSql, {
    token_hash,
    dispositivo: String(dispositivo || "APP-MOBILE").slice(0, 200),
    dispositivo_info_json: dispositivoInfoJson,
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
      A.ID_ATIVACAO,
      A.ID_EMPRESA,
      A.RAZAOSOCIAL,
      A.API_BASE_URL,
      A.CODIGO_ATIVACAO,
      A.DT_EXPIRACAO,
      A.ID_USUARIO_DESTINO,
      U.ID_USUARIO,
      U.ID_USUARIO_ERP,
      U.NOME,
      UPPER(U.EMAIL)         AS USUARIO,
      U.ID_GRUPO_EMPRESA,
      U.ID_SETOR_ERP,
      ST.SETOR,
      LPAD(E.ID_ERP, 4, 0)  AS ID_EMPRESA_ERP_PADDED
    FROM BSTAB_MOBILE_ATIVACAO A
    LEFT JOIN BSTAB_USUSARIOS U
           ON U.ID_USUARIO = A.ID_USUARIO_DESTINO
    LEFT JOIN BSTAB_EMPRESAS E
           ON E.ID_ERP         = U.ID_EMPRESA_ERP
          AND E.ID_GRUPO_EMPRESA = U.ID_GRUPO_EMPRESA
    LEFT JOIN BSTAB_USUARIO_SETOR ST
           ON ST.ID_SETOR_ERP     = U.ID_SETOR_ERP
          AND ST.ID_GRUPO_EMPRESA  = U.ID_GRUPO_EMPRESA
    WHERE A.TOKEN_HASH = :token_hash
  `;

  const dados = await executeQuery(ssqlRetorno, { token_hash });
  const atual = dados[0] || {};

  const usuarioDados = atual.id_usuario_destino
    ? {
        id_usuario: atual.id_usuario,
        id_usuario_erp: atual.id_usuario_erp,
        nome: atual.nome,
        usuario: atual.usuario,
        id_grupo_empresa: atual.id_grupo_empresa,
        id_setor_erp: atual.id_setor_erp,
        setor: atual.setor,
        id_empresa: atual.id_empresa_erp_padded || atual.id_empresa,
        razaosocial: atual.razaosocial,
      }
    : null;

  return {
    ok: true,
    dados: {
      id_ativacao: atual.id_ativacao,
      id_empresa: atual.id_empresa,
      razaosocial: atual.razaosocial,
      api_base_url: atual.api_base_url,
      codigo_ativacao: atual.codigo_ativacao,
      dt_expiracao: atual.dt_expiracao,
      usuario: usuarioDados,
    },
  };
}

export async function registrarMonitoramentoAtivacaoMobile({
  id_ativacao,
  dispositivo,
  dispositivo_info,
  ip_utilizacao,
}) {
  const dispositivoInfoJson = dispositivo_info ? JSON.stringify(dispositivo_info) : null;

  const updateSql = `
    UPDATE BSTAB_MOBILE_ATIVACAO
       SET DISPOSITIVO = :dispositivo,
           DISPOSITIVO_INFO_JSON = :dispositivo_info_json,
           IP_UTILIZACAO = :ip_utilizacao,
           DT_ALTERACAO = SYSDATE
     WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)
       AND STATUS = 'U'
  `;

  const updateResult = await executeQuery(updateSql, {
    id_ativacao: String(id_ativacao || "0"),
    dispositivo: String(dispositivo || "APP-MOBILE").slice(0, 200),
    dispositivo_info_json: dispositivoInfoJson,
    ip_utilizacao: String(ip_utilizacao || ""),
  }, true);

  const rowsAffected = Number(updateResult?.rowsAffected || 0);

  const consulta = await executeQuery(
    `SELECT STATUS FROM BSTAB_MOBILE_ATIVACAO WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)`,
    { id_ativacao: String(id_ativacao || "0") }
  );

  return {
    rowsAffected,
    statusAtual: consulta?.[0]?.status || null,
  };
}
