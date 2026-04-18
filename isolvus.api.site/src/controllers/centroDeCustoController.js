import { GetConsultarCentroDeCusto } from "../models/centroDeCustoModel.js";

export async function consultarCentroDeCusto(req , res) {

    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await GetConsultarCentroDeCusto(jsonReq));
        }


    } catch (error) {
        res.status(500).json({error: 'Erro ao consutlar centro de custo', message: error.message});   
    }
    
}