import { useEffect, useState } from "react";
import packageJson from "../../../package.json";

function VersionChecker() {
  const [novaVersaoDisponivel, setNovaVersaoDisponivel] = useState(false);

  useEffect(() => {
    const verificarVersao = async () => {
      try {
        const resposta = await fetch(`/meta.json?nocache=${Date.now()}`);
        const dados = await resposta.json();

        if (dados.version !== packageJson.version) {
          setNovaVersaoDisponivel(true);
        }
      } catch (erro) {
        console.error("Erro ao verificar nova versão:", erro);
      }
    };

    verificarVersao();
    const intervalo = setInterval(verificarVersao, 60000); // verifica a cada 1 min
    return () => clearInterval(intervalo);
  }, []);

  if (!novaVersaoDisponivel) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center bg-dark bg-opacity-75 text-white"
      style={{ zIndex: 9999 }}
    >
      {/* Ícone de atualização girando */}
      <div
        className="spinner-border text-light mb-4"
        style={{ width: "4rem", height: "4rem", cursor: "pointer" }}
        role="status"
        onClick={() => window.location.reload(true)}
      >
        <span className="visually-hidden">Atualizando...</span>
      </div>

      {/* Texto e botão */}
      <h4 className="mb-3 fw-bold">Nova versão disponível!</h4>
      <p className="mb-4 text-center">
        Clique no ícone ou no botão abaixo para atualizar o sistema.
      </p>
      <button
        className="btn btn-success fw-bold "
        onClick={() => window.location.reload(true)}
      >
        Atualizar agora
      </button>
    </div>
  );
}

export default VersionChecker;
