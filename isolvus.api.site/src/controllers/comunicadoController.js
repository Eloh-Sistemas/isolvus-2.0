import path from 'path';
import fs from 'fs';
import multer from 'multer';
import {
  listarComunicadosModel, criarComunicadoModel, excluirComunicadoModel, editarComunicadoModel, getFotosComunicadoModel,
} from "../models/comunicadoModel.js";

const MIDIAS_DIR = path.join(process.cwd(), 'src/midias/comunicados');
if (!fs.existsSync(MIDIAS_DIR)) fs.mkdirSync(MIDIAS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MIDIAS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^(image|video)\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido'));
  },
});

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
    const { titulo, conteudo, tipo, id_usuario_autor, nome_autor, setor_autor, id_grupo_empresa, data_disponivel, data_expiracao, permite_comentario } = req.body;

    if (!titulo || !id_grupo_empresa || !id_usuario_autor) {
      (req.files || []).forEach(f => fs.unlink(f.path, () => {}));
      return res.status(400).json({ error: 'Dados obrigatórios não informados!' });
    }

    const caminhos = (req.files || []).map(f => `/midias/comunicados/${f.filename}`);
    const fotosJson = caminhos.length > 0 ? JSON.stringify(caminhos) : null;

    const result = await criarComunicadoModel({ titulo, conteudo, tipo: tipo || 'AVISO', fotos: fotosJson, id_usuario_autor, nome_autor, setor_autor, id_grupo_empresa, data_disponivel: data_disponivel || null, data_expiracao: data_expiracao || null, permite_comentario: Number(permite_comentario) === 1 });
    res.json({ success: true, id_comunicado: result.id_comunicado, message: 'Comunicado publicado com sucesso!' });
  } catch (error) {
    (req.files || []).forEach(f => fs.unlink(f.path, () => {}));
    res.status(500).json({ error: 'Erro ao criar comunicado', message: error.message });
  }
}

export async function excluirComunicado(req, res) {
  try {
    const { id_comunicado, id_grupo_empresa } = req.body;
    if (!id_comunicado || !id_grupo_empresa) {
      return res.status(400).json({ error: 'Dados obrigatórios não informados!' });
    }

    const fotosRaw = await getFotosComunicadoModel({ id_comunicado, id_grupo_empresa });
    await excluirComunicadoModel({ id_comunicado, id_grupo_empresa });

    if (fotosRaw) {
      try {
        JSON.parse(fotosRaw).forEach(caminho => {
          const filePath = path.join(process.cwd(), 'src', caminho);
          fs.unlink(filePath, () => {});
        });
      } catch {}
    }

    res.json({ success: true, message: 'Comunicado removido!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir comunicado', message: error.message });
  }
}

export async function editarComunicado(req, res) {
  try {
    const { id_comunicado, id_grupo_empresa, titulo, conteudo, tipo, data_disponivel, data_expiracao, permite_comentario, fotos_remover } = req.body;
    if (!id_comunicado || !id_grupo_empresa || !titulo) {
      (req.files || []).forEach(f => fs.unlink(f.path, () => {}));
      return res.status(400).json({ error: 'Dados obrigatórios não informados!' });
    }

    // Carregar fotos atuais do banco
    const fotosRaw = await getFotosComunicadoModel({ id_comunicado, id_grupo_empresa });
    let fotosAtuais = [];
    try { fotosAtuais = fotosRaw ? JSON.parse(fotosRaw) : []; } catch {}

    // Remover arquivos deletados pelo usuário
    let paraRemover = [];
    try { paraRemover = fotos_remover ? JSON.parse(fotos_remover) : []; } catch {}
    paraRemover.forEach(caminho => {
      const filePath = path.join(process.cwd(), 'src', caminho);
      fs.unlink(filePath, () => {});
    });

    // Fotos restantes + novas
    const fotosRestantes = fotosAtuais.filter(f => !paraRemover.includes(f));
    const fotasNovas = (req.files || []).map(f => `/midias/comunicados/${f.filename}`);
    const fotasFinal = [...fotosRestantes, ...fotasNovas];
    const fotosJson = fotasFinal.length > 0 ? JSON.stringify(fotasFinal) : null;

    await editarComunicadoModel({
      id_comunicado, id_grupo_empresa, titulo, conteudo, tipo,
      data_disponivel: data_disponivel || null,
      data_expiracao:  data_expiracao  || null,
      permite_comentario: Number(permite_comentario) === 1,
      fotos: fotosJson,
    });
    res.json({ success: true, message: 'Comunicado atualizado com sucesso!' });
  } catch (error) {
    (req.files || []).forEach(f => fs.unlink(f.path, () => {}));
    res.status(500).json({ error: 'Erro ao editar comunicado', message: error.message });
  }
}
