import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../servidor/api.jsx';
import './Mural.css';

export const TIPOS = [
  { value: 'AVISO', label: 'Aviso', cor: '#f59e0b' },
  { value: 'EVENTO', label: 'Evento', cor: '#6366f1' },
  { value: 'NOVIDADE', label: 'Novidade', cor: '#10b981' },
  { value: 'URGENTE', label: 'Urgente', cor: '#ef4444' },  { value: 'ENQUETE',  label: 'Enquete',  cor: '#8b5cf6' },];

export function tipoBadge(tipo) {
  const t = TIPOS.find((x) => x.value === tipo) || TIPOS[0];
  return <span className="mural-badge" style={{ background: t.cor }}>{t.label}</span>;
}

export function formatarData(data) {
  if (!data) return '';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function inicialAvatar(nomeStr) {
  return (nomeStr || 'U').charAt(0).toUpperCase();
}

export function parseFotos(fotosRaw) {
  if (!fotosRaw) return [];
  try { return JSON.parse(fotosRaw); } catch { return []; }
}

export function isVideo(src) {
  if (!src) return false;
  if (src.startsWith('data:video/')) return true;
  return /\.(mp4|webm|ogg|mov)$/i.test(src);
}

/* ─── Card individual do comunicado ─── */
export function ComunicadoCard({ c, onExcluir, excluindo, podeModerarOuDono, onEditar, mostrarResultados = false }) {
  const idComunicadoAtual = c.id_comunicado || c.ID_COMUNICADO;

  const [fotoAtiva, setFotoAtiva] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [posterMap, setPosterMap] = useState({});
  const [lightbox, setLightbox] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [enquete, setEnquete] = useState(null);
  const [votando, setVotando] = useState(false);
  const [carregandoEnquete, setCarregandoEnquete] = useState(false);
  const [erroEnquete, setErroEnquete] = useState('');
  const [reacoes, setReacoes] = useState({ contagens: {}, minha_reacao: null, total: 0 });
  const [reacaoFimScroll, setReacaoFimScroll] = useState(false);
  const reacaoBarRef = useRef(null);
  const [comentarios, setComentarios] = useState([]);
  const [comentariosAbertos, setComentariosAbertos] = useState(false);
  const [novoComentario, setNovoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [totalComentarios, setTotalComentarios] = useState(() => Number(c.total_comentarios ?? c.TOTAL_COMENTARIOS ?? 0));
  const [respondendoId, setRespondendoId] = useState(null);
  const [textoResposta, setTextoResposta] = useState('');
  const [enviandoResposta, setEnviandoResposta] = useState(false);

  const menuRef  = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!menuAberto) return;
    function fechar(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAberto(false);
    }
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, [menuAberto]);

  useEffect(() => {
    if (!lightbox) return;
    function fecharEsc(e) { if (e.key === 'Escape') setLightbox(false); }
    document.addEventListener('keydown', fecharEsc);
    return () => document.removeEventListener('keydown', fecharEsc);
  }, [lightbox]);

  // Extrai o primeiro frame dos vídeos para usar como poster
  useEffect(() => {
    const fotos = parseFotos(c.fotos || c.FOTOS || null);
    fotos.forEach((src, idx) => {
      if (!isVideo(src) || posterMap[idx]) return;
      const vid = document.createElement('video');
      vid.muted = true;
      vid.playsInline = true;
      vid.preload = 'metadata';
      vid.src = src;
      vid.currentTime = 0.5;
      const capturar = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = vid.videoWidth || 320;
          canvas.height = vid.videoHeight || 180;
          canvas.getContext('2d').drawImage(vid, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setPosterMap((prev) => ({ ...prev, [idx]: dataUrl }));
        } catch {}
        vid.src = '';
      };
      vid.addEventListener('seeked', capturar, { once: true });
      vid.addEventListener('error', () => { vid.src = ''; }, { once: true });
    });
  }, [c]);

  const titulo            = c.titulo       || c.TITULO       || '';
  const conteudo          = c.conteudo     || c.CONTEUDO     || '';
  const tipo              = c.tipo         || c.TIPO         || 'AVISO';
  const nomeAutor         = c.nome_autor   || c.NOME_AUTOR   || '';
  const _fotoAutorRaw     = c.foto_autor   || c.FOTO_AUTOR   || '';
  const dataPublic        = c.data_publicacao || c.DATA_PUBLICACAO || '';
  const idComunicado      = c.id_comunicado   || c.ID_COMUNICADO;
  const fotosRaw          = c.fotos        || c.FOTOS        || null;
  const permiteComentario = Number(c.permite_comentario ?? c.PERMITE_COMENTARIO) === 1;
  const BASE_URL          = api.defaults.baseURL || '';
  const fotoAutor = _fotoAutorRaw.startsWith('/midias/') ? `${BASE_URL}${_fotoAutorRaw}` : _fotoAutorRaw;
  const fotos     = parseFotos(fotosRaw).map(src => src.startsWith('/') ? `${BASE_URL}${src}` : src);

  const t = TIPOS.find((x) => x.value === tipo) || TIPOS[0];
  const temFotos = fotos.length > 0;
  const ehVideoAtual = temFotos && isVideo(fotos[fotoAtiva]);
  const idUsuarioLogado = Number(localStorage.getItem('id_usuario') || 0);

  useEffect(() => {
    if (tipo !== 'ENQUETE') return;
    setCarregandoEnquete(true);
    setErroEnquete('');
    api.post('/v1/enquete/consultar', { id_comunicado: idComunicado, id_usuario: idUsuarioLogado })
      .then(({ data }) => setEnquete(data || null))
      .catch(err => {
        console.error('Erro ao carregar enquete:', err?.response?.data || err.message);
        setErroEnquete('Erro ao carregar enquete.');
      })
      .finally(() => setCarregandoEnquete(false));
  }, [idComunicado]);

  async function votar(id_enquete, id_opcao) {
    setVotando(true);
    try {
      await api.post('/v1/enquete/votar', { id_enquete, id_opcao, id_usuario: idUsuarioLogado });
      const { data } = await api.post('/v1/enquete/consultar', { id_comunicado: idComunicado, id_usuario: idUsuarioLogado });
      setEnquete(data);
    } catch {}
    finally { setVotando(false); }
  }

  useEffect(() => {
    api.post('/v1/reacao/consultar', { id_comunicado: idComunicado, id_usuario: idUsuarioLogado })
      .then(({ data }) => setReacoes(data || { contagens: {}, minha_reacao: null, total: 0 }))
      .catch(() => {});
  }, [idComunicado]);

  async function reagir(tipo) {
    try {
      await api.post('/v1/reacao/reagir', { id_comunicado: idComunicado, id_usuario: idUsuarioLogado, tipo, nome_usuario: localStorage.getItem('nome') || '' });
      const { data } = await api.post('/v1/reacao/consultar', { id_comunicado: idComunicado, id_usuario: idUsuarioLogado });
      setReacoes(data);
    } catch {}
  }

  async function carregarComentarios() {
    function contarTodos(lista) {
      return lista.reduce((acc, cm) => acc + 1 + contarTodos(cm.respostas || []), 0);
    }
    try {
      const { data } = await api.post('/v1/comentario/listar', { id_comunicado: idComunicado });
      const lista = Array.isArray(data) ? data : [];
      setComentarios(lista);
      setTotalComentarios(contarTodos(lista));
    } catch {}
  }

  async function enviarComentario() {
    if (!novoComentario.trim()) return;
    setEnviandoComentario(true);
    try {
      const fotoAtual = localStorage.getItem('foto_usuario') || '';
      await api.post('/v1/comentario/comentar', {
        id_comunicado: idComunicado,
        id_usuario: idUsuarioLogado,
        nome_usuario: localStorage.getItem('nome') || '',
        foto_usuario: fotoAtual,
        texto: novoComentario.trim(),
      });
      setNovoComentario('');
      await carregarComentarios();
    } catch {}
    finally { setEnviandoComentario(false); }
  }

  async function excluirComentario(id_comentario) {
    try {
      await api.post('/v1/comentario/excluir', { id_comentario, id_usuario: idUsuarioLogado });
      await carregarComentarios();
    } catch {}
  }

  async function enviarResposta(id_pai) {
    if (!textoResposta.trim()) return;
    setEnviandoResposta(true);
    try {
      await api.post('/v1/comentario/comentar', {
        id_comunicado: idComunicado,
        id_usuario: idUsuarioLogado,
        nome_usuario: localStorage.getItem('nome') || '',
        foto_usuario: localStorage.getItem('foto_usuario') || '',
        texto: textoResposta.trim(),
        id_comentario_pai: id_pai,
      });
      setTextoResposta('');
      setRespondendoId(null);
      await carregarComentarios();
    } catch {}
    finally { setEnviandoResposta(false); }
  }

  function toggleComentarios() {
    if (!comentariosAbertos) carregarComentarios();
    setComentariosAbertos(v => !v);
  }

  function renderComentario(cm, nivel = 0, idRaiz = null) {
    const idCm = cm.id_comentario;
    const idPaiEnvio = nivel === 0 ? idCm : idRaiz;
    const nomeCm = cm.nome_usuario || '?';
    const fotoCm = cm.foto_usuario;
    const fotoSrc = fotoCm ? (fotoCm.startsWith('/midias/') ? `${BASE_URL}${fotoCm}` : fotoCm) : null;
    const respondendo = respondendoId === idCm;

    function handleResponder() {
      if (respondendoId === idCm) {
        setRespondendoId(null);
        setTextoResposta('');
      } else if (nivel === 0) {
        setRespondendoId(idCm);
        setTextoResposta('');
      } else {
        // Resposta de resposta: abre input no comentário raiz com @nome pré-preenchido
        setRespondendoId(idRaiz);
        setTextoResposta(`@${nomeCm} `);
      }
    }

    return (
      <div key={idCm} className={`bs-comentario-item${nivel > 0 ? ' bs-comentario-item--resposta' : ''}`}>
        <div className="bs-comentario-avatar">
          {fotoSrc ? <img src={fotoSrc} alt="" /> : <span>{nomeCm[0].toUpperCase()}</span>}
        </div>
        <div className="bs-comentario-corpo-wrap">
          <div className="bs-comentario-corpo">
            <span className="bs-comentario-nome">{nomeCm}</span>
            <p className="bs-comentario-texto">{cm.texto}</p>
          </div>
          <div className="bs-comentario-acoes">
            <button className="bs-responder-btn" onClick={handleResponder}>
              <i className="bi bi-reply" /> Responder
            </button>
            {Number(cm.id_usuario) === idUsuarioLogado && (
              <button className="bs-comentario-excluir" title="Excluir" onClick={() => excluirComentario(idCm)}>
                <i className="bi bi-trash3" />
              </button>
            )}
          </div>
          {respondendo && (
            <div className="bs-resposta-wrap">
              <div className="bs-comentario-input-row bs-resposta-input-row">
                <input
                  className="bs-comentario-input"
                  placeholder={`Respondendo a ${nomeCm}...`}
                  value={textoResposta}
                  onChange={e => setTextoResposta(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) enviarResposta(idPaiEnvio);
                    if (e.key === 'Escape') { setRespondendoId(null); setTextoResposta(''); }
                  }}
                  maxLength={500}
                  autoFocus
                  disabled={enviandoResposta}
                />
                <button className="bs-comentario-enviar" onClick={() => enviarResposta(idPaiEnvio)} disabled={enviandoResposta || !textoResposta.trim()}>
                  {enviandoResposta ? <span className="bs-mini-spinner" /> : <i className="bi bi-send-fill" />}
                </button>
              </div>
              <button className="bs-resposta-cancelar" onClick={() => { setRespondendoId(null); setTextoResposta(''); }}>
                <i className="bi bi-x" /> Cancelar
              </button>
            </div>
          )}
          {cm.respostas?.length > 0 && (
            <div className="bs-respostas">
              {cm.respostas.map(r => renderComentario(r, nivel + 1, idCm))}
            </div>
          )}
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (fotos.length <= 1 || pausado) return;
    // Não avança automaticamente se a mídia atual for vídeo
    if (isVideo(fotos[fotoAtiva])) return;
    const intervalo = setInterval(() => {
      setFotoAtiva((p) => (p === fotos.length - 1 ? 0 : p + 1));
    }, 4000);
    return () => clearInterval(intervalo);
  }, [fotos.length, pausado, fotoAtiva]);

  /* ── Kebab menu reutilizável ── */
  const kebabMenu = (variante) => (
    podeModerarOuDono && (onExcluir || onEditar) ? (
      <div className="bs-kebab-wrap" ref={menuRef}>
        <button
          type="button"
          className={`bs-btn-excluir${variante === 'hero' ? ' bs-btn-excluir--hero' : ''}`}
          onClick={() => setMenuAberto((v) => !v)}
          title="Opções"
        >
          {excluindo === idComunicado
            ? <span className="bs-mini-spinner" />
            : <i className="bi bi-three-dots-vertical" />
          }
        </button>
        {menuAberto && (
          <div className="bs-kebab-menu">
            {onEditar && (
              <button type="button" className="bs-kebab-item" onClick={() => { setMenuAberto(false); onEditar(c); }}>
                <i className="bi bi-pencil" /> Editar
              </button>
            )}
            {onExcluir && (
              <button type="button" className="bs-kebab-item bs-kebab-item--danger" onClick={() => { setMenuAberto(false); onExcluir(idComunicado); }}>
                <i className="bi bi-trash3" /> Excluir
              </button>
            )}
          </div>
        )}
      </div>
    ) : null
  );

  return (
    <article className={`bs-card ${temFotos ? 'bs-card--hero' : ''} ${temFotos && !ehVideoAtual && !conteudo ? 'bs-card--foto-pura' : ''}`} style={{ '--tipo-cor': t.cor }}>

      {/* ── Modo HERO: apenas quando a mídia ativa é imagem ── */}
      {temFotos && !ehVideoAtual && (
        <div className="bs-hero"
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
        >
          <img
            key={fotoAtiva}
            src={fotos[fotoAtiva]}
            alt={`foto-${fotoAtiva}`}
            className="bs-hero-img"
            onClick={() => { setLightboxIdx(fotoAtiva); setLightbox(true); }}
          />
          <button type="button" className="bs-lightbox-btn-maximize"
            onClick={() => { setLightboxIdx(fotoAtiva); setLightbox(true); }}
            title="Maximizar">
            <i className="bi bi-fullscreen" />
          </button>

          {/* Gradiente + overlay de info */}
          <div className="bs-hero-overlay" onClick={() => { setLightboxIdx(fotoAtiva); setLightbox(true); }}>
            <div className="bs-hero-topbar">
              <span className="bs-badge" style={{ color: '#fff', background: `${t.cor}cc` }}>
                <span className="bs-badge-dot" style={{ background: '#fff' }} />
                {t.label}
              </span>
            </div>

            {fotos.length > 1 && (
              <>
                <button type="button" className="bs-gnav bs-gnav--prev"
                  onClick={(e) => { e.stopPropagation(); setFotoAtiva((p) => (p === 0 ? fotos.length - 1 : p - 1)); }}>
                  <i className="bi bi-chevron-left" />
                </button>
                <button type="button" className="bs-gnav bs-gnav--next"
                  onClick={(e) => { e.stopPropagation(); setFotoAtiva((p) => (p === fotos.length - 1 ? 0 : p + 1)); }}>
                  <i className="bi bi-chevron-right" />
                </button>
              </>
            )}

            {fotos.length > 1 && (
              <div className="bs-hero-dots">
                {fotos.map((_, i) => (
                  <button key={i} type="button"
                    className={`bs-hero-dot ${i === fotoAtiva ? 'ativo' : ''}`}
                    style={i === fotoAtiva ? { background: t.cor } : {}}
                    onClick={() => setFotoAtiva(i)}
                  />
                ))}
              </div>
            )}

            <div className="bs-hero-footer">
              <h3 className="bs-hero-titulo">{titulo}</h3>
              <div className="bs-hero-meta">
                <div className="bs-autor-avatar bs-autor-avatar--sm">
                  {fotoAutor
                    ? <img src={fotoAutor} alt={nomeAutor} className="bs-autor-avatar-img" />
                    : <span>{inicialAvatar(nomeAutor)}</span>
                  }
                </div>
                <span className="bs-hero-autor">{nomeAutor}</span>
                <span className="bs-hero-sep">·</span>
                <span className="bs-hero-data">{formatarData(dataPublic)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Kebab hero: abaixo do botão maximizar, fora do .bs-hero ── */}
      {temFotos && !ehVideoAtual && (
        <div style={{ position: 'absolute', top: '54px', right: '12px', zIndex: 20 }} onClick={(e) => e.stopPropagation()}>
          {kebabMenu('hero')}
        </div>
      )}

      {/* ── Modo VÍDEO: player acima, info abaixo igual aos outros cards ── */}
      {ehVideoAtual && (
        <div className="bs-card-video-wrap">
          <video
            key={fotoAtiva}
            ref={videoRef}
            src={fotos[fotoAtiva]}
            poster={posterMap[fotoAtiva] || ''}
            className="bs-card-video-player"
            controls
            playsInline
            preload="metadata"
            onPlay={() => setPausado(true)}
            onPause={() => setPausado(false)}
            onEnded={() => {
              setPausado(false);
              if (fotos.length > 1) setFotoAtiva((p) => (p === fotos.length - 1 ? 0 : p + 1));
            }}
          />
          {/* Setas se houver mais mídias */}
          {fotos.length > 1 && (
            <>
              <button type="button" className="bs-gnav bs-gnav--prev"
                onClick={() => setFotoAtiva((p) => (p === 0 ? fotos.length - 1 : p - 1))}>
                <i className="bi bi-chevron-left" />
              </button>
              <button type="button" className="bs-gnav bs-gnav--next"
                onClick={() => setFotoAtiva((p) => (p === fotos.length - 1 ? 0 : p + 1))}>
                <i className="bi bi-chevron-right" />
              </button>
            </>
          )}
          {fotos.length > 1 && (
            <div className="bs-hero-dots bs-hero-dots--video">
              {fotos.map((_, i) => (
                <button key={i} type="button"
                  className={`bs-hero-dot ${i === fotoAtiva ? 'ativo' : ''}`}
                  style={i === fotoAtiva ? { background: t.cor } : {}}
                  onClick={() => setFotoAtiva(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Faixa colorida lateral (cards sem mídia) ── */}
      {!temFotos && <div className="bs-card-stripe" />}

      {/* ── Corpo do card ── */}
      <div className="bs-card-inner">

        {/* Header: badge + data + kebab (para sem-foto e para vídeo) */}
        {(!temFotos || ehVideoAtual) && (
          <div className="bs-card-top">
            <span className="bs-badge" style={{ color: t.cor, background: `${t.cor}18` }}>
              <span className="bs-badge-dot" style={{ background: t.cor }} />
              {t.label}
            </span>
            <div className="bs-card-top-right">
              <span className="bs-data">{formatarData(dataPublic)}</span>
              {kebabMenu('normal')}
            </div>
          </div>
        )}

        {/* Título */}
        {(!temFotos || ehVideoAtual) && <h3 className="bs-card-titulo">{titulo}</h3>}

        {/* Conteúdo texto */}
        {conteudo && <p className="bs-card-conteudo">{conteudo}</p>}

        {/* Bloco de enquete */}
        {tipo === 'ENQUETE' && (
          <div className="bs-enquete">
            {carregandoEnquete ? (
              <div className="bs-enquete-loading"><span className="bs-mini-spinner" /> Carregando enquete...</div>
            ) : erroEnquete ? (
              <div className="bs-enquete-loading" style={{ color: '#ef4444' }}>
                <i className="bi bi-exclamation-circle" /> {erroEnquete}
              </div>
            ) : !enquete ? (
              <div className="bs-enquete-loading" style={{ color: '#94a3b8' }}>
                <i className="bi bi-bar-chart" /> Enquete não disponível.
              </div>
            ) : (
              <>
                <p className="bs-enquete-pergunta">{enquete.pergunta}</p>
                <div className="bs-enquete-opcoes">
                  {enquete.opcoes.map(o => {
                    const pct = mostrarResultados && enquete.total_votos > 0 ? Math.round(o.votos / enquete.total_votos * 100) : 0;
                    return (
                      <button
                        key={o.id_opcao}
                        className={`bs-enquete-opcao${o.votei ? ' votada' : ''}`}
                        onClick={() => votar(enquete.id_enquete, o.id_opcao)}
                        disabled={votando}
                        style={{ '--tipo-cor': t.cor }}
                      >
                        <div className="bs-enquete-bar" style={{ width: mostrarResultados ? `${pct}%` : '0%' }} />
                        <span className="bs-enquete-texto">{o.texto}</span>
                        {mostrarResultados && <span className="bs-enquete-pct">{pct}%</span>}
                        {o.votei && <i className="bi bi-check-circle-fill bs-enquete-check" />}
                      </button>
                    );
                  })}
                </div>
                <p className="bs-enquete-total">
                  {enquete.multipla_escolha && <span className="bs-enquete-multi">múltipla escolha · </span>}
                  {mostrarResultados
                    ? <>{enquete.total_votos} {enquete.total_votos === 1 ? 'voto' : 'votos'}</>
                    : <span style={{ color: '#94a3b8' }}>Selecione uma opção para votar</span>
                  }
                </p>
              </>
            )}
          </div>
        )}

        {/* Rodapé autor (sem foto ou vídeo) */}
        {(!temFotos || ehVideoAtual) && (
          <div className="bs-card-footer">
            <div className="bs-autor-avatar">
              {fotoAutor
                ? <img src={fotoAutor} alt={nomeAutor} className="bs-autor-avatar-img" />
                : <span>{inicialAvatar(nomeAutor)}</span>
              }
            </div>
            <span className="bs-autor-nome">Publicado por <strong>{nomeAutor}</strong></span>
          </div>
        )}

        {/* ── Reações ── */}
        {(() => {
          const REACOES = [
            { key: 'like',     icon: 'bi-hand-thumbs-up-fill',   label: 'Curtir',    cor: '#6366f1' },
            { key: 'dislike',  icon: 'bi-hand-thumbs-down-fill', label: 'Não curtir', cor: '#64748b' },
            { key: 'love',     icon: 'bi-heart-fill',             label: 'Amei',      cor: '#ef4444' },
            { key: 'haha',     icon: 'bi-emoji-laughing-fill',    label: 'Haha',      cor: '#f59e0b' },
            { key: 'wow',      icon: 'bi-emoji-surprise-fill',    label: 'Uau',       cor: '#f97316' },
            { key: 'sad',      icon: 'bi-emoji-frown-fill',       label: 'Triste',    cor: '#3b82f6' },
            { key: 'angry',    icon: 'bi-emoji-angry-fill',       label: 'Grr',       cor: '#dc2626' },
          ];
          const minha = reacoes.minha_reacao;
          const total = reacoes.total || 0;
          return (
            <div className="bs-reacoes-wrap">
              <div
                className="bs-reacoes-bar"
                ref={reacaoBarRef}
                onScroll={e => {
                  const el = e.currentTarget;
                  setReacaoFimScroll(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
                }}
              >
              {REACOES.map(({ key, icon, label, cor }) => {
                const count = reacoes.contagens?.[key] || 0;
                const ativa = minha === key;
                return (
                  <button
                    key={key}
                    className={`bs-reacao-btn${ativa ? ' ativa' : ''}`}
                    onClick={() => reagir(key)}
                    title={label}
                    style={ativa ? { '--rc': cor } : {}}
                  >
                    <i className={`bi ${icon} bs-reacao-icon`} style={ativa ? { color: cor } : {}} />
                    <span className="bs-reacao-label">{label}</span>
                    {count > 0 && <span className="bs-reacao-count">{count}</span>}
                  </button>
                );
              })}
              </div>
              {!reacaoFimScroll && (
                <div className="bs-reacoes-seta" onClick={() => reacaoBarRef.current?.scrollBy({ left: 80, behavior: 'smooth' })}>
                  <i className="bi bi-chevron-right" />
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Comentários ── */}
        {permiteComentario && (
          <div className="bs-comentarios">
            <button className="bs-comentarios-toggle" onClick={toggleComentarios}>
              <i className="bi bi-chat-dots" />
              {comentariosAbertos ? 'Ocultar comentários' : `Comentários${totalComentarios > 0 ? ` (${totalComentarios})` : ''}`}
            </button>
            {comentariosAbertos && (
              <div className="bs-comentarios-lista">
                {comentarios.length === 0 && (
                  <p className="bs-comentarios-vazio">Nenhum comentário ainda. Seja o primeiro!</p>
                )}
                {comentarios.map(cm => renderComentario(cm))}
                <div className="bs-comentario-input-row">
                  <input
                    className="bs-comentario-input"
                    placeholder="Escreva um comentário..."
                    value={novoComentario}
                    onChange={e => setNovoComentario(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarComentario()}
                    maxLength={500}
                    disabled={enviandoComentario}
                  />
                  <button className="bs-comentario-enviar" onClick={enviarComentario} disabled={enviandoComentario || !novoComentario.trim()}>
                    {enviandoComentario ? <span className="bs-mini-spinner" /> : <i className="bi bi-send-fill" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {lightbox && createPortal(
        <div className="bs-lightbox-overlay" onClick={() => setLightbox(false)}>
          <div className="bs-lightbox-box" onClick={(e) => e.stopPropagation()}>
            <button className="bs-lightbox-fechar" onClick={() => setLightbox(false)} title="Fechar (Esc)">
              <i className="bi bi-x-lg" />
            </button>
            <img src={fotos[lightboxIdx]} alt="" className="bs-lightbox-img" />
            {fotos.length > 1 && (
              <>
                <button className="bs-lightbox-nav bs-lightbox-nav--prev"
                  onClick={() => setLightboxIdx(p => p === 0 ? fotos.length - 1 : p - 1)}>
                  <i className="bi bi-chevron-left" />
                </button>
                <button className="bs-lightbox-nav bs-lightbox-nav--next"
                  onClick={() => setLightboxIdx(p => p === fotos.length - 1 ? 0 : p + 1)}>
                  <i className="bi bi-chevron-right" />
                </button>
                <div className="bs-lightbox-contador">{lightboxIdx + 1} / {fotos.length}</div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </article>
  );
}

/* ─── Feed de visualização (usado na Home — somente leitura) ─── */
export default function Mural() {
  const idGrupoEmpresa = Number(localStorage.getItem('id_grupo_empresa'));
  const idUsuario      = Number(localStorage.getItem('id_usuario'));

  const [comunicados, setComunicados] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [destacadoId, setDestacadoId] = useState(null);
  const postRefs = useRef({});

  async function carregar(silencioso = false) {
    if (!silencioso) setLoading(true);
    try {
      const { data } = await api.post('/v1/comunicado/listar', {
        id_grupo_empresa: idGrupoEmpresa, id_usuario: idUsuario,
      });
      setComunicados(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    carregar();
    const iv = setInterval(() => carregar(true), 60000);
    return () => clearInterval(iv);
  }, []);

  // Scroll para o post indicado via query param ?post=ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const postId = Number(params.get('post'));
    if (!postId || loading) return;
    const tentarScroll = (tentativas = 0) => {
      const el = postRefs.current[postId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setDestacadoId(postId);
        setTimeout(() => setDestacadoId(null), 3000);
      } else if (tentativas < 10) {
        setTimeout(() => tentarScroll(tentativas + 1), 200);
      }
    };
    tentarScroll();
  }, [loading]);

  return (
    <div className="mural-container">
      <div className="mural-header">
        <div className="mural-header-left">
          <div>
            <h1 className="mural-titulo">Feed</h1>
            <p className="mural-subtitulo">Fique por dentro dos comunicados, eventos e novidades da empresa.</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="mural-estado">
          <div className="mural-spinner" />
          <span>Carregando comunicados...</span>
        </div>
      )}

      {!loading && comunicados.length === 0 && (
        <div className="mural-estado">
          <i className="bi bi-inbox mural-estado-icon" />
          <span>Nenhum comunicado publicado ainda.</span>
        </div>
      )}

      <div className="mural-feed">
        {comunicados.map((c) => {
          const id = c.id_comunicado || c.ID_COMUNICADO;
          return (
            <div
              key={id}
              ref={el => postRefs.current[id] = el}
              style={destacadoId === id ? {
                outline: '2px solid #6366f1',
                borderRadius: '12px',
                boxShadow: '0 0 0 4px rgba(99,102,241,0.15)',
              } : {}}
            >
              <ComunicadoCard c={c} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
