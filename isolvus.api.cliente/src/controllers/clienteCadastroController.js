import { inserirCliente,buscarClientePorCGC, setAlterarGeolocalizacao, SetCadastrarCliente  } from "../models/clienteCadastroModel.js";

export async function cadastrarCliente(req, res) {
  try {
    const { cgcEnt, clienteNome, telEnt } = req.body;

    if (!clienteNome || !cgcEnt || !telEnt) {
      return res.status(400).json({ mensagem: 'Todos os campos são obrigatórios.' });
    }

    const { jaExiste, cliente: clienteInserido } = await inserirCliente({
      cgcEnt,
      cliente: clienteNome,
      telEnt
    });

    if (jaExiste) {
      return res.status(200).json({
        mensagem: 'Cliente já cadastrado.',
        cliente: clienteInserido
      });
    }

    return res.status(201).json({
      mensagem: 'Cliente cadastrado com sucesso!',
      cliente: clienteInserido
    });

  } catch (erro) {
    console.error('Erro ao cadastrar cliente:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
  }
}

export async function consultarCliente(req, res) {
  try {
    const { cgcEnt } = req.params;

    if (!cgcEnt) {
      return res.status(400).json({ mensagem: 'CGC (CPF/CNPJ) não informado.' });
    }

    const cliente = await buscarClientePorCGC(cgcEnt);

    if (cliente) {
      return res.status(200).json({ cliente });
    } else {
      return res.status(404).json({ mensagem: 'Cliente não encontrado.' });
    }

  } catch (erro) {
    console.error('Erro ao consultar cliente:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
  }

}


export async function alterargeolocalizacao(req, res) {

    const jsonReq = req.body;

    if (!jsonReq.id_cliente) {
      return res.status(400).json({ mensagem: 'Cliente não informado.' });
    }

    try {
      
      return res.status(200).json(await setAlterarGeolocalizacao(jsonReq))  

    } catch (error) {
        console.log(error);
        return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }

}


export async function CadastrarClienteFull(req, res) {

  const jsonReq = req.body;

  try {    

      return res.status(200).json(await SetCadastrarCliente(jsonReq));

  } catch (error) {
      return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
  }
  
}