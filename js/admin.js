/* ============================================================
   PUNTO LÍMITE — admin.js
   Panel de administración
   ============================================================

   CONTRASEÑA DEL ADMIN: puntolimite2025
   Para cambiarla editá la variable ADMIN_PASS de abajo.
   ============================================================ */

var ADMIN_PASS   = 'puntolimite2025';
var SESSION_KEY  = 'pl_admin_v1';
var unsubProd    = null;   // para cancelar el listener de productos
var unsubOrders  = null;   // para cancelar el listener de pedidos

/* --- Productos por defecto (se cargan la primera vez) --- */
var defaultProductos = [
  { nombre: 'Campera Running', precio: 45000, img: 'prod-campera.jpg', badge: 'Nuevo',   destacado: true,  orden: 0 },
  { nombre: 'Buzo Técnico',    precio: 32000, img: 'prod-buzo.jpg',    badge: 'Último!', destacado: true,  orden: 1 },
  { nombre: 'Short Deportivo', precio: 38000, img: 'prod-short.jpg',   badge: '',        destacado: false, orden: 2 },
  { nombre: 'Remera Técnica',  precio: 18000, img: 'prod-remera.jpg',  badge: 'Nuevo',   destacado: true,  orden: 3 },
  { nombre: 'Top Deportivo',   precio: 15000, img: 'prod-top.jpg',     badge: 'Nuevo',   destacado: false, orden: 4 },
];

var editingId = null;

function fmt(n)        { return '$' + Number(n).toLocaleString('es-AR'); }
function getImgSrc(img){ return img && img.startsWith('http') ? img : 'img/' + img; }

/* ============================================================
   TOAST
   ============================================================ */
function showAdminToast(msg, type) {
  var t = document.getElementById('adminToast');
  t.textContent = msg;
  t.className   = 'admin-toast show ' + (type || 'ok');
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.classList.remove('show'); }, 3000);
}

/* ============================================================
   LOGIN
   ============================================================ */
function checkSession() {
  return localStorage.getItem('pl_admin_session') === SESSION_KEY;
}

document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  var pass = document.getElementById('loginPass').value;
  if (pass === ADMIN_PASS) {
    localStorage.setItem('pl_admin_session', SESSION_KEY);
    showDashboard();
  } else {
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('loginPass').value = '';
  }
});

document.getElementById('logoutBtn').addEventListener('click', function() {
  localStorage.removeItem('pl_admin_session');
  if (unsubProd)   { unsubProd();   unsubProd   = null; }
  if (unsubOrders) { unsubOrders(); unsubOrders = null; }
  document.getElementById('adminScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginPass').value = '';
});

/* ============================================================
   INICIO
   ============================================================ */
if (checkSession()) {
  showDashboard();
} else {
  document.getElementById('loginScreen').style.display = 'flex';
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminScreen').style.display = 'block';
  subscribeProductos();
  subscribeOrders();
}

/* ============================================================
   PRODUCTOS — listener en tiempo real
   ============================================================ */
function subscribeProductos() {
  var list = document.getElementById('adminProductList');
  list.innerHTML = '<p class="empty-list">Cargando...</p>';

  /* onSnapshot → se actualiza solo cada vez que hay un cambio */
  unsubProd = db.collection('productos').orderBy('orden')
    .onSnapshot(function(snap) {
      var seedBanner = document.getElementById('seedBanner');
      seedBanner.style.display = snap.empty ? 'flex' : 'none';

      if (snap.empty) {
        list.innerHTML = '<p class="empty-list">No hay productos todavía.</p>';
        return;
      }

      list.innerHTML = snap.docs.map(function(doc) {
        var p = doc.data();
        return '<div class="product-row">' +
          '<img src="' + getImgSrc(p.img) + '" alt="' + p.nombre + '" onerror="this.src=\'img/logo.jpeg\'">' +
          '<div>' +
            '<p class="product-row-name">' + p.nombre + '</p>' +
            '<p class="product-row-price">' + fmt(p.precio) + '</p>' +
          '</div>' +
          (p.badge ? '<span class="badge-tag">' + p.badge + '</span>' : '<span></span>') +
          '<label class="toggle-dest' + (p.destacado ? ' on' : '') + '">' +
            '<input type="checkbox"' + (p.destacado ? ' checked' : '') +
            ' onchange="toggleDestacado(\'' + doc.id + '\', this.checked)"> Inicio' +
          '</label>' +
          '<button class="btn-edit" onclick="openEdit(\'' + doc.id + '\')" title="Editar">✏️</button>' +
          '<button class="btn-del"  onclick="deleteProducto(\'' + doc.id + '\')" title="Eliminar">🗑</button>' +
        '</div>';
      }).join('');
    },
    function(err) {
      console.error(err);
      list.innerHTML = '<p class="empty-list">Error al cargar productos.</p>';
    });
}

/* --- Seed --- */
document.getElementById('seedBtn').addEventListener('click', function() {
  var btn = this;
  btn.textContent = 'Cargando...';
  btn.disabled    = true;
  var batch = db.batch();
  defaultProductos.forEach(function(p) {
    batch.set(db.collection('productos').doc(), p);
  });
  batch.commit()
    .then(function() { showAdminToast('Productos de ejemplo cargados ✓', 'ok'); })
    .catch(function() { btn.disabled = false; btn.textContent = 'Error, intentá de nuevo'; });
});

/* --- Toggle destacado --- */
function toggleDestacado(id, value) {
  db.collection('productos').doc(id).update({ destacado: value })
    .catch(function(err) { console.error(err); });
  /* el onSnapshot actualiza la lista automáticamente */
}

/* --- Eliminar --- */
function deleteProducto(id) {
  if (!confirm('¿Seguro que querés eliminar este producto?')) return;
  db.collection('productos').doc(id).delete()
    .then(function()  { showAdminToast('Producto eliminado', 'ok'); })
    .catch(function() { showAdminToast('Error al eliminar', 'err'); });
}

/* ============================================================
   MODAL — AGREGAR / EDITAR
   ============================================================ */
document.getElementById('addProductBtn').addEventListener('click', function() { openModal(); });

function openModal(data, id) {
  editingId = id || null;
  document.getElementById('modalTitle').textContent = editingId ? 'Editar producto' : 'Agregar producto';

  document.getElementById('pNombre').value      = data ? data.nombre   : '';
  document.getElementById('pPrecio').value      = data ? data.precio   : '';
  document.getElementById('pBadge').value       = data ? data.badge    : '';
  document.getElementById('pOrden').value       = data ? data.orden    : 99;
  document.getElementById('pDestacado').checked = data ? !!data.destacado : false;
  document.getElementById('pImgUrl').value      = data ? data.img      : '';
  document.getElementById('pImgFile').value     = '';

  var saveBtn = document.getElementById('saveBtn');
  saveBtn.textContent      = 'Guardar producto';
  saveBtn.disabled         = false;
  saveBtn.style.background = '';

  updateImgPreview(data ? getImgSrc(data.img) : null);
  document.getElementById('uploadBarWrap').style.display = 'none';
  document.getElementById('uploadBar').style.width       = '0%';

  document.getElementById('productModal').classList.add('open');
  document.getElementById('pNombre').focus();
}

function openEdit(id) {
  db.collection('productos').doc(id).get()
    .then(function(doc) { openModal(doc.data(), id); });
}

document.getElementById('modalClose').addEventListener('click',  closeModal);
document.getElementById('cancelBtn').addEventListener('click',   closeModal);
document.getElementById('productModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

function closeModal() {
  document.getElementById('productModal').classList.remove('open');
  editingId = null;
}

/* --- Vista previa de imagen --- */
document.getElementById('pImgUrl').addEventListener('input', function() {
  updateImgPreview(this.value || null);
});
document.getElementById('pImgFile').addEventListener('change', function() {
  var file = this.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) { updateImgPreview(e.target.result); };
  reader.readAsDataURL(file);
  document.getElementById('pImgUrl').value = ''; // limpiar URL si suben archivo
});

function updateImgPreview(src) {
  var img = document.getElementById('imgPreview');
  if (src) { img.src = src; img.classList.add('visible'); }
  else     { img.classList.remove('visible'); }
}

/* --- Comprimir imagen antes de subir (Canvas API) --- */
function compressImage(file) {
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var MAX   = 900;  // ancho máximo en píxeles
        var ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        var canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(blob) { resolve(blob); }, 'image/jpeg', 0.82);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* --- Guardar producto --- */
document.getElementById('productForm').addEventListener('submit', function(e) {
  e.preventDefault();
  var btn  = document.getElementById('saveBtn');
  var file = document.getElementById('pImgFile').files[0];
  btn.textContent = 'Guardando...';
  btn.disabled    = true;

  if (file) {
    btn.textContent = 'Comprimiendo imagen...';
    compressImage(file).then(function(blob) {
      var fileName = Date.now() + '.jpg';
      var ref  = storage.ref('productos/' + fileName);
      var task = ref.put(blob);
      document.getElementById('uploadBarWrap').style.display = 'block';

      task.on('state_changed',
        function(snap) {
          var pct = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
          document.getElementById('uploadBar').style.width       = pct + '%';
          document.getElementById('uploadLabel').textContent     = 'Subiendo... ' + pct + '%';
          btn.textContent = 'Subiendo ' + pct + '%...';
        },
        function(err) {
          console.error(err);
          btn.textContent = 'Error al subir la imagen';
          btn.disabled    = false;
        },
        function() {
          ref.getDownloadURL().then(function(url) { saveProductData(url, btn); });
        }
      );
    });
  } else {
    saveProductData(document.getElementById('pImgUrl').value.trim(), btn);
  }
});

function saveProductData(imgValue, btn) {
  var data = {
    nombre:    document.getElementById('pNombre').value.trim(),
    precio:    parseInt(document.getElementById('pPrecio').value, 10),
    badge:     document.getElementById('pBadge').value.trim(),
    orden:     parseInt(document.getElementById('pOrden').value, 10) || 0,
    destacado: document.getElementById('pDestacado').checked,
    img:       imgValue
  };

  var op = editingId
    ? db.collection('productos').doc(editingId).update(data)
    : db.collection('productos').add(data);

  op.then(function() {
    /* Feedback visual: botón verde */
    btn.textContent      = '✓ Guardado';
    btn.style.background = '#22c55e';
    setTimeout(function() { closeModal(); }, 800);
    showAdminToast((editingId ? 'Producto actualizado' : 'Producto agregado') + ' ✓', 'ok');
  })
  .catch(function(err) {
    console.error(err);
    btn.textContent      = 'Error — intentá de nuevo';
    btn.style.background = '#ef4444';
    btn.disabled         = false;
  });
}

/* ============================================================
   PEDIDOS — listener en tiempo real
   ============================================================ */
function subscribeOrders() {
  var list = document.getElementById('adminOrderList');

  unsubOrders = db.collection('pedidos').orderBy('fecha', 'desc').limit(50)
    .onSnapshot(function(snap) {
      if (snap.empty) {
        list.innerHTML = '<p class="empty-list">Aún no hay pedidos.</p>';
        return;
      }
      list.innerHTML = snap.docs.map(function(doc) {
        var p     = doc.data();
        var fecha = p.fecha
          ? new Date(p.fecha.seconds * 1000).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
          : '—';
        var items  = (p.items || []).map(function(i) { return i.cantidad + '× ' + i.nombre; }).join(', ');
        var estado = p.estado || 'pendiente';

        return '<div class="order-row">' +
          '<div>' +
            '<p class="order-name">' + (p.cliente ? p.cliente.nombre : '—') + '</p>' +
            '<p class="order-meta">📞 ' + (p.cliente ? p.cliente.telefono : '—') + ' &nbsp;·&nbsp; ' + fecha + '</p>' +
            (p.cliente && p.cliente.notas ? '<p class="order-meta">📝 ' + p.cliente.notas + '</p>' : '') +
            '<p class="order-items">' + items + '</p>' +
          '</div>' +
          '<div>' +
            '<p class="order-total">' + fmt(p.total || 0) + '</p>' +
            '<span class="order-status status-' + estado + '">' + estado + '</span>' +
          '</div>' +
          '<div class="order-actions">' +
            '<button class="btn-status" onclick="setEstado(\'' + doc.id + '\',\'confirmado\')">Confirmar</button>' +
            '<button class="btn-status" onclick="setEstado(\'' + doc.id + '\',\'enviado\')">Enviado</button>' +
          '</div>' +
        '</div>';
      }).join('');
    },
    function(err) { console.error(err); });
}

function setEstado(id, estado) {
  db.collection('pedidos').doc(id).update({ estado: estado })
    .then(function()  { showAdminToast('Estado actualizado ✓', 'ok'); })
    .catch(function() { showAdminToast('Error al actualizar', 'err'); });
}

document.getElementById('refreshOrders').addEventListener('click', function() {
  showAdminToast('Pedidos actualizados en tiempo real ✓', 'ok');
});
