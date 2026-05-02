import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Keyboard, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../../theme/colors";
import { styles } from "../styles";
import { formatarTelefone } from "../utils";

function SectionCard({ icon, title, children, first = false }) {
  return (
    <View
      style={{
        marginTop: first ? 10 : 18,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 12,
        backgroundColor: "#ffffff",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#f8fafc",
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
          paddingHorizontal: 10,
          paddingVertical: 8,
        }}
      >
        <View
          style={{
            width: 5,
            height: 26,
            borderRadius: 99,
            backgroundColor: colors.accent,
            marginRight: 10,
          }}
        />
        <View style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: "#f1f5f9",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 8,
        }}>
          <Ionicons name={icon} size={13} color="#334155" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.subsectionTitle, { marginTop: 0, marginBottom: 0, fontSize: 14, color: "#0f172a" }]}>{title}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
        <View>{children}</View>
      </View>
    </View>
  );
}

export default function ModalAtividade({
  visible,
  onClose,
  atividadeSelecionada,
  codAtividade, setCodAtividade,
  nomeAtividade, setNomeAtividade,
  codEquipe, setCodEquipe,
  nomeEquipe, setNomeEquipe,
  qtdePessoa, setQtdePessoa,
  fezQuiz, setFezQuiz,
  comentario, setComentario,
  nomeVeterinario, setNomeVeterinario,
  contatoVeterinario, setContatoVeterinario,
  houveVenda, setHouveVenda,
  tipoItem, setTipoItem,
  itemBusca, itemSugestoes,
  codItem, setCodItem,
  qtItem, setQtItem,
  fotosSelecionadas, fotosSalvas,
  salvandoEvidencia,
  camposAtivos,
  atividadesCatalogo, equipesCatalogo,
  itensAtividade,
  buscarItemSugestoes,
  adicionarItemAtividade,
  removerItemAtividade,
  escolherFotos,
  escolherFotosGaleria,
  tirarFotoCamera,
  removerFotoSelecionada,
  excluirFotoSalva,
  excluirEvidencia,
  salvarEvidencia,
}) {
  const isEdicao = !!atividadeSelecionada?.id_evidencia;
  const [previewFotoUri, setPreviewFotoUri] = useState("");
  const [excluindoFotoId, setExcluindoFotoId] = useState(null);
  const [erroFoto, setErroFoto] = useState("");
  const [fotoMenuAberto, setFotoMenuAberto] = useState(false);
  const [mostrarSugestoesItem, setMostrarSugestoesItem] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const previewTranslateY = useRef(new Animated.Value(0)).current;
  const formScrollRef = useRef(null);
  const observacaoInputRef = useRef(null);
  const itemBuscaInputRef = useRef(null);
  const qtItemInputRef = useRef(null);
  const itemBuscaOffsetY = useRef(0);
  const itemBuscaLabelY = useRef(0);
  const qtItemLabelY = useRef(0);
  const vetSectionY = useRef(0);
  const vetNomeLabelY = useRef(0);
  const vetContatoLabelY = useRef(0);
  const equipeSectionY = useRef(0);
  const qtdePessoaLabelY = useRef(0);
  const observacaoSectionY = useRef(0);
  const footerKeyboardOffset = keyboardHeight > 0 ? keyboardHeight : 0;

  const handleFocusObservacao = () => scrollToField(observacaoSectionY.current, 0);

  const CARD_OVERHEAD = 71;
  const scrollToField = (sectionY, fieldY = 0) => {
    setTimeout(() => {
      formScrollRef.current?.scrollTo({ y: sectionY + CARD_OVERHEAD + fieldY, animated: true });
    }, 120);
  };

  const handleFocusNomeVet = () => scrollToField(vetSectionY.current, vetNomeLabelY.current);
  const handleFocusContatoVet = () => scrollToField(vetSectionY.current, vetContatoLabelY.current);
  const handleFocusQtdePessoa = () => scrollToField(equipeSectionY.current, qtdePessoaLabelY.current);
  const handleFocusItemBusca = () => scrollToField(itemBuscaOffsetY.current, itemBuscaLabelY.current);
  const handleFocusQtItem = () => scrollToField(itemBuscaOffsetY.current, qtItemLabelY.current);

  const closePreview = () => {
    setPreviewFotoUri("");
    previewTranslateY.setValue(0);
  };

  const fecharModal = () => {
    Keyboard.dismiss();
    setPreviewFotoUri("");
    onClose();
  };

  useEffect(() => {
    if (!visible) {
      closePreview();
      setExcluindoFotoId(null);
      setErroFoto("");
      setFotoMenuAberto(false);
    }
  }, [visible]);

  useEffect(() => {
    if (previewFotoUri) {
      previewTranslateY.setValue(0);
      return;
    }
  }, [previewFotoUri]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e?.endCoordinates?.height || 0;
      setKeyboardHeight(h);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible || !isEdicao || keyboardHeight <= 0) return;

    const timer = setTimeout(() => {
      formScrollRef.current?.scrollToEnd({ animated: true });
    }, 140);

    return () => clearTimeout(timer);
  }, [visible, isEdicao, keyboardHeight]);

  const previewPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => (
      Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx)
    ),
    onPanResponderMove: (_, gesture) => {
      if (gesture.dy > 0) previewTranslateY.setValue(gesture.dy);
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 120 || gesture.vy > 1.15) {
        Animated.timing(previewTranslateY, {
          toValue: 500,
          duration: 180,
          useNativeDriver: true,
        }).start(() => closePreview());
        return;
      }
      Animated.spring(previewTranslateY, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }).start();
    },
  }), [previewTranslateY]);

  const handleExcluirFotoSalva = async (idArquivo) => {
    if (!idArquivo || excluindoFotoId) return;
    setErroFoto("");
    setExcluindoFotoId(idArquivo);
    try {
      await excluirFotoSalva(idArquivo);
    } catch {
      setErroFoto("Não foi possível excluir a foto agora. Tente novamente.");
    } finally {
      setExcluindoFotoId(null);
    }
  };

  if (!visible) return null;

  return (
    <View style={{ flex: 1 }}>
    <View style={[styles.section, { flex: 1, paddingHorizontal: 0, paddingBottom: 0, marginBottom: 0 }]}> 
      <View style={{ flex: 1, maxHeight: "100%" }}> 

          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
            <Pressable
              onPress={fecharModal}
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
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}> 
                {isEdicao ? "Editar atividade" : "Nova atividade"}
              </Text>
              <Text style={[styles.sectionSubtitle, { marginBottom: 0, marginTop: 2 }]}> 
                {isEdicao ? "Atualize os dados do registro selecionado." : "Selecione a atividade e preencha os campos."}
              </Text>
            </View>
          </View>

          <ScrollView
            ref={formScrollRef}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            contentContainerStyle={{ paddingBottom: 20 }}
          >

            {/* Tipo de atividade */}
            <SectionCard icon="list" title="Tipo de atividade *" first>
              {isEdicao && (
                <Text style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
                  O tipo não pode ser alterado após salvo.
                </Text>
              )}
              <View style={styles.selectWrap}>
                {atividadesCatalogo.map((a) => {
                  const ativo = Number(a.codigo) === Number(codAtividade);
                  return (
                    <Pressable
                      key={String(a.codigo)}
                      disabled={isEdicao}
                      style={[
                        styles.optionChip,
                        ativo ? styles.optionChipAtivo : null,
                        isEdicao && !ativo ? { opacity: 0.4 } : null,
                      ]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setCodAtividade(Number(a.codigo));
                        setNomeAtividade(String(a.descricao || ""));
                        // Limpa todos os campos ao trocar o tipo
                        setNomeVeterinario("");
                        setContatoVeterinario("");
                        setCodEquipe(0);
                        setNomeEquipe("");
                        setQtdePessoa("");
                        setFezQuiz("");
                        setComentario("");
                        setHouveVenda("");
                        setTipoItem("");
                        setCodItem(0);
                        setQtItem("");
                      }}
                    >
                      <Text style={[styles.optionChipText, ativo ? styles.optionChipTextAtivo : null]}>
                        {a.descricao}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SectionCard>

            {/* Veterinário */}
            <View onLayout={(e) => { vetSectionY.current = e.nativeEvent.layout.y; }}>
            {camposAtivos.cpveterinario && (
              <SectionCard icon="medkit-outline" title="Dados do veterinário">
                <View onLayout={(e) => { vetNomeLabelY.current = e.nativeEvent.layout.y; }}>
                <Text style={styles.label}>Nome completo *</Text>
                <TextInput
                  style={styles.input}
                  value={nomeVeterinario}
                  onFocus={handleFocusNomeVet}
                  onChangeText={(v) => setNomeVeterinario(v.toUpperCase())}
                  placeholder="Ex: DR. CARLOS SILVA"
                  placeholderTextColor="#94a3b8"
                />
                </View>
                <View onLayout={(e) => { vetContatoLabelY.current = e.nativeEvent.layout.y; }}>
                <Text style={styles.label}>Telefone de contato</Text>
                <TextInput
                  style={styles.input}
                  value={contatoVeterinario}
                  onFocus={handleFocusContatoVet}
                  keyboardType="phone-pad"
                  placeholder="(00) 00000-0000"
                  placeholderTextColor="#94a3b8"
                  onChangeText={(v) => setContatoVeterinario(formatarTelefone(v))}
                />
                </View>
              </SectionCard>
            )}
            </View>

            {/* Equipe */}
            <View onLayout={(e) => { equipeSectionY.current = e.nativeEvent.layout.y; }}>
            {camposAtivos.cpequipe && (
              <SectionCard icon="people-outline" title="Equipe treinada">
                <Text style={styles.label}>Selecione a equipe *</Text>
                <View style={styles.selectWrap}>
                  {equipesCatalogo.map((e) => (
                    <Pressable
                      key={String(e.codigo)}
                      style={[styles.optionChip, Number(e.codigo) === Number(codEquipe) ? styles.optionChipAtivo : null]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setCodEquipe(Number(e.codigo));
                        setNomeEquipe(String(e.descricao || ""));
                      }}
                    >
                      <Text style={[styles.optionChipText, Number(e.codigo) === Number(codEquipe) ? styles.optionChipTextAtivo : null]}>
                        {e.descricao}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {!!nomeEquipe && (
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: 6,
                    marginTop: 8, paddingHorizontal: 10, paddingVertical: 7,
                    backgroundColor: "#eff6ff", borderRadius: 8,
                  }}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                    <Text style={{ fontSize: 12, color: colors.accent, fontWeight: "600" }}>Equipe: {nomeEquipe}</Text>
                  </View>
                )}
                <View onLayout={(e) => { qtdePessoaLabelY.current = e.nativeEvent.layout.y; }}>
                <Text style={styles.label}>Quantidade de pessoas *</Text>
                <TextInput
                  style={styles.input}
                  value={qtdePessoa}
                  onFocus={handleFocusQtdePessoa}
                  onChangeText={(v) => setQtdePessoa(v.replace(/[^\d.,]/g, ""))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                />
                </View>
                <Text style={styles.label}>O quiz foi aplicado?</Text>
                <View style={[styles.row, { marginTop: 2 }]}> 
                  {[{ value: "S", label: "Sim" }, { value: "N", label: "Não" }].map((op) => (
                    <Pressable
                      key={op.value}
                      style={[styles.optionChip, fezQuiz === op.value ? styles.optionChipAtivo : null]}
                      onPress={() => { Keyboard.dismiss(); setFezQuiz(op.value); }}
                    >
                      <Text style={[styles.optionChipText, fezQuiz === op.value ? styles.optionChipTextAtivo : null]}>
                        {op.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </SectionCard>
            )}
            </View>

            {/* Itens */}
            <View onLayout={(e) => { itemBuscaOffsetY.current = e.nativeEvent.layout.y; }}>
            {camposAtivos.cpitem && (
              <SectionCard icon="cube-outline" title="Itens entregues">
                <Text style={styles.label}>Tipo de item</Text>
                <View style={[styles.row, { marginTop: 2 }]}> 
                  {[
                    { value: "AM", label: "Amostra" },
                    { value: "MT", label: "Material Técnico" },
                    { value: "BD", label: "Brinde" },
                  ].map((op) => (
                    <Pressable
                      key={op.value}
                      style={[styles.optionChip, tipoItem === op.value ? styles.optionChipAtivo : null]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setTipoItem(op.value);
                        buscarItemSugestoes("");
                        setCodItem(0);
                      }}
                    >
                      <Text style={[styles.optionChipText, tipoItem === op.value ? styles.optionChipTextAtivo : null]}>
                        {op.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View onLayout={(e) => { itemBuscaLabelY.current = e.nativeEvent.layout.y; }}>
                <Text style={styles.label}>Buscar item</Text>
                <TextInput
                  ref={itemBuscaInputRef}
                  style={styles.input}
                  value={itemBusca}
                  onFocus={handleFocusItemBusca}
                  onChangeText={(v) => {
                    setMostrarSugestoesItem(true);
                    buscarItemSugestoes(v);
                  }}
                  placeholder="Digite o nome do item..."
                  placeholderTextColor="#94a3b8"
                />
                {mostrarSugestoesItem && itemSugestoes.length > 0 && (
                  <View style={styles.suggestionsWrap}>
                    {itemSugestoes.map((it) => (
                      <Pressable
                        key={String(it.codigo)}
                        style={styles.suggestionItem}
                        onPress={() => {
                          setCodItem(Number(it.codigo));
                          buscarItemSugestoes(String(it.descricao || ""));
                          setMostrarSugestoesItem(false);
                          setTimeout(() => {
                            formScrollRef.current?.scrollTo({ y: itemBuscaOffsetY.current + CARD_OVERHEAD + qtItemLabelY.current, animated: true });
                          }, 80);
                          setTimeout(() => {
                            qtItemInputRef.current?.focus();
                          }, 220);
                        }}
                      >
                        <Text style={styles.suggestionTitle}>{it.descricao}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                </View>
                <View onLayout={(e) => { qtItemLabelY.current = e.nativeEvent.layout.y; }}>
                <Text style={styles.label}>Quantidade</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                  <TextInput
                    ref={qtItemInputRef}
                    style={[styles.input, { flex: 1 }]}
                    value={qtItem}
                    onFocus={handleFocusQtItem}
                    onChangeText={(v) => setQtItem(v.replace(/[^\d.,]/g, ""))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                  />
                  <Pressable
                    onPress={() => { Keyboard.dismiss(); adicionarItemAtividade(); }}
                    style={({ pressed }) => ({
                      minHeight: 48, paddingHorizontal: 16, borderRadius: 10,
                      backgroundColor: pressed ? "#1e3a8a" : "#1d4ed8",
                      alignItems: "center", justifyContent: "center",
                    })}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Inserir</Text>
                  </Pressable>
                </View>
                {itensAtividade.length > 0 && (
                  <View style={{ marginTop: 10, gap: 6 }}>
                    <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: "600" }}>
                      ITENS ADICIONADOS
                    </Text>
                    {itensAtividade.map((item) => (
                      <View key={String(item.reg || `${item.produto}-${item.quantidade}`)} style={styles.listItemCompact}>
                        <Ionicons name="cube" size={14} color="#94a3b8" />
                        <Text style={[styles.listItemTitle, { fontSize: 12 }]}>{item.produto}</Text>
                        <Text style={{ fontSize: 12, color: "#64748b", fontWeight: "600" }}>
                          {item.quantidade} · {item.tipo}
                        </Text>
                        <Pressable onPress={() => removerItemAtividade(item.reg)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </SectionCard>
            )}
            </View>

            {/* Venda */}
            {camposAtivos.cpvenda && (
              <SectionCard icon="cart-outline" title="Resultado de venda">
                <Text style={styles.label}>Houve venda nesta visita?</Text>
                <View style={[styles.row, { marginTop: 2 }]}> 
                  {[
                    { value: "S", label: "Sim, houve venda" },
                    { value: "N", label: "Não houve venda" },
                  ].map((op) => (
                    <Pressable
                      key={op.value}
                      style={[styles.optionChip, houveVenda === op.value ? styles.optionChipAtivo : null]}
                      onPress={() => { Keyboard.dismiss(); setHouveVenda(op.value); }}
                    >
                      <Text style={[styles.optionChipText, houveVenda === op.value ? styles.optionChipTextAtivo : null]}>
                        {op.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </SectionCard>
            )}

            {/* Fotos */}
            {camposAtivos.cpfoto && (
              <SectionCard icon="camera-outline" title="Evidência fotográfica">
                <Pressable
                  style={styles.btnOutline}
                  onPress={() => setFotoMenuAberto(true)}
                >
                  <Text style={styles.btnOutlineText}>Adicionar fotos (galeria ou câmera)</Text>
                </Pressable>
                {fotosSelecionadas.length > 0 && (
                  <View style={{ marginTop: 10, gap: 6 }}>
                    <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: "600" }}>
                      {fotosSelecionadas.length} {fotosSelecionadas.length === 1 ? "FOTO SELECIONADA" : "FOTOS SELECIONADAS"}
                    </Text>
                    {fotosSelecionadas.map((foto, idx) => (
                      <View key={`${foto.uri}-${idx}`} style={styles.photoRow}>
                        <Pressable onPress={() => setPreviewFotoUri(foto.uri)}>
                          <Image source={{ uri: foto.uri }} style={styles.photoThumb} />
                        </Pressable>
                        <Text style={styles.photoName} numberOfLines={1}>{foto.name}</Text>
                        <Pressable onPress={() => removerFotoSelecionada(foto.uri)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={17} color={colors.danger} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
                {fotosSalvas.length > 0 && (
                  <View style={{ marginTop: 10, gap: 6 }}>
                    <Text style={{ fontSize: 11, color: "#16a34a", fontWeight: "700" }}>
                      {fotosSalvas.length} {fotosSalvas.length === 1 ? "FOTO JÁ SALVA" : "FOTOS JÁ SALVAS"}
                    </Text>
                    {!!erroFoto && (
                      <Text style={{ fontSize: 12, color: "#b91c1c", fontWeight: "600" }}>{erroFoto}</Text>
                    )}
                    {fotosSalvas.map((foto, idx) => (
                      <View key={String(foto.id_arquivo || idx)} style={styles.photoRow}>
                        <Pressable onPress={() => setPreviewFotoUri(foto.url)}>
                          <Image source={{ uri: foto.url }} style={styles.photoThumb} />
                        </Pressable>
                        <Text style={styles.photoName} numberOfLines={1}>
                          {`Arquivo ${foto.id_arquivo || idx + 1}`}
                        </Text>
                        <Pressable
                          onPress={() => handleExcluirFotoSalva(foto.id_arquivo)}
                          hitSlop={8}
                          disabled={!!excluindoFotoId}
                        >
                          {excluindoFotoId === foto.id_arquivo
                            ? <ActivityIndicator size="small" color={colors.danger} />
                            : <Ionicons name="trash-outline" size={17} color={colors.danger} />
                          }
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </SectionCard>
            )}

            {/* Observação */}
            <View onLayout={(e) => { observacaoSectionY.current = e.nativeEvent.layout.y; }}>
            {camposAtivos.cpobservacao && (
              <SectionCard icon="create-outline" title="Observações">
                <TextInput
                  ref={observacaoInputRef}
                  style={[styles.textArea, { marginTop: 0 }]}
                  multiline
                  numberOfLines={5}
                  value={comentario}
                  onFocus={handleFocusObservacao}
                  onChangeText={setComentario}
                  placeholder="Descreva observações relevantes desta visita..."
                  placeholderTextColor="#94a3b8"
                />
              </SectionCard>
            )}
            </View>

          </ScrollView>

          <View style={{
            flexDirection: "row",
            gap: 8,
            paddingTop: 10,
            paddingBottom: 16,
            marginBottom: footerKeyboardOffset,
            borderTopWidth: 1,
            borderTopColor: "#e2e8f0",
            backgroundColor: "#f8fafc",
          }}>
            <Pressable style={styles.btnSecondary} onPress={fecharModal}>
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </Pressable>

            {isEdicao && (
              <Pressable
                style={[styles.btnDangerSmall, { paddingHorizontal: 16 }]}
                onPress={() => { Keyboard.dismiss(); excluirEvidencia(); }}
              >
                <Ionicons name="trash-outline" size={16} color="#fff" />
              </Pressable>
            )}

            <Pressable
              style={{ flex: 1, borderRadius: 12, overflow: "hidden", opacity: salvandoEvidencia ? 0.7 : 1 }}
              onPress={() => { Keyboard.dismiss(); salvarEvidencia(); }}
              disabled={salvandoEvidencia}
            >
              <LinearGradient
                colors={["#3f6cf6", "#2f59d9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.btnGradient, { minHeight: 46 }]}
              >
                {salvandoEvidencia
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnPrimaryText}>{isEdicao ? "Salvar alterações" : "Registrar atividade"}</Text>
                }
              </LinearGradient>
            </Pressable>
          </View>

          {/* Preview interno para evitar conflito de múltiplos Modals no Android */}
          {previewFotoUri ? (
            <Animated.View
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                backgroundColor: "#020617",
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 0,
                paddingTop: 22,
                paddingBottom: 10,
                zIndex: 50,
                transform: [{ translateY: previewTranslateY }],
              }}
            >
              <View style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
                paddingHorizontal: 14,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: "rgba(59,130,246,0.22)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Ionicons name="image-outline" size={16} color="#bfdbfe" />
                  </View>
                  <View>
                    <Text style={{ color: "#f8fafc", fontSize: 14, fontWeight: "800" }}>Visualização da foto</Text>
                    <Text style={{ color: "#94a3b8", fontSize: 11 }}>Deslize para baixo para fechar</Text>
                  </View>
                </View>

                <Pressable
                  onPress={closePreview}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: pressed ? "rgba(148,163,184,0.55)" : "rgba(30,41,59,0.65)",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 3,
                  })}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </Pressable>
              </View>

              <View
                style={{
                  width: "100%",
                  flex: 1,
                  backgroundColor: "#020617",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
                {...previewPanResponder.panHandlers}
              >
                <Image
                  source={{ uri: previewFotoUri }}
                  resizeMode="contain"
                  style={{ width: "100%", height: "100%", backgroundColor: "#020617" }}
                />

                <View style={{
                  position: "absolute",
                  bottom: 10,
                  alignSelf: "center",
                  backgroundColor: "rgba(15,23,42,0.72)",
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.3)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}>
                  <Text style={{ color: "#cbd5e1", fontSize: 11, fontWeight: "600" }}>
                    Pré-visualização em tela cheia
                  </Text>
                </View>
              </View>
            </Animated.View>
          ) : null}

          {fotoMenuAberto ? (
            <View style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: "rgba(2,6,23,0.55)",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 70,
            }}>
              <View style={{
                width: "100%",
                maxWidth: 360,
                borderRadius: 14,
                backgroundColor: "#fff",
                padding: 12,
                borderWidth: 1,
                borderColor: "#e2e8f0",
              }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#0f172a", marginBottom: 10 }}>
                  Adicionar foto
                </Text>
                <Pressable
                  style={[styles.btnPrimarySmall, { minHeight: 42, marginBottom: 8 }]}
                  onPress={async () => {
                    setFotoMenuAberto(false);
                    await escolherFotosGaleria();
                  }}
                >
                  <Text style={styles.btnPrimarySmallText}>Selecionar da galeria</Text>
                </Pressable>
                <Pressable
                  style={[styles.btnPrimarySmall, { minHeight: 42, marginBottom: 8 }]}
                  onPress={async () => {
                    setFotoMenuAberto(false);
                    await tirarFotoCamera();
                  }}
                >
                  <Text style={styles.btnPrimarySmallText}>Tirar foto com câmera</Text>
                </Pressable>
                <Pressable
                  style={[styles.btnSecondary, { minHeight: 42 }]}
                  onPress={() => setFotoMenuAberto(false)}
                >
                  <Text style={styles.btnSecondaryText}>Cancelar</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
      </View>
    </View>
    </View>
  );
}
