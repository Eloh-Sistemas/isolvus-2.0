import { ActivityIndicator, Pressable, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../../theme/colors";
import { styles } from "../styles";
import { formatDateDisplay } from "../utils";

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
  const parseDataHoraFlex = (valor) => {
    const txt = String(valor || "").trim();
    if (!txt) return null;

    // Formato BR: dd/mm/yyyy hh:mm[:ss]
    const br = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (br) {
      const [, dd, mm, yyyy, hh, min, ss] = br;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss || 0));
    }

    // Formato ISO: yyyy-mm-dd hh:mm[:ss] ou yyyy-mm-ddThh:mm[:ss]
    const isoTxt = txt.includes("T") ? txt : txt.replace(" ", "T");
    const iso = new Date(isoTxt);
    if (!Number.isNaN(iso.getTime())) return iso;

    return null;
  };

  const calcularTempoAtendimento = (inicio, fim) => {
    const dtInicio = parseDataHoraFlex(inicio);
    const dtFim = parseDataHoraFlex(fim);
    if (!dtInicio || !dtFim) return null;

    const totalSegundos = Math.max(0, Math.floor((dtFim.getTime() - dtInicio.getTime()) / 1000));
    const horas = String(Math.floor(totalSegundos / 3600)).padStart(2, "0");
    const minutos = String(Math.floor((totalSegundos % 3600) / 60)).padStart(2, "0");
    const segundos = String(totalSegundos % 60).padStart(2, "0");
    return `${horas}:${minutos}:${segundos}`;
  };

  const localizacaoTexto = localizacaoCheckout?.lat
    ? `${localizacaoCheckout.lat.toFixed(6)}, ${localizacaoCheckout.lon.toFixed(6)}`
    : "Nao disponivel";
  const regionCheckoutZoom = regionCheckout
    ? {
        ...regionCheckout,
        latitudeDelta: Math.min(Number(regionCheckout.latitudeDelta || 0.1), 0.005),
        longitudeDelta: Math.min(Number(regionCheckout.longitudeDelta || 0.1), 0.002),
      }
    : null;
  const dataCheckinTexto = dataCheckin ? formatDateDisplay(dataCheckin) : "Nao informado";
  const dataCheckoutTexto = dataCheckout ? formatDateDisplay(dataCheckout) : "Nao informado";
  const tempoAtendimentoTexto = calcularTempoAtendimento(dataCheckin, dataCheckout) || tempoAtendimento || "00:00:00";

  return (
    <View style={styles.section}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 0 }}>
        <Pressable
          onPress={voltar}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: pressed ? "#e2e8f0" : "#f1f5f9",
            alignItems: "center", justifyContent: "center",
          })}
        >
          <Ionicons name="arrow-back" size={20} color="#475569" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Check-out da visita</Text>
          <Text style={styles.sectionSubtitle}>Confira os dados finais e conclua a visita.</Text>
        </View>
      </View>

      <Text style={styles.label}>Mapa da visita</Text>
      {regionCheckoutZoom ? (
        <View style={styles.mapCard}>
          <MapView style={styles.map} initialRegion={regionCheckoutZoom}>
            <Marker coordinate={pontoCheckout} title="Voce esta aqui" pinColor="red" />
          </MapView>
          <View style={styles.mapLegendRow}>
            <Text style={styles.mapLegendItem}>Pin vermelho: Posicao atual</Text>
          </View>
        </View>
      ) : (
        <View style={styles.stateBox}>
          <Ionicons name="map-outline" size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
          <Text style={styles.stateText}>Localizacao nao disponivel.</Text>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 10, marginTop: 4, marginBottom: 12 }}>
        <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12 }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", fontWeight: "600", marginBottom: 2 }}>DATA CHECK-IN</Text>
          <Text style={{ fontSize: 13, color: "#0f172a", fontWeight: "600" }}>{dataCheckinTexto}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12 }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", fontWeight: "600", marginBottom: 2 }}>TEMPO DE ATENDIMENTO</Text>
          <Text style={{ fontSize: 13, color: "#0f172a", fontWeight: "600" }}>{tempoAtendimentoTexto}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12 }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", fontWeight: "600", marginBottom: 2 }}>DATA CHECK-OUT</Text>
          <Text style={{ fontSize: 13, color: "#0f172a", fontWeight: "600" }}>{dataCheckoutTexto}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12 }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", fontWeight: "600", marginBottom: 2 }}>ATIVIDADE REALIZADA</Text>
          <Text style={{ fontSize: 13, color: "#0f172a", fontWeight: "600" }} numberOfLines={1}>
            {atividadeRealizadaTexto || "Carregando..."}
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="locate-outline" size={16} color="#64748b" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: "#94a3b8", fontWeight: "600" }}>LOCALIZACAO CHECK-OUT</Text>
            <Text style={{ fontSize: 12, color: "#0f172a" }}>{localizacaoTexto}</Text>
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.btnPrimaryFull, { marginTop: 16 }, pressed && styles.btnPressed]}
        onPress={fazerCheckout}
      >
        <LinearGradient
          colors={["#1db96a", "#198754"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.btnGradient}
        >
          <Text style={styles.btnPrimaryText}>Fazer CheckOut</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
