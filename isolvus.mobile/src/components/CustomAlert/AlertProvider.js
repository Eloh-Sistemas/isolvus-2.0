import React, { createContext, useContext } from "react";
import CustomAlert from "./index";
import { useAlert } from "./useAlert";

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const { alertProps, showAlert } = useAlert();

  return (
    <AlertContext.Provider value={showAlert}>
      {children}
      <CustomAlert {...alertProps} />
    </AlertContext.Provider>
  );
}

/**
 * useShowAlert — retorna a função showAlert do contexto global
 *
 * Uso em qualquer componente/hook:
 *   const showAlert = useShowAlert();
 *   showAlert({ type: "error", title: "Erro", message: "Algo deu errado" });
 */
export function useShowAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useShowAlert deve ser usado dentro de <AlertProvider>");
  return ctx;
}
