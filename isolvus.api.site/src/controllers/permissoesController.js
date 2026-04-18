import { GetPermissoesDoUsuario, SetAlterarPermissoesDoUsuario, GetPermissoes } from "../models/permissoesModel.js";

export async function ConsultarPermissoesDoUsuario(req , res) {

    try {
        const matricula = req.body.matricula;

        if (!matricula){
            res.status(400).json({error: 'Matricula não informada'})
        }else{
            const permissoes = await GetPermissoesDoUsuario(matricula); 
            res.json(permissoes);
        }


    } catch (error) {
        console.log(error);
        res.status(500).json({error: 'Erro ao consultar permissões de rotina', message: error.message});
    }
    
}

export async function AlterarPermissoesDoUsuario(req , res) {

    try {
        const permissoes = req.body;    

        // alterar permições
        await SetAlterarPermissoesDoUsuario(permissoes);        
        // consultar permissoes   
        res.status(200).json(await GetPermissoesDoUsuario(permissoes[0].id_usuario))

    } catch (error) {
        console.log(error);
        res.status(500).json({error: 'Erro ao alterar permissões do usuario', message: error.message});
    }
    
}

export async function ConsultarPermissoes(req , res) {

    try {
        const matricula = req.body.matricula;
        const tipoaplicacao = req.body.tipoaplicacao;

        if (!matricula){
            res.status(400).json({error: 'Matricula não informada'})        
        }else if (!tipoaplicacao){
            res.status(400).json({error: 'Tipo de aplicação não informada'})
        }else{
            const permissoes = await GetPermissoes(matricula, tipoaplicacao); 
            res.json(permissoes);
        }


    } catch (error) {
        console.log(error);
        res.status(500).json({error: 'Erro ao consultar permissões', message: error.message});
    }
    
}