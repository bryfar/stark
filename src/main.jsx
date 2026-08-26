import { h, render } from "preact";
import { App } from "./App";
import "./styles/main.css";

window.__renderProbe__ = (() => {
  const counts = {};
  let lastSend = 0;
  return (name) => {
    counts[name] = (counts[name] || 0) + 1;
    const now = Date.now();
    if (now - lastSend > 800) {
      lastSend = now;
      const total = Object.entries(counts)
        .map(([k, v]) => `${k}:${v}`)
        .join("+");
      Object.keys(counts).forEach((k) => (counts[k] = 0));
      try {
        fetch("/__render__=" + encodeURIComponent(total));
      } catch (e) {}
    }
  };
})();

render(<App />, document.getElementById("app"));
