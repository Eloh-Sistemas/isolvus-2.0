import { getListarGeoLocalizacaoPendenteCliente, setAceitarGeoLocalizacaoCliente, setRejeitarGeoLocalizacaoCliente } from "../models/auditarLocalizacaoModel.js";

export async function AceitarGeoLocalizacaoCliente(req , res) {

    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await setAceitarGeoLocalizacaoCliente(jsonReq));
        }


    } catch (error) { 
        console.log(error);
        res.status(500).json({error: 'Erro ao alterar GeoLocalizacao', message: error});   
    }
    
}

export async function RejeitarGeoLocalizacaoCliente(req , res) {

    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await setRejeitarGeoLocalizacaoCliente(jsonReq));
        }


    } catch (error) {
        res.status(500).json({error: 'Erro ao alterar GeoLocalizacao', message: error.message});   
    }
    
}

export async function ListarGeoLocalizacaoPendenteCliente(req , res) {

    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await getListarGeoLocalizacaoPendenteCliente(jsonReq));
        }


    } catch (error) {
        res.status(500).json({error: 'Erro ao Listar GeoLocalizacao', message: error.message});   
    }
    
}

