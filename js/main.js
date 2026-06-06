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
    document.querySelector('.hero-title__celeste'),
    document.querySelector('.hero-title__accent'),
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

/* --- Cache de productos para el modal de detalle --- */
var productCache = {};
var pdCurrentImgIndex = 0;

/* --- Render de una card de producto --- */
function renderCard(data, docId) {
  /* Usar img, o el primer elemento de imgs si img está vacío */
  var img = data.img || (data.imgs && data.imgs.length ? data.imgs[0] : '') || '';
  var imgSrc = img
    ? ((img.startsWith('http') || img.startsWith('data:')) ? img : 'img/' + img)
    : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'360\' viewBox=\'0 0 300 360\'%3E%3Crect width=\'300\' height=\'360\' fill=\'%23C8DDEF\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-family=\'sans-serif\' font-size=\'14\' fill=\'%23001F5B\'%3ESin imagen%3C/text%3E%3C/svg%3E';
  var stock = 99;
  if (data.stockMatrix && Object.keys(data.stockMatrix).length) {
    stock = Object.values(data.stockMatrix).reduce(function(a,b){ return a+(Number(b)||0); }, 0);
  } else if (typeof data.stock !== 'undefined') {
    stock = Number(data.stock);
  }
  var stockBadge  = stock === 0 ? '<span class="stock-badge stock-out">Sin stock</span>'
                  : stock <= 5  ? '<span class="stock-badge stock-low">¡Últimas ' + stock + ' unidades!</span>'
                  : '';
  var btnDisabled = stock === 0 ? ' disabled' : '';
  productCache[docId] = data; // guardar para el modal

  var imgsAttr = (data.imgs && data.imgs.length > 1) ? ' data-imgs=\'' + JSON.stringify(data.imgs) + '\'' : '';
  return '<div class="product-card fade-in" data-cat="' + (data.categoria || '') + '"' + imgsAttr + '>' +
    '<div class="product-img pd-trigger" onclick="openPD(\'' + docId + '\')" style="cursor:pointer">' +
      '<img src="' + imgSrc + '" alt="' + data.nombre + '" loading="lazy">' +
      (data.badge ? '<span class="product-badge">' + data.badge + '</span>' : '') +
    '</div>' +
    '<div class="product-info">' +
      '<h3 class="pd-trigger" onclick="openPD(\'' + docId + '\')" style="cursor:pointer">' + data.nombre + '</h3>' +
      '<p class="product-price">$' + Number(data.precio).toLocaleString('es-AR') + '</p>' +
      (stockBadge ? '<div>' + stockBadge + '</div>' : '') +
      '<button class="btn-add-cart"' + btnDisabled +
        ' data-id="'     + docId      + '"' +
        ' data-nombre="' + data.nombre.replace(/"/g, '&quot;') + '"' +
        ' data-precio="' + data.precio + '"' +
        ' data-img="'    + (data.img || '') + '"' +
        ' data-talles="'  + (data.talles  || '') + '"' +
        ' data-colores="' + (data.colores || '') + '"' +
        ' onclick="addToCart(this)">Agregar al carrito</button>' +
    '</div>' +
  '</div>';
}

/* --- Poblar dropdown del navbar con categorías --- */
function populateNavDropdowns(cats) {
  ['navCatDropdown', 'navCatDropdownAll'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<li><a href="productos.html">Todos los productos</a></li>' +
      cats.map(function(cat) {
        return '<li><a href="productos.html?cat=' + encodeURIComponent(cat) + '">' + cat + '</a></li>';
      }).join('');
  });
}

/* --- Filtros de categoría --- */
function buildFilters(filterId, gridEl, docs) {
  var filterEl = document.getElementById(filterId);
  if (!filterEl) return;

  var cats = ['Todos'];
  docs.forEach(function(doc) {
    var cat = doc.data().categoria;
    if (cat && cats.indexOf(cat) === -1) cats.push(cat);
  });

  if (cats.length <= 1) { filterEl.style.display = 'none'; return; }

  filterEl.innerHTML = cats.map(function(cat) {
    return '<button class="filter-btn' + (cat === 'Todos' ? ' active' : '') + '" onclick="filterProducts(this, \'' + cat + '\', \'' + gridEl.id + '\')">' + cat + '</button>';
  }).join('');
}

function filterProducts(btn, cat, gridId) {
  var gridEl = document.getElementById(gridId);
  if (!gridEl) return;

  /* actualizar botones activos */
  btn.closest('.product-filters').querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');

  /* mostrar/ocultar cards (comparación sin distinción de mayúsculas) */
  var catNorm = cat.toLowerCase().trim();
  gridEl.querySelectorAll('.product-card').forEach(function(card) {
    var cardCat = (card.getAttribute('data-cat') || '').toLowerCase().trim();
    if (cat === 'Todos' || cardCat === catNorm) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
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

      /* construir filtros */
      var filterId = soloDestacados ? 'productFilters' : 'productFiltersAll';
      buildFilters(filterId, el, docs);

      /* poblar dropdowns del navbar */
      var cats = [];
      docs.forEach(function(doc) {
        var cat = doc.data().categoria;
        if (cat && cats.indexOf(cat) === -1) cats.push(cat);
      });
      if (cats.length) populateNavDropdowns(cats);

      /* auto-filtrar si viene por URL ?cat=xxx (sin distinción mayúsculas) */
      var urlCat = new URLSearchParams(window.location.search).get('cat');
      if (urlCat) {
        var filterEl = document.getElementById(filterId);
        if (filterEl) {
          var urlCatNorm = urlCat.toLowerCase().trim();
          var btn = Array.from(filterEl.querySelectorAll('.filter-btn')).find(function(b) {
            return b.textContent.toLowerCase().trim() === urlCatNorm;
          });
          if (btn) btn.click();
        }
      }
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

/* --- Hover cycling de imágenes en product cards --- */
document.addEventListener('mouseover', function(e) {
  var card = e.target.closest('.product-card');
  if (!card || card._cycleTimer) return;
  var imgsRaw = card.getAttribute('data-imgs');
  if (!imgsRaw) return;
  try {
    var imgs = JSON.parse(imgsRaw);
    if (imgs.length < 2) return;
    var imgEl = card.querySelector('.product-img img');
    if (!imgEl) return;
    var idx = 1;
    card._origSrc = imgEl.src;
    card._cycleTimer = setInterval(function() {
      imgEl.src = imgs[idx].startsWith('http') || imgs[idx].startsWith('data:') ? imgs[idx] : 'img/' + imgs[idx];
      idx = (idx + 1) % imgs.length;
    }, 1200);
  } catch(e) {}
});
document.addEventListener('mouseout', function(e) {
  var card = e.target.closest('.product-card');
  if (!card || !card._cycleTimer) return;
  var related = e.relatedTarget;
  if (related && card.contains(related)) return;
  clearInterval(card._cycleTimer);
  card._cycleTimer = null;
  var imgEl = card.querySelector('.product-img img');
  if (imgEl && card._origSrc) imgEl.src = card._origSrc;
});

/* ============================================================
   CARRUSEL DEL MODAL DE DETALLE
   ============================================================ */
function openPD(id) {
  var data = productCache[id];
  if (!data) return;

  var imgs = (data.imgs && data.imgs.length) ? data.imgs : (data.img ? [data.img] : []);
  pdCurrentImgIndex = 0;

  /* Imagen principal */
  var pdImg = document.getElementById('pdImg');
  setPdImg(pdImg, imgs[0]);

  /* Badge */
  var badge = document.getElementById('pdBadge');
  if (data.badge) { badge.textContent = data.badge; badge.style.display = ''; }
  else { badge.style.display = 'none'; }

  /* Nombre, precio, stock */
  document.getElementById('pdName').textContent  = data.nombre;
  document.getElementById('pdPrice').textContent = '$' + Number(data.precio).toLocaleString('es-AR');

  var stock = 99;
  if (data.stockMatrix && Object.keys(data.stockMatrix).length) {
    stock = Object.values(data.stockMatrix).reduce(function(a,b){return a+(Number(b)||0);},0);
  } else if (typeof data.stock !== 'undefined') {
    stock = Number(data.stock);
  }
  var stockEl = document.getElementById('pdStock');
  stockEl.innerHTML = stock === 0 ? '<span class="stock-badge stock-out">Sin stock</span>'
    : stock <= 5 ? '<span class="stock-badge stock-low">¡Últimas ' + stock + ' unidades!</span>' : '';

  /* Descripción */
  var descEl = document.getElementById('pdDesc');
  if (data.descripcion) { descEl.textContent = data.descripcion; descEl.style.display = ''; }
  else { descEl.style.display = 'none'; }

  /* Talles */
  var sizeSection = document.getElementById('pdSizeSection');
  var pdSizes     = document.getElementById('pdSizes');
  if (data.talles) {
    pdSizes.innerHTML = data.talles.split(',').map(function(t) {
      return '<button class="size-btn" onclick="selectPdSize(this,\'' + t.trim() + '\')">' + t.trim() + '</button>';
    }).join('');
    sizeSection.style.display = '';
  } else { sizeSection.style.display = 'none'; }

  /* Colores */
  var colorSection = document.getElementById('pdColorSection');
  var pdColors     = document.getElementById('pdColors');
  if (data.colores) {
    pdColors.innerHTML = data.colores.split(',').map(function(c) {
      return '<div class="color-swatch-wrap"><button class="color-btn" style="background:' + c.trim() + '" onclick="selectPdColor(this,\'' + c.trim() + '\')" title="' + c.trim() + '"></button><span class="color-btn-label">' + c.trim() + '</span></div>';
    }).join('');
    colorSection.style.display = '';
  } else { colorSection.style.display = 'none'; }

  /* Miniaturas carrusel */
  var thumbsEl = document.getElementById('pdThumbs');
  if (thumbsEl) {
    if (imgs.length > 1) {
      thumbsEl.innerHTML = imgs.map(function(src, i) {
        var s = src.startsWith('http') || src.startsWith('data:') ? src : 'img/' + src;
        return '<img src="' + s + '" class="pd-thumb' + (i === 0 ? ' active' : '') + '" onclick="pdGoTo(' + i + ')" alt="Foto ' + (i+1) + '">';
      }).join('');
      thumbsEl.style.display = 'flex';
    } else {
      thumbsEl.innerHTML = '';
      thumbsEl.style.display = 'none';
    }
  }

  /* Flechas */
  var prevBtn = document.getElementById('pdPrev');
  var nextBtn = document.getElementById('pdNext');
  if (prevBtn) prevBtn.style.display = imgs.length > 1 ? '' : 'none';
  if (nextBtn) nextBtn.style.display = imgs.length > 1 ? '' : 'none';

  /* Guardar imgs e id en el overlay para navegación */
  document.getElementById('pdOverlay')._imgs      = imgs;
  document.getElementById('pdOverlay')._currentId = id;
  document.getElementById('pdAddBtn').disabled = stock === 0;

  document.getElementById('pdOverlay').classList.add('open');
}

function setPdImg(imgEl, src) {
  if (!src) return;
  imgEl.src = src.startsWith('http') || src.startsWith('data:') ? src : 'img/' + src;
}

function pdGoTo(idx) {
  var overlay = document.getElementById('pdOverlay');
  var imgs    = overlay._imgs || [];
  if (!imgs.length) return;
  pdCurrentImgIndex = (idx + imgs.length) % imgs.length;
  setPdImg(document.getElementById('pdImg'), imgs[pdCurrentImgIndex]);
  var thumbs = document.querySelectorAll('.pd-thumb');
  thumbs.forEach(function(t, i) { t.classList.toggle('active', i === pdCurrentImgIndex); });
}

function pdPrev() { pdGoTo(pdCurrentImgIndex - 1); }
function pdNext() { pdGoTo(pdCurrentImgIndex + 1); }

function closePD() {
  document.getElementById('pdOverlay').classList.remove('open');
}

/* Variables para add from PD */
var _pdSelectedSize  = null;
var _pdSelectedColor = null;

function selectPdSize(btn, size) {
  document.querySelectorAll('#pdSizes .size-btn').forEach(function(b){ b.classList.remove('selected'); });
  btn.classList.add('selected');
  _pdSelectedSize = size;
}
function selectPdColor(btn, color) {
  document.querySelectorAll('#pdColors .color-btn').forEach(function(b){ b.classList.remove('selected'); });
  btn.classList.add('selected');
  _pdSelectedColor = color;
}
function addFromPD() {
  var overlay = document.getElementById('pdOverlay');
  var id      = overlay._currentId;
  if (!id) return;
  var data    = productCache[id];
  if (!data) return;
  var cartItem = {
    id: id, nombre: data.nombre, precio: data.precio,
    img: data.img, cantidad: 1,
    talle: _pdSelectedSize || '—', color: _pdSelectedColor || '—'
  };
  if (typeof addToCartItem === 'function') addToCartItem(cartItem);
  closePD();
}
