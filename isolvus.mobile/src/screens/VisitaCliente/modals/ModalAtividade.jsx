import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../theme/colors";
import { styles } from "../styles";
import { formatarTelefone } from "../utils";

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
  excluirEvidencia,
  salvarEvidencia,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCardLarge}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Evidencia da atividade</Text>

            <Text style={styles.label}>Atividade *</Text>
            <View style={styles.selectWrap}>
              {atividadesCatalogo.map((a) => (
                <Pressable
                  key={String(a.codigo)}
                  style={[styles.optionChip, Number(a.codigo) === Number(codAtividade) ? styles.optionChipAtivo : null]}
                  onPress={() => {
                    setCodAtividade(Number(a.codigo));
                    setNomeAtividade(String(a.descricao || ""));
                  }}
                >
                  <Text style={[styles.optionChipText, Number(a.codigo) === Number(codAtividade) ? styles.optionChipTextAtivo : null]}>
                    {a.descricao}
                  </Text>
                </Pressable>
              ))}
            </View>

            {camposAtivos.cpveterinario && (
              <>
                <Text style={styles.subsectionTitle}>Veterinario</Text>
                <Text style={styles.label}>Nome *</Text>
                <TextInput style={styles.input} value={nomeVeterinario} onChangeText={(v) => setNomeVeterinario(v.toUpperCase())} />
                <Text style={styles.label}>Telefone</Text>
                <TextInput
                  style={styles.input}
                  value={contatoVeterinario}
                  keyboardType="phone-pad"
                  onChangeText={(v) => setContatoVeterinario(formatarTelefone(v))}
                />
              </>
            )}

            {camposAtivos.cpequipe && (
              <>
                <Text style={styles.subsectionTitle}>Equipe treinada</Text>
                <Text style={styles.label}>Equipe *</Text>
                <View style={styles.selectWrap}>
                  {equipesCatalogo.map((e) => (
                    <Pressable
                      key={String(e.codigo)}
                      style={[styles.optionChip, Number(e.codigo) === Number(codEquipe) ? styles.optionChipAtivo : null]}
                      onPress={() => {
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

                {!!nomeEquipe && <Text style={styles.hintText}>Equipe: {nomeEquipe}</Text>}

                <Text style={styles.label}>Qtd pessoas *</Text>
                <TextInput
                  style={styles.input}
                  value={qtdePessoa}
                  onChangeText={(v) => setQtdePessoa(v.replace(/[^\d.,]/g, ""))}
                  keyboardType="decimal-pad"
                />

                <Text style={styles.label}>Fez quiz?</Text>
                <View style={styles.row}>
                  {[{ value: "S", label: "Sim" }, { value: "N", label: "Nao" }].map((op) => (
                    <Pressable
                      key={op.value}
                      style={[styles.optionChip, fezQuiz === op.value ? styles.optionChipAtivo : null]}
                      onPress={() => setFezQuiz(op.value)}
                    >
                      <Text style={[styles.optionChipText, fezQuiz === op.value ? styles.optionChipTextAtivo : null]}>
                        {op.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {camposAtivos.cpitem && (
              <>
                <Text style={styles.subsectionTitle}>Itens</Text>
                <View style={styles.row}>
                  {[
                    { value: "AM", label: "Amostra" },
                    { value: "MT", label: "Material Tec." },
                    { value: "BD", label: "Brinde" },
                  ].map((op) => (
                    <Pressable
                      key={op.value}
                      style={[styles.optionChip, tipoItem === op.value ? styles.optionChipAtivo : null]}
                      onPress={() => {
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

                <Text style={styles.label}>Item</Text>
                <TextInput
                  style={styles.input}
                  value={itemBusca}
                  onChangeText={buscarItemSugestoes}
                  placeholder="Buscar item"
                  placeholderTextColor="#94a3b8"
                />
                {itemSugestoes.length > 0 && (
                  <View style={styles.suggestionsWrap}>
                    {itemSugestoes.map((it) => (
                      <Pressable
                        key={String(it.codigo)}
                        style={styles.suggestionItem}
                        onPress={() => {
                          setCodItem(Number(it.codigo));
                          buscarItemSugestoes(String(it.descricao || ""));
                        }}
                      >
                        <Text style={styles.suggestionTitle}>{it.descricao}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                <Text style={styles.label}>Quantidade</Text>
                <View style={styles.rowBetween}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    value={qtItem}
                    onChangeText={(v) => setQtItem(v.replace(/[^\d.,]/g, ""))}
                    keyboardType="decimal-pad"
                  />
                  <Pressable style={styles.btnPrimarySmall} onPress={adicionarItemAtividade}>
                    <Text style={styles.btnPrimarySmallText}>Adicionar</Text>
                  </Pressable>
                </View>

                {itensAtividade.map((item) => (
                  <View key={String(item.reg || `${item.produto}-${item.quantidade}`)} style={styles.listItemCompact}>
                    <Text style={styles.listItemTitle}>{item.produto} - {item.quantidade} ({item.tipo})</Text>
                    <Pressable onPress={() => removerItemAtividade(item.reg)}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                ))}
              </>
            )}

            {camposAtivos.cpvenda && (
              <>
                <Text style={styles.subsectionTitle}>Venda</Text>
                <View style={styles.row}>
                  {[
                    { value: "S", label: "Houve venda: Sim" },
                    { value: "N", label: "Houve venda: Nao" },
                  ].map((op) => (
                    <Pressable
                      key={op.value}
                      style={[styles.optionChip, houveVenda === op.value ? styles.optionChipAtivo : null]}
                      onPress={() => setHouveVenda(op.value)}
                    >
                      <Text style={[styles.optionChipText, houveVenda === op.value ? styles.optionChipTextAtivo : null]}>
                        {op.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {camposAtivos.cpfoto && (
              <>
                <Text style={styles.subsectionTitle}>Fotos</Text>
                <Pressable style={styles.btnOutline} onPress={escolherFotos}>
                  <Text style={styles.btnOutlineText}>Selecionar foto</Text>
                </Pressable>
                {fotosSelecionadas.map((foto, idx) => (
                  <View key={`${foto.uri}-${idx}`} style={styles.photoRow}>
                    <Image source={{ uri: foto.uri }} style={styles.photoThumb} />
                    <Text style={styles.photoName} numberOfLines={1}>{foto.name}</Text>
                  </View>
                ))}
                {fotosSalvas.length > 0 && (
                  <Text style={styles.hintText}>Arquivos salvos: {fotosSalvas.length}</Text>
                )}
              </>
            )}

            {camposAtivos.cpobservacao && (
              <>
                <Text style={styles.subsectionTitle}>Observacao</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={5}
                  value={comentario}
                  onChangeText={setComentario}
                  placeholder="Descreva a observacao"
                  placeholderTextColor="#94a3b8"
                />
              </>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.btnSecondary} onPress={onClose}>
                <Text style={styles.btnSecondaryText}>Voltar</Text>
              </Pressable>

              {atividadeSelecionada?.id_evidencia ? (
                <Pressable style={styles.btnDangerSmall} onPress={excluirEvidencia}>
                  <Text style={styles.btnDangerSmallText}>Excluir</Text>
                </Pressable>
              ) : null}

              <Pressable style={styles.btnPrimary} onPress={salvarEvidencia} disabled={salvandoEvidencia}>
                {salvandoEvidencia
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnPrimaryText}>Salvar</Text>
                }
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
