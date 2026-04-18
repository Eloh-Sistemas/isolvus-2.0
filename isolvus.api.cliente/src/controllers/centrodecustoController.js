import { getConsultaCentroDeCusto } from "../models/centrodecustoModel.js";


export async function consultaCentroDeCusto(req, res) {

    try {
        res.json(await getConsultaCentroDeCusto());
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error})
    }

}