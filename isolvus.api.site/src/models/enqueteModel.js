import { executeQuery, getConnection } from "../config/database.js";
import oracledb from 'oracledb';

export async function criarEnqueteModel({ id_comunicado, pergunta, multipla_escolha, opcoes }) {
  const connection = await getConnection();
  try {
    const seqEnq = await connection.execute(
      `SELECT BSSEQ_ENQUETE.NEXTVAL AS ID_ENQUETE FROM DUAL`,
      {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const id_enquete = seqEnq.rows[0].ID_ENQUETE;

    await connection.execute(
      `INSERT INTO BSTAB_ENQUETE (ID_ENQUETE, ID_COMUNICADO, PERGUNTA, MULTIPLA_ESCOLHA)
       VALUES (:id_enquete, :id_comunicado, :pergunta, :multipla_escolha)`,
      { id_enquete, id_comunicado, pergunta, multipla_escolha: multipla_escolha ? 1 : 0 },
      { autoCommit: false }
    );

    for (let i = 0; i < opcoes.length; i++) {
      const seqOpc = await connection.execute(
        `SELECT BSSEQ_ENQUETE_OPCAO.NEXTVAL AS ID_OPCAO FROM DUAL`,
        {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const id_opcao = seqOpc.rows[0].ID_OPCAO;
      await connection.execute(
        `INSERT INTO BSTAB_ENQUETE_OPCAO (ID_OPCAO, ID_ENQUETE, TEXTO, ORDEM)
         VALUES (:id_opcao, :id_enquete, :texto, :ordem)`,
        { id_opcao, id_enquete, texto: opcoes[i], ordem: i },
        { autoCommit: false }
      );
    }

    await connection.commit();
    return { success: true, id_enquete };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}

export async function votarEnqueteModel({ id_enquete, id_opcao, id_usuario }) {
  const enqueteRows = await executeQuery(
    `SELECT MULTIPLA_ESCOLHA FROM BSTAB_ENQUETE WHERE ID_ENQUETE = :id_enquete`,
    { id_enquete }
  );
  if (!enqueteRows?.length) throw new Error('Enquete não encontrada.');
  const multiplaEscolha = Number(enqueteRows[0].multipla_escolha ?? enqueteRows[0].MULTIPLA_ESCOLHA) === 1;

  // Verificar se já votou nessa opção específica (toggle)
  const jaVotouOpcao = await executeQuery(
    `SELECT COUNT(*) AS CNT FROM BSTAB_ENQUETE_VOTO
     WHERE ID_ENQUETE = :id_enquete AND ID_OPCAO = :id_opcao AND ID_USUARIO = :id_usuario`,
    { id_enquete, id_opcao, id_usuario }
  );
  const votouEstaOpcao = Number(jaVotouOpcao[0]?.cnt ?? jaVotouOpcao[0]?.CNT ?? 0) > 0;

  if (votouEstaOpcao) {
    // Toggle off — remove o voto
    await executeQuery(
      `DELETE FROM BSTAB_ENQUETE_VOTO
       WHERE ID_ENQUETE = :id_enquete AND ID_OPCAO = :id_opcao AND ID_USUARIO = :id_usuario`,
      { id_enquete, id_opcao, id_usuario }, true
    );
    return { acao: 'removido' };
  }

  // Escolha única: verificar se já votou em outra opção
  if (!multiplaEscolha) {
    const jaVotou = await executeQuery(
      `SELECT COUNT(*) AS CNT FROM BSTAB_ENQUETE_VOTO WHERE ID_ENQUETE = :id_enquete AND ID_USUARIO = :id_usuario`,
      { id_enquete, id_usuario }
    );
    if (Number(jaVotou[0]?.cnt ?? jaVotou[0]?.CNT ?? 0) > 0) {
      // Trocar o voto: remove o antigo e insere o novo
      await executeQuery(
        `DELETE FROM BSTAB_ENQUETE_VOTO WHERE ID_ENQUETE = :id_enquete AND ID_USUARIO = :id_usuario`,
        { id_enquete, id_usuario }, true
      );
    }
  }

  const seqVoto = await executeQuery(`SELECT BSSEQ_ENQUETE_VOTO.NEXTVAL AS ID_VOTO FROM DUAL`, {});
  const id_voto = seqVoto[0]?.id_voto ?? seqVoto[0]?.ID_VOTO;

  await executeQuery(
    `INSERT INTO BSTAB_ENQUETE_VOTO (ID_VOTO, ID_ENQUETE, ID_OPCAO, ID_USUARIO, DATA_VOTO)
     VALUES (:id_voto, :id_enquete, :id_opcao, :id_usuario, SYSDATE)`,
    { id_voto, id_enquete, id_opcao, id_usuario }, true
  );
  return { acao: 'registrado' };
}

export async function editarEnqueteModel({ id_comunicado, pergunta, multipla_escolha, opcoes }) {
  const connection = await getConnection();
  try {
    // Buscar id_enquete
    const enqRows = await connection.execute(
      `SELECT ID_ENQUETE FROM BSTAB_ENQUETE WHERE ID_COMUNICADO = :id_comunicado`,
      { id_comunicado }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!enqRows.rows?.length) throw new Error('Enquete n\u00e3o encontrada.');
    const id_enquete = enqRows.rows[0].ID_ENQUETE;

    // Atualizar cabe\u00e7alho
    await connection.execute(
      `UPDATE BSTAB_ENQUETE SET PERGUNTA = :pergunta, MULTIPLA_ESCOLHA = :multipla_escolha WHERE ID_ENQUETE = :id_enquete`,
      { pergunta, multipla_escolha: multipla_escolha ? 1 : 0, id_enquete },
      { autoCommit: false }
    );

    // Remover votos e op\u00e7\u00f5es existentes
    await connection.execute(`DELETE FROM BSTAB_ENQUETE_VOTO WHERE ID_ENQUETE = :id_enquete`, { id_enquete }, { autoCommit: false });
    await connection.execute(`DELETE FROM BSTAB_ENQUETE_OPCAO WHERE ID_ENQUETE = :id_enquete`, { id_enquete }, { autoCommit: false });

    // Reinserir op\u00e7\u00f5es
    for (let i = 0; i < opcoes.length; i++) {
      const seqOpc = await connection.execute(
        `SELECT BSSEQ_ENQUETE_OPCAO.NEXTVAL AS ID_OPCAO FROM DUAL`,
        {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const id_opcao = seqOpc.rows[0].ID_OPCAO;
      await connection.execute(
        `INSERT INTO BSTAB_ENQUETE_OPCAO (ID_OPCAO, ID_ENQUETE, TEXTO, ORDEM) VALUES (:id_opcao, :id_enquete, :texto, :ordem)`,
        { id_opcao, id_enquete, texto: opcoes[i], ordem: i },
        { autoCommit: false }
      );
    }

    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}

export async function consultarEnqueteModel({ id_comunicado, id_usuario }) {
  const enqueteRows = await executeQuery(
    `SELECT ID_ENQUETE, PERGUNTA, MULTIPLA_ESCOLHA FROM BSTAB_ENQUETE WHERE ID_COMUNICADO = :id_comunicado`,
    { id_comunicado }
  );
  if (!enqueteRows?.length) return null;

  const e = enqueteRows[0];
  const id_enquete = e.id_enquete ?? e.ID_ENQUETE;

  const opcoes = await executeQuery(
    `SELECT O.ID_OPCAO, O.TEXTO,
       (SELECT COUNT(*) FROM BSTAB_ENQUETE_VOTO V WHERE V.ID_OPCAO = O.ID_OPCAO) AS VOTOS,
       (SELECT COUNT(*) FROM BSTAB_ENQUETE_VOTO V WHERE V.ID_OPCAO = O.ID_OPCAO AND V.ID_USUARIO = :id_usuario) AS VOTEI
     FROM BSTAB_ENQUETE_OPCAO O
     WHERE O.ID_ENQUETE = :id_enquete
     ORDER BY O.ORDEM`,
    { id_enquete, id_usuario }
  );

  const totalVotos = opcoes.reduce((acc, o) => acc + Number(o.votos ?? o.VOTOS ?? 0), 0);

  return {
    id_enquete,
    pergunta: e.pergunta ?? e.PERGUNTA,
    multipla_escolha: Number(e.multipla_escolha ?? e.MULTIPLA_ESCOLHA) === 1,
    opcoes: opcoes.map(o => ({
      id_opcao: o.id_opcao ?? o.ID_OPCAO,
      texto: o.texto ?? o.TEXTO,
      votos: Number(o.votos ?? o.VOTOS ?? 0),
      votei: Number(o.votei ?? o.VOTEI ?? 0) > 0,
    })),
    total_votos: totalVotos,
  };
}
