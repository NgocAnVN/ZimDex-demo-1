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

})();// ===== WallpaperManager — single source of truth (no revert) =====
(() => {
  const $ = s => document.querySelector(s);
  const root = document.documentElement;
  const desktop = $('#desktop');
  const wpLayer = $('#wpBase');

  // apply CSS var(--wp)
  function setVar(url){ root.style.setProperty('--wp', `url("${url}")`); }

  // cross‑fade overlay -> setVar(url) khi end
  function crossfade(url){
    if (!desktop) { setVar(url); return; }
    const next = document.createElement('div');
    next.className = 'wp-next enter';
    next.style.backgroundImage = `url("${url}")`;
    desktop.appendChild(next);
    const done = () => {
      setVar(url);
      next.removeEventListener('animationend', done);
      next.remove();
    };
    next.addEventListener('animationend', done);
  }

  // token chống chồng lệnh
  let ver = 0;   // tăng mỗi lần set
  function currentVer(){ return ++ver; }

  // File -> DataURL
  function fileToDataURL(file){
    return new Promise((res, rej)=>{
      const rd = new FileReader();
      rd.onload = () => res(String(rd.result || ''));
      rd.onerror = rej;
      rd.readAsDataURL(file);
    });
  }

  // Pick ảnh (JPG/PNG/WEBP/AVIF)
  function pickImageFile(){
    return new Promise((resolve)=>{
      let inp = $('#pick');
      if (!inp){
        inp = document.createElement('input');
        inp.id = 'pick';
        inp.type = 'file';
        document.body.appendChild(inp);
      }
      inp.accept = 'image/jpeg,image/jpg,image/png,image/webp,image/avif,image/*';
      inp.value = '';
      inp.onchange = () => resolve(inp.files?.[0] || null);
      inp.click();
    });
  }

  // Set từ File: show ngay bằng objectURL + lưu base64 nếu token vẫn còn hiệu lực
  async function setFromFile(file){
    if (!file) return;
    const token = currentVer();

    // 1) objectURL để hiển thị ngay (JPG to vẫn ok)
    const tmpURL = URL.createObjectURL(file);

    // preload để chắc chắn ảnh hợp lệ rồi mới crossfade
    const img = new Image();
    img.onload = async () => {
      // Nếu trong lúc preload m chọn ảnh khác, token thay đổi -> bỏ
      if (token !== ver) { URL.revokeObjectURL(tmpURL); return; }

      crossfade(tmpURL);          // show ngay
      // 2) chuyển sang base64 và lưu (reload vẫn còn)
      try{
        const dataUrl = await fileToDataURL(file);
        // nếu user chưa chọn ảnh mới trong lúc convert, commit
        if (token === ver){
          try{ localStorage.setItem('zd_wallpaper', dataUrl); }catch{}
          setVar(dataUrl);        // thay objectURL bằng base64 bền vững
        }
      }catch{}
      // luôn revoke objectURL sau cùng
      try{ URL.revokeObjectURL(tmpURL); }catch{}
    };
    img.onerror = () => {
      try{ URL.revokeObjectURL(tmpURL); }catch{}
      alert('Ảnh không hợp lệ. Thử JPG/PNG/WebP khác nhé.');
    };
    img.src = tmpURL;
  }

  // Public API nếu muốn gọi chỗ khác
  window.WP = { setFromFile };

  // Restore DUY NHẤT lúc load
  (function restoreOnce(){
    const saved = localStorage.getItem('zd_wallpaper');
    if (saved) setVar(saved);
  })();

  // Gắn lại mục “Change wallpaper” vào ctxmenu hiện tại (nếu chưa có)
  (function patchCtx(){
    const tryPatch = () => {
      const m = $('#ctxMenu'); if (!m) return false;
      // nếu menu đã có item wp-change do code cũ, ta thay handler
      let it = m.querySelector('[data-act="wp-change"]');
      if (!it){
        it = document.createElement('div');
        it.className = 'ctx-item'; it.setAttribute('data-act','wp-change');
        it.innerHTML = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 5h16v12H4zM7 9h10v4H7z"/></svg>Change wallpaper…`;
        m.insertBefore(it, m.firstChild);
      }
      it.addEventListener('click', async (e)=>{
        e.stopPropagation();
        const f = await pickImageFile();
        await setFromFile(f);
        // ẩn menu nếu code cũ chưa đóng
        m.classList.add('hidden');
      });
      return true;
    };
    // patch ngay nếu #ctxMenu đã render, nếu chưa thì chờ lần right‑click
    if (!tryPatch()) document.addEventListener('contextmenu', ()=>setTimeout(tryPatch,0));
  })();

  // Ngăn tab khác “giật ngược” khi đổi localStorage
  window.addEventListener('storage', (e)=>{
    if (e.key === 'zd_wallpaper' && typeof e.newValue === 'string'){
      // chỉ áp nếu chưa có thao tác local (token không đổi trong 300ms)
      const tokenBefore = ver;
      setTimeout(()=>{ if (ver === tokenBefore) setVar(e.newValue); }, 300);
    }
  });

})();
