-- =============================================================================
-- V1.5 - PUSH TOKENS PARA MOBILE
-- Armazena tokens do Expo Push para envio de notificacoes com app fechado.
-- =============================================================================

DECLARE
  v_exists NUMBER := 0;
BEGIN
  SELECT COUNT(*)
    INTO v_exists
    FROM USER_TABLES
   WHERE TABLE_NAME = 'BSTAB_PUSH_TOKEN';

  IF v_exists = 0 THEN
    EXECUTE IMMEDIATE '
      CREATE TABLE BSTAB_PUSH_TOKEN (
        ID_TOKEN         NUMBER(18)        NOT NULL,
        ID_USUARIO       NUMBER(18)        NOT NULL,
        EXPO_TOKEN       VARCHAR2(300)     NOT NULL,
        PLATAFORMA       VARCHAR2(30),
        ATIVO            NUMBER(1)         DEFAULT 1 NOT NULL,
        DATA_CRIACAO     DATE              DEFAULT SYSDATE NOT NULL,
        DATA_ATUALIZACAO DATE              DEFAULT SYSDATE NOT NULL,
        CONSTRAINT PK_BSTAB_PUSH_TOKEN PRIMARY KEY (ID_TOKEN),
        CONSTRAINT UK_BSTAB_PUSH_TOKEN UNIQUE (EXPO_TOKEN)
      )
    ';
  END IF;
END;
/

DECLARE
  v_exists NUMBER := 0;
BEGIN
  SELECT COUNT(*)
    INTO v_exists
    FROM USER_SEQUENCES
   WHERE SEQUENCE_NAME = 'SEQ_BSTAB_PUSH_TOKEN';

  IF v_exists = 0 THEN
    EXECUTE IMMEDIATE 'CREATE SEQUENCE SEQ_BSTAB_PUSH_TOKEN INCREMENT BY 1 MINVALUE 1 NOCYCLE NOCACHE NOORDER';
  END IF;
END;
/

DECLARE
  v_exists NUMBER := 0;
BEGIN
  SELECT COUNT(*)
    INTO v_exists
    FROM USER_INDEXES
   WHERE INDEX_NAME = 'IDX_BSTAB_PUSH_TOKEN_USUARIO';

  IF v_exists = 0 THEN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_BSTAB_PUSH_TOKEN_USUARIO ON BSTAB_PUSH_TOKEN (ID_USUARIO, ATIVO)';
  END IF;
END;
/