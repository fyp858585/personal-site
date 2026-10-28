/* ============================================================
 * 音效：全部用 WebAudio 现场合成，不依赖任何音频文件
 * 目标不是"好听"，是"每个动作都有即时反馈且不吵"
 * ============================================================ */
window.SFX = (function () {
  'use strict';

  let ctx = null, master = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, opt) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const o = opt || {};
    const t0 = ac.currentTime + (o.delay || 0);
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const vol = (o.vol == null ? 0.5 : o.vol);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function noise(dur, opt) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const o = opt || {};
    const t0 = ac.currentTime + (o.delay || 0);
    const n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const flt = ac.createBiquadFilter();
    flt.type = o.filter || 'lowpass';
    flt.frequency.setValueAtTime(o.from || 2000, t0);
    if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const g = ac.createGain();
    const vol = (o.vol == null ? 0.4 : o.vol);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(flt); flt.connect(g); g.connect(master);
    src.start(t0);
  }

  const api = {
    unlock() { ensure(); },
    setMuted(v) { muted = !!v; },
    isMuted() { return muted; },

    pick() { tone(680, 0.05, { type: 'triangle', vol: 0.3, to: 820 }); },
    swap() { tone(360, 0.07, { type: 'sine', vol: 0.4, to: 560 }); },
    invalid() {
      tone(190, 0.09, { type: 'square', vol: 0.22 });
      tone(150, 0.1, { type: 'square', vol: 0.18, delay: 0.07 });
    },
    pop(chain) {
      const f = 480 * Math.pow(2, Math.min(chain - 1, 6) * 2 / 12);
      tone(f, 0.11, { type: 'sine', vol: 0.55, to: f * 1.6 });
      noise(0.05, { from: 3200, vol: 0.1 });
    },
    spawn() {
      [720, 960, 1280].forEach((f, i) => tone(f, 0.1, { type: 'triangle', vol: 0.28, delay: i * 0.045 }));
    },
    rocket() {
      noise(0.24, { from: 2600, to: 300, vol: 0.34 });
      tone(240, 0.2, { type: 'sawtooth', vol: 0.12, to: 90 });
    },
    bomb() {
      noise(0.32, { from: 900, to: 80, vol: 0.5 });
      tone(90, 0.3, { type: 'sine', vol: 0.5, to: 40 });
    },
    rainbow() {
      [523, 659, 784, 988, 1319].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.26, delay: i * 0.05 }));
    },
    combo(chain) {
      const base = 440 * Math.pow(2, Math.min(chain - 2, 4) / 12);
      [0, 4, 7].forEach((st, i) => tone(base * Math.pow(2, st / 12), 0.14, { type: 'triangle', vol: 0.3, delay: i * 0.055 }));
    },
    shake() { noise(0.18, { from: 500, to: 120, vol: 0.22 }); },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.32, delay: i * 0.11 }));
    },
    lose() {
      [392, 330, 262].forEach((f, i) => tone(f, 0.34, { type: 'sine', vol: 0.3, delay: i * 0.14 }));
    },
    star(i) { tone(1046 + i * 220, 0.16, { type: 'sine', vol: 0.3 }); },
  };
  return api;
})();
