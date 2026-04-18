import { getcamposformulario } from "../models/formularioModel.js";

export async function camposformulario(req, res) {
    try {
        
        const jsonReq = req.body;
        
        if (!jsonReq.id_rotina){
            res.status(400).json({error: 'Id rotina não informada !'});
        }else if (!jsonReq.id_tela){
            res.status(400).json({error: 'id tela não informado !'});
        }else{
            res.json( await getcamposformulario(jsonReq));
        }

    } catch (error) {
        res.status(500).json({error: 'Erro ao consultar formulario', message: error.message});
    }
}