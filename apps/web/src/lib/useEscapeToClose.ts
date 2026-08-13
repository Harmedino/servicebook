import { useEffect } from "react";

/** Calls onClose when Escape is pressed — shared by every modal in the app. */
export function useEscapeToClose(onClose: () => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}
