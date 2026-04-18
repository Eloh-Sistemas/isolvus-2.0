import {
  listarComunicadosModel, criarComunicadoModel, excluirComunicadoModel, editarComunicadoModel,
} from "../models/comunicadoModel.js";

export async function listarComunicados(req, res) {
  try {
    const { id_grupo_empresa, admin } = req.body;
    if (!id_grupo_empresa) {
      return res.status(400).json({ error: 'Grupo de empresa não informado!' });
    }
    const comunicados = await listarComunicadosModel({ id_grupo_empresa, admin: !!admin });
    res.json(comunicados);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar comunicados', message: error.message });
  }
}

export async function criarComunicado(req, res) {
  try {
    const { titulo, conteudo, tipo, fotos, id_usuario_autor, nome_autor, setor_autor, id_grupo_empresa, data_disponivel, data_expiracao } = req.body;

    if (!titulo || !id_grupo_empresa || !id_usuario_autor) {
      return res.status(400).json({ error: 'Dados obrigatórios não informados!' });
    }

    const fotosJson = fotos && fotos.length > 0 ? JSON.stringify(fotos) : null;

    await criarComunicadoModel({ titulo, conteudo, tipo: tipo || 'AVISO', fotos: fotosJson, id_usuario_autor, nome_autor, setor_autor, id_grupo_empresa, data_disponivel: data_disponivel || null, data_expiracao: data_expiracao || null });
    res.json({ success: true, message: 'Comunicado publicado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar comunicado', message: error.message });
  }
}

export async function excluirComunicado(req, res) {
  try {
    const { id_comunicado, id_grupo_empresa } = req.body;
    if (!id_comunicado || !id_grupo_empresa) {
      return res.status(400).json({ error: 'Dados obrigatórios não informados!' });
    }
    await excluirComunicadoModel({ id_comunicado, id_grupo_empresa });
    res.json({ success: true, message: 'Comunicado removido!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir comunicado', message: error.message });
  }
}

export async function editarComunicado(req, res) {
  try {
    const { id_comunicado, id_grupo_empresa, titulo, conteudo, tipo, data_disponivel, data_expiracao } = req.body;
    if (!id_comunicado || !id_grupo_empresa || !titulo) {
      return res.status(400).json({ error: 'Dados obrigatórios não informados!' });
    }
    await editarComunicadoModel({ id_comunicado, id_grupo_empresa, titulo, conteudo, tipo, data_disponivel: data_disponivel || null, data_expiracao: data_expiracao || null });
    res.json({ success: true, message: 'Comunicado atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao editar comunicado', message: error.message });
  }
}
