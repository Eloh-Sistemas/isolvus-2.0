import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../../theme/colors";
import { styles } from "../styles";

export default function Step4Atividades({
  idVisita,
  loadingAtividades,
  atividades,
  voltar,
  avancar,
  abrirModalAtividade,
}) {
  return (
    <View style={styles.section}>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Atividades da visita {idVisita}</Text>
        <Pressable style={styles.btnPrimarySmall} onPress={() => abrirModalAtividade(null)}>
          <Text style={styles.btnPrimarySmallText}>Adicionar</Text>
        </Pressable>
      </View>

      {loadingAtividades ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Carregando atividades...</Text>
        </View>
      ) : atividades.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Nenhuma atividade encontrada.</Text>
        </View>
      ) : (
        <View style={styles.listWrap}>
          {atividades.map((item) => (
            <Pressable
              key={String(item.id_evidencia)}
              style={styles.listItem}
              onPress={() => abrirModalAtividade(item)}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.listItemTitle}>{item.id_evidencia} - {item.descricao}</Text>
                <Ionicons
                  name={item.realizado === "S" ? "checkmark-circle" : "close-circle"}
                  size={18}
                  color={item.realizado === "S" ? colors.success : colors.danger}
                />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, gap: 10 }}>
        <Pressable style={styles.btnBack} onPress={voltar}>
          <Ionicons name="arrow-back" size={18} color="#475569" />
          <Text style={styles.btnBackText}>Voltar</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]} onPress={avancar}>
          <LinearGradient colors={["#3f6cf6", "#2f59d9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
            <Text style={styles.btnPrimaryText}>Finalizar</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
