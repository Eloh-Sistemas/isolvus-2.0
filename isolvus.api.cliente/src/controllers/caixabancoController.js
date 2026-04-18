import { getCaixaBanco } from "../models/caixabancoModel.js";

export async function consultarCaixaBanco(req , res) {
    try {
        res.json(await getCaixaBanco());
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error})
    }
}
