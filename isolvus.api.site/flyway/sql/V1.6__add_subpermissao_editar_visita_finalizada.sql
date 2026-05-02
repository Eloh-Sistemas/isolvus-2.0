-- =============================================================================
-- V1.6 - Subpermissao para edicao de visita finalizada (Rotina 3001)
-- =============================================================================

MERGE INTO BSTAB_ROTINA_SUBPERMISSOES d
USING (
    SELECT
        30011 AS ID_SUBPERMISSAO,
        3001  AS ID_ROTINA,
        'Editar solicitacao depois de finalizado' AS DESCRICAO,
        1     AS ORDEM,
        'S'   AS ATIVO,
        SYSTIMESTAMP AS DT_CADASTRO
    FROM DUAL
) s
ON (d.ID_SUBPERMISSAO = s.ID_SUBPERMISSAO)
WHEN MATCHED THEN UPDATE SET
    d.ID_ROTINA = s.ID_ROTINA,
    d.DESCRICAO = s.DESCRICAO,
    d.ORDEM = s.ORDEM,
    d.ATIVO = s.ATIVO,
    d.DT_ALTERACAO = SYSTIMESTAMP
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
