import { GetConsultarContaGerencial } from "../models/contaGerencialModel.js";

export async function ConsultarContaGerencial(req , res) {

    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await GetConsultarContaGerencial(jsonReq));
        }


    } catch (error) {
        res.status(500).json({error: 'Erro ao consutlar conta gerencial', message: error.message});   
    }
    
}