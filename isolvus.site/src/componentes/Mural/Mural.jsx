import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../servidor/api.jsx';
import './Mural.css';

export const TIPOS = [
  { value: 'AVISO', label: 'Aviso', cor: '#f59e0b' },
  { value: 'EVENTO', label: 'Evento', cor: '#6366f1' },
  { value: 'NOVIDADE', label: 'Novidade', cor: '#10b981' },
  { value: 'URGENTE', label: 'Urgente', cor: '#ef4444' },
];

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
export function ComunicadoCard({ c, onExcluir, excluindo, podeModerarOuDono, onEditar }) {
  const idComunicadoAtual = c.id_comunicado || c.ID_COMUNICADO;

  const [fotoAtiva, setFotoAtiva] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [posterMap, setPosterMap] = useState({});
  const [lightbox, setLightbox] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

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

  const titulo       = c.titulo       || c.TITULO       || '';
  const conteudo     = c.conteudo     || c.CONTEUDO     || '';
  const tipo         = c.tipo         || c.TIPO         || 'AVISO';
  const nomeAutor    = c.nome_autor   || c.NOME_AUTOR   || '';
  const fotoAutor    = c.foto_autor   || c.FOTO_AUTOR   || '';
  const dataPublic   = c.data_publicacao || c.DATA_PUBLICACAO || '';
  const idComunicado = c.id_comunicado  || c.ID_COMUNICADO;
  const fotosRaw     = c.fotos        || c.FOTOS        || null;
  const fotos        = parseFotos(fotosRaw);

  const t = TIPOS.find((x) => x.value === tipo) || TIPOS[0];
  const temFotos = fotos.length > 0;
  const ehVideoAtual = temFotos && isVideo(fotos[fotoAtiva]);

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
    <article className={`bs-card ${temFotos ? 'bs-card--hero' : ''}`} style={{ '--tipo-cor': t.cor }}>

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
              {kebabMenu('hero')}
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
        {comunicados.map((c) => (
          <ComunicadoCard key={c.id_comunicado || c.ID_COMUNICADO} c={c} />
        ))}
      </div>
    </div>
  );
}
