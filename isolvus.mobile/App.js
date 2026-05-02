import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Platform, AppState, Text, Pressable } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Network from "expo-network";
import * as Location from "expo-location";
import * as Battery from "expo-battery";
import { Paths } from "expo-file-system";
import * as Application from "expo-application";
import { getCameraPermissionsAsync, requestCameraPermissionsAsync } from "expo-camera";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import AtivacaoScreen from "./src/screens/AtivacaoScreen";
import { AlertProvider } from "./src/components/CustomAlert/AlertProvider";
import api, { setBaseUrl } from "./src/services/api";

function mapBatteryState(state) {
  if (state === Battery.BatteryState.CHARGING) return "charging";
  if (state === Battery.BatteryState.FULL) return "full";
  if (state === Battery.BatteryState.UNPLUGGED) return "unplugged";
  return "unknown";
}

// Solicitar todas as permissões necessárias
async function solicitarPermissoes() {
  // Câmera
  try {
    const cam = await getCameraPermissionsAsync();
    if (cam.status !== "granted") await requestCameraPermissionsAsync();
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
  } catch {}

  // Localização background (só pede se foreground foi concedido)
  if (fgConcedido) {
    try { await Location.requestBackgroundPermissionsAsync(); } catch {}
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
async function montarPayloadHeartbeat() {
  const getIpPromise = typeof Network.getIpAddressAsync === "function"
    ? Network.getIpAddressAsync().catch(() => null)
    : Promise.resolve(null);

  const [ipLocalRaw, networkState, batteryLevel, batteryState, lowPowerMode] = await Promise.all([
    getIpPromise,
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
  } catch {
    locationInfo = { permission: "error", latitude: null, longitude: null };
  }

  const dispositivoResumo = `${Device.brand || "Device"} ${Device.modelName || "Mobile"} (${Device.osName || Platform.OS} ${Device.osVersion || Platform.Version || ""})`
    .slice(0, 200);

  // Coletar status das permissões
  const [permCamera, permNotif, permMic, permLocBg] = await Promise.all([
    (typeof getCameraPermissionsAsync === "function" ? getCameraPermissionsAsync() : Promise.resolve(null)).catch(() => null),
    Notifications.getPermissionsAsync().catch(() => null),
    (typeof Audio?.getPermissionsAsync === "function" ? Audio.getPermissionsAsync() : Promise.resolve(null)).catch(() => null),
    Location.getBackgroundPermissionsAsync().catch(() => null),
  ]);

  const permissoes = {
    camera: permCamera?.status ?? "unknown",
    notificacoes: permNotif?.status ?? "unknown",
    microfone: permMic?.status ?? "unknown",
    localizacao_foreground: locationInfo.permission,
    localizacao_background: permLocBg?.status ?? "unknown",
  };

  return {
    dispositivo: dispositivoResumo,
    dispositivo_info: {
      captured_at: new Date().toISOString(),
      source: "heartbeat",
      network: {
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
        state: AppState.currentState,
      },
      security: {
        is_rooted: await Device.isRootedExperimentalAsync().catch(() => null),
      },
      hardware: {
        total_memory_bytes: Device.totalMemory ?? null,
        cpu_architectures: Device.supportedCpuArchitectures ?? null,
      },
      permissoes,
    },
  };
}

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  // null = carregando, false = sem URL (precisa ativar), string = URL ok
  const [apiBaseUrl, setApiBaseUrl] = useState(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    solicitarPermissoes();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

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

  const handleRedefinir = useCallback(async () => {
    try {
      const [[, ativacaoId], [, idUsuarioStorage]] = await AsyncStorage.multiGet([
        "ativacao_id",
        "id_usuario",
      ]);

      const idUsuarioAtual = Number(usuarioLogado?.id_usuario || idUsuarioStorage || 0) || null;

      if (ativacaoId) {
        // Caso principal: temos o ID da ativação salvo
        await api.post(`/v1/mobile/ativacao/${ativacaoId}/redefinir`, {
          id_usuario: idUsuarioAtual,
        });
      } else if (idUsuarioAtual) {
        // Fallback: não temos o ID salvo (device ativado antes do recurso), usa endpoint por usuário
        await api.post("/v1/mobile/ativacao/redefinir-por-usuario", {
          id_usuario: idUsuarioAtual,
        });
      }
    } catch (error) {
      // Mesmo com falha de rede/API, ainda permite reset local.
      console.log("Falha ao redefinir ativação:", error?.message || error);
    }

    await AsyncStorage.multiRemove([
      "api_base_url",
      "ativacao_id",
      "usuario_vinculado_id_usuario",
      "usuario_vinculado_login",
      "usuario_vinculado_nome",
    ]);
    setUsuarioLogado(null);
    setApiBaseUrl(false);
  }, [usuarioLogado]);

  useEffect(() => {
    let intervalHeartbeat;
    let intervalBateria;
    let ultimaBateria = null;

    async function enviarHeartbeat(motivo = "intervalo") {
      try {
        const ativacaoId = await AsyncStorage.getItem("ativacao_id");
        if (!ativacaoId || !apiBaseUrl) return;

        const payload = await montarPayloadHeartbeat();
        const resposta = await api.post(`/v1/mobile/ativacao/${ativacaoId}/monitorar`, payload);
        const info = payload.dispositivo_info;
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

    if (apiBaseUrl) {
      enviarHeartbeat("inicio");
      intervalHeartbeat = setInterval(() => enviarHeartbeat("intervalo"), 10000);
      // Verifica bateria a cada 10s para detectar mudança de 1%
      intervalBateria = setInterval(verificarBateria, 10000);
    }

    return () => {
      if (intervalHeartbeat) clearInterval(intervalHeartbeat);
      if (intervalBateria) clearInterval(intervalBateria);
    };
  }, [apiBaseUrl]);

  // Ainda carregando AsyncStorage
  if (apiBaseUrl === null) return null;

  const bgColor = usuarioLogado ? "#0c1526" : "#050d1a";

  return (
    <SafeAreaProvider>
      <AlertProvider>
        <ErrorBoundary>
          <View style={[styles.container, { backgroundColor: bgColor }]}>
          <StatusBar style="light" backgroundColor={bgColor} />
          {!apiBaseUrl ? (
            <AtivacaoScreen
              onAtivacaoSucesso={handleAtivacaoSucesso}
            />
          ) : usuarioLogado ? (
            <HomeScreen user={usuarioLogado} onLogout={handleLogout} onRedefinir={handleRedefinir} />
          ) : (
            <LoginScreen onLoginSuccess={handleLoginSuccess} />
          )}
        </View>        </ErrorBoundary>      </AlertProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
