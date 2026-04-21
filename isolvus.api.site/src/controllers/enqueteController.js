import { criarEnqueteModel, votarEnqueteModel, consultarEnqueteModel, editarEnqueteModel } from '../models/enqueteModel.js';

export async function criarEnquete(req, res) {
  try {
    const { id_comunicado, pergunta, multipla_escolha, opcoes } = req.body;
    if (!id_comunicado || !pergunta?.trim() || !Array.isArray(opcoes) || opcoes.filter(o => o?.trim()).length < 2) {
      return res.status(400).json({ erro: 'Informe a pergunta e ao menos 2 opções.' });
    }
    const opcoesFiltradas = opcoes.map(o => o.trim()).filter(Boolean);
    const result = await criarEnqueteModel({
      id_comunicado: Number(id_comunicado),
      pergunta: pergunta.trim(),
      multipla_escolha: !!multipla_escolha,
      opcoes: opcoesFiltradas,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
}

export async function votarEnquete(req, res) {
  try {
    const { id_enquete, id_opcao, id_usuario } = req.body;
    if (!id_enquete || !id_opcao || !id_usuario) {
      return res.status(400).json({ erro: 'Dados incompletos.' });
    }
    const result = await votarEnqueteModel({
      id_enquete: Number(id_enquete),
      id_opcao: Number(id_opcao),
      id_usuario: Number(id_usuario),
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ erro: error.message });
  }
}

export async function editarEnquete(req, res) {
  try {
    const { id_comunicado, pergunta, multipla_escolha, opcoes } = req.body;
    if (!id_comunicado || !pergunta?.trim() || !Array.isArray(opcoes) || opcoes.filter(o => o?.trim()).length < 2) {
      return res.status(400).json({ erro: 'Informe a pergunta e ao menos 2 op\u00e7\u00f5es.' });
    }
    const opcoesFiltradas = opcoes.map(o => o.trim()).filter(Boolean);
    const result = await editarEnqueteModel({
      id_comunicado: Number(id_comunicado),
      pergunta: pergunta.trim(),
      multipla_escolha: !!multipla_escolha,
      opcoes: opcoesFiltradas,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
}

export async function consultarEnquete(req, res) {
  try {
    const { id_comunicado, id_usuario } = req.body;
    if (!id_comunicado) return res.status(400).json({ erro: 'id_comunicado obrigatório.' });
    const result = await consultarEnqueteModel({
      id_comunicado: Number(id_comunicado),
      id_usuario: Number(id_usuario || 0),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
}
