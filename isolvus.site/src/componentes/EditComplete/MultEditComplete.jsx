import { useEffect, useState, useRef } from "react";
import "./MultEditComplete.css";
import api from "../../servidor/api";

const endpoints = {
  fl: {
    url: "/v1/consultarFilial",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa") },
  },
  cl: {
    url: "/v1/consultarClientEditcomplet",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa") },
  },
  eq: {
    url: "/v1/consultarEquipeTreinamentoEditcomplet",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa") },
  },
  at: {
    url: "/v1/consultarAtividadePromotorEditcomplet",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa") },
  },
  cg: {
    url: "/v1/consultarContaGerencial",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa") },
  },
  cc: {
    url: "/v1/consultarCentroDeCusto",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa") },
  },
  fo: {
    url: "/v1/consultarFornecedor",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa") },
  },
  DP: {
    url: "/v1/consultarItem",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), tipo: "DP" },
  },
  AM: {
    url: "/v1/consultarItem",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), tipo: "AM" },
  },
  BD: {
    url: "/v1/consultarItem",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), tipo: "BD" },
  },
  MT: {
    url: "/v1/consultarItem",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa"), tipo: "MT" },
  },
  us: {
    url: "/v1/consultarUsuarioComplete",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa") },
  },
  se: {
    url: "/v1/consultarSetor",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa") },
  },
  mv: {
    url: "/v1/consultarMarcaVeiculoEditComplet",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa") },
  },
  md: {
    url: "/v1/consultarModeloVeiculoEditComplet",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa") },
  },
  gs: {
    url: "/v1/consultarCombustivelVeiculoEditComplet",
    body: { id_grupo_empresa: localStorage.getItem("id_grupo_empresa") },
  },
};

function MultEditComplete(props) {
  const [listaPesquisa, setListaPesquisa] = useState([]);
  const [texto, setTexto] = useState("");
  const [itensSelecionados, setItensSelecionados] = useState(props.value || []);
  const [showSelectedList, setShowSelectedList] = useState(false);

  const tagsContainerRef = useRef(null);
  const selectedListRef = useRef(null);
  const componentRef = useRef(null);

  const isMultiSelect = props.isMultiSelect !== false;

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const pTipo = props.id.substr(0, 2);

  function ConsultarDados(pvalue) {
    if (pvalue.length > 1) {
      const config = endpoints[pTipo];
      if (config) {
        api
          .post(config.url, { ...config.body, descricao: pvalue })
          .then((retorno) => {
            setListaPesquisa(retorno.data);
          })
          .catch(() => {
            setListaPesquisa([]);
          });
      } else {
        setListaPesquisa([]);
      }
    } else {
      setListaPesquisa([]);
    }
  }

  function Filtrar(e) {
    setTexto(e.target.value.toUpperCase());
    ConsultarDados(e.target.value.toUpperCase());
    setShowSelectedList(false);
  }

  function removerItem(codigo) {
    const novosItens = itensSelecionados.filter((item) => item.codigo !== codigo);
    setItensSelecionados(novosItens);
    if (props.onChange) {
      props.onChange(novosItens);
    }
    if (novosItens.length === 0) {
      setShowSelectedList(false);
    }
  }

  function SelecionarItem(item) {
    if (isMultiSelect) {
      const isSelecionado = itensSelecionados.some((i) => i.codigo === item.codigo);
      let novosItens;
      if (isSelecionado) {
        novosItens = itensSelecionados.filter((i) => i.codigo !== item.codigo);
      } else {
        novosItens = [...itensSelecionados, item];
      }
      setItensSelecionados(novosItens);
    } else {
      setItensSelecionados([item]);
      setListaPesquisa([]);
    }
    setTexto("");
    if (props.onChange) {
      if (isMultiSelect) {
        const isSelecionado = itensSelecionados.some((i) => i.codigo === item.codigo);
        let novosItens;
        if (isSelecionado) {
          novosItens = itensSelecionados.filter((i) => i.codigo !== item.codigo);
        } else {
          novosItens = [...itensSelecionados, item];
        }
        props.onChange(novosItens);
      } else {
        props.onChange([item]);
      }
    }
  }

  function limparItensSelecionados() {
    setItensSelecionados([]);
    if (props.onChange) {
      props.onChange([]);
    }
    setShowSelectedList(false);
  }

  useEffect(() => {
    if (tagsContainerRef.current && isMultiSelect) {
      tagsContainerRef.current.scrollLeft = tagsContainerRef.current.scrollWidth;
    }
  }, [itensSelecionados, isMultiSelect]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (componentRef.current && !componentRef.current.contains(e.target)) {
        setListaPesquisa([]);
        setShowSelectedList(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (props.value && JSON.stringify(props.value) !== JSON.stringify(itensSelecionados)) {
      setItensSelecionados(props.value);
    }
  }, [props.value, itensSelecionados]);

  const onMouseDown = (e) => {
    if (!isMultiSelect) return;
    setIsDragging(true);
    setStartX(e.pageX - tagsContainerRef.current.offsetLeft);
    setScrollLeft(tagsContainerRef.current.scrollLeft);
  };

  const onMouseLeaveOrUp = () => {
    if (!isMultiSelect) return;
    setIsDragging(false);
  };

  const onMouseMove = (e) => {
    if (!isDragging || !isMultiSelect) return;
    e.preventDefault();
    const x = e.pageX - tagsContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    tagsContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className="EditComplete" ref={componentRef}>
      <div
        className={`input-multiselecao form-control ${isMultiSelect ? "" : "single-select"}`}
        ref={tagsContainerRef}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeaveOrUp}
        onMouseUp={onMouseLeaveOrUp}
        onMouseMove={onMouseMove}
      >
        {isMultiSelect ? (
          <>
            {itensSelecionados.map((item) => (
              <div key={item.codigo} className="tag-selecionada" title={item.descricao}>
                <span>{item.codigo}</span>
                <button
                  className="btn-remover-tag"
                  onClick={() => removerItem(item.codigo)}
                  type="button"
                >
                  &times;
                </button>
              </div>
            ))}
            <input
              type="text"
              id={props.id}
              className="multiselect-input"
              autoFocus={props.autoFocus}
              placeholder={props.placeholder}
              disabled={props.disabled}
              onChange={Filtrar}
              value={texto}
            />
            {itensSelecionados.length > 0 && (
              <span
                className="filial-count"
                onClick={() => {
                  setShowSelectedList(!showSelectedList);
                  setListaPesquisa([]);
                }}
              >
                {itensSelecionados.length}
              </span>
            )}
          </>
        ) : (
          <input
            type="text"
            id={props.id}
            className="multiselect-input"
            autoFocus={props.autoFocus}
            placeholder={
              itensSelecionados.length > 0 ? itensSelecionados[0].descricao : props.placeholder
            }
            disabled={props.disabled}
            onChange={Filtrar}
            value={texto}
          />
        )}
      </div>

      {listaPesquisa.length > 0 && (
        <div className="EditComplete-items">
          <div className="container-lista">
            <ul className="p-1 m-0">
              {listaPesquisa.map((item) => (
                <li
                  key={item.codigo}
                  className={`item ${
                    itensSelecionados.some((i) => i.codigo === item.codigo) ? "selecionado" : ""
                  }`}
                  onClick={() => SelecionarItem(item)}
                >
                  <div>
                    <label>{item.descricao}</label>
                  </div>
                  <div>
                    <span>{item.descricao2}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {isMultiSelect && showSelectedList && (
        <div className="selected-branches-container" ref={selectedListRef}>
          <ul className="p-1 m-0">
            <li
              key="limpar-filtros"
              className="item limpar-filtros"
              onClick={(e) => {
                e.stopPropagation();
                limparItensSelecionados();
              }}
            >
              <span>Remover todos os filtros</span>
            </li>
            {itensSelecionados.map((item) => (
              <li
                key={item.codigo}
                onClick={(e) => {
                  e.stopPropagation();
                  removerItem(item.codigo);
                }}
              >
                <span>{item.descricao}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default MultEditComplete;