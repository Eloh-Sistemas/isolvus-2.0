import { GetConsultarCaixaBanco } from "../models/caixaBancoModel.js";


export async function consultarCaixaBanco(req , res) {

    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await GetConsultarCaixaBanco(jsonReq));
        }


    } catch (error) {
        res.status(500).json({error: 'Erro ao consutlar centro de custo', message: error.message});   
    }
    
}