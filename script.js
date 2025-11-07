(() => {
  'use strict';
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== Style inject (FX 3D + Lock dots fix) =====
  (function injectStyle(){
    if (document.getElementById('zd-fx-style')) return;
    const css = `
      /* 3D FX */
      .window{
        transform-origin: center center;
        --fx-x: 0px; --fx-y: 0px;
        --fx-persp: 900px;
        --fx-tiltX: 26deg;
        --fx-tiltY: 0deg;
        --fx-sx: .84; --fx-sy: .84;
        will-change: transform, opacity;
      }
      @keyframes fxOpenTiltOnly{
        0%{ transform: perspective(var(--fx-persp)) translate3d(var(--fx-x),var(--fx-y),0) rotateX(var(--fx-tiltX)) rotateY(var(--fx-tiltY)) scale(var(--fx-sx),var(--fx-sy)); opacity:0; }
        100%{ transform: perspective(var(--fx-persp)) translate3d(0,0,0) rotateX(0) rotateY(0) scale(1); opacity:1; }
      }
      @keyframes fxCloseTiltOnly{
        0%{ transform: perspective(var(--fx-persp)) translate3d(0,0,0) rotateX(0) rotateY(0) scale(1); opacity:1; }
        100%{ transform: perspective(var(--fx-persp)) translate3d(var(--fx-x),var(--fx-y),0) rotateX(var(--fx-tiltX)) rotateY(var(--fx-tiltY)) scale(var(--fx-sx),var(--fx-sy)); opacity:0; }
      }
      .window.fx-opening{ animation: fxOpenTiltOnly 420ms cubic-bezier(.2,.85,.15,1) both; }
      .window.fx-closing{ animation: fxCloseTiltOnly 300ms cubic-bezier(.2,.85,.15,1) both; }
      @media (prefers-reduced-motion: reduce){ .window.fx-opening,.window.fx-closing{ animation:none !important; } }

      /* Live video */
      .wp-video{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; pointer-events:none; display:none; z-index:0; transform:translate3d(0,0,0) scale(1.06); }
      .wp-video.on{ display:block; }

      /* Lock dots: no shrink + clip + only when typing */
      .lock{ z-index: 99990 !important; }
      .power-menu{ z-index: 99991 !important; }
      .lock-pill{ width:min(240px,56vw); height:34px; border-radius:999px; overflow:hidden; }
      .lock-pill .dots{ display:none; opacity:0; }
      .lock-pill.has-typed .dots{
        display:inline-flex; align-items:center; justify-content:center;
        gap:10px; flex-wrap:nowrap; overflow:hidden; max-width:86px; opacity:1; transition:opacity .16s ease;
      }
      .dot{ width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,.71); flex:0 0 8px; transform:scale(.9); }
      .dot.on{ animation: zd-dot .18s ease-out forwards; }
      @keyframes zd-dot{ from{ transform:scale(.8); opacity:.2 } to{ transform:scale(1); opacity:1 } }
    `;
    const st = document.createElement('style');
    st.id = 'zd-fx-style';
    st.textContent = css;
    document.head.appendChild(st);
  })();

  // ===== Clock (topbar) =====
  (function topClock(){
    const el = $('#time'); if (!el) return;
    const tick = () => { const d = new Date(); el.textContent = d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',hour12:false}); };
    tick(); setInterval(tick, 30_000);
  })();

  // ===== Icons: Dock PNG (logo/settings/spotify) =====
  (function bootDockIcons(){
    function setIcon({ wrapSel, imgSel, defaultSrc, storageKey }){
      const wrap = $(wrapSel), img = $(imgSel);
      if (!wrap || !img) return;
      const saved = storageKey ? localStorage.getItem(storageKey) : '';
      const src = saved || defaultSrc;
      img.onload  = () => wrap.classList.add('has-img');
      img.onerror = () => wrap.classList.remove('has-img');
      img.src = src;
      if (img.complete && img.naturalWidth > 0) wrap.classList.add('has-img');
    }
    setIcon({ wrapSel:'#logoBtn',     imgSel:'#dockLogoImg',    defaultSrc:'Zimlogo.png',  storageKey:'dock_logo_img' });
    setIcon({ wrapSel:'#dockSettings',imgSel:'#dockSettingsImg',defaultSrc:'Setting.png' });
    setIcon({ wrapSel:'#dockSpotify', imgSel:'#dockSpotifyImg', defaultSrc:'Spotify.png',  storageKey:'dock_spotify_img' });
  })();

  // ===== Icons: Right PNG (Wi‑Fi, Speaker, Battery) =====
  (function bootRightIcons(){
    function mount(btnSel, id, src){
      const btn = $(btnSel); if (!btn) return;
      let img = btn.querySelector('img');
      if (!img){ img = document.createElement('img'); img.id = id; img.alt=''; btn.insertBefore(img, btn.firstChild); }
      img.onload = () => btn.classList.add('has-img');
      img.onerror= () => btn.classList.remove('has-img');
      img.src = src;
      if (img.complete && img.naturalWidth > 0) btn.classList.add('has-img');
    }
    mount('#qtWifi','qtWifiImg','Wifi.png');
    mount('#qtVolume','qtVolumeImg','speaker.png');
    const batBtn = document.getElementById('qtBattery') || document.getElementById('qtCam');
    if (batBtn){
      let img = batBtn.querySelector('img'); if (!img){ img = document.createElement('img'); img.id='qtBatteryImg'; img.alt=''; batBtn.insertBefore(img, batBtn.firstChild); }
      img.onload = () => batBtn.classList.add('has-img');
      img.onerror= () => batBtn.classList.remove('has-img');
      img.src = 'pin.png';
      if (img.complete && img.naturalWidth > 0) batBtn.classList.add('has-img');
    }
  })();

  // ===== Window manager: drag + z =====
  function makeDraggable(win, handle, key){
    if (!win || !handle) return;
    let drag=false, sx=0, sy=0, sl=0, st=0, pid=0;
    const clamp=(v,min,max)=>Math.min(Math.max(v,min),max);
    function onDown(e){ if (e.button!==0) return; drag=true; pid=e.pointerId||1; const r=win.getBoundingClientRect(); sx=e.clientX; sy=e.clientY; sl=r.left; st=r.top; try{handle.setPointerCapture(pid);}catch{} bringToFront(win); }
    function onMove(e){ if(!drag) return; const dx=e.clientX-sx, dy=e.clientY-sy; const r=win.getBoundingClientRect(); const nl=clamp(sl+dx, -r.width*0.5+20, innerWidth - r.width*0.5); const nt=clamp(st+dy, 8, innerHeight - 40); win.style.left=nl+'px'; win.style.top=nt+'px'; win.style.transform='translateX(0)'; }
    function onUp(){ if(!drag) return; drag=false; try{handle.releasePointerCapture(pid);}catch{} const r=win.getBoundingClientRect(); localStorage.setItem(key, JSON.stringify({left:r.left, top:r.top})); }
    function restore(){ try{ const s=localStorage.getItem(key); if(!s) return; const p=JSON.parse(s); if(Number.isFinite(p.left)&&Number.isFinite(p.top)){ win.style.left=p.left+'px'; win.style.top=p.top+'px'; win.style.transform='translateX(0)'; } }catch{} }
    handle.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
    win.addEventListener('mousedown', ()=>bringToFront(win));
    restore();
  }
  let zTop = 100;
  const bringToFront = w => { zTop+=1; w.style.zIndex=zTop; };

  // ===== 3D open/close FX (tilt-heavy, scale to icon) =====
  (function fx3d(){
    const winSettings = $('#window');
    const winSpotify  = $('#spotifyWin');

    // Unbind all old listeners by cloning nodes
    function rebind(id){ const el=document.getElementById(id); if(!el) return null; const cp=el.cloneNode(true); el.replaceWith(cp); return cp; }
    const dockSettingsBtn = rebind('dockSettings') || $('#dockSettings');
    const dockSpotifyBtn  = rebind('dockSpotify')  || $('#dockSpotify');
    const btnMin   = rebind('btnMin')   || $('#btnMin');
    const btnClose = rebind('btnClose') || $('#btnClose');
    const spMin    = rebind('spBtnMin') || $('#spBtnMin');
    const spClose  = rebind('spBtnClose') || $('#spBtnClose');

    const indSettings = $('#indSettings');
    const indSpotify  = $('#indSpotify');

    const isShown = el => !!el && getComputedStyle(el).display!=='none' && el.offsetWidth>0 && el.offsetHeight>0;
    const iconRectOf = btn => {
      if (!btn) return null;
      const img = btn.querySelector('img'); if (isShown(img)) return img.getBoundingClientRect();
      const svg = btn.querySelector('svg'); if (isShown(svg)) return svg.getBoundingClientRect();
      const cell= btn.closest('.task-item'); if (cell) return cell.getBoundingClientRect();
      return btn.getBoundingClientRect();
    };
    const center = r => ({ x:r.left+r.width/2, y:r.top+r.height/2 });
    const freeze = win => { const r=win.getBoundingClientRect(); win.style.left=r.left+'px'; win.style.top=r.top+'px'; win.style.transform='translateX(0)'; };

    const computeFX = (win, btn) => {
      const rw = win.getBoundingClientRect();
      const ri0= iconRectOf(btn) || btn.getBoundingClientRect();
      const ri = (ri0.width && ri0.height) ? ri0 : { left: innerWidth/2-28, top: innerHeight-64, width:56, height:56 };
      const cw=center(rw), ci=center(ri);
      const dx=ci.x-cw.x, dy=ci.y-cw.y;
      const sx=ri.width/rw.width, sy=ri.height/rw.height;
      const tiltX=26, tiltY=Math.max(-20, Math.min(20, dx/10));
      return {dx,dy,sx,sy,tiltX,tiltY};
    };
    const setVars = (win, fx) => {
      win.style.setProperty('--fx-x', `${fx.dx}px`);
      win.style.setProperty('--fx-y', `${fx.dy}px`);
      win.style.setProperty('--fx-sx', fx.sx.toFixed(5));
      win.style.setProperty('--fx-sy', fx.sy.toFixed(5));
      win.style.setProperty('--fx-tiltX', `${fx.tiltX}deg`);
      win.style.setProperty('--fx-tiltY', `${fx.tiltY}deg`);
    };

    const animating = new WeakSet();

    function openWin(win, btn, ind, key){
      if (!win || !btn) return;
      if (!win.classList.contains('hidden')) { ind?.classList.remove('inactive'); key && localStorage.setItem(key,'1'); return; }
      bringToFront(win); win.classList.remove('hidden'); freeze(win);
      if (REDUCED){ ind?.classList.remove('inactive'); key && localStorage.setItem(key,'1'); return; }
      requestAnimationFrame(() => {
        const fx=computeFX(win,btn); setVars(win,fx);
        win.classList.add('fx-opening'); animating.add(win);
        const done=()=>{ win.classList.remove('fx-opening'); win.removeEventListener('animationend',done); animating.delete(win); };
        win.addEventListener('animationend',done);
      });
      ind?.classList.remove('inactive'); key && localStorage.setItem(key,'1');
    }
    function closeWin(win, btn, ind, key){
      if (!win || !btn) return;
      if (win.classList.contains('hidden')) { ind?.classList.add('inactive'); key && localStorage.setItem(key,'0'); return; }
      freeze(win);
      if (REDUCED){ win.classList.add('hidden'); ind?.classList.add('inactive'); key && localStorage.setItem(key,'0'); return; }
      const fx=computeFX(win,btn); setVars(win,fx);
      win.classList.add('fx-closing'); animating.add(win);
      const done=()=>{ win.classList.remove('fx-closing'); win.classList.add('hidden'); win.removeEventListener('animationend',done); animating.delete(win); };
      win.addEventListener('animationend',done);
      ind?.classList.add('inactive'); key && localStorage.setItem(key,'0');
    }
    function toggle(win, btn, ind, key){
      if (animating.has(win)) return;
      if (win.classList.contains('hidden')) openWin(win,btn,ind,key);
      else closeWin(win,btn,ind,key);
    }

    dockSettingsBtn?.addEventListener('click', () => toggle(winSettings,dockSettingsBtn,indSettings,'open_win_settings'));
    dockSpotifyBtn?.addEventListener('click',  () => toggle(winSpotify, dockSpotifyBtn, indSpotify, 'open_win_spotify'));

    btnMin?.addEventListener('click',   () => closeWin(winSettings,dockSettingsBtn,indSettings,'open_win_settings'));
    btnClose?.addEventListener('click', () => closeWin(winSettings,dockSettingsBtn,indSettings,'open_win_settings'));
    spMin?.addEventListener('click',    () => closeWin(winSpotify, dockSpotifyBtn, indSpotify, 'open_win_spotify'));
    spClose?.addEventListener('click',  () => closeWin(winSpotify, dockSpotifyBtn, indSpotify, 'open_win_spotify'));

    const sOpen = localStorage.getItem('open_win_settings');
    const pOpen = localStorage.getItem('open_win_spotify');
    if (sOpen === '1' || sOpen === null) { winSettings?.classList.remove('hidden'); indSettings?.classList.remove('inactive'); freeze(winSettings); }
    else { winSettings?.classList.add('hidden'); indSettings?.classList.add('inactive'); }
    if (pOpen === '1') { winSpotify?.classList.remove('hidden'); indSpotify?.classList.remove('inactive'); freeze(winSpotify); }
    else { winSpotify?.classList.add('hidden'); indSpotify?.classList.add('inactive'); }

    makeDraggable(winSettings, $('#dragHandle'), 'pos_win_settings');
    makeDraggable(winSpotify,  $('#dragSpotify'), 'pos_win_spotify');
  })();

  // ===== Spotify loader =====
  (function spotify(){
    const spIframe=$('#spIframe'), spUrl=$('#spUrl'), spLoad=$('#spLoad'), spOpen=$('#spOpen');
    const TYPES=['track','album','playlist','artist','show','episode'];
    function parse(input){
      if(!input) return null; let s=String(input).trim();
      const m=s.match(/^spotify:(track|album|playlist|artist|show|episode):([A-Za-z0-9]+)$/i);
      if(m){ const t=m[1].toLowerCase(), id=m[2]; return { open:`https://open.spotify.com/${t}/${id}`, embed:`https://open.spotify.com/embed/${t}/${id}` }; }
      try{
        const url=new URL(s); if(!/spotify\.com$/.test(url.hostname)) return null;
        let seg=url.pathname.split('/').filter(Boolean);
        if(seg[0]&&seg[0].startsWith('intl-')) seg.shift();
        if(seg[0]==='embed'||seg[0]==='embed-podcast') seg.shift();
        let i=seg.findIndex(x=>TYPES.includes(x)); if(i<0) return null;
        const t=seg[i], id=seg[i+1]; if(!id) return null;
        return { open:`https://open.spotify.com/${t}/${id}`, embed:`https://open.spotify.com/embed/${t}/${id}` };
      }catch{ return null; }
    }
    function embedToOpen(u){ try{ const url=new URL(u); url.pathname=url.pathname.replace('/embed/','/'); url.search=''; return url.href; }catch{ return null; } }
    let last = localStorage.getItem('sp_last_open') || '';
    function load(){
      const info=parse(spUrl.value); if(!info){ spUrl.classList.add('err'); setTimeout(()=>spUrl.classList.remove('err'),800); return; }
      spIframe.src=info.embed; spUrl.value=info.open; last=info.open; localStorage.setItem('sp_last_open', info.open);
    }
    spLoad?.addEventListener('click', load);
    spUrl?.addEventListener('keydown', e=>{ if(e.key==='Enter') load(); });
    spOpen?.addEventListener('click', ()=>{ const u = last || embedToOpen(spIframe?.src) || 'https://open.spotify.com/'; window.open(u,'_blank','noopener,noreferrer'); });
    if(last){ const info=parse(last); if(info){ spIframe.src=info.embed; spUrl.value=info.open; } }
  })();

  // ===== Wallpaper menu + parallax + live MP4 =====
  (function wallpaper(){
    const desktop=$('#desktop'), wpLayer=$('#wpBase');
    function ensureVideo(){
      let v=$('#wpVideo'); if(!v){ v=document.createElement('video'); v.id='wpVideo'; v.className='wp-video'; v.autoplay=true; v.loop=true; v.muted=true; v.playsInline=true; v.setAttribute('playsinline',''); desktop?.insertBefore(v, wpLayer||null); }
      return v;
    }
    function pickImage(){ return new Promise(resolve=>{ let inp=$('#pick'); if(!inp){ inp=document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.id='pick'; document.body.appendChild(inp); } inp.value=''; inp.onchange=()=>{ const f=inp.files?.[0]; if(!f) return resolve(null); const rd=new FileReader(); rd.onload=()=>resolve(String(rd.result||'')); rd.readAsDataURL(f); }; inp.click(); }); }
    function crossfade(url){ const next=document.createElement('div'); next.className='wp-next enter'; next.style.backgroundImage=`url("${url}")`; desktop?.appendChild(next); const done=()=>{ document.documentElement.style.setProperty('--wp',`url("${url}")`); next.removeEventListener('animationend',done); next.remove(); }; next.addEventListener('animationend',done); }
    function pickVideo(){ return new Promise(resolve=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='video/mp4,video/webm,video/*'; inp.onchange=()=>resolve(inp.files?.[0]||null); inp.click(); }); }
    let liveURL=null;
    async function setLive(){ const f=await pickVideo(); if(!f) return; if(liveURL){ URL.revokeObjectURL(liveURL); liveURL=null; } liveURL=URL.createObjectURL(f); const v=ensureVideo(); v.src=liveURL; v.classList.add('on'); try{ await v.play(); }catch{} localStorage.setItem('wp_live_on','1'); localStorage.setItem('wp_live_name', f.name||''); }
    function clearLive(){ const v=$('#wpVideo'); if(v){ v.pause(); v.removeAttribute('src'); v.load(); v.classList.remove('on'); v.style.transform='translate3d(0,0,0) scale(1.06)'; } if(liveURL){ URL.revokeObjectURL(liveURL); liveURL=null; } localStorage.setItem('wp_live_on','0'); }

    let parallaxOn = localStorage.getItem('wp_parallax') !== '0';
    if (REDUCED) parallaxOn=false;
    let raf=0, mx=0, my=0;
    function onMove(e){ if(!parallaxOn) return; mx=(e.clientX/innerWidth)-.5; my=(e.clientY/innerHeight)-.5; if(!raf) raf=requestAnimationFrame(apply); }
    function apply(){ raf=0; const max=16, tx=-mx*max, ty=-my*max; if(wpLayer) wpLayer.style.transform=`translate3d(${tx}px,${ty}px,0) scale(1.06)`; const v=$('#wpVideo'); if(v&&v.classList.contains('on')) v.style.transform=`translate3d(${tx}px,${ty}px,0) scale(1.06)`; }
    window.addEventListener('mousemove', onMove, { passive:true });

    // Single context menu
    let ctx;
    function buildCtx(){ if(!ctx){ ctx=document.createElement('div'); ctx.id='ctxMenu'; ctx.className='ctxmenu hidden'; document.body.appendChild(ctx); }
      ctx.innerHTML=`
        <div class="ctx-item" data-act="wp-change"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 5h16v12H4zM7 9h10v4H7z"/></svg>Change wallpaper…</div>
        <div class="ctx-item" data-act="wp-reset"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 6l12 12M18 6L6 18"/></svg>Reset wallpaper</div>
        <div class="ctx-item" data-act="wp-parallax"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 12h16M12 4v16"/></svg>Parallax: <b id="ctxParStat"></b></div>
        <div class="ctx-sep"></div>
        <div class="ctx-item" data-act="wp-live-set"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 5h16v10H4zM8 17h8v2H8z"/></svg>Set live wallpaper (MP4)…</div>
        <div class="ctx-item" data-act="wp-live-off"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 6l12 12M18 6L6 18"/></svg>Remove live video</div>`;
      ctx.onclick = async e => {
        const it=e.target.closest('.ctx-item'); if(!it) return;
        const act=it.getAttribute('data-act'); hideCtx();
        if(act==='wp-change'){ const dataUrl=await pickImage(); if(dataUrl){ crossfade(dataUrl); localStorage.setItem('zd_wallpaper', dataUrl); } }
        else if(act==='wp-reset'){ localStorage.removeItem('zd_wallpaper'); document.documentElement.style.removeProperty('--wp'); }
        else if(act==='wp-parallax'){ parallaxOn=!parallaxOn; localStorage.setItem('wp_parallax', parallaxOn?'1':'0'); if(!parallaxOn){ if(wpLayer) wpLayer.style.transform='translate3d(0,0,0) scale(1.06)'; const v=$('#wpVideo'); if(v) v.style.transform='translate3d(0,0,0) scale(1.06)'; } }
        else if(act==='wp-live-set'){ await setLive(); }
        else if(act==='wp-live-off'){ clearLive(); }
      };
      return ctx;
    }
    function showCtx(x,y){ const m=buildCtx(); const b=$('#ctxParStat', m); if(b) b.textContent = parallaxOn?'On':'Off'; m.style.left=x+'px'; m.style.top=y+'px'; m.classList.remove('hidden'); const off=ev=>{ if(!m.contains(ev.target)) hideCtx(); }; setTimeout(()=>document.addEventListener('mousedown',off,{once:true}),0); document.addEventListener('keydown',ev=>{ if(ev.key==='Escape') hideCtx(); },{once:true}); }
    function hideCtx(){ ctx?.classList.add('hidden'); }
    desktop?.addEventListener('contextmenu', e=>{ if (e.target.closest('.window,.dock,.widget,.widget-picker')) return; e.preventDefault(); showCtx(e.clientX,e.clientY); });

    const saved=localStorage.getItem('zd_wallpaper');
    if(saved) document.documentElement.style.setProperty('--wp', `url("${saved}")`);
    if(localStorage.getItem('wp_live_on')==='1') localStorage.setItem('wp_live_on','0');
  })();

  // ===== Power menu + Lockscreen (click trái) =====
  (function lockCore(){
    // Fonts for lock
    if (!document.getElementById('fonts-lockscreen')){
      const l=document.createElement('link'); l.id='fonts-lockscreen'; l.rel='stylesheet';
      l.href='https://fonts.googleapis.com/css2?family=DM+Sans:wght@700;800&family=Orbitron:wght@600;700&display=swap';
      document.head.appendChild(l);
    }
    const PASS='ILOVEYOU';

    function ensurePowerMenu(){
      let pm=$('#powerMenu'); if(!pm){ pm=document.createElement('div'); pm.id='powerMenu'; pm.className='power-menu hidden';
        pm.innerHTML=`<div class="pm-item" data-act="lock"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a1 1 0 011 1v7h-2V3a1 1 0 011-1zm-6 9h12a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a2 2 0 012-2z"/></svg>Lock</div>`; document.body.appendChild(pm); }
      return pm;
    }
    function ensureLock(){
      let lock=$('#lock'); if(!lock){ lock=document.createElement('div'); lock.id='lock'; lock.className='lock hidden'; lock.innerHTML=`
        <div class="lock-inner">
          <div class="lock-clock" aria-live="polite">
            <div class="hh" id="lsHour">--</div>
            <div class="mm" id="lsMin">--</div>
            <div class="date" id="lsDate">---</div>
          </div>
          <div class="lock-pill" id="lockPill" aria-hidden="true">
            <div class="dots" id="lockDots"></div>
          </div>
        </div>
        <input id="lockInput" class="lock-input" type="password" autocomplete="off" />`; document.body.appendChild(lock); }
      return lock;
    }

    const startBtn=$('#logoBtn');
    const pm=ensurePowerMenu();
    const lock=ensureLock();

    const pill=lock.querySelector('#lockPill');
    const dotsWrap=lock.querySelector('#lockDots');
    const input=lock.querySelector('#lockInput');
    const hh=lock.querySelector('#lsHour');
    const mm=lock.querySelector('#lsMin');
    const dd=lock.querySelector('#lsDate');

    function tick(){ const d=new Date(); hh&&(hh.textContent=String(d.getHours()).padStart(2,'0')); mm&&(mm.textContent=String(d.getMinutes()).padStart(2,'0')); dd&&(dd.textContent=d.toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})); }
    let on=false, timer=0;

    function renderDots(n){
      dotsWrap.innerHTML=''; if(n>0){ pill.classList.add('has-typed'); for(let i=0;i<n;i++){ const d=document.createElement('div'); d.className='dot on'; d.style.animationDelay=`${i*18}ms`; dotsWrap.appendChild(d); } } else { pill.classList.remove('has-typed'); }
    }
    function reveal(){ if(!pill.classList.contains('on')) pill.classList.add('on'); setTimeout(()=>input.focus(),0); }
    function enter(){ on=true; lock.classList.remove('hidden','out'); lock.classList.add('on'); tick(); if(timer) clearInterval(timer); timer=setInterval(tick,30_000); input.value=''; renderDots(0); pill.classList.remove('err'); lock.tabIndex=-1; lock.focus();
      const onceClick=e=>{ if(e.button===0) reveal(); }; lock.addEventListener('mousedown', onceClick, { once:true });
      const onceSpace=e=>{ if(e.code==='Space'){ e.preventDefault(); reveal(); } }; lock.addEventListener('keydown', onceSpace, { once:true });
    }
    function leave(){ if(!on) return; on=false; lock.classList.remove('on'); lock.classList.add('out'); const done=()=>{ lock.classList.add('hidden'); lock.classList.remove('out'); lock.removeEventListener('animationend',done); }; lock.addEventListener('animationend',done); if(timer){ clearInterval(timer); timer=0; } }

    function showPM(){ const r=startBtn?.getBoundingClientRect(); pm.classList.remove('hidden'); pm.style.visibility='hidden'; pm.classList.add('show'); const h=pm.offsetHeight||120; const left=r?r.left:12; const top=r?Math.max(8,r.top-h-8):12; pm.style.left=Math.round(left)+'px'; pm.style.top=Math.round(top)+'px'; pm.style.visibility='visible';
      const off=ev=>{ if(!pm.contains(ev.target)) hidePM(); }; setTimeout(()=>document.addEventListener('mousedown',off,{once:true}),0); document.addEventListener('keydown',e=>{ if(e.key==='Escape') hidePM(); },{once:true});
    }
    function hidePM(){ pm.classList.remove('show'); pm.classList.add('hidden'); }
    function togglePM(){ (pm.classList.contains('hidden')||!pm.classList.contains('show')) ? showPM() : hidePM(); }

    startBtn?.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); togglePM(); });
    pm.addEventListener('click', e=>{ const it=e.target.closest('.pm-item'); if(!it) return; if(it.getAttribute('data-act')==='lock'){ hidePM(); enter(); } });

    // Route keys
    lock.addEventListener('keydown', e=>{
      if(!on) return;
      if(e.key==='Enter'){ const ok=(input.value||'').trim().toUpperCase()===PASS; if(ok) leave(); else { pill.classList.remove('err'); void pill.offsetWidth; pill.classList.add('err'); input.value=''; renderDots(0); } e.preventDefault(); return; }
      if(e.key==='Escape'){ input.value=''; renderDots(0); e.preventDefault(); return; }
      if(e.key==='Backspace'){ if(document.activeElement!==input){ input.value=input.value.slice(0,-1); renderDots(input.value.length); e.preventDefault(); } return; }
      if(e.key.length===1 && !e.ctrlKey && !e.metaKey && !e.altKey){ reveal(); if(document.activeElement!==input){ input.value+=e.key; renderDots(input.value.length); e.preventDefault(); } }
    });
    input.addEventListener('input', ()=>{ if(on) renderDots(input.value.length); });

    // Public API
    window.ZD = window.ZD || {}; window.ZD.lock = enter; window.ZD.unlock = leave;
  })();

})();

// ===== LockCore v5 — pill 240x54, dots auto-capacity (no half-circles) =====
(() => {
  const $ = s => document.querySelector(s);

  // Ensure Power menu + Lock DOM
  function ensurePM(){
    let pm = $('#powerMenu');
    if (!pm){
      pm = document.createElement('div');
      pm.id = 'powerMenu';
      pm.className = 'power-menu hidden';
      pm.innerHTML = `
        <div class="pm-item" data-act="lock">
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a1 1 0 011 1v7h-2V3a1 1 0 011-1zm-6 9h12a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a2 2 0 012-2z"/></svg>
          Lock
        </div>`;
      document.body.appendChild(pm);
    }
    return pm;
  }
  function ensureLock(){
    let lock = $('#lock');
    if (!lock){
      lock = document.createElement('div');
      lock.id = 'lock'; lock.className = 'lock hidden';
      lock.innerHTML = `
        <div class="lock-inner">
          <div class="lock-clock" aria-live="polite">
            <div class="hh" id="lsHour">--</div>
            <div class="mm" id="lsMin">--</div>
            <div class="date" id="lsDate">---</div>
          </div>
          <div class="lock-pill" id="lockPill" aria-hidden="true">
            <div class="dots" id="lockDots"></div>
          </div>
        </div>
        <input id="lockInput" class="lock-input" type="password" autocomplete="off" />`;
      document.body.appendChild(lock);
    }
    return lock;
  }

  const PASS = 'ILOVEYOU';
  const logo = $('#logoBtn');
  const pm = ensurePM();
  const lock = ensureLock();

  // Power menu toggle (left click)
  function showPM(){
    const r = logo?.getBoundingClientRect();
    pm.classList.remove('hidden'); pm.style.visibility='hidden'; pm.classList.add('show');
    const h = pm.offsetHeight || 120;
    const left = r ? r.left : 12;
    const top  = r ? Math.max(8, r.top - h - 8) : 12;
    pm.style.left = Math.round(left) + 'px';
    pm.style.top  = Math.round(top)  + 'px';
    pm.style.visibility='visible';
    const off = ev => { if (!pm.contains(ev.target)) hidePM(); };
    setTimeout(()=>document.addEventListener('mousedown', off, { once:true }), 0);
    document.addEventListener('keydown', e=>{ if (e.key==='Escape') hidePM(); }, { once:true });
  }
  function hidePM(){ pm.classList.remove('show'); pm.classList.add('hidden'); }
  function togglePM(){ (pm.classList.contains('hidden')||!pm.classList.contains('show')) ? showPM() : hidePM(); }
  logo?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); togglePM(); });
  pm.addEventListener('click', (e)=>{ const it=e.target.closest('.pm-item'); if (!it) return; if (it.getAttribute('data-act')==='lock'){ hidePM(); enterLock(); } });

  // Lock refs
  const pill = $('#lockPill');
  const dotsWrap = $('#lockDots');
  const input = $('#lockInput');
  const hh = $('#lsHour'), mm = $('#lsMin'), dd = $('#lsDate');

  // Clock render
  function tickClock(){
    const d = new Date();
    hh && (hh.textContent = String(d.getHours()).padStart(2,'0'));
    mm && (mm.textContent = String(d.getMinutes()).padStart(2,'0'));
    dd && (dd.textContent = d.toLocaleDateString('vi-VN',{ weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' }));
  }
  let on = false, clockTimer = 0;

  // Tính capacity theo width thực tế của dotsWrap
  function getCapacity(){
    const style = getComputedStyle(document.documentElement);
    const dot = parseFloat(style.getPropertyValue('--ls-dot')) || 14;
    const gap = parseFloat(style.getPropertyValue('--ls-gap')) || 12;
    // width usable = content box của dotsWrap (clientWidth)
    const w = dotsWrap.clientWidth || (pill.clientWidth - 32); // fallback 16px padding mỗi bên
    const cap = Math.max(1, Math.floor((w + gap) / (dot + gap)));
    return cap;
  }

  // Render dots: vẽ min(n, capacity) chấm, căn trái, KHÔNG nén
  function renderDots(n){
    const cap = getCapacity();
    const count = Math.min(n, cap);
    dotsWrap.innerHTML = '';
    if (count > 0){
      pill.classList.add('has-typed');
      for (let i=0; i<count; i++){
        const d = document.createElement('div');
        d.className = 'dot on';
        d.style.animationDelay = `${i*18}ms`;
        dotsWrap.appendChild(d);
      }
    } else {
      pill.classList.remove('has-typed');
    }
  }

  function revealPill(){
    if (!pill.classList.contains('on')) pill.classList.add('on');
    setTimeout(()=> input.focus(), 0);
  }

  function enterLock(){
    on = true;
    lock.classList.remove('hidden','out');
    lock.classList.add('on');
    tickClock(); if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(tickClock, 30_000);

    input.value = ''; renderDots(0);
    pill.classList.remove('err');
    lock.tabIndex = -1; lock.focus();

    // Left click bất kỳ để hiện pill
    const onceClick = (e)=>{ if (e.button===0) revealPill(); };
    lock.addEventListener('mousedown', onceClick, { once:true });

    // Resize → tính lại capacity và re-render theo độ dài hiện tại
    const onRes = () => { if (!on) return; renderDots(input.value.length); };
    window.addEventListener('resize', onRes, { passive:true });

    // Lưu handler để sau có thể gỡ nếu cần
    lock._onRes = onRes;
  }
  function leaveLock(){
    on = false;
    lock.classList.remove('on'); lock.classList.add('out');
    const done = ()=>{ lock.classList.add('hidden'); lock.classList.remove('out'); lock.removeEventListener('animationend', done); };
    lock.addEventListener('animationend', done);
    if (clockTimer){ clearInterval(clockTimer); clockTimer = 0; }
    if (lock._onRes){ window.removeEventListener('resize', lock._onRes); lock._onRes = null; }
  }

  // Route keys → input (không để double-handler)
  lock.addEventListener('keydown', (e)=>{
    if (!on) return;

    if (e.key === 'Enter'){
      const ok = (input.value || '').trim().toUpperCase() === PASS;
      if (ok) leaveLock();
      else {
        pill.classList.remove('err'); void pill.offsetWidth; pill.classList.add('err');
        input.value = ''; renderDots(0);
      }
      e.preventDefault(); return;
    }
    if (e.key === 'Escape'){ input.value=''; renderDots(0); e.preventDefault(); return; }

    if (e.key === 'Backspace'){
      if (input.value.length){
        input.value = input.value.slice(0, -1);
        renderDots(input.value.length);
        e.preventDefault();
      }
      return;
    }

    // Ký tự thường
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey){
      revealPill();
      input.value += e.key;
      renderDots(input.value.length);
      e.preventDefault();
    }
  });

  // Sync khi input thay đổi (mobile keyboard, paste…)
  input.addEventListener('input', ()=>{ if (on) renderDots(input.value.length); });

  // Public API (nếu muốn gọi trực tiếp)
  window.ZD = window.ZD || {};
  window.ZD.lock = enterLock;
  window.ZD.unlock = leaveLock;
})();

// ==== Lock dots incremental (fix dot cuối bị nhỏ/pop lại, dot 18x18) ====
(() => {
  const $ = s => document.querySelector(s);
  const lock = $('#lock');
  const pill = $('#lockPill');
  const dotsWrap = $('#lockDots');
  const input = $('#lockInput');
  if (!lock || !pill || !dotsWrap || !input) return;

  let lastRenderedCount = 0;  // số dot đang hiển thị
  let typedLen = 0;           // tổng ký tự đã gõ (để biết khi nào add/remove)
  let cap = 0;                // sức chứa dot theo bề rộng

  // Tính capacity dựa vào width dotsWrap và biến CSS
  function recalcCapacity(){
    const cs = getComputedStyle(document.documentElement);
    const dot = parseFloat(cs.getPropertyValue('--ls-dot')) || 18;
    const gap = parseFloat(cs.getPropertyValue('--ls-gap')) || 12;

    // width khả dụng = content box của dotsWrap (clientWidth), fallback: pill - padding 32
    const usable = dotsWrap.clientWidth || (pill.clientWidth - 32);
    cap = Math.max(1, Math.floor((usable + gap) / (dot + gap)));
    // Nếu đang hiển thị nhiều hơn cap, cắt bớt cuối
    if (lastRenderedCount > cap){
      for (let i = lastRenderedCount; i > cap; i--){
        dotsWrap.lastElementChild?.remove();
      }
      lastRenderedCount = cap;
    }
  }

  // Add 1 dot ở cuối (dot mới có pop-in)
  function appendDot(){
    const d = document.createElement('div');
    d.className = 'dot on';
    d.style.animationDelay = '0ms';
    dotsWrap.appendChild(d);
    lastRenderedCount += 1;
  }

  // Remove 1 dot ở cuối
  function removeDot(){
    if (!lastRenderedCount) return;
    dotsWrap.lastElementChild?.remove();
    lastRenderedCount -= 1;
  }

  // Cập nhật theo độ dài input (incremental, không re-render full)
  function updateDots(){
    typedLen = input.value.length;

    if (typedLen > 0) {
      pill.classList.add('has-typed');
    } else {
      // clear hết
      dotsWrap.innerHTML = '';
      lastRenderedCount = 0;
      pill.classList.remove('has-typed');
      return;
    }

    // Tính capacity (nếu width thay đổi)
    recalcCapacity();

    // target = min(typedLen, cap)
    const target = Math.min(typedLen, cap);

    // Thêm dot đến đủ target
    while (lastRenderedCount < target) appendDot();

    // Bớt dot khi backspace hoặc thu nhỏ capacity
    while (lastRenderedCount > target) removeDot();

    // Không đụng dot cũ => không bị reset animation, dot cuối không “teo” lại
  }

  // Reveal pill + focus
  function revealPill(){
    if (!pill.classList.contains('on')) pill.classList.add('on');
    setTimeout(() => input.focus(), 0);
  }

  // Left-click ở lock để hiện pill
  lock.addEventListener('mousedown', (e) => {
    if (e.button === 0) revealPill();
  });

  // Route phím vào input và update dots
  lock.addEventListener('keydown', (e) => {
    if (e.key === 'Enter'){
      // check pass ở nơi khác của m; nếu muốn xử ở đây, thêm callback
      return;
    }
    if (e.key === 'Escape'){
      input.value = '';
      updateDots();
      e.preventDefault();
      return;
    }
    if (e.key === 'Backspace'){
      if (input.value.length){
        // cho default xoá, sau đó 'input' event sẽ update; nếu muốn tức thời:
        // input.value = input.value.slice(0, -1); updateDots(); e.preventDefault();
      }
      return;
    }
    // Ký tự thường
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey){
      revealPill();
      // cho default chèn ký tự, 'input' sẽ update
    }
  });

  // Update khi input thay đổi (gõ/paste/xoá)
  input.addEventListener('input', updateDots);

  // Recalc khi resize (đổi cap), rồi sync lại theo typedLen
  window.addEventListener('resize', () => {
    if (!pill.classList.contains('on')) return;
    recalcCapacity();
    const target = Math.min(input.value.length, cap);
    while (lastRenderedCount < target) appendDot();
    while (lastRenderedCount > target) removeDot();
  });

  // Init
  recalcCapacity();
  updateDots();
})();

// ==== Fix: always catch left-click on #logoBtn and toggle Power menu ====
(() => {
  const $ = s => document.querySelector(s);

  function ensurePowerMenu(){
    let pm = document.getElementById('powerMenu');
    if (!pm){
      pm = document.createElement('div');
      pm.id = 'powerMenu';
      pm.className = 'power-menu hidden';
      pm.innerHTML = `
        <div class="pm-item" data-act="lock">
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a1 1 0 011 1v7h-2V3a1 1 0 011-1zm-6 9h12a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a2 2 0 012-2z"/></svg>
          Lock
        </div>`;
      document.body.appendChild(pm);
    }
    return pm;
  }

  const pm = ensurePowerMenu();

  function showPM(){
    const btn = document.getElementById('logoBtn');
    const r = btn?.getBoundingClientRect();
    pm.classList.remove('hidden');
    pm.style.visibility = 'hidden';
    pm.classList.add('show');
    const h = pm.offsetHeight || 120;
    const left = r ? r.left : 12;
    const top  = r ? Math.max(8, r.top - h - 8) : 12;
    pm.style.left = Math.round(left) + 'px';
    pm.style.top  = Math.round(top)  + 'px';
    pm.style.visibility = 'visible';

    const off = (ev)=>{ if (!pm.contains(ev.target)) hidePM(); };
    setTimeout(()=>document.addEventListener('mousedown', off, { once:true }), 0);
    document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') hidePM(); }, { once:true });
  }
  function hidePM(){ pm.classList.remove('show'); pm.classList.add('hidden'); }
  function togglePM(){ (pm.classList.contains('hidden') || !pm.classList.contains('show')) ? showPM() : hidePM(); }

  // Bắt click trái logo Z bằng event delegation (an toàn dù #logoBtn bị clone)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#logoBtn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    togglePM();
  }, true); // capture để ưu tiên trước listener khác

  // Handler chọn Lock (nếu đã có lock module thì cứ gọi window.ZD?.lock())
  pm.addEventListener('click', (e) => {
    const it = e.target.closest('.pm-item'); if (!it) return;
    if (it.getAttribute('data-act') === 'lock'){
      hidePM();
      if (window.ZD?.lock) window.ZD.lock();
      else {
        // fallback: chỉ tạo lớp lock đơn giản nếu chưa có
        alert('Lock is not wired yet. Gọi window.ZD.lock() trong module Lock của bạn.');
      }
    }
  });
})();

// ==== Lock dots incremental v2 — dot 18x18, không teo, không pop lại ====
(() => {
  const $ = s => document.querySelector(s);
  const lock = $('#lock'), pill = $('#lockPill'), dotsWrap = $('#lockDots'), input = $('#lockInput');
  if (!lock || !pill || !dotsWrap || !input) return;

  let lastRendered = 0;  // số dot đang hiển thị
  let cap = 0;           // sức chứa tối đa (tính khi hiện pill và khi resize)
  let measured = false;  // đã đo lần đầu chưa

  // Đo capacity theo bề rộng thực tế
  function measureCapacity(){
    const cs = getComputedStyle(document.documentElement);
    const dot = parseFloat(cs.getPropertyValue('--ls-dot')) || 18;
    const gap = parseFloat(cs.getPropertyValue('--ls-gap')) || 12;

    // Nếu chưa “has-typed”, tạm bật để đo clientWidth chính xác
    const needTempShow = !pill.classList.contains('has-typed');
    if (needTempShow){ pill.classList.add('has-typed'); dotsWrap.style.visibility = 'hidden'; }

    const usable = dotsWrap.clientWidth || (pill.clientWidth - 32); // fallback theo padding
    cap = Math.max(1, Math.floor((usable + gap) / (dot + gap)));

    if (needTempShow){ dotsWrap.style.visibility = ''; if (input.value.length === 0) pill.classList.remove('has-typed'); }
    measured = true;
  }

  // Thêm/bớt dot incremental
  function appendDot(){
    const d = document.createElement('div');
    d.className = 'dot on';
    dotsWrap.appendChild(d);
    lastRendered++;
  }
  function removeDot(){
    if (!lastRendered) return;
    dotsWrap.lastElementChild?.remove();
    lastRendered--;
  }

  // Cập nhật theo độ dài input (incremental, không re-render toàn bộ)
  function updateDots(){
    const n = input.value.length;

    if (n <= 0){
      dotsWrap.innerHTML = '';
      lastRendered = 0;
      pill.classList.remove('has-typed');
      return;
    }

    pill.classList.add('has-typed');

    if (!measured) measureCapacity();

    const target = Math.min(n, cap);

    while (lastRendered < target) appendDot();
    while (lastRendered > target) removeDot();
  }

  // Reveal pill + measure capacity lần đầu
  function revealPill(){
    if (!pill.classList.contains('on')) pill.classList.add('on');
    if (!measured) measureCapacity();
    setTimeout(()=> input.focus(), 0);
  }

  // Left-click trên lock để hiện pill
  lock.addEventListener('mousedown', (e) => {
    if (e.button === 0) revealPill();
  });

  // Route phím (để mặc định chèn/xoá, chỉ cập nhật dots)
  lock.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') return; // verify pass ở handler khác của bạn
    if (e.key === 'Escape'){ input.value=''; updateDots(); e.preventDefault(); return; }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey){
      revealPill(); // hiện pill khi bắt đầu gõ
      return;       // để default thêm ký tự → sự kiện 'input' sẽ gọi updateDots()
    }
  });

  // Đồng bộ dots khi input thay đổi (gõ/paste/xoá)
  input.addEventListener('input', updateDots);

  // Re-measure khi resize để tính cap mới (và sync số dot).
  const ro = new ResizeObserver(() => {
    if (!pill.classList.contains('on')) return;
    const prevCap = cap;
    measureCapacity();
    if (cap !== prevCap){
      const target = Math.min(input.value.length, cap);
      while (lastRendered < target) appendDot();
      while (lastRendered > target) removeDot();
    }
  });
  ro.observe(pill);

  // Init
  updateDots();
})();

// ==== Guard click: khi lock ẩn hoặc overlay nền, không chặn icon ====
(() => {
  const lock = document.getElementById('lock');
  if (!lock) return;
  const observer = new MutationObserver(() => {
    const hidden = lock.classList.contains('hidden');
    lock.style.pointerEvents = hidden ? 'none' : 'auto';
  });
  observer.observe(lock, { attributes:true, attributeFilter:['class'] });
  // set initial
  lock.style.pointerEvents = lock.classList.contains('hidden') ? 'none' : 'auto';
})();

// ==== Lock dots v6 — dot 18x18, không clip, auto-co gap khi đầy, incremental render ====
(() => {
  const $ = s => document.querySelector(s);
  const pill = $('#lockPill');
  const dotsWrap = $('#lockDots');
  const input = $('#lockInput');
  if (!pill || !dotsWrap || !input) return;

  let lastRendered = 0;      // số dot đang hiển thị
  let baseGap = 12;          // gap mặc định (px)
  let minGap  = 4;           // gap tối thiểu khi co (px)

  // đọc biến CSS hiện tại
  function readVars(){
    const cs = getComputedStyle(document.documentElement);
    baseGap = parseFloat(cs.getPropertyValue('--ls-gap')) || 12;
    minGap  = parseFloat(cs.getPropertyValue('--ls-gap-min')) || 4;
  }

  // Tính gap cần thiết để toàn bộ typedLen dot lọt trong pill (không clip)
  function computeGapToFit(typedLen){
    const csRoot = getComputedStyle(document.documentElement);
    const dot = parseFloat(csRoot.getPropertyValue('--ls-dot')) || 18;

    const csDots = getComputedStyle(dotsWrap);
    const padL = parseFloat(csDots.paddingLeft) || 16;
    const padR = parseFloat(csDots.paddingRight) || 16;

    const usable = (pill.clientWidth || 240) - (padL + padR);
    if (typedLen <= 1) return baseGap;

    // gap_fit = floor((usable - typedLen*dot) / (typedLen - 1))
    let g = Math.floor((usable - typedLen * dot) / (typedLen - 1));
    g = Math.min(baseGap, Math.max(minGap, g)); // co tối đa đến minGap, không vượt baseGap
    return isFinite(g) ? g : baseGap;
  }

  // Thêm dot (chỉ dot mới có class .on)
  function appendDot(){
    const d = document.createElement('div');
    d.className = 'dot on';
    dotsWrap.appendChild(d);
    lastRendered++;

    // sau 220ms, bỏ .on để về trạng thái thường (tránh re-pop nếu có thay đổi style)
    setTimeout(() => d.classList.remove('on'), 220);
  }

  // Bớt dot cuối
  function removeDot(){
    if (!lastRendered) return;
    dotsWrap.lastElementChild?.remove();
    lastRendered--;
  }

  // Cập nhật dãy dot theo độ dài input (incremental)
  function updateDots(){
    const n = input.value.length;

    if (n <= 0){
      dotsWrap.innerHTML = '';
      lastRendered = 0;
      pill.classList.remove('has-typed');
      return;
    }

    pill.classList.add('has-typed');

    // 1) Co gap nếu cần để tất cả dot lọt vào
    readVars();
    const fitGap = computeGapToFit(n);
    dotsWrap.style.setProperty('--ls-gap', fitGap + 'px');

    // 2) Render incremental
    while (lastRendered < n) appendDot();
    while (lastRendered > n) removeDot();
  }

  // Reveal pill và focus input
  function revealPill(){
    if (!pill.classList.contains('on')) pill.classList.add('on');
    setTimeout(() => input.focus(), 0);
  }

  // Click trái để hiện pill
  document.getElementById('lock')?.addEventListener('mousedown', (e) => {
    if (e.button === 0) revealPill();
  });

  // Route phím: để default chèn/xoá, chỉ update dots
  document.getElementById('lock')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') return;         // verify pass ở handler khác
    if (e.key === 'Escape'){ input.value=''; updateDots(); e.preventDefault(); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey){
      revealPill(); // hiện pill khi bắt đầu gõ
    }
  });

  // Đồng bộ khi input thay đổi (gõ/paste/xoá)
  input.addEventListener('input', updateDots);

  // Refit khi resize (đổi gap theo chiều rộng mới)
  window.addEventListener('resize', () => {
    if (!pill.classList.contains('on')) return;
    // chỉ cập nhật gap, KHÔNG re-render dot -> dot cuối không pop lại
    dotsWrap.style.setProperty('--ls-gap', computeGapToFit(input.value.length) + 'px');
  });

  // Init
  updateDots();
})();

// ===== Lock dots v7 — 18x18, No-Clip, No-Teo, No-Repop =====
(() => {
  const $ = s => document.querySelector(s);
  const lock = $('#lock'), pill = $('#lockPill'), dotsWrap = $('#lockDots'), input = $('#lockInput');
  if (!lock || !pill || !dotsWrap || !input) return;

  let lastRendered = 0;  // số dot đang hiển thị
  let baseGap = 12, minGap = 4, dotSize = 18;

  function readVars(){
    const rt = getComputedStyle(document.documentElement);
    baseGap = +rt.getPropertyValue('--ls-gap')     || 12;
    minGap  = +rt.getPropertyValue('--ls-gap-min') || 4;
    dotSize = +rt.getPropertyValue('--ls-dot')     || 18;
  }

  // Tính gap cần để N dot lọt trong pill (không clip). Nếu N quá nhiều: gap = minGap.
  function fitGapFor(n){
    const padL = parseFloat(getComputedStyle(dotsWrap).paddingLeft)  || 16;
    const padR = parseFloat(getComputedStyle(dotsWrap).paddingRight) || 16;
    const usable = (pill.clientWidth || 240) - (padL + padR);
    if (n <= 1) return baseGap;
    const g = (usable - n * dotSize) / (n - 1);      // có thể âm
    return Math.min(baseGap, Math.max(minGap, g));
  }

  // Số dot tối đa có thể hiển thị với gap tối thiểu (để KHÔNG clip)
  function maxVisibleWithMinGap(){
    const padL = parseFloat(getComputedStyle(dotsWrap).paddingLeft)  || 16;
    const padR = parseFloat(getComputedStyle(dotsWrap).paddingRight) || 16;
    const usable = (pill.clientWidth || 240) - (padL + padR);
    // n*dot + (n-1)*minGap <= usable
    // → n*(dot+minGap) - minGap <= usable
    // → n <= (usable + minGap)/(dot+minGap)
    const n = Math.floor((usable + minGap) / (dotSize + minGap));
    return Math.max(1, n);
  }

  // Thêm dot mới ở cuối (chỉ dot mới pop 1 lần)
  function appendDot(){
    const d = document.createElement('div');
    d.className = 'dot pop';
    dotsWrap.appendChild(d);
    lastRendered++;
    // gỡ class pop sau khi xong để không re-animate khi thay gap
    setTimeout(() => d.classList.remove('pop'), 220);
  }

  // Xoá dot cuối
  function removeDot(){
    if (!lastRendered) return;
    dotsWrap.lastElementChild?.remove();
    lastRendered--;
  }

  // Cập nhật dãy dot theo input (incremental, no re-render)
  function updateDots(){
    readVars();

    const typed = input.value.length;

    if (typed <= 0){
      dotsWrap.innerHTML = '';
      lastRendered = 0;
      pill.classList.remove('has-typed');
      // reset gap về mặc định
      dotsWrap.style.setProperty('--ls-gap', baseGap + 'px');
      return;
    }
    pill.classList.add('has-typed');

    // 1) Tính số dot sẽ HIỂN THỊ (cap) để không clip
    const maxVis = maxVisibleWithMinGap();
    const target = Math.min(typed, maxVis);

    // 2) Tính gap phù hợp cho "target" dot để phủ kín trong pill mà không clip
    const g = fitGapFor(target);
    dotsWrap.style.setProperty('--ls-gap', g.toFixed(2) + 'px');

    // 3) Render incremental đến đúng target (dot cũ giữ nguyên)
    while (lastRendered < target) appendDot();
    while (lastRendered > target) removeDot();
  }

  // Reveal pill + focus input
  function revealPill(){
    if (!pill.classList.contains('on')) pill.classList.add('on');
    setTimeout(() => input.focus(), 0);
  }

  // Click trái để hiện pill
  lock.addEventListener('mousedown', (e) => { if (e.button === 0) revealPill(); });

  // Route phím: để default chèn/xoá; ta chỉ update dots
  lock.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') return; // verify pass ở handler khác
    if (e.key === 'Escape'){ input.value=''; updateDots(); e.preventDefault(); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey){ revealPill(); }
  });

  // Đồng bộ khi input thay đổi (gõ/paste/backspace)
  input.addEventListener('input', updateDots);

  // Refit khi pill/viewport đổi kích thước (đổi gap + số dot tối đa)
  const ro = new ResizeObserver(() => {
    if (!pill.classList.contains('on')) return;
    updateDots(); // chỉ đổi gap/target, dot cũ không bị animate lại
  });
  ro.observe(pill);

  // Init
  updateDots();
})();

// ===== LockDots absolute — 18×18, "xích ra" (1→2), tail 2 chấm trái khi overflow =====
(() => {
  const $ = s => document.querySelector(s);
  const pill = $('#lockPill'), dotsWrap = $('#lockDots'), input = $('#lockInput');
  if (!pill || !dotsWrap || !input) return;

  let lastRendered = 0;

  function vars(){
    const rt = getComputedStyle(document.documentElement);
    return {
      dot:     parseFloat(rt.getPropertyValue('--ls-dot'))     || 18,
      pad:     parseFloat(rt.getPropertyValue('--ls-pad'))     || 16,
      edge:    parseFloat(rt.getPropertyValue('--ls-edge'))    || 9,
      gapWant: parseFloat(rt.getPropertyValue('--ls-gap'))     || 12,
      gapMin:  parseFloat(rt.getPropertyValue('--ls-gap-min')) || 4
    };
  }

  function track(){
    const { pad, edge } = vars();
    const W  = pill.clientWidth || 240;
    const L  = pad + edge;              // điểm bắt đầu vùng an toàn
    const R  = W - pad - edge;          // điểm kết thúc vùng an toàn
    return { left: L, right: R, width: Math.max(0, R - L) };
  }

  function maxVisible(){
    const { gapMin, dot } = vars();
    const { width } = track();
    // n*dot + (n-1)*minGap <= width  =>  n <= (width + minGap)/(dot+minGap)
    const n = Math.floor((width + gapMin) / (dot + gapMin));
    return Math.max(1, n);
  }

  function fitGap(n){
    const { dot, gapWant, gapMin } = vars();
    if (n <= 1) return 0;
    const { width } = track();
    const gFit = (width - n * dot) / (n - 1);
    return Math.min(gapWant, Math.max(gapMin, gFit));
  }

  function placeAll(n, gap){
    const { dot } = vars();
    const { left } = track();
    for (let i = 0; i < n; i++){
      const el = dotsWrap.children[i];
      if (!el) continue;
      el.style.left = (left + i * (dot + gap)) + 'px';
    }
  }

  function appendDot(){
    const d = document.createElement('div');
    d.className = 'dot pop';
    d.style.left = '0px';
    dotsWrap.appendChild(d);
    lastRendered++;
    setTimeout(() => d.classList.remove('pop'), 240);
  }
  function removeDot(){
    if (!lastRendered) return;
    dotsWrap.lastElementChild?.remove();
    lastRendered--;
  }

  function applyTail(nVisible, overflow){
    // clear tail trước
    const kids = Array.from(dotsWrap.children);
    kids.forEach(k => k.classList.remove('tail1','tail2'));
    if (!overflow) return;
    // Tail nằm ở 2 chấm TRÁI cùng (cũ nhất trong vùng nhìn thấy)
    if (nVisible >= 2){
      kids[0]?.classList.add('tail2'); // nhỏ & mờ hơn
      kids[1]?.classList.add('tail1'); // nhỏ & mờ nhẹ
    } else if (nVisible === 1){
      kids[0]?.classList.add('tail2');
    }
  }

  function kickSpacing(gap){
    // “xích ra” khi từ 1 -> 2: ép khoảng cách = 0 rồi animate sang gap
    placeAll(lastRendered, 0);
    void dotsWrap.offsetWidth;  // flush
    placeAll(lastRendered, gap);
  }

  function updateDots(){
    const typed = input.value.length;

    if (typed <= 0){
      dotsWrap.innerHTML = '';
      lastRendered = 0;
      pill.classList.remove('has-typed');
      return;
    }
    pill.classList.add('has-typed');

    const cap = maxVisible();
    const target = Math.min(typed, cap);
    const prev = lastRendered;

    // incremental add/remove
    while (lastRendered < target) appendDot();
    while (lastRendered > target) removeDot();

    const gap = fitGap(lastRendered);

    // 1->2: animate “xích ra”
    if (prev === 1 && lastRendered === 2) kickSpacing(gap);
    else placeAll(lastRendered, gap);

    // Tail khi overflow (typed > cap)
    applyTail(lastRendered, typed > cap);
  }

  function revealPill(){
    if (!pill.classList.contains('on')) pill.classList.add('on');
    setTimeout(()=> input.focus(), 0);
  }

  // Hiện pill khi click trái
  document.getElementById('lock')?.addEventListener('mousedown', (e)=>{ if (e.button===0) revealPill(); });

  // Route phím: để default chèn/xoá; ta chỉ update layout
  document.getElementById('lock')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') return; // verify pass ở handler khác
    if (e.key === 'Escape'){ input.value=''; updateDots(); e.preventDefault(); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) revealPill();
  });

  input.addEventListener('input', updateDots);
  new ResizeObserver(() => { if (pill.classList.contains('on')) updateDots(); }).observe(pill);

  // Init
  updateDots();
})();

(() => {
  const pill = document.getElementById('lockPill');
  const dotsWrap = document.getElementById('lockDots');
  const input = document.getElementById('lockInput');
  if (!pill || !dotsWrap || !input) return;

  let lastRendered = 0;

  function vars(){
    const rt = getComputedStyle(document.documentElement);
    return {
      dot:     parseFloat(rt.getPropertyValue('--ls-dot'))     || 18,
      edge:    parseFloat(rt.getPropertyValue('--ls-edge'))    || 9,
      gapWant: parseFloat(rt.getPropertyValue('--ls-gap'))     || 12,
      gapMin:  parseFloat(rt.getPropertyValue('--ls-gap-min')) || 4
    };
  }

  // FIX: đo theo .dots (content box, đã trừ padding nhờ box-sizing)
  function track(){
    const { edge } = vars();
    const W = dotsWrap.clientWidth || 0;   // KHÔNG dùng pill.clientWidth nữa
    const L = edge;                        // left=0 đã ở sau padding → chỉ cộng edge
    const R = Math.max(L, W - edge);
    return { left: L, right: R, width: Math.max(0, R - L) };
  }

  function maxVisible(){
    const { gapMin, dot } = vars();
    const { width } = track();
    const n = Math.floor((width + gapMin) / (dot + gapMin));
    return Math.max(1, n);
  }

  function fitGap(n){
    const { dot, gapWant, gapMin } = vars();
    if (n <= 1) return 0;
    const { width } = track();
    const gFit = (width - n * dot) / (n - 1);
    return Math.min(gapWant, Math.max(gapMin, isFinite(gFit) ? gFit : gapWant));
  }

  function placeAll(n, gap){
    const { dot } = vars();
    const { left } = track();
    for (let i = 0; i < n; i++){
      const el = dotsWrap.children[i];
      if (!el) continue;
      el.style.left = (left + i * (dot + gap)) + 'px';
    }
  }

  function appendDot(){
    const { left } = track();             // FIX: dot mới đặt ngay tại startX
    const d = document.createElement('div');
    d.className = 'dot pop';
    d.style.left = left + 'px';
    dotsWrap.appendChild(d);
    lastRendered++;
    setTimeout(() => d.classList.remove('pop'), 240);
  }
  function removeDot(){
    if (!lastRendered) return;
    dotsWrap.lastElementChild?.remove();
    lastRendered--;
  }

  function kickSpacing(gap){
    // xích từ sát nhau -> gapFit
    placeAll(lastRendered, 0);
    void dotsWrap.offsetWidth;
    placeAll(lastRendered, gap);
  }

  function applyTail(nVisible, overflow){
    const kids = Array.from(dotsWrap.children);
    kids.forEach(k => k.classList.remove('tail1','tail2'));
    if (!overflow) return;
    if (nVisible >= 2){
      kids[0]?.classList.add('tail2');  // nhỏ & mờ hơn
      kids[1]?.classList.add('tail1');  // nhỏ & mờ nhẹ
    } else if (nVisible === 1){
      kids[0]?.classList.add('tail2');
    }
  }

  function updateDots(){
    const typed = input.value.length;

    if (typed <= 0){
      dotsWrap.innerHTML = '';
      lastRendered = 0;
      pill.classList.remove('has-typed');
      return;
    }
    pill.classList.add('has-typed');

    const cap = maxVisible();
    const target = Math.min(typed, cap);
    const prev = lastRendered;

    while (lastRendered < target) appendDot();
    while (lastRendered > target) removeDot();

    const gap = fitGap(lastRendered);

    if (prev === 1 && lastRendered === 2) kickSpacing(gap);
    else placeAll(lastRendered, gap);

    applyTail(lastRendered, typed > cap);
  }

  // Reveal pill → đo lại sau khi hiện (tránh width=0 ở frame đầu)
  function revealPill(){
    if (!pill.classList.contains('on')) pill.classList.add('on');
    requestAnimationFrame(() => {  // đảm bảo .dots hiển thị rồi mới đo
      updateDots();
      input.focus();
    });
  }

  // Bind
  document.getElementById('lock')?.addEventListener('mousedown', (e)=>{ if (e.button===0) revealPill(); });
  document.getElementById('lock')?.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter') return;
    if (e.key === 'Escape'){ input.value=''; updateDots(); e.preventDefault(); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) revealPill();
  });
  input.addEventListener('input', updateDots);
  new ResizeObserver(() => { if (pill.classList.contains('on')) updateDots(); }).observe(pill);

  // Init
  updateDots();
})();