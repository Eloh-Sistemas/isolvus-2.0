import { executeQuery, getConnection } from "../config/database.js";
import axios from "axios";
import {authApiClient} from '../config/authApiClient.js';
import OracleDB from "oracledb";
import moment from "moment";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { AppError } from "../errors/AppError.js";
import { parseDateBR } from '../utils/date.js';
import { notificacaoEnviarModel } from "./notificacaoModel.js";
import { excluirArquivosPorIdRelacional } from "./uploadArquivosModal.js";

const ID_ROTINA_IMPORTACAO_ANEXOS = '1030.3';
const ID_ROTINA_IMPORTACAO_REMESSA = '1030.2';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function somenteDigitos(valor = '') {
  return String(valor || '').replace(/\D/g, '');
}

function normalizarDocumento(valor = '', tamanho = null) {
  const digits = somenteDigitos(valor);

  if (!tamanho) {
    return digits;
  }

  if (!digits) {
    return '';
  }

  return digits.length > tamanho ? digits.slice(-tamanho) : digits.padStart(tamanho, '0');
}

function valorParaCentavos(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }

  const texto = String(valor).trim();
  const normalizado = texto.includes(',')
    ? texto.replace(/\./g, '').replace(',', '.')
    : texto;
  const numero = Number(normalizado);

  if (Number.isNaN(numero)) {
    return null;
  }

  return Math.round(numero * 100);
}

function formatarValorCentavosRemessa(valorCentavos) {
  const valor = Number(valorCentavos || 0) / 100;
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizarNumeroBancario(valor = '') {
  const digits = somenteDigitos(valor);

  if (!digits) {
    return '';
  }

  return digits.replace(/^0+(?=\d)/, '');
}

function normalizarCodigoBanco(valor = null) {
  const digits = somenteDigitos(valor);

  if (!digits) {
    return null;
  }

  return Number.parseInt(digits, 10);
}

function normalizarStatusSolicitacao(status = '') {
  return String(status || '').trim().toUpperCase();
}

async function obterSituacaoSolicitacao(numsolicitacao) {
  const result = await executeQuery(
    `SELECT C.NUMSOLICITACAO, C.STATUS, C.ID_ROTINA_INTEGRACAO
       FROM BSTAB_SOLICITADESPESAC C
      WHERE C.NUMSOLICITACAO = :numsolicitacao`,
    { numsolicitacao }
  );

  const registro = result?.[0];

  if (!registro) {
    throw new AppError('Solicitação não encontrada.', 404);
  }

  return {
    numsolicitacao: Number(registro.numsolicitacao || registro.NUMSOLICITACAO || numsolicitacao),
    status: normalizarStatusSolicitacao(registro.status || registro.STATUS),
    idRotinaIntegracao: Number(registro.id_rotina_integracao || registro.ID_ROTINA_INTEGRACAO || 0)
  };
}

async function validarSolicitacaoParaAcao(numsolicitacao, acao, statusesPermitidos = [], mensagemStatusInvalido = '') {
  const situacao = await obterSituacaoSolicitacao(numsolicitacao);

  if (situacao.status === 'I') {
    throw new AppError(`A solicitação ${situacao.numsolicitacao} já foi integrada com o cliente e não pode mais ser alterada ou excluída.`, 409);
  }

  if (situacao.status === 'F' && acao !== 'conformidade') {
    throw new AppError(`A solicitação ${situacao.numsolicitacao} já foi enviada pelo financeiro/integrada com o cliente e não pode mais ser alterada ou excluída.`, 409);
  }

  if (Array.isArray(statusesPermitidos) && statusesPermitidos.length > 0 && !statusesPermitidos.includes(situacao.status)) {
    throw new AppError(
      mensagemStatusInvalido || `A solicitação ${situacao.numsolicitacao} não pode receber a ação "${acao}" no status atual (${situacao.status || 'SEM STATUS'}).`,
      409
    );
  }

  return situacao;
}

function validarSituacoesLoteParaAcao(solicitacoes = [], acao, statusesPermitidos = []) {
  const situacoes = solicitacoes.map((item) => ({
    numsolicitacao: Number(item?.NUMSOLICITACAO || item?.numsolicitacao || 0),
    status: normalizarStatusSolicitacao(item?.STATUS || item?.status)
  }));

  if (situacoes.some((item) => item.status === 'I')) {
    throw new AppError('Este lote já foi integrado com o cliente e não pode mais ser alterado ou excluído.', 409);
  }

  if (acao !== 'conformidade' && situacoes.some((item) => item.status === 'F')) {
    throw new AppError('Este lote já foi enviado pelo financeiro/integrado com o cliente e não pode mais ser alterado ou excluído.', 409);
  }

  if (acao !== 'conformidade' && situacoes.some((item) => item.status === 'L')) {
    throw new AppError('Este lote possui solicitação(ões) pendentes do financeiro e só pode ser tratado na tela de conformidade.', 409);
  }

  if (Array.isArray(statusesPermitidos) && statusesPermitidos.length > 0 && situacoes.some((item) => !statusesPermitidos.includes(item.status))) {
    const listaStatus = [...new Set(situacoes.map((item) => item.status).filter(Boolean))].join(', ') || 'SEM STATUS';
    throw new AppError(`O lote não pode receber a ação "${acao}" porque possui solicitação(ões) no status ${listaStatus}.`, 409);
  }

  return situacoes;
}

function formatarNumeroComDigito(base = '', digito = '') {
  const numeroBase = normalizarNumeroBancario(base);
  const numeroDigito = somenteDigitos(digito);

  if (!numeroBase) {
    return null;
  }

  return numeroDigito ? `${numeroBase}-${numeroDigito}` : numeroBase;
}

function compararValorBancario(cadastro = '', ...opcoesRemessa) {
  const cadastroNormalizado = normalizarNumeroBancario(cadastro);

  if (!cadastroNormalizado) {
    return false;
  }

  return opcoesRemessa.some((valor) => {
    const remessaNormalizada = normalizarNumeroBancario(valor);
    return remessaNormalizada && remessaNormalizada === cadastroNormalizado;
  });
}

function obterDivergenciasDadosBancarios(registro = {}, pagamento = null) {
  if (!pagamento) {
    return {
      banco: false,
      agencia: false,
      conta: false,
      operacao: false
    };
  }

  const bancoRemessa = normalizarCodigoBanco(pagamento.idBanco);
  const agenciaRemessa = normalizarNumeroBancario(pagamento.agencia);
  const agenciaComDigito = normalizarNumeroBancario(`${pagamento.agencia || ''}${pagamento.agenciaDigito || ''}`);
  const contaRemessa = normalizarNumeroBancario(pagamento.conta);
  const contaComDigito = normalizarNumeroBancario(`${pagamento.conta || ''}${pagamento.contaDigito || ''}`);
  const operacaoRemessa = normalizarNumeroBancario(pagamento.operacao);

  return {
    banco: bancoRemessa !== null && Number(registro.ID_BANCO || 0) !== bancoRemessa,
    agencia: !!agenciaRemessa && !compararValorBancario(registro.AGENCIA, agenciaRemessa, agenciaComDigito),
    conta: !!contaRemessa && !compararValorBancario(registro.CONTABANCARIA, contaRemessa, contaComDigito),
    operacao: !!operacaoRemessa && !compararValorBancario(registro.OPERACAO, operacaoRemessa)
  };
}

function parseRemessaPagamentoBb(conteudo = '') {
  const linhas = String(conteudo || '')
    .split(/\r?\n/)
    .map((linha) => linha.replace(/\r/g, ''))
    .filter((linha) => linha.trim().length > 0);

  let cnpjEmpresa = '';
  let nomeEmpresa = '';
  let linhaCnpjEmpresa = null;
  let codigoFormaPagamentoLote = null;
  let linhaFormaPagamentoLote = null;
  let segmentoAAtual = null;
  const pagamentos = [];

  for (const [index, linhaOriginal] of linhas.entries()) {
    const numeroLinha = index + 1;
    const linha = linhaOriginal.padEnd(240, ' ');
    const tipoRegistro = linha.substring(7, 8);
    const segmento = linha.substring(13, 14);

    if (tipoRegistro === '0') {
      const tipoInscricaoEmpresa = linha.substring(17, 18);
      const numeroInscricaoEmpresa = somenteDigitos(linha.substring(18, 32));
      cnpjEmpresa = tipoInscricaoEmpresa === '2'
        ? normalizarDocumento(numeroInscricaoEmpresa, 14)
        : normalizarDocumento(numeroInscricaoEmpresa, 11);
      nomeEmpresa = linha.substring(72, 102).trim() || linha.substring(33, 63).trim() || nomeEmpresa;
      linhaCnpjEmpresa = numeroLinha;
      continue;
    }

    if (tipoRegistro === '1') {
      // CNAB240 BB: forma de lancamento do lote fica no cabecalho do lote (posicoes 12-13).
      const formaPagamento = normalizarNumeroBancario(linha.substring(11, 13));
      codigoFormaPagamentoLote = formaPagamento || null;
      linhaFormaPagamentoLote = numeroLinha;
      continue;
    }

    if (tipoRegistro === '3' && segmento === 'A') {
      const codigoBancoFavorecido = normalizarCodigoBanco(linha.substring(20, 23));
      const agenciaFavorecido = normalizarNumeroBancario(linha.substring(23, 28));
      const agenciaDvFavorecido = somenteDigitos(linha.substring(28, 29));
      const contaFavorecido = normalizarNumeroBancario(linha.substring(29, 41));
      const contaDvFavorecido = somenteDigitos(linha.substring(41, 42));
      const operacaoFavorecido = normalizarNumeroBancario(linha.substring(17, 20));
      const codigoFormaPagamentoBb = codigoFormaPagamentoLote || normalizarNumeroBancario(linha.substring(17, 20));

      segmentoAAtual = {
        valorCentavos: Number(somenteDigitos(linha.substring(119, 134)) || 0),
        linhaValor: numeroLinha,
        nomeFavorecido: linha.substring(43, 73).trim() || null,
        idBanco: codigoBancoFavorecido,
        agencia: agenciaFavorecido,
        agenciaDigito: agenciaDvFavorecido,
        conta: contaFavorecido,
        contaDigito: contaDvFavorecido,
        operacao: operacaoFavorecido && operacaoFavorecido !== '000' ? operacaoFavorecido : null,
        idBancoDoBrasilFormaPagamento: codigoFormaPagamentoBb || null,
        agenciaFormatada: formatarNumeroComDigito(agenciaFavorecido, agenciaDvFavorecido),
        contaFormatada: formatarNumeroComDigito(contaFavorecido, contaDvFavorecido)
      };
      continue;
    }

    if (tipoRegistro === '3' && segmento === 'B') {
      const blocoInscricaoFavorecido = somenteDigitos(linha.substring(17, 35));
      const tipoInscricaoFavorecido = ['1', '2'].includes(blocoInscricaoFavorecido.charAt(0))
        ? blocoInscricaoFavorecido.charAt(0)
        : linha.substring(17, 18);
      const numeroInscricaoFavorecido = blocoInscricaoFavorecido.length > 1
        ? blocoInscricaoFavorecido.slice(1)
        : somenteDigitos(linha.substring(18, 35));
      const documentoFavorecido = tipoInscricaoFavorecido === '2'
        ? normalizarDocumento(numeroInscricaoFavorecido, 14)
        : normalizarDocumento(numeroInscricaoFavorecido, 11);

      if (segmentoAAtual && documentoFavorecido) {
        pagamentos.push({
          cnpjEmpresa,
          nomeEmpresa: nomeEmpresa || null,
          documentoFavorecido,
          nomeFavorecido: segmentoAAtual.nomeFavorecido ?? null,
          valorCentavos: segmentoAAtual.valorCentavos,
          idBanco: segmentoAAtual.idBanco ?? null,
          agencia: segmentoAAtual.agencia ?? null,
          agenciaDigito: segmentoAAtual.agenciaDigito ?? null,
          agenciaFormatada: segmentoAAtual.agenciaFormatada ?? null,
          conta: segmentoAAtual.conta ?? null,
          contaDigito: segmentoAAtual.contaDigito ?? null,
          contaFormatada: segmentoAAtual.contaFormatada ?? null,
          operacao: segmentoAAtual.operacao ?? null,
          idBancoDoBrasilFormaPagamento: segmentoAAtual.idBancoDoBrasilFormaPagamento ?? null,
          linhaCnpj: linhaCnpjEmpresa,
          linhaCpf: numeroLinha,
          linhaValor: segmentoAAtual.linhaValor ?? null,
          linhaFormaPagamento: linhaFormaPagamentoLote ?? segmentoAAtual.linhaValor ?? null,
          linhaBanco: segmentoAAtual.linhaValor ?? null,
          linhaAgencia: segmentoAAtual.linhaValor ?? null,
          linhaConta: segmentoAAtual.linhaValor ?? null,
          linhaOperacao: segmentoAAtual.linhaValor ?? null
        });
      }

      segmentoAAtual = null;
    }
  }

  return {
    encontrada: linhas.length > 0,
    cnpjEmpresa,
    nomeEmpresa,
    linhaCnpjEmpresa,
    pagamentos
  };
}

async function obterDadosRemessaPorLeitura(connection, idleitura) {
  const result = await connection.execute(
    `SELECT FILE_PATH
       FROM BSTAB_ARQUIVOS
      WHERE ID_ROTINA = :id_rotina
        AND ID_RELACIONAL = :idleitura
      ORDER BY ID_ARQUIVO DESC`,
    {
      id_rotina: ID_ROTINA_IMPORTACAO_REMESSA,
      idleitura: String(idleitura)
    },
    { outFormat: OracleDB.OUT_FORMAT_OBJECT }
  );

  const caminhoRelativo = result.rows?.[0]?.FILE_PATH;

  if (!caminhoRelativo) {
    return null;
  }

  const caminhoNormalizado = String(caminhoRelativo)
    .replace(/^[/\\]+/, '')
    .replace(/\//g, path.sep);
  const caminhoAbsoluto = path.resolve(__dirname, '..', caminhoNormalizado);

  try {
    const conteudo = await fs.readFile(caminhoAbsoluto, 'utf8');
    return parseRemessaPagamentoBb(conteudo);
  } catch (error) {
    console.warn(`Não foi possível ler o arquivo de remessa da leitura ${idleitura}:`, error?.message || error);
    return null;
  }
}

async function obterMapaFormaPagamentoPorCodigoBancoBrasil(connection, remessa = null) {
  const pagamentos = Array.isArray(remessa?.pagamentos) ? remessa.pagamentos : [];
  const codigos = [...new Set(
    pagamentos
      .map((pagamento) => normalizarNumeroBancario(pagamento?.idBancoDoBrasilFormaPagamento ?? pagamento?.operacao))
      .filter(Boolean)
  )];

  if (codigos.length === 0) {
    return new Map();
  }

  const binds = {};
  const placeholders = codigos.map((codigo, index) => {
    const chave = `codigo${index}`;
    binds[chave] = codigo;
    return `:${chave}`;
  }).join(', ');

  const query = `
    SELECT
      ID_FORMADEPAGAMENTO,
      FORMADEPAGAMENTO,
      ID_BANCODOBRASIL
    FROM BSTAB_FORMADEPAGAMENTO
    WHERE NVL(
      NULLIF(
        LTRIM(REGEXP_REPLACE(TRIM(TO_CHAR(ID_BANCODOBRASIL)), '[^0-9]', ''), '0'),
        ''
      ),
      '0'
    ) IN (${placeholders})
  `;

  const result = await connection.execute(query, binds, { outFormat: OracleDB.OUT_FORMAT_OBJECT });
  const mapa = new Map();

  for (const row of result.rows || []) {
    const codigo = normalizarNumeroBancario(row.ID_BANCODOBRASIL);
    const idFormaPagamento = Number(row.ID_FORMADEPAGAMENTO || 0);
    const descricaoFormaPagamento = String(row.FORMADEPAGAMENTO || '').trim() || null;

    if (codigo && idFormaPagamento > 0) {
      mapa.set(codigo, {
        idFormaPagamento,
        descricaoFormaPagamento
      });
    }
  }

  return mapa;
}

function aplicarValidacaoRemessa(registros = [], remessa = null, formaPagamentoPorCodigoBb = new Map()) {
  const cnpjEmpresa = normalizarDocumento(remessa?.cnpjEmpresa, 14);
  const nomeEmpresaRemessa = String(remessa?.nomeEmpresa || '').trim();
  const linhaCnpjEmpresa = Number(remessa?.linhaCnpjEmpresa || 0) || null;
  const pagamentos = Array.isArray(remessa?.pagamentos) ? remessa.pagamentos : [];
  const possuiRemessaValida = !!(cnpjEmpresa && pagamentos.length > 0);
  const mapaPagamentos = new Map();
  const pagamentosPorDocumento = new Map();
  const alertas = [];

  const obterLinhasPagamento = (pagamento = null) => ({
    cnpj: Number(pagamento?.linhaCnpj || 0) || linhaCnpjEmpresa,
    cpf: Number(pagamento?.linhaCpf || 0) || null,
    valor: Number(pagamento?.linhaValor || 0) || null,
    forma_pagamento: Number(pagamento?.linhaFormaPagamento || 0) || Number(pagamento?.linhaValor || 0) || null,
    banco: Number(pagamento?.linhaBanco || 0) || Number(pagamento?.linhaValor || 0) || null,
    agencia: Number(pagamento?.linhaAgencia || 0) || Number(pagamento?.linhaValor || 0) || null,
    conta: Number(pagamento?.linhaConta || 0) || Number(pagamento?.linhaValor || 0) || null,
    operacao: Number(pagamento?.linhaOperacao || 0) || Number(pagamento?.linhaValor || 0) || null
  });

  const obterFormaPagamentoRemessa = (pagamento = null) => {
    const codigoBancoDoBrasil = normalizarNumeroBancario(pagamento?.idBancoDoBrasilFormaPagamento ?? pagamento?.operacao);

    if (!codigoBancoDoBrasil) {
      return {
        codigoBancoDoBrasil: null,
        idFormaPagamento: null,
        encontrada: false
      };
    }

    const mapeamento = formaPagamentoPorCodigoBb.get(codigoBancoDoBrasil) || null;
    const idFormaPagamento = Number(mapeamento?.idFormaPagamento || 0);
    const descricaoFormaPagamento = mapeamento?.descricaoFormaPagamento || null;

    return {
      codigoBancoDoBrasil,
      idFormaPagamento: idFormaPagamento > 0 ? idFormaPagamento : null,
      descricaoFormaPagamento,
      encontrada: idFormaPagamento > 0
    };
  };

  const criarResultadoRemessa = (registro, status, ok, erro = null, divergencias = {}, linhas = {}, pagamento = null) => {
    const divergenciasBancarias = obterDivergenciasDadosBancarios(registro, pagamento);
    const possuiAtualizacaoDadosBancarios = Object.values(divergenciasBancarias).some(Boolean);
    const formaPagamentoRemessa = obterFormaPagamentoRemessa(pagamento);

    return {
      ...registro,
      ID_FORMADEPAGAMENTO: formaPagamentoRemessa.idFormaPagamento ?? registro.ID_FORMADEPAGAMENTO ?? null,
      FORMADEPAGAMENTO: formaPagamentoRemessa.descricaoFormaPagamento ?? registro.FORMADEPAGAMENTO ?? null,
      REMESSA_STATUS: status,
      REMESSA_OK: ok,
      REMESSA_ERRO: erro,
      REMESSA_CNPJ_EMPRESA: cnpjEmpresa || null,
      REMESSA_ERRO_CNPJ: divergencias.cnpj ? 'S' : 'N',
      REMESSA_ERRO_CPF: divergencias.cpf ? 'S' : 'N',
      REMESSA_ERRO_VALOR: divergencias.valor ? 'S' : 'N',
      REMESSA_ERRO_FORMADEPAGAMENTO: divergencias.formadepagamento ? 'S' : 'N',
      REMESSA_LINHA_CNPJ: linhas.cnpj ?? linhaCnpjEmpresa,
      REMESSA_LINHA_CPF: linhas.cpf ?? null,
      REMESSA_LINHA_VALOR: linhas.valor ?? null,
      REMESSA_LINHA_FORMADEPAGAMENTO: linhas.forma_pagamento ?? null,
      REMESSA_LINHA_BANCO: linhas.banco ?? null,
      REMESSA_LINHA_AGENCIA: linhas.agencia ?? null,
      REMESSA_LINHA_CONTA: linhas.conta ?? null,
      REMESSA_LINHA_OPERACAO: linhas.operacao ?? null,
      REMESSA_FORMADEPAGAMENTO_BB: formaPagamentoRemessa.codigoBancoDoBrasil,
      REMESSA_ID_BANCO: pagamento?.idBanco ?? null,
      REMESSA_AGENCIA: pagamento?.agenciaFormatada ?? formatarNumeroComDigito(pagamento?.agencia, pagamento?.agenciaDigito),
      REMESSA_CONTABANCARIA: pagamento?.contaFormatada ?? formatarNumeroComDigito(pagamento?.conta, pagamento?.contaDigito),
      REMESSA_OPERACAO: pagamento?.operacao ?? null,
      REMESSA_BANCO_DIVERGENTE: divergenciasBancarias.banco ? 'S' : 'N',
      REMESSA_AGENCIA_DIVERGENTE: divergenciasBancarias.agencia ? 'S' : 'N',
      REMESSA_CONTA_DIVERGENTE: divergenciasBancarias.conta ? 'S' : 'N',
      REMESSA_OPERACAO_DIVERGENTE: divergenciasBancarias.operacao ? 'S' : 'N',
      REMESSA_PODE_ATUALIZAR_DADOS_BANCARIOS: possuiAtualizacaoDadosBancarios ? 'S' : 'N'
    };
  };

  pagamentos.forEach((pagamento) => {
    const documentoFavorecido = normalizarDocumento(pagamento.documentoFavorecido, 11);
    const valorCentavos = Number(pagamento.valorCentavos || 0);
    const chave = `${cnpjEmpresa}|${documentoFavorecido}|${valorCentavos}`;
    const pagamentosDaChave = mapaPagamentos.get(chave) || [];
    pagamentosDaChave.push(pagamento);
    mapaPagamentos.set(chave, pagamentosDaChave);

    const chaveDocumento = `${cnpjEmpresa}|${documentoFavorecido}`;
    const pagamentosDoDocumento = pagamentosPorDocumento.get(chaveDocumento) || [];
    pagamentosDoDocumento.push(pagamento);
    pagamentosPorDocumento.set(chaveDocumento, pagamentosDoDocumento);
  });

  if (!possuiRemessaValida) {
    const arquivoRemessaEncontrado = !!remessa?.encontrada;

    return {
      registros: registros.map((registro) => criarResultadoRemessa(
        registro,
        arquivoRemessaEncontrado ? 'NÃO CONFERE' : 'SEM REMESSA',
        arquivoRemessaEncontrado ? 'N' : null,
        arquivoRemessaEncontrado ? 'Não foi possível identificar CPF, CNPJ e valor no arquivo de remessa.' : null
      )),
      alertas
    };
  }

  const registrosPreparados = registros.map((registro, index) => ({
    index,
    registro,
    cnpjDespesa: normalizarDocumento(registro.CNPJ_FILIAL ?? registro.cnpj_filial, 14),
    cpfDespesa: normalizarDocumento(registro.CPF_FUNCIONARIO ?? registro.cpf_funcionario, 11),
    valorCentavos: valorParaCentavos(registro.VALOR ?? registro.valor),
    agrupador: String(
      registro.NUMSOLICITACAO
      ?? registro.numsolicitacao
      ?? registro.ID_ITEM
      ?? registro.id_item
      ?? index
    )
  }));

  const gruposPorSolicitacao = new Map();

  registrosPreparados.forEach((item) => {
    const chaveGrupo = `${item.cnpjDespesa}|${item.cpfDespesa}|${item.agrupador}`;
    const grupoAtual = gruposPorSolicitacao.get(chaveGrupo) || {
      cnpjDespesa: item.cnpjDespesa,
      cpfDespesa: item.cpfDespesa,
      valorCentavosTotal: 0,
      itens: []
    };

    grupoAtual.valorCentavosTotal += Number(item.valorCentavos || 0);
    grupoAtual.itens.push(item);
    gruposPorSolicitacao.set(chaveGrupo, grupoAtual);
  });

  const resultados = new Array(registros.length);
  const indicesProcessados = new Set();

  const marcarComoOk = (item, pagamentoRelacionado = null) => {
    const formaPagamentoRemessa = obterFormaPagamentoRemessa(pagamentoRelacionado);
    const linhasRelacionadas = obterLinhasPagamento(pagamentoRelacionado);

    if (!formaPagamentoRemessa.encontrada) {
      const mensagemErroFormaPagamento = formaPagamentoRemessa.codigoBancoDoBrasil
        ? `Forma de pagamento da remessa (${formaPagamentoRemessa.codigoBancoDoBrasil}) não está cadastrada em BSTAB_FORMADEPAGAMENTO.ID_BANCODOBRASIL.`
        : 'Forma de pagamento não identificada no arquivo de remessa.';

      resultados[item.index] = criarResultadoRemessa(
        item.registro,
        'NÃO CONFERE',
        'N',
        mensagemErroFormaPagamento,
        { formadepagamento: true },
        linhasRelacionadas,
        pagamentoRelacionado
      );
      indicesProcessados.add(item.index);
      return;
    }

    resultados[item.index] = criarResultadoRemessa(item.registro, 'OK', 'S', null, {}, linhasRelacionadas, pagamentoRelacionado);
    indicesProcessados.add(item.index);
  };

  gruposPorSolicitacao.forEach((grupo) => {
    const chaveGrupo = `${grupo.cnpjDespesa}|${grupo.cpfDespesa}|${grupo.valorCentavosTotal}`;
    const pagamentosDoGrupo = mapaPagamentos.get(chaveGrupo) || [];

    if (grupo.cnpjDespesa === cnpjEmpresa && pagamentosDoGrupo.length > 0) {
      const pagamentoRelacionado = pagamentosDoGrupo.shift();

      if (pagamentosDoGrupo.length === 0) {
        mapaPagamentos.delete(chaveGrupo);
      } else {
        mapaPagamentos.set(chaveGrupo, pagamentosDoGrupo);
      }

      grupo.itens.forEach((item) => marcarComoOk(item, pagamentoRelacionado));
    }
  });

  registrosPreparados.forEach((item) => {
    if (indicesProcessados.has(item.index)) {
      return;
    }

    const chave = `${item.cnpjDespesa}|${item.cpfDespesa}|${item.valorCentavos}`;
    const pagamentosDaChave = mapaPagamentos.get(chave) || [];

    if (item.cnpjDespesa === cnpjEmpresa && pagamentosDaChave.length > 0) {
      const pagamentoRelacionado = pagamentosDaChave.shift();

      if (pagamentosDaChave.length === 0) {
        mapaPagamentos.delete(chave);
      } else {
        mapaPagamentos.set(chave, pagamentosDaChave);
      }

      marcarComoOk(item, pagamentoRelacionado);
      return;
    }

    const cnpjConfere = !!(item.cnpjDespesa && cnpjEmpresa && item.cnpjDespesa === cnpjEmpresa);
    const chaveDocumento = `${cnpjEmpresa}|${item.cpfDespesa}`;
    const pagamentosDoDocumento = pagamentosPorDocumento.get(chaveDocumento) || [];
    const pagamentoRelacionado = pagamentosDoDocumento[0] || null;
    const formaPagamentoRemessa = obterFormaPagamentoRemessa(pagamentoRelacionado);
    const encontrouCpfNaRemessa = !!(item.cpfDespesa && pagamentosDoDocumento.length > 0);
    const divergencias = {
      cnpj: !cnpjConfere,
      cpf: false,
      valor: false,
      formadepagamento: pagamentoRelacionado ? !formaPagamentoRemessa.encontrada : false
    };

    if (!divergencias.cnpj) {
      divergencias.cpf = !encontrouCpfNaRemessa;
      divergencias.valor = !divergencias.cpf;
    }

    const linhasRelacionadas = obterLinhasPagamento(pagamentoRelacionado);

    if (!encontrouCpfNaRemessa) {
      linhasRelacionadas.cpf = null;
      linhasRelacionadas.valor = null;
      linhasRelacionadas.forma_pagamento = null;
    }

    let erroRemessa = 'CPF, CNPJ ou valor não localizado no arquivo de remessa.';

    if (divergencias.cnpj) {
      erroRemessa = 'CNPJ da filial não confere com o CNPJ pagador informado na remessa.';
    } else if (divergencias.cpf) {
      erroRemessa = 'CPF do funcionário não foi encontrado no arquivo de remessa para este CNPJ.';
    } else if (divergencias.valor) {
      erroRemessa = 'Valor do item/solicitação difere do valor pago no arquivo de remessa.';
    } else if (divergencias.formadepagamento) {
      erroRemessa = formaPagamentoRemessa.codigoBancoDoBrasil
        ? `Forma de pagamento da remessa (${formaPagamentoRemessa.codigoBancoDoBrasil}) não está cadastrada em BSTAB_FORMADEPAGAMENTO.ID_BANCODOBRASIL.`
        : 'Forma de pagamento não identificada no arquivo de remessa.';
    }

    resultados[item.index] = criarResultadoRemessa(item.registro, 'NÃO CONFERE', 'N', erroRemessa, divergencias, linhasRelacionadas, pagamentoRelacionado);
  });

  const pagamentosRestantes = Array.from(mapaPagamentos.values()).flat();

  pagamentosRestantes.forEach((pagamento) => {
    const referenciasLinha = [
      pagamento?.linhaCnpj ? `CNPJ linha ${pagamento.linhaCnpj}` : null,
      pagamento?.linhaValor ? `valor linha ${pagamento.linhaValor}` : null,
      pagamento?.linhaCpf ? `CPF linha ${pagamento.linhaCpf}` : null
    ].filter(Boolean).join(' • ');

    alertas.push(
      `Remessa: pagamento sem item correspondente${referenciasLinha ? ` (${referenciasLinha})` : ''} - `
      + `CNPJ ${pagamento?.cnpjEmpresa || cnpjEmpresa || '-'} • `
      + `Empresa ${pagamento?.nomeEmpresa || nomeEmpresaRemessa || 'não identificada'} • `
      + `CPF ${pagamento?.documentoFavorecido || '-'} • `
      + `Funcionário ${pagamento?.nomeFavorecido || 'não identificado'} • `
      + `Valor ${formatarValorCentavosRemessa(pagamento?.valorCentavos)}.`
    );
  });

  return {
    registros: resultados,
    alertas: [...new Set(alertas)]
  };
}

function campoObrigatorioInvalidoPreAnalise(valor, opcoes = {}) {
  const { numero = false } = opcoes;

  if (valor === null || valor === undefined) {
    return true;
  }

  if (typeof valor === 'string') {
    return valor.trim() === '';
  }

  if (numero) {
    const numeroConvertido = Number(valor);
    return !Number.isFinite(numeroConvertido) || numeroConvertido <= 0;
  }

  return false;
}

function registroPossuiErroPreAnalise(row = {}) {
  const possuiDadosBasicosInvalidos = (
    campoObrigatorioInvalidoPreAnalise(row.CNPJ_FILIAL)
    || campoObrigatorioInvalidoPreAnalise(row.ID_ERP, { numero: true })
    || campoObrigatorioInvalidoPreAnalise(row.RAZAOSOCIAL)
    || campoObrigatorioInvalidoPreAnalise(row.ID_USUARIOENV, { numero: true })
    || campoObrigatorioInvalidoPreAnalise(row.USUARIOENV)
    || campoObrigatorioInvalidoPreAnalise(row.CPF_FUNCIONARIO)
    || campoObrigatorioInvalidoPreAnalise(row.ID_USUARIO_ERP, { numero: true })
    || campoObrigatorioInvalidoPreAnalise(row.NOME)
  );

  const possuiCadastroBancarioInvalido = (
    campoObrigatorioInvalidoPreAnalise(row.ID_BANCO, { numero: true })
    || campoObrigatorioInvalidoPreAnalise(row.BANCO)
    || campoObrigatorioInvalidoPreAnalise(row.AGENCIA)
    || campoObrigatorioInvalidoPreAnalise(row.CONTABANCARIA)
    || campoObrigatorioInvalidoPreAnalise(row.OPERACAO)
  );

  const possuiDadosDespesaInvalidos = (
    campoObrigatorioInvalidoPreAnalise(row.CONTA)
    || campoObrigatorioInvalidoPreAnalise(row.DESCRICAO)
    || campoObrigatorioInvalidoPreAnalise(row.ID_ITEM, { numero: true })
    || campoObrigatorioInvalidoPreAnalise(row.DESCRICAO_ITEM)
    || campoObrigatorioInvalidoPreAnalise(row.VALOR)
    || campoObrigatorioInvalidoPreAnalise(row.HISTORICO)
  );

  const remessaStatus = String(row.REMESSA_STATUS || '').toUpperCase();
  const exigeFormaPagamentoPorRemessa = remessaStatus !== '' && remessaStatus !== 'SEM REMESSA';
  const possuiFormaPagamentoInvalida = exigeFormaPagamentoPorRemessa
    ? campoObrigatorioInvalidoPreAnalise(row.ID_FORMADEPAGAMENTO, { numero: true })
    : false;

  const possuiRateioInvalido = Object.prototype.hasOwnProperty.call(row, 'PERRATEIO')
    ? Number(row.PERRATEIO || 0) !== 100
    : false;

  return possuiDadosBasicosInvalidos
    || possuiCadastroBancarioInvalido
    || possuiDadosDespesaInvalidos
    || possuiFormaPagamentoInvalida
    || possuiRateioInvalido
    || row.REMESSA_OK === 'N'
    || row.REMESSA_ERRO_FORMADEPAGAMENTO === 'S';
}

function resumirValidacaoPreAnalise(registros = [], alertasRemessa = []) {
  const totalAlertasRemessa = Array.isArray(alertasRemessa) ? alertasRemessa.length : 0;
  const totalErros = registros.filter((row) => registroPossuiErroPreAnalise(row)).length + totalAlertasRemessa;
  const percentualBase = registros.length > 0 ? (totalErros / registros.length) * 100 : 0;
  const percentualErro = Number(Math.min(percentualBase, 100).toFixed(2));

  return {
    totalErros,
    percentualErro
  };
}


export async function listarModel(params) {     

    try {
        
        let query = `
        SELECT 
          CASE 
            WHEN C.TIPODEDESPESA = 'EB' THEN 'BENEFICIOS'
            WHEN C.TIPODEDESPESA = 'F' THEN 'OUTRAS'
            WHEN C.TIPODEDESPESA = 'L' THEN 'VIAGEM'
          END TIPODEDESPESA,
          c.numsolicitacao,
          c.datasolicitacao,
          c.id_solicitante,
          u.nome,
          u.foto,
          c.chavepix,
          lpad(C.ID_FILIALDESPESA,2,0) id_filialdespesa,
          es2.razaosocial AS filialdespesa,
          c.dataestimada,
          c.id_empresasolicitante,
          es.razaosocial AS empresasolicitante,
          NVL(SUM(i.quantidade * NVL(i.vlunit, 0)),0) - NVL((SELECT SUM(NVL(A.VALOR,0)) FROM BSTAB_VALE A WHERE A.ID_VICULOSOLCTDESPESA = c.numsolicitacao),0)  AS vltotal,
          c.status,
          c.codcontagerencial,
          c.codcentrodecusto,
          (SELECT A.DESCRICAO FROM BSTAB_CENTRODECUSTO A WHERE A.ID_CENTRODECUSTO_ERP = c.codcentrodecusto AND A.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA) CENTRODECUSTO,
          CC.DESCRICAO conta_gernecial,
          C.ID_BANCO,
          C.ID_ROTINA_INTEGRACAO,
          IMP_SOL.IDLEITURA AS IDLEITURA_IMPORTACAO,
          NVL(IMP_LOTE.QTD_SOLICITACOES_IMPORTACAO, 0) AS QTD_SOLICITACOES_IMPORTACAO,
          NVL(IMP_LOTE.QTD_REGISTROS_IMPORTACAO, 0) AS QTD_REGISTROS_IMPORTACAO,
          NVL(IMP_LOTE.QTD_CONTAS_IMPORTACAO, 0) AS QTD_CONTAS_IMPORTACAO,
          NVL(IMP_LOTE.QTD_PARCEIROS_IMPORTACAO, 0) AS QTD_PARCEIROS_IMPORTACAO,
          NVL(IMP_LOTE.TOTAL_VALOR_IMPORTACAO, 0) AS TOTAL_VALOR_IMPORTACAO,
          IMP_LOTE.DESCRICAO_IMPORTACAO,
          CASE WHEN IMP_SOL.IDLEITURA IS NOT NULL THEN 'S' ELSE 'N' END AS IS_IMPORTACAO_LOTE,
          CASE
            WHEN C.TIPOFORNECEDOR = 'fo' THEN
              (SELECT F.FORNECEDOR
                FROM BSTAB_FORNECEDOR F
                WHERE F.ID_FORNEC_ERP = C.ID_FORNECEDOR
                  AND F.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
            WHEN C.TIPOFORNECEDOR = 'us' THEN
              (SELECT U.NOME
                FROM BSTAB_USUSARIOS U
                WHERE U.ID_USUARIO = C.ID_FORNECEDOR
                  AND U.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
          END FORNECEDOR,
          (SELECT IB.BANCO
             FROM BSTAB_INSTITUICAOBANCARIA IB
            WHERE IB.ID_BANCO = C.ID_BANCO) BANCO,
          c.agencia,
          c.contabancaria,
          c.operacao,
          C.TIPOFORNECEDOR,
          CASE 
            WHEN C.ID_FORMADEPAGAMENTO = 1 THEN 'DINHEIRO'
            WHEN C.ID_FORMADEPAGAMENTO = 2 THEN 'PIX'
            WHEN C.ID_FORMADEPAGAMENTO = 3 THEN 'TRANSFERÊNCIA (TED/DOC)'
            WHEN C.ID_FORMADEPAGAMENTO = 4 THEN 'BOLETO'
          END FORMADEPAGAMENTO
        FROM bstab_solicitadespesac c
        LEFT JOIN bstab_solicitadespesai i ON c.numsolicitacao = i.numsolicitacao
        LEFT JOIN bstab_item it ON i.id_item = it.id_item
        JOIN bstab_empresas es ON c.id_empresasolicitante = es.Id_Erp AND c.id_grupo_empresa = es.id_grupo_empresa
        JOIN bstab_empresas es2 ON c.id_filialdespesa = es2.Id_Erp AND c.id_grupo_empresa = es2.id_grupo_empresa
        JOIN bstab_ususarios u ON c.id_solicitante = u.Id_Usuario AND c.id_grupo_empresa = u.id_grupo_empresa
        LEFT JOIN BSTAB_CONTAGERENCIAL CC ON CC.ID_CONTAERP = C.CODCONTAGERENCIAL AND CC.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA
        LEFT JOIN (
          SELECT
            NUMSOLICITACAO,
            MIN(IDLEITURA) AS IDLEITURA
          FROM BSTAB_ANALISE_IMPORT_DESPESA
          WHERE NUMSOLICITACAO IS NOT NULL
          GROUP BY NUMSOLICITACAO
        ) IMP_SOL ON IMP_SOL.NUMSOLICITACAO = C.NUMSOLICITACAO
        LEFT JOIN (
          SELECT
            A.IDLEITURA,
            COUNT(DISTINCT A.NUMSOLICITACAO) AS QTD_SOLICITACOES_IMPORTACAO,
            COUNT(*) AS QTD_REGISTROS_IMPORTACAO,
            COUNT(DISTINCT C.CODCONTAGERENCIAL) AS QTD_CONTAS_IMPORTACAO,
            COUNT(DISTINCT C.TIPOFORNECEDOR || ':' || C.ID_FORNECEDOR) AS QTD_PARCEIROS_IMPORTACAO,
            SUM(NVL(A.VALOR, 0)) AS TOTAL_VALOR_IMPORTACAO,
            MAX(A.DESCRICAOENV) KEEP (DENSE_RANK LAST ORDER BY A.DATAENV NULLS LAST) AS DESCRICAO_IMPORTACAO
          FROM BSTAB_ANALISE_IMPORT_DESPESA A
          JOIN BSTAB_SOLICITADESPESAC C ON C.NUMSOLICITACAO = A.NUMSOLICITACAO
          WHERE A.NUMSOLICITACAO IS NOT NULL
          GROUP BY A.IDLEITURA
        ) IMP_LOTE ON IMP_LOTE.IDLEITURA = IMP_SOL.IDLEITURA
        WHERE 1=1`;
      
      const binds = {};
      
      if (params.dataSolicitacaoInicial) {
        query += " AND TRUNC(c.datasolicitacao) >= TO_DATE(:dataInicial, 'DD/MM/YYYY')";
        binds.dataInicial = params.dataSolicitacaoInicial;
      }

      if (params.dataSolicitacaoFinal) {
        query += " AND TRUNC(c.datasolicitacao) <= TO_DATE(:dataFinal, 'DD/MM/YYYY')";
        binds.dataFinal = params.dataSolicitacaoFinal;
      }

      if (params.pnumsolicitacao > 0) {
        query += " AND c.numsolicitacao IN (:numSolicitacao)";
        binds.numSolicitacao = params.pnumsolicitacao;
      }
      if (params.pstatus && params.pstatus !== 'T') {
        query += " AND c.status IN (:status)";
        binds.status = params.pstatus;
      }
      if (params.tipoConsulta === 'Solicitar') {
        query += " AND c.id_solicitante = :idSolicitante";
        binds.idSolicitante = params.id_usuario;
      }

      if (params.id_contagerencial > 0) {
        query += " AND c.codcontagerencial = :id_contagerencial";
        binds.id_contagerencial = params.id_contagerencial;
      }

      if (params.tipoConsulta === 'Aprovar') {
        query += ` AND 'F' || C.ID_FILIALDESPESA || 'C' || C.CODCONTAGERENCIAL IN (
          SELECT 'F' || a.id_empresa_erp || 'C' || a.id_conta_erp
          FROM bstab_ordenadores a
          JOIN bstab_ususarios u ON a.id_usuario_erp = u.id_usuario AND a.id_grupo_empresa = u.id_grupo_empresa
          WHERE a.id_usuario_erp = :id_usuario AND a.id_grupo_empresa = :idGrupoEmpresa
        )`;
        binds.id_usuario = params.id_usuario;
        binds.idGrupoEmpresa = params.id_grupo_empresa;
      }
      
      query += `
        GROUP BY 
          c.numsolicitacao, c.datasolicitacao, c.id_solicitante, c.id_filialdespesa, c.dataestimada, 
          c.id_empresasolicitante, es.razaosocial, es2.razaosocial, u.nome, u.id_usuario, u.foto, c.status, c.codcontagerencial, CC.DESCRICAO,c.agencia,
          c.contabancaria,
          c.operacao,
          C.ID_BANCO,
          C.ID_FORMADEPAGAMENTO,
          C.TIPOFORNECEDOR,
          C.ID_FORNECEDOR,
          C.ID_GRUPO_EMPRESA,
          C.TIPODEDESPESA,
          c.chavepix,
          c.codcentrodecusto,
          C.ID_ROTINA_INTEGRACAO,
          IMP_SOL.IDLEITURA,
          IMP_LOTE.QTD_SOLICITACOES_IMPORTACAO,
          IMP_LOTE.QTD_REGISTROS_IMPORTACAO,
          IMP_LOTE.QTD_CONTAS_IMPORTACAO,
          IMP_LOTE.QTD_PARCEIROS_IMPORTACAO,
          IMP_LOTE.TOTAL_VALOR_IMPORTACAO,
          IMP_LOTE.DESCRICAO_IMPORTACAO
        ORDER BY c.numsolicitacao DESC`;

        const result = await executeQuery(query, binds);
        
        return result;

    } catch (error) {
        throw error;        
    }
}


export async function consultarSolicitacaoCabModel(params) {
  
    try {
    
      const ssql = `
           SELECT C.NUMSOLICITACAO,
            C.TIPODEDESPESA,
            c.id_caixabanco,
            (select cb.caixabanco from bstab_caixabanco cb where cb.ID_BANCO_ERP = c.id_caixabanco) caixabanco,
            LPAD(C.ID_EMPRESASOLICITANTE, 4, 0) AS ID_EMPRESASOLICITANTE,
            INITCAP(E.RAZAOSOCIAL) AS EMPRESASOLICITANTE,
            U.ID_USUARIO AS ID_SOLICITANTE,
            U.NOME,
            (SELECT US.Id_Usuario FROM BSTAB_USUSARIOS US WHERE US.ID_USUARIO = C.ID_USER_CONTROLADORIA AND US.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA) ID_USER_CONTROLADORIA,
            (SELECT US.NOME FROM BSTAB_USUSARIOS US WHERE US.ID_USUARIO = C.ID_USER_CONTROLADORIA AND US.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA) USERCONTROLADORIA,
            ID_FILIALDESPESA,
            'F' || LPAD(C.ID_FILIALDESPESA, 2, 0) || ' - ' || E2.RAZAOSOCIAL AS EMPRESADESPESA,
            C.DATASOLICITACAO,
            C.DATAESTIMADA,
            C.DATAHORACONTROLADORIA,
            C.DATAHORAFINANCEIRO,
            C.HISTORICO1,
            C.HISTORICO2,
            C.id_user_financeiro,
            (SELECT US.NOME FROM BSTAB_USUSARIOS US WHERE US.ID_USUARIO = C.Id_User_Financeiro AND US.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA) USERFINANCEIRO,
            NVL(C.CODCONTAGERENCIAL, 0) AS CODCONTAGERENCIAL,
            TO_CHAR(CG.DESCRICAO) AS CONTAGERENCIAL,
            NVL(CC.DESCRICAO, '') AS CENTRODECUSTO,
            NVL(C.CODCENTRODECUSTO, 0) AS CODCENTRODECUSTO,
            UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(C.OBJETIVO)) AS OBJETIVO,
            UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(C.OBS_FINANCEIRO)) AS OBS_FINANCEIRO,
            ID_ROTINA_INTEGRACAO,
            C.ID_ORDENADOR,
            (SELECT F.NOME FROM BSTAB_USUSARIOS F WHERE F.ID_USUARIO = C.ID_ORDENADOR) ORDENADOR,
            C.STATUS,
            C.DATAHORAORDENADOR,
            ID_FORNECEDOR,
            CASE
              WHEN C.TIPOFORNECEDOR = 'fo' THEN
                (SELECT F.FORNECEDOR
                  FROM BSTAB_FORNECEDOR F
                  WHERE F.ID_FORNEC_ERP = C.ID_FORNECEDOR
                    AND F.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
              WHEN C.TIPOFORNECEDOR = 'us' THEN
                (SELECT U.NOME
                  FROM BSTAB_USUSARIOS U
                  WHERE U.ID_USUARIO = C.ID_FORNECEDOR
                    AND U.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
            END FORNECEDOR,
            UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(C.Obs_Ordenador)) AS Obs_Ordenador,
            C.TIPOFORNECEDOR,
            C.ID_FORMADEPAGAMENTO,
            C.CHAVEPIX,
            C.ID_BANCO,
            IB.BANCO,
            C.AGENCIA,
            C.CONTABANCARIA,
            C.OPERACAO,
            C.TIPOCONTA
            FROM BSTAB_SOLICITADESPESAC C
            JOIN BSTAB_USUSARIOS U
            ON C.ID_SOLICITANTE = U.ID_USUARIO
            AND C.ID_GRUPO_EMPRESA = U.ID_GRUPO_EMPRESA
            JOIN BSTAB_EMPRESAS E
            ON C.Id_Filialdespesa = E.ID_ERP
            AND C.ID_GRUPO_EMPRESA = E.ID_GRUPO_EMPRESA
            JOIN BSTAB_EMPRESAS E2
            ON C.ID_FILIALDESPESA = E2.Id_Erp
            AND C.ID_GRUPO_EMPRESA = E2.ID_GRUPO_EMPRESA
            LEFT JOIN BSTAB_FORNECEDOR CF
            ON C.ID_FORNECEDOR = CF.ID_FORNEC
            AND C.ID_GRUPO_EMPRESA = CF.ID_GRUPO_EMPRESA
            LEFT JOIN BSTAB_CONTAGERENCIAL CG
            ON C.CODCONTAGERENCIAL = CG.ID_CONTAERP
            AND C.ID_GRUPO_EMPRESA = CG.ID_GRUPO_EMPRESA
            LEFT JOIN BSTAB_CENTRODECUSTO CC
            ON C.CODCENTRODECUSTO = CC.ID_CENTRODECUSTO_ERP
            AND C.ID_GRUPO_EMPRESA = CC.ID_GRUPO_EMPRESA
            LEFT JOIN BSTAB_INSTITUICAOBANCARIA IB ON IB.ID_BANCO = C.ID_BANCO
            WHERE C.NUMSOLICITACAO = :numSolicitacao
      `;  

      const result = await executeQuery(ssql, {numSolicitacao: params.pnumsolicitacao});      
      return result;

    } catch (error) {
      throw error;     
    }


}

export async function consultarSolicitacaoItemModel(params) {

    try {
      
      const ssql = `
      SELECT 
        I.ID_ITEM AS coditem,
        IT.DESCRICAO,
        I.QUANTIDADE,
        I.VLUNIT
      FROM BSTAB_SOLICITADESPESAI I
      JOIN BSTAB_ITEM IT ON I.ID_ITEM = IT.ID_ITEM
      WHERE I.NUMSOLICITACAO = :numSolicitacao
      `;

      const result = await executeQuery(ssql, {numSolicitacao: params.pnumsolicitacao});
      return result;

    } catch (error) {
      throw error;      
    }

}







export async function validarSolicitacaoOrcamentoModel(idsolicitacao) {
  try {
      
    const ssql = `
      SELECT  VW1.vlsolicitacao, vw1.vlorcadomesatual, nvl(vw1.vlrealizado,0) vlrealizado, nvl((nvl(VW1.vlorcadomesatual,0) - nvl(vw1.vlrealizado,0)),0) saldo  
              FROM (  
              SELECT (SELECT SUM(I.QUANTIDADE * I.VLUNIT)  
              FROM BSTAB_SOLICITADESPESAI I  
              WHERE I.NUMSOLICITACAO = C.NUMSOLICITACAO) VLSOLICITACAO,  
              (select  
              case  
              when to_char(trunc(sysdate),  'MM'  ) =   01   THEN A.M1  
              when to_char(trunc(sysdate),  'MM'  ) =   02   THEN A.M2  
              when to_char(trunc(sysdate),  'MM'  ) =   03   THEN A.M3  
              when to_char(trunc(sysdate),  'MM'  ) =   04   THEN A.M4  
              when to_char(trunc(sysdate),  'MM'  ) =   05   THEN A.M5  
              when to_char(trunc(sysdate),  'MM'  ) =   06   THEN A.M6  
              when to_char(trunc(sysdate),  'MM'  ) =   07   THEN A.M7  
              when to_char(trunc(sysdate),  'MM'  ) =   08   THEN A.M8  
              when to_char(trunc(sysdate),  'MM'  ) =   09   THEN A.M9  
              when to_char(trunc(sysdate),  'MM'  ) =   10   THEN A.M10  
              when to_char(trunc(sysdate),  'MM'  ) =   11   THEN A.M11  
              when to_char(trunc(sysdate),  'MM'  ) =   12   THEN A.M12  
              end  
                
              from bstab_oracmentomensaldados a  
              where a.codconta = c.codcontagerencial  
              and a.id_empresa_erp = c.id_filialdespesa  
              and a.id_grupo_empresa = c.id_grupo_empresa  
              and a.ano = to_char(trunc(sysdate),  'YYYY'  )  
              ) vlorcadomesatual,  
                
              (select SUM(I1.QUANTIDADE * I1.VLUNIT)  
              from bstab_solicitadespesac c1, bstab_solicitadespesai i1  
              where c1.numsolicitacao = i1.numsolicitacao  
              and to_char(c1.datasolicitacao,  'MM/YYYY'  ) = to_char(TRUNC(SYSDATE),  'MM/YYYY'  )  
              AND C1.CODCONTAGERENCIAL = C.CODCONTAGERENCIAL  
              and c1.id_filialdespesa = c.id_filialdespesa  
              AND C1.STATUS IN (  'I'  )) vlrealizado  
                
              FROM BSTAB_SOLICITADESPESAC C  
              WHERE C.NUMSOLICITACAO = :nsolicitacao ) VW1
    `;
               
    const result = await executeQuery(ssql, {nsolicitacao: idsolicitacao});
    return result;

  } catch (error) {
    throw error;      
  }  
}

async function consultarResumoOrcamentoLote(connection, idleitura) {
  const resumoVazio = {
    idleitura: Number(idleitura || 0),
    totalLote: 0,
    despesasIntegradas: 0,
    vlOrcadoMes: 0,
    saldoDisponivel: 0,
    totalComprometido: 0,
    quantidadeContas: 0,
    quantidadeContasUltrapassadas: 0,
    ultrapassaOrcamento: false,
    itens: []
  };

  if (!idleitura) {
    return resumoVazio;
  }

  const ssql = `
    WITH lote_solicitacoes AS (
      SELECT DISTINCT A.NUMSOLICITACAO
        FROM BSTAB_ANALISE_IMPORT_DESPESA A
       WHERE A.IDLEITURA = :idleitura
         AND A.NUMSOLICITACAO IS NOT NULL
    ),
    lote_agrupado AS (
      SELECT
        C.CODCONTAGERENCIAL AS CODCONTA,
        C.ID_FILIALDESPESA AS ID_EMPRESA_ERP,
        C.ID_GRUPO_EMPRESA,
        SUM(NVL(I.QUANTIDADE, 0) * NVL(I.VLUNIT, 0)) AS TOTAL_LOTE
      FROM lote_solicitacoes LS
      JOIN BSTAB_SOLICITADESPESAC C ON C.NUMSOLICITACAO = LS.NUMSOLICITACAO
      LEFT JOIN BSTAB_SOLICITADESPESAI I ON I.NUMSOLICITACAO = C.NUMSOLICITACAO
      GROUP BY C.CODCONTAGERENCIAL, C.ID_FILIALDESPESA, C.ID_GRUPO_EMPRESA
    )
    SELECT
      L.CODCONTA,
      CG.DESCRICAO AS CONTA_DESCRICAO,
      L.ID_EMPRESA_ERP,
      E.RAZAOSOCIAL AS EMPRESA_DESCRICAO,
      L.ID_GRUPO_EMPRESA,
      NVL(L.TOTAL_LOTE, 0) AS TOTAL_LOTE,
      NVL((
        SELECT CASE
          WHEN TO_CHAR(TRUNC(SYSDATE), 'MM') = '01' THEN A.M1
          WHEN TO_CHAR(TRUNC(SYSDATE), 'MM') = '02' THEN A.M2
          WHEN TO_CHAR(TRUNC(SYSDATE), 'MM') = '03' THEN A.M3
          WHEN TO_CHAR(TRUNC(SYSDATE), 'MM') = '04' THEN A.M4
          WHEN TO_CHAR(TRUNC(SYSDATE), 'MM') = '05' THEN A.M5
          WHEN TO_CHAR(TRUNC(SYSDATE), 'MM') = '06' THEN A.M6
          WHEN TO_CHAR(TRUNC(SYSDATE), 'MM') = '07' THEN A.M7
          WHEN TO_CHAR(TRUNC(SYSDATE), 'MM') = '08' THEN A.M8
          WHEN TO_CHAR(TRUNC(SYSDATE), 'MM') = '09' THEN A.M9
          WHEN TO_CHAR(TRUNC(SYSDATE), 'MM') = '10' THEN A.M10
          WHEN TO_CHAR(TRUNC(SYSDATE), 'MM') = '11' THEN A.M11
          WHEN TO_CHAR(TRUNC(SYSDATE), 'MM') = '12' THEN A.M12
        END
        FROM BSTAB_ORACMENTOMENSALDADOS A
        WHERE A.CODCONTA = L.CODCONTA
          AND A.ID_EMPRESA_ERP = L.ID_EMPRESA_ERP
          AND A.ID_GRUPO_EMPRESA = L.ID_GRUPO_EMPRESA
          AND A.ANO = EXTRACT(YEAR FROM SYSDATE)
      ), 0) AS VL_ORCADO_MES,
      NVL((
        SELECT SUM(NVL(I1.QUANTIDADE, 0) * NVL(I1.VLUNIT, 0))
          FROM BSTAB_SOLICITADESPESAC C1
          JOIN BSTAB_SOLICITADESPESAI I1 ON I1.NUMSOLICITACAO = C1.NUMSOLICITACAO
         WHERE TRUNC(C1.DATASOLICITACAO, 'MM') = TRUNC(SYSDATE, 'MM')
           AND C1.CODCONTAGERENCIAL = L.CODCONTA
           AND C1.ID_FILIALDESPESA = L.ID_EMPRESA_ERP
           AND C1.ID_GRUPO_EMPRESA = L.ID_GRUPO_EMPRESA
           AND C1.STATUS = 'I'
           AND C1.NUMSOLICITACAO NOT IN (SELECT LS.NUMSOLICITACAO FROM lote_solicitacoes LS)
      ), 0) AS DESPESAS_INTEGRADAS
    FROM lote_agrupado L
    LEFT JOIN BSTAB_CONTAGERENCIAL CG ON CG.ID_CONTAERP = L.CODCONTA
    LEFT JOIN BSTAB_EMPRESAS E ON E.ID_ERP = L.ID_EMPRESA_ERP
    ORDER BY L.CODCONTA, L.ID_EMPRESA_ERP
  `;

  const result = await connection.execute(
    ssql,
    { idleitura },
    { outFormat: OracleDB.OUT_FORMAT_OBJECT }
  );

  const itens = (result.rows || []).map((row) => {
    const totalLote = Number(row.TOTAL_LOTE || 0);
    const despesasIntegradas = Number(row.DESPESAS_INTEGRADAS || 0);
    const vlOrcadoMes = Number(row.VL_ORCADO_MES || 0);
    const saldoDisponivel = vlOrcadoMes - despesasIntegradas;
    const totalComprometido = despesasIntegradas + totalLote;

    return {
      codConta: String(row.CODCONTA || '').trim(),
      conta: String(row.CONTA_DESCRICAO || '').trim(),
      idEmpresaErp: Number(row.ID_EMPRESA_ERP || 0),
      empresa: String(row.EMPRESA_DESCRICAO || '').trim(),
      idGrupoEmpresa: Number(row.ID_GRUPO_EMPRESA || 0),
      totalLote,
      despesasIntegradas,
      vlOrcadoMes,
      saldoDisponivel,
      totalComprometido,
      ultrapassaOrcamento: totalComprometido > vlOrcadoMes
    };
  });

  if (itens.length === 0) {
    return resumoVazio;
  }

  const resumo = itens.reduce((acc, item) => {
    acc.totalLote += item.totalLote;
    acc.despesasIntegradas += item.despesasIntegradas;
    acc.vlOrcadoMes += item.vlOrcadoMes;
    acc.saldoDisponivel += item.saldoDisponivel;
    acc.totalComprometido += item.totalComprometido;
    acc.quantidadeContas += 1;

    if (item.ultrapassaOrcamento) {
      acc.quantidadeContasUltrapassadas += 1;
    }

    return acc;
  }, {
    ...resumoVazio,
    itens
  });

  return {
    ...resumo,
    ultrapassaOrcamento: resumo.quantidadeContasUltrapassadas > 0
  };
}

export async function cadastrarSolicitaDespesaModal(jsonReq) {
    

    const connection = await getConnection();

    try {
            
      const sqlInsertCab = `
        insert into bstab_solicitadespesac
            (numsolicitacao, id_solicitante, id_filialdespesa, dataestimada, objetivo, id_empresasolicitante, status, id_grupo_empresa, id_fornecedor, tipofornecedor, id_formadepagamento , id_banco, agencia, contabancaria, operacao, chavepix, tipodedespesa, tipoconta )
        values
            (:numsolicitacao,  :id_solicitante, :id_filialdespesa, :dataestimada , :objetivo, :id_empresasolicitante, 'A', :id_grupo_empresa, :id_fornecedor, :tipofornecedor, :id_formadepagamento, :id_banco, :agencia, :contabancaria, :operacao, :chavepix, :tipodedespesa, :tipoconta)
      `;      

      const sqlInsertItem = `
         insert into bstab_solicitadespesai                
         (numsolicitacao, id_item, quantidade, vlunit)     
         values                                            
         (:numsolicitacao, :coditem, :quantidade, :vlunit) 
      `;
               
      // inserir solicitação cab      
      await connection.execute(sqlInsertCab, {
        numsolicitacao: jsonReq.numsolicitacao, 
        id_solicitante: Number(jsonReq.id_solicitante),
        id_filialdespesa: Number(jsonReq.id_Filialdespesa),
        dataestimada: new Date(jsonReq.dataEstimada),
        objetivo: Buffer.from(jsonReq.objetivo, 'utf-8'),
        id_empresasolicitante: Number(jsonReq.id_EmpresaFunc),         
        id_grupo_empresa: Number(jsonReq.id_grupo_empresa), 
        id_fornecedor: Number(jsonReq.id_Fornecedor),         
        tipofornecedor: jsonReq.tipofornecedor, 
        id_formadepagamento: jsonReq.id_formadepagamento,
        chavepix: jsonReq.chavepix, 
        id_banco: jsonReq.id_banco, 
        agencia: jsonReq.agencia, 
        contabancaria: jsonReq.contaBancaria, 
        operacao: jsonReq.operacao,
        tipodedespesa: jsonReq.tipodespesa,
        tipoconta: jsonReq.tipoconta
      });

      // inserir itens solicitacao
      for (const it of jsonReq.itens){        
        await connection.execute(sqlInsertItem,{
          numsolicitacao: jsonReq.numsolicitacao, 
          coditem: Number(it.coditem), 
          quantidade: Number(it.quantidade), 
          vlunit: Number(it.vlunit)  
        });

      };
     
      await connection.commit();

      await notificarSolicitacaoDepesa(jsonReq.numsolicitacao);
            
      return {numsolicitacao: jsonReq.numsolicitacao};

    } catch (error) {
      await connection.rollback();
      throw error;        
    } finally {
      await connection.close();
    }

}


export async function alterarSolicitaDespesaModel(jsonReq) {

  const connection = await getConnection();

  try {
    await validarSolicitacaoParaAcao(
      jsonReq.numsolicitacao,
      'editar',
      ['A', 'P'],
      'A solicitação só pode ser editada enquanto estiver pendente do solicitante ou da controladoria.'
    );

    // Atualizar cabeçalho da solicitação
    const sqlUpdateCab = `
      UPDATE bstab_solicitadespesac
         SET id_solicitante       = :id_solicitante,
             id_filialdespesa     = :id_filialdespesa,
             dataestimada         = :dataestimada,
             objetivo             = :objetivo,
             status               = 'A',
             codcontagerencial    = null,
             codcentrodecusto     = null,
             id_empresasolicitante = :id_empresasolicitante,
             id_grupo_empresa     = :id_grupo_empresa,
             id_fornecedor        = :id_fornecedor,
             tipofornecedor       = :tipofornecedor,
             id_formadepagamento  = :id_formadepagamento,
             id_banco             = :id_banco,
             agencia              = :agencia,
             contabancaria        = :contabancaria,
             operacao             = :operacao,
             chavepix             = :chavepix,
             tipodedespesa        = :tipodedespesa,
             tipoconta            = :tipoconta
       WHERE numsolicitacao = :numsolicitacao
    `;

    await connection.execute(sqlUpdateCab, {
      numsolicitacao: jsonReq.numsolicitacao,
      id_solicitante: Number(jsonReq.id_solicitante),
      id_filialdespesa: Number(jsonReq.id_Filialdespesa),
      dataestimada: jsonReq.dataEstimada,
      objetivo: Buffer.from(jsonReq.objetivo, 'utf-8'),
      id_empresasolicitante: Number(jsonReq.id_EmpresaFunc),
      id_grupo_empresa: Number(jsonReq.id_grupo_empresa),
      id_fornecedor: Number(jsonReq.id_Fornecedor),
      tipofornecedor: jsonReq.tipofornecedor,
      id_formadepagamento: jsonReq.id_formadepagamento,
      id_banco: jsonReq.id_banco,
      agencia: jsonReq.agencia,
      contabancaria: jsonReq.contaBancaria,
      operacao: jsonReq.operacao,
      chavepix: jsonReq.chavepix,
      tipodedespesa: jsonReq.tipodespesa,
      tipoconta: jsonReq.tipoconta
    });

    // Excluir todos os itens atuais antes de inserir os novos
    const sqlDeleteItens = `
      DELETE FROM bstab_solicitadespesai 
       WHERE numsolicitacao = :numsolicitacao
    `;
    await connection.execute(sqlDeleteItens, { numsolicitacao: jsonReq.numsolicitacao });

    // Recriar os itens da solicitação
    const sqlInsertItem = `
      INSERT INTO bstab_solicitadespesai
             (numsolicitacao, id_item, quantidade, vlunit)
      VALUES (:numsolicitacao, :coditem, :quantidade, :vlunit)
    `;

    for (const it of jsonReq.itens) {
      await connection.execute(sqlInsertItem, {
        numsolicitacao: jsonReq.numsolicitacao,
        coditem: Number(it.coditem),
        quantidade: Number(it.quantidade),
        vlunit: Number(it.vlunit)
      });
    } 

    await connection.commit();

    await notificarSolicitacaoDepesa(jsonReq.numsolicitacao);
    return { numsolicitacao: jsonReq.numsolicitacao };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}


export async function preAnaliseModel(jsonReq) {

    try {
        const ssql = `
        insert into bstab_analise_import_despesa
          (idleitura, cnpj_filial, cpf_funcionario, valor, conta, datalancamento, datapagamento, datageracao, historico, id_item, id_usuarioenv, descricaoenv, dataenv)
        values
          (:idleitura, :cnpj_filial, :cpf_funcionario, :valor, :conta, :datalancamento, :datapagamento, :datageracao, :historico, :id_item, :id_usuarioenv, :descricaoenv, :dataenv)`;

      const connection = await getConnection();

      const seqResult = await connection.execute(
        `SELECT seq_id_leitura_import_despesa.NEXTVAL AS idleitura FROM dual`
      );
      const idleitura = seqResult.rows && seqResult.rows[0] ? seqResult.rows[0][0] : null;
      if (idleitura === null || idleitura === undefined) {
        throw new AppError('Não foi possível obter o ID de leitura.', 500);
      }

      const timestampResult = await connection.execute(`SELECT SYSTIMESTAMP FROM dual`);
      const dataenv = timestampResult.rows[0][0];

      for (const item of jsonReq) {
        const valorNumerico = Number(String(item.valor).replace(',', '.'));
        if (Number.isNaN(valorNumerico)) {
          throw new AppError(`Valor inválido para registro: ${item.valor}`, 400);
        }

        const idItemInformado = item.id_item ?? item.ID_ITEM;
        const idItem = idItemInformado === undefined || idItemInformado === null || String(idItemInformado).trim() === ''
          ? null
          : Number(idItemInformado);

        if (idItemInformado !== undefined && idItemInformado !== null && String(idItemInformado).trim() !== '' && Number.isNaN(idItem)) {
          throw new AppError(`ID_ITEM inválido para registro: ${idItemInformado}`, 400);
        }

        await connection.execute(ssql, {
          idleitura,
          cnpj_filial: item.cnpj_filial,
          cpf_funcionario: item.cpf_funcionario,
          valor: valorNumerico,
          conta: item.conta,
          datalancamento: item.datalancamento,
          datapagamento: item.datapagamento,
          datageracao: item.datageracao,
          historico: item.historico,
          id_item: idItem,
          id_usuarioenv: item.id_usuarioenv,
          descricaoenv: item.descricaoenv,
          dataenv
        });
      }

      await connection.commit();

      const selectSql = `
        SELECT  A.IDLEITURA,
                A.CNPJ_FILIAL,
                E.ID_ERP,
                E.RAZAOSOCIAL,
                A.ID_USUARIOENV,
                U2.NOME USUARIOENV,
                U2.ID_EMPRESA_ERP AS ID_EMPRESASOLICITANTE,
                NVL(U2.ID_GRUPO_EMPRESA, U.ID_GRUPO_EMPRESA) AS ID_GRUPO_EMPRESA,
                A.CPF_FUNCIONARIO,
                U.ID_USUARIO AS ID_FORNECEDOR,
                U.ID_USUARIO_ERP,
                U.NOME,
                NULLIF(U.ID_BANCO, 0) AS ID_BANCO,
                IB.BANCO,
                U.AGENCIA,
                U.CONTA AS CONTABANCARIA,
                U.OPERACAO,
                A.CONTA,
                CG.DESCRICAO,
                A.ID_ITEM,
                BI.DESCRICAO AS DESCRICAO_ITEM,
                A.NUMSOLICITACAO,
                A.VALOR,
                A.HISTORICO,
                A.DATAENV,
                NVL(UR.PERRATEIO, 0) AS PERRATEIO,
                NVL(UR.CENTRODECUSTO, '') AS CENTRODECUSTO
          FROM BSTAB_ANALISE_IMPORT_DESPESA A
          LEFT JOIN BSTAB_USUSARIOS U ON A.CPF_FUNCIONARIO = U.CPF
          LEFT JOIN BSTAB_INSTITUICAOBANCARIA IB ON U.ID_BANCO = IB.ID_BANCO
          LEFT JOIN BSTAB_EMPRESAS E ON A.CNPJ_FILIAL = E.CNPJ_CPF
          LEFT JOIN BSTAB_CONTAGERENCIAL CG ON A.CONTA = CG.ID_CONTAERP
          LEFT JOIN BSTAB_ITEM BI ON A.ID_ITEM = BI.ID_ITEM
          LEFT JOIN BSTAB_USUSARIOS U2 ON A.ID_USUARIOENV = U2.ID_USUARIO
          LEFT JOIN (
            SELECT UR2.ID_USUARIO,
                   SUM(UR2.PERRATEIO) AS PERRATEIO,
                   LISTAGG(NVL(CC.DESCRICAO, TO_CHAR(UR2.ID_CENTRODECUSTO)) || ' (' || TO_CHAR(UR2.PERRATEIO) || '%)', ' / ')
                     WITHIN GROUP (ORDER BY UR2.ID_CENTRODECUSTO) AS CENTRODECUSTO
              FROM BSTAB_USUARIO_RATEIO UR2
              LEFT JOIN BSTAB_CENTRODECUSTO CC ON CC.ID_CENTRODECUSTO_ERP = UR2.ID_CENTRODECUSTO
             GROUP BY UR2.ID_USUARIO
          ) UR ON U.ID_USUARIO = UR.ID_USUARIO
         WHERE A.IDLEITURA = :idleitura
      `;

      const result = await connection.execute(selectSql, { idleitura }, { outFormat: OracleDB.OUT_FORMAT_OBJECT });
      const remessa = await obterDadosRemessaPorLeitura(connection, idleitura);
      const mapaFormaPagamentoBb = await obterMapaFormaPagamentoPorCodigoBancoBrasil(connection, remessa);
      const { registros: dadosValidados, alertas: alertasRemessa } = aplicarValidacaoRemessa(result.rows || [], remessa, mapaFormaPagamentoBb);
      const { totalErros } = resumirValidacaoPreAnalise(dadosValidados, alertasRemessa);

      return {
        idleitura,
        registros: dadosValidados.length,
        totalErros,
        alertasRemessa,
        dados: dadosValidados
      };

    } catch (error) {
      throw error;     
    }

}


export async function deletePreAnaliseModel(jsonReq) {

  const connection = await getConnection();

  try {
    const idleitura = jsonReq.idleitura ?? jsonReq.IDLEITURA;

    const solicitacoesResult = await connection.execute(
      `SELECT DISTINCT NUMSOLICITACAO
         FROM BSTAB_ANALISE_IMPORT_DESPESA
        WHERE IDLEITURA = :idleitura
          AND NUMSOLICITACAO IS NOT NULL`,
      { idleitura },
      { outFormat: OracleDB.OUT_FORMAT_OBJECT }
    );

    const numsolicitacoes = (solicitacoesResult.rows || [])
      .map((item) => item.NUMSOLICITACAO)
      .filter((item) => item !== null && item !== undefined);

    if (numsolicitacoes.length > 0) {
      const bindsSolicitacoes = numsolicitacoes.reduce((acc, numero, index) => {
        acc[`num${index}`] = numero;
        return acc;
      }, {});

      const placeholders = numsolicitacoes.map((_, index) => `:num${index}`).join(', ');

      const situacoesSolicitacoesResult = await connection.execute(
        `SELECT C.NUMSOLICITACAO, C.STATUS
           FROM BSTAB_SOLICITADESPESAC C
          WHERE C.NUMSOLICITACAO IN (${placeholders})`,
        bindsSolicitacoes,
        { outFormat: OracleDB.OUT_FORMAT_OBJECT }
      );

      validarSituacoesLoteParaAcao(
        situacoesSolicitacoesResult.rows || [],
        'excluir',
        ['A', 'EA', 'AJ', 'P', 'N']
      );

      await connection.execute(
        `UPDATE BSTAB_VALE
            SET ID_VICULOSOLCTDESPESA = NULL
          WHERE ID_VICULOSOLCTDESPESA IN (${placeholders})`,
        bindsSolicitacoes
      );

      await connection.execute(
        `DELETE FROM BSTAB_SOLICITADESPESA_RATEIO
          WHERE ID_SOLICITACAO IN (${placeholders})`,
        bindsSolicitacoes
      );

      await connection.execute(
        `DELETE FROM BSTAB_SOLICITADESPESAI
          WHERE NUMSOLICITACAO IN (${placeholders})`,
        bindsSolicitacoes
      );

      await connection.execute(
        `DELETE FROM BSTAB_SOLICITADESPESAC
          WHERE NUMSOLICITACAO IN (${placeholders})`,
        bindsSolicitacoes
      );
    }

    const result = await connection.execute(
      `DELETE FROM bstab_analise_import_despesa WHERE IDLEITURA = :idleitura`,
      { idleitura }
    );

    if (!result.rowsAffected) {
      throw new AppError('Nenhum registro encontrado para o ID de leitura informado.', 404);
    }

    await connection.commit();

    try {
      await excluirArquivosPorIdRelacional(idleitura, ID_ROTINA_IMPORTACAO_REMESSA);
    } catch (fileError) {
      console.warn(`Não foi possível excluir os arquivos de remessa da leitura ${idleitura}:`, fileError?.message || fileError);
    }

    try {
      await excluirArquivosPorIdRelacional(idleitura, ID_ROTINA_IMPORTACAO_ANEXOS);
    } catch (fileError) {
      console.warn(`Não foi possível excluir os anexos da leitura ${idleitura}:`, fileError?.message || fileError);
    }

    return {
      idleitura,
      registrosExcluidos: result.rowsAffected,
      solicitacoesExcluidas: numsolicitacoes.length
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }

}

export async function atualizarDadosBancariosImportacaoModel(jsonReq) {

  const connection = await getConnection();

  try {
    const idUsuario = Number(
      jsonReq.id_usuario
      ?? jsonReq.ID_USUARIO
      ?? jsonReq.id_fornecedor
      ?? jsonReq.ID_FORNECEDOR
    );

    if (!idUsuario || Number.isNaN(idUsuario)) {
      throw new AppError('Informe o usuário que deve ter os dados bancários atualizados.', 400);
    }

    const idBanco = normalizarCodigoBanco(
      jsonReq.id_banco
      ?? jsonReq.ID_BANCO
      ?? jsonReq.remessa_id_banco
      ?? jsonReq.REMESSA_ID_BANCO
    );
    const agencia = normalizarNumeroBancario(
      jsonReq.agencia
      ?? jsonReq.AGENCIA
      ?? jsonReq.remessa_agencia
      ?? jsonReq.REMESSA_AGENCIA
    );
    const conta = normalizarNumeroBancario(
      jsonReq.conta
      ?? jsonReq.CONTA
      ?? jsonReq.contabancaria
      ?? jsonReq.CONTABANCARIA
      ?? jsonReq.remessa_contabancaria
      ?? jsonReq.REMESSA_CONTABANCARIA
    );
    const operacaoNormalizada = normalizarNumeroBancario(
      jsonReq.operacao
      ?? jsonReq.OPERACAO
      ?? jsonReq.remessa_operacao
      ?? jsonReq.REMESSA_OPERACAO
    );
    const operacao = operacaoNormalizada || null;

    if (idBanco === null && !agencia && !conta && !operacao) {
      throw new AppError('Nenhum dado bancário válido foi informado para atualização.', 400);
    }

    const usuarioResult = await connection.execute(
      `SELECT A.ID_USUARIO,
              A.NOME,
              A.ID_BANCO,
              B.BANCO,
              A.CONTA,
              A.AGENCIA,
              A.OPERACAO
         FROM BSTAB_USUSARIOS A
         LEFT JOIN BSTAB_INSTITUICAOBANCARIA B ON A.ID_BANCO = B.ID_BANCO
        WHERE A.ID_USUARIO = :id_usuario`,
      { id_usuario: idUsuario },
      { outFormat: OracleDB.OUT_FORMAT_OBJECT }
    );

    if (!usuarioResult.rows?.length) {
      throw new AppError('Funcionário não encontrado para atualização dos dados bancários.', 404);
    }

    const updateResult = await connection.execute(
      `UPDATE BSTAB_USUSARIOS
          SET ID_BANCO = NVL(:id_banco, ID_BANCO),
              CONTA = NVL(:conta, CONTA),
              AGENCIA = NVL(:agencia, AGENCIA),
              OPERACAO = NVL(:operacao, OPERACAO)
        WHERE ID_USUARIO = :id_usuario`,
      {
        id_usuario: idUsuario,
        id_banco: idBanco,
        conta: conta || null,
        agencia: agencia || null,
        operacao
      }
    );

    if (!updateResult.rowsAffected) {
      throw new AppError('Não foi possível atualizar os dados bancários do funcionário.', 500);
    }

    await connection.commit();

    const usuarioAtualizadoResult = await connection.execute(
      `SELECT A.ID_USUARIO,
              A.NOME,
              A.ID_BANCO,
              B.BANCO,
              A.CONTA,
              A.AGENCIA,
              A.OPERACAO
         FROM BSTAB_USUSARIOS A
         LEFT JOIN BSTAB_INSTITUICAOBANCARIA B ON A.ID_BANCO = B.ID_BANCO
        WHERE A.ID_USUARIO = :id_usuario`,
      { id_usuario: idUsuario },
      { outFormat: OracleDB.OUT_FORMAT_OBJECT }
    );

    return {
      message: 'Dados bancários atualizados com sucesso.',
      usuario: usuarioAtualizadoResult.rows?.[0] || null
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }

}

export async function consultarPreAnaliseAgrupadoModel(jsonReq) {
  
  try {
    const connection = await getConnection();
    const params = {};
    const filtros = [];

    if (jsonReq.filtro) {
      filtros.push(`(
        TO_CHAR(A.IDLEITURA) LIKE :filtro
        OR UPPER(NVL(U2.NOME, '')) LIKE UPPER(:filtro)
        OR UPPER(NVL(A.DESCRICAOENV, '')) LIKE UPPER(:filtro)
        OR TO_CHAR(A.DATAENV, 'YYYY-MM-DD HH24:MI:SS') LIKE :filtro
      )`);

      params.filtro = `%${String(jsonReq.filtro).trim()}%`;
    }

    if (jsonReq.dataInicial && jsonReq.dataFinal) {
      filtros.push(`(
        TRUNC(A.DATAENV) >= TO_DATE(:dataInicial, 'YYYY-MM-DD')
        AND TRUNC(A.DATAENV) <= TO_DATE(:dataFinal, 'YYYY-MM-DD')
      )`);

      params.dataInicial = jsonReq.dataInicial;
      params.dataFinal = jsonReq.dataFinal;
    }

    let ssql = `
SELECT *
FROM (
SELECT 
  A.IDLEITURA,
  U2.ID_USUARIO ID_USUARIOENV,
  U2.NOME USUARIOENV,
  A.DESCRICAOENV,
  COUNT(*) AS QTD_REGISTROS,
  SUM(A.VALOR) AS TOTAL_VALOR,
  SUM(CASE WHEN A.NUMSOLICITACAO IS NOT NULL THEN 1 ELSE 0 END) AS QTD_PROCESSADOS,
  CASE
    WHEN COUNT(*) > 0 AND COUNT(*) = SUM(CASE WHEN A.NUMSOLICITACAO IS NOT NULL THEN 1 ELSE 0 END)
      THEN 'PROCESSADO'
    ELSE 'PENDENTE'
  END AS STATUS_PROCESSAMENTO,
  SUM(
    CASE 
      WHEN 
        A.CNPJ_FILIAL IS NULL OR
        E.ID_ERP IS NULL OR
        A.ID_USUARIOENV IS NULL OR
        U2.NOME IS NULL OR
        A.CPF_FUNCIONARIO IS NULL OR
        U.ID_USUARIO_ERP IS NULL OR
        A.CONTA IS NULL OR
        CG.DESCRICAO IS NULL OR
        A.ID_ITEM IS NULL OR
        BI.ID_ITEM IS NULL OR
        A.VALOR IS NULL OR
        NVL(UR.PERRATEIO, 0) <> 100
      THEN 1
      ELSE 0
    END
  ) AS TOTAL_ERROS,
  ROUND(
    SUM(
      CASE 
        WHEN 
          A.CNPJ_FILIAL IS NULL OR
          E.ID_ERP IS NULL OR
          A.ID_USUARIOENV IS NULL OR
          U2.NOME IS NULL OR
          A.CPF_FUNCIONARIO IS NULL OR
          U.ID_USUARIO_ERP IS NULL OR
          A.CONTA IS NULL OR
          CG.DESCRICAO IS NULL OR
          A.ID_ITEM IS NULL OR
          BI.ID_ITEM IS NULL OR
          A.VALOR IS NULL OR
          NVL(UR.PERRATEIO, 0) <> 100
        THEN 1 
        ELSE 0 
      END
    ) / COUNT(*) * 100, 2
  ) AS PERCENTUAL_ERRO,
  A.DATAENV
FROM bstab_analise_import_despesa A
LEFT JOIN BSTAB_USUSARIOS U 
  ON A.CPF_FUNCIONARIO = U.CPF
LEFT JOIN BSTAB_EMPRESAS E 
  ON A.CNPJ_FILIAL = E.CNPJ_CPF
LEFT JOIN BSTAB_CONTAGERENCIAL CG 
  ON A.CONTA = CG.ID_CONTAERP
LEFT JOIN BSTAB_ITEM BI
  ON A.ID_ITEM = BI.ID_ITEM
LEFT JOIN BSTAB_USUSARIOS U2 
  ON A.ID_USUARIOENV = U2.ID_USUARIO
LEFT JOIN (
  SELECT ID_USUARIO, SUM(PERRATEIO) AS PERRATEIO
    FROM BSTAB_USUARIO_RATEIO
   GROUP BY ID_USUARIO
) UR ON U.ID_USUARIO = UR.ID_USUARIO
WHERE 1 = 1
`;

    if (filtros.length > 0) {
      ssql += ` AND ${filtros.join(' AND ')}`;
    }

    ssql += `
GROUP BY 
  A.IDLEITURA,
  A.DESCRICAOENV,
  U2.ID_USUARIO,
  U2.NOME,
  A.DATAENV
ORDER BY A.DATAENV DESC, A.DESCRICAOENV
)
  `;

    const result = await connection.execute(ssql, params, { outFormat: OracleDB.OUT_FORMAT_OBJECT });

    const ssqlItens = `
      SELECT  A.IDLEITURA,
              A.CNPJ_FILIAL,
              E.ID_ERP,
              E.RAZAOSOCIAL,
              A.ID_USUARIOENV,
              U2.NOME USUARIOENV,
              U2.ID_EMPRESA_ERP AS ID_EMPRESASOLICITANTE,
              NVL(U2.ID_GRUPO_EMPRESA, U.ID_GRUPO_EMPRESA) AS ID_GRUPO_EMPRESA,
              A.CPF_FUNCIONARIO,
              U.ID_USUARIO AS ID_FORNECEDOR,
              U.ID_USUARIO_ERP,
              U.NOME,
              NULLIF(U.ID_BANCO, 0) AS ID_BANCO,
              IB.BANCO,
              U.AGENCIA,
              U.CONTA AS CONTABANCARIA,
              U.OPERACAO,
              A.CONTA,
              CG.DESCRICAO,
              A.ID_ITEM,
              BI.DESCRICAO AS DESCRICAO_ITEM,
              A.NUMSOLICITACAO,
              C.STATUS AS STATUS_SOLICITACAO,
              C.ID_ROTINA_INTEGRACAO,
              A.VALOR,
              A.HISTORICO,
              A.DATAENV,
                    NVL(UR.PERRATEIO, 0) AS PERRATEIO,
                    NVL(UR.CENTRODECUSTO, '') AS CENTRODECUSTO
      FROM bstab_analise_import_despesa A
      LEFT JOIN BSTAB_SOLICITADESPESAC C ON C.NUMSOLICITACAO = A.NUMSOLICITACAO
      LEFT JOIN BSTAB_USUSARIOS U ON A.CPF_FUNCIONARIO = U.CPF
      LEFT JOIN BSTAB_INSTITUICAOBANCARIA IB ON U.ID_BANCO = IB.ID_BANCO
      LEFT JOIN BSTAB_EMPRESAS E ON A.CNPJ_FILIAL = E.CNPJ_CPF
      LEFT JOIN BSTAB_CONTAGERENCIAL CG ON A.CONTA = CG.ID_CONTAERP
      LEFT JOIN BSTAB_ITEM BI ON A.ID_ITEM = BI.ID_ITEM
      LEFT JOIN BSTAB_USUSARIOS U2 ON A.ID_USUARIOENV = U2.ID_USUARIO
      LEFT JOIN (
        SELECT UR2.ID_USUARIO,
               SUM(UR2.PERRATEIO) AS PERRATEIO,
               LISTAGG(NVL(CC.DESCRICAO, TO_CHAR(UR2.ID_CENTRODECUSTO)) || ' (' || TO_CHAR(UR2.PERRATEIO) || '%)', ' / ')
                 WITHIN GROUP (ORDER BY UR2.ID_CENTRODECUSTO) AS CENTRODECUSTO
          FROM BSTAB_USUARIO_RATEIO UR2
          LEFT JOIN BSTAB_CENTRODECUSTO CC ON CC.ID_CENTRODECUSTO_ERP = UR2.ID_CENTRODECUSTO
         GROUP BY UR2.ID_USUARIO
      ) UR ON U.ID_USUARIO = UR.ID_USUARIO
      WHERE A.IDLEITURA = :idleitura
    `;

    const dadosComItens = [];

    for (const registro of result.rows) {
      const itensResult = await connection.execute(
        ssqlItens,
        { idleitura: registro.IDLEITURA },
        { outFormat: OracleDB.OUT_FORMAT_OBJECT }
      );

      const remessa = await obterDadosRemessaPorLeitura(connection, registro.IDLEITURA);
      const mapaFormaPagamentoBb = await obterMapaFormaPagamentoPorCodigoBancoBrasil(connection, remessa);
      const { registros: itensValidados, alertas: alertasRemessa } = aplicarValidacaoRemessa(itensResult.rows || [], remessa, mapaFormaPagamentoBb);
      const { totalErros, percentualErro } = resumirValidacaoPreAnalise(itensValidados, alertasRemessa);

      const statusesSolicitacao = [...new Set(
        itensValidados
          .map((item) => normalizarStatusSolicitacao(item?.STATUS_SOLICITACAO || item?.status))
          .filter(Boolean)
      )];

      dadosComItens.push({
        ...registro,
        TOTAL_ERROS: totalErros,
        PERCENTUAL_ERRO: percentualErro,
        ALERTAS_REMESSA: alertasRemessa,
        POSSUI_BLOQUEIO_EDICAO: statusesSolicitacao.some((status) => ['F', 'I'].includes(status)) ? 'S' : 'N',
        POSSUI_PENDENCIA_FINANCEIRA: statusesSolicitacao.some((status) => status === 'L') ? 'S' : 'N',
        STATUS_SOLICITACOES: statusesSolicitacao.join(', '),
        itens: itensValidados
      });
    }

    return {
      registros: dadosComItens.length,
      dados: dadosComItens
    };

  } catch (error) {
    throw error;
  }

}

export async function consultarDespesasVinculadasLeituraModel(jsonReq) {
  const connection = await getConnection();

  try {
    const idleitura = Number(jsonReq.idleitura ?? jsonReq.IDLEITURA ?? 0);

    if (!idleitura) {
      throw new AppError('ID da leitura é obrigatório para consultar as despesas vinculadas.', 400);
    }

    const ssqlResumo = `
      SELECT
        A.IDLEITURA,
        MAX(U2.ID_USUARIO) AS ID_USUARIOENV,
        MAX(U2.NOME) AS USUARIOENV,
        MAX(A.DESCRICAOENV) KEEP (DENSE_RANK LAST ORDER BY A.DATAENV NULLS LAST) AS DESCRICAOENV,
        COUNT(*) AS QTD_REGISTROS,
        SUM(NVL(A.VALOR, 0)) AS TOTAL_VALOR,
        SUM(CASE WHEN A.NUMSOLICITACAO IS NOT NULL THEN 1 ELSE 0 END) AS QTD_PROCESSADOS,
        CASE
          WHEN COUNT(*) > 0 AND COUNT(*) = SUM(CASE WHEN A.NUMSOLICITACAO IS NOT NULL THEN 1 ELSE 0 END)
            THEN 'PROCESSADO'
          ELSE 'PENDENTE'
        END AS STATUS_PROCESSAMENTO,
        MAX(A.DATAENV) AS DATAENV
      FROM BSTAB_ANALISE_IMPORT_DESPESA A
      LEFT JOIN BSTAB_USUSARIOS U2 ON A.ID_USUARIOENV = U2.ID_USUARIO
      WHERE A.IDLEITURA = :idleitura
      GROUP BY A.IDLEITURA
    `;

    const resumoResult = await connection.execute(
      ssqlResumo,
      { idleitura },
      { outFormat: OracleDB.OUT_FORMAT_OBJECT }
    );

    const resumo = resumoResult.rows?.[0];

    if (!resumo) {
      throw new AppError('Nenhuma leitura encontrada para o ID informado.', 404);
    }

    const ssqlDespesas = `
      SELECT
        A.IDLEITURA,
        A.NUMSOLICITACAO,
        C.DATASOLICITACAO,
        C.DATAESTIMADA,
        C.STATUS AS STATUS_SOLICITACAO,
        C.ID_ROTINA_INTEGRACAO,
        C.ID_CAIXABANCO,
        (SELECT CB.CAIXABANCO FROM BSTAB_CAIXABANCO CB WHERE CB.ID_BANCO_ERP = C.ID_CAIXABANCO) AS CAIXABANCO,
        C.ID_ORDENADOR,
        (SELECT F.NOME FROM BSTAB_USUSARIOS F WHERE F.ID_USUARIO = C.ID_ORDENADOR) AS ORDENADOR,
        C.DATAHORAORDENADOR,
        UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(C.OBS_ORDENADOR)) AS OBS_ORDENADOR,
        UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(C.OBS_FINANCEIRO)) AS OBS_FINANCEIRO,
        C.HISTORICO1,
        C.HISTORICO2,
        C.ID_USER_FINANCEIRO,
        (SELECT F.NOME FROM BSTAB_USUSARIOS F WHERE F.ID_USUARIO = C.ID_USER_FINANCEIRO) AS NOME_FINANCEIRO,
        C.DATAHORAFINANCEIRO,
        A.CNPJ_FILIAL,
        E.ID_ERP,
        E.RAZAOSOCIAL,
        A.ID_USUARIOENV,
        UENV.NOME AS USUARIOENV,
        UENV.ID_EMPRESA_ERP AS ID_EMPRESASOLICITANTE,
        NVL(UENV.ID_GRUPO_EMPRESA, U.ID_GRUPO_EMPRESA) AS ID_GRUPO_EMPRESA,
        A.CPF_FUNCIONARIO,
        U.ID_USUARIO AS ID_FORNECEDOR,
        U.ID_USUARIO_ERP,
        U.NOME,
        NULLIF(U.ID_BANCO, 0) AS ID_BANCO,
        IB.BANCO,
        U.AGENCIA,
        U.CONTA AS CONTABANCARIA,
        U.OPERACAO,
        A.CONTA,
        CG.DESCRICAO,
        NVL(SI.ID_ITEM, A.ID_ITEM) AS ID_ITEM,
        NVL(BI.DESCRICAO, BI2.DESCRICAO) AS DESCRICAO_ITEM,
        NVL(SI.VLUNIT, A.VALOR) AS VALOR,
        A.HISTORICO,
        A.DATAENV,
        NVL(UR.PERRATEIO, 0) AS PERRATEIO,
        '' AS CENTRODECUSTO
      FROM BSTAB_ANALISE_IMPORT_DESPESA A
      LEFT JOIN BSTAB_SOLICITADESPESAC C ON C.NUMSOLICITACAO = A.NUMSOLICITACAO
      LEFT JOIN BSTAB_SOLICITADESPESAI SI ON SI.NUMSOLICITACAO = A.NUMSOLICITACAO AND SI.ID_ITEM = A.ID_ITEM
      LEFT JOIN BSTAB_ITEM BI ON BI.ID_ITEM = SI.ID_ITEM
      LEFT JOIN BSTAB_ITEM BI2 ON BI2.ID_ITEM = A.ID_ITEM
      LEFT JOIN BSTAB_USUSARIOS U ON A.CPF_FUNCIONARIO = U.CPF
      LEFT JOIN BSTAB_INSTITUICAOBANCARIA IB ON U.ID_BANCO = IB.ID_BANCO
      LEFT JOIN BSTAB_EMPRESAS E ON A.CNPJ_FILIAL = E.CNPJ_CPF
      LEFT JOIN BSTAB_CONTAGERENCIAL CG ON A.CONTA = CG.ID_CONTAERP
      LEFT JOIN BSTAB_USUSARIOS UENV ON A.ID_USUARIOENV = UENV.ID_USUARIO
      LEFT JOIN (
        SELECT UR2.ID_USUARIO,
               SUM(UR2.PERRATEIO) AS PERRATEIO
          FROM BSTAB_USUARIO_RATEIO UR2
         GROUP BY UR2.ID_USUARIO
      ) UR ON U.ID_USUARIO = UR.ID_USUARIO
      WHERE A.IDLEITURA = :idleitura
      ORDER BY
        CASE WHEN A.NUMSOLICITACAO IS NOT NULL THEN 0 ELSE 1 END,
        A.NUMSOLICITACAO DESC NULLS LAST,
        NVL(U.NOME, ' '),
        NVL(SI.ID_ITEM, A.ID_ITEM)
    `;

    const despesasResult = await connection.execute(
      ssqlDespesas,
      { idleitura },
      { outFormat: OracleDB.OUT_FORMAT_OBJECT }
    );

    const ssqlCentrosCustoUsuario = `
      SELECT
        UR.ID_USUARIO,
        UR.ID_CENTRODECUSTO,
        UR.PERRATEIO,
        NVL(CC.DESCRICAO, TO_CHAR(UR.ID_CENTRODECUSTO)) AS CENTRODECUSTO
      FROM BSTAB_USUARIO_RATEIO UR
      JOIN (
        SELECT DISTINCT U.ID_USUARIO, U.ID_GRUPO_EMPRESA
        FROM BSTAB_ANALISE_IMPORT_DESPESA A
        LEFT JOIN BSTAB_USUSARIOS U ON U.CPF = A.CPF_FUNCIONARIO
        WHERE A.IDLEITURA = :idleitura
          AND U.ID_USUARIO IS NOT NULL
      ) US ON US.ID_USUARIO = UR.ID_USUARIO
      LEFT JOIN BSTAB_CENTRODECUSTO CC
        ON CC.ID_CENTRODECUSTO_ERP = UR.ID_CENTRODECUSTO
       AND CC.ID_GRUPO_EMPRESA = US.ID_GRUPO_EMPRESA
      ORDER BY UR.ID_USUARIO, UR.ID_CENTRODECUSTO
    `;

    const centrosCustoResult = await connection.execute(
      ssqlCentrosCustoUsuario,
      { idleitura },
      { outFormat: OracleDB.OUT_FORMAT_OBJECT }
    );

    const centrosPorUsuario = new Map();
    for (const row of centrosCustoResult.rows || []) {
      const idUsuario = Number(row.ID_USUARIO || 0);
      if (!idUsuario) {
        continue;
      }

      if (!centrosPorUsuario.has(idUsuario)) {
        centrosPorUsuario.set(idUsuario, []);
      }

      centrosPorUsuario.get(idUsuario).push({
        idCentroCusto: row.ID_CENTRODECUSTO,
        descricao: row.CENTRODECUSTO,
        percentual: Number(row.PERRATEIO || 0)
      });
    }

    const despesasComCentrosCusto = (despesasResult.rows || []).map((item) => {
      const idUsuario = Number(item?.ID_FORNECEDOR || 0);
      const centrosCusto = idUsuario ? (centrosPorUsuario.get(idUsuario) || []) : [];
      const centrosCustoTexto = centrosCusto
        .map((centro) => `${centro.descricao} (${centro.percentual}%)`)
        .join(' / ');

      return {
        ...item,
        CENTROSDECUSTO: centrosCusto,
        CENTRODECUSTO: item?.CENTRODECUSTO || centrosCustoTexto
      };
    });

    const remessa = await obterDadosRemessaPorLeitura(connection, idleitura);
    const mapaFormaPagamentoBb = await obterMapaFormaPagamentoPorCodigoBancoBrasil(connection, remessa);
    const { registros: despesasValidadas, alertas: alertasRemessa } = aplicarValidacaoRemessa(despesasComCentrosCusto, remessa, mapaFormaPagamentoBb);
    const { totalErros, percentualErro } = resumirValidacaoPreAnalise(despesasValidadas, alertasRemessa);
    const despesasGeradas = despesasValidadas.filter((item) => Number(item?.NUMSOLICITACAO || 0) > 0);
    const registrosPendentes = despesasValidadas.filter((item) => Number(item?.NUMSOLICITACAO || 0) <= 0);
    const orcamentoLote = await consultarResumoOrcamentoLote(connection, idleitura);

    return {
      ...resumo,
      TOTAL_ERROS: totalErros,
      PERCENTUAL_ERRO: percentualErro,
      ALERTAS_REMESSA: alertasRemessa,
      ORCAMENTO_LOTE: orcamentoLote,
      despesas: despesasValidadas,
      despesasGeradas,
      registrosPendentes,
      itens: despesasValidadas
    };
  } catch (error) {
    throw error;
  } finally {
    await connection.close();
  }
}

function montarObservacaoHistoricoImportacao(registro = {}, idleitura) {
  const partes = [`Solicitacao gerada automaticamente pela importacao de despesa (leitura ${idleitura}).`];

  const idUsuarioEnvio = Number(registro.ID_USUARIOENV || 0);
  const nomeUsuarioEnvio = String(registro.USUARIOENV || '').trim();
  const descricaoEnvio = String(registro.DESCRICAOENV || '').trim();
  const dataEnvio = registro.DATAENV
    ? moment(registro.DATAENV).isValid()
      ? moment(registro.DATAENV).format('DD/MM/YYYY HH:mm')
      : String(registro.DATAENV)
    : '';

  if (idUsuarioEnvio > 0 || nomeUsuarioEnvio) {
    partes.push(`Usuario de envio: ${idUsuarioEnvio > 0 ? `${idUsuarioEnvio}${nomeUsuarioEnvio ? ` - ${nomeUsuarioEnvio}` : ''}` : nomeUsuarioEnvio}.`);
  }

  if (dataEnvio) {
    partes.push(`Data do envio: ${dataEnvio}.`);
  }

  if (descricaoEnvio) {
    partes.push(`Descricao do envio: ${descricaoEnvio.slice(0, 500)}.`);
  }

  return partes.join(' ');
}

export async function processarDespesasImportacaoModel(jsonReq) {

  const connection = await getConnection();

  try {
    const idleitura = Number(jsonReq.idleitura ?? jsonReq.IDLEITURA);

    const ssqlValidacao = `
      SELECT 
        COUNT(*) AS TOTAL_REGISTROS,
        SUM(CASE WHEN A.NUMSOLICITACAO IS NULL THEN 1 ELSE 0 END) AS TOTAL_PENDENTES,
        NVL(SUM(
          CASE
            WHEN A.NUMSOLICITACAO IS NULL AND (
              A.CNPJ_FILIAL IS NULL
              OR E.ID_ERP IS NULL
              OR A.ID_USUARIOENV IS NULL
              OR UENV.ID_USUARIO IS NULL
              OR UENV.ID_EMPRESA_ERP IS NULL
              OR A.CPF_FUNCIONARIO IS NULL
              OR UFORN.ID_USUARIO IS NULL
              OR NVL(UFORN.ID_BANCO, 0) = 0
              OR IB.BANCO IS NULL
              OR UFORN.AGENCIA IS NULL
              OR UFORN.CONTA IS NULL
              OR UFORN.OPERACAO IS NULL
              OR A.CONTA IS NULL
              OR CG.ID_CONTAERP IS NULL
              OR A.ID_ITEM IS NULL
              OR BI.ID_ITEM IS NULL
              OR A.VALOR IS NULL
              OR NVL(UR.PERRATEIO, 0) <> 100
            ) THEN 1
            ELSE 0
          END
        ), 0) AS TOTAL_ERROS
      FROM BSTAB_ANALISE_IMPORT_DESPESA A
      LEFT JOIN BSTAB_USUSARIOS UFORN ON UFORN.CPF = A.CPF_FUNCIONARIO
      LEFT JOIN BSTAB_INSTITUICAOBANCARIA IB ON IB.ID_BANCO = UFORN.ID_BANCO
      LEFT JOIN BSTAB_EMPRESAS E ON E.CNPJ_CPF = A.CNPJ_FILIAL
      LEFT JOIN BSTAB_CONTAGERENCIAL CG ON CG.ID_CONTAERP = A.CONTA
      LEFT JOIN BSTAB_ITEM BI ON BI.ID_ITEM = A.ID_ITEM
      LEFT JOIN BSTAB_USUSARIOS UENV ON UENV.ID_USUARIO = A.ID_USUARIOENV
      LEFT JOIN (
        SELECT ID_USUARIO, SUM(PERRATEIO) AS PERRATEIO
          FROM BSTAB_USUARIO_RATEIO
         GROUP BY ID_USUARIO
      ) UR ON UFORN.ID_USUARIO = UR.ID_USUARIO
      WHERE A.IDLEITURA = :idleitura
    `;

    const ssqlRegistros = `
      SELECT
        A.ROWID AS ROW_ID,
        A.CNPJ_FILIAL,
        E.ID_ERP,
        E.ID_ERP AS ID_FILIALDESPESA,
        E.RAZAOSOCIAL,
        A.CPF_FUNCIONARIO,
        A.VALOR,
        A.CONTA,
        CG.DESCRICAO AS DESCRICAO,
        A.DATAPAGAMENTO,
        A.HISTORICO,
        A.DESCRICAOENV,
        A.DATAENV,
        A.ID_ITEM,
        BI.DESCRICAO AS DESCRICAO_ITEM,
        A.ID_USUARIOENV,
        UENV.NOME AS USUARIOENV,
        UENV.ID_EMPRESA_ERP AS ID_EMPRESASOLICITANTE,
        NVL(UENV.ID_GRUPO_EMPRESA, UFORN.ID_GRUPO_EMPRESA) AS ID_GRUPO_EMPRESA,
        UFORN.ID_USUARIO AS ID_FORNECEDOR,
        UFORN.ID_USUARIO_ERP,
        UFORN.NOME,
        NULLIF(UFORN.ID_BANCO, 0) AS ID_BANCO,
        IB.BANCO AS BANCO,
        UFORN.AGENCIA AS AGENCIA,
        UFORN.CONTA AS CONTABANCARIA,
        UFORN.OPERACAO AS OPERACAO,
        NVL(UR.PERRATEIO, 0) AS PERRATEIO,
        NVL(UR.CENTRODECUSTO, '') AS CENTRODECUSTO
      FROM BSTAB_ANALISE_IMPORT_DESPESA A
      LEFT JOIN BSTAB_USUSARIOS UFORN ON UFORN.CPF = A.CPF_FUNCIONARIO
      LEFT JOIN BSTAB_INSTITUICAOBANCARIA IB ON IB.ID_BANCO = UFORN.ID_BANCO
      LEFT JOIN BSTAB_EMPRESAS E ON E.CNPJ_CPF = A.CNPJ_FILIAL
      LEFT JOIN BSTAB_CONTAGERENCIAL CG ON CG.ID_CONTAERP = A.CONTA
      LEFT JOIN BSTAB_ITEM BI ON BI.ID_ITEM = A.ID_ITEM
      LEFT JOIN BSTAB_USUSARIOS UENV ON UENV.ID_USUARIO = A.ID_USUARIOENV
      LEFT JOIN (
        SELECT UR2.ID_USUARIO,
               SUM(UR2.PERRATEIO) AS PERRATEIO,
               LISTAGG(NVL(CC.DESCRICAO, TO_CHAR(UR2.ID_CENTRODECUSTO)) || ' (' || TO_CHAR(UR2.PERRATEIO) || '%)', ' / ')
                 WITHIN GROUP (ORDER BY UR2.ID_CENTRODECUSTO) AS CENTRODECUSTO
          FROM BSTAB_USUARIO_RATEIO UR2
          LEFT JOIN BSTAB_CENTRODECUSTO CC ON CC.ID_CENTRODECUSTO_ERP = UR2.ID_CENTRODECUSTO
         GROUP BY UR2.ID_USUARIO
      ) UR ON UFORN.ID_USUARIO = UR.ID_USUARIO
      WHERE A.IDLEITURA = :idleitura
        AND A.NUMSOLICITACAO IS NULL
      ORDER BY A.ID_ITEM, A.CPF_FUNCIONARIO, A.VALOR
    `;

    const validacaoResult = await connection.execute(
      ssqlValidacao,
      { idleitura },
      { outFormat: OracleDB.OUT_FORMAT_OBJECT }
    );

    const validacao = validacaoResult.rows?.[0];

    if (!validacao || Number(validacao.TOTAL_REGISTROS) === 0) {
      throw new AppError('Nenhum registro encontrado para o ID de leitura informado.', 404);
    }

    if (Number(validacao.TOTAL_PENDENTES || 0) === 0) {
      throw new AppError('A importação selecionada já foi processada e não pode ser processada novamente.', 400);
    }

    const solicitacoesExistentesResult = await connection.execute(
      `SELECT DISTINCT C.NUMSOLICITACAO, C.STATUS
         FROM BSTAB_ANALISE_IMPORT_DESPESA A
         JOIN BSTAB_SOLICITADESPESAC C ON C.NUMSOLICITACAO = A.NUMSOLICITACAO
        WHERE A.IDLEITURA = :idleitura
          AND A.NUMSOLICITACAO IS NOT NULL`,
      { idleitura },
      { outFormat: OracleDB.OUT_FORMAT_OBJECT }
    );

    validarSituacoesLoteParaAcao(
      solicitacoesExistentesResult.rows || [],
      'processar lote',
      ['A', 'EA', 'AJ', 'P', 'N']
    );

    const registrosResult = await connection.execute(
      ssqlRegistros,
      { idleitura },
      { outFormat: OracleDB.OUT_FORMAT_OBJECT }
    );

    let registros = registrosResult.rows || [];

    if (registros.length === 0) {
      throw new AppError('Nenhum item válido foi encontrado para processamento.', 404);
    }

    const remessa = await obterDadosRemessaPorLeitura(connection, idleitura);

    if (!remessa?.encontrada) {
      throw new AppError('O processamento só pode ser realizado quando existir arquivo de remessa de pagamento vinculado a esta leitura.', 400);
    }

    const totalErrosPreAnalise = registros.filter((registro) => registroPossuiErroPreAnalise(registro)).length;

    if (totalErrosPreAnalise > 0) {
      throw new AppError('Existem inconsistências na pré-análise. Corrija os registros antes de processar as despesas.', 400);
    }

    const mapaFormaPagamentoBb = await obterMapaFormaPagamentoPorCodigoBancoBrasil(connection, remessa);

    const { registros: registrosValidados, alertas: alertasRemessa } = aplicarValidacaoRemessa(registros, remessa, mapaFormaPagamentoBb);
    registros = registrosValidados;

    if (alertasRemessa.length > 0 || registros.some((registro) => registro.REMESSA_OK === 'N')) {
      throw new AppError('Existem divergências entre o arquivo de despesa e o arquivo de remessa. Corrija os itens sinalizados antes de processar as despesas.', 400);
    }

    const totalErrosPosRemessa = registros.filter((registro) => registroPossuiErroPreAnalise(registro)).length;

    if (totalErrosPosRemessa > 0) {
      throw new AppError('Existem inconsistências na pré-análise. Verifique principalmente o vínculo da forma de pagamento da remessa com BSTAB_FORMADEPAGAMENTO.', 400);
    }

    const ssqlInsertCab = `
      INSERT INTO BSTAB_SOLICITADESPESAC (
        NUMSOLICITACAO,
        DATASOLICITACAO,
        ID_SOLICITANTE,
        ID_FILIALDESPESA,
        DATAESTIMADA,
        OBJETIVO,
        ID_EMPRESASOLICITANTE,
        STATUS,
        CODCONTAGERENCIAL,
        ID_GRUPO_EMPRESA,
        ID_FORNECEDOR,
        TIPOFORNECEDOR,
        ID_FORMADEPAGAMENTO,
        ID_BANCO,
        AGENCIA,
        CONTABANCARIA,
        OPERACAO,
        TIPODEDESPESA,
        TIPOCONTA
      ) VALUES (
        :numsolicitacao,
        TRUNC(SYSDATE),
        :id_solicitante,
        :id_filialdespesa,
        :dataestimada,
        :objetivo,
        :id_empresasolicitante,
        'EA',
        :codcontagerencial,
        :id_grupo_empresa,
        :id_fornecedor,
        'us',
        :id_formadepagamento,
        :id_banco,
        :agencia,
        :contabancaria,
        :operacao,
        'EB',
        1
      )
    `;

    const ssqlInsertItem = `
      INSERT INTO BSTAB_SOLICITADESPESAI (
        NUMSOLICITACAO,
        ID_ITEM,
        QUANTIDADE,
        VLUNIT
      ) VALUES (
        :numsolicitacao,
        :id_item,
        1,
        :vlunit
      )
    `;

    const ssqlInsertRateio = `
      INSERT INTO BSTAB_SOLICITADESPESA_RATEIO (
        ID_CENTRODECUSTO,
        PERCENTUAL,
        VALOR,
        ID_SOLICITACAO,
        ID_RATEIO
      )
      SELECT
        UR.ID_CENTRODECUSTO,
        UR.PERRATEIO,
        ((UR.PERRATEIO / 100) * :valor) AS VALOR,
        :numsolicitacao AS ID_SOLICITACAO,
        (SELECT NVL(MAX(R.ID_RATEIO), 0) FROM BSTAB_SOLICITADESPESA_RATEIO R) + ROWNUM AS ID_RATEIO
      FROM BSTAB_USUSARIOS US
      JOIN BSTAB_USUARIO_RATEIO UR ON US.ID_USUARIO = UR.ID_USUARIO
      WHERE US.CPF = :cpf_funcionario
    `;

    const ssqlUpdateImportacao = `
      UPDATE BSTAB_ANALISE_IMPORT_DESPESA
         SET NUMSOLICITACAO = :numsolicitacao
       WHERE ROWID = :row_id
    `;

    const ssqlInsertHistorico = `
      INSERT INTO BSTAB_SOLICITADESPESA_HISTORICO (
        ID_HISTORICO,
        NUMSOLICITACAO,
        ID_GRUPO_EMPRESA,
        ETAPA,
        STATUS_ANTES,
        STATUS_DEPOIS,
        ID_USUARIO,
        NOME_USUARIO,
        OBSERVACAO,
        DATAHORA
      ) VALUES (
        SEQ_SOLICITADESPESA_HISTORICO.NEXTVAL,
        :numsolicitacao,
        :id_grupo_empresa,
        :etapa,
        :status_antes,
        :status_depois,
        :id_usuario,
        :nome_usuario,
        :observacao,
        SYSDATE
      )
    `;

    const numsolicitacoes = [];
    const vinculosGerados = [];
    let totalRateiosInseridos = 0;

    for (const registro of registros) {
      const seqResult = await connection.execute(
        `SELECT bsseq_numsolicitacao.NEXTVAL AS NUMSOLICITACAO FROM dual`,
        {},
        { outFormat: OracleDB.OUT_FORMAT_OBJECT }
      );

      const numsolicitacao = seqResult.rows?.[0]?.NUMSOLICITACAO;

      if (!numsolicitacao) {
        throw new AppError('Não foi possível gerar o número da solicitação.', 500);
      }

      const dataPagamentoTexto = registro.DATAPAGAMENTO ? String(registro.DATAPAGAMENTO).trim() : '';
      const dataEstimada = /^\d{8}$/.test(dataPagamentoTexto)
        ? moment(dataPagamentoTexto, 'DDMMYYYY', true).toDate()
        : registro.DATAPAGAMENTO;

      const cabResult = await connection.execute(ssqlInsertCab, {
        numsolicitacao,
        id_solicitante: Number(registro.ID_USUARIOENV),
        id_filialdespesa: Number(registro.ID_FILIALDESPESA),
        dataestimada: dataEstimada,
        objetivo: Buffer.from(registro.HISTORICO || ' ', 'utf-8'),
        id_empresasolicitante: Number(registro.ID_EMPRESASOLICITANTE),
        codcontagerencial: registro.CONTA,
        id_grupo_empresa: Number(registro.ID_GRUPO_EMPRESA || 1),
        id_fornecedor: Number(registro.ID_FORNECEDOR),
        id_formadepagamento: Number(registro.ID_FORMADEPAGAMENTO || 3),
        id_banco: Number(registro.ID_BANCO),
        agencia: registro.AGENCIA,
        contabancaria: registro.CONTABANCARIA,
        operacao: registro.OPERACAO
      });

      if (!cabResult.rowsAffected) {
        throw new AppError(`Não foi possível inserir o cabeçalho da solicitação para o item ${registro.ID_ITEM}.`, 500);
      }

      const itemResult = await connection.execute(ssqlInsertItem, {
        numsolicitacao,
        id_item: Number(registro.ID_ITEM),
        vlunit: Number(registro.VALOR)
      });

      if (!itemResult.rowsAffected) {
        throw new AppError(`Não foi possível inserir o item ${registro.ID_ITEM} da solicitação.`, 500);
      }

      const rateioResult = await connection.execute(ssqlInsertRateio, {
        numsolicitacao,
        valor: Number(registro.VALOR),
        cpf_funcionario: registro.CPF_FUNCIONARIO
      });

      if (!rateioResult.rowsAffected) {
        throw new AppError(`Não foi possível gerar o rateio da solicitação para o item ${registro.ID_ITEM}.`, 500);
      }

      const updateImportacaoResult = await connection.execute(ssqlUpdateImportacao, {
        numsolicitacao,
        row_id: registro.ROW_ID
      });

      if (!updateImportacaoResult.rowsAffected) {
        throw new AppError(`Não foi possível vincular a solicitação ${numsolicitacao} ao item importado ${registro.ID_ITEM}.`, 500);
      }

      const historicoResult = await connection.execute(ssqlInsertHistorico, {
        numsolicitacao,
        id_grupo_empresa: Number(registro.ID_GRUPO_EMPRESA || 1),
        etapa: 'SOLICITACAO',
        status_antes: null,
        status_depois: 'EA',
        id_usuario: Number(registro.ID_USUARIOENV || 0) || null,
        nome_usuario: null,
        observacao: montarObservacaoHistoricoImportacao(registro, idleitura)
      });

      if (!historicoResult.rowsAffected) {
        throw new AppError(`Não foi possível gerar o histórico da solicitação ${numsolicitacao}.`, 500);
      }

      totalRateiosInseridos += Number(rateioResult.rowsAffected || 0);
      numsolicitacoes.push(numsolicitacao);
      vinculosGerados.push({
        id_item: Number(registro.ID_ITEM),
        numsolicitacao
      });
    }

    await connection.commit();

    await notificarSolicitacaoLote(idleitura);

    return {
      idleitura,
      numsolicitacao: numsolicitacoes[0] || null,
      numsolicitacoes,
      vinculosGerados,
      solicitacoesGeradas: numsolicitacoes.length,
      registrosProcessados: registros.length,
      itensInseridos: registros.length,
      rateiosInseridos: totalRateiosInseridos
    };

  } catch (error) {
    console.log(error);
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }

}


export async function direcionarSolicitacaoModel(jsonReq) {
  
  try {
    await validarSolicitacaoParaAcao(
      jsonReq.numsolicitacao,
      'direcionar',
      ['A', 'EA', 'AJ'],
      'A solicitação só pode ser direcionada enquanto estiver pendente da controladoria ou ajuste de orçamento.'
    );

    const ssqlValidaRateio = `
    SELECT 
    NVL(
        (SELECT SUM(NVL(A.QUANTIDADE,0) * NVL(A.VLUNIT,0)) 
         FROM BSTAB_SOLICITADESPESAI A
         WHERE A.NUMSOLICITACAO = :numsolicitacao), 0
    )
    -
    NVL(
        (SELECT SUM(NVL(B.VALOR,0)) 
         FROM BSTAB_VALE B
         WHERE B.ID_VICULOSOLCTDESPESA = :numsolicitacao), 0
    )
    -
    NVL(
        (SELECT SUM(NVL(C.VALOR,0)) 
         FROM BSTAB_SOLICITADESPESA_RATEIO C
         WHERE C.ID_SOLICITACAO = :numsolicitacao), 0
    ) AS validacao
FROM dual
    `;
    
    const ssqlUpdate = `
     UPDATE BSTAB_SOLICITADESPESAC C SET              
            C.CODCONTAGERENCIAL = :codcontagerencial,        
            C.CODCENTRODECUSTO = :codcentrodecusto,          
            c.datahoracontroladoria = SYSDATE,               
            C.STATUS = 'EA' ,                              
            C.id_user_controladoria = :id_user_controladoria 
            WHERE C.NUMSOLICITACAO = :numsolicitacao         
    `;    

    const valida = await executeQuery (ssqlValidaRateio, {
      numsolicitacao: jsonReq.numsolicitacao  
    });

    if (valida[0].validacao > 0){
      throw new AppError('Valor do rateio menor que o valor da despesa.');
    }

    if (valida[0].validacao < 0){
      throw new AppError('Valor do rateio maior que o valor da despesa.');
    }

    await executeQuery(ssqlUpdate, {
      codcontagerencial: jsonReq.codconta, 
      codcentrodecusto: jsonReq.codCentroDeCusto,                                                   
      id_user_controladoria: jsonReq.id_user_controladoria,
      numsolicitacao: jsonReq.numsolicitacao    
    }, true);

    await notificarSolicitacaoDepesa(jsonReq.numsolicitacao);

    return {numsolicitacao: jsonReq.numsolicitacao};

  } catch (error) {    
    throw error;
  }

}


export async function notificarSolicitacaoDepesa(numeroSolicitacao){

  const ssqlNotifica = `
  SELECT P.ID_USUARIO id_usuario,
            A.ID_SOLICITANTE id_remetente,
            'Despesa Nova: '||a.numsolicitacao titulo,
            'Existe uma nova solicitação a ser direcionada na sua lista
Mensagem do Solicitante: '||UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(a.objetivo)) mensagem
        FROM BSTAB_SOLICITADESPESAC A, BSTAB_PERMISOES P 
      WHERE A.NUMSOLICITACAO = :numeroSolicitacao
        AND P.ID_ROTINA = 1031      
        AND P.PERMITIR = 'S'
        AND A.STATUS IN ('A')
        
 union all
 
 SELECT B.ID_USUARIO_ERP id_usuario,
        CASE WHEN (A.DATAHORACONTROLADORIA > A.DATAHORAFINANCEIRO) OR A.DATAHORAFINANCEIRO IS NULL THEN (select f.id_usuario from bstab_ususarios f where f.id_usuario_erp = A.ID_USER_CONTROLADORIA)
        ELSE A.ID_USER_FINANCEIRO END id_remetente,
        'Despesa para Analise: '||a.numsolicitacao titulo,
        CASE WHEN (A.DATAHORACONTROLADORIA > A.DATAHORAFINANCEIRO) OR A.DATAHORAFINANCEIRO IS NULL
        THEN 'Existe uma solicitação de despesa para você analisar
Verifique sua lista de aprovação na rotina (1032).'
        ELSE 'Existe uma solicitação de despesa para você analisar
Verifique sua lista de aprovação na rotina (1032).
Mensagem do Financeiro: '||UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(a.obs_financeiro))END mensagem
    FROM BSTAB_SOLICITADESPESAC A, BSTAB_ORDENADORES B
  WHERE A.NUMSOLICITACAO = :numeroSolicitacao
    AND B.ID_CONTA_ERP = A.CODCONTAGERENCIAL
    AND B.ID_EMPRESA_ERP = A.ID_FILIALDESPESA
    AND A.STATUS IN ('EA')

    union all

    SELECT a.ID_SOLICITANTE id_usuario,
          CASE WHEN (A.DATAHORACONTROLADORIA > A.DATAHORAFINANCEIRO) OR A.DATAHORAFINANCEIRO IS NULL THEN (select f.id_usuario from bstab_ususarios f where f.id_usuario_erp = A.ID_USER_CONTROLADORIA)
        ELSE A.ID_USER_FINANCEIRO END id_remetente,
          'Despesa Em Analise: '||a.numsolicitacao titulo,
          CASE WHEN (A.DATAHORACONTROLADORIA > A.DATAHORAFINANCEIRO) OR A.DATAHORAFINANCEIRO IS NULL
        THEN 'Sua solicitação foi encaminhada para analise do gestor'
        ELSE 'Sua solicitação foi reencaminhada para analise do gestor pelo finaiceiro
Motivo: '||UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(a.obs_financeiro))END mensagem
      FROM BSTAB_SOLICITADESPESAC A
    WHERE A.NUMSOLICITACAO = :numeroSolicitacao
    AND A.STATUS IN ('EA') 
    
    union all

    SELECT a.ID_SOLICITANTE id_usuario,
          a.id_ordenador id_remetente,
          'Despesa Pendente: '||a.numsolicitacao titulo,
          'Mensagem do Ordenador: '||UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(a.Obs_Ordenador)) mensagem
      FROM BSTAB_SOLICITADESPESAC A
    WHERE A.NUMSOLICITACAO = :numeroSolicitacao
    AND A.STATUS IN ('P') 
    
    union all

    SELECT a.ID_SOLICITANTE id_usuario,
          a.id_ordenador id_remetente,
          'Despesa Negada: '||a.numsolicitacao titulo,
          'Mensagem do Ordenador: '||UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(a.Obs_Ordenador)) mensagem
      FROM BSTAB_SOLICITADESPESAC A
    WHERE A.NUMSOLICITACAO = :numeroSolicitacao
    AND A.STATUS IN ('N')  
    
    union all

    SELECT a.ID_SOLICITANTE id_usuario,
          a.id_ordenador id_remetente,
          'Despesa Liberada: '||a.numsolicitacao titulo,
          'Sua solicitação foi enviada para o financeiro realizar o pagamento' mensagem
      FROM BSTAB_SOLICITADESPESAC A
    WHERE A.NUMSOLICITACAO = :numeroSolicitacao
    AND A.STATUS IN ('L')
    
    union all

    SELECT P.ID_USUARIO id_usuario,
            A.Id_Ordenador id_remetente,
            'Pagamento de Despesa: '||a.numsolicitacao titulo,
            'Enviei uma despesa para realizar o pagamento' mensagem
        FROM BSTAB_SOLICITADESPESAC A, BSTAB_PERMISOES P 
      WHERE A.NUMSOLICITACAO = :numeroSolicitacao
        AND P.ID_ROTINA = 1036      
        AND P.PERMITIR = 'S'
        AND A.STATUS IN ('L')
    
    union all

    SELECT a.ID_SOLICITANTE id_usuario,
          a.id_user_financeiro id_remetente,
          'Despesa Concluida: '||a.numsolicitacao titulo,
          'Sua solicitação foi liberada pelo financeiro
Mensagem do Financeiro: '||UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(a.obs_financeiro)) mensagem
      FROM BSTAB_SOLICITADESPESAC A
    WHERE A.NUMSOLICITACAO = :numeroSolicitacao
    AND A.STATUS IN ('I')
  `;

  try {
    
    const notificacoes = await executeQuery(ssqlNotifica,{
      numeroSolicitacao: numeroSolicitacao
    });

    await notificacaoEnviarModel(notificacoes);

  } catch (error) {
     throw error;
  }

}

export async function notificarSolicitacaoLote(idleitura) {

  const ssqlNotificaLote = `
    WITH SOL AS (
      SELECT DISTINCT
        A.NUMSOLICITACAO,
        A.STATUS,
        A.ID_SOLICITANTE,
        A.ID_ORDENADOR,
        A.ID_USER_CONTROLADORIA,
        A.ID_USER_FINANCEIRO,
        A.CODCONTAGERENCIAL,
        A.ID_FILIALDESPESA,
        UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(A.OBJETIVO)) AS OBJETIVO,
        UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(A.OBS_ORDENADOR)) AS OBS_ORDENADOR,
        UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(A.OBS_FINANCEIRO)) AS OBS_FINANCEIRO
      FROM BSTAB_SOLICITADESPESAC A
      JOIN BSTAB_ANALISE_IMPORT_DESPESA IMP
        ON IMP.NUMSOLICITACAO = A.NUMSOLICITACAO
      WHERE IMP.IDLEITURA = :idleitura
        AND A.NUMSOLICITACAO IS NOT NULL
    )
    SELECT
      P.ID_USUARIO AS ID_USUARIO,
      MIN(S.ID_SOLICITANTE) AS ID_REMETENTE,
      'Lote de Despesas: #' || :idleitura AS TITULO,
      'Existe um novo lote com ' || COUNT(DISTINCT S.NUMSOLICITACAO) || ' solicitação(ões) para direcionamento na sua lista.' AS MENSAGEM
    FROM SOL S
    JOIN BSTAB_PERMISOES P
      ON P.ID_ROTINA = 1031
     AND P.PERMITIR = 'S'
    WHERE S.STATUS = 'A'
    GROUP BY P.ID_USUARIO

    UNION ALL

    SELECT
      O.ID_USUARIO_ERP AS ID_USUARIO,
      MIN(CASE
            WHEN S.ID_USER_FINANCEIRO IS NULL THEN (SELECT F.ID_USUARIO FROM BSTAB_USUSARIOS F WHERE F.ID_USUARIO_ERP = S.ID_USER_CONTROLADORIA)
            ELSE S.ID_USER_FINANCEIRO
          END) AS ID_REMETENTE,
      'Lote de Despesas: #' || :idleitura AS TITULO,
      'Existe um lote com ' || COUNT(DISTINCT S.NUMSOLICITACAO) || ' solicitação(ões) para você analisar na rotina (1032).' AS MENSAGEM
    FROM SOL S
    JOIN BSTAB_ORDENADORES O
      ON O.ID_CONTA_ERP = S.CODCONTAGERENCIAL
     AND O.ID_EMPRESA_ERP = S.ID_FILIALDESPESA
    WHERE S.STATUS = 'EA'
    GROUP BY O.ID_USUARIO_ERP

    UNION ALL

    SELECT
      S.ID_SOLICITANTE AS ID_USUARIO,
      MIN(CASE
            WHEN S.ID_USER_FINANCEIRO IS NULL THEN (SELECT F.ID_USUARIO FROM BSTAB_USUSARIOS F WHERE F.ID_USUARIO_ERP = S.ID_USER_CONTROLADORIA)
            ELSE S.ID_USER_FINANCEIRO
          END) AS ID_REMETENTE,
      'Lote de Despesas em Análise: #' || :idleitura AS TITULO,
      'Seu lote foi encaminhado para análise do gestor. Quantidade de solicitações: ' || COUNT(DISTINCT S.NUMSOLICITACAO) || '.' AS MENSAGEM
    FROM SOL S
    WHERE S.STATUS = 'EA'
    GROUP BY S.ID_SOLICITANTE

    UNION ALL

    SELECT
      S.ID_SOLICITANTE AS ID_USUARIO,
      MIN(S.ID_ORDENADOR) AS ID_REMETENTE,
      'Lote de Despesas Pendente: #' || :idleitura AS TITULO,
      'Mensagem do Ordenador: ' || MAX(NVL(S.OBS_ORDENADOR, 'Sem observação.')) AS MENSAGEM
    FROM SOL S
    WHERE S.STATUS = 'P'
    GROUP BY S.ID_SOLICITANTE

    UNION ALL

    SELECT
      S.ID_SOLICITANTE AS ID_USUARIO,
      MIN(S.ID_ORDENADOR) AS ID_REMETENTE,
      'Lote de Despesas Negado: #' || :idleitura AS TITULO,
      'Mensagem do Ordenador: ' || MAX(NVL(S.OBS_ORDENADOR, 'Sem observação.')) AS MENSAGEM
    FROM SOL S
    WHERE S.STATUS = 'N'
    GROUP BY S.ID_SOLICITANTE

    UNION ALL

    SELECT
      S.ID_SOLICITANTE AS ID_USUARIO,
      MIN(S.ID_ORDENADOR) AS ID_REMETENTE,
      'Lote de Despesas Liberado: #' || :idleitura AS TITULO,
      'As solicitações do lote #' || :idleitura || ' foram enviadas para o financeiro realizar o pagamento.' AS MENSAGEM
    FROM SOL S
    WHERE S.STATUS = 'L'
    GROUP BY S.ID_SOLICITANTE

    UNION ALL

    SELECT
      P.ID_USUARIO AS ID_USUARIO,
      MIN(S.ID_ORDENADOR) AS ID_REMETENTE,
      'Pagamento de Lote de Despesas: #' || :idleitura AS TITULO,
      'Enviei um lote com ' || COUNT(DISTINCT S.NUMSOLICITACAO) || ' solicitação(ões) para realizar o pagamento.' AS MENSAGEM
    FROM SOL S
    JOIN BSTAB_PERMISOES P
      ON P.ID_ROTINA = 1036
     AND P.PERMITIR = 'S'
    WHERE S.STATUS = 'L'
    GROUP BY P.ID_USUARIO

    UNION ALL

    SELECT
      S.ID_SOLICITANTE AS ID_USUARIO,
      MIN(S.ID_USER_FINANCEIRO) AS ID_REMETENTE,
      'Lote de Despesas Concluído: #' || :idleitura AS TITULO,
      'O lote #' || :idleitura || ' foi concluído pelo financeiro. Mensagem do Financeiro: ' || MAX(NVL(S.OBS_FINANCEIRO, 'Sem observação.')) AS MENSAGEM
    FROM SOL S
    WHERE S.STATUS = 'I'
    GROUP BY S.ID_SOLICITANTE
  `;

  try {
    const notificacoes = await executeQuery(ssqlNotificaLote, {
      idleitura
    });

    if (Array.isArray(notificacoes) && notificacoes.length > 0) {
      await notificacaoEnviarModel(notificacoes);
    }

  } catch (error) {
    throw error;
  }

}

export async function proximoidsolicitadespesaModal() {

  try {
    const proximonumsolicitacao = await executeQuery(`select bsseq_numsolicitacao.nextval proxnum from dual`);     
    return proximonumsolicitacao[0];  
  } catch (error) {
    throw error;
  }
  
}

export async function autorizacaoDePagamentoModel(jsonReq) {

  let ssqlConsulta = `
    SELECT C.NUMSOLICITACAO,
           C.ID_FILIALDESPESA,
           C.DATASOLICITACAO,
           CASE
             WHEN C.TIPOFORNECEDOR = 'fo' THEN 'FORNECEDOR'
             WHEN C.TIPOFORNECEDOR = 'us' THEN 'FUNCIONARIO'
           END TIPOPARCEIRO,
           C.ID_FORNECEDOR IDPARCEIRO,       
           CASE
             WHEN C.TIPOFORNECEDOR = 'fo' THEN
              (SELECT F.FORNECEDOR
                 FROM BSTAB_FORNECEDOR F
                WHERE F.ID_FORNEC_ERP = C.ID_FORNECEDOR
                  AND F.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
             WHEN C.TIPOFORNECEDOR = 'us' THEN
              (SELECT U.NOME
                 FROM BSTAB_USUSARIOS U
                WHERE U.ID_USUARIO = C.ID_FORNECEDOR
                  AND U.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
           END PARCEIRO, 
           CASE
             WHEN C.TIPOFORNECEDOR = 'fo' THEN NULL
             WHEN C.TIPOFORNECEDOR = 'us' THEN
              (SELECT S.ID_SETOR
                 FROM BSTAB_USUSARIOS U
                 LEFT JOIN BSTAB_USUARIO_SETOR S
                   ON U.ID_SETOR_ERP = S.ID_SETOR_ERP
                  AND S.ID_GRUPO_EMPRESA = U.ID_GRUPO_EMPRESA
                WHERE U.ID_USUARIO = C.ID_FORNECEDOR
                  AND U.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
           END CODSETOR, 
           CASE
             WHEN C.TIPOFORNECEDOR = 'fo' THEN 'FORNECEDOR'
             WHEN C.TIPOFORNECEDOR = 'us' THEN
              (SELECT S.SETOR
                 FROM BSTAB_USUSARIOS U
                 LEFT JOIN BSTAB_USUARIO_SETOR S
                   ON U.ID_SETOR_ERP = S.ID_SETOR_ERP
                  AND S.ID_GRUPO_EMPRESA = U.ID_GRUPO_EMPRESA
                WHERE U.ID_USUARIO = C.ID_FORNECEDOR
                  AND U.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
           END SETOR,     
           I.ID_ITEM,
           IT.DESCRICAO,
           (NVL(I.QUANTIDADE,0) * NVL(I.VLUNIT,0)) TOTAL,
           nvl((SELECT SUM(A.VALOR)
              FROM BSTAB_VALE A
             WHERE A.ID_VICULOSOLCTDESPESA = C.NUMSOLICITACAO),0) VALE,
           nvl((NVL(I.QUANTIDADE,0) * NVL(I.VLUNIT,0)),0) -
           nvl((SELECT SUM(A.VALOR)
              FROM BSTAB_VALE A
             WHERE A.ID_VICULOSOLCTDESPESA = C.NUMSOLICITACAO),0) VLLIQUIDO,
           CASE 
             WHEN C.STATUS = 'A'  THEN 'PEND. CONTROLADORIA'
             WHEN C.STATUS = 'EA' THEN 'PEND. ORDENADOR'
             WHEN C.STATUS = 'AJ' THEN 'AJUSTAR ORÇAMENTO'
             WHEN C.STATUS = 'L'  THEN 'PEND. FINANCEIRO'
             WHEN C.STATUS = 'P'  THEN 'PEND. SOLICITANTE'
             WHEN C.STATUS = 'N'  THEN 'NEGADO. ORDENADOR'
             WHEN C.STATUS = 'F'  THEN 'PEND. INTEGRAÇÃO'
             WHEN C.STATUS = 'I'  THEN 'LANÇADO WINTHOR'
           END STATUS,
           C.ID_ORDENADOR,
           (SELECT O.NOME
              FROM BSTAB_USUSARIOS O
             WHERE O.ID_USUARIO = C.ID_ORDENADOR) ORDENADOR,
           C.ID_BANCO,
           (SELECT IB.BANCO
              FROM BSTAB_INSTITUICAOBANCARIA IB
             WHERE IB.ID_BANCO = C.ID_BANCO) BANCO,
           C.AGENCIA,
           C.CONTABANCARIA,
           C.OPERACAO,
           CASE WHEN C.TIPOCONTA = 1 THEN 'PROPRIA'
                WHEN C.TIPOCONTA = 2 THEN 'TERCEIRO'
           END TIPODECONTA,
           CASE WHEN (C.TIPOCONTA = 1 AND C.ID_BANCO > 0) THEN 
                (SELECT G.NOME
                   FROM BSTAB_USUSARIOS G
                  WHERE G.ID_USUARIO = C.ID_FORNECEDOR)
                WHEN (C.TIPOCONTA = 2 AND C.ID_BANCO > 0) THEN
                (SELECT G.BENEFICIADOTERCEIRO
                   FROM BSTAB_USUSARIOS G
                  WHERE G.ID_USUARIO = C.ID_FORNECEDOR)
                ELSE
                    CASE
                       WHEN C.TIPOFORNECEDOR = 'fo' THEN
                      (SELECT F.FORNECEDOR
                         FROM BSTAB_FORNECEDOR F
                        WHERE F.ID_FORNEC_ERP = C.ID_FORNECEDOR
                          AND F.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
                     WHEN C.TIPOFORNECEDOR = 'us' THEN
                      (SELECT U.NOME
                         FROM BSTAB_USUSARIOS U
                        WHERE U.ID_USUARIO = C.ID_FORNECEDOR
                          AND U.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
                     END 
           END FAVORECIDO,
           C.CODCONTAGERENCIAL,
           (SELECT CG.DESCRICAO
              FROM BSTAB_CONTAGERENCIAL CG
             WHERE CG.ID_CONTAERP = C.CODCONTAGERENCIAL
               AND CG.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA) CONTA_GERENCIAL,
           C.CODCENTRODECUSTO,
           (SELECT CC.DESCRICAO
              FROM BSTAB_CENTRODECUSTO CC
             WHERE CC.ID_CENTRODECUSTO_ERP = C.CODCENTRODECUSTO
               AND CC.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA) CENTRODECUSTO,
               FP.ID_FORMADEPAGAMENTO,
               FP.FORMADEPAGAMENTO
      FROM BSTAB_SOLICITADESPESAC C
      LEFT JOIN BSTAB_SOLICITADESPESAI I
        ON C.NUMSOLICITACAO = I.NUMSOLICITACAO
      LEFT JOIN BSTAB_ITEM IT
        ON I.ID_ITEM = IT.ID_ITEM
      LEFT JOIN BSTAB_FORMADEPAGAMENTO FP ON C.ID_FORMADEPAGAMENTO = FP.ID_FORMADEPAGAMENTO
     WHERE 1 = 1
  `;

  const params = {};

  /* ==========================
     FILTROS NUMÉRICOS (> 0)
     ========================== */

  if (Number(jsonReq.idFilialDespesa) > 0) {
    ssqlConsulta += ` AND C.ID_FILIALDESPESA = :ID_FILIALDESPESA`;
    params.ID_FILIALDESPESA = jsonReq.idFilialDespesa;
  }

  if (Number(jsonReq.codContaGerencial) > 0) {
    ssqlConsulta += ` AND C.CODCONTAGERENCIAL = :CODCONTAGERENCIAL`;
    params.CODCONTAGERENCIAL = jsonReq.codContaGerencial;
  }

  if (Number(jsonReq.codCentroDeCusto) > 0) {
    ssqlConsulta += ` AND C.CODCENTRODECUSTO = :CODCENTRODECUSTO`;
    params.CODCENTRODECUSTO = jsonReq.codCentroDeCusto;
  }

  if (Number(jsonReq.idParceiro) > 0) {
    ssqlConsulta += ` AND C.ID_FORNECEDOR = :ID_FORNECEDOR`;
    params.ID_FORNECEDOR = jsonReq.idParceiro;
  }

  /* ==========================
     FILTROS TEXTO
     ========================== */

  if (jsonReq.tipoFornecedor && jsonReq.tipoFornecedor !== '0') {
    ssqlConsulta += ` AND C.TIPOFORNECEDOR = :TIPOFORNECEDOR`;
    params.TIPOFORNECEDOR = jsonReq.tipoFornecedor;
  }

  // Status 'T' = TODOS
  if (
    jsonReq.status &&
    jsonReq.status !== '0' &&
    jsonReq.status !== 'T'
  ) {
    ssqlConsulta += ` AND C.STATUS = :STATUS`;
    params.STATUS = jsonReq.status;
  }

  /* ==========================
     PERÍODO
     ========================== */

  if (jsonReq.dataInicial) {
    ssqlConsulta += `
      AND trunc(C.DATASOLICITACAO) >= TO_DATE(:DATA_INICIAL,'YYYY-MM-DD')
    `;
    params.DATA_INICIAL = jsonReq.dataInicial;
  }

  if (jsonReq.dataFinal) {
    ssqlConsulta += `
      AND trunc(C.DATASOLICITACAO) <= TO_DATE(:DATA_FINAL,'YYYY-MM-DD')
    `;
    params.DATA_FINAL = jsonReq.dataFinal;
  }

  /* ==========================
     EXECUÇÃO
     ========================== */

  try {
    return await executeQuery(ssqlConsulta, params);
  } catch (error) {
    throw error;
  }
}






export async function controleDeDespesaModel(jsonReq) {



  // -----------------------------
  //  VALIDAR DATAS OBRIGATÓRIAS
  // -----------------------------
  if (!jsonReq.dataInicial || !jsonReq.dataFinal) {
    throw new Error("Parâmetros 'dataInicial' e 'dataFinal' são obrigatórios.");
  }

  const params = {
    DATA_INICIAL: jsonReq.dataInicial,
    DATA_FINAL: jsonReq.dataFinal
  };

  // -------------------------------------------------
  // CONSULTAR USUÁRIOS DENTRO DO PERÍODO INFORMADO
  // -------------------------------------------------
  let ssqlConsultaUsuario = `
    SELECT 
      A.ID_USUARIO,      
      A.NOME
    FROM BSTAB_USUSARIOS A
    WHERE 1 = 1
      AND (
          A.ID_USUARIO IN (
            SELECT DISTINCT C.ID_FORNECEDOR 
              FROM BSTAB_SOLICITADESPESAC C 
             WHERE C.TIPOFORNECEDOR = 'us'
               AND C.DATASOLICITACAO >= TO_DATE(:DATA_INICIAL, 'YYYY-MM-DD')
               AND C.DATASOLICITACAO <= TO_DATE(:DATA_FINAL,   'YYYY-MM-DD')
          )
          OR
          A.ID_USUARIO IN (
            SELECT DISTINCT V.ID_FUNC
              FROM BSTAB_VALE V
             WHERE V.DATA_VENCIMENTO >= TO_DATE(:DATA_INICIAL, 'YYYY-MM-DD')
               AND V.DATA_VENCIMENTO <= TO_DATE(:DATA_FINAL,   'YYYY-MM-DD')
               AND V.ID_GRUPO_EMPRESA = A.ID_GRUPO_EMPRESA
          )
      )
  `;

  // -----------------------------
  //  FILTRO OPCIONAL POR USUÁRIO
  // -----------------------------
  if (jsonReq.id_Fornecedor && Number(jsonReq.id_Fornecedor) > 0) {
    ssqlConsultaUsuario += ` AND A.ID_USUARIO = :ID_USUARIO `;
    params.ID_USUARIO = jsonReq.id_Fornecedor;
  }

  // -----------------------------
  // EXECUTAR CONSULTA
  // -----------------------------
  const resultUsuario = await executeQuery(ssqlConsultaUsuario, params);


  //-----------------------------
  // CONSULTA MOVIMENTAÇÃO
  //-----------------------------
  
  let ssqlConsultaMovimentacao=`
  
SELECT VW1.*
  FROM (
SELECT C.NUMSOLICITACAO,
       CASE
         WHEN C.TIPOFORNECEDOR = 'fo' then
          'FORNECEDOR'
         WHEN C.TIPOFORNECEDOR = 'us' then
          'FUNCIOANRIO'
       END TIPOPARCEIRO,
       C.ID_FORNECEDOR IDPARCEIRO,
       CASE
         WHEN C.TIPOFORNECEDOR = 'fo' THEN
          (SELECT F.FORNECEDOR
             FROM BSTAB_FORNECEDOR F
            WHERE F.ID_FORNEC_ERP = C.ID_FORNECEDOR
              AND F.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
         WHEN C.TIPOFORNECEDOR = 'us' THEN
          (SELECT U.NOME
             FROM BSTAB_USUSARIOS U
            WHERE U.ID_USUARIO = C.ID_FORNECEDOR
              AND U.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
       END PARCEIRO,       
       TRUNC(C.DATASOLICITACAO) DATA_LANCAMNETO,
       C.DATAESTIMADA DATA_VENCIMENTO,
       I.ID_ITEM,
       IT.DESCRICAO,
       I.QUANTIDADE,
       I.VLUNIT,
       CASE WHEN (NVL(I.QUANTIDADE,0) * NVL(I.VLUNIT,0)) > 0 THEN (NVL(I.QUANTIDADE,0) * NVL(I.VLUNIT,0)) END CREDITO,
       CASE WHEN (NVL(I.QUANTIDADE,0) * NVL(I.VLUNIT,0)) < 0 THEN (NVL(I.QUANTIDADE,0) * NVL(I.VLUNIT,0)) END DEBITO,
       (NVL(I.QUANTIDADE,0) * NVL(I.VLUNIT,0)) SALDO,
       CASE WHEN (NVL(I.QUANTIDADE,0) * NVL(I.VLUNIT,0)) > 0 THEN 'CREDITO' 
            WHEN (NVL(I.QUANTIDADE,0) * NVL(I.VLUNIT,0)) < 0 THEN 'DEBITO'
            ELSE 'SALDO ZERADO'
       END TIPO
                               
  FROM BSTAB_SOLICITADESPESAC C
  LEFT JOIN BSTAB_SOLICITADESPESAI I ON C.NUMSOLICITACAO = I.NUMSOLICITACAO
  LEFT JOIN BSTAB_ITEM IT ON I.ID_ITEM = IT.ID_ITEM
  WHERE 1=1
    AND C.ID_FORNECEDOR = :IDFUNC
    AND C.TIPOFORNECEDOR = 'us'
    AND C.DATASOLICITACAO >= TO_DATE(:DATA_INICIAL,'YYYY-MM-DD')
    AND C.DATASOLICITACAO <= TO_DATE(:DATA_FINAL,'YYYY-MM-DD')
  
UNION ALL  
  
-- VALE PAGO
SELECT C.NUMSOLICITACAO,
       CASE
         WHEN C.TIPOFORNECEDOR = 'fo' then
          'FORNECEDOR'
         WHEN C.TIPOFORNECEDOR = 'us' then
          'FUNCIOANRIO'
       END TIPOPARCEIRO,
       C.ID_FORNECEDOR IDPARCEIRO,
       CASE
         WHEN C.TIPOFORNECEDOR = 'fo' THEN
          (SELECT F.FORNECEDOR
             FROM BSTAB_FORNECEDOR F
            WHERE F.ID_FORNEC_ERP = C.ID_FORNECEDOR
              AND F.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
         WHEN C.TIPOFORNECEDOR = 'us' THEN
          (SELECT U.NOME
             FROM BSTAB_USUSARIOS U
            WHERE U.ID_USUARIO = C.ID_FORNECEDOR
              AND U.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
       END PARCEIRO,
       TRUNC(V.DATA_LANCAMENTO) DATA_LANCAMNETO,
       V.DATA_VENCIMENTO DATA_VENCIMENTO,
       V.ID_VALE ID_ITEM,
       'VALE PAGO' DESCRICAO,
       1 QUANTIDADE,
       V.VALOR VLUNIT,
       V.VALOR CREDITO,
       NULL  DEBITO,
       V.VALOR SALDO,
       'CREDITO' TIPO
                               
  FROM BSTAB_SOLICITADESPESAC C
  JOIN BSTAB_VALE V ON C.NUMSOLICITACAO = V.ID_VICULOSOLCTDESPESA
  WHERE V.DATA_BAIXA IS NOT NULL
    AND C.ID_FORNECEDOR = :IDFUNC
    AND C.TIPOFORNECEDOR = 'us'
    AND C.DATASOLICITACAO >= TO_DATE(:DATA_INICIAL,'YYYY-MM-DD')
    AND C.DATASOLICITACAO <= TO_DATE(:DATA_FINAL,'YYYY-MM-DD')
  
UNION ALL  

-- VALE ABERTO VINCULADO
SELECT C.NUMSOLICITACAO,
       CASE
         WHEN C.TIPOFORNECEDOR = 'fo' then
          'FORNECEDOR'
         WHEN C.TIPOFORNECEDOR = 'us' then
          'FUNCIOANRIO'
       END TIPOPARCEIRO,
       C.ID_FORNECEDOR IDPARCEIRO,
       CASE
         WHEN C.TIPOFORNECEDOR = 'fo' THEN
          (SELECT F.FORNECEDOR
             FROM BSTAB_FORNECEDOR F
            WHERE F.ID_FORNEC_ERP = C.ID_FORNECEDOR
              AND F.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
         WHEN C.TIPOFORNECEDOR = 'us' THEN
          (SELECT U.NOME
             FROM BSTAB_USUSARIOS U
            WHERE U.ID_USUARIO = C.ID_FORNECEDOR
              AND U.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
       END PARCEIRO,
       TRUNC(V.DATA_LANCAMENTO) DATA_LANCAMNETO,
       V.DATA_VENCIMENTO DATA_VENCIMENTO,
       V.ID_VALE ID_ITEM,
       'VALE EM ABERTO' DESCRICAO,
       1 QUANTIDADE,
       - V.VALOR VLUNIT,
       0 CREDITO,
       - V.VALOR DEBITO,
       - V.VALOR SALDO,
       'DEBITO' TIPO
                               
  FROM BSTAB_SOLICITADESPESAC C
  JOIN BSTAB_VALE V ON C.NUMSOLICITACAO = V.ID_VICULOSOLCTDESPESA
  WHERE V.DATA_BAIXA IS NULL
    AND C.ID_FORNECEDOR = :IDFUNC
    AND C.TIPOFORNECEDOR = 'us'
    AND C.DATASOLICITACAO >= TO_DATE(:DATA_INICIAL,'YYYY-MM-DD')
    AND C.DATASOLICITACAO <= TO_DATE(:DATA_FINAL,'YYYY-MM-DD')
  
UNION ALL
  
SELECT NULL NUMSOLICITACAO,
       'FUNCIONARIO' TIPOPARCEIRO,
       V.ID_FUNC IDPARCEIRO,
       (SELECT S.NOME FROM BSTAB_USUSARIOS S WHERE S.Id_Usuario = :IDFUNC AND S.ID_GRUPO_EMPRESA = V.Id_Grupo_Empresa) PARCEIRO,
       TRUNC(V.DATA_LANCAMENTO) DATA_LANCAMNETO,
       V.DATA_VENCIMENTO DATA_VENCIMENTO,
       V.ID_VALE ID_ITEM,
       'VALE EM ABERTO' DESCRICAO,
       1 QUANTIDADE,
       - V.VALOR VLUNIT,
       0 CREDITO,
       - V.VALOR DEBITO,
       - V.VALOR SALDO,
       'DEBITO' TIPO
                               
  FROM  BSTAB_VALE V
  WHERE V.DATA_BAIXA IS NULL
    AND V.ID_FUNC = :IDFUNC
    AND V.ID_VICULOSOLCTDESPESA IS NULL
    AND V.DATA_VENCIMENTO >= TO_DATE(:DATA_INICIAL,'YYYY-MM-DD')
    AND V.DATA_VENCIMENTO <= TO_DATE(:DATA_FINAL,'YYYY-MM-DD') 
    ) VW1 WHERE 1=1
   AND (
      :TIPOLANC IS NULL
      OR VW1.TIPO = :TIPOLANC
    )
  `;

  
  // ----------------------------------------
  //  FILTRO OPCIONAL POR TIPO DE LANCAMENTO
  // ----------------------------------------
  const tipolanc =
  ["CREDITO", "DEBITO"].includes(jsonReq.tipoLanc)
    ? jsonReq.tipoLanc
    : null;
 
  const usuarioComMov = [];

  for (const usuario of resultUsuario) {

  const movimentacao = await executeQuery(
    ssqlConsultaMovimentacao,
    {
      IDFUNC: usuario.id_usuario,
      DATA_INICIAL: jsonReq.dataInicial,
      DATA_FINAL: jsonReq.dataFinal,
      TIPOLANC: tipolanc
    }
  );

  usuarioComMov.push({
    ...usuario,
    movimentacao
  });
}

  return usuarioComMov;
};


export async function consultarRateioModel(jsonReq) {

  try {
    const ssqlConsultar = `
      SELECT A.ID_SOLICITACAO, A.ID_CENTRODECUSTO, CC.DESCRICAO, A.PERCENTUAL, A.VALOR, A.ID_RATEIO
        FROM bstab_solicitadespesa_rateio A
        JOIN BSTAB_CENTRODECUSTO CC ON A.ID_CENTRODECUSTO = CC.ID_CENTRODECUSTO_ERP
      WHERE A.ID_SOLICITACAO = :id_solicitacao
    `; 

    const result = await executeQuery(ssqlConsultar, {id_solicitacao: jsonReq.pnumsolicitacao});
    return result;

  } catch (error) {
    throw error;
  }    
}


export async function deleteRateioModel(jsonReq) {

  console.log(jsonReq);
  
  try {
    await validarSolicitacaoParaAcao(
      jsonReq.numsolicitacao,
      'excluir rateio',
      ['A', 'P'],
      'O rateio só pode ser alterado enquanto a solicitação estiver pendente do solicitante ou da controladoria.'
    );
    const ssqlDelete = `
      DELETE FROM bstab_solicitadespesa_rateio S where s.id_rateio = :id_rateio
    `;

    const ssqlConsultar = `
      SELECT A.ID_SOLICITACAO, A.ID_CENTRODECUSTO, CC.DESCRICAO, A.PERCENTUAL, A.VALOR, A.ID_RATEIO
        FROM bstab_solicitadespesa_rateio A
        JOIN BSTAB_CENTRODECUSTO CC ON A.ID_CENTRODECUSTO = CC.ID_CENTRODECUSTO_ERP
      WHERE A.ID_SOLICITACAO = :id_solicitacao
    `;

    await executeQuery(ssqlDelete, {id_rateio: jsonReq.id_rateio}, true);

    const result = await executeQuery(ssqlConsultar, {id_solicitacao: jsonReq.numsolicitacao});
    return result;

  } catch (error) {
    throw error;
  }

}


export async function recalcularRaterioModel(dto){
  
  await validarSolicitacaoParaAcao(
    dto.numsolicitacao,
    'recalcular rateio',
    ['A', 'P', 'L', 'F'],
    'O rateio só pode ser alterado enquanto a solicitação estiver pendente do solicitante, da controladoria ou do financeiro.'
  );

  const ssqlRecalcular = `
      UPDATE BSTAB_SOLICITADESPESA_RATEIO A SET A.VALOR = ((A.PERCENTUAL/100) * :valorDespesa)
      WHERE A.ID_SOLICITACAO = :numsolicitacao
  `;

  const ssqlConsultar = `
      SELECT A.ID_SOLICITACAO, A.ID_CENTRODECUSTO, CC.DESCRICAO, A.PERCENTUAL, A.VALOR
        FROM bstab_solicitadespesa_rateio A
        JOIN BSTAB_CENTRODECUSTO CC ON A.ID_CENTRODECUSTO = CC.ID_CENTRODECUSTO_ERP
      WHERE A.ID_SOLICITACAO = :id_solicitacao
    `;

  await executeQuery(ssqlRecalcular,{
    numsolicitacao: dto.numsolicitacao,
    valorDespesa: dto.valorDespesa
  }, true);

  const dados = await executeQuery(ssqlConsultar, {id_solicitacao: dto.numsolicitacao});
  return dados;
}

export async function addRateioModel(jsonReq) {
   
  try {
    await validarSolicitacaoParaAcao(
      jsonReq.numsolicitacao,
      'adicionar rateio',
      ['A', 'P'],
      'O rateio só pode ser alterado enquanto a solicitação estiver pendente do solicitante ou da controladoria.'
    );

    const ssqlAdd = `
    insert into bstab_solicitadespesa_rateio
      (id_centrodecusto, percentual, valor, id_solicitacao, ID_RATEIO)
    values
      (:id_centrodecusto, :percentual, :valor, :id_solicitacao, (SELECT NVL(MAX(A.ID_RATEIO)+1,1) FROM bstab_solicitadespesa_rateio A))
    `;

    const ssqlConsultar = `
      SELECT A.ID_SOLICITACAO, A.ID_CENTRODECUSTO, CC.DESCRICAO, A.PERCENTUAL, A.VALOR
        FROM bstab_solicitadespesa_rateio A
        JOIN BSTAB_CENTRODECUSTO CC ON A.ID_CENTRODECUSTO = CC.ID_CENTRODECUSTO_ERP
      WHERE A.ID_SOLICITACAO = :id_solicitacao
    `;

    const validarRateio = `
      SELECT SUM((I.QUANTIDADE * I.VLUNIT)) DESPESA,
          nvl(SUM((SELECT sum(A.VALOR)
                FROM BSTAB_SOLICITADESPESA_RATEIO A
                WHERE A.ID_SOLICITACAO = I.NUMSOLICITACAO)),0) RATEIO,
          nvl(SUM((I.QUANTIDADE * I.VLUNIT)),0) -
          nvl(SUM((SELECT sum(A.VALOR)
                FROM BSTAB_SOLICITADESPESA_RATEIO A
                WHERE A.ID_SOLICITACAO = I.NUMSOLICITACAO)),0) PENDENTE
      FROM BSTAB_SOLICITADESPESAI I
      WHERE I.NUMSOLICITACAO = :id_solicitacao
    `;

    const valida = await executeQuery(validarRateio, {id_solicitacao: jsonReq.numsolicitacao});    
    const pendente = valida[0].pendente ?? 0;
    
    if ( jsonReq.valor > pendente){
      throw new AppError('O valor do rateio utrapassa o valor da despesa.');
    }    

    await executeQuery(ssqlAdd, {
      id_centrodecusto: jsonReq.codCentroDeCusto, 
      percentual: jsonReq.perrateio, 
      valor: jsonReq.valor, 
      id_solicitacao: jsonReq.numsolicitacao
    }, true);

    const result = await executeQuery(ssqlConsultar, {id_solicitacao: jsonReq.numsolicitacao});
    return result;

  } catch (error) {
    throw error;
  }


}

async function atualizarRateioPorValorLiquido(numsolicitacao, valorLiquidoDespesa) {
  const valorBase = Number(valorLiquidoDespesa || 0);

  if (valorBase < 0) {
    throw new AppError('Despesa líquida não pode ser menor que R$ 0,00.', 400);
  }

  const ssqlRecalcularRateio = `
    UPDATE BSTAB_SOLICITADESPESA_RATEIO R
       SET R.VALOR = ROUND((NVL(R.PERCENTUAL, 0) / 100) * :valor_base, 2)
     WHERE R.ID_SOLICITACAO = :numsolicitacao
  `;

  await executeQuery(
    ssqlRecalcularRateio,
    {
      valor_base: valorBase,
      numsolicitacao
    },
    true
  );
}

export async function salvarVinculoValesModel(jsonReq) {

  try {
    await validarSolicitacaoParaAcao(
      jsonReq.numsolicitacao,
      'salvar vinculo de vales',
      ['L'],
      'Os vales só podem ser vinculados individualmente em solicitações de lote com status pendente do financeiro.'
    );

    const valesSelecionados = Array.isArray(jsonReq.valesSelecionados)
      ? jsonReq.valesSelecionados
      : [];

    const ssqlUpdateVale = `
      UPDATE BSTAB_VALE A
         SET A.ID_VICULOSOLCTDESPESA = :ID_VICULOSOLCTDESPESA
       WHERE A.ID_VALE = :ID_VALE
    `;

    const ssqlLimpaVinculo = `
      UPDATE BSTAB_VALE A
         SET A.ID_VICULOSOLCTDESPESA = NULL
       WHERE A.ID_VICULOSOLCTDESPESA = :ID_VICULOSOLCTDESPESA
    `;

    await executeQuery(
      ssqlLimpaVinculo,
      { ID_VICULOSOLCTDESPESA: jsonReq.numsolicitacao },
      true
    );

    for (const vale of valesSelecionados) {
      await executeQuery(
        ssqlUpdateVale,
        {
          ID_VICULOSOLCTDESPESA: jsonReq.numsolicitacao,
          ID_VALE: vale.id_vale
        },
        true
      );
    }

    return {
      numsolicitacao: jsonReq.numsolicitacao,
      quantidadeVales: valesSelecionados.length
    };

  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
}

export async function ordenarSolicitacaoModel(jsonReq) {

  try {
    await validarSolicitacaoParaAcao(
      jsonReq.numsolicitacao,
      'ordenar',
      ['EA', 'P', 'N'],
      'A solicitação só pode ser aprovada antes da etapa financeira.'
    );

    // -----------------------------
    // NORMALIZA VALORES OPCIONAIS
    // -----------------------------
    const valesSelecionados = Array.isArray(jsonReq.valesSelecionados)
      ? jsonReq.valesSelecionados
      : [];
    const origemLote = jsonReq.origemLote === true;

    // -----------------------------
    // SQLs
    // -----------------------------
    const ssqlUpdate = `
      UPDATE BSTAB_SOLICITADESPESAC C SET 
        C.STATUS = :vstatus,
        C.OBS_ORDENADOR = :obs_ordenador, 
        C.DATAHORAORDENADOR = SYSDATE, 
        C.ID_ORDENADOR = :id_ordenador
      WHERE C.NUMSOLICITACAO = :numsolicitacao
    `;

    const ssqlUpdateVale = `
      UPDATE BSTAB_VALE A 
        SET A.ID_VICULOSOLCTDESPESA = :ID_VICULOSOLCTDESPESA 
      WHERE A.ID_VALE = :ID_VALE
    `;

    const ssqlLimpaVinculo = `
      UPDATE BSTAB_VALE A 
        SET A.ID_VICULOSOLCTDESPESA = NULL 
      WHERE A.ID_VICULOSOLCTDESPESA = :ID_VICULOSOLCTDESPESA
    `;

    const ssqlValorDespesa = `
      SELECT NVL(SUM(NVL(I.QUANTIDADE,0) * NVL(I.VLUNIT,0)),0) VLDESPESA   
        FROM BSTAB_SOLICITADESPESAC C
        LEFT JOIN BSTAB_SOLICITADESPESAI I 
          ON (C.NUMSOLICITACAO = I.NUMSOLICITACAO)
      WHERE C.NUMSOLICITACAO = :NUMSOLICITACAO
    `;

    // -----------------------------
    // BUSCA VALOR DA DESPESA
    // -----------------------------
    const valorDespesa = await executeQuery(
      ssqlValorDespesa,
      { NUMSOLICITACAO: jsonReq.numsolicitacao }
    );

    const vlDespesa = Number(valorDespesa?.[0]?.vldespesa || 0);

    // -----------------------------
    // TOTAL DOS VALES
    // -----------------------------
    const totalvale = valesSelecionados.reduce(
      (acc, item) => acc + Number(item.valor || 0),
      0
    );
    const totalValeAplicadoNaDespesa = origemLote ? 0 : totalvale;

    // -----------------------------
    // VALIDAÇÃO
    // -----------------------------
    if ((vlDespesa - totalValeAplicadoNaDespesa) < 0) {
      throw 'Despesa não pode ser menor que R$ 0,00';
    }

    // -----------------------------
    // LIMPA VÍNCULOS ANTERIORES
    // -----------------------------
    await executeQuery(
      ssqlLimpaVinculo,
      { ID_VICULOSOLCTDESPESA: jsonReq.numsolicitacao },
      true
    );

    // -----------------------------
    // VINCULA NOVOS VALES
    // -----------------------------
    if (valesSelecionados.length > 0) {
      for (const vale of valesSelecionados) {
        await executeQuery(
          ssqlUpdateVale,
          {
            ID_VICULOSOLCTDESPESA: jsonReq.numsolicitacao,
            ID_VALE: vale.id_vale
          },
          true
        );
      }
    }

    if (!origemLote) {
      await atualizarRateioPorValorLiquido(jsonReq.numsolicitacao, vlDespesa - totalValeAplicadoNaDespesa);
    }

    // -----------------------------
    // ATUALIZA SOLICITAÇÃO
    // -----------------------------
    await executeQuery(
      ssqlUpdate,
      {
        vstatus: jsonReq.status,
        obs_ordenador: Buffer.from(jsonReq.obs_ordenador || ' ', 'utf-8'),
        id_ordenador: jsonReq.id_ordenador,
        numsolicitacao: jsonReq.numsolicitacao
      },
      true
    );

    // -----------------------------
    // RETORNO
    // -----------------------------
    await notificarSolicitacaoDepesa(jsonReq.numsolicitacao);

    return {
      numsolicitacao: jsonReq.numsolicitacao
    };

  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
}

export async function ordenarSolicitacoesLoteModel(jsonReq) {
  const connection = await getConnection();

  try {
    const idleitura = Number(jsonReq.idleitura ?? jsonReq.IDLEITURA ?? 0);

    if (!idleitura) {
      throw new AppError('ID da leitura é obrigatório para ordenar as solicitações do lote.', 400);
    }

    const ssqlSolicitacoes = `
      SELECT DISTINCT A.NUMSOLICITACAO
        FROM BSTAB_ANALISE_IMPORT_DESPESA A
       WHERE A.IDLEITURA = :idleitura
         AND A.NUMSOLICITACAO IS NOT NULL
    `;

    const solicitacoesResult = await connection.execute(
      `SELECT DISTINCT A.NUMSOLICITACAO, C.STATUS
         FROM BSTAB_ANALISE_IMPORT_DESPESA A
         JOIN BSTAB_SOLICITADESPESAC C ON C.NUMSOLICITACAO = A.NUMSOLICITACAO
        WHERE A.IDLEITURA = :idleitura
          AND A.NUMSOLICITACAO IS NOT NULL`,
      { idleitura },
      { outFormat: OracleDB.OUT_FORMAT_OBJECT }
    );

    validarSituacoesLoteParaAcao(solicitacoesResult.rows || [], 'ordenar lote', ['EA', 'P', 'N']);

    const numerosSolicitacao = (solicitacoesResult.rows || [])
      .map((item) => Number(item.NUMSOLICITACAO || item.numsolicitacao || 0))
      .filter((numero) => Number.isFinite(numero) && numero > 0);

    if (numerosSolicitacao.length === 0) {
      throw new AppError('Nenhuma solicitação gerada foi encontrada para este lote.', 404);
    }

    if (String(jsonReq.status || '').trim().toUpperCase() === 'L') {
      const orcamentoLote = await consultarResumoOrcamentoLote(connection, idleitura);

      if (orcamentoLote.ultrapassaOrcamento) {
        throw new AppError('Conta não tem mais orçamento disponível para este lote. Solicite análise da controladoria.', 400);
      }
    }

    const ssqlUpdate = `
      UPDATE BSTAB_SOLICITADESPESAC C
         SET C.STATUS = :status,
             C.OBS_ORDENADOR = :obs_ordenador,
             C.DATAHORAORDENADOR = SYSDATE,
             C.ID_ORDENADOR = :id_ordenador
       WHERE C.NUMSOLICITACAO IN (
         SELECT DISTINCT A.NUMSOLICITACAO
           FROM BSTAB_ANALISE_IMPORT_DESPESA A
          WHERE A.IDLEITURA = :idleitura
            AND A.NUMSOLICITACAO IS NOT NULL
       )
    `;

    await connection.execute(
      ssqlUpdate,
      {
        status: jsonReq.status,
        obs_ordenador: Buffer.from(jsonReq.obs_ordenador || ' ', 'utf-8'),
        id_ordenador: jsonReq.id_ordenador,
        idleitura
      },
      { autoCommit: true }
    );

    await notificarSolicitacaoLote(idleitura);

    return {
      idleitura,
      quantidadeAtualizada: numerosSolicitacao.length,
      numsolicitacoes: numerosSolicitacao,
      message: `Status do ordenador atualizado em ${numerosSolicitacao.length} solicitação(ões) do lote.`
    };

  } catch (error) {
    throw error;
  } finally {
    await connection.close();
  }
}

export async function direcionarSolicitacoesLoteModel(jsonReq) {
  const connection = await getConnection();

  try {
    const idleitura = Number(jsonReq.idleitura ?? jsonReq.IDLEITURA ?? 0);
    const idUserControladoria = Number(jsonReq.id_user_controladoria || 0);

    if (!idleitura) {
      throw new AppError('ID da leitura é obrigatório para direcionar as solicitações do lote.', 400);
    }

    if (!idUserControladoria) {
      throw new AppError('Código do usuário da controladoria é obrigatório para direcionar o lote.', 400);
    }

    const solicitacoesResult = await connection.execute(
      `SELECT DISTINCT A.NUMSOLICITACAO, C.STATUS
         FROM BSTAB_ANALISE_IMPORT_DESPESA A
         JOIN BSTAB_SOLICITADESPESAC C ON C.NUMSOLICITACAO = A.NUMSOLICITACAO
        WHERE A.IDLEITURA = :idleitura
          AND A.NUMSOLICITACAO IS NOT NULL`,
      { idleitura },
      { outFormat: OracleDB.OUT_FORMAT_OBJECT }
    );

    validarSituacoesLoteParaAcao(solicitacoesResult.rows || [], 'direcionar lote', ['A', 'EA', 'AJ']);

    const numerosSolicitacao = (solicitacoesResult.rows || [])
      .map((item) => Number(item.NUMSOLICITACAO || item.numsolicitacao || 0))
      .filter((numero) => Number.isFinite(numero) && numero > 0);

    if (numerosSolicitacao.length === 0) {
      throw new AppError('Nenhuma solicitação gerada foi encontrada para este lote.', 404);
    }

    const orcamentoLote = await consultarResumoOrcamentoLote(connection, idleitura);

    if (orcamentoLote.ultrapassaOrcamento) {
      throw new AppError('Conta não tem mais orçamento disponível para este lote. Ajuste o orçamento e atualize a tela antes de reenviar ao ordenador.', 400);
    }

    const ssqlUpdate = `
      UPDATE BSTAB_SOLICITADESPESAC C
         SET C.STATUS = 'EA',
             C.DATAHORACONTROLADORIA = SYSDATE,
             C.ID_USER_CONTROLADORIA = :id_user_controladoria
       WHERE C.NUMSOLICITACAO IN (
         SELECT DISTINCT A.NUMSOLICITACAO
           FROM BSTAB_ANALISE_IMPORT_DESPESA A
          WHERE A.IDLEITURA = :idleitura
            AND A.NUMSOLICITACAO IS NOT NULL
       )
    `;

    await connection.execute(
      ssqlUpdate,
      {
        id_user_controladoria: idUserControladoria,
        idleitura
      },
      { autoCommit: true }
    );

    await notificarSolicitacaoLote(idleitura);

    return {
      idleitura,
      quantidadeAtualizada: numerosSolicitacao.length,
      numsolicitacoes: numerosSolicitacao,
      message: `Solicitação(ões) do lote reenviadas para o ordenador com status EA.`
    };

  } catch (error) {
    throw error;
  } finally {
    await connection.close();
  }
}

export async function conformidadeSolicitacoesLoteModel(jsonReq) {
  const connection = await getConnection();

  try {
    const idleitura = Number(jsonReq.idleitura ?? jsonReq.IDLEITURA ?? 0);

    if (!idleitura) {
      throw new AppError('ID da leitura é obrigatório para a conformidade financeira do lote.', 400);
    }

    const solicitacoesResult = await connection.execute(
      `SELECT DISTINCT A.NUMSOLICITACAO, C.STATUS
         FROM BSTAB_ANALISE_IMPORT_DESPESA A
         JOIN BSTAB_SOLICITADESPESAC C ON C.NUMSOLICITACAO = A.NUMSOLICITACAO
        WHERE A.IDLEITURA = :idleitura
          AND A.NUMSOLICITACAO IS NOT NULL`,
      { idleitura },
      { outFormat: OracleDB.OUT_FORMAT_OBJECT }
    );

    validarSituacoesLoteParaAcao(solicitacoesResult.rows || [], 'conformidade', ['L', 'F']);

    const numerosSolicitacao = (solicitacoesResult.rows || [])
      .map((item) => Number(item.NUMSOLICITACAO || item.numsolicitacao || 0))
      .filter((numero) => Number.isFinite(numero) && numero > 0);

    if (numerosSolicitacao.length === 0) {
      throw new AppError('Nenhuma solicitação gerada foi encontrada para este lote.', 404);
    }

    const resultadosConformidade = [];

    for (const numeroSolicitacao of numerosSolicitacao) {
      const resultadoConformidade = await conformidadeSolicitacaoModel({
        ...jsonReq,
        numsolicitacao: numeroSolicitacao,
        valesSelecionados: [],
        suprimirNotificacaoLote: true
      });
      resultadosConformidade.push(resultadoConformidade);
    }

    await notificarSolicitacaoLote(idleitura);

    return {
      idleitura,
      quantidadeAtualizada: numerosSolicitacao.length,
      numsolicitacoes: numerosSolicitacao,
      resultadosConformidade,
      message: `Dados financeiros aplicados em ${numerosSolicitacao.length} solicitação(ões) do lote.`
    };

  } catch (error) {
    throw error;
  } finally {
    await connection.close();
  }
}

export async function conformidadeSolicitacaoModel(jsonReq) {
    
    try {
      const situacaoAtual = await validarSolicitacaoParaAcao(
        jsonReq.numsolicitacao,
        'conformidade',
        ['L', 'F'],
        'A conformidade financeira só pode ser realizada para solicitações pendentes do financeiro ou já finalizadas.'
      );

      let statusFinal = normalizarStatusSolicitacao(jsonReq.status || 'F');
  let mensagemIntegracao = null;

      // orderna solicitação
      const ssqlUpdate = `
       UPDATE BSTAB_SOLICITADESPESAC C SET 
       c.ID_ROTINA_INTEGRACAO = :ID_ROTINA_INTEGRACAO,
       C.STATUS = :vstatus,
       c.obs_financeiro = :obs_financeiro,
       c.datahorafinanceiro = sysdate,
       c.id_user_financeiro = :id_user_financeiro,
       c.id_caixabanco = :id_caixabanco,
       c.historico1 = :historico1,
       c.historico2 = :historico2
       WHERE C.NUMSOLICITACAO = :numsolicitacao 
      `;       
      
      // se status for F entao enviar solicitação para a api do Winthor
      const ssqlPost = `
            SELECT C.ID_FILIALDESPESA,                                                  
            CASE
              WHEN C.TIPOFORNECEDOR = 'fo' THEN
                (SELECT F.Id_Fornec_Erp
                  FROM BSTAB_FORNECEDOR F
                  WHERE F.ID_FORNEC_ERP = C.ID_FORNECEDOR
                    AND F.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
              WHEN C.TIPOFORNECEDOR = 'us' THEN
                (SELECT U.Id_Usuario_Erp
                  FROM BSTAB_USUSARIOS U
                  WHERE U.ID_USUARIO = C.ID_FORNECEDOR
                    AND U.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
            END ID_FORNECEDOR,  
            (SELECT CB.ID_BANCO_ERP FROM BSTAB_CAIXABANCO CB WHERE CB.ID_BANCO_ERP = C.ID_CAIXABANCO) ID_BANCO_ERP,                                                       
            C.NUMSOLICITACAO id_solicitacao, 
            C.DATASOLICITACAO,
            C.DATAESTIMADA,  
            C.HISTORICO1,                                         
            C.HISTORICO2,
            C.CODCONTAGERENCIAL,                                                        
            C.ID_ROTINA_INTEGRACAO, 
            (SELECT U.Id_Usuario_Erp
                  FROM BSTAB_USUSARIOS U
                  WHERE U.ID_USUARIO = C.Id_Solicitante
                    AND U.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA) ID_SOLICITANTE,                                                                   
            CASE
              WHEN C.TIPOFORNECEDOR = 'fo' THEN
                (SELECT F.FORNECEDOR
                  FROM BSTAB_FORNECEDOR F
                  WHERE F.ID_FORNEC_ERP = C.ID_FORNECEDOR
                    AND F.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
              WHEN C.TIPOFORNECEDOR = 'us' THEN
                (SELECT U.NOME
                  FROM BSTAB_USUSARIOS U
                  WHERE U.ID_USUARIO = C.ID_FORNECEDOR
                    AND U.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
            END FORNECEDOR,  
            CASE 
               WHEN C.TIPOFORNECEDOR = 'fo' then 'F'
               WHEN C.TIPOFORNECEDOR = 'us' then 'L'
            END TIPOFORNECEDOR,
            C.STATUS,
            U.NOME NOME_USUARIO,                                                         
            NVL(SUM(I.QUANTIDADE * I.VLUNIT),0)
            - CASE
                WHEN EXISTS (
                  SELECT 1
                    FROM BSTAB_ANALISE_IMPORT_DESPESA IMP
                   WHERE IMP.NUMSOLICITACAO = C.NUMSOLICITACAO
                ) THEN 0
                ELSE NVL((SELECT SUM(V.VALOR)
                            FROM BSTAB_VALE V
                           WHERE V.ID_VICULOSOLCTDESPESA = C.NUMSOLICITACAO),0)
              END VALOR_TOTAL                              
            FROM BSTAB_SOLICITADESPESAC C
            LEFT JOIN BSTAB_SOLICITADESPESAI I ON (C.NUMSOLICITACAO = I.NUMSOLICITACAO)
            LEFT JOIN BSTAB_USUSARIOS U  ON (U.ID_USUARIO = C.ID_SOLICITANTE AND U.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA)
            WHERE 1=1                                                             
            AND C.NUMSOLICITACAO = :numsolicitacao                                                                  
            AND C.CODCONTAGERENCIAL IS NOT NULL                                         
            GROUP BY C.ID_FILIALDESPESA,                                                
            C.ID_FORNECEDOR,                                                        
            C.CODCONTAGERENCIAL,                                                        
            C.NUMSOLICITACAO,                                                           
            U.NOME,   
            C.HISTORICO1,                                         
            C.HISTORICO2,
            C.CODCENTRODECUSTO,
            C.DATASOLICITACAO,
            C.DATAESTIMADA,
            C.TIPOFORNECEDOR,
            C.ID_GRUPO_EMPRESA,
            C.ID_ROTINA_INTEGRACAO ,
            C.STATUS,
            C.ID_SOLICITANTE,
            C.ID_CAIXABANCO
          `; 

      const ssqlHost = `
      SELECT H.HOST
        FROM BSTAB_SOLICITADESPESAC C, BSTAB_HOSTCLIENTES H
       WHERE 1=1
         AND H.ID_GRUPO_EMPRESAS = H.ID_GRUPO_EMPRESAS
         AND C.NUMSOLICITACAO = :numsolicitacao
      `;

      const ssqlCentroDeCusto = `
      SELECT A.ID_CENTRODECUSTO,
             A.PERCENTUAL,
             A.VALOR
          FROM BSTAB_SOLICITADESPESA_RATEIO A
        WHERE A.ID_SOLICITACAO = :numsolicitacao
      `

      const ssqlSicronizaERP = `
       UPDATE BSTAB_SOLICITADESPESAC A SET A.DATASICRONIZACAO_ERP = SYSDATE, STATUS = 'I' WHERE A.NUMSOLICITACAO = :numsolicitacao
      `;

      const ssqlEnviarOrdenador = `
       UPDATE BSTAB_SOLICITADESPESAC A SET A.DATASICRONIZACAO_ERP = SYSDATE, STATUS = 'EA' WHERE A.NUMSOLICITACAO = :numsolicitacao
      `;

      const ssqlPendenteIntegracao = `
       UPDATE BSTAB_SOLICITADESPESAC A SET A.DATASICRONIZACAO_ERP = SYSDATE, STATUS = 'F' WHERE A.NUMSOLICITACAO = :numsolicitacao
      `;


      const ssqlValorDespesa = `
        SELECT NVL(SUM(NVL(I.QUANTIDADE,0) * NVL(I.VLUNIT,0)),0) VLDESPESA   
          FROM BSTAB_SOLICITADESPESAC C
          LEFT JOIN BSTAB_SOLICITADESPESAI I ON (C.NUMSOLICITACAO = I.NUMSOLICITACAO)
        WHERE C.NUMSOLICITACAO = :NUMSOLICITACAO
      `;
      
      const valorDespesa = await executeQuery(ssqlValorDespesa, {NUMSOLICITACAO: jsonReq.numsolicitacao});      
      const valesSelecionados = Array.isArray(jsonReq.valesSelecionados) ? jsonReq.valesSelecionados : [];
      const origemLote = jsonReq.origemLote === true;
      const totalvale = valesSelecionados.reduce((acc, item) => acc + Number(item.valor || 0), 0);
      const totalValeAplicadoNaDespesa = origemLote ? 0 : totalvale;


      if ((valorDespesa[0].vldespesa - totalValeAplicadoNaDespesa) < 0){
        throw 'O valor total dos vales não pode ser maior que o valor total dos itens da solicitação.';
        
      }

      if (!origemLote) {
        await atualizarRateioPorValorLiquido(jsonReq.numsolicitacao, Number(valorDespesa?.[0]?.vldespesa || 0) - totalValeAplicadoNaDespesa);
      }
      
      if (!jsonReq.obs_financeiro) {
        await executeQuery(ssqlUpdate,{
          vstatus: jsonReq.status,
          obs_financeiro: Buffer.from(' ', 'utf-8'), 
          id_rotina_integracao: jsonReq.id_rotina_integracao,
          numsolicitacao: jsonReq.numsolicitacao,
          id_user_financeiro: jsonReq.id_user_financeiro ,
          id_caixabanco: jsonReq.id_caixabanco,
          historico1: jsonReq.historico1,
          historico2: jsonReq.historico2
        }, true); 
      }else{
        await executeQuery(ssqlUpdate,{
          vstatus: jsonReq.status,
          obs_financeiro: Buffer.from(jsonReq.obs_financeiro, 'utf-8'), 
          //id_ordenador: jsonReq.id_ordenador,
          id_rotina_integracao: jsonReq.id_rotina_integracao,
          numsolicitacao: jsonReq.numsolicitacao,
          id_user_financeiro: jsonReq.id_user_financeiro,
          id_caixabanco: jsonReq.id_caixabanco,
          historico1: jsonReq.historico1,
          historico2: jsonReq.historico2
        }, true); 
      }

      if (jsonReq.forcarPendenteIntegracao === true) {
        await executeQuery(ssqlPendenteIntegracao, {numsolicitacao: jsonReq.numsolicitacao}, true);

        mensagemIntegracao = jsonReq.mensagem_erro_vale || 'Falha ao integrar a solicitação com o cliente.';

        if (jsonReq.suprimirNotificacaoLote !== true) {
          await notificarSolicitacaoDepesa(jsonReq.numsolicitacao);
        }

        return {
          numsolicitacao: jsonReq.numsolicitacao,
          status_antes: situacaoAtual.status || null,
          status_final: 'F',
          mensagem_integracao: mensagemIntegracao
        };
      }
                     
      const jsonPostClient = await executeQuery(ssqlPost,{numsolicitacao: jsonReq.numsolicitacao});               
      const jsonPostRateio = await executeQuery(ssqlCentroDeCusto, {numsolicitacao: jsonReq.numsolicitacao});      
      jsonPostClient[0].rateio = jsonPostRateio;     

      
      const hostClient = await executeQuery(ssqlHost, {numsolicitacao: jsonReq.numsolicitacao});  
      
      if (Number(jsonReq.id_rotina_integracao) === 99999) {

          // Rejeicao financeira deve retornar para o ordenador revisar novamente.
          await executeQuery(ssqlEnviarOrdenador, {numsolicitacao: jsonReq.numsolicitacao}, true);
            statusFinal = 'EA';

      } else {

          try {

            const respose = await axios.post(hostClient[0].host+`/v1/SolicitaDespesa`, jsonPostClient[0], authApiClient);

            if (respose.status == 200 ){
              await executeQuery(ssqlSicronizaERP, {numsolicitacao: jsonReq.numsolicitacao}, true);
              statusFinal = 'I';
            }

          } catch (error) {

            await executeQuery(ssqlPendenteIntegracao, {numsolicitacao: jsonReq.numsolicitacao}, true);
            statusFinal = 'F';
            mensagemIntegracao = error?.response?.data?.message
              || error?.response?.data?.error
              || error?.message
              || 'Erro ao integrar despesa com o cliente.';

            console.log(error.error)
            console.log('Erro ao integrar despesa com Winhor: '+error.error)
          }

      }
                 
      if (jsonReq.suprimirNotificacaoLote !== true) {
        await notificarSolicitacaoDepesa(jsonReq.numsolicitacao);
      }

      return {
        numsolicitacao: jsonReq.numsolicitacao,
        status_antes: situacaoAtual.status || null,
        status_final: statusFinal || null,
        mensagem_integracao: mensagemIntegracao
      };      

    } catch (error) {
      throw new Error(error); 
    }

}

export async function buscarDespesas(integracao) {

  

  try {
                                          
      // consultar na api do cliente  
      const respose = await axios.get(integracao.host+`/v1/DespesaIntegracao`, authApiClient);  
      
      if (respose.status == 200){            
          // Atualiza na base do intranet
          await armazenarDespesas(respose.data);                                            
          await atualizaDataProximaAtualizcao(integracao.id_servidor, integracao.id_integracao);  
      }

  } catch (error) {
      console.log("Erro ao integrar despesas id host: "+integracao.host)        
      console.log(error)        
  }

}

export async function armazenarDespesas(dataDespesas) {
  // mudar o for para esta função para trabalhar melhor as transações  do banco


  function formatDateTime(value) {
    return value && moment(value).isValid()
      ? moment(value).format('DD/MM/YYYY HH:mm:ss')
      : null;
  }
  
  function formatDateOnly(value) {
    return value && moment(value).isValid()
      ? moment(value).format('DD/MM/YYYY')
      : null;
  }

  const ssqlProximoNum = `
  select bsseq_numsolicitacao.nextval proxnum from dual
  `

  const ssqlConsulta = `
  SELECT S.NUMSOLICITACAO_ERP, 
       S.NUMSOLICITACAO, 
       S.GRUPO_DE_EMPRESA
  FROM BSTAB_VINCULODESPES_ERP S
 WHERE S.NUMSOLICITACAO_ERP = :numsolicitacao_erp
   AND S.GRUPO_DE_EMPRESA = :grupo_de_empresa
  `


  const ssqlInsertcab = `
  insert into bstab_solicitadespesac
  (numsolicitacao, datasolicitacao, id_solicitante, id_filialdespesa, dataestimada, objetivo, id_empresasolicitante, status, codcontagerencial, codcentrodecusto, datahoracontroladoria, id_grupo_empresa, obs_ordenador, datahoraordenador, id_ordenador, id_user_controladoria, id_fornecedor_erp, fornec_emitente, datasicronizacao_erp)
  values
  (:numsolicitacao, :datasolicitacao, :id_solicitante, :id_filialdespesa, :dataestimada, :objetivo, :id_empresasolicitante, :status, :codcontagerencial, :codcentrodecusto, :datahoracontroladoria, :id_grupo_empresa, :obs_ordenador, :datahoraordenador, :id_ordenador, :id_user_controladoria, :id_fornecedor_erp, :fornec_emitente, sysdate)
  `;

  const ssqlInsertVinculo = `
  INSERT INTO BSTAB_VINCULODESPES_ERP
  (NUMSOLICITACAO_ERP, NUMSOLICITACAO, GRUPO_DE_EMPRESA)
  VALUES
  (:NUMSOLICITACAO_ERP, :NUMSOLICITACAO, :GRUPO_DE_EMPRESA)
  `;

  const ssqlInsertItem = `
  insert into bstab_solicitadespesai
  (numsolicitacao, id_item, quantidade, vlunit)
  values
  (:numsolicitacao, :id_item, :quantidade, :vlunit)
  `;

  const ssqlUpdateCab = `
    update bstab_solicitadespesac
   set datasolicitacao = :datasolicitacao,
       id_solicitante = :id_solicitante,
       id_filialdespesa = :id_filialdespesa,
       dataestimada = :dataestimada,
       objetivo = :objetivo,
       id_empresasolicitante = :id_empresasolicitante,
       status = :status,
       codcontagerencial = :codcontagerencial,
       codcentrodecusto = :codcentrodecusto,
       datahoracontroladoria = :datahoracontroladoria,
       id_grupo_empresa = :id_grupo_empresa,
       obs_ordenador = :obs_ordenador,
       datahoraordenador = :datahoraordenador,
       id_ordenador = :id_ordenador,
       id_user_controladoria = :id_user_controladoria,
       id_fornecedor_erp = :id_fornecedor_erp,
       fornec_emitente = :fornec_emitente,
       datasicronizacao_erp = sysdate
 where numsolicitacao = :numsolicitacao 
  `;

  const ssqlUpdateItem = `
  update bstab_solicitadespesai
   set 
       id_item = :id_item,
       quantidade = :quantidade,
       vlunit = :vlunit
   where numsolicitacao = :numsolicitacao
  `;
  
  const connection = await getConnection();
  try {
    
    for (const despesa of dataDespesas){
      
        const validar = await connection.execute(ssqlConsulta, {
            numsolicitacao_erp: despesa.recnum,
            grupo_de_empresa: despesa.id_grupo_empresa  
        }, { outFormat: OracleDB.OUT_FORMAT_OBJECT }); 


        if (validar.rows.length > 0 ){
          //update
          console.log('update')      
          await connection.execute(ssqlUpdateCab,{
            numsolicitacao: validar.rows[0].NUMSOLICITACAO,
            datasolicitacao: formatDateOnly(despesa.datalanc),
            id_solicitante: despesa.matriculalanc,
            id_filialdespesa: despesa.id_filialdespesa,
            dataestimada: formatDateOnly(despesa.dataestimada),
            objetivo: Buffer.from(despesa.objetivo || '', 'utf-8'),
            id_empresasolicitante: despesa.empresasolicitante,
            status: despesa.status,
            codcontagerencial: despesa.codconta,
            codcentrodecusto: despesa.codcentrodecusto,
            datahoracontroladoria: formatDateOnly(despesa.datahoracontroladoria),
            id_grupo_empresa: despesa.id_grupo_empresa,
            obs_ordenador: Buffer.from(despesa.obs_ordenador || '', 'utf-8'),
            datahoraordenador: formatDateOnly(despesa.datahoraordenador),
            id_ordenador: despesa.id_ordenador,
            id_user_controladoria: despesa.id_controladoria,
            id_fornecedor_erp: despesa.id_fornecedor_erp,
            fornec_emitente: despesa.fornec_emitente
          })

        }else{
          
          console.log(`Inserido: ${despesa.recnum}`);

          const proxnum = await connection.execute(ssqlProximoNum, [] ,  { outFormat: OracleDB.OUT_FORMAT_OBJECT });  
          await connection.execute(ssqlInsertcab, {
            numsolicitacao: proxnum.rows[0].PROXNUM,
            datasolicitacao: formatDateOnly(despesa.datalanc),
            id_solicitante: despesa.matriculalanc,
            id_filialdespesa: despesa.id_filialdespesa,
            dataestimada: formatDateOnly(despesa.dataestimada),
            objetivo: Buffer.from(despesa.objetivo || '', 'utf-8'),
            id_empresasolicitante: despesa.empresasolicitante,
            status: despesa.status,
            codcontagerencial: despesa.codconta,
            codcentrodecusto: despesa.codcentrodecusto,
            datahoracontroladoria: formatDateOnly(despesa.datahoracontroladoria),
            id_grupo_empresa: despesa.id_grupo_empresa,
            obs_ordenador: Buffer.from(despesa.obs_ordenador || '', 'utf-8'),
            datahoraordenador: formatDateOnly(despesa.datahoraordenador),
            id_ordenador: despesa.id_ordenador,
            id_user_controladoria: despesa.id_controladoria,
            id_fornecedor_erp: despesa.id_fornecedor_erp,
            fornec_emitente: despesa.fornec_emitente
          });

          // insert item
          await connection.execute(ssqlInsertItem,{
            numsolicitacao: proxnum.rows[0].PROXNUM, 
            id_item: 0, 
            quantidade: 1, 
            vlunit: despesa.valor
          });

          await connection.execute(ssqlInsertVinculo,{
            NUMSOLICITACAO_ERP: despesa.recnum, 
            NUMSOLICITACAO: proxnum.rows[0].PROXNUM, 
            GRUPO_DE_EMPRESA: despesa.id_grupo_empresa 
          });

        }
    
        await connection.commit();
    
     }



  } catch (error) {
    await connection.rollback();
    throw error;
  }finally{
    await connection.close();
  }
  
}

// ─────────────────────────────────────────────────────────────
// HISTÓRICO DE FLUXO DA SOLICITAÇÃO DE DESPESA
// ─────────────────────────────────────────────────────────────

/**
 * Registra uma entrada no histórico do fluxo da solicitação.
 * @param {object} dto
 * @param {number} dto.numsolicitacao
 * @param {number} dto.id_grupo_empresa
 * @param {string} dto.etapa          - Ex: 'SOLICITACAO' | 'CONTROLADORIA' | 'ORDENADOR' | 'FINANCEIRO'
 * @param {string} dto.status_antes   - Status anterior (pode ser null)
 * @param {string} dto.status_depois  - Novo status
 * @param {number} dto.id_usuario
 * @param {string} dto.nome_usuario
 * @param {string} [dto.observacao]
 */
export async function inserirHistoricoSolicitacaoModel(dto) {

  const idUsuario = dto.id_usuario;

  const ssql = `
    INSERT INTO BSTAB_SOLICITADESPESA_HISTORICO (
      ID_HISTORICO, NUMSOLICITACAO, ID_GRUPO_EMPRESA,
      ETAPA, STATUS_ANTES, STATUS_DEPOIS,
      ID_USUARIO, NOME_USUARIO, OBSERVACAO, DATAHORA
    ) VALUES (
      SEQ_SOLICITADESPESA_HISTORICO.NEXTVAL,
      :numsolicitacao, :id_grupo_empresa,
      :etapa, :status_antes, :status_depois,
      :id_usuario, :nome_usuario, :observacao, SYSDATE
    )
  `;

  await executeQuery(ssql, {
    numsolicitacao:   dto.numsolicitacao,
    id_grupo_empresa: dto.id_grupo_empresa,
    etapa:            dto.etapa,
    status_antes:     dto.status_antes || null,
    status_depois:    dto.status_depois,
    id_usuario:       idUsuario,
    nome_usuario:     null,
    observacao:       dto.observacao || null,
  }, true);
}

/**
 * Consulta o histórico completo de uma solicitação, ordenado por data.
 */
export async function consultarHistoricoSolicitacaoModel(numsolicitacao) {
  const ssql = `
    SELECT
      H.ID_HISTORICO,
      H.ETAPA,
      H.STATUS_ANTES,
      H.STATUS_DEPOIS,
      H.ID_USUARIO,
      U.NOME AS NOME_USUARIO,
      DBMS_LOB.SUBSTR(H.OBSERVACAO, 4000, 1) AS OBSERVACAO,
      H.DATAHORA
    FROM BSTAB_SOLICITADESPESA_HISTORICO H
    LEFT JOIN BSTAB_USUSARIOS U ON U.ID_USUARIO = H.ID_USUARIO
    WHERE H.NUMSOLICITACAO = :numsolicitacao
    ORDER BY H.DATAHORA DESC
  `;

  const result = await executeQuery(ssql, { numsolicitacao });
  return result;
}