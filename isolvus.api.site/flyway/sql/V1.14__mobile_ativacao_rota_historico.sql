-- =============================================================================
-- V1.14 - HISTORICO DE ROTA MOBILE
-- Armazena pontos de localizacao para trilha/rota do dispositivo
-- =============================================================================

DECLARE
  v_exists NUMBER := 0;
BEGIN
  SELECT COUNT(*)
    INTO v_exists
    FROM USER_TABLES
   WHERE TABLE_NAME = 'BSTAB_MOBILE_ATIVACAO_LOC';

  IF v_exists = 0 THEN
    EXECUTE IMMEDIATE '
      CREATE TABLE BSTAB_MOBILE_ATIVACAO_LOC (
        ID_PONTO           NUMBER(18)         NOT NULL,
        ID_ATIVACAO        NUMBER(18)         NOT NULL,
        LATITUDE           NUMBER(12,8)       NOT NULL,
        LONGITUDE          NUMBER(12,8)       NOT NULL,
        ACCURACY_METERS    NUMBER(10,2),
        SPEED_MPS          NUMBER(10,2),
        ALTITUDE_METERS    NUMBER(10,2),
        DT_CAPTURA         TIMESTAMP          DEFAULT SYSTIMESTAMP NOT NULL,
        SOURCE             VARCHAR2(40),
        DT_CRIACAO         TIMESTAMP          DEFAULT SYSTIMESTAMP NOT NULL,
        CONSTRAINT PK_BSTAB_MOBILE_ATV_LOC PRIMARY KEY (ID_PONTO)
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
   WHERE SEQUENCE_NAME = 'SEQ_BSTAB_MOBILE_ATIVACAO_LOC';

  IF v_exists = 0 THEN
    EXECUTE IMMEDIATE 'CREATE SEQUENCE SEQ_BSTAB_MOBILE_ATIVACAO_LOC INCREMENT BY 1 MINVALUE 1 NOCYCLE NOCACHE NOORDER';
  END IF;
END;
/

DECLARE
  v_exists NUMBER := 0;
BEGIN
  SELECT COUNT(*)
    INTO v_exists
    FROM USER_INDEXES
   WHERE INDEX_NAME = 'IDX_BSTAB_MOBILE_ATV_LOC1';

  IF v_exists = 0 THEN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_BSTAB_MOBILE_ATV_LOC1 ON BSTAB_MOBILE_ATIVACAO_LOC (ID_ATIVACAO, DT_CAPTURA)';
  END IF;
END;
/