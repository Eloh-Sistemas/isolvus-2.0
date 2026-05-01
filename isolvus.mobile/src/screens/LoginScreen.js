import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../services/api";
import { colors } from "../theme/colors";

const { height: SCREEN_H } = Dimensions.get("window");

const FRASES = [
  "Tecnologia que\npotencializa negócios.",
  "Gestão inteligente\nna palma da mão.",
  "Controle total\nda sua empresa.",
  "Simplicidade e\neficiência em um só lugar.",
  "Acesse onde\ne quando quiser.",
];

export default function LoginScreen() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [erroCredencial, setErroCredencial] = useState(false);
  const [campoFocado, setCampoFocado] = useState(null);
  const [fraseIndex, setFraseIndex] = useState(0);
  const [lembrar, setLembrar] = useState(false);
  const [aba, setAba] = useState("entrar");

  const shakeX = useRef(new Animated.Value(0)).current;
  const fraseOpacity = useRef(new Animated.Value(1)).current;

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

  const buttonLabel = useMemo(() => {
    if (loading) return "Autenticando...";
    if (erroCredencial) return "Credenciais inválidas";
    return "Entrar";
  }, [erroCredencial, loading]);

  async function acessar() {
    const credenciais = { user, password };
    if (!user.trim() || !password.trim()) {
      Alert.alert("Campos obrigatórios", "Informe usuário e senha para continuar.");
      return;
    }
    setErroCredencial(false);
    setLoading(true);
    try {
      const retorno = await api.post("/v1/logar", credenciais);
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
      Alert.alert("Login efetuado", `Bem-vindo, ${usuario.nome ?? usuario.usuario ?? "usuário"}.`);
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
      <View style={styles.hero}>
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
              {/* Tab switcher */}
              <View style={styles.tabRow}>
                <Pressable
                  style={[styles.tabButton, aba === "entrar" ? styles.tabButtonActive : null]}
                  onPress={() => setAba("entrar")}
                >
                  <Text style={[styles.tabText, aba === "entrar" ? styles.tabTextActive : null]}>Entrar</Text>
                </Pressable>
                <Pressable
                  style={[styles.tabButton, aba === "cadastrar" ? styles.tabButtonActive : null]}
                  onPress={() => setAba("cadastrar")}
                >
                  <Text style={[styles.tabText, aba === "cadastrar" ? styles.tabTextActive : null]}>Cadastrar</Text>
                </Pressable>
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
                  />
                </View>
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
                <Pressable>
                  <Text style={styles.forgotText}>Esqueceu a senha?</Text>
                </Pressable>
              </View>

              {erroCredencial ? (
                <View style={styles.errorBox}>
                  <Ionicons name="warning" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>Usuário ou senha inválidos.</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [styles.loginButton, (pressed || loading) ? styles.loginButtonPressed : null]}
                onPress={acessar}
                disabled={loading}
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

            <View style={styles.signupRow}>
              <Text style={styles.signupHint}>Não tem uma conta?</Text>
              <Pressable onPress={() => setAba("cadastrar")}>
                <Text style={styles.signupAction}> Cadastre-se</Text>
              </Pressable>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const CARD_H = SCREEN_H * 0.62;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    height: SCREEN_H - CARD_H,
    paddingTop: 56,
    paddingHorizontal: 26,
    gap: 8,
    justifyContent: "center",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  logoText: { color: "#ffffff", fontSize: 20, fontWeight: "800", letterSpacing: 0.4 },
  logoErp: { color: "#3f6cf6", fontWeight: "800" },
  heroFrase: { color: "#ffffff", fontSize: 26, fontWeight: "800", lineHeight: 34 },
  heroSub: { color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 20, marginTop: 4 },
  cardWrapper: { height: CARD_H },
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
  tabRow: { flexDirection: "row", backgroundColor: "#f0f2f7", borderRadius: 12, padding: 4, marginBottom: 20 },
  tabButton: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  tabButtonActive: { backgroundColor: "#ffffff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "600", color: "#9ca3af" },
  tabTextActive: { color: "#111827" },
  fieldLabel: { color: "#374151", fontSize: 13, fontWeight: "600", marginBottom: 5 },
  fieldGroup: { marginBottom: 12 },
  inputShell: { minHeight: 48, width: "100%", borderRadius: 10, backgroundColor: "#f3f6fc", borderWidth: 1.2, borderColor: "#e5e9f2", paddingHorizontal: 14, flexDirection: "row", alignItems: "center" },
  inputShellFocused: { borderColor: "#3f6cf6", backgroundColor: "#f0f4ff" },
  input: { flex: 1, color: "#111827", fontSize: 14, paddingVertical: 10 },
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
  signupRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 14 },
  signupHint: { color: "#6b7280", fontSize: 13 },
  signupAction: { color: "#3f6cf6", fontSize: 13, fontWeight: "700" },
});
