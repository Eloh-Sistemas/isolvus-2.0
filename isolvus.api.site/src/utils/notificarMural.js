import { executeQuery } from '../config/database.js';
import { notificacaoEnviarModel } from '../models/notificacaoModel.js';

const LABEL_REACAO = {
  like:    '👍 curtiu',
  dislike: '👎 não curtiu',
  love:    '❤️ amou',
  haha:    '😂 achou engraçado',
  wow:     '😮 ficou surpreso com',
  sad:     '😢 ficou triste com',
  angry:   '😡 ficou irritado com',
};

/**
 * Busca autor e título do comunicado.
 */
async function buscarComunicado(id_comunicado) {
  const rows = await executeQuery(
    `SELECT ID_USUARIO_AUTOR, NOME_AUTOR, TITULO FROM BSTAB_COMUNICADOS WHERE ID_COMUNICADO = :id_comunicado`,
    { id_comunicado }
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id_usuario_autor: r.id_usuario_autor ?? r.ID_USUARIO_AUTOR,
    nome_autor:       r.nome_autor       ?? r.NOME_AUTOR,
    titulo:           r.titulo           ?? r.TITULO,
  };
}

/**
 * Busca autor de um comentário.
 */
async function buscarAutorComentario(id_comentario) {
  const rows = await executeQuery(
    `SELECT ID_USUARIO, NOME_USUARIO FROM BSTAB_COMENTARIO WHERE ID_COMENTARIO = :id_comentario`,
    { id_comentario }
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id_usuario:   r.id_usuario   ?? r.ID_USUARIO,
    nome_usuario: r.nome_usuario ?? r.NOME_USUARIO,
  };
}

/**
 * Notifica quando alguém reage a um comunicado.
 */
export async function notificarReacao({ id_comunicado, id_usuario_reator, nome_reator, tipo, acao }) {
  try {
    if (acao === 'removido') return; // Não notifica ao remover reação
    const comunicado = await buscarComunicado(id_comunicado);
    if (!comunicado) return;
    if (comunicado.id_usuario_autor === id_usuario_reator) return; // Não notifica a si mesmo

    const label = LABEL_REACAO[tipo] || 'reagiu a';
    await notificacaoEnviarModel([{
      titulo:      'Nova reação no mural',
      mensagem:    `${nome_reator} ${label} sua publicação "${comunicado.titulo}".`,
      id_usuario:  comunicado.id_usuario_autor,
      id_remetente: id_usuario_reator,
      dados_tabela: JSON.stringify({ link: `/Home?post=${id_comunicado}` }),
    }]);
  } catch {}
}

/**
 * Notifica quando alguém comenta ou responde em um comunicado.
 */
export async function notificarComentario({ id_comunicado, id_usuario_comentador, nome_comentador, texto, id_comentario_pai }) {
  try {
    const comunicado = await buscarComunicado(id_comunicado);
    if (!comunicado) return;

    const preview = texto.length > 60 ? texto.slice(0, 60) + '…' : texto;
    const notificacoes = [];
    const jaNotificados = new Set();

    const linkDados = JSON.stringify({ link: `/Home?post=${id_comunicado}` });
    if (id_comentario_pai) {
      // É uma resposta — notifica autor do comentário pai
      const autorPai = await buscarAutorComentario(id_comentario_pai);
      if (autorPai && autorPai.id_usuario !== id_usuario_comentador) {
        notificacoes.push({
          titulo:      'Nova resposta no mural',
          mensagem:    `${nome_comentador} respondeu ao seu comentário em "${comunicado.titulo}": "${preview}"`,
          id_usuario:  autorPai.id_usuario,
          id_remetente: id_usuario_comentador,
          dados_tabela: linkDados,
        });
        jaNotificados.add(autorPai.id_usuario);
      }
      // Também notifica o autor do post (se diferente do comentador e do autor do pai)
      if (
        comunicado.id_usuario_autor !== id_usuario_comentador &&
        !jaNotificados.has(comunicado.id_usuario_autor)
      ) {
        notificacoes.push({
          titulo:      'Nova resposta no mural',
          mensagem:    `${nome_comentador} respondeu a um comentário na sua publicação "${comunicado.titulo}": "${preview}"`,
          id_usuario:  comunicado.id_usuario_autor,
          id_remetente: id_usuario_comentador,
          dados_tabela: linkDados,
        });
      }
    } else {
      // Comentário direto — notifica autor do post
      if (comunicado.id_usuario_autor !== id_usuario_comentador) {
        notificacoes.push({
          titulo:      'Novo comentário no mural',
          mensagem:    `${nome_comentador} comentou na sua publicação "${comunicado.titulo}": "${preview}"`,
          id_usuario:  comunicado.id_usuario_autor,
          id_remetente: id_usuario_comentador,
          dados_tabela: linkDados,
        });
      }
    }

    if (notificacoes.length > 0) await notificacaoEnviarModel(notificacoes);
  } catch {}
}
