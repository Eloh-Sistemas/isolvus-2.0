import { GetLogar, GetDadosFuncionario, GetListar, GetUsuarioComplet, SetCadastrarFuncionario, setCredencias, GetRateioFuncionario, SetRateioFuncionario, DeleteRateioFuncionario, SetFotoUsuario, GetFotoUsuario } from "../models/usuarioModel.js";

export async function Logar(req, res) {

    try {

        // pegando parametros do corpo da requisição
        const {user , password} = req.body;

        // validando campos
        if (!user){
            res.status(400).json({error: 'Usuário não Informado !'});
        }else if (!password){
            res.status(400).json({error: 'Senha não Informado !'});
        }else{
            const usuario = await GetLogar(user, password);
            res.json(usuario);
        }
                        
    } catch (error) {
        console.log(error);
        res.status(500).json({error: 'Erro ao logar', message: error.message})
    }    

};

export async function ConsultarRateioFuncionario(req, res) {
    try {
        const matricula = req.body.matricula;       
        if (!matricula){
            res.status(400).json({error: 'Matricula não informada'})
        }else{
            const rateioFuncionario = await GetRateioFuncionario(matricula); 
            res.json(rateioFuncionario);
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({error: 'Erro ao consultar rateio do funcionario', message: error.message});
    }
}


export async function InserirRateioFuncionario(req, res) {
    try {
        const {id_usuario, id_centrodecusto, percentual} = req.body;

        if (!id_usuario) return res.status(400).json({error: 'id_usuario não informado'});
        if (!id_centrodecusto) return res.status(400).json({error: 'id_centrodecusto não informado'});
        if (percentual == null) return res.status(400).json({error: 'percentual não informado'});

        const resultado = await SetRateioFuncionario({id_usuario, id_centrodecusto, percentual});
        return res.json(resultado);
    } catch (error) {
        console.log(error);
        return res.status(500).json({error: error.message || 'Erro ao inserir rateio'});
    }
}

export async function DeletarRateioFuncionario(req, res) {
    try {
        const {id} = req.body;

        if (!id) return res.status(400).json({error: 'id do rateio não informado'});

        const resultado = await DeleteRateioFuncionario(id);
        return res.json(resultado);
    } catch (error) {
        console.log(error);
        return res.status(500).json({error: error.message || 'Erro ao excluir rateio'});
    }
}

export async function ConsultarDadosFuncionario(req, res) {

    try {

        const matricula = req.body.matricula;

        if (!matricula){
            res.status(400).json({error: 'Matricula não informada'})
        }else{
            const dadosFuncionario = await GetDadosFuncionario(matricula); 
            res.json(dadosFuncionario);
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({error: 'Erro ao consultar dados do funcionario', message: error.message});
    }
    
}

export async function Listar(req, res) {

    try {
        const filtro = req.body.filtro;

        if (!filtro){
            res.status(400).json({error: 'filtro não informado'});
        }else{
            const dadosLista = await GetListar(filtro);
            res.json(dadosLista);
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({error: 'Erro ao consultar lista funcionario', message: error.message});
    }
    
}

export async function ConsultarUsuarioComplet(req ,res){
    try {
        const filtro = req.body;

        if (!filtro.descricao){
            res.status(400).json({error: 'Descrição não informada'})
        }else if (!filtro.id_grupo_empresa){
            res.status(400).json({error: 'id grupo de empresas não informada'})
        }else{
            const dadosUsuarioComplet = await GetUsuarioComplet(filtro.id_grupo_empresa, filtro.descricao);
            res.json(dadosUsuarioComplet);
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({error: 'Erro ao consultar funcionario do editcomplet', message: error.message});
    }
}

export async function CadastrarFuncionario(req ,res){
    try {
        const jsonReq = req.body;

        if (!jsonReq.id_empresa_erp){
            return res.status(400).json({error: 'Filial não informada !'});
        } else if (!jsonReq.id_grupo_empresa ){
            return res.status(400).json({error: 'Grupo de empresa não informado !'});
        } else if (!jsonReq.Nome){
            return res.status(400).json({error: 'Nome não informado !'});
        } else if (!jsonReq.cpf){
            return res.status(400).json({error: 'CPF não informado !'});
        } else if (!jsonReq.telefone){
            return res.status(400).json({error: 'Telefone não informado !'});
        } else if (!jsonReq.id_setor_erp) {
            return res.status(400).json({error: 'Setor não informado !'});
        } else if (!jsonReq.datanascimento){
            return res.status(400).json({error: 'Data de Nascimento não informado !'});
        } else if (!jsonReq.sexo){
            return res.status(400).json({error: 'Sexo não informado !'});
        } else if (!jsonReq.dataadmissao){
            return res.status(400).json({error: 'Data Admissão não informado !'});
        } else {                       
            const resultado = await SetCadastrarFuncionario(jsonReq);
            
            // se o model já retorna {sucesso, mensagem}, devolvemos isso
            if (resultado.sucesso === false) {
                return res.status(500).json({ error: resultado.mensagem });
            }

            return res.json(resultado);            
        }        
    
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error.message || "Erro inesperado" });
    }
}



export async function credencias(req, res) {
    try {
       
        const jsonReq = req.body;
        res.json( await setCredencias(jsonReq));

    } catch (error) {
        console.log(error);
        res.status(500).json({error: 'Erro ao cadastrar funcionario', message: error.message});
    }
}

export async function SalvarFoto(req, res) {
    try {
        const { id_usuario, foto } = req.body;
        if (!id_usuario) return res.status(400).json({ error: 'id_usuario não informado' });
        if (!foto) return res.status(400).json({ error: 'foto não informada' });
        res.json(await SetFotoUsuario(Number(id_usuario), foto));
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Erro ao salvar foto', message: error.message });
    }
}

export async function ConsultarFoto(req, res) {
    try {
        const { id_usuario } = req.body;
        if (!id_usuario) return res.status(400).json({ error: 'id_usuario não informado' });
        res.json(await GetFotoUsuario(Number(id_usuario)));
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Erro ao consultar foto', message: error.message });
    }
}