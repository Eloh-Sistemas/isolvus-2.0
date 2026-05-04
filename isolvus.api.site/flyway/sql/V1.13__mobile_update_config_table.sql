-- =============================================================================
-- V1.13 - CONFIGURACAO DE ATUALIZACAO OBRIGATORIA MOBILE
-- Controla versao minima por plataforma no banco, sem dependencia de env vars.
-- =============================================================================

DECLARE
  v_exists NUMBER := 0;
BEGIN
  SELECT COUNT(*)
    INTO v_exists
    FROM USER_TABLES
   WHERE TABLE_NAME = 'BSTAB_MOBILE_UPDATE_CONFIG';

  IF v_exists = 0 THEN
    EXECUTE IMMEDIATE '
      CREATE TABLE BSTAB_MOBILE_UPDATE_CONFIG (
        ID_CONFIG     NUMBER(18)     NOT NULL,
        PLATAFORMA    VARCHAR2(20)   NOT NULL,
        MIN_BUILD     NUMBER(10),
        STORE_URL     VARCHAR2(500),
        MENSAGEM      VARCHAR2(500),
        ATIVO         CHAR(1)        DEFAULT ''S'' NOT NULL,
        DT_CRIACAO    DATE           DEFAULT SYSDATE NOT NULL,
        DT_ALTERACAO  DATE,
        CONSTRAINT PK_BSTAB_MOBILE_UPDATE_CFG PRIMARY KEY (ID_CONFIG),
        CONSTRAINT UK_BSTAB_MOBILE_UPDATE_CFG UNIQUE (PLATAFORMA)
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
   WHERE SEQUENCE_NAME = 'SEQ_BSTAB_MOBILE_UPDATE_CFG';

  IF v_exists = 0 THEN
    EXECUTE IMMEDIATE 'CREATE SEQUENCE SEQ_BSTAB_MOBILE_UPDATE_CFG INCREMENT BY 1 MINVALUE 1 NOCYCLE NOCACHE NOORDER';
  END IF;
END;
/

DECLARE
  v_exists NUMBER := 0;
BEGIN
  SELECT COUNT(*)
    INTO v_exists
    FROM BSTAB_MOBILE_UPDATE_CONFIG
   WHERE LOWER(TRIM(PLATAFORMA)) = 'android';

  IF v_exists = 0 THEN
    INSERT INTO BSTAB_MOBILE_UPDATE_CONFIG (
      ID_CONFIG,
      PLATAFORMA,
      MIN_BUILD,
      STORE_URL,
      MENSAGEM,
      ATIVO,
      DT_CRIACAO
    ) VALUES (
      SEQ_BSTAB_MOBILE_UPDATE_CFG.NEXTVAL,
      'android',
      NULL,
      NULL,
      'Uma nova versao obrigatoria do aplicativo esta disponivel. Atualize para continuar.',
      'S',
      SYSDATE
    );
  END IF;
END;
/

DECLARE
  v_exists NUMBER := 0;
BEGIN
  SELECT COUNT(*)
    INTO v_exists
    FROM BSTAB_MOBILE_UPDATE_CONFIG
   WHERE LOWER(TRIM(PLATAFORMA)) = 'ios';

  IF v_exists = 0 THEN
    INSERT INTO BSTAB_MOBILE_UPDATE_CONFIG (
      ID_CONFIG,
      PLATAFORMA,
      MIN_BUILD,
      STORE_URL,
      MENSAGEM,
      ATIVO,
      DT_CRIACAO
    ) VALUES (
      SEQ_BSTAB_MOBILE_UPDATE_CFG.NEXTVAL,
      'ios',
      NULL,
      NULL,
      'Uma nova versao obrigatoria do aplicativo esta disponivel. Atualize para continuar.',
      'S',
      SYSDATE
    );
  END IF;
END;
/
