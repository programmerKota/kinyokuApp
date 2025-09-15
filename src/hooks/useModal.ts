import { useState, useCallback } from "react";

interface UseModalReturn {
  visible: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
}

export const useModal = (initialVisible = false): UseModalReturn => {
  const [visible, setVisible] = useState(initialVisible);

  const show = useCallback(() => {
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  const toggle = useCallback(() => {
    setVisible((prev) => !prev);
  }, []);

  return {
    visible,
    show,
    hide,
    toggle,
  };
};

