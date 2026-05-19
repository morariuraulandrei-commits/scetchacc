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
  // Staged: snapshot obiect înainte de editare live
  // Modificările live sunt TEMPORARE până la "Aplică"
  stagedOriginal: null,  // snapshot original înainte de drag/rotate/scale
  editMode: false,       // true = obiect în editare (nu s-a dat Aplică)
  // Rotire cu 2 degete pe obiect
  rotateTouchStart: null,
};

const ITEM_MAP = {
  car:             { emoji: '🚗', label: 'Autoturism', w: 36, h: 16 },
  truck:           { emoji: '🚛', label: 'Camion', w: 72, h: 22 },
  moto:            { emoji: '🏍️', label: 'Motocicletă', w: 22, h: 10 },
  tram:            { emoji: '🚋', label: 'Tramvai', w: 144, h: 22 },
  bus:             { emoji: '🚌', label: 'Autobuz', w: 96, h: 22 },
  bike:            { emoji: '🚲', label: 'Bicicletă', w: 18, h: 8 },
  van:             { emoji: '🚐', label: 'Microbuz', w: 48, h: 18 },
  ambulance:       { emoji: '🚑', label: 'Ambulanță', w: 48, h: 18 },
  pedestrian:      { emoji: '🚶', label: 'Pieton', w: 5, h: 5 },
  animal:          { emoji: '🐄', label: 'Animal', w: 16, h: 10 },
  'sign-stop':     { emoji: '🛑', label: 'STOP', w: 28, h: 28 },
  'sign-priority': { emoji: '🔶', label: 'Prioritate', w: 28, h: 28 },
  'sign-yield':    { emoji: '⚠️', label: 'Cedează', w: 28, h: 28 },
  'sign-semaphore':{ emoji: '🚦', label: 'Semafor', w: 22, h: 48 },
  'sign-crossing': { emoji: '🚸', label: 'Trecere pietoni', w: 28, h: 28 },
  'sign-noentry':  { emoji: '⛔', label: 'Intrare interzisă', w: 28, h: 28 },
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
    // Pe tabletă/telefon: 1 deget în modul select = PAN direct
    if (CANVAS.tool === 'select') {
      CANVAS.panning = true;
      CANVAS.panStart = { x: ox - CANVAS.panX, y: oy - CANVAS.panY };
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
    } else {
      onPointerMove({ offsetX: ox, offsetY: oy });
    }
  }
}
function onTouchEnd(e) { 
  e.preventDefault(); 
  if (CANVAS.panning) { CANVAS.panning = false; return; }
  onPointerUp({ offsetX: 0, offsetY: 0 }); 
}

function onPointerDown(e) {
  const { wx, wy } = s2w(e.offsetX, e.offsetY);
  if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
    CANVAS.panning = true;
    CANVAS.panStart = { x: e.offsetX - CANVAS.panX, y: e.offsetY - CANVAS.panY }; return;
  }
  if (CANVAS.tool === 'select') {
    const sel = CANVAS.selected;
    // Check handle-uri pe obiectul deja selectat
    if (sel && sel._hRot && sel._hSc) {
      const rot = sel._hRot, sc = sel._hSc;
      const hr = 10/CANVAS.zoom, hs = 10/CANVAS.zoom;
      if (Math.hypot(wx-rot.x, wy-rot.y) < hr) {
        // Drag handle ROTIRE
        CANVAS.draggingHandle = 'rotate';
        CANVAS.handleStart = { wx, wy, rot: sel.rotation||0, cx: sel._cx, cy: sel._cy };
        CANVAS.drawing = true; return;
      }
      if (Math.abs(wx-sc.x)<hs && Math.abs(wy-sc.y)<hs) {
        // Drag handle SCALE
        CANVAS.draggingHandle = 'scale';
        const scv = sel.scale||1;
        CANVAS.handleStart = { wx, wy, scale: scv, dist: Math.hypot(wx-sel._cx, wy-sel._cy)||1 };
        CANVAS.drawing = true; return;
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
      openMobilePanel(hit);
    } else if (hit && (hit.type === 'road_poly' || hit.type === 'roundabout' || hit.type === 'building_poly')) {
      if (CANVAS.editMode && CANVAS.stagedOriginal) revertStagedChanges();
      CANVAS.selected = null; clearProps(); closeMobilePanel();
    } else {
      if (CANVAS.editMode && CANVAS.stagedOriginal) revertStagedChanges();
      CANVAS.selected = null; clearProps(); closeMobilePanel();
    }
    CANVAS.drawing = true; drawCanvas(); return;
  }
  if (CANVAS.tool === 'spawn') {
    const def = ITEM_MAP[CANVAS.spawnItem]; if (!def) return;
    const obj = {
      id: uid(), type: CANVAS.spawnItem,
      x: wx - def.w / 2, y: wy - def.h / 2,
      w: def.w, h: def.h, rotation: 0, scale: 1,
      label: '', color: '#e74c3c', note: '', personLink: '',
      emoji: def.emoji, name: def.label,
    };
    CANVAS.objects.push(obj); CANVAS.selected = obj; showPropsFor(obj);
    saveHistory(); drawCanvas(); return;
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
  // Handle ROTIRE (mouse/touch drag pe handle portocaliu)
  if (CANVAS.draggingHandle === 'rotate' && CANVAS.selected) {
    const { cx, cy } = CANVAS.handleStart;
    const angle = Math.atan2(wy - cy, wx - cx) * 180 / Math.PI + 90;
    CANVAS.selected.rotation = ((angle % 360) + 360) % 360;
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
}

function onPointerUp(e) {
  if (CANVAS.panning) { CANVAS.panning = false; return; }
  if (CANVAS.draggingHandle) {
    CANVAS.draggingHandle = null; CANVAS.drawing = false;
    CANVAS.editMode = true; // marcat ca modificat, așteaptă Aplică
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

function drawObj(ctx, o) {
  if (o.type === 'building_poly') { drawBuildingPoly(ctx, o); return; }
  if (o.type === 'road_poly') { drawRoadPoly(ctx, o); return; }
  if (o.type === 'roundabout') { drawRoundabout(ctx, o); return; }
  ctx.save();
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
    // Desenează silueta vehiculului (vedere de sus)
    drawVehicleTopView(ctx, o, W, H);
    // Etichetă număr înmatriculare
    if (o.label) {
      ctx.font = `bold ${Math.max(8, Math.min(14, H*0.22))}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(o.label).width + 6, th = H*0.24;
      ctx.fillStyle = '#111c'; ctx.fillRect(-tw/2, H*0.28, tw, th);
      ctx.fillStyle = '#fff'; ctx.fillText(o.label, 0, H*0.28 + th/2);
    }
  }
  ctx.restore();
}

// ─── SILUETE VEHICULE VEDERE DE SUS ───────────────────────────
function drawVehicleTopView(ctx, o, W, H) {
  const type = o.type;
  const col = o.color || '#e8b000';
  const shadow = 'rgba(0,0,0,0.35)';

  // Umbră
  ctx.fillStyle = shadow;
  ctx.beginPath();
  roundRect(ctx, -W/2+3, -H/2+3, W, H, Math.min(W,H)*0.15);
  ctx.fill();

  if (type === 'pedestrian') {
    // Pieton - cerc corp + elipsă cap
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, H*0.1, W*0.38, H*0.38, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffe0b2';
    ctx.beginPath(); ctx.arc(0, -H*0.32, W*0.28, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#0008'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, H*0.1, W*0.38, H*0.38, 0, 0, Math.PI*2); ctx.stroke();
    drawLabel(ctx, o.name||'Pieton', 0, H*0.55, col);
    return;
  }

  if (type === 'animal') {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, W*0.45, H*0.45, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#0008'; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = `${Math.min(W,H)*0.7}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(o.emoji||'🐄', 0, 0);
    return;
  }

  // ─── MAȘINI / CAMIOANE / BUS etc ───
  // Corp principal
  ctx.fillStyle = col;
  ctx.beginPath();
  roundRect(ctx, -W/2, -H/2, W, H, Math.min(W,H)*0.14);
  ctx.fill();
  ctx.strokeStyle = '#0006'; ctx.lineWidth = Math.max(1, H*0.04); ctx.stroke();

  // Parbriz față (sus) - dreptunghi semi-transparent
  const pW = W*0.68, pH = H*0.18;
  ctx.fillStyle = 'rgba(180,220,255,0.55)';
  ctx.beginPath();
  roundRect(ctx, -pW/2, -H/2 + H*0.06, pW, pH, 3);
  ctx.fill();
  ctx.strokeStyle = '#0003'; ctx.lineWidth = 0.5; ctx.stroke();

  // Luneta spate (jos)
  ctx.fillStyle = 'rgba(180,220,255,0.35)';
  ctx.beginPath();
  roundRect(ctx, -pW/2*0.85, H/2 - H*0.06 - pH*0.8, pW*0.85, pH*0.8, 3);
  ctx.fill();

  if (type === 'car' || type === 'van' || type === 'ambulance') {
    // Roți (4 colțuri)
    drawWheel(ctx, -W/2-H*0.08, -H*0.3, H*0.16, H*0.28);
    drawWheel(ctx,  W/2+H*0.08-H*0.16, -H*0.3, H*0.16, H*0.28);
    drawWheel(ctx, -W/2-H*0.08,  H*0.02, H*0.16, H*0.28);
    drawWheel(ctx,  W/2+H*0.08-H*0.16,  H*0.02, H*0.16, H*0.28);
    // Indicatoare direcție față
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(-W/2+2, -H/2+2, W*0.12, H*0.07);
    ctx.fillRect( W/2-2-W*0.12, -H/2+2, W*0.12, H*0.07);
  } else if (type === 'moto' || type === 'bike') {
    // Doar 2 roți
    drawWheel(ctx, -W*0.28, -H/2-H*0.06, H*0.22, H*0.22);
    drawWheel(ctx,  W*0.08, H/2-H*0.16,  H*0.22, H*0.22);
    // Corp mai îngust
    ctx.fillStyle = col;
    ctx.beginPath(); roundRect(ctx, -W*0.18, -H/2, W*0.36, H, H*0.15); ctx.fill();
  } else if (type === 'truck' || type === 'bus' || type === 'tram') {
    // 6 roți (camioane/bus)
    drawWheel(ctx, -W/2-H*0.1, -H*0.36, H*0.2, H*0.3);
    drawWheel(ctx,  W/2+H*0.1-H*0.2, -H*0.36, H*0.2, H*0.3);
    drawWheel(ctx, -W/2-H*0.1,  0,      H*0.2, H*0.3);
    drawWheel(ctx,  W/2+H*0.1-H*0.2,  0,      H*0.2, H*0.3);
    drawWheel(ctx, -W/2-H*0.1,  H*0.2,  H*0.2, H*0.3);
    drawWheel(ctx,  W/2+H*0.1-H*0.2,  H*0.2,  H*0.2, H*0.3);
    // Separator cabină/remorcă
    ctx.strokeStyle = '#0005'; ctx.lineWidth = H*0.05;
    ctx.beginPath(); ctx.moveTo(-W*0.28, -H/2); ctx.lineTo(-W*0.28, H/2); ctx.stroke();
    if (type === 'ambulance') {
      ctx.fillStyle = '#fff'; ctx.font = `bold ${H*0.5}px sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('+', 0, 0);
    }
  }

  // Săgeată direcție (față = sus)
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const aw = W*0.2, ah = H*0.12;
  ctx.beginPath();
  ctx.moveTo(0, -H/2-ah*0.5);
  ctx.lineTo( aw/2, -H/2+ah*0.5);
  ctx.lineTo(-aw/2, -H/2+ah*0.5);
  ctx.closePath(); ctx.fill();

  // Tip vehicul label mic
  if (!o.label && o.name) {
    drawLabel(ctx, o.name, 0, H*0.62, col);
  }
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
  const pad = 8/CANVAS.zoom;
  if (o.type === 'line') {
    ctx.strokeStyle = '#00c8ff'; ctx.lineWidth = 2/CANVAS.zoom; ctx.setLineDash([4/CANVAS.zoom,3/CANVAS.zoom]);
    ctx.strokeRect(Math.min(o.x,o.x2)-pad, Math.min(o.y,o.y2)-pad, Math.abs(o.x2-o.x)+pad*2, Math.abs(o.y2-o.y)+pad*2);
    ctx.setLineDash([]);
  } else if (o.type !== 'road_poly' && o.type !== 'roundabout' && o.type !== 'building_poly') {
    const sc = o.scale||1;
    const bx = o.x-pad, by = o.y-pad, bw = o.w*sc+pad*2, bh = o.h*sc+pad*2;
    const cx = o.x+o.w*sc/2, cy = o.y+o.h*sc/2;
    // Rotire aplicată și pe selection box
    ctx.translate(cx,cy); ctx.rotate((o.rotation||0)*Math.PI/180); ctx.translate(-cx,-cy);
    // Chenar selectie
    ctx.strokeStyle = '#00c8ff'; ctx.lineWidth = 2/CANVAS.zoom; ctx.setLineDash([4/CANVAS.zoom,3/CANVAS.zoom]);
    ctx.strokeRect(bx,by,bw,bh); ctx.setLineDash([]);
    // Handle rotire (sus-centru) — cerc portocaliu
    const hRot = { x: cx, y: by - 18/CANVAS.zoom };
    ctx.beginPath(); ctx.arc(hRot.x, hRot.y, 7/CANVAS.zoom, 0, Math.PI*2);
    ctx.fillStyle = '#ff8800'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5/CANVAS.zoom; ctx.stroke();
    // Linie de la chenar la handle rotire
    ctx.beginPath(); ctx.moveTo(cx,by); ctx.lineTo(hRot.x,hRot.y);
    ctx.strokeStyle='rgba(255,136,0,0.6)'; ctx.lineWidth=1/CANVAS.zoom; ctx.stroke();
    // Handle scale (colț dreapta-jos) — pătrat verde
    const hSc = { x: bx+bw, y: by+bh };
    ctx.fillStyle = '#00cc44'; ctx.strokeStyle='#fff'; ctx.lineWidth=1.5/CANVAS.zoom;
    const hs = 8/CANVAS.zoom;
    ctx.fillRect(hSc.x-hs/2,hSc.y-hs/2,hs,hs); ctx.strokeRect(hSc.x-hs/2,hSc.y-hs/2,hs,hs);
    // Stochează pozițiile handle-urilor pentru hit test
    o._hRot = hRot; o._hSc = hSc; o._bx=bx; o._by=by; o._bw=bw; o._bh=bh; o._cx=cx; o._cy=cy;
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
    CANVAS.zoom=1; CANVAS.panX=0; CANVAS.panY=0;
    document.getElementById('canvas-zoom-display').textContent='100%'; drawCanvas();
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
  CANVAS.editMode = false;
  CANVAS.stagedOriginal = null;
  saveHistory(); drawCanvas();
  hideEditingIndicator();
  toast('✔ Salvat pe schiță','success');
}

function revertStagedChanges() {
  if (!CANVAS.selected || !CANVAS.stagedOriginal) return;
  const orig = JSON.parse(CANVAS.stagedOriginal);
  Object.assign(CANVAS.selected, orig);
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
    CANVAS.panX = 0; CANVAS.panY = 0;
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
