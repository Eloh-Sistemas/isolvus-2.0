import { getConsultaSetor } from "../models/setorModel.js";


export async function consultaSetor(req, res) {

    try {
        res.json(await getConsultaSetor());
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error})
    }

}