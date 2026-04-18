import OracleDB from "oracledb";
import { getConnection } from "../config/database.js";

export async function SetReceber(jsonReq, jsonParam) {

      
    const sqlConsultaConta = `
     SELECT A.ID_CONTAERP                          
     FROM BSTAB_CONTAGERENCIAL A                  
     WHERE A.ID_GRUPO_EMPRESA = :id_grupo_empresa
     AND A.ID_CONTAERP = :id_contaerp
    `;

    const sqlConsultarFilial = `
    SELECT A.*                   
    FROM BSTAB_EMPRESAS A       
    WHERE A.ID_ERP = :id_erp
    AND A.ID_GRUPO_EMPRESA = :id_grupo_empresa
    `;

    const sqlDelete = `
    DELETE                                       
    FROM BSTAB_ORACMENTOMENSALDADOS A           
    WHERE A.CODCONTA = :codconta
    AND A.ANO = :ano
    AND A.ID_EMPRESA_ERP = :id_empresa_erp
    AND A.ID_GRUPO_EMPRESA = :id_grupo_empresa
    `;

    const sqlInsert = `
     insert into bstab_oracmentomensaldados values 
     (:codconta, :conta, :m1, :m2, :m3, :m4, :m5, :m6, :m7, :m8, :m9, :m10, :m11, :m12, :ano, :id_empresa_erp, :id_grupo_empresa, :id_usuario_erp, SYSDATE)
    `;

    const connection = await getConnection();

    try {
                
        for (const it of jsonReq) {

            // consulta se a conta existe
            const resultConta = await connection.execute(sqlConsultaConta, {
            id_contaerp: it.CodConta,
            id_grupo_empresa: jsonParam.idgrupoempresa
            }, { outFormat: OracleDB.OUT_FORMAT_OBJECT });            

            if (resultConta.rows.length == 0){
                throw 'Conta '+it.CodConta+' não esta cadastrado'
            }

            // consulta se a filial existe
            const resultFilial = await connection.execute(sqlConsultarFilial, {
            id_erp: it.Filial,
            id_grupo_empresa: jsonParam.idgrupoempresa
            }, { outFormat: OracleDB.OUT_FORMAT_OBJECT });            

            if (resultFilial.rows.length == 0){
                throw 'Filial '+it.Filial+' não esta cadastrado'
            }

            await connection.execute(sqlDelete,{
                codconta: it.CodConta,
                ano: it.Ano,
                id_empresa_erp: it.Filial,
                id_grupo_empresa: jsonParam.idgrupoempresa
            });

            await connection.execute(sqlInsert,{
                codconta: it.CodConta, 
                conta: it.Conta, 
                m1: it.Janeiro, 
                m2: it.Fevereiro, 
                m3: it.Março, 
                m4: it.Abril, 
                m5: it.Maio, 
                m6: it.Junho, 
                m7: it.Julho, 
                m8: it.Agosto, 
                m9: it.Setembro, 
                m10: it.Outubro, 
                m11: it.Novembro, 
                m12: it.Dezembro, 
                ano: it.Ano, 
                id_empresa_erp: it.Filial, 
                id_grupo_empresa: jsonParam.idgrupoempresa, 
                id_usuario_erp: jsonParam.idusuario
            });
                                 
        }

        await connection.commit();

    } catch (error) {        
        console.log(error);
        await connection.rollback();
        throw error;
    }    

}