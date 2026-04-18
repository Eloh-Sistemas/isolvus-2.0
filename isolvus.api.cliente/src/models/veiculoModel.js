import { executeQuery } from "../config/database.js";

export async function getConsultaVeiculo() {

    const ssql = `
        SELECT A.RECNUM ID_LANCAMENTO,
       A.NUMVALE ID_VALE,
       A.CODFILIAL ID_FILIAL,
       A.DTLANC DATA_LANCAMENTO,
       A.DTVENC DATA_VENCIMENTO,
       A.DTBAIXAVALE DATA_BAIXA,
       A.CODFUNC ID_FUNC,
       A.TIPOLANC TIPOLANC,
       A.VALOR,
       A.HISTORICO,
       A.CODFUNBAIXA ID_FUNC_BAIXA
    FROM PCCORREN A, PCEMPR R
    WHERE 1=1
    AND A.CODFUNC = R.MATRICULA
    AND (
        A.DTLANC >= TRUNC(SYSDATE)
        OR A.DTBAIXAVALE = TRUNC(SYSDATE)
    )
    `;

    
    try {
        
        const result = await executeQuery(ssql);
        return result;

    } catch (error) {
        throw 'consulta usuario: '+error
    }

}