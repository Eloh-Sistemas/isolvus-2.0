import { iaConsultarDados } from '../../../models/iaModel.js';
import { GetIAAgenteSQL, iaAnalisaDados, iaGeraJsonDashboard } from '../../deepseekService.js';
import { isSqlSelectSafe, isSqlUsingOnlyAllowedTables } from '../../../utils/sqlValidator.js';

/**
 * Cache em memória com os dados da última tabela retornada por usuário.
 * Usado pelo handlerEnviarNotificacao para anexar dados na notificação.
 * Chave: id_usuario (number), Valor: array de objetos da consulta
 */
export const ultimaTabelaPorUsuario = new Map();

/**
 * Handler para a tool "consultar_dados".
 * Gera SQL, valida, executa e retorna análise + tabela + dashboard conforme solicitado.
 * A análise e o dashboard rodam em paralelo para ganho de performance.
 */
export async function handlerConsultarDados(pergunta, args, contextoConversa, metadata) {
  const { exibir_tabela, exibir_dashboard } = args;

  const { sql: sqlQuery, sqlConfig } = await GetIAAgenteSQL(pergunta, contextoConversa, metadata);

  if (!isSqlSelectSafe(sqlQuery)) {
    throw new Error('A IA retornou uma instrução SQL inválida ou não permitida.');
  }

  const allowedTables = (sqlConfig?.tables || []).map((row) => row.nome_tabela);
  const sqlValidation = isSqlUsingOnlyAllowedTables(sqlQuery, allowedTables);

  if (!sqlValidation.isValid) {
    throw new Error(`A IA tentou usar tabela(s) não cadastrada(s) no agente: ${sqlValidation.invalidTables.join(', ')}`);
  }

  const dadosIA = await iaConsultarDados(sqlQuery);

  // Guarda no cache para uso posterior (ex: enviar como anexo em notificação)
  if (dadosIA && dadosIA.length > 0) {
    ultimaTabelaPorUsuario.set(metadata.id_usuario, dadosIA);
  }

  const decideview = {
    explicacaosobreosdados: 'S',
    demostraremtabela: exibir_tabela,
    demostraremdasboard: exibir_dashboard,
  };

  const precisaTabela = exibir_tabela === 'S';
  const precisaDash = exibir_dashboard === 'S';

  // Análise e dashboard em paralelo
  const [respostaHumanizada, visaoDashboard] = await Promise.all([
    iaAnalisaDados(dadosIA, pergunta, decideview, contextoConversa, metadata),
    precisaDash
      ? iaGeraJsonDashboard(dadosIA, pergunta, contextoConversa, metadata)
      : Promise.resolve(undefined),
  ]);

  return {
    respostaAnalista: respostaHumanizada,
    tabela: precisaTabela ? dadosIA : undefined,
    dashboard: visaoDashboard,
  };
}
