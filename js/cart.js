/* ============================================================
   PUNTO LÍMITE — cart.js
   Carrito de compras + Firebase Firestore
   (Firebase se inicializa en firebase-init.js)
   ============================================================ */

/* --- WhatsApp del negocio --- */
var WA_NUMERO = '543571626532';

/* --- Último pedido (para el mensaje de WA) --- */
var _lastPedido = null;

/* --- Estado del carrito (se guarda en el navegador) --- */
var cart = JSON.parse(localStorage.getItem('pl_cart') || '[]');

/* --- Helpers --- */
function formatPrice(n) {
  return '$' + Number(n).toLocaleString('es-AR');
}
function saveCart() {
  localStorage.setItem('pl_cart', JSON.stringify(cart));
}
function getTotal() {
  return cart.reduce(function(sum, item) { return sum + item.precio * item.cantidad; }, 0);
}
function getCount() {
  return cart.reduce(function(sum, item) { return sum + item.cantidad; }, 0);
}

/* --- Renderizar el carrito --- */
function renderCart() {
  var list    = document.getElementById('cartList');
  var totalEl = document.getElementById('cartTotal');
  var countEl = document.getElementById('cartCount');
  var badge   = document.getElementById('cartBadge');
  if (!list) return;

  var count = getCount();
  badge.textContent    = count;
  badge.style.display  = count > 0 ? 'flex' : 'none';
  countEl.textContent  = count + ' producto' + (count !== 1 ? 's' : '');

  if (cart.length === 0) {
    list.innerHTML  = '<p class="cart-empty"><span>🛒</span>Tu carrito está vacío</p>';
    totalEl.textContent = formatPrice(0);
    return;
  }

  list.innerHTML = cart.map(function(item, i) {
    var imgSrc = item.img && (item.img.startsWith('http') || item.img.startsWith('data:')) ? item.img : 'img/' + item.img;
    return '<div class="cart-item">' +
      '<img src="' + imgSrc + '" alt="' + item.nombre + '">' +
      '<div class="cart-item-info">' +
        '<p class="cart-item-name">'  + item.nombre + (item.talle ? ' <span style="color:var(--accent);font-size:0.78rem">Talle ' + item.talle + '</span>' : '') + '</p>' +
        '<p class="cart-item-price">' + formatPrice(item.precio) + '</p>' +
      '</div>' +
      '<div class="cart-item-qty">' +
        '<button onclick="changeQty(' + i + ', -1)">−</button>' +
        '<span>' + item.cantidad + '</span>' +
        '<button onclick="changeQty(' + i + ', 1)">+</button>' +
      '</div>' +
      '<button class="cart-item-remove" onclick="removeFromCart(' + i + ')" aria-label="Quitar">✕</button>' +
    '</div>';
  }).join('');

  totalEl.textContent = formatPrice(getTotal());
}

/* --- Selector de talle --- */
var _pendingBtn = null;

function addToCart(btn) {
  var talles = (btn.getAttribute('data-talles') || '').trim();
  if (talles) {
    _pendingBtn = btn;
    document.getElementById('sizeProductName').textContent = btn.getAttribute('data-nombre');
    var buttons = talles.split(',').map(function(t) {
      t = t.trim();
      return '<button class="size-btn" onclick="confirmSize(\'' + t + '\')">' + t + '</button>';
    }).join('');
    document.getElementById('sizeButtons').innerHTML = buttons;
    document.getElementById('sizeOverlay').classList.add('open');
  } else {
    doAddToCart(btn, null);
  }
}

function confirmSize(talle) {
  closeSizePicker();
  if (_pendingBtn) { doAddToCart(_pendingBtn, talle); _pendingBtn = null; }
}

function closeSizePicker() {
  document.getElementById('sizeOverlay').classList.remove('open');
}

function doAddToCart(btn, talle) {
  var docId  = btn.getAttribute('data-id');
  var id     = talle ? docId + '_' + talle : docId;
  var nombre = btn.getAttribute('data-nombre');
  var precio = parseInt(btn.getAttribute('data-precio'), 10);
  var img    = btn.getAttribute('data-img');

  var existing = cart.find(function(item) { return item.id === id; });
  if (existing) {
    existing.cantidad++;
  } else {
    var item = { id: id, nombre: nombre, precio: precio, img: img, cantidad: 1 };
    if (talle) item.talle = talle;
    cart.push(item);
  }
  saveCart();
  renderCart();
  openCart();
  showToast(talle ? '"' + nombre + '" talle ' + talle + ' agregado ✓' : '"' + nombre + '" agregado al carrito ✓');
}

/* --- Cambiar cantidad --- */
function changeQty(index, delta) {
  cart[index].cantidad += delta;
  if (cart[index].cantidad <= 0) cart.splice(index, 1);
  saveCart();
  renderCart();
}

/* --- Quitar del carrito --- */
function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  renderCart();
}

/* --- Abrir / cerrar sidebar --- */
function openCart() {
  document.getElementById('cartSidebar').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cartSidebar').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
  showView('cartMain');
}

/* --- Cambiar vistas dentro del sidebar --- */
function showView(id) {
  ['cartMain', 'cartCheckout', 'cartSuccess'].forEach(function(v) {
    var el = document.getElementById(v);
    if (el) el.style.display = (v === id) ? 'flex' : 'none';
  });
}

/* --- Toast --- */
function showToast(msg) {
  var t = document.getElementById('cartToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2600);
}

/* --- Confirmar pedido → guardar en Firestore --- */
function submitOrder(e) {
  e.preventDefault();
  if (cart.length === 0) return;

  var btn      = document.getElementById('orderBtn');
  var nombre   = document.getElementById('checkoutNombre').value.trim();
  var telefono = document.getElementById('checkoutTelefono').value.trim();
  var notas    = document.getElementById('checkoutNotas').value.trim();

  btn.textContent = 'Enviando...';
  btn.disabled    = true;

  var pedido = {
    fecha:   firebase.firestore.FieldValue.serverTimestamp(),
    estado:  'pendiente',
    cliente: { nombre: nombre, telefono: telefono, notas: notas },
    items:   cart.map(function(item) {
      return { nombre: item.nombre, talle: item.talle || 'único', precio: item.precio, cantidad: item.cantidad, subtotal: item.precio * item.cantidad };
    }),
    total: getTotal()
  };

  _lastPedido = pedido; // guardar para el mensaje de WA

  db.collection('pedidos').add(pedido)
    .then(function() {
      cart = [];
      saveCart();
      renderCart();
      document.getElementById('checkoutForm').reset();
      showView('cartSuccess');
    })
    .catch(function(err) {
      console.error('Error:', err);
      btn.textContent = 'Error — intentá de nuevo';
      btn.disabled    = false;
    });
}

/* --- Eventos --- */
/* --- WhatsApp --- */
function openWhatsApp() {
  if (!_lastPedido) return;
  var p    = _lastPedido;
  var lines = [];
  lines.push('🛒 *Nuevo pedido — Punto Límite*');
  lines.push('');
  p.items.forEach(function(item) {
    var talle = item.talle && item.talle !== 'único' ? ' (Talle ' + item.talle + ')' : '';
    lines.push('• ' + item.nombre + talle + ' × ' + item.cantidad + '  →  ' + formatPrice(item.subtotal));
  });
  lines.push('');
  lines.push('*Total: ' + formatPrice(p.total) + '*');
  lines.push('');
  lines.push('👤 *Cliente:* ' + p.cliente.nombre);
  lines.push('📞 *Teléfono:* ' + p.cliente.telefono);
  if (p.cliente.notas) lines.push('📝 *Notas:* ' + p.cliente.notas);
  var url = 'https://wa.me/' + WA_NUMERO + '?text=' + encodeURIComponent(lines.join('\n'));
  window.open(url, '_blank');
}

document.getElementById('cartBtn').addEventListener('click', openCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);
document.getElementById('cartClose').addEventListener('click', closeCart);

document.getElementById('checkoutBtn').addEventListener('click', function() {
  if (cart.length > 0) showView('cartCheckout');
  else showToast('Agregá productos primero');
});

document.getElementById('checkoutBack').addEventListener('click', function() {
  showView('cartMain');
});

document.getElementById('checkoutForm').addEventListener('submit', submitOrder);
document.getElementById('continueBtn').addEventListener('click', closeCart);

/* --- Arrancar --- */
renderCart();
