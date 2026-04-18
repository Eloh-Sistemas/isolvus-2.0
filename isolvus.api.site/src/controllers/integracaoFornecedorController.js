import { getConsultarIntegracaoFornecedorr, getgerararquivoIntegracaoFornecedor, setalterarIntegracaoFornecedor, setcadastrarIntegracaoFornecedor, setexluirIntegracaoFornecedorr } from "../models/integracaoFornecedorModel.js";

export async function cadastrarIntegracaoFornecedor(req , res) {

    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await setcadastrarIntegracaoFornecedor(jsonReq));
        }


    } catch (error) {
        res.status(500).json({error: 'Erro ao cadastrar integracao com fornecedor', message: error.message});   
    }
    
}


export async function alterarIntegracaoFornecedor(req , res) {

    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await setalterarIntegracaoFornecedor(jsonReq));
        }


    } catch (error) {
        res.status(500).json({error: 'Erro ao alterar integracao com fornecedor', message: error.message});   
    }
    
}


export async function exluirIntegracaoFornecedor(req , res) {

    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await setexluirIntegracaoFornecedorr(jsonReq));
        }


    } catch (error) {
        res.status(500).json({error: 'Erro ao exluir integracao com fornecedor', message: error.message});   
    }
    
}


export async function consultarIntegracaoFornecedor(req , res) {

    try {
        
        const jsonReq = req.body;
        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else{
            res.json( await getConsultarIntegracaoFornecedorr(jsonReq));
        }


    } catch (error) {
        res.status(500).json({error: 'Erro ao consultar integracao com fornecedor', message: error.message});   
    }
    
}

export async function gerararquivoIntegracaoFornecedor(req, res) {
  try {
    const jsonReq = req.body;

    if (!jsonReq.id_grupo_empresa) {
      return res.status(400).json({ error: 'Grupo de empresa não informado!' });
    }

    const resultado = await getgerararquivoIntegracaoFornecedor(jsonReq);
    return res.json({ mensagem: resultado.mensagem || 'Arquivos gerados com sucesso!' });

  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao gerar arquivo de fornecedor',
      message: error.message // <- aqui vem, por exemplo, "Erro: SQL inválido: ORA-009..."
    });
  }
}