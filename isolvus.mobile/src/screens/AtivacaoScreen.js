import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { setBaseUrl } from "../services/api";
import { useShowAlert } from "../components/CustomAlert/AlertProvider";

const { width: SW, height: SH } = Dimensions.get("window");
const FRAME = SW * 0.68;

export default function AtivacaoScreen({ onAtivacaoSucesso, onLoginSuccess }) {
  const showAlert = useShowAlert();
  const [permission, requestPermission] = useCameraPermissions();
  const [lendo, setLendo] = useState(false);
  const [processando, setProcessando] = useState(false);
  const jaLeuRef = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  async function onBarcodeScanned({ data }) {
    if (jaLeuRef.current || processando) return;
    jaLeuRef.current = true;
    setLendo(false);
    setProcessando(true);

    try {
      let payload;
      try {
        payload = JSON.parse(data);
      } catch {
        showAlert({ type: "error", title: "QR inválido", message: "Este QR Code não é um código de ativação do Isolvus." });
        jaLeuRef.current = false;
        setProcessando(false);
        return;
      }

      if (!payload?.api_url || !payload?.token_ativacao) {
        showAlert({ type: "error", title: "QR inválido", message: "QR Code não contém as informações de ativação necessárias." });
        jaLeuRef.current = false;
        setProcessando(false);
        return;
      }

      const { api_url, token_ativacao } = payload;

      // Busca id_usuario salvo (caso o app já tenha passado pelo login antes)
      const id_usuario_salvo = await AsyncStorage.getItem("id_usuario");

      const resposta = await axios.post(
        `${api_url}/v1/mobile/ativacao/validar`,
        {
          token_ativacao,
          dispositivo: "APP-MOBILE",
          id_usuario: id_usuario_salvo ? Number(id_usuario_salvo) : null,
        },
        {
          auth: { username: "Bellasistema", password: "bella123" },
          timeout: 10000,
        }
      );

      if (!resposta.data?.sucesso) {
        showAlert({ type: "error", title: "Ativação recusada", message: "O servidor recusou a ativação. Verifique o QR Code." });
        jaLeuRef.current = false;
        setProcessando(false);
        return;
      }

      // Salva a URL da API no AsyncStorage e atualiza o módulo de api
      await AsyncStorage.setItem("api_base_url", api_url);
      setBaseUrl(api_url);

      const usuarioDados = resposta.data?.usuario;

      if (usuarioDados?.id_usuario) {
        // Salva os dados de sessão como se tivesse feito login
        await AsyncStorage.multiSet([
          ["id_usuario",     String(usuarioDados.id_usuario     ?? "")],
          ["id_usuario_erp", String(usuarioDados.id_usuario_erp ?? "")],
          ["id_grupo_empresa", String(usuarioDados.id_grupo_empresa ?? "")],
          ["nome",           String(usuarioDados.nome           ?? "")],
          ["usuario",        String(usuarioDados.usuario        ?? "")],
          ["id_setor_erp",   String(usuarioDados.id_setor_erp   ?? "")],
          ["setor",          String(usuarioDados.setor          ?? "")],
          ["id_empresa",     String(usuarioDados.id_empresa     ?? "")],
          ["razaosocial",    String(usuarioDados.razaosocial    ?? "")],
        ]);

        setProcessando(false);

        showAlert({
          type: "success",
          title: "App ativado!",
          message: `Bem-vindo, ${usuarioDados.nome || usuarioDados.usuario}!`,
          buttons: [
            {
              text: "OK",
              onPress: () => {
                if (typeof onLoginSuccess === "function") onLoginSuccess(usuarioDados);
              },
            },
          ],
        });
      } else {
        setProcessando(false);

        showAlert({
          type: "success",
          title: "App ativado!",
          message: "Configuração concluída. Faça login para continuar.",
          buttons: [
            {
              text: "OK",
              onPress: () => {
                if (typeof onAtivacaoSucesso === "function") onAtivacaoSucesso(api_url);
              },
            },
          ],
        });
      }
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || "Erro ao validar ativação.";
      showAlert({ type: "error", title: "Erro na ativação", message: msg });
      jaLeuRef.current = false;
      setProcessando(false);
    }
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3f6cf6" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={48} color="#94a3b8" />
        <Text style={styles.permText}>É necessário permitir o uso da câmera para escanear o QR Code.</Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Permitir câmera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={["#050d1a", "#0b1a35", "#0a2a6e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Ionicons name="layers" size={24} color="#3f6cf6" />
        <Text style={styles.headerTitle}>ISOLVUS <Text style={styles.headerErp}>ERP</Text></Text>
      </View>

      <Text style={styles.titulo}>Ativar aplicativo</Text>
      <Text style={styles.subtitulo}>
        Peça ao administrador para gerar um QR Code em{"\n"}
        <Text style={styles.menuPath}>Configuração → Ativação Mobile</Text>
        {"\n"}e escaneie abaixo para configurar o app.
      </Text>

      <View style={styles.cameraWrap}>
        {lendo ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={onBarcodeScanned}
          />
        ) : (
          <View style={[styles.camera, styles.cameraPlaceholder]}>
            <Ionicons name="qr-code-outline" size={72} color="rgba(255,255,255,0.25)" />
          </View>
        )}

        {/* Moldura de scan */}
        <View style={styles.frame} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        {processando && (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.overlayText}>Validando ativação...</Text>
          </View>
        )}
      </View>

      {!lendo && !processando && (
        <Pressable style={styles.scanBtn} onPress={() => { jaLeuRef.current = false; setLendo(true); }}>
          <LinearGradient
            colors={["#3f6cf6", "#2f59d9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scanBtnGradient}
          >
            <Ionicons name="scan-outline" size={20} color="#fff" />
            <Text style={styles.scanBtnText}>Escanear QR Code</Text>
          </LinearGradient>
        </Pressable>
      )}

      {lendo && !processando && (
        <Pressable style={styles.cancelBtn} onPress={() => setLendo(false)}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, alignItems: "center", paddingTop: 56 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 28 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 0.4 },
  headerErp: { color: "#3f6cf6" },
  titulo: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 10, textAlign: "center" },
  subtitulo: { color: "rgba(255,255,255,0.6)", fontSize: 14, textAlign: "center", lineHeight: 22, paddingHorizontal: 24, marginBottom: 28 },
  menuPath: { color: "#60a5fa", fontWeight: "600" },
  cameraWrap: {
    width: FRAME,
    height: FRAME,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    marginBottom: 32,
  },
  camera: { width: "100%", height: "100%" },
  cameraPlaceholder: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  frame: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#3f6cf6",
    borderWidth: 3,
  },
  cornerTL: { top: 12, left: 12, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 12, right: 12, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 12, left: 12, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 12, right: 12, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  overlayText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  scanBtn: { width: SW - 48 },
  scanBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  scanBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelBtn: { marginTop: 16 },
  cancelBtnText: { color: "rgba(255,255,255,0.55)", fontSize: 15 },
  permText: { color: "#64748b", fontSize: 15, textAlign: "center", marginVertical: 16, lineHeight: 22 },
  permBtn: { backgroundColor: "#3f6cf6", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  permBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
