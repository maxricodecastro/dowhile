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

    // Answer input
    const answer = document.createElement('input');
    answer.type = 'text';
    answer.className = 'math-answer';
    Object.assign(answer.style, {
      width: '70px',
      padding: '4px 4px',
      border: 'none',
      borderRadius: '24px',
      fontSize: '16px',
      backgroundColor: '#f5f5f5',
      textAlign: 'center',
      outline: 'none'
    });

    // Generate first problem
    this._problemSpan = problem;
    this._answerInput = answer;
    this.generateProblem();

    // Answer checker
    answer.addEventListener('input', () => {
      const userVal = answer.value.trim();
      if (userVal === '') return;
      if (Number(userVal) === this._correctAnswer) {
        // Correct! Move to next problem.
        this.generateProblem();
        answer.value = '';
      }
    });

    // Assembly
    container.appendChild(problem);
    container.appendChild(equals);
    container.appendChild(answer);

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