import { executeQuery } from "../config/database.js";

export async function comentarModel({ id_comunicado, id_usuario, nome_usuario, foto_usuario, texto, id_comentario_pai }) {
  const seq = await executeQuery(`SELECT BSSEQ_COMENTARIO.NEXTVAL AS ID_COMENTARIO FROM DUAL`, {});
  const id_comentario = seq[0]?.id_comentario ?? seq[0]?.ID_COMENTARIO;

  await executeQuery(
    `INSERT INTO BSTAB_COMENTARIO (ID_COMENTARIO, ID_COMUNICADO, ID_USUARIO, NOME_USUARIO, FOTO_USUARIO, TEXTO, DATA_COMENTARIO, ATIVO, ID_COMENTARIO_PAI)
     VALUES (:id_comentario, :id_comunicado, :id_usuario, :nome_usuario, :foto_usuario, :texto, SYSDATE, 1, :id_comentario_pai)`,
    { id_comentario, id_comunicado, id_usuario, nome_usuario: nome_usuario || null, foto_usuario: foto_usuario || null, texto, id_comentario_pai: id_comentario_pai || null }, true
  );
  return { id_comentario };
}

export async function excluirComentarioModel({ id_comentario, id_usuario }) {
  // Só permite excluir se o comentário pertence ao usuário
  await executeQuery(
    `UPDATE BSTAB_COMENTARIO SET ATIVO = 0 WHERE ID_COMENTARIO = :id_comentario AND ID_USUARIO = :id_usuario`,
    { id_comentario, id_usuario }, true
  );
  // Remove também todas as respostas filhas (independente do autor)
  await executeQuery(
    `UPDATE BSTAB_COMENTARIO SET ATIVO = 0 WHERE ID_COMENTARIO_PAI = :id_comentario`,
    { id_comentario }, true
  );
  return { success: true };
}

export async function listarComentariosModel({ id_comunicado }) {
  const rows = await executeQuery(
    `SELECT ID_COMENTARIO, ID_USUARIO, NOME_USUARIO, FOTO_USUARIO, TEXTO, DATA_COMENTARIO, ID_COMENTARIO_PAI
     FROM BSTAB_COMENTARIO
     WHERE ID_COMUNICADO = :id_comunicado AND ATIVO = 1
     ORDER BY DATA_COMENTARIO ASC`,
    { id_comunicado }
  );
  const todos = rows.map(r => ({
    id_comentario:     r.id_comentario     ?? r.ID_COMENTARIO,
    id_usuario:        r.id_usuario        ?? r.ID_USUARIO,
    nome_usuario:      r.nome_usuario      ?? r.NOME_USUARIO,
    foto_usuario:      r.foto_usuario      ?? r.FOTO_USUARIO,
    texto:             r.texto             ?? r.TEXTO,
    data_comentario:   r.data_comentario   ?? r.DATA_COMENTARIO,
    id_comentario_pai: r.id_comentario_pai != null ? (r.id_comentario_pai ?? r.ID_COMENTARIO_PAI) : null,
    respostas: [],
  }));
  // Montar árvore: raiz = sem pai, filhos aninhados
  const mapa = Object.fromEntries(todos.map(c => [c.id_comentario, c]));
  const raiz = [];
  for (const c of todos) {
    if (c.id_comentario_pai && mapa[c.id_comentario_pai]) {
      mapa[c.id_comentario_pai].respostas.push(c);
    } else {
      raiz.push(c);
    }
  }
  return raiz;
}
