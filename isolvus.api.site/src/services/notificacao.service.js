import { consultarNotificacoesModel, notificacaoEnviarModel, notificacaoLidoModel } from "../models/notificacaoModel.js";

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

  const dados = await notificacaoEnviarModel(dto);

  if (!dados){
    throw new AppError('Erro na enviar notificações', 500);
  }

  return dados; 
}