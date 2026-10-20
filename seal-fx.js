/* =========================================================
   MÜHÜRLEME SAHNESİ — Hiraishin no Jutsu + Fūinjutsu
   GSAP zaman çizelgesi + canvas chakra parçacıkları
   Mühür geometrisi burada üretilir (katmanlı halkalar, kanji
   halkası, radyal çentikler, formül kolları, Uzumaki spirali,
   mürekkep damarları).
   ========================================================= */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const R = (d) => (d * Math.PI) / 180;

  const KANJI_RING = "封印術式螺旋呪縛結界鎮護禁咒霊聖".split("");
  const ARM_KANJI = ["火", "影", "封", "印"];

  function n(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---------------------------------------------------------
     MÜHÜR GEOMETRİSİ
  --------------------------------------------------------- */
  function buildSeal(svg) {
    svg.innerHTML = "";
    const C = 200;
    const g = (cls) => {
      const el = n("g", { class: cls });
      svg.appendChild(el);
      return el;
    };

    // dış halkalar
    const rings = g("sl-rings");
    rings.appendChild(n("circle", { class: "sl-ring dashed", cx: C, cy: C, r: 190 }));
    rings.appendChild(n("circle", { class: "sl-ring", cx: C, cy: C, r: 180 }));
    rings.appendChild(n("circle", { class: "sl-ring thin", cx: C, cy: C, r: 132 }));
    rings.appendChild(n("circle", { class: "sl-ring thin", cx: C, cy: C, r: 96 }));

    // radyal çentikler
    const ticks = g("sl-ticks");
    for (let i = 0; i < 48; i++) {
      const a = R((i * 360) / 48);
      const uzun = i % 4 === 0;
      const r1 = uzun ? 160 : 166;
      ticks.appendChild(
        n("line", {
          class: "sl-tick" + (uzun ? " long" : ""),
          x1: C + r1 * Math.cos(a), y1: C + r1 * Math.sin(a),
          x2: C + 174 * Math.cos(a), y2: C + 174 * Math.sin(a)
        })
      );
    }

    // kanji halkası — her karakter merkeze bakacak şekilde döner
    const kanji = g("sl-kanji");
    KANJI_RING.forEach((ch, i) => {
      const a = (i * 360) / KANJI_RING.length;
      const t = n("text", { class: "sl-k", x: C, y: C - 146, "text-anchor": "middle",
                            transform: `rotate(${a} ${C} ${C})` }, ch);
      kanji.appendChild(t);
    });

    // dört formül kolu (iç halka ile kanji halkası arasında)
    const arms = g("sl-arms");
    ARM_KANJI.forEach((ch, i) => {
      const a = i * 90 + 45;
      const arm = n("g", { class: "sl-arm", transform: `rotate(${a} ${C} ${C})` });
      arm.appendChild(n("rect", { class: "sl-arm-box", x: C - 13, y: C - 128, width: 26, height: 30, rx: 3 }));
      arm.appendChild(n("text", { class: "sl-arm-k", x: C, y: C - 105, "text-anchor": "middle" }, ch));
      arm.appendChild(n("line", { class: "sl-arm-line", x1: C, y1: C - 98, x2: C, y2: C - 74 }));
      arms.appendChild(arm);
    });

    // merkez Uzumaki spirali
    const spiral = g("sl-spiral");
    let d = "M 200 200";
    for (let th = 0; th <= 7 * Math.PI; th += 0.1) {
      const r = 4 + 3.9 * th;
      d += ` L ${(C + r * Math.cos(th)).toFixed(1)} ${(C + r * Math.sin(th)).toFixed(1)}`;
    }
    const sp = n("path", { class: "sl-spiral-path", d });
    spiral.appendChild(sp);

    /* Kontrat Mührü (Gogyō Kaiin) mürekkebi: temas noktasından dışa yayılan,
       kopuk yaylardan oluşan dişli/sivri uçlu formül yazısı. Referans:
       assets/refs/contract-seal-ink.webp */
    const ink = g("sl-ink");
    const rnd = (a, b) => a + Math.random() * (b - a);

    function jaggedArc(r0, a0, a1, siklik) {
      const adim = (a1 - a0) / siklik;
      let d = "";
      for (let i = 0; i <= siklik; i++) {
        const a = a0 + adim * i;
        // dişli sapma: düzenli salınım + ara sıra sivri diken
        let r = r0 * (1 + Math.sin(a * 9) * 0.035 + Math.sin(a * 17 + 1.1) * 0.022);
        if (i % 3 === 0) r *= rnd(0.93, 1.1);
        const x = (C + r * Math.cos(a)).toFixed(1);
        const y = (C + r * Math.sin(a)).toFixed(1);
        d += (i ? " L " : "M ") + x + " " + y;
      }
      return d;
    }

    // üç dalga halinde, her dalga kopuk yaylardan oluşuyor
    [
      { r: 58,  parca: 5, kalin: 3.4 },
      { r: 104, parca: 7, kalin: 3.0 },
      { r: 156, parca: 9, kalin: 2.4 }
    ].forEach((dalga, di) => {
      const kat = n("g", { class: "sl-ink-wave", "data-wave": di });
      let a = rnd(0, Math.PI);
      for (let p = 0; p < dalga.parca; p++) {
        const uzunluk = rnd(0.45, 0.95);
        const bosluk = rnd(0.12, 0.3);
        const yol = n("path", {
          class: "sl-ink-line",
          d: jaggedArc(dalga.r * rnd(0.94, 1.06), a, a + uzunluk, 16),
          "stroke-width": dalga.kalin
        });
        kat.appendChild(yol);
        // yaydan dışa fırlayan çatal
        if (p % 2 === 0) {
          const ac = a + uzunluk * 0.5;
          const r1 = dalga.r, r2 = dalga.r * rnd(1.12, 1.3);
          kat.appendChild(n("path", {
            class: "sl-ink-line thin",
            d: `M ${(C + r1 * Math.cos(ac)).toFixed(1)} ${(C + r1 * Math.sin(ac)).toFixed(1)}
                L ${(C + r1 * 1.08 * Math.cos(ac + 0.05)).toFixed(1)} ${(C + r1 * 1.08 * Math.sin(ac + 0.05)).toFixed(1)}
                L ${(C + r2 * Math.cos(ac - 0.04)).toFixed(1)} ${(C + r2 * Math.sin(ac - 0.04)).toFixed(1)}`,
            "stroke-width": dalga.kalin * 0.6
          }));
        }
        a += uzunluk + bosluk;
      }
      ink.appendChild(kat);
    });

    // çizilme efekti için her yolun uzunluğunu dasharray'e yaz
    svg.querySelectorAll(".sl-spiral-path, .sl-ink-line").forEach((p) => {
      const L = p.getTotalLength();
      p.style.strokeDasharray = L;
      p.style.strokeDashoffset = L;
    });
    return svg;
  }

  /* ---------------------------------------------------------
     CHAKRA PARÇACIKLARI (canvas)
  --------------------------------------------------------- */
  class Particles {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext("2d");
      this.parts = [];
      this.raf = null;
    }
    resize() {
      const r = this.cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.cv.width = r.width * dpr;
      this.cv.height = r.height * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.w = r.width;
      this.h = r.height;
    }
    burst(px, py, adet, o = {}) {
      const x = px * this.w, y = py * this.h;
      for (let i = 0; i < adet; i++) {
        const a = Math.random() * Math.PI * 2;
        const hiz = (o.hiz || 130) * (0.35 + Math.random() * 0.9);
        this.parts.push({
          x, y,
          vx: Math.cos(a) * hiz, vy: Math.sin(a) * hiz - (o.yukari || 0),
          om: 0, omur: (o.omur || 0.9) * (0.6 + Math.random() * 0.8),
          r: (o.r || 2.6) * (0.5 + Math.random()),
          renk: o.renk || "255,205,90",
          cekim: o.cekim || 60
        });
      }
      this.start();
    }
    /* merkeze doğru toplanan chakra */
    implode(adet, o = {}) {
      for (let i = 0; i < adet; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = (0.35 + Math.random() * 0.5) * this.w;
        this.parts.push({
          x: this.w / 2 + Math.cos(a) * d, y: this.h / 2 + Math.sin(a) * d,
          vx: -Math.cos(a) * 150, vy: -Math.sin(a) * 150,
          om: 0, omur: 1.4, r: 2 * (0.5 + Math.random()),
          renk: o.renk || "255,225,150", cekim: 0, ice: true
        });
      }
      this.start();
    }
    start() {
      if (this.raf) return;
      let son = performance.now();
      const dongu = (t) => {
        const dt = Math.min((t - son) / 1000, 0.05);
        son = t;
        const c = this.ctx;
        c.clearRect(0, 0, this.w, this.h);
        for (let i = this.parts.length - 1; i >= 0; i--) {
          const p = this.parts[i];
          p.om += dt;
          if (p.om > p.omur) { this.parts.splice(i, 1); continue; }
          if (p.ice) {
            const dx = this.w / 2 - p.x, dy = this.h / 2 - p.y;
            const m = Math.hypot(dx, dy) || 1;
            p.vx += (dx / m) * 900 * dt;
            p.vy += (dy / m) * 900 * dt;
          } else {
            p.vy += p.cekim * dt;
            p.vx *= 0.985; p.vy *= 0.985;
          }
          p.x += p.vx * dt; p.y += p.vy * dt;
          const o = 1 - p.om / p.omur;
          c.beginPath();
          c.fillStyle = `rgba(${p.renk},${o})`;
          c.shadowBlur = 12; c.shadowColor = `rgba(${p.renk},${o * 0.8})`;
          c.arc(p.x, p.y, p.r * (0.4 + o * 0.6), 0, Math.PI * 2);
          c.fill();
        }
        c.shadowBlur = 0;
        if (this.parts.length) this.raf = requestAnimationFrame(dongu);
        else { this.raf = null; c.clearRect(0, 0, this.w, this.h); }
      };
      this.raf = requestAnimationFrame(dongu);
    }
    temizle() {
      this.parts.length = 0;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
      this.ctx.clearRect(0, 0, this.w || 0, this.h || 0);
    }
  }

  /* ---------------------------------------------------------
     ZAMAN ÇİZELGESİ
  --------------------------------------------------------- */
  let P = null, hazir = false;
  let aktifEmniyet = null, aktifTl = null;   // aynı anda tek sahne
  const $ = (id) => document.getElementById(id);

  function hazirla() {
    if (hazir) return;
    buildSeal($("sf-seal"));
    P = new Particles($("sf-particles"));
    hazir = true;
  }

  window.playSealFx = function (isim, muhur, bitince) {
    hazirla();
    // önceki sahne hâlâ yaşıyorsa temizle (zamanlayıcısı yenisini kapatmasın)
    if (aktifEmniyet) { clearTimeout(aktifEmniyet); aktifEmniyet = null; }
    if (aktifTl) { aktifTl.kill(); aktifTl = null; }
    const fx = $("seal-fx");
    $("sf-name").textContent = isim;
    $("sf-who").textContent =
      muhur.by === "ortak" ? "ORTAK MÜHÜR" : (muhur.by + " mühürledi").toLocaleUpperCase("tr");
    fx.hidden = false;
    P.resize();
    P.temizle();

    const seal = $("sf-seal");
    const tl = gsap.timeline({
      onComplete: () => kapat(),
      defaults: { ease: "power2.out" }
    });
    window.__sealTl = tl;            // test/inceleme için

    let kapandi = false;
    const kapat = () => {
      if (kapandi) return;
      kapandi = true;
      tl.kill();
      if (aktifEmniyet) { clearTimeout(aktifEmniyet); aktifEmniyet = null; }
      if (aktifTl === tl) aktifTl = null;
      P.temizle();
      fx.removeEventListener("click", atla);
      fx.hidden = true;
      bitince();
    };
    const atla = () => kapat();
    fx.addEventListener("click", atla);

    /* --- başlangıç durumları --- */
    gsap.set(".sf-veil", { opacity: 0 });
    gsap.set("#sf-name", { opacity: 0, scale: 1.3, color: "#ffffff", filter: "blur(0px)" });
    gsap.set("#sf-kunai", { opacity: 0, x: "60vw", y: "-46vh", rotation: 0, scale: 0.8 });
    gsap.set("#sf-minato", { opacity: 0, yPercent: -50, scaleX: 1.9, scaleY: 0.04, filter: "blur(8px)" });
    gsap.set("#m-glow", { opacity: 0 });
    gsap.set("#sf-flash", { opacity: 0, scale: 0.2 });
    gsap.set("#sf-streak", { opacity: 0, scaleY: 0 });
    gsap.set("#sf-beam", { opacity: 0, scaleX: 0 });
    gsap.set(seal, { opacity: 0, scale: 1.75, rotation: -22 });
    gsap.set(".sl-kanji .sl-k", { opacity: 0, scale: 0.2, transformOrigin: "200px 200px" });
    gsap.set(".sl-ticks line", { opacity: 0 });
    gsap.set(".sl-arm", { opacity: 0, scale: 0.5, transformOrigin: "200px 200px" });
    gsap.set(".sl-spiral-path, .sl-vein", { strokeDashoffset: (i, t) => t.getTotalLength() });
    gsap.set("#sf-stamp", { opacity: 0 });
    gsap.set("#sf-fuda", { opacity: 0, scale: 1.5, rotation: -46, y: -230 });
    gsap.set(".sl-ink", { opacity: 1 });
    document.querySelector(".sl-ink").classList.remove("aktif");
    gsap.set(".sl-ink-wave", { scale: 0.28, transformOrigin: "200px 200px" });
    gsap.set(".st-text", { opacity: 0, scale: 2.6, rotation: -9 });
    gsap.set(".st-sub", { opacity: 0 });
    gsap.set(".sf-skip", { opacity: 0 });

    /* --- 1. perde ve isim --- */
    tl.to(".sf-veil", { opacity: 1, duration: 0.35 }, 0)
      .to("#sf-name", { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)" }, 0.1)
      .to(".sf-skip", { opacity: 1, duration: 0.6 }, 1.2);

    /* --- 2. kunai fırlar ve saplanır --- */
    tl.to("#sf-kunai", { opacity: 1, duration: 0.08 }, 0.22)
      .to("#sf-kunai", {
        x: 0, y: 0, scale: 1, rotation: 1260,
        duration: 0.62, ease: "power3.in"
      }, 0.22)
      .to("#sf-kunai", { y: 8, rotation: 1252, duration: 0.07, ease: "power2.out" }, 0.84)
      .to("#sf-kunai", { y: 0, rotation: 1266, duration: 0.16, ease: "elastic.out(1,0.4)" }, 0.91);

    /* --- 3. ışınlanma parlaması --- */
    tl.to("#sf-flash", { opacity: 1, scale: 10, duration: 0.16, ease: "power4.out" }, 0.86)
      .to("#sf-flash", { opacity: 0, scale: 20, duration: 0.7, ease: "power2.out" }, 1.02)
      .to(".sf-stage", { keyframes: [
          { x: -16, y: 8, rotation: -0.7, duration: 0.07 },
          { x: 13, y: -9, rotation: 0.6, duration: 0.07 },
          { x: -8, y: 4, duration: 0.06 },
          { x: 0, y: 0, rotation: 0, duration: 0.08 }
        ] }, 0.87)
      .add(() => P.burst(0.14, 0.5, 70, { hiz: 320, omur: 1.1, r: 3 }), 0.87);

    /* --- 4. Minato belirir --- */
    tl.to("#sf-minato", { opacity: 1, duration: 0.06 }, 0.90)
      .to("#sf-minato", { scaleY: 1.12, scaleX: 0.94, duration: 0.2, ease: "power4.out" }, 0.90)
      .to("#sf-minato", { scaleY: 1, scaleX: 1, filter: "blur(0px)", duration: 0.34, ease: "elastic.out(1,0.55)" }, 1.08)
      .fromTo("#m-glow", { opacity: 0.95 }, { opacity: 0, duration: 0.55, ease: "power2.out" }, 0.92)
      .to("#sf-minato", { y: -7, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: 2 }, 1.45);

    /* --- 5. chakra zinciri: elden isme --- */
    tl.to("#sf-beam", { opacity: 1, scaleX: 1, duration: 0.24, ease: "power4.out" }, 1.62)
      .to("#sf-beam", { opacity: 0, duration: 0.35 }, 1.98)
      .to("#sf-name", { color: "#ffd98a", textShadow: "0 0 44px rgba(255,190,60,.95)", duration: 0.3 }, 1.84)
      .add(() => P.implode(48), 1.7);

    /* --- 6. mühür açılır: halkalar, kanjiler, çentikler, kollar --- */
    tl.to(seal, { opacity: 1, scale: 1, rotation: 0, duration: 0.65, ease: "power3.out" }, 2.0)
      .to(".sl-kanji .sl-k", { opacity: 1, scale: 1, duration: 0.3, stagger: 0.045, ease: "back.out(2)" }, 2.25)
      .to(".sl-ticks line", { opacity: 1, duration: 0.2, stagger: 0.012 }, 2.7)
      .to(".sl-arm", { opacity: 1, scale: 1, duration: 0.4, stagger: 0.09, ease: "back.out(1.8)" }, 3.0)
      .to(seal, { rotation: 18, duration: 3.4, ease: "none" }, 2.65);

    /* --- 7. mühür yazısı çizilir --- */
    tl.to(".sl-spiral-path", { strokeDashoffset: 0, duration: 1.15, ease: "power1.inOut" }, 3.3);

    /* --- 7b. KONTRAT MÜHRÜ: mürekkep temas noktasından dışa yayılır --- */
    tl.to('.sl-ink-wave[data-wave="0"]', { scale: 1, duration: 0.5, ease: "power3.out" }, 3.75)
      .to('.sl-ink-wave[data-wave="1"]', { scale: 1, duration: 0.55, ease: "power3.out" }, 3.95)
      .to('.sl-ink-wave[data-wave="2"]', { scale: 1, duration: 0.6, ease: "power3.out" }, 4.15)
      .to('.sl-ink-wave[data-wave="0"] .sl-ink-line', { strokeDashoffset: 0, duration: 0.45, stagger: 0.03, ease: "power2.out" }, 3.75)
      .to('.sl-ink-wave[data-wave="1"] .sl-ink-line', { strokeDashoffset: 0, duration: 0.5, stagger: 0.025, ease: "power2.out" }, 3.95)
      .to('.sl-ink-wave[data-wave="2"] .sl-ink-line', { strokeDashoffset: 0, duration: 0.55, stagger: 0.02, ease: "power2.out" }, 4.15)
      .add(() => P.burst(0.5, 0.5, 34, { hiz: 150, omur: 0.8, renk: "30,30,40", cekim: 0 }), 3.78);

    /* --- 7c. mürekkep mavi chakra ile aktive olur --- */
    tl.fromTo(".sl-ink",
        { filter: "drop-shadow(0 0 4px rgba(255,185,85,0.95)) drop-shadow(0 0 12px rgba(255,140,40,0.5))" },
        { filter: "drop-shadow(0 0 6px rgba(96,176,255,1)) drop-shadow(0 0 18px rgba(40,110,255,0.8))",
          duration: 0.42, ease: "power2.out" }, 4.62)
      .fromTo(".sl-ink", { opacity: 0.5 }, { opacity: 1, duration: 0.12, repeat: 3, yoyo: true }, 4.62)
      .add(() => P.burst(0.5, 0.5, 46, { hiz: 210, omur: 1.0, renk: "80,165,255", cekim: 0 }), 4.64);

    /* --- 8. isim mürekkebe gömülür --- */
    tl.to("#sf-name", { color: "#6d0f14", textShadow: "0 0 0 rgba(0,0,0,0)", duration: 0.5 }, 4.35)
      .to("#sf-name", { opacity: 0.18, scale: 0.72, filter: "blur(3px)", duration: 0.6 }, 4.7);

    /* --- 9. mühür kilitlenir --- */
    tl.to(seal, { scale: 0.86, duration: 0.35, ease: "power3.in" }, 4.85)
      .to(seal, { scale: 0.94, duration: 0.2, ease: "back.out(3)" }, 5.2);

    /* --- 10. damga --- */
    tl.to("#sf-stamp", { opacity: 1, duration: 0.01 }, 5.15)
      .to("#sf-fuda", { opacity: 1, y: 0, rotation: -14, scale: 1, duration: 0.34, ease: "power4.in" }, 5.18)
      .to("#sf-fuda", { rotation: -17, duration: 0.1, ease: "power2.out" }, 5.52)
      .to("#sf-fuda", { rotation: -15.5, duration: 0.5, ease: "elastic.out(1,0.35)" }, 5.62)
      .add(() => {
        P.burst(0.5, 0.5, 90, { hiz: 340, omur: 1.0, r: 3.2, renk: "235,60,50", cekim: 90 });
        P.burst(0.5, 0.5, 40, { hiz: 200, omur: 1.2, renk: "255,205,90", cekim: 60 });
      }, 5.2)
      .to(".sf-stage", { keyframes: [
          { scale: 1.035, duration: 0.09 }, { scale: 1, duration: 0.2 }
        ] }, 5.18)
      .to(".st-text", { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, 5.36)
      .to(".st-sub", { opacity: 1, duration: 0.3 }, 5.6);

    /* --- 11. Minato gider --- */
    tl.to("#sf-flash", { opacity: 1, scale: 11, duration: 0.14, ease: "power4.out" }, 6.05)
      .fromTo("#m-glow", { opacity: 0 }, { opacity: 0.95, duration: 0.1 }, 6.02)
      .to("#sf-minato", { scaleY: 1.25, scaleX: 0.7, duration: 0.12, ease: "power3.in" }, 6.04)
      .to("#sf-minato", { opacity: 0, scaleY: 0.03, scaleX: 2.1, filter: "blur(9px)", duration: 0.16 }, 6.16)
      .to("#sf-kunai", { opacity: 0, x: -140, y: -260, rotation: 1620, scale: 0.6, duration: 0.3 }, 6.1)
      .to("#sf-streak", { opacity: 1, scaleY: 1, duration: 0.22, ease: "power3.out" }, 6.12)
      .to("#sf-streak", { opacity: 0, y: -260, duration: 0.35 }, 6.3)
      .to("#sf-flash", { opacity: 0, scale: 22, duration: 0.5 }, 6.2)
      .add(() => P.burst(0.14, 0.5, 50, { hiz: 260, omur: 0.9, yukari: 120 }), 6.08);

    /* --- 12. kapanış --- */
    tl.to([seal, "#sf-stamp", "#sf-name", ".sf-skip"], {
        opacity: 0, scale: 0.7, duration: 0.45, ease: "power2.in"
      }, 6.7)
      .to(".sf-veil", { opacity: 0, duration: 0.4 }, 6.95);

    tl.timeScale(window.SEAL_FX_SPEED || 1);
    tl.play(0);

    /* Güvenlik ağı: sekme arka plana alınırsa requestAnimationFrame durur ve
       zaman çizelgesi ilerlemez. Sahne asılı kalmasın diye gerçek zamanlı
       bir üst sınır koyuyoruz. */
    const ust = (tl.duration() * 1000 + 2200) / (tl.timeScale() || 1);
    aktifTl = tl;
    // window.SEAL_FX_HOLD: kare kare inceleme için emniyet zamanlayıcısını askıya alır
    if (!window.SEAL_FX_HOLD) aktifEmniyet = setTimeout(kapat, ust);
    tl.eventCallback("onComplete", kapat);
    return tl;
  };
})();
