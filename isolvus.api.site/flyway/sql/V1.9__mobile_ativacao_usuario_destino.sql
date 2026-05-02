-- V1.9 - Adiciona coluna ID_USUARIO_DESTINO na tabela BSTAB_MOBILE_ATIVACAO
-- Registra qual usuario do sistema e o destinatario do QR Code gerado (previnculacao)

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM USER_TAB_COLUMNS
   WHERE TABLE_NAME  = 'BSTAB_MOBILE_ATIVACAO'
     AND COLUMN_NAME = 'ID_USUARIO_DESTINO';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE '
      ALTER TABLE BSTAB_MOBILE_ATIVACAO
        ADD ID_USUARIO_DESTINO NUMBER(18) DEFAULT NULL
    ';
  END IF;
END;
/
