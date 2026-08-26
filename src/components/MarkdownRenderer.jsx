import { h } from "preact";
import { memo } from "preact/compat";
import { useEffect, useRef } from "preact/hooks";
import { marked } from "marked";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import rust from "highlight.js/lib/languages/rust";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import markdown from "highlight.js/lib/languages/markdown";
import yaml from "highlight.js/lib/languages/yaml";
import sql from "highlight.js/lib/languages/sql";
import plaintext from "highlight.js/lib/languages/plaintext";

const LANGUAGES = {
  javascript,
  typescript,
  rust,
  python,
  bash,
  shell: bash,
  sh: bash,
  json,
  css,
  xml,
  html: xml,
  vue: xml,
  svg: xml,
  markdown,
  md: markdown,
  yaml,
  yml: yaml,
  sql,
  plaintext,
};
Object.entries(LANGUAGES).forEach(([name, def]) =>
  hljs.registerLanguage(name, def)
);

// Custom renderer for marked to build beautiful code blocks with copy buttons
const renderer = {
  code({ text, lang }) {
    const language = lang || "plaintext";
    let highlighted;
    try {
      highlighted = hljs.getLanguage(language)
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;
    } catch (_) {
      highlighted = text;
    }

    const encodedCode = encodeURIComponent(text);

    return `
      <div class="code-block-wrapper" data-code="${encodedCode}">
        <div class="code-block-header">
          <span class="code-block-lang">${language}</span>
          <button class="code-copy-btn">
            <svg class="copy-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span class="copy-text">Copy</span>
          </button>
        </div>
        <pre><code class="hljs language-${language}">${highlighted}</code></pre>
      </div>
    `;
  },
};

marked.use({ renderer });

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Attach copy button handlers
    const copyButtons = containerRef.current.querySelectorAll(".code-copy-btn");
    const handlers = [];

    copyButtons.forEach((btn) => {
      const wrapper = btn.closest(".code-block-wrapper");
      if (!wrapper) return;

      const codeText = decodeURIComponent(
        wrapper.getAttribute("data-code") || ""
      );
      const textSpan = btn.querySelector(".copy-text");

      const handleCopy = async () => {
        try {
          await navigator.clipboard.writeText(codeText);
          if (textSpan) textSpan.textContent = "Copied";
          btn.classList.add("copied");
          setTimeout(() => {
            if (textSpan) textSpan.textContent = "Copy";
            btn.classList.remove("copied");
          }, 2000);
        } catch (err) {
          console.error("Failed to copy text", err);
        }
      };

      btn.addEventListener("click", handleCopy);
      handlers.push({ btn, handleCopy });
    });

    return () => {
      handlers.forEach(({ btn, handleCopy }) => {
        btn.removeEventListener("click", handleCopy);
      });
    };
  }, [content]);

  // Convert markdown to HTML safely
  const html = marked.parse(content || "");

  return (
    <div
      ref={containerRef}
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
