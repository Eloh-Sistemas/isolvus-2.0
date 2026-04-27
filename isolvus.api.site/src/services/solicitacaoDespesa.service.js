import { AppError } from '../errors/AppError.js';

import { addRateioModel, alterarSolicitaDespesaModel, 
         atualizarDadosBancariosImportacaoModel,
         autorizacaoDePagamentoModel, 
         cadastrarSolicitaDespesaModal, 
         conformidadeSolicitacaoModel, 
         conformidadeSolicitacoesLoteModel,
         direcionarSolicitacoesLoteModel,
         consultarRateioModel, 
         consultarSolicitacaoCabModel, 
         consultarSolicitacaoItemModel, 
         consultarPreAnaliseAgrupadoModel,
         consultarDespesasVinculadasLeituraModel,
         ordenarSolicitacoesLoteModel,
         controleDeDespesaModel, 
         deletePreAnaliseModel,
         deleteRateioModel, 
         direcionarSolicitacaoModel, 
         listarModel, 
         ordenarSolicitacaoModel, 
         preAnaliseModel, 
         processarDespesasImportacaoModel,
         proximoidsolicitadespesaModal, 
         recalcularRaterioModel, 
         validarSolicitacaoOrcamentoModel,
         inserirHistoricoSolicitacaoModel,
         consultarHistoricoSolicitacaoModel } from '../models/solicitacaoDeDespesaModel.js';

import { baixaValeModel } from '../models/valeModal.js';



export async function proximoidsolicitadespesaService(dto) {

  const dados = await proximoidsolicitadespesaModal(dto);

  if (!dados){
    throw new AppError('Erro ao consultar proximo id de despesa', 500);
  }

  return dados; 
}

export async function cadastrarSolicitaDespesaService(dto) {

  const dados = await cadastrarSolicitaDespesaModal(dto);

  if (!dados){
    throw new AppError('Erro ao cadastrar solicitação de despesa', 500);
  }

  inserirHistoricoSolicitacaoModel({
    numsolicitacao:   dto.numsolicitacao,
    id_grupo_empresa: dto.id_grupo_empresa,
    etapa:            'SOLICITACAO',
    status_antes:     null,
    status_depois:    'A',
    id_usuario:       dto.id_solicitante,
    nome_usuario:     dto.nomesolicitante || null,
    observacao:       null,
  }).catch(() => {});

  return dados; 
}

export async function direcionarSolicitacaoService(dto) {

  const dados = await direcionarSolicitacaoModel(dto);  

  if (!dados){
    throw new AppError('Erro ao direcionar solicitação de despesa', 500);
  }

  inserirHistoricoSolicitacaoModel({
    numsolicitacao:   dto.numsolicitacao,
    id_grupo_empresa: dto.id_grupo_empresa || 0,
    etapa:            'CONTROLADORIA',
    status_antes:     'A',
    status_depois:    'EA',
    id_usuario:       dto.id_user_controladoria,
    nome_usuario:     null,
    observacao:       null,
  }).catch(() => {});

  return dados; 
}

export async function direcionarSolicitacoesLoteService(dto) {

  const dados = await direcionarSolicitacoesLoteModel(dto);

  if (!dados) {
    throw new AppError('Erro ao direcionar solicitações do lote', 500);
  }

  return dados;
}


export async function preAnaliseService(dto) {

  const dados = await preAnaliseModel(dto);

  if (!dados){
    throw new AppError('Erro ao realizar pré análise da solicitação de despesa', 500);
  }

  return dados;
}

export async function processarDespesasImportacaoService(dto) {

  const dados = await processarDespesasImportacaoModel(dto);

  if (!dados){
    throw new AppError('Erro ao processar despesas importadas', 500);
  }

  return dados;
}

export async function atualizarDadosBancariosImportacaoService(dto) {

  const dados = await atualizarDadosBancariosImportacaoModel(dto);

  if (!dados) {
    throw new AppError('Erro ao atualizar os dados bancários do funcionário pela remessa.', 500);
  }

  return dados;
}

export async function alterarSolicitaDespesaService(dto) {

  const dados = await alterarSolicitaDespesaModel(dto);

  if (!dados){
    throw new AppError('Erro ao alterar solicitação de despesa', 500);
  }

  return dados; 
}


export async function listarSolicitacoesService(dto) {

  const dados = await listarModel(dto);

  if (!dados){
    throw new AppError('Erro na listagem das solicitação', 500);
  }

  return dados; 
}

export async function consultaSolicitacaoCabService(dto){

  const dados = await consultarSolicitacaoCabModel(dto);

  if (!dados || dados.length === 0){
    throw new AppError('Solicitação não encontrada', 404);
  }

  return dados; 
}

export async function consultarSolicitacaoItemService(dto){

  const dados = await consultarSolicitacaoItemModel(dto);

  if (!dados){
    throw new AppError('Erro na listagem dos itens', 500);
  }

  return dados;

}

export async function validarSolicitacaoOrcamentoService(dto){

  const dados = await validarSolicitacaoOrcamentoModel(dto);

  if (!dados){
    throw new AppError('Erro consultar orcamento por solicitação', 500);
  }

  return dados;

}


export async function ordenarSolicitacaoService(dto) {

  const dados = await ordenarSolicitacaoModel(dto);

  if (!dados){
    throw new AppError('Erro ao ordenar solicitação', 500);
  }

  inserirHistoricoSolicitacaoModel({
    numsolicitacao:   dto.numsolicitacao,
    id_grupo_empresa: dto.id_grupo_empresa || 0,
    etapa:            'ORDENADOR',
    status_antes:     'EA',
    status_depois:    dto.status,
    id_usuario:       dto.id_ordenador,
    nome_usuario:     null,
    observacao:       dto.obs_ordenador || null,
  }).catch(() => {});

  return dados;
  
}

export async function ordenarSolicitacoesLoteService(dto) {

  const dados = await ordenarSolicitacoesLoteModel(dto);

  if (!dados) {
    throw new AppError('Erro ao ordenar solicitações do lote', 500);
  }

  return dados;
}

export async function addRateioService(dto) {
  
  const dados = await addRateioModel(dto);
  return dados;

}


export async function recalcularRaterioService(dto) {
  
  const dados = await recalcularRaterioModel(dto);
  return dados;

}

export async function consultarRateioService(dto) {
  
  const dados = await consultarRateioModel(dto);
  return dados;

}

export async function deleteRateioService(dto) {
 
  const dados = await deleteRateioModel(dto);
  return dados;

}

export async function deletePreAnaliseService(dto) {
 
  const dados = await deletePreAnaliseModel(dto);

  if (!dados){
    throw new AppError('Erro ao excluir registros da pré-análise', 500);
  }

  return dados;

}


export async function conformidadeSolicitacaoService(dto) {  

  if (dto.valesSelecionados?.length > 0) {
    await baixaValeModel(
      dto.valesSelecionados,
      dto.id_user_financeiro,
      dto.id_grupo_empresa
    );
  }
  
  const dados = await conformidadeSolicitacaoModel(dto);

  inserirHistoricoSolicitacaoModel({
    numsolicitacao:   dto.numsolicitacao,
    id_grupo_empresa: dto.id_grupo_empresa || 0,
    etapa:            'FINANCEIRO',
    status_antes:     'P',
    status_depois:    dto.status || 'F',
    id_usuario:       dto.id_user_financeiro,
    nome_usuario:     null,
    observacao:       dto.obs_financeiro || null,
  }).catch(() => {});

  return dados;
}

export async function conformidadeSolicitacoesLoteService(dto) {

  const dados = await conformidadeSolicitacoesLoteModel(dto);

  if (!dados) {
    throw new AppError('Erro ao realizar a conformidade financeira do lote', 500);
  }

  return dados;
}

export async function controleDeDespesaService(dto) {

  const dados = await controleDeDespesaModel(dto);
  return dados;

}

export async function autorizacaoDePagamentoService(dto) {

  const dados = await autorizacaoDePagamentoModel(dto);
  return dados;
  
}

export async function consultarPreAnaliseAgrupadoService(dto) {

  const dados = await consultarPreAnaliseAgrupadoModel(dto);

  if (!dados){
    throw new AppError('Erro ao consultar pré-análise agrupada', 500);
  }

  return dados;
  
}

export async function consultarDespesasVinculadasLeituraService(dto) {

  const dados = await consultarDespesasVinculadasLeituraModel(dto);

  if (!dados){
    throw new AppError('Erro ao consultar as despesas vinculadas à leitura', 500);
  }

  return dados;
  
}

export async function consultarHistoricoSolicitacaoService(dto) {
  const dados = await consultarHistoricoSolicitacaoModel(dto.pnumsolicitacao);

  // Garantir que observacao seja sempre texto legível
  // Registros antigos foram gravados como hex via Buffer.from() — converter de volta
  const decodeObs = (obs) => {
    if (!obs || typeof obs !== 'string') return obs;
    if (/^[0-9a-fA-F]+$/.test(obs) && obs.length % 2 === 0) {
      try { return Buffer.from(obs, 'hex').toString('utf-8'); } catch { return obs; }
    }
    return obs;
  };

  return dados.map(row => ({ ...row, observacao: decodeObs(row.observacao) }));
}
