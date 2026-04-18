import { addRateioService, alterarSolicitaDespesaService, 
         atualizarDadosBancariosImportacaoService,
         cadastrarSolicitaDespesaService, 
         conformidadeSolicitacaoService, 
         conformidadeSolicitacoesLoteService,
         direcionarSolicitacoesLoteService,
         consultarRateioService, 
         consultarSolicitacaoItemService, 
         consultaSolicitacaoCabService, 
         consultarPreAnaliseAgrupadoService,
         consultarDespesasVinculadasLeituraService,
         ordenarSolicitacoesLoteService,
         controleDeDespesaService, 
         deletePreAnaliseService,
         deleteRateioService, 
         direcionarSolicitacaoService, 
         listarSolicitacoesService, 
         ordenarSolicitacaoService, 
         preAnaliseService, 
         processarDespesasImportacaoService,
         proximoidsolicitadespesaService, 
         recalcularRaterioService, 
         validarSolicitacaoOrcamentoService } from '../services/solicitacaoDespesa.service.js';
         
import { autorizacaoDePagamentoModel} from "../models/solicitacaoDeDespesaModel.js";


export async function proximoidsolicitadespesa(req , res, next) {

    try {        
        const dados = await proximoidsolicitadespesaService();
        return res.status(200).json(dados);                            
    } catch (error) {
        next(error);
    }

}

export async function cadastrarSolicitaDespesa(req, res, next) {

    try {        
        const dados = await cadastrarSolicitaDespesaService(req.body) 
        return res.status(200).json(dados);         
    } catch (error) {
        next(error);
    }
    
}

export async function direcionarSolicitacao(req, res, next) {

    try {        
        const dados = await direcionarSolicitacaoService(req.body)
        //return res.status(200).json(dados);
        return res.status(200).json(req.body);
    } catch (error) {
        next(error)  
    }
    
}

export async function direcionarSolicitacoesLote(req, res, next) {
    try {
        const dados = await direcionarSolicitacoesLoteService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }
}


export async function preAnalise(req, res, next) {

    try {        
        const dados = await preAnaliseService(req.body)
        return res.status(200).json(dados);
    } catch (error) {
        next(error)  
    }
    
}

export async function processarDespesasImportacao(req, res, next) {

    try {
        const dados = await processarDespesasImportacaoService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }

}

export async function atualizarDadosBancariosImportacao(req, res, next) {

    try {
        const dados = await atualizarDadosBancariosImportacaoService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }

}


export async function listar(req, res, next) {

    try {    
        const dados = await listarSolicitacoesService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }
}

export async function consultarSolicitacaoCab(req , res, next) {
    
    try {                    
        const dados = await consultaSolicitacaoCabService(req.body);        
        return res.status(200).json(dados);              
    } catch (error) {
        next(error);
    } 

}

export async function consultarSolicitacaoItem(req , res, next) {
    
    try {        
        const dados = await consultarSolicitacaoItemService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    } 

}

export async function alterarSolicitaDespesa(req, res, next) {
        

    try {
        const dados = await alterarSolicitaDespesaService(req.body)
        return res.status(200).json(dados);
    } catch (error) {
        next(error); 
    }

}

export async function validarsolicitacaoorcamento(req, res, next) {
    try {
        
        const pnumsolicitacao = req.params.pnumsolicitacao;
        const dados = await validarSolicitacaoOrcamentoService(pnumsolicitacao) ;
        return res.status(200).json(dados);

    } catch (error) {
       next(error);
    }  
}

export async function ordenarSolicitacao(req , res, next) {
    try {

        const dados = await ordenarSolicitacaoService(req.body);
        return res.status(200).json(dados);

    } catch (error) {
        next(error);
    }
}

export async function ordenarSolicitacoesLote(req, res, next) {
    try {
        const dados = await ordenarSolicitacoesLoteService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }
}

export async function addRateio(req, res, next){

    try {
        const dados = await addRateioService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }

}

export async function recalcularRaterio(req, res, next){

    try {
        const dados = await recalcularRaterioService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }

}


export async function consultarRateio(req, res, next) {
    
    try {        
        const dados = await consultarRateioService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }

}


export async function deleteRateio(req, res, next) {
   
    try {
        const dados = await deleteRateioService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }

}

export async function conformidadeSolicitacao(req , res, next) {
    
    try {
        
        const dados = await conformidadeSolicitacaoService(req.body)                              
        return res.status(200).json(dados);
                  
    } catch (error) {
        next(error); 
    }

}

export async function conformidadeSolicitacoesLote(req, res, next) {
    try {
        const dados = await conformidadeSolicitacoesLoteService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }
}

export async function controlededespesa(req, res, next){

    try {

        const dados = await controleDeDespesaService(req.body);
        return res.status(200).json(dados);                  
        
    } catch (error) {
        next(error);
    }

}

export async function AutorizacaoDePagamento(req, res, next){

    try {
        
        const dados = await autorizacaoDePagamentoModel(req.body);
        return res.status(200).json(dados);        
        
    } catch (error) {
        next(error);
    }

}

export async function consultarPreAnaliseAgrupado(req, res, next){

    try {
        
        const dados = await consultarPreAnaliseAgrupadoService(req.body);
        return res.status(200).json(dados);        
        
    } catch (error) {
        next(error);
    }

}

export async function consultarDespesasVinculadasLeitura(req, res, next){

    try {
        const dados = await consultarDespesasVinculadasLeituraService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }

}

export async function deletePreAnalise(req, res, next) {

    try {
        const dados = await deletePreAnaliseService(req.body);
        return res.status(200).json(dados);
    } catch (error) {
        next(error);
    }

}