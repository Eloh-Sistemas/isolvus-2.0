import { getConsultaFornecedor } from "../models/fornecedorModel.js";


export async function consultaFornecedor(req, res) {

    try {
        res.json(await getConsultaFornecedor());
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error})
    }

}