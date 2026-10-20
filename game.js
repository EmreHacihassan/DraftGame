/* =========================================================
   SHINOBI DRAFT — Naruto Shippuuden Açık Arttırma Oyunu
   2 oyuncu · 20 puan · 10 karakter · 5+5 slot · mühür (seal) fazı
   ========================================================= */

const START_POINTS = 20;
const TOTAL_ROUNDS = 10;
const SLOTS = TOTAL_ROUNDS / 2;   // oyuncu başına 5 slot

/* characters.json okunamazsa (file:// kısıtı) devreye giren yedek liste.
   İçerik characters.json ile birebir aynıdır. */
const FALLBACK_POOL = [
  "Naruto Uzumaki","Sasuke Uchiha","Sakura Haruno","Kakashi Hatake","Itachi Uchiha",
  "Pain (Nagato)","Madara Uchiha","Obito Uchiha","Hashirama Senju","Tobirama Senju",
  "Hiruzen Sarutobi","Minato Namikaze","Jiraiya","Tsunade","Orochimaru",
  "Gaara","Rock Lee","Might Guy","Neji Hyuga","Hinata Hyuga",
  "Shikamaru Nara","Kisame Hoshigaki","Deidara","Sasori","Hidan",
  "Kakuzu","Konan","Kabuto Yakushi","Killer Bee","A (4. Raikage)",
  "Kimimaro","Zabuza Momochi","Haku","Shisui Uchiha","Danzo Shimura",
  "Yamato","Sai","Chiyo","Mei Terumi","Onoki",
  "Asuma Sarutobi","Kurenai Yuhi","Suigetsu Hozuki","Karin","Jugo"
].map((name, i) => ({ id: i + 1, name }));

const $ = (id) => document.getElementById(id);

/* ---------------------------------------------------------
   OYUN DURUMU
--------------------------------------------------------- */
const G = {
  players: [],
  mode: 1,          // 1 = zorunlu teklif iptali, 2 = sıfırdan zorunlu teklif
  sealMode: 0,       // 0 = mühür yok, 1 = ortak tek mühür, 2 = ayrı ayrı 1'er mühür
  seals: [],         // [{ name, by }] — veri setinden SİLİNMEZ, çekilişte damgalanır
  all: [],          // veri setinin tamamı (arama için)
  pool: [],         // bu oyunda henüz çekilmemiş karakterler
  round: 0,         // 0..9
  current: null,    // bu turdaki karakter
  starter: 0,       // bu turda ilk teklifi vermesi gereken oyuncu
  turn: 0,          // sırası gelen oyuncu
  bid: 0,           // masadaki güncel teklif
  leader: null,     // güncel teklifin sahibi (null = henüz teklif yok)
  claimedFree: false, // Mod 2: parasız oyuncu 0 ile talep etti mi
  busy: false,
  over: false
};

/* ---------------------------------------------------------
   KARAKTER HAVUZU
--------------------------------------------------------- */
async function loadPool() {
  try {
    const res = await fetch("characters.json", { cache: "no-store" });
    if (!res.ok) throw new Error("http " + res.status);
    const data = await res.json();
    if (Array.isArray(data.characters) && data.characters.length) return data.characters.slice();
  } catch (e) {
    console.warn("characters.json okunamadı, yedek liste kullanılıyor:", e.message);
  }
  return FALLBACK_POOL.slice();
}

/* Tek tek çekiliş: seçilen karakter havuzdan silinir, aynı oyunda bir daha gelmez. */
function drawOne() {
  const i = Math.floor(Math.random() * G.pool.length);
  return G.pool.splice(i, 1)[0];
}

const isSealed = (name) => G.seals.some((b) => b.name === name);

/* ---------------------------------------------------------
   YARDIMCILAR
--------------------------------------------------------- */
const P = (i) => G.players[i];
const other = (i) => 1 - i;
const eligible = (i) => P(i).roster.length < SLOTS;          // boş slotu var mı
const isBroke = (i) => P(i).pts <= 0;
/* "Taraflardan birinin parası bitti" durumu (hâlâ oyunda olan bir oyuncu için) */
const brokeExists = () => G.players.some((p, i) => p.pts <= 0 && eligible(i));

function log(msg, cls = "") {
  const d = document.createElement("div");
  d.className = "l " + cls;
  d.innerHTML = msg;
  $("log").prepend(d);
}

function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
}

/* Türkçe duyarlı arama normalizasyonu */
const norm = (s) =>
  s.toLocaleLowerCase("tr")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");

/* "Uchiha" -> "uciha", "Shisui" -> "sisui": Turkce klavyeyle yazilan halleri de yakalar */
const loose = (s) => norm(s).replace(/ch/g, "c").replace(/sh/g, "s").replace(/ph/g, "f");

/* ---------------------------------------------------------
   KURULUM EKRANI
--------------------------------------------------------- */
document.querySelectorAll(".mode-opt").forEach((opt) => {
  opt.addEventListener("click", () => {
    document.querySelectorAll(".mode-opt").forEach((o) => o.classList.remove("selected"));
    opt.classList.add("selected");
    opt.querySelector("input").checked = true;
  });
});

$("btn-start").addEventListener("click", async () => {
  const n1 = ($("in-p1").value || "Oyuncu X").trim().slice(0, 14);
  const n2 = ($("in-p2").value || "Oyuncu Y").trim().slice(0, 14);
  G.mode = Number(document.querySelector('input[name="mode"]:checked').value);
  G.players = [
    { name: n1, pts: START_POINTS, roster: [] },
    { name: n2, pts: START_POINTS, roster: [] }
  ];
  G.all = await loadPool();
  G.pool = G.all.slice();
  G.seals = [];
  $("pool-size").textContent = G.all.length;
  openSealScreen();
});

$("btn-restart").addEventListener("click", () => location.reload());

/* ---------------------------------------------------------
   MÜHÜR (SEAL) FAZI
--------------------------------------------------------- */
let picker = { who: null, chosen: null };   // who: "ortak" | 0 | 1

function openSealScreen() {
  show("screen-seal");
  $("seal-picker").hidden = true;
  document.querySelector(".seal-opts").hidden = false;
}

document.querySelectorAll(".seal-opt").forEach((b) =>
  b.addEventListener("click", () => {
    G.sealMode = Number(b.dataset.seal);
    G.seals = [];
    if (G.sealMode === 0) return beginMatch();
    startPicker(G.sealMode === 1 ? "ortak" : 0);
  })
);

function startPicker(who) {
  picker = { who, chosen: null };
  document.querySelector(".seal-opts").hidden = true;
  $("seal-picker").hidden = false;

  $("picker-head").innerHTML =
    who === "ortak"
      ? `<b>ORTAK MÜHÜR</b><small>İkiniz birlikte karar verin — tek bir isim mühürlenecek.</small>`
      : `<b>${P(who).name} MÜHÜRLÜYOR</b><small>Rakip ekrana bakmasın. Seçimin oyunda çıkana kadar gizli kalacak.</small>`;

  $("seal-search").value = "";
  $("seal-results").innerHTML = "";
  $("seal-chosen").textContent = "Henüz seçim yok";
  $("seal-chosen").className = "chosen";
  $("seal-confirm").disabled = true;
  $("seal-search").focus();
}

$("seal-search").addEventListener("input", () => {
  const q = $("seal-search").value.trim();
  const box = $("seal-results");
  if (!q) return (box.innerHTML = "");
  const nq = norm(q), lq = loose(q);
  const hit = G.all.filter(
    (c) => !isSealed(c.name) && (norm(c.name).includes(nq) || loose(c.name).includes(lq))
  );
  box.innerHTML = hit.length
    ? hit.map((c) => `<div class="r" data-name="${c.name}">${c.name}</div>`).join("")
    : `<div class="empty">Eşleşen karakter yok</div>`;
});

$("seal-results").addEventListener("click", (e) => {
  const r = e.target.closest(".r");
  if (!r) return;
  picker.chosen = r.dataset.name;
  $("seal-chosen").textContent = "🚫 " + picker.chosen;
  $("seal-chosen").className = "chosen on";
  $("seal-search").value = "";
  $("seal-results").innerHTML = "";
  $("seal-confirm").disabled = false;
});

$("seal-back").addEventListener("click", () => {
  G.seals = [];
  $("seal-picker").hidden = true;
  document.querySelector(".seal-opts").hidden = false;
});

$("seal-confirm").addEventListener("click", () => {
  if (!picker.chosen) return;
  G.seals.push({
    name: picker.chosen,
    by: picker.who === "ortak" ? "ortak" : P(picker.who).name
  });
  // Ayrı ayrı modda ilk oyuncu bitti → ikinci oyuncuya geç
  if (G.sealMode === 2 && G.seals.length === 1) return startPicker(1);
  beginMatch();
});

/* ---------------------------------------------------------
   MAÇ BAŞLANGICI (%50 çekilişi)
--------------------------------------------------------- */
function beginMatch() {
  G.round = 0;
  G.over = false;
  $("mode-label").textContent = "MOD " + G.mode;
  $("round-dots").innerHTML = Array.from({ length: TOTAL_ROUNDS }, () => "<i></i>").join("");
  $("log").innerHTML = "";
  renderSealChip();

  const first = Math.random() < 0.5 ? 0 : 1;
  G.starter = first;

  show("screen-flip");
  const eye = $("sharingan");
  eye.classList.remove("slow");
  $("flip-text").textContent = "KADER BELİRLENİYOR...";
  $("flip-sub").textContent = "%50 — %50";

  setTimeout(() => {
    eye.classList.add("slow");
    $("flip-text").textContent = P(first).name.toUpperCase();
    $("flip-sub").textContent = "İLK TEKLİF SIRASI ONDA";
  }, 1800);

  setTimeout(() => {
    show("screen-game");
    log(`Havuzdaki <b>${G.pool.length}</b> karakterden <b>${TOTAL_ROUNDS}</b> tanesi teker teker çekilecek. Mod: <b>${G.mode}</b>`, "sys");
    if (G.seals.length) log(`<b>${G.seals.length}</b> isim mühürlendi. Çekilişte çıkarlarsa damgalanıp yerlerine yeni karakter çekilecek.`, "sys");
    log(`%50 çekilişi: ilk teklif sırası <b>${P(first).name}</b> oyuncusunda.`, "sys");
    nextRound();
  }, 3600);
}

function renderSealChip() {
  const kalan = G.seals.filter((b) => !b.used).length;
  const chip = $("seal-chip");
  chip.hidden = kalan === 0;
  chip.textContent = `🚫 ${kalan} MÜHÜR`;
}

/* ---------------------------------------------------------
   TUR AKIŞI
--------------------------------------------------------- */
function nextRound() {
  if (G.round >= TOTAL_ROUNDS) return endGame();

  G.bid = 0;
  G.leader = null;
  G.claimedFree = false;
  G.busy = true;
  $("btn-next").hidden = true;
  setControlsEnabled(false);
  renderRoundHeader();

  drawUntilAllowed((char) => {
    G.current = char;
    rollName(char.name, () => {
      G.busy = false;
      log(`Tur ${G.round + 1}: <b>${char.name}</b> açık arttırmaya çıktı. (Havuzda kalan: ${G.pool.length})`, "sys");

      // Sıra sahibi slotunu doldurduysa açık arttırmayı diğer oyuncu açar
      G.turn = eligible(G.starter) ? G.starter : other(G.starter);

      // Bir taraf 5 slotunu doldurduysa kalan karakterler diğerine otomatik gider
      const solo = [0, 1].filter(eligible);
      if (solo.length === 1) {
        const w = solo[0];
        award(w, 0, `${P(other(w)).name} kadrosunu doldurdu — <b>${char.name}</b> otomatik olarak ${P(w).name} oyuncusuna verildi (0 puan).`);
        return;
      }
      renderTurn();
    });
  });
}

/* Mühürlü isim çıkarsa: damgala, kaydet, yerine yenisini çek (zincirleme olabilir) */
/* Mühürlü isim çıkarsa: Minato Hiraishin ile gelir, ismi mühürler, yerine yenisi çekilir */
function drawUntilAllowed(cb) {
  const c = drawOne();
  if (!isSealed(c.name)) return cb(c);

  const seal = G.seals.find((x) => x.name === c.name);
  rollName(c.name, () => {
    seal.used = true;
    renderSealChip();
    log(`封 <b>${c.name}</b> çekildi ama mühürlü (${seal.by === "ortak" ? "ortak mühür" : seal.by + " mühürlemiş"}) — yerine yeni karakter çekiliyor.`, "pass");
    playSealFx(c.name, seal, () => drawUntilAllowed(cb));
  });
}

/* Mühürlü isim çıkarsa: Minato Hiraishin ile gelir, ismi mühürler, yerine yenisi çekilir */
function drawUntilAllowed(cb) {
  const c = drawOne();
  if (!isSealed(c.name)) return cb(c);

  const seal = G.seals.find((x) => x.name === c.name);
  rollName(c.name, () => {
    seal.used = true;
    renderSealChip();
    log(`封 <b>${c.name}</b> çekildi ama mühürlü (${seal.by === "ortak" ? "ortak mühür" : seal.by + " mühürlemiş"}) — yerine yeni karakter çekiliyor.`, "pass");
    playSealFx(c.name, seal, () => drawUntilAllowed(cb));
  });
}

/* İsteğe bağlı: assets/minato.png (veya .webp/.jpg) varsa vektör çizim yerine o kullanılır */
function renderRoundHeader() {
  $("round-label").textContent = `TUR ${G.round + 1} / ${TOTAL_ROUNDS}`;
  const dots = $("round-dots").children;
  for (let i = 0; i < dots.length; i++) {
    dots[i].className = i < G.round ? "done" : i === G.round ? "now" : "";
  }
}

/* İsim "makarası" — açık arttırmaya çıkan karakter açıklanırken */
function rollName(finalName, done) {
  const el = $("char-name");
  el.classList.add("rolling");
  const bag = G.pool.length ? G.pool : G.all;
  let n = 0;
  const iv = setInterval(() => {
    el.textContent = bag[Math.floor(Math.random() * bag.length)].name;
    if (++n > 12) {
      clearInterval(iv);
      el.classList.remove("rolling");
      el.textContent = finalName;
      done();
    }
  }, 70);
}

/* ---------------------------------------------------------
   TEKLİF KURALLARI
--------------------------------------------------------- */
/*
  Açılış (leader === null):
    - Normal: sıradaki oyuncu en az 1 puan teklif etmek ZORUNDA.
    - Mod 1 + sahada parası biten biri varsa: zorunluluk kalkar, oyuncu PAS geçebilir;
      teklif edilmeyen karakter karşı tarafın boş slotuna bedava gider.
    - Mod 2 + sıradaki oyuncunun parası bittiyse: zorunlu teklifi 0'dan başlar (0 ile talep eder).
  Cevap (leader !== null):
    - Artırmak için en az güncel teklif + 1 gerekir; parası yetmiyorsa sadece PAS.
    - PAS gelirse karakter, güncel teklifin sahibinde kalır.
*/
function rules() {
  const t = G.turn;
  const pts = P(t).pts;
  const opening = G.leader === null;

  if (!opening) {
    return { min: G.bid + 1, max: pts, canBid: pts >= G.bid + 1, canPass: true, freeClaim: false, forced: false };
  }
  if (G.mode === 2 && isBroke(t)) {
    return { min: 0, max: 0, canBid: true, canPass: false, freeClaim: true, forced: true };
  }
  const relief = G.mode === 1 && brokeExists();   // zorunluluk iptal mi
  return {
    min: 1,
    max: pts,
    canBid: pts >= 1,
    canPass: relief || pts < 1,
    freeClaim: false,
    forced: !relief && pts >= 1
  };
}

function renderTurn() {
  renderPlayers();
  const r = rules();
  const me = P(G.turn), rival = P(other(G.turn));

  $("cur-bid").textContent = G.leader === null ? "—" : G.bid;
  $("cur-leader").textContent = G.leader === null ? "—" : P(G.leader).name;
  $("turn-banner").textContent = `Sıra: ${me.name}`;

  let msg = "";
  if (G.leader === null) {
    if (r.freeClaim) {
      msg = `<b>${me.name}</b> parası bittiği için açılış teklifi <b>0 puandan</b> başlıyor (Mod 2). 0 ile talep et; ${rival.name} 1+ puan verirse karakteri kaptırırsın.`;
    } else if (r.forced) {
      msg = `<b>${me.name}</b> açılışı yapmak zorunda: en az <b>1 puan</b> teklif etmelisin.`;
    } else if (r.canBid) {
      msg = `Sahada parası biten oyuncu var — zorunlu teklif iptal (Mod 1). <b>${me.name}</b> ister 1+ puan verir, ister <b>pas</b> geçer; pas geçersen karakter bedava <b>${rival.name}</b> oyuncusuna gider.`;
    } else {
      msg = `<b>${me.name}</b> oyuncusunun puanı kalmadı, teklif veremez. Pas geçtiğinde karakter bedava <b>${rival.name}</b> oyuncusuna gider.`;
    }
  } else {
    msg = r.canBid
      ? `Masadaki teklif <b>${G.bid}</b> puan (${P(G.leader).name}). Almak için en az <b>${r.min}</b> puan vermelisin.`
      : `Puanın artırmaya yetmiyor (en az ${r.min} gerekli). Pas geçmek zorundasın — karakter <b>${P(G.leader).name}</b> oyuncusunda kalır.`;
  }
  $("status-line").innerHTML = msg;

  const inp = $("bid-input");
  inp.min = r.min; inp.max = r.max;
  inp.value = Math.min(Math.max(r.min, 0), Math.max(r.max, 0));
  $("btn-bid").textContent = r.freeClaim ? "0 PUAN İLE TALEP ET" : "TEKLİF VER";
  $("btn-bid").disabled = !r.canBid;
  $("btn-pass").disabled = !r.canPass;
  $("btn-pass").textContent = G.leader === null ? "PAS (TEKLİF VERME)" : "PAS";
  $("err-line").textContent = "";
  setControlsEnabled(true);
}

function setControlsEnabled(on) {
  $("controls").style.opacity = on ? "1" : ".45";
  $("controls").style.pointerEvents = on ? "auto" : "none";
}

/* ---------------------------------------------------------
   AKSİYONLAR
--------------------------------------------------------- */
$("btn-bid").addEventListener("click", doBid);
$("btn-pass").addEventListener("click", doPass);
$("btn-minus").addEventListener("click", () => stepBid(-1));
$("btn-plus").addEventListener("click", () => stepBid(+1));
document.querySelectorAll(".btn-quick").forEach((b) =>
  b.addEventListener("click", () => {
    const r = rules();
    const v = { min: r.min, p2: r.min + 1, p5: r.min + 4, max: r.max }[b.dataset.q];
    $("bid-input").value = Math.max(r.min, Math.min(r.max, v));
  })
);
$("bid-input").addEventListener("keydown", (e) => { if (e.key === "Enter") doBid(); });
$("btn-next").addEventListener("click", () => { if (!G.busy) nextRound(); });

function stepBid(d) {
  const r = rules();
  const v = Number($("bid-input").value || 0) + d;
  $("bid-input").value = Math.max(r.min, Math.min(r.max, v));
}

function doBid() {
  if (G.busy || G.over) return;
  const r = rules();
  const v = Math.floor(Number($("bid-input").value));
  if (!r.canBid) return;
  if (isNaN(v)) return err("Geçerli bir sayı gir.");
  if (v < r.min) return err(`En az ${r.min} puan teklif etmelisin.`);
  if (v > P(G.turn).pts) return err(`Puanın yetmiyor. Kalan: ${P(G.turn).pts}`);

  G.bid = v;
  G.leader = G.turn;
  if (r.freeClaim) {
    G.claimedFree = true;
    log(`<b>${P(G.turn).name}</b> parası bittiği için <b>0 puan</b> ile ${G.current.name} karakterini talep etti (Mod 2).`, "bid");
  } else {
    log(`<b>${P(G.turn).name}</b> → ${G.current.name} için <b>${v} puan</b> teklif etti.`, "bid");
  }

  const opp = other(G.turn);
  if (!eligible(opp)) {
    award(G.leader, G.bid, `${P(opp).name} kadrosunu doldurdu — karakter <b>${P(G.leader).name}</b> oyuncusunda kaldı.`);
    return;
  }
  G.turn = opp;
  renderTurn();
}

function doPass() {
  if (G.busy || G.over) return;
  const r = rules();
  if (!r.canPass) return err("Açılış teklifini vermek zorundasın.");

  if (G.leader === null) {
    const w = other(G.turn);
    log(`<b>${P(G.turn).name}</b> teklif vermedi.`, "pass");
    award(w, 0, `Teklif verilmediği için <b>${G.current.name}</b> bedava <b>${P(w).name}</b> oyuncusunun slotuna gitti.`);
  } else {
    log(`<b>${P(G.turn).name}</b> pas geçti.`, "pass");
    award(G.leader, G.bid, null);
  }
}

function err(m) { $("err-line").textContent = m; }

/* ---------------------------------------------------------
   KARAKTERİ VERME
--------------------------------------------------------- */
function award(winner, price, note) {
  G.busy = true;
  setControlsEnabled(false);
  P(winner).pts -= price;
  P(winner).roster.push({ name: G.current.name, price });

  if (note) log(note, "win");
  log(`🏆 <b>${G.current.name}</b> → <b>${P(winner).name}</b> ${price === 0 ? "(BEDAVA)" : "(" + price + " puan)"} · Kalan puan: ${P(winner).pts}`, "win");
  if (P(winner).pts === 0) log(`⚠ <b>${P(winner).name}</b> oyuncusunun puanı bitti! ${G.mode === 1 ? "Zorunlu açılış teklifi bu andan itibaren iptal." : "Bundan sonra zorunlu açılış teklifi 0'dan başlayacak."}`, "sys");

  G.round++;
  G.starter = other(G.starter);   // açılış sırası her turda el değiştirir
  G.leader = null;
  G.bid = 0;

  renderPlayers();
  $("cur-bid").textContent = price;
  $("cur-leader").textContent = P(winner).name;
  $("turn-banner").textContent = `${P(winner).name} kazandı`;
  $("status-line").innerHTML = `<b>${G.current.name}</b> artık ${P(winner).name} kadrosunda.`;

  G.busy = false;
  if (G.round >= TOTAL_ROUNDS) {
    setTimeout(endGame, 900);
  } else {
    $("btn-next").hidden = false;
    $("btn-next").focus();
  }
}

/* ---------------------------------------------------------
   RENDER — OYUNCU PANELLERİ
--------------------------------------------------------- */
function renderPlayers() {
  [0, 1].forEach((i) => {
    const p = P(i);
    const col = $("pcol-" + i);
    col.className = "player-col p-" + i + (G.turn === i && !G.over ? " active" : "");
    const slots = Array.from({ length: SLOTS }, (_, s) => {
      const c = p.roster[s];
      return c
        ? `<div class="slot filled"><span class="num">${s + 1}</span>${c.name}
             <span class="price ${c.price === 0 ? "free" : ""}">${c.price === 0 ? "BEDAVA" : c.price + "p"}</span></div>`
        : `<div class="slot"><span class="num">${s + 1}</span>boş slot</div>`;
    }).join("");

    col.innerHTML = `
      <div class="p-head">
        <div class="p-avatar">${p.name.charAt(0).toUpperCase()}</div>
        <div>
          <div class="p-name">${p.name}</div>
          <div class="p-tag">${p.roster.length}/${SLOTS} KARAKTER${p.pts <= 0 ? " · PARASI BİTTİ" : ""}</div>
        </div>
      </div>
      <div class="p-money ${p.pts <= 0 ? "broke" : ""}">
        <b>${p.pts}</b><span>PUAN KALDI</span>
        <div class="bar"><i style="width:${(p.pts / START_POINTS) * 100}%"></i></div>
      </div>
      <div class="slots">${slots}</div>`;
  });
}

/* ---------------------------------------------------------
   BİTİŞ
--------------------------------------------------------- */
function endGame() {
  G.over = true;
  $("end-teams").innerHTML = [0, 1].map((i) => {
    const p = P(i);
    const spent = p.roster.reduce((a, c) => a + c.price, 0);
    return `<div class="end-team">
        <h3>${p.name}</h3>
        <div class="sum">HARCANAN: ${spent} PUAN · KALAN: ${p.pts} PUAN</div>
        <ol>${p.roster.map((c) => `<li>${c.name} <span class="pz">${c.price === 0 ? "bedava" : c.price + "p"}</span></li>`).join("")}</ol>
      </div>`;
  }).join("");

  $("end-seals").innerHTML = G.seals.length
    ? "🚫 Mühürlenen isimler: " + G.seals.map((b) =>
        `<b>${b.name}</b> (${b.by === "ortak" ? "ortak" : b.by}${b.used ? " · çekilişte çıktı, damgalandı" : " · hiç çıkmadı"})`
      ).join(" &nbsp;·&nbsp; ")
    : "";
  show("screen-end");
}
