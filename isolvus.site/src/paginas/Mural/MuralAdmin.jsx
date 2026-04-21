import { useState, useEffect, useRef } from 'react';
import Menu from '../../componentes/Menu/Menu';
import api from '../../servidor/api.jsx';
import {
  ComunicadoCard,
  TIPOS,
  tipoBadge,
  inicialAvatar,
  formatarData,
} from '../../componentes/Mural/Mural';

import '../../componentes/Mural/Mural.css';

const SETORES_PUBLICADORES = ['RH', 'RECURSOS HUMANOS', 'MARKETING', 'ADMINISTRAÇÃO', 'TI', 'DIRETORIA'];
const MAX_MIDIAS = 10;
const MAX_TAMANHO_IMG_MB = 30;
const MAX_TAMANHO_VIDEO_MB = 200;
const TIPOS_IMAGEM = /^image\//;
const TIPOS_VIDEO  = /^video\//;

export default function MuralAdmin() {
  const idUsuario = Number(localStorage.getItem('id_usuario'));
  const idGrupoEmpresa = Number(localStorage.getItem('id_grupo_empresa'));
  const nome = localStorage.getItem('nome') || '';
  const setor = (localStorage.getItem('setor') || '').toUpperCase();
  const fotoUsuario = localStorage.getItem('foto_usuario') || '';

  const podePublicar = SETORES_PUBLICADORES.some((s) => setor.includes(s));

  const [comunicados, setComunicados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(null);
  const [erroFoto, setErroFoto] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroFotoEdicao, setErroFotoEdicao] = useState('');
  const [formEdicao, setFormEdicao] = useState({
    titulo: '', conteudo: '', tipo: 'AVISO',
    data_disponivel: '', data_expiracao: '',
    permite_comentario: false,
    fotosExistentes: [],
    fotosRemover: [],
    fotosNovas: [],
  });
  const [formEnqueteEdicao, setFormEnqueteEdicao] = useState({ pergunta: '', multipla_escolha: false, opcoes: ['', ''] });

  const inputFotoEdicaoRef = useRef(null);

  const [form, setForm] = useState({ titulo: '', conteudo: '', tipo: 'AVISO', fotos: [], data_disponivel: '', data_expiracao: '', permite_comentario: false });
  const [formEnquete, setFormEnquete] = useState({ pergunta: '', multipla_escolha: false, opcoes: ['', ''] });

  const inputFotoRef = useRef(null);
  const edicaoRef = useRef({});

  async function carregar() {
    setLoading(true);
    try {
      const { data } = await api.post('/v1/comunicado/listar', {
        id_grupo_empresa: idGrupoEmpresa, admin: true,
      });
      setComunicados(Array.isArray(data) ? data : []);
    } catch {
      setComunicados([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function limparForm() {
    form.fotos.forEach(({ preview }) => URL.revokeObjectURL(preview));
    setForm({ titulo: '', conteudo: '', tipo: 'AVISO', fotos: [], data_disponivel: '', data_expiracao: '', permite_comentario: false });
    setFormEnquete({ pergunta: '', multipla_escolha: false, opcoes: ['', ''] });
    setErroFoto('');
  }

  function handleFotos(e) {
    setErroFoto('');
    const arquivos = Array.from(e.target.files || []);
    if (!arquivos.length) return;

    const restantes = MAX_MIDIAS - form.fotos.length;
    if (restantes <= 0) {
      setErroFoto(`Máximo de ${MAX_MIDIAS} mídias por postagem.`);
      return;
    }

    const selecionados = arquivos.slice(0, restantes);

    for (const arquivo of selecionados) {
      const ehImagem = TIPOS_IMAGEM.test(arquivo.type);
      const ehVideo  = TIPOS_VIDEO.test(arquivo.type);
      if (!ehImagem && !ehVideo) {
        setErroFoto('Tipo de arquivo não suportado. Selecione uma imagem ou vídeo.');
        return;
      }
      const limMB = ehVideo ? MAX_TAMANHO_VIDEO_MB : MAX_TAMANHO_IMG_MB;
      if (arquivo.size > limMB * 1024 * 1024) {
        setErroFoto(`${ehVideo ? 'Vídeos' : 'Imagens'} devem ter no máximo ${limMB}MB.`);
        return;
      }
    }

    const novasMidias = selecionados.map(arquivo => ({
      file: arquivo,
      preview: URL.createObjectURL(arquivo),
    }));

    setForm((f) => ({ ...f, fotos: [...f.fotos, ...novasMidias] }));
    e.target.value = '';
  }

  function removerFoto(idx) {
    URL.revokeObjectURL(form.fotos[idx].preview);
    setForm((f) => ({ ...f, fotos: f.fotos.filter((_, i) => i !== idx) }));
  }

  async function publicar() {
    if (!form.titulo.trim()) return;
    if (form.tipo === 'ENQUETE') {
      const opcoesFiltradas = formEnquete.opcoes.filter(o => o.trim());
      if (!formEnquete.pergunta.trim() || opcoesFiltradas.length < 2) return;
    }
    setSalvando(true);
    try {
      const fd = new FormData();
      fd.append('titulo', form.titulo.trim());
      fd.append('conteudo', form.conteudo.trim());
      fd.append('tipo', form.tipo);
      fd.append('id_usuario_autor', idUsuario);
      fd.append('nome_autor', nome);
      fd.append('setor_autor', localStorage.getItem('setor') || '');
      fd.append('id_grupo_empresa', idGrupoEmpresa);
      if (form.data_disponivel) fd.append('data_disponivel', form.data_disponivel);
      if (form.data_expiracao)  fd.append('data_expiracao', form.data_expiracao);
      fd.append('permite_comentario', form.permite_comentario ? '1' : '0');
      form.fotos.forEach(({ file }) => fd.append('midias', file));

      const { data } = await api.post('/v1/comunicado/criar', fd);

      if (form.tipo === 'ENQUETE') {
        if (!data.id_comunicado) {
          console.error('Enquete não criada: id_comunicado não retornado pelo servidor.', data);
        } else {
          const opcoesFiltradas = formEnquete.opcoes.filter(o => o.trim());
          try {
            await api.post('/v1/enquete/criar', {
              id_comunicado: data.id_comunicado,
              pergunta: formEnquete.pergunta.trim(),
              multipla_escolha: formEnquete.multipla_escolha,
              opcoes: opcoesFiltradas,
            });
          } catch (errEnquete) {
            console.error('Erro ao criar enquete:', errEnquete?.response?.data || errEnquete.message);
          }
        }
      }

      limparForm();
      await carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id) {
    if (excluindo) return;
    setExcluindo(id);
    try {
      await api.post('/v1/comunicado/excluir', { id_comunicado: id, id_grupo_empresa: idGrupoEmpresa });
      await carregar();
    } finally {
      setExcluindo(null);
    }
  }

  async function iniciarEdicao(c) {
    const toLocal = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    let fotosExistentes = [];
    try {
      const raw = c.fotos || c.FOTOS;
      if (raw) fotosExistentes = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {}
    const tipo = c.tipo || c.TIPO || 'AVISO';
    const id = c.id_comunicado || c.ID_COMUNICADO;
    setEditandoId(id);
    setFormEdicao({
      titulo: c.titulo || c.TITULO || '',
      conteudo: c.conteudo || c.CONTEUDO || '',
      tipo,
      data_disponivel: toLocal(c.DATA_DISPONIVEL || c.data_disponivel),
      data_expiracao:  toLocal(c.DATA_EXPIRACAO  || c.data_expiracao),
      permite_comentario: Number(c.permite_comentario ?? c.PERMITE_COMENTARIO) === 1,
      fotosExistentes,
      fotosRemover: [],
      fotosNovas: [],
    });
    setErroFotoEdicao('');
    // Carregar dados da enquete se for do tipo ENQUETE
    if (tipo === 'ENQUETE') {
      try {
        const { data } = await api.post('/v1/enquete/consultar', { id_comunicado: id, id_usuario: idUsuario });
        if (data) {
          setFormEnqueteEdicao({
            pergunta: data.pergunta || '',
            multipla_escolha: !!data.multipla_escolha,
            opcoes: data.opcoes?.length >= 2 ? data.opcoes.map(o => o.texto) : ['', ''],
          });
        }
      } catch { setFormEnqueteEdicao({ pergunta: '', multipla_escolha: false, opcoes: ['', ''] }); }
    } else {
      setFormEnqueteEdicao({ pergunta: '', multipla_escolha: false, opcoes: ['', ''] });
    }
    setTimeout(() => {
      edicaoRef.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  function cancelarEdicao() {
    formEdicao.fotosNovas.forEach(({ preview }) => URL.revokeObjectURL(preview));
    setEditandoId(null);
    setFormEdicao({ titulo: '', conteudo: '', tipo: 'AVISO', data_disponivel: '', data_expiracao: '', permite_comentario: false, fotosExistentes: [], fotosRemover: [], fotosNovas: [] });
    setFormEnqueteEdicao({ pergunta: '', multipla_escolha: false, opcoes: ['', ''] });
    setErroFotoEdicao('');
  }

  async function salvarEdicao() {
    if (!formEdicao.titulo.trim()) return;
    if (formEdicao.tipo === 'ENQUETE') {
      const opcoesFiltradas = formEnqueteEdicao.opcoes.filter(o => o.trim());
      if (!formEnqueteEdicao.pergunta.trim() || opcoesFiltradas.length < 2) return;
    }
    setSalvandoEdicao(true);
    try {
      const fd = new FormData();
      fd.append('id_comunicado',      editandoId);
      fd.append('id_grupo_empresa',   idGrupoEmpresa);
      fd.append('titulo',             formEdicao.titulo.trim());
      fd.append('conteudo',           formEdicao.conteudo.trim());
      fd.append('tipo',               formEdicao.tipo);
      fd.append('permite_comentario', formEdicao.permite_comentario ? '1' : '0');
      if (formEdicao.data_disponivel) fd.append('data_disponivel', formEdicao.data_disponivel);
      if (formEdicao.data_expiracao)  fd.append('data_expiracao',  formEdicao.data_expiracao);
      if (formEdicao.fotosRemover.length > 0) fd.append('fotos_remover', JSON.stringify(formEdicao.fotosRemover));
      formEdicao.fotosNovas.forEach(({ file }) => fd.append('midias', file));
      await api.post('/v1/comunicado/editar', fd);

      // Salvar enquete separadamente
      if (formEdicao.tipo === 'ENQUETE') {
        const opcoesFiltradas = formEnqueteEdicao.opcoes.map(o => o.trim()).filter(Boolean);
        try {
          await api.post('/v1/enquete/editar', {
            id_comunicado: editandoId,
            pergunta: formEnqueteEdicao.pergunta.trim(),
            multipla_escolha: formEnqueteEdicao.multipla_escolha,
            opcoes: opcoesFiltradas,
          });
        } catch (err) {
          console.error('Erro ao atualizar enquete:', err?.response?.data || err.message);
        }
      }

      cancelarEdicao();
      await carregar();
    } finally {
      setSalvandoEdicao(false);
    }
  }

  return (
    <>
      <Menu />

      <div className="mural-admin-container">
        {!podePublicar ? (
          <div className="mural-sem-permissao">
            <i className="bi bi-shield-lock" />
            <p>Você não tem permissão para publicar no mural.</p>
            <small>Somente RH, Marketing, Administração, TI e Diretoria podem publicar.</small>
          </div>
        ) : (
          <div className="mural-post-form">
            <p className="mural-post-form-titulo">Nova publicação</p>

            {/* Autor */}
            <div className="mural-post-autor-row">
              <div className="mural-avatar mural-avatar--sm">
                {fotoUsuario
                  ? <img src={fotoUsuario} alt={nome} className="mural-avatar-img" />
                  : inicialAvatar(nome)
                }
              </div>
              <div>
                <span className="mural-card-nome">{nome}</span>
                <span className="mural-card-setor" style={{ display: 'block' }}>{localStorage.getItem('setor')}</span>
              </div>
            </div>

            {/* Tipo */}
            <div className="mural-modal-tipos mb-3">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`mural-tipo-btn ${form.tipo === t.value ? 'ativo' : ''}`}
                  style={{ '--tipo-cor': t.cor }}
                  onClick={() => setForm((f) => ({ ...f, tipo: t.value }))}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Título */}
            <div className="mb-3">
              <input
                className="mural-post-input mb-0"
                placeholder="Título da publicação *"
                value={form.titulo}
                maxLength={200}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              />
            </div>

            {/* Conteúdo */}
            <div className="mb-1">
              <textarea
                className="mural-post-textarea mb-0"
                placeholder="Descreva o comunicado, evento ou novidade..."
                value={form.conteudo}
                maxLength={4000}
                rows={4}
                onChange={(e) => setForm((f) => ({ ...f, conteudo: e.target.value }))}
              />
              <span className="mural-post-contador">{form.conteudo.length}/4000</span>
            </div>

            {/* Formulário de enquete */}
            {form.tipo === 'ENQUETE' && (
              <div className="mural-enquete-config">
                <p className="mural-enquete-config-titulo">
                  <i className="bi bi-bar-chart-fill me-2" />Configurar enquete
                </p>
                <div className="mb-3">
                  <input
                    className="mural-post-input mb-0"
                    placeholder="Pergunta da enquete *"
                    value={formEnquete.pergunta}
                    maxLength={500}
                    onChange={(e) => setFormEnquete(f => ({ ...f, pergunta: e.target.value }))}
                  />
                </div>
                {formEnquete.opcoes.map((op, i) => (
                  <div key={i} className="d-flex gap-2 mb-2">
                    <input
                      className="mural-post-input mb-0"
                      placeholder={`Opção ${i + 1}${i < 2 ? ' *' : ''}`}
                      value={op}
                      maxLength={300}
                      onChange={(e) => {
                        const novas = [...formEnquete.opcoes];
                        novas[i] = e.target.value;
                        setFormEnquete(f => ({ ...f, opcoes: novas }));
                      }}
                    />
                    {formEnquete.opcoes.length > 2 && (
                      <button
                        type="button"
                        className="mural-btn-limpar"
                        style={{ padding: '0 12px', flexShrink: 0 }}
                        onClick={() => setFormEnquete(f => ({ ...f, opcoes: f.opcoes.filter((_, idx) => idx !== i) }))}
                      >
                        <i className="bi bi-x" />
                      </button>
                    )}
                  </div>
                ))}
                {formEnquete.opcoes.length < 10 && (
                  <button
                    type="button"
                    className="mural-btn-limpar"
                    style={{ width: '100%', justifyContent: 'center', marginBottom: '12px' }}
                    onClick={() => setFormEnquete(f => ({ ...f, opcoes: [...f.opcoes, ''] }))}
                  >
                    <i className="bi bi-plus me-1" /> Adicionar opção
                  </button>
                )}
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="multipla_escolha"
                    checked={formEnquete.multipla_escolha}
                    onChange={(e) => setFormEnquete(f => ({ ...f, multipla_escolha: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="multipla_escolha" style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Permitir múltipla escolha
                  </label>
                </div>
              </div>
            )}

            {/* Período de publicação */}
            <div className="row g-3 mt-1 mb-3">
              <div className="col-12 col-sm-6">
                <label className="form-label fw-semibold" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  <i className="bi bi-calendar-check me-1" style={{ color: '#10b981' }} />
                  Publicar a partir de
                  <span className="d-block fw-normal" style={{ fontSize: '0.72rem' }}>Opcional — padrão: imediatamente</span>
                </label>
                <input
                  type="datetime-local"
                  className="form-control"
                  style={{ fontSize: '0.875rem' }}
                  value={form.data_disponivel}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setForm((f) => ({ ...f, data_disponivel: e.target.value }))}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label fw-semibold" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  <i className="bi bi-calendar-x me-1" style={{ color: '#ef4444' }} />
                  Expirar em
                  <span className="d-block fw-normal" style={{ fontSize: '0.72rem' }}>Opcional — padrão: nunca expira</span>
                </label>
                <input
                  type="datetime-local"
                  className="form-control"
                  style={{ fontSize: '0.875rem' }}
                  value={form.data_expiracao}
                  min={form.data_disponivel || new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setForm((f) => ({ ...f, data_expiracao: e.target.value }))}
                />
              </div>
            </div>

            {/* Permitir comentários */}
            <div className="mb-3">
              <label className="form-label fw-semibold d-flex align-items-center gap-2" style={{ fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  className="form-check-input m-0 flex-shrink-0"
                  checked={form.permite_comentario}
                  onChange={(e) => setForm(f => ({ ...f, permite_comentario: e.target.checked }))}
                />
                <i className="bi bi-chat-dots" style={{ color: '#6366f1' }} />
                Permitir comentários nesta publicação
              </label>
            </div>

            {/* Upload de fotos e vídeos */}
            <div className="mural-upload-area" onClick={() => inputFotoRef.current?.click()}>
              <label className="mural-upload-label">
                <i className="bi bi-images" />
                <span>Arquivos</span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Fotos e vídeos · selecionar da galeria ou arquivos</span>
              </label>
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="mural-upload-input"
                onChange={handleFotos}
              />
            </div>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '8px', marginTop: '-4px' }}>
              Imagens até {MAX_TAMANHO_IMG_MB}MB · Vídeos até {MAX_TAMANHO_VIDEO_MB}MB · Máx. {MAX_MIDIAS} arquivos
            </p>

            {erroFoto && (
              <div className="mural-erro-foto">
                <i className="bi bi-exclamation-triangle" /> {erroFoto}
              </div>
            )}

            {/* Prévia das fotos */}
            {form.fotos.length > 0 && (
              <div className="mural-preview-fotos">
                {form.fotos.map(({ file, preview }, idx) => (
                  <div key={idx} className="mural-preview-item">
                    {file.type.startsWith('video/') ? (
                      <video src={preview} className="mural-preview-img" muted />
                    ) : (
                      <img src={preview} alt={`prévia ${idx + 1}`} className="mural-preview-img" />
                    )}
                    <button type="button" className="mural-preview-remover" onClick={() => removerFoto(idx)}>
                      <i className="bi bi-x" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Botões */}
            <div className="mural-post-actions">
              <button type="button" className="mural-btn-limpar" onClick={limparForm} disabled={salvando}>
                Limpar
              </button>
              <button
                type="button"
                className="mural-btn-publicar"
                onClick={publicar}
                disabled={
                  salvando ||
                  !form.titulo.trim() ||
                  (form.tipo === 'ENQUETE' && (!formEnquete.pergunta.trim() || formEnquete.opcoes.filter(o => o.trim()).length < 2))
                }
              >
                {salvando ? 'Publicando...' : <><i className="bi bi-send" /> Publicar</>}
              </button>
            </div>
          </div>
        )}

        {/* Lista de comunicados */}
        <div className="mural-admin-lista">
          <div className="mural-admin-lista-header">
            <h3 className="mural-admin-lista-titulo">Minhas publicações</h3>
            {comunicados.length > 0 && (
              <span className="mural-admin-lista-badge">{comunicados.length}</span>
            )}
          </div>

          {loading && (
            <div className="mural-estado">
              <div className="mural-spinner" />
              <span>Carregando...</span>
            </div>
          )}

          {!loading && comunicados.length === 0 && (
            <div className="mural-estado">
              <i className="bi bi-inbox mural-estado-icon" />
              <span>Nenhuma publicação ainda.</span>
            </div>
          )}

          <div className="mural-feed">
            {comunicados.map((c) => {
              const id = c.id_comunicado || c.ID_COMUNICADO;
              const dataDisp = c.DATA_DISPONIVEL || c.data_disponivel;
              const dataExp  = c.DATA_EXPIRACAO  || c.data_expiracao;
              const agendado = dataDisp && new Date(dataDisp) > new Date();
              const emEdicao = editandoId === id;
              return (
                <div key={id} style={{ marginBottom: '8px' }}>
                  {(agendado || dataExp) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.78rem', marginBottom: '6px', paddingLeft: '4px' }}>
                      {agendado && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6366f1' }}>
                          <i className="bi bi-calendar-check" />
                          Inicia em: <strong>{formatarData(dataDisp)}</strong>
                        </span>
                      )}
                      {dataExp && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                          <i className="bi bi-calendar-x" />
                          Expira em: <strong>{formatarData(dataExp)}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  <ComunicadoCard
                    c={c}
                    onExcluir={excluir}
                    excluindo={excluindo}
                    podeModerarOuDono={true}
                    onEditar={iniciarEdicao}
                    mostrarResultados={true}
                  />

                  {/* Formulário de edição inline */}
                  {emEdicao && (
                    <div ref={el => edicaoRef.current[id] = el} className="mural-post-form" style={{ marginTop: '8px' }}>
                      <p className="mural-post-form-titulo">Editando publicação</p>

                      {/* Tipo — mostrado apenas se não for ENQUETE */}
                      {formEdicao.tipo !== 'ENQUETE' && (
                        <div className="mural-modal-tipos mb-3">
                          {TIPOS.filter(t => t.value !== 'ENQUETE').map((t) => (
                            <button
                              key={t.value}
                              type="button"
                              className={`mural-tipo-btn ${formEdicao.tipo === t.value ? 'ativo' : ''}`}
                              style={{ '--tipo-cor': t.cor }}
                              onClick={() => setFormEdicao((f) => ({ ...f, tipo: t.value }))}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Título */}
                      <div className="mb-3">
                        <input
                          className="mural-post-input mb-0"
                          placeholder="Título *"
                          value={formEdicao.titulo}
                          maxLength={200}
                          onChange={(e) => setFormEdicao((f) => ({ ...f, titulo: e.target.value }))}
                        />
                      </div>

                      {/* Conteúdo */}
                      <div className="mb-1">
                        <textarea
                          className="mural-post-textarea mb-0"
                          placeholder="Conteúdo..."
                          value={formEdicao.conteudo}
                          maxLength={4000}
                          rows={3}
                          onChange={(e) => setFormEdicao((f) => ({ ...f, conteudo: e.target.value }))}
                        />
                        <span className="mural-post-contador">{formEdicao.conteudo.length}/4000</span>
                      </div>

                      {/* Enquete — edição */}
                      {formEdicao.tipo === 'ENQUETE' && (
                        <div className="mural-enquete-form mb-3">
                          <label className="form-label fw-semibold" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            <i className="bi bi-bar-chart-line me-1" style={{ color: '#8b5cf6' }} />
                            Pergunta da enquete *
                          </label>
                          <input
                            className="mural-post-input mb-2"
                            placeholder="Qual é a pergunta?"
                            value={formEnqueteEdicao.pergunta}
                            maxLength={300}
                            onChange={(e) => setFormEnqueteEdicao(f => ({ ...f, pergunta: e.target.value }))}
                          />
                          <label className="form-label fw-semibold" style={{ fontSize: '0.8rem', color: '#64748b' }}>Opções *</label>
                          {formEnqueteEdicao.opcoes.map((op, idx) => (
                            <div key={idx} className="mural-enquete-opcao-row mb-1" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <input
                                className="mural-post-input mb-0"
                                placeholder={`Opção ${idx + 1}`}
                                value={op}
                                maxLength={200}
                                onChange={(e) => {
                                  const novas = [...formEnqueteEdicao.opcoes];
                                  novas[idx] = e.target.value;
                                  setFormEnqueteEdicao(f => ({ ...f, opcoes: novas }));
                                }}
                              />
                              {formEnqueteEdicao.opcoes.length > 2 && (
                                <button type="button" className="mural-btn-limpar" style={{ padding: '4px 8px', minWidth: 0 }}
                                  onClick={() => setFormEnqueteEdicao(f => ({ ...f, opcoes: f.opcoes.filter((_, i) => i !== idx) }))}>
                                  <i className="bi bi-x" />
                                </button>
                              )}
                            </div>
                          ))}
                          {formEnqueteEdicao.opcoes.length < 10 && (
                            <button type="button" className="mural-btn-limpar mt-1" style={{ fontSize: '0.78rem' }}
                              onClick={() => setFormEnqueteEdicao(f => ({ ...f, opcoes: [...f.opcoes, ''] }))}>
                              <i className="bi bi-plus-circle me-1" />Adicionar opção
                            </button>
                          )}
                          <div className="mt-2">
                            <label className="form-label fw-semibold d-flex align-items-center gap-2" style={{ fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
                              <input
                                type="checkbox"
                                className="form-check-input m-0"
                                checked={formEnqueteEdicao.multipla_escolha}
                                onChange={(e) => setFormEnqueteEdicao(f => ({ ...f, multipla_escolha: e.target.checked }))}
                              />
                              Permitir múltipla escolha
                            </label>
                          </div>
                          <p style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '6px', marginBottom: 0 }}>
                            <i className="bi bi-exclamation-triangle me-1" />
                            Alterar as opções irá remover todos os votos existentes.
                          </p>
                        </div>
                      )}

                      {/* Período */}
                      <div className="row g-3 mt-1 mb-3">
                        <div className="col-12 col-sm-6">
                          <label className="form-label fw-semibold" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            <i className="bi bi-calendar-check me-1" style={{ color: '#10b981' }} />
                            Publicar a partir de
                          </label>
                          <input
                            type="datetime-local"
                            className="form-control"
                            style={{ fontSize: '0.875rem' }}
                            value={formEdicao.data_disponivel}
                            onChange={(e) => setFormEdicao((f) => ({ ...f, data_disponivel: e.target.value }))}
                          />
                        </div>
                        <div className="col-12 col-sm-6">
                          <label className="form-label fw-semibold" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            <i className="bi bi-calendar-x me-1" style={{ color: '#ef4444' }} />
                            Expirar em
                          </label>
                          <input
                            type="datetime-local"
                            className="form-control"
                            style={{ fontSize: '0.875rem' }}
                            value={formEdicao.data_expiracao}
                            min={formEdicao.data_disponivel || undefined}
                            onChange={(e) => setFormEdicao((f) => ({ ...f, data_expiracao: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Permitir comentários */}
                      <div className="mb-3">
                        <label className="form-label fw-semibold d-flex align-items-center gap-2" style={{ fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            className="form-check-input m-0 flex-shrink-0"
                            checked={formEdicao.permite_comentario}
                            onChange={(e) => setFormEdicao(f => ({ ...f, permite_comentario: e.target.checked }))}
                          />
                          <i className="bi bi-chat-dots" style={{ color: '#6366f1' }} />
                          Permitir comentários nesta publicação
                        </label>
                      </div>

                      {/* Mídias existentes */}
                      {formEdicao.fotosExistentes.filter(p => !formEdicao.fotosRemover.includes(p)).length > 0 && (
                        <div className="mb-2">
                          <p className="form-label fw-semibold" style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>
                            <i className="bi bi-images me-1" style={{ color: '#6366f1' }} />
                            Mídias atuais
                          </p>
                          <div className="mural-preview-fotos">
                            {formEdicao.fotosExistentes
                              .filter(p => !formEdicao.fotosRemover.includes(p))
                              .map((caminho) => {
                                const url = `${api.defaults.baseURL}${caminho}`;
                                const ehVideo = /\.(mp4|mov|avi|webm|mkv)$/i.test(caminho);
                                return (
                                  <div key={caminho} className="mural-preview-item">
                                    {ehVideo
                                      ? <video src={url} className="mural-preview-img" muted />
                                      : <img src={url} alt="" className="mural-preview-img" />
                                    }
                                    <button
                                      type="button"
                                      className="mural-preview-remover"
                                      title="Remover mídia"
                                      onClick={() => setFormEdicao(f => ({ ...f, fotosRemover: [...f.fotosRemover, caminho] }))}
                                    >
                                      <i className="bi bi-x" />
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Novas mídias */}
                      {formEdicao.fotosNovas.length > 0 && (
                        <div className="mb-2">
                          <p className="form-label fw-semibold" style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>
                            <i className="bi bi-plus-circle me-1" style={{ color: '#10b981' }} />
                            Novas mídias
                          </p>
                          <div className="mural-preview-fotos">
                            {formEdicao.fotosNovas.map(({ file, preview }, idx) => (
                              <div key={idx} className="mural-preview-item">
                                {file.type.startsWith('video/')
                                  ? <video src={preview} className="mural-preview-img" muted />
                                  : <img src={preview} alt="" className="mural-preview-img" />
                                }
                                <button
                                  type="button"
                                  className="mural-preview-remover"
                                  onClick={() => {
                                    URL.revokeObjectURL(preview);
                                    setFormEdicao(f => ({ ...f, fotosNovas: f.fotosNovas.filter((_, i) => i !== idx) }));
                                  }}
                                >
                                  <i className="bi bi-x" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Upload de novas mídias */}
                      {erroFotoEdicao && <p style={{ fontSize: '0.78rem', color: '#ef4444', marginBottom: '6px' }}>{erroFotoEdicao}</p>}
                      <div
                        className="mural-upload-area mb-3"
                        style={{ padding: '10px 14px' }}
                        onClick={() => inputFotoEdicaoRef.current?.click()}
                      >
                        <label className="mural-upload-label" style={{ pointerEvents: 'none' }}>
                          <i className="bi bi-cloud-arrow-up" />
                          <span style={{ fontSize: '0.82rem' }}>Adicionar mídias</span>
                        </label>
                        <input
                          ref={inputFotoEdicaoRef}
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          className="mural-upload-input"
                          onChange={(e) => {
                            setErroFotoEdicao('');
                            const arquivos = Array.from(e.target.files || []);
                            if (!arquivos.length) return;
                            const restantes = MAX_MIDIAS - (formEdicao.fotosExistentes.filter(p => !formEdicao.fotosRemover.includes(p)).length + formEdicao.fotosNovas.length);
                            if (restantes <= 0) { setErroFotoEdicao(`Máximo de ${MAX_MIDIAS} mídias por postagem.`); return; }
                            const selecionados = arquivos.slice(0, restantes);
                            for (const arq of selecionados) {
                              const ehImg = TIPOS_IMAGEM.test(arq.type);
                              const ehVid = TIPOS_VIDEO.test(arq.type);
                              if (!ehImg && !ehVid) { setErroFotoEdicao('Tipo não suportado.'); return; }
                              const lim = ehVid ? MAX_TAMANHO_VIDEO_MB : MAX_TAMANHO_IMG_MB;
                              if (arq.size > lim * 1024 * 1024) { setErroFotoEdicao(`${ehVid ? 'Vídeos' : 'Imagens'} até ${lim}MB.`); return; }
                            }
                            const novas = selecionados.map(arq => ({ file: arq, preview: URL.createObjectURL(arq) }));
                            setFormEdicao(f => ({ ...f, fotosNovas: [...f.fotosNovas, ...novas] }));
                            e.target.value = '';
                          }}
                        />
                      </div>

                      <div className="mural-post-actions">
                        <button type="button" className="mural-btn-limpar" onClick={cancelarEdicao} disabled={salvandoEdicao}>
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="mural-btn-publicar"
                          onClick={salvarEdicao}
                          disabled={
                            salvandoEdicao ||
                            !formEdicao.titulo.trim() ||
                            (formEdicao.tipo === 'ENQUETE' && (!formEnqueteEdicao.pergunta.trim() || formEnqueteEdicao.opcoes.filter(o => o.trim()).length < 2))
                          }
                        >
                          {salvandoEdicao ? 'Salvando...' : <><i className="bi bi-check2" /> Salvar</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
