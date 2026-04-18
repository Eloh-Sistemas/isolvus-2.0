import { GetConsultarClienteComplet, GetConsultarClienteID } from "../models/clienteModel.js";

export async function consultarClientEditcomplet(req, res) {


    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await GetConsultarClienteComplet(jsonReq));
        }

    } catch (error) {
        res.status(500).json({error: 'Erro ao consultar cliente', message: error.message});   
    }

}



export async function consultarClienteID(req, res) {
    
    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else if (!jsonReq.idclientevenda){
            res.status(400).json({error: 'Código do cliente não informado !'});
        }else{
            res.json( await GetConsultarClienteID(jsonReq));
        }

    } catch (error) {
        res.status(500).json({error: 'Erro ao consultar cliente', message: error.message});   
    }

}