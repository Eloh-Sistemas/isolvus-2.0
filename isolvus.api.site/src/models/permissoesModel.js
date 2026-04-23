import { executeQuery, getConnection } from "../config/database.js";

async function GetSubPermissoesDaRotinaDoUsuario(idRotina, matricula) {

    const ssqlSubPermissoes = `
        SELECT
            SR.ID_SUBPERMISSAO as "id_subpermissao",
            SR.ID_ROTINA as "id_rotina",
            SR.DESCRICAO as "descricao",
            NVL(SU.PERMITIR, 'N') as "permitir"
        FROM BSTAB_ROTINA_SUBPERMISSOES SR
        LEFT JOIN BSTAB_USUARIO_SUBPERMISSOES SU
            ON SU.ID_SUBPERMISSAO = SR.ID_SUBPERMISSAO
           AND SU.ID_USUARIO = :matricula
        WHERE SR.ID_ROTINA = :idrotina
          AND NVL(SR.ATIVO, 'S') = 'S'
        ORDER BY SR.ORDEM, SR.DESCRICAO`;

    return await executeQuery(ssqlSubPermissoes, { matricula, idrotina: idRotina });
}

export async function GetPermissoesDoUsuario(matricula) {

    const ssqlModulos = `
      SELECT DISTINCT M.ID_MODULO as "id_modulo",   
          M.MODULO as "modulo"
          FROM BSTAB_MODULOS M   
          ORDER BY "id_modulo" `;

    const ssqlRotinas = `
                SELECT R.ID_ROTINA as "id_rotina",   
                R.ROTINA as "rotina",   
                NVL((SELECT S.PERMITIR FROM BSTAB_PERMISOES S WHERE S.ID_ROTINA = R.ID_ROTINA AND S.ID_USUARIO = :matricula ),  'N'  ) "permitir"   
            FROM BSTAB_ROTINAS R   
            WHERE R.ID_MODULO = :modulo     
        ORDER BY R.ID_ROTINA  `;

        try {       
            // consultar modulos no banco
            const modulos = await executeQuery(ssqlModulos);        
            
            //iniciar ArrayJson final com rotina
            const moduloComRotinas = [];
    
            // percorrer array de modulos
            for (const modulo of modulos){
                    
                // cosultar rotina de cada modulo
                const rotinas = await executeQuery(ssqlRotinas, {matricula, modulo: modulo.id_modulo} );          

                for (const rotina of rotinas) {
                    rotina.subpermissoes = await GetSubPermissoesDaRotinaDoUsuario(rotina.id_rotina, matricula);
                }
                
                // criar json modulos com rotina
                const jsonModulo = {
                    id_modulo: modulo.id_modulo,
                    modulo : modulo.modulo,
                    rotinas // adcionando rotinas ao json
                };
                
                // adicionar Modulo com as rotinas no ArrayJson Completo
               moduloComRotinas.push(jsonModulo);
            };
    
            //retorna js
            return moduloComRotinas;
                
        } catch (error) {
            console.log(error);
        }
    
}

export async function GetPermissoes(matricula, tipoaplicacao) {

    
    let ssqlModulos = `SELECT DISTINCT M.ID_MODULO,   
                         M.MODULO   
                        FROM BSTAB_MODULOS M, BSTAB_ROTINAS R, BSTAB_PERMISOES P   
                    WHERE M.ID_MODULO = R.ID_MODULO   
                        AND R.ID_ROTINA = P.ID_ROTINA   
                        AND P.PERMITIR = 'S' 
                        AND P.ID_USUARIO = :matricula `;

    if (tipoaplicacao == 'M'){
        ssqlModulos += ` AND R.SCREEN IS NOT NULL `;
    }else{
        ssqlModulos += ` AND R.CAMINHO IS NOT NULL `
    }                         

        ssqlModulos += ` ORDER BY M.ID_MODULO `;
                        
    
    let ssqlRotinas = `SELECT 
                                R.ID_ROTINA,   
                                R.ROTINA,   
                                R.CAMINHO,
                                lower(R.SCREEN) SCREEN
                            FROM BSTAB_MODULOS M, BSTAB_ROTINAS R, BSTAB_PERMISOES P   
                        WHERE M.ID_MODULO = R.ID_MODULO   
                            AND R.ID_ROTINA = P.ID_ROTINA   
                            AND P.PERMITIR = 'S'
                            AND P.ID_USUARIO = :matricula   
                            AND M.ID_MODULO = :modulo `;
                            
    if (tipoaplicacao == 'M'){
        ssqlRotinas += ` AND R.SCREEN IS NOT NULL `;
    }else{
        ssqlRotinas += ` AND R.CAMINHO IS NOT NULL `
    } 
      
       ssqlRotinas += ` ORDER BY R.ID_ROTINA `;
    
    try {       
        // consultar modulos no banco
        const modulos = await executeQuery(ssqlModulos, {matricula} );      
               
        //iniciar ArrayJson final com rotina
        const moduloComRotinas = [];

        // percorrer array de modulos
        for (const modulo of modulos){

            // cosultar rotina de cada modulo
            const rotinas = await executeQuery(ssqlRotinas, {matricula, modulo: modulo.id_modulo} );               
        

            // criar json modulos com rotina
            const jsonModulo = {
                id_modulo: modulo.id_modulo,
                modulo : modulo.modulo,
                rotinas // adcionando rotinas ao json
            };
            
            // adicionar Modulo com as rotinas no ArrayJson Completo
            moduloComRotinas.push(jsonModulo);
            
        };  
        //retorna js        
        return moduloComRotinas;

        

    } catch (error) {
        console.log(error);
    }

}

export async function SetAlterarPermissoesDoUsuario(permissoes) {
     
    if (permissoes.length > 0){
        
        const connection = await getConnection();
    
            try {
            
                for (const permissao of permissoes){   
                    var ssql = `
                    SELECT COUNT(*) AS qt_permissao 
                    FROM BSTAB_PERMISOES 
                    WHERE ID_USUARIO = :idusuario AND ID_ROTINA = :idrotina
                    `;
                
                    
                    const idusuario = permissao.id_usuario;
                    const idrotina = permissao.id_rotina;
                    const permitir = permissao.permitir;
        
                    const result = await executeQuery(ssql, {idusuario, idrotina});
        
                    if (result[0].qt_permissao > 0){
                        // se existi atualiza
                    
                        ssql = `
                        UPDATE BSTAB_PERMISOES 
                        SET PERMITIR = :permitir 
                        WHERE ID_USUARIO = :idusuario AND ID_ROTINA = :idrotina
                        `;
        
                        await connection.execute(ssql, {permitir, idusuario, idrotina});
        
                    }else{
                        // se não insere
                        ssql = `
                        INSERT INTO BSTAB_PERMISOES (ID_USUARIO, ID_ROTINA, PERMITIR) 
                        VALUES (:idusuario, :idrotina, :permitir)
                        `;
                        
                        await connection.execute(ssql, {permitir, idusuario, idrotina}); 
                    }
                    
                }   
                
                await connection.commit();

            } catch (error) {
                await connection.rollback();
                console.log(error);
            } finally{
                await connection.close();
            }                                                        
    }

}

export async function SetAlterarSubPermissoesDoUsuario(subPermissoes) {

    if (subPermissoes.length > 0) {

        const connection = await getConnection();

        try {

            for (const subPermissao of subPermissoes) {
                let ssql = `
                    SELECT COUNT(*) AS qt_subpermissao
                    FROM BSTAB_USUARIO_SUBPERMISSOES
                    WHERE ID_USUARIO = :idusuario
                      AND ID_SUBPERMISSAO = :idsubpermissao`;

                const idusuario = subPermissao.id_usuario;
                const idsubpermissao = subPermissao.id_subpermissao;
                const permitir = subPermissao.permitir;

                if (!idsubpermissao) {
                    continue;
                }

                const result = await executeQuery(ssql, { idusuario, idsubpermissao });

                if (result[0].qt_subpermissao > 0) {
                    ssql = `
                        UPDATE BSTAB_USUARIO_SUBPERMISSOES
                           SET PERMITIR = :permitir,
                               DT_ALTERACAO = SYSDATE
                         WHERE ID_USUARIO = :idusuario
                           AND ID_SUBPERMISSAO = :idsubpermissao`;

                    await connection.execute(ssql, { permitir, idusuario, idsubpermissao });
                } else {
                    ssql = `
                        INSERT INTO BSTAB_USUARIO_SUBPERMISSOES (
                            ID_USUARIO,
                            ID_SUBPERMISSAO,
                            PERMITIR,
                            DT_CADASTRO,
                            DT_ALTERACAO
                        ) VALUES (
                            :idusuario,
                            :idsubpermissao,
                            :permitir,
                            SYSDATE,
                            SYSDATE
                        )`;

                    await connection.execute(ssql, { permitir, idusuario, idsubpermissao });
                }
            }

            await connection.commit();

        } catch (error) {
            await connection.rollback();
            console.log(error);
            throw error;
        } finally {
            await connection.close();
        }
    }

}