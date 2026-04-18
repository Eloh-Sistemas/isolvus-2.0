import { executeQuery } from "../config/database.js";

export async function GetConsultarItemDespesa(filtros) {

    try {


        const ssql = `
        SELECT VW1.* FROM ( SELECT A.ID_ITEM as "codigo", A.DESCRICAO as "descricao", A.DESCRICAO2 "descricao2"   
        FROM BSTAB_ITEM A   
        WHERE 1=1   
        AND A.id_grupo_empresa IN ( :id_grupo_empresa )   
        AND ( UPPER(A.ID_ITEM) LIKE UPPER(:filtroId)  
        OR UPPER(A.DESCRICAO) LIKE UPPER(:filtroLike) ) 
        AND A.TIPODEITEM = :tipoitem) VW1 WHERE ROWNUM < 20   
        `;       

        const params = {
            filtroLike: `%${filtros.descricao}%`, // Para buscas parciais no nome     
            filtroId: `${filtros.descricao}%`,
            id_grupo_empresa : filtros.id_grupo_empresa,
            tipoitem: filtros.tipo
        };

        const result = await executeQuery(ssql, params);
        return result;


    } catch (error) {
        throw new Error(error);        
    }
    
}


export async function GetConsultarItemDespesaGeral(filtros) {

    try {


        const ssql = `
        SELECT VW1.* FROM ( SELECT A.ID_ITEM as "codigo", A.DESCRICAO as "descricao", A.DESCRICAO2 "descricao2"   
        FROM BSTAB_ITEM A   
        WHERE 1=1   
        AND A.id_grupo_empresa IN ( :id_grupo_empresa )   
        AND ( UPPER(A.ID_ITEM) LIKE UPPER(:filtroId)  
        OR UPPER(A.DESCRICAO) LIKE UPPER(:filtroLike) )) VW1 WHERE ROWNUM < 20   
        `;       

        const params = {
            filtroLike: `%${filtros.descricao}%`, // Para buscas parciais no nome     
            filtroId: `${filtros.descricao}%`,
            id_grupo_empresa : filtros.id_grupo_empresa
        };

        const result = await executeQuery(ssql, params);
        return result;


    } catch (error) {
        throw new Error(error);        
    }
    
}

export async function GetConsultarItemCadastro(filtros) {

    try {

        const ssql = `
           SELECT a.id_item, a.descricao, a.descricao2, a.dtcadastro, a.id_usercadastro, u.nome, tipodeitem  
           FROM BSTAB_ITEM A, BSTAB_USUSARIOS U  
           WHERE A.ID_GRUPO_EMPRESA = :id_grupo_empresa  
           AND A.ID_ITEM = :filtroId  
           AND A.ID_USERCADASTRO = U.ID_USUARIO_ERP  
           AND A.ID_GRUPO_EMPRESA = U.ID_GRUPO_EMPRESA 
          `;

        const params = {
            filtroId: filtros.id_item,
            id_grupo_empresa : filtros.id_grupo_empresa
        };

        const result = await executeQuery(ssql, params);
        return result;


    } catch (error) {
        throw new Error(error);        
    }
    
}

export async function SetCadastrarItem(dados) {

    try {
        
     const ssql = `
         insert into bstab_item 
         (id_item, descricao, descricao2, dtcadastro, id_usercadastro, id_grupo_empresa, tipodeitem) 
         values 
         ( (SELECT NVL(MAX(A.ID_ITEM)+1 , 1) FROM BSTAB_ITEM A) , :descricao, :descricao2, SYSDATE, :id_usercadastro, :id_grupo_empresa, :tipodeitem) 
     `;

     await executeQuery(ssql,{
        id_grupo_empresa: dados.id_grupo_empresa,
        descricao: dados.descricao,
        descricao2: dados.descricao2,
        id_usercadastro: dados.id_usuario,
        tipodeitem: dados.tipodeitem
     }, true);

     return {mensagem: 'Item cadastrado com sucesso !'}

    } catch (error) {
       throw new Error(error);         
    }
    
}

export async function SetAlterarItem(dados) {

    try {
        
     const ssql = `
         update bstab_item 
         set 
         descricao = :descricao, 
         descricao2 = :descricao2, 
         dtcadastro = sysdate, 
         id_usercadastro = :id_usercadastro, 
         tipodeitem = :tipodeitem
         where id_item = :id_item 
     `;

     await executeQuery(ssql,{
        descricao: dados.descricao,
        descricao2: dados.descricao2,
        id_usercadastro: dados.id_usuario,
        id_item: dados.id_item,
        tipodeitem: dados.tipodeitem
     }, true);

     return {mensagem: 'Item alterado com sucesso !'}

    } catch (error) {
       throw new Error(error);         
    }
    
}