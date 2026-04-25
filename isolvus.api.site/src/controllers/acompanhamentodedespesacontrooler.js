import { Gettabela, GetDashOrcamentoTotal, GetDashOrcamentoPorConta, GetDetalheCentroCusto, GetLancamentosCentroCusto } from "../models/acompanhamentodedespesamodel.js";

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

export async function DetalheCentroCusto(req, res) {
  try {
    const jsonReq = req.body;

    if (!jsonReq.id_grupo_empresa || jsonReq.id_grupo_empresa == '0'){
        res.status(400).json({error: 'Grupo de empresa não informado !'});
    }else{
        res.json(await GetDetalheCentroCusto(jsonReq));
    }

  } catch (error) {
    res.status(500).json({error: error});
  }
}

export async function LancamentosCentroCusto(req, res) {
  try {
    const jsonReq = req.body;
  const centroCustoInformado = String(jsonReq.id_centrodecusto ?? "").trim();

    if (!jsonReq.id_grupo_empresa || jsonReq.id_grupo_empresa == '0'){
        res.status(400).json({error: 'Grupo de empresa não informado !'});
  } else if (!centroCustoInformado) {
        res.status(400).json({error: 'Centro de custo não informado !'});
    } else {
    jsonReq.id_centrodecusto = centroCustoInformado;
        res.json(await GetLancamentosCentroCusto(jsonReq));
    }

  } catch (error) {
    res.status(500).json({error: error});
  }
}