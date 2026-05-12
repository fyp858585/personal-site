/* ===== PARTICLE SYSTEM ===== */
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
const PARTICLE_COUNT = 100;
const CONNECTION_DIST = 150;
const MOUSE_RADIUS = 180;

let mouse = { x: -1000, y: -1000 };
let width, height;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => {
  resize();
  initParticles();
});

class Particle {
  constructor() {
    this.reset();
    this.y = Math.random() * height; // spread initially
  }
  reset() {
    this.x = Math.random() * width;
    this.y = -10;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = Math.random() * 0.5 + 0.2;
    this.radius = Math.random() * 1.8 + 0.5;
    this.opacity = Math.random() * 0.5 + 0.2;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;

    // mouse interaction
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MOUSE_RADIUS) {
      const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
      const angle = Math.atan2(dy, dx);
      this.x += Math.cos(angle) * force * 1.5;
      this.y += Math.sin(angle) * force * 1.5;
    }

    if (this.y > height + 10) this.reset();
    if (this.x < -10) this.x = width + 10;
    if (this.x > width + 10) this.x = -10;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 229, 255, ${this.opacity})`;
    ctx.fill();
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }
}
initParticles();

document.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
document.addEventListener('touchmove', (e) => {
  mouse.x = e.touches[0].clientX;
  mouse.y = e.touches[0].clientY;
}, { passive: true });

function drawConnections() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONNECTION_DIST) {
        const opacity = (1 - dist / CONNECTION_DIST) * 0.12;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(0, 229, 255, ${opacity})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  particles.forEach(p => { p.update(); p.draw(); });
  drawConnections();
  requestAnimationFrame(animate);
}
animate();

/* ===== TYPING EFFECT ===== */
const target = document.getElementById('typing-target');
const names = ['Explorer', '开发者', '创造者', 'Builder'];
let nameIdx = 0;
let charIdx = 0;
let isDeleting = false;
let typingSpeed = 120;

function type() {
  const current = names[nameIdx];

  if (isDeleting) {
    target.textContent = current.substring(0, charIdx - 1);
    charIdx--;
    typingSpeed = 50;
  } else {
    target.textContent = current.substring(0, charIdx + 1);
    charIdx++;
    typingSpeed = 120;
  }

  if (!isDeleting && charIdx === current.length) {
    typingSpeed = 2000;
    isDeleting = true;
  } else if (isDeleting && charIdx === 0) {
    isDeleting = false;
    nameIdx = (nameIdx + 1) % names.length;
    typingSpeed = 400;
  }

  setTimeout(type, typingSpeed);
}
type();

/* ===== SCROLL REVEAL ===== */
const revealEls = document.querySelectorAll(
  '.about-card, .skill-category, .project-card, .contact-link, .section-header'
);
revealEls.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => observer.observe(el));

/* ===== NAVBAR SCROLL EFFECT ===== */
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    navbar.style.background = 'rgba(6, 6, 14, 0.92)';
  } else {
    navbar.style.background = 'rgba(6, 6, 14, 0.75)';
  }
});
