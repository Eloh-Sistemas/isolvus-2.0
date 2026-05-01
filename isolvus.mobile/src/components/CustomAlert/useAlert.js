import { useState, useCallback } from "react";

/**
 * useAlert — hook para controlar o CustomAlert
 *
 * Uso:
 *   const { alertProps, showAlert } = useAlert();
 *   showAlert({ type: "success", title: "Sucesso", message: "Check-in realizado!" });
 *
 *   return (
 *     <>
 *       <CustomAlert {...alertProps} />
 *       ...
 *     </>
 *   );
 */
export function useAlert() {
  const [state, setState] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
    buttons: undefined,
  });

  const showAlert = useCallback(({ type = "info", title = "", message = "", buttons } = {}) => {
    setState({ visible: true, type, title, message, buttons });
  }, []);

  const hideAlert = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const alertProps = {
    visible: state.visible,
    type: state.type,
    title: state.title,
    message: state.message,
    buttons: state.buttons,
    onClose: hideAlert,
  };

  return { alertProps, showAlert, hideAlert };
}
