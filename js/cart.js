/* ============================================================
   PUNTO LÍMITE — cart.js
   Carrito de compras + Firebase Firestore
   (Firebase se inicializa en firebase-init.js)
   ============================================================ */

/* --- WhatsApp del negocio --- */
var WA_NUMERO = '543571626532';

/* --- Cupón aplicado --- */
var _cupon = null;

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
function getDescuento() {
  if (!_cupon) return 0;
  var sub = getTotal();
  return _cupon.tipo === 'porcentaje'
    ? Math.round(sub * _cupon.valor / 100)
    : Math.min(_cupon.valor, sub);
}
function getFinalTotal() { return getTotal() - getDescuento(); }
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
        '<p class="cart-item-name">'  + item.nombre + '</p>' +
        (item.talle || item.color ? '<p style="font-size:0.75rem;color:var(--accent);font-weight:600;margin-top:1px">' + [item.talle ? 'Talle '+item.talle : '', item.color || ''].filter(Boolean).join(' · ') + '</p>' : '') +
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

  var desc = getDescuento();
  totalEl.textContent = formatPrice(getFinalTotal());
  var finalEl = document.getElementById('checkoutFinalTotal');
  if (finalEl) {
    finalEl.textContent = formatPrice(getFinalTotal());
    if (desc > 0) finalEl.innerHTML = '<del style="font-size:1rem;color:#aaa;font-family:var(--font-body)">' + formatPrice(getTotal()) + '</del> ' + formatPrice(getFinalTotal());
  }
}

/* --- Mapa de colores (nombre → hex) --- */
var COLOR_MAP = {
  'negro':'#1a1a1a','blanco':'#f0f0f0','gris':'#9ca3af','gris oscuro':'#4b5563',
  'rojo':'#ef4444','azul':'#3b82f6','verde':'#22c55e','rosa':'#f472b6',
  'naranja':'#f97316','amarillo':'#facc15','bordeaux':'#881337','marino':'#1e3a8a',
  'violeta':'#a855f7','beige':'#d4b896','celeste':'#7dd3fc','turquesa':'#00bfa5',
  'lila':'#c084fc','coral':'#fb7185','oliva':'#84cc16','bordo':'#881337',
  'nude':'#e8c9a0','caqui':'#a18262','tostado':'#b45309'
};
function getColorHex(name) { return COLOR_MAP[name.toLowerCase().trim()] || '#9ca3af'; }
function isColorLight(hex) {
  var r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000 > 150;
}

/* --- Estado del picker --- */
var _pendingBtn    = null;
var _selectedTalle = null;
var _selectedColor = null;
var _needsTalle    = false;
var _needsColor    = false;

function addToCart(btn) {
  var talles  = (btn.getAttribute('data-talles')  || '').trim();
  var colores = (btn.getAttribute('data-colores') || '').trim();

  if (talles || colores) {
    _pendingBtn    = btn;
    _selectedTalle = null;
    _selectedColor = null;
    _needsTalle    = !!talles;
    _needsColor    = !!colores;

    document.getElementById('sizeProductName').textContent = btn.getAttribute('data-nombre');

    /* Sección talles */
    var secTalle = document.getElementById('sizeSection');
    if (talles) {
      secTalle.style.display = 'block';
      document.getElementById('sizeButtons').innerHTML = talles.split(',').map(function(t) {
        t = t.trim();
        return '<button class="size-btn" onclick="selectTalle(this,\'' + t + '\')">' + t + '</button>';
      }).join('');
    } else {
      secTalle.style.display = 'none';
    }

    /* Sección colores */
    var secColor = document.getElementById('colorSection');
    if (colores) {
      secColor.style.display = 'block';
      document.getElementById('colorButtons').innerHTML = colores.split(',').map(function(c) {
        c = c.trim();
        var hex = getColorHex(c);
        return '<div class="color-swatch-wrap">' +
          '<button class="color-btn" style="background:' + hex + '" title="' + c + '" onclick="selectColor(this,\'' + c + '\')"></button>' +
          '<p class="color-btn-label">' + c + '</p>' +
        '</div>';
      }).join('');
    } else {
      secColor.style.display = 'none';
    }

    updateConfirmBtn();
    document.getElementById('sizeOverlay').classList.add('open');
  } else {
    doAddToCart(btn, null, null);
  }
}

function selectTalle(el, talle) {
  _selectedTalle = talle;
  document.querySelectorAll('.size-btn').forEach(function(b) { b.classList.remove('selected'); });
  el.classList.add('selected');
  updateConfirmBtn();
}

function selectColor(el, color) {
  _selectedColor = color;
  document.querySelectorAll('.color-btn').forEach(function(b) { b.classList.remove('selected'); });
  el.classList.add('selected');
  updateConfirmBtn();
}

function updateConfirmBtn() {
  var ok = (!_needsTalle || _selectedTalle) && (!_needsColor || _selectedColor);
  document.getElementById('addConfirmBtn').disabled = !ok;
}

function confirmOptions() {
  closeSizePicker();
  if (_pendingBtn) { doAddToCart(_pendingBtn, _selectedTalle, _selectedColor); _pendingBtn = null; }
}

function closeSizePicker() {
  document.getElementById('sizeOverlay').classList.remove('open');
}

function doAddToCart(btn, talle, color) {
  var docId  = btn.getAttribute('data-id');
  var id     = docId + (talle ? '_' + talle : '') + (color ? '_' + color : '');
  var nombre = btn.getAttribute('data-nombre');
  var precio = parseInt(btn.getAttribute('data-precio'), 10);
  var img    = btn.getAttribute('data-img');

  var existing = cart.find(function(item) { return item.id === id; });
  if (existing) {
    existing.cantidad++;
  } else {
    var item = { id: id, docId: docId, nombre: nombre, precio: precio, img: img, cantidad: 1 };
    if (talle) item.talle = talle;
    if (color) item.color = color;
    cart.push(item);
  }
  saveCart();
  renderCart();
  openCart();
  var detalle = [];
  if (talle) detalle.push('talle ' + talle);
  if (color) detalle.push(color);
  showToast('"' + nombre + '"' + (detalle.length ? ' (' + detalle.join(', ') + ')' : '') + ' agregado ✓');
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
      return { nombre: item.nombre, talle: item.talle || '—', color: item.color || '—', precio: item.precio, cantidad: item.cantidad, subtotal: item.precio * item.cantidad };
    }),
    subtotal:  getTotal(),
    descuento: getDescuento(),
    total:     getFinalTotal(),
    cupon:     _cupon ? _cupon.codigo : null
  };

  _lastPedido = pedido; // guardar para el mensaje de WA

  db.collection('pedidos').add(pedido)
    .then(function() {
      /* Incrementar uso del cupón */
      if (_cupon && _cupon._id) {
        db.collection('cupones').doc(_cupon._id).update({ usos: firebase.firestore.FieldValue.increment(1) }).catch(function(){});
        _cupon = null;
      }

      /* Descontar stock automáticamente */
      var batch = db.batch();
      cart.forEach(function(item) {
        if (item.docId) {
          batch.update(
            db.collection('productos').doc(item.docId),
            { stock: firebase.firestore.FieldValue.increment(-item.cantidad) }
          );
        }
      });
      batch.commit().catch(function(e) { console.warn('Stock update:', e); });

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
/* --- Aplicar cupón --- */
function applyCoupon() {
  var code = (document.getElementById('couponInput').value || '').trim().toUpperCase();
  var fb   = document.getElementById('couponFeedback');
  if (!code) { fb.textContent = 'Ingresá un código'; fb.className = 'coupon-feedback err'; return; }

  db.collection('cupones').where('codigo', '==', code).where('activo', '==', true).get()
    .then(function(snap) {
      if (snap.empty) {
        _cupon = null;
        fb.textContent = 'Código inválido o inactivo';
        fb.className   = 'coupon-feedback err';
      } else {
        _cupon = snap.docs[0].data();
        _cupon._id = snap.docs[0].id;
        var label = _cupon.tipo === 'porcentaje' ? _cupon.valor + '% OFF' : formatPrice(_cupon.valor) + ' OFF';
        fb.textContent = '✓ Descuento aplicado: ' + label;
        fb.className   = 'coupon-feedback ok';
      }
      renderCart();
    })
    .catch(function() { fb.textContent = 'Error al verificar el código'; fb.className = 'coupon-feedback err'; });
}

/* ============================================================
   DETALLE DEL PRODUCTO
   ============================================================ */
var _pdDocId      = null;
var _pdTalle      = null;
var _pdColor      = null;
var _pdNeedsTalle = false;
var _pdNeedsColor = false;
var _pdNoStock    = false;

function openPD(docId) {
  var data = productCache[docId];
  if (!data) return;
  _pdDocId = docId;
  _pdTalle = null;
  _pdColor = null;

  var img = data.img || '';
  var imgSrc = (img.startsWith('http') || img.startsWith('data:')) ? img : 'img/' + img;
  document.getElementById('pdImg').src   = imgSrc;
  document.getElementById('pdName').textContent  = data.nombre;
  document.getElementById('pdPrice').textContent = '$' + Number(data.precio).toLocaleString('es-AR');

  var badge = document.getElementById('pdBadge');
  if (data.badge) { badge.textContent = data.badge; badge.style.display = 'inline-block'; }
  else            { badge.style.display = 'none'; }

  var desc = document.getElementById('pdDesc');
  if (data.descripcion) { desc.textContent = data.descripcion; desc.style.display = 'block'; }
  else                  { desc.style.display = 'none'; }

  var stock   = typeof data.stock !== 'undefined' ? Number(data.stock) : 99;
  var stockEl = document.getElementById('pdStock');
  stockEl.innerHTML = stock === 0 ? '<span class="stock-badge stock-out">Sin stock</span>'
    : stock <= 5 ? '<span class="stock-badge stock-low">¡Últimas ' + stock + ' unidades!</span>' : '';

  var talles = (data.talles || '').trim();
  _pdNeedsTalle = !!talles;
  var sizeSection = document.getElementById('pdSizeSection');
  if (talles) {
    sizeSection.style.display = 'block';
    document.getElementById('pdSizes').innerHTML = talles.split(',').map(function(t) {
      t = t.trim();
      return '<button class="size-btn pd-size-btn" onclick="selectPDTalle(this,\'' + t + '\')">' + t + '</button>';
    }).join('');
  } else { sizeSection.style.display = 'none'; }

  var colores = (data.colores || '').trim();
  _pdNeedsColor = !!colores;
  var colorSection = document.getElementById('pdColorSection');
  if (colores) {
    colorSection.style.display = 'block';
    document.getElementById('pdColors').innerHTML = colores.split(',').map(function(c) {
      c = c.trim();
      var hex = getColorHex(c);
      return '<div class="color-swatch-wrap">' +
        '<button class="color-btn pd-color-btn" style="background:' + hex + '" onclick="selectPDColor(this,\'' + c + '\')" title="' + c + '"></button>' +
        '<p class="color-btn-label">' + c + '</p>' +
      '</div>';
    }).join('');
  } else { colorSection.style.display = 'none'; }

  _pdNoStock = (stock === 0);
  var addBtn = document.getElementById('pdAddBtn');
  addBtn.disabled = _pdNoStock;
  updatePDBtn();

  document.getElementById('pdOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePD() {
  document.getElementById('pdOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function selectPDTalle(el, talle) {
  _pdTalle = talle;
  document.querySelectorAll('.pd-size-btn').forEach(function(b) { b.classList.remove('selected'); });
  el.classList.add('selected');
  updatePDBtn();
}

function selectPDColor(el, color) {
  _pdColor = color;
  document.querySelectorAll('.pd-color-btn').forEach(function(b) { b.classList.remove('selected'); });
  el.classList.add('selected');
  updatePDBtn();
}

function updatePDBtn() {
  if (_pdNoStock) return;
  var ok  = (!_pdNeedsTalle || _pdTalle) && (!_pdNeedsColor || _pdColor);
  var btn = document.getElementById('pdAddBtn');
  if (btn) btn.disabled = !ok;
}

function addFromPD() {
  if (!_pdDocId) return;
  var data = productCache[_pdDocId];
  var img  = data.img || '';
  var fakeBtn = {
    getAttribute: function(attr) {
      if (attr === 'data-id')     return _pdDocId;
      if (attr === 'data-nombre') return data.nombre;
      if (attr === 'data-precio') return String(data.precio);
      if (attr === 'data-img')    return img;
      return '';
    }
  };
  closePD();
  doAddToCart(fakeBtn, _pdTalle, _pdColor);
}

document.getElementById('pdOverlay').addEventListener('click', function(e) {
  if (e.target === this) closePD();
});

/* --- WhatsApp --- */
function openWhatsApp() {
  if (!_lastPedido) return;
  var p    = _lastPedido;
  var lines = [];
  lines.push('🛒 *Nuevo pedido — Punto Límite*');
  lines.push('');
  p.items.forEach(function(item) {
    var det = [];
    if (item.talle && item.talle !== '—') det.push('Talle ' + item.talle);
    if (item.color && item.color !== '—') det.push(item.color);
    var detStr = det.length ? ' (' + det.join(', ') + ')' : '';
    lines.push('• ' + item.nombre + detStr + ' × ' + item.cantidad + '  →  ' + formatPrice(item.subtotal));
  });
  lines.push('');
  if (p.descuento && p.descuento > 0) {
    lines.push('Subtotal: ' + formatPrice(p.subtotal));
    lines.push('Descuento' + (p.cupon ? ' (' + p.cupon + ')' : '') + ': -' + formatPrice(p.descuento));
  }
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
