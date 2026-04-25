import moment from "moment";
import StatusSolicitacaoDespesa from "../Status/StatusSolicitacaoDespesa";
import "./GridMobileSolicitacoes.css";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../servidor/api";

function GridMobileSolicitacoes(props) {

    const [btnTimeLineVisible, SetbtnTimeLineVisible] = useState(true);
    const [btnEditar, SetbtnEditar] = useState(true);
    
    const construirUrlFoto = (foto) => {
        if (!foto) return null;
        if (foto.startsWith('/midias/')) {
            return `${api.defaults.baseURL}${foto}`;
        }
        return foto;
    };
    const [btnDirecionar, SetbtnDirecionar] = useState(true);
    const [btnOrdenar, SetbtnOrdenar] = useState(true);
    const [btnlinkar, Setbtnlinkarr] = useState(true);
    const {tipoConsulta} = useParams();

    
    function tipoTela(){

        if (tipoConsulta == "Solicitar"){
            SetbtnTimeLineVisible(true);
            SetbtnEditar(true);
            SetbtnDirecionar(false);
            SetbtnOrdenar(false);
            Setbtnlinkarr(false);
        }else if (tipoConsulta == "Direcionar"){
            SetbtnTimeLineVisible(true);
            SetbtnEditar(false);
            SetbtnDirecionar(true);
            SetbtnOrdenar(false);
            Setbtnlinkarr(false);
        }else if (tipoConsulta == "Aprovar"){
            SetbtnTimeLineVisible(true);
            SetbtnEditar(false);
            SetbtnDirecionar(false);
            SetbtnOrdenar(true);
            Setbtnlinkarr(false);
        }else if (tipoConsulta == "Conformidade"){
            SetbtnTimeLineVisible(false);
            SetbtnEditar(false);
            SetbtnDirecionar(false);
            SetbtnOrdenar(false);
            Setbtnlinkarr(true);
        }
        
    }

    useEffect(() => {
        tipoTela();
    },[])

    const isImportacaoLote = (item) => {
        const valorImportacao = item?.isImportacaoLote ?? item?.is_importacao_lote ?? item?.IS_IMPORTACAO_LOTE ?? 'N';
        return valorImportacao === true || String(valorImportacao).toUpperCase() === 'S';
    };

    const getStatusLinha = (item) => {
        const status = item?.status ?? item?.STATUS_SOLICITACAO ?? '';
        return String(status || '').trim().toUpperCase();
    };

    const possuiStatusAgrupado = (item, listaStatus = []) => {
        const statusesAgrupados = Array.isArray(item?.statusesAgrupados) ? item.statusesAgrupados : [];
        return statusesAgrupados.some((statusItem) => listaStatus.includes(String(statusItem || '').trim().toUpperCase()));
    };

    const isLinhaBloqueadaPosFinanceiro = (item) => {
        const flagBloqueio = item?.bloqueadoPosFinanceiroImportacao ?? item?.BLOQUEADO_POS_FINANCEIRO_IMPORTACAO ?? 'N';
        return flagBloqueio === true
            || String(flagBloqueio).toUpperCase() === 'S'
            || ['F', 'I'].includes(getStatusLinha(item))
            || possuiStatusAgrupado(item, ['F', 'I']);
    };

    const isLinhaPendenteFinanceiro = (item) => {
        const flagPendenteFinanceiro = item?.pendenteFinanceiroImportacao ?? item?.PENDENTE_FINANCEIRO_IMPORTACAO ?? 'N';
        return flagPendenteFinanceiro === true
            || String(flagPendenteFinanceiro).toUpperCase() === 'S'
            || getStatusLinha(item) === 'L'
            || possuiStatusAgrupado(item, ['L']);
    };

    return <>        
        <div className="mt-4">
            {
                props.dados.map( (i) => {                    
                    const podeEditarLinha = ['A', 'P'].includes(getStatusLinha(i)) && !isLinhaBloqueadaPosFinanceiro(i) && !isLinhaPendenteFinanceiro(i);
                    const podeDirecionarLinha = ['A', 'AJ'].includes(getStatusLinha(i)) && !isLinhaBloqueadaPosFinanceiro(i) && !isLinhaPendenteFinanceiro(i);
                    const podeOrdenarLinha = ['EA', 'P', 'N'].includes(getStatusLinha(i)) && !isLinhaBloqueadaPosFinanceiro(i) && !isLinhaPendenteFinanceiro(i);
                    const tituloConformidade = getStatusLinha(i) === 'L' && !isLinhaBloqueadaPosFinanceiro(i)
                        ? 'Conformidade'
                        : 'Visualizar';

                   return <div key={isImportacaoLote(i) ? `importacao-${i.idleitura_importacao ?? i.IDLEITURA_IMPORTACAO}` : i.numsolicitacao} className="item-consulta-solicitacao" > 

                        <div className="item-mobile-topo">
                            <div className="grid-solicitante-avatar item-mobile-avatar">
                                {i.foto && construirUrlFoto(i.foto)
                                    ? <img src={construirUrlFoto(i.foto)} alt={i.nome} className="grid-solicitante-avatar-img" />
                                    : (i.nome || 'U').charAt(0).toUpperCase()
                                }
                            </div>
                            <div className="grid-solicitante-info">
                                <span className="item-mobile-nome">{i.nome}</span>
                                <span className="grid-solicitante-filial">{i.id_filialdespesa} - {i.filialdespesa}</span>
                            </div>
                        </div>

                        <hr/>

                        <div className="col-12 d-flex w-100 justify-content-between align-items-center">                             
                            <p className="mt-1 mb-0"><label>Solicitação:</label> {isImportacaoLote(i) ? `LOTE #${i.idleitura_importacao ?? i.IDLEITURA_IMPORTACAO}` : i.numsolicitacao}</p>
                            <div>
                                {<StatusSolicitacaoDespesa status={i.status} rotina={i.id_rotina_integracao}/>}
                            </div>
                        </div>

                        <hr/>

                        <div>
                            <p><label>TIPO:</label> {i.tipodedespesa}</p>
                            {isImportacaoLote(i) ? <p><label>AGRUPAMENTO:</label> {Number(i.qtd_solicitacoes_importacao ?? i.QTD_SOLICITACOES_IMPORTACAO ?? 0)} solicitação(ões) do lote</p> : null}
                            {isImportacaoLote(i) ? <p><label>DESCRIÇÃO DO LOTE:</label> {i.descricao_lote ?? i.descricao_importacao ?? i.DESCRICAO_IMPORTACAO ?? '-'}</p> : null}
                        </div>
                                                
                        <div>                            
                            <p><label>SOLICITADO:</label> {moment(i.datasolicitacao).utc().format("DD/MM/YYYY")}</p>
                        </div>

                        {!isImportacaoLote(i) && (
                            <div>                            
                                <p><label>ESTIMADA:</label> {moment(i.dataestimada).utc().format("DD/MM/YYYY")}</p>
                            </div>
                        )}

                        
                        <div className="">                            
                            <p><label>CONTA:</label> {isImportacaoLote(i)
                                ? `${Number(i.qtd_contas_importacao ?? i.QTD_CONTAS_IMPORTACAO ?? 0)} conta(s)`
                                : (i.codcontagerencial ? `${i.codcontagerencial} - ${i.conta_gernecial ?? ''}` : i.conta_gernecial ?? '')}</p>                            
                        </div>


                        <div className="">                            
                            <p><label>PARCEIRO:</label> {isImportacaoLote(i)
                                ? `${Number(i.qtd_parceiros_importacao ?? i.QTD_PARCEIROS_IMPORTACAO ?? 0)} parceiro(s)`
                                : (i.fornecedor ?? '-')}</p>                           
                        </div>

                        <div className="">
                            <p><label>FORMA DE PAGAMENTO:</label> {isImportacaoLote(i)
                                ? `${Number(i.qtd_formas_pagamento_importacao ?? 0)} forma(s) de pagamento`
                                : (i.formadepagamento ?? '-')}</p>
                        </div>

                        <div className="">
                            <p><label>DADOS BANCÁRIOS:</label> {isImportacaoLote(i)
                                ? `${Number(i.qtd_dados_bancarios_importacao ?? 0)} dado(s) bancário(s)`
                                : (i.chavepix ? `PIX: ${i.chavepix}` : `${i.banco ?? '-'}${i.agencia ? ` / AG: ${i.agencia}` : ''}${i.contabancaria ? ` / CC: ${i.contabancaria}` : ''}${i.operacao ? ` / OP: ${i.operacao}` : ''}`)}</p>
                        </div>

                        <div className="">                            
                            <p><label>VALOR TOTAL:</label> {new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.vltotal)}</p>                            
                        </div>

                        <hr/>
                        
                        <div className="mt-3 mb-2">  
                        
                        {
                        btnEditar == true ?                             
                            <button  className="btn btn-secondary me-2" id="button-grid-desktop-despesas" onClick={() => props.EditarSolcitacao(i)} title={podeEditarLinha ? 'Editar' : 'Visualizar'}><i className="bi bi-pencil-square"></i></button>
                            : null                                          
                        }
                        
                        {
                            btnDirecionar == true ? 
                                <button className="btn btn-secondary me-2" id="button-grid-desktop-despesas" onClick={() => props.DirecionarSolicitacao(i)} title={podeDirecionarLinha ? 'Direcionar' : 'Visualizar'}><i className="bi bi-send"></i></button>                             
                            : null
                        }

                        {
                        btnOrdenar && 
                            <button className="btn btn-secondary me-2" id="button-grid-desktop-despesas" onClick={() => props.OrdenarSolicitacao(i)} title={podeOrdenarLinha ? 'Ordenar' : 'Visualizar'}><i className="bi bi-check2"></i></button>                             
                       }  

                        {btnlinkar && <button className="btn btn-secondary me-2" id="button-grid-desktop-despesas" onClick={() => props.ConformidadeSolicitacao(i)} title={tituloConformidade}><i className="bi bi-link"></i></button>}
                        </div>

                   </div>
                })
            }
        </div>           
    </>
}

export default GridMobileSolicitacoes;