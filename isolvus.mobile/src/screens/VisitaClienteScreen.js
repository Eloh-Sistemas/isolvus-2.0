import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../services/api";
import { colors } from "../theme/colors";

const STEP_LABELS = ["Cliente", "Historico", "Check-In", "Atividades", "Check-Out"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDateTime(date) {
  if (!(date instanceof Date)) return "";
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function parseDateTimeBr(valor) {
  const txt = String(valor || "").trim();
  const m = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min, ss] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss));
}

function formatarTelefone(telefone) {
  let t = String(telefone || "").replace(/\D/g, "");
  if (t.length === 11) return t.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (t.length === 10) return t.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return t;
}

function formatarCgc(cgc) {
  let x = String(cgc || "").replace(/\D/g, "");
  if (x.length === 11) return x.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (x.length === 14) return x.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return x;
}

function parseCoord(valor) {
  const txt = String(valor ?? "").replace(",", ".").trim();
  const n = Number(txt);
  return Number.isFinite(n) ? n : null;
}

function isValidLatLng(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function haversineDistanceKm(coords1, coords2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const [lat1, lon1] = coords1;
  const [lat2, lon2] = coords2;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getRegionFromPoints(points, options = {}) {
  const minDelta = Number(options.minDelta) > 0? Number(options.minDelta) : 0.1;
  const paddingFactor = Number(options.paddingFactor) > 0 ? Number(options.paddingFactor) : 1.8;

  if (!Array.isArray(points) || points.length === 0) return null;

  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: minDelta,
      longitudeDelta: minDelta,
    };
  }

  const latitudes = points.map((p) => p.latitude);
  const longitudes = points.map((p) => p.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const latitudeDelta = Math.max((maxLat - minLat) * paddingFactor, minDelta);
  const longitudeDelta = Math.max((maxLng - minLng) * paddingFactor, minDelta);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}

function extrairCamposFormulario(campos) {
  const ativo = new Set((Array.isArray(campos) ? campos : [])
    .filter((c) => String(c?.ativo || "N").toUpperCase() === "S")
    .map((c) => Number(c.id_campo)));

  return {
    cpveterinario: ativo.has(3),
    cpitem: ativo.has(5),
    cpobservacao: ativo.has(6),
    cpvenda: ativo.has(7),
    cpfoto: ativo.has(8),
    cpequipe: ativo.has(9),
  };
}

function highlightText(text, query) {
  if (!query || !text) return [{ text: String(text || ""), bold: false }];
  const lower = String(text).toLowerCase();
  const q = String(query).toLowerCase().trim();
  const idx = lower.indexOf(q);
  if (!q || idx === -1) return [{ text: String(text), bold: false }];
  return [
    { text: String(text).slice(0, idx), bold: false },
    { text: String(text).slice(idx, idx + q.length), bold: true },
    { text: String(text).slice(idx + q.length), bold: false },
  ];
}

export default function VisitaClienteScreen({ user }) {
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
  const [responsavel, setResponsavel] = useState("");

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

  const [clienteSearchFocused, setClienteSearchFocused] = useState(false);

  const camposAtivos = useMemo(() => extrairCamposFormulario(camposFormulario), [camposFormulario]);
  const evidenciaAtual = Number(atividadeSelecionada?.id_evidencia || proximoIdEvidencia || 0);
  const idRelacionalArquivo = idVisita && codAtividade && evidenciaAtual
    ? `${idVisita}${codAtividade}${evidenciaAtual}`
    : "";

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
      pontos.push({
        latitude: localizacaoPromotor.lat,
        longitude: localizacaoPromotor.lng,
      });
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
    return {
      latitude: localizacaoCheckout.lat,
      longitude: localizacaoCheckout.lon,
    };
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
    setResponsavel("");
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
      Alert.alert("Erro", "Nao foi possivel consultar os dados do cliente.");
    }
  }, [idGrupoEmpresa]);

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
      Alert.alert("Erro", "Nao foi possivel carregar o historico de visita.");
    } finally {
      setLoadingHistorico(false);
    }
  }, [clienteSelecionado?.idclientevenda, idGrupoEmpresa, idPromotor]);

  const carregarEndereco = useCallback(async (lat, lon, setter) => {
    try {
      const resposta = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      const item = resposta?.[0];
      if (!item) {
        setter("Endereco nao encontrado");
        return;
      }
      const endereco = [item.street, item.district, item.city || item.subregion, item.region, item.postalCode]
        .filter(Boolean)
        .join(", ");
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
        Alert.alert("GPS", "Permissao de localizacao negada.");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const lat = pos?.coords?.latitude;
      const lng = pos?.coords?.longitude;
      if (!isValidLatLng(lat, lng)) {
        Alert.alert("GPS", "Nao foi possivel obter coordenadas validas.");
        return;
      }

      setDataCheckin(formatDateTime(new Date()));
      setLocalizacaoPromotor({ lat, lng });
      await carregarEndereco(lat, lng, setEnderecoPromotor);

      const clienteLat = parseCoord(clienteSelecionado?.latitude);
      const clienteLng = parseCoord(clienteSelecionado?.longitude);
      if (isValidLatLng(clienteLat, clienteLng)) {
        await carregarEndereco(clienteLat, clienteLng, setEnderecoCliente);
        const km = haversineDistanceKm([lat, lng], [clienteLat, clienteLng]);
        setDistancia(Number(km.toFixed(2)));
      } else {
        setEnderecoCliente("Cliente sem coordenadas validas");
        setDistancia(null);
      }
    } catch {
      Alert.alert("GPS", "Erro ao capturar localizacao atual.");
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
      Alert.alert("Erro", "Nao foi possivel carregar justificativas.");
    }
  }, [idGrupoEmpresa]);

  const fazerCheckin = useCallback(async () => {
    if (!clienteSelecionado?.idclientevenda) {
      Alert.alert("Validacao", "Informe o cliente.");
      return;
    }
    if (!responsavel.trim()) {
      Alert.alert("Validacao", "Informe o responsavel no atendimento.");
      return;
    }
    if (!localizacaoPromotor?.lat || !localizacaoPromotor?.lng) {
      Alert.alert("Validacao", "Localizacao do promotor nao disponivel.");
      return;
    }
    if (Number(distancia) > 3 && !idJustificativa) {
      Alert.alert("Validacao", "Selecione uma justificativa para distancia acima de 3km.");
      return;
    }

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
        distancia,
        responsavel,
        id_justificativadistancia: idJustificativa,
      });

      setIdVisita(Number(data?.idvisita || 0));
      Alert.alert("Sucesso", "Check-in realizado com sucesso.");
      setStep(4);
    } catch {
      Alert.alert("Erro", "Nao foi possivel realizar check-in.");
    }
  }, [
    clienteSelecionado,
    dataCheckin,
    distancia,
    idGrupoEmpresa,
    idJustificativa,
    idPromotor,
    localizacaoPromotor,
    responsavel,
  ]);

  const consultarAtividades = useCallback(async () => {
    if (!idVisita) return;
    setLoadingAtividades(true);
    try {
      const { data } = await api.post("/v1/promotor/listaratividadespromotor", { id_visita: idVisita });
      setAtividades(Array.isArray(data) ? data : []);
    } catch {
      setAtividades([]);
      Alert.alert("Erro", "Nao foi possivel consultar atividades da visita.");
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
    if (!atividadeId) {
      setCamposFormulario([]);
      return;
    }
    try {
      const { data } = await api.post("/v1/camposformulario", {
        id_rotina: 3001,
        id_tela: atividadeId,
      });
      setCamposFormulario(Array.isArray(data) ? data : []);
    } catch {
      setCamposFormulario([]);
    }
  }, []);

  const consultarArquivosEvidencia = useCallback(async () => {
    if (!idRelacionalArquivo) {
      setFotosSalvas([]);
      return;
    }

    try {
      const { data } = await api.get("/v1/listarArquivos", {
        params: {
          id_rotina: "3001.1",
          id_relacional: idRelacionalArquivo,
          id_grupo_empresa: idGrupoEmpresa,
        },
      });

      const lista = (Array.isArray(data) ? data : []).map((item) => ({
        url: item?.[0],
        id_arquivo: item?.[1],
      })).filter((x) => x.url);

      setFotosSalvas(lista);
    } catch {
      setFotosSalvas([]);
    }
  }, [idGrupoEmpresa, idRelacionalArquivo]);

  const consultarItens = useCallback(async () => {
    if (!idVisita || !codAtividade || !evidenciaAtual) {
      setItensAtividade([]);
      return;
    }

    try {
      const { data } = await api.post("/v1/consultarItemAtividade", {
        id_visita: idVisita,
        id_atividade: codAtividade,
        id_evidencia: evidenciaAtual,
      });
      setItensAtividade(Array.isArray(data) ? data : []);
    } catch {
      setItensAtividade([]);
    }
  }, [codAtividade, evidenciaAtual, idVisita]);

  const buscarItemSugestoes = useCallback(async (texto) => {
    setItemBusca(texto);
    if (String(texto || "").trim().length < 2) {
      setItemSugestoes([]);
      return;
    }

    try {
      const { data } = await api.post("/v1/consultarItem", {
        descricao: texto.toUpperCase(),
        id_grupo_empresa: idGrupoEmpresa,
        tipo: tipoItem,
      });
      setItemSugestoes(Array.isArray(data) ? data : []);
    } catch {
      setItemSugestoes([]);
    }
  }, [idGrupoEmpresa, tipoItem]);

  const adicionarItemAtividade = useCallback(async () => {
    if (!codItem || !qtItem || !codAtividade || !evidenciaAtual) {
      Alert.alert("Validacao", "Informe item e quantidade.");
      return;
    }

    try {
      await api.post("/v1/cadastrarItemAtividade", {
        id_evidencia: evidenciaAtual,
        id_visita: idVisita,
        id_atividade: codAtividade,
        id_item: codItem,
        qt: Number(String(qtItem).replace(",", ".")),
        tipoitem: tipoItem,
      });

      setItemBusca("");
      setCodItem(0);
      setQtItem("");
      setItemSugestoes([]);
      await consultarItens();
    } catch {
      Alert.alert("Erro", "Nao foi possivel adicionar item.");
    }
  }, [codAtividade, codItem, consultarItens, evidenciaAtual, idVisita, qtItem, tipoItem]);

  const removerItemAtividade = useCallback(async (registro) => {
    try {
      await api.post("/v1/excluirItemAtividade", { registro });
      await consultarItens();
    } catch {
      Alert.alert("Erro", "Nao foi possivel remover item.");
    }
  }, [consultarItens]);

  const escolherFotos = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permissao", "Permita acesso a galeria para anexar fotos.");
      return;
    }

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
    for (const arquivo of fotosSelecionadas) {
      fd.append("files", arquivo);
    }
    fd.append("id_rotina", "3001.1");
    fd.append("id_relacional", relacional);
    fd.append("id_grupo_empresa", String(idGrupoEmpresa));

    await api.post("/v1/uploadArquivo", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    setFotosSelecionadas([]);
  }, [fotosSelecionadas, idGrupoEmpresa]);

  const excluirEvidencia = useCallback(async () => {
    if (!atividadeSelecionada?.id_evidencia || !codAtividade) return;

    Alert.alert("Confirmacao", "Deseja excluir esta evidencia?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post("/v1/promotor/exluiratividadeevidencia", {
              id_visita: idVisita,
              id_atividade: codAtividade,
              id_evidencia: atividadeSelecionada.id_evidencia,
            });
            setShowAtividadeModal(false);
            await consultarAtividades();
          } catch {
            Alert.alert("Erro", "Nao foi possivel excluir a evidencia.");
          }
        },
      },
    ]);
  }, [atividadeSelecionada?.id_evidencia, codAtividade, consultarAtividades, idVisita]);

  const salvarEvidencia = useCallback(async () => {
    if (!codAtividade) {
      Alert.alert("Validacao", "Informe a atividade.");
      return;
    }
    if (camposAtivos.cpveterinario && !String(nomeVeterinario || "").trim()) {
      Alert.alert("Validacao", "Informe o nome do veterinario.");
      return;
    }
    if (camposAtivos.cpequipe) {
      if (!codEquipe) {
        Alert.alert("Validacao", "Informe a equipe.");
        return;
      }
      if (!qtdePessoa) {
        Alert.alert("Validacao", "Informe a quantidade de pessoas.");
        return;
      }
    }
    if (camposAtivos.cpobservacao && !String(comentario || "").trim()) {
      Alert.alert("Validacao", "Informe a observacao.");
      return;
    }
    if (camposAtivos.cpfoto && fotosSelecionadas.length === 0 && fotosSalvas.length === 0) {
      Alert.alert("Validacao", "Envio de foto obrigatorio para esta atividade.");
      return;
    }

    const payload = {
      id_visita: idVisita,
      id_atividade: codAtividade,
      veterinario: nomeVeterinario,
      telefone: contatoVeterinario,
      houvevenda: houveVenda,
      realizado,
      comentario,
      id_equipe: codEquipe,
      qtpessoas: qtdePessoa ? Number(String(qtdePessoa).replace(",", ".")) : 0,
      fezquiz: fezQuiz,
      id_evidencia: atividadeSelecionada?.id_evidencia,
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
      Alert.alert("Erro", "Nao foi possivel salvar evidencia.");
    } finally {
      setSalvandoEvidencia(false);
    }
  }, [
    atividadeSelecionada?.id_evidencia,
    camposAtivos.cpequipe,
    camposAtivos.cpfoto,
    camposAtivos.cpobservacao,
    camposAtivos.cpveterinario,
    codAtividade,
    codEquipe,
    comentario,
    consultarAtividades,
    contatoVeterinario,
    enviarArquivos,
    evidenciaAtual,
    fezQuiz,
    fotosSalvas.length,
    fotosSelecionadas.length,
    houveVenda,
    idVisita,
    nomeVeterinario,
    qtdePessoa,
    realizado,
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
      setCodAtividade(0);
      setNomeAtividade("");
      setCodEquipe(0);
      setNomeEquipe("");
      setQtdePessoa("");
      setFezQuiz("N");
      setRealizado("S");
      setComentario("");
      setNomeVeterinario("");
      setContatoVeterinario("");
      setHouveVenda("N");
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
      Alert.alert("Validacao", "Localizacao de checkout nao disponivel.");
      return;
    }

    try {
      const { data } = await api.post("/v1/promotor/checkout", {
        idvisita: idVisita,
        dataCheckOut: dataCheckout,
        latidudeCheckOut: localizacaoCheckout.lat,
        longitudeCheckOut: localizacaoCheckout.lon,
      });

      Alert.alert("Sucesso", String(data?.mensagem || "Checkout realizado com sucesso."), [
        { text: "OK", onPress: limparTela },
      ]);
    } catch (err) {
      const msg = err?.response?.data?.error || "Nao foi possivel concluir checkout.";
      Alert.alert("Erro", msg);
    }
  }, [dataCheckout, idVisita, limparTela, localizacaoCheckout]);

  const avancar = useCallback(() => {
    if (step === 1) {
      if (!clienteSelecionado?.idclientevenda) {
        Alert.alert("Validacao", "Cliente nao informado.");
        return;
      }
      if (!responsavel.trim()) {
        Alert.alert("Validacao", "Responsavel nao informado.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    if (step === 3) {
      fazerCheckin();
      return;
    }

    if (step === 4) {
      setStep(5);
    }
  }, [clienteSelecionado?.idclientevenda, fazerCheckin, responsavel, step]);

  const voltar = useCallback(() => {
    if (step === 3) {
      setIdJustificativa(0);
      setStep(2);
      return;
    }
    if (step === 4) {
      setStep(2);
      return;
    }
    if (step === 2) {
      limparTela();
      return;
    }
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

    if (regionCheckin) {
      checkinMapRef.current.animateToRegion(regionCheckin, 350);
    }
  }, [pontosCheckin.length, regionCheckin, step]);

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorWrap}>
      <View style={styles.stepConnectorTrack} />
      {STEP_LABELS.map((label, idx) => {
        const num = idx + 1;
        const active = step === num;
        const done = step > num;
        return (
          <View key={num} style={styles.stepItem}>
            <View style={[styles.stepCircle, active && styles.stepCircleActive, done && styles.stepCircleDone]}>
              {done
                ? <Ionicons name="checkmark" size={13} color="#fff" />
                : <Text style={[styles.stepCircleText, active && styles.stepCircleTextActive]}>{num}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]} numberOfLines={1}>{label}</Text>
          </View>
        );
      })}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Dados do cliente</Text>

      <Text style={styles.label}>Cliente *</Text>
      <View style={[styles.inputSearchWrap, clienteSearchFocused && styles.inputSearchFocused]}>
        <Ionicons name="search" size={16} color={clienteSearchFocused ? colors.accent : "#94a3b8"} style={{ marginRight: 8 }} />
        <TextInput
          value={clienteBusca}
          onChangeText={buscarClientes}
          onFocus={() => setClienteSearchFocused(true)}
          onBlur={() => setClienteSearchFocused(false)}
          placeholder="Buscar cliente..."
          placeholderTextColor="#94a3b8"
          style={styles.inputSearchField}
          autoCapitalize="characters"
          returnKeyType="search"
        />
        {loadingClienteBusca && (
          <ActivityIndicator size="small" color={colors.accent} style={{ marginLeft: 4 }} />
        )}
        {!!clienteBusca && !loadingClienteBusca && (
          <Pressable
            onPress={() => { setClienteBusca(""); setClientesSugestoes([]); setClienteSelecionado({}); setCgc(""); setContato(""); setEmail(""); }}
            hitSlop={10}
          >
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </Pressable>
        )}
      </View>

      {(clientesSugestoes.length > 0 || (clienteSearchFocused && clienteBusca.length >= 2 && !loadingClienteBusca && clientesSugestoes.length === 0)) && (
        <View style={styles.searchDropdown}>
          {clientesSugestoes.length === 0 ? (
            <View style={styles.searchEmptyState}>
              <Ionicons name="person-outline" size={24} color="#cbd5e1" />
              <Text style={styles.searchEmptyText}>Nenhum cliente encontrado</Text>
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 240 }}
              showsVerticalScrollIndicator={false}
            >
              {clientesSugestoes.map((item, index) => {
                const partes = highlightText(item.descricao, clienteBusca);
                const initials = String(item.descricao || "?").trim().slice(0, 2).toUpperCase();
                return (
                  <Pressable
                    key={String(item.codigo)}
                    style={({ pressed }) => [
                      styles.searchResultItem,
                      index < clientesSugestoes.length - 1 && styles.searchResultItemBorder,
                      pressed && styles.searchResultItemPressed,
                    ]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setClientesSugestoes([]);
                      setClienteSearchFocused(false);
                      consultarClienteCompleto(item.codigo);
                    }}
                  >
                    <View style={styles.searchResultAvatar}>
                      <Text style={styles.searchResultAvatarText}>{initials}</Text>
                    </View>
                    <View style={styles.searchResultContent}>
                      <Text style={styles.searchResultTitle} numberOfLines={1}>
                        {partes.map((p, i) => (
                          <Text key={i} style={p.bold ? styles.searchResultHighlight : undefined}>{p.text}</Text>
                        ))}
                      </Text>
                      {!!item.descricao2 && (
                        <Text style={styles.searchResultSub} numberOfLines={1}>{item.descricao2}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>CPF/CNPJ</Text>
          <TextInput value={cgc} editable={false} style={styles.inputDisabled} />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Telefone</Text>
          <TextInput value={contato} editable={false} style={styles.inputDisabled} />
        </View>
      </View>

      <Text style={styles.label}>E-mail</Text>
      <TextInput value={email} editable={false} style={styles.inputDisabled} />

      <Text style={styles.label}>Promotor tecnico</Text>
      <TextInput value={promotorDescricao} editable={false} style={styles.inputDisabled} />

      <Text style={styles.label}>Responsavel no local *</Text>
      <TextInput
        value={responsavel}
        onChangeText={(v) => setResponsavel(v.toUpperCase())}
        placeholder="Responsavel pelo atendimento"
        placeholderTextColor="#94a3b8"
        style={styles.input}
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Historico de visitas</Text>
      {loadingHistorico ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Carregando historico...</Text>
        </View>
      ) : historico.length === 0 ? (
        <View style={styles.stateBox}><Text style={styles.stateText}>Nenhum historico encontrado.</Text></View>
      ) : (
        <View style={styles.listWrap}>
          {historico.map((item) => (
            <Pressable
              key={String(item.id_visita)}
              style={styles.listItem}
              onPress={() => {
                setIdVisita(Number(item.id_visita));
                setDataCheckin(String(item.dtcheckin || ""));
                setStep(4);
              }}
            >
              <Text style={styles.listItemTitle}>{item.id_visita} - {item.status}</Text>
              <Text style={styles.listItemSub}>{String(item.dtcheckin || "")}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Check-in da visita</Text>

      {gpsAguardando && (
        <View style={styles.warningBox}>
          <ActivityIndicator size="small" color={colors.warning} />
          <Text style={styles.warningText}>Capturando localizacao com alta precisao...</Text>
        </View>
      )}

      {Number(distancia) > 3 && !idJustificativa ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Voce esta distante do cliente ({'>'}3km). Justifique para continuar.</Text>
          <Pressable
            style={styles.btnDanger}
            onPress={() => setShowJustificativaModal(true)}
          >
            <Text style={styles.btnDangerText}>Selecionar justificativa</Text>
          </Pressable>
        </View>
      ) : null}

      {idJustificativa > 0 ? (
        <View style={styles.successBox}><Text style={styles.successText}>Justificativa selecionada: {idJustificativa}</Text></View>
      ) : null}

      <Text style={styles.label}>Mapa da visita</Text>
      {regionCheckin ? (
        <View style={styles.mapCard}>
          <MapView ref={checkinMapRef} style={styles.map} initialRegion={regionCheckin}>
            {isValidLatLng(localizacaoPromotor?.lat, localizacaoPromotor?.lng) ? (
              <Marker
                coordinate={{ latitude: localizacaoPromotor.lat, longitude: localizacaoPromotor.lng }}
                title="Voce esta aqui"
                pinColor="red"
              />
            ) : null}

            {clienteTemCoordenada ? (
              <Marker
                coordinate={{ latitude: clienteLat, longitude: clienteLng }}
                title={String(clienteSelecionado?.cliente || "Cliente")}
                pinColor="blue"
              />
            ) : null}
          </MapView>

          <View style={styles.mapLegendRow}>
            <Text style={styles.mapLegendItem}>Pin vermelho: Promotor</Text>
            <Text style={styles.mapLegendItem}>Pin azul: Cliente</Text>
          </View>
        </View>
      ) : (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Aguardando localizacao para exibir o mapa...</Text>
        </View>
      )}

      <Text style={styles.label}>Data Check-in</Text>
      <TextInput editable={false} value={dataCheckin} style={styles.inputDisabled} />

      <Text style={styles.label}>Endereco atual</Text>
      <TextInput editable={false} value={enderecoPromotor || "Obtendo endereco..."} style={styles.inputDisabled} />

      <Text style={styles.label}>Endereco cliente</Text>
      <TextInput editable={false} value={enderecoCliente || "Obtendo endereco..."} style={styles.inputDisabled} />

      <Text style={styles.label}>Distancia (KM)</Text>
      <TextInput editable={false} value={distancia != null ? String(distancia) : "N/A"} style={styles.inputDisabled} />

      <Pressable style={styles.btnOutline} onPress={atualizarDadosCheckin}>
        <Text style={styles.btnOutlineText}>Atualizar localizacao</Text>
      </Pressable>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.section}>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Atividades da visita {idVisita}</Text>
        <Pressable style={styles.btnPrimarySmall} onPress={() => abrirModalAtividade(null)}>
          <Text style={styles.btnPrimarySmallText}>Adicionar</Text>
        </Pressable>
      </View>

      {loadingAtividades ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Carregando atividades...</Text>
        </View>
      ) : atividades.length === 0 ? (
        <View style={styles.stateBox}><Text style={styles.stateText}>Nenhuma atividade encontrada.</Text></View>
      ) : (
        <View style={styles.listWrap}>
          {atividades.map((item) => (
            <Pressable key={String(item.id_evidencia)} style={styles.listItem} onPress={() => abrirModalAtividade(item)}>
              <View style={styles.rowBetween}>
                <Text style={styles.listItemTitle}>{item.id_evidencia} - {item.descricao}</Text>
                <Ionicons
                  name={item.realizado === "S" ? "checkmark-circle" : "close-circle"}
                  size={18}
                  color={item.realizado === "S" ? colors.success : colors.danger}
                />
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Check-out da visita</Text>

      {loadingCheckout ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Carregando dados do checkout...</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Mapa checkout</Text>
      {regionCheckout ? (
        <View style={styles.mapCard}>
          <MapView style={styles.map} initialRegion={regionCheckout}>
            <Marker coordinate={pontoCheckout} title="Voce esta aqui" pinColor="red" />
          </MapView>
          <View style={styles.mapLegendRow}>
            <Text style={styles.mapLegendItem}>Pin vermelho: Posicao atual</Text>
          </View>
        </View>
      ) : (
        <View style={styles.stateBox}><Text style={styles.stateText}>Localizacao nao disponivel.</Text></View>
      )}

      <Text style={styles.label}>Data Check-in</Text>
      <TextInput editable={false} value={dataCheckin} style={styles.inputDisabled} />

      <Text style={styles.label}>Data Check-out</Text>
      <TextInput editable={false} value={dataCheckout} style={styles.inputDisabled} />

      <Text style={styles.label}>Tempo de atendimento</Text>
      <TextInput editable={false} value={tempoAtendimento} style={styles.inputDisabled} />

      <Text style={styles.label}>Atividade realizada</Text>
      <TextInput editable={false} value={atividadeRealizadaTexto || "Carregando..."} style={styles.inputDisabled} />

      <Text style={styles.label}>Localizacao checkout</Text>
      <TextInput
        editable={false}
        value={localizacaoCheckout?.lat ? `${localizacaoCheckout.lat.toFixed(6)}, ${localizacaoCheckout.lon.toFixed(6)}` : "Nao disponivel"}
        style={styles.inputDisabled}
      />
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStepIndicator()}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </ScrollView>

      <View style={styles.footerButtons}>
        {step > 1 && (
          <Pressable style={styles.btnBack} onPress={voltar}>
            <Ionicons name="arrow-back" size={18} color="#475569" />
            <Text style={styles.btnBackText}>Voltar</Text>
          </Pressable>
        )}

        {step === 1 && (
          <Pressable style={({ pressed }) => [styles.btnPrimaryFull, pressed && styles.btnPressed]} onPress={avancar}>
            <LinearGradient colors={["#3f6cf6", "#2f59d9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
              <Text style={styles.btnPrimaryText}>Consultar</Text>
            </LinearGradient>
          </Pressable>
        )}

        {step === 2 && (
          <Pressable style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]} onPress={avancar}>
            <LinearGradient colors={["#3f6cf6", "#2f59d9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
              <Text style={styles.btnPrimaryText}>Nova Visita</Text>
            </LinearGradient>
          </Pressable>
        )}

        {step === 3 && (
          <Pressable
            style={({ pressed }) => [
              styles.btnPrimary,
              Number(distancia) > 3 && !idJustificativa ? styles.btnDisabledWrapper : null,
              pressed && styles.btnPressed,
            ]}
            onPress={avancar}
            disabled={Number(distancia) > 3 && !idJustificativa}
          >
            <LinearGradient
              colors={Number(distancia) > 3 && !idJustificativa ? ["#94a3b8", "#94a3b8"] : ["#3f6cf6", "#2f59d9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btnGradient}
            >
              <Text style={styles.btnPrimaryText}>Fazer CheckIn</Text>
            </LinearGradient>
          </Pressable>
        )}

        {step === 4 && (
          <Pressable style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]} onPress={avancar}>
            <LinearGradient colors={["#3f6cf6", "#2f59d9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
              <Text style={styles.btnPrimaryText}>Finalizar</Text>
            </LinearGradient>
          </Pressable>
        )}

        {step === 5 && (
          <Pressable style={({ pressed }) => [styles.btnSuccess, pressed && styles.btnPressed]} onPress={fazerCheckout}>
            <LinearGradient colors={["#1db96a", "#198754"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
              <Text style={styles.btnSuccessText}>Fazer CheckOut</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>

      <Modal visible={showJustificativaModal} transparent animationType="fade" onRequestClose={() => setShowJustificativaModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selecionar justificativa</Text>

            <FlatList
              data={justificativas}
              keyExtractor={(item) => String(item.idjustificativa)}
              ListEmptyComponent={<Text style={styles.stateText}>Nenhuma justificativa encontrada.</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalListItem}
                  onPress={() => {
                    setIdJustificativa(Number(item.idjustificativa));
                    setShowJustificativaModal(false);
                  }}
                >
                  <Text style={styles.modalListItemText}>{item.idjustificativa} - {item.justificativa}</Text>
                </Pressable>
              )}
            />

            <Pressable style={styles.btnSecondary} onPress={() => setShowJustificativaModal(false)}>
              <Text style={styles.btnSecondaryText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showAtividadeModal} transparent animationType="slide" onRequestClose={() => setShowAtividadeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Evidencia da atividade</Text>

              <Text style={styles.label}>Atividade *</Text>
              <View style={styles.selectWrap}>
                {atividadesCatalogo.map((a) => (
                  <Pressable
                    key={String(a.codigo)}
                    style={[styles.optionChip, Number(a.codigo) === Number(codAtividade) ? styles.optionChipAtivo : null]}
                    onPress={() => {
                      setCodAtividade(Number(a.codigo));
                      setNomeAtividade(String(a.descricao || ""));
                    }}
                  >
                    <Text style={[styles.optionChipText, Number(a.codigo) === Number(codAtividade) ? styles.optionChipTextAtivo : null]}>{a.descricao}</Text>
                  </Pressable>
                ))}
              </View>

              {camposAtivos.cpveterinario && (
                <>
                  <Text style={styles.subsectionTitle}>Veterinario</Text>
                  <Text style={styles.label}>Nome *</Text>
                  <TextInput style={styles.input} value={nomeVeterinario} onChangeText={(v) => setNomeVeterinario(v.toUpperCase())} />
                  <Text style={styles.label}>Telefone</Text>
                  <TextInput
                    style={styles.input}
                    value={contatoVeterinario}
                    keyboardType="phone-pad"
                    onChangeText={(v) => setContatoVeterinario(formatarTelefone(v))}
                  />
                </>
              )}

              {camposAtivos.cpequipe && (
                <>
                  <Text style={styles.subsectionTitle}>Equipe treinada</Text>
                  <Text style={styles.label}>Equipe *</Text>
                  <View style={styles.selectWrap}>
                    {equipesCatalogo.map((e) => (
                      <Pressable
                        key={String(e.codigo)}
                        style={[styles.optionChip, Number(e.codigo) === Number(codEquipe) ? styles.optionChipAtivo : null]}
                        onPress={() => {
                          setCodEquipe(Number(e.codigo));
                          setNomeEquipe(String(e.descricao || ""));
                        }}
                      >
                        <Text style={[styles.optionChipText, Number(e.codigo) === Number(codEquipe) ? styles.optionChipTextAtivo : null]}>{e.descricao}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {!!nomeEquipe && <Text style={styles.hintText}>Equipe: {nomeEquipe}</Text>}

                  <Text style={styles.label}>Qtd pessoas *</Text>
                  <TextInput
                    style={styles.input}
                    value={qtdePessoa}
                    onChangeText={(v) => setQtdePessoa(v.replace(/[^\d.,]/g, ""))}
                    keyboardType="decimal-pad"
                  />

                  <Text style={styles.label}>Fez quiz?</Text>
                  <View style={styles.row}>
                    {[
                      { value: "S", label: "Sim" },
                      { value: "N", label: "Nao" },
                    ].map((op) => (
                      <Pressable
                        key={op.value}
                        style={[styles.optionChip, fezQuiz === op.value ? styles.optionChipAtivo : null]}
                        onPress={() => setFezQuiz(op.value)}
                      >
                        <Text style={[styles.optionChipText, fezQuiz === op.value ? styles.optionChipTextAtivo : null]}>{op.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {camposAtivos.cpitem && (
                <>
                  <Text style={styles.subsectionTitle}>Itens</Text>
                  <View style={styles.row}>
                    {[
                      { value: "AM", label: "Amostra" },
                      { value: "MT", label: "Material Tec." },
                      { value: "BD", label: "Brinde" },
                    ].map((op) => (
                      <Pressable
                        key={op.value}
                        style={[styles.optionChip, tipoItem === op.value ? styles.optionChipAtivo : null]}
                        onPress={() => {
                          setTipoItem(op.value);
                          setItemSugestoes([]);
                          setItemBusca("");
                          setCodItem(0);
                        }}
                      >
                        <Text style={[styles.optionChipText, tipoItem === op.value ? styles.optionChipTextAtivo : null]}>{op.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.label}>Item</Text>
                  <TextInput
                    style={styles.input}
                    value={itemBusca}
                    onChangeText={buscarItemSugestoes}
                    placeholder="Buscar item"
                    placeholderTextColor="#94a3b8"
                  />
                  {itemSugestoes.length > 0 && (
                    <View style={styles.suggestionsWrap}>
                      {itemSugestoes.map((it) => (
                        <Pressable
                          key={String(it.codigo)}
                          style={styles.suggestionItem}
                          onPress={() => {
                            setCodItem(Number(it.codigo));
                            setItemBusca(String(it.descricao || ""));
                            setItemSugestoes([]);
                          }}
                        >
                          <Text style={styles.suggestionTitle}>{it.descricao}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  <Text style={styles.label}>Quantidade</Text>
                  <View style={styles.rowBetween}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginRight: 8 }]}
                      value={qtItem}
                      onChangeText={(v) => setQtItem(v.replace(/[^\d.,]/g, ""))}
                      keyboardType="decimal-pad"
                    />
                    <Pressable style={styles.btnPrimarySmall} onPress={adicionarItemAtividade}>
                      <Text style={styles.btnPrimarySmallText}>Adicionar</Text>
                    </Pressable>
                  </View>

                  {itensAtividade.map((item) => (
                    <View key={String(item.reg || `${item.produto}-${item.quantidade}`)} style={styles.listItemCompact}>
                      <Text style={styles.listItemTitle}>{item.produto} - {item.quantidade} ({item.tipo})</Text>
                      <Pressable onPress={() => removerItemAtividade(item.reg)}>
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </Pressable>
                    </View>
                  ))}
                </>
              )}

              {camposAtivos.cpvenda && (
                <>
                  <Text style={styles.subsectionTitle}>Venda</Text>
                  <View style={styles.row}>
                    {[
                      { value: "S", label: "Houve venda: Sim" },
                      { value: "N", label: "Houve venda: Nao" },
                    ].map((op) => (
                      <Pressable
                        key={op.value}
                        style={[styles.optionChip, houveVenda === op.value ? styles.optionChipAtivo : null]}
                        onPress={() => setHouveVenda(op.value)}
                      >
                        <Text style={[styles.optionChipText, houveVenda === op.value ? styles.optionChipTextAtivo : null]}>{op.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {camposAtivos.cpfoto && (
                <>
                  <Text style={styles.subsectionTitle}>Fotos</Text>
                  <Pressable style={styles.btnOutline} onPress={escolherFotos}>
                    <Text style={styles.btnOutlineText}>Selecionar foto</Text>
                  </Pressable>
                  {fotosSelecionadas.map((foto, idx) => (
                    <View key={`${foto.uri}-${idx}`} style={styles.photoRow}>
                      <Image source={{ uri: foto.uri }} style={styles.photoThumb} />
                      <Text style={styles.photoName} numberOfLines={1}>{foto.name}</Text>
                    </View>
                  ))}
                  {fotosSalvas.length > 0 ? (
                    <Text style={styles.hintText}>Arquivos salvos: {fotosSalvas.length}</Text>
                  ) : null}
                </>
              )}

              {camposAtivos.cpobservacao && (
                <>
                  <Text style={styles.subsectionTitle}>Observacao</Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={5}
                    value={comentario}
                    onChangeText={setComentario}
                    placeholder="Descreva a observacao"
                    placeholderTextColor="#94a3b8"
                  />
                </>
              )}

              <View style={styles.modalActions}>
                <Pressable style={styles.btnSecondary} onPress={() => setShowAtividadeModal(false)}>
                  <Text style={styles.btnSecondaryText}>Voltar</Text>
                </Pressable>

                {atividadeSelecionada?.id_evidencia ? (
                  <Pressable style={styles.btnDangerSmall} onPress={excluirEvidencia}>
                    <Text style={styles.btnDangerSmallText}>Excluir</Text>
                  </Pressable>
                ) : null}

                <Pressable style={styles.btnPrimary} onPress={salvarEvidencia} disabled={salvandoEvidencia}>
                  {salvandoEvidencia ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Salvar</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 12,
  },
  stepIndicatorWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    position: "relative",
    paddingHorizontal: 4,
  },
  stepConnectorTrack: {
    position: "absolute",
    top: 13,
    left: 28,
    right: 28,
    height: 2,
    backgroundColor: "#e2e8f0",
    zIndex: 0,
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
    zIndex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  stepCircleActive: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  stepCircleDone: {
    backgroundColor: "#22c55e",
  },
  stepCircleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
  },
  stepCircleTextActive: {
    color: "#fff",
  },
  stepLabel: {
    fontSize: 9,
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "600",
  },
  stepLabelActive: {
    color: colors.accent,
    fontWeight: "800",
  },
  mapCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 6,
    marginBottom: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  map: {
    width: "100%",
    height: 220,
  },
  mapLegendRow: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    gap: 3,
  },
  mapLegendItem: {
    color: "#475569",
    fontSize: 11,
  },
  section: {
    paddingBottom: 16,
    marginBottom: 4,
  },
  sectionTitle: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 18,
    letterSpacing: -0.4,
  },
  subsectionTitle: {
    color: "#334155",
    fontWeight: "800",
    fontSize: 14,
    marginTop: 10,
    marginBottom: 8,
  },
  label: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 5,
    marginTop: 14,
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#f3f6fc",
    borderWidth: 1.2,
    borderColor: "#e5e9f2",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#111827",
    fontSize: 14,
  },
  inputDisabled: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#f0f2f7",
    borderWidth: 1.2,
    borderColor: "#e5e9f2",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#6b7280",
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#0f172a",
    backgroundColor: "#fff",
    minHeight: 110,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  col: {
    flex: 1,
    minWidth: 120,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  stateText: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
  },
  warningBox: {
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  warningText: {
    color: "#854d0e",
    fontSize: 12,
    flex: 1,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff1f2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 12,
  },
  successBox: {
    borderWidth: 1,
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  successText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "600",
  },
  btnPrimary: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#3f6cf6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  btnGradient: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  btnPressed: {
    opacity: 0.88,
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15.5,
  },
  btnPrimarySmall: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimarySmallText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  btnSecondary: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  btnSecondaryText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 14,
  },
  btnSuccess: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  btnSuccessText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15.5,
  },
  btnDisabledWrapper: {
    shadowOpacity: 0,
    elevation: 0,
  },
  btnOutline: {
    marginTop: 12,
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
  },
  btnOutlineText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 14,
  },
  btnDanger: {
    minHeight: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.danger,
    paddingHorizontal: 10,
  },
  btnDangerText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  btnDangerSmall: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.danger,
  },
  btnDangerSmallText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  btnBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    minWidth: 90,
    justifyContent: "center",
  },
  btnBackText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 14,
  },
  btnPrimaryFull: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#3f6cf6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  suggestionsWrap: {
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 6,
  },
  suggestionItem: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  suggestionTitle: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "600",
  },
  suggestionSub: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  inputSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#f3f6fc",
    borderWidth: 1.2,
    borderColor: "#e5e9f2",
    paddingHorizontal: 14,
  },
  inputSearchFocused: {
    borderColor: colors.accent,
    backgroundColor: "#f0f4ff",
  },
  inputSearchField: {
    flex: 1,
    minHeight: 48,
    color: "#111827",
    fontSize: 14,
  },
  searchDropdown: {
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e9f2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
  },
  searchEmptyState: {
    alignItems: "center",
    paddingVertical: 22,
    gap: 8,
  },
  searchEmptyText: {
    color: "#94a3b8",
    fontSize: 13,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    backgroundColor: "#fff",
  },
  searchResultItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  searchResultItemPressed: {
    backgroundColor: "#f5f8ff",
  },
  searchResultAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultAvatarText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  searchResultHighlight: {
    color: colors.accent,
    fontWeight: "800",
  },
  searchResultSub: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  listWrap: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  listItem: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#fff",
  },
  listItemCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "#fff",
  },
  listItemTitle: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  listItemSub: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  modalCard: {
    width: "100%",
    maxHeight: "74%",
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 10,
  },
  modalCardLarge: {
    width: "100%",
    maxHeight: "90%",
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
  },
  modalTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  modalListItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalListItemText: {
    color: "#334155",
    fontSize: 13,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 4,
  },
  selectWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  optionChipAtivo: {
    borderColor: colors.accent,
    backgroundColor: "#eff6ff",
  },
  optionChipText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
  },
  optionChipTextAtivo: {
    color: colors.accent,
  },
  hintText: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 6,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 6,
    backgroundColor: "#fff",
  },
  photoThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  photoName: {
    flex: 1,
    color: "#334155",
    fontSize: 12,
  },
});
