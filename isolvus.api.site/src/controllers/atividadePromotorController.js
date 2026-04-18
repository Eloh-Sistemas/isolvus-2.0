import { deleteItemAtividade, getconsultarAtividadePromotorEditcomplet, getconsultarAtividadePromotorGeral, getconsultarEquipeTreinamentoEditcomplet, getconsultarEquipeTreinamentoGeral, getItemAtividade,  setItemAtividade } from "../models/atividadePromotorModel.js";

export async function consultarAtividadePromotorEditcomplet(req, res) {
    try {
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await getconsultarAtividadePromotorEditcomplet(jsonReq));
        }

    } catch (error) {
        res.status(500).json({error: 'Erro ao consultar atividade', message: error.message}); 
    }
}

export async function consultarAtividadePromotorGeral(req, res) {
    try {
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await getconsultarAtividadePromotorGeral(jsonReq));
        }

    } catch (error) {
        res.status(500).json({error: 'Erro ao consultar atividade geral', message: error.message}); 
    }
}

export async function consultarEquipeTreinamentoEditcomplet(req, res) {
    try {
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await getconsultarEquipeTreinamentoEditcomplet(jsonReq));
        }

    } catch (error) {
        res.status(500).json({error: 'Erro ao consultar equipe', message: error.message}); 
    }
}

export async function consultarEquipeTreinamentoGeral(req, res) {
    try {
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await getconsultarEquipeTreinamentoGeral(jsonReq));
        }

    } catch (error) {
        res.status(500).json({error: 'Erro ao consultar equipe', message: error.message}); 
    }
}


export async function cadastrarItemAtividade(req, res) {
    
    try {
        const jsonReq = req.body;

        if (!jsonReq.id_evidencia){
            res.status(400).json({error: 'Id Evidencia não informado !'});
        }else if (!jsonReq.id_visita){
            res.status(400).json({error: 'Visita não informado !'});
        }else if (!jsonReq.id_item){
            res.status(400).json({error: 'Item não informado !'});
        }else if (!jsonReq.qt){
            res.status(400).json({error: 'Quantidade do item não informado !'});
        }else if (!jsonReq.tipoitem){
            res.status(400).json({error: 'Tipo do item não informado !'});
        }else{
            res.json( await setItemAtividade(jsonReq));
        }

    } catch (error) {
        res.status(500).json({error: 'Erro ao inserir item da atividade', message: error.message}); 
    }
}

export async function consultarItemAtividade(req, res) {

    try {
        const jsonReq = req.body;

        if (!jsonReq.id_evidencia){
            res.status(400).json({error: 'Id Evidencia não informado !'});
        }else if (!jsonReq.id_visita){
            res.status(400).json({error: 'Visita não informado !'});
        }else if (!jsonReq.id_atividade){
            res.status(400).json({error: 'Atividade não informado !'});
        }else{
            res.json( await getItemAtividade(jsonReq));
        }

    } catch (error) {
        res.status(500).json({error: 'Erro ao consultar item da atividade', message: error.message}); 
    }
}

export async function excluirItemAtividade(req, res) {
    
    try {
        const jsonReq = req.body;

        if (!jsonReq.registro){
            res.status(400).json({error: 'Item não informado informado !'});
        }else{
            res.json( await deleteItemAtividade(jsonReq));
        }

    } catch (error) {
        res.status(500).json({error: 'Erro ao exluir item da atividade', message: error.message}); 
    }
}
