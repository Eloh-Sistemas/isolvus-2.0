import { getatividadeporcliente, getcheckoutpercentualrealizado, getdashboardn1, GetListarAtividadePromotor, getListarHistoricoDeVisita, getlistarjustificativa, getproximoIdEvidencia, setAtividadeevidencia, setcheckout, setexluiratividadeevidencia, setpromotorcheckin, setupdateAtividadeevidencia } from "../models/promotorModel.js";


export async function listaratividadespromotor(req, res) {
    try {
        const jsonReq = req.body;

        if (!jsonReq.id_visita){
            res.status(400).json({error: 'Visita não informado'})
        }else {
            res.json(await GetListarAtividadePromotor(jsonReq)); 
        }


    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }
}


export async function promotorcheckin(req, res) {
    try {
        const jsonReq = req.body;

        if (!jsonReq.idgrupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado'})
        }else if (!jsonReq.idcliente){
            res.status(400).json({error: 'Cliente não informado'})
        }else if (!jsonReq.idpromotor){
            res.status(400).json({error: 'Promotor não informado'})
        }else if (!jsonReq.dataCheckin){
            res.status(400).json({error: 'Data/hora Checkin não informado'})
        }else if (!jsonReq.distancia){
            res.status(400).json({error: 'Distancia não informada'})
        }else{
            res.json(await setpromotorcheckin(jsonReq))    
        }


    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    } 
}

export async function listarHistoricoDeVisita(req, res) {
    try {
        const jsonReq = req.body;

        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado'})
        }else if (!jsonReq.idpromotor){
            res.status(400).json({error: 'Promotor não informado'})
        }else if (!jsonReq.id_cliente){
            res.status(400).json({error: 'Cliente não informado'})
        }else{
            res.json(await getListarHistoricoDeVisita(jsonReq))
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    } 
}



export async function atividadeevidencia(req, res) {
    

    try {
        
        const jsonReq = req.body;        
        if (!jsonReq.id_visita){
            res.status(400).json({error: 'Id Visita não informado! '});
        }else if (!jsonReq.id_atividade){
            res.status(400).json({error: 'Id Atividade não informado! '});
        }else{
            res.json(await setAtividadeevidencia(jsonReq));
        }
        
    } catch (error) {
        console.log(error)
    }


}

export async function updateatividadeevidencia(req, res) {
    

    try {
        
        const jsonReq = req.body;   
        
        
        
        if (!jsonReq.id_visita){
            res.status(400).json({error: 'Id Visita não informado! '});
        }else if (!jsonReq.id_atividade){
            res.status(400).json({error: 'Id Atividade não informado! '});
        }else{
            res.json(await setupdateAtividadeevidencia(jsonReq));
        }
        
    } catch (error) {
        console.log(error)
    }


}


export async function checkoutpercentualrealizado(req, res) {
    try {
        const jsonReq = req.body;

        if (!jsonReq.idvisita){
            res.status(400).json({error: 'ID Visita não informado'})
        }else{
            res.json(await getcheckoutpercentualrealizado(jsonReq))
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    } 
}


export async function checkout(req, res) {
    try {
        const jsonReq = req.body;


        if (!jsonReq.idvisita){
            res.status(400).json({error: 'ID Visita não informado'})
        }else if (!jsonReq.dataCheckOut){
            res.status(400).json({error: 'Data Checkout não informado'})
        }else{
            res.json(await setcheckout(jsonReq))
        } 
    } catch (error) {
        res.status(500).json({error: error.message});   
    }  
}

export async function listarjustificativa(req, res) {



    try {
        const jsonReq = req.body;

        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado'})
        }else {
            res.json(await getlistarjustificativa(jsonReq)); 
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    }

}


export async function proximoIdEvidencia(req, res) {
    try {
        const jsonReq = req.body;

        if (!jsonReq.id_visita){
            res.status(400).json({error: 'ID Visita não informado'})
        }else{
            res.json(await getproximoIdEvidencia(jsonReq))
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    } 
}



export async function exluiratividadeevidencia(req, res) {

    try {
        const jsonReq = req.body;

        if (!jsonReq.id_visita){
            res.status(400).json({error: 'ID Visita não informado'})
        }else if (!jsonReq.id_atividade){
            res.status(400).json({error: 'ID Atividade não informado'})
        }else if (!jsonReq.id_evidencia){
            res.status(400).json({error: 'ID Evidencia não informado'})
        }else{
            res.json(await setexluiratividadeevidencia(jsonReq))
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    } 
    
}



export async function dashboardn1(req, res) {

    try {
        const jsonReq = req.body;

        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'ID grupo de empresa não informado'})        
        }else{
            res.json(await getdashboardn1(jsonReq))
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    } 
    
}

export async function atividadeporcliente(req, res) {

    try {
        const jsonReq = req.body;

        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'ID grupo de empresa não informado'})        
        }else{
            res.json(await getatividadeporcliente(jsonReq))
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error.message});
    } 

}