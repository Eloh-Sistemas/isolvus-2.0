import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../theme/colors";
import { styles } from "../styles";
import { formatDateDisplay } from "../utils";

export default function Step2Historico({
  clienteSelecionado,
  loadingHistorico,
  historico,
  voltar,
  setIdVisita,
  setDataCheckin,
  setStep,
}) {
  return (
    <View style={[styles.section, { flex: 1 }]}>
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
          <Text style={styles.sectionTitle}>Histórico de visitas</Text>
          <Text style={styles.sectionSubtitle}>Selecione uma visita existente ou inicie uma nova.</Text>
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

      {loadingHistorico ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Carregando historico...</Text>
        </View>
      ) : historico.length === 0 ? (
        <View style={styles.stateBox}>
          <Ionicons name="calendar-outline" size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
          <Text style={styles.stateText}>Nenhuma visita encontrada.</Text>
          <Text style={[styles.stateText, { fontSize: 12, marginTop: 4 }]}>Clique em Nova Visita para iniciar.</Text>
        </View>
      ) : (
        <>
          <Text style={{ fontSize: 12, color: "#94a3b8", fontWeight: "600", marginBottom: 10 }}>
            {historico.length} {historico.length === 1 ? "visita encontrada" : "visitas encontradas"}
          </Text>
          <View style={[styles.listWrap, { flex: 1, marginBottom: 45, borderRadius: 0, borderWidth: 0, shadowOpacity: 0, elevation: 0 }]}> 
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 0 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
            >
              {historico.map((item, idx) => (
                <Pressable
                  key={String(item.id_visita)}
                  style={({ pressed }) => [
                    styles.listItem,
                    {
                      borderBottomWidth: idx === historico.length - 1 ? 0 : 1,
                      borderBottomColor: "#f1f5f9",
                    },
                    pressed && { backgroundColor: "#f8fafc" },
                  ]}
                  onPress={() => {
                    setIdVisita(Number(item.id_visita));
                    setDataCheckin(String(item.dtcheckin_texto || item.dtcheckin || ""));
                    setStep(4);
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{
                      width: 38, height: 38, borderRadius: 10,
                      backgroundColor: item.status === "FINALIZADO" ? "#dcfce7" : "#eff6ff",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Ionicons
                        name={item.status === "FINALIZADO" ? "checkmark-circle" : "time-outline"}
                        size={20}
                        color={item.status === "FINALIZADO" ? "#16a34a" : colors.accent}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listItemTitle}>Visita #{item.id_visita}</Text>
                      <Text style={styles.listItemSub}>{formatDateDisplay(item.dtcheckin_texto || item.dtcheckin)}</Text>
                    </View>
                    <View style={{
                      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
                      backgroundColor: item.status === "FINALIZADO" ? "#dcfce7" : "#eff6ff",
                    }}>
                      <Text style={{
                        fontSize: 10, fontWeight: "700",
                        color: item.status === "FINALIZADO" ? "#16a34a" : colors.accent,
                      }}>{item.status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}
