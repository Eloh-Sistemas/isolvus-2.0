import { baixaValeModel, getconsultarVale } from "../models/valeModal.js";

export async function consultarVale(req , res) {

    try {
       const jsonReq = req.body;   
       
       if (!jsonReq.id_func){
           res.status(400).json({error: 'Id do usuario não informado !'})
       }else{
           res.json( await getconsultarVale(jsonReq));   
       }
    } catch (error) {
        res.status(500).json({error: 'Erro ao consultar vale', message: error.message});
    }
    
}

export async function baixaVale(req , res) {

    try {
       const jsonReq = req.body;
       
       if (!jsonReq.vales || jsonReq.vales.length === 0) {
           return res.status(400).json({error: 'Lista de vales não informada !'});
       }
       
       res.json( await baixaValeModel(
           jsonReq.vales,
           jsonReq.id_func_baixa,
           jsonReq.id_grupo_empresa,
           jsonReq.numsolicitacao || null
       ));   
       
    } catch (error) {
        res.status(500).json({error: 'Erro ao baixar vale', message: error.message});
    }
    
}