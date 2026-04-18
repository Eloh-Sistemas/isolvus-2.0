import express from 'express';

import { addRateio, consultarRateio, deleteRateio, listar, recalcularRaterio } from '../controllers/solicitacaoDeDespesaController.js';
import { validate } from '../middlewares/validate.js';

import { addRateioSchema, conformidadeSolicitacaoSchema, 
         conformidadeSolicitacoesLoteSchema,
         consultarSolicitacaoNumeroSchema, 
         consultarPreAnaliseAgrupadoSchema,
         consultarDespesasVinculadasLeituraSchema,
         direcionarSolicitacoesLoteSchema,
         ordenarSolicitacoesLoteSchema,
         atualizarDadosBancariosImportacaoSchema,
         deletePreAnaliseSchema,
         deleteRateioSchema, 
         direcionarSolicitacaoSchema, 
         listarSolicitacaoSchema, 
         ordenarSolicitacaoSchema, 
         preAnaliseImportDespesaSchemma, 
         processarDespesasImportacaoSchema,
         recalcularRaterioSchema, 
         relautorizacaoPagamentoSchema, 
         relcontrolededespesaSchema, 
         solicitaDespesaSchema } from '../schemas/solicitacaoDespesa.schema.js';

import {  
         consultarSolicitacaoCab, 
         consultarSolicitacaoItem, 
         consultarPreAnaliseAgrupado,
         consultarDespesasVinculadasLeitura,
         direcionarSolicitacoesLote,
         ordenarSolicitacoesLote,
         atualizarDadosBancariosImportacao,
         deletePreAnalise,
         validarsolicitacaoorcamento,
         cadastrarSolicitaDespesa,
         alterarSolicitaDespesa,
         direcionarSolicitacao,
         ordenarSolicitacao,
         processarDespesasImportacao,
         proximoidsolicitadespesa,
         conformidadeSolicitacao,
         conformidadeSolicitacoesLote,
         controlededespesa,
         AutorizacaoDePagamento,
         preAnalise
        } from '../controllers/solicitacaoDeDespesaController.js';

const router = express.Router();


router.get('/solicitacaoDespesa/proximoidsolicitadespesa', proximoidsolicitadespesa);
router.post('/solicitacaoDespesa/listar', validate(listarSolicitacaoSchema), listar);
router.post('/solicitacaoDespesa/consultarSolicitacaoCab', validate(consultarSolicitacaoNumeroSchema), consultarSolicitacaoCab);
router.post('/solicitacaoDespesa/consultarSolicitacaoItem', validate(consultarSolicitacaoNumeroSchema), consultarSolicitacaoItem);
router.get('/solicitacaoDespesa/ordenarSolicitacao/validarsolicitacaoorcamento/:pnumsolicitacao', validate(consultarSolicitacaoNumeroSchema, 'params'), validarsolicitacaoorcamento);
router.post('/solicitacaoDespesa/solicitaDespesa', validate(solicitaDespesaSchema), cadastrarSolicitaDespesa);
router.post('/solicitacaoDespesa/alteraSolicitaDespesa', validate(solicitaDespesaSchema), alterarSolicitaDespesa);
router.post('/solicitacaoDespesa/direcionarSolicitacao', validate(direcionarSolicitacaoSchema), direcionarSolicitacao);
router.post('/solicitacaoDespesa/importa/direcionarSolicitacoesLote', validate(direcionarSolicitacoesLoteSchema), direcionarSolicitacoesLote);

router.post('/solicitacaoDespesa/importa/preanalise', validate(preAnaliseImportDespesaSchemma), preAnalise);
router.post('/solicitacaoDespesa/importa/consultarPreAnaliseAgrupado', validate(consultarPreAnaliseAgrupadoSchema), consultarPreAnaliseAgrupado);
router.post('/solicitacaoDespesa/importa/consultarDespesasVinculadasLeitura', validate(consultarDespesasVinculadasLeituraSchema), consultarDespesasVinculadasLeitura);
router.post('/solicitacaoDespesa/importa/ordenarSolicitacoesLote', validate(ordenarSolicitacoesLoteSchema), ordenarSolicitacoesLote);
router.post('/solicitacaoDespesa/importa/processarDespesas', validate(processarDespesasImportacaoSchema), processarDespesasImportacao);
router.post('/solicitacaoDespesa/importa/atualizarDadosBancarios', validate(atualizarDadosBancariosImportacaoSchema), atualizarDadosBancariosImportacao);
router.post('/solicitacaoDespesa/importa/deletePreAnalise', validate(deletePreAnaliseSchema), deletePreAnalise);

router.post('/solicitacaoDespesa/addRaterio', validate(addRateioSchema),  addRateio);
router.post('/solicitacaoDespesa/recalcularRaterio', validate(recalcularRaterioSchema),  recalcularRaterio);

router.post('/solicitacaoDespesa/consultarRateio', validate(consultarSolicitacaoNumeroSchema),  consultarRateio);
router.post('/solicitacaoDespesa/deleteRateio', validate(deleteRateioSchema),  deleteRateio);

router.post('/solicitacaoDespesa/ordenarSolicitacao', validate(ordenarSolicitacaoSchema), ordenarSolicitacao);
router.post('/solicitacaoDespesa/conformidadeSolicitacao', validate(conformidadeSolicitacaoSchema), conformidadeSolicitacao);
router.post('/solicitacaoDespesa/importa/conformidadeSolicitacoesLote', validate(conformidadeSolicitacoesLoteSchema), conformidadeSolicitacoesLote);

router.post('/solicitacaoDespesa/relatorio/controlededespesa', validate(relcontrolededespesaSchema), controlededespesa);
router.post('/solicitacaoDespesa/relatorio/AutorizacaoDePagamento', validate(relautorizacaoPagamentoSchema),  AutorizacaoDePagamento);


export default router;