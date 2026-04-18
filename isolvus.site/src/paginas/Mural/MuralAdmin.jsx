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
  const [formEdicao, setFormEdicao] = useState({ titulo: '', conteudo: '', tipo: 'AVISO', data_disponivel: '', data_expiracao: '' });

  const [form, setForm] = useState({ titulo: '', conteudo: '', tipo: 'AVISO', fotos: [], data_disponivel: '', data_expiracao: '' });

  const inputFotoRef = useRef(null);

  async function carregar() {
    setLoading(true);
    try {
      const { data } = await api.post('/v1/comunicado/listar', { id_grupo_empresa: idGrupoEmpresa, admin: true });
      setComunicados(Array.isArray(data) ? data : []);
    } catch {
      setComunicados([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function limparForm() {
    setForm({ titulo: '', conteudo: '', tipo: 'AVISO', fotos: [], data_disponivel: '', data_expiracao: '' });
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

    const leitores = selecionados.map(
      (arquivo) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.readAsDataURL(arquivo);
        })
    );

    Promise.all(leitores).then((bases) => {
      setForm((f) => ({ ...f, fotos: [...f.fotos, ...bases] }));
    });

    e.target.value = '';
  }

  function removerFoto(idx) {
    setForm((f) => ({ ...f, fotos: f.fotos.filter((_, i) => i !== idx) }));
  }

  async function publicar() {
    if (!form.titulo.trim()) return;
    setSalvando(true);
    try {
      await api.post('/v1/comunicado/criar', {
        titulo: form.titulo.trim(),
        conteudo: form.conteudo.trim(),
        tipo: form.tipo,
        fotos: form.fotos,
        id_usuario_autor: idUsuario,
        nome_autor: nome,
        setor_autor: localStorage.getItem('setor') || '',
        id_grupo_empresa: idGrupoEmpresa,
        data_disponivel: form.data_disponivel || null,
        data_expiracao: form.data_expiracao || null,
      });
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

  function iniciarEdicao(c) {
    const toLocal = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    setEditandoId(c.ID_COMUNICADO || c.id_comunicado);
    setFormEdicao({
      titulo:         c.TITULO         || c.titulo         || '',
      conteudo:       c.CONTEUDO       || c.conteudo       || '',
      tipo:           c.TIPO           || c.tipo           || 'AVISO',
      data_disponivel: toLocal(c.DATA_DISPONIVEL || c.data_disponivel),
      data_expiracao:  toLocal(c.DATA_EXPIRACAO  || c.data_expiracao),
    });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setFormEdicao({ titulo: '', conteudo: '', tipo: 'AVISO', data_disponivel: '', data_expiracao: '' });
  }

  async function salvarEdicao() {
    if (!formEdicao.titulo.trim()) return;
    setSalvandoEdicao(true);
    try {
      await api.post('/v1/comunicado/editar', {
        id_comunicado:   editandoId,
        id_grupo_empresa: idGrupoEmpresa,
        titulo:          formEdicao.titulo.trim(),
        conteudo:        formEdicao.conteudo.trim(),
        tipo:            formEdicao.tipo,
        data_disponivel: formEdicao.data_disponivel || null,
        data_expiracao:  formEdicao.data_expiracao  || null,
      });
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
              <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '10px' }}>{erroFoto}</p>
            )}

            {form.fotos.length > 0 && (
              <div className="mural-preview-grid">
                {form.fotos.map((src, i) => (
                  <div key={i} className="mural-preview-item">
                    {src.startsWith('data:video/')
                      ? <video src={src} className="mural-preview-video" muted playsInline preload="metadata" />
                      : <img src={src} alt={`preview-${i}`} />
                    }
                    <button
                      type="button"
                      className="mural-preview-remover"
                      onClick={() => removerFoto(i)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mural-post-actions">
              <button type="button" className="mural-btn-limpar" onClick={limparForm} disabled={salvando}>
                Limpar
              </button>
              <button
                type="button"
                className="mural-btn-publicar"
                onClick={publicar}
                disabled={salvando || !form.titulo.trim()}
              >
                {salvando ? 'Publicando...' : <><i className="bi bi-send" /> Publicar</>}
              </button>
            </div>
          </div>
        )}

        {/* Lista de publicações existentes */}
        {(() => {
          const minhas = comunicados.filter((c) => (c.ID_USUARIO_AUTOR || c.id_usuario_autor) === idUsuario);
          return (
            <>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                Minhas publicações ({minhas.length})
              </h3>

              {loading && (
                <div className="mural-estado">
                  <div className="mural-spinner" />
                  <span>Carregando...</span>
                </div>
              )}

              {!loading && minhas.length === 0 && (
                <div className="mural-estado">
                  <i className="bi bi-inbox mural-estado-icon" />
                  <span>Nenhuma publicação ainda.</span>
                </div>
              )}

              <div className="mural-feed">
                {minhas.map((c) => {
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
                      />

                      {/* Formulário de edição inline */}
                      {emEdicao && (
                        <div className="mural-post-form" style={{ marginTop: '8px' }}>
                          <p className="mural-post-form-titulo">Editando publicação</p>

                          <div className="mural-modal-tipos mb-3">
                            {TIPOS.map((t) => (
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

                          <div className="mb-3">
                            <input
                              className="mural-post-input mb-0"
                              placeholder="Título *"
                              value={formEdicao.titulo}
                              maxLength={200}
                              onChange={(e) => setFormEdicao((f) => ({ ...f, titulo: e.target.value }))}
                            />
                          </div>

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

                          <div className="mural-post-actions">
                            <button type="button" className="mural-btn-limpar" onClick={cancelarEdicao} disabled={salvandoEdicao}>
                              Cancelar
                            </button>
                            <button
                              type="button"
                              className="mural-btn-publicar"
                              onClick={salvarEdicao}
                              disabled={salvandoEdicao || !formEdicao.titulo.trim()}
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
            </>
          );
        })()}
      </div>
    </>
  );
}
