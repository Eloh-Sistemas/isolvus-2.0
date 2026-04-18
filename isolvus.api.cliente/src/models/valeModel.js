import OracleDB from "oracledb";
import { executeQuery, getConnection } from "../config/database.js";

export async function getintegracaoVale() {

    const ssql = `
    SELECT A.NUMVALE ID_VALE,
       A.CODFILIAL ID_FILIAL,
       A.DTLANC DATA_LANCAMENTO,
       A.DTVENC DATA_VENCIMENTO,
       A.DTBAIXAVALE DATA_BAIXA,
       A.CODFUNC ID_FUNC,
       A.TIPOLANC TIPOLANC,
       A.VALOR,
       A.HISTORICO,
       A.CODFUNBAIXA ID_FUNC_BAIXA,
       A.RECNUM ID_LANCAMENTO_ERP,
       1 ID_GRUPO_EMPRESA
    FROM PCCORREN A, PCEMPR R
    WHERE 1=1
    AND A.CODFUNC = R.MATRICULA
    AND (
        A.DTLANC >= TRUNC(SYSDATE)
        OR A.DTBAIXAVALE >= TRUNC(SYSDATE)
    )
    `;

     
    try {
        
        const result = await executeQuery(ssql);
        return result;

    } catch (error) {
        throw 'consulta usuario: '+error
    }

}

export async function setBaixarVale(jsonReq) {
      
   const connection = await getConnection();
   try {

    for (const vale of jsonReq.vales){
            
        // iniciando baixa
        const sqlproxnumtransbaixa = `SELECT DFSEQ_PCCORREN_NUMTRANSBAIXA.NEXTVAL FROM DUAL`;   

        // consultando transbaixa
        const resultproxnumtransbaixa  = await connection.execute(sqlproxnumtransbaixa, [], { outFormat: OracleDB.OUT_FORMAT_OBJECT });
        const proxnumtransbaixa = resultproxnumtransbaixa.rows[0].NEXTVAL;

        // baixando o vale
        const ssqlbaixavale = `
        UPDATE PCCORREN
            SET DTBAIXAVALE   = SYSDATE,
            CODFUNBAIXA   = :CODFUNBAIXA,
            NUMTRANSBAIXA = :NUMTRANSBAIXA 
            WHERE RECNUM = :RECNUM
            AND NUMVALE = :NUMVALE
            AND TIPOFUNC = 'F'
            AND DTBAIXAVALE IS NULL
            `;
        await connection.execute(ssqlbaixavale,{
           CODFUNBAIXA: jsonReq.id_func_baixa,
           NUMTRANSBAIXA: proxnumtransbaixa,
           RECNUM: vale.id_lancamento_erp,
           NUMVALE: vale.id_vale
        });

        // consultar proxnumtrans
        const ssqlproxnumtrans = `SELECT NVL(PROXNUMTRANS,1) PROXNUMTRANS  FROM PCCONSUM`;
        const resultproxnumtrans = await connection.execute(ssqlproxnumtrans, [], { outFormat: OracleDB.OUT_FORMAT_OBJECT });
        // variavel com valor
        const proxnumtrans = resultproxnumtrans.rows[0].PROXNUMTRANS;        


        // atualizando a tabela para o proximo codigo
        const ssqlupdateproxnumtrans = 'UPDATE PCCONSUM SET PROXNUMTRANS = NVL(PROXNUMTRANS,1) + 1'; 
        await connection.execute(ssqlupdateproxnumtrans, []);


        // consultando recnumlivre
        const ssqlVerificarRecnumLivre = `
        SELECT PROX_RECNUM_LIVRE
        FROM (SELECT NVL(((T.RECNUM) + 1), 1) AS PROX_RECNUM_LIVRE
                FROM PCCORREN T
                WHERE (T.RECNUM > 0)
                AND (T.RECNUM < (SELECT MAX(RECNUM) FROM PCCORREN))
                AND NOT EXISTS
                (SELECT RECNUM FROM PCCORREN T1 WHERE T1.RECNUM = T.RECNUM + 1)
                ORDER BY DBMS_RANDOM.RANDOM)
        WHERE ROWNUM = 1
        `;        

        // consultando proximo recnum
        const resultrecnumlivre = await connection.execute(ssqlVerificarRecnumLivre, [], { outFormat: OracleDB.OUT_FORMAT_OBJECT });
        const recnumlivre = resultrecnumlivre.rows[0].PROX_RECNUM_LIVRE;

        const ssqlConsultaValeBaixado = `
        SELECT  CODFILIAL,
          DTLANC,
          CODFUNC,
          HISTORICO,
          TIPOLANC,
          VALOR,
          NUMDOC,
          CODHIST,
          HISTORICO2,
          DTVENC,
          DTVENCORIG,
          NUMVALE,
          TIPOFUNC,
          CODEMITE,
          CODFUNCORIG,
          CODROTINA,
          CODEMITEORIG,
          COBJUROS,
          CODBANCO,
          NUMTRANS,
          HORA,
          MINUTO,
          DTBAIXAVALE,
          CODFUNBAIXA,
          INDICE,
          NUMTRANSBAIXA,
          CONSIDERABASECALCULOIMPOSTO,
          DTDOC,
          VALEEXPORTADO
    FROM PCCORREN V         
      WHERE RECNUM = :RECNUM
        AND NUMVALE = :NUMVALE
        AND TIPOFUNC = 'F'
    `;

       //consulta dados do titulo 
        const resultDataVale = await executeQuery(ssqlConsultaValeBaixado,{
           RECNUM: vale.id_lancamento_erp,
           NUMVALE: vale.id_vale
        });     
                

        // insere o credito do titulo
        const ssqlInsertPccorren = `
            INSERT INTO PCCORREN
            (
                RECNUM,
                CODFILIAL,
                DTLANC,
                CODFUNC,
                HISTORICO,
                TIPOLANC,
                VALOR,
                NUMDOC,
                CODHIST,
                HISTORICO2,
                DTVENC,
                DTVENCORIG,
                NUMVALE,
                TIPOFUNC,
                CODEMITE,
                CODFUNCORIG,
                CODROTINA,
                CODEMITEORIG,
                COBJUROS,
                CODBANCO,
                NUMTRANS,
                HORA,
                MINUTO,
                DTBAIXAVALE,
                CODFUNBAIXA,
                INDICE,
                NUMTRANSBAIXA,
                CONSIDERABASECALCULOIMPOSTO,
                DTDOC,
                VALEEXPORTADO
            )
            VALUES
            (
                :recnum,
                :codfilial,
                TRUNC(SYSDATE),
                :codfunc,
                :historico,
                :tipolanc,
                :valor,
                :numdoc,
                :codhist,
                :historico2,
                :dtvenc,
                :dtvencorig,
                :numvale,
                :tipofunc,
                :codemite,
                :codfuncorig,
                :codrotina,
                :codemiteorig,
                :cobjuros,
                :codbanco,
                :numtrans,
                TO_CHAR(SYSDATE, 'HH24'),
                TO_CHAR(SYSDATE, 'MI'),
                SYSDATE,
                :codfunbaixa,
                'A',
                :numtransbaixa,
                'N',
                TRUNC(SYSDATE),
                'N'
            )
        `;

        await connection.execute(ssqlInsertPccorren, {
            recnum:            recnumlivre,
            codfilial:         resultDataVale[0].codfilial,
            codfunc:           resultDataVale[0].codfunc,
            historico:         resultDataVale[0].historico,
            tipolanc:          'C',
            valor:             resultDataVale[0].valor,
            numdoc:            resultDataVale[0].numdoc,
            codhist:           resultDataVale[0].codhist,
            historico2:        resultDataVale[0].historico2,
            dtvenc:            resultDataVale[0].dtvenc,
            dtvencorig:        resultDataVale[0].dtvencorig,
            numvale:           resultDataVale[0].numvale,
            tipofunc:          resultDataVale[0].tipofunc,
            codemite:          resultDataVale[0].codemite,
            codfuncorig:       resultDataVale[0].codfuncorig,
            codrotina:         resultDataVale[0].codrotina,
            codemiteorig:      resultDataVale[0].codemiteorig,
            cobjuros:          resultDataVale[0].cobjuros,
            codbanco:          resultDataVale[0].codbanco,
            numtrans:          proxnumtrans,
            codfunbaixa:       jsonReq.id_func_baixa,
            numtransbaixa:     proxnumtransbaixa
        });               

        
        // ATUALIZANDO SALDO CAIXA BANCO MOEDA VALE
        const updatepcestcrVale = `
        UPDATE PCESTCR
            SET VALOR             = VALOR - :valor,
            DTULTCOMPENSACAO      = sysdate
        WHERE CODCOB = :codcob
        AND CODBANCO = :codbanco
        `;
       
        await connection.execute(updatepcestcrVale, {
            valor: resultDataVale[0].valor,
            codcob: 'VALE',
            codbanco: resultDataVale[0].codbanco 
        });

        //INSERIR PCMOVCR VALE
        const insertpcmovcr = `
        INSERT INTO PCMOVCR (     
        NUMTRANS,          
        DATA,              
        CODBANCO,          
        CODCOB,            
        HISTORICO,         
        HISTORICO2,        
        VALOR,             
        TIPO,              
        NUMCARR,           
        NUMDOC,            
        VLSALDO,           
        DTCOMPENSACAO,   
        CODFUNCCOMP,   
        HORA,              
        MINUTO,            
        CODFUNC,           
        INDICE,            
        CODROTINALANC      
        )                         
        VALUES
        (                   
            :numtrans,         
            trunc(sysdate),             
            :codbanco,         
            'VALE',           
            'BAIXA DE VALE',        
            'BAIXA DE VALE',       
            :valor,            
            'C',             
            :numcarr,          
            Null,           
            (SELECT C.VALOR FROM PCESTCR C WHERE CODCOB = 'VALE' AND CODBANCO = :codbanco),          
            Null,  
            Null,  
            to_char(sysdate, 'HH24'),             
            to_char(sysdate, 'MI'),             
            :codfunc,          
            'A',           
            614.000000     
        )
        `;

        await connection.execute(insertpcmovcr, {
            numtrans: proxnumtrans,
            codbanco: resultDataVale[0].codbanco,
            valor: resultDataVale[0].valor,
            numcarr: resultDataVale[0].numvale,
            codfunc: jsonReq.id_func_baixa
        });


        //update na pcestcr no codcob D
        // ATUALIZANDO SALDO CAIXA BANCO MOEDA VALE
        const updatepcestcrD = `
        UPDATE PCESTCR
            SET VALOR             = VALOR + :valor,
            DTULTCOMPENSACAO      = sysdate
        WHERE CODCOB = :codcob
        AND CODBANCO = :codbanco
        `;

        await connection.execute(updatepcestcrD, {
            valor: resultDataVale[0].valor,
            codcob: 'D',
            codbanco: resultDataVale[0].codbanco 
        });

        //insert pcmovcr codcob D
        //INSERIR PCMOVCR VALE
        const insertpcmovcrD = `
        INSERT INTO PCMOVCR (     
        NUMTRANS,          
        DATA,              
        CODBANCO,          
        CODCOB,            
        HISTORICO,         
        HISTORICO2,        
        VALOR,             
        TIPO,              
        NUMCARR,           
        NUMDOC,            
        VLSALDO,           
        DTCOMPENSACAO,   
        CODFUNCCOMP,   
        HORA,              
        MINUTO,            
        CODFUNC,           
        INDICE,            
        CODROTINALANC      
        )                         
        VALUES
        (                   
            :numtrans,         
            trunc(sysdate),             
            :codbanco,         
            'D',           
            'BAIXA DE VALE',        
            'BAIXA DE VALE',       
            :valor,            
            'D',             
            :numcarr,          
            Null,           
            (SELECT C.VALOR FROM PCESTCR C WHERE CODCOB = 'D' AND CODBANCO = :codbanco),          
            Null,  
            Null,  
            to_char(sysdate, 'HH24'),             
            to_char(sysdate, 'MI'),             
            :codfunc,          
            'A',           
            614.000000     
        )
        `;

        await connection.execute(insertpcmovcrD, {
            numtrans: proxnumtrans,
            codbanco: resultDataVale[0].codbanco,
            valor: resultDataVale[0].valor,
            numcarr: resultDataVale[0].numvale,
            codfunc: jsonReq.id_func_baixa
        });

    }

    await connection.commit();

   } catch (error) {
     await connection.rollback();
     console.log(error);
   }finally{
     await connection.close();
   }                                     

    return {mensagem: 'Vale(s) baixado com sucesso.'};

}

export async function buscarVale(integracao) {

    try {                            

        
        // consultar na api do caixa banco  
        const respose = await axios.get(integracao.host+`/v1/integracao/vale`, authApiClient);
        
        if (respose.status == 200){            
            // Atualiza na base do intranet
            await armazenarVale(respose.data);                                            
            //await atualizaDataProximaAtualizcao(integracao.id_servidor, integracao.id_integracao);  
        }
  
    } catch (error) {
        console.log("Erro ao integrar vale id host: "+integracao.host)        
        console.log(error)        
    }
  
}


export async function armazenarVale(dataVale) {
    const ssqlValidar = `
        SELECT id_lancamento
        FROM bstab_vale 
        WHERE id_lancamento_erp = :id_lancamento_erp
    `;

    const sqlUpdate = `
        UPDATE bstab_vale
           SET id_vale = :id_vale,
               id_filial = (SELECT E.ID_EMPRESA FROM BSTAB_EMPRESAS E WHERE E.ID_ERP = :id_filial),
               data_lancamento = TO_DATE(:data_lancamento, 'DD/MM/YYYY'),
               data_vencimento = TO_DATE(:data_vencimento, 'DD/MM/YYYY'),
               data_baixa = TO_DATE(:data_baixa, 'DD/MM/YYYY'),
               id_func = (SELECT B.ID_USUARIO FROM BSTAB_USUSARIOS B WHERE B.ID_USUARIO_ERP = :id_func),
               tipolanc = :tipolanc,
               valor = :valor,
               historico = :historico,
               id_func_baixa = :id_func_baixa
         WHERE id_lancamento_erp = :id_lancamento_erp
    `;

    const sqlInsert = `
        INSERT INTO bstab_vale (
            id_lancamento, 
            id_vale, 
            id_filial, 
            data_lancamento, 
            data_vencimento, 
            data_baixa, 
            id_func, 
            tipolanc, 
            valor, 
            historico, 
            id_func_baixa, 
            id_lancamento_erp
        ) VALUES (
            (SELECT NVL(MAX(id_lancamento + 1), 1) FROM bstab_vale),
            :id_vale,
            (SELECT E.ID_EMPRESA FROM BSTAB_EMPRESAS E WHERE E.ID_ERP = :id_filial),
            TO_DATE(:data_lancamento, 'DD/MM/YYYY'),
            TO_DATE(:data_vencimento, 'DD/MM/YYYY'),
            TO_DATE(:data_baixa, 'DD/MM/YYYY'),
            (SELECT B.ID_USUARIO FROM BSTAB_USUSARIOS B WHERE B.ID_USUARIO_ERP = :id_func),
            :tipolanc,
            :valor,
            :historico,
            :id_func_baixa,
            :id_lancamento_erp
        )
    `;
    
    const connection = await getConnection();        

    try {
        for (const vale of dataVale) {
            const params = {
                id_vale: vale.id_vale,
                id_filial: vale.id_filial,
                data_lancamento: vale.data_lancamento
                    ? moment.utc(vale.data_lancamento).format('DD/MM/YYYY')
                    : null,
                data_vencimento: vale.data_vencimento
                    ? moment.utc(vale.data_vencimento).format('DD/MM/YYYY')
                    : null,
                data_baixa: vale.data_baixa
                    ? moment.utc(vale.data_baixa).format('DD/MM/YYYY')
                    : null,
                id_func: vale.id_func,
                tipolanc: vale.tipolanc,
                valor: vale.valor,
                historico: vale.historico,
                id_func_baixa: vale.id_func_baixa,
                id_lancamento_erp: vale.id_lancamento_erp
            };

            // Verifica se o registro já existe
            const validar = await connection.execute(
                ssqlValidar, 
                { id_lancamento_erp: vale.id_lancamento_erp }, 
                { outFormat: OracleDB.OUT_FORMAT_OBJECT }
            );

            if (validar.rows.length > 0) {
                // Faz UPDATE se já existir
                await connection.execute(sqlUpdate, params);
            } else {
                // Faz INSERT se não existir
                await connection.execute(sqlInsert, params);
            }
        }

        await connection.commit();

    } catch (error) {
        await connection.rollback();
        console.error('Erro ao armazenar vale:', error);
    } finally {
        await connection.close();
    }
}
