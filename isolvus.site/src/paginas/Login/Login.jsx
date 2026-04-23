import "./Login.css"
import Logo from "../../asset/SGS.png";

import { useState, useEffect } from "react";
import api from "../../servidor/api";
import { useNavigate } from "react-router-dom";
import packageJson from "../../../package.json";

const rotatingWords = ['transforma', 'automatiza', 'impulsiona', 'potencializa'];

function Login() {

  const [user, SetUser] = useState("");
  const [password, SetPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [erroCredencial, setErroCredencial] = useState(false);
  const navigate = useNavigate();

  // --- Palavra rotativa no título ---
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setWordIndex(i => (i + 1) % rotatingWords.length), 2500);
    return () => clearInterval(iv);
  }, []);

  // --- Relógio para versão desktop ---
  const [currentTime, setCurrentTime] = useState(() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
  });
  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setCurrentTime(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`);
    }, 60000);
    return () => clearInterval(t);
  }, []);

  function Acessar() {
    const Credenciais = { user, password };
    setErroCredencial(false);
    setLoading(true);

    api.post("/v1/logar", Credenciais)
      .then((retorno) => {
        setLoading(false);
        if (retorno.data.length > 0) {
          localStorage.setItem('id_usuario', retorno.data[0].id_usuario);
          localStorage.setItem('id_usuario_erp', retorno.data[0].id_usuario_erp);
          localStorage.setItem('id_grupo_empresa', retorno.data[0].id_grupo_empresa);
          localStorage.setItem('nome', retorno.data[0].nome);
          localStorage.setItem('usuario', retorno.data[0].usuario);
          localStorage.setItem('id_setor_erp', retorno.data[0].id_setor_erp);
          localStorage.setItem('setor', retorno.data[0].setor);
          localStorage.setItem('id_empresa', retorno.data[0].id_empresa);
          localStorage.setItem('razaosocial', retorno.data[0].razaosocial);
          navigate("/Home");
        } else {
          setErroCredencial(true);
          setShake(true);
          setTimeout(() => setShake(false), 600);
        }
      })
      .catch(() => {
        setLoading(false);
        setErroCredencial(true);
        setShake(true);
        setTimeout(() => setShake(false), 600);
      });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') Acessar();
  }

  function handleCapsLock(e) {
    if (e.getModifierState) setCapsLock(e.getModifierState('CapsLock'));
  }

  return (
    <>
      <div className="login-wrapper">

        {/* Painel esquerdo — identidade tecnológica */}
        <div className="login-panel-left d-none d-lg-flex">
          <div className="login-panel-left__grid" aria-hidden="true" />
          <div className="login-panel-left__content">
            <div className="login-panel-left__orb" aria-hidden="true" />
            <div className="login-panel-left__orb login-panel-left__orb--2" aria-hidden="true" />

            {/* Nome do sistema */}
            <div className="login-panel-left__brand">
              <span className="login-panel-left__brand-name">ISOLVUS</span>
              <span className="login-panel-left__brand-tag">ERP</span>
            </div>

            <h1 className="login-panel-left__title">
              Tecnologia que<br />
              <span key={wordIndex} className="login-panel-left__title--accent rotating-word">{rotatingWords[wordIndex]}</span> negócios.
            </h1>
            <p className="login-panel-left__sub">
              Gestão inteligente, decisões mais rápidas e resultados reais para sua empresa.
            </p>

            <ul className="login-panel-left__features">
              <li><span className="feature-icon bi bi-lightning-charge-fill"></span> Automação de processos</li>
              <li><span className="feature-icon bi bi-shield-lock-fill"></span> Segurança de dados</li>
              <li><span className="feature-icon bi bi-bar-chart-fill"></span> Análises em tempo real</li>
              <li><span className="feature-icon bi bi-arrow-repeat"></span> Sempre atualizado</li>
              <li><span className="feature-icon bi bi-cpu-fill"></span> Inteligência Artificial Aplicada</li>
              <li><span className="feature-icon bi bi-plug-fill"></span> Fácil integração com outros sistemas</li>
            </ul>
          </div>

          <footer className="login-panel-left__footer">
            <span className="login-panel-left__footer-slogan">"Tecnologia que resolve. Gestão que cresce."</span>
            <br />
            Versão {packageJson.version} &nbsp;·&nbsp; © {new Date().getFullYear()} ISOLVUS
          </footer>
        </div>

        {/* Painel direito — formulário */}
        <div className="login-panel-right">
          <div className="login-card">

            {/* Logo do cliente + nome do sistema */}
            <div className="login-card__brand mb-4">
              <img src={Logo} alt="Logo do cliente" className="login-card__brand-logo" />
              <div className="login-card__brand-divider" aria-hidden="true" />
              <div className="login-card__brand-info">
                <span className="login-card__brand-group">Grupo Serrana</span>
                <span className="login-card__brand-system">Sistema de Gestão</span>
                <span className="login-card__brand-sub"><i className="bi bi-stars me-1"></i>Tecnologia ISOLVUS</span>
              </div>
            </div>

            <p className="login-card__welcome">Bem-vindo</p>
            <h2 className="login-card__title">Entre na sua conta</h2>

            <div className="login-card__field mt-4">
              <label htmlFor="login-user" className="login-card__label">
                <i className="bi bi-person-fill me-2"></i>Usuário
              </label>
              <input
                id="login-user"
                className="login-card__input form-control"
                type="text"
                placeholder="Informe seu usuário"
                autoComplete="username"
                onChange={(e) => {
                  SetUser(e.target.value);
                  if (erroCredencial) setErroCredencial(false);
                }}
                onKeyDown={handleKeyDown}
              />
            </div>

            <div className="login-card__field mt-3">
              <label htmlFor="login-pass" className="login-card__label">
                <i className="bi bi-lock-fill me-2"></i>Senha
              </label>
              <div className="login-card__input-wrapper">
                <input
                  id="login-pass"
                  className="login-card__input form-control"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Informe sua senha"
                  autoComplete="current-password"
                  onChange={(e) => {
                    SetPassword(e.target.value);
                    if (erroCredencial) setErroCredencial(false);
                  }}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleCapsLock}
                />
                <button
                  type="button"
                  className="login-card__eye"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
              {capsLock && (
                <p className="login-card__capslock">
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>Caps Lock ativado
                </p>
              )}
            </div>

            <button
              className={`login-card__btn btn w-100 mt-4${shake ? ' login-card__btn--shake' : ''}${erroCredencial ? ' login-card__btn--error' : ''}`}
              type="button"
              onClick={Acessar}
              disabled={loading}
            >
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Autenticando...</>
                : erroCredencial
                  ? <><i className="bi bi-exclamation-triangle-fill me-2"></i>Credenciais incorretas. Tentar novamente</>
                  : <><i className="bi bi-box-arrow-in-right me-2"></i>Entrar</>
              }
            </button>

            <p className="login-card__version d-lg-none mt-4">
              Versão {packageJson.version} © {new Date().getFullYear()}
            </p>
            <p className="login-card__version d-none d-lg-block mt-4">
              v{packageJson.version} &nbsp;·&nbsp; {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} &nbsp;·&nbsp; {currentTime}
            </p>
          </div>
        </div>
      </div>

    </>
  );
}

export default Login;
