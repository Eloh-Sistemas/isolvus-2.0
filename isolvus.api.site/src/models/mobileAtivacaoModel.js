import crypto from "node:crypto";
import { executeQuery } from "../config/database.js";

const LOCATION_INSERT_MIN_DISTANCE_METERS = 5;

function parseJsonObjectSafe(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function mergeMonitoramentoInfo(base, incoming) {
  if (!base || typeof base !== "object") return incoming;
  if (!incoming || typeof incoming !== "object") return base;

  const merged = { ...base };
  for (const [key, incomingValue] of Object.entries(incoming)) {
    const baseValue = merged[key];
    if (
      incomingValue
      && typeof incomingValue === "object"
      && !Array.isArray(incomingValue)
      && baseValue
      && typeof baseValue === "object"
      && !Array.isArray(baseValue)
    ) {
      merged[key] = mergeMonitoramentoInfo(baseValue, incomingValue);
    } else {
      merged[key] = incomingValue;
    }
  }

  return merged;
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function calcularDistanciaMetros(origem, destino) {
  const latitudeOrigem = Number(origem?.latitude);
  const longitudeOrigem = Number(origem?.longitude);
  const latitudeDestino = Number(destino?.latitude);
  const longitudeDestino = Number(destino?.longitude);

  if (
    !Number.isFinite(latitudeOrigem)
    || !Number.isFinite(longitudeOrigem)
    || !Number.isFinite(latitudeDestino)
    || !Number.isFinite(longitudeDestino)
  ) {
    return null;
  }

  const raioTerraMetros = 6371000;
  const dLat = toRad(latitudeDestino - latitudeOrigem);
  const dLon = toRad(longitudeDestino - longitudeOrigem);
  const lat1 = toRad(latitudeOrigem);
  const lat2 = toRad(latitudeDestino);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return raioTerraMetros * c;
}

function devePersistirPontoRota(pontoAtual, ultimoPonto) {
  if (!ultimoPonto) return true;

  const distanciaMetros = calcularDistanciaMetros(ultimoPonto, pontoAtual);
  if (!Number.isFinite(distanciaMetros)) return true;

  const accuracyAtual = Number(pontoAtual?.accuracy);
  const accuracyAnterior = Number(ultimoPonto?.accuracy);
  const margemRuido = Math.max(
    LOCATION_INSERT_MIN_DISTANCE_METERS,
    Number.isFinite(accuracyAtual) ? accuracyAtual : 0,
    Number.isFinite(accuracyAnterior) ? accuracyAnterior : 0,
  );

  if (distanciaMetros >= margemRuido) {
    return true;
  }

  return false;
}

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
     WHERE P.ID_PARAMENTRO = 1
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

export async function obterPoliticaAtualizacaoMobilePorPlataforma({ plataforma }) {
  const plataformaNormalizada = String(plataforma || "android").trim().toLowerCase();

  const ssql = `
    SELECT plataforma, min_build, store_url, mensagem
      FROM (
        SELECT
          LOWER(TRIM(PLATAFORMA)) AS plataforma,
          MIN_BUILD,
          STORE_URL,
          MENSAGEM,
          CASE
            WHEN LOWER(TRIM(PLATAFORMA)) = :plataforma THEN 0
            WHEN LOWER(TRIM(PLATAFORMA)) = 'all' THEN 1
            ELSE 2
          END AS ordem
          FROM BSTAB_MOBILE_UPDATE_CONFIG
         WHERE UPPER(TRIM(ATIVO)) = 'S'
           AND LOWER(TRIM(PLATAFORMA)) IN (:plataforma, 'all')
         ORDER BY ordem
      )
     WHERE ROWNUM = 1
  `;

  const dados = await executeQuery(ssql, {
    plataforma: plataformaNormalizada,
  });

  return dados?.[0] || null;
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
  let idAtivacaoPrincipal = null;

  if (id_usuario_destino) {
    const ativacoesExistentes = await executeQuery(
      `
        SELECT ID_ATIVACAO
          FROM BSTAB_MOBILE_ATIVACAO
         WHERE ID_EMPRESA = :id_empresa
           AND ID_USUARIO_DESTINO = :id_usuario_destino
         ORDER BY ID_ATIVACAO DESC
      `,
      {
        id_empresa: String(id_empresa || ""),
        id_usuario_destino: Number(id_usuario_destino),
      }
    );

    idAtivacaoPrincipal = Number(ativacoesExistentes?.[0]?.id_ativacao || 0) || null;
    const idsDuplicados = ativacoesExistentes
      .slice(1)
      .map((item) => Number(item?.id_ativacao || 0))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (idAtivacaoPrincipal) {
      await executeQuery(
        `
          DELETE FROM BSTAB_MOBILE_ATIVACAO_CMD
           WHERE ID_ATIVACAO = :id_ativacao
        `,
        { id_ativacao: idAtivacaoPrincipal },
        true
      );
    }

    for (const idDuplicado of idsDuplicados) {
      await executeQuery(
        `
          DELETE FROM BSTAB_MOBILE_ATIVACAO_CMD
           WHERE ID_ATIVACAO = :id_ativacao
        `,
        { id_ativacao: idDuplicado },
        true
      );

      await executeQuery(
        `
          DELETE FROM BSTAB_MOBILE_ATIVACAO
           WHERE ID_ATIVACAO = :id_ativacao
        `,
        { id_ativacao: idDuplicado },
        true
      );
    }
  }

  if (idAtivacaoPrincipal) {
    await executeQuery(
      `
        UPDATE BSTAB_MOBILE_ATIVACAO
           SET ID_USUARIO_CRIACAO = :id_usuario,
               API_BASE_URL = :api_base_url,
               CODIGO_ATIVACAO = :codigo_ativacao,
               TOKEN_HASH = :token_hash,
               STATUS = 'P',
               DT_CRIACAO = SYSDATE,
               DT_EXPIRACAO = SYSDATE + (:minutos / 1440),
               DT_UTILIZACAO = NULL,
               DT_ALTERACAO = SYSDATE,
               ID_USUARIO_ALTERACAO = :id_usuario,
               ID_USUARIO_ATIVACAO = NULL,
               DISPOSITIVO = NULL,
               DISPOSITIVO_INFO_JSON = NULL,
               IP_UTILIZACAO = NULL
         WHERE ID_ATIVACAO = :id_ativacao
      `,
      {
        id_ativacao: idAtivacaoPrincipal,
        id_usuario: Number(id_usuario || 0),
        api_base_url: String(api_base_url || ""),
        codigo_ativacao,
        token_hash,
        minutos,
      },
      true
    );
  } else {
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
  }

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
      COALESCE(UD.NOME, UA.NOME) AS NOME_USUARIO_ATIVACAO,
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
    LEFT JOIN BSTAB_USUSARIOS UD
      ON UD.ID_USUARIO = A.ID_USUARIO_DESTINO
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
  await executeQuery(
    `
      DELETE FROM BSTAB_MOBILE_ATIVACAO_CMD
       WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)
    `,
    {
      id_ativacao: String(id_ativacao || "0"),
    },
    true
  );

  const ssql = `
    UPDATE BSTAB_MOBILE_ATIVACAO
       SET STATUS = 'R',
           DT_ALTERACAO = SYSDATE,
           ID_USUARIO_ALTERACAO = :id_usuario,
           DT_UTILIZACAO = NULL,
           ID_USUARIO_ATIVACAO = NULL,
           DISPOSITIVO = NULL,
           DISPOSITIVO_INFO_JSON = NULL,
           IP_UTILIZACAO = NULL
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

export async function excluirAtivacaoMobile({ id_ativacao }) {
  await executeQuery(
    `
      DELETE FROM BSTAB_MOBILE_ATIVACAO_CMD
       WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)
    `,
    { id_ativacao: String(id_ativacao || "0") },
    true
  );

  const result = await executeQuery(
    `
      DELETE FROM BSTAB_MOBILE_ATIVACAO
       WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)
    `,
    { id_ativacao: String(id_ativacao || "0") },
    true
  );

  return {
    rowsAffected: Number(result?.rowsAffected || 0),
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
  const monitoramentoAtual = await executeQuery(
    `
      SELECT DISPOSITIVO_INFO_JSON
        FROM BSTAB_MOBILE_ATIVACAO
       WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)
         AND STATUS = 'U'
    `,
    { id_ativacao: String(id_ativacao || "0") }
  ).catch(() => []);

  const infoAtual = parseJsonObjectSafe(monitoramentoAtual?.[0]?.dispositivo_info_json);
  const infoRecebida = parseJsonObjectSafe(dispositivo_info);
  const infoFinal = mergeMonitoramentoInfo(infoAtual, infoRecebida);
  const dispositivoInfoJson = infoFinal ? JSON.stringify(infoFinal) : null;

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

  // Persiste histórico da rota quando houver coordenadas válidas no heartbeat
  const latitude = Number(dispositivo_info?.location?.latitude);
  const longitude = Number(dispositivo_info?.location?.longitude);
  const accuracy = Number(dispositivo_info?.location?.accuracy_meters);
  const speed = Number(dispositivo_info?.location?.speed);
  const altitude = Number(dispositivo_info?.location?.altitude);
  const source = String(dispositivo_info?.source || "heartbeat").slice(0, 40);

  if (rowsAffected > 0 && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    const ultimoPonto = await executeQuery(
      `
        SELECT LATITUDE, LONGITUDE, ACCURACY_METERS
          FROM (
            SELECT LATITUDE, LONGITUDE, ACCURACY_METERS
              FROM BSTAB_MOBILE_ATIVACAO_LOC
             WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)
             ORDER BY ID_PONTO DESC
          )
         WHERE ROWNUM = 1
      `,
      { id_ativacao: String(id_ativacao || "0") }
    ).catch(() => []);

    const deveInserirPonto = devePersistirPontoRota(
      {
        latitude,
        longitude,
        accuracy: Number.isFinite(accuracy) ? accuracy : null,
      },
      ultimoPonto?.[0] || null,
    );

    if (deveInserirPonto) {
      await executeQuery(
        `
          INSERT INTO BSTAB_MOBILE_ATIVACAO_LOC (
            ID_PONTO,
            ID_ATIVACAO,
            LATITUDE,
            LONGITUDE,
            ACCURACY_METERS,
            SPEED_MPS,
            ALTITUDE_METERS,
            DT_CAPTURA,
            SOURCE,
            DT_CRIACAO
          ) VALUES (
            SEQ_BSTAB_MOBILE_ATIVACAO_LOC.NEXTVAL,
            TO_NUMBER(:id_ativacao),
            :latitude,
            :longitude,
            :accuracy,
            :speed,
            :altitude,
            SYSTIMESTAMP,
            :source,
            SYSTIMESTAMP
          )
        `,
        {
          id_ativacao: String(id_ativacao || "0"),
          latitude,
          longitude,
          accuracy: Number.isFinite(accuracy) ? accuracy : null,
          speed: Number.isFinite(speed) ? speed : null,
          altitude: Number.isFinite(altitude) ? altitude : null,
          source,
        },
        true
      ).catch(() => {});
    }
  }

  const consulta = await executeQuery(
    `SELECT STATUS FROM BSTAB_MOBILE_ATIVACAO WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)`,
    { id_ativacao: String(id_ativacao || "0") }
  );

  return {
    rowsAffected,
    statusAtual: consulta?.[0]?.status || null,
  };
}

export async function listarRotaAtivacaoMobile({ id_ativacao, minutos, dt_inicio, dt_fim }) {
  const parseFiltroData = (value) => {
    if (!value) return null;
    const dt = new Date(String(value));
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const janelaMinutos = Number(minutos || 1440);
  const limiteMinutos = Number.isFinite(janelaMinutos) && janelaMinutos > 0
    ? Math.min(janelaMinutos, 10080)
    : 1440;

  const dataInicioRaw = parseFiltroData(dt_inicio);
  const dataFimRaw = parseFiltroData(dt_fim);

  let dataInicio = dataInicioRaw;
  let dataFim = dataFimRaw;

  if (dataInicio && dataFim && dataInicio.getTime() > dataFim.getTime()) {
    dataInicio = dataFimRaw;
    dataFim = dataInicioRaw;
  }

  const filtroPorData = Boolean(dataInicio || dataFim);
  const filtroPeriodoSql = filtroPorData
    ? `
        AND (:dt_inicio IS NULL OR DT_CAPTURA >= :dt_inicio)
        AND (:dt_fim IS NULL OR DT_CAPTURA <= :dt_fim)
      `
    : `
        AND DT_CAPTURA >= (SYSTIMESTAMP - NUMTODSINTERVAL(:minutos, 'MINUTE'))
      `;

  const bindParams = filtroPorData
    ? {
        id_ativacao: String(id_ativacao || "0"),
        dt_inicio: dataInicio,
        dt_fim: dataFim,
      }
    : {
        id_ativacao: String(id_ativacao || "0"),
        minutos: limiteMinutos,
      };

  return executeQuery(
    `
      SELECT
        ID_PONTO,
        ID_ATIVACAO,
        LATITUDE,
        LONGITUDE,
        ACCURACY_METERS,
        SPEED_MPS,
        ALTITUDE_METERS,
        DT_CAPTURA,
        SOURCE,
        DT_CRIACAO
      FROM BSTAB_MOBILE_ATIVACAO_LOC
      WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)
        ${filtroPeriodoSql}
      ORDER BY DT_CAPTURA ASC
    `,
    bindParams
  );
}

export async function enfileirarComandoAtivacaoMobile({
  id_ativacao,
  tipo_comando,
  payload,
  id_usuario_criacao,
}) {
  const consultaAtivacao = await executeQuery(
    `SELECT STATUS FROM BSTAB_MOBILE_ATIVACAO WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)`,
    { id_ativacao: String(id_ativacao || "0") }
  );

  const statusAtivacao = String(consultaAtivacao?.[0]?.status || "").trim().toUpperCase();
  if (statusAtivacao !== "U") {
    return { ok: false, motivo: "ATIVACAO_NAO_UTILIZADA", statusAtivacao };
  }

  const nextId = await executeQuery(
    `SELECT SEQ_BSTAB_MOBILE_ATIVACAO_CMD.NEXTVAL AS ID_COMANDO FROM DUAL`
  );
  const id_comando = Number(nextId?.[0]?.id_comando || 0);

  await executeQuery(
    `
      INSERT INTO BSTAB_MOBILE_ATIVACAO_CMD (
        ID_COMANDO,
        ID_ATIVACAO,
        TIPO_COMANDO,
        PAYLOAD_JSON,
        STATUS,
        DT_CRIACAO,
        ID_USUARIO_CRIACAO
      ) VALUES (
        :id_comando,
        TO_NUMBER(:id_ativacao),
        :tipo_comando,
        :payload_json,
        'P',
        SYSDATE,
        :id_usuario_criacao
      )
    `,
    {
      id_comando,
      id_ativacao: String(id_ativacao || "0"),
      tipo_comando: String(tipo_comando || ""),
      payload_json: payload ? JSON.stringify(payload) : null,
      id_usuario_criacao: id_usuario_criacao != null ? Number(id_usuario_criacao) : null,
    },
    true
  );

  return {
    ok: true,
    comando: {
      id_comando,
      tipo: String(tipo_comando || ""),
      payload: payload || null,
      status: "pending",
      criado_em: new Date().toISOString(),
    },
  };
}

export async function obterProximoComandoPendenteAtivacaoMobile({ id_ativacao }) {
  const dados = await executeQuery(
    `
      SELECT ID_COMANDO, TIPO_COMANDO, PAYLOAD_JSON, STATUS, DT_CRIACAO
        FROM (
          SELECT ID_COMANDO, TIPO_COMANDO, PAYLOAD_JSON, STATUS, DT_CRIACAO
            FROM BSTAB_MOBILE_ATIVACAO_CMD
           WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)
             AND STATUS = 'P'
           ORDER BY DT_CRIACAO ASC
        )
       WHERE ROWNUM = 1
    `,
    { id_ativacao: String(id_ativacao || "0") }
  );

  if (!dados.length) return null;

  const row = dados[0];
  let payload = null;
  try {
    payload = row.payload_json ? JSON.parse(String(row.payload_json)) : null;
  } catch {
    payload = null;
  }

  return {
    id_comando: String(row.id_comando),
    tipo: row.tipo_comando,
    payload,
    status: row.status,
    criado_em: row.dt_criacao,
  };
}

export async function atualizarStatusComandoAtivacaoMobile({
  id_ativacao,
  id_comando,
  status_execucao,
  erro_execucao,
}) {
  const result = await executeQuery(
    `
      UPDATE BSTAB_MOBILE_ATIVACAO_CMD
         SET STATUS = :status_execucao,
             ERRO_EXECUCAO = :erro_execucao,
             DT_EXECUCAO = SYSDATE
       WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)
         AND ID_COMANDO = TO_NUMBER(:id_comando)
    `,
    {
      id_ativacao: String(id_ativacao || "0"),
      id_comando: String(id_comando || "0"),
      status_execucao: String(status_execucao || "done").slice(0, 20),
      erro_execucao: erro_execucao ? String(erro_execucao).slice(0, 500) : null,
    },
    true
  );
  const atualizado = Number(result?.rowsAffected || 0) > 0;
  if (!atualizado) return false;

  const statusFinal = String(status_execucao || "").trim().toLowerCase();
  if (statusFinal === "done" || statusFinal === "done_no_grant") {
    const comando = await executeQuery(
      `
        SELECT TIPO_COMANDO
          FROM BSTAB_MOBILE_ATIVACAO_CMD
         WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)
           AND ID_COMANDO = TO_NUMBER(:id_comando)
      `,
      {
        id_ativacao: String(id_ativacao || "0"),
        id_comando: String(id_comando || "0"),
      }
    );

    if (String(comando?.[0]?.tipo_comando || "").trim().toLowerCase() === "redefinir_ativacao") {
      await executeQuery(
        `
          UPDATE BSTAB_MOBILE_ATIVACAO
             SET STATUS = 'D',
                 DT_ALTERACAO = SYSDATE
           WHERE ID_ATIVACAO = TO_NUMBER(:id_ativacao)
             AND TRIM(UPPER(STATUS)) = 'U'
        `,
        { id_ativacao: String(id_ativacao || "0") },
        true
      );
    }
  }

  return true;
}
