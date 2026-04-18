import { getConsultarFilial, getConsultarSetor, GetFilialComplet, SetAlterarFilial, SetCadastarFilial } from "../models/filialModel.js";

export async function consultarFilial(req, res) {

    try {

        const jsonReq = req.body;

        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else if (!jsonReq.descricao){
            res.status(400).json({error: 'Descrição não informado !'});
        }else{
            res.json( await getConsultarFilial(jsonReq.id_grupo_empresa, jsonReq.descricao) ); 
        }        

    } catch (error) {
        console.log(error);
    }
    
}


export async function consultarFilialCompleto(req, res) {

    try {

        const jsonReq = req.body;
        res.json( await GetFilialComplet(jsonReq.id_empresa, jsonReq.id_grupo_empresa, jsonReq.descricao) );         

    } catch (error) {
        console.log(error);
    }
    
}

export async function AlterarFilial(req, res) {

    try {

        const jsonReq = req.body;
        const idEmprea = req.params.id_empresa;
        
        if (!idEmprea){
            res.status(400).json({error: 'Parametro ID Empresa não informado !'});  
        }else if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});  
        }else if (!jsonReq.id_erp){
            res.status(400).json({error: 'Filial ERP não informado !'});  
        }else if (!jsonReq.razaosocial){
            res.status(400).json({error: 'Razão Social não informada !'});  
        }else if (!jsonReq.fantasia){
            res.status(400).json({error: 'Fantasia não informada !'});  
        }else if (!jsonReq.cnpj_cpf){
            res.status(400).json({error: 'CNPJ não informado !'});  
        }else if (!jsonReq.email){
            res.status(400).json({error: 'Email não informado !'});  
        }else if (!jsonReq.cep){
            res.status(400).json({error: 'CEP não informado !'});  
        }else if (!jsonReq.rua){
            res.status(400).json({error: 'Rua não informada !'});  
        }else if (!jsonReq.numero){
            res.status(400).json({error: 'Numero não informado !'});  
        }else if (!jsonReq.uf){
            res.status(400).json({error: 'UF não informado !'});  
        }else if (!jsonReq.cidade){
            res.status(400).json({error: 'Cidade não informada !'});  
        }else if (!jsonReq.bairro){
            res.status(400).json({error: 'Bairro não informada !'});  
        }else{
            res.json( await SetAlterarFilial(jsonReq, idEmprea));
        }        
        
    } catch (error) {
        res.status(500).json({error: 'Erro ao alterar filial', message: error.message});
    }
    
}


export async function consultarSetor(req, res) {

    try {

        const jsonReq = req.body;

        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado !'});
        }else if (!jsonReq.descricao){
            res.status(400).json({error: 'Descrição não informado !'});
        }else{
            res.json( await getConsultarSetor(jsonReq.id_grupo_empresa, jsonReq.descricao) ); 
        }        

    } catch (error) {
        console.log(error);
    }
    
}

export async function cadastarFilial(req, res) {

    try {

        const jsonReq = req.body;

        if (!jsonReq.id_grupo_empresa){
            res.status(400).json({error: 'Grupo de empresa não informado!'});
        } else if (!jsonReq.razaosocial){
            res.status(400).json({error: 'Razão social não informada!'});
        } else if (!jsonReq.fantasia){
            res.status(400).json({error: 'Nome fantasia não informado!'});
        } else if (!jsonReq.cnpj_cpf){
            res.status(400).json({error: 'CNPJ/CPF não informado!'});
        } else if (!jsonReq.email){
            res.status(400).json({error: 'E-mail não informado!'});
        } else if (!jsonReq.contato){
            res.status(400).json({error: 'Contato não informado!'});
        } else if (!jsonReq.cep){
            res.status(400).json({error: 'CEP não informado!'});
        } else if (!jsonReq.rua){
            res.status(400).json({error: 'Rua não informada!'});
        } else if (!jsonReq.numero){
            res.status(400).json({error: 'Número não informado!'});
        } else if (!jsonReq.uf){
            res.status(400).json({error: 'UF não informada!'});
        } else if (!jsonReq.cidade){
            res.status(400).json({error: 'Cidade não informada!'});
        } else if (!jsonReq.bairro){
            res.status(400).json({error: 'Bairro não informado!'});
        } else if (!jsonReq.celular){
            res.status(400).json({error: 'Celular não informado!'});
        } else {
             res.json(await SetCadastarFilial(jsonReq));
        }
               

    } catch (error) {
        res.status(500).json({error: 'Erro ao cadastrar filial', message: error.message});
    }
    
}