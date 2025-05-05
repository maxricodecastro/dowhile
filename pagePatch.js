// pagePatch.js — v0.4.1  (reasoning-aware + status banner)
(() => {               // ← outer IIFE

    /* -----------------------------------------------------------
     * 1.  STATE MACHINE + fetch monkey-patch
     * --------------------------------------------------------- */
    const STATE = { IDLE: "IDLE", THINKING: "THINKING", STREAMING: "STREAMING" };
    let current = STATE.IDLE;
  
    // 🔸 call the banner on every state transition
    const set = s => {
      if (s !== current) {
        current = s;
        console.log("[GPT-DET]", s);
        window.__GPT_DET_UI__?.(s);          // ← NEW
      }
    };
  
    const origFetch = window.fetch;
    window.fetch = async function (input, init = {}) {
      const url  = typeof input === "string" ? input : input.url;
      const hdrs = new Headers(init?.headers || input?.headers || {});
      const isSSE =
            url.includes("/backend-api/conversation") &&
            hdrs.get("accept")?.includes("text/event-stream");
  
      const resp = await origFetch.apply(this, arguments);
      if (!isSSE ||
          !resp.headers.get("content-type")?.startsWith("text/event-stream")) {
        return resp;
      }
  
      /* ---- clone & inspect without locking the page ---- */
      set(STATE.THINKING);
  
      const clone   = resp.clone();
      const reader  = clone.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";
  
      let reasoningEnded = false;
      let streamingBegun = false;
  
      const maybeStartStreaming = () => {
        if (!streamingBegun && reasoningEnded) {
          streamingBegun = true;
          set(STATE.STREAMING);
        }
      };
  
      (async () => {
        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
  
            /* split on double newline → one SSE event block */
            let idx;
            while ((idx = buffer.indexOf("\n\n")) !== -1) {
              const block = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);
  
              for (const line of block.split("\n")) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
  
                const jsonStr = trimmed.slice(5).trim();
                if (jsonStr === "[DONE]") {
                  set(STATE.IDLE);
                  return;
                }
  
                let payload;
                try { payload = JSON.parse(jsonStr); }
                catch { continue; }
  
                /* 1. reasoning status */
                const rs = payload?.v?.message?.metadata?.reasoning_status;
                if (rs === "is_reasoning") continue;
                if (rs === "reasoning_ended") { reasoningEnded = true; continue; }
  
                /* 2. ignore /thoughts/ patches */
                if (payload.p?.includes("/message/content/thoughts/")) continue;
  
                /* 3. first visible token detectors */
                if (payload.o === "append" &&
                    /^\/message\/content\/parts\/\d+/.test(payload.p) &&
                    typeof payload.v === "string" && payload.v.length) {
                  maybeStartStreaming();
                  continue;
                }
  
                if (streamingBegun) continue;  // already streaming
  
                const delta = payload.choices?.[0]?.delta;
                if (typeof delta?.content === "string" && delta.content.length) {
                  reasoningEnded = true;       // legacy path
                  maybeStartStreaming();
                }
              }
            }
          }
        } catch { /* network error or user cancel */ }
        set(STATE.IDLE);
      })();
  
      return resp;
    };
  
    console.log("[GPT-DET] fetch monkey-patched in page context");
  
    /* -----------------------------------------------------------
     * 2.  STATUS BANNER UI
     * --------------------------------------------------------- */
    (() => {             // ← inner IIFE (banner only)
  
      function findPromptBar() {
        return document.querySelector(
          'div.border-token-border-default.flex.w-full.cursor-text.flex-col.items-center.justify-center.rounded-\\[28px\\].border'
        );
      }
  
      const banner = document.createElement("div");
      banner.id = "gpt-det-banner";
      Object.assign(banner.style, {
        width:        "100%",
        aspectRatio:  "5 / 1",      // height = 20 % of width
        borderRadius: "4px",
        transition:   "background 0.15s ease",
        marginBottom: "8px"  // increased margin for better spacing
      });
  
      function ensureBanner() {
        const bar = findPromptBar();
        if (bar && !document.getElementById("gpt-det-banner")) {
          bar.parentElement.insertBefore(banner, bar);
        }
      }
  
      ensureBanner();
      new MutationObserver(ensureBanner)
        .observe(document.body, { childList: true, subtree: true });
  
      const colourFor = {
        THINKING:  "#ff4d4d",  // red
        STREAMING: "#ffd633",  // yellow
        IDLE:      "#28c76f"   // green
      };
  
      /* expose setter used by the state machine */
      window.__GPT_DET_UI__ = state => {
        ensureBanner();
        banner.style.background = colourFor[state] || "transparent";
      };
  
    })();                 // ← end inner IIFE
  
  })();                   // ← end outer IIFE  (only once!)