-- =============================================================================
-- V1.1 - UPDATE FROM BASELINE (V1.0)
-- Aplica apenas deltas de schema e dados necessarios para a versao atual.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Forma de pagamento CNAB BB
-- -----------------------------------------------------------------------------
DECLARE
    v_exists NUMBER := 0;
BEGIN
    SELECT COUNT(*)
      INTO v_exists
      FROM USER_TAB_COLUMNS
     WHERE TABLE_NAME = 'BSTAB_FORMADEPAGAMENTO'
       AND COLUMN_NAME = 'ID_BANCODOBRASIL';

    IF v_exists = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE BSTAB_FORMADEPAGAMENTO ADD (ID_BANCODOBRASIL VARCHAR2(20))';
    END IF;
END;
/

DECLARE
    v_exists NUMBER := 0;
BEGIN
    SELECT COUNT(*)
      INTO v_exists
      FROM USER_INDEXES
     WHERE TABLE_NAME = 'BSTAB_FORMADEPAGAMENTO'
       AND INDEX_NAME = 'IDX_BSTAB_FORMADEPAGTO_BB';

    IF v_exists = 0 THEN
        EXECUTE IMMEDIATE 'CREATE INDEX IDX_BSTAB_FORMADEPAGTO_BB ON BSTAB_FORMADEPAGAMENTO (ID_BANCODOBRASIL)';
    END IF;
END;
/

-- -----------------------------------------------------------------------------
-- 2) Historico de fluxo da solicitacao de despesa
-- -----------------------------------------------------------------------------
DECLARE
    v_exists NUMBER := 0;
BEGIN
    SELECT COUNT(*)
      INTO v_exists
      FROM USER_TABLES
     WHERE TABLE_NAME = 'BSTAB_SOLICITADESPESA_HISTORICO';

    IF v_exists = 0 THEN
        EXECUTE IMMEDIATE '
            CREATE TABLE BSTAB_SOLICITADESPESA_HISTORICO (
                ID_HISTORICO     NUMBER(19,0) NOT NULL,
                NUMSOLICITACAO   NUMBER(19,0) NOT NULL,
                ID_GRUPO_EMPRESA NUMBER(19,0),
                ETAPA            VARCHAR2(100) NOT NULL,
                STATUS_ANTES     VARCHAR2(100),
                STATUS_DEPOIS    VARCHAR2(100) NOT NULL,
                ID_USUARIO       NUMBER(19,0),
                NOME_USUARIO     VARCHAR2(200),
                OBSERVACAO       CLOB,
                DATAHORA         DATE DEFAULT SYSDATE NOT NULL
            )';
    END IF;
END;
/

DECLARE
    v_exists NUMBER := 0;
BEGIN
    SELECT COUNT(*)
      INTO v_exists
      FROM USER_CONSTRAINTS
     WHERE TABLE_NAME = 'BSTAB_SOLICITADESPESA_HISTORICO'
       AND CONSTRAINT_NAME = 'PK_BSTAB_SOLICDESP_HIST';

    IF v_exists = 0 THEN
        EXECUTE IMMEDIATE '
            ALTER TABLE BSTAB_SOLICITADESPESA_HISTORICO
            ADD CONSTRAINT PK_BSTAB_SOLICDESP_HIST PRIMARY KEY (ID_HISTORICO)';
    END IF;
END;
/

DECLARE
    v_exists NUMBER := 0;
BEGIN
    SELECT COUNT(*)
      INTO v_exists
      FROM USER_SEQUENCES
     WHERE SEQUENCE_NAME = 'SEQ_SOLICITADESPESA_HISTORICO';

    IF v_exists = 0 THEN
        EXECUTE IMMEDIATE '
            CREATE SEQUENCE SEQ_SOLICITADESPESA_HISTORICO
            START WITH 1
            INCREMENT BY 1
            NOCACHE';
    END IF;
END;
/

DECLARE
    v_exists NUMBER := 0;
BEGIN
    SELECT COUNT(*)
      INTO v_exists
      FROM USER_INDEXES
     WHERE TABLE_NAME = 'BSTAB_SOLICITADESPESA_HISTORICO'
       AND INDEX_NAME = 'IX_SOLICDESP_HIST_SOLIC_DATA';

    IF v_exists = 0 THEN
        EXECUTE IMMEDIATE '
            CREATE INDEX IX_SOLICDESP_HIST_SOLIC_DATA
            ON BSTAB_SOLICITADESPESA_HISTORICO (NUMSOLICITACAO, DATAHORA)';
    END IF;
END;
/

-- -----------------------------------------------------------------------------
-- 3) Seed de integracoes padrao (idempotente)
-- -----------------------------------------------------------------------------
MERGE INTO BSTAB_INTEGRACAO destino
USING (
    SELECT '1' AS ID_SERVIDOR, 13 AS ID_INTEGRACAO, 'Buscar SMS' AS INTEGRACAO, TO_DATE('2025-12-14 17:48:47', 'YYYY-MM-DD HH24:MI:SS') AS DATAHORA_PROXIMA_ATUALIZACAO, 1440 AS INTERVALOMINUTOS, 'N' AS REALIZARINTEGRACAO, 'GET' AS METODO FROM DUAL
    UNION ALL SELECT '1', 14, 'Enviar SMS', TO_DATE('2025-02-27 17:35:59', 'YYYY-MM-DD HH24:MI:SS'), 1440, 'N', 'POST' FROM DUAL
    UNION ALL SELECT '1', 2, 'Cadastro de Filial', TO_DATE('2026-02-02 17:51:41', 'YYYY-MM-DD HH24:MI:SS'), 30, 'S', 'GET' FROM DUAL
    UNION ALL SELECT '1', 8, 'Cadastro de Veiculo', TO_DATE('2026-02-02 17:51:41', 'YYYY-MM-DD HH24:MI:SS'), 30, 'S', 'GET' FROM DUAL
    UNION ALL SELECT '1', 7, 'Cadastro de Veiculo', TO_DATE('2025-02-27 18:11:18', 'YYYY-MM-DD HH24:MI:SS'), 50, 'S', 'POST' FROM DUAL
    UNION ALL SELECT '1', 9, 'Cadastro de Cliente', TO_DATE('2026-02-02 17:45:43', 'YYYY-MM-DD HH24:MI:SS'), 5, 'S', 'GET' FROM DUAL
    UNION ALL SELECT '1', 10, 'Cadastro Conta Gerencial', TO_DATE('2026-02-03 10:51:09', 'YYYY-MM-DD HH24:MI:SS'), 1440, 'S', 'GET' FROM DUAL
    UNION ALL SELECT '1', 15, 'Get - Solicitacao de Despesa', TO_DATE('2025-12-14 17:48:47', 'YYYY-MM-DD HH24:MI:SS'), 10, 'S', 'GET' FROM DUAL
    UNION ALL SELECT '1', 11, 'Cadastro Centro De Custo', TO_DATE('2026-02-03 10:51:09', 'YYYY-MM-DD HH24:MI:SS'), 1440, 'S', 'GET' FROM DUAL
    UNION ALL SELECT '1', 1, 'Cadastro de cliente Winthor', TO_DATE('2025-08-07 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 'S', 'POST' FROM DUAL
    UNION ALL SELECT '1', 3, 'Cadastro de Setor', TO_DATE('2026-02-03 10:51:08', 'YYYY-MM-DD HH24:MI:SS'), 1440, 'S', 'GET' FROM DUAL
    UNION ALL SELECT '1', 4, 'Cadastro de Usuario', TO_DATE('2026-02-02 17:51:52', 'YYYY-MM-DD HH24:MI:SS'), 30, 'S', 'GET' FROM DUAL
    UNION ALL SELECT '1', 5, 'Cadastro de Fornecedor', TO_DATE('2026-02-03 10:51:10', 'YYYY-MM-DD HH24:MI:SS'), 1440, 'S', 'GET' FROM DUAL
    UNION ALL SELECT '1', 12, 'Solicitacao de Despesa - POST', TO_DATE('2025-02-27 17:33:45', 'YYYY-MM-DD HH24:MI:SS'), 0, 'S', 'POST' FROM DUAL
    UNION ALL SELECT '1', 16, 'Alterar Geolocalizacao do Cliente', TO_DATE('2025-09-02 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 'S', 'POST' FROM DUAL
    UNION ALL SELECT '1', 17, 'Cadastro de Usuario - POST', TO_DATE('2025-09-11 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 'S', 'POST' FROM DUAL
    UNION ALL SELECT '1', 18, 'Cadastro de Caixa Banco', TO_DATE('2026-02-02 17:51:30', 'YYYY-MM-DD HH24:MI:SS'), 60, 'S', 'GET' FROM DUAL
    UNION ALL SELECT '1', 19, 'Vale', TO_DATE('2026-02-02 17:43:03', 'YYYY-MM-DD HH24:MI:SS'), 1, 'S', 'GET' FROM DUAL
) origem
ON (
    destino.ID_SERVIDOR = origem.ID_SERVIDOR
    AND destino.ID_INTEGRACAO = origem.ID_INTEGRACAO
)
WHEN MATCHED THEN
    UPDATE SET
        destino.INTEGRACAO = origem.INTEGRACAO,
        destino.DATAHORA_PROXIMA_ATUALIZACAO = origem.DATAHORA_PROXIMA_ATUALIZACAO,
        destino.INTERVALOMINUTOS = origem.INTERVALOMINUTOS,
        destino.REALIZARINTEGRACAO = origem.REALIZARINTEGRACAO,
        destino.METODO = origem.METODO
WHEN NOT MATCHED THEN
    INSERT (
        ID_SERVIDOR,
        ID_INTEGRACAO,
        INTEGRACAO,
        DATAHORA_PROXIMA_ATUALIZACAO,
        INTERVALOMINUTOS,
        REALIZARINTEGRACAO,
        METODO
    ) VALUES (
        origem.ID_SERVIDOR,
        origem.ID_INTEGRACAO,
        origem.INTEGRACAO,
        origem.DATAHORA_PROXIMA_ATUALIZACAO,
        origem.INTERVALOMINUTOS,
        origem.REALIZARINTEGRACAO,
        origem.METODO
    );
