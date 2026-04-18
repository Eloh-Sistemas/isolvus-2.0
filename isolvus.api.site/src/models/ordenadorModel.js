import { executeQuery } from "../config/database.js";

export async function GetconsultarVinculoOrdenador(jsonReq) {
    try {
        let ssql = `
            SELECT F.ID_USUARIO_ERP, 
                   A.NOME, 
                   C.ID_CONTA, 
                   F.ID_CONTA_ERP, 
                   C.DESCRICAO AS CONTA, 
                   F.ID_EMPRESA_ERP, 
                   E.RAZAOSOCIAL 
            FROM BSTAB_ORDENADORES F
            JOIN BSTAB_USUSARIOS A ON F.ID_USUARIO_ERP = A.ID_USUARIO
              AND F.ID_GRUPO_EMPRESA = A.ID_GRUPO_EMPRESA
            JOIN BSTAB_CONTAGERENCIAL C ON F.ID_CONTA_ERP = C.ID_CONTAERP 
              AND F.ID_GRUPO_EMPRESA = C.ID_GRUPO_EMPRESA 
            JOIN BSTAB_EMPRESAS E ON F.ID_EMPRESA_ERP = E.ID_ERP 
              AND F.ID_GRUPO_EMPRESA = E.ID_GRUPO_EMPRESA
            WHERE F.ID_GRUPO_EMPRESA = :id_grupo_empresa
        `;

        let condicional = [];
        let parametros = { id_grupo_empresa: jsonReq.id_grupo_empresa };

        if (jsonReq.id_usuario_erp && jsonReq.id_usuario_erp > 0) {
            condicional.push("F.ID_USUARIO_ERP = :id_usuario_erp");
            parametros.id_usuario_erp = jsonReq.id_usuario_erp;
        }

        if (jsonReq.id_conta_erp && jsonReq.id_conta_erp > 0) {
            condicional.push("F.ID_CONTA_ERP = :id_conta_erp");
            parametros.id_conta_erp = jsonReq.id_conta_erp;
        }

        if (jsonReq.id_filial_erp && jsonReq.id_filial_erp > 0) {
            condicional.push("F.ID_EMPRESA_ERP = :id_empresa_erp");
            parametros.id_empresa_erp = jsonReq.id_filial_erp;
        }

        if (condicional.length > 0) {
            ssql += " AND " + condicional.join(" AND ");
        }
        
        const result = await executeQuery(ssql, parametros);
        return result;

    } catch (error) {
        throw new Error("Erro ao consultar vínculo do ordenador.");
    }
}


export async function SetcadastrarVinculoOrdenador(jsonReq) {

    try {
   
       const sqlQtVinculo = `
       SELECT COUNT(*) QT 
       FROM BSTAB_ORDENADORES A 
       WHERE A.ID_GRUPO_EMPRESA = :id_grupo_empresa
       AND A.ID_USUARIO_ERP = :id_usuario_erp
       AND A.ID_EMPRESA_ERP = :id_empresa_erp
       AND A.ID_CONTA_ERP = :id_conta_erp
       `;

       const sqlInsertViculo = `
        insert into bstab_ordenadores 
        (id_usuario_erp, id_empresa_erp, id_conta_erp, id_grupo_empresa) 
        values 
        (:id_usuario_erp, :id_empresa_erp, :id_conta_erp, :id_grupo_empresa)
       `;
        
       const idusuario = await executeQuery('select s.id_usuario_erp from bstab_ususarios s where s.id_usuario = :id_usuario_erp', {id_usuario_erp: jsonReq.id_usuario_erp});
       const idempresa = await executeQuery('select s.id_erp from bstab_empresas s where s.id_erp = :id_erp', {id_erp: jsonReq.id_filial_erp});
       const idcontaerp = await executeQuery('select s.id_contaerp from bstab_contagerencial s where s.id_contaerp = :id_contaerp', {id_contaerp: jsonReq.id_conta_erp});
       const idgrupoempresa = await executeQuery('select s.id_grupo_empresa from bstab_grupo_empresa s where s.id_grupo_empresa = :id_grupo_empresa', {id_grupo_empresa: jsonReq.id_grupo_empresa});
       const qtvinculoexistente = await executeQuery(sqlQtVinculo, 
        {
            id_grupo_empresa: jsonReq.id_grupo_empresa,
            id_usuario_erp: jsonReq.id_usuario_erp,
            id_empresa_erp: jsonReq.id_filial_erp,
            id_conta_erp: jsonReq.id_conta_erp
        });
        

       if (idgrupoempresa.length <= 0){
        throw "Grupo de empresa não existe !";            
       }

       if (idempresa.length <= 0){
        throw "Filial não existe !";            
       }

       if (idusuario.length <= 0){
        throw "Ordenador não existe !";            
       }

       if (idcontaerp.length <= 0){
        throw "Conta não existe !";            
       }

       if (qtvinculoexistente[0].qt > 0){
        throw "Vinculo ja existe !";            
       }
          
      
       await executeQuery(sqlInsertViculo,{
        id_grupo_empresa: jsonReq.id_grupo_empresa,
        id_usuario_erp: jsonReq.id_usuario_erp,
        id_empresa_erp: jsonReq.id_filial_erp,
        id_conta_erp: jsonReq.id_conta_erp
       },true);
       
       return {menssagem: "Vinculo realizado com sucesso !"}

    } catch (error) {
        console.log(error)
        throw error;        
    }

}

export async function SetexcluirVinculoOrdenador(jsonReq) {

    try {
        
        const ssql =`
         DELETE 
         FROM BSTAB_ORDENADORES A 
         WHERE A.ID_GRUPO_EMPRESA = :id_grupo_empresa
         AND A.ID_USUARIO_ERP = :id_usuario_erp
         AND A.ID_EMPRESA_ERP = :id_empresa_erp
         AND A.ID_CONTA_ERP = :id_conta_erp
        `;

        await executeQuery(ssql, {
            id_grupo_empresa: jsonReq.id_grupo_empresa,
            id_usuario_erp: jsonReq.id_usuario_erp,
            id_empresa_erp: jsonReq.id_filial_erp,
            id_conta_erp: jsonReq.id_conta_erp 
        },true);

        return {menssagem: "Vinculo excluido com sucesso !"}

    } catch (error) {
        throw error;
    }
    
}