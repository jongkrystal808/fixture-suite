/**
 * query-state.js
 * v4.x 共用 URL Query State 工具
 * （Global 版）
 */

function readQueryState(schema = {}) {
  const params = new URLSearchParams(window.location.search);
  const state = {};

  for (const key in schema) {
    const def = schema[key];
    const raw = params.get(key);

    if (raw == null) {
      state[key] = def;
    } else if (typeof def === "number") {
      state[key] = Number(raw) || def;
    } else {
      state[key] = raw;
    }
  }

  return state;
}

function writeQueryState(state = {}) {
  const params = new URLSearchParams();

  Object.entries(state).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      params.set(key, val);
    }
  });

  const { pathname, hash } = window.location;

  const newURL =
    pathname +
    (params.toString() ? `?${params.toString()}` : "") +
    (hash || "");

  history.replaceState({}, "", newURL);
}


/* 🌍 expose to global */
window.readQueryState = readQueryState;
window.writeQueryState = writeQueryState;
