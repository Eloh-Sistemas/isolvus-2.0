import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Application from "expo-application";
import api from "../services/api";
import { colors } from "../theme/colors";
import { useShowAlert } from "../components/CustomAlert/AlertProvider";

const FRASES = [
  "Tecnologia que\npotencializa negócios.",
  "Gestão inteligente\nna palma da mão.",
  "Controle total\nda sua empresa.",
  "Simplicidade e\neficiência em um só lugar.",
  "Acesse onde\ne quando quiser.",
];

export default function LoginScreen({ onLoginSuccess }) {
  const showAlert = useShowAlert();
  const { height: screenHeight } = useWindowDimensions();
  const [user, setUser] = useState("");
  const [usuarioVinculado, setUsuarioVinculado] = useState(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [erroCredencial, setErroCredencial] = useState(false);
  const [campoFocado, setCampoFocado] = useState(null);
  const [fraseIndex, setFraseIndex] = useState(0);
  const [lembrar, setLembrar] = useState(false);
  const [autoLogando, setAutoLogando] = useState(false);

  const shakeX = useRef(new Animated.Value(0)).current;
  const fraseOpacity = useRef(new Animated.Value(1)).current;
  const scanY = useRef(new Animated.Value(0)).current;
  const heroHeight = useMemo(() => Math.max(220, Math.round(screenHeight * 0.28)), [screenHeight]);
  const versaoLabel = useMemo(() => {
    const versao = Application.nativeApplicationVersion || "-";
    const build = Application.nativeBuildVersion || "-";
    return `Versao ${versao} (${build})`;
  }, []);

  useEffect(() => {
    const intervalo = setInterval(() => {
      Animated.timing(fraseOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setFraseIndex((i) => (i + 1) % FRASES.length);
        Animated.timing(fraseOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);
    return () => clearInterval(intervalo);
  }, [fraseOpacity]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, {
          toValue: heroHeight,
          duration: 5000,
          useNativeDriver: true,
        }),
        Animated.timing(scanY, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanY, heroHeight]);

  useEffect(() => {
    AsyncStorage.multiGet([
      "usuario_vinculado_login",
      "usuario_vinculado_nome",
      "salvar_login",
      "salvar_senha",
    ])
      .then(async (items) => {
        const mapa = Object.fromEntries(items);
        const loginVinculado = String(mapa.usuario_vinculado_login || "").trim();
        const nomeVinculado = String(mapa.usuario_vinculado_nome || "").trim();
        const loginSalvo = String(mapa.salvar_login || "").trim();
        const senhaSalva = String(mapa.salvar_senha || "").trim();

        if (loginVinculado) {
          setUser(loginVinculado);
          setUsuarioVinculado({ login: loginVinculado, nome: nomeVinculado });
        } else {
          setUsuarioVinculado(null);
        }

        if (loginSalvo && senhaSalva) {
          setUser(loginSalvo);
          setPassword(senhaSalva);
          setLembrar(true);
          setAutoLogando(true);
          await acessarComCredenciais(loginSalvo, senhaSalva);
          setAutoLogando(false);
        }
      })
      .catch(() => setUsuarioVinculado(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buttonLabel = useMemo(() => {
    if (autoLogando) return "Entrando automaticamente...";
    if (loading) return "Autenticando...";
    if (erroCredencial) return "Credenciais inválidas";
    return "Entrar";
  }, [autoLogando, erroCredencial, loading]);

  async function acessarComCredenciais(userParam, passwordParam) {
    setErroCredencial(false);
    setLoading(true);
    try {
      const retorno = await api.post("/v1/logar", { user: userParam, password: passwordParam });
      const usuario = retorno?.data?.[0];
      if (!usuario) throw new Error("Credenciais invalidas");
      await AsyncStorage.multiSet([
        ["id_usuario", String(usuario.id_usuario ?? "")],
        ["id_usuario_erp", String(usuario.id_usuario_erp ?? "")],
        ["id_grupo_empresa", String(usuario.id_grupo_empresa ?? "")],
        ["nome", String(usuario.nome ?? "")],
        ["usuario", String(usuario.usuario ?? "")],
        ["id_setor_erp", String(usuario.id_setor_erp ?? "")],
        ["setor", String(usuario.setor ?? "")],
        ["id_empresa", String(usuario.id_empresa ?? "")],
        ["razaosocial", String(usuario.razaosocial ?? "")],
      ]);
      if (lembrar) {
        await AsyncStorage.multiSet([
          ["salvar_login", String(userParam)],
          ["salvar_senha", String(passwordParam)],
        ]);
      } else {
        await AsyncStorage.multiRemove(["salvar_login", "salvar_senha"]);
      }
      if (typeof onLoginSuccess === "function") {
        onLoginSuccess(usuario);
      } else {
        showAlert({ type: "success", title: "Login efetuado", message: `Bem-vindo, ${usuario.nome ?? usuario.usuario ?? "usuário"}.` });
      }
    } catch (error) {
      setErroCredencial(true);
      Animated.sequence([
        Animated.timing(shakeX, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 10, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -8, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 8, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    } finally {
      setLoading(false);
    }
  }

  async function acessar() {
    if (!user.trim() || !password.trim()) {
      showAlert({ type: "warning", title: "Campos obrigatórios", message: "Informe usuário e senha para continuar." });
      return;
    }
    await acessarComCredenciais(user, password);
  }

  return (
    <View style={styles.flex}>
      {/* Fundo azul ocupa a tela toda */}
      <LinearGradient
        colors={["#050d1a", "#0b1a35", "#0a2a6e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Hero — branding no topo */}
      <View style={[styles.hero, { minHeight: heroHeight }]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.scanLine, { transform: [{ translateY: scanY }] }]}
        >
          <LinearGradient
            colors={["transparent", "rgba(96,165,250,0.65)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={styles.logoRow}>
          <Ionicons name="layers" size={26} color="#3f6cf6" />
          <Text style={styles.logoText}>
            ISOLVUS <Text style={styles.logoErp}>ERP</Text>
          </Text>
        </View>
        <Animated.Text style={[styles.heroFrase, { opacity: fraseOpacity }]}>
          {FRASES[fraseIndex]}
        </Animated.Text>
        <Text style={styles.heroSub}>Acesse sua conta para continuar utilizando o sistema.</Text>
      </View>

      {/* Card branco com cantos arredondados no topo */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.cardWrapper}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.card}
        >
          <View style={styles.formArea}>

            <View>
              <View style={styles.tabRow}>
                <View style={[styles.tabButton, styles.tabButtonActive]}>
                  <Text style={[styles.tabText, styles.tabTextActive]}>Login</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Usuário</Text>
              <View style={styles.fieldGroup}>
                <View style={[styles.inputShell, campoFocado === "user" ? styles.inputShellFocused : null]}>
                  <TextInput
                    value={user}
                    onChangeText={(v) => { setUser(v); if (erroCredencial) setErroCredencial(false); }}
                    onFocus={() => setCampoFocado("user")}
                    onBlur={() => setCampoFocado(null)}
                    placeholder="Usuário ou e-mail"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    returnKeyType="next"
                    autoComplete="username"
                    editable={!usuarioVinculado}
                  />
                </View>
                {usuarioVinculado ? (
                  <Text style={styles.vinculadoHint}>
                    Aparelho vinculado a {usuarioVinculado.nome || usuarioVinculado.login}. Informe somente a senha.
                  </Text>
                ) : null}
              </View>

              <Text style={styles.fieldLabel}>Senha</Text>
              <View style={styles.fieldGroup}>
                <View style={[styles.inputShell, campoFocado === "password" ? styles.inputShellFocused : null]}>
                  <TextInput
                    value={password}
                    onChangeText={(v) => { setPassword(v); if (erroCredencial) setErroCredencial(false); }}
                    onFocus={() => setCampoFocado("password")}
                    onBlur={() => setCampoFocado(null)}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    returnKeyType="go"
                    onSubmitEditing={acessar}
                    autoComplete="password"
                  />
                  <Pressable style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={18} color={colors.muted} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.rememberRow}>
                <Pressable style={styles.checkboxWrap} onPress={() => setLembrar((v) => !v)}>
                  <View style={[styles.checkbox, lembrar ? styles.checkboxChecked : null]}>
                    {lembrar ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                  </View>
                  <Text style={styles.checkboxLabel}>Lembrar-me</Text>
                </Pressable>
              </View>

              {erroCredencial ? (
                <View style={styles.errorBox}>
                  <Ionicons name="warning" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>Usuário ou senha inválidos.</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [styles.loginButton, (pressed || loading || autoLogando) ? styles.loginButtonPressed : null]}
                onPress={acessar}
                disabled={loading || autoLogando}
              >
                <LinearGradient
                  colors={erroCredencial ? ["#dc3545", "#b42318"] : ["#3f6cf6", "#2f59d9"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.loginButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : erroCredencial ? (
                    <Ionicons name="warning" size={18} color={colors.white} />
                  ) : null}
                  <Text style={styles.loginButtonText}>{buttonLabel}</Text>
                </LinearGradient>
              </Pressable>
            </View>

            <Text style={styles.versaoRodape}>{versaoLabel}</Text>


          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    paddingTop: 56,
    paddingHorizontal: 26,
    gap: 8,
    justifyContent: "center",
    overflow: "hidden",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    zIndex: 2,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  logoText: { color: "#ffffff", fontSize: 20, fontWeight: "800", letterSpacing: 0.4 },
  logoErp: { color: "#3f6cf6", fontWeight: "800" },
  heroFrase: { color: "#ffffff", fontSize: 26, fontWeight: "800", lineHeight: 34 },
  heroSub: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  cardWrapper: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  scrollContent: { flexGrow: 1 },
  formArea: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,

  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#f3f6fc",
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: "#e5e9f2",
    minHeight: 48,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: { backgroundColor: "#ffffff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "600", color: "#9ca3af" },
  tabTextActive: { color: "#111827" },
  fieldLabel: { color: "#374151", fontSize: 13, fontWeight: "600", marginBottom: 5 },
  fieldGroup: { marginBottom: 12 },
  inputShell: { minHeight: 48, width: "100%", borderRadius: 10, backgroundColor: "#f3f6fc", borderWidth: 1.2, borderColor: "#e5e9f2", paddingHorizontal: 14, flexDirection: "row", alignItems: "center" },
  inputShellFocused: { borderColor: "#3f6cf6", backgroundColor: "#f0f4ff" },
  input: { flex: 1, color: "#111827", fontSize: 14, paddingVertical: 10 },
  vinculadoHint: { color: "#64748b", fontSize: 12, marginTop: 6 },
  eyeBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center", marginLeft: 6 },
  rememberRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  checkboxWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: "#d1d5db", backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#3f6cf6", borderColor: "#3f6cf6" },
  checkboxLabel: { color: "#6b7280", fontSize: 13 },
  forgotText: { color: "#3f6cf6", fontSize: 13, fontWeight: "600" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(220,53,69,0.08)", borderWidth: 1, borderColor: "rgba(220,53,69,0.16)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  errorText: { color: colors.danger, fontSize: 12.5, fontWeight: "600" },
  loginButton: { minHeight: 50, width: "100%", borderRadius: 10, overflow: "hidden", marginTop: 2 },
  loginButtonGradient: { minHeight: 50, borderRadius: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, paddingHorizontal: 14 },
  loginButtonPressed: { opacity: 0.88 },
  loginButtonText: { color: colors.white, fontSize: 15.5, fontWeight: "800" },
  versaoRodape: {
    marginTop: 20,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  signupRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 14 },
  signupHint: { color: "#6b7280", fontSize: 13 },
  signupAction: { color: "#3f6cf6", fontSize: 13, fontWeight: "700" },
});
