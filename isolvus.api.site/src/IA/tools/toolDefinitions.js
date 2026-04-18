/**
 * Definição das ferramentas disponíveis para a Eloh.
 * Para adicionar um novo recurso: inclua um novo objeto neste array
 * e crie o handler correspondente em ./handlers/.
 */
export const elohTools = [
  {
    type: 'function',
    function: {
      name: 'consultar_dados',
      description:
        'Consulta dados do banco de dados da empresa para responder perguntas sobre negócio: ' +
        'relatórios, totais, listagens, faturamento, inadimplência, pedidos, clientes, ' +
        'fornecedores, funcionários, veículos, caixa, despesas, vales, etc. ' +
        'Use sempre que o usuário quiser qualquer dado que está armazenado no sistema.',
      parameters: {
        type: 'object',
        properties: {
          exibir_tabela: {
            type: 'string',
            enum: ['S', 'N'],
            description:
              'S se os dados devem ser apresentados em tabela. ' +
              'Use S para listagens com múltiplos registros ou quando o usuário pedir uma planilha.',
          },
          exibir_dashboard: {
            type: 'string',
            enum: ['S', 'N'],
            description:
              'S se os dados devem ser apresentados em gráfico/dashboard. ' +
              'Use S quando o usuário pedir gráfico, visual, dashboard, ou quando os dados forem comparativos/evolutivos.',
          },
        },
        required: ['exibir_tabela', 'exibir_dashboard'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'enviar_notificacao',
      description:
        'Envia uma notificação interna do sistema para um usuário específico. ' +
        'Use quando o usuário quiser avisar, alertar, notificar ou mandar recado para outra pessoa dentro do sistema.',
      parameters: {
        type: 'object',
        properties: {
          destinatario_nome: {
            type: 'string',
            description: 'Nome ou parte do nome do destinatário da notificação.',
          },
          titulo: {
            type: 'string',
            description: 'Título curto e objetivo da notificação.',
          },
          mensagem: {
            type: 'string',
            description: 'Conteúdo completo da mensagem da notificação.',
          },
          incluir_dados_tabela: {
            type: 'string',
            enum: ['S', 'N'],
            description:
              'S se o usuário quiser incluir os dados da última tabela/planilha gerada como anexo na notificação. ' +
              'Use S quando o usuário pedir para enviar a planilha, os dados, o relatório ou o resultado junto com a notificação.',
          },
        },
        required: ['destinatario_nome', 'titulo', 'mensagem', 'incluir_dados_tabela'],
      },
    },
  },
];
