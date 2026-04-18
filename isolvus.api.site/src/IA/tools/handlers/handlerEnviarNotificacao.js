import { executeQuery } from '../../../config/database.js';
import { notificacaoEnviarService } from '../../../services/notificacao.service.js';
import { ultimaTabelaPorUsuario } from './handlerConsultarDados.js';

/**
 * Handler para a tool "enviar_notificacao".
 * Busca o destinatário pelo nome no banco e envia a notificação interna.
 * Suporta anexo de dados da última tabela gerada pela Eloh.
 */
export async function handlerEnviarNotificacao(pergunta, args, contextoConversa, metadata) {
  const { destinatario_nome, titulo, mensagem, incluir_dados_tabela } = args;
  const { id_usuario, id_grupo_empresa } = metadata;

  const usuarios = await executeQuery(
    `SELECT ID_USUARIO, NOME FROM BSTAB_USUSARIOS
     WHERE UPPER(NOME) LIKE UPPER(:nome)
     AND ID_GRUPO_EMPRESA = :id_grupo_empresa
     AND ROWNUM <= 5`,
    { nome: `%${destinatario_nome}%`, id_grupo_empresa }
  );

  if (!usuarios || usuarios.length === 0) {
    return {
      respostaAnalista: `Não encontrei nenhum usuário com o nome **"${destinatario_nome}"** no sistema. Verifique o nome e tente novamente.`,
    };
  }

  if (usuarios.length > 1) {
    const nomes = usuarios.map((u) => u.nome).join('\n- ');
    return {
      respostaAnalista: `Encontrei mais de um usuário com esse nome:\n- ${nomes}\n\nPode ser mais específico sobre quem deseja notificar?`,
    };
  }

  const destinatario = usuarios[0];

  // Verifica se deve incluir os dados da última tabela como anexo
  let dadosTabela = null;
  if (incluir_dados_tabela === 'S') {
    const ultimaTabela = ultimaTabelaPorUsuario.get(id_usuario);
    if (ultimaTabela && ultimaTabela.length > 0) {
      dadosTabela = JSON.stringify(ultimaTabela);
    }
  }

  await notificacaoEnviarService([{
    titulo,
    mensagem,
    id_usuario: destinatario.id_usuario,
    id_remetente: id_usuario,
    dados_tabela: dadosTabela,
  }]);

  const anexoInfo = dadosTabela
    ? `\n\n📎 Planilha com **${JSON.parse(dadosTabela).length} registros** anexada.`
    : '';

  return {
    respostaAnalista: `Notificação enviada com sucesso para **${destinatario.nome}**!\n\n**${titulo}**\n${mensagem}${anexoInfo}`,
    notificacao: {
      destinatario: destinatario.nome,
      titulo,
      mensagem,
      com_anexo: !!dadosTabela,
    },
  };
}
