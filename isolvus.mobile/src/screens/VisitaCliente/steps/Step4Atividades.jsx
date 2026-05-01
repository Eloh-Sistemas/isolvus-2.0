import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../../theme/colors";
import { styles } from "../styles";

export default function Step4Atividades({
  idVisita,
  clienteSelecionado,
  loadingAtividades,
  atividades,
  voltar,
  avancar,
  abrirModalAtividade,
}) {
  const realizadas = atividades.filter((a) => a.realizado === "S").length;

  return (
    <View style={[styles.section, { flex: 1 }]}>
      {/* Header com botão voltar */}
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
          <Text style={styles.sectionTitle}>Atividades da visita</Text>
          <Text style={styles.sectionSubtitle}>Toque em uma atividade para editar ou adicione novas abaixo.</Text>
        </View>
      </View>

      {/* Badge do cliente */}
      {!!clienteSelecionado?.cliente && (
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 10,
          backgroundColor: "#eff6ff", borderRadius: 12,
          paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
        }}>
          <View style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="person" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: "#64748b", fontWeight: "500" }}>Visitando</Text>
            <Text style={{ fontSize: 13, color: "#0f172a", fontWeight: "700" }} numberOfLines={1}>
              {clienteSelecionado.cliente}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 10, color: "#94a3b8", fontWeight: "600" }}>Nº DA VISITA</Text>
            <Text style={{ fontSize: 13, color: colors.accent, fontWeight: "700" }}>#{idVisita}</Text>
          </View>
        </View>
      )}

      {/* Contador resumido */}
      {!loadingAtividades && atividades.length > 0 && (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <View style={{ flex: 1, backgroundColor: "#f0fdf4", borderRadius: 10, borderWidth: 1, borderColor: "#bbf7d0", padding: 10, alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#16a34a" }}>{realizadas}</Text>
            <Text style={{ fontSize: 10, color: "#166534", fontWeight: "600" }}>CONCLUÍDAS</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "#fef2f2", borderRadius: 10, borderWidth: 1, borderColor: "#fecaca", padding: 10, alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#dc2626" }}>{atividades.length - realizadas}</Text>
            <Text style={{ fontSize: 10, color: "#991b1b", fontWeight: "600" }}>PENDENTES</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "#eff6ff", borderRadius: 10, borderWidth: 1, borderColor: "#bfdbfe", padding: 10, alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.accent }}>{atividades.length}</Text>
            <Text style={{ fontSize: 10, color: "#1e40af", fontWeight: "600" }}>TOTAL</Text>
          </View>
        </View>
      )}

      {/* Lista */}
      {loadingAtividades ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Buscando atividades...</Text>
        </View>
      ) : atividades.length === 0 ? (
        <View style={styles.stateBox}>
          <Ionicons name="clipboard-outline" size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
          <Text style={styles.stateText}>Nenhuma atividade registrada ainda.</Text>
          <Text style={[styles.stateText, { fontSize: 12, marginTop: 4 }]}>Use o botão <Text style={{ fontWeight: "700", color: "#3f6cf6" }}>Nova atividade</Text> abaixo para começar.</Text>
        </View>
      ) : (
        <View style={[styles.listWrap, { flex: 1 }]}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 2 }}
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            {atividades.map((item) => (
              <Pressable
                key={String(item.id_evidencia)}
                style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: "#f8fafc" }]}
                onPress={() => abrirModalAtividade(item)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{
                    width: 38, height: 38, borderRadius: 10,
                    backgroundColor: item.realizado === "S" ? "#dcfce7" : "#fef2f2",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons
                      name={item.realizado === "S" ? "checkmark-circle" : "time-outline"}
                      size={20}
                      color={item.realizado === "S" ? "#16a34a" : "#dc2626"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listItemTitle} numberOfLines={1}>{item.descricao}</Text>
                    <Text style={styles.listItemSub}>Registro nº {item.id_evidencia} · Toque para editar</Text>
                  </View>
                  <View style={{
                    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
                    backgroundColor: item.realizado === "S" ? "#dcfce7" : "#fef2f2",
                  }}>
                    <Text style={{
                      fontSize: 10, fontWeight: "700",
                      color: item.realizado === "S" ? "#16a34a" : "#dc2626",
                    }}>
                      {item.realizado === "S" ? "CONCLUÍDO" : "PENDENTE"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Rodapé: Adicionar + Finalizar */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Pressable
          onPress={() => abrirModalAtividade(null)}
          style={({ pressed }) => ({
            flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
            paddingVertical: 13, borderRadius: 12,
            borderWidth: 1.5, borderColor: pressed ? "#1e3a8a" : "#3f6cf6",
            backgroundColor: pressed ? "#eff6ff" : "#fff",
          })}
        >
          <Ionicons name="add-circle-outline" size={18} color="#3f6cf6" />
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#3f6cf6" }}>Nova atividade</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [{ flex: 1, borderRadius: 12, overflow: "hidden" }, pressed && styles.btnPressed]}
          onPress={avancar}
        >
          <LinearGradient
            colors={["#3f6cf6", "#2f59d9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.btnGradient, { paddingVertical: 13 }]}
          >
            <Text style={styles.btnPrimaryText}>Avançar</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
