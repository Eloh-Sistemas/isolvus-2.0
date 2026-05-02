-- =============================================================================
-- V1.10 - STATUS D (Redefinido pelo dispositivo)
-- Adiciona o valor 'D' ao check constraint de STATUS em BSTAB_MOBILE_ATIVACAO
-- =============================================================================

-- Remove o constraint antigo e recria incluindo 'D'
DECLARE
  v_exists NUMBER := 0;
BEGIN
  SELECT COUNT(*)
    INTO v_exists
    FROM USER_CONSTRAINTS
   WHERE TABLE_NAME       = 'BSTAB_MOBILE_ATIVACAO'
     AND CONSTRAINT_NAME  = 'CK_BSTAB_MOBILE_ATIVACAO_ST';

  IF v_exists > 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE BSTAB_MOBILE_ATIVACAO DROP CONSTRAINT CK_BSTAB_MOBILE_ATIVACAO_ST';
  END IF;
END;
/

ALTER TABLE BSTAB_MOBILE_ATIVACAO
  ADD CONSTRAINT CK_BSTAB_MOBILE_ATIVACAO_ST
  CHECK (STATUS IN ('P','U','R','D'));
/
