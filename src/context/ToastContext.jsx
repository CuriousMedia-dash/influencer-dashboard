import { useState, useCallback, useRef } from "react";
import { ToastContext } from "./toastContextDef";

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ msg: "", good: true, show: false });
  const timerRef = useRef(null);

  const showToast = useCallback((msg, good = true) => {
    setToast({ msg, good, show: true });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 2200);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        className={
          "fixed bottom-5 right-5 z-[200] flex items-center gap-2 rounded-[9px] border px-3.5 py-2.5 text-xs shadow-[0_6px_24px_rgba(16,36,62,.15)] transition-opacity duration-200 pointer-events-none " +
          (toast.show ? "opacity-100" : "opacity-0")
        }
        style={{
          background: "var(--panel)",
          borderColor: "var(--ln)",
          color: toast.good ? "#2BAE66" : "#E0524B",
        }}
      >
        {toast.msg}
      </div>
    </ToastContext.Provider>
  );
}
