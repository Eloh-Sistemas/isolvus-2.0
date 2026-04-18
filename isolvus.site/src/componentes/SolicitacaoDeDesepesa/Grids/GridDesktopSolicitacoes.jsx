import moment from "moment";
import "./GridDesktopSolicitacoes.css";
import StatusSolicitacaoDespesa from "../Status/StatusSolicitacaoDespesa";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function GridDesktopSolicitacao(props){

    const [btnTimeLineVisible, SetbtnTimeLineVisible] = useState(true);
    const [btnEditar, SetbtnEditar] = useState(true);
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

    return<>
      <div className="table-desktop-consultasolicitacao">
        <table className="table table-hover">
  <thead className="Titulos-Table">
    <tr>
      <th>
        <div>Nº</div> 
        <div>TIPO</div>
      </th>
      <th className="col-2">
        <div>Filial</div> 
        <div>Solicitante</div>
      </th>
      <th >
        <div>Data Solicitada</div> 
        <div>Data Estimada</div>
      </th>
      <th>
        <div>Conta Gerencial</div>
      </th>      
      <th>
        <div>Parceiro</div>
      </th>
      <th>Forma de Pagamento</th>
      <th>Dados Bancario</th>
      <th>
        <div>R$ Valor</div>
      </th>
      <th className="text-center">Situação</th>
      <th className="text-center">Opções</th>
    </tr>
  </thead>
  <tbody>
    {props.dados.map((i) => {
      const podeEditarLinha = ['A', 'P'].includes(getStatusLinha(i)) && !isLinhaBloqueadaPosFinanceiro(i) && !isLinhaPendenteFinanceiro(i);
      const podeDirecionarLinha = ['A', 'AJ'].includes(getStatusLinha(i)) && !isLinhaBloqueadaPosFinanceiro(i) && !isLinhaPendenteFinanceiro(i);
      const podeOrdenarLinha = ['EA', 'P', 'N'].includes(getStatusLinha(i)) && !isLinhaBloqueadaPosFinanceiro(i) && !isLinhaPendenteFinanceiro(i);
      const tituloConformidade = getStatusLinha(i) === 'L' && !isLinhaBloqueadaPosFinanceiro(i)
        ? 'Conformidade'
        : 'Visualizar';

      return (
      <tr key={isImportacaoLote(i) ? `importacao-${i.idleitura_importacao ?? i.IDLEITURA_IMPORTACAO}` : i.numsolicitacao} className="linha-grid-desktop-analisedespesa">
        <td>
          
          
          {
            <div>
                {isImportacaoLote(i) ? `LOTE #${i.idleitura_importacao ?? i.IDLEITURA_IMPORTACAO}` : i.numsolicitacao}
            </div>
          }

          {
            <div>
                {i.tipodedespesa}
            </div>
          }

          {isImportacaoLote(i) && (
            <div>
                {Number(i.qtd_solicitacoes_importacao ?? i.QTD_SOLICITACOES_IMPORTACAO ?? 0)} solicitação(ões)
            </div>
          )}

          {isImportacaoLote(i) && (
            <div className="text-muted small" title={i.descricao_lote ?? i.descricao_importacao ?? i.DESCRICAO_IMPORTACAO ?? ''}>
                {i.descricao_lote ?? i.descricao_importacao ?? i.DESCRICAO_IMPORTACAO ?? ''}
            </div>
          )}

        </td>
        
        {/* Solicitação */}
        <td className="col-2">
          {i.id_solicitante && i.nome && (
            <div className="grid-solicitante-avatar-wrap">
              <div className="grid-solicitante-avatar">
                {i.foto
                  ? <img src={i.foto} alt={i.nome} className="grid-solicitante-avatar-img" />
                  : (i.nome || 'U').charAt(0).toUpperCase()
                }
              </div>
              <div className="grid-solicitante-info">
                <span>{i.nome}</span>
                {i.id_filialdespesa && i.filialdespesa && (
                  <span className="grid-solicitante-filial">FILIAL: {i.id_filialdespesa}</span>
                )}
              </div>
            </div>
          )}          
        </td>      

        {/* Datas */}
        <td className="col-1">
          {i.datasolicitacao && (
            <div>{moment(i.datasolicitacao).utc().format("DD/MM/YYYY")}</div>
          )}
          {!isImportacaoLote(i) && i.dataestimada && (
            <div>{moment(i.dataestimada).utc().format("DD/MM/YYYY")}</div>
          )}
        </td>

        {/* Conta gerencial */}
        <td className="col-2">
          {isImportacaoLote(i) ? (
            <div title={Array.isArray(i.contasAgrupadas) ? i.contasAgrupadas.join(', ') : ''}>
              {Number(i.qtd_contas_importacao ?? i.QTD_CONTAS_IMPORTACAO ?? 0)} conta(s)
            </div>
          ) : ((i.codcontagerencial || i.conta_gernecial) && (
            <div title={i.conta_gernecial}>
              {i.codcontagerencial ? `${i.conta_gernecial ?? ''}` : i.conta_gernecial ?? ''}
            </div>
          ))}

        </td>        

        <td className="col-2">        
          {isImportacaoLote(i) ? (
            <div title={Array.isArray(i.parceirosAgrupados) ? i.parceirosAgrupados.join(', ') : ''}>
              {Number(i.qtd_parceiros_importacao ?? i.QTD_PARCEIROS_IMPORTACAO ?? 0)} parceiro(s)
            </div>
          ) : (!isImportacaoLote(i) && (i.fornecedor) && (
            <>
              {i.fornecedor && <div>{i.fornecedor}</div>}
            </>
          ))}
        </td>
                         

        {/* Forma de pagamento */}
        <td className="col-2">
          {isImportacaoLote(i) ? (
            <div title={Array.isArray(i.formasPagamentoAgrupadas) ? i.formasPagamentoAgrupadas.join(', ') : ''}>
              {Number(i.qtd_formas_pagamento_importacao ?? 0)} forma(s) de pagamento
            </div>
          ) : ((i.formadepagamento) && (
            <>
              {i.formadepagamento && <div>{i.formadepagamento}</div>}
            </>
          ))}
        </td>

        <td className="col-1">
          {isImportacaoLote(i) ? (
            <div title={Array.isArray(i.dadosBancariosAgrupados) ? i.dadosBancariosAgrupados.join(' | ') : ''}>
              {Number(i.qtd_dados_bancarios_importacao ?? 0)} dado(s) bancário(s)
            </div>
          ) : (
            <>
              {!isImportacaoLote(i) && (i.banco) && (
                <>
                  {i.banco && <div>{i.banco}</div>}
                </>
              )}

              {!isImportacaoLote(i) && (i.agencia && i.contabancaria && i.operacao) && (
                <>
                  {i.banco &&
                    <div>AG: {i.agencia} / CC: {i.contabancaria} / OP: {i.operacao}</div>
                  }
                </>
              )}

              {!isImportacaoLote(i) && (i.chavepix) && (
                <>
                  {i.chavepix &&
                    <div>CHAVE: {i.chavepix}</div>
                  }
                </>
              )}
            </>
          )}

        </td>
        
        {/* Valores */}
        <td>           
          {i.vltotal !== undefined && i.vltotal !== null && (
            <div>{new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(i.vltotal)}</div>            
          )}  
         
        </td>

        {/* Situação */}
        <td  className="col-2 text-center">{i.status && <StatusSolicitacaoDespesa status={i.status} rotina={i.id_rotina_integracao}/>}</td>

        {/* Ações */}
        <td className=" col-1 text-center">
          {/*btnTimeLineVisible && <button className="btn btn-warning btn-sm me-1" title="Timeline"><i className="bi bi-list-check"></i></button>*/}
          {btnEditar && <button className="btn btn-secondary btn-sm me-1" title={podeEditarLinha ? "Editar" : "Visualizar"} onClick={() => props.EditarSolcitacao(i)}><i className="bi bi-pencil-square"></i></button>}
          {btnDirecionar && <button className="btn btn-secondary btn-sm me-1" title={podeDirecionarLinha ? "Direcionar" : "Visualizar"} onClick={() => props.DirecionarSolicitacao(i)}><i className="bi bi-send"></i></button>}
          {btnOrdenar && <button className="btn btn-success btn-sm me-1" title={podeOrdenarLinha ? "Ordenar" : "Visualizar"} onClick={() => props.OrdenarSolicitacao(i)}><i className="bi bi-check2"></i></button>}
          {btnlinkar && <button className="btn btn-secondary btn-sm me-1" title={tituloConformidade} onClick={() => props.ConformidadeSolicitacao(i)}><i className="bi bi-link"></i></button>}
        </td>
      </tr>
      );
      })}
      </tbody>
      </table>
    </div>
    </>
}

export default GridDesktopSolicitacao;