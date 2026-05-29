/* ============================================================
   PUNTO LÍMITE — admin.js
   Panel de administración
   ============================================================

   CONTRASEÑA DEL ADMIN: puntolimite2025
   Para cambiarla editá la variable ADMIN_PASS de abajo.
   ============================================================ */

var ADMIN_PASS = 'puntolimite2025';
var SESSION_KEY = 'pl_admin_v1';

/* --- Productos por defecto (para cargar la primera vez) --- */
var defaultProductos = [
  { nombre: 'Campera Running', precio: 45000, img: 'prod-campera.jpg', badge: 'Nuevo',   destacado: true,  orden: 0 },
  { nombre: 'Buzo Técnico',    precio: 32000, img: 'prod-buzo.jpg',    badge: 'Último!', destacado: true,  orden: 1 },
  { nombre: 'Short Deportivo', precio: 38000, img: 'prod-short.jpg',   badge: '',        destacado: false, orden: 2 },
  { nombre: 'Remera Técnica',  precio: 18000, img: 'prod-remera.jpg',  badge: 'Nuevo',   destacado: true,  orden: 3 },
  { nombre: 'Top Deportivo',   precio: 15000, img: 'prod-top.jpg',     badge: 'Nuevo',   destacado: false, orden: 4 },
];

/* --- Estado del modal --- */
var editingId = null;

/* --- Helpers --- */
function fmt(n) { return '$' + Number(n).toLocaleString('es-AR'); }
function getImgSrc(img) { return img && img.startsWith('http') ? img : 'img/' + img; }

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
  document.getElementById('adminScreen').style.display  = 'none';
  document.getElementById('loginScreen').style.display  = 'flex';
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
  loadProductos();
  loadPedidos();
}

/* ============================================================
   PRODUCTOS
   ============================================================ */
function loadProductos() {
  var list = document.getElementById('adminProductList');
  list.innerHTML = '<p class="empty-list">Cargando...</p>';

  db.collection('productos').orderBy('orden').get()
    .then(function(snap) {
      /* Mostrar banner de seed si está vacío */
      var seedBanner = document.getElementById('seedBanner');
      seedBanner.style.display = snap.empty ? 'flex' : 'none';

      if (snap.empty) {
        list.innerHTML = '<p class="empty-list">No hay productos todavía.<br>Usá el botón de arriba para agregar.</p>';
        return;
      }

      list.innerHTML = snap.docs.map(function(doc) {
        var p = doc.data();
        var imgSrc = getImgSrc(p.img);
        return '<div class="product-row" data-id="' + doc.id + '">' +
          '<img src="' + imgSrc + '" alt="' + p.nombre + '" onerror="this.src=\'img/logo.jpeg\'">' +
          '<div>' +
            '<p class="product-row-name">' + p.nombre + '</p>' +
            '<p class="product-row-price">' + fmt(p.precio) + '</p>' +
          '</div>' +
          (p.badge ? '<span class="badge-tag">' + p.badge + '</span>' : '<span></span>') +
          '<label class="toggle-dest' + (p.destacado ? ' on' : '') + '">' +
            '<input type="checkbox" ' + (p.destacado ? 'checked' : '') + ' onchange="toggleDestacado(\'' + doc.id + '\', this.checked)"> Inicio' +
          '</label>' +
          '<button class="btn-edit" onclick="openEdit(\'' + doc.id + '\')" title="Editar">✏️</button>' +
          '<button class="btn-del"  onclick="deleteProducto(\'' + doc.id + '\')" title="Eliminar">🗑</button>' +
        '</div>';
      }).join('');
    })
    .catch(function(err) {
      console.error(err);
      list.innerHTML = '<p class="empty-list">Error al cargar productos.</p>';
    });
}

/* --- Seed productos por defecto --- */
document.getElementById('seedBtn').addEventListener('click', function() {
  var btn = document.getElementById('seedBtn');
  btn.textContent = 'Cargando...';
  btn.disabled = true;
  var batch = db.batch();
  defaultProductos.forEach(function(p) {
    batch.set(db.collection('productos').doc(), p);
  });
  batch.commit()
    .then(function() { loadProductos(); })
    .catch(function(err) { console.error(err); btn.disabled = false; btn.textContent = 'Error'; });
});

/* --- Destacado toggle directo desde la lista --- */
function toggleDestacado(id, value) {
  db.collection('productos').doc(id).update({ destacado: value })
    .then(function() { loadProductos(); })
    .catch(function(err) { console.error(err); });
}

/* --- Eliminar --- */
function deleteProducto(id) {
  if (!confirm('¿Seguro que querés eliminar este producto?')) return;
  db.collection('productos').doc(id).delete()
    .then(function() { loadProductos(); })
    .catch(function(err) { console.error(err); });
}

/* ============================================================
   MODAL — AGREGAR / EDITAR PRODUCTO
   ============================================================ */
document.getElementById('addProductBtn').addEventListener('click', function() {
  openModal();
});

function openModal(data, id) {
  editingId = id || null;
  var title = document.getElementById('modalTitle');
  title.textContent = editingId ? 'Editar producto' : 'Agregar producto';

  /* Limpiar / rellenar */
  document.getElementById('pNombre').value    = data ? data.nombre  : '';
  document.getElementById('pPrecio').value    = data ? data.precio  : '';
  document.getElementById('pBadge').value     = data ? data.badge   : '';
  document.getElementById('pOrden').value     = data ? data.orden   : 99;
  document.getElementById('pDestacado').checked = data ? !!data.destacado : false;
  document.getElementById('pImgUrl').value    = data ? data.img     : '';
  document.getElementById('pImgFile').value   = '';

  updateImgPreview(data ? getImgSrc(data.img) : null);
  hideUploadBar();

  document.getElementById('productModal').classList.add('open');
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
});

function updateImgPreview(src) {
  var img = document.getElementById('imgPreview');
  if (src) { img.src = src; img.classList.add('visible'); }
  else     { img.classList.remove('visible'); }
}
function hideUploadBar() {
  document.getElementById('uploadBarWrap').style.display = 'none';
  document.getElementById('uploadBar').style.width = '0%';
}
function showUploadBar(pct) {
  document.getElementById('uploadBarWrap').style.display = 'block';
  document.getElementById('uploadBar').style.width = pct + '%';
  document.getElementById('uploadLabel').textContent = pct < 100 ? 'Subiendo imagen... ' + pct + '%' : 'Imagen subida ✓';
}

/* --- Guardar producto --- */
document.getElementById('productForm').addEventListener('submit', function(e) {
  e.preventDefault();
  var saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';

  var fileInput = document.getElementById('pImgFile');
  var file = fileInput.files[0];

  if (file) {
    /* Subir imagen a Firebase Storage */
    var fileName = Date.now() + '_' + file.name.replace(/\s/g, '_');
    var ref = storage.ref('productos/' + fileName);
    var task = ref.put(file);

    task.on('state_changed',
      function(snapshot) {
        var pct = Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100);
        showUploadBar(pct);
      },
      function(err) {
        console.error(err);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Error subiendo imagen';
      },
      function() {
        ref.getDownloadURL().then(function(url) {
          saveProductData(url, saveBtn);
        });
      }
    );
  } else {
    /* Usar URL directa */
    saveProductData(document.getElementById('pImgUrl').value.trim(), saveBtn);
  }
});

function saveProductData(imgValue, btn) {
  var data = {
    nombre:     document.getElementById('pNombre').value.trim(),
    precio:     parseInt(document.getElementById('pPrecio').value, 10),
    badge:      document.getElementById('pBadge').value.trim(),
    orden:      parseInt(document.getElementById('pOrden').value, 10) || 0,
    destacado:  document.getElementById('pDestacado').checked,
    img:        imgValue
  };

  var op = editingId
    ? db.collection('productos').doc(editingId).update(data)
    : db.collection('productos').add(data);

  op.then(function() {
    closeModal();
    loadProductos();
  }).catch(function(err) {
    console.error(err);
    btn.disabled = false;
    btn.textContent = 'Error — intentá de nuevo';
  });
}

/* ============================================================
   PEDIDOS
   ============================================================ */
function loadPedidos() {
  var list = document.getElementById('adminOrderList');
  list.innerHTML = '<p class="empty-list">Cargando pedidos...</p>';

  db.collection('pedidos').orderBy('fecha', 'desc').limit(50).get()
    .then(function(snap) {
      if (snap.empty) {
        list.innerHTML = '<p class="empty-list">Aún no hay pedidos.</p>';
        return;
      }
      list.innerHTML = snap.docs.map(function(doc) {
        var p = doc.data();
        var fecha = p.fecha ? new Date(p.fecha.seconds * 1000).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
        var items = (p.items || []).map(function(i) { return i.cantidad + '× ' + i.nombre; }).join(', ');
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
            '<button class="btn-status" onclick="setEstado(\'' + doc.id + '\', \'confirmado\')">Confirmar</button>' +
            '<button class="btn-status" onclick="setEstado(\'' + doc.id + '\', \'enviado\')">Enviado</button>' +
          '</div>' +
        '</div>';
      }).join('');
    })
    .catch(function(err) {
      console.error(err);
      list.innerHTML = '<p class="empty-list">Error al cargar pedidos.</p>';
    });
}

function setEstado(id, estado) {
  db.collection('pedidos').doc(id).update({ estado: estado })
    .then(function() { loadPedidos(); })
    .catch(function(err) { console.error(err); });
}

/* --- Refrescar pedidos --- */
document.getElementById('refreshOrders').addEventListener('click', loadPedidos);
