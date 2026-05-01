import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
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
    <View style={[styles.container, { backgroundColor: usuarioLogado ? "#ffffff" : "#050d1a" }]}>
      <StatusBar
        style={usuarioLogado ? "dark" : "light"}
        backgroundColor={usuarioLogado ? "#ffffff" : "#050d1a"}
      />
      {usuarioLogado ? (
        <HomeScreen user={usuarioLogado} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
