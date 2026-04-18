import { getConsultaSms } from "../models/smsModel.js";

export async function consultaSms(req, res) {

    try {
        res.json(await getConsultaSms());
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error})
    }

}