import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import api from "../services/api";
import { colors } from "../theme/colors";
import MuralCard from "../components/MuralCard";
import Logo from "../../assets/SGS.png";

const ROTA_MURAL = {
  key: "mural",
  idRotina: "mural",
  nome: "Mural",
  caminho: "/Home",
  screen: "mural",
  modulo: "Comunicacao",
};

function iniciais(nome) {
  const partes = String(nome || "U")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (!partes.length) return "U";
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  return `${partes[0].charAt(0)}${partes[1].charAt(0)}`.toUpperCase();
}

function toSlug(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizarRotina(rotina) {
  const idRotina = rotina.id_rotina ?? rotina.ID_ROTINA ?? toSlug(rotina.rotina ?? rotina.ROTINA);
  const nome = rotina.rotina ?? rotina.ROTINA ?? "Rotina";
  const caminho = rotina.caminho ?? rotina.CAMINHO ?? "";
  const screen = rotina.screen ?? rotina.SCREEN ?? "";

  return {
    key: `rotina-${idRotina}`,
    idRotina,
    nome,
    caminho,
    screen,
  };
}

function normalizarModulo(modulo) {
  const id = modulo.id_modulo ?? modulo.ID_MODULO ?? toSlug(modulo.modulo ?? modulo.MODULO);
  const nome = modulo.modulo ?? modulo.MODULO ?? "Modulo";
  const rotinasRaw = Array.isArray(modulo.rotinas ?? modulo.ROTINAS)
    ? (modulo.rotinas ?? modulo.ROTINAS)
    : [];

  return {
    id: String(id),
    nome,
    rotinas: rotinasRaw.map(normalizarRotina),
  };
}

function mesclarModulosPermissao(grupos) {
  const mapa = new Map();

  for (const grupo of grupos) {
    for (const bruto of grupo) {
      const modulo = normalizarModulo(bruto);
      const chaveModulo = `${modulo.id}::${toSlug(modulo.nome)}`;

      if (!mapa.has(chaveModulo)) {
        mapa.set(chaveModulo, { ...modulo, rotinas: [] });
      }

      const atual = mapa.get(chaveModulo);
      const vistas = new Set(
        atual.rotinas.map((r) => `${r.idRotina}|${toSlug(r.nome)}|${r.caminho || ""}|${r.screen || ""}`)
      );

      for (const rotina of modulo.rotinas) {
        const chaveRotina = `${rotina.idRotina}|${toSlug(rotina.nome)}|${rotina.caminho || ""}|${rotina.screen || ""}`;
        if (!vistas.has(chaveRotina)) {
          atual.rotinas.push(rotina);
          vistas.add(chaveRotina);
        }
      }
    }
  }

  return Array.from(mapa.values());
}

function normalizarNotificacao(item) {
  return {
    id: item.id_notificacao ?? item.ID_NOTIFICACAO ?? item.id ?? Math.random().toString(),
    idNotificacao: item.id_notificacao ?? item.ID_NOTIFICACAO,
    remetente: item.remetente ?? item.REMETENTE ?? "Usuario",
    idRemetente: item.id_remetente ?? item.ID_REMETENTE ?? "",
    titulo: item.titulo ?? item.TITULO ?? "Sem titulo",
    mensagem: item.mensagem ?? item.MENSAGEM ?? "",
    data: item.data ?? item.DATA ?? "",
    lida: item.lida === true || item.LIDA === true || item.lida === 1 || item.LIDA === 1,
    dadosTabela: item.dados_tabela ?? item.DADOS_TABELA ?? null,
    temAnexo: item.tem_anexo ?? item.TEM_ANEXO ?? 0,
    fotoRemetente: item.foto_remetente ?? item.FOTO_REMETENTE ?? "",
    expandida: false,
  };
}

function formatarDataNotificacao(valor) {
  if (!valor) return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  const data = d.toLocaleDateString("pt-BR");
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${data} ${hora}`;
}

function normalizarFotoUrl(valor) {
  const src = String(valor || "").trim();
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("/midias/")) return `${api.defaults.baseURL}${src}`;
  return src;
}

function extrairLinkNotificacao(notificacao) {
  try {
    const dados = notificacao?.dadosTabela ? JSON.parse(notificacao.dadosTabela) : null;
    return dados?.link ? String(dados.link) : "";
  } catch {
    return "";
  }
}

function iconePorNome(nome) {
  const n = toSlug(nome);
  if (n.includes("fornecedor")) return "business-outline";
  if (n.includes("usuario")) return "person-outline";
  if (n.includes("cliente")) return "people-outline";
  if (n.includes("despesa")) return "receipt-outline";
  if (n.includes("veiculo") || n.includes("frota")) return "car-outline";
  if (n.includes("vale")) return "ticket-outline";
  if (n.includes("caixa") || n.includes("banco")) return "wallet-outline";
  if (n.includes("centro") || n.includes("setor")) return "layers-outline";
  if (n.includes("conta") || n.includes("gerencial")) return "analytics-outline";
  if (n.includes("integracao")) return "git-network-outline";
  return "chevron-forward-outline";
}

export default function HomeScreen({ user, onLogout }) {
  const [showModulos, setShowModulos] = useState(false);
  const [showNotificacoes, setShowNotificacoes] = useState(false);
  const [filtroMenu, setFiltroMenu] = useState("");
  const [modulos, setModulos] = useState([]);
  const [notificacoes, setNotificacoes] = useState([]);
  const [modulosAbertos, setModulosAbertos] = useState({});
  const [rotaAtiva, setRotaAtiva] = useState(ROTA_MURAL);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [loadingNotificacoes, setLoadingNotificacoes] = useState(false);
  const [erroMenu, setErroMenu] = useState("");
  const [erroNotificacoes, setErroNotificacoes] = useState("");
  const [comunicados, setComunicados] = useState([]);
  const [loadingComunicados, setLoadingComunicados] = useState(false);
  const [erroComunicados, setErroComunicados] = useState("");
  const [fotoUsuario, setFotoUsuario] = useState("");
  const [menuFotoAberto, setMenuFotoAberto] = useState(false);
  const [salvandoFoto, setSalvandoFoto] = useState(false);

  const insets = useSafeAreaInsets();
  const { width: larguraTela } = useWindowDimensions();
  const drawerAnim = useRef(new Animated.Value(400)).current;
  const notifAnim = useRef(new Animated.Value(400)).current;

  const idUsuario = Number(user?.id_usuario ?? 0);
  const nomeUsuario = user?.nome || user?.usuario || "Usuario";
  const setorUsuario = user?.setor || "Setor";
  const drawerAberto = showModulos || showNotificacoes;

  const avatarUsuario = fotoUsuario || normalizarFotoUrl(user?.foto || user?.foto_usuario || "");

  const notificacoesNaoLidas = useMemo(
    () => notificacoes.filter((n) => !n.lida).length,
    [notificacoes]
  );

  const modulosFiltrados = useMemo(() => {
    const termo = filtroMenu.trim().toLowerCase();
    if (!termo) return modulos;

    return modulos
      .map((modulo) => ({
        ...modulo,
        rotinas: modulo.rotinas.filter(
          (r) => r.nome.toLowerCase().includes(termo) || modulo.nome.toLowerCase().includes(termo)
        ),
      }))
      .filter((m) => m.rotinas.length > 0);
  }, [filtroMenu, modulos]);

  const idGrupoEmpresa = Number(user?.id_grupo_empresa ?? 0);

  const carregarComunicados = useCallback(async (silencioso = false) => {
    if (!idGrupoEmpresa) return;
    if (!silencioso) setLoadingComunicados(true);
    setErroComunicados("");
    try {
      const resposta = await api.post("/v1/comunicado/listar", {
        id_grupo_empresa: idGrupoEmpresa,
        id_usuario: idUsuario,
      });
      const lista = Array.isArray(resposta?.data) ? resposta.data : [];
      setComunicados(lista);
    } catch {
      setErroComunicados("Nao foi possivel carregar o mural.");
    } finally {
      if (!silencioso) setLoadingComunicados(false);
    }
  }, [idGrupoEmpresa, idUsuario]);

  const carregarPermissoes = useCallback(async () => {
    if (!idUsuario) return;

    setLoadingMenu(true);
    setErroMenu("");

    try {
      const tipos = ["W", "M"];
      const respostas = await Promise.all(
        tipos.map((tipo) =>
          api.post("/v1/consultarPermissoes", {
            matricula: idUsuario,
            tipoaplicacao: tipo,
          })
        )
      );

      const grupos = respostas
        .map((res) => (Array.isArray(res?.data) ? res.data : []))
        .filter((lista) => lista.length > 0);

      const modulosApi = mesclarModulosPermissao(grupos);
      setModulos(modulosApi);
      setModulosAbertos((anterior) => {
        const proximo = { ...anterior };
        for (const m of modulosApi) {
          if (typeof proximo[m.id] === "undefined") proximo[m.id] = false;
        }
        return proximo;
      });
    } catch (error) {
      setErroMenu("Nao foi possivel carregar as rotas do menu.");
      setModulos([]);
    } finally {
      setLoadingMenu(false);
    }
  }, [idUsuario]);

  const carregarNotificacoes = useCallback(async () => {
    if (!idUsuario) return;

    setLoadingNotificacoes(true);
    setErroNotificacoes("");

    try {
      const resposta = await api.post("/v1/notificacoes", { id_usuario: idUsuario });
      const lista = Array.isArray(resposta?.data) ? resposta.data : [];
      setNotificacoes(lista.map(normalizarNotificacao));
    } catch (error) {
      setErroNotificacoes("Nao foi possivel carregar as notificacoes.");
      setNotificacoes([]);
    } finally {
      setLoadingNotificacoes(false);
    }
  }, [idUsuario]);

  useEffect(() => {
    carregarPermissoes();
    carregarNotificacoes();
    carregarComunicados();
  }, [carregarPermissoes, carregarNotificacoes, carregarComunicados]);

  useEffect(() => {
    async function carregarFotoUsuario() {
      try {
        const fotoCache = await AsyncStorage.getItem("foto_usuario");
        if (fotoCache) setFotoUsuario(normalizarFotoUrl(fotoCache));
      } catch {
        // sem efeito colateral
      }

      if (!idUsuario) return;

      try {
        const res = await api.post("/v1/usuario/consultarFoto", { id_usuario: idUsuario });
        const fotoApi = normalizarFotoUrl(res?.data?.foto);
        if (fotoApi) {
          setFotoUsuario(fotoApi);
          await AsyncStorage.setItem("foto_usuario", fotoApi);
        }
      } catch {
        // mantem fallback do cache
      }
    }

    carregarFotoUsuario();
  }, [idUsuario]);

  useEffect(() => {
    if (!idUsuario) return undefined;
    const timer = setInterval(() => {
      carregarNotificacoes();
    }, 10000);
    return () => clearInterval(timer);
  }, [carregarNotificacoes, idUsuario]);

  useEffect(() => {
    if (showModulos) {
      drawerAnim.setValue(larguraTela);
      Animated.timing(drawerAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
    }
  }, [showModulos, drawerAnim, larguraTela]);

  useEffect(() => {
    if (showNotificacoes) {
      notifAnim.setValue(larguraTela);
      Animated.timing(notifAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
    }
  }, [showNotificacoes, notifAnim, larguraTela]);

  function fecharModulos() {
    Animated.timing(drawerAnim, { toValue: larguraTela, duration: 220, useNativeDriver: true }).start(() => {
      setMenuFotoAberto(false);
      setShowModulos(false);
    });
  }

  function fecharNotificacoes() {
    Animated.timing(notifAnim, { toValue: larguraTela, duration: 220, useNativeDriver: true }).start(() => {
      setShowNotificacoes(false);
    });
  }

  function alternarModulo(moduloId) {
    setModulosAbertos((prev) => ({ ...prev, [moduloId]: !prev[moduloId] }));
  }

  function selecionarRota(rotina, nomeModulo) {
    setRotaAtiva({ ...rotina, modulo: nomeModulo });
    fecharModulos();
  }

  async function marcarComoLida(notificacao) {
    try {
      if (notificacao.idNotificacao) {
        await api.post("/v1/notificacoes/lido", {
          id_usuario: idUsuario,
          id_notificacao: notificacao.idNotificacao,
        });
      }

      setNotificacoes((prev) =>
        prev.map((n) =>
          n.id === notificacao.id
            ? {
                ...n,
                lida: true,
              }
            : n
        )
      );
    } catch (error) {
      // mantem comportamento silencioso como no web
    }
  }

  function toggleExpandir(id) {
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, expandida: !n.expandida } : n))
    );
  }

  async function escolherFoto() {
    if (!idUsuario || salvandoFoto) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permissao necessaria", "Permita acesso a galeria para alterar sua foto.");
      return;
    }

    const seletor = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (seletor.canceled || !seletor.assets?.length) return;

    const asset = seletor.assets[0];
    const preview = asset.uri;
    setFotoUsuario(preview);
    setMenuFotoAberto(false);
    setSalvandoFoto(true);

    try {
      const fd = new FormData();
      fd.append("id_usuario", String(idUsuario));
      fd.append("foto", {
        uri: asset.uri,
        name: asset.fileName || "foto.jpg",
        type: asset.mimeType || "image/jpeg",
      });

      const { data } = await api.post("/v1/usuario/salvarFoto", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const urlFinal = normalizarFotoUrl(data?.foto || preview);
      setFotoUsuario(urlFinal);
      await AsyncStorage.setItem("foto_usuario", urlFinal);
    } catch {
      Alert.alert("Erro", "Nao foi possivel salvar a foto.");
    } finally {
      setSalvandoFoto(false);
    }
  }

  async function removerFoto() {
    if (!idUsuario || salvandoFoto) return;
    setMenuFotoAberto(false);
    setSalvandoFoto(true);

    try {
      const fd = new FormData();
      fd.append("id_usuario", String(idUsuario));
      await api.post("/v1/usuario/salvarFoto", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFotoUsuario("");
      await AsyncStorage.removeItem("foto_usuario");
    } catch {
      Alert.alert("Erro", "Nao foi possivel remover a foto.");
    } finally {
      setSalvandoFoto(false);
    }
  }

  async function abrirLinkNotificacao(notificacao) {
    const link = extrairLinkNotificacao(notificacao);
    if (!link) return;

    try {
      const suportado = await Linking.canOpenURL(link);
      if (suportado) await Linking.openURL(link);
    } catch {
      // navegacao e opcional
    }
  }

  async function baixarAnexoTabela(notificacao) {
    try {
      const dados = notificacao?.dadosTabela ? JSON.parse(notificacao.dadosTabela) : null;
      if (!Array.isArray(dados) || dados.length === 0 || typeof dados[0] !== "object") {
        Alert.alert("Anexo", "Este anexo nao possui tabela exportavel.");
        return;
      }

      const colunas = Array.from(
        dados.reduce((set, row) => {
          Object.keys(row || {}).forEach((k) => set.add(k));
          return set;
        }, new Set())
      );

      const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const linhas = [
        colunas.map(escape).join(";"),
        ...dados.map((row) => colunas.map((c) => escape(row?.[c])).join(";")),
      ];

      const nomeBase = String(notificacao?.titulo || "anexo").replace(/[^a-zA-Z0-9_-]+/g, "_");
      const path = `${FileSystem.cacheDirectory}${nomeBase}.csv`;

      await FileSystem.writeAsStringAsync(path, linhas.join("\n"), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: "text/csv",
          dialogTitle: "Compartilhar planilha",
          UTI: "public.comma-separated-values-text",
        });
      } else {
        Alert.alert("Arquivo gerado", `CSV salvo em: ${path}`);
      }
    } catch {
      Alert.alert("Erro", "Nao foi possivel exportar o anexo.");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar
        style={drawerAberto ? "dark" : "light"}
        backgroundColor={drawerAberto ? "#f8fafc" : "#0c1526"}
        translucent={false}
      />
      <View style={styles.container}>
        <LinearGradient
          colors={["#0c1526", "#0f2060"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.navbar}
        >
          <Pressable style={styles.brandWrap} onPress={() => setRotaAtiva(ROTA_MURAL)}>
            <Image source={Logo} style={styles.brandLogo} resizeMode="contain" />
            <View>
              <Text style={styles.brandName}>ISOLVUS</Text>
              <Text style={styles.brandSub}>ERP</Text>
            </View>
          </Pressable>

          <View style={styles.navRight}>
            <Pressable style={styles.iconButton} onPress={() => setShowNotificacoes(true)}>
              <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.9)" />
              {notificacoesNaoLidas > 0 ? (
                <View style={styles.badgeNotif}>
                  <Text style={styles.badgeNotifText}>{notificacoesNaoLidas}</Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable style={styles.userButton} onPress={() => setShowModulos(true)}>
              <View style={styles.userAvatar}>
                {avatarUsuario
                  ? <Image source={{ uri: avatarUsuario }} style={styles.userAvatarImg} />
                  : <Text style={styles.userAvatarText}>{iniciais(nomeUsuario)}</Text>}
              </View>
            </Pressable>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scrollWrap}
          contentContainerStyle={styles.muralContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.muralHeader}>
            <View style={styles.muralHeaderLeft}>
              {rotaAtiva.key !== "mural" && (
                <Ionicons
                  name={iconePorNome(rotaAtiva.nome)}
                  size={22}
                  color="#6366f1"
                />
              )}
              <View>
                <Text style={styles.muralTitulo}>
                  {rotaAtiva.key === "mural" ? "Feed" : rotaAtiva.nome}
                </Text>
                <Text style={styles.muralSubtitulo}>
                  {rotaAtiva.key === "mural"
                    ? "Fique por dentro dos comunicados, eventos e novidades da empresa."
                    : `Modulo ${rotaAtiva.modulo || "Sistema"} - ${rotaAtiva.caminho || rotaAtiva.screen || "rota interna"}`}
                </Text>
              </View>
            </View>
          </View>

          {rotaAtiva.key === "mural" ? (
            <View style={styles.feedList}>
              {loadingComunicados ? (
                <View style={styles.stateWrap}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={styles.stateText}>Carregando mural...</Text>
                </View>
              ) : erroComunicados ? (
                <View style={styles.stateWrap}>
                  <Text style={styles.stateError}>{erroComunicados}</Text>
                  <Pressable style={styles.retryBtn} onPress={() => carregarComunicados()}>
                    <Text style={styles.retryText}>Tentar novamente</Text>
                  </Pressable>
                </View>
              ) : comunicados.length === 0 ? (
                <View style={styles.stateWrap}>
                  <Ionicons name="megaphone-outline" size={28} color="#94a3b8" />
                  <Text style={styles.stateText}>Nenhum comunicado publicado ainda.</Text>
                </View>
              ) : (
                comunicados.map((item) => {
                  const id = item.id_comunicado ?? item.ID_COMUNICADO ?? Math.random().toString();
                  return (
                    <MuralCard key={String(id)} c={item} idUsuario={idUsuario} />
                  );
                })
              )}
            </View>
          ) : (
            <View style={styles.routeContainer}>
              <View style={styles.routeCard}>
                <View style={styles.routeTop}>
                  <Ionicons name={iconePorNome(rotaAtiva.nome)} size={18} color={colors.accent} />
                  <Text style={styles.routeTitle}>{rotaAtiva.nome}</Text>
                </View>
                <Text style={styles.routeDescription}>
                  Rota selecionada pelo menu da API. Caminho web: {rotaAtiva.caminho || "nao informado"}.
                </Text>
                <Text style={styles.routeDescription}>
                  Screen mobile: {rotaAtiva.screen || "nao informado"}.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      <Modal visible={showModulos} animationType="none" transparent>
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.backdrop} onPress={fecharModulos} />
          <Animated.View style={[styles.drawer, { paddingTop: 14 + insets.top, transform: [{ translateX: drawerAnim }] }]}>
            {menuFotoAberto ? (
              <Pressable style={styles.popupDismissLayer} onPress={() => setMenuFotoAberto(false)} />
            ) : null}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerProfile}>
                <View>
                  <Pressable
                    style={styles.drawerAvatar}
                    onPress={() => setMenuFotoAberto((v) => !v)}
                    disabled={salvandoFoto}
                  >
                    {avatarUsuario
                      ? <Image source={{ uri: avatarUsuario }} style={styles.drawerAvatarImg} />
                      : <Text style={styles.drawerAvatarTxt}>{iniciais(nomeUsuario)}</Text>}
                  </Pressable>

                  {menuFotoAberto && (
                    <View style={styles.avatarPopupMenu}>
                      <Pressable style={styles.avatarPopupItem} onPress={escolherFoto}>
                        <Ionicons name="image-outline" size={14} color="#334155" />
                        <Text style={styles.avatarPopupItemTxt}>Escolher foto</Text>
                      </Pressable>
                      {!!avatarUsuario && (
                        <Pressable style={styles.avatarPopupItem} onPress={removerFoto}>
                          <Ionicons name="trash-outline" size={14} color="#dc2626" />
                          <Text style={styles.avatarPopupItemDangerTxt}>Remover foto</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>

                <View>
                  <Text style={styles.drawerUserName}>{nomeUsuario}</Text>
                  <Text style={styles.drawerUserMeta}>
                    {user?.id_usuario_erp || "-"} - {setorUsuario}
                  </Text>
                </View>
              </View>
              <Pressable onPress={fecharModulos}>
                <Ionicons name="close" size={24} color="#64748b" />
              </Pressable>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                value={filtroMenu}
                onChangeText={setFiltroMenu}
                placeholder="Buscar modulo ou rotina..."
                placeholderTextColor="#94a3b8"
              />
              {filtroMenu ? (
                <Pressable onPress={() => setFiltroMenu("")}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </Pressable>
              ) : null}
            </View>

            {loadingMenu ? (
              <View style={styles.stateWrap}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.stateText}>Carregando menu...</Text>
              </View>
            ) : erroMenu ? (
              <View style={styles.stateWrap}>
                <Text style={styles.stateError}>{erroMenu}</Text>
                <Pressable style={styles.retryBtn} onPress={carregarPermissoes}>
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView style={styles.modulosList} showsVerticalScrollIndicator={false}>
                {modulosFiltrados.map((modulo) => {
                  const aberto = modulosAbertos[modulo.id] || !!filtroMenu;
                  return (
                    <View key={modulo.id} style={styles.moduloCard}>
                      <Pressable style={styles.moduloHeaderBtn} onPress={() => alternarModulo(modulo.id)}>
                        <View style={styles.moduloHeaderLeft}>
                          <Ionicons name="layers" size={14} color={aberto ? "#3b82f6" : "#94a3b8"} />
                          <Text style={[styles.moduloTitulo, aberto ? styles.moduloTituloAtivo : null]}>
                            {modulo.nome}
                          </Text>
                        </View>
                        <Ionicons name="chevron-down" size={15} color="#64748b" style={aberto ? styles.chevronOpen : null} />
                      </Pressable>

                      {aberto ? (
                        <View style={styles.rotinasList}>
                          {modulo.rotinas.map((rotina) => (
                            <Pressable
                              key={rotina.key}
                              style={styles.rotinaLinha}
                              onPress={() => selecionarRota(rotina, modulo.nome)}
                            >
                              <View style={styles.rotinaDot} />
                              <Text
                                style={[
                                  styles.rotinaText,
                                  rotaAtiva.key === rotina.key ? styles.rotinaTextAtiva : null,
                                ]}
                              >
                                {rotina.nome}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={[styles.drawerFooter, { paddingBottom: 22 }]}>
              <Pressable style={styles.logoutButton} onPress={onLogout}>
                <Ionicons name="log-out-outline" size={16} color="#ef4444" />
                <Text style={styles.logoutText}>Sair do sistema</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showNotificacoes} animationType="none" transparent>
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.backdrop} onPress={fecharNotificacoes} />
          <Animated.View style={[styles.drawer, { paddingTop: 14 + insets.top, transform: [{ translateX: notifAnim }] }]}>
            <View style={styles.drawerHeader}>
              <View style={styles.notifTitleWrap}>
                <Text style={styles.notifTitle}>Notificacoes</Text>
                {notificacoesNaoLidas > 0 ? (
                  <View style={styles.badgeNotifSecondary}>
                    <Text style={styles.badgeNotifText}>{notificacoesNaoLidas}</Text>
                  </View>
                ) : null}
              </View>
              <Pressable onPress={fecharNotificacoes}>
                <Ionicons name="close" size={24} color="#64748b" />
              </Pressable>
            </View>

            {loadingNotificacoes ? (
              <View style={styles.stateWrap}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.stateText}>Carregando notificacoes...</Text>
              </View>
            ) : erroNotificacoes ? (
              <View style={styles.stateWrap}>
                <Text style={styles.stateError}>{erroNotificacoes}</Text>
                <Pressable style={styles.retryBtn} onPress={carregarNotificacoes}>
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView style={styles.notifList} showsVerticalScrollIndicator={false}>
                {notificacoes.length === 0 ? (
                  <View style={styles.stateWrap}>
                    <Ionicons name="notifications-off-outline" size={26} color="#94a3b8" />
                    <Text style={styles.stateText}>Nenhuma notificacao no momento.</Text>
                  </View>
                ) : (
                  notificacoes.map((n) => (
                    <Pressable
                      key={String(n.id)}
                      style={[styles.notifCard, !n.lida ? styles.notifUnread : null]}
                      onPress={async () => {
                        await marcarComoLida(n);
                        await abrirLinkNotificacao(n);
                      }}
                    >
                      <View style={styles.notifRowTop}>
                        <View style={styles.notifUserWrap}>
                          <View style={styles.notifAvatar}>
                            {normalizarFotoUrl(n.fotoRemetente)
                              ? <Image source={{ uri: normalizarFotoUrl(n.fotoRemetente) }} style={styles.notifAvatarImg} />
                              : <Text style={styles.notifAvatarText}>{iniciais(n.remetente)}</Text>}
                          </View>
                          <Text style={styles.notifUser}>
                            {n.idRemetente ? `${n.idRemetente} - ` : ""}
                            {n.remetente}
                          </Text>
                        </View>
                        <Text style={styles.notifDate}>{formatarDataNotificacao(n.data)}</Text>
                      </View>
                      <Text style={styles.notifTitulo}>{n.titulo}</Text>
                      <Text style={styles.notifMsg} numberOfLines={n.expandida ? undefined : 3}>
                        {n.mensagem}
                      </Text>
                      {String(n.mensagem || "").length > 120 ? (
                        <Pressable onPress={() => toggleExpandir(n.id)}>
                          <Text style={styles.verMaisText}>{n.expandida ? "Ver menos" : "Ver mais"}</Text>
                        </Pressable>
                      ) : null}

                      {Number(n.temAnexo) === 1 && !extrairLinkNotificacao(n) ? (
                        <Pressable style={styles.downloadBtn} onPress={() => baixarAnexoTabela(n)}>
                          <Ionicons name="download-outline" size={14} color="#166534" />
                          <Text style={styles.downloadBtnTxt}>Baixar planilha</Text>
                        </Pressable>
                      ) : null}
                    </Pressable>
                  ))
                )}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0c1526" },
  container: { flex: 1, backgroundColor: "#f8fafc" },

  navbar: {
    height: 60,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandLogo: { width: 34, height: 34, borderRadius: 6 },
  brandName: { color: "#ffffff", fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  brandSub: { color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: "700", marginTop: -1 },

  navRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  badgeNotif: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    paddingHorizontal: 3,
  },
  badgeNotifSecondary: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    paddingHorizontal: 4,
  },
  badgeNotifText: { color: colors.white, fontSize: 10, fontWeight: "700" },

  userButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  userAvatarImg: { width: 28, height: 28 },
  userAvatarText: { color: "#ffffff", fontSize: 11, fontWeight: "800" },

  scrollWrap: { flex: 1 },
  muralContainer: {
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 34,
  },
  muralHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#e2e8f0",
    gap: 10,
  },
  muralHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  muralTitulo: { color: "#0f172a", fontSize: 22, fontWeight: "800" },
  muralSubtitulo: { color: "#94a3b8", fontSize: 12, marginTop: 1 },
  muralNovoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366f1",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  muralNovoBtnText: { color: colors.white, fontSize: 13, fontWeight: "700" },

  feedList: { gap: 12 },

  routeContainer: { gap: 12 },
  routeCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  routeTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  routeTitle: { color: "#1e293b", fontSize: 15, fontWeight: "800" },
  routeDescription: { color: "#64748b", fontSize: 13, lineHeight: 19, marginBottom: 4 },

  drawerOverlay: { flex: 1, flexDirection: "row", backgroundColor: "rgba(15,23,42,0.45)" },
  backdrop: { flex: 1 },
  drawer: {
    width: "100%",
    backgroundColor: colors.white,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 0,
  },
  popupDismissLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    marginHorizontal: -14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 12,
  },
  drawerProfile: { flexDirection: "row", alignItems: "center", gap: 10 },
  drawerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  drawerAvatarImg: { width: 56, height: 56, borderRadius: 28 },
  drawerAvatarTxt: { color: colors.white, fontSize: 20, fontWeight: "800" },
  avatarPopupMenu: {
    position: "absolute",
    top: 64,
    left: 0,
    zIndex: 50,
    elevation: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    paddingVertical: 4,
    width: 165,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarPopupItem: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  avatarPopupItemTxt: { color: "#334155", fontSize: 12.5, fontWeight: "600" },
  avatarPopupItemDangerTxt: { color: "#dc2626", fontSize: 12.5, fontWeight: "600" },
  drawerUserName: { color: "#1e293b", fontSize: 17, fontWeight: "800" },
  drawerUserMeta: { color: "#64748b", fontSize: 12, marginTop: 2 },

  searchWrap: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: "#334155", fontSize: 13, paddingVertical: 8 },

  stateWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 24,
  },
  stateText: { color: "#64748b", fontSize: 13 },
  stateError: { color: colors.danger, fontSize: 13, textAlign: "center" },
  retryBtn: {
    backgroundColor: "#edf3ff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  retryText: { color: colors.accent, fontWeight: "700", fontSize: 12.5 },

  modulosList: { flex: 1 },
  moduloCard: {
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
    marginBottom: 2,
    paddingBottom: 2,
  },
  moduloHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  moduloHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  moduloTitulo: { color: "#334155", fontSize: 14, fontWeight: "700" },
  moduloTituloAtivo: { color: "#1e293b" },
  chevronOpen: { transform: [{ rotate: "180deg" }] },

  rotinasList: {
    paddingLeft: 14,
    paddingRight: 4,
    paddingBottom: 8,
    gap: 2,
  },
  rotinaLinha: {
    minHeight: 36,
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  rotinaDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#94a3b8",
  },
  rotinaText: { color: "#475569", fontSize: 13, fontWeight: "600" },
  rotinaTextAtiva: { color: colors.accent, fontWeight: "800" },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  logoutText: { color: "#ef4444", fontSize: 14, fontWeight: "500" },

  notifTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  notifTitle: { color: "#1e293b", fontSize: 17, fontWeight: "800" },
  notifList: { flex: 1 },
  notifCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: colors.white,
    padding: 10,
    marginBottom: 10,
  },
  notifUnread: {
    backgroundColor: "#eff6ff",
    borderColor: "#93c5fd",
  },
  notifRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 8,
  },
  notifUserWrap: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  notifAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366f1",
    overflow: "hidden",
  },
  notifAvatarImg: { width: 28, height: 28 },
  notifAvatarText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  notifUser: { color: "#334155", fontSize: 12.5, fontWeight: "700", flex: 1 },
  notifDate: { color: "#94a3b8", fontSize: 10.5, maxWidth: 120, textAlign: "right" },
  notifTitulo: { color: "#0f172a", fontSize: 13, fontWeight: "700", marginBottom: 3 },
  notifMsg: { color: "#64748b", fontSize: 12, lineHeight: 17 },
  verMaisText: { color: colors.accent, fontSize: 12, fontWeight: "700", marginTop: 6 },
  downloadBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  downloadBtnTxt: { color: "#166534", fontSize: 12.5, fontWeight: "700" },
});
