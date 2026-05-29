/* ============================================================
   PUNTO LÍMITE — main.js
   Animaciones + carga de productos desde Firebase
   ============================================================

   PARA AGREGAR UN PRODUCTO:
   Usá el panel de administración en admin.html
   ============================================================ */

/* --- Navbar scroll --- */
var navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', function() {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

/* --- Menú mobile --- */
var navToggle = document.getElementById('navToggle');
var navLinks  = document.getElementById('navLinks');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', function() {
    var open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open);
  });
  document.querySelectorAll('.nav-links a').forEach(function(a) {
    a.addEventListener('click', function() { navLinks.classList.remove('open'); });
  });
}

/* --- Animaciones de entrada del Hero --- */
function animateHero() {
  var sequence = [
    document.querySelector('.hero-eyebrow'),
    document.querySelector('.hero-title__solid'),
    document.querySelector('.hero-title__outline'),
    document.querySelector('.hero-sub'),
    document.querySelector('.hero-actions'),
    document.querySelector('.hero-stats')
  ];
  sequence.forEach(function(el, i) {
    if (!el) return;
    setTimeout(function() { el.classList.add('entered'); }, 100 + i * 120);
  });
}
window.addEventListener('load', animateHero);

/* --- Fade-in al hacer scroll --- */
var observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-in').forEach(function(el) { observer.observe(el); });

/* --- Render de una card de producto --- */
function renderCard(data, docId) {
  var img    = data.img || '';
  var imgSrc = (img.startsWith('http') || img.startsWith('data:')) ? img : 'img/' + img;
  return '<div class="product-card fade-in">' +
    '<div class="product-img">' +
      '<img src="' + imgSrc + '" alt="' + data.nombre + '" loading="lazy">' +
      (data.badge ? '<span class="product-badge">' + data.badge + '</span>' : '') +
    '</div>' +
    '<div class="product-info">' +
      '<h3>' + data.nombre + '</h3>' +
      '<p class="product-price">$' + Number(data.precio).toLocaleString('es-AR') + '</p>' +
      '<button class="btn-add-cart"' +
        ' data-id="'     + docId      + '"' +
        ' data-nombre="' + data.nombre.replace(/"/g, '&quot;') + '"' +
        ' data-precio="' + data.precio + '"' +
        ' data-img="'    + data.img    + '"' +
        ' onclick="addToCart(this)">Agregar al carrito</button>' +
    '</div>' +
  '</div>';
}

/* --- Cargar productos desde Firestore --- */
function loadToGrid(gridId, soloDestacados) {
  var el = document.getElementById(gridId);
  if (!el) return;

  el.innerHTML = '<p class="catalog-loading">Cargando productos...</p>';

  db.collection('productos').orderBy('orden').get()
    .then(function(snap) {
      var docs = snap.docs;
      if (soloDestacados) {
        docs = docs.filter(function(doc) { return doc.data().destacado === true; });
      }
      if (docs.length === 0) {
        el.innerHTML = '<p style="color:var(--gray);padding:2rem 0;grid-column:1/-1">Sin productos disponibles.</p>';
        return;
      }
      el.innerHTML = docs.map(function(doc) {
        return renderCard(doc.data(), doc.id);
      }).join('');
      el.querySelectorAll('.fade-in').forEach(function(card) { observer.observe(card); });
    })
    .catch(function(err) {
      console.error('Error cargando productos:', err);
      el.innerHTML = '<p style="color:var(--gray);padding:2rem 0;grid-column:1/-1">Error al cargar productos.</p>';
    });
}

loadToGrid('productsGrid',    true);   // inicio: solo destacados
loadToGrid('productsGridAll', false);  // catálogo: todos

/* --- Counter animado para stats del hero --- */
function animateCounter(el, target, duration) {
  duration = duration || 1200;
  var start = performance.now();
  var update = function(now) {
    var elapsed  = now - start;
    var progress = Math.min(elapsed / duration, 1);
    var eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString('es-AR');
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target.toLocaleString('es-AR');
  };
  requestAnimationFrame(update);
}

var statsObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (!entry.isIntersecting) return;
    entry.target.querySelectorAll('.hero-stat strong').forEach(function(strong) {
      var num = parseInt(strong.textContent.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num > 1) animateCounter(strong, num);
    });
    statsObserver.unobserve(entry.target);
  });
}, { threshold: 0.5 });

var heroStats = document.querySelector('.hero-stats');
if (heroStats) statsObserver.observe(heroStats);

/* --- Formulario de contacto --- */
var form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var msg = document.getElementById('formMsg');
    var btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Enviando...';
    btn.disabled    = true;
    setTimeout(function() {
      msg.textContent = '¡Mensaje enviado! Te respondemos pronto.';
      form.reset();
      btn.textContent = 'Enviar Mensaje';
      btn.disabled    = false;
      setTimeout(function() { msg.textContent = ''; }, 5000);
    }, 900);
  });
}

/* --- Parallax en la palabra de fondo del hero --- */
var bgWord = document.querySelector('.hero-bg__word');
if (bgWord) {
  window.addEventListener('scroll', function() {
    if (window.scrollY < window.innerHeight) {
      bgWord.style.transform = 'translateY(' + window.scrollY * 0.15 + 'px)';
    }
  }, { passive: true });
}

/* --- Cursor magnético en botones hero --- */
document.querySelectorAll('.hbtn').forEach(function(btn) {
  btn.addEventListener('mousemove', function(e) {
    var rect = btn.getBoundingClientRect();
    var x = e.clientX - rect.left - rect.width  / 2;
    var y = e.clientY - rect.top  - rect.height / 2;
    btn.style.transform = 'translate(' + (x * 0.12) + 'px, ' + (y * 0.18) + 'px) translateY(-2px)';
  });
  btn.addEventListener('mouseleave', function() {
    btn.style.transform = '';
  });
});
