import { GetconsultarVinculoOrdenador, SetcadastrarVinculoOrdenador, SetexcluirVinculoOrdenador } from "../models/ordenadorModel.js";

export async function consultarVinculoOrdenador(req, res) {
    try {
        
        const jsonReq = req.body;

        if (!jsonReq.id_grupo_empresa) {
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await GetconsultarVinculoOrdenador(jsonReq));
        }

    } catch (error) {
        res.status(500).json({error: 'Erro ao consultar ordenador', message: error.message});   
    }  
}

export async function cadastrarVinculoOrdenador(req, res) {
    try {
       const jsonReq = req.body;
       
       if (!jsonReq.id_grupo_empresa || jsonReq.id_grupo_empresa == 0) {            
            res.status(400).json({error: 'Grupo de empresa não informado !'});
       }else if (!jsonReq.id_usuario_erp || jsonReq.id_usuario_erp == 0) {        
            res.status(400).json({error: 'Usuario não informado !'});  
       }else if (!jsonReq.id_conta_erp || jsonReq.id_conta_erp == 0) {        
            res.status(400).json({error: 'Conta não informada !'});  
       }else if (!jsonReq.id_filial_erp || jsonReq.id_filial_erp == 0) {        
            res.status(400).json({error: 'Filial não informada !'});  
       }else{
            res.json( await SetcadastrarVinculoOrdenador(jsonReq));
       }
       
    } catch (error) {
        res.status(500).json({error: error}); 
    }
}


export async function excluirVinculoOrdenador(req, res) {
    
    try {
     
        const jsonReq = req.body;
       
        if (!jsonReq.id_grupo_empresa || jsonReq.id_grupo_empresa == '0') {            
             res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else if (!jsonReq.id_usuario_erp || jsonReq.id_usuario_erp == 0) {        
             res.status(400).json({error: 'Usuario não informado !'});  
        }else if (!jsonReq.id_conta_erp || jsonReq.id_conta_erp == 0) {        
             res.status(400).json({error: 'Conta não informada !'});  
        }else if (!jsonReq.id_filial_erp || jsonReq.id_filial_erp == 0) {        
             res.status(400).json({error: 'Filial não informada !'});  
        }else{
             res.json( await SetexcluirVinculoOrdenador(jsonReq));
        } 

    } catch (error) {
        res.status(500).json({error: error});    
    }    
}