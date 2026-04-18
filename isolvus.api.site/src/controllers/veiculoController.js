import { listaDetalhe, listarCombustivelVeiculoEditComplet, listarMarcaVeiculoEditComplet, listarModeloVeiculoEditComplet, listaVeiculo, SetAtualizarVeiculo, SetCadastrarVeiculo } from "../models/veiculoModal.js";

export async function consultarveiculo(req, res) {
    
    try {
        
        const jsonReq = req.body;

        if (!jsonReq.id_grupo_empresa) {
            res.status(400).json({error: 'Id grupo de empresa não informado !'}); 
        }else if (!jsonReq.filtro) {
            res.status(400).json({error: 'Filtro não informado !'}); 
        }else{
            res.json(await listaVeiculo(jsonReq))
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({error: error}); 
    }

}

export async function consultaDetalhes(req, res) {
    
    try {

        const jsonReq = req.body;

        if (!jsonReq.id_grupo_empresa) {
            res.status(400).json({error: 'Id grupo de empresa não informado !'}); 
        }else{
            res.json( await listaDetalhe(jsonReq))
        }
        
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error}); 
    }

}

export async function consultarMarcaVeiculoEditComplet(req, res) {
    try {

        const jsonReq = req.body;

        if (!jsonReq.id_grupo_empresa) {
            res.status(400).json({error: 'Id grupo de empresa não informado !'}); 
        }else{
            res.json( await listarMarcaVeiculoEditComplet(jsonReq))
        }
        
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error}); 
    }
}



export async function consultarModeloVeiculoEditComplet(req, res) {
    try {

        const jsonReq = req.body;

        if (!jsonReq.id_grupo_empresa) {
            res.status(400).json({error: 'Id grupo de empresa não informado !'}); 
        }else{
            res.json( await listarModeloVeiculoEditComplet(jsonReq))
        }
        
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error}); 
    }
}

export async function consultarCombustivelVeiculoEditComplet(req, res) {
    try {

        const jsonReq = req.body;

        if (!jsonReq.id_grupo_empresa) {
            res.status(400).json({error: 'Id grupo de empresa não informado !'}); 
        }else{
            res.json( await listarCombustivelVeiculoEditComplet(jsonReq))
        }
        
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error}); 
    }
}

export async function cadastrarVeiculo(req, res) {
    try {

        const jsonReq = req.body;

        if (!jsonReq.id_grupo_empresa) {
            res.status(400).json({error: 'Id grupo de empresa não informado !'}); 
        }else if (!jsonReq.descricao){
            res.status(400).json({error: 'Descrição do veiculo não informado !'}); 
        }else if (!jsonReq.placa){
            res.status(400).json({error: 'Placa do veiculo não informado !'}); 
        }else if (!jsonReq.renavam){
            res.status(400).json({error: 'Renavam do veiculo não informado !'}); 
        }else if (!jsonReq.chassi){
            res.status(400).json({error: 'Chassi do veiculo não informado !'}); 
        }else if (!jsonReq.idmarca){
            res.status(400).json({error: 'Marca do veiculo não informado !'}); 
        }else if (!jsonReq.idmodelo){
            res.status(400).json({error: 'Modelo do veiculo não informado !'}); 
        }else if (!jsonReq.anofabricacao){
            res.status(400).json({error: 'Ano de fabricação do veiculo não informado !'}); 
        }else if (!jsonReq.cor){
            res.status(400).json({error: 'Cor do veiculo não informado !'}); 
        }else if (!jsonReq.idcombustivel){
            res.status(400).json({error: 'Combustivel do veiculo não informado !'}); 
        }else if (!jsonReq.situacao){
            res.status(400).json({error: 'Situação do veiculo não informado !'}); 
        }else{
            res.json( await SetCadastrarVeiculo(jsonReq));
        }
        
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error}); 
    }
}

export async function atualizarVeiculo(req, res) {
    try {

        const jsonReq = req.body;

        if (!jsonReq.id_grupo_empresa) {
            res.status(400).json({error: 'Id grupo de empresa não informado !'}); 
        }else if (!jsonReq.idveiculo){
            res.status(400).json({error: 'ID do veiculo não informado !'}); 
        }else if (!jsonReq.descricao){
            res.status(400).json({error: 'Descrição do veiculo não informado !'}); 
        }else if (!jsonReq.placa){
            res.status(400).json({error: 'Placa do veiculo não informado !'}); 
        }else if (!jsonReq.renavam){
            res.status(400).json({error: 'Renavam do veiculo não informado !'}); 
        }else if (!jsonReq.chassi){
            res.status(400).json({error: 'Chassi do veiculo não informado !'}); 
        }else if (!jsonReq.idmarca){
            res.status(400).json({error: 'Marca do veiculo não informado !'}); 
        }else if (!jsonReq.idmodelo){
            res.status(400).json({error: 'Modelo do veiculo não informado !'}); 
        }else if (!jsonReq.anofabricacao){
            res.status(400).json({error: 'Ano de fabricação do veiculo não informado !'}); 
        }else if (!jsonReq.cor){
            res.status(400).json({error: 'Cor do veiculo não informado !'}); 
        }else if (!jsonReq.idcombustivel){
            res.status(400).json({error: 'Combustivel do veiculo não informado !'}); 
        }else if (!jsonReq.situacao){
            res.status(400).json({error: 'Situação do veiculo não informado !'}); 
        }else{
            res.json( await SetAtualizarVeiculo(jsonReq));
        }
        
    } catch (error) {
        console.log(error);
        res.status(500).json({error: error}); 
    } 
}