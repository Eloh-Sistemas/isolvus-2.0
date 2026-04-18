import { GetListar } from "../models/endpointsModel.js";

export async function Listar(req, res) {
    try {

       const jsonReq = req.params;
       
       res.json( await GetListar(jsonReq));
    

    } catch (error) {
        res.status(500).json({error: error});  
    }
}