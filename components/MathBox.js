// MathBox.js - A minimal mathematical input component
class MathBox {
  constructor(options = {}) {
    this.options = {
      width: '200px',
      ...options
    };
    this.element = this.create();
  }

  create() {
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
    answer.addEventListener('input', () => {
      // Limit input to 3 digits maximum
      if (answer.value.length > 3) {
        answer.value = answer.value.slice(0, 3);
      }
      
      const userVal = answer.value.trim();
      this._animatedText.setText(userVal); // Update animated display
      
      if (userVal === '') return;
      if (Number(userVal) === this._correctAnswer) {
        // Correct! Move to next problem.
        this.generateProblem();
        answer.value = '';
        this._animatedText.setText(''); // Clear animated display
      }
    });

    // Assembly
    container.appendChild(problem);
    container.appendChild(equals);
    answerContainer.appendChild(answer);
    answerContainer.appendChild(answerDisplay);
    container.appendChild(answerContainer);

    return container;
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
    }
  }
} 