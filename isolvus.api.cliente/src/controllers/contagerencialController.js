import { getConsultaContaGerencial } from "../models/contagerencialModel.js";

export async function consultaContaGerencial(req, res) {

    try {
        res.json(await getConsultaContaGerencial());
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error})
    }

}