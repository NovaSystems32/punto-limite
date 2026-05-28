// Navbar: cambia de estilo al hacer scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

// Menú hamburguesa para móvil
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Animación fade-in al hacer scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Formulario de contacto
document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = document.getElementById('formMsg');
  msg.textContent = '¡Mensaje enviado! Te respondemos pronto.';
  e.target.reset();
  setTimeout(() => { msg.textContent = ''; }, 5000);
});
