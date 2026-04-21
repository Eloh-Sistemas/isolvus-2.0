import { reagirModel, consultarReacoesModel } from '../models/reacaoModel.js';
import { notificarReacao } from '../utils/notificarMural.js';

export async function reagir(req, res) {
  try {
    const { id_comunicado, id_usuario, tipo, nome_usuario } = req.body;
    if (!id_comunicado || !id_usuario || !tipo) return res.status(400).json({ erro: 'Dados incompletos.' });
    const result = await reagirModel({ id_comunicado: Number(id_comunicado), id_usuario: Number(id_usuario), tipo });
    // Notifica de forma assíncrona (não bloqueia a resposta)
    notificarReacao({
      id_comunicado:    Number(id_comunicado),
      id_usuario_reator: Number(id_usuario),
      nome_reator:      nome_usuario || 'Alguém',
      tipo,
      acao:             result.acao,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
}

export async function consultarReacoes(req, res) {
  try {
    const { id_comunicado, id_usuario } = req.body;
    if (!id_comunicado) return res.status(400).json({ erro: 'id_comunicado obrigatório.' });
    const result = await consultarReacoesModel({ id_comunicado: Number(id_comunicado), id_usuario: Number(id_usuario || 0) });
    res.json(result);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
}
