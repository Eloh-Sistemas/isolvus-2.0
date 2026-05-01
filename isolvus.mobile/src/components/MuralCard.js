import { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Video, ResizeMode } from "expo-av";
import api from "../services/api";
import { colors } from "../theme/colors";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W - 28; // 14px padding cada lado no container

const TIPOS = [
  { value: "AVISO",    label: "Aviso",    cor: "#f59e0b" },
  { value: "EVENTO",   label: "Evento",   cor: "#6366f1" },
  { value: "NOVIDADE", label: "Novidade", cor: "#10b981" },
  { value: "URGENTE",  label: "Urgente",  cor: "#ef4444" },
  { value: "ENQUETE",  label: "Enquete",  cor: "#8b5cf6" },
];

const REACOES = [
  { key: "like",    emoji: "👍", label: "Curtir" },
  { key: "dislike", emoji: "👎", label: "Não curtir" },
  { key: "love",    emoji: "❤️", label: "Amei" },
  { key: "haha",    emoji: "😂", label: "Haha" },
  { key: "wow",     emoji: "😮", label: "Uau" },
  { key: "sad",     emoji: "😢", label: "Triste" },
  { key: "angry",   emoji: "😠", label: "Grr" },
];

function iniciais(nome) {
  const partes = String(nome || "U").trim().split(" ").filter(Boolean);
  if (!partes.length) return "U";
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  return `${partes[0].charAt(0)}${partes[1].charAt(0)}`.toUpperCase();
}

function formatarData(valor) {
  if (!valor) return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseFotos(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function isVideo(src) {
  if (!src) return false;
  return /\.(mp4|webm|ogg|mov)$/i.test(src) || src.startsWith("data:video/");
}

const HERO_H = 260;

export default function MuralCard({ c, idUsuario }) {
  const BASE_URL = api.defaults.baseURL || "";

  const idComunicado     = c.id_comunicado    ?? c.ID_COMUNICADO;
  const titulo           = c.titulo           ?? c.TITULO           ?? "";
  const conteudo         = c.conteudo         ?? c.CONTEUDO         ?? "";
  const tipo             = c.tipo             ?? c.TIPO             ?? "AVISO";
  const nomeAutor        = c.nome_autor       ?? c.NOME_AUTOR       ?? "";
  const fotoAutorRaw     = c.foto_autor       ?? c.FOTO_AUTOR       ?? "";
  const dataPublic       = c.data_publicacao  ?? c.DATA_PUBLICACAO  ?? "";
  const fotosRaw         = c.fotos            ?? c.FOTOS            ?? null;
  const permiteComent    = Number(c.permite_comentario ?? c.PERMITE_COMENTARIO) === 1;

  const fotoAutor = fotoAutorRaw.startsWith("/midias/") ? `${BASE_URL}${fotoAutorRaw}` : fotoAutorRaw;
  const fotos = parseFotos(fotosRaw).map((s) => (s.startsWith("/") ? `${BASE_URL}${s}` : s));
  const t = TIPOS.find((x) => x.value === tipo) || TIPOS[0];
  const temFotos = fotos.length > 0;

  // ── estados ──
  const [fotoAtiva, setFotoAtiva] = useState(0);
  const [pausado, setPausado]     = useState(false);

  const ehVideoAtivo = temFotos && isVideo(fotos[fotoAtiva]);
  const [reacoes, setReacoes]     = useState({ contagens: {}, minha_reacao: null, total: 0 });
  const [enquete, setEnquete]     = useState(null);
  const [loadingEnquete, setLoadingEnquete] = useState(false);
  const [votando, setVotando]     = useState(false);
  const [comentarios, setComentarios] = useState([]);
  const [cmAbertos, setCmAbertos] = useState(false);
  const [novoCm, setNovoCm]       = useState("");
  const [enviandoCm, setEnviandoCm] = useState(false);
  const [totalCm, setTotalCm]     = useState(Number(c.total_comentarios ?? c.TOTAL_COMENTARIOS ?? 0));
  const [respondendoId, setRespondendoId] = useState(null);
  const [textoResposta, setTextoResposta] = useState("");
  const [enviandoResp, setEnviandoResp] = useState(false);
  const [lightbox, setLightbox]   = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // ── carregar reações ──
  useEffect(() => {
    api.post("/v1/reacao/consultar", { id_comunicado: idComunicado, id_usuario: idUsuario })
      .then(({ data }) => setReacoes(data || { contagens: {}, minha_reacao: null, total: 0 }))
      .catch(() => {});
  }, [idComunicado, idUsuario]);

  // ── carregar enquete ──
  useEffect(() => {
    if (tipo !== "ENQUETE") return;
    setLoadingEnquete(true);
    api.post("/v1/enquete/consultar", { id_comunicado: idComunicado, id_usuario: idUsuario })
      .then(({ data }) => {
        setEnquete(data || null);
      })
      .catch(() => {})
      .finally(() => setLoadingEnquete(false));
  }, [idComunicado, tipo, idUsuario]);

  // ── auto-advance carousel (igual à web: 4s, pausa em vídeo) ──
  useEffect(() => {
    if (fotos.length <= 1 || pausado || ehVideoAtivo) return;
    const iv = setInterval(() => {
      setFotoAtiva((p) => (p === fotos.length - 1 ? 0 : p + 1));
    }, 4000);
    return () => clearInterval(iv);
  }, [fotos.length, pausado, ehVideoAtivo]);

  async function reagir(tipoReacao) {
    try {
      await api.post("/v1/reacao/reagir", {
        id_comunicado: idComunicado,
        id_usuario: idUsuario,
        tipo: tipoReacao,
      });
      const { data } = await api.post("/v1/reacao/consultar", { id_comunicado: idComunicado, id_usuario: idUsuario });
      setReacoes(data);
    } catch {}
  }

  async function votar(id_enquete, id_opcao) {
    setVotando(true);
    try {
      await api.post("/v1/enquete/votar", { id_enquete, id_opcao, id_usuario: idUsuario });
      const { data } = await api.post("/v1/enquete/consultar", { id_comunicado: idComunicado, id_usuario: idUsuario });
      setEnquete(data);
    } catch {}
    finally { setVotando(false); }
  }

  function contarTodos(lista) {
    return lista.reduce((acc, cm) => acc + 1 + contarTodos(cm.respostas || []), 0);
  }

  async function carregarComentarios() {
    try {
      const { data } = await api.post("/v1/comentario/listar", { id_comunicado: idComunicado });
      const lista = Array.isArray(data) ? data : [];
      setComentarios(lista);
      setTotalCm(contarTodos(lista));
    } catch {}
  }

  async function excluirComentario(id_comentario) {
    try {
      await api.post("/v1/comentario/excluir", { id_comentario, id_usuario: idUsuario });
      await carregarComentarios();
    } catch {}
  }

  async function enviarComentario() {
    if (!novoCm.trim()) return;
    setEnviandoCm(true);
    try {
      await api.post("/v1/comentario/comentar", {
        id_comunicado: idComunicado,
        id_usuario: idUsuario,
        texto: novoCm.trim(),
      });
      setNovoCm("");
      await carregarComentarios();
    } catch {}
    finally { setEnviandoCm(false); }
  }

  async function enviarResposta(id_pai) {
    if (!textoResposta.trim()) return;
    setEnviandoResp(true);
    try {
      await api.post("/v1/comentario/comentar", {
        id_comunicado: idComunicado,
        id_usuario: idUsuario,
        texto: textoResposta.trim(),
        id_comentario_pai: id_pai,
      });
      setTextoResposta("");
      setRespondendoId(null);
      await carregarComentarios();
    } catch {}
    finally { setEnviandoResp(false); }
  }

  function toggleComentarios() {
    if (!cmAbertos) carregarComentarios();
    setCmAbertos((v) => !v);
  }

  function renderComentario(cm, nivel = 0, idRaiz = null) {
    const idCm = cm.id_comentario;
    const idPaiEnvio = nivel === 0 ? idCm : idRaiz;
    const nomeCm = cm.nome_usuario || "?";
    const fotoCmRaw = cm.foto_usuario;
    const fotoSrc = fotoCmRaw
      ? fotoCmRaw.startsWith("/midias/") ? `${BASE_URL}${fotoCmRaw}` : fotoCmRaw
      : null;
    const respondendo = respondendoId === idCm;

    function handleResponder() {
      if (respondendoId === idCm) {
        setRespondendoId(null);
        setTextoResposta("");
      } else if (nivel === 0) {
        setRespondendoId(idCm);
        setTextoResposta("");
      } else {
        setRespondendoId(idRaiz);
        setTextoResposta(`@${nomeCm} `);
      }
    }

    return (
      <View key={String(idCm)} style={[s.cmItem, nivel > 0 && s.cmItemResposta]}>
        <View style={s.cmAvatar}>
          {fotoSrc
            ? <Image source={{ uri: fotoSrc }} style={s.cmAvatarImg} />
            : <Text style={s.cmAvatarTxt}>{nomeCm[0].toUpperCase()}</Text>}
        </View>
        <View style={s.cmCorpo}>
          <View style={s.cmBubble}>
            <Text style={s.cmNome}>{nomeCm}</Text>
            <Text style={s.cmTexto}>{cm.texto}</Text>
          </View>
          <View style={s.cmAcoes}>
            <Pressable onPress={handleResponder}>
              <Text style={s.responderBtn}>Responder</Text>
            </Pressable>
            {Number(cm.id_usuario) === idUsuario && (
              <Pressable onPress={() => excluirComentario(idCm)} style={{ marginLeft: 10 }}>
                <Ionicons name="trash-outline" size={12} color="#94a3b8" />
              </Pressable>
            )}
          </View>
          {respondendo && (
            <View style={s.respostaRow}>
              <TextInput
                style={s.respostaInput}
                placeholder={`Respondendo a ${nomeCm}...`}
                placeholderTextColor="#94a3b8"
                value={textoResposta}
                onChangeText={setTextoResposta}
                maxLength={500}
                autoFocus
                editable={!enviandoResp}
                onSubmitEditing={() => enviarResposta(idPaiEnvio)}
              />
              <Pressable
                style={[s.sendBtn, (!textoResposta.trim() || enviandoResp) && { opacity: 0.5 }]}
                onPress={() => enviarResposta(idPaiEnvio)}
                disabled={!textoResposta.trim() || enviandoResp}
              >
                {enviandoResp
                  ? <ActivityIndicator size={12} color="#fff" />
                  : <Ionicons name="send" size={12} color="#fff" />}
              </Pressable>
            </View>
          )}
          {(cm.respostas || []).map((r) => renderComentario(r, nivel + 1, idCm))}
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>

      {/* ── MODO HERO: imagem com gradient overlay (igual à web) ── */}
      {temFotos && !ehVideoAtivo && (
        <View style={s.heroWrap}>
          <Image
            source={{ uri: fotos[fotoAtiva] }}
            style={s.heroImg}
            resizeMode="cover"
          />
          {/* Gradiente escuro na base */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.80)"]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* Badge tipo no topo */}
          <View style={s.heroTopBar}>
            <View style={[s.heroBadge, { backgroundColor: `${t.cor}cc` }]}>
              <View style={s.heroBadgeDot} />
              <Text style={s.heroBadgeTxt}>{t.label}</Text>
            </View>
          </View>

          {/* Setas */}
          {fotos.length > 1 && (
            <>
              <Pressable
                style={[s.gnav, { left: 10 }]}
                onPress={() => setFotoAtiva((p) => (p === 0 ? fotos.length - 1 : p - 1))}
              >
                <Ionicons name="chevron-back" size={18} color="#fff" />
              </Pressable>
              <Pressable
                style={[s.gnav, { right: 10 }]}
                onPress={() => setFotoAtiva((p) => (p === fotos.length - 1 ? 0 : p + 1))}
              >
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </Pressable>
            </>
          )}

          {/* Dots */}
          {fotos.length > 1 && (
            <View style={s.heroDots}>
              {fotos.map((_, i) => (
                <Pressable
                  key={i}
                  onPress={() => setFotoAtiva(i)}
                  style={[s.heroDot, i === fotoAtiva && { backgroundColor: t.cor }]}
                />
              ))}
            </View>
          )}

          {/* Rodapé hero: título + autor */}
          <View style={s.heroFooter}>
            {!!titulo && <Text style={s.heroTitulo} numberOfLines={2}>{titulo}</Text>}
            <View style={s.heroMeta}>
              <View style={s.heroAvatar}>
                {fotoAutor
                  ? <Image source={{ uri: fotoAutor }} style={s.heroAvatarImg} />
                  : <Text style={s.heroAvatarTxt}>{iniciais(nomeAutor)}</Text>}
              </View>
              <Text style={s.heroAutor}>{nomeAutor}</Text>
              <Text style={s.heroSep}>·</Text>
              <Text style={s.heroData}>{formatarData(dataPublic)}</Text>
            </View>
          </View>

          {/* Botão lightbox */}
          <Pressable
            style={s.maxBtn}
            onPress={() => { setLightboxIdx(fotoAtiva); setLightbox(true); }}
          >
            <Ionicons name="expand-outline" size={16} color="#fff" />
          </Pressable>
        </View>
      )}

      {/* ── MODO VÍDEO: player acima, info abaixo ── */}
      {ehVideoAtivo && (
        <View style={s.videoWrap}>
          <Video
            source={{ uri: fotos[fotoAtiva] }}
            style={s.videoPlayer}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            onPlaybackStatusUpdate={(status) => {
              if (status.isPlaying) setPausado(true);
              else setPausado(false);
            }}
          />
          {fotos.length > 1 && (
            <>
              <Pressable
                style={[s.gnav, { left: 10 }]}
                onPress={() => setFotoAtiva((p) => (p === 0 ? fotos.length - 1 : p - 1))}
              >
                <Ionicons name="chevron-back" size={18} color="#fff" />
              </Pressable>
              <Pressable
                style={[s.gnav, { right: 10 }]}
                onPress={() => setFotoAtiva((p) => (p === fotos.length - 1 ? 0 : p + 1))}
              >
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </Pressable>
              <View style={s.heroDots}>
                {fotos.map((_, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setFotoAtiva(i)}
                    style={[s.heroDot, i === fotoAtiva && { backgroundColor: t.cor }]}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {/* ── Faixa lateral (cards sem mídia) ── */}
      {!temFotos && <View style={[s.stripe, { backgroundColor: t.cor }]} />}

      {/* ── Corpo do card ── */}
      <View style={s.body}>

        {/* Badge + data (apenas sem foto ou em modo vídeo) */}
        {(!temFotos || ehVideoAtivo) && (
          <View style={s.topRow}>
            <View style={[s.badge, { backgroundColor: `${t.cor}18` }]}>
              <View style={[s.badgeDot, { backgroundColor: t.cor }]} />
              <Text style={[s.badgeTxt, { color: t.cor }]}>{t.label}</Text>
            </View>
            <Text style={s.dataTxt}>{formatarData(dataPublic)}</Text>
          </View>
        )}

        {/* Título (apenas sem foto ou em modo vídeo) */}
        {(!temFotos || ehVideoAtivo) && !!titulo && (
          <Text style={s.titulo}>{titulo}</Text>
        )}

        {/* Conteúdo texto */}
        {!!conteudo && <Text style={s.conteudo}>{conteudo}</Text>}

        {/* Enquete */}
        {tipo === "ENQUETE" && (
          <View style={s.enqueteWrap}>
            {loadingEnquete
              ? <ActivityIndicator color={t.cor} />
              : !enquete ? null
              : (
                <>
                  <Text style={s.enquetePergunta}>{enquete.pergunta}</Text>
                  {enquete.opcoes.map((o) => (
                    <Pressable
                      key={o.id_opcao}
                      style={[s.enqueteOpcao, o.votei && { borderColor: t.cor }]}
                      onPress={() => votar(enquete.id_enquete, o.id_opcao)}
                      disabled={votando}
                    >
                      <Text style={[s.enqueteTxt, o.votei && { color: t.cor, fontWeight: "700" }]}>
                        {o.texto}
                      </Text>
                      {o.votei && <Ionicons name="checkmark-circle" size={14} color={t.cor} />}
                    </Pressable>
                  ))}
                  <Text style={s.enqueteTotal}>
                    {enquete.multipla_escolha && (
                      <Text style={{ color: "#8b5cf6" }}>múltipla escolha · </Text>
                    )}
                    {enquete.opcoes?.some((opcao) => opcao.votei)
                      ? <Text style={{ color: "#64748b" }}>Voce ja marcou sua resposta</Text>
                      : <Text style={{ color: "#94a3b8" }}>Selecione uma opção para votar</Text>
                    }
                  </Text>
                </>
              )
            }
          </View>
        )}

        {/* Autor (apenas sem foto ou em modo vídeo) */}
        {(!temFotos || ehVideoAtivo) && (
          <View style={s.footer}>
            <View style={s.autorAvatar}>
              {fotoAutor
                ? <Image source={{ uri: fotoAutor }} style={s.autorAvatarImg} />
                : <Text style={s.autorAvatarTxt}>{iniciais(nomeAutor)}</Text>}
            </View>
            <Text style={s.autorNome}>
              Publicado por <Text style={{ fontWeight: "700" }}>{nomeAutor}</Text>
            </Text>
          </View>
        )}

        {/* Reações */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.reacoesBar}>
          {REACOES.map(({ key, emoji, label }) => {
            const count = reacoes.contagens?.[key] || 0;
            const ativa = reacoes.minha_reacao === key;
            return (
              <Pressable
                key={key}
                style={[s.reacaoBtn, ativa && { backgroundColor: `${t.cor}15`, borderColor: t.cor }]}
                onPress={() => reagir(key)}
              >
                <Text style={s.reacaoEmoji}>{emoji}</Text>
                <Text style={[s.reacaoLabel, ativa && { color: t.cor }]}>{label}</Text>
                {count > 0 && <Text style={[s.reacaoCount, { color: t.cor }]}>{count}</Text>}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Comentários */}
        {permiteComent && (
          <View style={s.cmWrap}>
            <Pressable style={s.cmToggle} onPress={toggleComentarios}>
              <Ionicons name="chatbubble-outline" size={14} color="#64748b" />
              <Text style={s.cmToggleTxt}>
                {cmAbertos
                  ? "Ocultar comentários"
                  : `Comentários${totalCm > 0 ? ` (${totalCm})` : ""}`}
              </Text>
            </Pressable>

            {cmAbertos && (
              <View style={s.cmLista}>
                {comentarios.length === 0 && (
                  <Text style={s.cmVazio}>Nenhum comentário ainda. Seja o primeiro!</Text>
                )}
                {comentarios.map((cm) => renderComentario(cm))}
                <View style={s.cmInputRow}>
                  <TextInput
                    style={s.cmInput}
                    placeholder="Escreva um comentário..."
                    placeholderTextColor="#94a3b8"
                    value={novoCm}
                    onChangeText={setNovoCm}
                    maxLength={500}
                    editable={!enviandoCm}
                    onSubmitEditing={enviarComentario}
                  />
                  <Pressable
                    style={[s.sendBtn, (!novoCm.trim() || enviandoCm) && { opacity: 0.5 }]}
                    onPress={enviarComentario}
                    disabled={!novoCm.trim() || enviandoCm}
                  >
                    {enviandoCm
                      ? <ActivityIndicator size={14} color="#fff" />
                      : <Ionicons name="send" size={14} color="#fff" />}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Lightbox */}
      <Modal visible={lightbox} transparent animationType="fade">
        <Pressable style={s.lightboxOverlay} onPress={() => setLightbox(false)}>
          <Image
            source={{ uri: fotos[lightboxIdx] }}
            style={s.lightboxImg}
            resizeMode="contain"
          />
          {fotos.length > 1 && (
            <>
              <Pressable
                style={[s.lightboxNav, { left: 12 }]}
                onPress={() => setLightboxIdx((p) => (p === 0 ? fotos.length - 1 : p - 1))}
              >
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </Pressable>
              <Pressable
                style={[s.lightboxNav, { right: 12 }]}
                onPress={() => setLightboxIdx((p) => (p === fotos.length - 1 ? 0 : p + 1))}
              >
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </Pressable>
              <Text style={s.lightboxContador}>{lightboxIdx + 1} / {fotos.length}</Text>
            </>
          )}
          <Pressable style={s.lightboxFechar} onPress={() => setLightbox(false)}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  stripe: { height: 4, width: "100%" },

  // ── Hero (imagem com overlay) ──────────────────────────────
  heroWrap: { position: "relative", height: HERO_H },
  heroImg: { height: HERO_H, width: "100%" },
  heroTopBar: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  heroBadgeTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },
  gnav: {
    position: "absolute",
    top: "50%",
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroDots: {
    position: "absolute",
    bottom: 52,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.45)" },
  heroFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  heroTitulo: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  heroAvatarImg: { width: 22, height: 22 },
  heroAvatarTxt: { color: "#fff", fontSize: 9, fontWeight: "700" },
  heroAutor: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "600" },
  heroSep: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
  heroData: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  maxBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Vídeo ──────────────────────────────────────────────────
  videoWrap: { position: "relative", height: HERO_H, backgroundColor: "#000" },
  videoPlayer: { height: HERO_H, width: "100%" },

  body: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeTxt: { fontSize: 11, fontWeight: "700" },
  dataTxt: { color: "#94a3b8", fontSize: 11 },

  titulo: { color: "#0f172a", fontSize: 15, fontWeight: "800", marginBottom: 6 },
  conteudo: { color: "#475569", fontSize: 13, lineHeight: 20, marginBottom: 10 },

  enqueteWrap: { marginBottom: 10 },
  enquetePergunta: { color: "#1e293b", fontSize: 13, fontWeight: "700", marginBottom: 8 },
  enqueteOpcao: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  enqueteTxt: { flex: 1, color: "#334155", fontSize: 13 },
  enqueteTotal: { color: "#94a3b8", fontSize: 11, marginTop: 4 },

  footer: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  autorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  autorAvatarImg: { width: 28, height: 28, borderRadius: 14 },
  autorAvatarTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  autorNome: { color: "#64748b", fontSize: 12 },

  reacoesBar: { marginBottom: 10 },
  reacaoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginRight: 6,
    backgroundColor: "#f8fafc",
  },
  reacaoEmoji: { fontSize: 14 },
  reacaoLabel: { color: "#64748b", fontSize: 11 },
  reacaoCount: { fontSize: 11, fontWeight: "700" },

  cmWrap: { borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 8 },
  cmToggle: { flexDirection: "row", alignItems: "center", gap: 6 },
  cmToggleTxt: { color: "#64748b", fontSize: 12.5, fontWeight: "600" },
  cmLista: { marginTop: 10, gap: 8 },
  cmVazio: { color: "#94a3b8", fontSize: 12, textAlign: "center", paddingVertical: 8 },

  cmInputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  cmInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#334155",
    fontSize: 13,
    backgroundColor: "#f8fafc",
  },

  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },

  cmItem: { flexDirection: "row", gap: 8, marginBottom: 6 },
  cmItemResposta: { marginLeft: 36, marginBottom: 4 },
  cmAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cmAvatarImg: { width: 28, height: 28, borderRadius: 14 },
  cmAvatarTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },
  cmCorpo: { flex: 1 },
  cmBubble: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  cmNome: { color: "#0f172a", fontSize: 11.5, fontWeight: "700", marginBottom: 2 },
  cmTexto: { color: "#475569", fontSize: 12.5, lineHeight: 18 },
  cmAcoes: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, marginTop: 3 },
  responderBtn: { color: "#64748b", fontSize: 11.5, fontWeight: "600" },

  respostaRow: { flexDirection: "row", gap: 6, marginTop: 6, alignItems: "center" },
  respostaInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    color: "#334155",
    fontSize: 12,
    backgroundColor: "#f8fafc",
  },

  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxImg: { width: "100%", height: "80%" },
  lightboxNav: {
    position: "absolute",
    top: "45%",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  lightboxFechar: {
    position: "absolute",
    top: 44,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  lightboxContador: {
    position: "absolute",
    bottom: 30,
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
