import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import AtivacaoScreen from "./src/screens/AtivacaoScreen";
import { AlertProvider } from "./src/components/CustomAlert/AlertProvider";
import { setBaseUrl } from "./src/services/api";

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  // null = carregando, false = sem URL (precisa ativar), string = URL ok
  const [apiBaseUrl, setApiBaseUrl] = useState(null);

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
      await AsyncStorage.removeItem("api_base_url");
      setUsuarioLogado(null);
      setApiBaseUrl(false);
    }, []);

  // Ainda carregando AsyncStorage
  if (apiBaseUrl === null) return null;

  const bgColor = usuarioLogado ? "#0c1526" : "#050d1a";

  return (
    <SafeAreaProvider>
      <AlertProvider>
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          <StatusBar style="light" backgroundColor={bgColor} />
          {!apiBaseUrl ? (
            <AtivacaoScreen
              onAtivacaoSucesso={handleAtivacaoSucesso}
              onLoginSuccess={handleLoginSuccess}
            />
          ) : usuarioLogado ? (
            <HomeScreen user={usuarioLogado} onLogout={handleLogout} onRedefinir={handleRedefinir} />
          ) : (
            <LoginScreen onLoginSuccess={handleLoginSuccess} />
          )}
        </View>
      </AlertProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
