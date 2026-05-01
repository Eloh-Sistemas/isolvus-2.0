import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
    <SafeAreaProvider>
      <View style={[styles.container, { backgroundColor: usuarioLogado ? "#0c1526" : "#050d1a" }]}>
        <StatusBar
          style="light"
          backgroundColor={usuarioLogado ? "#0c1526" : "#050d1a"}
        />
        {usuarioLogado ? (
          <HomeScreen user={usuarioLogado} onLogout={handleLogout} />
        ) : (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
