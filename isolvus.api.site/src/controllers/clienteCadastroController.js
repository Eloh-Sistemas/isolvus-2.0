import { inserirCliente, buscarClientePorCGC} from "../models/clienteCadastroModel.js";

export async function cadastrarCliente(req, res) {
  try {
    const { cgcEnt, clienteNome, telEnt ,grupoEmpresa} = req.body;

    if (!cgcEnt || !clienteNome || !telEnt || !grupoEmpresa) {
      return res.status(400).json({ mensagem: 'Todos os campos são obrigatórios.' });
    }

    const resultado = await inserirCliente({
      cgc: cgcEnt,       
      nome: clienteNome,
      telefone: telEnt,
      idgrupoempresa: grupoEmpresa
    });

    if (!resultado.sucesso) {
      return res.status(400).json(resultado);
    }
    return res.status(201).json(resultado);

  } catch (erro) {
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
