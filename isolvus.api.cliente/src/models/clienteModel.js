import { executeQuery } from "../config/database.js";

export async function getConsultaCliente() {

    const ssql = `
        SELECT A.CODCLI CODIGO,
       A.CLIENTE,
       A.CGCENT CGC,
       A.TELENT CONTATO,
       A.EMAIL,
       A.LATITUDE,
       A.LONGITUDE,
       A.ENDERENT ENDERECO,
       A.NUMEROENT NUMEROCASA,
       A.BAIRROENT BAIRRO,
       A.MUNICENT CIDADE,
       A.CEPENT CEP,
       A.ESTENT ESTADO,
       1 ID_GRUPO_EMPRESA
  FROM PCCLIENT A
  WHERE 1=1
  AND (TRUNC(A.DTCADASTRO) = TRUNC(SYSDATE)
  OR TRUNC(A.DTULTALTER) = TRUNC(SYSDATE)
  OR TRUNC(A.DTEXCLUSAO) = TRUNC(SYSDATE)
  )
    `;

    
    try {
        
        const result = await executeQuery(ssql);
        return result;

    } catch (error) {
        throw error
    }

}