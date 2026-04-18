import axios from "axios";
import { executeQuery } from "../config/database.js";
import {authApiClient} from '../config/authApiClient.js';
import { consultarIntegracao } from "./integracaoComClienteModel.js";

export async function getListarGeoLocalizacaoPendenteCliente(jsonReq) {
  // Inicializa a consulta SQL com as junções e a cláusula WHERE fixa
  let ssqlConsulta = `
    SELECT
        V.ID_CLIENTE,
        C.IDCLIENTEVENDAERP,
        C.CLIENTE,
        C.CGC,
        C.LATITUDE,
        C.LONGITUDE,
        V.ID_PROMOTOR,
        S.NOME,
        V.PRO_LATITUDE_CHECKIN,
        V.PRO_LONGITUDE_CHECKIN,
        V.DISTANCIA_ATEDIMENTO,
        V.DTCHECKIN,
        (select MAX(A.DATAAJUSTE) from BSTAB_LOGAJUSTECLIENTE a where a.id_cliente = V.ID_CLIENTE) DTULTAJUSTE,
        V.ID_JUSTIFICATIVADISTANCIA,
        UPPER(J.JUSTIFICATIVA) JUSTIFICATIVA,
        initcap(C.ENDERECO||', '||C.BAIRRO||', '||C.CIDADE||', '||C.CEP||', '||C.ESTADO) ENDERECOATUAL
    FROM BSTAB_VISITACLIENTE V
    JOIN BSTAB_CLIENTEVENDA C ON V.ID_CLIENTE = C.IDCLIENTEVENDA
    JOIN BSTAB_USUSARIOS S ON V.ID_PROMOTOR = S.ID_USUARIO_ERP
    JOIN BSTAB_JUSTIFICATIVA J ON V.ID_JUSTIFICATIVADISTANCIA = J.IDJUSTIFICATIVA
    WHERE
        V.DTCHECKIN = (
            SELECT MAX(V2.DTCHECKIN)
            FROM BSTAB_VISITACLIENTE V2
            WHERE V2.ID_CLIENTE = V.ID_CLIENTE
        )
        AND V.DTCHECKIN > NVL((select MAX(A.DATAAJUSTE) from BSTAB_LOGAJUSTECLIENTE a where a.id_cliente = V.ID_CLIENTE), TO_DATE('01/01/1980', 'DD/MM/YYYY'))
        AND V.ID_JUSTIFICATIVADISTANCIA = 1
  `;
  
  let param = {};

  // Adiciona a cláusula de filtro apenas se o filtro estiver presente e não vazio
  if (jsonReq.filtro && jsonReq.filtro !== "") {
    // Adiciona o filtro com a sintaxe correta para parâmetros de consulta
    ssqlConsulta += ` AND (C.CLIENTE LIKE :filtro OR REGEXP_REPLACE(C.CGC, '[^0-9]', '') LIKE :filtro)`;
    
    // Define o objeto de parâmetros com o valor do filtro, incluindo os curingas
    param = { filtro: `%${jsonReq.filtro}%` };
  }

  try {
    const result = await executeQuery(ssqlConsulta, param);
    return result;
  } catch (error) {
    // É uma boa prática logar o erro para fins de depuração
    console.error("Erro na consulta de geolocalização:", error);
    throw error;
  }
}


export async function setAceitarGeoLocalizacaoCliente(jsonReq) {
          
      const ssqlAlterar = `
      UPDATE BSTAB_CLIENTEVENDA CL SET CL.LATITUDE = :latitude, CL.LONGITUDE = :longitude WHERE CL.IDCLIENTEVENDA = :id_cliente AND CL.IDGRUPOEMPRESA = :id_grupo_empresa
      `;  

      const param = {    
        latitude: jsonReq.latitude,
        longitude: jsonReq.longitude,
        id_cliente: jsonReq.id_cliente,
        id_grupo_empresa: jsonReq.id_grupo_empresa
      };


      const ssqlInserLog =`
      insert into bstab_logajustecliente
        (id_grupo_empresa, id_cliente, tipoajuste, dataajuste, id_usuario)
      values
        (:id_grupo_empresa, :id_cliente, :tipoajuste, sysdate, :id_usuario)
      `;

      const paramInsert = {
        id_grupo_empresa: jsonReq.id_grupo_empresa,
        id_cliente: jsonReq.id_cliente,
        tipoajuste: "AGL",
        id_usuario: jsonReq.id_usuario
      }



      try {
          
          const integracao = await consultarIntegracao(jsonReq.id_grupo_empresa, 16);
            
          if (integracao[0].realizarintegracao == 'S'){       

            const response = await axios.post(integracao[0].host+`/v1/clientes/alterar/geolocalizacao`, 
              {
                latitude: jsonReq.latitude,
                longitude: jsonReq.longitude,
                id_cliente: jsonReq.idclientevendaerp
              }
              , authApiClient);
              
          }     

      } catch (error) {
        throw 'Erro na integração servidor cliente';
      }

     
      try {
                 
        await executeQuery(ssqlAlterar, param, true);
        await executeQuery(ssqlInserLog, paramInsert, true);

        return {mensagem: "Alterada com sucesso !"}

      } catch (error) {
        throw error;
      }
      
}


export async function setRejeitarGeoLocalizacaoCliente(jsonReq) {
    

      const ssqlInserLog =`
      insert into bstab_logajustecliente
        (id_grupo_empresa, id_cliente, tipoajuste, dataajuste, id_usuario)
      values
        (:id_grupo_empresa, :id_cliente, :tipoajuste, sysdate, :id_usuario)
      `;

      const paramInsert = {
        id_grupo_empresa: jsonReq.id_grupo_empresa,
        id_cliente: jsonReq.id_cliente,
        tipoajuste: "RGL",
        id_usuario: jsonReq.id_usuario
      }


      try {
        
        await executeQuery(ssqlInserLog, paramInsert, true);

        return {mensagem: "Rejeitado com sucesso !"}

      } catch (error) {
        throw error;
      }
      


}