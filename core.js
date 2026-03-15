/* ═══ SHARED DATA STORE ══════════════════════════════════════════════════════ */
const VEHICLES = [
  {plate:'SF-7789',name:'Tesla Model 3',color:'#3b82f6',owner:'Sarah J.'},
  {plate:'SF-4421',name:'BMW X5',color:'#ef4444',owner:'Mike R.'},
  {plate:'SF-9901',name:'Audi A4',color:'#22c55e',owner:'Lisa K.'},
  {plate:'SF-3310',name:'Honda Civic',color:'#f59e0b',owner:'Tom B.'},
  {plate:'SF-7712',name:'Ford Mustang',color:'#a855f7',owner:'Anna W.'},
  {plate:'SF-5500',name:'Tesla Model S',color:'#06b6d4',owner:'James L.'},
  {plate:'SF-2200',name:'Toyota Camry',color:'#ec4899',owner:'Nina P.'},
  {plate:'SF-8830',name:'Hyundai Sonata',color:'#84cc16',owner:'Chris M.'},
];

const SLOT_ROWS = ['A','B','C','D'];
const SLOTS_PER_ROW = 10;

// Build 50 slots
const SLOTS = [];
let si = 0;
SLOT_ROWS.forEach(row => {
  for(let n=1;n<=SLOTS_PER_ROW;n++){
    const id = row+n;
    let status = 'available';
    let vehicle = null;
    let session = null;
    let entry = null;
    let duration = null;
    const r = Math.random();
    if(r < 0.54){
      status = 'occupied';
      vehicle = VEHICLES[si % VEHICLES.length];
      session = 'SF'+Math.floor(Math.random()*9000+1000);
      const mins = Math.floor(Math.random()*180+10);
      entry = new Date(Date.now() - mins*60000);
      duration = mins;
    } else if(r < 0.60){
      status = 'reserved';
      vehicle = VEHICLES[(si+3) % VEHICLES.length];
      session = 'RES'+Math.floor(Math.random()*999+100);
    } else if(r < 0.64){
      status = 'ev';
      vehicle = VEHICLES[(si+1) % VEHICLES.length];
      session = 'EV'+Math.floor(Math.random()*999+100);
      const mins = Math.floor(Math.random()*60+5);
      entry = new Date(Date.now() - mins*60000);
      duration = mins;
    }
    SLOTS.push({id,row,num:n,status,vehicle,session,entry,duration});
    si++;
  }
});

// Activity log
const ACTIVITY = [
  {type:'entry',vehicle:'Tesla Model 3',plate:'SF-7789',slot:'A3',time:new Date(Date.now()-8*60000),amount:null},
  {type:'exit',vehicle:'BMW X5',plate:'SF-4421',slot:'B7',time:new Date(Date.now()-22*60000),amount:'$12.25'},
  {type:'reserved',vehicle:'Audi A4',plate:'SF-9901',slot:'C2',time:new Date(Date.now()-35*60000),amount:null},
  {type:'exit',vehicle:'Honda Civic',plate:'SF-3310',slot:'A9',time:new Date(Date.now()-58*60000),amount:'$8.75'},
  {type:'entry',vehicle:'Ford Mustang',plate:'SF-7712',slot:'D4',time:new Date(Date.now()-72*60000),amount:null},
  {type:'exit',vehicle:'Toyota Camry',plate:'SF-2200',slot:'E1',time:new Date(Date.now()-95*60000),amount:'$21.00'},
];

/* ═══ COUNTS ═════════════════════════════════════════════════════════════════ */
function getCounts(){
  const c={available:0,occupied:0,reserved:0,ev:0};
  SLOTS.forEach(s=>c[s.status]++);
  return c;
}

/* ═══ LOT GRID ═══════════════════════════════════════════════════════════════ */
let currentFilter = 'all';

function buildLotGrid(){
  const grid = document.getElementById('lotGrid');
  if(!grid) return;
  grid.innerHTML='';
  SLOTS.forEach(slot=>{
    const el = document.createElement('div');
    el.className = `slot ${slot.status}`;
    el.id = 'slot-'+slot.id;
    el.title = slot.id;
    el.innerHTML = `<span>${slot.id}</span>${slot.status==='occupied'||slot.status==='ev'?'<span class="slot-car">🚗</span>':''}`;
    if(currentFilter!=='all' && slot.status!==currentFilter) el.classList.add('hidden-slot');
    el.addEventListener('click',()=>openSlotModal(slot));
    grid.appendChild(el);
  });
}

function filterSlots(f, btn){
  currentFilter = f;
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  if(btn) btn.classList.add('active');
  SLOTS.forEach(slot=>{
    const el = document.getElementById('slot-'+slot.id);
    if(!el) return;
    if(f==='all'||slot.status===f) el.classList.remove('hidden-slot');
    else el.classList.add('hidden-slot');
  });
}

/* ═══ SLOT MODAL ═════════════════════════════════════════════════════════════ */
function openSlotModal(slot){
  const overlay = document.getElementById('slotModal');
  const title   = document.getElementById('modalTitle');
  const body    = document.getElementById('modalBody');
  const actions = document.getElementById('modalActions');
  const colors  = {available:'#22c55e',occupied:'#ef4444',reserved:'#3b82f6',ev:'#a855f7'};
  const labels  = {available:'Available',occupied:'Occupied',reserved:'Reserved',ev:'EV Charging'};

  title.textContent = 'Slot '+slot.id;

  let rows = `
    <div class="modal-row"><span>Status</span><strong style="color:${colors[slot.status]}">${labels[slot.status]}</strong></div>
    <div class="modal-row"><span>Row</span><strong>${slot.row}</strong></div>`;

  if(slot.vehicle){
    const elapsed = slot.entry ? Math.floor((Date.now()-slot.entry)/60000) : slot.duration||0;
    const fee = (elapsed/60*3.5).toFixed(2);
    rows += `
      <div class="modal-row"><span>Vehicle</span><strong>${slot.vehicle.name}</strong></div>
      <div class="modal-row"><span>Plate</span><strong>${slot.vehicle.plate}</strong></div>
      <div class="modal-row"><span>Owner</span><strong>${slot.vehicle.owner}</strong></div>
      <div class="modal-row"><span>Session</span><strong>${slot.session}</strong></div>
      ${slot.entry?`<div class="modal-row"><span>Entry</span><strong>${slot.entry.toLocaleTimeString()}</strong></div>
      <div class="modal-row"><span>Duration</span><strong>${Math.floor(elapsed/60)}h ${elapsed%60}m</strong></div>
      <div class="modal-row"><span>Fee</span><strong style="color:#22c55e">$${fee}</strong></div>`:''}`;
  }

  body.innerHTML = rows;

  actions.innerHTML = '';
  if(slot.status==='available'){
    const btn = document.createElement('button');
    btn.className='btn-primary';btn.textContent='Book This Slot';
    btn.onclick=()=>bookSlot(slot);
    actions.appendChild(btn);
  } else if(slot.status==='occupied'||slot.status==='ev'){
    const btn = document.createElement('button');
    btn.className='btn-danger';btn.textContent='End Session';
    btn.onclick=()=>endSlotSession(slot);
    actions.appendChild(btn);
  }

  overlay.classList.add('open');
}

function closeModal(){
  document.getElementById('slotModal').classList.remove('open');
}

function bookSlot(slot){
  slot.status='reserved';
  slot.vehicle=VEHICLES[Math.floor(Math.random()*VEHICLES.length)];
  slot.session='RES'+Math.floor(Math.random()*999+100);
  refreshAll();
  closeModal();
  showToast('Slot '+slot.id+' reserved successfully');
}

function endSlotSession(slot){
  const elapsed = slot.entry ? Math.floor((Date.now()-slot.entry)/60000) : 30;
  const fee = (elapsed/60*3.5).toFixed(2);
  ACTIVITY.unshift({type:'exit',vehicle:slot.vehicle.name,plate:slot.vehicle.plate,slot:slot.id,time:new Date(),amount:'$'+fee});
  slot.status='available';slot.vehicle=null;slot.session=null;slot.entry=null;slot.duration=null;
  refreshAll();
  closeModal();
  showToast('Session ended. Fee: $'+fee);
}

/* ═══ ACTIVE SESSION TICKER ══════════════════════════════════════════════════ */
const activeSlot = SLOTS.find(s=>s.status==='occupied'&&s.entry);
function tickSession(){
  if(!activeSlot||!activeSlot.entry) return;
  const el_v=document.getElementById('sessVehicle');
  const el_p=document.getElementById('sessPlate');
  const el_s=document.getElementById('sessSlot');
  const el_t=document.getElementById('sessTimer');
  const el_r=document.getElementById('sessRemain');
  const el_f=document.getElementById('sessFee');
  const el_e=document.getElementById('sessEntry');
  if(!el_v) return;
  const elapsed = Math.floor((Date.now()-activeSlot.entry)/60000);
  const maxMins = 240;
  const remain  = Math.max(0,maxMins-elapsed);
  const fee     = (elapsed/60*3.5).toFixed(2);
  el_v.textContent = activeSlot.vehicle.name;
  el_p.textContent = activeSlot.vehicle.plate;
  el_s.textContent = activeSlot.id;
  el_t.textContent = Math.floor(elapsed/60)+'h '+String(elapsed%60).padStart(2,'0')+'m';
  el_r.textContent = Math.floor(remain/60)+'h '+String(remain%60).padStart(2,'0')+'m';
  el_f.textContent = '$'+fee;
  el_e.textContent = activeSlot.entry.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

function endSession(){
  if(!activeSlot) return;
  endSlotSession(activeSlot);
  showToast('Payment processed. Thank you!');
}

/* ═══ ACTIVITY LIST ══════════════════════════════════════════════════════════ */
function buildActivity(){
  const list = document.getElementById('activityList');
  if(!list) return;
  const colors={entry:'#22c55e',exit:'#ef4444',reserved:'#3b82f6'};
  list.innerHTML = ACTIVITY.slice(0,8).map(a=>{
    const ago = Math.floor((Date.now()-a.time)/60000);
    const agoStr = ago<60?ago+'m ago':Math.floor(ago/60)+'h ago';
    return `<div class="act-item">
      <div class="act-dot" style="background:${colors[a.type]||'#94a3b8'}"></div>
      <div class="act-info">
        <div class="act-name">${a.vehicle} <span style="color:var(--muted);font-weight:400">${a.plate}</span></div>
        <div class="act-meta">${a.type==='entry'?'Entered':'Exited'} · Slot ${a.slot}</div>
      </div>
      <div style="text-align:right">
        <div class="act-time">${agoStr}</div>
        ${a.amount?`<div class="act-amount">${a.amount}</div>`:''}
      </div>
    </div>`;
  }).join('');
}

/* ═══ KPI COUNTERS ═══════════════════════════════════════════════════════════ */
function updateKPIs(){
  const c = getCounts();
  const revenue = ACTIVITY.filter(a=>a.amount).reduce((s,a)=>s+parseFloat(a.amount.replace('$','')),0);
  setEl('kpiTotal',SLOTS.length);
  setEl('kpiAvail',c.available);
  setEl('kpiOccupied',c.occupied);
  setEl('kpiReserved',c.reserved);
  setEl('kpiEV',c.ev);
  setEl('kpiRevenue','$'+revenue.toFixed(0));
  setEl('statTotal',SLOTS.length);
  setEl('statAvail',c.available);
  setEl('statOccupied',c.occupied);
  setEl('statReserved',c.reserved);
  setEl('statEV',c.ev);
  const pct = Math.round(c.occupied/SLOTS.length*100);
  setEl('donutPct',pct+'%');
}

function setEl(id,val){
  const el=document.getElementById(id);
  if(el) el.textContent=val;
}

/* ═══ CHARTS ═════════════════════════════════════════════════════════════════ */
Chart.defaults.font.size=10;
Chart.defaults.color='#94a3b8';

let revenueChart, donutChart;

function initCharts(){
  const rCtx = document.getElementById('revenueChart');
  if(rCtx){
    revenueChart = new Chart(rCtx,{
      type:'bar',
      data:{
        labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        datasets:[{
          label:'Revenue',
          data:[820,940,760,1100,980,1340,1240],
          backgroundColor:'rgba(59,130,246,.7)',
          borderRadius:5,
          borderSkipped:false,
        },{
          label:'Expenses',
          data:[200,180,220,190,210,240,200],
          backgroundColor:'rgba(239,68,68,.5)',
          borderRadius:5,
          borderSkipped:false,
        }]
      },
      options:{
        plugins:{legend:{display:true,position:'top',labels:{boxWidth:10,font:{size:10}}}},
        scales:{
          x:{grid:{display:false}},
          y:{grid:{color:'#f1f5f9'},ticks:{callback:v=>'$'+v}}
        },
        responsive:true,maintainAspectRatio:false,
      }
    });
  }

  const dCtx = document.getElementById('donutChart');
  if(dCtx){
    const c = getCounts();
    donutChart = new Chart(dCtx,{
      type:'doughnut',
      data:{
        labels:['Occupied','Available','Reserved','EV'],
        datasets:[{
          data:[c.occupied,c.available,c.reserved,c.ev],
          backgroundColor:['#ef4444','#22c55e','#3b82f6','#a855f7'],
          borderWidth:2,borderColor:'#fff',
        }]
      },
      options:{
        cutout:'70%',
        plugins:{legend:{display:false}},
        responsive:true,maintainAspectRatio:false,
      }
    });
  }
}

function switchChart(period, btn){
  document.querySelectorAll('.card-actions .chip').forEach(c=>c.classList.remove('active'));
  if(btn) btn.classList.add('active');
  if(!revenueChart) return;
  const data = period==='week'
    ? [820,940,760,1100,980,1340,1240]
    : [3200,2800,3600,4100,3900,4800,5200,4600,3800,4200,4900,5600];
  const labels = period==='week'
    ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  revenueChart.data.labels = labels;
  revenueChart.data.datasets[0].data = data;
  revenueChart.update();
}

/* ═══ CAMERA CLOCK ═══════════════════════════════════════════════════════════ */
function tickCameras(){
  const t = new Date().toTimeString().slice(0,8);
  ['camTs1','camTs2','camTs3','camTs4','camTime1','camTime2'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.textContent=t;
  });
}

/* ═══ LIVE SIMULATION ════════════════════════════════════════════════════════ */
function simulate(){
  const avail = SLOTS.filter(s=>s.status==='available');
  const occ   = SLOTS.filter(s=>s.status==='occupied');
  if(avail.length>5 && Math.random()>.6){
    const s = avail[Math.floor(Math.random()*avail.length)];
    const v = VEHICLES[Math.floor(Math.random()*VEHICLES.length)];
    s.status='occupied'; s.vehicle=v;
    s.session='SF'+Math.floor(Math.random()*9000+1000);
    s.entry=new Date(); s.duration=0;
    ACTIVITY.unshift({type:'entry',vehicle:v.name,plate:v.plate,slot:s.id,time:new Date(),amount:null});
    const el=document.getElementById('slot-'+s.id);
    if(el){el.className='slot occupied';el.innerHTML=`<span>${s.id}</span><span class="slot-car">🚗</span>`}
  } else if(occ.length>5 && Math.random()>.6){
    const s = occ[Math.floor(Math.random()*occ.length)];
    const elapsed = s.entry?Math.floor((Date.now()-s.entry)/60000):30;
    const fee = (elapsed/60*3.5).toFixed(2);
    ACTIVITY.unshift({type:'exit',vehicle:s.vehicle.name,plate:s.vehicle.plate,slot:s.id,time:new Date(),amount:'$'+fee});
    s.status='available'; s.vehicle=null; s.session=null; s.entry=null;
    const el=document.getElementById('slot-'+s.id);
    if(el){el.className='slot available';el.innerHTML=`<span>${s.id}</span>`}
  }
  updateKPIs();
  buildActivity();
  if(donutChart){
    const c=getCounts();
    donutChart.data.datasets[0].data=[c.occupied,c.available,c.reserved,c.ev];
    donutChart.update('none');
  }
}

/* ═══ SEARCH ═════════════════════════════════════════════════════════════════ */
function initSearch(){
  const inp = document.getElementById('globalSearch');
  if(!inp) return;
  inp.addEventListener('input',()=>{
    const q=inp.value.toLowerCase().trim();
    if(!q) return;
    const found = SLOTS.find(s=>
      s.id.toLowerCase().includes(q)||
      (s.vehicle&&s.vehicle.name.toLowerCase().includes(q))||
      (s.vehicle&&s.vehicle.plate.toLowerCase().includes(q))||
      (s.session&&s.session.toLowerCase().includes(q))
    );
    if(found) openSlotModal(found);
  });
}

/* ═══ TOAST ══════════════════════════════════════════════════════════════════ */
function showToast(msg){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

/* ═══ REFRESH ALL ════════════════════════════════════════════════════════════ */
function refreshAll(){
  buildLotGrid();
  buildActivity();
  updateKPIs();
}

/* ═══ INIT ═══════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
  buildLotGrid();
  buildActivity();
  updateKPIs();
  initCharts();
  initSearch();
  tickSession();
  tickCameras();
  setInterval(tickSession,10000);
  setInterval(tickCameras,1000);
  setInterval(simulate,6000);

  // Close modal on overlay click
  document.getElementById('slotModal')?.addEventListener('click',e=>{
    if(e.target.id==='slotModal') closeModal();
  });
});

// PWA
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}
