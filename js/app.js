// =============================================================================
// ALMACENAMIENTO LOCAL
// Los registros de revisiones se guardan en el navegador (localStorage).
// Se pueden exportar a JSON y volver a importar en otro dispositivo.
// =============================================================================

const DB = {
  getRecords() { return JSON.parse(localStorage.getItem('mant_records') || '[]'); },
  saveRecords(v) { localStorage.setItem('mant_records', JSON.stringify(v)); }
};


// =============================================================================
// ESTADO DE LA APLICACION
// =============================================================================

// Navegacion actual: en que nivel estamos y que elemento esta seleccionado
let nav = {
  nivel: 'marcas', // 'marcas' | 'modelos' | 'series'
  marcaId: null,
  modeloId: null,
  serialActivo: null
};

// Revision en curso (null si no hay ninguna abierta)
// Estructura: { marcaId, modeloId, serial, puntos: [{id, nombre, status, obs}] }
let session = null;

// ID del punto cuyo popover esta abierto (null si no hay ninguno)
let popoverPuntoId = null;

// Ultimo ancho conocido, para detectar cambios de breakpoint al rotar pantalla
let ultimoAnchoEsMovil = window.innerWidth <= 480;


// =============================================================================
// UTILIDADES
// =============================================================================

// Genera un ID unico basado en timestamp + aleatorio
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Escapa caracteres especiales HTML para evitar inyecciones
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Formatea una fecha ISO a 'dd/mm/aaaa hh:mm' en español
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// Muestra un mensaje flotante temporal en la parte inferior de la pantalla
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.getElementById('toast-wrap').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// Atajos para buscar en el catalogo
function getMarca(id) { return CATALOGO.find(m => m.id === id); }
function getModelo(mid, oid) { const m = getMarca(mid); return m ? m.modelos.find(x => x.id === oid) : null; }

// Devuelve true si hay que mostrar los pins superpuestos sobre la foto.
// Solo cuando: el modelo tiene imagen Y la pantalla es suficientemente grande.
function modoPins(modelo) {
  return !!modelo.imagen && window.innerWidth > 480;
}


// =============================================================================
// RENDER PRINCIPAL
// Se llama cada vez que cambia algo que afecta a la interfaz.
// Limpia el estado visual anterior y vuelve a pintarlo todo desde cero.
// =============================================================================

function render() {
  const sidebar = document.getElementById('sidebar');
  const photoWrap = document.getElementById('photo-wrap');
  const img = document.getElementById('machine-img');
  const actionBar = document.getElementById('action-bar');
  const listaPuntos = document.getElementById('puntos-lista');

  // -- Limpiar estado visual anterior --
  photoWrap.querySelectorAll('.oknok').forEach(e => e.remove()); // quitar pins
  photoWrap.style.display = 'none';
  img.src = '';
  listaPuntos.innerHTML = '';
  listaPuntos.classList.remove('visible'); // clase que controla si se muestra
  actionBar.classList.remove('open');

  // -- Pintar segun el nivel de navegacion --
  if (nav.nivel === 'marcas') renderMarcas(sidebar);
  else if (nav.nivel === 'modelos') renderModelos(sidebar);
  else if (nav.nivel === 'series') {
    renderSeries(sidebar);
    const modelo = getModelo(nav.marcaId, nav.modeloId);

    // Mostrar la foto si existe
    if (modelo && modelo.imagen) {
      img.src = modelo.imagen;
      photoWrap.style.display = 'inline-block';
    }

    // Si hay revision en curso, pintar los puntos
    if (session && nav.serialActivo) {
      // La lista siempre se muestra (debajo de la foto o sola si no hay foto)
      renderPuntosLista(listaPuntos, modelo);
      listaPuntos.classList.add('visible');

      // Ademas, si hay foto y la pantalla es grande, poner tambien los pins encima
      if (modoPins(modelo)) {
        renderPinsSobreImagen(photoWrap, modelo);
      }

      actionBar.classList.add('open');
    }
  }
}


// =============================================================================
// RENDER DE CADA NIVEL DE LA SIDEBAR
// =============================================================================

// Nivel 1: lista de marcas
function renderMarcas(sb) {
  sb.innerHTML = '';

  // Cabecera solo con el titulo
  const h = document.createElement('div');
  h.style.cssText = 'display:flex;justify-content:flex-end;width:100%';
  h.innerHTML = '<div class="title">Marcas</div>';
  sb.appendChild(h);

  CATALOGO.forEach(marca => {
    const btn = document.createElement('button');
    btn.className = 'content';
    btn.textContent = marca.nombre;
    btn.onclick = () => {
      nav = { nivel: 'modelos', marcaId: marca.id, modeloId: null, serialActivo: null };
      session = null;
      closePuntoPopover();
      render();
    };
    sb.appendChild(btn);
  });
}

// Nivel 2: modelos de una marca
function renderModelos(sb) {
  const marca = getMarca(nav.marcaId);
  sb.innerHTML = '';

  const h = document.createElement('div');
  h.style.cssText = 'display:flex;width:100%';
  h.innerHTML = `
        <button class="back" onclick="goBack()">
            <i class="fa-solid fa-chevron-left"></i>Volver
        </button>
        <div class="title">${esc(marca.nombre)}</div>`;
  sb.appendChild(h);

  marca.modelos.forEach(modelo => {
    const btn = document.createElement('button');
    btn.className = 'content';
    btn.textContent = modelo.nombre;
    btn.onclick = () => {
      nav = { nivel: 'series', marcaId: nav.marcaId, modeloId: modelo.id, serialActivo: null };
      session = null;
      closePuntoPopover();
      render();
    };
    sb.appendChild(btn);
  });
}

// Nivel 3: numeros de serie y formulario de revision
function renderSeries(sb) {
  const modelo = getModelo(nav.marcaId, nav.modeloId);
  sb.innerHTML = '';

  // Cabecera
  const h = document.createElement('div');
  h.style.cssText = 'display:flex;width:100%';
  h.innerHTML = `
        <button class="back" onclick="goBack()">
            <i class="fa-solid fa-chevron-left"></i>Volver
        </button>
        <div class="title">${esc(modelo.nombre)}</div>`;
  sb.appendChild(h);

  // Campo para introducir numero de serie e iniciar revision
  const iw = document.createElement('div');
  iw.className = 'serial-input-wrap';
  iw.innerHTML = `
        <label>Numero de serie</label>
        <div class="serial-input-row">
            <input type="text" id="serial-input" placeholder="SN-0000"
                   value="${nav.serialActivo || ''}" autocomplete="off"
                   onkeydown="if(event.key==='Enter') iniciarRevision()">
            <button onclick="iniciarRevision()">Iniciar</button>
        </div>`;
  sb.appendChild(iw);

  // Historial de revisiones anteriores, agrupadas por numero de serie
  const records = DB.getRecords().filter(r => r.marcaId === nav.marcaId && r.modeloId === nav.modeloId);
  const seriales = [...new Set(records.map(r => r.serial))];

  if (seriales.length) {
    const hs = document.createElement('div');
    hs.className = 'historial-section';
    hs.innerHTML = '<div class="historial-label">Historial por serie</div>';

    seriales.forEach(sn => {
      const snRecs = records.filter(r => r.serial === sn);
      const ultimo = snRecs[0]; // el mas reciente (estan ordenados por fecha desc)
      const oks = ultimo.puntos.filter(p => p.status === 'ok').length;
      const nooks = ultimo.puntos.filter(p => p.status === 'nook').length;
      const pend = ultimo.puntos.length - oks - nooks;

      const btn = document.createElement('button');
      btn.className = 'hist-item' + (nav.serialActivo === sn ? ' active-sn' : '');
      btn.innerHTML = `
                <span style="flex:1;font-weight:500">${esc(sn)}</span>
                <div class="hist-badges">
                    ${oks > 0 ? `<span class="hb hb-ok">${oks}&nbsp;OK</span>` : ''}
                    ${nooks > 0 ? `<span class="hb hb-nook">${nooks}&nbsp;NOK</span>` : ''}
                    ${pend > 0 ? `<span class="hb hb-pend">${pend}&nbsp;-</span>` : ''}
                </div>
                <span class="hist-date">${formatDate(ultimo.date).split(' ')[0]}</span>`;
      btn.onclick = () => verHistorialSerie(sn, snRecs);
      hs.appendChild(btn);
    });

    sb.appendChild(hs);
  }
}


// =============================================================================
// NAVEGACION
// =============================================================================

function goBack() {
  closePuntoPopover();
  if (session && !confirm('Salir sin guardar la revision en curso?')) return;
  session = null;
  if (nav.nivel === 'modelos') nav = { nivel: 'marcas', marcaId: null, modeloId: null, serialActivo: null };
  else if (nav.nivel === 'series') nav = { nivel: 'modelos', marcaId: nav.marcaId, modeloId: null, serialActivo: null };
  render();
}


// =============================================================================
// SESION DE REVISION
// =============================================================================

function iniciarRevision() {
  const input = document.getElementById('serial-input');
  const serial = input ? input.value.trim() : '';
  if (!serial) { toast('Introduce un numero de serie'); return; }
  if (session && !confirm('Hay una revision en curso. Iniciar nueva?')) return;

  const modelo = getModelo(nav.marcaId, nav.modeloId);

  // Permitir iniciar aunque no haya puntos (se podra guardar igual, sin checks)
  nav.serialActivo = serial;
  session = {
    marcaId: nav.marcaId,
    modeloId: nav.modeloId,
    serial,
    // Copiar los puntos del catalogo a la sesion, con estado inicial null
    puntos: modelo.puntos.map(p => ({ id: p.id, nombre: p.nombre, status: null, obs: '' }))
  };

  closePuntoPopover();
  render();
  toast('Revision iniciada');
}

function cancelarRevision() {
  if (!confirm('Cancelar la revision sin guardar?')) return;
  session = null;
  nav.serialActivo = null;
  closePuntoPopover();
  render();
}

function guardarRevision() {
  if (!session) return;

  const records = DB.getRecords();
  records.unshift({
    id: uid(),
    marcaId: session.marcaId,
    modeloId: session.modeloId,
    serial: session.serial,
    date: new Date().toISOString(),
    puntos: session.puntos.map(p => ({
      id: p.id,
      nombre: p.nombre,
      status: p.status,
      obs: p.obs
    }))
  });
  DB.saveRecords(records);

  toast('Revision guardada');
  exportData(); // exportar automaticamente al guardar
  session = null;
  closePuntoPopover();
  render();
}


// =============================================================================
// PINS SOBRE LA IMAGEN
// Se usan cuando el modelo tiene foto Y la pantalla es suficientemente grande.
// Cada pin es un div posicionado en % sobre el contenedor de la imagen,
// lo que hace que se mantengan en su sitio sea cual sea el zoom o resolucion.
// =============================================================================

function renderPinsSobreImagen(photoWrap, modelo) {
  if (!modelo || !modelo.puntos.length || !session) return;

  modelo.puntos.forEach((pDef, i) => {
    const pSess = session.puntos.find(x => x.id === pDef.id);
    if (pDef.x === null || pDef.y === null) return; // saltar puntos sin coordenadas
    const pin = document.createElement('div');
    pin.className = 'oknok ' + statusClass(pSess ? pSess.status : null);
    pin.textContent = statusLabel(pSess ? pSess.status : null);
    pin.dataset.pid = pDef.id;
    pin.style.left = pDef.x + '%';
    pin.style.top = pDef.y + '%';

    // Al pulsar el pin, abre el popover de ese punto
    pin.addEventListener('click', e => {
      e.stopPropagation();
      openPuntoPopover(pDef.id, pin);
    });

    photoWrap.appendChild(pin);
  });
}


// =============================================================================
// LISTA DE PUNTOS
// Se usa cuando no hay imagen o la pantalla es pequena.
// Muestra los puntos como filas pulsables en vez de pins sobre la foto.
// =============================================================================

function renderPuntosLista(container, modelo) {
  if (!modelo || !session) return;

  if (!modelo.puntos.length) {
    // El modelo no tiene puntos definidos todavia
    container.innerHTML = '<p style="color:rgb(150,150,150);font-size:13px;padding:12px 0">Este modelo aun no tiene puntos de revision definidos.</p>';
    return;
  }

  container.innerHTML = modelo.puntos.map((pDef, i) => {
    const pSess = session.puntos.find(x => x.id === pDef.id);
    const status = pSess ? pSess.status : null;
    return `
            <div class="puntos-lista-item"
                 data-pid="${pDef.id}"
                 onclick="openPuntoPopover('${pDef.id}', this)">
                <div class="puntos-lista-num">${i + 1}</div>
                <div class="puntos-lista-name">${esc(pDef.nombre)}</div>
                <div class="puntos-lista-badge ${statusClass(status)}">${statusLabel(status)}</div>
            </div>`;
  }).join('');
}


// =============================================================================
// CLASES Y ETIQUETAS DE ESTADO OK/NOOK
// =============================================================================

function statusClass(s) {
  if (s === 'ok') return 'state-ok';
  if (s === 'nook') return 'state-nook';
  return 'state-none'; // sin marcar todavia
}

function statusLabel(s) {
  if (s === 'ok') return 'OK';
  if (s === 'nook') return 'NOOK';
  return 'OK'; // texto por defecto cuando no hay estado
}


// =============================================================================
// POPOVER DE PUNTO
// El mismo popover se reutiliza para todos los puntos.
// Se posiciona dinamicamente junto al elemento que lo abre (pin o fila de lista).
// =============================================================================

function openPuntoPopover(pid, anchorEl) {
  if (!session) return;

  popoverPuntoId = pid;
  const p = session.puntos.find(x => x.id === pid);
  const pop = document.getElementById('punto-popover');

  // Rellenar el popover con los datos del punto
  document.getElementById('pp-name').value = p.nombre;
  document.getElementById('pp-obs').value = p.obs || '';
  document.getElementById('pp-ok').classList.toggle('active', p.status === 'ok');
  document.getElementById('pp-nook').classList.toggle('active', p.status === 'nook');

  // Mostrar y posicionar junto al elemento que lo abrio
  pop.classList.add('open');
  const rect = anchorEl.getBoundingClientRect();
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;

  // Intentar poner a la derecha, si no cabe, a la izquierda
  let left = rect.right + 10;
  let top = rect.top;
  if (left + pw > window.innerWidth - 10) left = rect.left - pw - 10;
  if (left < 10) left = 10;

  // Ajustar verticalmente si se sale de la pantalla
  if (top + ph > window.innerHeight - 10) top = window.innerHeight - ph - 10;
  if (top < 10) top = 10;

  pop.style.left = left + 'px';
  pop.style.top = top + 'px';

  setTimeout(() => document.getElementById('pp-obs').focus(), 50);
}

function closePuntoPopover() {
  popoverPuntoId = null;
  document.getElementById('punto-popover').classList.remove('open');
}

// Cambia el estado OK/NOOK del punto activo. Si ya tenia ese estado, lo quita.
function popSetStatus(status) {
  if (!popoverPuntoId || !session) return;

  const p = session.puntos.find(x => x.id === popoverPuntoId);
  p.status = (p.status === status) ? null : status; // toggle

  // Actualizar botones del popover
  document.getElementById('pp-ok').classList.toggle('active', p.status === 'ok');
  document.getElementById('pp-nook').classList.toggle('active', p.status === 'nook');

  // Actualizar el pin sobre la foto (si existe en modo escritorio)
  const pin = document.querySelector(`.oknok[data-pid="${p.id}"]`);
  if (pin) {
    pin.className = 'oknok ' + statusClass(p.status);
    pin.textContent = statusLabel(p.status);
  }

  // Actualizar el badge en la lista (si existe en modo movil/sin foto)
  const badge = document.querySelector(`.puntos-lista-item[data-pid="${p.id}"] .puntos-lista-badge`);
  if (badge) {
    badge.className = 'puntos-lista-badge ' + statusClass(p.status);
    badge.textContent = statusLabel(p.status);
  }
}

// Guarda las observaciones escritas en el campo de texto del popover
function popSetObs(val) {
  if (!popoverPuntoId || !session) return;
  const p = session.puntos.find(x => x.id === popoverPuntoId);
  if (p) p.obs = val;
}

// Actualiza el nombre del punto tanto en la sesion como en el catalogo en memoria
// (el catalogo original no se modifica en disco, solo dura hasta recargar la pagina)
function popSetNombre(val) {
  if (!popoverPuntoId || !session) return;

  // Actualizar en la sesion actual
  const pSess = session.puntos.find(x => x.id === popoverPuntoId);
  if (pSess) pSess.nombre = val;

  // Actualizar en el catalogo en memoria para que quede bien si se guarda
  const modelo = getModelo(session.marcaId, session.modeloId);
  if (modelo) {
    const pCat = modelo.puntos.find(x => x.id === popoverPuntoId);
    if (pCat) pCat.nombre = val;
  }

  // Reflejar el cambio en la lista si esta visible
  const nameEl = document.querySelector(`.puntos-lista-item[data-pid="${popoverPuntoId}"] .puntos-lista-name`);
  if (nameEl) nameEl.textContent = val;
}

// Cerrar el popover al hacer clic fuera de el
document.addEventListener('click', e => {
  const pop = document.getElementById('punto-popover');
  if (pop.classList.contains('open')
    && !pop.contains(e.target)
    && !e.target.closest('.oknok')
    && !e.target.closest('.puntos-lista-item')) {
    closePuntoPopover();
  }
});

// Al rotar el movil o cambiar el tamanyo de ventana:
// - cierra el popover si habia uno abierto
// - si se cruza el breakpoint de 480px, vuelve a pintar para cambiar entre pins y lista
window.addEventListener('resize', () => {
  if (popoverPuntoId) closePuntoPopover();

  // Si se cruza el umbral de 480px (p.ej. al rotar el movil),
  // volver a pintar para anadir o quitar los pins sobre la foto
  const esMovilAhora = window.innerWidth <= 480;
  if (esMovilAhora !== ultimoAnchoEsMovil) {
    ultimoAnchoEsMovil = esMovilAhora;
    if (session) render();
  }
});


// =============================================================================
// HISTORIAL - MODAL DE DETALLE
// Al pulsar una entrada del historial se abre un modal con el detalle completo
// de todas las revisiones de ese numero de serie.
// =============================================================================

function verHistorialSerie(serial, records) {
  const modelo = getModelo(nav.marcaId, nav.modeloId);
  document.getElementById('modal-title').textContent = modelo.nombre + ' - ' + serial;

  document.getElementById('modal-points').innerHTML = records.map(r => {
    const oks = r.puntos.filter(p => p.status === 'ok').length;
    const nooks = r.puntos.filter(p => p.status === 'nook').length;
    const pend = r.puntos.length - oks - nooks;

    return `
            <div style="margin-bottom:14px;">
                <div style="font-size:12px;color:rgb(130,130,130);margin-bottom:6px;
                            display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <strong>${formatDate(r.date)}</strong>
                    ${oks > 0 ? `<span class="hb hb-ok">${oks} OK</span>` : ''}
                    ${nooks > 0 ? `<span class="hb hb-nook">${nooks} NOK</span>` : ''}
                    ${pend > 0 ? `<span class="hb hb-pend">${pend} -</span>` : ''}
                </div>
                ${r.puntos.map(p => `
                    <div class="modal-point-row">
                        <span class="modal-point-name">${esc(p.nombre)}</span>
                        <span class="modal-point-obs">${p.obs ? esc(p.obs) : ''}</span>
                        <span class="hb ${p.status === 'ok' ? 'hb-ok' : p.status === 'nook' ? 'hb-nook' : 'hb-pend'}">
                            ${p.status ? p.status.toUpperCase() : '-'}
                        </span>
                    </div>`).join('')}
            </div>`;
  }).join('<hr style="border:none;border-top:1px solid #eee;margin:10px 0">');

  document.getElementById('modal-backdrop').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
}


// =============================================================================
// EXPORTAR / IMPORTAR DATOS
// El JSON exportado contiene todos los registros de revisiones.
// Al importar, solo se anaden los registros que no existan ya (por ID),
// asi se pueden combinar datos de varios dispositivos sin duplicar.
// =============================================================================

function exportData() {
  const data = {
    version: 3,
    exported: new Date().toISOString(),
    records: DB.getRecords()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mantenimiento_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Datos exportados');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.records) throw new Error('Formato no reconocido');

      const existing = DB.getRecords();
      const nuevos = data.records.filter(r => !existing.find(x => x.id === r.id));
      DB.saveRecords([...nuevos, ...existing]);

      render();
      toast('Importado: +' + nuevos.length + ' registros');
    } catch (err) {
      toast('Error: fichero no valido');
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // resetear el input para poder importar el mismo fichero dos veces
}


// =============================================================================
// ARRANQUE
// =============================================================================
render();
