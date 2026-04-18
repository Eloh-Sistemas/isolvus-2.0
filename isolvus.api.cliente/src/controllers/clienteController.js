import { getConsultaCliente } from "../models/clienteModel.js";

export async function consultaCliente(req , res) {
    try {
        res.json(await getConsultaCliente());
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error})
    }
}