/* ═══ CANVAS PARKING MAP ═════════════════════════════════════════════════════ */
const canvas = document.getElementById('parkCanvas');
const ctx    = canvas.getContext('2d');

const COLORS = {available:'#22c55e',occupied:'#ef4444',reserved:'#3b82f6',ev:'#a855f7'};
const LABELS = {available:'Available',occupied:'Occupied',reserved:'Reserved',ev:'EV Charging'};

let scale = 1, offsetX = 0, offsetY = 0;
let isDragging = false, dragStart = {x:0,y:0};
let highlightSlot = null;

// Slot layout: 5 rows × 10 cols, two banks separated by a road
const SLOT_W = 52, SLOT_H = 30, GAP = 6, ROAD_W = 60;
const BANK_COLS = 1;

function slotRect(slot){
  const col = (slot.num - 1) % BANK_COLS;
  const bank = Math.floor((slot.num - 1) / BANK_COLS); // 0=left, 1=right
  const rowIdx = 'ABCDE'.indexOf(slot.row);
  const bx = bank === 0
    ? 80 + col * (SLOT_W + GAP)
    : 80 + BANK_COLS * (SLOT_W + GAP) + ROAD_W + col * (SLOT_W + GAP);
  const by = 60 + rowIdx * (SLOT_H + GAP);
  return {x:bx, y:by, w:SLOT_W, h:SLOT_H};
}

function resize(){
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  draw();
}

function draw(){
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  ctx.save();

  // Center the lot
  const lotW = 80 + 2*BANK_COLS*(SLOT_W+GAP) + ROAD_W + 80;
  const lotH = 60 + 5*(SLOT_H+GAP) + 60;
  const baseX = (W - lotW*scale)/2 + offsetX;
  const baseY = (H - lotH*scale)/2 + offsetY;
  ctx.translate(baseX, baseY);
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-20,-20,lotW+40,lotH+40);

  // Ground
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.roundRect(0,0,lotW,lotH,12);
  ctx.fill();

  // Road (vertical center)
  const roadX = 80 + BANK_COLS*(SLOT_W+GAP);
  ctx.fillStyle = '#475569';
  ctx.fillRect(roadX, 0, ROAD_W, lotH);

  // Road markings
  ctx.setLineDash([12,10]);
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(roadX + ROAD_W/2, 10);
  ctx.lineTo(roadX + ROAD_W/2, lotH-10);
  ctx.stroke();
  ctx.setLineDash([]);

  // Entry/Exit arrows
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText('▼ ENTRY', roadX + ROAD_W/2, 20);
  ctx.fillText('▲ EXIT', roadX + ROAD_W/2, lotH-8);

  // Row labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11px Segoe UI';
  ctx.textAlign = 'right';
  'ABCDE'.split('').forEach((r,i)=>{
    const y = 60 + i*(SLOT_H+GAP) + SLOT_H/2 + 4;
    ctx.fillText('Row '+r, 72, y);
  });

  // Slots
  SLOTS.forEach(slot=>{
    const {x,y,w,h} = slotRect(slot);
    const color = COLORS[slot.status];
    const isHL  = highlightSlot && highlightSlot.id === slot.id;

    // Shadow for highlight
    if(isHL){
      ctx.shadowColor = color;
      ctx.shadowBlur  = 12;
    }

    // Slot body
    ctx.fillStyle = color;
    ctx.globalAlpha = slot.status==='available' ? 0.75 : 0.9;
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,4);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;

    // Highlight border
    if(isHL){
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.roundRect(x,y,w,h,4);
      ctx.stroke();
    }

    // Slot ID
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${isHL?10:9}px Segoe UI`;
    ctx.textAlign = 'center';
    ctx.fillText(slot.id, x+w/2, y+h/2-2);

    // Car icon for occupied/ev
    if(slot.status==='occupied'||slot.status==='ev'){
      ctx.font = '10px serif';
      ctx.fillText('🚗', x+w/2, y+h/2+9);
    }
    if(slot.status==='ev'){
      ctx.font = '8px serif';
      ctx.fillText('⚡', x+w-6, y+5);
    }
  });

  // Lot title
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 13px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText('SMART PARK — LOT A', lotW/2, lotH-10);

  ctx.restore();
}

/* ── Interaction ── */
function canvasToSlot(cx, cy){
  const W = canvas.width, H = canvas.height;
  const lotW = 80 + 2*BANK_COLS*(SLOT_W+GAP) + ROAD_W + 80;
  const lotH = 60 + 5*(SLOT_H+GAP) + 60;
  const baseX = (W - lotW*scale)/2 + offsetX;
  const baseY = (H - lotH*scale)/2 + offsetY;
  const lx = (cx - baseX) / scale;
  const ly = (cy - baseY) / scale;
  return SLOTS.find(slot=>{
    const {x,y,w,h} = slotRect(slot);
    return lx>=x && lx<=x+w && ly>=y && ly<=y+h;
  });
}

canvas.addEventListener('mousemove', e=>{
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  if(isDragging){
    offsetX += cx - dragStart.x;
    offsetY += cy - dragStart.y;
    dragStart = {x:cx,y:cy};
    draw(); return;
  }
  const slot = canvasToSlot(cx, cy);
  const tip  = document.getElementById('slotTip');
  if(slot){
    canvas.style.cursor = 'pointer';
    const elapsed = slot.entry ? Math.floor((Date.now()-slot.entry)/60000) : null;
    tip.innerHTML = `
      <div class="slot-tip-title" style="color:${COLORS[slot.status]}">Slot ${slot.id}</div>
      <div class="slot-tip-row"><span>Status</span><span>${LABELS[slot.status]}</span></div>
      ${slot.vehicle?`<div class="slot-tip-row"><span>Vehicle</span><span>${slot.vehicle.name}</span></div>`:''}
      ${slot.vehicle?`<div class="slot-tip-row"><span>Plate</span><span>${slot.vehicle.plate}</span></div>`:''}
      ${elapsed!==null?`<div class="slot-tip-row"><span>Duration</span><span>${Math.floor(elapsed/60)}h ${elapsed%60}m</span></div>`:''}
      ${slot.status==='available'?'<div style="color:#22c55e;margin-top:4px;font-size:10px">Click to book</div>':''}`;
    tip.style.left = (cx+14)+'px';
    tip.style.top  = (cy-10)+'px';
    tip.classList.add('show');
  } else {
    canvas.style.cursor = 'grab';
    tip.classList.remove('show');
  }
});

canvas.addEventListener('mousedown', e=>{
  isDragging = true;
  const rect = canvas.getBoundingClientRect();
  dragStart = {x:e.clientX-rect.left, y:e.clientY-rect.top};
  canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mouseup', e=>{
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const moved = Math.abs(cx-dragStart.x)+Math.abs(cy-dragStart.y);
  isDragging = false;
  canvas.style.cursor = 'grab';
  if(moved < 5){
    const slot = canvasToSlot(cx, cy);
    if(slot) openSlotModal(slot);
  }
});

canvas.addEventListener('wheel', e=>{
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  scale = Math.min(3, Math.max(0.4, scale*delta));
  draw();
},{passive:false});

// Touch support
let lastTouch = null;
canvas.addEventListener('touchstart', e=>{
  if(e.touches.length===1){
    isDragging=true;
    lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY};
  }
});
canvas.addEventListener('touchmove', e=>{
  e.preventDefault();
  if(e.touches.length===1&&isDragging){
    offsetX += e.touches[0].clientX - lastTouch.x;
    offsetY += e.touches[0].clientY - lastTouch.y;
    lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY};
    draw();
  }
},{passive:false});
canvas.addEventListener('touchend',()=>{isDragging=false});

/* ── Controls ── */
document.getElementById('zoomIn').onclick  = ()=>{ scale=Math.min(3,scale*1.2); draw(); };
document.getElementById('zoomOut').onclick = ()=>{ scale=Math.max(0.4,scale*0.8); draw(); };
document.getElementById('resetView').onclick = ()=>{ scale=1; offsetX=0; offsetY=0; draw(); };

let darkMode = true;
document.getElementById('toggleView').onclick = ()=>{
  darkMode = !darkMode;
  canvas.style.background = darkMode ? '#1e293b' : '#e2e8f0';
  draw();
};

/* ── Sensor List ── */
function buildSensors(){
  const list = document.getElementById('sensorList');
  if(!list) return;
  list.innerHTML = SLOTS.slice(0,10).map(s=>`
    <div class="sensor-row">
      <span class="sensor-name">Slot ${s.id}</span>
      <span class="sensor-status ${s.status==='available'?'online':'online'}">
        <span class="s-dot online"></span>ONLINE
      </span>
    </div>`).join('');
  // Make A6 offline for realism
  const rows = list.querySelectorAll('.sensor-row');
  if(rows[5]){
    rows[5].querySelector('.sensor-status').className='sensor-status offline';
    rows[5].querySelector('.s-dot').className='s-dot offline';
    rows[5].querySelector('.sensor-status').lastChild.textContent='OFFLINE';
  }
}

/* ── Search ── */
function doSearch(){
  const q = (document.getElementById('panelSearch')||document.getElementById('mapSearch'))?.value.toLowerCase().trim();
  if(!q) return;
  const found = SLOTS.find(s=>
    s.id.toLowerCase().includes(q)||
    (s.vehicle&&s.vehicle.name.toLowerCase().includes(q))||
    (s.vehicle&&s.vehicle.plate.toLowerCase().includes(q))||
    (s.session&&s.session.toLowerCase().includes(q))
  );
  if(found){
    highlightSlot = found;
    draw();
    showSearchCard(found);
    showToast('Found: Slot '+found.id);
  } else {
    showToast('No results found');
  }
}

function showSearchCard(slot){
  const card = document.getElementById('searchCard');
  const info  = document.getElementById('scInfo');
  if(!card||!info) return;
  const elapsed = slot.entry ? Math.floor((Date.now()-slot.entry)/60000) : null;
  info.innerHTML = `
    <div class="sc-name">${slot.vehicle?slot.vehicle.name:'Empty Slot'}</div>
    <div class="sc-row"><span>Slot</span><strong>${slot.id}</strong></div>
    ${slot.vehicle?`<div class="sc-row"><span>Plate</span><strong>${slot.vehicle.plate}</strong></div>`:''}
    ${slot.session?`<div class="sc-row"><span>Session</span><strong>${slot.session}</strong></div>`:''}
    <div class="sc-row"><span>Status</span><strong style="color:${COLORS[slot.status]}">${LABELS[slot.status]}</strong></div>
    ${elapsed!==null?`<div class="sc-row"><span>Duration</span><strong>${Math.floor(elapsed/60)}h ${elapsed%60}m</strong></div>`:''}`;
  card.classList.remove('hidden');
  document.getElementById('scPin').onclick = ()=>{ highlightSlot=slot; draw(); };
}

/* ── Live updates ── */
function liveUpdate(){
  updateKPIs();
  draw();
}

/* ── Camera clock ── */
function camTick(){
  const t = new Date().toTimeString().slice(0,8);
  ['camTime1','camTime2'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.textContent=t;
  });
}

/* ── Search inputs ── */
['panelSearch','mapSearch'].forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.addEventListener('keydown', e=>{ if(e.key==='Enter') doSearch(); });
});

/* ── Init ── */
window.addEventListener('resize', resize);
document.addEventListener('DOMContentLoaded',()=>{
  resize();
  buildSensors();
  updateKPIs();
  camTick();
  setInterval(camTick, 1000);
  setInterval(()=>{ simulate(); liveUpdate(); }, 6000);
});
