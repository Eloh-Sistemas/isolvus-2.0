import { SetReceber } from "../models/orcamentoMensalModel.js";

export async function Receber(req, res) {
    
    try {
                
        const jsonReq = req.body;
        const parametros = req.params;     
        
        if (jsonReq.length == 0) {
            res.status(400).json({error: 'Nem um dado informado !'}); 
        }else if (!parametros.idusuario){
            res.status(400).json({error: 'Usuario não informado !'});  
        }else if (!parametros.idgrupoempresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});  
        }else{
            res.json( await SetReceber(jsonReq, parametros));
        }
                                
    } catch (error) {
        res.status(500).json({error});  
    } 

}