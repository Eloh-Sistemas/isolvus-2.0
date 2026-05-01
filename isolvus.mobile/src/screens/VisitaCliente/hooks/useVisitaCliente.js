import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import { useShowAlert } from "../../../components/CustomAlert/AlertProvider";
import * as ImagePicker from "expo-image-picker";
import api from "../../../services/api";
import {
  formatDateTime,
  formatarCgc,
  formatarTelefone,
  haversineDistanceKm,
  isValidLatLng,
  parseCoord,
  parseDateTimeBr,
  getRegionFromPoints,
  extrairCamposFormulario,
} from "../utils";

export function useVisitaCliente(user) {
  const showAlert = useShowAlert();
  const idGrupoEmpresa = Number(user?.id_grupo_empresa ?? 0);
  const idPromotor = Number(user?.id_usuario_erp ?? 0);

  const [step, setStep] = useState(1);

  const [clienteBusca, setClienteBusca] = useState("");
  const [clientesSugestoes, setClientesSugestoes] = useState([]);
  const [loadingClienteBusca, setLoadingClienteBusca] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState({});
  const [cgc, setCgc] = useState("");
  const [contato, setContato] = useState("");
  const [email, setEmail] = useState("");
  const [clienteSearchFocused, setClienteSearchFocused] = useState(false);

  const [historico, setHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const [dataCheckin, setDataCheckin] = useState(formatDateTime(new Date()));
  const [localizacaoPromotor, setLocalizacaoPromotor] = useState(null);
  const [enderecoPromotor, setEnderecoPromotor] = useState("");
  const [enderecoCliente, setEnderecoCliente] = useState("");
  const [distancia, setDistancia] = useState(null);
  const [gpsAguardando, setGpsAguardando] = useState(false);
  const [idJustificativa, setIdJustificativa] = useState(0);
  const [showJustificativaModal, setShowJustificativaModal] = useState(false);
  const [justificativas, setJustificativas] = useState([]);

  const [idVisita, setIdVisita] = useState(0);

  const [atividades, setAtividades] = useState([]);
  const [loadingAtividades, setLoadingAtividades] = useState(false);
  const [showAtividadeModal, setShowAtividadeModal] = useState(false);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState(null);

  const [codAtividade, setCodAtividade] = useState(0);
  const [nomeAtividade, setNomeAtividade] = useState("");
  const [codEquipe, setCodEquipe] = useState(0);
  const [nomeEquipe, setNomeEquipe] = useState("");
  const [qtdePessoa, setQtdePessoa] = useState("");
  const [fezQuiz, setFezQuiz] = useState("N");
  const [realizado, setRealizado] = useState("S");
  const [comentario, setComentario] = useState("");
  const [nomeVeterinario, setNomeVeterinario] = useState("");
  const [contatoVeterinario, setContatoVeterinario] = useState("");
  const [houveVenda, setHouveVenda] = useState("N");
  const [proximoIdEvidencia, setProximoIdEvidencia] = useState(0);

  const [camposFormulario, setCamposFormulario] = useState([]);
  const [atividadesCatalogo, setAtividadesCatalogo] = useState([]);
  const [equipesCatalogo, setEquipesCatalogo] = useState([]);

  const [itensAtividade, setItensAtividade] = useState([]);
  const [tipoItem, setTipoItem] = useState("AM");
  const [itemBusca, setItemBusca] = useState("");
  const [itemSugestoes, setItemSugestoes] = useState([]);
  const [codItem, setCodItem] = useState(0);
  const [qtItem, setQtItem] = useState("");

  const [fotosSelecionadas, setFotosSelecionadas] = useState([]);
  const [fotosSalvas, setFotosSalvas] = useState([]);
  const [salvandoEvidencia, setSalvandoEvidencia] = useState(false);

  const [dataCheckout, setDataCheckout] = useState(formatDateTime(new Date()));
  const [localizacaoCheckout, setLocalizacaoCheckout] = useState(null);
  const [atividadeRealizadaTexto, setAtividadeRealizadaTexto] = useState("");
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const checkinMapRef = useRef(null);
  const clienteDebounceRef = useRef(null);

  const camposAtivos = useMemo(() => extrairCamposFormulario(camposFormulario), [camposFormulario]);
  const evidenciaAtual = Number(atividadeSelecionada?.id_evidencia || proximoIdEvidencia || 0);
  const idRelacionalArquivo =
    idVisita && codAtividade && evidenciaAtual ? `${idVisita}${codAtividade}${evidenciaAtual}` : "";

  const tempoAtendimento = useMemo(() => {
    const ini = parseDateTimeBr(dataCheckin);
    const fim = parseDateTimeBr(dataCheckout);
    if (!ini || !fim) return "Calculando...";
    const total = Math.max(0, Math.floor((fim.getTime() - ini.getTime()) / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}h ${m}m ${s}s`;
  }, [dataCheckin, dataCheckout]);

  const promotorDescricao = `${user?.id_usuario_erp || "-"} - ${user?.nome || user?.usuario || "Promotor"}`;

  const clienteLat = parseCoord(clienteSelecionado?.latitude);
  const clienteLng = parseCoord(clienteSelecionado?.longitude);
  const clienteTemCoordenada = isValidLatLng(clienteLat, clienteLng);

  const pontosCheckin = useMemo(() => {
    const pontos = [];
    if (isValidLatLng(localizacaoPromotor?.lat, localizacaoPromotor?.lng)) {
      pontos.push({ latitude: localizacaoPromotor.lat, longitude: localizacaoPromotor.lng });
    }
    if (clienteTemCoordenada) {
      pontos.push({ latitude: clienteLat, longitude: clienteLng });
    }
    return pontos;
  }, [clienteLat, clienteLng, clienteTemCoordenada, localizacaoPromotor?.lat, localizacaoPromotor?.lng]);

  const regionCheckin = useMemo(
    () => getRegionFromPoints(pontosCheckin, { minDelta: 0.005, paddingFactor: 2.8 }),
    [pontosCheckin]
  );

  const pontoCheckout = useMemo(() => {
    if (!isValidLatLng(localizacaoCheckout?.lat, localizacaoCheckout?.lon)) return null;
    return { latitude: localizacaoCheckout.lat, longitude: localizacaoCheckout.lon };
  }, [localizacaoCheckout?.lat, localizacaoCheckout?.lon]);

  const regionCheckout = useMemo(
    () => getRegionFromPoints(pontoCheckout ? [pontoCheckout] : []),
    [pontoCheckout]
  );

  const limparTela = useCallback(() => {
    setStep(1);
    setClienteBusca("");
    setClientesSugestoes([]);
    setClienteSelecionado({});
    setCgc("");
    setContato("");
    setEmail("");
    setHistorico([]);
    setDataCheckin(formatDateTime(new Date()));
    setLocalizacaoPromotor(null);
    setEnderecoPromotor("");
    setEnderecoCliente("");
    setDistancia(null);
    setIdJustificativa(0);
    setIdVisita(0);
    setAtividades([]);
    setAtividadeSelecionada(null);
    setShowAtividadeModal(false);
    setDataCheckout(formatDateTime(new Date()));
    setLocalizacaoCheckout(null);
    setAtividadeRealizadaTexto("");
  }, []);

  const consultarClienteCompleto = useCallback(async (idCliente) => {
    if (!idCliente || !idGrupoEmpresa) return;
    try {
      const { data } = await api.post("/v1/consultarClienteID", {
        id_grupo_empresa: idGrupoEmpresa,
        idclientevenda: idCliente,
      });
      setClienteSelecionado(data || {});
      setCgc(formatarCgc(data?.cgc));
      setContato(formatarTelefone(data?.contato));
      setEmail(String(data?.email || ""));
      setClienteBusca(String(data?.cliente || data?.descricao || ""));
    } catch {
      showAlert({ type: "error", title: "Erro", message: "Nao foi possivel consultar os dados do cliente." });
    }
  }, [idGrupoEmpresa, showAlert]);

  const buscarClientes = useCallback((texto) => {
    setClienteBusca(texto);
    if (clienteDebounceRef.current) clearTimeout(clienteDebounceRef.current);
    if (String(texto || "").trim().length < 2 || !idGrupoEmpresa) {
      setClientesSugestoes([]);
      setLoadingClienteBusca(false);
      return;
    }
    setLoadingClienteBusca(true);
    clienteDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.post("/v1/consultarClientEditcomplet", {
          descricao: texto.toUpperCase(),
          id_grupo_empresa: idGrupoEmpresa,
        });
        setClientesSugestoes(Array.isArray(data) ? data : []);
      } catch {
        setClientesSugestoes([]);
      } finally {
        setLoadingClienteBusca(false);
      }
    }, 350);
  }, [idGrupoEmpresa]);

  const consultarHistorico = useCallback(async () => {
    if (!clienteSelecionado?.idclientevenda || !idPromotor || !idGrupoEmpresa) return;
    setLoadingHistorico(true);
    try {
      const { data } = await api.post("/v1/promotor/listarHistoricoDeVisita", {
        id_grupo_empresa: idGrupoEmpresa,
        id_cliente: clienteSelecionado.idclientevenda,
        idpromotor: idPromotor,
      });
      setHistorico(Array.isArray(data) ? data : []);
    } catch {
      setHistorico([]);
      showAlert({ type: "error", title: "Erro", message: "Nao foi possivel carregar o historico de visita." });
    } finally {
      setLoadingHistorico(false);
    }
  }, [clienteSelecionado?.idclientevenda, idGrupoEmpresa, idPromotor]);

  const carregarEndereco = useCallback(async (lat, lon, setter) => {
    try {
      const resposta = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      const item = resposta?.[0];
      if (!item) { setter("Endereco nao encontrado"); return; }
      const endereco = [item.street, item.district, item.city || item.subregion, item.region, item.postalCode]
        .filter(Boolean).join(", ");
      setter(endereco || "Endereco nao encontrado");
    } catch {
      setter("Nao foi possivel obter o endereco");
    }
  }, []);

  const atualizarDadosCheckin = useCallback(async () => {
    setGpsAguardando(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        showAlert({ type: "warning", title: "GPS", message: "Permissao de localizacao negada." });
        return;
      }

      // Força leitura direta do sensor — sem cache
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 0,          // não aceita posição em cache
        timeInterval: 0,        // força nova leitura imediata
      });

      const lat = pos?.coords?.latitude;
      const lng = pos?.coords?.longitude;
      const precisao = pos?.coords?.accuracy; // em metros

      if (!isValidLatLng(lat, lng)) {
        showAlert({ type: "error", title: "GPS", message: "Nao foi possivel obter coordenadas validas." });
        return;
      }

      // Rejeita localização simulada (Android mock location)
      if (pos?.mocked === true) {
        showAlert({ type: "error", title: "GPS Inválido", message: "Foi detectada uma localização simulada. Desative o Mock Location nas configurações do desenvolvedor e tente novamente." });
        return;
      }

      // Alerta se precisão for ruim (> 100m indica sinal fraco ou indoor)
      if (precisao != null && precisao > 100) {
        showAlert({ type: "warning", title: "Sinal GPS fraco", message: `A precisão atual é de ${Math.round(precisao)}m. Vá para um local com melhor sinal e tente novamente.` });
        return;
      }

      setDataCheckin(formatDateTime(new Date()));
      setLocalizacaoPromotor({ lat, lng, precisao: precisao ?? null });
      await carregarEndereco(lat, lng, setEnderecoPromotor);
      const cLat = parseCoord(clienteSelecionado?.latitude);
      const cLng = parseCoord(clienteSelecionado?.longitude);
      if (isValidLatLng(cLat, cLng)) {
        await carregarEndereco(cLat, cLng, setEnderecoCliente);
        const km = haversineDistanceKm([lat, lng], [cLat, cLng]);
        setDistancia(Number(km.toFixed(2)));
      } else {
        setEnderecoCliente("Cliente sem coordenadas validas");
        setDistancia(null);
      }
    } catch {
      showAlert({ type: "error", title: "GPS", message: "Erro ao capturar localizacao atual." });
    } finally {
      setGpsAguardando(false);
    }
  }, [carregarEndereco, clienteSelecionado?.latitude, clienteSelecionado?.longitude]);

  const consultarJustificativas = useCallback(async () => {
    if (!idGrupoEmpresa) return;
    try {
      const { data } = await api.post("/v1/promotor/listarjustificativa", { id_grupo_empresa: idGrupoEmpresa });
      setJustificativas(Array.isArray(data) ? data : []);
    } catch {
      setJustificativas([]);
      showAlert({ type: "error", title: "Erro", message: "Nao foi possivel carregar justificativas." });
    }
  }, [idGrupoEmpresa, showAlert]);

  const fazerCheckin = useCallback(async () => {
    if (!clienteSelecionado?.idclientevenda) { showAlert({ type: "warning", title: "Validação", message: "Informe o cliente." }); return; }
    if (!localizacaoPromotor?.lat || !localizacaoPromotor?.lng) {
      showAlert({ type: "warning", title: "Validação", message: "Localizacao do promotor nao disponivel." }); return;
    }
    if (Number(distancia) > 3 && !idJustificativa) {
      showAlert({ type: "warning", title: "Validação", message: "Selecione uma justificativa para distancia acima de 3km." }); return;
    }
    const distanciaNormalizada = Number.isFinite(Number(distancia))
      ? Number(distancia).toFixed(2)
      : "0.00";
    try {
      const { data } = await api.post("/v1/promotor/checkin", {
        idcliente: clienteSelecionado.idclientevenda,
        idpromotor: idPromotor,
        idgrupo_empresa: idGrupoEmpresa,
        dataCheckin,
        latitudepromotor: localizacaoPromotor.lat,
        longitudepromotor: localizacaoPromotor.lng,
        latitudecliente: clienteSelecionado.latitude,
        longitudecliente: clienteSelecionado.longitude,
        distancia: distanciaNormalizada,
        id_justificativadistancia: idJustificativa,
      });
      setIdVisita(Number(data?.idvisita || 0));
      showAlert({ type: "success", title: "Check-in realizado!", message: "Sua localização foi registrada com sucesso." });
      setStep(4);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.erro || err?.message || "Erro desconhecido";
      showAlert({ type: "error", title: "Erro no check-in", message: msg });
      console.error("[fazerCheckin]", err?.response?.data ?? err);
    }
  }, [clienteSelecionado, dataCheckin, distancia, idGrupoEmpresa, idJustificativa, idPromotor, localizacaoPromotor]);

  const consultarAtividades = useCallback(async () => {
    if (!idVisita) return;
    setLoadingAtividades(true);
    try {
      const { data } = await api.post("/v1/promotor/listaratividadespromotor", { id_visita: idVisita });
      setAtividades(Array.isArray(data) ? data : []);
    } catch {
      setAtividades([]);
      showAlert({ type: "error", title: "Erro", message: "Nao foi possivel consultar atividades da visita." });
    } finally {
      setLoadingAtividades(false);
    }
  }, [idVisita]);

  const consultarCatalogosAtividade = useCallback(async () => {
    try {
      const [resAtividades, resEquipes] = await Promise.all([
        api.post("/v1/getconsultarAtividadePromotorGeral", { id_grupo_empresa: idGrupoEmpresa }),
        api.post("/v1/consultarEquipeTreinamentoGeral", { id_grupo_empresa: idGrupoEmpresa }),
      ]);
      setAtividadesCatalogo(Array.isArray(resAtividades?.data) ? resAtividades.data : []);
      setEquipesCatalogo(Array.isArray(resEquipes?.data) ? resEquipes.data : []);
    } catch {
      setAtividadesCatalogo([]);
      setEquipesCatalogo([]);
    }
  }, [idGrupoEmpresa]);

  const consultarProximoIdEvidencia = useCallback(async () => {
    if (!idVisita) return;
    try {
      const { data } = await api.post("/v1/proximoIdEvidencia", { id_visita: idVisita });
      setProximoIdEvidencia(Number(data?.proximoid || 0));
    } catch {
      setProximoIdEvidencia(0);
    }
  }, [idVisita]);

  const consultarCampos = useCallback(async (atividadeId) => {
    if (!atividadeId) { setCamposFormulario([]); return; }
    try {
      const { data } = await api.post("/v1/camposformulario", { id_rotina: 3001, id_tela: atividadeId });
      setCamposFormulario(Array.isArray(data) ? data : []);
    } catch {
      setCamposFormulario([]);
    }
  }, []);

  const consultarArquivosEvidencia = useCallback(async () => {
    if (!idRelacionalArquivo) { setFotosSalvas([]); return; }
    try {
      const { data } = await api.get("/v1/listarArquivos", {
        params: { id_rotina: "3001.1", id_relacional: idRelacionalArquivo, id_grupo_empresa: idGrupoEmpresa },
      });
      const lista = (Array.isArray(data) ? data : [])
        .map((item) => ({ url: item?.[0], id_arquivo: item?.[1] }))
        .filter((x) => x.url);
      setFotosSalvas(lista);
    } catch {
      setFotosSalvas([]);
    }
  }, [idGrupoEmpresa, idRelacionalArquivo]);

  const consultarItens = useCallback(async () => {
    if (!idVisita || !codAtividade || !evidenciaAtual) { setItensAtividade([]); return; }
    try {
      const { data } = await api.post("/v1/consultarItemAtividade", {
        id_visita: idVisita, id_atividade: codAtividade, id_evidencia: evidenciaAtual,
      });
      setItensAtividade(Array.isArray(data) ? data : []);
    } catch {
      setItensAtividade([]);
    }
  }, [codAtividade, evidenciaAtual, idVisita]);

  const buscarItemSugestoes = useCallback(async (texto) => {
    setItemBusca(texto);
    if (String(texto || "").trim().length < 2) { setItemSugestoes([]); return; }
    try {
      const { data } = await api.post("/v1/consultarItem", {
        descricao: texto.toUpperCase(), id_grupo_empresa: idGrupoEmpresa, tipo: tipoItem,
      });
      setItemSugestoes(Array.isArray(data) ? data : []);
    } catch {
      setItemSugestoes([]);
    }
  }, [idGrupoEmpresa, tipoItem]);

  const adicionarItemAtividade = useCallback(async () => {
    if (!codItem || !qtItem || !codAtividade || !evidenciaAtual) {
      showAlert({ type: "warning", title: "Validação", message: "Informe item e quantidade." }); return;
    }
    try {
      await api.post("/v1/cadastrarItemAtividade", {
        id_evidencia: evidenciaAtual, id_visita: idVisita, id_atividade: codAtividade,
        id_item: codItem, qt: Number(String(qtItem).replace(",", ".")), tipoitem: tipoItem,
      });
      setItemBusca(""); setCodItem(0); setQtItem(""); setItemSugestoes([]);
      await consultarItens();
    } catch {
      showAlert({ type: "error", title: "Erro", message: "Nao foi possivel adicionar item." });
    }
  }, [codAtividade, codItem, consultarItens, evidenciaAtual, idVisita, qtItem, showAlert, tipoItem]);

  const removerItemAtividade = useCallback(async (registro) => {
    try {
      await api.post("/v1/excluirItemAtividade", { registro });
      await consultarItens();
    } catch {
      showAlert({ type: "error", title: "Erro", message: "Nao foi possivel remover item." });
    }
  }, [consultarItens, showAlert]);

  const escolherFotos = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showAlert({ type: "warning", title: "Permissão", message: "Permita acesso a galeria para anexar fotos." }); return; }
    const sel = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (sel.canceled) return;
    const novos = (sel.assets || []).map((a, idx) => ({
      uri: a.uri,
      name: a.fileName || `evidencia_${Date.now()}_${idx}.jpg`,
      type: a.mimeType || "image/jpeg",
    }));
    setFotosSelecionadas((prev) => [...prev, ...novos]);
  }, []);

  const enviarArquivos = useCallback(async (relacional) => {
    if (!relacional || fotosSelecionadas.length === 0) return;
    const fd = new FormData();
    for (const arquivo of fotosSelecionadas) { fd.append("files", arquivo); }
    fd.append("id_rotina", "3001.1");
    fd.append("id_relacional", relacional);
    fd.append("id_grupo_empresa", String(idGrupoEmpresa));
    await api.post("/v1/uploadArquivo", fd, { headers: { "Content-Type": "multipart/form-data" } });
    setFotosSelecionadas([]);
  }, [fotosSelecionadas, idGrupoEmpresa]);

  const excluirEvidencia = useCallback(async () => {
    if (!atividadeSelecionada?.id_evidencia || !codAtividade) return;
    showAlert({
      type: "warning",
      title: "Confirmar exclusão",
      message: "Deseja excluir esta evidência? Esta ação não pode ser desfeita.",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir", style: "destructive",
          onPress: async () => {
            try {
              await api.post("/v1/promotor/exluiratividadeevidencia", {
                id_visita: idVisita, id_atividade: codAtividade,
                id_evidencia: atividadeSelecionada.id_evidencia,
              });
              setShowAtividadeModal(false);
              await consultarAtividades();
            } catch {
              showAlert({ type: "error", title: "Erro", message: "Nao foi possivel excluir a evidencia." });
            }
          },
        },
      ],
    });
  }, [atividadeSelecionada?.id_evidencia, codAtividade, consultarAtividades, idVisita]);

  const salvarEvidencia = useCallback(async () => {
    if (!codAtividade) { showAlert({ type: "warning", title: "Validação", message: "Informe a atividade." }); return; }
    if (camposAtivos.cpveterinario && !String(nomeVeterinario || "").trim()) {
      showAlert({ type: "warning", title: "Validação", message: "Informe o nome do veterinario." }); return;
    }
    if (camposAtivos.cpequipe) {
      if (!codEquipe) { showAlert({ type: "warning", title: "Validação", message: "Informe a equipe." }); return; }
      if (!qtdePessoa) { showAlert({ type: "warning", title: "Validação", message: "Informe a quantidade de pessoas." }); return; }
    }
    if (camposAtivos.cpobservacao && !String(comentario || "").trim()) {
      showAlert({ type: "warning", title: "Validação", message: "Informe a observacao." }); return;
    }
    if (camposAtivos.cpfoto && fotosSelecionadas.length === 0 && fotosSalvas.length === 0) {
      showAlert({ type: "warning", title: "Validação", message: "Envio de foto obrigatorio para esta atividade." }); return;
    }
    const payload = {
      id_visita: idVisita, id_atividade: codAtividade,
      veterinario: nomeVeterinario, telefone: contatoVeterinario,
      houvevenda: houveVenda, realizado, comentario,
      id_equipe: codEquipe,
      qtpessoas: qtdePessoa ? Number(String(qtdePessoa).replace(",", ".")) : 0,
      fezquiz: fezQuiz, id_evidencia: atividadeSelecionada?.id_evidencia,
    };
    setSalvandoEvidencia(true);
    try {
      const endpoint = atividadeSelecionada?.id_evidencia
        ? "/v1/promotor/updateatividadeevidencia"
        : "/v1/promotor/atividadeevidencia";
      await api.post(endpoint, payload);
      const relacional = `${idVisita}${codAtividade}${evidenciaAtual}`;
      await enviarArquivos(relacional);
      await consultarAtividades();
      setShowAtividadeModal(false);
    } catch {
      showAlert({ type: "error", title: "Erro", message: "Nao foi possivel salvar evidencia." });
    } finally {
      setSalvandoEvidencia(false);
    }
  }, [
    atividadeSelecionada?.id_evidencia, camposAtivos, codAtividade, codEquipe,
    comentario, consultarAtividades, contatoVeterinario, enviarArquivos, evidenciaAtual,
    fezQuiz, fotosSalvas.length, fotosSelecionadas.length, houveVenda, idVisita,
    nomeVeterinario, qtdePessoa, realizado,
  ]);

  const abrirModalAtividade = useCallback(async (atividade) => {
    const atual = atividade || null;
    setAtividadeSelecionada(atual);
    if (atual) {
      setCodAtividade(Number(atual.id_atividade || 0));
      setNomeAtividade(String(atual.descricao || ""));
      setCodEquipe(Number(atual.id_equipe || 0));
      setNomeEquipe(String(atual.equipe || ""));
      setQtdePessoa(String(atual.qtpessoas || ""));
      setFezQuiz(String(atual.fezquiz || "N"));
      setRealizado("S");
      setComentario(String(atual.comentario || ""));
      setNomeVeterinario(String(atual.nomeveterinario || ""));
      setContatoVeterinario(String(atual.telefone || ""));
      setHouveVenda(String(atual.houvevenda || "N"));
      setProximoIdEvidencia(Number(atual.id_evidencia || 0));
    } else {
      setCodAtividade(0); setNomeAtividade(""); setCodEquipe(0); setNomeEquipe("");
      setQtdePessoa(""); setFezQuiz("N"); setRealizado("S"); setComentario("");
      setNomeVeterinario(""); setContatoVeterinario(""); setHouveVenda("N");
      setFotosSelecionadas([]);
      await consultarProximoIdEvidencia();
    }
    setShowAtividadeModal(true);
  }, [consultarProximoIdEvidencia]);

  const consultarCheckout = useCallback(async () => {
    if (!idVisita) return;
    setDataCheckout(formatDateTime(new Date()));
    setLoadingCheckout(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status === "granted") {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocalizacaoCheckout({ lat: pos?.coords?.latitude, lon: pos?.coords?.longitude });
      }
      const { data } = await api.post("/v1/promotor/checkoutpercentualrealizado", { idvisita: idVisita });
      setAtividadeRealizadaTexto(`${data?.qtrealizado ?? 0} Atividade`);
    } catch {
      setAtividadeRealizadaTexto("Nao disponivel");
    } finally {
      setLoadingCheckout(false);
    }
  }, [idVisita]);

  const fazerCheckout = useCallback(async () => {
    if (!idVisita) return;
    if (!localizacaoCheckout?.lat || !localizacaoCheckout?.lon) {
      showAlert({ type: "warning", title: "Validação", message: "Localizacao de checkout nao disponivel." }); return;
    }
    try {
      const { data } = await api.post("/v1/promotor/checkout", {
        idvisita: idVisita, dataCheckOut: dataCheckout,
        latidudeCheckOut: localizacaoCheckout.lat, longitudeCheckOut: localizacaoCheckout.lon,
      });
      showAlert({ type: "success", title: "Checkout realizado!", message: String(data?.mensagem || "Visita finalizada com sucesso."), buttons: [{ text: "OK", onPress: limparTela }] });
    } catch (err) {
      const msg = err?.response?.data?.error || "Nao foi possivel concluir checkout.";
      showAlert({ type: "error", title: "Erro no checkout", message: msg });
    }
  }, [dataCheckout, idVisita, limparTela, localizacaoCheckout]);

  const avancar = useCallback(() => {
    if (step === 1) {
      if (!clienteSelecionado?.idclientevenda) { showAlert({ type: "warning", title: "Validação", message: "Cliente nao informado." }); return; }
      setStep(2); return;
    }
    if (step === 2) { setStep(3); return; }
    if (step === 3) { fazerCheckin(); return; }
    if (step === 4) { setStep(5); }
  }, [clienteSelecionado?.idclientevenda, fazerCheckin, step]);

  const voltar = useCallback(() => {
    if (step === 3) { setIdJustificativa(0); setStep(2); return; }
    if (step === 4) { setStep(2); return; }
    if (step === 2) { limparTela(); return; }
    if (step > 1) setStep((v) => v - 1);
  }, [limparTela, step]);

  useEffect(() => {
    if (step === 2) consultarHistorico();
  }, [consultarHistorico, step]);

  useEffect(() => {
    if (step === 3) {
      atualizarDadosCheckin();
      if (idGrupoEmpresa) consultarJustificativas();
    }
  }, [atualizarDadosCheckin, consultarJustificativas, idGrupoEmpresa, step]);

  useEffect(() => {
    if (step === 4 && idVisita) consultarAtividades();
  }, [consultarAtividades, idVisita, step]);

  useEffect(() => {
    if (showAtividadeModal) consultarCatalogosAtividade();
  }, [consultarCatalogosAtividade, showAtividadeModal]);

  useEffect(() => {
    if (!showAtividadeModal) return;
    consultarCampos(codAtividade);
  }, [codAtividade, consultarCampos, showAtividadeModal]);

  useEffect(() => {
    if (!showAtividadeModal) return;
    consultarItens();
  }, [consultarItens, showAtividadeModal]);

  useEffect(() => {
    if (!showAtividadeModal) return;
    consultarArquivosEvidencia();
  }, [consultarArquivosEvidencia, showAtividadeModal]);

  useEffect(() => {
    if (step === 5) consultarCheckout();
  }, [consultarCheckout, step]);

  useEffect(() => {
    if (step !== 3 || !checkinMapRef.current || pontosCheckin.length === 0) return;
    if (regionCheckin) checkinMapRef.current.animateToRegion(regionCheckin, 350);
  }, [pontosCheckin.length, regionCheckin, step]);

  return {
    // navigation
    step, setStep, avancar, voltar,
    // client search
    clienteBusca, setClienteBusca,
    clientesSugestoes, setClientesSugestoes,
    loadingClienteBusca,
    clienteSelecionado, setClienteSelecionado,
    cgc, setCgc, contato, setContato, email, setEmail,
    clienteSearchFocused, setClienteSearchFocused,
    buscarClientes, consultarClienteCompleto,
    promotorDescricao,
    // historico
    historico, loadingHistorico,
    // checkin
    dataCheckin, localizacaoPromotor,
    enderecoPromotor, enderecoCliente,
    distancia, gpsAguardando,
    idJustificativa, setIdJustificativa,
    showJustificativaModal, setShowJustificativaModal,
    justificativas,
    clienteLat, clienteLng, clienteTemCoordenada,
    regionCheckin, checkinMapRef,
    atualizarDadosCheckin,
    // visita
    idVisita, setIdVisita, setDataCheckin,
    // atividades
    atividades, loadingAtividades,
    showAtividadeModal, setShowAtividadeModal,
    atividadeSelecionada,
    codAtividade, setCodAtividade,
    nomeAtividade, setNomeAtividade,
    codEquipe, setCodEquipe,
    nomeEquipe, setNomeEquipe,
    qtdePessoa, setQtdePessoa,
    fezQuiz, setFezQuiz,
    realizado,
    comentario, setComentario,
    nomeVeterinario, setNomeVeterinario,
    contatoVeterinario, setContatoVeterinario,
    houveVenda, setHouveVenda,
    atividadesCatalogo, equipesCatalogo,
    camposAtivos,
    itensAtividade,
    tipoItem, setTipoItem,
    itemBusca, itemSugestoes,
    codItem, setCodItem,
    qtItem, setQtItem,
    fotosSelecionadas, fotosSalvas,
    salvandoEvidencia,
    abrirModalAtividade,
    buscarItemSugestoes,
    adicionarItemAtividade,
    removerItemAtividade,
    escolherFotos,
    excluirEvidencia,
    salvarEvidencia,
    // checkout
    dataCheckout, localizacaoCheckout,
    atividadeRealizadaTexto, loadingCheckout,
    tempoAtendimento,
    pontoCheckout, regionCheckout,
    fazerCheckout,
  };
}
