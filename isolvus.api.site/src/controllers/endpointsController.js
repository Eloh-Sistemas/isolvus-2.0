import { GetListar, AtualizarIntegracao } from "../models/endpointsModel.js";

export async function Listar(req, res) {
    try {

       const jsonReq = req.params;
       
       res.json( await GetListar(jsonReq));
    

    } catch (error) {
        res.status(500).json({error: error});  
    }
}

export async function Atualizar(req, res) {
    try {
        const { id_servidor, id_integracao, intervalominutos, realizarintegracao } = req.body;
        if (!id_servidor || !id_integracao) {
            return res.status(400).json({ error: "id_servidor e id_integracao são obrigatórios." });
        }
        await AtualizarIntegracao({ id_servidor, id_integracao, intervalominutos, realizarintegracao });
        res.json({ sucesso: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}