export const DEFAULT_THEME = "mshelt";
export const THEME_STORAGE_KEY = "maro.theme.preference.v1";
export const THEME_OWNER_KEY = "maro.theme.owner.v1";

/** The old maro.theme key was forced to Qelt; it is not a user preference. */
export function resolveTheme(value) {
  return value === "qelt" ? "qelt" : DEFAULT_THEME;
}

export function themePreferenceKey(owner = "guest") {
  return `${THEME_STORAGE_KEY}:${owner}`;
}

// Apply a saved choice before paint, without writing a default as a preference.
export const THEME_INIT_SCRIPT = `(function(){var t='mshelt';try{var o=localStorage.getItem('${THEME_OWNER_KEY}')||'guest';if(!/^[a-z0-9-]{1,64}$/.test(o))o='guest';if(localStorage.getItem('${THEME_STORAGE_KEY}:'+o)==='qelt')t='qelt';}catch(e){}document.documentElement.setAttribute('data-theme',t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='mshelt'?'#111315':'#F9F9F9');})();`;
