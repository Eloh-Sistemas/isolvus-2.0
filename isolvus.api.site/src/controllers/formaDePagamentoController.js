import { GetListarFormadePagamento } from "../models/formaDePagamentoModel.js";

export async function ListarFormadePagamento(req, res) {
    try {
       
       res.json( await GetListarFormadePagamento());
    

    } catch (error) {
        res.status(500).json({error: error});  
    }
}