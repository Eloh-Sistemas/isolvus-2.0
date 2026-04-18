import { Gettabela, GetDashOrcamentoTotal, GetDashOrcamentoPorConta } from "../models/acompanhamentodedespesamodel.js";

export async function tabela(req, res) {
     
  try {
    
    const jsonReq = req.body;

    if (!jsonReq.id_grupo_empresa || jsonReq.id_grupo_empresa == '0'){
        res.status(400).json({error: 'Grupo de empresa não informado !'});
    }else{
        res.json( await Gettabela(jsonReq));
    }

  } catch (error) {
    res.status(500).json({error: error});  
  }

}

export async function DashOrcamentoTotal(req, res) {
     
  try {
    
    const jsonReq = req.body;

    if (!jsonReq.id_grupo_empresa || jsonReq.id_grupo_empresa == '0'){
        res.status(400).json({error: 'Grupo de empresa não informado !'});
    }else{
        res.json( await GetDashOrcamentoTotal(jsonReq));
    }

  } catch (error) {
    res.status(500).json({error: error});  
  }

}

export async function DashOrcamentoPorConta(req, res) {
     
  try {
    
    const jsonReq = req.body;

    if (!jsonReq.id_grupo_empresa || jsonReq.id_grupo_empresa == '0'){
        res.status(400).json({error: 'Grupo de empresa não informado !'});
    }else{
        res.json( await GetDashOrcamentoPorConta(jsonReq));
    }

  } catch (error) {
    res.status(500).json({error: error});  
  }

}