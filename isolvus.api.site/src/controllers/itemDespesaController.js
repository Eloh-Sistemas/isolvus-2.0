import { GetConsultarItemDespesa, GetConsultarItemCadastro, SetCadastrarItem, SetAlterarItem, GetConsultarItemDespesaGeral } from "../models/itemDespesaModel.js";

export async function consultarItemDespesa(req , res) {

    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await GetConsultarItemDespesa(jsonReq));
        }


    } catch (error) {
        res.status(500).json({error: 'Erro ao consutlar item de despesa', message: error.message});   
    }
    
}

export async function consultarItemDespesaGeral(req , res) {

    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await GetConsultarItemDespesaGeral(jsonReq));
        }


    } catch (error) {
        res.status(500).json({error: 'Erro ao consutlar item de despesa Geral', message: error.message});   
    }
    
}

export async function consultarItemCadastro(req , res) {

    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await GetConsultarItemCadastro(jsonReq));
        }

    } catch (error) {
        res.status(500).json({error: 'Erro ao consutlar item de despesa', message: error.message});   
    }
    
}

export async function cadastrarItem(req , res) {

    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else if (!jsonReq.descricao){
            res.status(400).json({error: 'Descrição não informada !'});
        }else if (!jsonReq.descricao2){
            res.status(400).json({error: 'Categoria não informada !'});
        }else if (!jsonReq.id_usuario){
            res.status(400).json({error: 'Usuario não informado !'});
        }else{
            res.json( await SetCadastrarItem(jsonReq));
        }

    } catch (error) {
        res.status(500).json({error: 'Erro ao cadastrar item de despesa', message: error.message});   
    }
    
}

export async function alterarItem(req , res) {

    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_item){
            res.status(400).json({error: 'item não informado !'});
        }else if (!jsonReq.descricao){
            res.status(400).json({error: 'Descrição não informada !'});
        }else if (!jsonReq.descricao2){
            res.status(400).json({error: 'Categoria não informada !'});
        }else if (!jsonReq.id_usuario){
            res.status(400).json({error: 'Usuario não informado !'});
        }else{
            res.json( await SetAlterarItem(jsonReq));
        }

    } catch (error) {
        res.status(500).json({error: 'Erro ao alterar item de despesa', message: error.message});   
    }
    
}