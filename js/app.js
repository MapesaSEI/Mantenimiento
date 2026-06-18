/* ══════════════════════════════════════════════════
   CATÁLOGO DE MÁQUINAS

   Para añadir un modelo nuevo:
     1. Copia la imagen en imagenes/
     2. Añade una entrada en el array 'modelos' de la marca correspondiente
        (o crea una marca nueva)

   Las coordenadas x/y de cada punto son PORCENTAJES relativos
   al ancho/alto de la propia foto (0-100), no del viewport.
   Esto hace que los puntos se mantengan en su sitio sea cual
   sea el tamaño de pantalla.

   Estructura de un modelo con puntos predefinidos:
   {
       id:      'id_unico',
       nombre:  'Nombre visible',
       imagen:  'imagenes/fichero.png',   // null si no hay foto
       puntos: [
           { id:'p1', nombre:'Nombre del punto', x: 50.0, y: 30.0 },
           ...
       ]
   }
══════════════════════════════════════════════════ */
const CATALOGO = [
    {
        id: 'smipack',
        nombre: 'SmiPack',
        modelos: [
            {
                id: 'bp600ar',
                nombre: 'BP600AR 150P',
                imagen: 'imagenes/BP600AR_150P.png',
                puntos: [
                    { id: 'p1',  nombre: 'Punto 1',  x: 95.02, y: 26.32 },
                    { id: 'p2',  nombre: 'Punto 2',  x: 48.58, y: 27.76 },
                    { id: 'p3',  nombre: 'Punto 3',  x: 39.30, y: 39.29 },
                    { id: 'p4',  nombre: 'Punto 4',  x: 69.92, y: 41.77 },
                    { id: 'p5',  nombre: 'Punto 5',  x: 30.91, y: 60.28 },
                    { id: 'p6',  nombre: 'Punto 6',  x: 23.97, y: 64.12 },
                    { id: 'p7',  nombre: 'Punto 7',  x: 40.31, y: 67.06 },
                    { id: 'p8',  nombre: 'Punto 8',  x: 71.57, y: 68.05 },
                    { id: 'p9',  nombre: 'Punto 9',  x: 77.01, y: 76.81 },
                    { id: 'p10', nombre: 'Punto 10', x: 59.76, y: 81.21 },
                ]
            },
            {
                id: 'otro_smi',
                nombre: 'Otro modelo',
                imagen: null,
                puntos: []
            }
        ]
    },
    {
        id: 'otramarca',
        nombre: 'Robotech',
        modelos: [
            { id: 'om_m1', 
            nombre: '3000 PGS', 
            imagen: 'imagenes/robotech-3000pgs', 
            puntos: [
                { id: 'p1',  nombre: 'Punto 1',  x: 50, y: 50 },
            ] },
            { id: 'om_m2', nombre: 'Modelo 2', imagen: null, puntos: [] }
        ]
    }
];

/* ══════════════════════════════════════════════════
   STORAGE
══════════════════════════════════════════════════ */
const DB = {
    getRecords()    { return JSON.parse(localStorage.getItem('mant_records') || '[]'); },
    saveRecords(v)  { localStorage.setItem('mant_records', JSON.stringify(v)); }
};

/* ══════════════════════════════════════════════════
   ESTADO
══════════════════════════════════════════════════ */
let nav = { nivel: 'marcas', marcaId: null, modeloId: null, serialActivo: null };
let session = null;        // revisión en curso
let popoverPuntoId = null; // punto con popover abierto

/* ══════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════ */
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
         + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.getElementById('toast-wrap').appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function getMarca(id)        { return CATALOGO.find(m => m.id === id); }
function getModelo(mid, oid) { const m = getMarca(mid); return m ? m.modelos.find(x => x.id === oid) : null; }

/* ══════════════════════════════════════════════════
   RENDER PRINCIPAL
══════════════════════════════════════════════════ */
function render() {
    const sidebar     = document.getElementById('sidebar');
    const machineArea = document.getElementById('machine-area');
    const photoWrap   = document.getElementById('photo-wrap');
    const img         = document.getElementById('machine-img');
    const actionBar   = document.getElementById('action-bar');
    const listaPuntos = document.getElementById('puntos-lista');

    // Limpiar estado visual previo
    photoWrap.querySelectorAll('.oknok').forEach(e => e.remove());
    photoWrap.style.display = 'none';
    img.src = '';
    listaPuntos.classList.remove('has-points');
    listaPuntos.innerHTML = '';
    actionBar.classList.remove('open');

    if      (nav.nivel === 'marcas')  renderMarcas(sidebar);
    else if (nav.nivel === 'modelos') renderModelos(sidebar);
    else if (nav.nivel === 'series')  {
        renderSeries(sidebar);
        const modelo = getModelo(nav.marcaId, nav.modeloId);

        if (modelo && modelo.imagen) {
            img.src = modelo.imagen;
            photoWrap.style.display = 'inline-block';
        }

        if (session && nav.serialActivo) {
            if (window.innerWidth > 480) {
                renderPuntosSobreImagen(photoWrap, modelo);
            }
            renderPuntosLista(listaPuntos, modelo);
            listaPuntos.classList.add('has-points');
            actionBar.classList.add('open');
        }
    }
}

/* ── Nivel 1: Marcas ── */
function renderMarcas(sb) {
    sb.innerHTML = '';
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

/* ── Nivel 2: Modelos ── */
function renderModelos(sb) {
    const marca = getMarca(nav.marcaId);
    sb.innerHTML = '';
    const h = document.createElement('div');
    h.style.cssText = 'display:flex;width:100%';
    h.innerHTML = `<button class="back" onclick="goBack()"><i class="fa-solid fa-chevron-left"></i>Volver</button>
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

/* ── Nivel 3: Series ── */
function renderSeries(sb) {
    const modelo = getModelo(nav.marcaId, nav.modeloId);
    sb.innerHTML = '';

    const h = document.createElement('div');
    h.style.cssText = 'display:flex;width:100%';
    h.innerHTML = `<button class="back" onclick="goBack()"><i class="fa-solid fa-chevron-left"></i>Volver</button>
                   <div class="title">${esc(modelo.nombre)}</div>`;
    sb.appendChild(h);

    const iw = document.createElement('div');
    iw.className = 'serial-input-wrap';
    iw.innerHTML = `
        <label>Número de serie</label>
        <div class="serial-input-row">
            <input type="text" id="serial-input" placeholder="SN-0000"
                   value="${nav.serialActivo || ''}" autocomplete="off"
                   onkeydown="if(event.key==='Enter') iniciarRevision()">
            <button onclick="iniciarRevision()">Iniciar</button>
        </div>`;
    sb.appendChild(iw);

    const records  = DB.getRecords().filter(r => r.marcaId === nav.marcaId && r.modeloId === nav.modeloId);
    const seriales = [...new Set(records.map(r => r.serial))];

    if (seriales.length) {
        const hs = document.createElement('div');
        hs.className = 'historial-section';
        hs.innerHTML = '<div class="historial-label">Historial por serie</div>';

        seriales.forEach(sn => {
            const snRecs = records.filter(r => r.serial === sn);
            const ultimo = snRecs[0];
            const oks    = ultimo.puntos.filter(p => p.status === 'ok').length;
            const nooks  = ultimo.puntos.filter(p => p.status === 'nook').length;
            const pend   = ultimo.puntos.length - oks - nooks;

            const btn = document.createElement('button');
            btn.className = 'hist-item' + (nav.serialActivo === sn ? ' active-sn' : '');
            btn.innerHTML = `
                <span style="flex:1;font-weight:500">${esc(sn)}</span>
                <div class="hist-badges">
                    ${oks   > 0 ? `<span class="hb hb-ok">${oks}&nbsp;OK</span>`    : ''}
                    ${nooks > 0 ? `<span class="hb hb-nook">${nooks}&nbsp;NOK</span>` : ''}
                    ${pend  > 0 ? `<span class="hb hb-pend">${pend}&nbsp;&mdash;</span>` : ''}
                </div>
                <span class="hist-date">${formatDate(ultimo.date).split(' ')[0]}</span>`;
            btn.onclick = () => verHistorialSerie(sn, snRecs);
            hs.appendChild(btn);
        });
        sb.appendChild(hs);
    }
}

/* ══════════════════════════════════════════════════
   NAVEGACIÓN
══════════════════════════════════════════════════ */
function goBack() {
    closePuntoPopover();
    if (session && !confirm('¿Salir sin guardar la revisión en curso?')) return;
    session = null;
    if      (nav.nivel === 'modelos') nav = { nivel: 'marcas',  marcaId: null,       modeloId: null, serialActivo: null };
    else if (nav.nivel === 'series')  nav = { nivel: 'modelos', marcaId: nav.marcaId, modeloId: null, serialActivo: null };
    render();
}

/* ══════════════════════════════════════════════════
   SESIÓN DE REVISIÓN
══════════════════════════════════════════════════ */
function iniciarRevision() {
    const input  = document.getElementById('serial-input');
    const serial = input ? input.value.trim() : '';
    if (!serial) { toast('Introduce un número de serie'); return; }
    if (session && !confirm('Hay una revisión en curso. ¿Iniciar nueva?')) return;

    const modelo = getModelo(nav.marcaId, nav.modeloId);
    if (!modelo.puntos.length) {
        toast('Este modelo aún no tiene puntos de revisión configurados');
        return;
    }

    nav.serialActivo = serial;
    session = {
        marcaId:  nav.marcaId,
        modeloId: nav.modeloId,
        serial,
        puntos: modelo.puntos.map(p => ({ id: p.id, nombre: p.nombre, status: null, obs: '' }))
    };
    closePuntoPopover();
    render();
    toast('Revisión iniciada — pulsa los puntos');
}

function cancelarRevision() {
    if (!confirm('¿Cancelar la revisión sin guardar?')) return;
    session = null;
    nav.serialActivo = null;
    closePuntoPopover();
    render();
}

function guardarRevision() {
    if (!session) return;
    const records = DB.getRecords();
    records.unshift({
        id:       uid(),
        marcaId:  session.marcaId,
        modeloId: session.modeloId,
        serial:   session.serial,
        date:     new Date().toISOString(),
        puntos:   session.puntos.map(p => ({ id: p.id, nombre: p.nombre, status: p.status, obs: p.obs }))
    });
    DB.saveRecords(records);
    toast('Revisión guardada ✓');
    exportData();
    session = null;
    closePuntoPopover();
    render();
}

/* ══════════════════════════════════════════════════
   PINS SOBRE LA IMAGEN (escritorio / tablet)
══════════════════════════════════════════════════ */
function renderPuntosSobreImagen(photoWrap, modelo) {
    if (!modelo || !modelo.puntos.length || !session) return;

    modelo.puntos.forEach((pDef, i) => {
        const pSess = session.puntos.find(x => x.id === pDef.id);

        const label = document.createElement('div');
        label.className = 'oknok ' + statusClass(pSess ? pSess.status : null);
        label.textContent = statusLabel(pSess ? pSess.status : null);
        label.dataset.pid = pDef.id;
        label.style.left = pDef.x + '%';
        label.style.top  = pDef.y + '%';
        label.addEventListener('click', e => { e.stopPropagation(); openPuntoPopover(pDef.id, label); });

        photoWrap.appendChild(label);
    });
}

/* ══════════════════════════════════════════════════
   LISTA DE PUNTOS (móvil) — alternativa a los pins
══════════════════════════════════════════════════ */
function renderPuntosLista(container, modelo) {
    if (!modelo || !modelo.puntos.length || !session) return;

    container.innerHTML = modelo.puntos.map((pDef, i) => {
        const pSess = session.puntos.find(x => x.id === pDef.id);
        const status = pSess ? pSess.status : null;
        return `
            <div class="puntos-lista-item" data-pid="${pDef.id}" onclick="openPuntoPopoverLista('${pDef.id}', this)">
                <div class="puntos-lista-num">${i + 1}</div>
                <div class="puntos-lista-name">${esc(pDef.nombre)}</div>
                <div class="puntos-lista-badge ${statusClass(status)}">${statusLabel(status)}</div>
            </div>`;
    }).join('');
}

function statusClass(s) { return s === 'ok' ? 'state-ok' : s === 'nook' ? 'state-nook' : 'state-none'; }
function statusLabel(s) { return s === 'ok' ? 'OK' : s === 'nook' ? 'NOOK' : 'OK'; }

/* ══════════════════════════════════════════════════
   POPOVER DE PUNTO
══════════════════════════════════════════════════ */
function openPuntoPopover(pid, anchorEl) {
    if (!session) return;
    popoverPuntoId = pid;
    const p   = session.puntos.find(x => x.id === pid);
    const pop = document.getElementById('punto-popover');

    document.getElementById('pp-name').value = p.nombre;
    document.getElementById('pp-obs').value  = p.obs || '';
    document.getElementById('pp-ok').classList.toggle('active',   p.status === 'ok');
    document.getElementById('pp-nook').classList.toggle('active', p.status === 'nook');

    pop.classList.add('open');
    const rect = anchorEl.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = rect.right + 10;
    let top  = rect.top;
    if (left + pw > window.innerWidth  - 10) left = rect.left - pw - 10;
    if (left < 10) left = 10;
    if (top  + ph > window.innerHeight - 10) top  = window.innerHeight - ph - 10;
    if (top < 10) top = 10;
    pop.style.left = left + 'px';
    pop.style.top  = top  + 'px';

    setTimeout(() => document.getElementById('pp-obs').focus(), 50);
}

// Versión usada desde la lista móvil: ancla el popover centrado bajo el elemento de lista
function openPuntoPopoverLista(pid, itemEl) {
    openPuntoPopover(pid, itemEl);
}

function closePuntoPopover() {
    popoverPuntoId = null;
    document.getElementById('punto-popover').classList.remove('open');
}

function popSetStatus(status) {
    if (!popoverPuntoId || !session) return;
    const p = session.puntos.find(x => x.id === popoverPuntoId);
    p.status = (p.status === status) ? null : status;
    document.getElementById('pp-ok').classList.toggle('active',   p.status === 'ok');
    document.getElementById('pp-nook').classList.toggle('active', p.status === 'nook');

    // Actualizar pin sobre la foto (si existe)
    const pin = document.querySelector(`.oknok[data-pid="${p.id}"]`);
    if (pin) {
        pin.className   = 'oknok ' + statusClass(p.status);
        pin.textContent = statusLabel(p.status);
    }
    // Actualizar badge en la lista móvil (si existe)
    const item = document.querySelector(`.puntos-lista-item[data-pid="${p.id}"] .puntos-lista-badge`);
    if (item) {
        item.className   = 'puntos-lista-badge ' + statusClass(p.status);
        item.textContent = statusLabel(p.status);
    }
}

function popSetObs(val) {
    if (!popoverPuntoId || !session) return;
    const p = session.puntos.find(x => x.id === popoverPuntoId);
    if (p) p.obs = val;
}

function popSetNombre(val) {
    if (!popoverPuntoId || !session) return;
    const pSess = session.puntos.find(x => x.id === popoverPuntoId);
    if (pSess) pSess.nombre = val;

    const modelo = getModelo(session.marcaId, session.modeloId);
    if (modelo) {
        const pCat = modelo.puntos.find(x => x.id === popoverPuntoId);
        if (pCat) pCat.nombre = val;
    }
    // Reflejar también en la lista móvil
    const nameEl = document.querySelector(`.puntos-lista-item[data-pid="${popoverPuntoId}"] .puntos-lista-name`);
    if (nameEl) nameEl.textContent = val;
}

// Cerrar popover al hacer clic fuera
document.addEventListener('click', e => {
    const pop = document.getElementById('punto-popover');
    if (pop.classList.contains('open')
        && !pop.contains(e.target)
        && !e.target.closest('.oknok')
        && !e.target.closest('.puntos-lista-item')) {
        closePuntoPopover();
    }
});

// Reposicionar/cerrar popover si cambia el tamaño de ventana (rotación de móvil, etc.)
let _ultimoAnchoEsMovil = window.innerWidth <= 480;
window.addEventListener('resize', () => {
    if (popoverPuntoId) closePuntoPopover();

    const esMovilAhora = window.innerWidth <= 480;
    if (esMovilAhora !== _ultimoAnchoEsMovil) {
        _ultimoAnchoEsMovil = esMovilAhora;
        if (session) render(); // re-renderizar para alternar entre pins y lista
    }
});

/* ══════════════════════════════════════════════════
   HISTORIAL — MODAL DE DETALLE
══════════════════════════════════════════════════ */
function verHistorialSerie(serial, records) {
    const modelo = getModelo(nav.marcaId, nav.modeloId);
    document.getElementById('modal-title').textContent = `${modelo.nombre} — ${serial}`;
    document.getElementById('modal-points').innerHTML = records.map(r => {
        const oks   = r.puntos.filter(p => p.status === 'ok').length;
        const nooks = r.puntos.filter(p => p.status === 'nook').length;
        const pend  = r.puntos.length - oks - nooks;
        return `
            <div style="margin-bottom:14px;">
                <div style="font-size:12px;color:rgb(130,130,130);margin-bottom:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <strong>${formatDate(r.date)}</strong>
                    ${oks   > 0 ? `<span class="hb hb-ok">${oks} OK</span>`    : ''}
                    ${nooks > 0 ? `<span class="hb hb-nook">${nooks} NOK</span>` : ''}
                    ${pend  > 0 ? `<span class="hb hb-pend">${pend} —</span>`   : ''}
                </div>
                ${r.puntos.map(p => `
                    <div class="modal-point-row">
                        <span class="modal-point-name">${esc(p.nombre)}</span>
                        <span class="modal-point-obs">${p.obs ? esc(p.obs) : ''}</span>
                        <span class="hb ${p.status==='ok'?'hb-ok':p.status==='nook'?'hb-nook':'hb-pend'}">
                            ${p.status ? p.status.toUpperCase() : '—'}
                        </span>
                    </div>`).join('')}
            </div>`;
    }).join('<hr style="border:none;border-top:1px solid #eee;margin:10px 0">');

    document.getElementById('modal-backdrop').classList.add('open');
}

function closeModal() {
    document.getElementById('modal-backdrop').classList.remove('open');
}

/* ══════════════════════════════════════════════════
   EXPORTAR / IMPORTAR
══════════════════════════════════════════════════ */
function exportData() {
    const data = {
        version:  3,
        exported: new Date().toISOString(),
        records:  DB.getRecords()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mantenimiento_${new Date().toISOString().slice(0, 10)}.json`;
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
            if (!data.records) throw new Error();
            const existing = DB.getRecords();
            const newRecs  = data.records.filter(r => !existing.find(x => x.id === r.id));
            DB.saveRecords([...newRecs, ...existing]);
            render();
            toast(`Importado: +${newRecs.length} registros`);
        } catch (err) {
            toast('Error: fichero no válido');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */
render();
