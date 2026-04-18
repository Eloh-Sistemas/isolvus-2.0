import { getConsultaUsuario, getCredencias } from "../models/usuarioModel.js";

export async function consultaUsuario(req , res) {
    try {
        res.json(await getConsultaUsuario());
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error})
    }
}


export async function credencias(req, res) {

    try {
        
        const jsonReq = req.body;

        console.log(jsonReq);

        if (!jsonReq.id_usuario_erp){
            res.status(400).json({error: 'ID usuario não informado !'})
        }else{
            res.json(await getCredencias(jsonReq));
        }       

        

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error})
    }
    
}