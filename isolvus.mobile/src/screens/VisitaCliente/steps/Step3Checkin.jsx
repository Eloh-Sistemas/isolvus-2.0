import { ActivityIndicator, Pressable, Text, View } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../../theme/colors";
import { styles } from "../styles";
import { isValidLatLng } from "../utils";

export default function Step3Checkin({
  clienteSelecionado,
  distancia,
  idJustificativa,
  regionCheckin,
  localizacaoPromotor,
  clienteTemCoordenada,
  clienteLat,
  clienteLng,
  gpsAguardando,
  dataCheckin,
  enderecoPromotor,
  enderecoCliente,
  checkinMapRef,
  voltar,
  atualizarDadosCheckin,
  avancar,
  setShowJustificativaModal,
}) {
  return (
    <View style={styles.section}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
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
          <Text style={styles.sectionTitle}>Check-in da visita</Text>
          <Text style={styles.sectionSubtitle}>Confirme sua localização e realize o check-in.</Text>
        </View>
      </View>

      {!!clienteSelecionado?.cliente && (
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 10,
          backgroundColor: "#eff6ff", borderRadius: 12,
          paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
        }}>
          <View style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="person" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: "#64748b", fontWeight: "500" }}>Cliente selecionado</Text>
            <Text style={{ fontSize: 13, color: "#0f172a", fontWeight: "700" }} numberOfLines={1}>
              {clienteSelecionado.cliente}
            </Text>
          </View>
        </View>
      )}

      {Number(distancia) > 3 && !idJustificativa ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Voce esta distante do cliente ({">"}3km). Justifique para continuar.</Text>
          <Pressable style={styles.btnDanger} onPress={() => setShowJustificativaModal(true)}>
            <Text style={styles.btnDangerText}>Selecionar justificativa</Text>
          </Pressable>
        </View>
      ) : null}

      {idJustificativa > 0 ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>Justificativa selecionada: {idJustificativa}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Mapa da visita</Text>
      {regionCheckin ? (
        <View style={styles.mapCard}>
          <MapView ref={checkinMapRef} style={styles.map} initialRegion={regionCheckin}>
            {isValidLatLng(localizacaoPromotor?.lat, localizacaoPromotor?.lng) ? (
              <Marker
                coordinate={{ latitude: localizacaoPromotor.lat, longitude: localizacaoPromotor.lng }}
                pinColor="red"
                anchor={{ x: 0.5, y: 1 }}
                calloutAnchor={{ x: 0.5, y: 0 }}
              >
                <Callout tooltip>
                  <View style={{ backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#0f172a" }}>Você está aqui</Text>
                  </View>
                </Callout>
              </Marker>
            ) : null}
            {clienteTemCoordenada ? (
              <Marker
                coordinate={{ latitude: clienteLat, longitude: clienteLng }}
                pinColor="blue"
                anchor={{ x: 0.5, y: 1 }}
                calloutAnchor={{ x: 0.5, y: 0 }}
              >
                <Callout tooltip>
                  <View style={{ backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#0f172a" }}>
                      {String(clienteSelecionado?.cliente || "Cliente")}
                    </Text>
                  </View>
                </Callout>
              </Marker>
            ) : null}
          </MapView>
          <View style={styles.mapLegendRow}>
            <Text style={styles.mapLegendItem}>Pin vermelho: Promotor</Text>
            <Text style={styles.mapLegendItem}>Pin azul: Cliente</Text>
          </View>

          {/* Indicador de precisão do GPS sobreposto ao mapa */}
          {localizacaoPromotor?.precisao != null && (
            <View style={{
              position: "absolute", top: 10, left: 10,
              flexDirection: "row", alignItems: "center", gap: 5,
              backgroundColor: localizacaoPromotor.precisao <= 30 ? "rgba(240,253,244,0.92)" : localizacaoPromotor.precisao <= 80 ? "rgba(255,251,235,0.92)" : "rgba(255,241,242,0.92)",
              borderWidth: 1,
              borderColor: localizacaoPromotor.precisao <= 30 ? "#86efac" : localizacaoPromotor.precisao <= 80 ? "#fde68a" : "#fecaca",
              borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
              shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
            }}>
              <Ionicons
                name={localizacaoPromotor.precisao <= 30 ? "checkmark-circle" : localizacaoPromotor.precisao <= 80 ? "warning" : "close-circle"}
                size={13}
                color={localizacaoPromotor.precisao <= 30 ? "#16a34a" : localizacaoPromotor.precisao <= 80 ? "#92400e" : "#b91c1c"}
              />
              <Text style={{
                fontSize: 11, fontWeight: "700",
                color: localizacaoPromotor.precisao <= 30 ? "#166534" : localizacaoPromotor.precisao <= 80 ? "#92400e" : "#b91c1c",
              }}>
                GPS ±{Math.round(localizacaoPromotor.precisao)}m
              </Text>
            </View>
          )}

          <Pressable
            onPress={atualizarDadosCheckin}
            disabled={gpsAguardando}
            style={({ pressed }) => ({
              position: "absolute", top: 10, right: 10,
              flexDirection: "row", alignItems: "center", gap: 6,
              backgroundColor: pressed ? "#1e3a8a" : "#1d4ed8",
              paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
              shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
              opacity: gpsAguardando ? 0.6 : 1,
            })}
          >
            {gpsAguardando
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="locate" size={15} color="#fff" />
            }
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Atualizar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.stateBox}>
          <Ionicons name="map-outline" size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
          <Text style={styles.stateText}>Aguardando localizacao para exibir o mapa...</Text>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 10, marginTop: 4, marginBottom: 12 }}>
        <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12 }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", fontWeight: "600", marginBottom: 2 }}>DATA CHECK-IN</Text>
          <Text style={{ fontSize: 13, color: "#0f172a", fontWeight: "600" }}>{dataCheckin}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12 }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", fontWeight: "600", marginBottom: 2 }}>DISTÂNCIA</Text>
          <Text style={{ fontSize: 13, color: "#0f172a", fontWeight: "600" }}>
            {distancia != null ? `${distancia} km` : "N/A"}
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12, marginBottom: 12, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="navigate-outline" size={16} color="#64748b" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: "#94a3b8", fontWeight: "600" }}>SUA LOCALIZAÇÃO</Text>
            <Text style={{ fontSize: 12, color: "#0f172a" }}>{enderecoPromotor || "Obtendo endereço..."}</Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="location-outline" size={16} color="#64748b" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: "#94a3b8", fontWeight: "600" }}>ENDEREÇO DO CLIENTE</Text>
            <Text style={{ fontSize: 12, color: "#0f172a" }}>{enderecoCliente || "Obtendo endereço..."}</Text>
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.btnPrimaryFull,
          { marginTop: 16 },
          Number(distancia) > 3 && !idJustificativa ? styles.btnDisabledWrapper : null,
          pressed && styles.btnPressed,
        ]}
        onPress={avancar}
        disabled={Number(distancia) > 3 && !idJustificativa}
      >
        <LinearGradient
          colors={Number(distancia) > 3 && !idJustificativa ? ["#94a3b8", "#94a3b8"] : ["#3f6cf6", "#2f59d9"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.btnGradient}
        >
          <Text style={styles.btnPrimaryText}>Fazer CheckIn</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
