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
        -- vales em aberto nos últimos 90 dias (garante sync mesmo se o sistema ficou fora)
        (A.DTBAIXAVALE IS NULL AND A.DTLANC >= TRUNC(SYSDATE) - 90)
        -- vales baixados nos últimos 7 dias (propaga a baixa para o isolvus)
        OR A.DTBAIXAVALE >= TRUNC(SYSDATE) - 7
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

    if (!Array.isArray(jsonReq?.vales) || jsonReq.vales.length === 0) {
        throw new Error('Nenhum vale foi informado para baixa.');
    }

    for (const vale of jsonReq.vales){
        const ssqlConsultaVale = `
        SELECT CODFILIAL,
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
        FROM PCCORREN
        WHERE RECNUM = :RECNUM
          AND NUMVALE = :NUMVALE
          AND TIPOFUNC = 'F'
          AND DTBAIXAVALE IS NULL
        `;

        const resultDataVale = await connection.execute(
            ssqlConsultaVale,
            {
                RECNUM: vale.id_lancamento_erp,
                NUMVALE: vale.id_vale
            },
            { outFormat: OracleDB.OUT_FORMAT_OBJECT }
        );

        if (!resultDataVale.rows?.length) {
            throw new Error(`Vale ${vale.id_vale} não encontrado ou já baixado no cliente.`);
        }

        const dadosVale = resultDataVale.rows[0];

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

        // consultar proxnumtrans
        const ssqlproxnumtrans = `SELECT NVL(PROXNUMTRANS,1) PROXNUMTRANS  FROM PCCONSUM`;
        const resultproxnumtrans = await connection.execute(ssqlproxnumtrans, [], { outFormat: OracleDB.OUT_FORMAT_OBJECT });
        // variavel com valor
        const proxnumtrans = Number(resultproxnumtrans.rows[0].PROXNUMTRANS || 1);
        const proxnumtransbaixa = proxnumtrans;


        // atualizando a tabela para o proximo codigo
        const ssqlupdateproxnumtrans = 'UPDATE PCCONSUM SET PROXNUMTRANS = NVL(PROXNUMTRANS,1) + 1'; 
        await connection.execute(ssqlupdateproxnumtrans, []);

        const resultBaixaVale = await connection.execute(ssqlbaixavale,{
           CODFUNBAIXA: jsonReq.id_func_baixa,
           NUMTRANSBAIXA: proxnumtransbaixa,
           RECNUM: vale.id_lancamento_erp,
           NUMVALE: vale.id_vale
        });

        if (!resultBaixaVale.rowsAffected) {
            throw new Error(`Não foi possível efetivar a baixa do vale ${vale.id_vale} no cliente.`);
        }


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
        const recnumlivre = resultrecnumlivre.rows?.[0]?.PROX_RECNUM_LIVRE;

        if (!recnumlivre) {
            const resultProximoRecnum = await connection.execute(
                `SELECT NVL(MAX(RECNUM), 0) + 1 AS PROX_RECNUM_LIVRE FROM PCCORREN`,
                [],
                { outFormat: OracleDB.OUT_FORMAT_OBJECT }
            );

            if (!resultProximoRecnum.rows?.[0]?.PROX_RECNUM_LIVRE) {
                throw new Error('Não foi possível obter o próximo RECNUM para a baixa do vale.');
            }

            vale.recnumlivre = resultProximoRecnum.rows[0].PROX_RECNUM_LIVRE;
        }
                

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
                TO_DATE(:dtvenc, 'YYYY-MM-DD'),
                TO_DATE(:dtvencorig, 'YYYY-MM-DD'),
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

        const toDateStr = (v) => {
            if (!v) return null;
            const d = v instanceof Date ? v : new Date(v);
            if (isNaN(d.getTime())) return null;
            return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
        };

        await connection.execute(ssqlInsertPccorren, {
            recnum:            vale.recnumlivre || recnumlivre,
            codfilial:         dadosVale.CODFILIAL,
            codfunc:           dadosVale.CODFUNC,
            historico:         dadosVale.HISTORICO,
            tipolanc:          'C',
            valor:             dadosVale.VALOR,
            numdoc:            dadosVale.NUMDOC,
            codhist:           dadosVale.CODHIST,
            historico2:        dadosVale.HISTORICO2,
            dtvenc:            toDateStr(dadosVale.DTVENC),
            dtvencorig:        toDateStr(dadosVale.DTVENCORIG),
            numvale:           dadosVale.NUMVALE,
            tipofunc:          dadosVale.TIPOFUNC,
            codemite:          dadosVale.CODEMITE,
            codfuncorig:       dadosVale.CODFUNCORIG,
            codrotina:         dadosVale.CODROTINA,
            codemiteorig:      dadosVale.CODEMITEORIG,
            cobjuros:          dadosVale.COBJUROS,
            codbanco:          dadosVale.CODBANCO,
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
            valor: dadosVale.VALOR,
            codcob: 'VALE',
            codbanco: dadosVale.CODBANCO 
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
            NVL((SELECT C.VALOR FROM PCESTCR C WHERE CODCOB = 'VALE' AND CODBANCO = :codbanco), 0),          
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
            codbanco: dadosVale.CODBANCO,
            valor: dadosVale.VALOR,
            numcarr: dadosVale.NUMVALE,
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
            valor: dadosVale.VALOR,
            codcob: 'D',
            codbanco: dadosVale.CODBANCO 
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
            NVL((SELECT C.VALOR FROM PCESTCR C WHERE CODCOB = 'D' AND CODBANCO = :codbanco), 0),          
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
                        codbanco: dadosVale.CODBANCO,
                        valor: dadosVale.VALOR,
                        numcarr: dadosVale.NUMVALE,
            codfunc: jsonReq.id_func_baixa
        });

    }

    await connection.commit();
        return {mensagem: 'Vale(s) baixado com sucesso.'};

   } catch (error) {
     await connection.rollback();
         throw error;
   }finally{
     await connection.close();
   }                                     

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
