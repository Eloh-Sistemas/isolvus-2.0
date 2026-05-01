import React from "react";
import { Modal, Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const TYPES = {
  success: { icon: "checkmark-circle", color: "#16a34a", bg: "#f0fdf4", border: "#86efac", btnColor: "#16a34a" },
  error:   { icon: "close-circle",     color: "#b91c1c", bg: "#fff1f2", border: "#fecaca", btnColor: "#dc2626" },
  warning: { icon: "warning",          color: "#92400e", bg: "#fffbeb", border: "#fde68a", btnColor: "#d97706" },
  info:    { icon: "information-circle", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", btnColor: "#2563eb" },
};

/**
 * CustomAlert — drop-in replacement para Alert.alert
 *
 * Props:
 *  visible    boolean
 *  type       "success" | "error" | "warning" | "info"  (default: "info")
 *  title      string
 *  message    string
 *  buttons    Array<{ text: string, onPress?: () => void, style?: "default" | "cancel" | "destructive" }>
 *             (default: [{ text: "OK" }])
 *  onClose    () => void  — chamado ao fechar pelo overlay
 */
export default function CustomAlert({
  visible = false,
  type = "info",
  title = "",
  message = "",
  buttons,
  onClose,
}) {
  const cfg = TYPES[type] ?? TYPES.info;
  const btns = buttons?.length ? buttons : [{ text: "OK" }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.card} onPress={() => {}}>
          {/* Ícone */}
          <View style={[s.iconWrap, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Ionicons name={cfg.icon} size={36} color={cfg.color} />
          </View>

          {/* Título */}
          {!!title && <Text style={s.title}>{title}</Text>}

          {/* Mensagem */}
          {!!message && <Text style={s.message}>{message}</Text>}

          {/* Botões */}
          <View style={[s.btnRow, btns.length === 1 && { justifyContent: "center" }]}>
            {btns.map((btn, i) => {
              const isCancel = btn.style === "cancel";
              const isDestructive = btn.style === "destructive";
              return (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    s.btn,
                    btns.length === 1 && s.btnFull,
                    isCancel && s.btnCancel,
                    !isCancel && { backgroundColor: isDestructive ? "#dc2626" : cfg.btnColor },
                    pressed && { opacity: 0.82 },
                  ]}
                  onPress={() => { btn.onPress?.(); onClose?.(); }}
                >
                  <Text style={[s.btnText, isCancel && s.btnTextCancel]}>
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 13.5,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 4,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    width: "100%",
  },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  btnFull: { flex: 1 },
  btnCancel: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  btnTextCancel: {
    color: "#475569",
  },
});
