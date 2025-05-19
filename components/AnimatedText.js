// // AnimatedText.js - Simple character animation as user types

// class AnimatedText {
//   constructor(containerSelector, options = {}) {
//     this.container = typeof containerSelector === 'string'
//       ? document.querySelector(containerSelector)
//       : containerSelector;
//     this.options = {
//       charDelay: 50,   // delay between each character's animation (ms)
//       ...options
//     };
//   }

//   setText(text) {
//     if (!this.container) return;
//     // Clear existing content
//     this.container.innerHTML = '';

//     // Create a span for each character with staggered animation
//     Array.from(text).forEach((char, idx) => {
//       const span = document.createElement('span');
//       span.textContent = char;
//       span.style.display = 'inline-block';
//       span.style.opacity = '0';
//       span.style.transform = 'translateY(10px) scale(0.85)';
//       span.style.animation = `fadeInUp 300ms ease-out forwards`;
//       span.style.animationDelay = `${idx * this.options.charDelay}ms`;
//       this.container.appendChild(span);
//     });
//   }
// }

// // Attach to window for easy access if needed
// window.AnimatedText = AnimatedText; 