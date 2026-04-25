import OracleDB from "oracledb";
import { getConnection } from "../config/database.js";

export async function GetConsultar(idGrupoEmpresa, filtros = {}) {

    let sql = `
        SELECT 
            A.ID_EMPRESA_ERP AS "Filial",
            A.ANO             AS "Ano",
            A.CODCONTA        AS "CodConta",
            A.CONTA           AS "Conta",
            A.M1              AS "Janeiro",
            A.M2              AS "Fevereiro",
            A.M3              AS "Março",
            A.M4              AS "Abril",
            A.M5              AS "Maio",
            A.M6              AS "Junho",
            A.M7              AS "Julho",
            A.M8              AS "Agosto",
            A.M9              AS "Setembro",
            A.M10             AS "Outubro",
            A.M11             AS "Novembro",
            A.M12             AS "Dezembro",
            (A.M1+A.M2+A.M3+A.M4+A.M5+A.M6+A.M7+A.M8+A.M9+A.M10+A.M11+A.M12) AS "Total"
        FROM BSTAB_ORACMENTOMENSALDADOS A
        WHERE A.ID_GRUPO_EMPRESA = :id_grupo_empresa
    `;

    const binds = { id_grupo_empresa: idGrupoEmpresa };

    if (filtros.filial) {
        sql += ` AND A.ID_EMPRESA_ERP = :filial`;
        binds.filial = filtros.filial;
    }
    if (filtros.ano) {
        sql += ` AND A.ANO = :ano`;
        binds.ano = filtros.ano;
    }
    if (filtros.codconta) {
        sql += ` AND UPPER(A.CODCONTA) LIKE UPPER(:codconta)`;
        binds.codconta = `%${filtros.codconta}%`;
    }
    if (filtros.conta) {
        sql += ` AND UPPER(A.CONTA) LIKE UPPER(:conta)`;
        binds.conta = `%${filtros.conta}%`;
    }

    sql += ` ORDER BY A.ID_EMPRESA_ERP, A.ANO, A.CODCONTA`;

    const connection = await getConnection();
    try {
        const result = await connection.execute(sql, binds, { outFormat: OracleDB.OUT_FORMAT_OBJECT });
        return result.rows;
    } finally {
        await connection.close();
    }
}

export async function SetAtualizar(row, idGrupoEmpresa, idUsuario) {

    const sql = `
        UPDATE BSTAB_ORACMENTOMENSALDADOS SET
            CONTA           = :conta,
            M1              = :m1,
            M2              = :m2,
            M3              = :m3,
            M4              = :m4,
            M5              = :m5,
            M6              = :m6,
            M7              = :m7,
            M8              = :m8,
            M9              = :m9,
            M10             = :m10,
            M11             = :m11,
            M12             = :m12,
            ID_USUARIO_ERP  = :id_usuario_erp
        WHERE CODCONTA          = :codconta
          AND ANO               = :ano
          AND ID_EMPRESA_ERP    = :id_empresa_erp
          AND ID_GRUPO_EMPRESA  = :id_grupo_empresa
    `;

    const binds = {
        conta:          row.Conta,
        m1:             Number(row.Janeiro)   || 0,
        m2:             Number(row.Fevereiro) || 0,
        m3:             Number(row.Março)     || 0,
        m4:             Number(row.Abril)     || 0,
        m5:             Number(row.Maio)      || 0,
        m6:             Number(row.Junho)     || 0,
        m7:             Number(row.Julho)     || 0,
        m8:             Number(row.Agosto)    || 0,
        m9:             Number(row.Setembro)  || 0,
        m10:            Number(row.Outubro)   || 0,
        m11:            Number(row.Novembro)  || 0,
        m12:            Number(row.Dezembro)  || 0,
        id_usuario_erp: idUsuario,
        codconta:       row.CodConta,
        ano:            row.Ano,
        id_empresa_erp: row.Filial,
        id_grupo_empresa: idGrupoEmpresa
    };

    const connection = await getConnection();
    try {
        const result = await connection.execute(sql, binds);
        await connection.commit();
        if (result.rowsAffected === 0) {
            throw new Error('Nenhum registro encontrado para atualizar.');
        }
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        await connection.close();
    }
}

export async function SetExcluir(row, idGrupoEmpresa, idUsuario) {
    const sql = `
        DELETE FROM BSTAB_ORACMENTOMENSALDADOS
        WHERE CODCONTA          = :codconta
          AND ANO               = :ano
          AND ID_EMPRESA_ERP    = :id_empresa_erp
          AND ID_GRUPO_EMPRESA  = :id_grupo_empresa
    `;
    const binds = {
        codconta:         row.CodConta,
        ano:              row.Ano,
        id_empresa_erp:   row.Filial,
        id_grupo_empresa: idGrupoEmpresa
    };
    const connection = await getConnection();
    try {
        const result = await connection.execute(sql, binds);
        await connection.commit();
        if (result.rowsAffected === 0) {
            throw new Error('Nenhum registro encontrado para excluir.');
        }
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        await connection.close();
    }
}

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