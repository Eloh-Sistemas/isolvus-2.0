import { executeQuery, getConnection } from "../config/database.js";

export async function getconsultarAtividadePromotorEditcomplet(filtros) {
     try {
        
                const ssql = `
                 SELECT VW1.*
                    FROM (
                    SELECT A.ID_ATIVIDADE CODIGO,
                        A.DESCRICAO DESCRICAO,
                        A.DESCRICAO DESCRICAO2
                    FROM BSTAB_ATIVIDADEPROMOTOR A
                    WHERE UPPER(A.ID_GRUPO_EMPRESA) = :id_grupo_empresa
                    AND UPPER(A.DESCRICAO) LIKE UPPER(:filtroLike)
                    )VW1 WHERE ROWNUM < 12
                `;
        
                const params = {
                    filtroLike: `%${filtros.descricao}%`, // Para buscas parciais no nome     
                    id_grupo_empresa : filtros.id_grupo_empresa
                };
        
                const result = await executeQuery(ssql, params);  
                return result;
        
        
            } catch (error) {
                throw new Error(error);        
            }
}


export async function getconsultarAtividadePromotorGeral(filtros) {
     try {
    
                const ssql = `
                
                    SELECT A.ID_ATIVIDADE CODIGO,
                        A.DESCRICAO DESCRICAO
                    FROM BSTAB_ATIVIDADEPROMOTOR A
                    WHERE UPPER(A.ID_GRUPO_EMPRESA) = :id_grupo_empresa                    
                `;
        
                        
                const result = await executeQuery(ssql, {id_grupo_empresa: filtros.id_grupo_empresa});  
                return result;
        
        
            } catch (error) {
                throw new Error(error);        
            }
}


export async function getconsultarEquipeTreinamentoEditcomplet(filtros) {
    try {
       
               const ssql = `
                SELECT VW1.*
                   FROM (
                   SELECT A.ID_EQUIPE CODIGO,
                        A.EQUIPE DESCRICAO,
                        A.EQUIPE DESCRICAO2
                    FROM BSTAB_EQUIPE A
                   WHERE UPPER(A.ID_GRUPO_EMPRESA) = :id_grupo_empresa
                   AND UPPER(A.EQUIPE) LIKE UPPER(:filtroLike)
                   )VW1 WHERE ROWNUM < 5
               `;
       
               const params = {
                   filtroLike: `%${filtros.descricao}%`, // Para buscas parciais no nome     
                   id_grupo_empresa : filtros.id_grupo_empresa
               };
       
               const result = await executeQuery(ssql, params);  
               return result;
       
       
           } catch (error) {
               throw new Error(error);        
           }
}


export async function getconsultarEquipeTreinamentoGeral(filtros) {
    try {
       
               console.log(filtros.id_grupo_empresa);

               const ssql = `
                 SELECT A.ID_EQUIPE CODIGO,
                        A.EQUIPE DESCRICAO,
                        A.EQUIPE DESCRICAO2
                    FROM BSTAB_EQUIPE A
                   WHERE UPPER(A.ID_GRUPO_EMPRESA) = :id_grupo_empresa
                   
               `;                
       
               const result = await executeQuery(ssql, {id_grupo_empresa : filtros.id_grupo_empresa});  
               return result;
       
       
           } catch (error) {
               throw new Error(error);        
           }
}


export async function setItemAtividade(jsonReq) {

  const ssqlInsert = `
    insert into bstab_visitacli_item
    (id_visita, id_atividade, id_item, qt, tipoitem, id_evidencia)
    values
    (:id_visita, :id_atividade, :id_item, :qt, :tipoitem, :id_evidencia)
  `;  

  const connection = await getConnection();
  try {

    await connection.execute(ssqlInsert, {
        id_evidencia: jsonReq.id_evidencia,
        id_visita: jsonReq.id_visita,
        id_atividade: jsonReq.id_atividade,
        id_item: jsonReq.id_item,
        qt: jsonReq.qt,
        tipoitem: jsonReq.tipoitem
    });
    

    await connection.commit();

    return {mensagem: 'Item inserido com sucesso !'}
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}


export async function getItemAtividade(jsonReq) {
    try {
       
               const ssql = `
                SELECT VW1.ID_ITEM coditem,
                        VW1.DESCRICAO produto,
                        VW1.QT quantidade,
                        VW1.TIPOITEM tipo,
                        reg
                    FROM (
                    SELECT A.ID_ITEM,
                        B.DESCRICAO,
                        A.QT,
                        A.TIPOITEM,
                        A.ROWID reg
                    FROM bstab_visitacli_item A, BSTAB_ITEM B
                    WHERE A.ID_ITEM = B.ID_ITEM
                                    AND A.ID_VISITA = :id_visita
                                    AND A.ID_ATIVIDADE = :id_atividade
                                    AND A.id_evidencia = :id_evidencia
                                ) VW1
                    ORDER BY reg`;
       
               const params = {
                id_visita: jsonReq.id_visita,
                id_visita: jsonReq.id_atividade,
                id_evidencia: jsonReq.id_evidencia
               };
       
               const result = await executeQuery(ssql, jsonReq);  
               return result;
       
       
           } catch (error) {
               throw new Error(error);        
           }
}

export async function deleteItemAtividade(jsonReq) {
           
    const ssql = `
    DELETE 
    FROM bstab_visitacli_item G 
    WHERE G.rowid = :registro`;       

    const connection = await getConnection();
    try {

        await connection.execute(ssql, {
            registro: jsonReq.registro
        });        

        await connection.commit();

        return {mensagem: 'Item exluirdo com sucesso !'}
        
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        await connection.close();
    }

}



