// MathBox.js - A minimal mathematical input component
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
    this._animatedText = new window.AnimatedText(answerDisplay, { charDelay: 40 });
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
      message = 'Three in a row!';
    } else if (this.streakCounter === 5) {
      message = 'Five in a row!';
    } else if (this.streakCounter === 10) {
      message = '10! Think Fast!';
    } else {
      // For testing - show the current streak count
      message = `${this.streakCounter} correct!`;
    }
    
    this.showStreakNotification(message);
  }
  
  showStreakNotification(message) {
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