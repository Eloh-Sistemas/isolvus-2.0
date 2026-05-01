import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useVisitaCliente } from "./hooks/useVisitaCliente";
import { styles } from "./styles";
import Step1Selecao from "./steps/Step1Selecao";
import Step2Historico from "./steps/Step2Historico";
import Step3Checkin from "./steps/Step3Checkin";
import Step4Atividades from "./steps/Step4Atividades";
import Step5Checkout from "./steps/Step5Checkout";
import ModalAtividade from "./modals/ModalAtividade";

export default function VisitaClienteScreen({ user }) {
  const ctx = useVisitaCliente(user);

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          (ctx.step === 2 || ctx.step === 3) && { paddingBottom: 16 },
          ctx.step === 2 && { flexGrow: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={ctx.step !== 2 && ctx.step !== 3}
      >
        {ctx.step === 1 && (
          <Step1Selecao
            clienteBusca={ctx.clienteBusca}
            setClienteBusca={ctx.setClienteBusca}
            clientesSugestoes={ctx.clientesSugestoes}
            setClientesSugestoes={ctx.setClientesSugestoes}
            loadingClienteBusca={ctx.loadingClienteBusca}
            clienteSelecionado={ctx.clienteSelecionado}
            setClienteSelecionado={ctx.setClienteSelecionado}
            setCgc={ctx.setCgc}
            setContato={ctx.setContato}
            setEmail={ctx.setEmail}
            cgc={ctx.cgc}
            contato={ctx.contato}
            email={ctx.email}
            clienteSearchFocused={ctx.clienteSearchFocused}
            setClienteSearchFocused={ctx.setClienteSearchFocused}
            buscarClientes={ctx.buscarClientes}
            consultarClienteCompleto={ctx.consultarClienteCompleto}
            promotorDescricao={ctx.promotorDescricao}
            avancar={ctx.avancar}
          />
        )}

        {ctx.step === 2 && (
          <Step2Historico
            clienteSelecionado={ctx.clienteSelecionado}
            loadingHistorico={ctx.loadingHistorico}
            historico={ctx.historico}
            voltar={ctx.voltar}
            setIdVisita={ctx.setIdVisita}
            setDataCheckin={ctx.setDataCheckin}
            setStep={ctx.setStep}
          />
        )}

        {ctx.step === 3 && (
          <Step3Checkin
            clienteSelecionado={ctx.clienteSelecionado}
            distancia={ctx.distancia}
            idJustificativa={ctx.idJustificativa}
            regionCheckin={ctx.regionCheckin}
            localizacaoPromotor={ctx.localizacaoPromotor}
            clienteTemCoordenada={ctx.clienteTemCoordenada}
            clienteLat={ctx.clienteLat}
            clienteLng={ctx.clienteLng}
            gpsAguardando={ctx.gpsAguardando}
            dataCheckin={ctx.dataCheckin}
            enderecoPromotor={ctx.enderecoPromotor}
            enderecoCliente={ctx.enderecoCliente}
            checkinMapRef={ctx.checkinMapRef}
            voltar={ctx.voltar}
            atualizarDadosCheckin={ctx.atualizarDadosCheckin}
            avancar={ctx.avancar}
            setShowJustificativaModal={ctx.setShowJustificativaModal}
          />
        )}

        {ctx.step === 4 && (
          <Step4Atividades
            idVisita={ctx.idVisita}
            clienteSelecionado={ctx.clienteSelecionado}
            loadingAtividades={ctx.loadingAtividades}
            atividades={ctx.atividades}
            voltar={ctx.voltar}
            avancar={ctx.avancar}
            abrirModalAtividade={ctx.abrirModalAtividade}
          />
        )}

        {ctx.step === 5 && (
          <Step5Checkout
            loadingCheckout={ctx.loadingCheckout}
            regionCheckout={ctx.regionCheckout}
            pontoCheckout={ctx.pontoCheckout}
            dataCheckin={ctx.dataCheckin}
            dataCheckout={ctx.dataCheckout}
            tempoAtendimento={ctx.tempoAtendimento}
            atividadeRealizadaTexto={ctx.atividadeRealizadaTexto}
            localizacaoCheckout={ctx.localizacaoCheckout}
            voltar={ctx.voltar}
            fazerCheckout={ctx.fazerCheckout}
          />
        )}
      </ScrollView>

      {/* Botão fixo Nova Visita no step 2 */}
      {ctx.step === 2 && (
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingBottom: 24, paddingTop: 8, backgroundColor: "transparent" }}>
          <Pressable style={({ pressed }) => [styles.btnPrimaryFull, pressed && styles.btnPressed]} onPress={ctx.avancar}>
            <LinearGradient colors={["#3f6cf6", "#2f59d9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnGradient}>
              <Text style={styles.btnPrimaryText}>Nova Visita</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {/* Overlay GPS */}
      <Modal visible={ctx.gpsAguardando} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(2,6,23,0.72)", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Capturando localização</Text>
          <Text style={{ color: "#94a3b8", fontSize: 13 }}>Aguarde, buscando alta precisão...</Text>
        </View>
      </Modal>

      {/* Modal Justificativa */}
      <Modal visible={ctx.showJustificativaModal} transparent animationType="fade" onRequestClose={() => ctx.setShowJustificativaModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selecionar justificativa</Text>
            <FlatList
              data={ctx.justificativas}
              keyExtractor={(item) => String(item.idjustificativa)}
              ListEmptyComponent={<Text style={styles.stateText}>Nenhuma justificativa encontrada.</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalListItem}
                  onPress={() => {
                    ctx.setIdJustificativa(Number(item.idjustificativa));
                    ctx.setShowJustificativaModal(false);
                  }}
                >
                  <Text style={styles.modalListItemText}>{item.idjustificativa} - {item.justificativa}</Text>
                </Pressable>
              )}
            />
            <Pressable style={styles.btnSecondary} onPress={() => ctx.setShowJustificativaModal(false)}>
              <Text style={styles.btnSecondaryText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Atividade */}
      {ctx.showAtividadeModal && (
        <ModalAtividade
          visible={ctx.showAtividadeModal}
          onClose={() => ctx.setShowAtividadeModal(false)}
          atividadeSelecionada={ctx.atividadeSelecionada}
          codAtividade={ctx.codAtividade} setCodAtividade={ctx.setCodAtividade}
          nomeAtividade={ctx.nomeAtividade} setNomeAtividade={ctx.setNomeAtividade}
          codEquipe={ctx.codEquipe} setCodEquipe={ctx.setCodEquipe}
          nomeEquipe={ctx.nomeEquipe} setNomeEquipe={ctx.setNomeEquipe}
          qtdePessoa={ctx.qtdePessoa} setQtdePessoa={ctx.setQtdePessoa}
          fezQuiz={ctx.fezQuiz} setFezQuiz={ctx.setFezQuiz}
          comentario={ctx.comentario} setComentario={ctx.setComentario}
          nomeVeterinario={ctx.nomeVeterinario} setNomeVeterinario={ctx.setNomeVeterinario}
          contatoVeterinario={ctx.contatoVeterinario} setContatoVeterinario={ctx.setContatoVeterinario}
          houveVenda={ctx.houveVenda} setHouveVenda={ctx.setHouveVenda}
          tipoItem={ctx.tipoItem} setTipoItem={ctx.setTipoItem}
          itemBusca={ctx.itemBusca} itemSugestoes={ctx.itemSugestoes}
          codItem={ctx.codItem} setCodItem={ctx.setCodItem}
          qtItem={ctx.qtItem} setQtItem={ctx.setQtItem}
          fotosSelecionadas={ctx.fotosSelecionadas} fotosSalvas={ctx.fotosSalvas}
          salvandoEvidencia={ctx.salvandoEvidencia}
          camposAtivos={ctx.camposAtivos}
          atividadesCatalogo={ctx.atividadesCatalogo} equipesCatalogo={ctx.equipesCatalogo}
          itensAtividade={ctx.itensAtividade}
          buscarItemSugestoes={ctx.buscarItemSugestoes}
          adicionarItemAtividade={ctx.adicionarItemAtividade}
          removerItemAtividade={ctx.removerItemAtividade}
          escolherFotos={ctx.escolherFotos}
          escolherFotosGaleria={ctx.escolherFotosGaleria}
          tirarFotoCamera={ctx.tirarFotoCamera}
          removerFotoSelecionada={ctx.removerFotoSelecionada}
          excluirFotoSalva={ctx.excluirFotoSalva}
          excluirEvidencia={ctx.excluirEvidencia}
          salvarEvidencia={ctx.salvarEvidencia}
        />
      )}
    </View>
  );
}
