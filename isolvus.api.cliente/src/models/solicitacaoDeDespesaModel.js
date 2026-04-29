import OracleDB from "oracledb";
import { executeQuery, getConnection } from "../config/database.js";

export async function registrarSolicitacao(jsonReq) {

    //console.log(jsonReq);

    const ssqlConsultarProxNumLanc = `
        SELECT NVL(MAX(PROXNUMLANC),1) PROXNUMLANC FROM PCCONSUM
    `;

    const ssqlConsultaProxNumTrans = `
        SELECT NVL(PROXNUMTRANS,1) PROXNUMTRANS FROM PCCONSUM
    `;

    const ssqlUpdateProxNumtrans = `
        UPDATE PCCONSUM SET PROXNUMTRANS = NVL(PROXNUMTRANS,1) + 1
    `

    const ssqlUpdateProxNumLanc = `
        UPDATE PCCONSUM SET PROXNUMLANC = NVL(PROXNUMLANC,1) + 1 
    `;

    const ssqlInsert749 = 
    `
            INSERT INTO PCLANC (
            RECNUM,                     -- Número único de registro do lançamento
            DTLANC,                     -- Data do lançamento
            HISTORICO,                  -- Descrição principal do histórico
            DUPLIC,                     -- Número da duplicata
            CODFILIAL,                  -- Código da filial onde o lançamento foi feito
            INDICE,                     -- Indicador de status (A = ativo, C = cancelado)
            TIPOLANC,                   -- Tipo de lançamento (P = pagamento, C = crédito)
            TIPOPARCEIRO,               -- Tipo do parceiro (F = fornecedor, C = cliente, L = funcionário)
            NOMEFUNC,                   -- Nome do funcionário responsável pelo lançamento
            HISTORICO2,                 -- Texto complementar do histórico
            MOEDA,                      -- Código da moeda usada (R = Real, U = USD etc.)
            NFSERVICO,                  -- Indica se é uma nota fiscal de serviço (S/N)
            CODROTINACAD,               -- Código da rotina de cadastro que originou o lançamento
            PARCELA,                    -- Número da parcela
            NUMNOTA,                    -- Número da nota fiscal
            CODFORNEC,                  -- Código do fornecedor
            VLRUTILIZADOADIANTFORNEC,   -- Valor de adiantamento utilizado do fornecedor
            TIPOSERVICO,                -- Código do tipo de serviço (se aplicável)
            LACREDIGCONECSOCIAL,        -- Indicador de crédito social (obrigação acessória, eSocial/REINF)
            OPCAOPAGAMENTOIPVA,         -- Opção de pagamento de IPVA (caso frota)
            UTILIZOURATEIOCONTA,        -- Indica se utilizou rateio de conta (S/N)
            PRCRATEIOUTILIZADO,         -- Percentual de rateio utilizado
            VALOR,                      -- Valor total do lançamento
            CODCONTA,                   -- Código da conta contábil utilizada
            RECNUMPRINC,                -- Número do lançamento principal (referência, se for um complemento)
            DTVENC,                     -- Data de vencimento
            DTEMISSAO,                  -- Data de emissão
            DTCOMPETENCIA,              -- Data de competência contábil
            FORNECEDOR,                 -- Nome do fornecedor
            REINFEVENTOR4040            -- Código do evento REINF R-4040 (obrigação acessória)
        ) VALUES (
            :recnum,                                   -- RECNUM
            TRUNC(SYSDATE),                            -- DTLANC - data atual truncada (sem hora)
            :historico1,                                -- HISTORICO - descrição principal
            '1',                                       -- DUPLIC - número da duplicata
            :codfilial,                                -- CODFILIAL - filial onde o lançamento ocorre
            'A',                                       -- INDICE - ativo
            'P',                                       -- TIPOLANC - pagamento
            :TIPOFORNECEDOR,                           -- TIPOPARCEIRO - tipo de parceiro (fornecedor, cliente, etc.)
            :nomefunc,                                 -- NOMEFUNC - nome do funcionário
            :historico2,                               -- HISTORICO2 - histórico complementar
            'R',                                       -- MOEDA - moeda Real
            'N',                                       -- NFSERVICO - não é nota de serviço
            749,                                       -- CODROTINACAD - código da rotina 749 (origem do lançamento)
            '1',                                       -- PARCELA - número da parcela
            0,                                         -- NUMNOTA - número da nota fiscal
            :codfornec,                                -- CODFORNEC - código do fornecedor
            0,                                         -- VLRUTILIZADOADIANTFORNEC - valor de adiantamento usado
            '99',                                      -- TIPOSERVICO - tipo genérico de serviço
            0,                                         -- LACREDIGCONECSOCIAL - sem crédito/conexão social
            0,                                         -- OPCAOPAGAMENTOIPVA - não se aplica IPVA
            'N',                                       -- UTILIZOURATEIOCONTA - não utilizou rateio
            100,                                       -- PRCRATEIOUTILIZADO - 100% do valor atribuído
            :valor,                                    -- VALOR - valor total do lançamento
            :codconta,                                 -- CODCONTA - conta contábil vinculada
            :recnumprinc,                              -- RECNUMPRINC - recnum do lançamento principal
            TO_DATE(:dtvenc, 'YYYY-MM-DD'),            -- DTVENC - data de vencimento
            TO_DATE(:dtemissao, 'YYYY-MM-DD'),         -- DTEMISSAO - data de emissão
            TO_DATE(:dtcompetencia, 'YYYY-MM-DD'),     -- DTCOMPETENCIA - data de competência contábil
            :fornecedor,                               -- FORNECEDOR - nome do fornecedor
            'N'                                        -- REINFEVENTOR4040 - não vinculado ao evento REINF
        )

    `;

    const ssqlInsert746 = `
            INSERT INTO PCLANC (
            RECNUM,                     -- Número de registro único do lançamento
            AGENDAMENTO,                -- Indica se o lançamento é um agendamento
            ADIANTAMENTO,               -- Indica se é um lançamento de adiantamento
            DTLANC,                     -- Data do lançamento
            HISTORICO,                  -- Descrição principal do histórico
            DUPLIC,                     -- Número da duplicata
            CODFILIAL,                  -- Código da filial
            INDICE,                     -- Indicador de status (A = ativo)
            TIPOLANC,                   -- Tipo de lançamento (P = pagamento, C = crédito)
            TIPOPARCEIRO,               -- Tipo do parceiro (F = fornecedor, C = cliente, L = funcionário)
            NOMEFUNC,                   -- Nome do funcionário que lançou
            HISTORICO2,                 -- Histórico complementar
            MOEDA,                      -- Moeda do lançamento
            NFSERVICO,                  -- Indica se é nota fiscal de serviço (N = não)
            CODROTINACAD,               -- Código da rotina que gerou o lançamento
            PARCELA,                    -- Número da parcela
            NUMNOTA,                    -- Número da nota fiscal
            CODFORNEC,                  -- Código do fornecedor
            VLRUTILIZADOADIANTFORNEC,   -- Valor utilizado do adiantamento do fornecedor
            TIPOSERVICO,                -- Tipo de serviço (caso lançamento de serviço)
            LACREDIGCONECSOCIAL,        -- Indicador de crédito/conexão social (SPED/REINF)
            OPCAOPAGAMENTOIPVA,         -- Opção de pagamento de IPVA (caso frota)
            UTILIZOURATEIOCONTA,        -- Indica se utilizou rateio de conta
            PRCRATEIOUTILIZADO,         -- Percentual de rateio utilizado
            VALOR,                      -- Valor total do lançamento
            CODCONTA,                   -- Código da conta contábil utilizada
            RECNUMPRINC,                -- Número do lançamento principal (se for complemento)
            DTVENC,                     -- Data de vencimento
            DTEMISSAO,                  -- Data de emissão
            DTCOMPETENCIA,              -- Data de competência contábil
            FORNECEDOR,                 -- Nome do fornecedor
            REINFEVENTOR4040            -- Evento REINF R-4040 (caso aplicável)
        ) VALUES (
            :FRecnum,                                           -- RECNUM
            NULL,                                               -- AGENDAMENTO
            'S',                                                -- ADIANTAMENTO
            TRUNC(SYSDATE),                                     -- DTLANC
            :historico1,                                        -- HISTORICO
            '1',                                                -- DUPLIC
            :FId_Filialdespesa,                                -- CODFILIAL
            'A',                                                -- INDICE
            'P',                                                -- TIPOLANC
            :TIPOFORNECEDOR,                                   -- TIPOPARCEIRO
            :FUsuarioLanc,                                     -- NOMEFUNC
            :historico2,                                        -- HISTORICO2
            'R',                                                -- MOEDA
            'N',                                                -- NFSERVICO
            746,                                                -- CODROTINACAD
            NULL,                                               -- PARCELA
            0,                                                  -- NUMNOTA
            :FId_Fornecedor_Erp,                               -- CODFORNEC
            0,                                                  -- VLRUTILIZADOADIANTFORNEC
            NULL,                                               -- TIPOSERVICO
            0,                                                  -- LACREDIGCONECSOCIAL
            0,                                                  -- OPCAOPAGAMENTOIPVA
            'N',                                                -- UTILIZOURATEIOCONTA
            100,                                                -- PRCRATEIOUTILIZADO
            :FValorTotal,                                      -- VALOR
            (SELECT CODCONTAADIANTFOR FROM PCCONSUM),          -- CODCONTA
            :FRecnum,                                          -- RECNUMPRINC
            TO_DATE(:FdtEstimativa, 'YYYY-MM-DD'),             -- DTVENC
            TO_DATE(:FdtEstimativa, 'YYYY-MM-DD'),             -- DTEMISSAO
            TO_DATE(:FdtEstimativa, 'YYYY-MM-DD'),             -- DTCOMPETENCIA
            :FFornecedor,                                      -- FORNECEDOR
            NULL                                               -- REINFEVENTOR4040
        )

    `;

    const ssqlInsert631 = `
        INSERT INTO PCLANC(
            NUMBORDERO,           -- Número do borderô de pagamento
            DTPAGTO,              -- Data do pagamento
            VPAGO,                -- Valor pago
            TIPOLANC,             -- Tipo de lançamento (C = crédito, D = débito)
            RECNUM,               -- Número de registro único (sequencial interno)
            DTLANC,               -- Data do lançamento
            CODCONTA,             -- Código da conta contábil
            CODFORNEC,            -- Código do fornecedor
            HISTORICO,            -- Texto descritivo do histórico principal
            HISTORICO2,           -- Texto complementar do histórico
            NUMNOTA,              -- Número da nota fiscal
            VALOR,                -- Valor total do lançamento
            DTVENC,               -- Data de vencimento
            LOCALIZACAO,          -- Código ou nome da rotina que gerou o lançamento
            CODFILIAL,            -- Código da filial
            INDICE,               -- Indicador de status (A = ativo, etc.)
            DESCONTOFIN,          -- Valor de desconto financeiro
            TXPERM,               -- Taxa de permuta (se houver)
            VALORDEV,             -- Valor de devolução
            NUMBANCO,             -- Código do banco
            TIPOPARCEIRO,         -- Tipo de parceiro (C = cliente, F = fornecedor, L = funcionário)
            NOMEFUNC,             -- Nome do funcionário que efetuou o lançamento
            MOEDA,                -- Código da moeda
            CODROTINABAIXA,       -- Código da rotina que gerou a baixa
            NUMTRANS,             -- Número da transação
            DTEMISSAO,            -- Data de emissão
            RECNUMPRINC,          -- Número de registro principal (quando lançamento filho)
            CODFUNCBAIXA,         -- Código do funcionário que realizou a baixa
            DTASSINATURA,         -- Data de assinatura
            ASSINATURA,           -- Assinatura digital ou texto de confirmação
            DTCHEQ,               -- Data do cheque
            DTBORDER,             -- Data do borderô
            FROTA_CODPRACA,       -- Código da praça (caso frota)
            FROTA_QTLITROS,       -- Quantidade de litros abastecidos (caso frota)
            FROTA_NUMCAR,         -- Número do cartão (frota)
            FROTA_CODVEICULO,     -- Código do veículo (frota)
            FROTA_COMISSAO,       -- Comissão (frota)
            FROTA_DTABASTECE,     -- Data do abastecimento
            FROTA_KMABASTECE,     -- Quilometragem no abastecimento
            NUMCHEQUE,            -- Número do cheque
            CODPROJETO,           -- Código do projeto (caso vinculado)
            DTCOMPETENCIA,        -- Data de competência contábil
            FORNECEDOR,           -- Nome do fornecedor
            NUMNEGOCIACAO,        -- Número da negociação (financeiro)
            DTAUTOR,              -- Data de autorização
            VLVARIACAOCAMBIAL,    -- Valor de variação cambial
            CODMOEDABAIXA         -- Código da moeda utilizada na baixa
        ) VALUES (
            NULL,                                 -- NUMBORDERO
            TO_DATE(:dataestimada, 'YYYY-MM-DD'),-- DTPAGTO
            :valor_total,                         -- VPAGO
            'C',                                  -- TIPOLANC
            :FRecnum,                             -- RECNUM
            trunc(sysdate),                       -- DTLANC
            :codconta,                            -- CODCONTA
            :id_fornecedor,                       -- CODFORNEC
            :historico1,                          -- HISTORICO
            :historico2,                          -- HISTORICO2
            0.000000,                             -- NUMNOTA
            :valor_total,                         -- VALOR
            TO_DATE(:dataestimada, 'YYYY-MM-DD'), -- DTVENC
            'ROTINA_LANC_631',                    -- LOCALIZACAO
            :id_filialdespesa,                   -- CODFILIAL
            'A',                                  -- INDICE
            NULL,                                 -- DESCONTOFIN
            NULL,                                 -- TXPERM
            NULL,                                 -- VALORDEV
            :numbanco,                            -- NUMBANCO
            :tipofornecedor,                      -- TIPOPARCEIRO
            :nome_usuario,                        -- NOMEFUNC
            'R',                                  -- MOEDA
            631.000000,                           -- CODROTINABAIXA
            :numtrans,                            -- NUMTRANS (verificar o processo de pega esse campo)
            trunc(sysdate),                       -- DTEMISSAO
            NULL,                                 -- RECNUMPRINC
            :id_solicitante,                      -- CODFUNCBAIXA
            NULL,                                 -- DTASSINATURA
            NULL,                                 -- ASSINATURA
            NULL,                                 -- DTCHEQ
            NULL,                                 -- DTBORDER
            0.000000,                             -- FROTA_CODPRACA
            0.000000,                             -- FROTA_QTLITROS
            0.000000,                             -- FROTA_NUMCAR
            NULL,                                 -- FROTA_CODVEICULO
            NULL,                                 -- FROTA_COMISSAO
            NULL,                                 -- FROTA_DTABASTECE
            0.000000,                             -- FROTA_KMABASTECE
            NULL,                                 -- NUMCHEQUE
            NULL,                                 -- CODPROJETO
            TO_DATE(:dataestimada, 'YYYY-MM-DD'), -- DTCOMPETENCIA
            :fornecedor,                          -- FORNECEDOR
            NULL,                                 -- NUMNEGOCIACAO
            NULL,                                 -- DTAUTOR
            NULL,                                 -- VLVARIACAOCAMBIAL
            'D'                                   -- CODMOEDABAIXA
        )

    `;

    const ssqlUpdatePcestcrD = `
        UPDATE PCESTCR SET VALOR = VALOR + -:valor_total WHERE CODCOB = 'D' AND CODBANCO = :id_caixabanco
    `;

    const ssqlconsutpcmovcr = `
        SELECT VALOR FROM PCESTCR WHERE CODBANCO = :id_caixabanco AND CODCOB = 'D'
    `;

    const ssqlinsertpcmovcr = `
        INSERT INTO PCMOVCR(
            NUMTRANS,         -- Número da transação (identificador único do movimento)
            DATA,             -- Data do movimento (data da operação)
            CODBANCO,         -- Código do banco onde ocorreu o lançamento
            CODCOB,           -- Código da cobrança (ex: tipo de recebimento/pagamento)
            VALOR,            -- Valor do lançamento
            TIPO,             -- Tipo de movimento (C = Crédito, D = Débito)
            HISTORICO,        -- Texto curto de histórico (descrição resumida)
            NUMCARR,          -- Número da carga ou carreto (referência logística, se houver)
            VLSALDO,          -- Valor do saldo após o movimento
            HORA,             -- Hora do movimento (hora inteira)
            MINUTO,           -- Minuto do movimento
            CODFUNC,          -- Código do funcionário responsável pelo lançamento
            CODCONTADEB,      -- Código da conta contábil de débito
            CODCONTACRED,     -- Código da conta contábil de crédito
            INDICE,           -- Índice contábil ou identificador de integração
            HISTORICO2,       -- Histórico complementar (descrição detalhada)
            OPERACAO,         -- Tipo de operação (1 = Inclusão, 2 = Alteração, etc.)
            NUMLANC,          -- Número do lançamento contábil
            NUMCARREG,        -- Número do carregamento (para integração com transporte)
            CODROTINALANC,    -- Código da rotina que originou o lançamento
            DTCONCIL,         -- Data de conciliação bancária (se conciliado)
            CONCILIACAO,      -- Indicador de conciliação (S/N)
            DTCOMPENSACAO,    -- Data de compensação bancária
            COMPENSACAO       -- Indicador de compensação (S/N)
        ) VALUES (
            :numtrans,              -- NUMTRANS
            trunc(sysdate),         -- DATA
            :numbanco,              -- CODBANCO
            'D',                    -- CODCOB
            :valor_total,           -- VALOR
            'C',                    -- TIPO
            :historico1,            -- HISTORICO
            0.000000,               -- NUMCARR
            :vlsaldo,               -- VLSALDO
            TO_NUMBER(TO_CHAR(SYSDATE, 'HH24')), -- HORA
            TO_NUMBER(TO_CHAR(SYSDATE, 'MI')), -- MINUTO
            :id_solicitante,        -- CODFUNC
            0.000000,               -- CODCONTADEB
            :codcontagerencial,     -- CODCONTACRED
            'A',                    -- INDICE
            :historico2,            -- HISTORICO2
            1.000000,               -- OPERACAO
            :FRecnum,         -- NUMLANC
            0.000000,               -- NUMCARREG
            631.000000,             -- CODROTINALANC
            NULL,                   -- DTCONCIL
            NULL,                   -- CONCILIACAO
            NULL,                   -- DTCOMPENSACAO
            NULL                    -- COMPENSACAO
        )
    
    `;


    const ssqlDeletePcrateioCentrocusto= `
        DELETE FROM PCRATEIOCENTROCUSTO WHERE RECNUM = :FRecnum
    `

    const ssqlInsertPcrateioCentroCusto = `
        INSERT INTO PCRATEIOCENTROCUSTO (
            RECNUM,
            CODCONTA,
            CODIGOCENTROCUSTO,
            VALOR,
            PERCRATEIO,
            DTLANC,
            CONTRAPARTIDA,
            RECNUMPRINC,
            CODFILIAL,
            ORCAMENTOEXCEDIDO
            )
            VALUES(
            :FRecnum,
            :codcontagerencial,
            :codcentrodecusto,
            :valor_total,
            :percrateio,
            trunc(sysdate),
            'N',
            Null,
            :id_filialdespesa,
            Null
            )
    `;


    const connection = await getConnection();
    try {

        // pegar o proximonumlanc e atualizar
        const proxnumResult = await connection.execute(ssqlConsultarProxNumLanc, [],
            { outFormat: OracleDB.OUT_FORMAT_OBJECT });

        const proxnum = proxnumResult.rows[0].PROXNUMLANC;

        await connection.execute(ssqlUpdateProxNumLanc);
        

        const formatDateForOracle = (isoDate) => {
            const date = new Date(isoDate);
            return date.toLocaleDateString('pt-BR').split('/').reverse().join('-'); // Formato YYYY-MM-DD
        };
        
        
        if (jsonReq.id_rotina_integracao == 749) {

            await connection.execute(ssqlInsert749,{
                recnum: proxnum,
                codfilial: jsonReq.id_filialdespesa,
                nomefunc: jsonReq.nome_usuario,
                codfornec: jsonReq.id_fornecedor,
                valor: jsonReq.valor_total,
                codconta: jsonReq.codcontagerencial,
                recnumprinc: proxnum,
                dtvenc: formatDateForOracle(jsonReq.dataestimada), 
                dtemissao: formatDateForOracle(jsonReq.dataestimada),
                dtcompetencia: formatDateForOracle(jsonReq.dataestimada),
                fornecedor: jsonReq.fornecedor,
                TIPOFORNECEDOR: jsonReq.tipofornecedor,
                historico1: jsonReq.historico1,
                historico2: jsonReq.historico2
            });
            
        } else if (jsonReq.id_rotina_integracao == 746) {

            await connection.execute(ssqlInsert746,{
                FRecnum: proxnum,
                FId_Filialdespesa: jsonReq.id_filialdespesa,
                FUsuarioLanc: jsonReq.nome_usuario, 
                FId_Fornecedor_Erp: jsonReq.id_fornecedor,
                FValorTotal: jsonReq.valor_total,
                FdtEstimativa: formatDateForOracle(jsonReq.dataestimada),
                FFornecedor: jsonReq.fornecedor,
                TIPOFORNECEDOR: jsonReq.tipofornecedor,
                historico1: jsonReq.historico1,
                historico2: jsonReq.historico2
            }); 

        }else if (jsonReq.id_rotina_integracao == 631){

            /*
                ======================================
                            FLUXO 631 DESPESA
                ======================================
            */

            // pegar o proximonumlanc e atualizar
            const proxnumtransResult = await connection.execute(ssqlConsultaProxNumTrans, [],
                { outFormat: OracleDB.OUT_FORMAT_OBJECT });

            const proxnumtrans = proxnumtransResult.rows[0].PROXNUMTRANS;

            await connection.execute(ssqlUpdateProxNumtrans);

            // 01. inserir pclanc

            await connection.execute(ssqlInsert631,{
                FRecnum: proxnum, 
                numtrans: proxnumtrans,
                id_filialdespesa: jsonReq.id_filialdespesa,
                nome_usuario: jsonReq.nome_usuario, 
                id_fornecedor: jsonReq.id_fornecedor,
                valor_total: jsonReq.valor_total,
                dataestimada: formatDateForOracle(jsonReq.dataestimada),
                fornecedor: jsonReq.fornecedor,
                tipofornecedor: jsonReq.tipofornecedor,
                codconta: jsonReq.codcontagerencial,
                numbanco: jsonReq.id_banco_erp,                                
                historico1: jsonReq.historico1,
                historico2: jsonReq.historico2,
                id_solicitante: jsonReq.id_solicitante
            }); 

            // 02. autlaizar pcestcr (=)
            await connection.execute(ssqlUpdatePcestcrD, {
               id_caixabanco: jsonReq.id_banco_erp,
               valor_total: jsonReq.valor_total
            }); 

            // 03. consultar pcestcr (=)
            const dadospcestcr = await executeQuery(ssqlconsutpcmovcr, {id_caixabanco: jsonReq.id_banco_erp});
            
            // 04. inserir pcmovcr (=)
            await connection.execute(ssqlinsertpcmovcr, {
                numtrans: proxnumtrans,             
                numbanco: jsonReq.id_banco_erp,              
                valor_total: jsonReq.valor_total,           
                vlsaldo: dadospcestcr[0].valor,               
                id_solicitante: jsonReq.id_solicitante,        
                codcontagerencial: jsonReq.codcontagerencial,    
                historico1: jsonReq.historico1,
                historico2: jsonReq.historico2,
                FRecnum: proxnum                
            });                          
                                
        }
        
        // inserir pcrateiocentrocusto  
        await connection.execute(ssqlDeletePcrateioCentrocusto, {FRecnum: proxnum});

        const rateio = jsonReq.rateio;

        console.log(rateio);


        for ( const rat of rateio) {
            await connection.execute(ssqlInsertPcrateioCentroCusto, {
            FRecnum: proxnum,
            codcontagerencial: jsonReq.codcontagerencial,
            codcentrodecusto: rat.id_centrodecusto,
            percrateio: rat.percentual,
            valor_total: rat.valor,            
            id_filialdespesa: jsonReq.id_filialdespesa 
            });
        }
        
        await connection.commit();

        return {id_solicitacao: proxnum};

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        await connection.close();
    }
}