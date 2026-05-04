import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  PixelRatio,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Camera, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Device from "expo-device";
import * as Network from "expo-network";
import * as Location from "expo-location";
import * as Battery from "expo-battery";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { setBaseUrl } from "../services/api";
import { useShowAlert } from "../components/CustomAlert/AlertProvider";

const { width: SW, height: SH } = Dimensions.get("window");
const FRAME = SW * 0.68;

function normalizarMac(mac) {
  if (!mac) return null;
  const valor = String(mac).trim().toUpperCase();
  if (!valor) return null;
  return valor;
}

async function obterMacDispositivo() {
  try {
    if (typeof Network.getMacAddressAsync !== "function") {
      return null;
    }
    const mac = await Network.getMacAddressAsync();
    return normalizarMac(mac);
  } catch {
    return null;
  }
}

async function obterIpLocalDispositivo() {
  try {
    if (typeof Network.getIpAddressAsync !== "function") {
      return null;
    }
    const ip = await Network.getIpAddressAsync();
    return ip ? String(ip) : null;
  } catch {
    return null;
  }
}

function mapBatteryState(state) {
  if (state === Battery.BatteryState.CHARGING) return "charging";
  if (state === Battery.BatteryState.FULL) return "full";
  if (state === Battery.BatteryState.UNPLUGGED) return "unplugged";
  return "unknown";
}

async function obterInfoBateria() {
  try {
    const [nivel, estado, economia] = await Promise.all([
      Battery.getBatteryLevelAsync(),
      Battery.getBatteryStateAsync(),
      Battery.isLowPowerModeEnabledAsync(),
    ]);

    return {
      level: typeof nivel === "number" ? parseFloat((nivel * 100).toFixed(2)) : null,
      state: mapBatteryState(estado),
      low_power_mode: Boolean(economia),
    };
  } catch {
    return {
      level: null,
      state: "unknown",
      low_power_mode: null,
      error: "nao_foi_possivel_obter_bateria",
    };
  }
}

async function obterInfoLocalizacao() {
  try {
    const permissao = await Location.requestForegroundPermissionsAsync();
    if (permissao.status !== "granted") {
      return {
        permission: permissao.status,
        latitude: null,
        longitude: null,
      };
    }

    const posicao = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: true,
    });

    return {
      permission: permissao.status,
      latitude: posicao?.coords?.latitude ?? null,
      longitude: posicao?.coords?.longitude ?? null,
      accuracy_meters: posicao?.coords?.accuracy ?? null,
      altitude: posicao?.coords?.altitude ?? null,
      heading: posicao?.coords?.heading ?? null,
      speed: posicao?.coords?.speed ?? null,
      captured_at: posicao?.timestamp ? new Date(posicao.timestamp).toISOString() : null,
    };
  } catch {
    return {
      permission: "error",
      latitude: null,
      longitude: null,
      error: "nao_foi_possivel_obter_localizacao",
    };
  }
}

async function getDeviceInfoPayload() {
  const [macAddress, ipLocal, bateria, localizacao] = await Promise.all([
    obterMacDispositivo(),
    obterIpLocalDispositivo(),
    obterInfoBateria(),
    obterInfoLocalizacao(),
  ]);

  return {
    captured_at: new Date().toISOString(),
    app: {
      platform: Platform.OS,
      platform_version: String(Platform.Version ?? ""),
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen_width: SW,
      screen_height: SH,
      pixel_ratio: PixelRatio.get(),
      font_scale: PixelRatio.getFontScale(),
    },
    network: {
      mac_address: macAddress,
      ip_local: ipLocal,
    },
    battery: bateria,
    location: localizacao,
    apps_usage: {
      supported: false,
      reason: "expo_managed_nao_permite_uso_de_outros_apps",
    },
    device: {
      brand: Device.brand || null,
      manufacturer: Device.manufacturer || null,
      model_name: Device.modelName || null,
      design_name: Device.designName || null,
      os_name: Device.osName || null,
      os_version: Device.osVersion || null,
      os_build_id: Device.osBuildId || null,
      os_internal_build_id: Device.osInternalBuildId || null,
      product_name: Device.productName || null,
      device_year_class: Device.deviceYearClass || null,
      supported_cpu_architectures: Device.supportedCpuArchitectures || [],
      total_memory: Device.totalMemory || null,
      is_device: Device.isDevice,
      device_type: Device.deviceType || null,
    },
  };
}

function getDispositivoResumo(info) {
  const marca = info?.device?.brand || "Device";
  const modelo = info?.device?.model_name || "Mobile";
  const osNome = info?.device?.os_name || Platform.OS;
  const osVersao = info?.device?.os_version || String(Platform.Version || "");
  return `${marca} ${modelo} (${osNome} ${osVersao})`.slice(0, 200);
}

export default function AtivacaoScreen({ onAtivacaoSucesso }) {
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

      const { api_url: api_url_raw, token_ativacao } = payload;
      // Remove /v1 trailing para evitar duplicação (ex: banco salvo com /v1 já incluso)
      const api_url = String(api_url_raw || "").replace(/\/v1\/?$/, "");
      const dispositivoInfo = await getDeviceInfoPayload();

      // Busca id_usuario salvo (caso o app já tenha passado pelo login antes)
      const id_usuario_salvo = await AsyncStorage.getItem("id_usuario");

      const resposta = await axios.post(
        `${api_url}/v1/mobile/ativacao/validar`,
        {
          token_ativacao,
          dispositivo: getDispositivoResumo(dispositivoInfo),
          dispositivo_info: dispositivoInfo,
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

      const idAtivacao = resposta.data?.id_ativacao;
      if (idAtivacao) {
        await AsyncStorage.setItem("ativacao_id", String(idAtivacao));
      }

      const usuarioDados = resposta.data?.usuario;

      if (usuarioDados?.id_usuario) {
        // Salva usuario vinculado para o login (campo usuario travado)
        await AsyncStorage.multiSet([
          ["usuario_vinculado_id_usuario", String(usuarioDados.id_usuario ?? "")],
          ["usuario_vinculado_login", String(usuarioDados.usuario ?? "")],
          ["usuario_vinculado_nome", String(usuarioDados.nome ?? "")],
        ]);

        setProcessando(false);

        showAlert({
          type: "success",
          title: "App ativado!",
          message: `Usuário ${usuarioDados.nome || usuarioDados.usuario} vinculado ao aparelho. Informe apenas a senha para entrar.`,
          buttons: [
            {
              text: "OK",
              onPress: () => {
                if (typeof onAtivacaoSucesso === "function") onAtivacaoSucesso(api_url);
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
      const erroAxios = String(error?.message || "").toLowerCase();
      const msg = erroAxios.includes("network error")
        ? "Falha de rede ao validar ativação. Verifique se o celular está na mesma rede da API e se a URL do QR está acessível."
        : (error?.response?.data?.error || error?.message || "Erro ao validar ativação.");
      showAlert({ type: "error", title: "Erro na ativação", message: msg });
      jaLeuRef.current = false;
      setProcessando(false);
    }
  }

  async function handleSelecionarImagemQr() {
    if (processando) return;

    try {
      const permissaoMidia = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissaoMidia.granted) {
        showAlert({
          type: "error",
          title: "Permissão necessária",
          message: "Permita acesso ao álbum para selecionar uma imagem com QR Code.",
        });
        return;
      }

      const selecionado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      if (selecionado.canceled || !selecionado.assets?.length) {
        return;
      }

      const uriImagem = selecionado.assets[0]?.uri;
      if (!uriImagem) {
        showAlert({ type: "error", title: "Falha na leitura", message: "Não foi possível abrir a imagem selecionada." });
        return;
      }

      const codigos = await Camera.scanFromURLAsync(uriImagem, ["qr"]);
      const qr = codigos?.[0]?.data;

      if (!qr) {
        showAlert({
          type: "error",
          title: "QR não encontrado",
          message: "Nenhum QR Code de ativação foi identificado na imagem.",
        });
        return;
      }

      await onBarcodeScanned({ data: qr });
    } catch (error) {
      const msg = error?.message || "Erro ao ler QR Code da imagem.";
      showAlert({ type: "error", title: "Erro na leitura", message: msg });
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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient
        colors={["#050d1a", "#0b1a35", "#0a2a6e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Ionicons name="layers" size={24} color="#3f6cf6" />
          <Text style={styles.headerTitle}>ISOLVUS <Text style={styles.headerErp}>ERP</Text></Text>
        </View>

        <Text style={styles.titulo}>Ativar aplicativo</Text>

        <Text style={styles.subtitulo}>
          Peça ao administrador para gerar um QR Code em{"\n"}
          <Text style={styles.menuPath}>Configuração → Ativação Mobile</Text>
          {"\n"}e escaneie abaixo ou selecione uma imagem do álbum.
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
          <>
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

            <Pressable style={styles.galeriaBtn} onPress={handleSelecionarImagemQr}>
              <Ionicons name="images-outline" size={18} color="#cbd5e1" />
              <Text style={styles.galeriaBtnText}>Ler QR de imagem do álbum</Text>
            </Pressable>
          </>
        )}

        {lendo && !processando && (
          <Pressable style={styles.cancelBtn} onPress={() => setLendo(false)}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { alignItems: "center", paddingTop: 56, paddingBottom: 40, paddingHorizontal: 0 },
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
  galeriaBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    width: SW - 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  galeriaBtnText: { color: "#cbd5e1", fontSize: 14, fontWeight: "600" },
});
