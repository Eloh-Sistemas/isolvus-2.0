import { executeQuery } from "../config/database.js";

const TIPOS_VALIDOS = ['like', 'dislike', 'love', 'haha', 'wow', 'sad', 'angry'];

export async function reagirModel({ id_comunicado, id_usuario, tipo }) {
  if (!TIPOS_VALIDOS.includes(tipo)) throw new Error('Tipo de reação inválido.');

  const jaReagiu = await executeQuery(
    `SELECT ID_REACAO, TIPO FROM BSTAB_REACAO WHERE ID_COMUNICADO = :id_comunicado AND ID_USUARIO = :id_usuario`,
    { id_comunicado, id_usuario }
  );

  const reacaoAtual = jaReagiu[0];
  const tipoAtual = reacaoAtual?.tipo ?? reacaoAtual?.TIPO;

  if (reacaoAtual) {
    if (tipoAtual === tipo) {
      // Toggle off — remove reação
      await executeQuery(
        `DELETE FROM BSTAB_REACAO WHERE ID_COMUNICADO = :id_comunicado AND ID_USUARIO = :id_usuario`,
        { id_comunicado, id_usuario }, true
      );
      return { acao: 'removido' };
    } else {
      // Trocar tipo de reação
      await executeQuery(
        `UPDATE BSTAB_REACAO SET TIPO = :tipo, DATA_REACAO = SYSDATE WHERE ID_COMUNICADO = :id_comunicado AND ID_USUARIO = :id_usuario`,
        { tipo, id_comunicado, id_usuario }, true
      );
      return { acao: 'atualizado' };
    }
  }

  const seq = await executeQuery(`SELECT BSSEQ_REACAO.NEXTVAL AS ID_REACAO FROM DUAL`, {});
  const id_reacao = seq[0]?.id_reacao ?? seq[0]?.ID_REACAO;

  await executeQuery(
    `INSERT INTO BSTAB_REACAO (ID_REACAO, ID_COMUNICADO, ID_USUARIO, TIPO, DATA_REACAO)
     VALUES (:id_reacao, :id_comunicado, :id_usuario, :tipo, SYSDATE)`,
    { id_reacao, id_comunicado, id_usuario, tipo }, true
  );
  return { acao: 'registrado' };
}

export async function consultarReacoesModel({ id_comunicado, id_usuario }) {
  const rows = await executeQuery(
    `SELECT TIPO, COUNT(*) AS TOTAL FROM BSTAB_REACAO WHERE ID_COMUNICADO = :id_comunicado GROUP BY TIPO`,
    { id_comunicado }
  );

  const minha = await executeQuery(
    `SELECT TIPO FROM BSTAB_REACAO WHERE ID_COMUNICADO = :id_comunicado AND ID_USUARIO = :id_usuario`,
    { id_comunicado, id_usuario: id_usuario || 0 }
  );

  const contagens = {};
  rows.forEach(r => { contagens[r.tipo ?? r.TIPO] = Number(r.total ?? r.TOTAL ?? 0); });

  return {
    contagens,
    minha_reacao: minha[0]?.tipo ?? minha[0]?.TIPO ?? null,
    total: rows.reduce((acc, r) => acc + Number(r.total ?? r.TOTAL ?? 0), 0),
  };
}
