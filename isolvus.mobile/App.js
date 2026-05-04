import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Platform, AppState, Text, Pressable, Alert, Linking } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Network from "expo-network";
import * as Location from "expo-location";
import * as Battery from "expo-battery";
import { Paths } from "expo-file-system";
import * as Application from "expo-application";
import { Camera } from "expo-camera";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";
import * as TaskManager from "expo-task-manager";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import AtivacaoScreen from "./src/screens/AtivacaoScreen";
import { AlertProvider } from "./src/components/CustomAlert/AlertProvider";
import api, { setBaseUrl } from "./src/services/api";
import screenMirrorService from "./src/services/screenMirrorService";

// Nome da task de localização em background (deve ser definida fora de qualquer componente)
const LOCATION_BG_TASK = "isolvus-location-bg";
const STORAGE_USO_TOTAL_MS = "monitoramento_uso_total_ms";

// Task executada pelo OS mesmo com o app fechado ou após reboot do dispositivo
TaskManager.defineTask(LOCATION_BG_TASK, async ({ data, error }) => {
  if (error) return;
  const posicao = data?.locations?.[0];
  if (!posicao) return;
  try {
    const locationInfo = {
      latitude: posicao.coords.latitude,
      longitude: posicao.coords.longitude,
      accuracy_meters: posicao.coords.accuracy ?? null,
      captured_at: new Date(posicao.timestamp).toISOString(),
      source: "background_task",
    };
    // Salva localmente — heartbeat usa ao abrir o app
    await AsyncStorage.setItem("last_known_location", JSON.stringify(locationInfo));
    // Envia para a API imediatamente, sem esperar o heartbeat
    const [[, ativacaoId], [, baseUrl]] = await AsyncStorage.multiGet(["ativacao_id", "api_base_url"]);
    if (ativacaoId && baseUrl) {
      setBaseUrl(baseUrl);
      await api.post(`/v1/mobile/ativacao/${ativacaoId}/monitorar`, {
        dispositivo: "background",
        dispositivo_info: {
          captured_at: locationInfo.captured_at,
          source: "background_task",
          location: { ...locationInfo, permission: "granted" },
        },
      }).catch(() => {});
    }
  } catch {}
});

function mapBatteryState(state) {
  if (state === Battery.BatteryState.CHARGING) return "charging";
  if (state === Battery.BatteryState.FULL) return "full";
  if (state === Battery.BatteryState.UNPLUGGED) return "unplugged";
  return "unknown";
}

function normalizarStatusPermissao(resp) {
  if (!resp) return "unknown";
  if (typeof resp.status === "string") return resp.status;
  if (typeof resp.granted === "boolean") return resp.granted ? "granted" : "denied";
  return "unknown";
}

// Solicitar todas as permissões necessárias
async function solicitarPermissoes() {
  // Câmera
  try {
    const cam = await Camera.getCameraPermissionsAsync();
    if (normalizarStatusPermissao(cam) !== "granted") {
      await Camera.requestCameraPermissionsAsync();
    }
  } catch {}

  // Microfone
  try { await Audio.requestPermissionsAsync(); } catch {}

  // Notificações
  try { await Notifications.requestPermissionsAsync(); } catch {}

  // Localização foreground (obrigatório antes do background)
  let fgConcedido = false;
  try {
    const locFg = await Location.requestForegroundPermissionsAsync();
    fgConcedido = locFg?.status === "granted";
    console.log("[PERMISSOES] localizacao_foreground:", normalizarStatusPermissao(locFg));
  } catch {}

  // Localização background (só pede se foreground foi concedido)
  if (fgConcedido) {
    try {
      const bgAtual = await Location.getBackgroundPermissionsAsync();
      const bgAtualStatus = normalizarStatusPermissao(bgAtual);
      console.log("[PERMISSOES] localizacao_background (antes):", bgAtualStatus);

      if (bgAtualStatus !== "granted" && bgAtual?.canAskAgain !== false) {
        const bgSolicitada = await Location.requestBackgroundPermissionsAsync();
        console.log("[PERMISSOES] localizacao_background (solicitada):", normalizarStatusPermissao(bgSolicitada));
      }

      const bgFinal = await Location.getBackgroundPermissionsAsync();
      console.log("[PERMISSOES] localizacao_background (final):", normalizarStatusPermissao(bgFinal));
    } catch {}
  } else {
    console.log("[PERMISSOES] localizacao_background: nao solicitada (foreground negada)");
  }
}

async function checarPermissoesCriticas() {
  const [permCam, permMic, permNotif, permLocFg] = await Promise.all([
    Camera.getCameraPermissionsAsync().catch(() => null),
    Audio.getPermissionsAsync().catch(() => null),
    Notifications.getPermissionsAsync().catch(() => null),
    Location.getForegroundPermissionsAsync().catch(() => null),
  ]);
  const statuses = {
    camera: normalizarStatusPermissao(permCam),
    microfone: normalizarStatusPermissao(permMic),
    notificacoes: normalizarStatusPermissao(permNotif),
    localizacao: normalizarStatusPermissao(permLocFg),
  };
  const todasOk = Object.values(statuses).every((s) => s === "granted");
  return { ok: todasOk, statuses };
}

async function solicitarPermissaoPorTipo(tipoPermissao) {
  if (tipoPermissao === "camera") {
    return Camera.requestCameraPermissionsAsync();
  }
  if (tipoPermissao === "microfone") {
    return Audio.requestPermissionsAsync();
  }
  if (tipoPermissao === "notificacoes") {
    return Notifications.requestPermissionsAsync();
  }
  if (tipoPermissao === "localizacao_foreground") {
    return Location.requestForegroundPermissionsAsync();
  }
  if (tipoPermissao === "localizacao_background") {
    return Location.requestBackgroundPermissionsAsync();
  }
  throw new Error(`Tipo de permissao nao suportado: ${String(tipoPermissao || "")}`);
}

const PERM_LABEL = {
  camera: "Câmera",
  microfone: "Microfone",
  notificacoes: "Notificações",
  localizacao_foreground: "Localização",
  localizacao_background: "Localização em segundo plano",
};

async function executarComandoRemoto(ativacaoId, comando, viewShotRef, onEspelhamentoChange, onForcarReativacao) {
  if (!comando) return;

  const tipo = comando?.tipo;

  // Comando para iniciar espelhamento
  if (tipo === "iniciar_espelhamento") {
    try {
      if (viewShotRef?.current) {
        await screenMirrorService.startMirroring(viewShotRef.current, ativacaoId, 140);
        onEspelhamentoChange?.(true);
        console.log("[ESPELHO] Espelhamento iniciado com sucesso");
        await api.post(`/v1/mobile/ativacao/${ativacaoId}/comandos/ack`, {
          id_comando: comando.id_comando,
          status_execucao: "done",
          erro: null,
        }).catch(() => {});
      } else {
        throw new Error("ViewShot ref não disponível");
      }
    } catch (erroExec) {
      onEspelhamentoChange?.(false);
      console.log("[ESPELHO] Erro ao iniciar:", erroExec?.message);
      await api.post(`/v1/mobile/ativacao/${ativacaoId}/comandos/ack`, {
        id_comando: comando.id_comando,
        status_execucao: "failed",
        erro: erroExec?.message || String(erroExec),
      }).catch(() => {});
    }
    return;
  }

  // Comando para parar espelhamento
  if (tipo === "parar_espelhamento") {
    try {
      screenMirrorService.stopMirroring();
      onEspelhamentoChange?.(false);
      console.log("[ESPELHO] Espelhamento parado");
      await api.post(`/v1/mobile/ativacao/${ativacaoId}/comandos/ack`, {
        id_comando: comando.id_comando,
        status_execucao: "done",
        erro: null,
      }).catch(() => {});
    } catch (erroExec) {
      onEspelhamentoChange?.(false);
      await api.post(`/v1/mobile/ativacao/${ativacaoId}/comandos/ack`, {
        id_comando: comando.id_comando,
        status_execucao: "failed",
        erro: erroExec?.message || String(erroExec),
      }).catch(() => {});
    }
    return;
  }

  // Comando original de permissão
  if (tipo === "redefinir_ativacao") {
    try {
      await api.post(`/v1/mobile/ativacao/${ativacaoId}/comandos/ack`, {
        id_comando: comando.id_comando,
        status_execucao: "done",
        erro: null,
      }).catch(() => {});

      await onForcarReativacao?.();
    } catch (erroExecucao) {
      await api.post(`/v1/mobile/ativacao/${ativacaoId}/comandos/ack`, {
        id_comando: comando.id_comando,
        status_execucao: "failed",
        erro: erroExecucao?.message || String(erroExecucao),
      }).catch(() => {});

      // Mesmo com falha no ACK, forca reset local para exigir novo QR.
      await onForcarReativacao?.();
    }
    return;
  }

  // Comando original de permissão
  if (tipo !== "solicitar_permissao") return;

  const tipoPermissao = comando?.payload?.permissao;
  try {
    const resposta = await solicitarPermissaoPorTipo(tipoPermissao);
    const status = normalizarStatusPermissao(resposta);

    if (status === "granted") {
      // Permissão já concedida — nada a fazer
      await api.post(`/v1/mobile/ativacao/${ativacaoId}/comandos/ack`, {
        id_comando: comando.id_comando,
        status_execucao: "done",
        erro: null,
      }).catch(() => {});
      return;
    }

    // Permissão negada ou restrita — iOS não mostra o dialog novamente
    // Mostrar alerta para o usuário abrir as Configurações manualmente
    const label = PERM_LABEL[tipoPermissao] || tipoPermissao;
    Alert.alert(
      "Permissão necessária",
      `O administrador solicitou acesso à permissão "${label}".\n\nEssa permissão foi negada anteriormente. Para concedê-la, acesse as Configurações do dispositivo.`,
      [
        { text: "Agora não", style: "cancel" },
        {
          text: "Abrir Configurações",
          onPress: () => Linking.openSettings(),
        },
      ],
      { cancelable: true },
    );

    await api.post(`/v1/mobile/ativacao/${ativacaoId}/comandos/ack`, {
      id_comando: comando.id_comando,
      status_execucao: "done_no_grant",
      erro: `Permissao retornou status=${status}. Usuario direcionado para Configuracoes.`,
    }).catch(() => {});
  } catch (erroExecucao) {
    await api.post(`/v1/mobile/ativacao/${ativacaoId}/comandos/ack`, {
      id_comando: comando.id_comando,
      status_execucao: "failed",
      erro: erroExecucao?.message || String(erroExecucao),
    }).catch(() => {});
  }
}

// Registrar crash da aplicação
async function registrarCrash(erro, contexto = "erro_nao_capturado") {
  try {
    const ativacaoId = await AsyncStorage.getItem("ativacao_id");
    if (!ativacaoId) return; // Sem ativação, não envia

    const mensagem = erro?.toString?.() || String(erro);
    const stack = erro?.stack || "sem_stack";
    const timestamp = new Date().toISOString();

    console.log(`[CRASH ${timestamp}] ${contexto}: ${mensagem}`);

    // Enviar para backend (sem aguardar resposta para não travar app)
    api.post(`/v1/mobile/ativacao/${ativacaoId}/registrar-erro`, {
      contexto,
      mensagem,
      stack: stack.slice(0, 500), // Limitar tamanho
      timestamp,
    }).catch(() => {
      // Falha silenciosa — não interrompe fluxo
    });
  } catch (e) {
    console.error("Erro ao registrar crash:", e);
  }
}

// Error boundary para capturar erros de render
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { hasError: true, erro };
  }

  componentDidCatch(erro, errorInfo) {
    registrarCrash(erro, "error_boundary_react");
    console.error("Error caught by boundary:", erro, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10, color: "red" }}>
            Erro na aplicação
          </Text>
          <Text style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
            {this.state.erro?.message || "Ocorreu um erro inesperado"}
          </Text>
          <Pressable
            style={{
              paddingVertical: 10,
              paddingHorizontal: 20,
              backgroundColor: "#3f6cf6",
              borderRadius: 6,
            }}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Tentar novamente</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

// Payload enxuto — enviado a cada heartbeat (bateria + localização + rede + timestamp)
async function montarPayloadHeartbeat(locationCached = null, usageStats = null) {
  const getIpPromise = typeof Network.getIpAddressAsync === "function"
    ? Network.getIpAddressAsync().catch(() => null)
    : Promise.resolve(null);

  const getMacPromise = typeof Network.getMacAddressAsync === "function"
    ? Network.getMacAddressAsync().catch(() => null)
    : Promise.resolve(null);

  const [ipLocalRaw, macRaw, networkState, batteryLevel, batteryState, lowPowerMode] = await Promise.all([
    getIpPromise,
    getMacPromise,
    Network.getNetworkStateAsync().catch(() => null),
    Battery.getBatteryLevelAsync().catch(() => null),
    Battery.getBatteryStateAsync().catch(() => null),
    Battery.isLowPowerModeEnabledAsync().catch(() => null),
  ]);

  let locationInfo = { permission: "unknown", latitude: null, longitude: null };

  try {
    const permissao = await Location.getForegroundPermissionsAsync();
    locationInfo.permission = permissao.status;

    if (permissao.status === "granted") {
      if (locationCached && locationCached.latitude != null) {
        locationInfo = { ...locationCached, permission: permissao.status };
      } else {
        const posicao = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        locationInfo = {
          permission: permissao.status,
          latitude: posicao?.coords?.latitude ?? null,
          longitude: posicao?.coords?.longitude ?? null,
          accuracy_meters: posicao?.coords?.accuracy ?? null,
          captured_at: posicao?.timestamp ? new Date(posicao.timestamp).toISOString() : null,
        };
      }
    }
  } catch {
    locationInfo = { permission: "error", latitude: null, longitude: null };
  }

  const dispositivoResumo = `${Device.brand || "Device"} ${Device.modelName || "Mobile"} (${Device.osName || Platform.OS} ${Device.osVersion || Platform.Version || ""})`
    .slice(0, 200);

  // Coletar status das permissões
  const [permCamera, permNotif, permMic, permLocBg] = await Promise.all([
    Camera.getCameraPermissionsAsync().catch(() => null),
    Notifications.getPermissionsAsync().catch(() => null),
    Audio.getPermissionsAsync().catch(() => null),
    Location.getBackgroundPermissionsAsync().catch(() => null),
  ]);

  const permissoes = {
    camera: normalizarStatusPermissao(permCamera),
    notificacoes: normalizarStatusPermissao(permNotif),
    microfone: normalizarStatusPermissao(permMic),
    localizacao_foreground: locationInfo.permission || "unknown",
    localizacao_background: normalizarStatusPermissao(permLocBg),
  };

  return {
    dispositivo: dispositivoResumo,
    dispositivo_info: {
      captured_at: new Date().toISOString(),
      source: "heartbeat",
      usage: usageStats,
      network: {
        mac_address: macRaw ? String(macRaw).trim().toUpperCase() : null,
        ip_local: ipLocalRaw ? String(ipLocalRaw) : null,
        type: networkState?.type || null,
        is_connected: Boolean(networkState?.isConnected),
        is_internet_reachable: networkState?.isInternetReachable ?? null,
      },
      battery: {
        level: typeof batteryLevel === "number" ? parseFloat((batteryLevel * 100).toFixed(2)) : null,
        state: mapBatteryState(batteryState),
        low_power_mode: lowPowerMode,
      },
      location: locationInfo,
      storage: {
        free_bytes: Paths.availableDiskSpace ?? null,
        total_bytes: Paths.totalDiskSpace ?? null,
      },
      app: {
        version: Application.nativeApplicationVersion || null,
        build: Application.nativeBuildVersion || null,
        platform: Platform.OS,
        state: AppState.currentState,
      },
      security: {
        is_rooted: await Device.isRootedExperimentalAsync().catch(() => null),
      },
      hardware: {
        total_memory_bytes: Device.totalMemory ?? null,
        cpu_architectures: Device.supportedCpuArchitectures ?? null,
        device_id: Platform.OS === "android"
          ? (Application.androidId || null)
          : await Application.getIosIdForVendorAsync().catch(() => null),
      },
      permissoes,
    },
  };
}

const PERMS_ITENS = [
  {
    key: "camera",
    icone: "📷",
    titulo: "Câmera",
    descricao: "Necessária para leitura do QR Code de ativação do dispositivo.",
  },
  {
    key: "microfone",
    icone: "🎙️",
    titulo: "Microfone",
    descricao: "Utilizado para comunicação por voz com a IA, envio de áudios e mensagens de voz.",
  },
  {
    key: "notificacoes",
    icone: "🔔",
    titulo: "Notificações",
    descricao: "Utilizada para o envio de alertas, avisos operacionais e comunicados importantes.",
  },
  {
    key: "localizacao",
    icone: "📍",
    titulo: "Localização",
    descricao: "Requerida para rastreamento, monitoramento de campo e registro de presença.",
  },
];

function PermissoesNecessariasScreen({ onVerificar, statuses = {} }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28, backgroundColor: "#050d1a" }}>

      {/* Cabeçalho */}
      <View style={{ alignItems: "center", marginBottom: 28 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#1e2d4a", justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 26 }}>🔒</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#f1f5f9", textAlign: "center", marginBottom: 10 }}>
          Autorização de Acesso Necessária
        </Text>
        <Text style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 21 }}>
          Para garantir o pleno funcionamento do sistema, é imprescindível que as permissões abaixo sejam concedidas. Sem elas, o aplicativo não poderá operar corretamente.
        </Text>
      </View>

      {/* Lista de permissões */}
      <View style={{ backgroundColor: "#0c1526", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        {PERMS_ITENS.map((item, idx) => {
          const status = statuses[item.key];
          const concedida = status === "granted";
          const verificada = !!status;
          return (
            <View
              key={item.key}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                padding: 14,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: "#1e293b",
              }}
            >
              <Text style={{ fontSize: 20, marginRight: 12, marginTop: 1 }}>{item.icone}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#e2e8f0", marginBottom: 3 }}>{item.titulo}</Text>
                <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 18 }}>{item.descricao}</Text>
              </View>
              {verificada && (
                <View style={{
                  marginLeft: 10,
                  marginTop: 2,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: concedida ? "#052e16" : "#2d0a0a",
                  borderWidth: 1,
                  borderColor: concedida ? "#22c55e" : "#ef4444",
                  justifyContent: "center",
                  alignItems: "center",
                }}>
                  <Text style={{ fontSize: 13, color: concedida ? "#22c55e" : "#ef4444", fontWeight: "700" }}>
                    {concedida ? "✓" : "✗"}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Instrução */}
      <View style={{ backgroundColor: "#1a1f2e", borderRadius: 10, padding: 14, marginBottom: 24, borderLeftWidth: 3, borderLeftColor: "#f59e0b" }}>
        <Text style={{ fontSize: 12, color: "#94a3b8", lineHeight: 19 }}>
          <Text style={{ fontWeight: "700", color: "#f59e0b" }}>Como conceder: </Text>
          Acesse <Text style={{ fontWeight: "600", color: "#cbd5e1" }}>Ajustes → {Platform.OS === "ios" ? "Expo Go" : "Aplicativos → ISOLVUS"} → Permissões</Text> e habilite cada item listado acima.
        </Text>
      </View>

      {/* Botões */}
      <Pressable
        style={{ backgroundColor: "#3f6cf6", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginBottom: 10 }}
        onPress={() => Linking.openSettings()}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Abrir Configurações</Text>
      </Pressable>
      <Pressable
        style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 8, paddingVertical: 12, alignItems: "center" }}
        onPress={onVerificar}
      >
        <Text style={{ color: "#94a3b8", fontWeight: "600", fontSize: 14 }}>Já concedi as permissões — Verificar</Text>
      </Pressable>

    </View>
  );
}

function AtualizacaoObrigatoriaScreen({ dados, onVerificar }) {
  const plataforma = dados?.plataforma === "ios" ? "App Store" : "Play Store";
  const urlPadraoLoja = dados?.plataforma === "ios"
    ? "https://apps.apple.com/"
    : "https://play.google.com/store/apps";

  return (
    <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28, backgroundColor: "#050d1a" }}>
      <View style={{ alignItems: "center", marginBottom: 28 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#1e2d4a", justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 26 }}>⬆️</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#f1f5f9", textAlign: "center", marginBottom: 10 }}>
          Atualizacao obrigatoria
        </Text>
        <Text style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 21 }}>
          {dados?.mensagem || "Uma nova versao do aplicativo e obrigatoria para continuar o uso."}
        </Text>
      </View>

      <View style={{ backgroundColor: "#0c1526", borderRadius: 12, padding: 14, marginBottom: 22, borderWidth: 1, borderColor: "#1e293b" }}>
        <Text style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 6 }}>
          Versao atual (build): <Text style={{ fontWeight: "700" }}>{dados?.build_atual ?? "-"}</Text>
        </Text>
        <Text style={{ color: "#cbd5e1", fontSize: 13 }}>
          Build minimo exigido: <Text style={{ fontWeight: "700" }}>{dados?.min_build ?? "-"}</Text>
        </Text>
      </View>

      <Pressable
        style={{ backgroundColor: "#3f6cf6", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginBottom: 10 }}
        onPress={() => {
          const urlDestino = String(dados?.store_url || urlPadraoLoja);
          Linking.openURL(urlDestino).catch(() => {
            Alert.alert("Falha ao abrir loja", `Nao foi possivel abrir a ${plataforma}.`);
          });
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Atualizar agora</Text>
      </Pressable>

      <Pressable
        style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 8, paddingVertical: 12, alignItems: "center" }}
        onPress={onVerificar}
      >
        <Text style={{ color: "#94a3b8", fontWeight: "600", fontSize: 14 }}>Ja atualizei - Verificar novamente</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  // null = carregando, false = sem URL (precisa ativar), string = URL ok
  const [apiBaseUrl, setApiBaseUrl] = useState(null);
  // null = validando vínculo, true = vínculo confirmado, false = sem vínculo
  const [vinculoConfirmado, setVinculoConfirmado] = useState(null);
  // null = verificando, true = ok, false = bloqueado
  const [permissoesOk, setPermissoesOk] = useState(null);
  const [permissoesStatuses, setPermissoesStatuses] = useState({});
  const [atualizacaoObrigatoria, setAtualizacaoObrigatoria] = useState(null);
  const [espelhamentoAtivo, setEspelhamentoAtivo] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const comandosProcessadosRef = useRef(new Set());
  const viewShotRef = useRef(null);
  const locationCacheRef = useRef(null);
  const locationWatcherRef = useRef(null);
  const usoSessaoMsRef = useRef(0);
  const usoTotalMsRef = useRef(0);
  const usoAtivoDesdeRef = useRef(AppState.currentState === "active" ? Date.now() : null);

  const iniciarUsoAtivo = useCallback(() => {
    if (usoAtivoDesdeRef.current == null) {
      usoAtivoDesdeRef.current = Date.now();
    }
  }, []);

  const consolidarUsoAtivo = useCallback(async () => {
    if (usoAtivoDesdeRef.current == null) return;
    const deltaMs = Math.max(0, Date.now() - usoAtivoDesdeRef.current);
    usoAtivoDesdeRef.current = null;
    if (deltaMs <= 0) return;
    usoSessaoMsRef.current += deltaMs;
    usoTotalMsRef.current += deltaMs;
    await AsyncStorage.setItem(STORAGE_USO_TOTAL_MS, String(usoTotalMsRef.current)).catch(() => {});
  }, []);

  const obterResumoUso = useCallback(() => {
    const emAndamentoMs = usoAtivoDesdeRef.current != null
      ? Math.max(0, Date.now() - usoAtivoDesdeRef.current)
      : 0;
    const sessaoMs = usoSessaoMsRef.current + emAndamentoMs;
    const totalMs = usoTotalMsRef.current + emAndamentoMs;
    return {
      active_now: usoAtivoDesdeRef.current != null,
      session_ms: sessaoMs,
      session_seconds: Math.floor(sessaoMs / 1000),
      total_ms: totalMs,
      total_seconds: Math.floor(totalMs / 1000),
    };
  }, []);

  useEffect(() => {
    async function inicializarPermissoes() {
      await solicitarPermissoes();
      const { ok, statuses } = await checarPermissoesCriticas();
      setPermissoesStatuses(statuses);
      setPermissoesOk(ok);
    }
    inicializarPermissoes();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_USO_TOTAL_MS)
      .then((valor) => {
        const n = Number(valor || 0);
        usoTotalMsRef.current = Number.isFinite(n) && n > 0 ? n : 0;
      })
      .catch(() => {});
  }, []);

  // Carrega última posição conhecida (salva pela task de background) ao iniciar
  useEffect(() => {
    AsyncStorage.getItem("last_known_location").then((json) => {
      if (json) {
        try { locationCacheRef.current = JSON.parse(json); } catch {}
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    async function iniciarWatcherLocalizacao() {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== "granted") return;

        // watchPositionAsync: atualiza cache em tempo real quando app está aberto
        locationWatcherRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
          (posicao) => {
            const loc = {
              latitude: posicao?.coords?.latitude ?? null,
              longitude: posicao?.coords?.longitude ?? null,
              accuracy_meters: posicao?.coords?.accuracy ?? null,
              captured_at: posicao?.timestamp ? new Date(posicao.timestamp).toISOString() : null,
            };
            locationCacheRef.current = loc;
            // Persiste também para background
            AsyncStorage.setItem("last_known_location", JSON.stringify(loc)).catch(() => {});
          }
        );

        // startLocationUpdatesAsync: continua rodando com app fechado e após reboot
        const bgPerm = await Location.getBackgroundPermissionsAsync();
        if (bgPerm.status === "granted") {
          const jaAtiva = await Location.hasStartedLocationUpdatesAsync(LOCATION_BG_TASK).catch(() => false);
          if (!jaAtiva) {
            await Location.startLocationUpdatesAsync(LOCATION_BG_TASK, {
              accuracy: Location.Accuracy.Balanced,
              distanceInterval: 50,
              timeInterval: 60000,
              foregroundService: {
                notificationTitle: "ISOLVUS Monitoramento",
                notificationBody: "Monitorando localização do dispositivo.",
                notificationColor: "#3f6cf6",
              },
              pausesUpdatesAutomatically: false,
            });
          }
        }
      } catch {}
    }

    if (permissoesOk) iniciarWatcherLocalizacao();

    return () => {
      locationWatcherRef.current?.remove();
      locationWatcherRef.current = null;
      // Não para a task de background no cleanup — ela precisa continuar rodando
    };
  }, [permissoesOk]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (nextState) => {
      const anterior = appStateRef.current;
      appStateRef.current = nextState;

      if (anterior === "active" && nextState !== "active") {
        await consolidarUsoAtivo();
      }

      if (nextState === "active" && anterior !== "active") {
        iniciarUsoAtivo();
      }

      // Re-verifica permissões ao retornar de Configurações
      if (nextState === "active" && anterior !== "active") {
        const { ok, statuses } = await checarPermissoesCriticas();
        setPermissoesStatuses(statuses);
        setPermissoesOk(ok);
      }
    });
    return () => sub.remove();
  }, [consolidarUsoAtivo, iniciarUsoAtivo]);

  useEffect(() => {
    return () => {
      consolidarUsoAtivo();
    };
  }, [consolidarUsoAtivo]);

  // Registrar erro global não capturado
  useEffect(() => {
    const EU = global.ErrorUtils;
    if (!EU) return;
    const handlerAnterior = EU.getGlobalHandler();
    EU.setGlobalHandler((erro, isFatal) => {
      registrarCrash(erro, isFatal ? "erro_fatal_nativo" : "erro_global");
      handlerAnterior?.(erro, isFatal);
    });
    return () => {
      if (handlerAnterior) EU.setGlobalHandler(handlerAnterior);
    };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("api_base_url").then((url) => {
      if (url) {
        setBaseUrl(url);
        setApiBaseUrl(url);
      } else {
        setApiBaseUrl(false);
      }
    });
  }, []);

  const handleLoginSuccess = useCallback((usuario) => {
    setUsuarioLogado(usuario);
  }, []);

  const handleLogout = useCallback(() => {
    setUsuarioLogado(null);
  }, []);

  const handleAtivacaoSucesso = useCallback((url) => {
    setApiBaseUrl(url);
  }, []);

  const limparAtivacaoLocal = useCallback(async () => {
    screenMirrorService.stopMirroring();
    await AsyncStorage.multiRemove([
      "api_base_url",
      "ativacao_id",
      "usuario_vinculado_id_usuario",
      "usuario_vinculado_login",
      "usuario_vinculado_nome",
    ]);
    // Para a task de background ao desativar o dispositivo
    await Location.hasStartedLocationUpdatesAsync(LOCATION_BG_TASK)
      .then((ativa) => ativa ? Location.stopLocationUpdatesAsync(LOCATION_BG_TASK) : null)
      .catch(() => {});
    await AsyncStorage.removeItem("last_known_location").catch(() => {});
    comandosProcessadosRef.current.clear();
    setEspelhamentoAtivo(false);
    setUsuarioLogado(null);
    setApiBaseUrl(false);
    setVinculoConfirmado(false);
  }, []);

  const validarVinculoNaApi = useCallback(async () => {
    if (!apiBaseUrl) {
      setVinculoConfirmado(false);
      return;
    }

    setVinculoConfirmado(null);

    try {
      const ativacaoId = await AsyncStorage.getItem("ativacao_id");

      // Sem id de ativacao local nao pode usar o app.
      if (!ativacaoId) {
        await limparAtivacaoLocal();
        return;
      }

      const payload = await montarPayloadHeartbeat(locationCacheRef.current, obterResumoUso());
      const resposta = await api.post(`/v1/mobile/ativacao/${ativacaoId}/monitorar`, payload);
      const atualizacao = resposta?.data?.atualizacao || null;

      setAtualizacaoObrigatoria(atualizacao?.obrigatoria ? atualizacao : null);
      setVinculoConfirmado(true);
    } catch (error) {
      const status = Number(error?.response?.status || 0);

      // Sem vinculo ativo no backend: bloqueia e volta para ativacao.
      if (status === 404 || status === 409) {
        await limparAtivacaoLocal();
        return;
      }

      // Em falha de rede/API, nao derruba sessao automaticamente.
      setVinculoConfirmado(true);
    }
  }, [apiBaseUrl, limparAtivacaoLocal, obterResumoUso]);

  useEffect(() => {
    if (!apiBaseUrl) {
      if (apiBaseUrl === false) setVinculoConfirmado(false);
      return;
    }

    validarVinculoNaApi();
  }, [apiBaseUrl, validarVinculoNaApi]);

  useEffect(() => {
    let intervalHeartbeat;
    let intervalBateria;
    let ultimaBateria = null;

    async function enviarHeartbeat(motivo = "intervalo") {
      try {
        const ativacaoId = await AsyncStorage.getItem("ativacao_id");
        if (!ativacaoId || !apiBaseUrl) return;

        const payload = await montarPayloadHeartbeat(locationCacheRef.current, obterResumoUso());
        const resposta = await api.post(`/v1/mobile/ativacao/${ativacaoId}/monitorar`, payload);
        const info = payload.dispositivo_info;
        const comando = resposta?.data?.comando || null;
        const atualizacao = resposta?.data?.atualizacao || null;

        if (atualizacao?.obrigatoria) {
          setAtualizacaoObrigatoria(atualizacao);
          return;
        }

        setAtualizacaoObrigatoria(null);

        if (comando?.id_comando && !comandosProcessadosRef.current.has(comando.id_comando)) {
          comandosProcessadosRef.current.add(comando.id_comando);
          await executarComandoRemoto(
            ativacaoId,
            comando,
            viewShotRef,
            setEspelhamentoAtivo,
            limparAtivacaoLocal,
          );
        }

        console.log(
          `\n[HEARTBEAT ${new Date().toLocaleTimeString("pt-BR")} — motivo: ${motivo}]`,
          JSON.stringify({
            http: resposta.status,
            retorno: resposta.data,
            bateria: {
              nivel: `${info.battery.level ?? "?"}%`,
              estado: info.battery.state,
              economia: info.battery.low_power_mode,
            },
            rede: {
              ip: info.network.ip_local,
              tipo: info.network.type,
              conectado: info.network.is_connected,
              internet: info.network.is_internet_reachable,
            },
            gps: info.location.latitude != null
              ? {
                  lat: info.location.latitude,
                  lon: info.location.longitude,
                  precisao_m: info.location.accuracy_meters,
                }
              : { permissao: info.location.permission },
            storage: {
              livre: info.storage.free_bytes != null ? `${(info.storage.free_bytes / 1e9).toFixed(2)} GB` : null,
              total: info.storage.total_bytes != null ? `${(info.storage.total_bytes / 1e9).toFixed(2)} GB` : null,
            },
            app: {
              versao: info.app.version,
              build: info.app.build,
              estado: info.app.state,
            },
            uso: info.usage ?? null,
            seguranca: {
              rooted: info.security.is_rooted,
            },
            hardware: {
              memoria_total: info.hardware?.total_memory_bytes != null
                ? `${(info.hardware.total_memory_bytes / 1e9).toFixed(1)} GB`
                : null,
              cpu: info.hardware?.cpu_architectures ?? null,
            },
            permissoes: info.permissoes ?? null,
          }, null, 2),
        );
      } catch (error) {
        console.log(`[HEARTBEAT ERRO ${new Date().toLocaleTimeString("pt-BR")}]`, error?.message || error);
        // Se a ativação foi deletada no servidor, resetar o app para a tela de QR.
        if (error?.response?.status === 404 || error?.response?.status === 409) {
          console.log("[HEARTBEAT] Ativação não encontrada no servidor. Resetando dispositivo.");
          await limparAtivacaoLocal();
        }
      }
    }

    async function verificarBateria() {
      try {
        const nivel = await Battery.getBatteryLevelAsync();
        const nivelAtual = parseFloat((nivel * 100).toFixed(2));
        if (ultimaBateria !== null && nivelAtual !== ultimaBateria) {
          console.log(`[BATERIA MUDOU] ${ultimaBateria}% → ${nivelAtual}%`);
          ultimaBateria = nivelAtual;
          enviarHeartbeat("bateria_mudou");
        } else {
          ultimaBateria = nivelAtual;
        }
      } catch {
        // ignora erro de leitura
      }
    }

    if (apiBaseUrl && vinculoConfirmado === true) {
      enviarHeartbeat("inicio");
      intervalHeartbeat = setInterval(() => enviarHeartbeat("intervalo"), 10000);
      // Verifica bateria a cada 10s para detectar mudança de 1%
      intervalBateria = setInterval(verificarBateria, 10000);
    }

    return () => {
      if (intervalHeartbeat) clearInterval(intervalHeartbeat);
      if (intervalBateria) clearInterval(intervalBateria);
    };
  }, [apiBaseUrl, vinculoConfirmado, limparAtivacaoLocal, obterResumoUso]);

  // Ainda carregando AsyncStorage ou verificando permissões
  if (apiBaseUrl === null || permissoesOk === null) return null;

  // Com API ativa, so libera o uso apos validar vinculo no backend.
  if (apiBaseUrl && vinculoConfirmado === null) return null;

  // Permissões críticas negadas — bloqueia até que sejam concedidas
  if (!permissoesOk) {
    return (
      <SafeAreaProvider>
        <PermissoesNecessariasScreen
          statuses={permissoesStatuses}
          onVerificar={async () => {
            const { ok, statuses } = await checarPermissoesCriticas();
            setPermissoesStatuses(statuses);
            setPermissoesOk(ok);
          }}
        />
      </SafeAreaProvider>
    );
  }

  if (atualizacaoObrigatoria?.obrigatoria) {
    return (
      <SafeAreaProvider>
        <AtualizacaoObrigatoriaScreen
          dados={atualizacaoObrigatoria}
          onVerificar={async () => {
            try {
              const ativacaoId = await AsyncStorage.getItem("ativacao_id");
              if (!ativacaoId || !apiBaseUrl) return;

              const payload = await montarPayloadHeartbeat(locationCacheRef.current, obterResumoUso());
              const resposta = await api.post(`/v1/mobile/ativacao/${ativacaoId}/monitorar`, payload);
              const atualizacao = resposta?.data?.atualizacao || null;
              setAtualizacaoObrigatoria(atualizacao?.obrigatoria ? atualizacao : null);
            } catch {
              // Mantem bloqueado em caso de falha de rede
            }
          }}
        />
      </SafeAreaProvider>
    );
  }

  const bgColor = usuarioLogado ? "#0c1526" : "#050d1a";

  return (
    <SafeAreaProvider>
      <AlertProvider>
        <ErrorBoundary>
          <View ref={viewShotRef} collapsable={false} style={[styles.container, { backgroundColor: bgColor }]}> 
            <StatusBar style="light" backgroundColor={bgColor} />
            {!apiBaseUrl ? (
              <AtivacaoScreen
                onAtivacaoSucesso={handleAtivacaoSucesso}
              />
            ) : usuarioLogado ? (
              <HomeScreen
                user={usuarioLogado}
                onLogout={handleLogout}
                espelhandoTela={espelhamentoAtivo}
              />
            ) : (
              <LoginScreen onLoginSuccess={handleLoginSuccess} />
            )}
          </View>
        </ErrorBoundary>
      </AlertProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
