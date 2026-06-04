'use strict';

// ===== STATE =====
const APP = {
  incidentId: '',
  persons: [],
  tests: [],
  measurements: [],
  location: { lat: null, lng: null, address: '' },
  gpsWatchId: null,
  leafletMap: null,
  leafletMarker: null,
  leafletAccCircle: null,
  leafletTileLayer: null,
  currentPersonEdit: null,
  currentTestEdit: null,
};

const CANVAS = {
  el: null, ctx: null, width: 0, height: 0,
  objects: [], selected: null,
  tool: 'select', spawnItem: null,
  drawing: false, startX: 0, startY: 0,
  drawColor: '#e74c3c', drawWidth: 3,
  gridVisible: true, bgType: 'asphalt',
  zoom: 1, panX: 0, panY: 0,
  panning: false, panStart: { x: 0, y: 0 },
  history: [], historyIdx: -1,
  tempLine: null,
  draggingHandle: null, handleStart: null,
  rotateMode: false,      // true = modul rotire activ
  longPressTimer: null,   // timer pt long press
  rightDragStart: null,   // pt rotire cu click-dreapta drag
  // Staged: snapshot obiect înainte de editare live
  // Modificările live sunt TEMPORARE până la "Aplică"
  stagedOriginal: null,  // snapshot original înainte de drag/rotate/scale
  editMode: false,       // true = obiect în editare (nu s-a dat Aplică)
  // Rotire cu 2 degete pe obiect
  rotateTouchStart: null,
};

const ITEM_MAP = {
  car:             { emoji: '🚗', label: 'Autoturism', w: 36, h: 16, color: '#e74c3c' },
  truck:           { emoji: '🚛', label: 'Camion',     w: 72, h: 22, color: '#3498db' },
  moto:            { emoji: '🏍️', label: 'Moto',       w: 22, h: 10, color: '#e67e22' },
  tram:            { emoji: '🚋', label: 'Tramvai',    w: 144,h: 22, color: '#1abc9c' },
  bus:             { emoji: '🚌', label: 'Autobuz',    w: 96, h: 22, color: '#f39c12' },
  bike:            { emoji: '🚲', label: 'Bicicletă',  w: 18, h:  8, color: '#27ae60' },
  van:             { emoji: '🚐', label: 'Microbuz',   w: 48, h: 18, color: '#9b59b6' },
  ambulance:       { emoji: '🚑', label: 'Ambulanță',  w: 48, h: 18, color: '#ecf0f1' },
  pedestrian:      { emoji: '🚶', label: 'Pieton',     w:  5, h:  8, color: '#3498db' },
  animal:          { emoji: '🐄', label: 'Animal',     w: 16, h: 10, color: '#8B6914' },
  'sign-stop':     { emoji: '🛑', label: 'STOP', w: 28, h: 28 },
  'sign-priority': { emoji: '🔶', label: 'Prioritate', w: 28, h: 28 },
  'sign-yield':    { emoji: '⚠️', label: 'Cedează', w: 28, h: 28 },
  'sign-semaphore':{ emoji: '🚦', label: 'Semafor', w: 22, h: 48 },
  'sign-crossing': { emoji: '🚸', label: 'Trecere pietoni', w: 28, h: 28 },
  'sign-noentry':  { emoji: '⛔', label: 'Intrare interzisă', w: 28, h: 28 },
  'sign-speed-50': { emoji: '🔵', label: '50 km/h', w: 28, h: 28 },
  'sign-oneway':   { emoji: '➡️', label: 'Sens unic', w: 40, h: 22 },
  'impact-mark':   { emoji: '💥', label: 'Punct impact', w: 32, h: 32 },
  'skid-mark':     { emoji: '〰️', label: 'Urmă frânare', w: 60, h: 12 },
  'debris':        { emoji: '💢', label: 'Resturi', w: 24, h: 24 },
  'north-arrow':   { emoji: '🧭', label: 'Nord', w: 28, h: 28 },
  'cone':          { emoji: '🔺', label: 'Con trafic', w: 20, h: 24 },
};

// ===== TILE LAYERS pentru Leaflet =====
const TILE_LAYERS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
  },
  sat: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: '© Esri, Maxar, GeoEye, Earthstar Geographics'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attr: '© <a href="https://carto.com">CARTO</a>'
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attr: '© <a href="https://opentopomap.org">OpenTopoMap</a>'
  },
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initSplash();
  initHeader();
  initTabs();
  initCanvas();
  initToolbar();
  initProps();
  initMeasurements();
  initMapTab();
  initPersonsTab();
  initTestsTab();
  initModals();
  initPDFExport();
  loadFromStorage();
  setInterval(updateTime, 1000);
});

// ===== SPLASH =====
function initSplash() {
  setTimeout(() => document.getElementById('splash').classList.add('hidden'), 2200);
}

// ===== HEADER =====
function initHeader() {
  APP.incidentId = generateId();
  document.getElementById('incident-id-display').textContent = APP.incidentId;
  updateTime();
  document.getElementById('btn-new').addEventListener('click', () => {
    showConfirm('Creați un dosar nou? Datele nesalvate se vor pierde.', resetAll);
  });
}

function updateTime() {
  const now = new Date();
  document.getElementById('incident-time').textContent =
    `${now.toTimeString().slice(0,5)} | ${now.toLocaleDateString('ro-RO')}`;
}

function generateId() {
  const n = new Date();
  return `ACC-${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(Math.floor(Math.random()*9000)+1000)}`;
}

// ===== TABS =====
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
      if (tab === 'sketch') setTimeout(resizeCanvas, 50);
      if (tab === 'map') setTimeout(() => { if (APP.leafletMap) APP.leafletMap.invalidateSize(); }, 100);
    });
  });
}

// ===== CANVAS =====
function initCanvas() {
  CANVAS.el = document.getElementById('sketch-canvas');
  CANVAS.ctx = CANVAS.el.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  CANVAS.el.addEventListener('mousedown', onPointerDown);
  CANVAS.el.addEventListener('mousemove', onPointerMove);
  CANVAS.el.addEventListener('mouseup', onPointerUp);
  CANVAS.el.addEventListener('wheel', onWheel, { passive: false });
  CANVAS.el.addEventListener('mouseleave', () => { CANVAS.panning = false; });
  CANVAS.el.addEventListener('dblclick', onDblClick);
  CANVAS.el.addEventListener('contextmenu', e => e.preventDefault());
  CANVAS.el.addEventListener('mousemove', e => {
    const { wx, wy } = s2w(e.offsetX, e.offsetY);
    document.getElementById('canvas-cursor-pos').textContent = `X:${Math.round(wx)} Y:${Math.round(wy)}`;
  });
  CANVAS.el.addEventListener('touchstart', onTouchStart, { passive: false });
  CANVAS.el.addEventListener('touchmove', onTouchMove, { passive: false });
  CANVAS.el.addEventListener('touchend', onTouchEnd, { passive: false });

  saveHistory();
  drawCanvas();
}

function resizeCanvas() {
  const cont = document.getElementById('canvas-container');
  const r = cont.getBoundingClientRect();
  CANVAS.el.width = CANVAS.width = r.width;
  CANVAS.el.height = CANVAS.height = r.height;
  drawCanvas();
}

function w2s(wx, wy) { return { sx: wx * CANVAS.zoom + CANVAS.panX, sy: wy * CANVAS.zoom + CANVAS.panY }; }
function s2w(sx, sy) { return { wx: (sx - CANVAS.panX) / CANVAS.zoom, wy: (sy - CANVAS.panY) / CANVAS.zoom }; }

// ===== POINTER EVENTS =====
let _lastTouches = [];

function onTouchStart(e) {
  e.preventDefault();
  _lastTouches = Array.from(e.touches);
  if (e.touches.length === 1) {
    const t = e.touches[0], r = CANVAS.el.getBoundingClientRect();
    const ox = t.clientX - r.left, oy = t.clientY - r.top;
    // Pe tabletă/telefon: 1 deget în modul select
    // Dacă e un obiect sub deget → selectare/drag
    // Dacă e fundal liber → PAN
    if (CANVAS.tool === 'select') {
      const { wx, wy } = s2w(ox, oy);
      const hit = hitTest(wx, wy);
      const isOsmBg = hit && (hit.type==='road_poly'||hit.type==='roundabout'||hit.type==='building_poly');
      if (!hit || isOsmBg) {
        // Fundal → PAN
        CANVAS.panning = true;
        CANVAS.panStart = { x: ox - CANVAS.panX, y: oy - CANVAS.panY };
      } else {
        // Obiect → selectare/drag
        onPointerDown({ offsetX: ox, offsetY: oy, button: 0, ctrlKey: false });
      }
    } else {
      onPointerDown({ offsetX: ox, offsetY: oy, button: 0, ctrlKey: false });
    }
  }
}
function onTouchMove(e) {
  e.preventDefault();
  if (e.touches.length === 2) {
    const [t1, t2] = e.touches;
    const rect = CANVAS.el.getBoundingClientRect();
    const d = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const midX = (t1.clientX + t2.clientX)/2 - rect.left;
    const midY = (t1.clientY + t2.clientY)/2 - rect.top;
    // Dacă e un obiect selectat și centrul gestului e aproape de el → ROTIRE cu 2 degete
    if (CANVAS.selected && _lastTouches.length >= 2 && CANVAS.tool === 'select') {
      const { wx: midWx, wy: midWy } = s2w(midX, midY);
      const sel = CANVAS.selected;
      const selCx = sel._cx || (sel.x + (sel.w*(sel.scale||1))/2);
      const selCy = sel._cy || (sel.y + (sel.h*(sel.scale||1))/2);
      if (Math.hypot(midWx - selCx, midWy - selCy) < Math.max(sel.w, sel.h) * (sel.scale||1)) {
        // 2 degete pe obiect → rotire
        const prevAngle = Math.atan2(_lastTouches[0].clientY - _lastTouches[1].clientY,
                                      _lastTouches[0].clientX - _lastTouches[1].clientX);
        const currAngle = Math.atan2(t1.clientY - t2.clientY, t1.clientX - t2.clientX);
        const dAngle = (currAngle - prevAngle) * 180 / Math.PI;
        sel.rotation = (((sel.rotation||0) + dAngle) % 360 + 360) % 360;
        CANVAS.editMode = true;
        syncPropsToObject(sel);
        showEditingIndicator();
        _lastTouches = Array.from(e.touches);
        drawCanvas(); return;
      }
    }
    if (_lastTouches.length >= 2) {
      const ld = Math.hypot(_lastTouches[0].clientX - _lastTouches[1].clientX, _lastTouches[0].clientY - _lastTouches[1].clientY);
      zoomAt(midX, midY, d / ld);
    }
    _lastTouches = Array.from(e.touches); return;
  }
  if (e.touches.length === 1) {
    const t = e.touches[0], r = CANVAS.el.getBoundingClientRect();
    const ox = t.clientX - r.left, oy = t.clientY - r.top;
    if (CANVAS.panning) {
      CANVAS.panX = ox - CANVAS.panStart.x;
      CANVAS.panY = oy - CANVAS.panStart.y;
      drawCanvas();
    } else if (CANVAS.draggingHandle || CANVAS.selected?._drag) {
      onPointerMove({ offsetX: ox, offsetY: oy });
    } else if (CANVAS.tool !== 'select') {
      onPointerMove({ offsetX: ox, offsetY: oy });
    }
    // În select mode fără obiect activ → ignore (a fost inițiat ca pan)
  }
}
function onTouchEnd(e) { 
  e.preventDefault(); 
  if (CANVAS.panning) { CANVAS.panning = false; return; }
  onPointerUp({ offsetX: 0, offsetY: 0 }); 
}

function onPointerDown(e) {
  const { wx, wy } = s2w(e.offsetX, e.offsetY);
  // CLICK DREAPTA pe obiect = intră în rotire cu drag
  if (e.button === 2) {
    const hit = hitTest(wx, wy);
    if (hit && hit.type !== 'road_poly' && hit.type !== 'roundabout' && hit.type !== 'building_poly') {
      e.preventDefault();
      if (!CANVAS.selected || CANVAS.selected !== hit) {
        CANVAS.selected = hit;
        CANVAS.stagedOriginal = JSON.stringify({x:hit.x,y:hit.y,rotation:hit.rotation||0,scale:hit.scale||1,label:hit.label||'',note:hit.note||''});
        showPropsFor(hit); showQuickControls(hit);
      }
      const cx = hit.x + hit.w*(hit.scale||1)/2;
      const cy = hit.y + hit.h*(hit.scale||1)/2;
      hit._cx = cx; hit._cy = cy;
      CANVAS.draggingHandle = 'rotate';
      CANVAS.handleStart = { cx, cy, startRot: hit.rotation||0 };
      CANVAS.drawing = true;
      CANVAS.el.style.cursor = 'grabbing';
      return;
    }
  }
  if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
    CANVAS.panning = true;
    CANVAS.panStart = { x: e.offsetX - CANVAS.panX, y: e.offsetY - CANVAS.panY }; return;
  }
  if (CANVAS.tool === 'select') {
    const sel = CANVAS.selected;
    // Check handle-uri pe obiectul deja selectat
    if (sel && sel._hRot && sel._hSc) {
      const hRotPos = sel._hRot, hScPos = sel._hSc;
      const hitR = 20/CANVAS.zoom;  // rază hit generoasă
      if (Math.hypot(wx-hRotPos.x, wy-hRotPos.y) < hitR) {
        // Drag handle ROTIRE
        CANVAS.draggingHandle = 'rotate';
        CANVAS.handleStart = { cx: sel._cx, cy: sel._cy, startRot: sel.rotation||0 };
        CANVAS.drawing = true;
        CANVAS.el.style.cursor = 'grab';
        return;
      }
      if (Math.hypot(wx-hScPos.x, wy-hScPos.y) < hitR) {
        // Drag handle SCALE
        CANVAS.draggingHandle = 'scale';
        const startDist = Math.hypot(wx-sel._cx, wy-sel._cy)||1;
        CANVAS.handleStart = { scale: sel.scale||1, dist: startDist };
        CANVAS.drawing = true;
        CANVAS.el.style.cursor = 'nwse-resize';
        return;
      }
    }
    CANVAS.draggingHandle = null;
    const hit = hitTest(wx, wy);
    if (hit && hit.type !== 'road_poly' && hit.type !== 'roundabout' && hit.type !== 'building_poly') {
      // Dacă era alt obiect selectat cu modificări nesalvate → revert
      if (CANVAS.selected && CANVAS.selected !== hit && CANVAS.editMode && CANVAS.stagedOriginal) {
        revertStagedChanges();
      }
      CANVAS.selected = hit;
      // Snapshot original pt revert
      CANVAS.stagedOriginal = JSON.stringify({x:hit.x,y:hit.y,rotation:hit.rotation||0,scale:hit.scale||1,label:hit.label||'',note:hit.note||''});
      CANVAS.editMode = false;
      hit._dox = wx - hit.x; hit._doy = wy - hit.y; hit._drag = true;
      showPropsFor(hit);
      showQuickControls(hit);
      openMobilePanel(hit);
    } else if (hit && (hit.type === 'road_poly' || hit.type === 'roundabout' || hit.type === 'building_poly')) {
      if (CANVAS.editMode && CANVAS.stagedOriginal) revertStagedChanges();
      CANVAS.selected = null; clearProps(); closeMobilePanel(); hideQuickControls();
    } else {
      if (CANVAS.editMode && CANVAS.stagedOriginal) revertStagedChanges();
      CANVAS.selected = null; clearProps(); closeMobilePanel(); hideQuickControls();
    }
    CANVAS.drawing = true; drawCanvas(); return;
  }
  if (CANVAS.tool === 'spawn') {
    const def = ITEM_MAP[CANVAS.spawnItem]; if (!def) return;
    const obj = {
      id: uid(), type: CANVAS.spawnItem,
      x: wx - def.w / 2, y: wy - def.h / 2,
      w: def.w, h: def.h, rotation: 0, scale: 1,
      label: '', color: def.color || '#e74c3c', note: '', personLink: '',
      emoji: def.emoji, name: def.label,
      _preview: true,  // marcat ca preview — NU salvat încă
    };
    // Șterge preview anterior dacă există
    CANVAS.objects = CANVAS.objects.filter(o => !o._preview);
    CANVAS.objects.push(obj);
    CANVAS.selected = obj;
    CANVAS.editMode = true;
    CANVAS.stagedOriginal = null; // e nou, nu are original
    showPropsFor(obj);
    openMobilePanel(obj);
    showEditingIndicator();
    // NU saveHistory — doar la Aplică
    drawCanvas(); return;
  }
  if (CANVAS.tool === 'rotate') {
    const hit = hitTest(wx, wy);
    if (hit && hit.type !== 'road_poly' && hit.type !== 'roundabout' && hit.type !== 'building_poly') {
      if (CANVAS.selected !== hit) {
        CANVAS.selected = hit;
        CANVAS.stagedOriginal = JSON.stringify({x:hit.x,y:hit.y,rotation:hit.rotation||0,scale:hit.scale||1,label:hit.label||'',note:hit.note||''});
        showPropsFor(hit); showQuickControls(hit);
      }
      CANVAS.editMode = false;
      CANVAS.draggingHandle = 'rotate';
      const cx = hit.x + hit.w*(hit.scale||1)/2;
      const cy = hit.y + hit.h*(hit.scale||1)/2;
      CANVAS.handleStart = { cx, cy, startRot: hit.rotation||0, startAngle: Math.atan2(wy-cy, wx-cx) };
      hit._cx = cx; hit._cy = cy;
      CANVAS.drawing = true;
      CANVAS.el.style.cursor = 'grabbing';
      drawCanvas();
    }
    return;
  }
  if (CANVAS.tool === 'eraser') {
    const hit = hitTest(wx, wy);
    if (hit) {
      CANVAS.objects = CANVAS.objects.filter(o => o !== hit);
      if (CANVAS.selected === hit) { CANVAS.selected = null; clearProps(); }
      saveHistory(); drawCanvas();
    } return;
  }
  if (CANVAS.tool === 'line') {
    CANVAS.drawing = true; CANVAS.startX = wx; CANVAS.startY = wy;
    CANVAS.tempLine = { x1: wx, y1: wy, x2: wx, y2: wy }; return;
  }
  if (CANVAS.tool === 'text') { showLabelEditor(e.offsetX, e.offsetY, wx, wy); return; }
}

function onPointerMove(e) {
  const { wx, wy } = s2w(e.offsetX, e.offsetY);
  if (CANVAS.panning) { CANVAS.panX = e.offsetX - CANVAS.panStart.x; CANVAS.panY = e.offsetY - CANVAS.panStart.y; drawCanvas(); return; }
  // Handle ROTIRE — delta față de unghiul de start pentru rotire relativă
  if (CANVAS.draggingHandle === 'rotate' && CANVAS.selected) {
    const { cx, cy, startRot, startAngle } = CANVAS.handleStart;
    const curAngle = Math.atan2(wy - cy, wx - cx);
    let delta;
    if (startAngle !== undefined) {
      // Rotire relativă (drag circular) — mai intuitivă
      delta = (curAngle - startAngle) * 180 / Math.PI;
      CANVAS.selected.rotation = ((startRot + delta) % 360 + 360) % 360;
    } else {
      // Rotire absolută (handle portocaliu)
      const angle = Math.atan2(wx - cx, -(wy - cy)) * 180 / Math.PI;
      CANVAS.selected.rotation = ((angle % 360) + 360) % 360;
    }
    CANVAS.editMode = true;
    syncPropsToObject(CANVAS.selected);
    showEditingIndicator();
    drawCanvas(); return;
  }
  // Handle SCALE (mouse/touch drag pe handle verde)
  if (CANVAS.draggingHandle === 'scale' && CANVAS.selected) {
    const { scale: startScale, dist: startDist } = CANVAS.handleStart;
    const cx = CANVAS.selected._cx||CANVAS.selected.x, cy = CANVAS.selected._cy||CANVAS.selected.y;
    const newDist = Math.hypot(wx-cx, wy-cy)||1;
    const ns = Math.max(0.2, Math.min(5, startScale * newDist / startDist));
    CANVAS.selected.scale = ns;
    CANVAS.editMode = true;
    syncPropsToObject(CANVAS.selected);
    showEditingIndicator();
    drawCanvas(); return;
  }
  if (CANVAS.tool === 'select' && CANVAS.drawing && CANVAS.selected?._drag) {
    CANVAS.selected.x = wx - CANVAS.selected._dox; CANVAS.selected.y = wy - CANVAS.selected._doy; drawCanvas(); return;
  }
  if (CANVAS.drawing && CANVAS.tool === 'line') {
    CANVAS.tempLine = { x1: CANVAS.startX, y1: CANVAS.startY, x2: wx, y2: wy }; drawCanvas(); return;
  }
  // Cursor hover pe handle-uri
  if (!CANVAS.drawing && CANVAS.tool === 'select' && CANVAS.selected?._hRot) {
    const sel = CANVAS.selected;
    const hitR = 14/CANVAS.zoom;
    if (Math.hypot(wx-sel._hRot.x, wy-sel._hRot.y) < hitR) {
      CANVAS.el.style.cursor = 'grab'; return;
    }
    if (Math.hypot(wx-sel._hSc.x, wy-sel._hSc.y) < hitR) {
      CANVAS.el.style.cursor = 'nwse-resize'; return;
    }
  }
  if (CANVAS.tool === 'select') CANVAS.el.style.cursor = 'default';
  if (CANVAS.tool === 'rotate') CANVAS.el.style.cursor = 'crosshair';
}

function onPointerUp(e) {
  if (CANVAS.panning) { CANVAS.panning = false; return; }
  if (CANVAS.draggingHandle) {
    CANVAS.draggingHandle = null; CANVAS.drawing = false;
    CANVAS.editMode = true;
    CANVAS.el.style.cursor = 'default';
    // NU saveHistory — doar la Aplică
    return;
  }
  if (CANVAS.tool === 'select' && CANVAS.selected?._drag) {
    CANVAS.selected._drag = false; CANVAS.drawing = false;
    CANVAS.editMode = true; // mutat, așteaptă Aplică
    // NU saveHistory
    return;
  }
  if (CANVAS.tool === 'line' && CANVAS.drawing) {
    if (CANVAS.tempLine) {
      const t = CANVAS.tempLine;
      const dx = t.x2 - t.x1, dy = t.y2 - t.y1;
      const len = Math.round(Math.sqrt(dx*dx + dy*dy));
      if (len > 5) {
        const pxLen = Math.sqrt((t.x2-t.x1)**2+(t.y2-t.y1)**2);
        const mLabel = OSM.scale > 0 ? `${(pxLen/OSM.scale).toFixed(1)}m` : `${len}px`;
        CANVAS.objects.push({
          id: uid(), type: 'line',
          x: t.x1, y: t.y1, x2: t.x2, y2: t.y2,
          color: CANVAS.drawColor, lineWidth: CANVAS.drawWidth,
          label: mLabel, name: 'Măsurătoare',
        });
        saveHistory();
      }
      CANVAS.tempLine = null;
    }
    CANVAS.drawing = false; drawCanvas(); return;
  }
  CANVAS.drawing = false;
}

function onDblClick(e) {
  const { wx, wy } = s2w(e.offsetX, e.offsetY);
  const hit = hitTest(wx, wy);
  if (hit && hit.type !== 'line') showLabelEditorForObj(hit, e.offsetX, e.offsetY);
}

function onWheel(e) {
  e.preventDefault();
  zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.1 : 0.9);
}

function zoomAt(sx, sy, f) {
  const nz = Math.min(5, Math.max(0.15, CANVAS.zoom * f));
  CANVAS.panX = sx - (sx - CANVAS.panX) * (nz / CANVAS.zoom);
  CANVAS.panY = sy - (sy - CANVAS.panY) * (nz / CANVAS.zoom);
  CANVAS.zoom = nz;
  document.getElementById('canvas-zoom-display').textContent = `${Math.round(nz * 100)}%`;
  drawCanvas();
}

// ===== HIT TEST =====
function hitTest(wx, wy) {
  for (let i = CANVAS.objects.length - 1; i >= 0; i--) {
    const o = CANVAS.objects[i];
    if (o.type === 'line') {
      if (ptSegDist(wx, wy, o.x, o.y, o.x2, o.y2) < 10 / CANVAS.zoom) return o;
    } else {
      const sc = o.scale || 1;
      if (wx >= o.x && wx <= o.x + o.w * sc && wy >= o.y && wy <= o.y + o.h * sc) return o;
    }
  }
  return null;
}
function ptSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2-x1, dy = y2-y1;
  if (!dx && !dy) return Math.hypot(px-x1, py-y1);
  const t = Math.max(0, Math.min(1, ((px-x1)*dx+(py-y1)*dy)/(dx*dx+dy*dy)));
  return Math.hypot(px-x1-t*dx, py-y1-t*dy);
}

// ===== DRAW =====
function drawCanvas() {
  const { ctx, width: W, height: H } = CANVAS;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(CANVAS.panX, CANVAS.panY);
  ctx.scale(CANVAS.zoom, CANVAS.zoom);
  drawBg(ctx, W / CANVAS.zoom, H / CANVAS.zoom);
  if (CANVAS.gridVisible) drawGrid(ctx, W / CANVAS.zoom, H / CANVAS.zoom);
  CANVAS.objects.forEach(o => drawObj(ctx, o));
  if (CANVAS.tempLine) drawTempLine(ctx);
  if (CANVAS.selected) drawSelection(ctx, CANVAS.selected);
  ctx.restore();
}

function drawBg(ctx, W, H) {
  if (CANVAS.bgType === 'asphalt') {
    ctx.fillStyle = '#292929'; ctx.fillRect(-W, -H, W*3, H*3);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 2; ctx.setLineDash([20,15]);
    for (let x = -W; x < W*2; x += 80) { ctx.beginPath(); ctx.moveTo(x,-H); ctx.lineTo(x,H*2); ctx.stroke(); }
    ctx.setLineDash([]);
  } else if (CANVAS.bgType === 'white') {
    ctx.fillStyle = '#f5f5f0'; ctx.fillRect(-W, -H, W*3, H*3);
  } else {
    ctx.fillStyle = '#fff'; ctx.fillRect(-W, -H, W*3, H*3);
  }
}

function drawGrid(ctx, W, H) {
  ctx.save();
  ctx.strokeStyle = CANVAS.bgType === 'asphalt' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 0.5;
  const gs = 20;
  for (let x = Math.floor(-W/gs)*gs; x < W*2; x+=gs) { ctx.beginPath(); ctx.moveTo(x,-H); ctx.lineTo(x,H*2); ctx.stroke(); }
  for (let y = Math.floor(-H/gs)*gs; y < H*2; y+=gs) { ctx.beginPath(); ctx.moveTo(-W,y); ctx.lineTo(W*2,y); ctx.stroke(); }
  ctx.restore();
}

// Centrează canvas pe toate obiectele existente
function fitCanvasToObjects() {
  // Dacă avem obiecte OSM, centrăm pe originea OSM
  if (OSM.scale > 0 && OSM.canvasOffsetX > 0) {
    const radiusPx = 120 * OSM.scale; // estimare
    const canvasSize = Math.min(CANVAS.width, CANVAS.height) || 800;
    const z = Math.min(1.5, Math.max(0.08, (canvasSize * 0.40) / radiusPx));
    CANVAS.zoom = z;
    CANVAS.panX = (CANVAS.width  / 2) - (OSM.canvasOffsetX * z);
    CANVAS.panY = (CANVAS.height / 2) - (OSM.canvasOffsetY * z);
    document.getElementById('canvas-zoom-display').textContent = Math.round(z*100)+'%';
    drawCanvas(); return;
  }
  // Fără OSM: zoom 1, centrat pe canvas
  CANVAS.zoom = 1; CANVAS.panX = 0; CANVAS.panY = 0;
  document.getElementById('canvas-zoom-display').textContent = '100%';
  drawCanvas();
}

function drawObj(ctx, o) {
  if (o.type === 'building_poly') { drawBuildingPoly(ctx, o); return; }
  if (o.type === 'road_poly') { drawRoadPoly(ctx, o); return; }
  if (o.type === 'roundabout') { drawRoundabout(ctx, o); return; }
  ctx.save();
  // Obiect preview — semitransparent cu contur punctat
  if (o._preview) {
    ctx.globalAlpha = 0.65;
    ctx.setLineDash([4/CANVAS.zoom, 3/CANVAS.zoom]);
  }
  if (o.type === 'line') {
    ctx.strokeStyle = o.color || '#e74c3c'; ctx.lineWidth = (o.lineWidth||2)/CANVAS.zoom;
    ctx.beginPath(); ctx.moveTo(o.x,o.y); ctx.lineTo(o.x2,o.y2); ctx.stroke();
    drawArrow(ctx, o.x,o.y, o.x2,o.y2, 8/CANVAS.zoom, o.color||'#e74c3c');
    drawArrow(ctx, o.x2,o.y2, o.x,o.y, 8/CANVAS.zoom, o.color||'#e74c3c');
    if (o.label) {
      ctx.fillStyle = o.color||'#e74c3c'; ctx.font = `bold ${11/CANVAS.zoom}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(o.label, (o.x+o.x2)/2, (o.y+o.y2)/2 - 6/CANVAS.zoom);
    }
  } else {
    const sc = o.scale||1;
    const W = o.w * sc, H = o.h * sc;
    const cx = o.x + W/2, cy = o.y + H/2;
    ctx.translate(cx, cy);
    ctx.rotate((o.rotation||0) * Math.PI/180);
    // Dispatch per tip
    if (o.type && o.type.startsWith('sign-')) {
      drawSign(ctx, o, W, H);
    } else if (o.type && ['impact-mark','skid-mark','debris','north-arrow','cone'].includes(o.type)) {
      drawMarking(ctx, o, W, H);
    } else {
      drawVehicleTopView(ctx, o, W, H);
    }
    // Etichetă
    if (o.label) {
      ctx.font = `bold ${Math.max(7, Math.min(14, H*0.22))}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(o.label).width + 6, th = Math.max(10, H*0.24);
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(-tw/2, H*0.5+2, tw, th);
      ctx.fillStyle = '#fff'; ctx.fillText(o.label, 0, H*0.5+2+th/2);
    }
  }
  if (o._preview) { ctx.globalAlpha = 1; ctx.setLineDash([]); }
  ctx.restore();
}


// ════ INDICATOARE RUTIERE (canvas drawing) ════════════════════
function drawSign(ctx, o, W, H) {
  const S = Math.min(W, H); // dimensiune de referinta
  switch(o.type) {

    case 'sign-stop': {
      // Octogon rosu cu text STOP
      const sides = 8, r = S*0.48;
      ctx.beginPath();
      for(let i=0;i<sides;i++){
        const a = (Math.PI/sides)*(2*i+1) - Math.PI/2;
        i===0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r)
              : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
      }
      ctx.closePath();
      ctx.fillStyle = '#cc0000'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = S*0.07; ctx.stroke();
      ctx.strokeStyle = '#cc0000'; ctx.lineWidth = S*0.04;
      ctx.beginPath();
      for(let i=0;i<sides;i++){
        const a = (Math.PI/sides)*(2*i+1) - Math.PI/2;
        const ri = r - S*0.1;
        i===0 ? ctx.moveTo(Math.cos(a)*ri, Math.sin(a)*ri)
              : ctx.lineTo(Math.cos(a)*ri, Math.sin(a)*ri);
      }
      ctx.closePath(); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font=`bold ${S*0.32}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('STOP',0,0);
      // Stalp
      ctx.fillStyle='#888'; ctx.fillRect(-S*0.05,S*0.48,S*0.1,S*0.35);
      break;
    }

    case 'sign-yield': {
      // Triunghi rosu cu varf jos (Cedati trecerea)
      const h = S*0.82;
      ctx.beginPath();
      ctx.moveTo(0, -h*0.62);
      ctx.lineTo(h*0.6, h*0.38);
      ctx.lineTo(-h*0.6, h*0.38);
      ctx.closePath();
      ctx.fillStyle='#cc0000'; ctx.fill();
      ctx.strokeStyle='#fff'; ctx.lineWidth=S*0.08; ctx.stroke();
      // Triunghi interior alb
      ctx.beginPath();
      ctx.moveTo(0, -h*0.45);
      ctx.lineTo(h*0.44, h*0.28);
      ctx.lineTo(-h*0.44, h*0.28);
      ctx.closePath();
      ctx.fillStyle='#fff'; ctx.fill();
      ctx.strokeStyle='#cc0000'; ctx.lineWidth=S*0.04; ctx.stroke();
      ctx.fillStyle='#888'; ctx.fillRect(-S*0.05,S*0.38,S*0.1,S*0.35);
      break;
    }

    case 'sign-priority': {
      // Romb galben cu alb — drum cu prioritate
      const r = S*0.46;
      ctx.save(); ctx.rotate(Math.PI/4);
      ctx.fillStyle='#ffdd00';
      ctx.fillRect(-r,-r,r*2,r*2);
      ctx.strokeStyle='#fff'; ctx.lineWidth=S*0.08; ctx.stroke();
      ctx.fillStyle='#fff'; ctx.fillRect(-r*0.62,-r*0.62,r*1.24,r*1.24);
      ctx.fillStyle='#ffdd00'; ctx.fillRect(-r*0.52,-r*0.52,r*1.04,r*1.04);
      ctx.restore();
      ctx.fillStyle='#888'; ctx.fillRect(-S*0.05,S*0.46,S*0.1,S*0.35);
      break;
    }

    case 'sign-semaphore': {
      // Semafor cu 3 lumini
      const bw = S*0.52, bh = S*1.6;
      // Corp negru
      ctx.fillStyle='#222';
      ctx.beginPath(); roundRect(ctx,-bw/2,-bh/2,bw,bh,bw*0.15); ctx.fill();
      ctx.strokeStyle='#555'; ctx.lineWidth=S*0.04; ctx.stroke();
      // Lumina rosie
      ctx.fillStyle='#ff2200';
      ctx.shadowColor='#ff2200'; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(0,-bh*0.3,bw*0.32,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // Lumina galbena (stinsa)
      ctx.fillStyle='#443300';
      ctx.beginPath(); ctx.arc(0,0,bw*0.32,0,Math.PI*2); ctx.fill();
      // Lumina verde
      ctx.fillStyle='#00aa00';
      ctx.shadowColor='#00ff00'; ctx.shadowBlur=6;
      ctx.beginPath(); ctx.arc(0,bh*0.3,bw*0.32,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // Stalp
      ctx.fillStyle='#888'; ctx.fillRect(-S*0.06,bh/2,S*0.12,S*0.6);
      break;
    }

    case 'sign-crossing': {
      // Triunghi galben cu silueta pieton
      const h = S*0.82;
      ctx.beginPath();
      ctx.moveTo(0,-h*0.62); ctx.lineTo(h*0.6,h*0.38); ctx.lineTo(-h*0.6,h*0.38);
      ctx.closePath();
      ctx.fillStyle='#ffcc00'; ctx.fill();
      ctx.strokeStyle='#333'; ctx.lineWidth=S*0.06; ctx.stroke();
      // Silueta pieton
      ctx.fillStyle='#222';
      ctx.beginPath(); ctx.arc(0,-h*0.22,h*0.1,0,Math.PI*2); ctx.fill();
      ctx.fillRect(-h*0.08,-h*0.12,h*0.16,h*0.2);
      ctx.save(); ctx.rotate(-0.3);
      ctx.fillRect(-h*0.04,-h*0.12,h*0.06,h*0.22); ctx.restore();
      ctx.save(); ctx.rotate(0.2);
      ctx.fillRect(h*0.0,-h*0.12,h*0.06,h*0.22); ctx.restore();
      ctx.fillStyle='#888'; ctx.fillRect(-S*0.05,S*0.38,S*0.1,S*0.35);
      break;
    }

    case 'sign-noentry': {
      // Cerc rosu cu bara alba orizontala
      ctx.fillStyle='#cc0000';
      ctx.beginPath(); ctx.arc(0,0,S*0.46,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#fff'; ctx.lineWidth=S*0.07; ctx.stroke();
      ctx.fillStyle='#fff';
      ctx.fillRect(-S*0.36,-S*0.12,S*0.72,S*0.24);
      ctx.fillStyle='#888'; ctx.fillRect(-S*0.05,S*0.46,S*0.1,S*0.35);
      break;
    }

    case 'sign-speed-50': {
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(0,0,S*0.46,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#cc0000'; ctx.lineWidth=S*0.14; ctx.stroke();
      ctx.fillStyle='#111'; ctx.font=`bold ${S*0.4}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('50',0,0);
      ctx.fillStyle='#888'; ctx.fillRect(-S*0.05,S*0.46,S*0.1,S*0.35);
      break;
    }

    case 'sign-oneway': {
      // Sageata alba pe fond albastru
      ctx.fillStyle='#003399';
      ctx.beginPath(); roundRect(ctx,-S*0.46,-S*0.28,S*0.92,S*0.56,S*0.08); ctx.fill();
      ctx.fillStyle='#fff';
      ctx.beginPath();
      ctx.moveTo(S*0.36,0); ctx.lineTo(S*0.06,-S*0.22); ctx.lineTo(S*0.06,-S*0.08);
      ctx.lineTo(-S*0.36,-S*0.08); ctx.lineTo(-S*0.36,S*0.08);
      ctx.lineTo(S*0.06,S*0.08); ctx.lineTo(S*0.06,S*0.22);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle='#888'; ctx.fillRect(-S*0.05,S*0.28,S*0.1,S*0.35);
      break;
    }

    default: {
      // Fallback: cerc albastru cu text tip
      ctx.fillStyle='#003399';
      ctx.beginPath(); ctx.arc(0,0,S*0.46,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.font=`${S*0.22}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(o.name||'?',0,0);
    }
  }
}

// ════ MARCAJE RUTIERE ════════════════════════════════════════════
function drawMarking(ctx, o, W, H) {
  switch(o.type) {

    case 'impact-mark': {
      // Stea de impact cu explodare
      const R = Math.min(W,H)*0.5;
      ctx.save();
      // Cercuri concentrice rosii
      [0.95,0.7,0.45].forEach((r,i)=>{
        ctx.beginPath(); ctx.arc(0,0,R*r,0,Math.PI*2);
        ctx.strokeStyle = i===0?'#ff0000':i===1?'#ff4400':'#ff8800';
        ctx.lineWidth = R*0.06; ctx.stroke();
      });
      // Linii de fisura (8 directii)
      ctx.strokeStyle='#ff0000'; ctx.lineWidth=R*0.06;
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4, len=R*(0.5+Math.random()*0.4);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*len,Math.sin(a)*len);
        ctx.stroke();
      }
      // X central
      ctx.strokeStyle='#ff0000'; ctx.lineWidth=R*0.1;
      ctx.beginPath(); ctx.moveTo(-R*0.22,-R*0.22); ctx.lineTo(R*0.22,R*0.22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(R*0.22,-R*0.22); ctx.lineTo(-R*0.22,R*0.22); ctx.stroke();
      ctx.restore();
      break;
    }

    case 'skid-mark': {
      // Urme de frana — dungi negre paralele
      const nLines = 3;
      ctx.save();
      for(let li=0;li<nLines;li++){
        const yOff = (li-(nLines-1)/2) * H*0.22;
        // Urma cu variatie de densitate
        const grad = ctx.createLinearGradient(-W/2,0,W/2,0);
        grad.addColorStop(0,'rgba(20,20,20,0.1)');
        grad.addColorStop(0.3,'rgba(20,20,20,0.85)');
        grad.addColorStop(0.7,'rgba(20,20,20,0.9)');
        grad.addColorStop(1,'rgba(20,20,20,0.2)');
        ctx.fillStyle=grad;
        ctx.fillRect(-W/2, yOff-H*0.08, W, H*0.16);
        // Striuri de cauciuc
        ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=H*0.02;
        for(let j=0;j<6;j++){
          ctx.beginPath();
          ctx.moveTo(-W/2+j*W/6, yOff-H*0.08);
          ctx.lineTo(-W/2+j*W/6+W*0.04, yOff+H*0.08);
          ctx.stroke();
        }
      }
      ctx.restore();
      break;
    }

    case 'debris': {
      // Resturi - obiecte imprastiate
      const R = Math.min(W,H)*0.45;
      ctx.save();
      const pieces = [
        {x:-R*0.3,y:-R*0.4,r:R*0.18,c:'#888'},
        {x: R*0.4,y:-R*0.2,r:R*0.14,c:'#666'},
        {x:-R*0.5,y: R*0.2,r:R*0.22,c:'#999'},
        {x: R*0.2,y: R*0.45,r:R*0.16,c:'#777'},
        {x: R*0.0,y:-R*0.1,r:R*0.12,c:'#aaa'},
        {x:-R*0.1,y: R*0.1,r:R*0.1, c:'#555'},
      ];
      pieces.forEach(p=>{
        ctx.fillStyle=p.c;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1; ctx.stroke();
      });
      // Cateva fragmente triunghiulare
      ctx.fillStyle='#cc6600';
      ctx.beginPath(); ctx.moveTo(R*0.1,-R*0.35); ctx.lineTo(R*0.3,-R*0.15); ctx.lineTo(-R*0.05,-R*0.1); ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    }

    case 'north-arrow': {
      // Compas nord - sageata N cu cerc
      const R = Math.min(W,H)*0.46;
      ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=R*0.06;
      ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.stroke();
      // Sageata N (rosu)
      ctx.fillStyle='#cc0000';
      ctx.beginPath(); ctx.moveTo(0,-R*0.88); ctx.lineTo(R*0.25,0); ctx.lineTo(-R*0.25,0); ctx.closePath(); ctx.fill();
      // Sageata S (alb)
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.moveTo(0,R*0.88); ctx.lineTo(R*0.25,0); ctx.lineTo(-R*0.25,0); ctx.closePath(); ctx.fill();
      // Linii E-W
      ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=R*0.06;
      ctx.beginPath(); ctx.moveTo(-R,0); ctx.lineTo(-R*0.3,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(R*0.3,0); ctx.lineTo(R,0); ctx.stroke();
      // Litera N
      ctx.fillStyle='#fff'; ctx.font=`bold ${R*0.38}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('N',0,-R*1.25);
      break;
    }

    case 'cone': {
      // Con de trafic portocaliu (vedere de sus = elipsa)
      const rw = W*0.44, rh = H*0.44;
      // Umbra
      ctx.fillStyle='rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(W*0.06,H*0.06,rw,rh,0,0,Math.PI*2); ctx.fill();
      // Corp
      ctx.fillStyle='#ff6600';
      ctx.beginPath(); ctx.ellipse(0,0,rw,rh,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=2; ctx.stroke();
      // Banda alba
      ctx.fillStyle='rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.ellipse(0,-rh*0.1,rw*0.6,rh*0.18,0,0,Math.PI*2); ctx.fill();
      // Varf (centru mai inchis)
      ctx.fillStyle='rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(0,rh*0.1,rw*0.25,rh*0.25,0,0,Math.PI*2); ctx.fill();
      break;
    }

    default: {
      ctx.fillStyle=o.color||'#ffcc00';
      ctx.beginPath(); ctx.arc(0,0,Math.min(W,H)*0.46,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.font=`${Math.min(W,H)*0.3}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(o.emoji||'?',0,0);
    }
  }
}

// ─── SILUETE VEHICULE VEDERE DE SUS ─── fiecare tip distinct ──
function drawVehicleTopView(ctx, o, W, H) {
  const col = o.color || '#e74c3c';
  switch(o.type) {
    case 'car':       drawCar(ctx, W, H, col); break;
    case 'truck':     drawTruck(ctx, W, H, col); break;
    case 'moto':      drawMoto(ctx, W, H, col); break;
    case 'bike':      drawBike(ctx, W, H, col); break;
    case 'bus':       drawBus(ctx, W, H, col); break;
    case 'tram':      drawTram(ctx, W, H, col); break;
    case 'van':       drawVan(ctx, W, H, col); break;
    case 'ambulance': drawAmbulance(ctx, W, H, col); break;
    case 'pedestrian':drawPedestrian(ctx, W, H, col); break;
    case 'animal':    drawAnimal(ctx, W, H, col); break;
    default:          drawCar(ctx, W, H, col);
  }
  // Nr. înmatriculare / etichetă
  if (o.label) {
    const fs = Math.max(5, Math.min(H*0.28, 11));
    ctx.font = `bold ${fs}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(o.label).width + 5;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(-tw/2, H*0.5+2, tw, fs+3);
    ctx.fillStyle = '#fff';
    ctx.fillText(o.label, 0, H*0.5+2+(fs+3)/2);
  }
}

// ── AUTOTURISM ──────────────────────────────────────────────────
function drawCar(ctx, W, H, col) {
  const r = H*0.22;
  // Umbra
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); roundRect(ctx, -W/2+2, -H/2+2, W, H, r); ctx.fill();
  // Corp principal
  ctx.fillStyle = col;
  ctx.beginPath(); roundRect(ctx, -W/2, -H/2, W, H, r); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = H*0.05; ctx.stroke();
  // Capota (zona motor, in fata)
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath(); roundRect(ctx, -W*0.38, -H/2, W*0.76, H*0.28, r*0.5); ctx.fill();
  // Parbriz fata
  ctx.fillStyle = 'rgba(160,210,255,0.75)';
  ctx.beginPath(); roundRect(ctx, -W*0.32, -H/2+H*0.29, W*0.64, H*0.19, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.8; ctx.stroke();
  // Geamuri laterale
  ctx.fillStyle = 'rgba(160,210,255,0.5)';
  ctx.fillRect(-W/2+H*0.08, -H*0.1, W*0.1, H*0.2);
  ctx.fillRect( W/2-H*0.18, -H*0.1, W*0.1, H*0.2);
  // Luneta spate
  ctx.fillStyle = 'rgba(160,210,255,0.55)';
  ctx.beginPath(); roundRect(ctx, -W*0.28, H/2-H*0.3, W*0.56, H*0.17, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.8; ctx.stroke();
  // Roti 4 (negre cu jante)
  const wr = H*0.18, wh = H*0.3;
  const wx1 = -W/2-wr*0.3, wx2 = W/2-wr*0.7;
  drawWheel(ctx, wx1, -H*0.28, wr, wh);
  drawWheel(ctx, wx2, -H*0.28, wr, wh);
  drawWheel(ctx, wx1,  H*0.01, wr, wh);
  drawWheel(ctx, wx2,  H*0.01, wr, wh);
  // Faruri fata
  ctx.fillStyle = '#ffe066';
  ctx.fillRect(-W/2, -H/2, W*0.1, H*0.14);
  ctx.fillRect( W/2-W*0.1, -H/2, W*0.1, H*0.14);
  // Stopuri spate
  ctx.fillStyle = '#ff3333';
  ctx.fillRect(-W/2, H/2-H*0.14, W*0.1, H*0.14);
  ctx.fillRect( W/2-W*0.1, H/2-H*0.14, W*0.1, H*0.14);
  // Sageta directie (sus = fata)
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.moveTo(0,-H/2-H*0.18); ctx.lineTo(-W*0.14,-H/2-H*0.02); ctx.lineTo(W*0.14,-H/2-H*0.02);
  ctx.closePath(); ctx.fill();
}

// ── CAMION ──────────────────────────────────────────────────────
function drawTruck(ctx, W, H, col) {
  // Remorca (2/3 din lungime, spate)
  ctx.fillStyle = col;
  ctx.beginPath(); roundRect(ctx, -W/2, -H/2, W*0.62, H, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = H*0.05; ctx.stroke();
  // Dungi reflectorizante pe remorca
  ctx.fillStyle = 'rgba(255,200,0,0.4)';
  for(let i=0;i<3;i++) ctx.fillRect(-W/2+W*0.08+i*W*0.14, -H/2, W*0.06, H);
  // Cabina (1/3, fata)
  ctx.fillStyle = col === '#3498db' ? '#2980b9' : col;
  ctx.beginPath(); roundRect(ctx, W*0.14, -H/2, W*0.36, H, H*0.18); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.stroke();
  // Parbriz cabina
  ctx.fillStyle = 'rgba(160,210,255,0.8)';
  ctx.beginPath(); roundRect(ctx, W*0.22, -H/2+H*0.12, W*0.22, H*0.28, 3); ctx.fill();
  // Separator cabina/remorca
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = H*0.08;
  ctx.beginPath(); ctx.moveTo(W*0.14,-H/2); ctx.lineTo(W*0.14,H/2); ctx.stroke();
  // Roti 6 (3 pe fiecare parte)
  const wr = H*0.2, wh = H*0.32;
  drawWheel(ctx, -W/2-wr*0.3, -H*0.3, wr, wh);
  drawWheel(ctx, -W/2-wr*0.3,  H*0.0, wr, wh);
  drawWheel(ctx,  W*0.2,       -H*0.3, wr, wh);
  drawWheel(ctx, -W/2-wr*0.3,  H*0.32, wr, wh);
  drawWheel(ctx,  W/2-wr*0.7,  -H*0.3, wr, wh);
  drawWheel(ctx,  W/2-wr*0.7,   H*0.0, wr, wh);
  // Faruri + sageta
  ctx.fillStyle = '#ffe066';
  ctx.fillRect(W/2-W*0.06, -H/2, W*0.06, H*0.16);
  ctx.fillRect(W/2-W*0.06,  H/2-H*0.16, W*0.06, H*0.16);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.moveTo(W/2+H*0.2,-H*0.0);
  ctx.lineTo(W/2,      -H*0.18);
  ctx.lineTo(W/2,       H*0.18);
  ctx.closePath(); ctx.fill();
}

// ── MOTOCICLETA ──────────────────────────────────────────────────
function drawMoto(ctx, W, H, col) {
  // Roata fata
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.ellipse(W*0.32, 0, H*0.48, H*0.48, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#444'; ctx.lineWidth = H*0.1; ctx.stroke();
  // Roata spate
  ctx.beginPath(); ctx.ellipse(-W*0.28, 0, H*0.44, H*0.44, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#444'; ctx.lineWidth = H*0.1; ctx.stroke();
  // Jante
  ctx.strokeStyle = '#888'; ctx.lineWidth = H*0.07;
  ctx.beginPath(); ctx.arc(W*0.32, 0, H*0.25, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(-W*0.28, 0, H*0.22, 0, Math.PI*2); ctx.stroke();
  // Cadru moto
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-W*0.15, -H*0.3);
  ctx.lineTo( W*0.2,  -H*0.3);
  ctx.lineTo( W*0.2,   H*0.3);
  ctx.lineTo(-W*0.15,  H*0.3);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = H*0.06; ctx.stroke();
  // Rezervor
  ctx.fillStyle = col === '#e67e22' ? '#d35400' : col;
  ctx.beginPath(); ctx.ellipse(0, 0, W*0.14, H*0.35, 0, 0, Math.PI*2); ctx.fill();
  // Ghidon
  ctx.strokeStyle = '#888'; ctx.lineWidth = H*0.12;
  ctx.beginPath(); ctx.moveTo(W*0.18, -H*0.4); ctx.lineTo(W*0.18, H*0.4); ctx.stroke();
  ctx.lineCap = 'round';
  // Sageta
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(W/2+H*0.25,0); ctx.lineTo(W/2,-H*0.28); ctx.lineTo(W/2,H*0.28);
  ctx.closePath(); ctx.fill();
}

// ── BICICLETA ────────────────────────────────────────────────────
function drawBike(ctx, W, H, col) {
  // Roata fata
  ctx.strokeStyle = '#333'; ctx.lineWidth = H*0.15;
  ctx.beginPath(); ctx.arc(W*0.3, 0, H*0.42, 0, Math.PI*2); ctx.stroke();
  // Roata spate
  ctx.beginPath(); ctx.arc(-W*0.3, 0, H*0.42, 0, Math.PI*2); ctx.stroke();
  // Spite roti
  ctx.strokeStyle = '#666'; ctx.lineWidth = H*0.06;
  for(let a=0; a<Math.PI; a+=Math.PI/4) {
    ctx.beginPath();
    ctx.moveTo(W*0.3+H*0.42*Math.cos(a), H*0.42*Math.sin(a));
    ctx.lineTo(W*0.3-H*0.42*Math.cos(a),-H*0.42*Math.sin(a));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-W*0.3+H*0.42*Math.cos(a), H*0.42*Math.sin(a));
    ctx.lineTo(-W*0.3-H*0.42*Math.cos(a),-H*0.42*Math.sin(a));
    ctx.stroke();
  }
  // Butuc roti
  ctx.fillStyle = '#888';
  ctx.beginPath(); ctx.arc(W*0.3,0, H*0.1,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(-W*0.3,0,H*0.1,0,Math.PI*2); ctx.fill();
  // Cadru triunghiular
  ctx.strokeStyle = col; ctx.lineWidth = H*0.22;
  ctx.beginPath();
  ctx.moveTo(-W*0.3, 0); ctx.lineTo(0, -H*0.35);
  ctx.lineTo(W*0.3, 0); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -H*0.35); ctx.lineTo(0, H*0.2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-W*0.3, 0); ctx.lineTo(0, H*0.2); ctx.stroke();
  // Ghidon
  ctx.strokeStyle = '#555'; ctx.lineWidth = H*0.15;
  ctx.beginPath(); ctx.moveTo(W*0.26, -H*0.4); ctx.lineTo(W*0.26, H*0.4); ctx.stroke();
  // Sageta
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(W/2+H*0.3,0); ctx.lineTo(W/2,-H*0.3); ctx.lineTo(W/2,H*0.3);
  ctx.closePath(); ctx.fill();
}

// ── AUTOBUZ ──────────────────────────────────────────────────────
function drawBus(ctx, W, H, col) {
  // Corp
  ctx.fillStyle = col;
  ctx.beginPath(); roundRect(ctx, -W/2, -H/2, W, H, H*0.12); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = H*0.05; ctx.stroke();
  // Banda colorata laterala
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(-W/2, -H*0.08, W, H*0.16);
  // Geamuri (5 buc)
  const gw = W*0.1, gh = H*0.28, gy = -H*0.32;
  ctx.fillStyle = 'rgba(160,210,255,0.65)';
  for(let i=0;i<5;i++) {
    ctx.beginPath();
    roundRect(ctx, -W/2+W*0.06+i*(gw+W*0.06), gy, gw, gh, 2);
    ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=0.5; ctx.stroke();
  }
  // Parbriz fata
  ctx.fillStyle = 'rgba(160,210,255,0.8)';
  ctx.beginPath(); roundRect(ctx, W*0.3, -H*0.38, W*0.18, H*0.3, 3); ctx.fill();
  // Usa
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(-W/2+W*0.06, H*0.12, W*0.1, H*0.34);
  // Roti 6
  const wr=H*0.22, wh=H*0.34;
  drawWheel(ctx, -W/2-wr*0.3, -H*0.28, wr, wh);
  drawWheel(ctx, -W/2-wr*0.3,  H*0.0,  wr, wh);
  drawWheel(ctx, -W*0.06,     -H*0.28, wr, wh);
  drawWheel(ctx, -W*0.06,      H*0.0,  wr, wh);
  drawWheel(ctx,  W/2-wr*0.7, -H*0.28, wr, wh);
  drawWheel(ctx,  W/2-wr*0.7,  H*0.0,  wr, wh);
  // Faruri
  ctx.fillStyle='#ffe066';
  ctx.fillRect(W/2-W*0.05, -H/2, W*0.05, H*0.18);
  ctx.fillRect(W/2-W*0.05,  H/2-H*0.18, W*0.05, H*0.18);
  ctx.fillStyle='rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.moveTo(W/2+H*0.22,0); ctx.lineTo(W/2,-H*0.2); ctx.lineTo(W/2,H*0.2);
  ctx.closePath(); ctx.fill();
}

// ── TRAMVAI ──────────────────────────────────────────────────────
function drawTram(ctx, W, H, col) {
  // Corp
  ctx.fillStyle = col;
  ctx.beginPath(); roundRect(ctx, -W/2, -H/2, W, H, H*0.1); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=H*0.04; ctx.stroke();
  // Banda alba
  ctx.fillStyle='rgba(255,255,255,0.2)';
  ctx.fillRect(-W/2+2, -H*0.05, W-4, H*0.1);
  // Geamuri multe
  const gw=W*0.065, gh=H*0.3;
  ctx.fillStyle='rgba(160,210,255,0.6)';
  for(let i=0;i<8;i++){
    ctx.beginPath();
    roundRect(ctx, -W/2+W*0.04+i*(gw+W*0.04), -H*0.38, gw, gh, 2);
    ctx.fill();
  }
  // Linii de sina
  ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=H*0.06;
  ctx.beginPath(); ctx.moveTo(-W/2,-H*0.42); ctx.lineTo(W/2,-H*0.42); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-W/2, H*0.42); ctx.lineTo(W/2, H*0.42); ctx.stroke();
  // Pantograf (fir aerian)
  ctx.strokeStyle='#aaa'; ctx.lineWidth=H*0.04; ctx.setLineDash([W*0.04,W*0.02]);
  ctx.beginPath(); ctx.moveTo(-W/2,0); ctx.lineTo(W/2,0); ctx.stroke();
  ctx.setLineDash([]);
  // Roti sina (rectangulare)
  ctx.fillStyle='#333';
  for(let i=0;i<4;i++){
    ctx.fillRect(-W/2+W*0.1+i*W*0.22, -H/2-H*0.06, W*0.12, H*0.1);
    ctx.fillRect(-W/2+W*0.1+i*W*0.22,  H/2-H*0.04, W*0.12, H*0.1);
  }
  ctx.fillStyle='rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.moveTo(W/2+H*0.22,0); ctx.lineTo(W/2,-H*0.22); ctx.lineTo(W/2,H*0.22);
  ctx.closePath(); ctx.fill();
}

// ── MICROBUZ ──────────────────────────────────────────────────────
function drawVan(ctx, W, H, col) {
  ctx.fillStyle=col;
  ctx.beginPath(); roundRect(ctx,-W/2,-H/2,W,H,H*0.18); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=H*0.05; ctx.stroke();
  // Parbriz mare inalt
  ctx.fillStyle='rgba(160,210,255,0.75)';
  ctx.beginPath(); roundRect(ctx, W*0.15,-H/2+H*0.08, W*0.32, H*0.38, 4); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=0.8; ctx.stroke();
  // Geam lateral (2 buc)
  ctx.fillStyle='rgba(160,210,255,0.5)';
  ctx.beginPath(); roundRect(ctx, -W*0.3,-H*0.3, W*0.2, H*0.28, 2); ctx.fill();
  ctx.beginPath(); roundRect(ctx, -W*0.06,-H*0.3, W*0.2, H*0.28, 2); ctx.fill();
  // Usa glisanta
  ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=H*0.04;
  ctx.beginPath(); ctx.moveTo(-W*0.08,-H/2); ctx.lineTo(-W*0.08,H/2); ctx.stroke();
  // Roti 4
  const wr=H*0.2,wh=H*0.32;
  drawWheel(ctx, W/2-wr*0.7, -H*0.28, wr, wh);
  drawWheel(ctx, W/2-wr*0.7,  H*0.0,  wr, wh);
  drawWheel(ctx, -W/2-wr*0.3,-H*0.28, wr, wh);
  drawWheel(ctx, -W/2-wr*0.3, H*0.0,  wr, wh);
  ctx.fillStyle='#ffe066';
  ctx.fillRect(W/2-W*0.06,-H/2,W*0.06,H*0.14);
  ctx.fillRect(W/2-W*0.06, H/2-H*0.14,W*0.06,H*0.14);
  ctx.fillStyle='rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.moveTo(W/2+H*0.2,0); ctx.lineTo(W/2,-H*0.2); ctx.lineTo(W/2,H*0.2);
  ctx.closePath(); ctx.fill();
}

// ── AMBULANTA ────────────────────────────────────────────────────
function drawAmbulance(ctx, W, H, col) {
  // Corp alb
  ctx.fillStyle='#f8f8f8';
  ctx.beginPath(); roundRect(ctx,-W/2,-H/2,W,H,H*0.15); ctx.fill();
  ctx.strokeStyle='#ccc'; ctx.lineWidth=H*0.05; ctx.stroke();
  // Banda verde laterala
  ctx.fillStyle='#27ae60';
  ctx.fillRect(-W/2,H*0.28,W,H*0.22);
  ctx.fillRect(-W/2,-H*0.5,W,H*0.22);
  // Cruce rosie
  ctx.fillStyle='#e74c3c';
  ctx.fillRect(-W*0.06,-H*0.3,W*0.12,H*0.6);
  ctx.fillRect(-W*0.25,-H*0.08,W*0.5,H*0.16);
  // Parbriz
  ctx.fillStyle='rgba(160,210,255,0.8)';
  ctx.beginPath(); roundRect(ctx, W*0.18,-H/2+H*0.1, W*0.28,H*0.32,3); ctx.fill();
  // Girofar albastru
  ctx.fillStyle='#3498db';
  ctx.beginPath(); roundRect(ctx,-W*0.12,-H/2-H*0.08,W*0.24,H*0.1,3); ctx.fill();
  // Roti 4
  const wr=H*0.18,wh=H*0.3;
  drawWheel(ctx, W/2-wr*0.7,-H*0.28,wr,wh);
  drawWheel(ctx, W/2-wr*0.7, H*0.0,wr,wh);
  drawWheel(ctx,-W/2-wr*0.3,-H*0.28,wr,wh);
  drawWheel(ctx,-W/2-wr*0.3, H*0.0,wr,wh);
  ctx.fillStyle='rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.moveTo(W/2+H*0.2,0); ctx.lineTo(W/2,-H*0.2); ctx.lineTo(W/2,H*0.2);
  ctx.closePath(); ctx.fill();
}

// ── PIETON ────────────────────────────────────────────────────────
function drawPedestrian(ctx, W, H, col) {
  // Cap
  ctx.fillStyle='#f5cba7';
  ctx.beginPath(); ctx.arc(0,-H*0.32,H*0.18,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=H*0.04; ctx.stroke();
  // Trunchi
  ctx.fillStyle=col;
  ctx.beginPath();
  ctx.moveTo(-H*0.17,-H*0.12); ctx.lineTo(H*0.17,-H*0.12);
  ctx.lineTo(H*0.14,H*0.18); ctx.lineTo(-H*0.14,H*0.18);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=H*0.03; ctx.stroke();
  // Brate (in miscare)
  ctx.strokeStyle=col; ctx.lineWidth=H*0.09; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-H*0.17,H*0.0); ctx.lineTo(-H*0.3,H*0.15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(H*0.17,H*0.0); ctx.lineTo(H*0.3,-H*0.05); ctx.stroke();
  // Picioare (mers)
  ctx.strokeStyle='#2c3e50'; ctx.lineWidth=H*0.1;
  ctx.beginPath(); ctx.moveTo(-H*0.08,H*0.18); ctx.lineTo(-H*0.14,H*0.42); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(H*0.08,H*0.18); ctx.lineTo(H*0.18,H*0.38); ctx.stroke();
  // Sageta directie
  ctx.fillStyle='rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.moveTo(0,-H/2-H*0.12); ctx.lineTo(-H*0.14,-H/2+H*0.02); ctx.lineTo(H*0.14,-H/2+H*0.02);
  ctx.closePath(); ctx.fill();
}

// ── ANIMAL (VACA) ─────────────────────────────────────────────────
function drawAnimal(ctx, W, H, col) {
  // Corp oval
  ctx.fillStyle=col||'#8B6914';
  ctx.beginPath(); ctx.ellipse(0,H*0.08,W*0.44,H*0.36,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=H*0.04; ctx.stroke();
  // Pete albe
  ctx.fillStyle='rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.ellipse(-W*0.1,H*0.05,W*0.12,H*0.14,0.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(W*0.15,H*0.12,W*0.1,H*0.1,-0.3,0,Math.PI*2); ctx.fill();
  // Cap
  ctx.fillStyle=col||'#8B6914';
  ctx.beginPath(); ctx.ellipse(W*0.34,-H*0.1,W*0.18,H*0.22,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=H*0.04; ctx.stroke();
  // Urechi
  ctx.fillStyle=col||'#8B6914';
  ctx.beginPath(); ctx.ellipse(W*0.28,-H*0.3,W*0.07,H*0.14,-0.3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(W*0.42,-H*0.3,W*0.07,H*0.14,0.3,0,Math.PI*2); ctx.fill();
  // Picioare 4
  ctx.fillStyle='#5d3a00';
  ctx.fillRect(-W*0.3, H*0.38, W*0.12, H*0.22);
  ctx.fillRect(-W*0.1, H*0.38, W*0.12, H*0.22);
  ctx.fillRect( W*0.08,H*0.38, W*0.12, H*0.22);
  ctx.fillRect( W*0.24,H*0.32, W*0.12, H*0.22);
  // Coada
  ctx.strokeStyle=col||'#8B6914'; ctx.lineWidth=H*0.08; ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(-W*0.44,H*0.08); ctx.quadraticCurveTo(-W*0.56,-H*0.15,-W*0.48,-H*0.3);
  ctx.stroke();
}

function drawWheel(ctx, x, y, w, h) {
  ctx.fillStyle = '#222';
  ctx.beginPath(); roundRect(ctx, x, y, w, h, w*0.3); ctx.fill();
  ctx.fillStyle = '#444';
  ctx.beginPath(); roundRect(ctx, x+w*0.15, y+h*0.1, w*0.7, h*0.8, w*0.2); ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w/2, h/2);
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w,y, x+w,y+r, r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w,y+h, x+w-r,y+h, r);
  ctx.lineTo(x+r, y+h); ctx.arcTo(x,y+h, x,y+h-r, r);
  ctx.lineTo(x, y+r); ctx.arcTo(x,y, x+r,y, r);
  ctx.closePath();
}

function drawLabel(ctx, text, x, y, col) {
  ctx.font = `bold ${Math.max(7,Math.min(11, 10))}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const tw = ctx.measureText(text).width + 4;
  ctx.fillStyle = col+'bb';
  ctx.fillRect(x-tw/2, y, tw, 10);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x, y+1);
}

function drawArrow(ctx, fx,fy,tx,ty,size,color) {
  const a = Math.atan2(ty-fy, tx-fx);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(tx,ty);
  ctx.lineTo(tx-size*Math.cos(a-Math.PI/6), ty-size*Math.sin(a-Math.PI/6));
  ctx.lineTo(tx-size*Math.cos(a+Math.PI/6), ty-size*Math.sin(a+Math.PI/6));
  ctx.closePath(); ctx.fill();
}

function drawTempLine(ctx) {
  const t = CANVAS.tempLine;
  const dx = t.x2-t.x1, dy = t.y2-t.y1, len = Math.round(Math.sqrt(dx*dx+dy*dy));
  ctx.save(); ctx.setLineDash([6,4]);
  ctx.strokeStyle = CANVAS.drawColor; ctx.lineWidth = CANVAS.drawWidth/CANVAS.zoom;
  ctx.beginPath(); ctx.moveTo(t.x1,t.y1); ctx.lineTo(t.x2,t.y2); ctx.stroke();
  ctx.fillStyle = CANVAS.drawColor; ctx.font = `${12/CANVAS.zoom}px monospace`;
  ctx.fillText(`${len}px`, (t.x1+t.x2)/2+4, (t.y1+t.y2)/2-4);
  ctx.restore();
}

function drawSelection(ctx, o) {
  ctx.save();
  const pad = 10/CANVAS.zoom;
  if (o.type === 'line') {
    ctx.strokeStyle = '#00c8ff'; ctx.lineWidth = 2/CANVAS.zoom; ctx.setLineDash([4/CANVAS.zoom,3/CANVAS.zoom]);
    ctx.strokeRect(Math.min(o.x,o.x2)-pad, Math.min(o.y,o.y2)-pad, Math.abs(o.x2-o.x)+pad*2, Math.abs(o.y2-o.y)+pad*2);
    ctx.setLineDash([]);
  } else if (o.type !== 'road_poly' && o.type !== 'roundabout' && o.type !== 'building_poly') {
    const sc = o.scale||1;
    const hw = o.w*sc/2, hh = o.h*sc/2;
    const cx = o.x + hw, cy = o.y + hh;
    const rad = (o.rotation||0) * Math.PI/180;

    // Funcție ajutătoare: rotește un punct față de centru
    function rot(px, py) {
      const dx=px-cx, dy=py-cy;
      return { x: cx + dx*Math.cos(rad) - dy*Math.sin(rad),
               y: cy + dx*Math.sin(rad) + dy*Math.cos(rad) };
    }

    // Cele 4 colțuri ale bounding box rotit
    const corners = [
      rot(cx-hw-pad, cy-hh-pad), rot(cx+hw+pad, cy-hh-pad),
      rot(cx+hw+pad, cy+hh+pad), rot(cx-hw-pad, cy+hh+pad),
    ];

    // Desenează chenar rotit
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    corners.forEach(c => ctx.lineTo(c.x, c.y));
    ctx.closePath();
    ctx.strokeStyle = '#00c8ff'; ctx.lineWidth = 2/CANVAS.zoom;
    ctx.setLineDash([5/CANVAS.zoom,3/CANVAS.zoom]); ctx.stroke(); ctx.setLineDash([]);

    // Handle ROTIRE — deasupra centrului sus, rotit cu obiectul
    const hRotLocal = rot(cx, cy-hh-pad-22/CANVAS.zoom);
    // Linie de la centru-sus la handle
    const topMid = rot(cx, cy-hh-pad);
    ctx.beginPath(); ctx.moveTo(topMid.x, topMid.y); ctx.lineTo(hRotLocal.x, hRotLocal.y);
    ctx.strokeStyle='rgba(255,136,0,0.7)'; ctx.lineWidth=1.5/CANVAS.zoom; ctx.stroke();
    // Cerc portocaliu
    ctx.beginPath(); ctx.arc(hRotLocal.x, hRotLocal.y, 14/CANVAS.zoom, 0, Math.PI*2);
    ctx.fillStyle='#ff6600'; ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=2.5/CANVAS.zoom; ctx.stroke();
    // Text hint
    ctx.font = `bold ${10/CANVAS.zoom}px Arial`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='#fff';
    ctx.fillText('↻', hRotLocal.x, hRotLocal.y);
    // Săgeată rotire în cerc
    ctx.save();
    ctx.translate(hRotLocal.x, hRotLocal.y);
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5/CANVAS.zoom;
    ctx.beginPath(); ctx.arc(0, 0, 4/CANVAS.zoom, 0.3, Math.PI*1.7);
    ctx.stroke();
    // Vârf săgeată
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.moveTo(4/CANVAS.zoom*Math.cos(Math.PI*1.7)-2/CANVAS.zoom, 4/CANVAS.zoom*Math.sin(Math.PI*1.7));
    ctx.lineTo(4/CANVAS.zoom*Math.cos(Math.PI*1.7)+1.5/CANVAS.zoom, 4/CANVAS.zoom*Math.sin(Math.PI*1.7)-3/CANVAS.zoom);
    ctx.lineTo(4/CANVAS.zoom*Math.cos(Math.PI*1.7)+1.5/CANVAS.zoom, 4/CANVAS.zoom*Math.sin(Math.PI*1.7)+1/CANVAS.zoom);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // Handle SCALE — colț dreapta-jos, rotit cu obiectul
    const hScLocal = rot(cx+hw+pad, cy+hh+pad);
    const hs = 10/CANVAS.zoom;
    ctx.save();
    ctx.translate(hScLocal.x, hScLocal.y); ctx.rotate(rad);
    ctx.fillStyle='#00cc44'; ctx.strokeStyle='#fff'; ctx.lineWidth=2/CANVAS.zoom;
    ctx.fillRect(-hs/2,-hs/2,hs,hs); ctx.strokeRect(-hs/2,-hs/2,hs,hs);
    // Săgeată diagonală în pătrat
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5/CANVAS.zoom;
    ctx.beginPath(); ctx.moveTo(-hs*0.3,-hs*0.3); ctx.lineTo(hs*0.3,hs*0.3); ctx.stroke();
    ctx.restore();

    // Stochează în world coords NEROTITE pentru hit-test corect
    o._hRot = hRotLocal;  // world coords
    o._hSc  = hScLocal;   // world coords
    o._cx = cx; o._cy = cy;
    o._hw = hw+pad; o._hh = hh+pad;
  }
  ctx.restore();
}

// ===== HISTORY =====
function saveHistory() {
  CANVAS.history = CANVAS.history.slice(0, CANVAS.historyIdx+1);
  CANVAS.history.push(JSON.stringify(CANVAS.objects));
  CANVAS.historyIdx = CANVAS.history.length-1;
  if (CANVAS.history.length > 60) { CANVAS.history.shift(); CANVAS.historyIdx--; }
  autosave();
}
function undo() { if (CANVAS.historyIdx>0) { CANVAS.historyIdx--; CANVAS.objects=JSON.parse(CANVAS.history[CANVAS.historyIdx]); CANVAS.selected=null; clearProps(); drawCanvas(); } }
function redo() { if (CANVAS.historyIdx<CANVAS.history.length-1) { CANVAS.historyIdx++; CANVAS.objects=JSON.parse(CANVAS.history[CANVAS.historyIdx]); CANVAS.selected=null; clearProps(); drawCanvas(); } }

// ===== TOOLBAR =====
function initToolbar() {
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      CANVAS.tool = btn.dataset.tool;
      CANVAS.spawnItem = btn.dataset.item || null;
      document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      CANVAS.el.style.cursor = CANVAS.tool==='eraser'?'cell': CANVAS.tool==='select'?'default':'crosshair';
    });
  });
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  document.getElementById('btn-clear-canvas').addEventListener('click', () => showConfirm('Ștergeți toate obiectele?', () => { CANVAS.objects=[]; CANVAS.selected=null; clearProps(); saveHistory(); drawCanvas(); }));
  document.getElementById('btn-export-img').addEventListener('click', () => {
    const a = document.createElement('a'); a.download = `Schita_${APP.incidentId}.jpg`;
    a.href = CANVAS.el.toDataURL('image/jpeg', 0.92); a.click(); toast('Imagine salvată','success');
  });
  document.getElementById('draw-color').addEventListener('input', e => { CANVAS.drawColor = e.target.value; });
  document.getElementById('draw-width').addEventListener('input', e => { CANVAS.drawWidth = +e.target.value; });
  document.getElementById('canvas-grid-toggle').addEventListener('click', function() {
    CANVAS.gridVisible = !CANVAS.gridVisible; this.textContent = CANVAS.gridVisible?'ON':'OFF'; drawCanvas();
  });
  document.getElementById('canvas-bg-toggle').addEventListener('click', function() {
    const types = ['asphalt','white','graph'], labels = {asphalt:'Asfalt',white:'Alb',graph:'Hârtie'};
    CANVAS.bgType = types[(types.indexOf(CANVAS.bgType)+1)%3];
    this.textContent = labels[CANVAS.bgType]; drawCanvas();
  });
  document.getElementById('canvas-zoom-fit').addEventListener('click', () => {
    fitCanvasToObjects();
  });
  document.addEventListener('keydown', e => {
    if (e.key==='z'&&(e.ctrlKey||e.metaKey)) { e.preventDefault(); e.shiftKey?redo():undo(); }
    if (e.key==='Delete'&&CANVAS.selected) {
      CANVAS.objects=CANVAS.objects.filter(o=>o!==CANVAS.selected); CANVAS.selected=null; clearProps(); saveHistory(); drawCanvas();
    }
    if (e.key==='Escape') { CANVAS.selected=null; clearProps(); drawCanvas(); document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open')); }
  });
}

// ===== LABEL EDITOR =====
function showLabelEditor(sx, sy, wx, wy) {
  const le = document.getElementById('label-editor'), li = document.getElementById('label-input');
  le.style.left=sx+'px'; le.style.top=sy+'px'; le.classList.remove('hidden');
  li.value=''; li.focus(); li._wx=wx; li._wy=wy; li._forObj=null;
  document.getElementById('label-ok').onclick = () => {
    const t = li.value.trim();
    if (t) {
      if (li._forObj) { li._forObj.label=t; }
      else CANVAS.objects.push({ id:uid(),type:'textlabel',x:li._wx,y:li._wy,w:60,h:20,emoji:'Ⓣ',label:t,color:CANVAS.drawColor,rotation:0,scale:1,name:'Text' });
      saveHistory(); drawCanvas();
    }
    le.classList.add('hidden');
  };
  document.getElementById('label-cancel').onclick = () => le.classList.add('hidden');
}
function showLabelEditorForObj(o, sx, sy) {
  const le=document.getElementById('label-editor'), li=document.getElementById('label-input');
  le.style.left=sx+'px'; le.style.top=sy+'px'; le.classList.remove('hidden');
  li.value=o.label||''; li.focus(); li._forObj=o;
  document.getElementById('label-ok').onclick = () => { o.label=li.value.trim(); saveHistory(); drawCanvas(); le.classList.add('hidden'); };
  document.getElementById('label-cancel').onclick = () => le.classList.add('hidden');
}

// ===== PROPS =====
// ===== QUICK CONTROLS (toolbar rotire+marime) =====
function showQuickControls(o) {
  const qc = document.getElementById('quick-controls');
  if (!qc || !o || o.type === 'road_poly' || o.type === 'roundabout' || o.type === 'building_poly' || o.type === 'line') {
    if (qc) qc.style.display = 'none';
    return;
  }
  qc.style.display = 'flex';
  const rot = Math.round(o.rotation || 0);
  const sc  = Math.round((o.scale || 1) * 100);
  document.getElementById('qc-rotation').value = rot;
  document.getElementById('qc-rot-val').textContent = rot + '°';
  document.getElementById('qc-scale').value = sc;
  document.getElementById('qc-scale-val').textContent = sc + '%';
  // Scroll toolbar to show quick controls
  const tb = document.getElementById('sketch-toolbar');
  if (tb) setTimeout(() => { tb.scrollLeft = tb.scrollWidth; }, 50);
}

function hideQuickControls() {
  const qc = document.getElementById('quick-controls');
  if (qc) qc.style.display = 'none';
}

function qcRotate(val) {
  if (!CANVAS.selected) return;
  CANVAS.selected.rotation = +val;
  CANVAS.editMode = true;
  document.getElementById('qc-rot-val').textContent = Math.round(+val) + '°';
  syncPropsToObject(CANVAS.selected);
  showEditingIndicator();
  drawCanvas();
}

function qcScale(val) {
  if (!CANVAS.selected) return;
  CANVAS.selected.scale = +val / 100;
  CANVAS.editMode = true;
  document.getElementById('qc-scale-val').textContent = Math.round(+val) + '%';
  syncPropsToObject(CANVAS.selected);
  showEditingIndicator();
  drawCanvas();
}

function qcRotateBy(deg) {
  if (!CANVAS.selected) return;
  CANVAS.selected.rotation = (((CANVAS.selected.rotation || 0) + deg) % 360 + 360) % 360;
  CANVAS.editMode = true;
  document.getElementById('qc-rotation').value = Math.round(CANVAS.selected.rotation);
  document.getElementById('qc-rot-val').textContent = Math.round(CANVAS.selected.rotation) + '°';
  syncPropsToObject(CANVAS.selected);
  showEditingIndicator();
  drawCanvas();
}

function qcScaleBy(factor) {
  if (!CANVAS.selected) return;
  const ns = Math.max(0.2, Math.min(5, (CANVAS.selected.scale || 1) * factor));
  CANVAS.selected.scale = ns;
  CANVAS.editMode = true;
  document.getElementById('qc-scale').value = Math.round(ns * 100);
  document.getElementById('qc-scale-val').textContent = Math.round(ns * 100) + '%';
  syncPropsToObject(CANVAS.selected);
  showEditingIndicator();
  drawCanvas();
}

function initProps() {
  document.getElementById('prop-scale').addEventListener('input', e => { onScaleInput(e.target.value); });
  document.getElementById('prop-rotation').addEventListener('input', e => { onRotationInput(e.target.value); });
  document.getElementById('btn-prop-apply').addEventListener('click', applyProps);
  document.getElementById('btn-prop-delete').addEventListener('click', () => {
    if (!CANVAS.selected) return;
    CANVAS.objects=CANVAS.objects.filter(o=>o!==CANVAS.selected); CANVAS.selected=null; clearProps(); saveHistory(); drawCanvas();
  });
}
function showPropsFor(o) {
  document.getElementById('props-empty').classList.add('hidden');
  document.getElementById('props-form').classList.remove('hidden');
  document.getElementById('prop-type-display').textContent=o.name||o.type;
  document.getElementById('prop-label').value=o.label||'';
  document.getElementById('prop-rotation').value=o.rotation||0;
  document.getElementById('prop-scale').value=Math.round((o.scale||1)*100);
  document.getElementById('prop-scale-val').textContent=Math.round((o.scale||1)*100)+'%';
  document.getElementById('prop-color').value=o.color||'#e74c3c';
  document.getElementById('prop-note').value=o.note||'';
  const sel=document.getElementById('prop-person-link');
  sel.innerHTML='<option value="">— nelegat —</option>';
  APP.persons.forEach(p => { const op=document.createElement('option'); op.value=p.id; op.textContent=p.name; if(p.id===o.personLink)op.selected=true; sel.appendChild(op); });
  document.getElementById('canvas-selected-info').textContent=o.name||o.type;
}
function clearProps() {
  document.getElementById('props-empty').classList.remove('hidden');
  document.getElementById('props-form').classList.add('hidden');
  document.getElementById('canvas-selected-info').textContent='-';
}
function applyProps() {
  if (!CANVAS.selected) return;
  const o=CANVAS.selected;
  o.label=document.getElementById('prop-label').value;
  o.rotation=((+document.getElementById('prop-rotation').value)||0);
  o.scale=+document.getElementById('prop-scale').value/100;
  o.color=document.getElementById('prop-color').value;
  o.note=document.getElementById('prop-note').value;
  o.personLink=document.getElementById('prop-person-link').value;
  delete o._preview;  // confirmat — nu mai e preview
  CANVAS.editMode = false;
  CANVAS.stagedOriginal = null;
  saveHistory(); drawCanvas();
  hideEditingIndicator();
  toast('✔ Salvat pe schiță','success');
}

function revertStagedChanges() {
  if (!CANVAS.selected) return;
  if (CANVAS.selected._preview) {
    // Era preview (neconfirmat) → șterge
    CANVAS.objects = CANVAS.objects.filter(o => o !== CANVAS.selected);
    CANVAS.selected = null; clearProps(); closeMobilePanel();
  } else if (CANVAS.stagedOriginal) {
    const orig = JSON.parse(CANVAS.stagedOriginal);
    Object.assign(CANVAS.selected, orig);
  }
  CANVAS.editMode = false;
  CANVAS.stagedOriginal = null;
  hideEditingIndicator();
  drawCanvas();
}

function showEditingIndicator() {
  let ind = document.getElementById('editing-indicator');
  if (!ind) {
    ind = document.createElement('div');
    ind.id = 'editing-indicator';
    ind.style.cssText = `position:fixed;top:60px;left:50%;transform:translateX(-50%);
      background:var(--accent);color:var(--bg-0);padding:6px 16px;border-radius:20px;
      font-family:var(--font-main);font-size:13px;font-weight:700;z-index:999;
      display:flex;gap:10px;align-items:center;box-shadow:0 4px 20px rgba(0,0,0,0.4);`;
    ind.innerHTML = `⚠️ Modificări nesalvate &nbsp;
      <button onclick="applyProps()" style="background:var(--bg-0);color:var(--accent);border:none;padding:3px 10px;border-radius:12px;font-weight:700;cursor:pointer;font-size:12px;">✔ Aplică</button>
      <button onclick="revertStagedChanges()" style="background:rgba(0,0,0,0.2);color:var(--bg-0);border:none;padding:3px 10px;border-radius:12px;cursor:pointer;font-size:12px;">✕ Anulează</button>`;
    document.body.appendChild(ind);
  }
  ind.style.display = 'flex';
}

function hideEditingIndicator() {
  const ind = document.getElementById('editing-indicator');
  if (ind) ind.style.display = 'none';
}

// Sync props panel → obiect live (fără saveHistory)
function syncPropsToObject(o) {
  const rv = document.getElementById('prop-rotation');
  const sv = document.getElementById('prop-scale');
  if (rv) { rv.value = Math.round(o.rotation||0); }
  if (sv) { sv.value = Math.round((o.scale||1)*100); document.getElementById('prop-scale-val').textContent=Math.round((o.scale||1)*100)+'%'; }
  // Sync mobile panel
  const mr = document.getElementById('mop-rotation');
  const ms = document.getElementById('mop-scale');
  if (mr) { mr.value = Math.round(o.rotation||0); document.getElementById('mop-rot-val').textContent=Math.round(o.rotation||0)+'°'; }
  if (ms) { ms.value = Math.round((o.scale||1)*100); document.getElementById('mop-scale-val').textContent=Math.round((o.scale||1)*100)+'%'; }
}

// Live rotate din slider (desktop)
function onRotationInput(val) {
  if (!CANVAS.selected) return;
  CANVAS.selected.rotation = +val;
  syncPropsToObject(CANVAS.selected);
  drawCanvas();
}

// Live scale din slider (desktop)
function onScaleInput(val) {
  if (!CANVAS.selected) return;
  CANVAS.selected.scale = +val/100;
  syncPropsToObject(CANVAS.selected);
  drawCanvas();
}

// ===== MOBILE PANEL =====
function openMobilePanel(o) {
  const panel = document.getElementById('mobile-obj-panel');
  if (!panel) return;
  document.getElementById('mop-emoji').textContent = o.emoji||'?';
  document.getElementById('mop-title').textContent = o.name||o.type;
  document.getElementById('mop-label').value = o.label||'';
  document.getElementById('mop-note').value = o.note||'';
  const rot = Math.round(o.rotation||0);
  document.getElementById('mop-rotation').value = rot;
  document.getElementById('mop-rot-val').textContent = rot+'°';
  const sc = Math.round((o.scale||1)*100);
  document.getElementById('mop-scale').value = sc;
  document.getElementById('mop-scale-val').textContent = sc+'%';
  panel.classList.remove('hidden');
}

function closeMobilePanel() {
  const panel = document.getElementById('mobile-obj-panel');
  if (panel) panel.classList.add('hidden');
}

function saveMobilePanel() {
  if (!CANVAS.selected) { closeMobilePanel(); return; }
  const o = CANVAS.selected;
  o.label = document.getElementById('mop-label').value;
  o.note = document.getElementById('mop-note').value;
  o.rotation = +document.getElementById('mop-rotation').value||0;
  o.scale = +document.getElementById('mop-scale').value/100;
  delete o._preview;
  CANVAS.editMode = false;
  CANVAS.stagedOriginal = null;
  saveHistory(); drawCanvas();
  closeMobilePanel();
  hideEditingIndicator();
  toast('✔ Salvat pe schiță','success');
}

function deleteMobileObj() {
  if (!CANVAS.selected) { closeMobilePanel(); return; }
  CANVAS.objects = CANVAS.objects.filter(o=>o!==CANVAS.selected);
  CANVAS.selected = null; clearProps(); closeMobilePanel();
  saveHistory(); drawCanvas();
}

function rotateObj(deg) {
  if (!CANVAS.selected) return;
  CANVAS.selected.rotation = (((CANVAS.selected.rotation||0)+deg)%360+360)%360;
  CANVAS.editMode = true;
  syncPropsToObject(CANVAS.selected);
  showEditingIndicator();
  drawCanvas();
}

function liveRotate(val) {
  if (!CANVAS.selected) return;
  CANVAS.selected.rotation = +val;
  CANVAS.editMode = true;
  document.getElementById('mop-rot-val').textContent = Math.round(+val)+'°';
  showEditingIndicator();
  drawCanvas();
}

function liveScale(val) {
  if (!CANVAS.selected) return;
  CANVAS.selected.scale = +val/100;
  CANVAS.editMode = true;
  document.getElementById('mop-scale-val').textContent = Math.round(+val)+'%';
  showEditingIndicator();
  drawCanvas();
}

function scaleObj(factor) {
  if (!CANVAS.selected) return;
  const ns = Math.max(0.2, Math.min(5, (CANVAS.selected.scale||1)*factor));
  CANVAS.selected.scale = ns;
  CANVAS.editMode = true;
  syncPropsToObject(CANVAS.selected);
  showEditingIndicator();
  drawCanvas();
}

// ===== MEASUREMENTS =====
function initMeasurements() {
  document.getElementById('btn-add-measure').addEventListener('click', () => openModal('modal-measure'));
  document.getElementById('btn-measure-save').addEventListener('click', () => {
    const desc=document.getElementById('measure-desc').value.trim();
    const val=parseFloat(document.getElementById('measure-val').value);
    const unit=document.getElementById('measure-unit').value;
    if (!desc||isNaN(val)) { toast('Completați toate câmpurile','error'); return; }
    APP.measurements.push({ id:uid(), desc, val, unit });
    renderMeasurements(); closeModal('modal-measure'); autosave();
  });
}
function renderMeasurements() {
  const list=document.getElementById('measurements-list');
  if (!APP.measurements.length) { list.innerHTML='<div class="measure-empty">Nicio măsurătoare</div>'; return; }
  list.innerHTML=APP.measurements.map(m=>`<div class="measure-item"><span class="mi-desc">${esc(m.desc)}</span><span class="mi-val">${m.val} ${m.unit}</span><button class="mi-del" onclick="delMeasure('${m.id}')">✕</button></div>`).join('');
}
window.delMeasure = id => { APP.measurements=APP.measurements.filter(m=>m.id!==id); renderMeasurements(); autosave(); };

// ===== LEAFLET MAP (zero API key) =====
function initMapTab() {
  // Initialize Leaflet map immediately — no key needed
  setTimeout(initLeafletMap, 300);

  document.getElementById('btn-gps-locate').addEventListener('click', startGPS);
  document.getElementById('btn-gps-stop').addEventListener('click', stopGPS);
  document.getElementById('btn-map-search').addEventListener('click', searchAddress);
  document.getElementById('map-search-input').addEventListener('keypress', e => { if(e.key==='Enter') searchAddress(); });
  document.getElementById('map-type-select').addEventListener('change', changeMapLayer);
  document.getElementById('btn-map-save-location').addEventListener('click', saveMapLocation);
  document.getElementById('btn-copy-coords').addEventListener('click', () => {
    if (APP.location.lat) { navigator.clipboard.writeText(`${APP.location.lat.toFixed(6)}, ${APP.location.lng.toFixed(6)}`); toast('Coordonate copiate','info'); }
    else toast('Nicio locație','error');
  });
  setTimeout(initOSMSketch, 600);
}

function initLeafletMap() {
  if (APP.leafletMap) return;
  // Default: Arad, Romania
  const lat = APP.location.lat || 46.1866, lng = APP.location.lng || 21.3123;

  APP.leafletMap = L.map('leaflet-map', {
    center: [lat, lng], zoom: 15,
    zoomControl: true,
    attributionControl: true,
  });

  // Start with satellite layer
  const tl = TILE_LAYERS.sat;
  APP.leafletTileLayer = L.tileLayer(tl.url, { attribution: tl.attr, maxZoom: 19 }).addTo(APP.leafletMap);

  // Accident location marker (red)
  APP.leafletMarker = L.circleMarker([lat, lng], {
    radius: 12, fillColor: '#ff4444', color: '#fff', weight: 3, fillOpacity: 0.95,
  }).addTo(APP.leafletMap).bindPopup('<b>Locul accidentului</b>');

  // Click on map = set location
  APP.leafletMap.on('click', e => {
    updateMapLocation(e.latlng.lat, e.latlng.lng);
    reverseGeocode(e.latlng.lat, e.latlng.lng);
  });

  // Force correct size
  APP.leafletMap.invalidateSize();
}

function changeMapLayer() {
  if (!APP.leafletMap) return;
  const type = document.getElementById('map-type-select').value;
  const tl = TILE_LAYERS[type] || TILE_LAYERS.osm;
  if (APP.leafletTileLayer) APP.leafletMap.removeLayer(APP.leafletTileLayer);
  APP.leafletTileLayer = L.tileLayer(tl.url, { attribution: tl.attr, maxZoom: 19 }).addTo(APP.leafletMap);
}

function startGPS() {
  if (!navigator.geolocation) { toast('GPS indisponibil pe acest dispozitiv','error'); return; }
  const st = document.getElementById('gps-status');
  st.textContent = 'Se caută GPS...'; st.className = 'gps-status searching';
  document.getElementById('btn-gps-locate').style.display = 'none';
  document.getElementById('btn-gps-stop').style.display = 'flex';

  APP.gpsWatchId = navigator.geolocation.watchPosition(
    pos => {
      const { latitude: la, longitude: lo, accuracy: ac } = pos.coords;
      updateMapLocation(la, lo);
      reverseGeocode(la, lo);
      st.textContent = `GPS activ ±${Math.round(ac)}m`; st.className = 'gps-status active';
      document.getElementById('map-accuracy-display').textContent = `±${Math.round(ac)} m`;
      // Accuracy circle
      if (APP.leafletAccCircle) APP.leafletMap.removeLayer(APP.leafletAccCircle);
      APP.leafletAccCircle = L.circle([la, lo], { radius: ac, color: '#00c8ff', fillColor: '#00c8ff', fillOpacity: 0.08, weight: 1 }).addTo(APP.leafletMap);
      APP.leafletMap.setView([la, lo], Math.max(APP.leafletMap.getZoom(), 17));
    },
    err => { st.textContent='Eroare GPS'; st.className='gps-status'; toast('Eroare GPS: '+err.message,'error'); },
    { enableHighAccuracy: true, maximumAge: 4000, timeout: 15000 }
  );
}

function stopGPS() {
  if (APP.gpsWatchId) navigator.geolocation.clearWatch(APP.gpsWatchId);
  if (APP.leafletAccCircle) { APP.leafletMap.removeLayer(APP.leafletAccCircle); APP.leafletAccCircle = null; }
  document.getElementById('gps-status').textContent='GPS oprit'; document.getElementById('gps-status').className='gps-status';
  document.getElementById('btn-gps-locate').style.display='flex'; document.getElementById('btn-gps-stop').style.display='none';
  toast('GPS oprit','info');
}

function updateMapLocation(la, lo) {
  APP.location.lat=la; APP.location.lng=lo;
  document.getElementById('map-coords-display').textContent=`${la.toFixed(6)}, ${lo.toFixed(6)}`;
  if (APP.leafletMap && APP.leafletMarker) {
    APP.leafletMarker.setLatLng([la, lo]);
    APP.leafletMap.panTo([la, lo]);
  }
}

async function reverseGeocode(la, lo) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${lo}&addressdetails=1&accept-language=ro`, { headers: { 'User-Agent': 'ScetchACC/2.1' } });
    const d = await r.json();
    const addr = d.display_name || `${la.toFixed(5)}, ${lo.toFixed(5)}`;
    APP.location.address = addr;
    document.getElementById('map-address-display').textContent = addr.length>70 ? addr.slice(0,70)+'…' : addr;
    const nf = document.getElementById('note-location'); if (nf && !nf.value) nf.value = addr;
  } catch(e) {}
}

async function searchAddress() {
  const q = document.getElementById('map-search-input').value.trim();
  if (!q) return;
  toast('Se caută...','info');
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&accept-language=ro&countrycodes=ro`, { headers: { 'User-Agent': 'ScetchACC/2.1' } });
    const d = await r.json();
    if (d.length) {
      const { lat, lon, display_name } = d[0];
      const la = parseFloat(lat), lo = parseFloat(lon);
      updateMapLocation(la, lo);
      APP.location.address = display_name;
      document.getElementById('map-address-display').textContent = display_name.slice(0,70);
      document.getElementById('map-accuracy-display').textContent = 'Căutare text';
      APP.leafletMap.setView([la, lo], 17);
      toast('Adresă găsită','success');
    } else toast('Adresă negăsită. Încercați mai detaliat.','error');
  } catch(e) { toast('Eroare căutare','error'); }
}

function saveMapLocation() {
  if (!APP.location.lat) { toast('Nicio locație de salvat','error'); return; }
  const f = document.getElementById('note-location');
  if (f) f.value = APP.location.address || `${APP.location.lat.toFixed(6)}, ${APP.location.lng.toFixed(6)}`;
  autosave(); toast('Locație salvată în notițe','success');
}

// ===== PERSONS =====
const ROLE_ICO = { conducator:'🚗', pasager:'👤', pieton:'🚶', biciclist:'🚲', martor:'👁', alt:'👤' };
const ROLE_LBL = { conducator:'Conducător auto', pasager:'Pasager', pieton:'Pieton', biciclist:'Biciclist', martor:'Martor', alt:'Alt rol' };

function initPersonsTab() {
  document.getElementById('btn-add-person').addEventListener('click', () => { APP.currentPersonEdit=null; clearPersonForm(); document.getElementById('modal-person-title').textContent='Adaugă Persoană'; openModal('modal-person'); });
  document.getElementById('btn-person-save').addEventListener('click', savePerson);
}
function clearPersonForm() {
  ['person-role','person-vehicle','person-name','person-cnp','person-dob','person-address','person-phone','person-license','person-license-exp','person-plate','person-insurance','person-insurance-exp','person-injuries','person-notes'].forEach(id => { const e=document.getElementById(id); if(e) e.value=e.tagName==='SELECT'?e.options[0]?.value:''; });
}
function savePerson() {
  const name = document.getElementById('person-name').value.trim();
  if (!name) { toast('Introduceți numele persoanei','error'); return; }
  const p = {
    id: APP.currentPersonEdit?.id||uid(),
    role: document.getElementById('person-role').value,
    vehicle: document.getElementById('person-vehicle').value,
    name, cnp: document.getElementById('person-cnp').value,
    dob: document.getElementById('person-dob').value,
    address: document.getElementById('person-address').value,
    phone: document.getElementById('person-phone').value,
    license: document.getElementById('person-license').value,
    licenseExp: document.getElementById('person-license-exp').value,
    plate: document.getElementById('person-plate').value,
    insurance: document.getElementById('person-insurance').value,
    insuranceExp: document.getElementById('person-insurance-exp').value,
    injuries: document.getElementById('person-injuries').value,
    notes: document.getElementById('person-notes').value,
  };
  if (APP.currentPersonEdit) { const i=APP.persons.findIndex(x=>x.id===p.id); if(i!==-1)APP.persons[i]=p; }
  else APP.persons.push(p);
  renderPersons(); updatePersonSelects(); closeModal('modal-person'); autosave(); toast('Persoană salvată','success');
}
window.editPerson = id => {
  const p=APP.persons.find(x=>x.id===id); if(!p) return;
  APP.currentPersonEdit=p; document.getElementById('modal-person-title').textContent='Editează Persoană';
  Object.entries({ 'person-role':p.role,'person-vehicle':p.vehicle,'person-name':p.name,'person-cnp':p.cnp,'person-dob':p.dob,'person-address':p.address,'person-phone':p.phone,'person-license':p.license,'person-license-exp':p.licenseExp,'person-plate':p.plate,'person-insurance':p.insurance,'person-insurance-exp':p.insuranceExp,'person-injuries':p.injuries,'person-notes':p.notes }).forEach(([id,v])=>{ const e=document.getElementById(id); if(e) e.value=v||''; });
  openModal('modal-person');
};
window.deletePerson = id => { APP.persons=APP.persons.filter(p=>p.id!==id); renderPersons(); updatePersonSelects(); autosave(); toast('Persoană ștearsă','info'); };

function renderPersons() {
  const list=document.getElementById('persons-list');
  if (!APP.persons.length) { list.innerHTML='<div class="persons-empty"><div class="pe-icon">👥</div><p>Nicio persoană adăugată</p><p class="pe-sub">Apăsați butonul „Adaugă Persoană" pentru a înregistra participanții la accident</p></div>'; return; }
  list.innerHTML=APP.persons.map(p=>`<div class="person-card"><div class="person-card-icon">${ROLE_ICO[p.role]||'👤'}</div><div class="person-card-body"><div class="person-card-name">${esc(p.name)}</div><div><span class="person-card-role">${ROLE_LBL[p.role]||p.role}</span></div><div class="person-card-details">${p.plate?`<div class="pcd"><strong>${esc(p.plate)}</strong><span>Nr. înmatr.</span></div>`:''} ${p.phone?`<div class="pcd"><strong>${esc(p.phone)}</strong><span>Telefon</span></div>`:''} ${p.license?`<div class="pcd"><strong>${esc(p.license)}</strong><span>Permis</span></div>`:''} ${p.injuries?`<div class="pcd" style="flex-basis:100%"><strong style="color:#ff6666">${esc(p.injuries)}</strong><span>Leziuni</span></div>`:''}</div></div><div class="card-actions"><button class="card-btn" onclick="editPerson('${p.id}')">✏️ Editează</button><button class="card-btn danger" onclick="deletePerson('${p.id}')">🗑 Șterge</button></div></div>`).join('');
}
function updatePersonSelects() {
  const sel=document.getElementById('test-person');
  sel.innerHTML='<option value="">— selectați persoana —</option>';
  APP.persons.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; sel.appendChild(o); });
  const ppl=document.getElementById('prop-person-link'); if(ppl) { const c=ppl.value; ppl.innerHTML='<option value="">— nelegat —</option>'; APP.persons.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; if(p.id===c)o.selected=true; ppl.appendChild(o); }); }
}

// ===== TESTS =====
const TEST_ICO = { etilotest:'💨', drugtest:'🧪', alcoolemie:'🩸', alt:'🔬' };
const TEST_LBL = { etilotest:'Etilotest', drugtest:'Drugtest', alcoolemie:'Alcoolemie sânge', alt:'Alt test' };

function initTestsTab() {
  document.getElementById('btn-add-test').addEventListener('click', () => { APP.currentTestEdit=null; clearTestForm(); openModal('modal-test'); });
  document.getElementById('btn-test-save').addEventListener('click', saveTest);
}
function clearTestForm() {
  ['test-type','test-person','test-date','test-time','test-location','test-result','test-device','test-device-serial','test-notes'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  ['drug-thc','drug-coc','drug-opi','drug-amp','drug-bzo','drug-met','test-refused'].forEach(id=>{ const e=document.getElementById(id); if(e) e.checked=false; });
}
function saveTest() {
  const result=document.getElementById('test-result').value.trim();
  if (!result) { toast('Introduceți rezultatul testului','error'); return; }
  const drugs=[]; ['drug-thc','drug-coc','drug-opi','drug-amp','drug-bzo','drug-met'].forEach(id=>{ if(document.getElementById(id).checked) drugs.push(id.replace('drug-','').toUpperCase()); });
  const pid=document.getElementById('test-person').value;
  const pname=APP.persons.find(p=>p.id===pid)?.name||document.getElementById('test-location').value||'—';
  const test={
    id:APP.currentTestEdit?.id||uid(),
    type:document.getElementById('test-type').value,
    result, personId:pid, personName:pname,
    date:document.getElementById('test-date').value,
    time:document.getElementById('test-time').value,
    location:document.getElementById('test-location').value,
    device:document.getElementById('test-device').value,
    deviceSerial:document.getElementById('test-device-serial').value,
    drugs, refused:document.getElementById('test-refused').checked,
    notes:document.getElementById('test-notes').value,
  };
  if (APP.currentTestEdit) { const i=APP.tests.findIndex(t=>t.id===test.id); if(i!==-1)APP.tests[i]=test; }
  else APP.tests.push(test);
  renderTests(); closeModal('modal-test'); autosave(); toast('Test salvat','success');
}
window.deleteTest = id => { APP.tests=APP.tests.filter(t=>t.id!==id); renderTests(); autosave(); toast('Test șters','info'); };
function renderTests() {
  const list=document.getElementById('tests-list');
  if (!APP.tests.length) { list.innerHTML='<div class="tests-empty"><div class="te-icon">🧪</div><p>Niciun test înregistrat</p></div>'; return; }
  list.innerHTML=APP.tests.map(t=>{
    const r=t.result.toUpperCase();
    let bc='val';
    if(r.includes('POZITIV')||r.includes('POSITIV')||(parseFloat(r)>0&&!isNaN(parseFloat(r)))) bc='pos';
    if(r.includes('NEGATIV')||r==='0'||r==='0.00') bc='neg';
    return `<div class="test-card"><div class="test-card-icon">${TEST_ICO[t.type]||'🧪'}</div><div class="test-card-body"><div class="test-card-name">${TEST_LBL[t.type]||t.type}</div><div class="test-card-details"><div class="tcd"><strong>${esc(t.personName)}</strong><span>Persoana</span></div>${t.date?`<div class="tcd"><strong>${t.date} ${t.time||''}</strong><span>Data/ora</span></div>`:''} ${t.location?`<div class="tcd"><strong>${esc(t.location)}</strong><span>Poziție</span></div>`:''} ${t.device?`<div class="tcd"><strong>${esc(t.device)}</strong><span>Dispozitiv</span></div>`:''} ${t.drugs.length?`<div class="tcd"><strong style="color:#ff6666">${t.drugs.join(', ')}</strong><span>Substanțe</span></div>`:''} ${t.refused?`<div class="tcd"><strong style="color:#ff6666">A REFUZAT TESTUL</strong></div>`:''}</div>${t.notes?`<div style="font-size:11px;color:var(--text-3);margin-top:4px">${esc(t.notes)}</div>`:''}</div><div class="card-actions"><span class="test-result-badge ${bc}">${esc(t.result)}</span><button class="card-btn danger" onclick="deleteTest('${t.id}')">🗑 Șterge</button></div></div>`;
  }).join('');
}

// ===== MODALS =====
function initModals() {
  document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.close)));
  document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if(e.target===o) closeModal(o.id); }));
}
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function showConfirm(text, ok) {
  document.getElementById('modal-confirm-text').textContent=text;
  document.getElementById('btn-confirm-ok').onclick=()=>{ ok(); closeModal('modal-confirm'); };
  openModal('modal-confirm');
}

// ===== PDF EXPORT =====
function initPDFExport() {
  document.getElementById('btn-save-pdf').addEventListener('click', exportPDF);
}

function exportPDF() {
  toast('Se generează PDF...','info');
  const { jsPDF } = window.jspdf;
  if (!jsPDF) { toast('Eroare: jsPDF nu a fost încărcat','error'); return; }
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const W=210, H=297, M=15;
  let y=M;

  const addHdr = () => {
    doc.setFillColor(10,22,40); doc.rect(0,0,W,22,'F');
    doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.setTextColor(232,176,0);
    doc.text('SCHIȚĂ ACCIDENT RUTIER',M,14);
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(150,180,200);
    doc.text(`Dosar: ${APP.incidentId}   |   ${new Date().toLocaleDateString('ro-RO')}   |   XMorariu | contact@morariuandreiraul.ro`, M, 20);
    y=30;
  };
  const chk = (n=15) => { if(y+n>H-M){ doc.addPage(); y=M; addHdr(); } };
  const sec = (title, num) => { chk(12); doc.setFillColor(20,40,80); doc.rect(M,y,W-2*M,7,'F'); doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(232,176,0); doc.text(`${num}. ${title}`,M+3,y+5); y+=10; };

  addHdr();

  // Date dosar
  sec('DATE DOSAR','I');
  doc.autoTable({ startY:y, margin:{left:M,right:M},
    body:[
      ['Nr. Dosar',document.getElementById('note-dosar').value||APP.incidentId,'Data',document.getElementById('note-date').value||'—'],
      ['Ora',document.getElementById('note-time').value||'—','Lucrător rutier',document.getElementById('note-officer').value||'—'],
      ['Meteo',document.getElementById('note-weather').value,'Vizibilitate',document.getElementById('note-visibility').value],
      ['Stare carosabil',document.getElementById('note-road-cond').value,'Iluminat stradal',document.getElementById('note-lighting').value],
    ],
    styles:{fontSize:9,cellPadding:2}, alternateRowStyles:{fillColor:[240,245,255]},
    columnStyles:{0:{fontStyle:'bold',fillColor:[230,238,255],cellWidth:42},2:{fontStyle:'bold',fillColor:[230,238,255],cellWidth:42}},
  });
  y = doc.lastAutoTable.finalY+3;
  const loc = document.getElementById('note-location').value||APP.location.address||'—';
  doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(40,40,40); doc.text('Locul accidentului:',M,y+4);
  doc.setFont('helvetica','normal');
  const ll = doc.splitTextToSize(loc, W-M-48); doc.text(ll,M+46,y+4); y+=ll.length*5+3;
  if (APP.location.lat) { doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(80,80,80); doc.text(`GPS: ${APP.location.lat.toFixed(6)}, ${APP.location.lng.toFixed(6)}`,M,y); y+=5; }

  // Tipul accidentului
  sec('TIPUL ACCIDENTULUI','II');
  const ats=[];
  [['at-coliziune','Coliziune frontală'],['at-coliziune-spate','Coliziune spate'],['at-lateral','Impact lateral'],['at-pieton','Lovire pieton'],['at-animal','Lovire animal'],['at-rasturnat','Răsturnare'],['at-iesire','Ieșire din carosabil'],['at-tren','Impact cu tren/tramvai'],['at-bicicleta','Coliziune biciclist']].forEach(([id,lb])=>{ if(document.getElementById(id)?.checked) ats.push(lb); });
  const altT=document.getElementById('at-alta-text')?.value; if(document.getElementById('at-alta')?.checked&&altT) ats.push('Alt tip: '+altT);
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(40,40,40);
  const atLines = doc.splitTextToSize(ats.length?ats.join(' • '):'Nespecificat', W-2*M);
  doc.text(atLines,M,y); y+=atLines.length*5+5;

  // Schiță
  sec('SCHIȚĂ LOCUL ACCIDENTULUI','III');
  try {
    const ci=document.getElementById('sketch-canvas').toDataURL('image/jpeg',0.9);
    const cw=W-2*M, ch=cw*(CANVAS.el.height/CANVAS.el.width), maxH=100, fh=Math.min(ch,maxH), fw=fh*(CANVAS.el.width/CANVAS.el.height);
    doc.addImage(ci,'JPEG',M+(cw-fw)/2,y,fw,fh);
    doc.setDrawColor(100,100,100); doc.setLineWidth(0.4); doc.rect(M+(cw-fw)/2,y,fw,fh);
    y+=fh+5;
  } catch(e) { doc.setFontSize(9); doc.setTextColor(100,100,100); doc.text('[Canvas nedisponibil]',M,y); y+=8; }

  // Măsurători
  if (APP.measurements.length) {
    sec('MĂSURĂTORI','IV');
    doc.autoTable({ startY:y, margin:{left:M,right:M}, head:[['Nr.','Descriere','Valoare']], body:APP.measurements.map((m,i)=>[i+1,m.desc,`${m.val} ${m.unit}`]), styles:{fontSize:9,cellPadding:2}, headStyles:{fillColor:[40,80,160],textColor:255}, alternateRowStyles:{fillColor:[240,245,255]} });
    y=doc.lastAutoTable.finalY+5;
  }

  // Persoane
  if (APP.persons.length) {
    sec(`PERSOANE IMPLICATE (${APP.persons.length})`, 'V');
    APP.persons.forEach((p,i) => {
      chk(35); doc.setFillColor(230,238,255); doc.rect(M,y,W-2*M,6,'F');
      doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(20,60,120);
      doc.text(`${i+1}. ${p.name} — ${ROLE_LBL[p.role]||p.role}`,M+2,y+4); y+=8;
      doc.autoTable({ startY:y, margin:{left:M,right:M},
        body:[['CNP',p.cnp||'—','Data nașterii',p.dob||'—'],['Adresă',p.address||'—','Telefon',p.phone||'—'],['Nr. înmatriculare',p.plate||'—','Permis',p.license||'—'],['Permis valabil',p.licenseExp||'—','Asigurare RCA',p.insurance||'—'],['Asig. valabilă',p.insuranceExp||'—','Vehicul',p.vehicle||'—']],
        styles:{fontSize:8.5,cellPadding:1.5}, columnStyles:{0:{fontStyle:'bold',fillColor:[240,248,255],cellWidth:38},2:{fontStyle:'bold',fillColor:[240,248,255],cellWidth:38}},
      });
      y=doc.lastAutoTable.finalY;
      if (p.injuries) { doc.setFontSize(8.5); doc.setFont('helvetica','bold'); doc.setTextColor(180,0,0); doc.text('Leziuni: ',M+2,y+4); doc.setFont('helvetica','normal'); doc.setTextColor(40,40,40); const il=doc.splitTextToSize(p.injuries,W-M-35); doc.text(il,M+20,y+4); y+=il.length*4+2; }
      y+=4;
    });
  }

  // Teste
  if (APP.tests.length) {
    sec(`TESTE EFECTUATE (${APP.tests.length})`, 'VI');
    doc.autoTable({ startY:y, margin:{left:M,right:M},
      head:[['Tip','Persoana','Data/Ora','Dispozitiv','Rezultat','Poziție','Obs.']],
      body:APP.tests.map(t=>[TEST_LBL[t.type]||t.type, t.personName, `${t.date||'—'} ${t.time||''}`, t.device+(t.deviceSerial?`\n(${t.deviceSerial})`:'')||'—', t.refused?'A REFUZAT':t.result, t.location||'—', (t.drugs.length?'Subs: '+t.drugs.join(', ')+'. ':'')+t.notes]),
      styles:{fontSize:8,cellPadding:1.5}, headStyles:{fillColor:[40,80,160],textColor:255,fontSize:8}, alternateRowStyles:{fillColor:[240,245,255]}, columnStyles:{4:{fontStyle:'bold'}},
    });
    y=doc.lastAutoTable.finalY+5;
  }

  // Victime
  sec('VICTIME','VII');
  doc.autoTable({ startY:y, margin:{left:M,right:M},
    body:[
      ['Persoane decedate',document.getElementById('note-dead').value,'Răniți grav',document.getElementById('note-injured-heavy').value,'Răniți ușor',document.getElementById('note-injured-light').value],
      ['Ambulanță',document.getElementById('svc-ambulanta').checked?'DA':'NU','Pompieri',document.getElementById('svc-pompieri').checked?'DA':'NU','SMURD',document.getElementById('svc-smurd').checked?'DA':'NU'],
    ],
    styles:{fontSize:9,cellPadding:2}, columnStyles:{0:{fontStyle:'bold',fillColor:[240,248,255]},2:{fontStyle:'bold',fillColor:[240,248,255]},4:{fontStyle:'bold',fillColor:[240,248,255]}},
  });
  y=doc.lastAutoTable.finalY+5;

  // Descriere
  const desc=document.getElementById('note-description').value;
  const obs=document.getElementById('note-final').value;
  if (desc||obs) {
    sec('DESCRIERE ȘI OBSERVAȚII','VIII');
    if (desc) {
      doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(40,40,40); doc.text('Descriere eveniment:',M,y); y+=5;
      doc.setFont('helvetica','normal');
      doc.splitTextToSize(desc,W-2*M).forEach(l=>{ chk(6); doc.text(l,M,y); y+=4.5; }); y+=3;
    }
    if (obs) {
      chk(15); doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(40,40,40); doc.text('Observații finale:',M,y); y+=5;
      doc.setFont('helvetica','normal');
      doc.splitTextToSize(obs,W-2*M).forEach(l=>{ chk(6); doc.text(l,M,y); y+=4.5; });
    }
  }

  // Footer semnături pe fiecare pagină
  for (let i=1; i<=doc.internal.getNumberOfPages(); i++) {
    doc.setPage(i);
    doc.setDrawColor(200,200,200); doc.setLineWidth(0.3); doc.line(M,H-28,W-M,H-28);
    doc.setFontSize(7.5); doc.setFont('helvetica','normal'); doc.setTextColor(120,120,120);
    doc.text(`Pagina ${i} din ${doc.internal.getNumberOfPages()}  |  Dosar: ${APP.incidentId}  |  ScetchACC v2.1 — XMorariu | contact@morariuandreiraul.ro  |  Hartă: OpenStreetMap`,M,H-23);
    doc.line(M,H-17,80,H-17); doc.line(W-80,H-17,W-M,H-17);
    doc.text('Lucrător rutier (semnătură)',M,H-13); doc.text('Supervizor (semnătură)',W-80,H-13);
  }

  const fname=`Accident_${APP.incidentId}_${new Date().toLocaleDateString('ro-RO').replace(/\./g,'-')}.pdf`;
  doc.save(fname);
  toast('PDF salvat: '+fname,'success');
}

// ===== STORAGE =====
function autosave() {
  try {
    localStorage.setItem('scetchacc_v2', JSON.stringify({
      incidentId:APP.incidentId, persons:APP.persons, tests:APP.tests,
      measurements:APP.measurements, location:APP.location, canvas:CANVAS.objects,
      notes:{
        dosar:v('note-dosar'), date:v('note-date'), time:v('note-time'), officer:v('note-officer'),
        location:v('note-location'), weather:v('note-weather'), visibility:v('note-visibility'),
        roadCond:v('note-road-cond'), lighting:v('note-lighting'),
        description:v('note-description'), final:v('note-final'),
        dead:v('note-dead'), injuredHeavy:v('note-injured-heavy'), injuredLight:v('note-injured-light'),
      }
    }));
  } catch(e) {}
}
function v(id) { return document.getElementById(id)?.value||''; }

function loadFromStorage() {
  try {
    const raw=localStorage.getItem('scetchacc_v2'); if(!raw) return;
    const d=JSON.parse(raw);
    if (d.incidentId) { APP.incidentId=d.incidentId; document.getElementById('incident-id-display').textContent=APP.incidentId; }
    if (d.persons) { APP.persons=d.persons; renderPersons(); updatePersonSelects(); }
    if (d.tests) { APP.tests=d.tests; renderTests(); }
    if (d.measurements) { APP.measurements=d.measurements; renderMeasurements(); }
    if (d.location) APP.location=d.location;
    if (d.canvas) { CANVAS.objects=d.canvas; drawCanvas(); }
    if (d.notes) {
      const map={'note-dosar':'dosar','note-date':'date','note-time':'time','note-officer':'officer','note-location':'location','note-weather':'weather','note-visibility':'visibility','note-road-cond':'roadCond','note-lighting':'lighting','note-description':'description','note-final':'final','note-dead':'dead','note-injured-heavy':'injuredHeavy','note-injured-light':'injuredLight'};
      Object.entries(map).forEach(([eid,key])=>{ const e=document.getElementById(eid); if(e&&d.notes[key]!==undefined) e.value=d.notes[key]||''; });
    }
  } catch(e) {}
  // autosave on note changes
  ['note-dosar','note-date','note-time','note-officer','note-location','note-weather','note-visibility','note-road-cond','note-lighting','note-description','note-final','note-dead','note-injured-heavy','note-injured-light'].forEach(id=>{ const e=document.getElementById(id); if(e) e.addEventListener('change',autosave); });
}

function resetAll() {
  APP.incidentId=generateId(); APP.persons=[]; APP.tests=[]; APP.measurements=[];
  APP.location={lat:null,lng:null,address:''};
  CANVAS.objects=[]; CANVAS.selected=null;
  document.getElementById('incident-id-display').textContent=APP.incidentId;
  renderPersons(); renderTests(); renderMeasurements(); updatePersonSelects(); clearProps();
  localStorage.removeItem('scetchacc_v2');
  CANVAS.history=[]; CANVAS.historyIdx=-1; saveHistory(); drawCanvas();
  toast('Dosar nou: '+APP.incidentId,'success');
}

// ===== TOAST =====
function toast(msg, type='info') {
  const c=document.getElementById('toast-container'), t=document.createElement('div');
  t.className=`toast ${type}`; t.textContent=msg; c.appendChild(t);
  setTimeout(()=>{ t.style.cssText='opacity:0;transform:translateX(20px);transition:.3s'; setTimeout(()=>t.remove(),400); },3000);
}

// ===== UTILS =====
function uid() { return Math.random().toString(36).slice(2,10)+Date.now().toString(36); }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }


// ===== OSM SCHIȚĂ AUTOMATĂ v2.4 =====
// Overpass API → Drumuri + Clădiri + Semafoare + Treceri + Indicatoare

const OSM = {
  scale: 0,
  originLat: 0, originLng: 0,
  canvasOffsetX: 0, canvasOffsetY: 0,
};

function geo2px(lat, lng) {
  const R = 6371000;
  const dLat = (lat - OSM.originLat) * Math.PI / 180;
  const dLng = (lng - OSM.originLng) * Math.PI / 180;
  const avgLat = (lat + OSM.originLat) / 2 * Math.PI / 180;
  const x = dLng * R * Math.cos(avgLat) * OSM.scale;
  const y = -dLat * R * OSM.scale;
  return { x: OSM.canvasOffsetX + x, y: OSM.canvasOffsetY + y };
}

function getLanes(tags) {
  if (tags.lanes) return Math.max(1, parseInt(tags.lanes) || 1);
  const hw = tags.highway || '';
  if (hw === 'motorway' || hw === 'trunk') return 2;
  if (hw === 'primary' || hw === 'secondary') return 2;
  return 1;
}

function getRoadWidthM(tags) {
  if (tags.width) return Math.max(2, parseFloat(tags.width) || 6);
  const hw = tags.highway || '';
  const lanes = getLanes(tags);
  const lw = { motorway:4.0,trunk:3.75,primary:3.5,secondary:3.25,
               tertiary:3.0,residential:3.0,service:2.5,
               footway:1.8,path:1.5,cycleway:2.0,pedestrian:4.0,living_street:3.5 };
  return lanes * (lw[hw] || 3.0);
}

function getRoadColors(hw) {
  const bg = { motorway:'#0d2a4a',trunk:'#0d2a1a',primary:'#0d0d0d',
               secondary:'#111',tertiary:'#111',residential:'#0d0d0d',
               service:'#0a0a0a',footway:'#1a0a00',cycleway:'#001a22',default:'#0d0d0d' };
  const fg = { motorway:'#4b9cd3',trunk:'#3a9a55',primary:'#aaa',
               secondary:'#999',tertiary:'#888',residential:'#777',
               service:'#666',footway:'#b8865a',cycleway:'#4488aa',
               pedestrian:'#aaa87a',default:'#6e6e6e' };
  return { bg: bg[hw]||bg.default, fg: fg[hw]||fg.default };
}

async function queryOverpassForArea(lat, lng, radiusMeters) {
  const d = radiusMeters / 111000;
  const bbox = `${lat-d},${lng-d*1.4},${lat+d},${lng+d*1.4}`;
  const q = `[out:json][timeout:30];
(
  way["highway"](${bbox});
  way["junction"="roundabout"](${bbox});
  node["highway"~"traffic_signals|stop|crossing|give_way|mini_roundabout"](${bbox});
  node["railway"="level_crossing"](${bbox});
  way["building"](${bbox});
  node["amenity"~"bus_stop|taxi"](${bbox});
);
out body;>;out skel qt;`;
  const r = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`,
    { headers: {'User-Agent':'ScetchACC/2.4'} });
  if (!r.ok) throw new Error(`Overpass HTTP ${r.status}`);
  return r.json();
}

async function generateSketchFromOSM(lat, lng, radiusMeters) {
  try {
    // Trec pe schiță PRIMUL — ca canvas-ul să aibă dimensiuni corecte
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    document.querySelector('[data-tab="sketch"]').classList.add('active');
    document.getElementById('tab-sketch').classList.add('active');
    resizeCanvas();
    await new Promise(r=>setTimeout(r,120));

    toast('⏳ Se descarcă OSM... (5-15 sec)', 'info');
    const data = await queryOverpassForArea(lat, lng, radiusMeters);

    // Index noduri
    const nodes = {};
    data.elements.filter(e=>e.type==='node').forEach(n=>{ nodes[n.id]=n; });

    // Parametri conversie
    OSM.originLat = lat; OSM.originLng = lng;
    OSM.canvasOffsetX = CANVAS.width / 2;
    OSM.canvasOffsetY = CANVAS.height / 2;
    // Scale: pixeli per metru — adaptat la raza aleasă
    OSM.scale = 8.0;  // FIX: 8px per metru → bandă = 28px la zoom 1.0

    const newObjs = [];

    // ── A. CLĂDIRI ──
    const buildings = data.elements.filter(e=>e.type==='way' && e.tags?.building);
    for (const bld of buildings) {
      if (!bld.nodes || bld.nodes.length < 3) continue;
      const coords = bld.nodes.map(nid=>nodes[nid]).filter(Boolean);
      if (coords.length < 3) continue;
      const pts = coords.map(n=>geo2px(n.lat, n.lon));
      const tags = bld.tags || {};
      const name = tags['addr:street']
        ? `${tags['addr:street']} ${tags['addr:housenumber']||''}`.trim()
        : (tags.name || tags['addr:housenumber'] || '');
      newObjs.push({
        id: uid(), type: 'building_poly',
        pts, osmGenerated: true,
        name, tags,
        color: '#2a3a4a', borderColor: '#3a5a7a',
      });
    }

    // ── B. DRUMURI (sortat: mici primul, mari deasupra) ──
    const hwZ = ['footway','path','cycleway','service','residential','living_street',
                 'tertiary','secondary','primary','trunk','motorway'];
    const ways = data.elements.filter(e=>e.type==='way' && e.tags?.highway);
    ways.sort((a,b)=>hwZ.indexOf(a.tags.highway||'')-hwZ.indexOf(b.tags.highway||''));

    for (const way of ways) {
      if (!way.nodes || way.nodes.length < 2) continue;
      const coords = way.nodes.map(nid=>nodes[nid]).filter(Boolean);
      if (coords.length < 2) continue;
      const tags = way.tags || {};
      const hw = tags.highway || '';
      const isRb = tags.junction === 'roundabout';
      // Skip micro-detalii la zone mari
      if (radiusMeters > 200 && (hw==='footway'||hw==='path') && !isRb) continue;
      const pts = coords.map(n=>geo2px(n.lat, n.lon));
      const roadWpx = getRoadWidthM(tags) * OSM.scale;
      const { bg, fg } = getRoadColors(hw);
      newObjs.push({
        id: uid(), type: 'road_poly', osmGenerated: true,
        pts, roadWidthPx: roadWpx,
        lanes: getLanes(tags), isOneway: tags.oneway==='yes'||isRb,
        hw, tags, name: tags.name||tags['name:ro']||'',
        color: fg, bgColor: bg,
      });
    }

    // ── C. SENS GIRATORIU ──
    const roundabouts = ways.filter(w=>w.tags?.junction==='roundabout');
    for (const rb of roundabouts) {
      if (!rb.nodes || rb.nodes.length < 3) continue;
      const coords = rb.nodes.map(nid=>nodes[nid]).filter(Boolean);
      if (coords.length < 3) continue;
      const pts = coords.map(n=>geo2px(n.lat, n.lon));
      const cx = pts.reduce((s,p)=>s+p.x,0)/pts.length;
      const cy = pts.reduce((s,p)=>s+p.y,0)/pts.length;
      const r  = pts.reduce((s,p)=>s+Math.hypot(p.x-cx,p.y-cy),0)/pts.length;
      const tags = rb.tags || {};
      newObjs.push({
        id: uid(), type: 'roundabout', osmGenerated: true,
        x: cx-r, y: cy-r, w: r*2, h: r*2,
        cx, cy, r, lanes: getLanes(tags), tags,
        name: tags.name || '',
      });
    }

    // Semafoare/treceri/indicatoare — excluse din generare automată
    // Se plasează manual din toolbar după zoom

    // ── E. CENTRUL / LOCUL ACCIDENTULUI ──
    const { x: cx0, y: cy0 } = geo2px(lat, lng);
    newObjs.push({
      id: uid(), type: 'impact-mark',
      x: cx0-16, y: cy0-16, w: 32, h: 32,
      rotation: 0, scale: 1.2,
      emoji: '💥', name: 'Punct impact', label: 'ACCIDENT',
      color: '#ff4444', note: '', personLink: '',
      osmGenerated: true,
    });

    // Înlocuiesc obiectele OSM anterioare
    CANVAS.objects = CANVAS.objects.filter(o=>!o.osmGenerated);
    CANVAS.objects = [...newObjs, ...CANVAS.objects];

    // Zoom adaptat: raza să ocupe ~40% din canvas
    const canvasSize = Math.min(CANVAS.width, CANVAS.height) || 800;
    const radiusPx = radiusMeters * OSM.scale;
    const initZoom = Math.min(1.5, Math.max(0.08, (canvasSize * 0.40) / radiusPx));
    CANVAS.zoom = initZoom;
    // Centrează: world origin (canvasOffsetX/Y) să apară la centrul ecranului
    // screen = world * zoom + pan  =>  pan = screenCenter - worldCenter * zoom
    CANVAS.panX = (CANVAS.width  / 2) - (OSM.canvasOffsetX * initZoom);
    CANVAS.panY = (CANVAS.height / 2) - (OSM.canvasOffsetY * initZoom);
    document.getElementById('canvas-zoom-display').textContent = Math.round(initZoom*100)+'%';

    saveHistory();
    drawCanvas();

    const nR = ways.length, nB = buildings.length;
    toast(`✅ ${nR} drumuri · ${nB} clădiri  |  Pinch zoom + 1 deget pan`, 'success');

  } catch(err) {
    console.error('OSM sketch error:', err);
    toast('Eroare OSM: ' + err.message, 'error');
  }
}

// ── DRAW BUILDING_POLY ──
function drawBuildingPoly(ctx, o) {
  const { pts } = o;
  if (!pts || pts.length < 3) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = o.color || '#2a3a4a';
  ctx.fill();
  ctx.strokeStyle = o.borderColor || '#4a7a9a';
  ctx.lineWidth = Math.max(0.5, 1/CANVAS.zoom);
  ctx.stroke();
  // Număr stradal / nume
  if (o.name) {
    const cx = pts.reduce((s,p)=>s+p.x,0)/pts.length;
    const cy = pts.reduce((s,p)=>s+p.y,0)/pts.length;
    const fs = Math.max(4, Math.min(11, 9/CANVAS.zoom));
    ctx.font = `bold ${fs}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(180,220,255,0.9)';
    ctx.fillText(o.name, cx, cy);
  }
  ctx.restore();
}


// ── DRAW ROAD_POLY — Benzi individuale cu marcaje profesionale ──
function drawRoadPoly(ctx, o) {
  const { pts, lanes, isOneway, hw } = o;
  if (!pts || pts.length < 2) return;
  
  const LANE_W = 3.5 * OSM.scale;  // 3.5m per bandă în px
  const SHOULDER = Math.max(0.5, 0.5 * OSM.scale); // bordură/trotuar
  const totalW = lanes * LANE_W;
  
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  
  // ── 1. TROTUAR / FUNDAL ──
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = totalW + SHOULDER * 2 + 2/CANVAS.zoom;
  _polyline(ctx, pts); ctx.stroke();
  
  // ── 2. CAROSABIL (asfalt) ──
  ctx.strokeStyle = o.color || '#444';
  ctx.lineWidth = totalW;
  _polyline(ctx, pts); ctx.stroke();
  
  // ── 3. BENZI INDIVIDUALE ──
  for (let li = 0; li < lanes; li++) {
    // Offset față de centrul drumului
    const offset = (li - (lanes - 1) / 2) * LANE_W;
    
    // Fundal ușor diferit per bandă (alternat)
    if (li % 2 === 0) {
      _drawOffsetPolyline(ctx, pts, offset, 'rgba(255,255,255,0.03)',
        LANE_W - 0.5/CANVAS.zoom, []);
    }
  }
  
  // ── 4. MARCAJE BENZI (linii albe/galbene) ──
  for (let li = 0; li <= lanes; li++) {
    const offset = (li - lanes/2) * LANE_W;
    const isEdge = (li === 0 || li === lanes);
    const isCenter = (!isOneway && li === lanes/2 && lanes % 2 === 0);
    
    if (isEdge) {
      // Linie plină albă pe margini
      _drawOffsetPolyline(ctx, pts, offset, 'rgba(255,255,255,0.85)',
        Math.max(0.8, 1.2/CANVAS.zoom), []);
    } else if (isCenter) {
      // Linie galbenă continuă pe axul central (sens dublu)
      _drawOffsetPolyline(ctx, pts, offset, '#ffdd00',
        Math.max(0.8, 1.5/CANVAS.zoom), []);
    } else {
      // Linie întreruptă albă între benzi
      const dashLen = Math.max(4, 8 * OSM.scale);
      const gapLen  = Math.max(4, 8 * OSM.scale);
      _drawOffsetPolyline(ctx, pts, offset, 'rgba(255,255,255,0.65)',
        Math.max(0.6, 1.0/CANVAS.zoom), [dashLen, gapLen]);
    }
  }
  
  // ── 5. NUMERELE BENZILOR (vizibil la zoom > 1.5) ──
  if (lanes > 1 && CANVAS.zoom > 0.8 && LANE_W * CANVAS.zoom > 12) {
    for (let li = 0; li < lanes; li++) {
      const offset = (li - (lanes - 1) / 2) * LANE_W;
      // Punct de mijloc al segmentului
      const midIdx = Math.floor(pts.length / 2);
      const p1 = pts[Math.max(0, midIdx-1)], p2 = pts[midIdx];
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      // Offset perpendicular
      const nx = -Math.sin(angle), ny = Math.cos(angle);
      const bx = mx + nx * offset, by = my + ny * offset;
      
      ctx.save();
      ctx.translate(bx, by); ctx.rotate(angle);
      const fs = Math.max(5, Math.min(LANE_W * 0.4, 14/CANVAS.zoom));
      ctx.font = `bold ${fs}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      // Numărăm benzile de la dreapta (sens normal trafic)
      const laneNum = isOneway ? (li + 1) : (lanes - li);
      ctx.fillText(laneNum, 0, 0);
      ctx.restore();
    }
  }
  
  // ── 6. SĂGEATĂ SENS UNIC ──
  if (isOneway && LANE_W * CANVAS.zoom > 6) {
    const midIdx = Math.floor(pts.length / 2);
    const p1 = pts[Math.max(0, midIdx-1)], p2 = pts[midIdx];
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const al = Math.max(5, totalW * 0.35);
    ctx.save(); ctx.translate(mx, my); ctx.rotate(angle);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(al, 0); ctx.lineTo(-al*0.6, al*0.5); ctx.lineTo(-al*0.6, -al*0.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  
  // ── 7. TRECERE DE PIETONI (dacă e marcat în OSM) ──
  // (se desenează separat ca node)
  
  // ── 8. DENUMIRE STRADĂ ──
  if (o.name && LANE_W * CANVAS.zoom > 8) {
    const midIdx = Math.floor(pts.length / 2);
    const p1 = pts[Math.max(0, midIdx-1)], p2 = pts[midIdx];
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    ctx.save(); ctx.translate(mx, my); ctx.rotate(angle);
    const fs = Math.max(5, Math.min(LANE_W * 0.3, 13/CANVAS.zoom));
    ctx.font = `${fs}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,220,100,0.8)';
    ctx.fillText(o.name, 0, -(totalW/2 + 4/CANVAS.zoom));
    ctx.restore();
  }
  
  ctx.restore();
}

function _polyline(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
}

function _drawOffsetPolyline(ctx, pts, offset, color, width, dash) {
  if (pts.length<2) return;
  ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=width;
  if (dash && dash.length > 0) ctx.setLineDash(dash); else ctx.setLineDash([]);
  ctx.beginPath();
  for (let i=0;i<pts.length;i++) {
    let nx=0,ny=0;
    if (i<pts.length-1) { const dx=pts[i+1].x-pts[i].x,dy=pts[i+1].y-pts[i].y,l=Math.hypot(dx,dy)||1; nx=-dy/l; ny=dx/l; }
    else { const dx=pts[i].x-pts[i-1].x,dy=pts[i].y-pts[i-1].y,l=Math.hypot(dx,dy)||1; nx=-dy/l; ny=dx/l; }
    const ox=pts[i].x+nx*offset, oy=pts[i].y+ny*offset;
    if (i===0) ctx.moveTo(ox,oy); else ctx.lineTo(ox,oy);
  }
  ctx.stroke(); ctx.setLineDash([]); ctx.restore();
}

// ── DRAW ROUNDABOUT ──
function drawRoundabout(ctx, o) {
  const { cx, cy, r, lanes } = o;
  if (!r || r < 2) return;
  ctx.save();
  const lw = Math.max(3.5 * OSM.scale, r * 0.28 / Math.max(1,lanes));
  // Insula centrală verde
  ctx.beginPath(); ctx.arc(cx,cy,r-lw*lanes-1,0,Math.PI*2);
  ctx.fillStyle='#1a2a1a'; ctx.fill();
  ctx.strokeStyle='#2a4a2a'; ctx.lineWidth=Math.max(0.5,1/CANVAS.zoom); ctx.stroke();
  // Benzi
  for (let li=0;li<lanes;li++) {
    const outer=r-lw*li, mid=r-lw*(li+0.5);
    ctx.beginPath(); ctx.arc(cx,cy,mid,0,Math.PI*2);
    ctx.strokeStyle='#7a7a7a'; ctx.lineWidth=lw-0.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,outer,0,Math.PI*2);
    ctx.strokeStyle='#111'; ctx.lineWidth=Math.max(0.5,1.5/CANVAS.zoom); ctx.stroke();
  }
  // Marcaj despărțire benzi
  for (let li=1;li<lanes;li++) {
    ctx.beginPath(); ctx.arc(cx,cy,r-lw*li,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,0.38)';
    ctx.lineWidth=Math.max(0.3,0.6/CANVAS.zoom);
    ctx.setLineDash([5/CANVAS.zoom,8/CANVAS.zoom]);
    ctx.stroke(); ctx.setLineDash([]);
  }
  // Săgeți sens giratoriu la 4 puncte cardinale
  const ar=r-lw*0.5;
  [0,Math.PI/2,Math.PI,Math.PI*1.5].forEach(a=>{
    const ax=cx+ar*Math.cos(a), ay=cy+ar*Math.sin(a);
    const dir=a+Math.PI/2;
    const al=Math.max(3,lw*0.45);
    ctx.save(); ctx.translate(ax,ay); ctx.rotate(dir);
    ctx.fillStyle='rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.moveTo(0,-al); ctx.lineTo(al*0.45,al*0.35); ctx.lineTo(-al*0.45,al*0.35);
    ctx.closePath(); ctx.fill(); ctx.restore();
  });
  // Etichetă
  if (o.name) {
    ctx.font=`${Math.max(5,r*0.14)}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='rgba(255,220,50,0.75)'; ctx.fillText(o.name,cx,cy);
  }
  ctx.restore();
}

// ── INIT OSM SKETCH BUTTON ──
function initOSMSketch() {
  const section = document.querySelector('.map-type-section');
  if (!section || document.getElementById('btn-osm-sketch')) return;

  // Selector rază
  const radiusSelect = document.createElement('select');
  radiusSelect.id = 'osm-radius-select';
  radiusSelect.innerHTML = `
    <option value="80">80m — Intersecție</option>
    <option value="120" selected>120m — Zonă tipică</option>
    <option value="200">200m — Zonă largă</option>
    <option value="350">350m — Sector mare</option>
    <option value="500">500m — Sector extins</option>
  `;
  radiusSelect.style.cssText = 'background:var(--bg-2);border:1px solid var(--border2);color:var(--text-1);font-size:12px;padding:5px 8px;border-radius:6px;outline:none;cursor:pointer;';

  // Buton generare
  const btn = document.createElement('button');
  btn.className = 'map-action-btn';
  btn.id = 'btn-osm-sketch';
  btn.textContent = '🗺️ Generează Schiță';
  btn.style.cssText = 'background:var(--accent);color:var(--bg-0);font-weight:700;border-color:transparent;white-space:nowrap;';

  section.appendChild(radiusSelect);
  section.appendChild(btn);

  btn.addEventListener('click', async () => {
    // Folosim locația setată SAU centrul curent al hărții
    let lat = APP.location.lat;
    let lng = APP.location.lng;
    if (!lat && APP.leafletMap) {
      const c = APP.leafletMap.getCenter();
      lat = c.lat; lng = c.lng;
    }
    if (!lat) { toast('Caută o adresă sau activează GPS mai întâi!', 'error'); return; }

    btn.disabled = true; btn.style.opacity = '0.6';
    btn.textContent = '⏳ Se descarcă...';
    try {
      const radius = parseInt(document.getElementById('osm-radius-select').value) || 120;
      await generateSketchFromOSM(lat, lng, radius);
    } catch(e) {
      toast('Eroare: ' + e.message, 'error');
    } finally {
      btn.disabled = false; btn.style.opacity = '1';
      btn.textContent = '🗺️ Generează Schiță';
    }
  });
}




/* === SCANARE VEHICULE AVARIATE === */
(function(){
'use strict';

/* ═══════════════════════════════════════════════════
   DEVICE DETECTION
   ═══════════════════════════════════════════════════ */
var DEVICE = {
  isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
  isAndroid: /Android/.test(navigator.userAgent),
  isWindows: /Windows/.test(navigator.userAgent),
  isLinux: /Linux/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent),
  isMac: /Macintosh/.test(navigator.userAgent) && !(/iPad|iPhone/.test(navigator.userAgent)),
  model: '', hasLiDAR: false
};

async function detectiPhone() {
  if (!DEVICE.isIOS) return false;
  try {
    var cv = document.createElement('canvas');
    var gl = cv.getContext('webgl') || cv.getContext('experimental-webgl');
    if (gl) {
      var ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        var r = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
        if (/A17 Pro|A18 Pro|A16 Bionic|A15 Bionic/.test(r)) {
          DEVICE.hasLiDAR = true; DEVICE.model = r; return true;
        }
      }
    }
  } catch(e) {}
  try {
    var devs = await navigator.mediaDevices.enumerateDevices();
    var vd = devs.filter(function(d){ return d.kind==='videoinput'; });
    var sw = window.screen.width * window.devicePixelRatio;
    var sh = window.screen.height * window.devicePixelRatio;
    if ((sw>=1179||sh>=2556) && vd.length>=2) {
      DEVICE.hasLiDAR=true; DEVICE.model='iPhone Pro (detectat)'; return true;
    }
  } catch(e) {}
  DEVICE.model='iPhone (model necunoscut)'; return null;
}

/* ═══════════════════════════════════════════════════
   STATE GLOBAL
   ═══════════════════════════════════════════════════ */
var SS = {
  photos:[], zones:{}, sev:'minor',
  video:{ blob:null, duration:0 },
  gps:{ lat:null, lng:null, acc:null, watchId:null },
  lidar:{ active:false, depthData:[] },
  meta:{ date:'', time:'', plate:'', model:'', color:'', officer:'' },
  c2d:{ tool:'pen', objs:[], drawing:false, sx:0, sy:0, cur:null },
  c3d:{ raf:null, frames:[], angle:0 },
  processing:{ done:false, damageMap:{} }
};
var c2, x2;

/* ═══════════════════════════════════════════════════
   UI BLOCKS
   ═══════════════════════════════════════════════════ */
function blockedUI(title, detail) {
  return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;' +
    'height:100%;padding:30px;text-align:center;gap:14px;background:#080f1e;">' +
    '<div style="font-size:52px;">&#x1F6AB;</div>' +
    '<div style="font-size:14px;font-weight:700;color:#ef9a9a;font-family:monospace;' +
    'text-transform:uppercase;letter-spacing:2px;">' + title + '</div>' +
    '<div style="font-size:11px;color:#546e7a;font-family:monospace;max-width:280px;line-height:1.7;">' + detail + '</div>' +
    '<div style="padding:10px 14px;background:#0d1f3a;border:1px solid #1e3a5f;border-radius:8px;' +
    'font-size:10px;color:#4fc3f7;font-family:monospace;line-height:1.8;">' +
    'Compatibil:<br>iPhone 12/13/14/15/16 Pro &amp; Pro Max</div></div>';
}
function loadingUI(msg) {
  return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;' +
    'height:100%;gap:14px;background:#080f1e;">' +
    '<div style="width:42px;height:42px;border:3px solid #1e3a5f;border-top-color:#4fc3f7;' +
    'border-radius:50%;animation:spinScan 1s linear infinite;"></div>' +
    '<div style="font-size:10px;color:#4fc3f7;font-family:monospace;letter-spacing:2px;">' + (msg||'SE INCARCA...') + '</div>' +
    '<style>@keyframes spinScan{to{transform:rotate(360deg)}}</style></div>';
}
function confirmUI() {
  return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;' +
    'height:100%;padding:28px;text-align:center;gap:12px;background:#080f1e;">' +
    '<div style="font-size:44px;">&#x2753;</div>' +
    '<div style="font-size:13px;font-weight:700;color:#ffc107;font-family:monospace;">Verificare Dispozitiv</div>' +
    '<div style="font-size:11px;color:#90a4ae;font-family:monospace;max-width:260px;line-height:1.6;">' +
    'Nu am putut detecta automat modelul.<br>Aceasta sectiune functioneaza <b style="color:#4fc3f7">doar pe iPhone Pro</b> cu LiDAR.</div>' +
    '<button onclick="scanConfirmPro(true)" style="width:100%;max-width:230px;padding:10px;background:#1565c0;' +
    'border:1px solid #4fc3f7;color:#fff;font-family:monospace;font-size:10px;border-radius:5px;cursor:pointer;">' +
    '&#x2705; Da, am iPhone Pro cu LiDAR</button>' +
    '<button onclick="scanConfirmPro(false)" style="width:100%;max-width:230px;padding:10px;background:#0d1f3a;' +
    'border:1px solid #546e7a;color:#78909c;font-family:monospace;font-size:10px;border-radius:5px;cursor:pointer;">' +
    '&#x274C; Nu, alt dispozitiv</button></div>';
}
function permsUI() {
  return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;' +
    'height:100%;padding:22px;text-align:center;gap:11px;background:#080f1e;">' +
    '<div style="font-size:40px;">&#x1F511;</div>' +
    '<div style="font-size:13px;font-weight:700;color:#4fc3f7;font-family:monospace;' +
    'text-transform:uppercase;letter-spacing:1px;">Permisiuni Necesare</div>' +
    '<div style="font-size:10px;color:#90a4ae;font-family:monospace;max-width:250px;line-height:1.6;">' +
    'Pentru cartografiere cu LiDAR sunt necesare:<br>' +
    '<b style="color:#ffc107">Camera</b>, <b style="color:#ffc107">Locatie GPS</b></div>' +
    '<div style="width:100%;max-width:260px;background:#0a1628;border:1px solid #1a2f4a;' +
    'border-radius:7px;padding:9px;font-family:monospace;font-size:10px;">' +
    '<div id="sScanPermCam" style="display:flex;justify-content:space-between;padding:3px 0;' +
    'border-bottom:1px solid #1a2f4a;"><span>&#x1F4F9; Camera + LiDAR</span>' +
    '<span style="color:#546e7a">&#x23F3;</span></div>' +
    '<div id="sScanPermGPS" style="display:flex;justify-content:space-between;padding:3px 0;">' +
    '<span>&#x1F4CD; Locatie GPS</span><span style="color:#546e7a">&#x23F3;</span></div>' +
    '</div>' +
    '<button id="sScanPermBtn" onclick="scanRequestPermissions()" style="padding:10px 22px;' +
    'background:#1565c0;border:1px solid #4fc3f7;color:#fff;font-family:monospace;' +
    'font-size:10px;border-radius:5px;cursor:pointer;letter-spacing:1px;">&#x1F513; ACORDA PERMISIUNI</button>' +
    '<div style="font-size:9px;color:#37474f;font-family:monospace;">Vei vedea dialogurile native iOS</div></div>';
}

/* ═══════════════════════════════════════════════════
   MAIN UI
   ═══════════════════════════════════════════════════ */
function buildMainUI() {
  var badge = DEVICE.model ?
    '<span style="font-size:8px;color:#4caf50;border:1px solid #2e7d32;border-radius:8px;' +
    'padding:1px 5px;margin-left:auto;">&#x2705; LiDAR</span>' : '';

  return '<div class="scan-wrap" id="sScanUI">' +

  /* ── SIDEBAR ── */
  '<div class="scan-sidebar">' +

  /* Header */
  '<div class="scan-sec-title" style="padding:7px 8px;border-bottom:1px solid #1a2f4a;' +
  'font-size:9px;display:flex;align-items:center;gap:5px;">&#x1F4E1; Cartografiere LiDAR' + badge + '</div>' +

  /* Preview zona */
  '<div class="scan-camera-box" id="scanCameraBox">' +
  '<div id="scanCamPreview" style="width:100%;height:100%;display:flex;flex-direction:column;' +
  'align-items:center;justify-content:center;background:#050c1a;gap:5px;">' +
  '<div style="font-size:28px;opacity:0.35">&#x1F3A5;</div>' +
  '<p style="font-size:9px;color:#4fc3f7;opacity:0.6;font-family:monospace;text-align:center;' +
  'padding:0 8px;margin:0;">Apasa FILMARE 360° pentru a incepe</p>' +
  '</div>' +
  /* Overlay cu date live */
  '<div class="scan-cam-overlay" id="scanLidarOverlay" style="display:none;">' +
  '<div class="scan-corners"><span></span></div>' +
  '<div style="position:absolute;top:5px;left:5px;right:5px;display:flex;justify-content:space-between;' +
  'align-items:flex-start;">' +
  '<div style="background:rgba(0,0,0,0.65);padding:3px 6px;border-radius:3px;font-family:monospace;' +
  'font-size:8px;color:#00e5ff;line-height:1.6;">' +
  '<div id="overlayDate" style="color:#ffc107;font-weight:700;"></div>' +
  '<div id="overlayTime" style="color:#00e5ff;"></div>' +
  '<div id="overlayGPS" style="color:#4caf50;"></div>' +
  '</div>' +
  '<div style="background:rgba(198,40,40,0.85);padding:3px 7px;border-radius:3px;' +
  'font-family:monospace;font-size:8px;color:#fff;display:flex;align-items:center;gap:4px;">' +
  '<div id="recDotOverlay" style="width:5px;height:5px;border-radius:50%;background:#fff;' +
  'animation:blinkDot 1s infinite;"></div>' +
  '<span id="overlayRecTxt">REC</span><span id="overlayTimer">0:00</span></div>' +
  '</div>' +
  '<div style="position:absolute;bottom:5px;left:5px;right:5px;">' +
  '<div style="background:rgba(0,0,0,0.65);padding:3px 6px;border-radius:3px;' +
  'font-family:monospace;font-size:8px;color:#90caf9;display:flex;justify-content:space-between;">' +
  '<span id="overlayPlate"></span>' +
  '<span style="color:#4fc3f7;">LiDAR <span id="lidarStatus">&#x23F3;</span></span>' +
  '</div></div>' +
  '</div>' +
  '</div>' +

  /* Butoane filmare */
  '<input type="file" id="scanVideoInput" accept="video/*" capture="environment" ' +
  'style="display:none" onchange="scanHandleVideoFile(event)">' +
  '<input type="file" id="scanPhotoInput" accept="image/*" capture="environment" ' +
  'style="display:none" onchange="scanHandlePhotoFile(event)">' +
  '<div class="scan-cam-btns">' +
  '<button class="scan-btn" id="sBtnFilm" style="flex:3;background:#1565c0;border-color:#4fc3f7;' +
  'color:#fff;font-weight:700;" onclick="scanStartFilmare()">&#x1F3A5; FILMARE 360&#xB0;</button>' +
  '<button class="scan-btn" onclick="document.getElementById(\'scanPhotoInput\').click()">&#x1F4F7;</button>' +
  '</div>' +

  /* Ghid filmare */
  '<div id="scanRecGuide" class="scan-section">' +
  '<div class="scan-sec-title">&#x1F4CB; Ghid Filmare</div>' +
  '<div style="font-size:9px;color:#546e7a;font-family:monospace;line-height:1.8;">' +
  '<span style="color:#4fc3f7;">1.</span> Pozitioneaza-te la 2-3m<br>' +
  '<span style="color:#4fc3f7;">2.</span> Apasa FILMARE 360&#xB0;<br>' +
  '<span style="color:#4fc3f7;">3.</span> Mergi incet in jurul masinii<br>' +
  '<span style="color:#4fc3f7;">4.</span> Tur complet ~45-60 sec<br>' +
  '<span style="color:#4fc3f7;">5.</span> Opreste &#x2192; schita se genereaza automat' +
  '</div></div>' +

  /* Date dosar */
  '<div class="scan-section">' +
  '<div class="scan-sec-title">&#x1F4CB; Date Dosar</div>' +
  '<div class="scan-field"><label>Nr. Inmatriculare</label>' +
  '<input type="text" id="sScanPlate" placeholder="AR-00-XYZ" ' +
  'style="text-transform:uppercase;font-size:12px;font-weight:700;" ' +
  'oninput="document.getElementById(\'overlayPlate\').textContent=this.value"></div>' +
  '<div class="scan-field"><label>Marca / Model</label>' +
  '<input type="text" id="sScanModel" placeholder="VW Tiguan 2020"></div>' +
  '<div class="scan-field"><label>Culoare</label>' +
  '<input type="text" id="sScanColor" placeholder="Alb Perlat"></div>' +
  '<div class="scan-field"><label>Ofiter / Agent</label>' +
  '<input type="text" id="sScanOfficer" placeholder="Nume Prenume"></div>' +
  '</div>' +

  /* Severitate */
  '<div class="scan-section">' +
  '<div class="scan-sec-title">&#x26A0; Severitate</div>' +
  '<div class="scan-sev-btns">' +
  '<button class="scan-sev-btn scan-sev-active" data-sev="minor" onclick="scanSetSev(this,\'minor\')">&#x26A1; Minor</button>' +
  '<button class="scan-sev-btn" data-sev="major" onclick="scanSetSev(this,\'major\')">&#x1F525; Major</button>' +
  '<button class="scan-sev-btn" data-sev="total" onclick="scanSetSev(this,\'total\')">&#x1F480; Total</button>' +
  '</div>' +
  '<div class="scan-field"><label>Note daune</label>' +
  '<textarea id="sScanNotes" rows="2" placeholder="Descriere daune observate..."></textarea></div>' +
  '</div>' +

  /* GPS */
  '<div class="scan-section">' +
  '<div class="scan-sec-title">&#x1F4CD; GPS</div>' +
  '<div id="sScanGPSInfo">' +
  '<button onclick="scanActivateGPS()" style="width:100%;padding:5px;background:#0d1f3a;' +
  'border:1px solid #1565c0;color:#4fc3f7;font-family:monospace;font-size:9px;' +
  'border-radius:3px;cursor:pointer;">&#x1F4CD; Activeaza GPS</button>' +
  '</div></div>' +

  /* Frames thumbnail */
  '<div class="scan-section">' +
  '<div class="scan-sec-title">&#x1F3A5; Frames (<span id="sScanPhotoCount">0</span>)</div>' +
  '<div class="scan-photos-mini" id="sScanPhotosMini"></div>' +
  '</div>' +
  '</div>' + /* /sidebar */

  /* ── PANEL MAIN ── */
  '<div class="scan-panel-main">' +
  '<div class="scan-view-tabs">' +
  '<button class="scan-view-tab scan-view-active" onclick="scanView(\'proc\',this)">&#x2699; Procesare</button>' +
  '<button class="scan-view-tab" onclick="scanView(\'schita\',this)">&#x1F4D0; Schita</button>' +
  '<button class="scan-view-tab" onclick="scanView(\'3d\',this)">&#x1F537; 3D</button>' +
  '<button class="scan-view-tab" onclick="scanView(\'sil\',this)">&#x1F697; Silueta</button>' +
  '<button class="scan-view-tab" onclick="scanView(\'foto\',this)">&#x1F4F7; Frames</button>' +
  '</div>' +

  /* TAB PROCESARE */
  '<div id="sViewProc" class="scan-view-content scan-view-show">' +
  '<div id="sProcStatus" style="flex:1;display:flex;flex-direction:column;align-items:center;' +
  'justify-content:center;gap:12px;padding:20px;background:#050c1a;">' +
  '<div style="font-size:40px;opacity:0.25">&#x1F3A5;</div>' +
  '<div style="font-size:12px;color:#546e7a;font-family:monospace;text-align:center;max-width:240px;">' +
  'Filmeaza vehiculul 360&#xB0; si schita tehnica se va genera automat din video</div>' +
  '</div></div>' +

  /* TAB SCHITA TEHNICA */
  '<div id="sViewSchita" class="scan-view-content" style="display:none;flex-direction:column;">' +
  '<div class="scan-2d-toolbar">' +
  '<button class="scan-tool-btn scan-tool-active" onclick="scan2dTool(this,\'pen\')">&#x270F; Creion</button>' +
  '<button class="scan-tool-btn" onclick="scan2dTool(this,\'line\')">&#x2014; Linie</button>' +
  '<button class="scan-tool-btn" onclick="scan2dTool(this,\'rect\')">&#x25FB; Rect</button>' +
  '<button class="scan-tool-btn" onclick="scan2dTool(this,\'circle\')">&#x25EF; Cerc</button>' +
  '<button class="scan-tool-btn" onclick="scan2dTool(this,\'measure\')">&#x1F4D0; Dim.</button>' +
  '<button class="scan-tool-btn" onclick="scan2dTool(this,\'text\')">T Text</button>' +
  '<button class="scan-tool-btn" onclick="scan2dTool(this,\'arrow\')">&#x2192; Sag.</button>' +
  '<div style="flex:1"></div>' +
  '<select id="sDmgSeverSelect" style="background:#0d1f3a;border:1px solid #1e3a5f;color:#90caf9;' +
  'font-size:9px;padding:2px 4px;border-radius:3px;font-family:monospace;cursor:pointer;">' +
  '<option value="minor">Minor</option><option value="major">Major</option>' +
  '<option value="total">Total</option></select>' +
  '<input type="color" id="sTool2dColor" value="#f44336" style="width:22px;height:22px;' +
  'border:1px solid #1e3a5f;border-radius:3px;cursor:pointer;padding:1px;">' +
  '<button class="scan-tool-btn" onclick="scan2dUndo()">&#x21A9;</button>' +
  '<button class="scan-tool-btn" onclick="schitaRegen()">&#x1F504;</button>' +
  '</div>' +
  '<canvas id="sScanCanvas2D" style="flex:1;width:100%;cursor:crosshair;display:block;min-height:200px;"></canvas>' +
  '<div class="scan-2d-status">' +
  '<span>Unealta: <b id="sScan2dTool">pen</b></span>' +
  '<span>Cursor: <b id="sScan2dXY">0,0</b></span>' +
  '<span>Obiecte: <b id="sScan2dCount">0</b></span>' +
  '</div></div>' +

  /* TAB 3D */
  '<div id="sView3d" class="scan-view-content" style="display:none;flex:1;position:relative;min-height:200px;">' +
  '<canvas id="sScanCanvas3D" style="width:100%;height:100%;display:block;"></canvas>' +
  '<div id="sPlaceholder3d" style="position:absolute;inset:0;display:flex;flex-direction:column;' +
  'align-items:center;justify-content:center;gap:10px;color:#37474f;font-family:monospace;">' +
  '<div style="font-size:40px;opacity:0.2">&#x1F537;</div>' +
  '<p style="font-size:10px;text-align:center;max-width:200px;opacity:0.5;">' +
  'Modelul 3D se genereaza automat dupa procesarea video</p>' +
  '</div>' +
  '<div style="position:absolute;top:6px;right:6px;display:flex;flex-direction:column;gap:4px;">' +
  '<button onclick="scan3dRotSpeed(-1)" style="width:26px;height:26px;background:#0d1f3a;' +
  'border:1px solid #1e3a5f;color:#90caf9;font-size:10px;border-radius:3px;cursor:pointer;">&#x23EA;</button>' +
  '<button onclick="scan3dRotSpeed(1)" style="width:26px;height:26px;background:#0d1f3a;' +
  'border:1px solid #1e3a5f;color:#90caf9;font-size:10px;border-radius:3px;cursor:pointer;">&#x23E9;</button>' +
  '</div></div>' +

  /* TAB SILUETA */
  '<div id="sViewSil" class="scan-view-content" style="display:none;overflow-y:auto;padding:10px;flex:1;">' +
  '<div style="font-size:9px;color:#546e7a;text-transform:uppercase;letter-spacing:1px;' +
  'margin-bottom:8px;font-family:monospace;">Zone detectate automat — click pentru editare manuala</div>' +
  '<div style="display:flex;justify-content:center;">' +
  '<svg id="scanSilSVG" width="300" height="190" viewBox="0 0 300 190">' +
  '<rect x="35" y="55" width="230" height="95" rx="18" fill="#0d1f3a" stroke="#1e3a5f" stroke-width="1.5"/>' +
  '<rect x="72" y="32" width="156" height="76" rx="12" fill="#091525" stroke="#1e3a5f"/>' +
  '<rect x="82" y="37" width="62" height="42" rx="5" fill="#0a2040" opacity="0.7"/>' +
  '<rect x="155" y="37" width="62" height="42" rx="5" fill="#0a2040" opacity="0.7"/>' +
  '<ellipse cx="83" cy="157" rx="20" ry="13" fill="#060d1a" stroke="#1e3a5f" stroke-width="1.5"/>' +
  '<ellipse cx="217" cy="157" rx="20" ry="13" fill="#060d1a" stroke="#1e3a5f" stroke-width="1.5"/>' +
  '<ellipse cx="83" cy="50" rx="20" ry="13" fill="#060d1a" stroke="#1e3a5f" stroke-width="1.5"/>' +
  '<ellipse cx="217" cy="50" rx="20" ry="13" fill="#060d1a" stroke="#1e3a5f" stroke-width="1.5"/>' +
  '<rect class="sdmg-zone" id="sdz-fata" data-zone="Fata" x="240" y="54" width="46" height="60" rx="7" onclick="scanMarkZone(this)" fill="rgba(0,229,255,0.05)" stroke="rgba(0,229,255,0.25)" stroke-width="1" style="cursor:pointer"/>' +
  '<rect class="sdmg-zone" id="sdz-spate" data-zone="Spate" x="16" y="54" width="46" height="60" rx="7" onclick="scanMarkZone(this)" fill="rgba(0,229,255,0.05)" stroke="rgba(0,229,255,0.25)" stroke-width="1" style="cursor:pointer"/>' +
  '<rect class="sdmg-zone" id="sdz-dr" data-zone="Lateral Dreapta" x="45" y="140" width="210" height="30" rx="6" onclick="scanMarkZone(this)" fill="rgba(0,229,255,0.05)" stroke="rgba(0,229,255,0.25)" stroke-width="1" style="cursor:pointer"/>' +
  '<rect class="sdmg-zone" id="sdz-st" data-zone="Lateral Stanga" x="45" y="36" width="210" height="26" rx="6" onclick="scanMarkZone(this)" fill="rgba(0,229,255,0.05)" stroke="rgba(0,229,255,0.25)" stroke-width="1" style="cursor:pointer"/>' +
  '<rect class="sdmg-zone" id="sdz-capota" data-zone="Capota" x="170" y="60" width="68" height="85" rx="6" onclick="scanMarkZone(this)" fill="rgba(0,229,255,0.05)" stroke="rgba(0,229,255,0.25)" stroke-width="1" style="cursor:pointer"/>' +
  '<rect class="sdmg-zone" id="sdz-portbagaj" data-zone="Portbagaj" x="64" y="60" width="68" height="85" rx="6" onclick="scanMarkZone(this)" fill="rgba(0,229,255,0.05)" stroke="rgba(0,229,255,0.25)" stroke-width="1" style="cursor:pointer"/>' +
  '<rect class="sdmg-zone" id="sdz-acop" data-zone="Acoperis" x="88" y="34" width="124" height="42" rx="8" onclick="scanMarkZone(this)" fill="rgba(0,229,255,0.05)" stroke="rgba(0,229,255,0.25)" stroke-width="1" style="cursor:pointer"/>' +
  '<text x="278" y="92" fill="#37474f" font-size="7" text-anchor="middle" font-family="monospace">FATA</text>' +
  '<text x="22" y="92" fill="#37474f" font-size="7" text-anchor="middle" font-family="monospace">SPATE</text>' +
  '</svg></div>' +
  '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:6px;' +
  'font-size:9px;color:#78909c;font-family:monospace;">' +
  '<span style="color:#546e7a">&#x25A0; Neatasat</span>' +
  '<span style="color:#ffc107">&#x25A0; Minor</span>' +
  '<span style="color:#ff5722">&#x25A0; Major</span>' +
  '<span style="color:#f44336">&#x25A0; Total</span>' +
  '</div>' +
  '<div id="sScanZoneList" style="margin-top:8px;padding:8px;background:#080f1e;' +
  'border:1px solid #1a2f4a;border-radius:4px;font-size:9px;color:#78909c;font-family:monospace;">' +
  '-- Nicio zona --</div>' +
  '</div>' +

  /* TAB FRAMES */
  '<div id="sViewFoto" class="scan-view-content" style="display:none;overflow-y:auto;padding:8px;flex:1;">' +
  '<div style="font-size:9px;color:#546e7a;margin-bottom:6px;font-family:monospace;">' +
  'FRAMES EXTRASE: <span id="sScanFotoCount">0</span></div>' +
  '<div id="sScanFotoGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:4px;"></div>' +
  '</div>' +

  /* Export bar */
  '<div class="scan-export-bar">' +
  '<button class="scan-btn" onclick="scanExportJSON()">&#x1F4BE; JSON</button>' +
  '<button class="scan-btn" onclick="scanExportSchita()">&#x1F4D0; Schita PNG</button>' +
  '<button class="scan-btn scan-btn-pdf" onclick="scanExportPDF()">&#x1F4C4; PDF Dosar</button>' +
  '<button class="scan-btn" style="color:#78909c;border-color:#546e7a" onclick="scanReset()">&#x1F504;</button>' +
  '</div>' +
  '</div>' + /* /panel-main */
  '</div>'; /* /scan-wrap */
}

/* ═══════════════════════════════════════════════════
   FLOW: DETECTIE → PERMISIUNI
   ═══════════════════════════════════════════════════ */
var scanReady = false;

window.scanEnterTab = async function() {
  var wrap = document.getElementById('tab-scanare');
  if (!wrap) return;
  if (scanReady && wrap.querySelector('.scan-wrap')) {
    setTimeout(function(){ if(!c2) scan2dInitS(); else scan2dResizeS(); }, 80);
    return;
  }
  wrap.innerHTML = loadingUI('DETECTIE DISPOZITIV...');
  await new Promise(function(r){ setTimeout(r,350); });
  if (DEVICE.isAndroid) { wrap.innerHTML = blockedUI('Android incompatibil','Cartografierea LiDAR functioneaza exclusiv pe iPhone Pro (12 Pro si mai nou).'); return; }
  if (DEVICE.isWindows) { wrap.innerHTML = blockedUI('Windows incompatibil','Aceasta functie necesita hardware-ul LiDAR al iPhone Pro.'); return; }
  if (DEVICE.isLinux)   { wrap.innerHTML = blockedUI('Linux incompatibil','Aceasta functie necesita hardware-ul LiDAR al iPhone Pro.'); return; }
  if (DEVICE.isMac)     { wrap.innerHTML = blockedUI('Mac incompatibil','Aceasta functie necesita hardware-ul LiDAR al iPhone Pro.'); return; }
  if (DEVICE.isIOS) {
    wrap.innerHTML = loadingUI('DETECTIE iPhone Pro...');
    var r = await detectiPhone();
    if (r === false) { wrap.innerHTML = blockedUI('iPhone fara LiDAR','Modelul tau nu are senzor LiDAR. Necesar: iPhone 12 Pro sau mai nou.'); return; }
    if (r === null)  { wrap.innerHTML = confirmUI(); return; }
    await doPerm(wrap); return;
  }
  wrap.innerHTML = blockedUI('Dispozitiv necunoscut','Aceasta sectiune functioneaza exclusiv pe iPhone Pro cu LiDAR.');
};

window.scanConfirmPro = async function(yes) {
  var wrap = document.getElementById('tab-scanare');
  if (!yes) { wrap.innerHTML = blockedUI('Acces restrictionat','Aceasta sectiune necesita iPhone Pro cu LiDAR.'); return; }
  DEVICE.hasLiDAR = true; DEVICE.model = 'iPhone Pro (confirmat)';
  await doPerm(wrap);
};

async function doPerm(wrap) {
  wrap.innerHTML = permsUI();
  setTimeout(function(){ window.scanRequestPermissions(); }, 500);
}

window.scanRequestPermissions = async function() {
  var btn = document.getElementById('sScanPermBtn');
  if (btn) { btn.disabled=true; btn.textContent='Se solicita...'; }
  var camOK = false;
  try {
    var s = await navigator.mediaDevices.getUserMedia({ video:{facingMode:{ideal:'environment'}}, audio:false });
    s.getTracks().forEach(function(t){ t.stop(); });
    camOK = true;
    var el = document.getElementById('sScanPermCam');
    if (el) el.innerHTML = '<span>&#x1F4F9; Camera + LiDAR</span><span style="color:#4caf50">&#x2705; Acordat</span>';
  } catch(e) {
    var el = document.getElementById('sScanPermCam');
    if (el) el.innerHTML = '<span>&#x1F4F9; Camera + LiDAR</span><span style="color:#f44336">&#x274C; Refuzat</span>';
  }
  var gpsEl = document.getElementById('sScanPermGPS');
  if (gpsEl) gpsEl.innerHTML = '<span>&#x1F4CD; GPS</span><span style="color:#546e7a">-- activezi dupa --</span>';
  if (camOK) {
    scanReady = true;
    await new Promise(function(r){ setTimeout(r,600); });
    var wrap = document.getElementById('tab-scanare');
    if (wrap) {
      wrap.innerHTML = buildMainUI();
      setTimeout(function(){
        scan2dInitS();
        scanStartGPS();
        scanRestorePhotos();
        startOverlayClock();
      }, 120);
    }
  } else {
    if (btn) { btn.disabled=false; btn.textContent='Incearca din nou'; }
    var el = document.getElementById('sScanPermCam');
    if (el) el.insertAdjacentHTML('afterend',
      '<div style="margin-top:7px;padding:7px;background:rgba(244,67,54,0.1);border:1px solid #c62828;' +
      'border-radius:4px;font-size:9px;color:#ef9a9a;font-family:monospace;">' +
      'Setari iPhone > Safari > Camera > Permite</div>');
  }
};

/* ═══════════════════════════════════════════════════
   OVERLAY CLOCK — data/ora live pe ecran filmare
   ═══════════════════════════════════════════════════ */
var clockInterval = null;

function startOverlayClock() {
  if (clockInterval) clearInterval(clockInterval);
  function tick() {
    var now = new Date();
    var zp = function(n){ return n<10?'0'+n:n; };
    var dateStr = zp(now.getDate())+'.'+zp(now.getMonth()+1)+'.'+now.getFullYear();
    var timeStr = zp(now.getHours())+':'+zp(now.getMinutes())+':'+zp(now.getSeconds());
    var el = document.getElementById('overlayDate');
    if (el) el.textContent = dateStr;
    var el2 = document.getElementById('overlayTime');
    if (el2) el2.textContent = timeStr;
    /* GPS in overlay */
    var gpsOv = document.getElementById('overlayGPS');
    if (gpsOv && SS.gps.lat) {
      gpsOv.textContent = SS.gps.lat.toFixed(5)+' '+SS.gps.lng.toFixed(5);
    }
  }
  tick();
  clockInterval = setInterval(tick, 1000);
}

/* ═══════════════════════════════════════════════════
   GPS
   ═══════════════════════════════════════════════════ */
window.scanActivateGPS = function() {
  var el = document.getElementById('sScanGPSInfo');
  if (el) el.innerHTML='<span style="color:#4fc3f7;font-size:9px;">&#x23F3; Se obtine locatia...</span>';
  if (!navigator.geolocation) {
    if (el) el.innerHTML='<span style="color:#546e7a;font-size:9px;">GPS indisponibil</span>'; return;
  }
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      SS.gps.lat=pos.coords.latitude; SS.gps.lng=pos.coords.longitude; SS.gps.acc=pos.coords.accuracy;
      updateGPSDisplay(el, pos.coords);
      scanToastS('GPS activat! '+pos.coords.accuracy.toFixed(0)+'m precizie','ok');
      if (SS.gps.watchId) navigator.geolocation.clearWatch(SS.gps.watchId);
      SS.gps.watchId = navigator.geolocation.watchPosition(
        function(p){ SS.gps.lat=p.coords.latitude;SS.gps.lng=p.coords.longitude;SS.gps.acc=p.coords.accuracy;updateGPSDisplay(el,p.coords); },
        function(){},
        {enableHighAccuracy:true,timeout:30000,maximumAge:5000}
      );
    },
    function(err) {
      var msgs={1:'Refuzat — Setari > Confidentialitate > Servicii Localizare > Safari',2:'Semnal slab',3:'Timeout'};
      if (el) el.innerHTML='<div style="color:#ff9800;font-size:9px;">&#x26A0; '+(msgs[err.code]||'Eroare GPS')+'</div>'+
        '<button onclick="scanActivateGPS()" style="margin-top:3px;width:100%;padding:3px;background:#0d1f3a;'+
        'border:1px solid #f57c00;color:#ff9800;font-family:monospace;font-size:9px;border-radius:3px;cursor:pointer;">&#x21BA; Reincearca</button>';
    },
    {enableHighAccuracy:false,timeout:12000,maximumAge:60000}
  );
};

function updateGPSDisplay(el, c) {
  if (!el) return;
  var col=c.accuracy<20?'#4caf50':c.accuracy<100?'#ff9800':'#f44336';
  el.innerHTML='<div style="display:flex;justify-content:space-between;">' +
    '<span style="color:#4caf50;font-size:9px;">&#x2022; GPS Activ</span>' +
    '<span style="color:'+col+';font-size:9px;">'+c.accuracy.toFixed(0)+'m</span></div>'+
    '<div style="font-size:8px;color:#90caf9;font-family:monospace;">'+c.latitude.toFixed(6)+'</div>'+
    '<div style="font-size:8px;color:#90caf9;font-family:monospace;">'+c.longitude.toFixed(6)+'</div>';
}

function scanStartGPS() {
  var el = document.getElementById('sScanGPSInfo');
  if (el) el.innerHTML='<button onclick="scanActivateGPS()" style="width:100%;padding:5px;background:#0d1f3a;'+
    'border:1px solid #1565c0;color:#4fc3f7;font-family:monospace;font-size:9px;border-radius:3px;cursor:pointer;">&#x1F4CD; Activeaza GPS</button>';
}

/* ═══════════════════════════════════════════════════
   FILMARE — iOS input[capture=video]
   ═══════════════════════════════════════════════════ */
var recTimerInterval = null;
var recSeconds = 0;

window.scanStartFilmare = function() {
  /* Arata overlay inainte de filmare */
  var overlay = document.getElementById('scanLidarOverlay');
  var preview = document.getElementById('scanCamPreview');
  if (overlay) overlay.style.display = '';
  if (preview) preview.style.display = 'none';
  /* Porneste simulare LiDAR activ */
  var lidarSt = document.getElementById('lidarStatus');
  if (lidarSt) { lidarSt.innerHTML='&#x1F7E2; ON'; SS.lidar.active=true; }
  /* Timer pornit */
  recSeconds=0;
  if (recTimerInterval) clearInterval(recTimerInterval);
  recTimerInterval = setInterval(function(){
    recSeconds++;
    var m=Math.floor(recSeconds/60), s=recSeconds%60;
    var t=document.getElementById('overlayTimer');
    if (t) t.textContent=m+':'+(s<10?'0':'')+s;
  },1000);
  /* iOS: deschide camera video nativa */
  var inp = document.getElementById('scanVideoInput');
  if (inp) inp.click();
};

window.scanHandleVideoFile = function(e) {
  if (recTimerInterval) clearInterval(recTimerInterval);
  SS.lidar.active = false;
  var overlay = document.getElementById('scanLidarOverlay');
  var preview = document.getElementById('scanCamPreview');
  if (overlay) overlay.style.display='none';
  if (preview) {
    preview.style.display='flex';
    preview.innerHTML='<div style="font-size:26px;opacity:0.5">&#x23F3;</div>' +
      '<p style="font-size:9px;color:#ffc107;font-family:monospace;text-align:center;padding:0 8px;margin:0;">Se proceseaza video...</p>';
  }
  var file = e.target.files && e.target.files[0];
  if (!file) return;
  e.target.value='';
  /* Salveaza metadate dosar */
  SS.meta.date = new Date().toLocaleDateString('ro-RO');
  SS.meta.time = new Date().toLocaleTimeString('ro-RO');
  SS.meta.plate = (document.getElementById('sScanPlate')||{}).value||'';
  SS.meta.model = (document.getElementById('sScanModel')||{}).value||'';
  SS.meta.color = (document.getElementById('sScanColor')||{}).value||'';
  SS.meta.officer = (document.getElementById('sScanOfficer')||{}).value||'';
  SS.meta.gpsLat = SS.gps.lat; SS.meta.gpsLng = SS.gps.lng; SS.meta.gpsAcc = SS.gps.acc;
  SS.meta.duration = recSeconds;

  scanToastS('Video primit '+( file.size/1024/1024).toFixed(1)+'MB. Se proceseaza...','ok');
  var url = URL.createObjectURL(file);
  scanProcessVideoFromURL(url);
};

window.scanHandlePhotoFile = function(e) {
  var file = e.target.files && e.target.files[0];
  if (!file) return;
  e.target.value='';
  var reader = new FileReader();
  reader.onload = function(ev) {
    scanAddPhotoS(ev.target.result, 'Poza '+new Date().toLocaleTimeString('ro-RO'));
    var preview = document.getElementById('scanCamPreview');
    if (preview) preview.innerHTML='<img src="'+ev.target.result+'" style="width:100%;height:100%;object-fit:cover;display:block;">';
  };
  reader.readAsDataURL(file);
};

/* ═══════════════════════════════════════════════════
   PROCESARE VIDEO → SCHITA TEHNICA
   ═══════════════════════════════════════════════════ */
function scanProcessVideoFromURL(url) {
  scanView('proc', document.querySelector('.scan-view-tab'));
  var proc = document.getElementById('sProcStatus');
  if (proc) proc.innerHTML = buildProgressUI('Se incarca video...', 0);

  var vid = document.createElement('video');
  vid.src = url; vid.muted = true; vid.playsInline = true; vid.crossOrigin='anonymous';

  vid.onloadedmetadata = function() {
    SS.video.duration = vid.duration;
    var dur = vid.duration;
    /* Extrage max 40 frames distribuite uniform pe durata video */
    var nFrames = Math.min(40, Math.max(8, Math.floor(dur * 1.5)));
    var interval = dur / nFrames;
    var times = [];
    for (var t = interval/2; t < dur; t += interval) times.push(parseFloat(t.toFixed(2)));

    if (proc) proc.innerHTML = buildProgressUI('Video: '+dur.toFixed(1)+'s — extractie '+nFrames+' frames...', 5);

    extractFrames(vid, times, 0, [], function(frames) {
      SS.c3d.frames = frames;
      if (proc) proc.innerHTML = buildProgressUI('Analiza daune din '+frames.length+' frames...', 48);
      setTimeout(function(){
        var dmap = analyzeDamage(frames);
        SS.processing.damageMap = dmap;
        applyDamageToSilhouette(dmap);
        if (proc) proc.innerHTML = buildProgressUI('Generare schema tehnica 2D...', 68);
        setTimeout(function(){
          scan2dInitS();
          drawSchitaTehnica(frames, dmap);
          if (proc) proc.innerHTML = buildProgressUI('Generare model 3D...', 84);
          setTimeout(function(){
            buildModel3D(frames, dmap);
            SS.processing.done = true;
            if (proc) proc.innerHTML = buildDoneUI(frames.length, dmap);
            URL.revokeObjectURL(url);
            var preview = document.getElementById('scanCamPreview');
            if (preview && frames.length > 0) {
              preview.innerHTML='<img src="'+frames[Math.floor(frames.length/2)].dataUrl+'" style="width:100%;height:100%;object-fit:cover;display:block;">';
            }
            scanToastS('Cartografiere completa! '+frames.length+' frames','ok');
          }, 400);
        }, 300);
      }, 200);
    });
  };
  vid.onerror = function() {
    if (proc) proc.innerHTML='<div style="color:#f44336;font-family:monospace;font-size:11px;text-align:center;padding:20px;">Eroare la incarcarea video. Incearca din nou.</div>';
  };
  vid.load();
}

function extractFrames(vid, times, idx, frames, done) {
  if (idx >= times.length) { done(frames); return; }
  var proc = document.getElementById('sProcStatus');
  var pct = Math.round(5 + (idx/times.length)*40);
  if (proc) proc.innerHTML = buildProgressUI('Frame '+(idx+1)+'/'+times.length+'...', pct);
  vid.currentTime = times[idx];
  vid.onseeked = function() {
    var cv = document.createElement('canvas');
    /* Rezolutie mai mare pentru analiza mai buna */
    cv.width = Math.min(vid.videoWidth||640, 480);
    cv.height = Math.min(vid.videoHeight||480, 360);
    var ctx = cv.getContext('2d');
    try {
      ctx.drawImage(vid, 0, 0, cv.width, cv.height);
      var imgData = ctx.getImageData(0, 0, cv.width, cv.height);
      frames.push({
        time: times[idx],
        dataUrl: cv.toDataURL('image/jpeg', 0.75),
        w: cv.width, h: cv.height,
        imageData: imgData
      });
      scanAddPhotoS(frames[frames.length-1].dataUrl,
        'Frame '+(idx+1)+' @'+times[idx].toFixed(1)+'s');
    } catch(e) { console.warn('Frame err:', e); }
    extractFrames(vid, times, idx+1, frames, done);
  };
}

/* ── Analiza daune avansata ── */
function analyzeDamage(frames) {
  var nf = frames.length;
  var zones = ['fata','spate','dr','st','capota','portbagaj','acop'];
  var scores = {}; var counts = {};
  zones.forEach(function(z){ scores[z]=0; counts[z]=0; });

  frames.forEach(function(frame, fi) {
    var data = frame.imageData ? frame.imageData.data : null;
    if (!data) return;
    var W = frame.w, H = frame.h;
    var pos = fi / nf; /* pozitia in tur 360 */

    /* Impartim frame in regiuni si calculam scor daune */
    function regionScore(x1p, y1p, x2p, y2p) {
      var x1=Math.floor(W*x1p), y1=Math.floor(H*y1p);
      var x2=Math.floor(W*x2p), y2=Math.floor(H*y2p);
      var dmg=0, total=0;
      /* Calculeaza gradient local pentru detectie zgarieturi/deformari */
      for (var py=y1; py<y2-1; py+=3) {
        for (var px=x1; px<x2-1; px+=3) {
          var i=(py*W+px)*4;
          var ir=((py+1)*W+px)*4;
          var ic=(py*W+(px+1))*4;
          var r=data[i],g=data[i+1],b=data[i+2];
          /* Gradient vertical si orizontal */
          var gv=Math.abs(r-data[ir])+Math.abs(g-data[ir+1])+Math.abs(b-data[ir+2]);
          var gh=Math.abs(r-data[ic])+Math.abs(g-data[ic+1])+Math.abs(b-data[ic+2]);
          var grad=(gv+gh)/6;
          var brightness=(r+g+b)/3;
          /* Daune: gradient mare (margini deformari) + luminozitate anormala */
          var isReflection=(brightness>210&&Math.max(r,g,b)-Math.min(r,g,b)<30);
          var isDent=(brightness<35);
          var isRust=(r>120&&g<70&&b<70);
          var isHighEdge=(grad>45);
          if (isReflection||isDent||isRust||(isHighEdge&&(brightness<60||brightness>200))) dmg++;
          total++;
        }
      }
      return total>0?dmg/total:0;
    }

    /* Zona corpului masinii = 20%-80% latime, 15%-85% inaltime */
    var bodyScore = regionScore(0.15, 0.15, 0.85, 0.82);

    /* Mapeaza pozitia in tur la zona vehicul */
    /* pos ~0 si ~1 = fata, ~0.25 = dr, ~0.5 = spate, ~0.75 = st */
    var zone='', topZone='';
    if (pos < 0.12 || pos > 0.88)      { zone='fata'; }
    else if (pos < 0.38)                { zone='dr'; }
    else if (pos < 0.62)                { zone='spate'; }
    else                                { zone='st'; }

    scores[zone] += bodyScore; counts[zone]++;

    /* Top frame = capota/portbagaj/acoperis */
    var topScore = regionScore(0.2, 0.05, 0.8, 0.35);
    if (pos < 0.25 || pos > 0.75)      { scores.capota+=topScore; counts.capota++; }
    else                                { scores.portbagaj+=topScore; counts.portbagaj++; }
    scores.acop += topScore*0.4; counts.acop++;
  });

  /* Clasificare cu praguri calibrate */
  var result = {};
  var T = { minor:0.012, major:0.028, total:0.055 };
  zones.forEach(function(z) {
    var avg = counts[z]>0 ? scores[z]/counts[z] : 0;
    if      (avg >= T.total) result[z]='total';
    else if (avg >= T.major) result[z]='major';
    else if (avg >= T.minor) result[z]='minor';
  });
  return result;
}

/* ═══════════════════════════════════════════════════
   SCHITA TEHNICA STIL POLITIE RUTIERA
   ═══════════════════════════════════════════════════ */
function drawSchitaTehnica(frames, dmap) {
  if (!c2 || !x2) { scan2dInitS(); if(!c2||!x2) return; }
  var W = c2.width, H = c2.height;

  /* Reset complet canvas */
  x2.clearRect(0,0,W,H);

  /* ── FUNDAL ALB stil tehnic ── */
  x2.fillStyle = '#f8f9fa';
  x2.fillRect(0,0,W,H);

  /* ── CADRU DOSAR ── */
  x2.strokeStyle = '#1a237e';
  x2.lineWidth = 2;
  x2.strokeRect(4,4,W-8,H-8);
  x2.strokeStyle = '#1a237e';
  x2.lineWidth = 0.5;
  x2.strokeRect(8,8,W-16,H-16);

  /* ── HEADER ── */
  var hH = 52;
  x2.fillStyle = '#1a237e';
  x2.fillRect(8,8,W-16,hH);
  x2.fillStyle = '#ffffff';
  x2.font = 'bold 11px monospace';
  x2.textAlign = 'center';
  x2.fillText('SCHEMA TEHNICA VEHICUL AVARIAT — BIROUL RUTIER', W/2, 24);
  x2.font = '9px monospace';
  var metaLine = '';
  if (SS.meta.plate) metaLine += 'NR: '+SS.meta.plate+'   ';
  if (SS.meta.model) metaLine += SS.meta.model+'   ';
  if (SS.meta.color) metaLine += SS.meta.color;
  x2.fillText(metaLine, W/2, 38);
  x2.font = '8px monospace';
  x2.fillStyle = '#b3e5fc';
  var dateLine = SS.meta.date+'  '+SS.meta.time;
  if (SS.meta.officer) dateLine += '   OFITER: '+SS.meta.officer.toUpperCase();
  x2.fillText(dateLine, W/2, 50);

  /* ── GPS / COORDONATE ── */
  x2.textAlign = 'left';
  x2.font = '7.5px monospace';
  x2.fillStyle = '#546e7a';
  var gpsY = 70;
  if (SS.meta.gpsLat) {
    x2.fillStyle = '#2e7d32';
    x2.fillText('GPS: '+SS.meta.gpsLat.toFixed(6)+', '+SS.meta.gpsLng.toFixed(6)+
      ' (±'+SS.meta.gpsAcc.toFixed(0)+'m)', 12, gpsY);
  }
  x2.fillStyle = '#546e7a';
  x2.fillText('Frames procesate: '+frames.length+'  |  Durata filmare: '+
    Math.floor(SS.meta.duration/60)+'m '+( SS.meta.duration%60)+'s  |  LiDAR: '+
    (DEVICE.hasLiDAR?'ACTIV':'N/A'), 12, gpsY+11);

  /* ── ZONA DESENARE MASINA ── */
  var drawY = gpsY + 22;
  var drawH = H - drawY - 40;
  var drawW = W - 16;

  /* VEDERE TOP (sus 55% din zona de desenare) */
  var topH = Math.floor(drawH * 0.56);
  var topY = drawY;
  /* VEDERE LATERAL (jos 44%) */
  var sideH = drawH - topH - 6;
  var sideY = topY + topH + 6;

  /* Separator */
  x2.strokeStyle = '#90a4ae';
  x2.lineWidth = 0.5;
  x2.setLineDash([4,3]);
  x2.beginPath(); x2.moveTo(12,topY+topH+3); x2.lineTo(W-12,topY+topH+3); x2.stroke();
  x2.setLineDash([]);

  /* Label vederi */
  x2.font = 'bold 7.5px monospace'; x2.fillStyle = '#37474f'; x2.textAlign = 'left';
  x2.fillText('VEDERE DE SUS (TOP VIEW)', 14, topY+10);
  x2.fillText('VEDERE LATERAL DREAPTA / LATERAL STANGA', 14, sideY+10);

  /* ── TOP VIEW ── */
  drawTopView(x2, 12, topY+12, drawW, topH-14, dmap, frames);

  /* ── SIDE VIEW ── */
  drawSideView(x2, 12, sideY+12, drawW, sideH-14, dmap, frames);

  /* ── LEGENDA ── */
  drawLegenda(x2, W, H);

  /* ── SEMNATURA / STAMPILA ── */
  drawFooter(x2, W, H);

  /* Restaureaza obiecte desenate manual */
  SS.c2d.objs.forEach(function(o){ scan2dDrawS(o); });
}

function drawTopView(ctx, x, y, w, h, dmap, frames) {
  var cx = x + w/2, cy = y + h/2;
  var carW = Math.min(w*0.38, h*1.1);
  var carH = carW * 0.48;

  /* Grid tehnic */
  ctx.strokeStyle = 'rgba(100,181,246,0.12)';
  ctx.lineWidth = 0.5;
  var gs = 20;
  for (var gx=x; gx<x+w; gx+=gs) { ctx.beginPath();ctx.moveTo(gx,y);ctx.lineTo(gx,y+h);ctx.stroke(); }
  for (var gy=y; gy<y+h; gy+=gs) { ctx.beginPath();ctx.moveTo(x,gy);ctx.lineTo(x+w,gy);ctx.stroke(); }

  /* Caroserie */
  ctx.strokeStyle = '#1a237e'; ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(200,210,240,0.3)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cx-carW, cy-carH, carW*2, carH*2, 12);
  else ctx.rect(cx-carW, cy-carH, carW*2, carH*2);
  ctx.fill(); ctx.stroke();

  /* Habitaclu */
  ctx.strokeStyle = '#283593'; ctx.lineWidth = 1.5;
  ctx.fillStyle = 'rgba(150,160,200,0.25)';
  ctx.beginPath();
  ctx.rect(cx-carW*0.42, cy-carH*0.68, carW*0.84, carH*1.36);
  ctx.fill(); ctx.stroke();

  /* Ferestre */
  ctx.fillStyle = 'rgba(100,181,246,0.2)';
  ctx.strokeStyle = '#5c6bc0'; ctx.lineWidth=0.8;
  [[-0.2, -0.58, 0.35, 0.55],[ 0.04, -0.58, 0.35, 0.55]].forEach(function(f){
    ctx.beginPath();ctx.rect(cx+f[0]*carW,cy+f[1]*carH,f[2]*carW,f[3]*carH*2);ctx.fill();ctx.stroke();
  });

  /* Roți */
  ctx.fillStyle='#37474f'; ctx.strokeStyle='#1a237e'; ctx.lineWidth=1.5;
  var ww=carW*0.14, wh=carH*0.26;
  [[-0.72,-0.82],[-0.72,0.82],[0.72,-0.82],[0.72,0.82]].forEach(function(w){
    ctx.beginPath();ctx.ellipse(cx+w[0]*carW,cy+w[1]*carH,wh,ww,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  });

  /* Faruri */
  ctx.fillStyle='rgba(255,255,150,0.8)'; ctx.strokeStyle='#f9a825'; ctx.lineWidth=1;
  [[carW-3,-carH*0.45],[carW-3,carH*0.45]].forEach(function(f){
    ctx.beginPath();ctx.ellipse(cx+f[0],cy+f[1],5,4,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  });

  /* Stopuri spate */
  ctx.fillStyle='rgba(244,67,54,0.8)'; ctx.strokeStyle='#c62828'; ctx.lineWidth=1;
  [[-carW+3,-carH*0.45],[-carW+3,carH*0.45]].forEach(function(f){
    ctx.beginPath();ctx.ellipse(cx+f[0],cy+f[1],5,4,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  });

  /* Zone daune cu hasuare tehnica */
  var sevColors = { minor:['rgba(255,193,7,0.5)','#f9a825'], major:['rgba(255,87,34,0.55)','#e64a19'], total:['rgba(244,67,54,0.6)','#c62828'] };
  var sevHatch  = { minor:'////', major:'XXXX', total:'####' };
  var zoneRects = {
    fata:      {rx:cx+carW*0.82, ry:cy, rw:carW*0.26, rh:carH*1.3},
    spate:     {rx:cx-carW*0.82, ry:cy, rw:carW*0.26, rh:carH*1.3},
    dr:        {rx:cx, ry:cy+carH*0.82, rw:carW*1.5, rh:carH*0.28},
    st:        {rx:cx, ry:cy-carH*0.82, rw:carW*1.5, rh:carH*0.28},
    capota:    {rx:cx+carW*0.38, ry:cy, rw:carW*0.7, rh:carH*0.9},
    portbagaj: {rx:cx-carW*0.38, ry:cy, rw:carW*0.7, rh:carH*0.9},
    acop:      {rx:cx, ry:cy, rw:carW*0.78, rh:carH*0.65}
  };

  Object.entries(dmap).forEach(function(entry) {
    var zone=entry[0], sev=entry[1];
    var zr=zoneRects[zone]; if(!zr||!sev) return;
    var sc=sevColors[sev];
    /* Hasuara */
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(zr.rx,zr.ry,zr.rw/2,zr.rh/2,0,0,Math.PI*2);
    ctx.clip();
    ctx.fillStyle=sc[0]; ctx.fill();
    /* Hasuare tehnica */
    ctx.strokeStyle=sc[1]; ctx.lineWidth=0.8;
    for (var hi=-Math.max(zr.rw,zr.rh); hi<Math.max(zr.rw,zr.rh); hi+=6) {
      if (sev==='total') {
        ctx.beginPath();ctx.moveTo(zr.rx+hi,zr.ry-zr.rh);ctx.lineTo(zr.rx+hi,zr.ry+zr.rh);ctx.stroke();
        ctx.beginPath();ctx.moveTo(zr.rx-zr.rw,zr.ry+hi);ctx.lineTo(zr.rx+zr.rw,zr.ry+hi);ctx.stroke();
      } else if (sev==='major') {
        ctx.beginPath();ctx.moveTo(zr.rx-zr.rw/2+hi,zr.ry-zr.rh);ctx.lineTo(zr.rx+hi,zr.ry+zr.rh);ctx.stroke();
        ctx.beginPath();ctx.moveTo(zr.rx+hi,zr.ry-zr.rh);ctx.lineTo(zr.rx-zr.rw/2+hi,zr.ry+zr.rh);ctx.stroke();
      } else {
        ctx.beginPath();ctx.moveTo(zr.rx-zr.rw/2+hi,zr.ry-zr.rh);ctx.lineTo(zr.rx+hi,zr.ry+zr.rh);ctx.stroke();
      }
    }
    ctx.restore();
    /* Contur */
    ctx.beginPath(); ctx.ellipse(zr.rx,zr.ry,zr.rw/2,zr.rh/2,0,0,Math.PI*2);
    ctx.strokeStyle=sc[1]; ctx.lineWidth=1.5; ctx.stroke();
    /* Label zona */
    ctx.fillStyle=sc[1]; ctx.font='bold 8px monospace'; ctx.textAlign='center';
    ctx.fillText(zone.toUpperCase(),zr.rx,zr.ry-3);
    ctx.font='7px monospace'; ctx.fillStyle='#333';
    ctx.fillText(sev.toUpperCase(),zr.rx,zr.ry+8);
    ctx.textAlign='left';
  });

  /* Cote dimensionale */
  drawDimension(ctx, cx-carW, cy-carH-12, cx+carW, cy-carH-12, '~4.5m', '#546e7a');
  drawDimension(ctx, cx+carW+12, cy-carH, cx+carW+12, cy+carH, '~1.8m', '#546e7a');

  /* Busola N */
  ctx.fillStyle='#1a237e'; ctx.font='bold 9px monospace'; ctx.textAlign='right';
  ctx.fillText('N &#x2191;', x+w-5, y+20);
  ctx.textAlign='left';
}

function drawSideView(ctx, x, y, w, h, dmap, frames) {
  var cx = x+w/2, cy = y+h/2;
  var carL = Math.min(w*0.42, h*2.2);
  var carH2 = carL * 0.32;

  /* Grid */
  ctx.strokeStyle='rgba(100,181,246,0.1)'; ctx.lineWidth=0.4;
  for (var gx=x; gx<x+w; gx+=20) {ctx.beginPath();ctx.moveTo(gx,y);ctx.lineTo(gx,y+h);ctx.stroke();}
  for (var gy=y; gy<y+h; gy+=20) {ctx.beginPath();ctx.moveTo(x,gy);ctx.lineTo(x+w,gy);ctx.stroke();}

  /* Caroserie laterala */
  ctx.strokeStyle='#1a237e'; ctx.lineWidth=1.8;
  ctx.fillStyle='rgba(200,210,240,0.35)';

  /* Trapez masina */
  var bL=cx-carL, bR=cx+carL, bY=cy+carH2;
  var tL=cx-carL*0.6, tR=cx+carL*0.55, tY=cy-carH2;
  ctx.beginPath();
  ctx.moveTo(bL,bY); ctx.lineTo(bR,bY);
  ctx.lineTo(bR,cy); ctx.lineTo(tR,tY);
  ctx.lineTo(tL,tY); ctx.lineTo(bL,cy);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  /* Ferestre laterale */
  ctx.fillStyle='rgba(100,181,246,0.25)'; ctx.strokeStyle='#5c6bc0'; ctx.lineWidth=0.8;
  ctx.beginPath();
  ctx.moveTo(bL+carL*0.15, cy);
  ctx.lineTo(tL+carL*0.1, tY+5);
  ctx.lineTo(tR-carL*0.15, tY+5);
  ctx.lineTo(bR-carL*0.18, cy);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  /* Roți */
  ctx.fillStyle='#37474f'; ctx.strokeStyle='#1a237e'; ctx.lineWidth=1.5;
  var wr = carH2*0.42;
  [[bL+carL*0.2, bY],[bR-carL*0.2, bY]].forEach(function(w){
    ctx.beginPath(); ctx.arc(w[0],w[1],wr,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(w[0],w[1],wr*0.45,0,Math.PI*2);
    ctx.fillStyle='#78909c'; ctx.fill(); ctx.fillStyle='#37474f';
  });

  /* Fanta usa */
  ctx.strokeStyle='#546e7a'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(cx-carL*0.08, tY+10); ctx.lineTo(cx-carL*0.08, bY-wr*0.5);
  ctx.stroke();

  /* Zone daune lateral */
  var sevColors2 = { minor:['rgba(255,193,7,0.5)','#f9a825'], major:['rgba(255,87,34,0.55)','#e64a19'], total:['rgba(244,67,54,0.6)','#c62828'] };

  if (dmap.fata) {
    drawDmgZoneSide(ctx, bR-carL*0.05, cy, carL*0.16, carH2*1.1, dmap.fata, sevColors2, 'FATA');
  }
  if (dmap.spate) {
    drawDmgZoneSide(ctx, bL+carL*0.05, cy, carL*0.16, carH2*1.1, dmap.spate, sevColors2, 'SPATE');
  }
  if (dmap.dr) {
    drawDmgZoneSide(ctx, cx, bY-carH2*0.3, carL*1.0, carH2*0.35, dmap.dr, sevColors2, 'LAT.DR');
  }
  if (dmap.capota) {
    drawDmgZoneSide(ctx, cx+carL*0.4, cy-carH2*0.6, carL*0.45, carH2*0.5, dmap.capota, sevColors2, 'CAPOTA');
  }
  if (dmap.portbagaj) {
    drawDmgZoneSide(ctx, cx-carL*0.5, cy-carH2*0.4, carL*0.3, carH2*0.6, dmap.portbagaj, sevColors2, 'PORTBAG.');
  }

  /* Cota inaltime */
  drawDimension(ctx, bR+carL*0.08, bY, bR+carL*0.08, tY, '~1.5m', '#546e7a');
  drawDimension(ctx, bL, bY+wr*0.6, bR, bY+wr*0.6, '~4.5m', '#546e7a');
}

function drawDmgZoneSide(ctx, rx, ry, rw, rh, sev, sc, label) {
  var c = sc[sev];
  ctx.save();
  ctx.beginPath(); ctx.ellipse(rx, ry, rw/2, rh/2, 0, 0, Math.PI*2); ctx.clip();
  ctx.fillStyle=c[0]; ctx.fill();
  ctx.strokeStyle=c[1]; ctx.lineWidth=0.8;
  for (var hi=-Math.max(rw,rh); hi<Math.max(rw,rh); hi+=5) {
    if (sev==='total') {
      ctx.beginPath();ctx.moveTo(rx+hi,ry-rh);ctx.lineTo(rx+hi,ry+rh);ctx.stroke();
      ctx.beginPath();ctx.moveTo(rx-rw,ry+hi);ctx.lineTo(rx+rw,ry+hi);ctx.stroke();
    } else {
      ctx.beginPath();ctx.moveTo(rx-rw/2+hi,ry-rh);ctx.lineTo(rx+hi,ry+rh);ctx.stroke();
    }
  }
  ctx.restore();
  ctx.beginPath(); ctx.ellipse(rx,ry,rw/2,rh/2,0,0,Math.PI*2);
  ctx.strokeStyle=c[1]; ctx.lineWidth=1.2; ctx.stroke();
  ctx.fillStyle=c[1]; ctx.font='bold 7px monospace'; ctx.textAlign='center';
  ctx.fillText(label, rx, ry+3);
  ctx.textAlign='left';
}

function drawDimension(ctx, x1, y1, x2, y2, label, color) {
  ctx.strokeStyle=color||'#90a4ae'; ctx.lineWidth=0.8; ctx.fillStyle=color||'#90a4ae';
  ctx.font='7px monospace'; ctx.textAlign='center';
  /* Linie principala */
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  /* Markere capat */
  var dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy);
  if (len < 1) return;
  var nx=dx/len, ny=dy/len, px=-ny, py=nx;
  var as=5;
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x1+nx*as+px*as,y1+ny*as+py*as); ctx.lineTo(x1+nx*as-px*as,y1+ny*as-py*as); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2-nx*as+px*as,y2-ny*as+py*as); ctx.lineTo(x2-nx*as-px*as,y2-ny*as-py*as); ctx.closePath(); ctx.fill();
  /* Label */
  ctx.fillText(label, (x1+x2)/2+py*10, (y1+y2)/2+py*10+3);
  ctx.textAlign='left';
}

function drawLegenda(ctx, W, H) {
  var lx=W-130, ly=H-82, lw=122, lh=70;
  ctx.fillStyle='rgba(248,249,250,0.95)';
  ctx.strokeStyle='#1a237e'; ctx.lineWidth=1;
  ctx.fillRect(lx,ly,lw,lh); ctx.strokeRect(lx,ly,lw,lh);
  ctx.fillStyle='#1a237e'; ctx.font='bold 8px monospace'; ctx.textAlign='left';
  ctx.fillText('LEGENDA DAUNE:', lx+4, ly+12);
  var items = [
    ['rgba(255,193,7,0.7)','#f9a825','/// Minor — zgarieturi / vopsea'],
    ['rgba(255,87,34,0.7)','#e64a19','XX Major — deformare / impact'],
    ['rgba(244,67,54,0.7)','#c62828','## Total — distrugere severa']
  ];
  items.forEach(function(item, i) {
    var iy = ly + 22 + i*16;
    ctx.fillStyle=item[0]; ctx.fillRect(lx+4, iy-7, 14, 10);
    ctx.strokeStyle=item[1]; ctx.lineWidth=0.8; ctx.strokeRect(lx+4,iy-7,14,10);
    ctx.fillStyle='#333'; ctx.font='7.5px monospace';
    ctx.fillText(item[2], lx+21, iy+1);
  });
  ctx.textAlign='left';
}

function drawFooter(ctx, W, H) {
  var fy = H-12;
  ctx.fillStyle='#546e7a'; ctx.font='7px monospace'; ctx.textAlign='left';
  ctx.fillText('Generat automat din video 360° cu sistem LiDAR iPhone Pro | ScetchACC v4.0 | Biroul Rutier Arad', 12, fy);
  ctx.textAlign='right';
  if (SS.meta.plate) ctx.fillText('NR: '+SS.meta.plate, W-12, fy);
  ctx.textAlign='left';
}

/* Regenereaza schita tehnica */
window.schitaRegen = function() {
  if (SS.c3d.frames.length > 0) {
    drawSchitaTehnica(SS.c3d.frames, SS.processing.damageMap);
    scanToastS('Schita regenerata!','ok');
  } else {
    scanToastS('Filmeaza mai intai vehiculul.','err');
  }
};

/* ═══════════════════════════════════════════════════
   MODEL 3D
   ═══════════════════════════════════════════════════ */
var rotSpeed = 0.4;
window.scan3dRotSpeed = function(dir) {
  rotSpeed = Math.max(0.1, Math.min(2.0, rotSpeed + dir*0.15));
};

function buildModel3D(frames, dmap) {
  var ph = document.getElementById('sPlaceholder3d');
  if (ph) ph.style.display='none';
  if (SS.c3d.raf) cancelAnimationFrame(SS.c3d.raf);
  var cv = document.getElementById('sScanCanvas3D');
  if (!cv) return;
  var ctx = cv.getContext('2d');

  /* Pregatire texturi */
  var texImgs = [];
  var nTex = 8;
  var step = Math.max(1, Math.floor(frames.length/nTex));
  var toLoad = frames.filter(function(_,i){ return i%step===0; }).slice(0,nTex);
  var loaded = 0;

  function startAnim() {
    var ang = 0;
    var zones = Object.entries(SS.zones);
    function frame() {
      var W=cv.offsetWidth||400, H=cv.offsetHeight||320;
      cv.width=W; cv.height=H;
      ctx.fillStyle='#050c1a'; ctx.fillRect(0,0,W,H);

      /* Grid podea */
      var rot = ang*Math.PI/180;
      ctx.strokeStyle='rgba(0,229,255,0.04)'; ctx.lineWidth=0.8;
      for (var gi=-8;gi<=8;gi++){
        ctx.beginPath();ctx.moveTo(W/2+gi*28*0.9,H*0.55);ctx.lineTo(W/2+gi*28*1.8,H);ctx.stroke();
      }
      for (var gj=0;gj<=5;gj++){
        var t=gj/5;
        ctx.beginPath();ctx.moveTo(W/2-28*7*(1+t),H*0.55+t*(H*0.45));ctx.lineTo(W/2+28*7*(1+t),H*0.55+t*(H*0.45));ctx.stroke();
      }

      var sc = Math.min(W,H)*0.003;
      function proj(x,y,z){
        var rx=x*Math.cos(rot)-z*Math.sin(rot);
        var rz=x*Math.sin(rot)+z*Math.cos(rot);
        return {px:W/2+rx*sc*78+rz*sc*26, py:H*0.43-y*sc*68+rz*sc*13};
      }
      function fc(n){
        for(var zi=0;zi<zones.length;zi++){
          var el=document.getElementById(zones[zi][0]);
          if(el&&el.dataset&&el.dataset.zone&&el.dataset.zone.toLowerCase().indexOf(n.toLowerCase())>=0){
            var sv=zones[zi][1];
            return sv==='minor'?'rgba(255,193,7,0.5)':sv==='major'?'rgba(255,87,34,0.6)':'rgba(244,67,54,0.7)';
          }
        }
        return null;
      }
      function face(pts,defCol,texI,al){
        ctx.beginPath();ctx.moveTo(pts[0].px,pts[0].py);
        for(var fi=1;fi<pts.length;fi++) ctx.lineTo(pts[fi].px,pts[fi].py);
        ctx.closePath();
        /* Textura */
        if(texImgs[texI||0]&&texImgs[texI||0].complete){
          try{
            ctx.save();ctx.clip();
            var mx=pts[0].px,mn=pts[0].px,my=pts[0].py,myn=pts[0].py;
            pts.forEach(function(p){mx=Math.max(mx,p.px);mn=Math.min(mn,p.px);my=Math.max(my,p.py);myn=Math.min(myn,p.py);});
            ctx.globalAlpha=(al||0.85)*0.65;
            ctx.drawImage(texImgs[texI||0],mn,myn,mx-mn,my-myn);
            ctx.restore();
          }catch(e){}
        }
        ctx.fillStyle=defCol||'rgba(13,31,58,0.85)';
        ctx.globalAlpha=(al||0.85)*0.45; ctx.fill();
        ctx.globalAlpha=1;
        ctx.strokeStyle='rgba(0,229,255,0.25)'; ctx.lineWidth=0.8; ctx.stroke();
      }

      var ti=Math.floor((ang%360)/45)%nTex;
      var p=[proj(-80,-10,-25),proj(80,-10,-25),proj(80,-10,25),proj(-80,-10,25),
             proj(-80,10,-25),proj(80,10,-25),proj(80,10,25),proj(-80,10,25)];
      face([p[0],p[1],p[5],p[4]], fc('fata')||'rgba(13,31,58,0.85)', ti);
      face([p[2],p[3],p[7],p[6]], fc('spate')||'rgba(13,31,58,0.85)', (ti+4)%nTex);
      face([p[0],p[3],p[7],p[4]], fc('Lateral')||'rgba(10,28,50,0.85)', (ti+2)%nTex);
      face([p[1],p[2],p[6],p[5]], fc('Lateral')||'rgba(10,28,50,0.85)', (ti+6)%nTex);
      face([p[4],p[5],p[6],p[7]], fc('capota')||'rgba(8,22,40,0.9)', ti);
      face([p[0],p[1],p[2],p[3]], 'rgba(4,10,20,0.95)', 0);

      /* Habitaclu */
      var hab=[proj(-38,-10,-20),proj(38,-10,-20),proj(38,-10,20),proj(-38,-10,20),
               proj(-33,-30,-17),proj(33,-30,-17),proj(33,-30,17),proj(-33,-30,17)];
      face([hab[4],hab[5],hab[6],hab[7]], fc('acop')||'rgba(5,15,30,0.9)', ti, 0.65);
      face([hab[0],hab[1],hab[5],hab[4]], 'rgba(8,20,40,0.6)', 0, 0.5);
      face([hab[2],hab[3],hab[7],hab[6]], 'rgba(8,20,40,0.6)', 0, 0.5);

      /* Geamuri */
      ctx.strokeStyle='rgba(100,181,246,0.25)'; ctx.lineWidth=0.5;
      var wl=[proj(-36,-12,-19),proj(0,-12,-19),proj(0,-12,19),proj(-36,-12,19)];
      ctx.beginPath();ctx.moveTo(wl[0].px,wl[0].py);wl.forEach(function(p){ctx.lineTo(p.px,p.py);});ctx.closePath();ctx.stroke();

      /* Roți */
      [{x:-62,z:-26},{x:-62,z:26},{x:62,z:-26},{x:62,z:26}].forEach(function(w){
        var wp=proj(w.x,10,w.z);
        ctx.beginPath();ctx.ellipse(wp.px,wp.py,13*sc*22,8*sc*22,0.3,0,Math.PI*2);
        ctx.fillStyle='#060a14';ctx.fill();ctx.strokeStyle='rgba(0,229,255,0.3)';ctx.lineWidth=1.8;ctx.stroke();
        ctx.beginPath();ctx.ellipse(wp.px,wp.py,6*sc*22,4*sc*22,0.3,0,Math.PI*2);
        ctx.strokeStyle='rgba(150,180,210,0.35)';ctx.lineWidth=1;ctx.stroke();
      });

      /* Faruri */
      var fpos=[proj(82,0,-20),proj(82,0,20)];
      fpos.forEach(function(fp){
        ctx.beginPath();ctx.ellipse(fp.px,fp.py,8,5,0.2,0,Math.PI*2);
        ctx.fillStyle='rgba(255,255,180,0.75)';ctx.fill();
        ctx.strokeStyle='rgba(255,255,100,0.5)';ctx.lineWidth=0.8;ctx.stroke();
      });

      /* Stopuri */
      var spos=[proj(-82,0,-20),proj(-82,0,20)];
      spos.forEach(function(sp){
        ctx.beginPath();ctx.ellipse(sp.px,sp.py,7,4,0.2,0,Math.PI*2);
        ctx.fillStyle='rgba(255,30,30,0.75)';ctx.fill();
      });

      /* HUD */
      var now = new Date();
      var zp=function(n){return n<10?'0'+n:n;};
      ctx.fillStyle='rgba(0,229,255,0.65)'; ctx.font='8px monospace';
      var m=document.getElementById('sScanModel');
      ctx.fillText('3D: '+(m&&m.value?m.value:'VEHICUL'), 8, 13);
      ctx.fillText(zp(now.getDate())+'.'+zp(now.getMonth()+1)+'.'+now.getFullYear()+
        '  '+zp(now.getHours())+':'+zp(now.getMinutes())+':'+zp(now.getSeconds()), 8, 24);
      if(SS.gps.lat){ ctx.fillStyle='rgba(76,175,80,0.7)'; ctx.font='7px monospace';
        ctx.fillText('GPS: '+SS.gps.lat.toFixed(5)+', '+SS.gps.lng.toFixed(5)+' ±'+SS.gps.acc.toFixed(0)+'m', 8, 33); }
      var plate=document.getElementById('sScanPlate');
      if(plate&&plate.value){ ctx.fillStyle='rgba(255,193,7,0.8)'; ctx.font='bold 9px monospace';
        ctx.fillText(plate.value, W-8-ctx.measureText(plate.value).width, 13); }
      ctx.fillStyle='rgba(100,181,246,0.5)'; ctx.font='7px monospace';
      ctx.fillText('ROT '+Math.round(ang%360)+'°  FRAMES:'+frames.length+'  LiDAR:'+(DEVICE.hasLiDAR?'ON':'N/A'), 8, H-6);
      var dmgN=Object.keys(SS.zones).length;
      if(dmgN>0){ ctx.fillStyle='rgba(244,67,54,0.7)'; ctx.font='bold 8px monospace';
        ctx.fillText('DAUNE: '+dmgN+' ZONE', W-8-ctx.measureText('DAUNE: '+dmgN+' ZONE').width, H-6); }

      ang += rotSpeed;
      SS.c3d.raf = requestAnimationFrame(frame);
    }
    frame();
  }

  if (toLoad.length > 0) {
    toLoad.forEach(function(f,i){
      var img=new Image();
      img.onload=function(){ texImgs[i]=img; loaded++; if(loaded>=toLoad.length) startAnim(); };
      img.onerror=function(){ loaded++; if(loaded>=toLoad.length) startAnim(); };
      img.src=f.dataUrl;
    });
  } else { startAnim(); }
}

/* ═══════════════════════════════════════════════════
   ZONE DAUNE
   ═══════════════════════════════════════════════════ */
function applyDamageToSilhouette(dmap) {
  var c={ minor:['rgba(255,193,7,0.35)','#ffc107'], major:['rgba(255,87,34,0.45)','#ff5722'], total:['rgba(244,67,54,0.55)','#f44336'] };
  var zm={ fata:'sdz-fata',spate:'sdz-spate',dr:'sdz-dr',st:'sdz-st',capota:'sdz-capota',portbagaj:'sdz-portbagaj',acop:'sdz-acop' };
  Object.keys(dmap).forEach(function(z){
    var sev=dmap[z]; var el=document.getElementById(zm[z]);
    if(el&&sev){ el.setAttribute('fill',c[sev][0]); el.setAttribute('stroke',c[sev][1]); SS.zones[zm[z]]=sev; }
  });
  updateZoneList();
}

function updateZoneList() {
  var list=document.getElementById('sScanZoneList'); if(!list) return;
  var entries=Object.entries(SS.zones);
  if(!entries.length){ list.innerHTML='-- Nicio zona --'; return; }
  var cols={minor:'#ffc107',major:'#ff5722',total:'#f44336'};
  list.innerHTML=entries.map(function(e){
    var el=document.getElementById(e[0]);
    var n=el&&el.dataset?el.dataset.zone:e[0];
    return '<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #1a2f4a;">'+
      '<span>'+n+'</span><span style="color:'+cols[e[1]]+'">'+e[1].toUpperCase()+'</span></div>';
  }).join('');
}

window.scanSetSev=function(btn,sev){ SS.sev=sev; document.querySelectorAll('.scan-sev-btn').forEach(function(b){ b.classList.toggle('scan-sev-active',b.dataset.sev===sev); }); };
window.scanMarkZone=function(el){
  var id=el.id,sev=SS.sev,cur=SS.zones[id];
  if(cur===sev){ delete SS.zones[id]; el.setAttribute('fill','rgba(0,229,255,0.05)'); el.setAttribute('stroke','rgba(0,229,255,0.25)'); }
  else{ SS.zones[id]=sev; var c={minor:['rgba(255,193,7,0.35)','#ffc107'],major:['rgba(255,87,34,0.45)','#ff5722'],total:['rgba(244,67,54,0.55)','#f44336']}; el.setAttribute('fill',c[sev][0]); el.setAttribute('stroke',c[sev][1]); }
  updateZoneList();
};

/* ═══════════════════════════════════════════════════
   VIEW SWITCHING
   ═══════════════════════════════════════════════════ */
window.scanView=function(v,btn){
  document.querySelectorAll('.scan-view-tab').forEach(function(b){b.classList.remove('scan-view-active');});
  if(btn) btn.classList.add('scan-view-active');
  var map={'proc':'sViewProc','schita':'sViewSchita','3d':'sView3d','sil':'sViewSil','foto':'sViewFoto'};
  Object.values(map).forEach(function(id){ var el=document.getElementById(id); if(el){ el.style.display='none'; el.classList.remove('scan-view-show'); } });
  var t=document.getElementById(map[v]); if(t){ t.style.display='flex'; t.classList.add('scan-view-show'); }
  if(v==='schita') setTimeout(scan2dResizeS,50);
};

/* ═══════════════════════════════════════════════════
   CANVAS 2D
   ═══════════════════════════════════════════════════ */
function scan2dInitS(){
  c2=document.getElementById('sScanCanvas2D'); if(!c2) return;
  x2=c2.getContext('2d'); scan2dResizeS();
  c2.addEventListener('mousedown',function(e){scan2dDownS(scan2dPosS(e));});
  c2.addEventListener('mousemove',function(e){
    var p=scan2dPosS(e);
    var el=document.getElementById('sScan2dXY'); if(el) el.textContent=Math.round(p.x)+','+Math.round(p.y);
    if(SS.c2d.drawing) scan2dMoveS(p);
  });
  c2.addEventListener('mouseup',scan2dUpS);
  c2.addEventListener('touchstart',function(e){e.preventDefault();scan2dDownS(scan2dTPosS(e));},{passive:false});
  c2.addEventListener('touchmove',function(e){e.preventDefault();scan2dMoveS(scan2dTPosS(e));},{passive:false});
  c2.addEventListener('touchend',scan2dUpS);
}
function scan2dResizeS(){
  if(!c2) return;
  var p=c2.parentElement; if(!p) return;
  c2.width=p.clientWidth||400;
  c2.height=Math.max((p.clientHeight||350)-38,150);
  /* Daca schita e generata, o redesenam */
  if(SS.processing.done && SS.c3d.frames.length>0) {
    drawSchitaTehnica(SS.c3d.frames, SS.processing.damageMap);
  }
}
function scan2dPosS(e){ var r=c2.getBoundingClientRect(); return{x:e.clientX-r.left,y:e.clientY-r.top}; }
function scan2dTPosS(e){ return scan2dPosS(e.touches[0]); }
window.scan2dTool=function(btn,t){
  SS.c2d.tool=t;
  document.querySelectorAll('.scan-tool-btn').forEach(function(b){b.classList.remove('scan-tool-active');});
  if(btn) btn.classList.add('scan-tool-active');
  var toolEl=document.getElementById('sScan2dTool'); if(toolEl) toolEl.textContent=t;
};
function scan2dDownS(p){
  var s=SS.c2d, col=(document.getElementById('sTool2dColor')||{value:'#f44336'}).value;
  var sev=(document.getElementById('sDmgSeverSelect')||{value:'minor'}).value;
  s.drawing=true; s.sx=p.x; s.sy=p.y;
  if(s.tool==='pen')     s.cur={t:'pen',pts:[p],c:col,w:2};
  else if(s.tool==='line')   s.cur={t:'line',x1:p.x,y1:p.y,x2:p.x,y2:p.y,c:col,w:1.5};
  else if(s.tool==='rect')   s.cur={t:'rect',x:p.x,y:p.y,w:0,h:0,c:col};
  else if(s.tool==='circle') s.cur={t:'circle',cx:p.x,cy:p.y,r:0,c:col,w:1.5};
  else if(s.tool==='measure') s.cur={t:'meas',x1:p.x,y1:p.y,x2:p.x,y2:p.y,c:'#546e7a',w:1};
  else if(s.tool==='arrow')  s.cur={t:'arrow',x1:p.x,y1:p.y,x2:p.x,y2:p.y,c:col,w:1.5,sev:sev};
  else if(s.tool==='text'){
    var txt=prompt('Text nota:');
    if(txt){ s.objs.push({t:'text',x:p.x,y:p.y,txt:txt,c:col}); scan2dCountS(); scan2dDrawAnnot(); }
    s.drawing=false;
  }
}
function scan2dMoveS(p){
  var s=SS.c2d; if(!s.drawing||!s.cur) return;
  var o=s.cur;
  if(o.t==='pen') o.pts.push(p);
  else if(o.t==='line'||o.t==='meas'||o.t==='arrow'){o.x2=p.x;o.y2=p.y;}
  else if(o.t==='rect'){o.w=p.x-o.x;o.h=p.y-o.y;}
  else if(o.t==='circle'){var dx=p.x-o.cx,dy=p.y-o.cy;o.r=Math.sqrt(dx*dx+dy*dy);}
  scan2dDrawAnnot();
}
function scan2dUpS(){
  var s=SS.c2d; if(!s.drawing) return;
  s.drawing=false;
  if(s.cur){ s.objs.push(s.cur); s.cur=null; scan2dCountS(); }
  scan2dDrawAnnot();
}
function scan2dCountS(){ var el=document.getElementById('sScan2dCount'); if(el) el.textContent=SS.c2d.objs.length; }
function scan2dDrawAnnot(){
  /* Redesenam schita + adnotari */
  if(SS.processing.done && SS.c3d.frames.length>0) {
    drawSchitaTehnica(SS.c3d.frames, SS.processing.damageMap);
  } else if(c2&&x2) {
    var all=SS.c2d.objs.slice(); if(SS.c2d.cur) all.push(SS.c2d.cur);
    all.forEach(function(o){ scan2dDrawS(o); });
  }
}
function scan2dDrawS(o){
  if(!x2) return;
  x2.strokeStyle=o.c||'#f44336'; x2.fillStyle=o.c||'#f44336';
  x2.lineWidth=o.w||1.5; x2.lineCap='round'; x2.lineJoin='round';
  if(o.t==='pen'){ if(!o.pts||o.pts.length<2) return; x2.beginPath(); x2.moveTo(o.pts[0].x,o.pts[0].y); o.pts.forEach(function(p){x2.lineTo(p.x,p.y);}); x2.stroke(); }
  else if(o.t==='line'){ x2.beginPath(); x2.moveTo(o.x1,o.y1); x2.lineTo(o.x2,o.y2); x2.stroke(); }
  else if(o.t==='rect'){ x2.beginPath(); x2.strokeRect(o.x,o.y,o.w,o.h); }
  else if(o.t==='circle'){ x2.beginPath(); x2.arc(o.cx,o.cy,o.r,0,Math.PI*2); x2.stroke(); }
  else if(o.t==='text'){
    x2.font='bold 9px monospace'; x2.fillStyle='rgba(255,255,255,0.9)';
    x2.fillRect(o.x-2,o.y-10,x2.measureText(o.txt).width+4,13);
    x2.fillStyle=o.c; x2.fillText(o.txt,o.x,o.y);
  }
  else if(o.t==='meas'){
    x2.beginPath(); x2.moveTo(o.x1,o.y1); x2.lineTo(o.x2,o.y2); x2.stroke();
    var dx=o.x2-o.x1,dy=o.y2-o.y1,d=Math.sqrt(dx*dx+dy*dy).toFixed(0);
    x2.font='8px monospace'; x2.fillStyle='#333';
    x2.fillText(d+'px',(o.x1+o.x2)/2+2,(o.y1+o.y2)/2-3);
  }
  else if(o.t==='arrow'){
    /* Sageata cu eticheta severitate */
    var dx=o.x2-o.x1,dy=o.y2-o.y1,len=Math.sqrt(dx*dx+dy*dy); if(len<1) return;
    var nx=dx/len,ny=dy/len;
    x2.beginPath(); x2.moveTo(o.x1,o.y1); x2.lineTo(o.x2,o.y2); x2.stroke();
    /* Cap sageata */
    var as=8;
    x2.beginPath();
    x2.moveTo(o.x2,o.y2);
    x2.lineTo(o.x2-nx*as-ny*as*0.5,o.y2-ny*as+nx*as*0.5);
    x2.lineTo(o.x2-nx*as+ny*as*0.5,o.y2-ny*as-nx*as*0.5);
    x2.closePath(); x2.fill();
    /* Label */
    if(o.sev){
      var sc={minor:'#f9a825',major:'#e64a19',total:'#c62828'};
      x2.font='bold 8px monospace'; x2.fillStyle=sc[o.sev]||o.c;
      x2.fillText(o.sev.toUpperCase(),o.x2+3,o.y2-3);
    }
  }
}
window.scan2dUndo=function(){ if(!SS.c2d.objs.length) return; SS.c2d.objs.pop(); scan2dCountS(); scan2dDrawAnnot(); };

/* ═══════════════════════════════════════════════════
   FOTO / GALERIE
   ═══════════════════════════════════════════════════ */
function scanAddPhotoS(url,lbl){
  SS.photos.push({id:Date.now(),url:url,lbl:lbl});
  try{ var s=JSON.parse(sessionStorage.getItem('scanPhotos')||'[]'); s.push({id:SS.photos[SS.photos.length-1].id,url:url,lbl:lbl}); sessionStorage.setItem('scanPhotos',JSON.stringify(s)); }catch(e){}
  scanRenderPhotosS();
}
window.scanDelPhoto=function(id){ SS.photos=SS.photos.filter(function(p){return p.id!==id;}); scanRenderPhotosS(); };
function scanRenderPhotosS(){
  var cnt=SS.photos.length;
  ['sScanPhotoCount','sScanFotoCount'].forEach(function(i){ var el=document.getElementById(i); if(el) el.textContent=cnt; });
  var mini=document.getElementById('sScanPhotosMini');
  if(mini){ mini.innerHTML=''; SS.photos.slice(-6).forEach(function(p){ mini.innerHTML+='<div class="scan-photo-mini"><img src="'+p.url+'" alt=""><button class="scan-photo-mini-del" onclick="scanDelPhoto('+p.id+')">x</button></div>'; }); }
  var grid=document.getElementById('sScanFotoGrid');
  if(grid){
    grid.innerHTML='';
    SS.photos.forEach(function(p){
      grid.innerHTML+='<div style="aspect-ratio:1;border:1px solid #1e3a5f;border-radius:3px;overflow:hidden;position:relative;">'+
        '<img src="'+p.url+'" style="width:100%;height:100%;object-fit:cover;" alt="">'+
        '<button onclick="scanDelPhoto('+p.id+')" style="position:absolute;top:1px;right:1px;background:rgba(198,40,40,.9);color:#fff;border:none;border-radius:50%;width:13px;height:13px;cursor:pointer;font-size:8px;padding:0;">x</button>'+
        '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.65);font-size:7px;color:#90caf9;padding:1px 3px;font-family:monospace;overflow:hidden;white-space:nowrap;">'+p.lbl+'</div>'+
        '</div>';
    });
  }
}
window.scanRestorePhotos=function(){
  try{ var s=JSON.parse(sessionStorage.getItem('scanPhotos')||'[]'); if(s.length){ SS.photos=s; scanRenderPhotosS(); scanToastS('Restaurate '+s.length+' frames','ok'); } }catch(e){}
};

/* ═══════════════════════════════════════════════════
   PROGRESS / DONE UI
   ═══════════════════════════════════════════════════ */
function buildProgressUI(msg, pct) {
  return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;'+
    'height:100%;gap:14px;padding:20px;background:#050c1a;">'+
    '<div style="width:40px;height:40px;border:3px solid #1e3a5f;border-top-color:#4fc3f7;'+
    'border-radius:50%;animation:spinScan 1s linear infinite;"></div>'+
    '<div style="font-size:11px;color:#4fc3f7;font-family:monospace;text-align:center;">'+msg+'</div>'+
    '<div style="width:100%;max-width:260px;background:#0a1628;border-radius:15px;height:7px;overflow:hidden;">'+
    '<div style="height:100%;background:linear-gradient(90deg,#1565c0,#00e5ff);border-radius:15px;'+
    'width:'+pct+'%;transition:width 0.4s;"></div></div>'+
    '<div style="font-size:9px;color:#546e7a;font-family:monospace;">'+pct+'%</div></div>';
}

function buildDoneUI(nFrames, dmap) {
  var c={minor:0,major:0,total:0};
  Object.values(dmap).forEach(function(v){ if(v) c[v]++; });
  return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;'+
    'height:100%;gap:10px;padding:18px;background:#050c1a;">'+
    '<div style="font-size:40px;">&#x2705;</div>'+
    '<div style="font-size:13px;font-weight:700;color:#4caf50;font-family:monospace;letter-spacing:1px;">CARTOGRAFIERE COMPLETA</div>'+
    '<div style="background:#0a1628;border:1px solid #1a2f4a;border-radius:7px;padding:10px;'+
    'width:100%;max-width:260px;font-family:monospace;font-size:9px;">'+
    '<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #1a2f4a;">'+
    '<span>Frames procesate</span><b style="color:#4fc3f7">'+nFrames+'</b></div>'+
    '<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #1a2f4a;">'+
    '<span style="color:#ffc107">Daune minore</span><b style="color:#ffc107">'+c.minor+'</b></div>'+
    '<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #1a2f4a;">'+
    '<span style="color:#ff5722">Daune majore</span><b style="color:#ff5722">'+c.major+'</b></div>'+
    '<div style="display:flex;justify-content:space-between;padding:2px 0;">'+
    '<span style="color:#f44336">Distrugere totala</span><b style="color:#f44336">'+c.total+'</b></div></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;width:100%;max-width:260px;">'+
    '<button onclick="scanView(\'schita\',document.querySelectorAll(\'.scan-view-tab\')[1])" '+
    'style="padding:8px;background:#1a237e;border:1px solid #4fc3f7;color:#fff;font-family:monospace;font-size:9px;border-radius:4px;cursor:pointer;">&#x1F4D0; Schita 2D</button>'+
    '<button onclick="scanView(\'3d\',document.querySelectorAll(\'.scan-view-tab\')[2])" '+
    'style="padding:8px;background:#0d1f3a;border:1px solid #4fc3f7;color:#4fc3f7;font-family:monospace;font-size:9px;border-radius:4px;cursor:pointer;">&#x1F537; Model 3D</button>'+
    '<button onclick="scanView(\'sil\',document.querySelectorAll(\'.scan-view-tab\')[3])" '+
    'style="padding:8px;background:#0d1f3a;border:1px solid #4fc3f7;color:#4fc3f7;font-family:monospace;font-size:9px;border-radius:4px;cursor:pointer;">&#x1F697; Silueta</button>'+
    '<button onclick="scanExportPDF()" '+
    'style="padding:8px;background:#880e4f;border:1px solid #f48fb1;color:#fff;font-family:monospace;font-size:9px;border-radius:4px;cursor:pointer;">&#x1F4C4; PDF Dosar</button>'+
    '</div></div>';
}

/* ═══════════════════════════════════════════════════
   EXPORT
   ═══════════════════════════════════════════════════ */
window.scanExportSchita=function(){
  if(!c2){ scanToastS('Genereaza mai intai o schita.','err'); return; }
  var a=document.createElement('a'); a.href=c2.toDataURL('image/png');
  a.download='schita_tehnica_'+( SS.meta.plate||'vehicul')+'_'+Date.now()+'.png'; a.click();
  scanToastS('Schita PNG exportata!','ok');
};
window.scanExportJSON=function(){
  var d={ts:new Date().toISOString(),device:DEVICE.model,gps:SS.meta.gpsLat?{lat:SS.meta.gpsLat,lng:SS.meta.gpsLng,acc:SS.meta.gpsAcc}:null,
    vehicul:{nr:SS.meta.plate,model:SS.meta.model,culoare:SS.meta.color},
    officer:SS.meta.officer, date:SS.meta.date, time:SS.meta.time,
    zone:SS.zones, note:(document.getElementById('sScanNotes')||{}).value, nr_frames:SS.photos.length};
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));
  a.download='cartografiere_'+( SS.meta.plate||'vehicul')+'_'+Date.now()+'.json'; a.click();
  scanToastS('JSON exportat!','ok');
};
window.scanExportPDF=function(){
  var plate=SS.meta.plate||'-', model=SS.meta.model||'-', color=SS.meta.color||'-';
  var officer=SS.meta.officer||'-', notes=(document.getElementById('sScanNotes')||{}).value||'-';
  var zones=Object.entries(SS.zones).map(function(e){var el=document.getElementById(e[0]);return(el&&el.dataset?el.dataset.zone:e[0])+': '+e[1].toUpperCase();}).join('\n')||'-';
  var gpsStr=SS.meta.gpsLat?SS.meta.gpsLat.toFixed(6)+', '+SS.meta.gpsLng.toFixed(6)+' (±'+SS.meta.gpsAcc.toFixed(0)+'m)':'Indisponibil';
  var schitaImg=c2?'<h2>Schema Tehnica 2D</h2><img src="'+c2.toDataURL('image/png')+'" style="max-width:100%;border:2px solid #1a237e;">':'';
  var w=window.open('','_blank');
  w.document.write('<!DOCTYPE html><html><head><title>Dosar Accident '+plate+'</title>'+
    '<style>body{font-family:monospace;padding:20px;max-width:900px;margin:0 auto;}'+
    'h1{color:#1a237e;border-bottom:3px solid #1a237e;padding-bottom:6px;}'+
    'h2{color:#1565c0;margin-top:16px;}'+
    'table{width:100%;border-collapse:collapse;margin:8px 0;}'+
    'td,th{border:1px solid #ccc;padding:6px;font-size:11px;}'+
    'th{background:#e8eaf6;color:#1a237e;}'+
    'pre{background:#f5f5f5;padding:8px;font-size:10px;}'+
    'img{max-width:100%;}'+
    '.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;}'+
    '.minor{background:#fff8e1;color:#f57f17;}.major{background:#fbe9e7;color:#bf360c;}.total{background:#ffebee;color:#b71c1c;}'+
    '@media print{.np{display:none}}</style></head><body>'+
    '<h1>DOSAR CARTOGRAFIERE VEHICUL AVARIAT</h1>'+
    '<p style="color:#546e7a;font-size:10px;">Generat: '+new Date().toLocaleString('ro-RO')+' | Biroul Rutier Arad | ScetchACC v4.0</p>'+
    '<h2>Date Vehicul si Dosar</h2>'+
    '<table><tr><th>Camp</th><th>Valoare</th></tr>'+
    '<tr><td>Nr. Inmatriculare</td><td><b style="font-size:14px;color:#1a237e">'+plate+'</b></td></tr>'+
    '<tr><td>Marca / Model</td><td>'+model+'</td></tr>'+
    '<tr><td>Culoare</td><td>'+color+'</td></tr>'+
    '<tr><td>Data / Ora</td><td>'+SS.meta.date+' la '+SS.meta.time+'</td></tr>'+
    '<tr><td>Ofiter / Agent</td><td>'+officer+'</td></tr>'+
    '<tr><td>Coordonate GPS</td><td>'+gpsStr+'</td></tr>'+
    '<tr><td>Dispozitiv scanare</td><td>'+DEVICE.model+' | LiDAR: '+(DEVICE.hasLiDAR?'ACTIV':'N/A')+'</td></tr>'+
    '<tr><td>Frames video procesate</td><td>'+SS.photos.length+'</td></tr>'+
    '</table>'+
    '<h2>Zone Avariate Detectate</h2>'+
    '<pre>'+zones+'</pre>'+
    '<h2>Observatii</h2><pre>'+notes+'</pre>'+
    schitaImg+
    '<h2>Frame-uri Video ('+Math.min(SS.photos.length,12)+' din '+SS.photos.length+')</h2>'+
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;">'+
    SS.photos.slice(0,12).map(function(p){return '<div><img src="'+p.url+'" style="width:100%;border:1px solid #ccc;"><div style="font-size:7px;color:#666;text-align:center;">'+p.lbl+'</div></div>';}).join('')+
    '</div>'+
    '<button class="np" onclick="window.print()" style="margin-top:20px;padding:10px 24px;background:#1a237e;color:#fff;border:none;cursor:pointer;font-size:11px;border-radius:4px;">&#x1F5A8; Printeaza / Salveaza PDF</button>'+
    '</body></html>');
  w.document.close();
};

window.scanReset=function(){
  if(!confirm('Resetezi toate datele dosarului?')) return;
  SS.photos=[];SS.zones={};SS.c2d.objs=[];SS.processing={done:false,damageMap:{}};
  SS.meta={date:'',time:'',plate:'',model:'',color:'',officer:''};
  try{ sessionStorage.removeItem('scanPhotos'); }catch(e){}
  document.querySelectorAll('.sdmg-zone').forEach(function(el){ el.setAttribute('fill','rgba(0,229,255,0.05)'); el.setAttribute('stroke','rgba(0,229,255,0.25)'); });
  updateZoneList(); scanRenderPhotosS();
  if(c2&&x2){ x2.clearRect(0,0,c2.width,c2.height); }
  if(SS.c3d.raf){ cancelAnimationFrame(SS.c3d.raf); }
  var ph=document.getElementById('sPlaceholder3d'); if(ph) ph.style.display='';
  var proc=document.getElementById('sProcStatus');
  if(proc) proc.innerHTML='<div style="font-size:38px;opacity:0.2">&#x1F3A5;</div>'+
    '<div style="font-size:11px;color:#546e7a;font-family:monospace;text-align:center;max-width:230px;">'+
    'Filmeaza vehiculul 360° si schita tehnica se va genera automat</div>';
  ['sScanPlate','sScanModel','sScanColor','sScanOfficer','sScanNotes'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
  var prev=document.getElementById('scanCamPreview');
  if(prev) prev.innerHTML='<div style="font-size:28px;opacity:0.35">&#x1F3A5;</div>'+
    '<p style="font-size:9px;color:#4fc3f7;opacity:0.6;font-family:monospace;text-align:center;padding:0 8px;margin:0;">Apasa FILMARE 360° pentru a incepe</p>';
  scanToastS('Dosar resetat.');
};

/* ═══════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('[data-tab="scanare"]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var tab=document.getElementById('tab-scanare');
      if(tab){
        if(tab.querySelector('.scan-wrap')){ setTimeout(function(){ if(!c2) scan2dInitS(); else scan2dResizeS(); },80); }
        else { window.scanEnterTab(); }
      }
    });
  });
  window.addEventListener('resize',function(){
    var tab=document.getElementById('tab-scanare');
    if(tab&&tab.classList.contains('active')) scan2dResizeS();
  });
});

function scanToastS(msg,type){
  var tc=document.getElementById('toast-container'); if(!tc) return;
  var t=document.createElement('div');
  t.className='toast'+(type==='ok'?' toast-success':type==='err'?' toast-error':'');
  t.textContent=msg; tc.appendChild(t);
  setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); },3000);
}
})();
