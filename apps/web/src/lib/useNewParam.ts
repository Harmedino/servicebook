import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Opens a page's "add" form when the URL has ?new=1 (used by the mobile + menu),
 * then drops the parameter so a refresh doesn't reopen it.
 */
export function useNewParam(open: () => void): void {
  const [params, setParams] = useSearchParams();
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (params.get("new") !== "1") return;
    openRef.current();
    const next = new URLSearchParams(params);
    next.delete("new");
    setParams(next, { replace: true });
  }, [params, setParams]);
}
