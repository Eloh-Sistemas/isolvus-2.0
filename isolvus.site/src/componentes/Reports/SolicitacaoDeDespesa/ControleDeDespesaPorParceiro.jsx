import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import moment from 'moment';

const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 10, flexDirection: 'column', position: 'relative' },

  header: { borderBottom: '1px solid #000', paddingBottom: 5, marginBottom: 5 },
  title: { fontSize: 15, fontWeight: 'bold', marginBottom: 5 },

  headerLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },

  row: { flexDirection: 'row', borderBottom: '1px solid #ccc', paddingVertical: 4 },
  col: {
    flex: 1,
    paddingRight: 4,
    justifyContent: "center"
  },
  descCol: { flex: 2 },

  tableHeader: { backgroundColor: '#eee', fontWeight: 'bold' },

  labelBold: { fontWeight: 'bold' },

  totalLine: {
    marginTop: 20,
    flexDirection: "row",
    width: 250
  },

  totalLine2: {
    marginTop: 2,
    flexDirection: "row",
    width: 250
  },

  totalLabel: {
    width: 150,
    fontWeight: "bold"
  },

  totalValue: {
    flex: 1,
    textAlign: "right",
    fontWeight: "bold"
  },

  headerCol: {
  flex: 1,
  paddingRight: 4,
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "flex-start"
  },


  footer: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    fontSize: 9,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },

  footerLeft: { fontStyle: 'italic' },
  footerRight: { fontWeight: 'bold' }
});


export default function ControleDeDespesaPorParceiro({ filtros, dados }) {

  const funcionarios = dados || [];

  return (
    <Document>

      {funcionarios.map((func, idx) => {

        const movimentacao = func.movimentacao || [];

        /** 🔥 TOTALIZADORES */
        const totalCredito = movimentacao.reduce((acc, m) => acc + (m.credito ? Number(m.credito) : 0), 0);
        const totalDebito  = movimentacao.reduce((acc, m) => acc + (m.debito  ? Number(m.debito)  : 0), 0);
        const saldoFinal   = totalCredito + totalDebito;

        return (
          <Page key={idx} size="A4" orientation="landscape" style={styles.page}>

            {/* CABEÇALHO */}
            <View style={styles.header}>
              <Text style={styles.title}>1081 - CONTROLE DE DESPESAS POR PARCEIRO</Text>

              <View style={styles.headerLine}>
                <Text>
                  <Text style={styles.labelBold}>PERÍODO: </Text>
                  {moment(filtros.dataInicial).format("DD/MM/YYYY")} ATÉ {moment(filtros.dataFinal).format("DD/MM/YYYY")}
                </Text>

                <Text>
                  <Text style={styles.labelBold}>EMITIDO EM: </Text>
                  {new Date().toLocaleString('pt-BR')}
                </Text>
              </View>

              <View style={styles.headerLine}>                
                <Text>
                  <Text style={styles.labelBold}>FUNCIONÁRIO: </Text>
                  {func.nome}
                </Text>
                <Text>
                  <Text style={styles.labelBold}>USUÁRIO EMISSOR: </Text>
                  {filtros.nomeUsu}
                </Text>
              </View>
              
            </View>

            {/* LINHA */}
            <View style={{ marginBottom: 8 }}>     
            </View>

            {/* HEADER DA TABELA */}
            <View style={[styles.row, styles.tableHeader]}>
              <Text style={styles.col}>Solicitação</Text>
              <View style={styles.headerCol}>
                <Text>Data da</Text>
                <Text>Solicitada</Text>
              </View>
              <View style={styles.headerCol}>
                <Text>Data de</Text>
                <Text>Vencimento</Text>
              </View>
              <Text style={styles.col}>Tipo</Text>
              <Text style={styles.col}>Código</Text>
              <Text style={styles.descCol}>Descrição</Text>
              <Text style={styles.col}>Crédito</Text>
              <Text style={styles.col}>Débito</Text>
              <Text style={styles.col}>Saldo</Text>              
            </View>

            {/* MOVIMENTAÇÕES */}
            {movimentacao.length > 0 ? (
              movimentacao.map((m, i) => (
                <View key={i} style={styles.row}>
                  <Text style={styles.col}>{m.numsolicitacao || ""}</Text>

                  <Text style={styles.col}>
                    {m.data_lancamneto ? moment(m.data_lancamneto).format("DD/MM/YYYY") : ""}
                  </Text>

                  <Text style={styles.col}>
                    {m.data_vencimento ? moment(m.data_vencimento).format("DD/MM/YYYY") : ""}
                  </Text>

                  <Text style={styles.col}>{m.tipo || ""}</Text>
                  <Text style={styles.col}>{m.id_item || ""}</Text>
                  <Text style={styles.descCol}>{m.descricao || ""}</Text>

                  <Text style={styles.col}>{m.credito ? Number(m.credito).toFixed(2) : ""}</Text>
                  <Text style={styles.col}>{m.debito ? Number(m.debito).toFixed(2) : ""}</Text>
                  <Text style={styles.col}>{m.saldo ? Number(m.saldo).toFixed(2) : ""}</Text>
                  
                </View>
              ))
            ) : (
              <Text style={{ marginTop: 10, fontStyle: "italic" }}>Nenhuma movimentação encontrada.</Text>
            )}

            {/* 🔥 TOTALIZADORES */}
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>TOTAL DE CRÉDITOS:</Text>
              <Text style={[styles.totalValue, { color: "green" }]}>
                {totalCredito.toFixed(2)}
              </Text>
            </View>

            <View style={styles.totalLine2}>
              <Text style={styles.totalLabel}>TOTAL DE DÉBITOS:</Text>
              <Text style={[styles.totalValue, { color: "red" }]}>
                {totalDebito.toFixed(2)}
              </Text>
            </View>

            <View style={[styles.totalLine2, { borderTop: "1px solid #000", marginTop: 5 }]}>
              <Text style={styles.totalLabel}>SALDO FINAL:</Text>
              <Text style={[styles.totalValue, { color: saldoFinal >= 0 ? "green" : "red" }]}>
                {saldoFinal.toFixed(2)}
              </Text>
            </View>

            {/* FOOTER */}
            <View style={styles.footer} fixed>
              <Text style={styles.footerLeft}>Desenvolvido por Eloh Sistemas</Text>
              <Text
                style={styles.footerRight}
                render={({ pageNumber, totalPages }) =>
                  `Página ${pageNumber} de ${totalPages}`
                }
              />
            </View>

          </Page>
        );
      })}

    </Document>
  );
}
