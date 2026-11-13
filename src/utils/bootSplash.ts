// src/utils/bootSplash.ts
// Controls the startup splash in index.html (#boot-splash). It's plain
// HTML so it shows before React loads; App.tsx updates its status line and
// removes it once startup is done.

export function setBootStatus(text: string): void {
  const status = document.getElementById("boot-status");
  if (status) status.textContent = text;
}

export function hideBootSplash(): void {
  const splash = document.getElementById("boot-splash");
  if (!splash) return;
  const reduceMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reduceMotion) {
    splash.remove();
    return;
  }
  splash.classList.add("hide");
  setTimeout(() => splash.remove(), 300);
}
