import { comentarModel, excluirComentarioModel, listarComentariosModel } from '../models/comentarioModel.js';
import { notificarComentario } from '../utils/notificarMural.js';

export async function comentar(req, res) {
  try {
    const { id_comunicado, id_usuario, nome_usuario, foto_usuario, texto, id_comentario_pai } = req.body;
    if (!id_comunicado || !id_usuario || !texto?.trim()) return res.status(400).json({ erro: 'Dados incompletos.' });
    const result = await comentarModel({
      id_comunicado: Number(id_comunicado),
      id_usuario: Number(id_usuario),
      nome_usuario,
      foto_usuario,
      texto: texto.trim(),
      id_comentario_pai: id_comentario_pai ? Number(id_comentario_pai) : null,
    });
    // Notifica de forma assíncrona
    notificarComentario({
      id_comunicado:        Number(id_comunicado),
      id_usuario_comentador: Number(id_usuario),
      nome_comentador:      nome_usuario || 'Alguém',
      texto:                texto.trim(),
      id_comentario_pai:    id_comentario_pai ? Number(id_comentario_pai) : null,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
}

export async function excluirComentario(req, res) {
  try {
    const { id_comentario, id_usuario } = req.body;
    if (!id_comentario || !id_usuario) return res.status(400).json({ erro: 'Dados incompletos.' });
    const result = await excluirComentarioModel({ id_comentario: Number(id_comentario), id_usuario: Number(id_usuario) });
    res.json(result);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
}

export async function listarComentarios(req, res) {
  try {
    const { id_comunicado } = req.body;
    if (!id_comunicado) return res.status(400).json({ erro: 'id_comunicado obrigatório.' });
    const result = await listarComentariosModel({ id_comunicado: Number(id_comunicado) });
    res.json(result);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
}
