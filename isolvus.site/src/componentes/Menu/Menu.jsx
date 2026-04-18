import { useEffect, useRef, useState } from "react";
import * as XLSX from 'xlsx';
import "./Menu.css";
import Logo from "../../asset/sgs 33 2.png";
import ItemDoMenu from "../Menu/ItemDoMenu.jsx";
import api from "../../servidor/api.jsx";
import moment from "moment/moment.js";

function Menu() {

  const [ListaDeRotias, setListaDeRotias] = useState([]);
  const [notificacoes, setNotificacoes] = useState([]);
  const [filtroMenu, setFiltroMenu] = useState('');
  const [fotoUsuario, setFotoUsuario] = useState(() => localStorage.getItem('foto_usuario') || '');
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const [menuFotoAberto, setMenuFotoAberto] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const fotoInputRef = useRef(null);
  const fotoMenuRef = useRef(null);

  function handleFotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      setFotoUsuario(base64);
      localStorage.setItem('foto_usuario', base64);
      setSalvandoFoto(true);
      try {
        await api.post('/v1/usuario/salvarFoto', {
          id_usuario: Number(localStorage.getItem('id_usuario')),
          foto: base64
        });
      } catch (err) {
        console.log('Erro ao salvar foto:', err);
      } finally {
        setSalvandoFoto(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleRemoverFoto() {
    setFotoUsuario('');
    localStorage.removeItem('foto_usuario');
    try {
      await api.post('/v1/usuario/salvarFoto', {
        id_usuario: Number(localStorage.getItem('id_usuario')),
        foto: ''
      });
    } catch (err) {
      console.log('Erro ao remover foto:', err);
    }
  }



  function ListarRotias() {
    api.post('/v1/consultarPermissoes', {
      matricula: localStorage.getItem('id_usuario'),
      tipoaplicacao: 'W'
    })
    .then(res => setListaDeRotias(res.data || []))
    .catch(err => console.log(err));
  }

  function consultarNotificacoes() {
    api.post('/v1/notificacoes', {
      id_usuario: Number(localStorage.getItem('id_usuario'))
    })
    .then(res =>
      setNotificacoes(
        (res.data || []).map(n => ({ ...n, expandida: false }))
      )
    )
    .catch(err => console.log(err));
  }

  useEffect(() => {
    const interval = setInterval(() => {
      consultarNotificacoes(); // função que chama a API e atualiza o estado
    }, 10000); // a cada 10 segundos

    return () => clearInterval(interval); // limpa o interval ao desmontar o componente
  }, []);


  function marcarComoLida(index) {
    api.post('/v1/notificacoes/lido', {      
      id_usuario: Number(localStorage.getItem('id_usuario')),
      id_notificacao: index
    })
    .then(res =>
      setNotificacoes(
        (res.data || []).map(n => ({ ...n, expandida: false }))
      )
    )
    .catch(err => console.log(err));
  }

  function toggleExpandir(index) {
    setNotificacoes(prev =>
      prev.map((n, i) =>
        i === index ? { ...n, expandida: !n.expandida } : n
      )
    );
  }

  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida).length;

  function baixarAnexoXLSX(notificacao, e) {
    e.stopPropagation();
    try {
      const dados = JSON.parse(notificacao.dados_tabela);
      const worksheet = XLSX.utils.json_to_sheet(dados);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
      XLSX.writeFile(workbook, `${notificacao.titulo}.xlsx`);
    } catch {
      alert('Erro ao baixar o anexo.');
    }
  }

  useEffect(() => {
    ListarRotias();
    consultarNotificacoes();
    // Carrega foto do servidor (prevalece sobre localStorage)
    api.post('/v1/usuario/consultarFoto', { id_usuario: Number(localStorage.getItem('id_usuario')) })
      .then(res => {
        if (res.data?.foto) {
          setFotoUsuario(res.data.foto);
          localStorage.setItem('foto_usuario', res.data.foto);
        }
      })
      .catch(err => console.log('Erro ao carregar foto:', err));
  }, []);

  // Fecha popup de foto ao clicar fora
  useEffect(() => {
    function handleClickFora(e) {
      if (fotoMenuRef.current && !fotoMenuRef.current.contains(e.target)) {
        setMenuFotoAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  return (
    <nav id="navprincipal" className="navbar fixed-top">
      <div className="nav-inner">

        {/* MARCA — esquerda */}
        <a href="/Home" className="nav-brand">
          <img src={Logo} height="34" alt="Logo" />
          <div className="nav-brand-text">
            <span className="nav-brand-name">ISOLVUS</span>
            <span className="nav-brand-sub">ERP</span>
          </div>
        </a>

        {/* DIREITA — sino + perfil */}
        <div className="nav-right">

          {/* SINO */}
          <button
            className="nav-icon-btn"
            data-bs-toggle="offcanvas"
            data-bs-target="#offcanvasNotificacao"
            title="Notificações"
          >
            <i className="bi bi-bell"></i>
            {notificacoesNaoLidas > 0 && (
              <span className="badge-notificacao">{notificacoesNaoLidas}</span>
            )}
          </button>

          {/* PERFIL — desktop */}
          <button
            className="nav-user-btn"
            data-bs-toggle="offcanvas"
            data-bs-target="#offcanvasNavbar"
          >
            <div className="nav-user-avatar">
              {fotoUsuario
                ? <img src={fotoUsuario} alt="foto" className="nav-user-avatar-img" />
                : (localStorage.getItem('nome') || 'U').charAt(0).toUpperCase()
              }
            </div>
            <div className="nav-user-text d-none d-md-flex">
              <span className="nav-user-name">{localStorage.getItem('nome')}</span>
              <span className="nav-user-sector">{localStorage.getItem('setor')}</span>
            </div>
            <i className="bi bi-chevron-down nav-user-chevron d-none d-md-inline"></i>
          </button>

        </div>
      </div>

      {/* OFFCANVAS MÓDULOS */}
      <div className="offcanvas offcanvas-end" id="offcanvasNavbar">
        <div className="offcanvas-header offcanvas-header-user">
          <div className="offcanvas-user-profile">
            <div className="offcanvas-user-avatar-wrap" ref={fotoMenuRef}>
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFotoChange}
              />
              <div
                className="offcanvas-user-avatar"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setPopupPos({ top: rect.bottom + 8, left: rect.left });
                  setMenuFotoAberto(o => !o);
                }}
                title="Alterar foto"
              >
                {fotoUsuario
                  ? <img src={fotoUsuario} alt="foto" className="offcanvas-user-avatar-img" />
                  : (localStorage.getItem('nome') || 'U').charAt(0).toUpperCase()
                }
                <div className="offcanvas-avatar-edit-overlay">
                  {salvandoFoto
                    ? <span className="avatar-spinner"></span>
                    : <i className="bi bi-camera"></i>
                  }
                </div>
              </div>
              {menuFotoAberto && (
                <div className="avatar-popup-menu" style={{ top: popupPos.top, left: popupPos.left }}>
                  <button className="avatar-popup-item" onClick={() => { setMenuFotoAberto(false); fotoInputRef.current?.click(); }}>
                    <i className="bi bi-image me-2"></i>Escolher foto
                  </button>
                  {fotoUsuario && (
                    <button className="avatar-popup-item avatar-popup-item--danger" onClick={() => { setMenuFotoAberto(false); handleRemoverFoto(); }}>
                      <i className="bi bi-trash3 me-2"></i>Remover foto
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <div className="offcanvas-user-name">{localStorage.getItem('nome')}</div>
              <div className="offcanvas-user-id">
                {localStorage.getItem('id_usuario_erp')} · {localStorage.getItem('setor')}
              </div>
            </div>
          </div>
          <button className="btn-close" data-bs-dismiss="offcanvas"></button>
        </div>

        <div className="offcanvas-body">
          <div className="menu-filtro-wrap">
            <i className="bi bi-search menu-filtro-icon"></i>
            <input
              type="text"
              className="menu-filtro-input"
              placeholder="Buscar módulo ou rotina..."
              value={filtroMenu}
              onChange={(e) => setFiltroMenu(e.target.value)}
            />
            {filtroMenu && (
              <button className="menu-filtro-clear" onClick={() => setFiltroMenu('')}>
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
          <ul className="navbar-nav">
            {ListaDeRotias
              .map((Lmodulo) => ({
                ...Lmodulo,
                rotinas: Lmodulo.rotinas.filter((r) =>
                  !filtroMenu ||
                  r.rotina.toLowerCase().includes(filtroMenu.toLowerCase()) ||
                  Lmodulo.modulo.toLowerCase().includes(filtroMenu.toLowerCase())
                ),
              }))
              .filter((Lmodulo) => Lmodulo.rotinas.length > 0)
              .map((Lmodulo) => (
                <ItemDoMenu
                  key={Lmodulo.id_modulo}
                  modulo={Lmodulo.modulo}
                  rotinas={Lmodulo.rotinas}
                  defaultOpen={!!filtroMenu}
                />
              ))}
          </ul>
        </div>

        <div className="offcanvas-footer">
          <a href="/" className="btn-sair">
            <i className="bi bi-box-arrow-left me-2"></i>Sair do sistema
          </a>
        </div>
      </div>

      {/* OFFCANVAS NOTIFICAÇÕES */}
      <div className="offcanvas offcanvas-end" id="offcanvasNotificacao">
        <div className="offcanvas-header offcanvas-notif-header">
          <h5 className="offcanvas-title offcanvas-notif-title">
            <i className="bi bi-bell me-2"></i>Notificações
            {notificacoesNaoLidas > 0 && (
              <span className="offcanvas-notif-badge">{notificacoesNaoLidas}</span>
            )}
          </h5>
          <button className="btn-close" data-bs-dismiss="offcanvas"></button>
        </div>

        <div className="offcanvas-body offcanvas-notif-body">
          {notificacoes.length === 0 ? (
            <div className="notificacao-vazia">
              <i className="bi bi-bell-slash fs-3"></i>
              <p>Nenhuma notificação no momento</p>
            </div>
          ) : (
            notificacoes.map((n, i) => (
              <div
                key={i}
                className={`notificacao-card ${!n.lida ? 'nao-lida' : ''}`}
                onClick={() => marcarComoLida(n.id_notificacao)}
              >
                <div className="notificacao-header">
                  <div className="notificacao-remetente-wrap">
                    <div className="notificacao-avatar-wrap">
                      <div className="notificacao-avatar">
                        {n.foto_remetente
                          ? <img src={n.foto_remetente} alt={n.remetente} className="notificacao-avatar-img" />
                          : (n.remetente || 'U').charAt(0).toUpperCase()
                        }
                      </div>
                    </div>
                    <span className="notificacao-usuario">{n.id_remetente + ' - ' + n.remetente}</span>
                  </div>
                  <span className="notificacao-data">
                    {moment(n.data).format("DD/MM/YYYY HH:mm")}
                  </span>
                </div>

                <div className="notificacao-body">
                  <strong>{n.titulo}</strong>
                  <p className={n.expandida ? 'expandida' : ''}>{n.mensagem}</p>
                  {n.mensagem.length > 120 && (
                    <span
                      className="notificacao-vermais"
                      onClick={(e) => { e.stopPropagation(); toggleExpandir(i); }}
                    >
                      {n.expandida ? 'Ver menos' : 'Ver mais'}
                    </span>
                  )}
                  {n.tem_anexo === 1 && (
                    <button
                      className="btn btn-sm btn-outline-success mt-2 d-flex align-items-center gap-1"
                      onClick={(e) => baixarAnexoXLSX(n, e)}
                      title="Baixar planilha anexada"
                    >
                      <i className="bi bi-file-earmark-excel"></i> Baixar Planilha
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </nav>
  );
}

export default Menu;
