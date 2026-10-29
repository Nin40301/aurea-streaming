import { useEffect, type RefObject } from "react";
export function useDialogFocus(
  ref: RefObject<HTMLElement | null>,
  active = true,
) {
  useEffect(() => {
    if (!active) return;
    const element = ref.current;
    if (!element) return;
    const before = document.activeElement as HTMLElement | null;
    element.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = [
        ...element.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]',
        ),
      ].filter((el) => el.offsetParent !== null);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0],
        last = items[items.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === element)
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last || document.activeElement === element)
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    element.addEventListener("keydown", key);
    return () => {
      element.removeEventListener("keydown", key);
      if (before?.isConnected) before.focus();
    };
  }, [ref, active]);
}
