import { getintegracaoVale, setBaixarVale } from "../models/valeModel.js";


export async function integracaoVale(req , res) {
    try {
        res.json(await getintegracaoVale());
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error})
    }
}

export async function baixarVale(req , res) {
    

    try {
       const jsonReq = req.body; 
              
       res.json( await setBaixarVale(jsonReq));   
       
    } catch (error) {
        res.status(500).json({error: 'Erro ao baixar vale', message: error.message});
    }
    
}