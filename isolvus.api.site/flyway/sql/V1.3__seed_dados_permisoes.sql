-- =============================================================================
-- V1.3 - SEED DADOS DE SUBPERMISSOES
-- Carrega subpermissoes de rotinas de forma idempotente.
-- Chave natural: ID_SUBPERMISSAO
-- =============================================================================

-- Seed dos modulos base para garantir integridade referencial das rotinas.
MERGE INTO BSTAB_MODULOS d
USING (
    SELECT 1  AS ID_MODULO,  'Configuracoes'           AS MODULO, TIMESTAMP'2024-03-09 00:00:00' AS DTCRIACAO FROM DUAL
    UNION ALL SELECT 10, 'Financeiro',                 TIMESTAMP'2024-03-09 00:00:00' FROM DUAL
    UNION ALL SELECT 30, 'Promotor',                   TIMESTAMP'2025-03-14 23:29:07' FROM DUAL
    UNION ALL SELECT 5,  'Usuario',                    TIMESTAMP'2024-07-09 14:44:13' FROM DUAL
    UNION ALL SELECT 40, 'Inteligencia Artificial',    TIMESTAMP'2025-04-10 11:49:52' FROM DUAL
    UNION ALL SELECT 20, 'Frota',                      TIMESTAMP'2025-01-28 09:06:54' FROM DUAL
    UNION ALL SELECT 70, 'Comercial',                  TIMESTAMP'2025-05-23 16:33:42' FROM DUAL
    UNION ALL SELECT 50, 'Cadastro',                   TIMESTAMP'2025-08-05 10:45:10' FROM DUAL
    UNION ALL SELECT 60, 'Departamento Pessoal',       TIMESTAMP'2025-09-04 13:29:41' FROM DUAL
    UNION ALL SELECT 80, 'Comunicacao',                TIMESTAMP'2026-04-18 16:10:00' FROM DUAL
) s
ON (d.ID_MODULO = s.ID_MODULO)
WHEN MATCHED THEN UPDATE SET
    d.MODULO    = s.MODULO,
    d.DTCRIACAO = s.DTCRIACAO
WHEN NOT MATCHED THEN INSERT (
    ID_MODULO,
    MODULO,
    DTCRIACAO
) VALUES (
    s.ID_MODULO,
    s.MODULO,
    s.DTCRIACAO
);

-- Seed das rotinas base para garantir integridade referencial das subpermissoes.
MERGE INTO BSTAB_ROTINAS d
USING (
    SELECT 1030 AS ID_ROTINA, 'Lancar Despesa'                      AS ROTINA, '1.0' AS VERSAO, TIMESTAMP'2024-03-09 17:15:11' AS DTCRIACAO, CAST(NULL AS TIMESTAMP) AS DTATUALIZACAO, 10 AS ID_MODULO, '/SolicitacaoDeDespesa/Solicitar'            AS CAMINHO, 'solicitardespesa' AS SCREEN FROM DUAL
    UNION ALL SELECT 1031, 'Direcionar Despesa',                    '1.0', TIMESTAMP'2024-03-17 15:46:00', NULL, 10, '/SolicitacaoDeDespesa/Direcionar',            NULL FROM DUAL
    UNION ALL SELECT 1032, 'Aprova Despesa',                        '1.0', TIMESTAMP'2024-04-03 11:37:42', NULL, 10, '/SolicitacaoDeDespesa/Aprovar',               NULL FROM DUAL
    UNION ALL SELECT 1035, 'Vincular Contar a Ordenador',           '1.0', TIMESTAMP'2025-02-13 12:46:10', NULL, 10, '/VincularContaOrdendador',                     NULL FROM DUAL
    UNION ALL SELECT 2,    'API End-Point',                         '1.1', TIMESTAMP'2024-04-10 13:58:30', NULL, 1,  '/Api/EndPoint',                                NULL FROM DUAL
    UNION ALL SELECT 1033, 'Lancamento do Orcamento Mensal',        '1.0', TIMESTAMP'2024-04-29 12:54:56', NULL, 10, '/OrcamentoMensal',                              NULL FROM DUAL
    UNION ALL SELECT 50,   'Permissoes',                            '1.0', TIMESTAMP'2024-07-09 14:44:55', NULL, 5,  '/Permissao/Usuario',                           NULL FROM DUAL
    UNION ALL SELECT 51,   'Cadastro de Funcionario',               '1.0', TIMESTAMP'2024-11-28 22:05:30', NULL, 5,  '/Cadastro/Usuario',                            NULL FROM DUAL
    UNION ALL SELECT 201,  'Cadastro de Filial',                    '1.0', TIMESTAMP'2024-12-09 10:33:59', NULL, 1,  '/Configuracao/CadastroDeFilial',               NULL FROM DUAL
    UNION ALL SELECT 1080, 'Acompanhamento de Despesa',             '1.0', TIMESTAMP'2025-01-15 16:06:13', NULL, 10, '/SolicitacaoDeDespesa/AcompanhamentoDespesa',  NULL FROM DUAL
    UNION ALL SELECT 2001, 'Cadastro de Veiculo',                   '1.0', TIMESTAMP'2025-01-28 09:07:43', NULL, 20, '/Frota/CadastroDeVeiculo',                     NULL FROM DUAL
    UNION ALL SELECT 1034, 'Cadastro de Item para Despesas',        '1.0', TIMESTAMP'2025-02-13 12:46:10', NULL, 10, '/CadastrodeItem',                              NULL FROM DUAL
    UNION ALL SELECT 3001, 'Visita ao Cliente',                     '1.0', TIMESTAMP'2025-03-14 23:31:37', NULL, 30, '/Promotor/VisitaCliente',                      NULL FROM DUAL
    UNION ALL SELECT 3010, 'Acompanhamento de Visita',              '1.0', TIMESTAMP'2025-03-29 15:16:17', NULL, 30, '/Promotor/AcompanhamentoDeVisita',            NULL FROM DUAL
    UNION ALL SELECT 4001, 'Eloah',                                 '1.0', TIMESTAMP'2025-04-10 11:52:59', NULL, 40, '/IA/AnalistaDeDados',                         NULL FROM DUAL
    UNION ALL SELECT 7020, 'Integracao com Fornecedor',             '1.0', TIMESTAMP'2025-05-23 16:35:41', NULL, 70, '/Comercial/IntegracaoFornecedor/Cadastro',     NULL FROM DUAL
    UNION ALL SELECT 5010, 'Pre Cadastro de Cliente',               '1.0', TIMESTAMP'2025-08-05 10:52:24', NULL, 50, '/PreCadastro/Cliente',                        NULL FROM DUAL
    UNION ALL SELECT 5011, 'Auditar Localizacao',                   '1.0', TIMESTAMP'2025-08-28 12:17:05', NULL, 50, '/Auditar/Localizacao/Cliente',                 NULL FROM DUAL
    UNION ALL SELECT 1036, 'Liberacao Financeiro',                  '1.0', TIMESTAMP'2025-09-10 10:56:55', NULL, 10, '/SolicitacaoDeDespesa/Conformidade',          NULL FROM DUAL
    UNION ALL SELECT 1081, 'Relatorio Controle de Despesas',        '1.0', TIMESTAMP'2025-12-11 10:35:00', NULL, 10, '/Relatorio/ControleDeDespesa',                 NULL FROM DUAL
    UNION ALL SELECT 1082, 'Relatorio Autorizacao de Pagamento',    '1.0', TIMESTAMP'2025-12-16 09:52:00', NULL, 10, '/Relatorio/AutorizacaoDePagamento',            NULL FROM DUAL
    UNION ALL SELECT 6010, 'Importacao de Despesa (Fortes)',        '1.0', TIMESTAMP'2026-04-06 09:37:14', NULL, 60, '/DerpatamentoPessoal/ImportacaoDespesa',       NULL FROM DUAL
    UNION ALL SELECT 4002, 'Treinamento de Agente',                 '1.0', TIMESTAMP'2026-04-12 11:45:27', NULL, 40, '/IA/Treinamento',                             NULL FROM DUAL
    UNION ALL SELECT 8001, 'Publicacoes',                           '1.0', TIMESTAMP'2026-04-18 00:00:00', TIMESTAMP'2026-04-18 00:00:00', 80, '/Mural', NULL FROM DUAL
    UNION ALL SELECT 202,  'Integracoes',                           '1.0', TIMESTAMP'2026-04-29 22:14:48', NULL, 1,  '/Api/Integracao/Dashboard',                    NULL FROM DUAL
) s
ON (d.ID_ROTINA = s.ID_ROTINA)
WHEN MATCHED THEN UPDATE SET
    d.ROTINA        = s.ROTINA,
    d.VERSAO        = s.VERSAO,
    d.DTCRIACAO     = s.DTCRIACAO,
    d.DTATUALIZACAO = s.DTATUALIZACAO,
    d.ID_MODULO     = s.ID_MODULO,
    d.CAMINHO       = s.CAMINHO,
    d.SCREEN        = s.SCREEN
WHEN NOT MATCHED THEN INSERT (
    ID_ROTINA,
    ROTINA,
    VERSAO,
    DTCRIACAO,
    DTATUALIZACAO,
    ID_MODULO,
    CAMINHO,
    SCREEN
) VALUES (
    s.ID_ROTINA,
    s.ROTINA,
    s.VERSAO,
    s.DTCRIACAO,
    s.DTATUALIZACAO,
    s.ID_MODULO,
    s.CAMINHO,
    s.SCREEN
);

MERGE INTO BSTAB_ROTINA_SUBPERMISSOES d
USING (
    SELECT 5     AS ID_SUBPERMISSAO, 2    AS ID_ROTINA, 'Cadastrar API'                       AS DESCRICAO, 1 AS ORDEM, 'S' AS ATIVO, TIMESTAMP'2026-04-22 23:59:46' AS DT_CADASTRO FROM DUAL
    UNION ALL SELECT 10331, 1033, 'Enviar Orçamento',                  1, 'S', TIMESTAMP'2026-04-29 19:36:45' FROM DUAL
    UNION ALL SELECT 10332, 1033, 'Buscar Arquivo',                    2, 'S', TIMESTAMP'2026-04-29 19:36:45' FROM DUAL
    UNION ALL SELECT 10333, 1033, 'Adicionar Registro',                3, 'S', TIMESTAMP'2026-04-29 19:36:45' FROM DUAL
    UNION ALL SELECT 10334, 1033, 'Excluir Registro',                  4, 'S', TIMESTAMP'2026-04-29 19:36:45' FROM DUAL
    UNION ALL SELECT 10335, 1033, 'Editar Registro',                   5, 'S', TIMESTAMP'2026-04-29 19:36:45' FROM DUAL
    UNION ALL SELECT 10801, 1080, 'Visualizar Todas Contas Gerenciais',1, 'S', TIMESTAMP'2026-04-29 19:40:18' FROM DUAL
) s
ON (d.ID_SUBPERMISSAO = s.ID_SUBPERMISSAO)
WHEN MATCHED THEN UPDATE SET
    d.ID_ROTINA   = s.ID_ROTINA,
    d.DESCRICAO   = s.DESCRICAO,
    d.ORDEM       = s.ORDEM,
    d.ATIVO       = s.ATIVO
WHEN NOT MATCHED THEN INSERT (
    ID_SUBPERMISSAO,
    ID_ROTINA,
    DESCRICAO,
    ORDEM,
    ATIVO,
    DT_CADASTRO,
    DT_ALTERACAO
) VALUES (
    s.ID_SUBPERMISSAO,
    s.ID_ROTINA,
    s.DESCRICAO,
    s.ORDEM,
    s.ATIVO,
    s.DT_CADASTRO,
    NULL
);
