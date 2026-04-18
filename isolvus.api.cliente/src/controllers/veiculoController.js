import { getConsultaVeiculo } from "../models/veiculoModel.js";


export async function consultaVeiculo(req , res) {
    try {
        res.json(await getConsultaVeiculo());
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error})
    }
}

export async function atualizarVeiculos(req, res) {
    
    try {
        
        const jsonReq = req.body;

        console.log(jsonReq);

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error}) 
    }

}