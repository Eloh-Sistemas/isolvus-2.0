import { executeQuery, getConnection } from "../config/database.js";
import oracledb from 'oracledb';

export async function listarComunicadosModel({ id_grupo_empresa, admin = false }) {
  const filtroPeriodo = admin ? '' : `
    AND (c.DATA_DISPONIVEL IS NULL OR c.DATA_DISPONIVEL <= SYSDATE)
    AND (c.DATA_EXPIRACAO IS NULL OR c.DATA_EXPIRACAO >= SYSDATE)`;

  const sql = `
    SELECT
      c.ID_COMUNICADO, c.TITULO, c.CONTEUDO, c.TIPO, c.NOME_AUTOR, c.SETOR_AUTOR,
      c.DATA_PUBLICACAO, c.DATA_DISPONIVEL, c.DATA_EXPIRACAO, c.ID_USUARIO_AUTOR,
      c.FOTOS, c.PERMITE_COMENTARIO,
      (SELECT U.FOTO FROM BSTAB_USUSARIOS U WHERE U.ID_USUARIO = c.ID_USUARIO_AUTOR AND U.ID_GRUPO_EMPRESA = c.ID_GRUPO_EMPRESA) AS FOTO_AUTOR,
      (SELECT COUNT(*) FROM BSTAB_COMENTARIO CM WHERE CM.ID_COMUNICADO = c.ID_COMUNICADO AND CM.ATIVO = 1) AS TOTAL_COMENTARIOS
    FROM BSTAB_COMUNICADOS c
    WHERE c.ID_GRUPO_EMPRESA = :id_grupo_empresa
      AND c.ATIVO = 1
      ${filtroPeriodo}
    ORDER BY c.DATA_PUBLICACAO DESC
  `;
  return await executeQuery(sql, { id_grupo_empresa });
}

export async function criarComunicadoModel({ titulo, conteudo, tipo, fotos, id_usuario_autor, nome_autor, setor_autor, id_grupo_empresa, data_disponivel, data_expiracao, permite_comentario }) {
  const connection = await getConnection();
  try {
    const seqResult = await connection.execute(
      `SELECT BSSEQ_COMUNICADO.NEXTVAL AS ID_COMUNICADO FROM DUAL`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const id_comunicado = seqResult.rows[0].ID_COMUNICADO;

    const dataDisponivel = data_disponivel ? new Date(data_disponivel) : null;
    const dataExpiracao  = data_expiracao  ? new Date(data_expiracao)  : null;

    const binds = {
      id_comunicado,
      titulo,
      conteudo: conteudo || null,
      tipo: tipo || 'AVISO',
      id_usuario_autor,
      nome_autor: nome_autor || null,
      setor_autor: setor_autor || null,
      id_grupo_empresa,
      data_disponivel: dataDisponivel,
      data_expiracao:  dataExpiracao,
      permite_comentario: permite_comentario ? 1 : 0,
    };

    const colsFotos = fotos ? ', FOTOS' : '';
    const valsFotos = fotos ? ', :fotos' : '';

    if (fotos) binds.fotos = fotos;

    const sql = `
      INSERT INTO BSTAB_COMUNICADOS
        (ID_COMUNICADO, TITULO, CONTEUDO, TIPO ${colsFotos}, ID_USUARIO_AUTOR, NOME_AUTOR, SETOR_AUTOR, DATA_PUBLICACAO, DATA_DISPONIVEL, DATA_EXPIRACAO, ATIVO, ID_GRUPO_EMPRESA, PERMITE_COMENTARIO)
      VALUES
        (:id_comunicado, :titulo, :conteudo, :tipo ${valsFotos}, :id_usuario_autor, :nome_autor, :setor_autor, SYSDATE, :data_disponivel, :data_expiracao, 1, :id_grupo_empresa, :permite_comentario)
    `;

    await connection.execute(sql, binds, { autoCommit: true });
    return { success: true, id_comunicado };
  } finally {
    await connection.close();
  }
}

export async function getFotosComunicadoModel({ id_comunicado, id_grupo_empresa }) {
  const sql = `
    SELECT FOTOS FROM BSTAB_COMUNICADOS
    WHERE ID_COMUNICADO = :id_comunicado
      AND ID_GRUPO_EMPRESA = :id_grupo_empresa
      AND ATIVO = 1
  `;
  const rows = await executeQuery(sql, { id_comunicado, id_grupo_empresa });
  return rows && rows[0] ? (rows[0].FOTOS || rows[0].fotos || null) : null;
}

export async function excluirComunicadoModel({ id_comunicado, id_grupo_empresa }) {
  const sql = `
    UPDATE BSTAB_COMUNICADOS
    SET ATIVO = 0
    WHERE ID_COMUNICADO = :id_comunicado
      AND ID_GRUPO_EMPRESA = :id_grupo_empresa
  `;
  return await executeQuery(sql, { id_comunicado, id_grupo_empresa }, true);
}

export async function editarComunicadoModel({ id_comunicado, id_grupo_empresa, titulo, conteudo, tipo, data_disponivel, data_expiracao, permite_comentario, fotos }) {
  const colFotos = fotos !== undefined ? ', FOTOS = :fotos' : '';
  const colPermite = ', PERMITE_COMENTARIO = :permite_comentario';
  const sql = `
    UPDATE BSTAB_COMUNICADOS
    SET
      TITULO          = :titulo,
      CONTEUDO        = :conteudo,
      TIPO            = :tipo,
      DATA_DISPONIVEL = :data_disponivel,
      DATA_EXPIRACAO  = :data_expiracao
      ${colPermite}
      ${colFotos}
    WHERE ID_COMUNICADO    = :id_comunicado
      AND ID_GRUPO_EMPRESA = :id_grupo_empresa
      AND ATIVO            = 1
  `;
  const binds = {
    titulo,
    conteudo: conteudo || null,
    tipo: tipo || 'AVISO',
    data_disponivel: data_disponivel ? new Date(data_disponivel) : null,
    data_expiracao:  data_expiracao  ? new Date(data_expiracao)  : null,
    permite_comentario: permite_comentario ? 1 : 0,
    id_comunicado,
    id_grupo_empresa,
  };
  if (fotos !== undefined) binds.fotos = fotos;
  return await executeQuery(sql, binds, true);
}

