-- =============================================================================
-- V1.11 - Armazena detalhes do dispositivo mobile em JSON
-- Adiciona coluna DISPOSITIVO_INFO_JSON para monitoramento do aparelho usado
-- =============================================================================

DECLARE
  v_exists NUMBER := 0;
BEGIN
  SELECT COUNT(*)
    INTO v_exists
    FROM USER_TAB_COLUMNS
   WHERE TABLE_NAME  = 'BSTAB_MOBILE_ATIVACAO'
     AND COLUMN_NAME = 'DISPOSITIVO_INFO_JSON';

  IF v_exists = 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE BSTAB_MOBILE_ATIVACAO ADD (DISPOSITIVO_INFO_JSON CLOB)';
  END IF;
END;
/
