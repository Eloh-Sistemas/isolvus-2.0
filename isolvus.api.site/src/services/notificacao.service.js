import { consultarNotificacoesModel, consultarTokensPushAtivosModel, notificacaoEnviarModel, notificacaoLidoModel, registrarTokenPushModel } from "../models/notificacaoModel.js";
import { AppError } from "../errors/AppError.js";

function normalizarListaNotificacoes(dto) {
  if (Array.isArray(dto)) return dto;
  if (dto && typeof dto === 'object') return [dto];
  return [];
}

async function enviarPushExpo(notificacoes = []) {
  const idsUsuarios = notificacoes
    .map((n) => Number(n?.id_usuario))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!idsUsuarios.length) return;

  const tokens = await consultarTokensPushAtivosModel(idsUsuarios);
  if (!Array.isArray(tokens) || !tokens.length) return;

  const mensagens = [];

  for (const n of notificacoes) {
    const idUsuario = Number(n?.id_usuario);
    if (!Number.isFinite(idUsuario) || idUsuario <= 0) continue;

    const tokensUsuario = tokens
      .filter((t) => Number(t.id_usuario) === idUsuario)
      .map((t) => String(t.expo_token || ''))
      .filter((token) => token.startsWith('ExponentPushToken['));

    for (const to of tokensUsuario) {
      mensagens.push({
        to,
        title: String(n?.titulo || 'Nova notificacao'),
        body: String(n?.mensagem || 'Voce recebeu uma nova notificacao.'),
        sound: 'default',
        data: {
          id_usuario: idUsuario,
        },
      });
    }
  }

  if (!mensagens.length) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mensagens),
    });
  } catch {
    // Push e complementar; erro nao impede o fluxo principal.
  }
}

export async function consultarNotificacoesService(dto) {

  const dados = await consultarNotificacoesModel(dto);

  if (!dados){
    throw new AppError('Erro na consultar notificações', 500);
  }

  return dados; 
}

export async function notificacaoLidoService(dto) {

  const dados = await notificacaoLidoModel(dto);

  if (!dados){
    throw new AppError('Erro a adiconar como lido a notificações', 500);
  }

  return dados; 
}

export async function notificacaoEnviarService(dto) {

  const notificacoes = normalizarListaNotificacoes(dto);
  const dados = await notificacaoEnviarModel(notificacoes);

  if (!dados){
    throw new AppError('Erro na enviar notificações', 500);
  }

  await enviarPushExpo(notificacoes);

  return dados; 
}

export async function notificacaoRegistrarTokenService(dto) {
  const dados = await registrarTokenPushModel(dto);

  if (!dados) {
    throw new AppError('Erro ao registrar token de notificações.', 500);
  }

  return dados;
}