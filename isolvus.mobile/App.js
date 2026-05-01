import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  const handleLoginSuccess = useCallback((usuario) => {
    setUsuarioLogado(usuario);
  }, []);

  const handleLogout = useCallback(() => {
    setUsuarioLogado(null);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={usuarioLogado ? "dark" : "light"} />
      {usuarioLogado ? (
        <HomeScreen user={usuarioLogado} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050d1a",
  },
});
