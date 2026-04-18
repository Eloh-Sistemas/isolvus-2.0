import { registrarSolicitacao } from "../models/solicitacaoDeDespesaModel.js";

export async function gravaSolicitacao(req, res) {
    try {

        const jsonReq = req.body;
        res.json(await registrarSolicitacao(jsonReq));
        
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error})
    }

}