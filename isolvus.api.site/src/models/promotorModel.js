import OracleDB from "oracledb";
import { executeQuery, getConnection } from "../config/database.js";
import moment from "moment";
import { excluirArquivosPorIdRelacional } from "./uploadArquivosModal.js";


export async function GetListarAtividadePromotor(jsonReq) {
    
    const ssql = `
       select 
       a.Id_Evidencia,
       a.id_visita,
       a.id_atividade,
       b.descricao,
       a.veterinario,
       a.veterinario nomeveterinario,
       a.telefone,
       a.houvevenda,
       a.realizado,
       UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(a.COMENTARIO)) comentario,
       a.id_equipe, 
       d.equipe,
       a.qtpessoas, 
       a.fezquiz
    from bstab_visitacliente_atv a 
    join bstab_atividadepromotor b on (a.id_atividade = b.id_atividade)     
    left join bstab_equipe d on (a.id_equipe = d.id_equipe)
    where a.id_atividade = b.id_atividade
        and a.id_visita = :id_visita
        order by Id_Evidencia
    `;

    const param ={
        id_visita: jsonReq.id_visita
    }

    try {

        const result = await executeQuery(ssql, param);
        return result;
        
    } catch (error) {
       throw error;
    }
}


export async function setpromotorcheckin(jsonReq) {

    const consultaProxIdVisita = `    
     SELECT NVL(MAX(A.VALOR)+1 , 1) proximoid FROM bstab_parametrogeral A where A.ID_PARAMENTRO = 2
    `;

    const updateProxIdVisita =`
     UPDATE bstab_parametrogeral A SET A.VALOR = A.VALOR+1 WHERE A.ID_PARAMENTRO = 2
    `;

    const ssqlInsert = `
    insert into bstab_visitacliente
    (id_visita,  
    id_promotor,  
    id_grupo_empresa,  
    id_cliente,  
    reponsavelatendimentolocal,  
    dtcheckin,  
    pro_latitude_checkin,  
    pro_longitude_checkin,  
    cli_latitude,  
    cli_longitude,  
    distancia_atedimento,
    id_justificativadistancia  
    )
    values
    (:id_visita,
    :id_promotor,
    :id_grupo_empresa,
    :id_cliente,
    :reponsavelatendimentolocal,
    TO_DATE(:dtcheckin, 'YYYY-MM-DD HH24:MI:SS'),
    :pro_latitude_checkin,
    :pro_longitude_checkin,
    :cli_latitude,
    :cli_longitude,
    :distancia_atedimento,
    :id_justificativadistancia)
    `;

    const connection = await getConnection();
    try {
        

        const proxnum = await connection.execute(consultaProxIdVisita, {
                    }, { outFormat: OracleDB.OUT_FORMAT_OBJECT }); 
        
        const jsonparam = {
            id_visita: proxnum.rows[0].PROXIMOID,
            id_promotor: Number(jsonReq.idpromotor),
            id_grupo_empresa: Number(jsonReq.idgrupo_empresa),
            id_cliente: jsonReq.idcliente,
            reponsavelatendimentolocal: jsonReq.responsavel,
            dtcheckin: moment(jsonReq.dataCheckin, "DD/MM/YYYY HH:mm:ss").format("YYYY-MM-DD HH:mm:ss"),
            pro_latitude_checkin: jsonReq.latitudepromotor,
            pro_longitude_checkin: jsonReq.longitudepromotor,
            cli_latitude: jsonReq.latitudecliente,
            cli_longitude: jsonReq.longitudecliente,
            distancia_atedimento: Number(jsonReq.distancia),
            id_justificativadistancia: jsonReq.id_justificativadistancia
        }

        await connection.execute(updateProxIdVisita);
        await connection.execute(ssqlInsert, jsonparam);
        await connection.commit();

        return {mensagem: 'Checkin '+proxnum.rows[0].PROXIMOID+' realizado com sucesso !', idvisita: proxnum.rows[0].PROXIMOID}

    } catch (error) {
        await connection.rollback();
        throw error
    }finally{
        await connection.close();
    }
}

export async function getListarHistoricoDeVisita(jsonReq) {
    const ssqlConsulta =`
            SELECT A.ID_VISITA,
            A.DTCHECKIN,             
            CASE 
                WHEN A.DTCHECKOUT IS NULL THEN 'INICIADO'
                ELSE 'FINALIZADO'
            END STATUS
        FROM bstab_visitacliente A
        WHERE 1=1
        AND A.ID_PROMOTOR = :id_promotor
        AND A.ID_GRUPO_EMPRESA = :id_grupo_empresa
        AND A.ID_CLIENTE = :id_cliente
        ORDER BY A.DTCHECKIN DESC
    `;


    const jsonParam = {
        id_promotor: jsonReq.idpromotor,
        id_grupo_empresa: jsonReq.id_grupo_empresa,
        id_cliente: jsonReq.id_cliente
    }


    try {

        const result = await executeQuery(ssqlConsulta, jsonParam);
        return result;
        
    } catch (error) {
        throw error;
    }
}


export async function setupdateAtividadeevidencia(jsonReq) {

    const sqlInsert = `
     update bstab_visitacliente_atv
        set veterinario = :veterinario,
            telefone = :telefone,
            houvevenda = :houvevenda,
            realizado = :realizado,
            comentario = :comentario,       
            id_equipe = :id_equipe,
            qtpessoas = :qtpessoas,
            fezquiz = :fezquiz
        where id_visita = :id_visita
        and id_atividade = :id_atividade
        and id_evidencia = :id_evidencia`;

    const connection = await getConnection();
    try {      

        await connection.execute(sqlInsert,{
            id_visita: jsonReq.id_visita, 
            id_atividade: jsonReq.id_atividade, 
            veterinario: jsonReq.veterinario,
            telefone: jsonReq.telefone,
            houvevenda: jsonReq.houvevenda,
            realizado: jsonReq.realizado,
            comentario: jsonReq.comentario ? Buffer.from(jsonReq.comentario, 'utf-8') : '',
            id_equipe: jsonReq.id_equipe, 
            qtpessoas: jsonReq.qtpessoas, 
            fezquiz: jsonReq.fezquiz,
            id_evidencia: jsonReq.id_evidencia
        });    

        connection.commit();

        return {mensagem: 'Evidencia atulizada com sucesso !'}

    } catch (error) {
        await connection.rollback();
        throw error
    }finally{
        await connection.close();
    }
}


export async function setAtividadeevidencia(jsonReq) {


    const sqlInsert = `
        insert into bstab_visitacliente_atv
        (ID_EVIDENCIA, id_visita, id_atividade, veterinario, telefone, houvevenda, realizado, comentario, id_equipe, qtpessoas, fezquiz)
        values
        ((select nvl(max(a.ID_EVIDENCIA)+1,1) from bstab_visitacliente_atv a where a.id_visita = :id_visita), :id_visita, :id_atividade, :veterinario, :telefone, :houvevenda, :realizado, :comentario, :id_equipe, :qtpessoas, :fezquiz)
    `;

    const connection = await getConnection();
    try {      

        await connection.execute(sqlInsert,{
            id_visita: jsonReq.id_visita, 
            id_atividade: jsonReq.id_atividade, 
            veterinario: jsonReq.veterinario,
            telefone: jsonReq.telefone,
            houvevenda: jsonReq.houvevenda,
            realizado: jsonReq.realizado,
            comentario: jsonReq.comentario ? Buffer.from(jsonReq.comentario, 'utf-8') : '',
            id_equipe: jsonReq.id_equipe, 
            qtpessoas: jsonReq.qtpessoas, 
            fezquiz: jsonReq.fezquiz
        });    

        connection.commit();

        return {mensagem: 'Evidencia salvada com sucesso !'}

    } catch (error) {
        await connection.rollback();
        throw error
    }finally{
        await connection.close();
    }
}

export async function updateAtividadeevodemcoa(jsonReq) {

    const sqlUpdate = `
    update bstab_visitacliente_atv
    set 
       veterinario = :veterinario,
       telefone = :telefone,
       houvevenda = :houvevenda,
       realizado = :realizado,
       comentario = :comentario
    where id_visita = :id_visita
    and id_atividade = :id_atividade
    `;


    const connection = await getConnection();
    try {      

        await connection.execute(sqlUpdate,{
            id_visita: jsonReq.id_visita, 
            id_atividade: jsonReq.id_atividade, 
            veterinario: jsonReq.veterinario,
            telefone: jsonReq.telefone,
            houvevenda: jsonReq.houvevenda,
            realizado: jsonReq.realizado,
            comentario: jsonReq.comentario ? Buffer.from(jsonReq.comentario, 'utf-8') : ''
        }); 
       
        
        connection.commit();

        return {mensagem: 'Evidencia salvada com sucesso !'}

    } catch (error) {
        await connection.rollback();
        throw error
    }finally{
        await connection.close();
    }
}


export async function getcheckoutpercentualrealizado(jsonReq) {

    const sqlConsulta = `
    SELECT 
    SUM(VW1.QTREALIZADO) AS QTREALIZADO
    FROM (
        SELECT 0 AS QTATIVIDADE, COUNT(DISTINCT F.ID_ATIVIDADE) AS QTREALIZADO
        FROM BSTAB_VISITACLIENTE_ATV F
        WHERE F.ID_VISITA = :idvisita
        AND F.REALIZADO = 'S'
    ) VW1
    `;

    try {
      
        const result = await executeQuery(sqlConsulta, {idvisita: jsonReq.idvisita});
        return result[0];

    } catch (error) {
        throw error
    }   
}


export async function setcheckout(jsonReq) {

    const SqlUpdate = `
    update bstab_visitacliente
    set 
        dtcheckout = TO_DATE(:dtcheckout, 'YYYY-MM-DD HH24:MI:SS'),      
        pro_latitude_checkout = :pro_latitude_checkout,
        pro_longitude_checkout = :pro_longitude_checkout
    where id_visita = :id_visit
    `;    

    try {
        
        await executeQuery(SqlUpdate,{
            id_visit: jsonReq.idvisita,
            dtcheckout: moment(jsonReq.dataCheckOut, "DD/MM/YYYY HH:mm:ss").format("YYYY-MM-DD HH:mm:ss"),
            pro_latitude_checkout: jsonReq.latidudeCheckOut,
            pro_longitude_checkout: jsonReq.longitudeCheckOut
        },true);

        return {mensagem: 'CheckOut Realizado com sucesso !'}

    } catch (error) {
        throw error
    }

}


export async function getlistarjustificativa(jsonReq) {
        const ssql = `
            SELECT A.IDJUSTIFICATIVA, A.JUSTIFICATIVA
            FROM BSTAB_JUSTIFICATIVA A
            WHERE A.ATIVO = 'S' 
            AND A.ID_GRUPO_EMPRESA = :id_grupo_empresa
        `;

        const param ={
            id_grupo_empresa: jsonReq.id_grupo_empresa
        }

        try {

            const result = await executeQuery(ssql, param);
            return result;
            
        } catch (error) {
        throw error;
        } 
}

export async function getproximoIdEvidencia(jsonReq) {

    const ssql = `
    select nvl(max(f.id_evidencia)+1,1) proximoid
      from bstab_visitacliente_atv f
    where f.id_visita = :id_visita
    `

    const param ={
        id_visita: jsonReq.id_visita
    }

    try {

        const result = await executeQuery(ssql, param);
        return result[0];
        
    } catch (error) {
    throw error;
    } 
}

export async function setexluiratividadeevidencia(jsonReq) {

    const id_visita = jsonReq.id_visita;
    const id_atividade = jsonReq.id_atividade;
    const id_evidencia = jsonReq.id_evidencia;
    const id_relacional = id_visita+""+id_atividade+""+id_evidencia;
    const id_rotina = "3001.1";    

    const ssqDeletaAtv = `
    DELETE
    FROM BSTAB_VISITACLIENTE_ATV A 
    WHERE A.ID_EVIDENCIA = :id_evidencia
    AND A.ID_VISITA = :id_visita
    AND A.ID_ATIVIDADE = :id_atividade
    `

    const ssqlDeletaItem = `
    DELETE
    FROM BSTAB_VISITACLI_ITEM B
    WHERE B.ID_EVIDENCIA = :id_evidencia
    AND B.ID_VISITA = :id_visita
    AND B.ID_ATIVIDADE = :id_atividade
    `;

    const connection = await getConnection();
    try {      

        // exluir BSTAB_ARQUIVOS
        await excluirArquivosPorIdRelacional(id_relacional, id_rotina);

        // exluir BSTAB_VISITACLIENTE_ATV
        await connection.execute(ssqDeletaAtv,{
            id_evidencia: id_evidencia, 
            id_visita: id_visita, 
            id_atividade: id_atividade
        }); 


        // exluir BSTAB_VISITACLI_ITEM
        await connection.execute(ssqlDeletaItem,{
            id_evidencia: id_evidencia, 
            id_visita: id_visita, 
            id_atividade: id_atividade
        });    
        
        connection.commit();

        return {mensagem: 'Evidencia exluida com sucesso !'}

    } catch (error) {
        await connection.rollback();
        throw error
    }finally{
        await connection.close();
    }


}



export async function getatividadeporcliente(jsonReq) {

    let ssqlatividadeporcliente = `
            SELECT A.ID_EVIDENCIA,
            V.ID_VISITA,
            V.ID_PROMOTOR,
            P.NOME PROMOTOR,   
            A.ID_ATIVIDADE,
            AT.DESCRICAO ATIVIDADE,       
            A.ID_EQUIPE,
            EQ.EQUIPE,
            A.QTPESSOAS,
            A.VETERINARIO,
            A.TELEFONE,
            DECODE(A.HOUVEVENDA,'S','Sim','N','Não','Não') HOUVEVENDA,
            DECODE(A.REALIZADO,'S','Sim','N','Não','Não') REALIZADO,  
            UTL_RAW.CAST_TO_VARCHAR2(DBMS_LOB.SUBSTR(A.COMENTARIO)) COMENTARIO,            
            TRUNC(V.DTCHECKIN) DATA,
            A.FEZQUIZ
            
        FROM BSTAB_VISITACLIENTE V
        LEFT JOIN BSTAB_VISITACLIENTE_ATV A 
                ON V.ID_VISITA = A.ID_VISITA
        LEFT JOIN BSTAB_CLIENTEVENDA C 
                ON V.ID_CLIENTE = C.IDCLIENTEVENDA
        LEFT JOIN BSTAB_USUSARIOS P 
                ON V.ID_PROMOTOR = P.ID_USUARIO_ERP 
                AND V.ID_GRUPO_EMPRESA = P.ID_GRUPO_EMPRESA
        LEFT JOIN BSTAB_ATIVIDADEPROMOTOR AT 
                ON A.ID_ATIVIDADE = AT.ID_ATIVIDADE 
                AND V.ID_GRUPO_EMPRESA = AT.ID_GRUPO_EMPRESA
        LEFT JOIN BSTAB_EQUIPE EQ 
                ON A.ID_EQUIPE = EQ.ID_EQUIPE 
                AND V.ID_GRUPO_EMPRESA = EQ.ID_GRUPO_EMPRESA
        
        WHERE 1=1  
                  
    `;


    const param = {};

    if (jsonReq.id_grupo_empresa) {
        ssqlatividadeporcliente += ` and v.id_grupo_empresa = :id_grupo_empresa`;
        param.id_grupo_empresa = jsonReq.id_grupo_empresa;
    }

    if (jsonReq.id_cliente) {
        ssqlatividadeporcliente += ` AND V.ID_CLIENTE = :id_cliente`;
        param.id_cliente = jsonReq.id_cliente;
    }

    if (jsonReq.id_atividade) {
        ssqlatividadeporcliente += ` AND A.ID_ATIVIDADE = :id_atividade`;
        param.id_atividade = jsonReq.id_atividade;
    }

    if (jsonReq.data1) {
        ssqlatividadeporcliente += ` AND TRUNC(V.DTCHECKIN) >= TO_DATE(:data1,'DD/MM/YYYY')`;
        param.data1 = jsonReq.data1;
    }

    if (jsonReq.data2) {
        ssqlatividadeporcliente += ` AND TRUNC(V.DTCHECKIN) <= TO_DATE(:data2,'DD/MM/YYYY')`;
        param.data2 = jsonReq.data2;
    }
                                            
    ssqlatividadeporcliente +=` ORDER BY TRUNC(V.DTCHECKIN) DESC, V.ID_VISITA  `;

    try {

        const retorno = await executeQuery(ssqlatividadeporcliente, param);
        return retorno;

    } catch (error) {
        throw error;
    }

}


export async function getdashboardn1(jsonReq) {

    // total cliente atendido
    let ssqlqtclientatd = `
    SELECT COUNT(DISTINCT VW1.ID_CLIENTE) TOTAL_ATD_CLI
    FROM (
        SELECT S.ID_EMPRESA_ERP,
               A.ID_VISITA,
               S.ID_USUARIO,
               S.NOME,
               AT.ID_ATIVIDADE,
               ATP.DESCRICAO,
               ITA.ID_ITEM,
               IT.DESCRICAO ITEM,
               IT.TIPODEITEM,
               A.DISTANCIA_ATEDIMENTO,
               A.DTCHECKIN,
               A.DTCHECKOUT,
               A.ID_CLIENTE
        FROM BSTAB_VISITACLIENTE A
    JOIN BSTAB_USUSARIOS S 
      ON A.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA
     AND A.ID_PROMOTOR = S.ID_USUARIO_ERP    
    
    LEFT JOIN BSTAB_VISITACLIENTE_ATV AT 
      ON A.ID_VISITA = AT.ID_VISITA
        
    LEFT JOIN BSTAB_ATIVIDADEPROMOTOR ATP 
      ON AT.ID_ATIVIDADE = ATP.ID_ATIVIDADE

    LEFT JOIN BSTAB_VISITACLI_ITEM ITA 
      ON ITA.ID_VISITA = AT.ID_VISITA 
     AND ITA.ID_ATIVIDADE = ATP.ID_ATIVIDADE            

    LEFT JOIN BSTAB_ITEM IT 
      ON IT.ID_ITEM = ITA.ID_ITEM
        
    LEFT JOIN BSTAB_CLIENTEVENDA CL 
      ON CL.IDCLIENTEVENDAERP = A.ID_CLIENTE
     AND CL.IDGRUPOEMPRESA = A.ID_GRUPO_EMPRESA
        WHERE A.DTCHECKOUT IS NOT NULL
          AND 1=1
    `;

    const param = {};

    if (jsonReq.id_grupo_empresa) {
        ssqlqtclientatd += ` AND A.ID_GRUPO_EMPRESA IN (:id_grupo_empresa)`;
        param.id_grupo_empresa = jsonReq.id_grupo_empresa;
    }

    if (jsonReq.id_filial.length > 0) {
        ssqlqtclientatd += ` AND S.ID_EMPRESA_ERP IN (${jsonReq.id_filial} ) `;        
    }

    if (jsonReq.id_usuario && jsonReq.id_usuario.length > 0) {
        ssqlqtclientatd += ` AND S.ID_USUARIO IN (${jsonReq.id_usuario})`;
    }

    if (jsonReq.id_cliente && jsonReq.id_cliente.length > 0) {
        ssqlqtclientatd += ` AND A.ID_CLIENTE IN (${jsonReq.id_cliente})`;
    }

    if (jsonReq.data1) {
        ssqlqtclientatd += ` AND TRUNC(A.DTCHECKIN) >= TO_DATE(:data1, 'DD/MM/YYYY')`;
        param.data1 = jsonReq.data1;
    }

    if (jsonReq.data2) {
        ssqlqtclientatd += ` AND TRUNC(A.DTCHECKIN) <= TO_DATE(:data2, 'DD/MM/YYYY')`;
        param.data2 = jsonReq.data2;
    }

    if (jsonReq.dia > 0) {
       ssqlqtclientatd += ` AND TO_CHAR(A.DTCHECKIN, 'D') = :dia`; 
       param.dia = jsonReq.dia;
    }

    ssqlqtclientatd += ` ) VW1`;    

    // total promotores ativos
    let ssqlqtpromotor = `
    SELECT COUNT(DISTINCT A.ID_USUARIO) QT_PROMOTOR_ATV
      FROM BSTAB_USUSARIOS A
      JOIN BSTAB_PERMISOES P ON A.ID_USUARIO = P.ID_USUARIO
     WHERE 1=1
       AND A.DTINATIVO IS NULL
       AND P.ID_ROTINA = 3001
       AND P.PERMITIR = 'S'
    `;

    const paramPromotor = {};

    if (jsonReq.id_grupo_empresa) {
        ssqlqtpromotor += ` AND A.ID_GRUPO_EMPRESA IN (:id_grupo_empresa)`;
        paramPromotor.id_grupo_empresa = jsonReq.id_grupo_empresa;
    }

    if (jsonReq.id_filial.length > 0) {
        ssqlqtpromotor += ` AND A.ID_EMPRESA_ERP IN (${jsonReq.id_filial} ) `;
    }

    if (jsonReq.id_usuario && jsonReq.id_usuario.length > 0) {
        ssqlqtpromotor += ` AND A.ID_USUARIO IN (${jsonReq.id_usuario})`;
    }

    // total atividades executadas
    let ssqlqtatvexe = `
    SELECT COUNT(DISTINCT VW1.ID_VISITA||VW1.ID_ATIVIDADE||VW1.ID_EVIDENCIA)TOTAL_ATV_EXE
      FROM (
        SELECT S.ID_EMPRESA_ERP,
            A.ID_VISITA,
            S.ID_USUARIO_ERP,
            S.NOME,
            AT.ID_ATIVIDADE,
            ATP.DESCRICAO,
            ITA.ID_ITEM,
            IT.DESCRICAO AS ITEM,
            A.DISTANCIA_ATEDIMENTO,
            A.DTCHECKIN,
            A.DTCHECKOUT,
            A.ID_CLIENTE,
            A.ID_GRUPO_EMPRESA,
            CL.CLIENTE,
            CL.CONTATO,
            CL.EMAIL,
            S.TELEFONE,
            S.EMAIL AS EMAILPRO,
            EQ.ID_EQUIPE,
            EQ.EQUIPE,
            AT.VETERINARIO,
            AT.TELEFONE CONTATOVET,
            AT.ID_EVIDENCIA
          FROM BSTAB_VISITACLIENTE A
    JOIN BSTAB_USUSARIOS S 
      ON A.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA
     AND A.ID_PROMOTOR = S.ID_USUARIO_ERP    
    
    LEFT JOIN BSTAB_VISITACLIENTE_ATV AT 
      ON A.ID_VISITA = AT.ID_VISITA
        
    LEFT JOIN BSTAB_ATIVIDADEPROMOTOR ATP 
      ON AT.ID_ATIVIDADE = ATP.ID_ATIVIDADE

    LEFT JOIN BSTAB_VISITACLI_ITEM ITA 
      ON ITA.ID_VISITA = AT.ID_VISITA 
     AND ITA.ID_ATIVIDADE = ATP.ID_ATIVIDADE            

    LEFT JOIN BSTAB_ITEM IT 
      ON IT.ID_ITEM = ITA.ID_ITEM
        
    LEFT JOIN BSTAB_CLIENTEVENDA CL 
      ON CL.IDCLIENTEVENDAERP = A.ID_CLIENTE
     AND CL.IDGRUPOEMPRESA = A.ID_GRUPO_EMPRESA
    
    LEFT JOIN BSTAB_EQUIPE EQ
      ON EQ.ID_EQUIPE = AT.ID_EQUIPE
    
    WHERE A.DTCHECKOUT IS NOT NULL
      AND AT.ID_ATIVIDADE IS NOT NULL
    `;

    const paramAtvExe = {};

    if (jsonReq.id_grupo_empresa) {
        ssqlqtatvexe += ` AND A.ID_GRUPO_EMPRESA IN (:id_grupo_empresa)`;
        paramAtvExe.id_grupo_empresa = jsonReq.id_grupo_empresa;
    }

    if (jsonReq.id_filial.length > 0) {
        ssqlqtatvexe += ` AND S.ID_EMPRESA_ERP IN (${jsonReq.id_filial} ) `;
    }

    if (jsonReq.id_usuario && jsonReq.id_usuario.length > 0) {
        ssqlqtatvexe += ` AND S.ID_USUARIO IN (${jsonReq.id_usuario})`;
    }

    if (jsonReq.id_cliente && jsonReq.id_cliente.length > 0) {
        ssqlqtatvexe += ` AND A.ID_CLIENTE IN (${jsonReq.id_cliente})`;
    }

    if (jsonReq.data1) {
        ssqlqtatvexe += ` AND TRUNC(A.DTCHECKIN) >= TO_DATE(:data1, 'DD/MM/YYYY')`;
        paramAtvExe.data1 = jsonReq.data1;
    }

    if (jsonReq.data2) {
        ssqlqtatvexe += ` AND TRUNC(A.DTCHECKIN) <= TO_DATE(:data2, 'DD/MM/YYYY')`;
        paramAtvExe.data2 = jsonReq.data2;
    }


    if (jsonReq.dia > 0) {
       ssqlqtatvexe += ` AND TO_CHAR(A.DTCHECKIN, 'D') = :dia `; 
       paramAtvExe.dia = jsonReq.dia;
    }
    

    ssqlqtatvexe += ` ) VW1 WHERE VW1.ID_ATIVIDADE IS NOT NULL`;

    // total horas executadas
    let ssqltotalhoras = `
    SELECT ROUND(SUM((VW1.DTCHECKOUT - VW1.DTCHECKIN) * 24)) AS TOTAL_HORAS
    FROM (
      SELECT DISTINCT 
            A.ID_VISITA,
            A.DTCHECKIN,
            A.DTCHECKOUT
        FROM BSTAB_VISITACLIENTE A
    JOIN BSTAB_USUSARIOS S 
      ON A.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA
     AND A.ID_PROMOTOR = S.ID_USUARIO_ERP    
    
    LEFT JOIN BSTAB_VISITACLIENTE_ATV AT 
      ON A.ID_VISITA = AT.ID_VISITA
        
    LEFT JOIN BSTAB_ATIVIDADEPROMOTOR ATP 
      ON AT.ID_ATIVIDADE = ATP.ID_ATIVIDADE

    LEFT JOIN BSTAB_VISITACLI_ITEM ITA 
      ON ITA.ID_VISITA = AT.ID_VISITA 
     AND ITA.ID_ATIVIDADE = ATP.ID_ATIVIDADE            

    LEFT JOIN BSTAB_ITEM IT 
      ON IT.ID_ITEM = ITA.ID_ITEM
        
    LEFT JOIN BSTAB_CLIENTEVENDA CL 
      ON CL.IDCLIENTEVENDA = A.ID_CLIENTE
     AND CL.IDGRUPOEMPRESA = A.ID_GRUPO_EMPRESA
        WHERE A.DTCHECKOUT IS NOT NULL
    `;

    const paramHoras = {};

    if (jsonReq.id_grupo_empresa) {
        ssqltotalhoras += ` AND A.ID_GRUPO_EMPRESA IN (:id_grupo_empresa)`;
        paramHoras.id_grupo_empresa = jsonReq.id_grupo_empresa;
    }

    if (jsonReq.id_filial.length > 0) {
        ssqltotalhoras += ` AND S.ID_EMPRESA_ERP IN (${jsonReq.id_filial} ) `;
    }

    if (jsonReq.id_usuario && jsonReq.id_usuario.length > 0) {
        ssqltotalhoras += ` AND S.ID_USUARIO IN (${jsonReq.id_usuario})`;
    }

    if (jsonReq.id_cliente && jsonReq.id_cliente.length > 0) {
        ssqltotalhoras += ` AND A.ID_CLIENTE IN (${jsonReq.id_cliente})`;
    }

    if (jsonReq.data1) {
        ssqltotalhoras += ` AND TRUNC(A.DTCHECKIN) >= TO_DATE(:data1, 'DD/MM/YYYY')`;
        paramHoras.data1 = jsonReq.data1;
    }

    if (jsonReq.data2) {
        ssqltotalhoras += ` AND TRUNC(A.DTCHECKIN) <= TO_DATE(:data2, 'DD/MM/YYYY')`;
        paramHoras.data2 = jsonReq.data2;
    }

    if (jsonReq.dia > 0) {
       ssqltotalhoras += ` AND TO_CHAR(A.DTCHECKIN, 'D') = :dia `; 
       paramHoras.dia = jsonReq.dia;
    }

    ssqltotalhoras += ` ) VW1`;

    // total atendimentos próximos (distância <= 2)
    let ssqlatdprox = `
    SELECT COUNT(VW1.ID_VISITA) AS TOTAL_ATD_PROX
      FROM (
        SELECT DISTINCT A.ID_VISITA,
                           A.DISTANCIA_ATEDIMENTO
          FROM BSTAB_VISITACLIENTE A
    JOIN BSTAB_USUSARIOS S 
      ON A.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA
     AND A.ID_PROMOTOR = S.ID_USUARIO_ERP    
    
    LEFT JOIN BSTAB_VISITACLIENTE_ATV AT 
      ON A.ID_VISITA = AT.ID_VISITA
        
    LEFT JOIN BSTAB_ATIVIDADEPROMOTOR ATP 
      ON AT.ID_ATIVIDADE = ATP.ID_ATIVIDADE

    LEFT JOIN BSTAB_VISITACLI_ITEM ITA 
      ON ITA.ID_VISITA = AT.ID_VISITA 
     AND ITA.ID_ATIVIDADE = ATP.ID_ATIVIDADE            

    LEFT JOIN BSTAB_ITEM IT 
      ON IT.ID_ITEM = ITA.ID_ITEM
        
    LEFT JOIN BSTAB_CLIENTEVENDA CL 
      ON CL.IDCLIENTEVENDA = A.ID_CLIENTE
     AND CL.IDGRUPOEMPRESA = A.ID_GRUPO_EMPRESA
          WHERE A.DTCHECKOUT IS NOT NULL
    `;

    const paramAtdProx = {};

    if (jsonReq.id_grupo_empresa) {
        ssqlatdprox += ` AND A.ID_GRUPO_EMPRESA IN (:id_grupo_empresa)`;
        paramAtdProx.id_grupo_empresa = jsonReq.id_grupo_empresa;
    }

    if (jsonReq.id_filial.length > 0) {
        ssqlatdprox += ` AND S.ID_EMPRESA_ERP IN (${jsonReq.id_filial} ) `;
    }

    if (jsonReq.id_usuario && jsonReq.id_usuario.length > 0) {
        ssqlatdprox += ` AND S.ID_USUARIO IN (${jsonReq.id_usuario})`;
    }

    if (jsonReq.id_cliente && jsonReq.id_cliente.length > 0) {
        ssqlatdprox += ` AND A.ID_CLIENTE IN (${jsonReq.id_cliente})`;
    }

    if (jsonReq.data1) {
        ssqlatdprox += ` AND TRUNC(A.DTCHECKIN) >= TO_DATE(:data1, 'DD/MM/YYYY')`;
        paramAtdProx.data1 = jsonReq.data1;
    }

    if (jsonReq.data2) {
        ssqlatdprox += ` AND TRUNC(A.DTCHECKIN) <= TO_DATE(:data2, 'DD/MM/YYYY')`;
        paramAtdProx.data2 = jsonReq.data2;
    }

    if (jsonReq.dia > 0) {
       ssqlatdprox += ` AND TO_CHAR(A.DTCHECKIN, 'D') = :dia `; 
       paramAtdProx.dia = jsonReq.dia;
    }

    ssqlatdprox += ` ) VW1 WHERE VW1.DISTANCIA_ATEDIMENTO <= 2`;

    // total atendimentos dist > 2
    let ssqlatdDistMaior2 = `
    SELECT COUNT(VW1.ID_VISITA) AS TOTAL_ATD_DIST_MAIOR_2
      FROM (
        SELECT DISTINCT A.ID_VISITA,
                           A.DISTANCIA_ATEDIMENTO
          FROM BSTAB_VISITACLIENTE A
    JOIN BSTAB_USUSARIOS S 
      ON A.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA
     AND A.ID_PROMOTOR = S.ID_USUARIO_ERP    
    
    LEFT JOIN BSTAB_VISITACLIENTE_ATV AT 
      ON A.ID_VISITA = AT.ID_VISITA
        
    LEFT JOIN BSTAB_ATIVIDADEPROMOTOR ATP 
      ON AT.ID_ATIVIDADE = ATP.ID_ATIVIDADE

    LEFT JOIN BSTAB_VISITACLI_ITEM ITA 
      ON ITA.ID_VISITA = AT.ID_VISITA 
     AND ITA.ID_ATIVIDADE = ATP.ID_ATIVIDADE            

    LEFT JOIN BSTAB_ITEM IT 
      ON IT.ID_ITEM = ITA.ID_ITEM
        
    LEFT JOIN BSTAB_CLIENTEVENDA CL 
      ON CL.IDCLIENTEVENDA = A.ID_CLIENTE
     AND CL.IDGRUPOEMPRESA = A.ID_GRUPO_EMPRESA
          WHERE A.DTCHECKOUT IS NOT NULL
    `;

    const paramAtdDistMaior2 = {};

    if (jsonReq.id_grupo_empresa) {
        ssqlatdDistMaior2 += ` AND A.ID_GRUPO_EMPRESA IN (:id_grupo_empresa)`;
        paramAtdDistMaior2.id_grupo_empresa = jsonReq.id_grupo_empresa;
    }

    if (jsonReq.id_filial.length > 0) {
        ssqlatdDistMaior2 += ` AND S.ID_EMPRESA_ERP IN (${jsonReq.id_filial} ) `;
    }

    if (jsonReq.id_usuario && jsonReq.id_usuario.length > 0) {
        ssqlatdDistMaior2 += ` AND S.ID_USUARIO IN (${jsonReq.id_usuario})`;
    }

    if (jsonReq.id_cliente && jsonReq.id_cliente.length > 0) {
        ssqlatdDistMaior2 += ` AND A.ID_CLIENTE IN (${jsonReq.id_cliente})`;
    }

    if (jsonReq.data1) {
        ssqlatdDistMaior2 += ` AND TRUNC(A.DTCHECKIN) >= TO_DATE(:data1, 'DD/MM/YYYY')`;
        paramAtdDistMaior2.data1 = jsonReq.data1;
    }

    if (jsonReq.data2) {
        ssqlatdDistMaior2 += ` AND TRUNC(A.DTCHECKIN) <= TO_DATE(:data2, 'DD/MM/YYYY')`;
        paramAtdDistMaior2.data2 = jsonReq.data2;
    }

    if (jsonReq.dia > 0) {
       ssqlatdDistMaior2 += ` AND TO_CHAR(A.DTCHECKIN, 'D') = :dia `; 
       paramAtdDistMaior2.dia = jsonReq.dia;
    }

    ssqlatdDistMaior2 += ` ) VW1 WHERE VW1.DISTANCIA_ATEDIMENTO > 2`;

    // visitas por dia da semana
    let ssqlVisitasDiaSemana = `
    WITH Visitas AS (
      SELECT
        TO_CHAR(A.DTCHECKOUT, 'D') AS DIA_NUM,
        COUNT(DISTINCT A.ID_VISITA) AS TOTAL_VISITAS
      FROM BSTAB_VISITACLIENTE A
    JOIN BSTAB_USUSARIOS S 
      ON A.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA
     AND A.ID_PROMOTOR = S.ID_USUARIO_ERP    
    
    LEFT JOIN BSTAB_VISITACLIENTE_ATV AT 
      ON A.ID_VISITA = AT.ID_VISITA
        
    LEFT JOIN BSTAB_ATIVIDADEPROMOTOR ATP 
      ON AT.ID_ATIVIDADE = ATP.ID_ATIVIDADE

    LEFT JOIN BSTAB_VISITACLI_ITEM ITA 
      ON ITA.ID_VISITA = AT.ID_VISITA 
     AND ITA.ID_ATIVIDADE = ATP.ID_ATIVIDADE            

    LEFT JOIN BSTAB_ITEM IT 
      ON IT.ID_ITEM = ITA.ID_ITEM
        
    LEFT JOIN BSTAB_CLIENTEVENDA CL 
      ON CL.IDCLIENTEVENDA = A.ID_CLIENTE
     AND CL.IDGRUPOEMPRESA = A.ID_GRUPO_EMPRESA
      WHERE A.DTCHECKOUT IS NOT NULL
    `;

    const paramVisitasDiaSemana = {};

    if (jsonReq.id_grupo_empresa) {
        ssqlVisitasDiaSemana += ` AND A.ID_GRUPO_EMPRESA IN (:id_grupo_empresa)`;
        paramVisitasDiaSemana.id_grupo_empresa = jsonReq.id_grupo_empresa;
    }

    if (jsonReq.id_filial.length > 0) {
        ssqlVisitasDiaSemana += ` AND S.ID_EMPRESA_ERP IN (${jsonReq.id_filial} ) `;
    }

    if (jsonReq.id_usuario && jsonReq.id_usuario.length > 0) {
        ssqlVisitasDiaSemana += ` AND S.ID_USUARIO IN (${jsonReq.id_usuario})`;
    }

    if (jsonReq.id_cliente && jsonReq.id_cliente.length > 0) {
        ssqlVisitasDiaSemana += ` AND A.ID_CLIENTE IN (${jsonReq.id_cliente})`;
    }

    if (jsonReq.data1) {
        ssqlVisitasDiaSemana += ` AND TRUNC(A.DTCHECKIN) >= TO_DATE(:data1, 'DD/MM/YYYY')`;
        paramVisitasDiaSemana.data1 = jsonReq.data1;
    }

    if (jsonReq.data2) {
        ssqlVisitasDiaSemana += ` AND TRUNC(A.DTCHECKIN) <= TO_DATE(:data2, 'DD/MM/YYYY')`;
        paramVisitasDiaSemana.data2 = jsonReq.data2;
    }

    

    ssqlVisitasDiaSemana += `
      GROUP BY TO_CHAR(A.DTCHECKOUT, 'D')
    )
    SELECT
      NVL(Domingo, 0)   AS Domingo,
      NVL(Segunda, 0)   AS Segunda,
      NVL(Terca, 0)     AS Terca,
      NVL(Quarta, 0)    AS Quarta,
      NVL(Quinta, 0)    AS Quinta,
      NVL(Sexta, 0)     AS Sexta,
      NVL(Sabado, 0)    AS Sabado
    FROM Visitas
    PIVOT (
      SUM(TOTAL_VISITAS)
      FOR DIA_NUM IN (
        '1' AS Domingo,
        '2' AS Segunda,
        '3' AS Terca,
        '4' AS Quarta,
        '5' AS Quinta,
        '6' AS Sexta,
        '7' AS Sabado
      )
    )`;

        // atendimentos por usuário (dentro/fora)
    let ssqlAtendimentosPorUsuario = `
    SELECT 
      VW2.ID_USUARIO,
      VW2.NOME,
      VW2.ATD_DENTRO,
      VW2.ATD_FORA,
      VW2.ATD_DENTRO + VW2.ATD_FORA AS TOTAL
    FROM (
      SELECT 
        ID_USUARIO,
        NOME,
        SUM(ATD_DENTRO) AS ATD_DENTRO,
        SUM(ATD_FORA) AS ATD_FORA
      FROM (
        SELECT DISTINCT
          S.ID_USUARIO,
          S.NOME,
          A.ID_VISITA,
          CASE WHEN A.DISTANCIA_ATEDIMENTO <= 2 THEN 1 ELSE 0 END AS ATD_DENTRO,
          CASE WHEN A.DISTANCIA_ATEDIMENTO > 2 THEN 1 ELSE 0 END AS ATD_FORA
        FROM BSTAB_VISITACLIENTE A
    JOIN BSTAB_USUSARIOS S 
      ON A.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA
     AND A.ID_PROMOTOR = S.ID_USUARIO_ERP    
    
    LEFT JOIN BSTAB_VISITACLIENTE_ATV AT 
      ON A.ID_VISITA = AT.ID_VISITA
        
    LEFT JOIN BSTAB_ATIVIDADEPROMOTOR ATP 
      ON AT.ID_ATIVIDADE = ATP.ID_ATIVIDADE

    LEFT JOIN BSTAB_VISITACLI_ITEM ITA 
      ON ITA.ID_VISITA = AT.ID_VISITA 
     AND ITA.ID_ATIVIDADE = ATP.ID_ATIVIDADE            

    LEFT JOIN BSTAB_ITEM IT 
      ON IT.ID_ITEM = ITA.ID_ITEM
        
    LEFT JOIN BSTAB_CLIENTEVENDA CL 
      ON CL.IDCLIENTEVENDA = A.ID_CLIENTE
     AND CL.IDGRUPOEMPRESA = A.ID_GRUPO_EMPRESA
        WHERE A.DTCHECKOUT IS NOT NULL
    `;

    const paramAtendimentosPorUsuario = {};

    if (jsonReq.id_grupo_empresa) {
        ssqlAtendimentosPorUsuario += ` AND A.ID_GRUPO_EMPRESA IN (:id_grupo_empresa)`;
        paramAtendimentosPorUsuario.id_grupo_empresa = jsonReq.id_grupo_empresa;
    }

    if (jsonReq.id_filial.length > 0) {
        ssqlAtendimentosPorUsuario += ` AND S.ID_EMPRESA_ERP IN (${jsonReq.id_filial} ) `;
    }

    if (jsonReq.id_usuario && jsonReq.id_usuario.length > 0) {
        ssqlAtendimentosPorUsuario += ` AND S.ID_USUARIO IN (${jsonReq.id_usuario})`;
    }

    if (jsonReq.id_cliente && jsonReq.id_cliente.length > 0) {
        ssqlAtendimentosPorUsuario += ` AND A.ID_CLIENTE IN (${jsonReq.id_cliente})`;
    }

    if (jsonReq.data1) {
        ssqlAtendimentosPorUsuario += ` AND TRUNC(A.DTCHECKIN) >= TO_DATE(:data1, 'DD/MM/YYYY')`;
        paramAtendimentosPorUsuario.data1 = jsonReq.data1;
    }

    if (jsonReq.data2) {
        ssqlAtendimentosPorUsuario += ` AND TRUNC(A.DTCHECKIN) <= TO_DATE(:data2, 'DD/MM/YYYY')`;
        paramAtendimentosPorUsuario.data2 = jsonReq.data2;
    }

    if (jsonReq.dia > 0) {
       ssqlAtendimentosPorUsuario += ` AND TO_CHAR(A.DTCHECKIN, 'D') = :dia `; 
       paramAtendimentosPorUsuario.dia = jsonReq.dia;
    }

    ssqlAtendimentosPorUsuario += `
        ) VW1
        GROUP BY ID_USUARIO, NOME
    ) VW2
    ORDER BY (VW2.ATD_DENTRO + VW2.ATD_FORA) DESC`;


    let ssqlCoordenadasCheckin = `
SELECT DISTINCT VW1.ID_VISITA,
       VW1.PRO_LATITUDE_CHECKIN,
       VW1.PRO_LONGITUDE_CHECKIN
 FROM (
    SELECT A.ID_VISITA,
           A.DTCHECKIN,
           A.DTCHECKOUT,
           A.PRO_LATITUDE_CHECKIN,
           A.PRO_LONGITUDE_CHECKIN
       FROM BSTAB_VISITACLIENTE A
       JOIN BSTAB_USUSARIOS S 
         ON A.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA
        AND A.ID_PROMOTOR = S.ID_USUARIO_ERP     
      WHERE A.DTCHECKOUT IS NOT NULL
`;

const paramCoord = {};

if (jsonReq.id_grupo_empresa) {
    ssqlCoordenadasCheckin += ` AND A.ID_GRUPO_EMPRESA IN (:id_grupo_empresa)`;
    paramCoord.id_grupo_empresa = jsonReq.id_grupo_empresa;
}
if (jsonReq.id_filial.length > 0) {
    ssqlCoordenadasCheckin += ` AND S.ID_EMPRESA_ERP IN (${jsonReq.id_filial} ) `;
}
if (jsonReq.id_usuario && jsonReq.id_usuario.length > 0) {
    ssqlCoordenadasCheckin += ` AND S.ID_USUARIO IN (${jsonReq.id_usuario})`;
}
if (jsonReq.id_cliente && jsonReq.id_cliente.length > 0) {
    ssqlCoordenadasCheckin += ` AND A.ID_CLIENTE IN (${jsonReq.id_cliente})`;
}
if (jsonReq.data1) {
    ssqlCoordenadasCheckin += ` AND TRUNC(A.DTCHECKIN) >= TO_DATE(:data1, 'DD/MM/YYYY')`;
    paramCoord.data1 = jsonReq.data1;
}
if (jsonReq.data2) {
    ssqlCoordenadasCheckin += ` AND TRUNC(A.DTCHECKIN) <= TO_DATE(:data2, 'DD/MM/YYYY')`;
    paramCoord.data2 = jsonReq.data2;
}

if (jsonReq.dia > 0) {
       ssqlCoordenadasCheckin += ` AND TO_CHAR(A.DTCHECKIN, 'D') = :dia `; 
       paramCoord.dia = jsonReq.dia;
    }

ssqlCoordenadasCheckin += ` ) VW1`;


let ssqlCardClienteAtd = `
SELECT DISTINCT VW1.ID_CLIENTE,
       VW1.CLIENTE,
       VW1.CONTATO,
       VW1.EMAIL
    FROM (
        SELECT S.ID_EMPRESA_ERP,
               A.ID_VISITA,
               S.ID_USUARIO,
               S.NOME,
               AT.ID_ATIVIDADE,
               ATP.DESCRICAO,
               ITA.ID_ITEM,
               IT.DESCRICAO ITEM,
               IT.TIPODEITEM,
               A.DISTANCIA_ATEDIMENTO,
               A.DTCHECKIN,
               A.DTCHECKOUT,
               A.ID_CLIENTE,
               A.ID_GRUPO_EMPRESA,
               CL.CLIENTE,
               CL.CONTATO,
               CL.EMAIL
        FROM BSTAB_VISITACLIENTE A
    JOIN BSTAB_USUSARIOS S 
      ON A.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA
     AND A.ID_PROMOTOR = S.ID_USUARIO_ERP    
    
    LEFT JOIN BSTAB_VISITACLIENTE_ATV AT 
      ON A.ID_VISITA = AT.ID_VISITA
        
    LEFT JOIN BSTAB_ATIVIDADEPROMOTOR ATP 
      ON AT.ID_ATIVIDADE = ATP.ID_ATIVIDADE

    LEFT JOIN BSTAB_VISITACLI_ITEM ITA 
      ON ITA.ID_VISITA = AT.ID_VISITA 
     AND ITA.ID_ATIVIDADE = ATP.ID_ATIVIDADE            

    LEFT JOIN BSTAB_ITEM IT 
      ON IT.ID_ITEM = ITA.ID_ITEM
        
    LEFT JOIN BSTAB_CLIENTEVENDA CL 
      ON CL.IDCLIENTEVENDA = A.ID_CLIENTE
     AND CL.IDGRUPOEMPRESA = A.ID_GRUPO_EMPRESA
        
        WHERE A.DTCHECKOUT IS NOT NULL
          AND 1=1       
`;

const paramCardClienteAtd = {};

if (jsonReq.id_grupo_empresa) {
    ssqlCardClienteAtd += ` AND A.ID_GRUPO_EMPRESA IN (:id_grupo_empresa)`;
    paramCardClienteAtd.id_grupo_empresa = jsonReq.id_grupo_empresa;
}
if (jsonReq.id_filial.length > 0) {
    ssqlCardClienteAtd += ` AND S.ID_EMPRESA_ERP IN (${jsonReq.id_filial} ) `;
}
if (jsonReq.id_usuario && jsonReq.id_usuario.length > 0) {
    ssqlCardClienteAtd += ` AND S.ID_USUARIO IN (${jsonReq.id_usuario})`;
}
if (jsonReq.id_cliente && jsonReq.id_cliente.length > 0) {
    ssqlCardClienteAtd += ` AND A.ID_CLIENTE IN (${jsonReq.id_cliente})`;
}
if (jsonReq.data1) {
    ssqlCardClienteAtd += ` AND TRUNC(A.DTCHECKIN) >= TO_DATE(:data1, 'DD/MM/YYYY')`;
    paramCardClienteAtd.data1 = jsonReq.data1;
}
if (jsonReq.data2) {
    ssqlCardClienteAtd += ` AND TRUNC(A.DTCHECKIN) <= TO_DATE(:data2, 'DD/MM/YYYY')`;
    paramCardClienteAtd.data2 = jsonReq.data2;
}

if (jsonReq.dia > 0) {
       ssqlCardClienteAtd += ` AND TO_CHAR(A.DTCHECKIN, 'D') = :dia `; 
       paramCardClienteAtd.dia = jsonReq.dia;
    }

ssqlCardClienteAtd += ` ) VW1`;


let sqlCardPromotor= `
SELECT DISTINCT 
         A.ID_EMPRESA_ERP,
         A.ID_USUARIO_ERP,
         A.NOME,
         A.TELEFONE      
       FROM BSTAB_USUSARIOS A
       JOIN BSTAB_PERMISOES P ON A.ID_USUARIO = P.ID_USUARIO
      WHERE 1=1
        AND A.DTINATIVO IS NULL
        AND P.ID_ROTINA = 3001     
`;

const paramCardPromotor = {};

if (jsonReq.id_grupo_empresa) {
    sqlCardPromotor += ` AND A.ID_GRUPO_EMPRESA IN (:id_grupo_empresa)`;
    paramCardPromotor.id_grupo_empresa = jsonReq.id_grupo_empresa;
}

if (jsonReq.id_filial.length > 0) {
    sqlCardPromotor += ` AND A.ID_EMPRESA_ERP IN (${jsonReq.id_filial} ) `;
}

if (jsonReq.id_usuario && jsonReq.id_usuario.length > 0) {
    sqlCardPromotor += ` AND A.ID_USUARIO IN (${jsonReq.id_usuario})`;
}


let sqltabatividadeporcliente = `
SELECT ROW_NUMBER() OVER (ORDER BY VW1.ID_ATIVIDADE, VW1.ID_CLIENTE) AS id_linha,           
       VW1.ID_CLIENTE,
       VW1.CLIENTE,
       VW1.ID_ATIVIDADE,
       VW1.DESCRICAO,
       COUNT(DISTINCT  VW1.ID_VISITA||VW1.ID_EVIDENCIA||VW1.ID_ATIVIDADE) QTDE
FROM (
    SELECT S.ID_EMPRESA_ERP,
           A.ID_VISITA,
           S.ID_USUARIO_ERP,
           S.NOME,
           AT.ID_ATIVIDADE,
           ATP.DESCRICAO,
           ITA.ID_ITEM,
           IT.DESCRICAO AS ITEM,
           A.DISTANCIA_ATEDIMENTO,
           A.DTCHECKIN,
           A.DTCHECKOUT,
           A.ID_CLIENTE,
           A.ID_GRUPO_EMPRESA,
           CL.CLIENTE,
           CL.CONTATO,
           CL.EMAIL,
           S.TELEFONE,
           S.EMAIL AS EMAILPRO,
           EQ.ID_EQUIPE,
           EQ.EQUIPE,
           AT.VETERINARIO,
           AT.TELEFONE CONTATOVET,
           AT.ID_EVIDENCIA
    FROM BSTAB_VISITACLIENTE A
    JOIN BSTAB_USUSARIOS S 
      ON A.ID_GRUPO_EMPRESA = S.ID_GRUPO_EMPRESA
     AND A.ID_PROMOTOR = S.ID_USUARIO_ERP    
    
    LEFT JOIN BSTAB_VISITACLIENTE_ATV AT 
      ON A.ID_VISITA = AT.ID_VISITA
        
    LEFT JOIN BSTAB_ATIVIDADEPROMOTOR ATP 
      ON AT.ID_ATIVIDADE = ATP.ID_ATIVIDADE

    LEFT JOIN BSTAB_VISITACLI_ITEM ITA 
      ON ITA.ID_VISITA = AT.ID_VISITA 
     AND ITA.ID_ATIVIDADE = ATP.ID_ATIVIDADE            

    LEFT JOIN BSTAB_ITEM IT 
      ON IT.ID_ITEM = ITA.ID_ITEM
        
    LEFT JOIN BSTAB_CLIENTEVENDA CL 
      ON CL.IDCLIENTEVENDA = A.ID_CLIENTE
     AND CL.IDGRUPOEMPRESA = A.ID_GRUPO_EMPRESA
    
    LEFT JOIN BSTAB_EQUIPE EQ
      ON EQ.ID_EQUIPE = AT.ID_EQUIPE
    
    WHERE A.DTCHECKOUT IS NOT NULL
      AND AT.ID_ATIVIDADE IS NOT NULL
`;


const paramtabatividadeporcliente = {};

    if (jsonReq.id_grupo_empresa) {
        sqltabatividadeporcliente += ` AND A.ID_GRUPO_EMPRESA IN (:id_grupo_empresa)`;
        paramtabatividadeporcliente.id_grupo_empresa = jsonReq.id_grupo_empresa;
    }

    if (jsonReq.id_filial.length > 0) {
        sqltabatividadeporcliente += ` AND S.ID_EMPRESA_ERP IN (${jsonReq.id_filial} ) `;
    }

    if (jsonReq.id_usuario && jsonReq.id_usuario.length > 0) {
        sqltabatividadeporcliente += ` AND S.ID_USUARIO IN (${jsonReq.id_usuario})`;
    }

    if (jsonReq.id_cliente && jsonReq.id_cliente.length > 0) {
        sqltabatividadeporcliente += ` AND A.ID_CLIENTE IN (${jsonReq.id_cliente})`;
    }

    if (jsonReq.data1) {
        sqltabatividadeporcliente += ` AND TRUNC(A.DTCHECKIN) >= TO_DATE(:data1, 'DD/MM/YYYY')`;
        paramtabatividadeporcliente.data1 = jsonReq.data1;
    }

    if (jsonReq.data2) {
        sqltabatividadeporcliente += ` AND TRUNC(A.DTCHECKIN) <= TO_DATE(:data2, 'DD/MM/YYYY')`;
        paramtabatividadeporcliente.data2 = jsonReq.data2;
    }

    if (jsonReq.dia > 0) {
       sqltabatividadeporcliente += ` AND TO_CHAR(A.DTCHECKIN, 'D') = :dia `; 
       paramtabatividadeporcliente.dia = jsonReq.dia;
    }

    sqltabatividadeporcliente += ` ) VW1 

GROUP BY VW1.ID_CLIENTE,      
          VW1.CLIENTE,
          VW1.ID_ATIVIDADE,
          VW1.DESCRICAO
ORDER BY COUNT(DISTINCT  VW1.ID_VISITA||VW1.ID_EVIDENCIA||VW1.ID_ATIVIDADE) DESC
    `;


    try {
        const qtcliatd = await executeQuery(ssqlqtclientatd, param);
        const qtpromotor = await executeQuery(ssqlqtpromotor, paramPromotor);
        const qtatvexe = await executeQuery(ssqlqtatvexe, paramAtvExe);
        const qthoras = await executeQuery(ssqltotalhoras, paramHoras);
        const qtatdc = await executeQuery(ssqlatdprox, paramAtdProx);
        const qtatfc = await executeQuery(ssqlatdDistMaior2, paramAtdDistMaior2);
        const visitasPorDiaSemana = await executeQuery(ssqlVisitasDiaSemana, paramVisitasDiaSemana);
        const atendimentosPorUsuario = await executeQuery(ssqlAtendimentosPorUsuario, paramAtendimentosPorUsuario);
        const coordenadasCheckin = await executeQuery(ssqlCoordenadasCheckin, paramCoord);
        const listclienteatd = await executeQuery(ssqlCardClienteAtd,paramCardClienteAtd);
        const listcardpromtor= await executeQuery(sqlCardPromotor,paramCardPromotor);
        const tabatividadeporcliente= await executeQuery(sqltabatividadeporcliente,paramtabatividadeporcliente);


        // transformar resultado em array [Domingo, Segunda, Terca, Quarta, Quinta, Sexta, Sabado]     
        const tagvisitasPorDiaSemana = [
             visitasPorDiaSemana[0].domingo,
             visitasPorDiaSemana[0].segunda,
             visitasPorDiaSemana[0].terca,
             visitasPorDiaSemana[0].quarta,
             visitasPorDiaSemana[0].quinta,
             visitasPorDiaSemana[0].sexta,
             visitasPorDiaSemana[0].sabado
        ]

        const tagCoordenadasCheckin = coordenadasCheckin.map(row => {
                 const latRaw = row.pro_latitude_checkin;
                 const lngRaw = row.pro_longitude_checkin;

                 const lat = latRaw ? Number(String(latRaw).trim().replace(',', '.')) : null;
                 const lng = lngRaw ? Number(String(lngRaw).trim().replace(',', '.')) : null;

                 return [lat, lng, 0.2];
        });

        const dadosDashboardn1 = {
             qtcliatd: qtcliatd[0].total_atd_cli,
             qtpromotor: qtpromotor[0].qt_promotor_atv,
             qtatvexe: qtatvexe[0].total_atv_exe,
             qthoras: qthoras[0].total_horas,
             qtatdc: qtatdc[0].total_atd_prox,
             qtatfc: qtatfc[0].total_atd_dist_maior_2,
             visitaporidasemana: tagvisitasPorDiaSemana,
             chekinporpromotor: atendimentosPorUsuario,
             coordenadascheckin: tagCoordenadasCheckin,
             coordenadasCheckin2: coordenadasCheckin,
             listclienteatd,
             listcardpromtor,
             tabatividadeporcliente
        }         

        return dadosDashboardn1;

    } catch (error) {
        throw error;
    }    
}