import { ActivityIndicator, Keyboard, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../../theme/colors";
import { styles } from "../styles";
import { highlightText } from "../utils";

export default function Step1Selecao({
  clienteBusca, setClienteBusca,
  clientesSugestoes, setClientesSugestoes,
  loadingClienteBusca,
  clienteSelecionado, setClienteSelecionado,
  setCgc, setContato, setEmail,
  cgc, contato, email,
  clienteSearchFocused, setClienteSearchFocused,
  buscarClientes, consultarClienteCompleto,
  promotorDescricao,
  avancar,
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Seleciona Cliente</Text>
      <Text style={styles.sectionSubtitle}>Busque pelo nome do cliente para iniciar a visita.</Text>

      <Text style={styles.label}>Cliente *</Text>
      <View style={[styles.inputSearchWrap, clienteSearchFocused && styles.inputSearchFocused]}>
        <Ionicons name="search" size={16} color={clienteSearchFocused ? colors.accent : "#94a3b8"} style={{ marginRight: 8 }} />
        <TextInput
          value={clienteBusca}
          onChangeText={buscarClientes}
          onFocus={() => setClienteSearchFocused(true)}
          onBlur={() => setClienteSearchFocused(false)}
          placeholder="Buscar cliente..."
          placeholderTextColor="#94a3b8"
          style={styles.inputSearchField}
          autoCapitalize="characters"
          returnKeyType="search"
        />
        {loadingClienteBusca && (
          <ActivityIndicator size="small" color={colors.accent} style={{ marginLeft: 4 }} />
        )}
        {!!clienteBusca && !loadingClienteBusca && (
          <Pressable
            onPress={() => {
              setClienteBusca("");
              setClientesSugestoes([]);
              setClienteSelecionado({});
              setCgc(""); setContato(""); setEmail("");
            }}
            hitSlop={10}
          >
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </Pressable>
        )}
      </View>

      {(clientesSugestoes.length > 0 ||
        (clienteSearchFocused && clienteBusca.length >= 2 && !loadingClienteBusca && clientesSugestoes.length === 0)) && (
        <View style={styles.searchDropdown}>
          {clientesSugestoes.length === 0 ? (
            <View style={styles.searchEmptyState}>
              <Ionicons name="person-outline" size={24} color="#cbd5e1" />
              <Text style={styles.searchEmptyText}>Nenhum cliente encontrado</Text>
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 240 }}
              showsVerticalScrollIndicator={false}
            >
              {clientesSugestoes.map((item, index) => {
                const partes = highlightText(item.descricao, clienteBusca);
                const initials = String(item.descricao || "?").trim().slice(0, 2).toUpperCase();
                return (
                  <Pressable
                    key={String(item.codigo)}
                    style={({ pressed }) => [
                      styles.searchResultItem,
                      index < clientesSugestoes.length - 1 && styles.searchResultItemBorder,
                      pressed && styles.searchResultItemPressed,
                    ]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setClientesSugestoes([]);
                      setClienteSearchFocused(false);
                      consultarClienteCompleto(item.codigo);
                    }}
                  >
                    <View style={styles.searchResultAvatar}>
                      <Text style={styles.searchResultAvatarText}>{initials}</Text>
                    </View>
                    <View style={styles.searchResultContent}>
                      <Text style={styles.searchResultTitle} numberOfLines={1}>
                        {partes.map((p, i) => (
                          <Text key={i} style={p.bold ? styles.searchResultHighlight : undefined}>{p.text}</Text>
                        ))}
                      </Text>
                      {!!item.descricao2 && (
                        <Text style={styles.searchResultSub} numberOfLines={1}>{item.descricao2}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {!!clienteSelecionado?.idclientevenda && (
        <>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>CPF/CNPJ</Text>
              <TextInput value={cgc} editable={false} style={styles.inputDisabled} />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Telefone</Text>
              <TextInput value={contato} editable={false} style={styles.inputDisabled} />
            </View>
          </View>

          <Text style={styles.label}>E-mail</Text>
          <TextInput value={email} editable={false} style={styles.inputDisabled} />

          <Text style={styles.label}>Promotor tecnico</Text>
          <TextInput value={promotorDescricao} editable={false} style={styles.inputDisabled} />

          <Pressable
            style={({ pressed }) => [styles.btnPrimaryFull, { marginTop: 24 }, pressed && styles.btnPressed]}
            onPress={avancar}
          >
            <LinearGradient colors={["#3f6cf6", "#2f59d9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
              <Text style={styles.btnPrimaryText}>Iniciar Visita</Text>
            </LinearGradient>
          </Pressable>
        </>
      )}
    </View>
  );
}
