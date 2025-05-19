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
  
    /* -----------------------------------------------------------
     * 3.  MATHBOX TEST INSTANCE
     * --------------------------------------------------------- */
    // AnimatedText class - Simple character animation as user types
    class AnimatedText {
      constructor(containerSelector, options = {}) {
        this.container = typeof containerSelector === 'string'
          ? document.querySelector(containerSelector)
          : containerSelector;
        this.options = {
          charDelay: 50,   // delay between each character's animation (ms)
          ...options
        };
      }

      setText(text) {
        if (!this.container) return;
        // Clear existing content
        this.container.innerHTML = '';

        // Create a span for each character with staggered animation
        Array.from(text).forEach((char, idx) => {
          const span = document.createElement('span');
          span.textContent = char;
          span.style.display = 'inline-block';
          span.style.opacity = '0';
          span.style.transform = 'translateY(10px) scale(0.85)';
          span.style.animation = `fadeInUp 300ms ease-out forwards`;
          span.style.animationDelay = `${idx * this.options.charDelay}ms`;
          this.container.appendChild(span);
        });
      }
    }

        class MathBox {
      constructor(options = {}) {
        this.options = {
          width: '200px',
          ...options
        };
        this.element = this.create();
        this.streakCounter = 0;
        
        // Auto-focus the input on initialization after a small delay
        setTimeout(() => {
          if (this._answerInput) {
            this._answerInput.focus();
          }
        }, 100);
        
        // Define shake animation style
        if (!document.getElementById('mathbox-animations')) {
          const style = document.createElement('style');
          style.id = 'mathbox-animations';
          style.textContent = `
            @keyframes fadeInUp {
              0% {
                opacity: 0;
                transform: translateY(10px) scale(0.85);
              }
              100% {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            @keyframes shake {
              0% { transform: translateX(0); }
              20% { transform: translateX(-5px); }
              40% { transform: translateX(5px); }
              60% { transform: translateX(-5px); }
              80% { transform: translateX(5px); }
              100% { transform: translateX(0); }
            }
            .shake {
              animation: shake 0.4s ease-in-out;
            }
            
            @keyframes streakAnimation {
              0% { 
                opacity: 0; 
                transform: translate(-50%, 0); 
              }
              15% { 
                opacity: 1; 
                transform: translate(-50%, -20px); 
              }
              85% { 
                opacity: 1; 
                transform: translate(-50%, -20px); 
              }
              100% { 
                opacity: 0; 
                transform: translate(-50%, 0); 
              }
            }
            
            .math-box-outer {
              position: relative;
              overflow: visible;
            }
            
            .math-box-container {
              position: relative;
              z-index: 5;
              overflow: hidden;
            }
            
            .streak-notification-container {
              position: absolute;
              width: 100%;
              height: 0;
              top: 0;
              left: 0;
              overflow: visible;
              pointer-events: none;
            }
            
            .streak-notification {
              position: absolute;
              left: 50%;
              top: 0;
              font-size: 11px;
              font-weight: 600;
              color: #34c759;
              width: max-content;
              text-align: center;
              animation: streakAnimation 1.5s ease-in-out forwards;
              white-space: nowrap;
            }
          `;
          document.head.appendChild(style);
        }
      }
    
      create() {
        // Create outer container to handle overflow properly
        const outerContainer = document.createElement('div');
        outerContainer.className = 'math-box-outer';
        
        // Create streak notification container
        const streakContainer = document.createElement('div');
        streakContainer.className = 'streak-notification-container';
        outerContainer.appendChild(streakContainer);
        this._streakContainer = streakContainer;
        
        // Create main box container
        const container = document.createElement('div');
        container.className = 'math-box-container';
        Object.assign(container.style, {
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          width: 'fit-content',
          backgroundColor: '#ffffff',
          borderRadius: '44px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        });
        outerContainer.appendChild(container);
        this._mainContainer = container;
    
        // Problem display (e.g., "41 + 24")
        const problem = document.createElement('span');
        problem.className = 'math-problem';
        Object.assign(problem.style, {
          fontSize: '18px',
          fontWeight: '500'
        });
    
        // Equals sign
        const equals = document.createElement('span');
        equals.textContent = '=';
        Object.assign(equals.style, {
          fontSize: '16px',
          color: '#666'
        });
    
        // Answer container (replaces direct input)
        const answerContainer = document.createElement('div');
        answerContainer.className = 'math-answer-container';
        Object.assign(answerContainer.style, {
          width: '70px',
          height: '28px',
          padding: '4px 4px',
          borderRadius: '24px',
          backgroundColor: '#f5f5f5',
          textAlign: 'center',
          outline: 'none',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'text'
        });
    
        // Hidden input (for actual keyboard input)
        const answer = document.createElement('input');
        answer.type = 'text';
        answer.className = 'math-answer-hidden';
        Object.assign(answer.style, {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          zIndex: 2
        });
    
        // Visual display for animated text
        const answerDisplay = document.createElement('div');
        answerDisplay.className = 'math-answer-display';
        Object.assign(answerDisplay.style, {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          zIndex: 1
        });
    
        // Focus visual indicator
        answerContainer.addEventListener('click', () => {
          answer.focus();
        });
        
        answer.addEventListener('focus', () => {
          answerContainer.style.boxShadow = '0 0 0 2px rgba(0, 123, 255, 0.25)';
        });
        
        answer.addEventListener('blur', () => {
          answerContainer.style.boxShadow = 'none';
        });
    
        // AnimatedText instance for the display
        this._answerDisplay = answerDisplay;
        this._animatedText = new AnimatedText(answerDisplay, { charDelay: 40 }); // Using local AnimatedText class
        this._problemSpan = problem;
        this._answerInput = answer;
        this.generateProblem();
    
        // Answer checker
        answer.addEventListener('input', (event) => {
          // If already at max length and trying to add more characters
          if (answer.value.length > 3) {
            // Prevent the input
            answer.value = answer.value.slice(0, 3);
            
            // Trigger shake animation
            answerContainer.classList.add('shake');
            
            // Remove shake class after animation completes
            setTimeout(() => {
              answerContainer.classList.remove('shake');
            }, 400); // 400ms matches animation duration
          }
          
          const userVal = answer.value.trim();
          this._animatedText.setText(userVal); // Update animated display
          
          if (userVal === '') return;
          if (Number(userVal) === this._correctAnswer) {
            // Add visual feedback - briefly disable the input
            answer.disabled = true;
            
            // Wait 100ms before moving to the next problem
            setTimeout(() => {
              // Correct! Move to next problem.
              this.streakCounter++;
              this.checkStreak();
              
              this.generateProblem();
              answer.value = '';
              this._animatedText.setText(''); // Clear animated display
              answer.disabled = false;
              
              // Refocus the input
              answer.focus();
            }, 220);
          }
        });
    
        // Also handle keydown to prevent certain inputs
        answer.addEventListener('keydown', (event) => {
          const allowedKeys = [
            'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'
          ];
          
          // Only allow numeric inputs and control keys
          const isNumber = /^[0-9]$/.test(event.key);
          const isAllowedKey = allowedKeys.includes(event.key);
          const isModifierKey = event.metaKey || event.ctrlKey;
          
          // If not a number or allowed key, block the input
          if (!isNumber && !isAllowedKey && !isModifierKey) {
            event.preventDefault();
            
            // Trigger shake animation for invalid input
            answerContainer.classList.add('shake');
            setTimeout(() => {
              answerContainer.classList.remove('shake');
            }, 400);
            return;
          }
          
          // If at max length and not pressing control keys
          if (answer.value.length >= 3 && 
              !isModifierKey &&
              !isAllowedKey &&
              event.key.length === 1) {
            // Prevent the key input
            event.preventDefault();
            
            // Trigger shake animation
            answerContainer.classList.add('shake');
            
            // Remove shake class after animation completes
            setTimeout(() => {
              answerContainer.classList.remove('shake');
            }, 400); // 400ms matches animation duration
          }
        });
    
        // Assembly
        container.appendChild(problem);
        container.appendChild(equals);
        answerContainer.appendChild(answer);
        answerContainer.appendChild(answerDisplay);
        container.appendChild(answerContainer);
    
        // Add a click event listener to the outer container to focus the input
        outerContainer.addEventListener('click', (event) => {
          // Don't interfere with other click handlers
          if (event.target !== this._answerInput) {
            this._answerInput.focus();
          }
        });
    
        // Re-focus input when window regains focus
        window.addEventListener('focus', () => {
          if (this._answerInput) {
            this._answerInput.focus();
          }
        });
    
        return outerContainer;
      }
      
      checkStreak() {
        // For testing: show streak notification after every correct answer
        let message = '';
        
        if (this.streakCounter === 3) {
          message = 'Three\'s the charm';
        } else if (this.streakCounter === 5) {
          message = '5 for 5';
        } else if (this.streakCounter === 10) {
          message = '10? Still thinking?';
        } else if (this.streakCounter === 20) {
          message = '20th Century Fox';
        } else {
          // For testing - show the current streak count
          message = `${this.streakCounter} correct!`;
        }
        
        this.showStreakNotification(message);
      }
      
      showStreakNotification(message) {
        // Clear any existing notifications first
        while (this._streakContainer.firstChild) {
          this._streakContainer.removeChild(this._streakContainer.firstChild);
        }
        
        const notification = document.createElement('div');
        notification.className = 'streak-notification';
        notification.textContent = message;
        
        this._streakContainer.appendChild(notification);
        
        // Remove notification after animation completes
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 1500);
      }
    
      generateProblem() {
        // Decide randomly between addition and multiplication
        const type = Math.random() < 0.5 ? 'add' : 'mul';
        let a, b;
        if (type === 'add') {
          a = this.randInt(1, 99);
          b = this.randInt(1, 99);
          this._correctAnswer = a + b;
          this._problemSpan.textContent = `${a} + ${b}`;
        } else {
          a = this.randInt(1, 12);
          b = this.randInt(1, 12);
          this._correctAnswer = a * b;
          this._problemSpan.textContent = `${a} × ${b}`;
        }
      }
    
      randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
    
      mount(parent) {
        if (typeof parent === 'string') {
          parent = document.querySelector(parent);
        }
        if (parent) {
          parent.appendChild(this.element);
          
          // Focus the input after mounting
          setTimeout(() => {
            if (this._answerInput) {
              this._answerInput.focus();
            }
          }, 100);
        }
      }
    }

    // Create test container and instance
    const createAndMountMathBox = () => {
      console.log('[MathBox] Creating test instance...');
      
      // Remove any existing instances
      const existingContainer = document.getElementById('mathbox-test');
      if (existingContainer) {
        existingContainer.remove();
      }
      
      const testContainer = document.createElement('div');
      testContainer.id = 'mathbox-test';
      Object.assign(testContainer.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '9999',
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      });
      
      document.body.appendChild(testContainer);
      console.log('[MathBox] Container added to body');
      
      const mathBox = new MathBox();
      mathBox.mount(testContainer);
      console.log('[MathBox] MathBox mounted');
      
      return testContainer;
    };

    // Initial creation with a delay
    setTimeout(createAndMountMathBox, 1000);

    // Watch for body changes and ensure MathBox exists
    const observer = new MutationObserver((mutations) => {
      if (!document.getElementById('mathbox-test')) {
        console.log('[MathBox] Container missing, recreating...');
        createAndMountMathBox();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[MathBox] Observer started');

})();                   // ← end outer IIFE  (only once!)