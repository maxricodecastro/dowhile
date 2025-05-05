// content.js — still runs in the extension’s isolated world
(() => {
  // Inject the real patch into the page context by adding a <script src="">
  const url = chrome.runtime.getURL("pagePatch.js");
  const s   = document.createElement("script");
  s.src     = url;
  s.onload  = () => s.remove();           // keep DOM clean
  (document.head || document.documentElement).appendChild(s);
})();