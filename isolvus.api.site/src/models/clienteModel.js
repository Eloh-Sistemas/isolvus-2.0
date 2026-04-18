import OracleDB from "oracledb";
import { executeQuery, getConnection } from "../config/database.js";
import { authApiClient } from "../config/authApiClient.js";
import axios from "axios";
import { atualizaDataProximaAtualizcao } from "./integracaoComClienteModel.js";



export async function GetConsultarClienteComplet(filtros) {


     try {
    
            const ssql = `
             SELECT VW1.*
               FROM (
              SELECT    f.idclientevenda codigo, 
                        f.cliente descricao, 
                        f.cgc descricao2
                      FROM BSTAB_CLIENTEVENDA F 
                      WHERE UPPER(F.IDGRUPOEMPRESA) = :id_grupo_empresa
                      AND (
                          UPPER(F.CLIENTE) LIKE UPPER(:filtroLike)
                          OR UPPER(REPLACE(REPLACE(REPLACE(F.CGC, '.', ''), '/', ''), '-', '')) LIKE REPLACE(REPLACE(REPLACE(:filtroId, '.', ''), '/', ''), '-', '')
                          OR UPPER(F.CLIENTE) LIKE UPPER(:filtroLike)
                      )
                ) VW1 WHERE ROWNUM < 12
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


export async function GetConsultarClienteID(filtros) {


    try {
   
        const ssql = `
                  SELECT f.*
                    FROM BSTAB_CLIENTEVENDA F 
                    WHERE UPPER(F.IDGRUPOEMPRESA) = :id_grupo_empresa
                    AND IDCLIENTEVENDA = :idclientevenda
        `;

        const params = {
            idclientevenda: filtros.idclientevenda, 
            id_grupo_empresa : filtros.id_grupo_empresa
        };

        const result = await executeQuery(ssql, params);  
        return result[0];


    } catch (error) {
        throw new Error(error);        
    }
       
}

export async function buscarCliente(integracao) {

    try {
                                            
        // consultar na api do cliente
  
        const respose = await axios.get(integracao.host+`/v1/Cliente`, authApiClient);  
        
        if (respose.status == 200){  
            
            //console.log(respose.data)
            // Atualiza na base do intranet
            await armazenarCliente(respose.data);                                            
            await atualizaDataProximaAtualizcao(integracao.id_servidor, integracao.id_integracao);  
        }
  
    } catch (error) {
        console.log("Erro ao integrar cliente id host: "+integracao.host)        
        console.log(error)        
    }
  
  }


  export async function armazenarCliente(dataCliente) {
    // mudar o for para esta função para trabalhar melhor as transações  do banco


    console.log(dataCliente);

    const ssqlValidar = `
           SELECT * 
            FROM BSTAB_CLIENTEVENDA A
            WHERE A.IDGRUPOEMPRESA = :id_grupo_empresa
            AND A.IDCLIENTEVENDAERP = :idclientevendaerp
        `;
    
    const update = `
         update bstab_clientevenda
            set 
                cliente = :cliente,
                cgc = :cgc,
                contato = :contato,
                email = :email,
                latitude = :latitude,
                longitude = :longitude,
                endereco = :endereco,
                numerocasa = :numerocasa,
                bairro = :bairro,
                cidade = :cidade,
                cep = :cep,
                estado = :estado,
                idgrupoempresa = :idgrupoempresa
            where idclientevenda = :idclientevenda 
    `;

    const insert = `
            insert into bstab_clientevenda
                (idclientevenda,
                cliente,
                cgc,
                contato,
                email,
                latitude,
                longitude,
                endereco,
                numerocasa,
                bairro,
                cidade,
                cep,
                estado,
                idclientevendaerp,
                idgrupoempresa)
                values
                ((SELECT NVL(MAX(A.idclientevenda +1),1)  FROM bstab_clientevenda A),
                :cliente,
                :cgc,
                :contato,
                :email,
                :latitude,
                :longitude,
                :endereco,
                :numerocasa,
                :bairro,
                :cidade,
                :cep,
                :estado,
                :idclientevendaerp,
                :idgrupoempresa)                                                  
    `;
        
    const connection = await getConnection();        
    
        //console.log(dataVeiculo)

        try {
            
            for (const cliente of dataCliente) {
                
                
                const validar = await connection.execute(ssqlValidar, {
                    idclientevendaerp: cliente.codigo,
                    id_grupo_empresa: cliente.id_grupo_empresa
                  }, { outFormat: OracleDB.OUT_FORMAT_OBJECT });



                  //ID_VEICULO
                //console.log(validar.rows)
                if (validar.rows.length > 0){                                         
            
                    await connection.execute(update, {
                        cliente: cliente.cliente,
                        cgc: cliente.cgc,
                        contato: cliente.contato,
                        email: cliente.email,
                        latitude: cliente.latitude,
                        longitude: cliente.longitude,
                        endereco: cliente.endereco,
                        numerocasa: cliente.numerocasa,
                        bairro: cliente.bairro,
                        cidade: cliente.cidade,
                        cep: cliente.cep,
                        estado: cliente.estado,
                        idclientevenda: validar.rows[0].IDCLIENTEVENDA,
                        idgrupoempresa: cliente.id_grupo_empresa
                    });
                                        
                }else{
            
                    await connection.execute(insert,{
                        cliente: cliente.cliente,
                        cgc: cliente.cgc,
                        contato: cliente.contato,
                        email: cliente.email,
                        latitude: cliente.latitude,
                        longitude: cliente.longitude,
                        endereco: cliente.endereco,
                        numerocasa: cliente.numerocasa,
                        bairro: cliente.bairro,
                        cidade: cliente.cidade,
                        cep: cliente.cep,
                        estado: cliente.estado,
                        idclientevendaerp: cliente.codigo,
                        idgrupoempresa: cliente.id_grupo_empresa
                    })
                
                } 

            }

            await connection.commit();
        
        } catch (error) {
            await connection.rollback();
            console.log(error)
        } finally {
            await connection.close();
        }

}