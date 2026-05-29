/* ============================================================
   PUNTO LÍMITE — main.js
   Animaciones premium + microinteracciones
   ============================================================ */

/* ============================================================
   PRODUCTOS — Editá esta lista para agregar, quitar o
   modificar productos. Campos:
     nombre  → nombre del producto
     precio  → precio (ej: "$45.000")
     img     → nombre del archivo en la carpeta img/
     badge   → etiqueta opcional ("Nuevo", "Último!", etc.)
               dejalo en "" si no querés etiqueta
   ============================================================ */
const productos = [
  { nombre: 'Campera Running', precio: '$45.000', img: 'prod-campera.jpg', badge: 'Nuevo'   },
  { nombre: 'Buzo Técnico',    precio: '$32.000', img: 'prod-buzo.jpg',    badge: 'Último!' },
  { nombre: 'Short Deportivo', precio: '$38.000', img: 'prod-short.jpg',   badge: ''        },
  { nombre: 'Remera Técnica',  precio: '$18.000', img: 'prod-remera.jpg',  badge: 'Nuevo'   },
  { nombre: 'Top Deportivo',   precio: '$15.000', img: 'prod-top.jpg',     badge: 'Nuevo'   },
];

/* --- Navbar scroll --- */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* --- Menú mobile --- */
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});
document.querySelectorAll('.nav-links a').forEach(a =>
  a.addEventListener('click', () => navLinks.classList.remove('open'))
);

/* --- Animaciones de entrada del Hero (stagger) --- */
function animateHero() {
  const titleSolid   = document.querySelector('.hero-title__solid');
  const titleOutline = document.querySelector('.hero-title__outline');
  const eyebrow      = document.querySelector('.hero-eyebrow');
  const sub          = document.querySelector('.hero-sub');
  const actions      = document.querySelector('.hero-actions');
  const stats        = document.querySelector('.hero-stats');

  const sequence = [eyebrow, titleSolid, titleOutline, sub, actions, stats];

  sequence.forEach((el, i) => {
    if (!el) return;
    setTimeout(() => el.classList.add('entered'), 100 + i * 120);
  });
}
window.addEventListener('load', animateHero);

/* --- Fade-in al hacer scroll (IntersectionObserver) --- */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

/* --- Renderiza las cards de productos automáticamente --- */
const grid = document.getElementById('productsGrid');
if (grid) {
  grid.innerHTML = productos.map(p => `
    <div class="product-card fade-in">
      <div class="product-img">
        <img src="img/${p.img}" alt="${p.nombre}" loading="lazy">
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
      </div>
      <div class="product-info">
        <h3>${p.nombre}</h3>
        <p class="product-price">${p.precio}</p>
        <a href="#contacto" class="btn-link">Consultar &rarr;</a>
      </div>
    </div>
  `).join('');

  /* re-observar las nuevas cards para el fade-in */
  grid.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

/* --- Counter animado para stats del hero --- */
function animateCounter(el, target, duration = 1200) {
  const start = performance.now();
  const isDecimal = target % 1 !== 0;

  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const value = eased * target;

    el.textContent = isDecimal
      ? value.toFixed(0)
      : Math.floor(value).toLocaleString('es-AR');

    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target.toLocaleString('es-AR');
  };
  requestAnimationFrame(update);
}

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.querySelectorAll('.hero-stat strong').forEach(strong => {
      const raw   = strong.textContent.replace(/[^0-9]/g, '');
      const num   = parseInt(raw, 10);
      if (!isNaN(num) && num > 1) animateCounter(strong, num);
    });
    statsObserver.unobserve(entry.target);
  });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) statsObserver.observe(heroStats);

/* --- Formulario de contacto --- */
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = document.getElementById('formMsg');
    const btn = form.querySelector('button[type="submit"]');

    btn.textContent = 'Enviando...';
    btn.disabled = true;

    setTimeout(() => {
      msg.textContent = '¡Mensaje enviado! Te respondemos pronto.';
      form.reset();
      btn.textContent = 'Enviar Mensaje';
      btn.disabled = false;
      setTimeout(() => { msg.textContent = ''; }, 5000);
    }, 900);
  });
}

/* --- Parallax sutil en la palabra de fondo del hero --- */
const bgWord = document.querySelector('.hero-bg__word');
if (bgWord) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight) {
      bgWord.style.transform = `translateY(${y * 0.15}px)`;
    }
  }, { passive: true });
}

/* --- Cursor magnético suave en botones hero --- */
document.querySelectorAll('.hbtn').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width  / 2;
    const y = e.clientY - rect.top  - rect.height / 2;
    btn.style.transform = `translate(${x * 0.12}px, ${y * 0.18}px) translateY(-2px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});
