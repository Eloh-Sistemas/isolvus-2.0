import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import api from "../services/api";
import { colors } from "../theme/colors";

export default function LoginScreen() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [erroCredencial, setErroCredencial] = useState(false);
  const shakeX = useRef(new Animated.Value(0)).current;

  const buttonLabel = useMemo(() => {
    if (loading) return "Autenticando...";
    if (erroCredencial) return "Credenciais incorretas. Tentar novamente";
    return "Entrar";
  }, [erroCredencial, loading]);

  async function acessar() {
    const credenciais = { user, password };

    if (!user.trim() || !password.trim()) {
      Alert.alert("Campos obrigatorios", "Informe usuario e senha para continuar.");
      return;
    }

    setErroCredencial(false);
    setLoading(true);

    try {
      const retorno = await api.post("/v1/logar", credenciais);
      const usuario = retorno?.data?.[0];

      if (!usuario) {
        throw new Error("Credenciais invalidas");
      }

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

      Alert.alert("Login realizado", `Bem-vindo, ${usuario.nome ?? usuario.usuario ?? "usuario"}.`);
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.wrapper}>
          <View style={styles.rightPanel}>
            <Animated.View style={[styles.card, { transform: [{ translateX: shakeX }] }]}>
              <View style={styles.logoWrap}>
                <Image source={require("../../assets/SGS.png")} style={styles.logo} resizeMode="contain" />
              </View>

              <Text style={styles.welcome}>Bem-vindo</Text>
              <Text style={styles.cardTitle}>Entre na sua conta</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Usuario</Text>
                <View style={styles.inputShell}>
                  <Ionicons name="person" size={18} color={colors.muted} />
                  <TextInput
                    value={user}
                    onChangeText={(value) => {
                      setUser(value);
                      if (erroCredencial) setErroCredencial(false);
                    }}
                    placeholder="Informe seu usuario"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.inputShell}>
                  <Ionicons name="lock-closed" size={18} color={colors.muted} />
                  <TextInput
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (erroCredencial) setErroCredencial(false);
                    }}
                    placeholder="Informe sua senha"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    returnKeyType="go"
                    onSubmitEditing={acessar}
                  />
                  <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color={colors.muted}
                    />
                  </Pressable>
                </View>
              </View>

              {erroCredencial ? (
                <View style={styles.errorBox}>
                  <Ionicons name="warning" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>Usuario ou senha invalidos.</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.loginButton,
                  erroCredencial && styles.loginButtonError,
                  (pressed || loading) && styles.loginButtonPressed,
                ]}
                onPress={acessar}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : erroCredencial ? (
                  <Ionicons name="warning" size={18} color={colors.white} />
                ) : (
                  <MaterialCommunityIcons name="login" size={18} color={colors.white} />
                )}
                <Text style={styles.loginButtonText}>{buttonLabel}</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  wrapper: {
    flex: 1,
    backgroundColor: "#f0f4fb",
  },
  rightPanel: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 24,
    backgroundColor: "#f0f4fb",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 24,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 18,
  },
  logo: {
    width: 84,
    height: 84,
  },
  welcome: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 22,
    textAlign: "center",
  },
  fieldGroup: {
    gap: 8,
    marginBottom: 14,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: "#d7e0ef",
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 54,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(220,53,69,0.08)",
    borderWidth: 1,
    borderColor: "rgba(220,53,69,0.16)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  loginButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  loginButtonPressed: {
    opacity: 0.9,
  },
  loginButtonError: {
    backgroundColor: colors.danger,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
