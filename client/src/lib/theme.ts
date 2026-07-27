// Dark mode: follows system by default, user toggle persists in localStorage.
export function initTheme() {
  const stored = localStorage.getItem("preppal-theme");
  const dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
}

export function toggleTheme() {
  const dark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("preppal-theme", dark ? "dark" : "light");
  return dark;
}
