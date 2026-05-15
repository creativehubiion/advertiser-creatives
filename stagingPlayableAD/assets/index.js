// =====================================================================
//  iion sensor-probe-telemetry — tilt-racer playable + DMP event firing
// =====================================================================
// This file is loaded by stagingPlayableAD's static GAM-trafficked
// wrapper HTML (index_GAM_stagingPlayableAD.html). The wrapper:
//   - sets window.trackingType / setTracker / landingPageUrl with GAM
//     macros that GAM substitutes at serve time
//   - provides the page DOM scaffolding
//   - does NOT include mraid.js — sensor APIs come from HTML5, not MRAID
// We inject our own style + DOM and run the playable + telemetry. All
// engagement events fire to iion's staging DMP via window.trackingType.
//
// Replaced previous creative on 2026-05-11. Previous shim archived at
// stagingPlayableAD/!assets/index_2026-05-11_pexi-iframe.js
// =====================================================================

(() => {
  'use strict';

  // -------------------- inject CSS --------------------
  const STYLE = document.createElement('style');
  STYLE.textContent = `
    *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    html,body{width:100%;height:100%;overflow:hidden;background:#0a0e1a;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;user-select:none;-webkit-user-select:none;touch-action:none}
    #ipt-stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:1}
    #ipt-stage canvas{display:block;background:#0a0e1a;touch-action:none}
    #ipt-hud{position:fixed;top:0;left:0;right:0;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;pointer-events:none;font-weight:700;letter-spacing:.04em;font-size:14px;z-index:5;text-shadow:0 1px 2px rgba(0,0,0,.6)}
    #ipt-hud .label{font-size:9px;font-weight:600;color:#7d8aa8;letter-spacing:.12em;text-transform:uppercase;display:block;margin-bottom:1px}
    #ipt-hud .val{font-size:18px;font-variant-numeric:tabular-nums}
    #ipt-score{color:#ffd34d}
    #ipt-time{color:#5dd9ff}
    #ipt-input-pill{position:fixed;top:14px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.1);padding:4px 10px;border-radius:999px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#9aa6c2;pointer-events:none;z-index:6;font-weight:600}
    .ipt-overlay{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px;background:radial-gradient(circle at 50% 30%,#1b2240 0%,#0a0e1a 80%);z-index:10;animation:ipt-fade .25s ease}
    @keyframes ipt-fade{from{opacity:0}to{opacity:1}}
    .ipt-overlay h1{font-size:34px;font-weight:800;letter-spacing:.04em;margin-bottom:8px;background:linear-gradient(90deg,#5dd9ff,#a47bff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;text-fill-color:transparent}
    .ipt-overlay h2{font-size:22px;font-weight:700;color:#ffd34d;margin:6px 0 22px;letter-spacing:.02em}
    .ipt-overlay p{font-size:14px;color:#9aa6c2;line-height:1.5;max-width:320px;margin-bottom:28px}
    .ipt-overlay .ipt-arrows{font-size:30px;letter-spacing:18px;color:#5dd9ff;margin-bottom:14px;animation:ipt-wobble 1.4s ease-in-out infinite;text-shadow:0 0 12px rgba(93,217,255,.55)}
    @keyframes ipt-wobble{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(12deg)}}
    .ipt-btn{background:linear-gradient(90deg,#5dd9ff,#a47bff);color:#0a0e1a;border:none;padding:14px 38px;border-radius:999px;font-size:15px;font-weight:800;letter-spacing:.06em;cursor:pointer;text-transform:uppercase;box-shadow:0 8px 28px rgba(93,217,255,.35);min-width:200px;animation:ipt-pulse 1.6s ease-in-out infinite}
    @keyframes ipt-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
    .ipt-btn:active{transform:scale(.97)}
    .ipt-small{font-size:11px;color:#5d6885;margin-top:18px;letter-spacing:.05em}
    .ipt-stat-box{display:flex;gap:32px;margin:8px 0 28px}
    .ipt-stat-box .stat .lbl{font-size:10px;color:#7d8aa8;letter-spacing:.12em;text-transform:uppercase}
    .ipt-stat-box .stat .num{font-size:28px;font-weight:800;color:#ffd34d;font-variant-numeric:tabular-nums}
    /* Live diagnostic — visible by default in this staging-ad slot since
       the URL is not trafficked outside. To hide for a quieter look,
       append ?nodebug=1 to the wrapper URL. */
    #ipt-diag{margin-top:18px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;line-height:1.6;color:#5d6885;letter-spacing:.04em;text-align:left;background:rgba(0,0,0,.25);padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.06);min-width:240px}
    #ipt-diag .k{color:#7d8aa8;display:inline-block;width:80px}
    #ipt-diag .v{color:#e6edf3;font-variant-numeric:tabular-nums}
    #ipt-diag .v.ok{color:#3fb950}
    #ipt-diag .v.bad{color:#f85149}
    #ipt-diag .v.warn{color:#d29922}
    #ipt-cta-pill{position:fixed;bottom:18px;right:14px;background:rgba(0,0,0,.55);color:#5dd9ff;border:1px solid rgba(93,217,255,.4);padding:7px 14px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;display:none;z-index:7;backdrop-filter:blur(6px)}
    #ipt-cta-pill:active{transform:scale(.97);background:rgba(93,217,255,.15)}
  `;
  document.head.appendChild(STYLE);

  // -------------------- inject DOM --------------------
  // Hide the wrapper's #app so its centred flex container doesn't fight
  // our position:fixed overlays. We don't remove anything, just hide.
  const wrapperApp = document.getElementById('app');
  if (wrapperApp) wrapperApp.style.display = 'none';

  const root = document.createElement('div');
  root.id = 'ipt-root';
  root.innerHTML = `
    <div id="ipt-stage"><canvas id="ipt-game" width="360" height="640"></canvas></div>
    <div id="ipt-hud" style="display:none">
      <div><span class="label">Score</span><span id="ipt-score" class="val">0</span></div>
      <div><span class="label">Time</span><span id="ipt-time" class="val">25</span></div>
    </div>
    <div id="ipt-input-pill" style="display:none">— input</div>
    <button id="ipt-cta-pill">Learn more</button>
    <div id="ipt-ov-start" class="ipt-overlay">
      <div class="ipt-arrows">↶ ↷</div>
      <h1>TILT RACER</h1>
      <p>Tilt your phone left and right to steer.<br>Dodge the cars. Grab the coins.</p>
      <button id="ipt-btn-start" class="ipt-btn">Tap to start</button>
      <div id="ipt-diag">
        <div><span class="k">gyro api</span><span class="v" id="ipt-d-orient-api">…</span></div>
        <div><span class="k">events</span><span class="v" id="ipt-d-orient-count">0</span></div>
        <div><span class="k">α / β / γ</span><span class="v" id="ipt-d-orient-vals">— / — / —</span></div>
        <div><span class="k">accel api</span><span class="v" id="ipt-d-motion-api">…</span></div>
        <div><span class="k">accel evt</span><span class="v" id="ipt-d-motion-count">0</span></div>
        <div><span class="k">policy</span><span class="v" id="ipt-d-policy">…</span></div>
        <div><span class="k">https</span><span class="v" id="ipt-d-https">…</span></div>
      </div>
      <div class="ipt-small" style="margin-top:14px">iion · advanced playables</div>
    </div>
    <div id="ipt-ov-end" class="ipt-overlay" style="display:none">
      <h1 id="ipt-end-title">NICE RUN</h1>
      <div class="ipt-stat-box">
        <div class="stat"><div class="lbl">Score</div><div id="ipt-end-score" class="num">0</div></div>
        <div class="stat"><div class="lbl">Coins</div><div id="ipt-end-coins" class="num">0</div></div>
      </div>
      <button id="ipt-btn-cta" class="ipt-btn">Learn more</button>
      <button id="ipt-btn-replay" style="background:none;border:none;color:#7d8aa8;font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin-top:18px;cursor:pointer">Play again</button>
    </div>
  `;
  document.body.appendChild(root);

  // Hide diagnostic if explicitly requested via ?nodebug=1 on wrapper URL.
  if (/[?&]nodebug=1/.test(location.search)) {
    document.getElementById('ipt-diag').style.display = 'none';
  }

  // -------------------- DMP telemetry --------------------
  const startedAt = performance.now();
  let probeClosed = false;
  const fired = new Set();
  function track(name, oneShot = true) {
    if (!name || !window.trackingType) return;
    if (oneShot) { if (fired.has(name)) return; fired.add(name); }
    const url = window.trackingType + name;
    try {
      if (typeof fetch === 'function') {
        fetch(url, { method: 'GET', mode: 'no-cors', keepalive: true }).catch(() => { try { new Image().src = url; } catch {} });
      } else {
        new Image().src = url;
      }
    } catch { try { new Image().src = url; } catch {} }
  }

  let isTop = false;
  try { isTop = (window === window.top); } catch { isTop = false; }
  track('SensorProbeLoaded');
  track(isTop ? 'SensorProbeTopLevel' : 'SensorProbeIframed');

  const $D = (id) => document.getElementById(id);
  function setD(id, value, klass) {
    const el = $D(id); if (!el) return;
    el.textContent = value;
    el.classList.remove('ok','bad','warn');
    if (klass) el.classList.add(klass);
  }
  setD('ipt-d-https', location.protocol === 'https:' ? 'yes' : 'no — sensors blocked',
       location.protocol === 'https:' ? 'ok' : 'bad');
  let _pol;
  try {
    const fp = document.featurePolicy || document.permissionsPolicy;
    const g = fp?.allowsFeature?.('gyroscope');
    const a = fp?.allowsFeature?.('accelerometer');
    if (g === false || a === false) _pol = 'blocked';
    else if (g === true && a === true) _pol = 'allowed';
    else _pol = 'unknown';
  } catch { _pol = 'unknown'; }
  setD('ipt-d-policy', _pol, _pol === 'allowed' ? 'ok' : _pol === 'blocked' ? 'bad' : 'warn');

  ['gyroscope','accelerometer','magnetometer','microphone','camera','geolocation','autoplay','fullscreen']
    .forEach((f) => {
      let v = null;
      try {
        const fp = document.featurePolicy || document.permissionsPolicy;
        if (fp && typeof fp.allowsFeature === 'function') v = fp.allowsFeature(f);
      } catch {}
      track(`SensorPolicy_${f}_${v === true ? 'allowed' : v === false ? 'blocked' : 'unknown'}`);
    });

  if (window.mraid) {
    track('SensorMraidPresent');
    try { const v = window.mraid.getVersion?.(); if (v) track('SensorMraidVersion_' + String(v).replace(/\W+/g, '')); } catch {}
  } else {
    track('SensorMraidAbsent');
  }

  // -------------------- canvas + sizing --------------------
  const canvas = document.getElementById('ipt-game');
  const ctx = canvas.getContext('2d');
  const W = 360, H = 640;
  const ROAD_LEFT = 40, ROAD_RIGHT = 320, ROAD_W = ROAD_RIGHT - ROAD_LEFT;
  function fitCanvas() {
    const ar = W / H, winAr = innerWidth / innerHeight;
    let w, h;
    if (winAr > ar) { h = innerHeight; w = h * ar; } else { w = innerWidth; h = w / ar; }
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width  = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', fitCanvas);
  fitCanvas();

  // -------------------- state --------------------
  const state = {
    phase: 'idle', inputMode: 'pending', timeLeft: 25, score: 0, coins: 0,
    distance: 0, speed: 360,
    player: { x: W / 2, y: H - 110, w: 38, h: 64, tilt: 0 },
    playerVx: 0, playerTargetX: W / 2,
    obstacles: [], coinsArr: [], roadOffset: 0, spawnTimer: 0, coinTimer: 0,
    explosion: null, calib: null,
    gyroEvents: 0, motionEvents: 0,
    gyroFirstT: null, motionFirstT: null,
    userTilted: false, carMoved: false,
    tiltLeftMaxDeg: 0, tiltRightMaxDeg: 0,
    tiltLeftFired: false, tiltRightFired: false, tiltBothFired: false,
    accelHighSamples: 0, realAccelFired: false,
    tiltSteeredFired: false, gyroNeverBroken: true,
    score500GyroFired: false, score1000GyroFired: false
  };

  // -------------------- input: gyro --------------------
  const orientApi = typeof DeviceOrientationEvent !== 'undefined';
  const orientGesture = orientApi && typeof DeviceOrientationEvent.requestPermission === 'function';
  track(orientApi ? 'SensorOrientApiPresent' : 'SensorOrientApiAbsent');
  if (orientApi) track(orientGesture ? 'SensorOrientGestureRequired' : 'SensorOrientAutoBind');
  setD('ipt-d-orient-api', orientApi ? (orientGesture ? 'yes (iOS gesture)' : 'yes (auto)') : 'absent',
       orientApi ? 'ok' : 'bad');

  function onGyro(e) {
    state.gyroEvents++;
    if (state.gyroFirstT === null) {
      state.gyroFirstT = performance.now();
      const dt = state.gyroFirstT - startedAt;
      const bucket = dt < 100 ? 'lt100ms' : dt < 500 ? '100to500ms' : dt < 2000 ? '500to2000ms' : 'gt2000ms';
      track('SensorOrientFirstEvent_' + bucket);
    }
    if (state.gyroEvents === 10) track('SensorOrientConfirmed10');
    if (state.gyroEvents === 50) track('SensorOrientConfirmed50');

    if (state.gyroEvents === 1) {
      state.inputMode = 'gyro';
      updatePill();
    }
    if (state.phase === 'idle' && (state.gyroEvents % 4) === 0) {
      setD('ipt-d-orient-count', state.gyroEvents + ' (firing)', 'ok');
      const f = (n) => (typeof n === 'number') ? n.toFixed(0) : '—';
      setD('ipt-d-orient-vals', `${f(e.alpha)} / ${f(e.beta)} / ${f(e.gamma)}`);
    }
    if (state.calib === null && typeof e.gamma === 'number') state.calib = e.gamma;
    if (typeof e.gamma === 'number' && state.calib !== null) {
      const raw = e.gamma - state.calib;
      const norm = Math.max(-1, Math.min(1, raw / 25));
      state.playerVx = state.playerVx * 0.78 + (norm * 360) * 0.22;
      if (raw < state.tiltLeftMaxDeg)  state.tiltLeftMaxDeg  = raw;
      if (raw > state.tiltRightMaxDeg) state.tiltRightMaxDeg = raw;
      if (!state.tiltLeftFired  && state.tiltLeftMaxDeg  < -15) { state.tiltLeftFired  = true; track('SensorTiltLeftDetected'); }
      if (!state.tiltRightFired && state.tiltRightMaxDeg >  15) { state.tiltRightFired = true; track('SensorTiltRightDetected'); }
      if (!state.tiltBothFired && state.tiltLeftFired && state.tiltRightFired) {
        state.tiltBothFired = true;
        track('SensorTiltBothDirections');
      }
    }
  }

  function bindGyro() {
    addEventListener('deviceorientation', onGyro, true);
    setTimeout(() => {
      if (state.gyroEvents === 0 && !probeClosed) {
        track('SensorOrientSilentBlock');
        setD('ipt-d-orient-count', '0 (silently blocked)', 'bad');
        if (state.inputMode === 'pending') useTouchMode('blocked');
      }
    }, 2000);
  }

  // -------------------- input: motion --------------------
  const motionApi = typeof DeviceMotionEvent !== 'undefined';
  const motionGesture = motionApi && typeof DeviceMotionEvent.requestPermission === 'function';
  track(motionApi ? 'SensorMotionApiPresent' : 'SensorMotionApiAbsent');
  if (motionApi) track(motionGesture ? 'SensorMotionGestureRequired' : 'SensorMotionAutoBind');
  setD('ipt-d-motion-api', motionApi ? (motionGesture ? 'yes (iOS gesture)' : 'yes (auto)') : 'absent',
       motionApi ? 'ok' : 'bad');

  function onMotion(e) {
    state.motionEvents++;
    if (state.motionFirstT === null) {
      state.motionFirstT = performance.now();
      const dt = state.motionFirstT - startedAt;
      const bucket = dt < 100 ? 'lt100ms' : dt < 500 ? '100to500ms' : dt < 2000 ? '500to2000ms' : 'gt2000ms';
      track('SensorMotionFirstEvent_' + bucket);
    }
    if (state.motionEvents === 10) track('SensorMotionConfirmed10');
    if (state.motionEvents === 50) track('SensorMotionConfirmed50');
    if (state.phase === 'idle' && (state.motionEvents % 4) === 0) {
      setD('ipt-d-motion-count', state.motionEvents + ' (firing)', 'ok');
    }
    if (e.acceleration) {
      const m = Math.hypot(e.acceleration.x || 0, e.acceleration.y || 0, e.acceleration.z || 0);
      if (!state.userTilted && m > 1.5) { state.userTilted = true; track('SensorUserTilted'); }
      if (m > 2.0) state.accelHighSamples++;
      else         state.accelHighSamples = 0;
      if (!state.realAccelFired && state.accelHighSamples >= 3) {
        state.realAccelFired = true;
        track('SensorRealAcceleration');
      }
    }
  }

  function bindMotion() {
    addEventListener('devicemotion', onMotion, true);
    setTimeout(() => {
      if (state.motionEvents === 0 && !probeClosed) {
        track('SensorMotionSilentBlock');
        setD('ipt-d-motion-count', '0 (silently blocked)', 'bad');
      }
    }, 2000);
  }

  // -------------------- iOS gesture orchestration --------------------
  async function startSensorsViaGesture() {
    if (orientApi && orientGesture) {
      try {
        track('SensorOrientIOSPrompted');
        const r = await DeviceOrientationEvent.requestPermission();
        if (r === 'granted') { track('SensorOrientIOSGranted'); bindGyro(); }
        else                  { track('SensorOrientIOSDenied');  useTouchMode('denied'); }
      } catch (e) { track('SensorOrientIOSError'); useTouchMode('error'); }
    } else if (orientApi) {
      bindGyro();
    } else {
      useTouchMode('no-api');
    }
    if (motionApi && motionGesture) {
      try { const r = await DeviceMotionEvent.requestPermission(); if (r === 'granted') bindMotion(); } catch {}
    } else if (motionApi) {
      bindMotion();
    }
  }

  // -------------------- input: touch fallback --------------------
  function useTouchMode(reason) {
    if (state.inputMode === 'gyro') return;
    state.inputMode = 'touch';
    state.gyroNeverBroken = false;
    updatePill();
    track('SensorGameInputMode_touch' + (reason ? '_' + reason : ''));
  }
  function updatePill() {
    const pill = document.getElementById('ipt-input-pill');
    pill.style.display = '';
    pill.textContent = state.inputMode === 'gyro' ? 'Tilt to steer'
                     : state.inputMode === 'touch' ? 'Drag to steer' : '— input —';
    if (state.inputMode === 'gyro' && !fired.has('SensorGameInputMode_gyro')) track('SensorGameInputMode_gyro');
  }
  function onTouch(e) {
    if (!e.touches || !e.touches[0]) return;
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    state.playerTargetX = (t.clientX - r.left) * (W / r.width);
    e.preventDefault();
  }
  canvas.addEventListener('touchstart', onTouch, { passive: false });
  canvas.addEventListener('touchmove',  onTouch, { passive: false });

  // -------------------- spawn --------------------
  function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const x = ROAD_LEFT + ROAD_W * (0.16 + lane * 0.34);
    const colors = ['#e3445a','#ff7a30','#a47bff','#3ec48f'];
    state.obstacles.push({ x, y: -90, w: 38, h: 62, color: colors[Math.floor(Math.random() * colors.length)] });
  }
  function spawnCoin() {
    const x = ROAD_LEFT + 20 + Math.random() * (ROAD_W - 40);
    state.coinsArr.push({ x, y: -20, r: 9, t: 0 });
  }

  // -------------------- update --------------------
  function update(dt) {
    if (state.phase !== 'playing') return;
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) { state.timeLeft = 0; endGame(true); return; }
    document.getElementById('ipt-time').textContent = Math.ceil(state.timeLeft);
    const elapsed = 25 - state.timeLeft;
    state.speed = 360 + elapsed * 12;
    state.roadOffset = (state.roadOffset + state.speed * dt) % 60;
    state.distance += state.speed * dt;
    const p = state.player;
    if (state.inputMode === 'gyro') {
      p.x += state.playerVx * dt;
      p.tilt = state.playerVx / 360 * 0.35;
    } else if (state.inputMode === 'touch') {
      p.x += (state.playerTargetX - p.x) * 0.18;
      p.tilt = (state.playerTargetX - p.x) / 60;
    }
    if (!state.carMoved && Math.abs(p.x - W / 2) > 30) {
      state.carMoved = true;
      track('SensorGameCarMoved');
      if (state.inputMode === 'gyro' && !state.tiltSteeredFired) {
        state.tiltSteeredFired = true;
        track('SensorTiltSteeredCar');
      }
    }
    const minX = ROAD_LEFT + p.w / 2 + 4, maxX = ROAD_RIGHT - p.w / 2 - 4;
    if (p.x < minX) { p.x = minX; state.playerVx = Math.max(0, state.playerVx); }
    if (p.x > maxX) { p.x = maxX; state.playerVx = Math.min(0, state.playerVx); }
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) { spawnObstacle(); state.spawnTimer = Math.max(0.45, 1.1 - elapsed * 0.025); }
    state.coinTimer -= dt;
    if (state.coinTimer <= 0) { spawnCoin(); state.coinTimer = 0.6 + Math.random() * 0.6; }
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const o = state.obstacles[i];
      o.y += state.speed * dt;
      if (o.y > H + 80) { state.obstacles.splice(i, 1); continue; }
      if (Math.abs(o.x - p.x) < (o.w + p.w) * 0.42 && Math.abs(o.y - p.y) < (o.h + p.h) * 0.42) {
        crash(o);
        return;
      }
    }
    for (let i = state.coinsArr.length - 1; i >= 0; i--) {
      const c = state.coinsArr[i];
      c.y += state.speed * dt;
      c.t += dt;
      if (c.y > H + 30) { state.coinsArr.splice(i, 1); continue; }
      const dx = c.x - p.x, dy = c.y - p.y;
      if (dx * dx + dy * dy < (c.r + p.w * 0.45) ** 2) {
        state.coins++;
        state.score += 50;
        beep(880, 0.06, 0.18);
        track('SensorGameCoinCollected');
        if (state.inputMode === 'gyro' && !fired.has('SensorTiltCoinCollected')) {
          track('SensorTiltCoinCollected');
        }
        state.coinsArr.splice(i, 1);
      }
    }
    state.score = Math.floor(state.distance * 0.05) + state.coins * 50;
    document.getElementById('ipt-score').textContent = state.score;
    if (state.inputMode === 'gyro') {
      if (!state.score500GyroFired  && state.score >= 500)  { state.score500GyroFired  = true; track('SensorTiltScoreOver500'); }
      if (!state.score1000GyroFired && state.score >= 1000) { state.score1000GyroFired = true; track('SensorTiltScoreOver1000'); }
    }
  }

  function crash(o) {
    state.explosion = { x: o.x, y: o.y, t: 0 };
    beep(120, 0.4, 0.4, 'sawtooth');
    if (navigator.vibrate) navigator.vibrate([60, 30, 90]);
    track('SensorGameCrashed');
    setTimeout(() => endGame(false), 700);
  }

  // -------------------- render --------------------
  function render() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1b2240'); g.addColorStop(1, '#080b16');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0e1428';
    ctx.fillRect(0, 0, ROAD_LEFT, H); ctx.fillRect(ROAD_RIGHT, 0, W - ROAD_RIGHT, H);
    ctx.fillStyle = '#181f38'; ctx.fillRect(ROAD_LEFT, 0, ROAD_W, H);
    ctx.fillStyle = '#5dd9ff';
    ctx.fillRect(ROAD_LEFT - 2, 0, 2, H); ctx.fillRect(ROAD_RIGHT, 0, 2, H);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    const laneXs = [ROAD_LEFT + ROAD_W * 0.33, ROAD_LEFT + ROAD_W * 0.66];
    for (const lx of laneXs) {
      for (let y = -60 + state.roadOffset; y < H; y += 60) ctx.fillRect(lx - 1.5, y, 3, 28);
    }
    for (const c of state.coinsArr) {
      const wob = 1 + Math.sin(c.t * 8) * 0.15;
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(wob, 1);
      ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff7c2'; ctx.beginPath(); ctx.arc(-2, -2, c.r * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (const o of state.obstacles) drawCar(o.x, o.y, o.w, o.h, o.color, 0, true);
    if (state.phase !== 'over' || !state.explosion) {
      drawCar(state.player.x, state.player.y, state.player.w, state.player.h, '#5dd9ff', state.player.tilt, false);
    }
    if (state.explosion) {
      const e = state.explosion; e.t += 1 / 60;
      const rad = e.t * 220;
      ctx.fillStyle = `rgba(255,160,40,${Math.max(0, 1 - e.t * 1.4)})`;
      ctx.beginPath(); ctx.arc(e.x, e.y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, 1 - e.t * 2)})`;
      ctx.beginPath(); ctx.arc(e.x, e.y, rad * 0.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  function drawCar(x, y, w, h, color, tilt, oncoming) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; roundRect(-w/2 + 2, -h/2 + 4, w, h, 8); ctx.fill();
    ctx.fillStyle = color; roundRect(-w/2, -h/2, w, h, 8); ctx.fill();
    ctx.fillStyle = 'rgba(10,14,26,.85)';
    roundRect(-w/2 + 5, -h/2 + (oncoming ? h*0.55 : 8), w - 10, h * 0.3, 4); ctx.fill();
    ctx.fillStyle = oncoming ? '#fff7c2' : '#0a0e1a';
    roundRect(-w/2 + 4, oncoming ? -h/2 + 4 : h/2 - 8, 8, 4, 2); ctx.fill();
    roundRect( w/2 - 12, oncoming ? -h/2 + 4 : h/2 - 8, 8, 4, 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    roundRect(-2, -h/2 + 8, 4, h - 16, 2); ctx.fill();
    ctx.restore();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // -------------------- main loop --------------------
  let lastT = 0;
  function tick(t) {
    const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0);
    lastT = t;
    update(dt);
    render();
    requestAnimationFrame(tick);
  }

  // -------------------- audio --------------------
  let actx = null;
  function beep(freq, dur, vol = 0.2, type = 'square') {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + dur);
    } catch {}
  }

  // -------------------- flow --------------------
  function startGame() {
    state.phase = 'playing';
    state.timeLeft = 25; state.score = 0; state.coins = 0; state.distance = 0;
    state.player.x = W / 2; state.playerTargetX = W / 2; state.playerVx = 0;
    state.obstacles.length = 0; state.coinsArr.length = 0;
    state.explosion = null; state.spawnTimer = 1; state.coinTimer = 0.4;
    state.carMoved = false;
    document.getElementById('ipt-hud').style.display = '';
    document.getElementById('ipt-ov-start').style.display = 'none';
    document.getElementById('ipt-ov-end').style.display = 'none';
    document.getElementById('ipt-cta-pill').style.display = '';
    track('SensorGameStarted');
  }

  function endGame(success) {
    state.phase = 'over';
    document.getElementById('ipt-end-title').textContent = success ? 'NICE RUN!' : 'CRASHED';
    document.getElementById('ipt-end-score').textContent = state.score;
    document.getElementById('ipt-end-coins').textContent = state.coins;
    document.getElementById('ipt-ov-end').style.display = '';
    document.getElementById('ipt-hud').style.display = 'none';
    document.getElementById('ipt-cta-pill').style.display = 'none';
    track(success ? 'SensorGameSurvived' : 'SensorGameCrashedEnd');
    track('SensorGameScore_' + (state.score < 100 ? 'lt100' : state.score < 500 ? '100to500' : state.score < 1000 ? '500to1000' : 'gt1000'));
    if (success && state.gyroNeverBroken && state.inputMode === 'gyro' && state.tiltLeftFired && state.tiltRightFired) {
      track('SensorTiltGameCompleted');
    }
    if (state.gyroNeverBroken && state.inputMode === 'gyro') {
      track('SensorTiltOnlyMode');
    }
  }

  function clickThrough() {
    track('SensorCtaClicked');
    const url = window.landingPageUrl || 'https://www.iion.io/';
    try {
      if (window.mraid && typeof window.mraid.open === 'function') { window.mraid.open(url); return; }
    } catch {}
    try { window.open(url, '_blank'); } catch {}
  }

  document.getElementById('ipt-btn-start').addEventListener('click', async () => {
    track('SensorUserTapped');
    await startSensorsViaGesture();
    if (state.inputMode === 'pending') updatePill();
    startGame();
  });
  document.getElementById('ipt-btn-cta').addEventListener('click', clickThrough);
  document.getElementById('ipt-cta-pill').addEventListener('click', (e) => { e.stopPropagation(); clickThrough(); });
  document.getElementById('ipt-btn-replay').addEventListener('click', () => {
    state.calib = null;
    startGame();
  });

  if (orientApi && !orientGesture) bindGyro();
  if (motionApi && !motionGesture) bindMotion();

  // -------------------- close lifecycle --------------------
  function onClose() {
    if (probeClosed) return;
    probeClosed = true;
    const dur = performance.now() - startedAt;
    const bucket = dur < 2000 ? 'lt2s' : dur < 5000 ? '2to5s' : dur < 10000 ? '5to10s' : 'gt10s';
    track('SensorProbeClosed_' + bucket);
    if (state.gyroEvents === 0 && orientApi) track('SensorOrientNoEventsAtClose');
    if (state.motionEvents === 0 && motionApi) track('SensorMotionNoEventsAtClose');
    if (state.phase === 'idle') track('SensorClosedBeforeStart');
    if (state.phase === 'playing') track('SensorClosedDuringPlay');
  }
  addEventListener('pagehide', onClose);
  addEventListener('beforeunload', onClose);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onClose();
  });
  try {
    window.mraid?.addEventListener?.('viewableChange', (v) => { if (v === false) onClose(); });
  } catch {}

  requestAnimationFrame(tick);
})();
