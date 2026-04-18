import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import moment from 'moment';
import { Font } from '@react-pdf/renderer';

Font.registerHyphenationCallback(word => [word]);

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 7.5,
    flexDirection: 'column',
    position: 'relative'
  },

  /* ================= HEADER ================= */

  header: {
    borderBottom: '1px solid #000',
    paddingBottom: 6,
    marginBottom: 8
  },

  title: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 5
  },

  headerLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },

  labelBold: {
    fontWeight: 'bold'
  },

  /* ================= TABELA ================= */

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#eee',    
    border: '1px dashed #b9b9b9',
    paddingVertical: 4
  },

  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #ccc',
    paddingVertical: 4
  },

  totalRow: {
    flexDirection: 'row',
    borderTop: '2px solid #000',
    paddingVertical: 5,
    marginTop: 3
  },

  th: {
    fontWeight: 'bold'
  },

  thLeft: {
    fontWeight: 'bold',
    textAlign: 'left'
  },

  right: {
    textAlign: 'right'
  },

  /* ===== LARGURA DAS COLUNAS ===== */

  colSolic: { width: 70, paddingLeft: 6},
  colFilial: { width: 35 },
  colSetor: { width: 150 },
  colNome: {
    width: 130,
    paddingRight: 6
  },
  colFav: {
    width: 130,
    paddingLeft: 6,
    paddingRight: 6
  },
  colMotivo: { width: 100,
    paddingLeft: 6,
    paddingRight: 6 },
  colBanco: { width: 90 },
  colDadosBancario: { width: 160 },
  colValor: { width: 55 },
  colVale: { width: 45 },
  colLiquido: { width: 60, paddingRight: 6 },

  /* ================= ASSINATURAS ================= */

  blocoAssinaturas: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20
  },

  linhaAssinaturas: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },

  assinaturaBox: {
    width: '45%',
    alignItems: 'center'
  },

  linhaAssinatura: {
    borderTop: '1px solid #000',
    width: '100%',
    marginBottom: 4
  },

  assinaturaLabel: {
    fontSize: 9,
    fontWeight: 'bold'
  },

  assinaturaData: {
    marginTop: 4,
    fontSize: 8
  },

  /* ================= FOOTER ================= */

  footer: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    fontSize: 9,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },

  footerLeft: {
    fontStyle: 'italic'
  },

  footerRight: {
    fontWeight: 'bold'
  }
});

export default function AutorizacaoDePagamento({ filtros, dados = [] }) {

  /* ================= TOTALIZADOR ================= */
  const totalLiquido = dados.reduce((total, item) => {
    return total + Number(item.vlliquido || 0);
  }, 0);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>

        {/* ================= CABEÇALHO ================= */}
        <View style={styles.header}>
          <Text style={styles.title}>1082 - AUTORIZAÇÃO DE PAGAMENTO</Text>

          <View style={styles.headerLine}>
            <Text>
              <Text style={styles.labelBold}>FILIAL: </Text>
              {filtros.idFilialDespesa || 'TODAS'}
            </Text>

            <Text>
              <Text style={styles.labelBold}>PERÍODO: </Text>
              {moment(filtros.dataInicial).format('DD/MM/YYYY')} ATÉ{' '}
              {moment(filtros.dataFinal).format('DD/MM/YYYY')}
            </Text>
          </View>

          <View style={styles.headerLine}>
            <Text>
              <Text style={styles.labelBold}>CONTA GERENCIAL: </Text>
              {filtros.descricaoConta || 'TODAS'}
            </Text>

            <Text>
              <Text style={styles.labelBold}>CENTRO DE CUSTO: </Text>
              {filtros.descricaoCentroDeCusto || 'TODAS'}
            </Text>
          </View>

          <View style={styles.headerLine}>
            <Text>
              <Text style={styles.labelBold}>PARCEIRO: </Text>
              {filtros.Fornecedor || 'TODOS'}
            </Text>

            <Text>
              <Text style={styles.labelBold}>STATUS DA SOLICITAÇÃO: </Text>
              {filtros.status || 'TODOS'}
            </Text>

            <Text>
              <Text style={styles.labelBold}>TIPO PARCEIRO: </Text>
              {filtros.labeltipoParceiro || 'TODOS'}
            </Text>
          </View>
        </View>

        {/* ================= HEADER DA TABELA ================= */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colSolic, styles.thLeft]}>Solic.{'\n'}Data</Text>
          <Text style={[styles.colFilial, styles.thLeft]}>Filial</Text>
          <Text style={[styles.colSetor, styles.thLeft]}>Setor</Text>
          <Text style={[styles.colNome, styles.thLeft]}>Nome</Text>
          <Text style={[styles.colFav, styles.thLeft]}>Favorecido</Text>
          <Text style={[styles.colMotivo, styles.thLeft]}>Motivo</Text>
          <Text style={[styles.colBanco, styles.thLeft]}>Forma de Pagamento</Text>
          <Text style={[styles.colDadosBancario, styles.thLeft]}>
            Dados Bancários
          </Text>

          <Text style={[styles.colValor, styles.th, styles.right]}>Valor</Text>
          <Text style={[styles.colVale, styles.th, styles.right]}>Vale</Text>
          <Text style={[styles.colLiquido, styles.th, styles.right]}>
            Valor{'\n'}Líquido
          </Text>
        </View>

        {/* ================= DADOS ================= */}
        {dados.map((lanc, i) => (
          <View key={i} style={styles.tableRow}>
            <View style={styles.colSolic}>
              <Text>{lanc.numsolicitacao}</Text>
              <Text>{moment(lanc.datasolicitacao).format('DD/MM/YYYY')}</Text>
            </View>

            <Text style={styles.colFilial}>{lanc.id_filialdespesa}</Text>
            <Text style={styles.colSetor}>{lanc.setor}</Text>
            <Text style={styles.colNome}>{lanc.parceiro}</Text>
            <Text style={styles.colFav}>{lanc.favorecido}</Text>
            <Text style={styles.colMotivo}>{lanc.descricao}</Text>
            <Text style={styles.colBanco}>{lanc.formadepagamento}</Text>

            <View style={styles.colDadosBancario}>
              <Text>{lanc.banco || ' '}</Text>
              <Text>
                {(lanc.agencia || lanc.contabancaria || lanc.operacao)
                  ? `AG: ${lanc.agencia || ''} / CC: ${lanc.contabancaria || ''} / OP: ${lanc.operacao || ''}`
                  : ' '}
              </Text>
            </View>

            <Text style={[styles.colValor, styles.right]}>{lanc.total}</Text>
            <Text style={[styles.colVale, styles.right]}>{lanc.vale}</Text>
            <Text style={[styles.colLiquido, styles.right]}>{lanc.vlliquido}</Text>
          </View>
        ))}

        {/* ================= TOTALIZADOR ================= */}
        <View style={styles.totalRow}>
          <Text style={{ width: 955, textAlign: 'right', fontWeight: 'bold' }}>
            TOTAL GERAL:
          </Text>
          <Text style={[styles.colLiquido, styles.right, { fontWeight: 'bold' }]}>
            {totalLiquido.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
          </Text>
        </View>

        {/* ================= ASSINATURAS ================= */}
        <View style={styles.blocoAssinaturas} fixed>
          <View style={styles.linhaAssinaturas}>
            <View style={styles.assinaturaBox}>
              <View style={styles.linhaAssinatura} />
              <Text style={styles.assinaturaLabel}>ORDENADOR</Text>
              <Text style={styles.assinaturaData}>
                Data: ____ / ____ / ______
              </Text>
            </View>

            <View style={styles.assinaturaBox}>
              <View style={styles.linhaAssinatura} />
              <Text style={styles.assinaturaLabel}>DIRETORIA</Text>
              <Text style={styles.assinaturaData}>
                Data: ____ / ____ / ______
              </Text>
            </View>
          </View>
        </View>

        {/* ================= FOOTER ================= */}
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
    </Document>
  );
}
