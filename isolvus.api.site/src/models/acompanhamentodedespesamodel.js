import { executeQuery } from "../config/database.js";
import { parseDateBR } from "../utils/date.js";

export async function Gettabela(jsonReq) {
    try {

      let parametros = {
        id_grupo_empresa: jsonReq.id_grupo_empresa,
        dataInicial: parseDateBR(jsonReq.dataInicial),
        dataFinal: parseDateBR(jsonReq.dataFinal)
      };
       
      let ssql = `
      SELECT vw2.codconta, vw2.conta,  
            SUM(vw2.orcado) AS orcado,   
            SUM(vw2.realizado) AS realizado,
            CASE
                WHEN SUM(vw2.orcado) = 0 THEN 0
                ELSE ROUND((SUM(vw2.realizado) / SUM(vw2.orcado)) * 100, 2)
            END AS PerRealizado
        FROM (
            SELECT VW1.*
            FROM (
                SELECT A.Codconta,
                    A.Conta AS Conta,
                    SUM(A.Valor) AS Orcado,
                    (
                        SELECT COALESCE(SUM(COALESCE(I.QUANTIDADE, 0) * COALESCE(I.VLUNIT, 0)), 0) AS REALIZADO
                        FROM BSTAB_SOLICITADESPESAC S
                        JOIN BSTAB_CONTAGERENCIAL C ON S.CODCONTAGERENCIAL = C.ID_CONTAERP
                        JOIN BSTAB_SOLICITADESPESAI I ON S.NUMSOLICITACAO = I.NUMSOLICITACAO
                        WHERE TRUNC(S.DATASOLICITACAO) >= :dataInicial
                        AND TRUNC(S.DATASOLICITACAO) <= :dataFinal
                        AND S.CODCONTAGERENCIAL = A.Codconta
                        AND S.ID_FILIALDESPESA = A.id_empresa_erp
                        AND S.ID_GRUPO_EMPRESA = A.id_grupo_empresa
                        AND S.STATUS IN ('F','I')  `;

        if (jsonReq.codordenador && jsonReq.codordenador > 0){
            ssql += ` AND S.CODCONTAGERENCIAL IN (SELECT DISTINCT O.ID_CONTA_ERP FROM BSTAB_ORDENADORES O WHERE O.ID_USUARIO_ERP = :id_usuario_erp AND O.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA) `;
            parametros.id_usuario_erp = jsonReq.codordenador;
        };
        
        ssql += `
                    ) AS Realizado
                FROM VWBS_ORCAMENTOPORDATA A
                WHERE 1=1
                AND TRUNC(A.DATAVIGENCIA) >= :dataInicial
                AND TRUNC(A.DATAVIGENCIA) <= :dataFinal
                AND A.id_grupo_empresa = :id_grupo_empresa `;
        
        if (jsonReq.id_empresaerp && jsonReq.id_empresaerp > 0){
            ssql += ` AND A.id_empresa_erp = :id_empresa_erp `;
            parametros.id_empresa_erp = jsonReq.id_empresaerp;
        }

        if (jsonReq.id_contaerp && jsonReq.id_contaerp > 0){
            ssql += ` AND A.Codconta = :codconta `;
            parametros.codconta = jsonReq.id_contaerp;
        }

        if (jsonReq.codordenador && jsonReq.codordenador > 0){
            ssql += ` AND A.Codconta IN (SELECT DISTINCT O.ID_CONTA_ERP FROM BSTAB_ORDENADORES O WHERE O.ID_USUARIO_ERP = :ID_USUARIO_ERP AND O.ID_GRUPO_EMPRESA = :id_grupo_empresa)  `;
        }

        ssql += ` GROUP BY A.Codconta, A.Conta, A.id_empresa_erp, A.id_grupo_empresa ) vw1 ) vw2 WHERE 1=1 
        group by vw2.codconta, vw2.conta
        ORDER BY CASE
                WHEN SUM(vw2.orcado) = 0 THEN 0
                ELSE ROUND((SUM(vw2.realizado) / SUM(vw2.orcado)) * 100, 2)
            END DESC
        `;

      const result = await executeQuery(ssql,parametros);      

      return result;

    } catch (error) {
        console.error("Erro na consulta:", error);
        throw error;
    }
}

export async function GetDashOrcamentoTotal(jsonReq) {
    try {

      let parametros = {
        id_grupo_empresa: jsonReq.id_grupo_empresa,
        dataInicial: parseDateBR(jsonReq.dataInicial),
        dataFinal: parseDateBR(jsonReq.dataFinal)
      };
       
      let ssql = `
         SELECT 
         nvl(SUM(vw1.orcado),0) AS orcado, 
         nvl(SUM(vw1.realizado),0) AS realizado, 
         round(CASE 
         WHEN SUM(vw1.orcado) > 0 THEN (SUM(vw1.realizado) / SUM(vw1.orcado)) * 100 
         ELSE 0 
         END,2) AS percentual_realizado 
         FROM ( 
         SELECT 
         A.Codconta, 
         A.Codconta || ' - ' || A.Conta AS Conta, 
         SUM(A.Valor) AS Orcado, 
         ( 
         SELECT NVL(SUM(NVL(I.QUANTIDADE, 0) * NVL(I.VLUNIT, 0)), 0) AS REALIZADO 
         FROM BSTAB_SOLICITADESPESAC S 
         JOIN BSTAB_CONTAGERENCIAL C ON S.CODCONTAGERENCIAL = C.ID_CONTAERP 
         JOIN BSTAB_SOLICITADESPESAI I ON S.NUMSOLICITACAO = I.NUMSOLICITACAO 
         WHERE TO_DATE(TRUNC(S.DATASOLICITACAO)) >= :dataInicial 
         AND TO_DATE(TRUNC(S.DATASOLICITACAO)) <= :dataFinal 
         AND S.CODCONTAGERENCIAL = A.Codconta 
         AND S.ID_FILIALDESPESA = A.id_empresa_erp 
         AND S.ID_GRUPO_EMPRESA = A.id_grupo_empresa 
         AND S.STATUS IN ('F','I')  `;

        if (jsonReq.codordenador && jsonReq.codordenador > 0){
            ssql += ` AND S.CODCONTAGERENCIAL IN (SELECT DISTINCT O.ID_CONTA_ERP FROM BSTAB_ORDENADORES O WHERE O.ID_USUARIO_ERP = :id_usuario_erp AND O.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA) `;
            parametros.id_usuario_erp = jsonReq.codordenador;
        };
        
        ssql += `
                    ) AS Realizado
                FROM VWBS_ORCAMENTOPORDATA A
                WHERE 1=1
                AND TRUNC(A.DATAVIGENCIA) >= :dataInicial
                AND TRUNC(A.DATAVIGENCIA) <= :dataFinal
                AND A.id_grupo_empresa = :id_grupo_empresa `;
        
        if (jsonReq.id_empresaerp && jsonReq.id_empresaerp > 0){
            ssql += ` AND A.id_empresa_erp = :id_empresa_erp `;
            parametros.id_empresa_erp = jsonReq.id_empresaerp;
        }

        if (jsonReq.id_contaerp && jsonReq.id_contaerp > 0){
            ssql += ` AND A.Codconta = :codconta `;
            parametros.codconta = jsonReq.id_contaerp;
        }

        if (jsonReq.codordenador && jsonReq.codordenador > 0){
            ssql += ` AND A.Codconta IN (SELECT DISTINCT O.ID_CONTA_ERP FROM BSTAB_ORDENADORES O WHERE O.ID_USUARIO_ERP = :ID_USUARIO_ERP AND O.ID_GRUPO_EMPRESA = :id_grupo_empresa)  `;
        }

        ssql += ` GROUP BY A.Codconta, A.Conta, A.id_empresa_erp, A.id_grupo_empresa ) vw1  `;

      const result = await executeQuery(ssql,parametros);  
      
    

      return result;

    } catch (error) {
        console.error("Erro na consulta:", error);
        throw error;
    }
}

export async function GetDashOrcamentoPorConta(jsonReq) {
    try {

      let parametros = {
        id_grupo_empresa: jsonReq.id_grupo_empresa,
        dataInicial: parseDateBR(jsonReq.dataInicial),
        dataFinal: parseDateBR(jsonReq.dataFinal)
      };
       
      let ssql = `
         SELECT 
         nvl(SUM(vw1.orcado),0) AS orcado, 
         nvl(SUM(vw1.realizado),0) AS realizado, 
         round(CASE 
         WHEN SUM(vw1.orcado) > 0 THEN (SUM(vw1.realizado) / SUM(vw1.orcado)) * 100 
         ELSE 0 
         END,2) AS percentual_realizado 
         FROM ( 
         SELECT 
         A.Codconta, 
         A.Codconta || ' - ' || A.Conta AS Conta, 
         SUM(A.Valor) AS Orcado, 
         ( 
         SELECT NVL(SUM(NVL(I.QUANTIDADE, 0) * NVL(I.VLUNIT, 0)), 0) AS REALIZADO 
         FROM BSTAB_SOLICITADESPESAC S 
         JOIN BSTAB_CONTAGERENCIAL C ON S.CODCONTAGERENCIAL = C.ID_CONTAERP 
         JOIN BSTAB_SOLICITADESPESAI I ON S.NUMSOLICITACAO = I.NUMSOLICITACAO 
         WHERE TO_DATE(TRUNC(S.DATASOLICITACAO)) >= :dataInicial 
         AND TO_DATE(TRUNC(S.DATASOLICITACAO)) <= :dataFinal 
         AND S.CODCONTAGERENCIAL = A.Codconta 
         AND S.ID_FILIALDESPESA = A.id_empresa_erp 
         AND S.ID_GRUPO_EMPRESA = A.id_grupo_empresa 
         AND S.STATUS in ('F','I')  `;

        if (jsonReq.codordenador && jsonReq.codordenador > 0){
            ssql += ` AND S.CODCONTAGERENCIAL IN (SELECT DISTINCT O.ID_CONTA_ERP FROM BSTAB_ORDENADORES O WHERE O.ID_USUARIO_ERP = :id_usuario_erp AND O.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA) `;
            parametros.id_usuario_erp = jsonReq.codordenador;
        };
        
        ssql += `
                    ) AS Realizado
                FROM VWBS_ORCAMENTOPORDATA A
                WHERE 1=1
                AND TRUNC(A.DATAVIGENCIA) >= :dataInicial
                AND TRUNC(A.DATAVIGENCIA) <= :dataFinal
                AND A.id_grupo_empresa = :id_grupo_empresa `;
        
        if (jsonReq.id_empresaerp && jsonReq.id_empresaerp > 0){
            ssql += ` AND A.id_empresa_erp = :id_empresa_erp `;
            parametros.id_empresa_erp = jsonReq.id_empresaerp;
        }

        if (jsonReq.id_contaerp && jsonReq.id_contaerp > 0){
            ssql += ` AND A.Codconta = :codconta `;
            parametros.codconta = jsonReq.id_contaerp;
        }

        if (jsonReq.codordenador && jsonReq.codordenador > 0){
            ssql += ` AND A.Codconta IN (SELECT DISTINCT O.ID_CONTA_ERP FROM BSTAB_ORDENADORES O WHERE O.ID_USUARIO_ERP = :ID_USUARIO_ERP AND O.ID_GRUPO_EMPRESA = :id_grupo_empresa)  `;
        }

        ssql += ` GROUP BY A.Codconta, A.Conta, A.id_empresa_erp, A.id_grupo_empresa ) vw1  `;

      const result = await executeQuery(ssql,parametros);  
      
    

      return result;

    } catch (error) {
        console.error("Erro na consulta:", error);
        throw error;
    }
}

export async function GetDetalheCentroCusto(jsonReq) {
        try {
            const parametros = {
                id_grupo_empresa: jsonReq.id_grupo_empresa,
                dataInicial: parseDateBR(jsonReq.dataInicial),
                dataFinal: parseDateBR(jsonReq.dataFinal)
            };

            let ssql = `
                SELECT
                    R.ID_CENTRODECUSTO AS CODCENTRODECUSTO,
                    NVL(CC.DESCRICAO, 'Sem centro de custo') AS CENTRODECUSTO,
                    COUNT(DISTINCT S.NUMSOLICITACAO) AS QUANTIDADESOLICITACOES,
                    NVL(SUM(NVL(R.VALOR, 0)), 0) AS REALIZADO
                FROM BSTAB_SOLICITADESPESAC S
                JOIN BSTAB_SOLICITADESPESA_RATEIO R
                    ON R.ID_SOLICITACAO = S.NUMSOLICITACAO
                LEFT JOIN BSTAB_CENTRODECUSTO CC
                    ON CC.ID_CENTRODECUSTO_ERP = R.ID_CENTRODECUSTO
                WHERE TRUNC(S.DATASOLICITACAO) >= :dataInicial
                    AND TRUNC(S.DATASOLICITACAO) <= :dataFinal
                    AND S.ID_GRUPO_EMPRESA = :id_grupo_empresa
                    AND S.STATUS IN ('F', 'I')
            `;

            if (jsonReq.id_empresaerp && jsonReq.id_empresaerp > 0) {
                ssql += ` AND S.ID_FILIALDESPESA = :id_empresa_erp `;
                parametros.id_empresa_erp = jsonReq.id_empresaerp;
            }

            if (jsonReq.id_contaerp && jsonReq.id_contaerp > 0) {
                ssql += ` AND S.CODCONTAGERENCIAL = :codconta `;
                parametros.codconta = jsonReq.id_contaerp;
            }

            if (jsonReq.codordenador && jsonReq.codordenador > 0) {
                ssql += ` AND S.CODCONTAGERENCIAL IN (
                    SELECT DISTINCT O.ID_CONTA_ERP
                    FROM BSTAB_ORDENADORES O
                    WHERE O.ID_USUARIO_ERP = :id_usuario_erp
                        AND O.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA
                ) `;
                parametros.id_usuario_erp = jsonReq.codordenador;
            }

            ssql += `
                GROUP BY R.ID_CENTRODECUSTO, CC.DESCRICAO
                ORDER BY REALIZADO DESC
            `;

            return await executeQuery(ssql, parametros);
        } catch (error) {
            console.error("Erro ao consultar detalhe por centro de custo:", error);
            throw error;
        }
}

export async function GetLancamentosCentroCusto(jsonReq) {
        try {
            const parametros = {
                id_grupo_empresa: jsonReq.id_grupo_empresa,
                dataInicial: parseDateBR(jsonReq.dataInicial),
                dataFinal: parseDateBR(jsonReq.dataFinal),
                id_centrodecusto: jsonReq.id_centrodecusto
            };

            let ssql = `
                WITH RATEIO_FILTRADO AS (
                    SELECT
                        R.ID_SOLICITACAO,
                        R.ID_CENTRODECUSTO,
                        SUM(NVL(R.PERCENTUAL, 0)) AS PERCENTUALRATEIO,
                        SUM(NVL(R.VALOR, 0)) AS VALORRATEIO
                    FROM BSTAB_SOLICITADESPESA_RATEIO R
                    WHERE R.ID_CENTRODECUSTO = :id_centrodecusto
                    GROUP BY R.ID_SOLICITACAO, R.ID_CENTRODECUSTO
                )
                SELECT
                    S.NUMSOLICITACAO,
                    TO_CHAR(S.DATASOLICITACAO, 'DD/MM/YYYY') AS DATASOLICITACAO,
                    NVL(BI.DESCRICAO, 'Sem descricao do item') AS HISTORICO,
                    NVL(I.QUANTIDADE, 0) AS QUANTIDADE,
                    NVL(I.VLUNIT, 0) AS VLUNIT,
                    NVL(I.QUANTIDADE, 0) * NVL(I.VLUNIT, 0) AS VALORITEM,
                    NVL(R.PERCENTUALRATEIO, 0) AS PERCENTUALRATEIO,
                    NVL(R.VALORRATEIO, 0) AS VALORRATEIO,
                    R.ID_CENTRODECUSTO AS CODCENTRODECUSTO
                FROM BSTAB_SOLICITADESPESAC S
                JOIN RATEIO_FILTRADO R
                    ON R.ID_SOLICITACAO = S.NUMSOLICITACAO
                LEFT JOIN BSTAB_SOLICITADESPESAI I
                    ON I.NUMSOLICITACAO = S.NUMSOLICITACAO
                LEFT JOIN BSTAB_ITEM BI
                    ON BI.ID_ITEM = I.ID_ITEM
                WHERE TRUNC(S.DATASOLICITACAO) >= :dataInicial
                    AND TRUNC(S.DATASOLICITACAO) <= :dataFinal
                    AND S.ID_GRUPO_EMPRESA = :id_grupo_empresa
                    AND S.STATUS IN ('F', 'I')
            `;

            if (jsonReq.id_empresaerp && jsonReq.id_empresaerp > 0) {
                ssql += ` AND S.ID_FILIALDESPESA = :id_empresa_erp `;
                parametros.id_empresa_erp = jsonReq.id_empresaerp;
            }

            if (jsonReq.id_contaerp && jsonReq.id_contaerp > 0) {
                ssql += ` AND S.CODCONTAGERENCIAL = :codconta `;
                parametros.codconta = jsonReq.id_contaerp;
            }

            if (jsonReq.codordenador && jsonReq.codordenador > 0) {
                ssql += ` AND S.CODCONTAGERENCIAL IN (
                    SELECT DISTINCT O.ID_CONTA_ERP
                    FROM BSTAB_ORDENADORES O
                    WHERE O.ID_USUARIO_ERP = :id_usuario_erp
                        AND O.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA
                ) `;
                parametros.id_usuario_erp = jsonReq.codordenador;
            }

            ssql += `
                ORDER BY S.DATASOLICITACAO DESC, S.NUMSOLICITACAO DESC
            `;

            return await executeQuery(ssql, parametros);
        } catch (error) {
            console.error("Erro ao consultar lancamentos por centro de custo:", error);
            throw error;
        }
}