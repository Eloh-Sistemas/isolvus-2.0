import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "../styles";

export default function Step5Checkout({
  loadingCheckout,
  regionCheckout,
  pontoCheckout,
  dataCheckin,
  dataCheckout,
  tempoAtendimento,
  atividadeRealizadaTexto,
  localizacaoCheckout,
  voltar,
  fazerCheckout,
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Check-out da visita</Text>

      {loadingCheckout ? (
        <View style={styles.stateBox}>
          <ActivityIndicator />
          <Text style={styles.stateText}>Carregando dados do checkout...</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Mapa checkout</Text>
      {regionCheckout ? (
        <View style={styles.mapCard}>
          <MapView style={styles.map} initialRegion={regionCheckout}>
            <Marker coordinate={pontoCheckout} title="Voce esta aqui" pinColor="red" />
          </MapView>
          <View style={styles.mapLegendRow}>
            <Text style={styles.mapLegendItem}>Pin vermelho: Posicao atual</Text>
          </View>
        </View>
      ) : (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Localizacao nao disponivel.</Text>
        </View>
      )}

      <Text style={styles.label}>Data Check-in</Text>
      <TextInput editable={false} value={dataCheckin} style={styles.inputDisabled} />

      <Text style={styles.label}>Data Check-out</Text>
      <TextInput editable={false} value={dataCheckout} style={styles.inputDisabled} />

      <Text style={styles.label}>Tempo de atendimento</Text>
      <TextInput editable={false} value={tempoAtendimento} style={styles.inputDisabled} />

      <Text style={styles.label}>Atividade realizada</Text>
      <TextInput editable={false} value={atividadeRealizadaTexto || "Carregando..."} style={styles.inputDisabled} />

      <Text style={styles.label}>Localizacao checkout</Text>
      <TextInput
        editable={false}
        value={
          localizacaoCheckout?.lat
            ? `${localizacaoCheckout.lat.toFixed(6)}, ${localizacaoCheckout.lon.toFixed(6)}`
            : "Nao disponivel"
        }
        style={styles.inputDisabled}
      />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, gap: 10 }}>
        <Pressable style={styles.btnBack} onPress={voltar}>
          <Ionicons name="arrow-back" size={18} color="#475569" />
          <Text style={styles.btnBackText}>Voltar</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.btnSuccess, pressed && styles.btnPressed]} onPress={fazerCheckout}>
          <LinearGradient colors={["#1db96a", "#198754"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
            <Text style={styles.btnSuccessText}>Fazer CheckOut</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
