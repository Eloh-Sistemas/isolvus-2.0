import { getconsultarInstituicaoBancaria } from "../models/instituicaoBancariaModel.js";

export async function consultarInstituicaoBancaria(req , res) {

    try {
        
        const jsonReq = req.body;
 

        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await getconsultarInstituicaoBancaria(jsonReq));
        }


    } catch (error) {
        res.status(500).json({error: 'Erro ao consutlar Instituicao Bancaria', message: error.message});   
    }
    
}
