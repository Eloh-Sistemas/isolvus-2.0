import { GetConsultarFornecedor } from "../models/fornecedorModel.js";

export async function ConsultarFornecedor(req , res) {

    try {
       const jsonReq = req.body;   
       
       if (!jsonReq.id_grupo_empresa){
           res.status(400).json({error: 'Grupo de empresa não informado !'})
       }else{
           res.json( await GetConsultarFornecedor(jsonReq));   
       }
    } catch (error) {
        res.status(500).json({error: 'Erro ao consultar fornecedor', message: error.message});
    }
    
}