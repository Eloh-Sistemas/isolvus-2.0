import { getConsultaFilial } from "../models/filialModel.js";

export async function consultaFilial(req, res) {

    try {
        res.json(await getConsultaFilial());
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error})
    }

}