import JSZip from 'jszip';
import type { ApkBuildConfig, LauncherSettings } from '../types/launcher';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildStandaloneHtml(settings: LauncherSettings, config: ApkBuildConfig): string {
  const safeName = JSON.stringify(settings.name);
  const safeTz = JSON.stringify(settings.tz);
  const safeMethod = JSON.stringify(settings.method);
  const safeLeague = JSON.stringify(settings.league);
  const safeAdzan = JSON.stringify(settings.adzan);
  const safeSoundNav = JSON.stringify(settings.soundNav);
  const safeDpadSpeed = JSON.stringify(settings.dpadSpeed || 'normal');
  const safeFavoriteApps = JSON.stringify(settings.favoriteApps || []);
  const safeLiveWallpaper = JSON.stringify(settings.liveWallpaper || '0');
  const safeLiveTheme = JSON.stringify(settings.liveWallpaperTheme || 'clouds');
  const safeLiveFilter = JSON.stringify(settings.liveWallpaperFilter || 'none');
  const safeThemeMode = JSON.stringify(settings.themeMode || 'auto');
  const safeScreenSaver = JSON.stringify(settings.screenSaver === '0' ? '0' : '1');
  const safeAutoSilent = JSON.stringify(settings.autoSilent === '0' ? '0' : '1');
  const safeAutoSilentDur = Number(settings.autoSilentDurationMin) || 15;
  const safeDashboardCards = JSON.stringify(
    settings.dashboardCards || [
      { id: 'prayer', visible: true },
      { id: 'schedule', visible: true },
      { id: 'weather', visible: true },
    ]
  );
  const safeApps = JSON.stringify(settings.apps);
  const includeSys = config.includeSystemShortcuts ? 'true' : 'false';

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeXml(config.appName)}</title>
<style>
:root{--tv-focus-hex:#38bdf8;--tv-focus-rgb:56,189,248;--tv-focus-bg:rgba(14,116,144,.55);--tv-accent:#38bdf8;--tv-card-bg:rgba(12,30,56,.82);--tv-card-border:rgba(125,211,252,.22);--tv-tile-bg:rgba(14,34,64,.85);--tv-next-bg:#0284c7}
[data-theme="dawn"]{--tv-focus-hex:#fb923c;--tv-focus-rgb:251,146,60;--tv-focus-bg:rgba(154,52,18,.5);--tv-accent:#fb923c;--tv-card-bg:rgba(28,17,12,.82);--tv-card-border:rgba(253,186,116,.22);--tv-tile-bg:rgba(32,20,14,.85);--tv-next-bg:#d97706}
[data-theme="day"]{--tv-focus-hex:#38bdf8;--tv-focus-rgb:56,189,248;--tv-focus-bg:rgba(14,116,144,.55);--tv-accent:#38bdf8;--tv-card-bg:rgba(12,30,56,.82);--tv-card-border:rgba(125,211,252,.22);--tv-tile-bg:rgba(14,34,64,.85);--tv-next-bg:#0284c7}
[data-theme="night"]{--tv-focus-hex:#a78bfa;--tv-focus-rgb:167,139,250;--tv-focus-bg:rgba(91,33,182,.52);--tv-accent:#c4b5fd;--tv-card-bg:rgba(19,13,41,.84);--tv-card-border:rgba(196,181,253,.2);--tv-tile-bg:rgba(24,16,51,.85);--tv-next-bg:#7c3aed}
*{box-sizing:border-box;margin:0}
html,body{height:100%}
body{
  font-family:system-ui,-apple-system,Roboto,sans-serif;
  color:#f8fafc;
  background:#070d19 center/cover no-repeat;
  overflow:hidden;
  user-select:none;
  transition:background .7s ease;
}
#liveBg{
  position:fixed;inset:0;width:100%;height:100%;object-fit:cover;
  opacity:0;transition:opacity .7s ease,filter .7s ease;pointer-events:none;
}
#liveBg.ready{opacity:1}
#liveBg.flt-monochrome{filter:grayscale(1) contrast(1.08)}
#liveBg.flt-sepia{filter:sepia(1) contrast(1.04) brightness(.95)}
#shade{
  position:fixed;inset:0;
  background:linear-gradient(180deg,rgba(7,13,25,.55),rgba(7,13,25,.82));
  transition:background .7s ease;
}
#app{
  position:relative;
  height:100%;
  padding:3.2vh 3.8vw;
  display:flex;
  flex-direction:column;
  gap:2.2vh;
}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:2vw}
#clock{
  font-size:6.8vw;
  font-weight:300;
  line-height:1;
  font-variant-numeric:tabular-nums;
  letter-spacing:-.02em;
}
#date{font-size:1.55vw;color:rgba(226,232,240,.82);margin-top:.8vh}
.top-right{display:flex;align-items:flex-start;gap:1.5vw}
#nowW{text-align:right;font-size:1.5vw;color:rgba(226,232,240,.85)}
#nowW b{display:block;font-size:4vw;font-weight:400;font-variant-numeric:tabular-nums;color:#fff}
.grid{flex:1;display:grid;grid-template-columns:1fr 1.25fr 1fr;gap:1.4vw;min-height:0}
.grid.cols-2{grid-template-columns:1fr 1fr}
.grid.cols-1,.grid.cols-0{grid-template-columns:1fr}
#gridEmpty{display:none;flex-direction:column;align-items:center;justify-content:center;gap:1.5vh;background:var(--tv-card-bg);border:1px solid var(--tv-card-border);border-radius:1.2vw;padding:3vw;text-align:center}
#cardLayoutGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:1vw;margin-top:.8vh}
.cl-cell{background:rgba(15,23,42,.82);border:1px solid rgba(148,163,184,.25);border-radius:.9vw;padding:1.2vw;display:flex;flex-direction:column;gap:.9vh;transition:border-color .15s ease,background .15s ease,transform .15s ease}
.cl-cell.grabbed{border-color:#38bdf8;background:rgba(14,116,144,.38);box-shadow:0 0 0 3px rgba(56,189,248,.35)}
.cl-cell.hidden-card{opacity:.55}
.cl-meta{font-size:1vw;color:rgba(148,163,184,.85)}
.cl-title{font-size:1.35vw;font-weight:600;color:#f8fafc}
.cl-actions{display:flex;gap:.5vw;flex-wrap:wrap}
.cl-actions button{padding:.55vh .8vw;font-size:1.05vw}
@keyframes tv-card-enter{
  0%{opacity:0;transform:translateY(18px) scale(.985)}
  100%{opacity:1;transform:translateY(0) scale(1)}
}
.card{
  background:var(--tv-card-bg);
  border:1px solid var(--tv-card-border);
  border-radius:1.2vw;
  padding:1.4vw;
  display:flex;
  flex-direction:column;
  min-height:0;
  transition:background .7s ease,border-color .7s ease;
}
.card.card-enter{animation:tv-card-enter .46s cubic-bezier(.16,1,.3,1) both}
.card h2{
  font-size:1.25vw;
  font-weight:600;
  color:rgba(203,213,225,.85);
  margin-bottom:1.1vh;
  letter-spacing:.04em;
}
.scroll-body{flex:1;overflow-y:auto;scrollbar-width:none}
.scroll-body::-webkit-scrollbar{display:none}
.row{
  display:flex;justify-content:space-between;align-items:center;
  font-size:1.65vw;
  padding:.85vh 1vw;
  border-radius:.75vw;
  font-variant-numeric:tabular-nums;
}
.row.next{background:var(--tv-next-bg);color:#fff;font-weight:600}
#cdRow{display:flex;align-items:center;justify-content:space-between;gap:1vw;margin-bottom:.9vh}
#cd{font-size:1.3vw;color:var(--tv-accent);font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#prayViz{display:flex;align-items:flex-end;gap:3px;height:1.8vh;min-height:14px;flex:none}
#prayViz span{width:3px;height:100%;border-radius:2px;background:rgba(148,163,184,.35);transform-origin:bottom;transform:scaleY(.16);transition:background-color .15s ease}
#prayViz.nav span{background:var(--tv-accent)}
#prayViz.adzan span{background:#34d399}
.match{
  padding:.9vh .7vw;
  border-bottom:1px solid rgba(255,255,255,.08);
  border-radius:.6vw;
  font-size:1.38vw;
}
.match small{display:block;color:rgba(203,213,225,.68);font-size:1.05vw;margin-top:.3vh;font-variant-numeric:tabular-nums}
.day{
  display:flex;justify-content:space-between;align-items:center;
  font-size:1.45vw;padding:.8vh .4vw;
  font-variant-numeric:tabular-nums;
}
.day span:first-child{width:5.5vw;color:rgba(226,232,240,.85)}
.muted{color:rgba(148,163,184,.8);font-size:1.3vw}
.bar{
  display:flex;gap:1vw;align-items:center;
  overflow-x:auto;scrollbar-width:none;
  padding:.8vh .6vw;
}
.bar::-webkit-scrollbar{display:none}
.bar>*{flex:none}
button,.btn{
  font:inherit;
  color:#f8fafc;
  background:var(--tv-tile-bg);
  border:1px solid var(--tv-card-border);
  border-radius:.9vw;
  padding:1.25vh 1.6vw;
  font-size:1.4vw;
  cursor:pointer;
  text-decoration:none;
  display:inline-flex;
  align-items:center;
  gap:.65vw;
  transition:transform .14s ease,background .14s ease,box-shadow .14s ease,border-color .7s ease;
}
@keyframes tv-focus-outer-glow{
  0%,100%{box-shadow:0 0 0 6px rgba(var(--tv-focus-rgb),.18),0 0 18px 2px rgba(var(--tv-focus-rgb),.22)}
  50%{box-shadow:0 0 0 9px rgba(var(--tv-focus-rgb),.34),0 0 30px 6px rgba(var(--tv-focus-rgb),.42)}
}
[data-focusable="true"]:focus{
  outline:3px solid var(--tv-focus-hex);
  outline-offset:2px;
  background:var(--tv-focus-bg);
  transform:scale(1.04);
  box-shadow:0 0 0 6px rgba(var(--tv-focus-rgb),.18);
  animation:tv-focus-outer-glow 2.4s ease-in-out 3s infinite;
  z-index:10;
}
.fav-star{color:#fbbf24;font-size:1.15em;line-height:1}
.fav-star.off{color:rgba(148,163,184,.55)}
.fav-tile{border-color:rgba(251,191,36,.55)}
#favList{display:flex;flex-wrap:wrap;gap:.8vw}
#apps button img{width:2.6vw;height:2.6vw;border-radius:.45vw;object-fit:contain}
.hint{font-size:1.05vw;color:rgba(148,163,184,.75);display:flex;justify-content:space-between;padding:0 .4vw}
@keyframes tv-app-fade-in{
  0%{opacity:.72;transform:scale(.992)}
  100%{opacity:1;transform:scale(1)}
}
#app.fade-in{animation:tv-app-fade-in .32s cubic-bezier(.16,1,.3,1) both}
#set{
  position:fixed;inset:0;
  background:rgba(5,10,20,.95);
  display:block;
  visibility:hidden;
  opacity:0;
  transform:scale(.97);
  pointer-events:none;
  padding:4.5vh 7vw;
  overflow:auto;
  z-index:50;
  transition:opacity .22s ease,transform .22s cubic-bezier(.16,1,.3,1),visibility 0s linear .22s;
}
#set.on{visibility:visible;opacity:1;transform:scale(1);pointer-events:auto;transition:opacity .22s ease,transform .22s cubic-bezier(.16,1,.3,1),visibility 0s}
#set h1{font-size:2.3vw;font-weight:600;margin-bottom:2.5vh}
.f{margin:1.8vh 0;font-size:1.4vw}
.f label{display:block;color:rgba(203,213,225,.75);margin-bottom:.7vh}
input,select,textarea{
  font:inherit;font-size:1.4vw;color:#fff;
  background:rgba(30,41,59,.85);
  border:1px solid rgba(148,163,184,.25);
  border-radius:.75vw;padding:1.1vh 1vw;min-width:24vw;
}
option{color:#000}
#res{display:flex;flex-wrap:wrap;gap:.8vw;margin-top:.8vh}
#pwr{position:fixed;inset:0;background:rgba(5,10,20,.92);display:flex;visibility:hidden;opacity:0;transform:scale(.97);pointer-events:none;align-items:center;justify-content:center;z-index:60;padding:4vw;transition:opacity .22s ease,transform .22s cubic-bezier(.16,1,.3,1),visibility 0s linear .22s}
#pwr.on{visibility:visible;opacity:1;transform:scale(1);pointer-events:auto;transition:opacity .22s ease,transform .22s cubic-bezier(.16,1,.3,1),visibility 0s}
.pwr-box{width:min(56vw,780px);background:#0f172a;border:1px solid rgba(148,163,184,.28);border-radius:1.4vw;padding:2.4vw}
.pwr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.4vw;margin:2.2vh 0}
.pwr-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1vh;padding:3vh 1.2vw;border-radius:1vw;text-align:center}
#pwrState{position:fixed;inset:0;background:#020617;display:none;flex-direction:column;align-items:center;justify-content:center;gap:1.5vh;z-index:70;text-align:center;padding:4vw}
#pwrState.on{display:flex}
#ssaver{position:fixed;inset:0;background:#050505;display:flex;flex-direction:column;justify-content:flex-end;visibility:hidden;opacity:0;pointer-events:none;z-index:55;overflow:hidden;cursor:none;transition:opacity .35s ease,visibility 0s linear .35s}
#ssaver.on{visibility:visible;opacity:1;pointer-events:auto;transition:opacity .35s ease,visibility 0s}
#ssImg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .7s ease}
#ssImg.ready{opacity:1}
#ssScrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.35) 55%,rgba(0,0,0,.86));pointer-events:none}
#ssBar{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-end;gap:3vw;padding:4.5vh 4.5vw}
@media(max-width:800px){
  body{overflow:auto}#app{height:auto}.grid,.grid.cols-2,.grid.cols-1,#cardLayoutGrid{grid-template-columns:1fr}
  #clock{font-size:16vw}#date,#nowW,.row,.match,.day,.card h2,#cd,button,.btn,.f,input,select,textarea,.muted{font-size:3.8vw}
  #nowW b{font-size:11vw}.match small{font-size:3vw}#set h1{font-size:6.5vw}
  .pwr-box{width:92vw}.pwr-grid{grid-template-columns:1fr}
}
</style>
</head>
<body>
<video id="liveBg" autoplay muted loop playsinline></video>
<div id="shade"></div>
<div id="app">
  <div class="top">
    <div>
      <div id="clock">--:--</div>
      <div id="date">Memuat tanggal…</div>
    </div>
    <div class="top-right">
      <div id="nowW"></div>
      <input id="appFilter" data-focusable="true" data-dpad-row="top" placeholder="Cari aplikasi…" style="min-width:16vw;padding:1vh 1.1vw;font-size:1.25vw">
      <button id="openTop" data-focusable="true" data-dpad-row="top">Pengaturan</button>
    </div>
  </div>

  <div class="grid" id="tvGrid">
    <div class="card" data-card-id="prayer">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.8vw;margin-bottom:.8vh">
        <div>
          <h2 style="margin-bottom:.3vh">Waktu Sholat</h2>
          <div id="hijriCard" style="font-size:1.1vw;color:#6ee7b7"></div>
        </div>
        <div style="display:flex;gap:.5vw">
          <button id="prayTabToday" data-focusable="true" data-dpad-row="cards" style="padding:.5vh .9vw;font-size:1.05vw">Hari Ini</button>
          <button id="prayTabChart" data-focusable="true" data-dpad-row="cards" style="padding:.5vh .9vw;font-size:1.05vw">Grafik</button>
        </div>
      </div>
      <div id="cdRow">
        <div id="cd"></div>
        <div id="prayViz" aria-label="Audio Visualizer"><span></span><span></span><span></span><span></span><span></span></div>
      </div>
      <div id="dndBar" style="display:none;align-items:center;justify-content:space-between;gap:.8vw;background:rgba(139,92,246,.2);border:1px solid rgba(167,139,250,.45);border-radius:.65vw;padding:.55vh .8vw;margin-bottom:.7vh;font-size:1.05vw;color:#ede9fe">
        <span id="dndText">Mode Hening (DND) Aktif</span>
        <button id="dndEnd" data-focusable="true" data-dpad-row="cards" style="padding:.3vh .7vw;font-size:.95vw">Akhiri</button>
      </div>
      <div class="scroll-body" id="pray"><div class="muted">Memuat…</div></div>
    </div>
    <div class="card" data-card-id="schedule">
      <h2>Jadwal Pertandingan</h2>
      <div class="scroll-body" id="match"><div class="muted">Memuat…</div></div>
    </div>
    <div class="card" data-card-id="weather">
      <h2>Prakiraan Cuaca</h2>
      <div class="scroll-body" id="wx"><div class="muted">Memuat…</div></div>
    </div>
    <div id="gridEmpty">
      <div style="font-size:1.8vw;font-weight:500">Semua kartu dashboard disembunyikan</div>
      <div class="muted">Aktifkan kembali kartu Sholat, Jadwal, atau Cuaca melalui menu Pengaturan.</div>
      <button id="emptyOpenSet" data-focusable="true" data-dpad-row="cards">Buka Pengaturan</button>
    </div>
  </div>

  <div class="bar" id="apps"></div>
  <div id="newsTicker" style="display:flex;align-items:center;gap:1vw;background:var(--tv-card-bg);border:1px solid var(--tv-card-border);border-radius:.8vw;padding:.7vh 1vw;font-size:1.15vw">
    <button id="newsCat" data-focusable="true" data-dpad-row="ticker" style="padding:.45vh .9vw;font-size:1.05vw;color:var(--tv-accent)">Teknologi</button>
    <a id="newsLink" data-focusable="true" data-dpad-row="ticker" href="#" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f1f5f9;text-decoration:none;padding:.3vh .5vw;border-radius:.5vw">Memuat berita trending…</a>
    <span id="newsCount" style="font-variant-numeric:tabular-nums;color:rgba(148,163,184,.85);font-size:1vw"></span>
    <button id="newsNext" data-focusable="true" data-dpad-row="ticker" style="padding:.45vh .8vw;font-size:1.05vw">›</button>
  </div>
  <div class="hint">
    <span>Navigasi Remote: Panah Arah · OK/Enter Pilih · F Favorit · Back Kembali · M Menu · Tahan Menu Power Menu</span>
    <span id="androidBadge"></span>
  </div>
</div>

<div id="pwr" role="dialog" aria-modal="true" aria-label="Power Menu">
  <div class="pwr-box">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:1vw">
      <h2 style="font-size:2vw;font-weight:600">Power Menu</h2>
      <button id="pwrClose" data-focusable="true">Tutup</button>
    </div>
    <div class="pwr-grid">
      <button class="pwr-btn" data-pwr="sleep" data-focusable="true">
        <span style="font-size:2vw;font-weight:600">Sleep</span>
        <small class="muted">Mode siaga layar</small>
      </button>
      <button class="pwr-btn" data-pwr="restart" data-focusable="true">
        <span style="font-size:2vw;font-weight:600">Restart</span>
        <small class="muted">Mulai ulang sistem</small>
      </button>
      <button class="pwr-btn" data-pwr="shutdown" data-focusable="true">
        <span style="font-size:2vw;font-weight:600">Shutdown</span>
        <small class="muted">Matikan perangkat</small>
      </button>
    </div>
    <div class="muted">Panah Kiri/Kanan Pilih · OK Konfirmasi · Back Batal</div>
  </div>
</div>

<div id="pwrState">
  <div id="pwrStateTitle" style="font-size:3.2vw;font-weight:300"></div>
  <div id="pwrStateSub" class="muted"></div>
  <button id="pwrWake" data-focusable="true" style="display:none;margin-top:2vh">Nyalakan TV</button>
</div>

<div id="ssaver" role="dialog" aria-modal="true" aria-label="Screen Saver">
  <img id="ssImg" alt="Pemandangan" referrerpolicy="no-referrer">
  <div id="ssScrim"></div>
  <div id="ssBar">
    <div>
      <div id="ssClock" style="font-size:6.5vw;font-weight:300;line-height:1;font-variant-numeric:tabular-nums">--:--</div>
      <div id="ssDate" style="font-size:1.3vw;color:rgba(226,232,240,.88);margin-top:.8vh"></div>
    </div>
    <div style="text-align:right;max-width:40vw">
      <div id="ssTitle" style="font-size:1.3vw;font-weight:500;color:#f8fafc"></div>
      <div id="ssMeta" style="font-size:1.05vw;color:rgba(203,213,225,.8);margin-top:.4vh"></div>
      <div style="font-size:.95vw;color:rgba(148,163,184,.78);margin-top:.5vh">Tekan tombol apa saja untuk kembali</div>
    </div>
  </div>
</div>

<div id="set">
  <h1>Pengaturan TV Launcher</h1>
  <div class="f"><label>Lokasi saat ini</label><b id="locName"></b></div>
  <div class="f">
    <label>Cari kota (untuk waktu sholat, cuaca &amp; zona waktu)</label>
    <div style="display:flex;gap:1vw;align-items:center;flex-wrap:wrap">
      <input id="q" data-focusable="true" placeholder="mis. Surabaya">
      <button id="go" data-focusable="true">Cari Kota</button>
    </div>
    <div id="res"></div>
  </div>
  <div class="f"><label>Metode perhitungan sholat</label>
    <select id="method" data-focusable="true">
      <option value="20">Kemenag RI (Indonesia)</option>
      <option value="3">Muslim World League</option>
      <option value="4">Umm al-Qura (Makkah)</option>
      <option value="2">ISNA</option>
      <option value="11">Singapura (MUIS)</option>
      <option value="17">Malaysia (JAKIM)</option>
    </select>
  </div>
  <div class="f"><label>Liga sepak bola</label>
    <select id="league" data-focusable="true">
      <option value="4328">Premier League</option>
      <option value="4335">La Liga</option>
      <option value="4332">Serie A</option>
      <option value="4331">Bundesliga</option>
      <option value="4334">Ligue 1</option>
      <option value="4790">Super League Indonesia (Liga 1)</option>
      <option value="4480">Champions League</option>
    </select>
  </div>
  <div class="f">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:1vw;flex-wrap:wrap;margin-bottom:.7vh">
      <label style="margin:0">Tata Letak &amp; Visibilitas Kartu Dashboard (OK/Enter untuk geser dengan panah D-pad, atau seret)</label>
      <button id="cardLayoutReset" type="button" data-focusable="true" style="padding:.55vh 1vw;font-size:1.1vw">Reset Urutan</button>
    </div>
    <div id="cardLayoutGrid"></div>
  </div>
  <div class="f"><label>Tema warna otomatis berdasarkan waktu hari</label>
    <select id="themeMode" data-focusable="true">
      <option value="auto">Otomatis (Fajar · Siang · Malam)</option>
      <option value="dawn">Fajar (Soft Orange)</option>
      <option value="day">Siang (Bright Blue)</option>
      <option value="night">Malam (Deep Purple / Midnight)</option>
    </select>
  </div>
  <div class="f"><label>Live Wallpaper (Video Ambient Minimalis)</label>
    <div style="display:flex;gap:1vw;align-items:center;flex-wrap:wrap">
      <select id="liveWp" data-focusable="true"><option value="0">Nonaktif</option><option value="1">Aktif</option></select>
      <select id="liveTheme" data-focusable="true">
        <option value="clouds">Langit &amp; Awan Minimalis</option>
        <option value="ocean">Ombak &amp; Laut Tenang</option>
        <option value="aurora">Aurora &amp; Langit Malam</option>
        <option value="cosmos">Bumi dari Orbit (NASA)</option>
      </select>
      <select id="liveFilter" data-focusable="true">
        <option value="none">Filter: Normal</option>
        <option value="monochrome">Filter: Monokrom</option>
        <option value="sepia">Filter: Sepia</option>
      </select>
    </div>
  </div>
  <div class="f"><label>Screen Saver (Galeri foto pemandangan acak setelah 5 menit tidak aktif)</label>
    <select id="screenSaver" data-focusable="true"><option value="1">Aktif</option><option value="0">Nonaktif</option></select>
  </div>
  <div class="f"><label>Wallpaper (pilih file foto dari perangkat)</label>
    <div style="display:flex;gap:1vw;align-items:center;flex-wrap:wrap">
      <input type="file" id="wp" data-focusable="true" accept="image/*">
      <button id="wpReset" data-focusable="true">Kembalikan Default</button>
    </div>
  </div>
  <div class="f"><label>Adzan saat waktu sholat (file audio sendiri; tanpa file = bunyi bip)</label>
    <div style="display:flex;gap:1vw;align-items:center;flex-wrap:wrap">
      <select id="adzan" data-focusable="true"><option value="1">Aktif</option><option value="0">Nonaktif</option></select>
      <input type="file" id="adzanFile" data-focusable="true" accept="audio/*">
      <button id="adzanTest" data-focusable="true">Tes Suara</button>
    </div>
  </div>
  <div class="f"><label>Auto-Silent (Mode Hening / DND otomatis saat waktu sholat tiba)</label>
    <div style="display:flex;gap:1vw;align-items:center;flex-wrap:wrap">
      <select id="autoSilent" data-focusable="true"><option value="1">Aktif</option><option value="0">Nonaktif</option></select>
      <select id="autoSilentDur" data-focusable="true">
        <option value="10">10 menit</option>
        <option value="15">15 menit</option>
        <option value="20">20 menit</option>
        <option value="30">30 menit</option>
      </select>
      <button id="dndPermBtn" data-focusable="true" style="display:none">Izin DND TV Box</button>
    </div>
  </div>
  <div class="f"><label>Suara klik navigasi remote</label>
    <select id="soundNav" data-focusable="true"><option value="1">Aktif</option><option value="0">Nonaktif</option></select>
  </div>
  <div class="f"><label>Kecepatan navigasi D-pad (saat menahan tombol panah)</label>
    <select id="dpadSpeed" data-focusable="true">
      <option value="slow">Lambat (Presisi 260ms)</option>
      <option value="normal">Normal (Seimbang 140ms)</option>
      <option value="fast">Cepat (Scroll Kilat 65ms)</option>
    </select>
  </div>
  <div class="f"><label>Aplikasi Favorit (muncul di posisi paling depan pada baris aplikasi)</label>
    <div id="favList"></div>
  </div>
  <div class="f"><label>Pintasan aplikasi (mode browser; di APK Android TV semua aplikasi terpasang muncul otomatis)</label>
    <textarea id="appsTxt" data-focusable="true" rows="4" style="width:62vw"></textarea>
  </div>
  <div class="f" style="display:flex;gap:1vw">
    <button id="save" data-focusable="true">Simpan &amp; Tutup</button>
    <button id="cancelSet" data-focusable="true">Batal</button>
  </div>
</div>

<script>
const $=id=>document.getElementById(id);
const DEF={
  name:${safeName},lat:${settings.lat},lon:${settings.lon},tz:${safeTz},
  method:${safeMethod},league:${safeLeague},adzan:${safeAdzan},soundNav:${safeSoundNav},dpadSpeed:${safeDpadSpeed},
  favoriteApps:${safeFavoriteApps},liveWallpaper:${safeLiveWallpaper},liveWallpaperTheme:${safeLiveTheme},liveWallpaperFilter:${safeLiveFilter},themeMode:${safeThemeMode},screenSaver:${safeScreenSaver},autoSilent:${safeAutoSilent},autoSilentDurationMin:${safeAutoSilentDur},dashboardCards:${safeDashboardCards},apps:${safeApps}
};
const DEF_CARDS=[{id:'prayer',visible:true},{id:'schedule',visible:true},{id:'weather',visible:true}];
const CARD_META={prayer:{t:'Sholat',d:'Jadwal adzan & hitung mundur'},schedule:{t:'Jadwal',d:'Pertandingan & jadwal TV'},weather:{t:'Cuaca',d:'Prakiraan cuaca & peringatan'}};
function normalizeDashboardCards(raw){
  const seen={};const out=[];
  if(Array.isArray(raw)){
    raw.forEach(item=>{
      if(item&&CARD_META[item.id]&&!seen[item.id]){
        seen[item.id]=true;
        out.push({id:item.id,visible:item.visible!==false});
      }
    });
  }
  DEF_CARDS.forEach(d=>{if(!seen[d.id])out.push({id:d.id,visible:d.visible})});
  return out;
}
let S=Object.assign({},DEF);
try{Object.assign(S,JSON.parse(localStorage.getItem('tvl')||'{}'))}catch(e){}
if(!Array.isArray(S.favoriteApps))S.favoriteApps=[];
if(!['auto','dawn','day','night'].includes(S.themeMode))S.themeMode='auto';
if(!['none','monochrome','sepia'].includes(S.liveWallpaperFilter))S.liveWallpaperFilter='none';
if(!['slow','normal','fast'].includes(S.dpadSpeed))S.dpadSpeed='normal';
if(S.screenSaver!=='0')S.screenSaver='1';
if(S.autoSilent!=='0')S.autoSilent='1';
if(![10,15,20,30].includes(Number(S.autoSilentDurationMin)))S.autoSilentDurationMin=15;
S.dashboardCards=normalizeDashboardCards(S.dashboardCards);
let draftCards=normalizeDashboardCards(S.dashboardCards),grabbedCardId=null,dragCardId=null;
let favEdit=false;
const save=()=>{try{localStorage.setItem('tvl',JSON.stringify(S))}catch(e){}};
const j=async u=>{const r=await fetch(u);if(!r.ok)throw 0;return r.json()};
const cache=(k,v)=>{try{if(v===undefined)return JSON.parse(localStorage.getItem(k));localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}};

/* Wallpaper & Live Wallpaper */
const LVQ={clouds:'clouds timelapse sky webm',ocean:'ocean waves sea calm webm',aurora:'aurora borealis timelapse webm'};
let LVLIST=[],LVIDX=0;
function applyLiveFilter(){
  const v=$('liveBg');if(!v)return;
  v.classList.remove('flt-monochrome','flt-sepia');
  if(S.liveWallpaperFilter==='monochrome')v.classList.add('flt-monochrome');
  else if(S.liveWallpaperFilter==='sepia')v.classList.add('flt-sepia');
}
async function loadLiveWP(){
  const v=$('liveBg');if(!v)return;
  applyLiveFilter();
  if(S.liveWallpaper!=='1'){v.pause();v.removeAttribute('src');v.classList.remove('ready');v.load();return}
  const theme=S.liveWallpaperTheme||'clouds',ck='livewp-'+theme;
  let list=cache(ck)||[];
  try{
    if(theme==='cosmos'){
      const r=await j('https://images-api.nasa.gov/search?q=earth%20horizon%20timelapse&media_type=video&page_size=6');
      const items=(r&&r.collection&&r.collection.items)||[];
      const out=[];
      for(const it of items.slice(0,5)){
        if(!it.href)continue;
        try{
          const fs=await j(it.href.replace(/^http:/,'https:'));
          const u=(fs||[]).find(f=>/~medium\\.mp4$/i.test(f))||(fs||[]).find(f=>/~small\\.mp4$/i.test(f))||(fs||[]).find(f=>/\\.mp4$/i.test(f));
          if(u)out.push({videoUrl:u.replace(/^http:/,'https:')});
        }catch(e){}
      }
      if(out.length){list=out;cache(ck,list)}
    }else{
      const sr=await j('https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch='+encodeURIComponent(LVQ[theme]||LVQ.clouds)+'&srnamespace=6&srlimit=10&format=json&origin=*');
      const ts=((sr&&sr.query&&sr.query.search)||[]).map(x=>x.title).filter(t=>/\\.(webm|ogv)$/i.test(t)).slice(0,6);
      if(ts.length){
        const det=await j('https://commons.wikimedia.org/w/api.php?action=query&titles='+encodeURIComponent(ts.join('|'))+'&prop=imageinfo&iiprop=url|mime|size&format=json&origin=*');
        const pgs=Object.values((det&&det.query&&det.query.pages)||{});
        const out=pgs.map(p=>p.imageinfo&&p.imageinfo[0]).filter(i=>i&&i.url&&(!i.size||i.size<85*1024*1024)).map(i=>({videoUrl:i.url}));
        if(out.length){list=out;cache(ck,list)}
      }
    }
  }catch(e){}
  LVLIST=list;LVIDX=0;
  if(LVLIST.length){
    v.classList.remove('ready');
    v.src=LVLIST[0].videoUrl;
    v.oncanplay=()=>v.classList.add('ready');
    v.onerror=()=>{if(LVLIST.length>1){LVIDX=(LVIDX+1)%LVLIST.length;v.src=LVLIST[LVIDX].videoUrl}};
  }
}
const TH_BG={
  dawn:'radial-gradient(circle at 20% 18%,rgba(251,146,60,.36),#22120b 52%,#0e0806 100%)',
  day:'radial-gradient(circle at 20% 18%,rgba(56,189,248,.42),#0b254a 52%,#071326 100%)',
  night:'radial-gradient(circle at 20% 18%,rgba(139,92,246,.36),#140b2e 52%,#070514 100%)'
};
const TH_SHADE={
  dawn:'linear-gradient(180deg,rgba(31,16,9,.52),rgba(11,6,4,.86))',
  day:'linear-gradient(180deg,rgba(8,26,54,.46),rgba(6,15,31,.82))',
  night:'linear-gradient(180deg,rgba(17,9,38,.54),rgba(5,3,18,.88))'
};
const TH_LBL={dawn:'Fajar',day:'Siang',night:'Malam'};
let CUR_THEME='';
function resolveThemePhase(h){
  if(S.themeMode==='dawn'||S.themeMode==='day'||S.themeMode==='night')return S.themeMode;
  if(h>=4&&h<10)return 'dawn';
  if(h>=10&&h<18)return 'day';
  return 'night';
}
function triggerAppFadeIn(){
  const el=$('app');if(!el)return;
  el.classList.remove('fade-in');
  void el.offsetWidth;
  el.classList.add('fade-in');
}
function applyTimeTheme(h){
  const ph=resolveThemePhase(h);
  if(CUR_THEME!==ph){
    const hadTheme=Boolean(CUR_THEME);
    CUR_THEME=ph;
    document.documentElement.setAttribute('data-theme',ph);
    const sh=$('shade');if(sh)sh.style.background=TH_SHADE[ph];
    setWP();
    if(hadTheme)triggerAppFadeIn();
  }
  return ph;
}
function setWP(){try{const w=localStorage.getItem('tvwp');document.body.style.backgroundImage=w?'url('+w+')':(TH_BG[CUR_THEME||'day']||TH_BG.day)}catch(e){}}
$('wp').onchange=e=>{const f=e.target.files[0];if(!f)return;const img=new Image();img.onload=()=>{
  const s=Math.min(1,1920/img.width),c=document.createElement('canvas');c.width=img.width*s;c.height=img.height*s;
  c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  try{localStorage.setItem('tvwp',c.toDataURL('image/jpeg',.85))}catch(x){try{localStorage.setItem('tvwp',c.toDataURL('image/jpeg',.6))}catch(y){}}
  setWP()};img.src=URL.createObjectURL(f)};
$('wpReset').onclick=()=>{try{localStorage.removeItem('tvwp')}catch(e){}setWP()};

/* Jam & Kalender Hijriyah */
const HM={1:'Muharram',2:'Safar',3:'Rabiul Awal',4:'Rabiul Akhir',5:'Jumadil Awal',6:'Jumadil Akhir',7:'Rajab',8:'Syaban',9:'Ramadan',10:'Syawal',11:'Zulkaidah',12:'Zulhijah'};
let HIJRI='';let PMODE='today';let PFILTER='Fajr';let PWEEK=[];
function fallbackHijri(){
  try{const o={};new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{timeZone:S.tz,day:'numeric',month:'numeric',year:'numeric'}).formatToParts(new Date()).forEach(p=>o[p.type]=p.value);
    const y=(o.year||'1448').replace(/\D/g,'')||'1448';return (o.day||'1')+' '+(HM[+o.month]||HM[1])+' '+y+' H';
  }catch(e){return ''}
}
const parts=(d=new Date())=>{const o={};new Intl.DateTimeFormat('en-GB',{timeZone:S.tz,hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(d).forEach(p=>o[p.type]=p.value);o.hour=o.hour%24;return o};
function tick(){const p=parts();const ph=applyTimeTheme(p.hour);checkAdzan(p);const hm=String(p.hour).padStart(2,'0')+':'+p.minute;$('clock').textContent=hm;
  const h=HIJRI||fallbackHijri();
  const dt=new Intl.DateTimeFormat('id-ID',{timeZone:S.tz,weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
  $('date').textContent=dt+(h?' · '+h:'')+' · '+S.name+' · Tema '+TH_LBL[ph];
  if($('ssClock'))$('ssClock').textContent=hm;
  if($('ssDate'))$('ssDate').textContent=dt+' · '+S.name;
  if($('hijriCard'))$('hijriCard').textContent=h;
  nextPrayer(p)}

let T=null;const N={Fajr:'Subuh',Dhuhr:'Dzuhur',Asr:'Ashar',Maghrib:'Maghrib',Isha:'Isya'};
async function loadPray(){
  const p=parts(),y=+p.year,m=+p.month,d=+p.day;
  const key='praycal-'+S.lat+'-'+S.lon+'-'+S.method+'-'+y+'-'+m;
  let cal=cache(key);
  if(!cal){try{const r=await j('https://api.aladhan.com/v1/calendar/'+y+'/'+m+'?latitude='+S.lat+'&longitude='+S.lon+'&method='+S.method+'&timezonestring='+encodeURIComponent(S.tz));cal=r.data;cache(key,cal)}catch(e){}}
  PWEEK=[];T=null;
  if(Array.isArray(cal)){
    const byDate={};cal.forEach(it=>{if(it&&it.date&&it.date.gregorian)byDate[it.date.gregorian.date]=it});
    for(let off=0;off<7;off++){
      const dt=new Date(Date.UTC(y,m-1,d+off));
      const dd=String(dt.getUTCDate()).padStart(2,'0'),mm=String(dt.getUTCMonth()+1).padStart(2,'0'),yy=dt.getUTCFullYear();
      const item=byDate[dd+'-'+mm+'-'+yy];
      if(item&&item.timings){
        if(off===0){T=item.timings;const hi=item.date.hijri;if(hi)HIJRI=Number(hi.day)+' '+(HM[+hi.month.number]||hi.month.en)+' '+hi.year+' H'}
        const lbl=off===0?'Hari ini':new Intl.DateTimeFormat('id-ID',{weekday:'short',timeZone:'UTC'}).format(dt);
        PWEEK.push({lbl,timings:item.timings});
      }
    }
  }
  if(!T){
    const k2='pray-'+S.lat+'-'+S.lon+'-'+S.method+'-'+p.year+p.month+p.day;T=cache(k2);
    if(!T){try{const r=await j('https://api.aladhan.com/v1/timings/'+p.day+'-'+p.month+'-'+p.year+'?latitude='+S.lat+'&longitude='+S.lon+'&method='+S.method+'&timezonestring='+encodeURIComponent(S.tz));T=r.data.timings;cache(k2,T)}catch(e){}}
  }
  renderPray()}
function toMin(s){const[h,m]=(s||'00:00').slice(0,5).split(':').map(Number);return (h||0)*60+(m||0)}
function renderPray(){
  $('prayTabToday').onclick=()=>{PMODE='today';renderPray()};
  $('prayTabChart').onclick=()=>{PMODE='chart';renderPray()};
  if(PMODE==='chart'){
    $('cd').textContent='';
    if(!PWEEK.length){$('pray').innerHTML='<div class="muted">Grafik 7 hari belum tersedia</div>';return}
    const vals=PWEEK.map(x=>toMin(x.timings[PFILTER]));
    const min=Math.min(...vals)-4,max=Math.max(...vals)+4,span=Math.max(1,max-min);
    const tabs=Object.keys(N).map(k=>'<button data-pf="'+k+'" data-focusable="true" data-dpad-row="cards" style="padding:.4vh .7vw;font-size:.95vw;'+(PFILTER===k?'border-color:#38bdf8;background:rgba(56,189,248,.25)':'')+'">'+N[k]+'</button>').join('');
    const bars=PWEEK.map((x,i)=>{const v=vals[i],pct=Math.max(15,Math.round(((v-min)/span)*100));
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:.4vh"><span style="font-size:.9vw;color:#bae6fd;font-variant-numeric:tabular-nums">'+x.timings[PFILTER].slice(0,5)+'</span><div style="width:100%;height:13vh;display:flex;align-items:flex-end"><div style="width:100%;height:'+pct+'%;background:#38bdf8;border-radius:.4vw .4vw 0 0"></div></div><span style="font-size:.9vw;opacity:.8">'+x.lbl+'</span></div>'}).join('');
    $('pray').innerHTML='<div style="display:flex;flex-wrap:wrap;gap:.4vw;margin-bottom:1.2vh">'+tabs+'</div><div style="display:flex;gap:.6vw;align-items:flex-end">'+bars+'</div>';
    document.querySelectorAll('#pray [data-pf]').forEach(b=>b.onclick=()=>{PFILTER=b.dataset.pf;renderPray()});
    return;
  }
  if(!T){$('pray').innerHTML='<div class="muted">Tidak dapat memuat (cek koneksi internet)</div>';return}
  $('pray').innerHTML=Object.keys(N).map(k=>'<div class="row" id="p-'+k+'"><span>'+N[k]+'</span><span>'+T[k].slice(0,5)+'</span></div>').join('')+'<div class="muted" style="margin-top:1vh;padding:0 1vw">Terbit: '+T.Sunrise.slice(0,5)+'</div>';
  nextPrayer(parts())}
function nextPrayer(p){if(!T||PMODE!=='today')return;const now=p.hour*60+ +p.minute,ks=Object.keys(N);let nk=null,diff=0;
  for(const k of ks){const[h,m]=T[k].split(':');const t=h*60+ +m;if(t>now){nk=k;diff=t*60-(now*60+ +p.second);break}}
  if(!nk){nk='Fajr';const[h,m]=T.Fajr.split(':');diff=(24*60+h*60+ +m)*60-(now*60+ +p.second)}
  ks.forEach(k=>{const e=$('p-'+k);if(e)e.classList.toggle('next',k===nk)});
  const h=Math.floor(diff/3600),m=Math.floor(diff%3600/60);$('cd').textContent=N[nk]+' dalam '+(h?h+' jam ':'')+m+' menit'}

/* Cuaca & Peringatan Cuaca Ekstrem */
const WC=c=>c==0?['☀️','Cerah']:c<3?['🌤️','Cerah berawan']:c==3?['☁️','Berawan']:c<50?['🌫️','Berkabut']:c<60?['🌦️','Gerimis']:c<70?['🌧️','Hujan']:c<80?['❄️','Salju']:c<90?['🌧️','Hujan deras']:['⛈️','Badai petir'];
function wxWarnItem(c,pr,prob,wind,gust,tmax){
  if(c>=95)return{lv:'ext',txt:'Cuaca ekstrem: Badai petir'};
  if(c===65||c===67||c===82||c===75||c===86)return{lv:'ext',txt:'Peringatan hujan lebat'};
  if((gust||0)>=60||(wind||0)>=45)return{lv:'ext',txt:'Cuaca ekstrem: Angin '+Math.round(Math.max(gust||0,wind||0))+' km/j'};
  if((pr||0)>=50)return{lv:'ext',txt:'Hujan sangat lebat ('+Math.round(pr)+' mm)'};
  if(typeof tmax==='number'&&tmax>=39)return{lv:'ext',txt:'Suhu ekstrem '+Math.round(tmax)+'°C'};
  if(c===63||c===66||c===81||c===57||(pr||0)>=25)return{lv:'warn',txt:'Waspada hujan deras'};
  if((gust||0)>=42||(wind||0)>=34)return{lv:'warn',txt:'Waspada angin kencang'};
  if((prob||0)>=80&&c>=61)return{lv:'warn',txt:'Potensi hujan tinggi ('+Math.round(prob)+'%)'};
  return null;
}
async function loadWx(){let r=cache('wx2-'+S.lat+S.lon);
  try{r=await j('https://api.open-meteo.com/v1/forecast?latitude='+S.lat+'&longitude='+S.lon+'&current=temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max&timezone='+encodeURIComponent(S.tz)+'&forecast_days=5');cache('wx2-'+S.lat+S.lon,r)}catch(e){}
  if(!r){$('wx').innerHTML='<div class="muted">Tidak dapat memuat</div>';return}
  const cw=wxWarnItem(r.current.weather_code,(r.current.precipitation||0)*6,0,r.current.wind_speed_10m,r.current.wind_gusts_10m,r.current.temperature_2m);
  let topW=cw;
  const rows=r.daily.time.map((d,i)=>{const w=WC(r.daily.weather_code[i]);
    const dw=wxWarnItem(r.daily.weather_code[i],r.daily.precipitation_sum&&r.daily.precipitation_sum[i],r.daily.precipitation_probability_max&&r.daily.precipitation_probability_max[i],r.daily.wind_speed_10m_max&&r.daily.wind_speed_10m_max[i],r.daily.wind_gusts_10m_max&&r.daily.wind_gusts_10m_max[i],r.daily.temperature_2m_max[i]);
    if(dw&&(!topW||(dw.lv==='ext'&&topW.lv!=='ext')))topW=dw;
    const n=i==0?'Hari ini':new Intl.DateTimeFormat('id-ID',{weekday:'short',timeZone:'UTC'}).format(new Date(d));
    const wi=dw?' <span style="color:'+(dw.lv==='ext'?'#fb7185':'#fbbf24')+'">⚠️</span>':'';
    return '<div class="day"><span>'+n+wi+'</span><span>'+w[0]+' '+(r.daily.precipitation_probability_max[i]??0)+'%</span><span>'+Math.round(r.daily.temperature_2m_max[i])+'° / '+Math.round(r.daily.temperature_2m_min[i])+'°</span></div>'}).join('');
  const c=WC(r.current.weather_code);
  $('nowW').innerHTML='<b>'+(cw?'⚠️ ':'')+c[0]+' '+Math.round(r.current.temperature_2m)+'°</b>'+c[1];
  const alertBar=topW?'<div style="border-top:1px solid rgba(251,191,36,.35);border-bottom:1px solid rgba(251,191,36,.35);padding:.6vh .4vw;margin-bottom:.6vh;font-size:1.1vw;font-weight:600;color:'+(topW.lv==='ext'?'#fda4af':'#fde68a')+'">⚠️ '+topW.txt+'</div>':'';
  $('wx').innerHTML=alertBar+rows}

/* Bola */
async function loadMatch(){const k='mt-'+S.league;let r=cache(k);
  try{r=await j('https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id='+S.league);cache(k,r)}catch(e){}
  const ev=r&&r.events;if(!ev||!ev.length){$('match').innerHTML='<div class="muted">Belum ada jadwal / tidak dapat memuat</div>';return}
  $('match').innerHTML=ev.slice(0,6).map(e=>{const d=new Date(e.dateEvent+'T'+(e.strTime||'00:00:00')+(e.strTime?'Z':''));
    const t=new Intl.DateTimeFormat('id-ID',{timeZone:S.tz,weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
    return '<div class="match" tabindex="0" data-focusable="true" data-dpad-row="cards">'+e.strHomeTeam+' vs '+e.strAwayTeam+'<small>'+t+(e.strTime?'':' (jam belum pasti)')+' · '+(e.strLeague||'')+'</small></div>'}).join('')}

/* Aplikasi & Favorit */
function sortFav(list,getId,getName){
  const fav=S.favoriteApps||[];
  return list.slice().sort((a,b)=>{
    const ia=fav.indexOf(getId(a)),ib=fav.indexOf(getId(b));
    if(ia!==-1&&ib!==-1)return ia-ib;
    if(ia!==-1)return -1;
    if(ib!==-1)return 1;
    return getName?getName(a).localeCompare(getName(b)):0;
  });
}
function toggleFav(id){
  const i=S.favoriteApps.indexOf(id);
  if(i>=0)S.favoriteApps.splice(i,1);else S.favoriteApps.push(id);
  save();renderApps();if($('set').classList.contains('on'))renderFavSettings();
}
let appFilterQ='';
function renderApps(){
  let h='';
  const q=appFilterQ.trim().toLowerCase();
  const favSet=new Set(S.favoriteApps||[]);
  if(window.Android){
    $('androidBadge').textContent='Mode Android TV Aktif';
    try{
      const apps=sortFav(JSON.parse(Android.getApps()),a=>a.p,a=>a.n).filter(a=>!q||a.n.toLowerCase().includes(q)||a.p.toLowerCase().includes(q));
      if(!apps.length&&q){h+='<span class="muted" style="padding:0 1vw">Tidak ada aplikasi cocok</span>'}
      apps.forEach(a=>{
        const isFav=favSet.has(a.p);
        const starHtml=(isFav||favEdit)?'<span class="fav-star '+(isFav?'':'off')+'">★</span>':'';
        h+='<button class="'+(isFav?'fav-tile':'')+'" data-p="'+a.p+'" data-fav-id="'+a.p+'" data-focusable="true" data-dpad-row="apps"><img src="data:image/png;base64,'+a.i+'" alt=""><span>'+a.n+'</span>'+starHtml+'</button>';
      });
    }catch(e){}
    if(${includeSys}){
      h+='<button data-s="wifi" data-focusable="true" data-dpad-row="apps">WiFi</button><button data-s="display" data-focusable="true" data-dpad-row="apps">Layar &amp; HDMI</button><button data-s="sound" data-focusable="true" data-dpad-row="apps">Suara</button>';
    }
  }else{
    $('androidBadge').textContent='Mode Browser';
    const items=sortFav(S.apps.split('\\n').filter(l=>l.includes('|')).map(l=>{const[n,u]=l.split('|');return{n:n.trim(),u:u.trim()}}),x=>x.u).filter(it=>!q||it.n.toLowerCase().includes(q));
    if(!items.length&&q){h+='<span class="muted" style="padding:0 1vw">Tidak ada aplikasi cocok</span>'}
    items.forEach(it=>{
      const isFav=favSet.has(it.u);
      const starHtml=(isFav||favEdit)?'<span class="fav-star '+(isFav?'':'off')+'">★</span>':'';
      if(favEdit){
        h+='<button class="'+(isFav?'fav-tile':'')+'" data-fav-toggle="'+it.u+'" data-fav-id="'+it.u+'" data-focusable="true" data-dpad-row="apps"><span>'+it.n+'</span>'+starHtml+'</button>';
      }else{
        h+='<a class="btn '+(isFav?'fav-tile':'')+'" data-fav-id="'+it.u+'" data-focusable="true" data-dpad-row="apps" href="'+it.u+'"><span>'+it.n+'</span>'+starHtml+'</a>';
      }
    });
  }
  h+='<button id="favToggle" data-focusable="true" data-dpad-row="apps">'+(favEdit?'★ Selesai Favorit':'★ Atur Favorit')+'</button>';
  h+='<button id="open" data-focusable="true" data-dpad-row="apps">Pengaturan</button>';
  $('apps').innerHTML=h;
  $('open').onclick=openSet;
  $('openTop').onclick=openSet;
  $('favToggle').onclick=()=>{favEdit=!favEdit;renderApps()};
  document.querySelectorAll('#apps [data-p]').forEach(x=>x.onclick=()=>{if(favEdit)toggleFav(x.dataset.p);else Android.launch(x.dataset.p)});
  document.querySelectorAll('#apps [data-fav-toggle]').forEach(x=>x.onclick=()=>toggleFav(x.dataset.favToggle));
  document.querySelectorAll('#apps [data-s]').forEach(x=>x.onclick=()=>Android.openSys(x.dataset.s));
}
$('appFilter').oninput=e=>{appFilterQ=e.target.value;renderApps()};
$('appFilter').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const f=document.querySelector('#apps [data-fav-id]');f&&f.focus()}};

function renderFavSettings(){
  const box=$('favList');if(!box)return;
  const favSet=new Set(S.favoriteApps||[]);
  let items=[];
  if(window.Android){
    try{items=sortFav(JSON.parse(Android.getApps()),a=>a.p,a=>a.n).map(a=>({id:a.p,n:a.n}))}catch(e){}
  }else{
    items=S.apps.split('\\n').filter(l=>l.includes('|')).map(l=>{const[n,u]=l.split('|');return{id:u.trim(),n:n.trim()}});
  }
  if(!items.length){box.innerHTML='<span class="muted">Belum ada aplikasi</span>';return}
  box.innerHTML='';
  items.forEach(it=>{
    const isFav=favSet.has(it.id);
    const b=document.createElement('button');
    b.type='button';b.dataset.focusable='true';
    if(isFav)b.className='fav-tile';
    b.innerHTML='<span>'+it.n+'</span><span class="fav-star '+(isFav?'':'off')+'">★</span>';
    b.onclick=()=>toggleFav(it.id);
    box.appendChild(b);
  });
}

function applyDashboardCards(){
  const grid=$('tvGrid');if(!grid)return;
  const list=normalizeDashboardCards(S.dashboardCards);
  let visCount=0;
  list.forEach(c=>{
    const el=grid.querySelector('[data-card-id="'+c.id+'"]');
    if(!el)return;
    grid.appendChild(el);
    el.style.display=c.visible?'flex':'none';
    el.classList.remove('card-enter');
    if(c.visible){
      el.style.animationDelay=(visCount*110)+'ms';
      void el.offsetWidth;
      el.classList.add('card-enter');
      visCount++;
    }
  });
  const empty=$('gridEmpty');
  if(empty){
    grid.appendChild(empty);
    empty.style.display=visCount===0?'flex':'none';
  }
  grid.className='grid cols-'+visCount;
}
if($('emptyOpenSet'))$('emptyOpenSet').onclick=openSet;
function swapDraftCard(fromId,toId){
  if(!fromId||!toId||fromId===toId)return;
  const fi=draftCards.findIndex(x=>x.id===fromId),ti=draftCards.findIndex(x=>x.id===toId);
  if(fi<0||ti<0)return;
  const tmp=draftCards[fi];draftCards[fi]=draftCards[ti];draftCards[ti]=tmp;
}
function renderCardLayoutSettings(refocusId){
  const box=$('cardLayoutGrid');if(!box)return;
  box.innerHTML='';
  draftCards.forEach((c,idx)=>{
    const m=CARD_META[c.id];
    const isGrab=grabbedCardId===c.id;
    const cell=document.createElement('div');
    cell.className='cl-cell'+(isGrab?' grabbed':'')+(c.visible?'':' hidden-card');
    cell.draggable=true;
    cell.ondragstart=e=>{dragCardId=c.id;if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',c.id)}};
    cell.ondragover=e=>{e.preventDefault();if(dragCardId&&dragCardId!==c.id){swapDraftCard(dragCardId,c.id);renderCardLayoutSettings()}};
    cell.ondrop=e=>{e.preventDefault();dragCardId=null;renderCardLayoutSettings()};
    cell.ondragend=()=>{dragCardId=null};

    const meta=document.createElement('div');
    meta.className='cl-meta';
    meta.textContent='Kolom '+(idx+1)+' · '+(c.visible?'Tampil':'Disembunyikan');

    const title=document.createElement('div');
    title.className='cl-title';
    title.textContent=m.t;

    const desc=document.createElement('div');
    desc.className='cl-meta';
    desc.textContent=m.d;

    const acts=document.createElement('div');
    acts.className='cl-actions';

    const grabBtn=document.createElement('button');
    grabBtn.type='button';
    grabBtn.dataset.focusable='true';
    grabBtn.dataset.cardGrab=c.id;
    grabBtn.textContent=isGrab?'Digeser (Panah)':'Geser Urutan';
    grabBtn.onclick=()=>{
      grabbedCardId=isGrab?null:c.id;
      renderCardLayoutSettings(c.id);
    };

    const visBtn=document.createElement('button');
    visBtn.type='button';
    visBtn.dataset.focusable='true';
    visBtn.dataset.cardVis=c.id;
    visBtn.textContent=c.visible?'Sembunyikan':'Tampilkan';
    visBtn.onclick=()=>{
      draftCards[idx]={id:c.id,visible:!c.visible};
      renderCardLayoutSettings();
      const vb=box.querySelector('[data-card-vis="'+c.id+'"]');vb&&vb.focus();
    };

    acts.appendChild(grabBtn);acts.appendChild(visBtn);
    cell.appendChild(meta);cell.appendChild(title);cell.appendChild(desc);cell.appendChild(acts);
    box.appendChild(cell);
  });
  if(refocusId){
    const target=box.querySelector('[data-card-grab="'+refocusId+'"]');
    target&&target.focus();
  }
}
if($('cardLayoutReset'))$('cardLayoutReset').onclick=()=>{
  draftCards=normalizeDashboardCards(DEF_CARDS);
  grabbedCardId=null;
  renderCardLayoutSettings();
};
document.addEventListener('keydown',e=>{
  if(!$('set').classList.contains('on')||!grabbedCardId)return;
  const idx=draftCards.findIndex(x=>x.id===grabbedCardId);
  if(idx<0){grabbedCardId=null;return}
  if(e.key==='ArrowLeft'||e.key==='ArrowUp'){
    e.preventDefault();e.stopPropagation();
    if(idx>0){
      const id=grabbedCardId;
      swapDraftCard(id,draftCards[idx-1].id);
      renderCardLayoutSettings(id);
      if(typeof navTick==='function')navTick();
    }
  }else if(e.key==='ArrowRight'||e.key==='ArrowDown'){
    e.preventDefault();e.stopPropagation();
    if(idx<draftCards.length-1){
      const id=grabbedCardId;
      swapDraftCard(id,draftCards[idx+1].id);
      renderCardLayoutSettings(id);
      if(typeof navTick==='function')navTick();
    }
  }else if(e.key==='Enter'||e.key===' '||e.key==='Escape'||e.key==='Backspace'){
    e.preventDefault();e.stopPropagation();
    const id=grabbedCardId;
    grabbedCardId=null;
    renderCardLayoutSettings(id);
  }
},true);

/* Pengaturan */
function openSet(){
  $('locName').textContent=S.name+' ('+S.tz+')';
  $('method').value=S.method;$('league').value=S.league;
  $('adzan').value=S.adzan;$('autoSilent').value=S.autoSilent||'1';$('autoSilentDur').value=String(S.autoSilentDurationMin||15);
  $('soundNav').value=S.soundNav||'1';$('dpadSpeed').value=S.dpadSpeed||'normal';
  const dp=$('dndPermBtn');if(dp){dp.style.display=window.Android&&Android.requestDndPermission?'inline-flex':'none';dp.textContent=window.Android&&Android.hasDndAccess&&Android.hasDndAccess()?'Izin DND TV Aktif':'Beri Izin DND TV Box';dp.onclick=()=>{if(window.Android&&Android.requestDndPermission)Android.requestDndPermission()}}
  $('themeMode').value=S.themeMode||'auto';
  $('liveWp').value=S.liveWallpaper||'0';$('liveTheme').value=S.liveWallpaperTheme||'clouds';$('liveFilter').value=S.liveWallpaperFilter||'none';
  $('screenSaver').value=S.screenSaver==='0'?'0':'1';
  $('appsTxt').value=S.apps;
  draftCards=normalizeDashboardCards(S.dashboardCards);
  grabbedCardId=null;
  renderCardLayoutSettings();
  renderFavSettings();
  $('set').classList.add('on');
  setTimeout(()=>$('q').focus(),60);
}
function closeSet(){
  grabbedCardId=null;
  $('set').classList.remove('on');
  triggerAppFadeIn();
  setTimeout(()=>{const f=document.querySelector('#apps [data-p],#apps a,#open');f&&f.focus()},60);
}
$('go').onclick=async()=>{
  const q=$('q').value.trim();if(!q)return;$('res').innerHTML='<span class="muted">Mencari…</span>';
  try{
    const r=await j('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(q)+'&count=5&language=id');
    $('res').innerHTML='';
    (r.results||[]).forEach(c=>{
      const b=document.createElement('button');b.dataset.focusable='true';
      b.textContent=c.name+', '+(c.admin1||'')+' '+(c.country||'')+' · '+c.timezone;
      b.onclick=()=>{S.name=c.name;S.lat=c.latitude;S.lon=c.longitude;S.tz=c.timezone;$('locName').textContent=c.name+' ('+c.timezone+')';$('res').innerHTML=''};
      $('res').appendChild(b);
    });
    if(!r.results)$('res').innerHTML='<span class="muted">Tidak ditemukan</span>';
  }catch(e){$('res').innerHTML='<span class="muted">Gagal mencari</span>'}
};
$('q').onkeydown=e=>{if(e.key==='Enter')$('go').click()};
$('save').onclick=()=>{S.method=$('method').value;S.league=$('league').value;S.adzan=$('adzan').value;S.autoSilent=$('autoSilent').value;S.autoSilentDurationMin=Number($('autoSilentDur').value)||15;S.soundNav=$('soundNav').value;S.dpadSpeed=$('dpadSpeed').value;S.themeMode=$('themeMode').value;S.liveWallpaper=$('liveWp').value;S.liveWallpaperTheme=$('liveTheme').value;S.liveWallpaperFilter=$('liveFilter').value;S.screenSaver=$('screenSaver').value;S.dashboardCards=normalizeDashboardCards(draftCards);S.apps=$('appsTxt').value;if(S.autoSilent==='0')endDndSession();save();closeSet();resetSsIdle();CUR_THEME='';init()};
$('cancelSet').onclick=closeSet;

let pwrTimer=null,pwrMode='awake';
function openPowerMenu(){
  if($('set').classList.contains('on'))closeSet();
  $('pwr').classList.add('on');
  setTimeout(()=>{const b=document.querySelector('#pwr [data-pwr="sleep"]');b&&b.focus()},60);
}
function closePowerMenu(){
  $('pwr').classList.remove('on');
  triggerAppFadeIn();
  setTimeout(()=>{const f=document.querySelector('#apps [data-p],#apps a,#open');f&&f.focus()},60);
}
function wakePower(){
  if(pwrTimer){clearTimeout(pwrTimer);pwrTimer=null}
  pwrMode='awake';$('pwrState').classList.remove('on');$('pwrWake').style.display='none';
}
function runPowerAction(act){
  closePowerMenu();
  if(window.Android&&Android.powerAction){try{Android.powerAction(act)}catch(e){}}
  if(act==='sleep'){
    pwrMode='sleep';
    $('pwrStateTitle').textContent=$('clock').textContent;
    $('pwrStateSub').textContent='Mode Sleep aktif · Tekan tombol remote mana saja untuk menyalakan';
    $('pwrWake').style.display='none';
    $('pwrState').classList.add('on');
  }else if(act==='restart'){
    pwrMode='restart';
    $('pwrStateTitle').textContent='Memulai ulang sistem…';
    $('pwrStateSub').textContent='TV Launcher akan segera dimuat kembali';
    $('pwrWake').style.display='none';
    $('pwrState').classList.add('on');
    pwrTimer=setTimeout(()=>location.reload(),1200);
  }else if(act==='shutdown'){
    pwrMode='shutdown';
    $('pwrStateTitle').textContent='Mematikan perangkat…';
    $('pwrStateSub').textContent='Menyimpan sesi sebelum daya dimatikan';
    $('pwrWake').style.display='none';
    $('pwrState').classList.add('on');
    pwrTimer=setTimeout(()=>{
      pwrMode='off';
      $('pwrStateTitle').textContent='TV Dimatikan';
      $('pwrStateSub').textContent='Tekan OK untuk menyalakan kembali';
      $('pwrWake').style.display='inline-flex';
      $('pwrWake').focus();
    },1000);
  }
}
$('pwrClose').onclick=closePowerMenu;
$('pwrWake').onclick=wakePower;
$('pwrState').onclick=()=>{if(pwrMode==='sleep')wakePower()};
document.querySelectorAll('#pwr [data-pwr]').forEach(b=>b.onclick=()=>runPowerAction(b.dataset.pwr));

window.__tvBack=()=>{if(ssOn){closeSs();return true}if($('pwr').classList.contains('on')){closePowerMenu();return true}if($('set').classList.contains('on')){closeSet();return true}if(favEdit){favEdit=false;renderApps();return true}return false};
window.__tvMenu=()=>{if(ssOn)closeSs();if($('pwr').classList.contains('on'))closePowerMenu();if(!$('set').classList.contains('on'))openSet()};
window.__tvPowerMenu=()=>{if(ssOn)closeSs();if(pwrMode!=='awake')wakePower();openPowerMenu()};
window.__tvRefreshApps=()=>{renderApps()};

/* Screen Saver Galeri Pemandangan (5 Menit Tidak Aktif) */
const SS_IDLE_MS=5*60*1000,SS_Q=['mountain lake sunset landscape','alpine valley sunrise clouds','ocean coastline cliffs golden hour','waterfall forest nature scenery'];
let ssOn=false,ssIdleT=null,ssSlideT=null,ssPhotos=[],ssIdx=0;
function showSsSlide(){
  if(!ssPhotos.length)return;
  const p=ssPhotos[ssIdx%ssPhotos.length],im=$('ssImg');
  im.classList.remove('ready');
  im.onload=()=>im.classList.add('ready');
  im.onerror=()=>{if(ssPhotos.length>1){ssIdx=(ssIdx+1)%ssPhotos.length;showSsSlide()}};
  im.src=p.url;
  $('ssTitle').textContent=p.title||'Pemandangan Alam';
  $('ssMeta').textContent=p.src+' · '+((ssIdx%ssPhotos.length)+1)+'/'+ssPhotos.length;
}
async function openSs(){
  if(ssOn||S.screenSaver==='0'||pwrMode!=='awake')return;
  ssOn=true;$('ssaver').classList.add('on');
  let list=cache('ssaver-photos')||[];
  try{
    const q=SS_Q[Math.floor(Math.random()*SS_Q.length)],off=Math.floor(Math.random()*20);
    const r=await j('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch='+encodeURIComponent(q)+'&gsrnamespace=6&gsrlimit=16&gsroffset='+off+'&prop=imageinfo&iiprop=url|mime|dimensions&iiurlwidth=1920&format=json&origin=*');
    const pgs=Object.values((r&&r.query&&r.query.pages)||{});
    const out=pgs.map(pg=>{const i=pg.imageinfo&&pg.imageinfo[0];if(!i)return null;const u=i.thumburl||i.url;if(!u||!/^image\\/(jpeg|jpg|png|webp)$/i.test(i.mime||''))return null;if((i.width||0)<1000||(i.height||0)<500||(i.width/i.height)<1.25)return null;return{url:u,title:(pg.title||'Pemandangan').replace(/^File:/i,'').replace(/\\.(jpe?g|png|webp)$/i,'').replace(/_/g,' ').slice(0,80),src:'Wikimedia Commons'}}).filter(Boolean);
    if(out.length){list=out.sort(()=>Math.random()-.5);cache('ssaver-photos',list)}
  }catch(e){}
  ssPhotos=list;ssIdx=0;showSsSlide();
  if(ssSlideT)clearInterval(ssSlideT);
  ssSlideT=setInterval(()=>{if(ssPhotos.length>1){ssIdx=(ssIdx+1)%ssPhotos.length;showSsSlide()}},12000);
}
function closeSs(){
  if(!ssOn)return;
  ssOn=false;$('ssaver').classList.remove('on');
  if(ssSlideT){clearInterval(ssSlideT);ssSlideT=null}
  resetSsIdle();
}
function resetSsIdle(){
  if(ssIdleT){clearTimeout(ssIdleT);ssIdleT=null}
  if(S.screenSaver!=='0'&&pwrMode==='awake'&&!ssOn){ssIdleT=setTimeout(openSs,SS_IDLE_MS)}
}
$('ssaver').onclick=closeSs;
['mousedown','touchstart','mousemove','wheel'].forEach(ev=>document.addEventListener(ev,()=>{if(ssOn&&ev!=='mousemove')closeSs();else if(!ssOn)resetSsIdle()},{passive:true}));
resetSsIdle();

/* Audio Visualizer & Shared AudioContext */
let aCtx=null,aAn=null,aBuf=null,vizMode='idle',vizNavT=0,vizBeepT=0,vizStart=0,vizAudio=null,vizRaf=0;
function getAudioGraph(){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
    if(!aCtx||aCtx.state==='closed'){aCtx=new AC();aAn=aCtx.createAnalyser();aAn.fftSize=64;aAn.smoothingTimeConstant=.72;aAn.connect(aCtx.destination);aBuf=new Uint8Array(aAn.frequencyBinCount)}
    if(aCtx.state==='suspended')aCtx.resume().catch(()=>{});
    return aAn?{c:aCtx,a:aAn}:null;
  }catch(e){return null}
}
function setViz(m){
  vizMode=m;
  const el=$('prayViz');if(!el)return;
  el.className=m==='idle'?'':m;
  if(m==='idle'){if(vizRaf){cancelAnimationFrame(vizRaf);vizRaf=0}[...el.children].forEach(b=>b.style.transform='scaleY(.16)');return}
  if(!vizRaf){
    const step=()=>{
      if(vizMode==='idle'){vizRaf=0;return}
      const bars=[...el.children];let live=false;
      if(aAn&&aBuf&&aCtx&&aCtx.state==='running'){
        aAn.getByteFrequencyData(aBuf);
        const maxB=Math.min(aBuf.length,20);
        for(let i=0;i<bars.length;i++){
          const s=Math.floor(i*maxB/bars.length),e=Math.max(s+1,Math.floor((i+1)*maxB/bars.length));
          let sum=0;for(let k=s;k<e;k++)sum+=aBuf[k]||0;
          const v=sum/((e-s)*255);if(v>.03)live=true;
          bars[i].style.transform='scaleY('+Math.min(1,.18+v*1.15).toFixed(3)+')';
        }
      }
      if(!live){
        const t=(performance.now()-vizStart)/1000;
        bars.forEach((b,i)=>{
          const lv=vizMode==='nav'?Math.max(.16,1-t*5)*(1-Math.abs(i-2)*.2):Math.max(.2,.22+(.5+.35*Math.sin(t*7.5+i*.95)+.15*Math.cos(t*12.2-i*1.3))*.75);
          b.style.transform='scaleY('+Math.min(1,lv).toFixed(3)+')';
        });
      }
      vizRaf=requestAnimationFrame(step);
    };
    vizRaf=requestAnimationFrame(step);
  }
}

/* Navigasi D-pad 2D Spatial untuk Remote TV */
function navTick(){
  if(S.soundNav==='0'||dndEndsAt>Date.now())return;
  vizStart=performance.now();
  if(vizMode!=='adzan'){setViz('nav');clearTimeout(vizNavT);vizNavT=setTimeout(()=>{if(vizMode==='nav')setViz('idle')},190)}
  try{const g=getAudioGraph();if(!g)return;const o=g.c.createOscillator(),gn=g.c.createGain();
    o.type='triangle';o.frequency.setValueAtTime(520,g.c.currentTime);o.frequency.exponentialRampToValueAtTime(240,g.c.currentTime+.035);
    gn.gain.setValueAtTime(.04,g.c.currentTime);gn.gain.exponentialRampToValueAtTime(.001,g.c.currentTime+.035);
    o.connect(gn);gn.connect(g.a);o.start();o.stop(g.c.currentTime+.04)}catch(e){}
}
let mHold={k:null,t:null,done:false};
const clrHold=()=>{if(mHold.t){clearTimeout(mHold.t);mHold.t=null}mHold.k=null;mHold.done=false};
document.addEventListener('keyup',e=>{
  const nk=e.key.toLowerCase();
  if(mHold.k!==nk)return;
  const done=mHold.done;clrHold();
  if(!done&&!$('pwr').classList.contains('on')&&!$('set').classList.contains('on'))openSet();
});
document.addEventListener('keydown',e=>{
  if(ssOn){e.preventDefault();closeSs();return}
  resetSsIdle();
  if(pwrMode==='sleep'){e.preventDefault();wakePower();return}
  if(pwrMode!=='awake')return;
  const pwrOn=$('pwr').classList.contains('on');
  const modalOn=$('set').classList.contains('on');
  const active=document.activeElement;
  const tag=active?active.tagName:'';
  const isText=(tag==='INPUT'&&!['file','checkbox','button'].includes(active.type))||tag==='TEXTAREA';

  if(e.key==='Escape'||(e.key==='Backspace'&&!isText)){
    clrHold();
    if(pwrOn){e.preventDefault();closePowerMenu()}
    else if(modalOn){e.preventDefault();closeSet()}
    else if(favEdit){e.preventDefault();favEdit=false;renderApps()}
    return;
  }
  if(!modalOn&&!pwrOn&&e.key.toLowerCase()==='f'&&!isText&&active&&active.dataset.favId){
    e.preventDefault();toggleFav(active.dataset.favId);return;
  }
  if(e.key==='F1'||e.key==='ContextMenu'||(e.key.toLowerCase()==='m'&&!isText)){
    e.preventDefault();
    if(modalOn||pwrOn)return;
    const nk=e.key.toLowerCase();
    if(e.repeat||mHold.k===nk)return;
    clrHold();mHold.k=nk;mHold.done=false;
    mHold.t=setTimeout(()=>{mHold.t=null;mHold.done=true;navTick();openPowerMenu()},550);
    return;
  }
  const dirMap={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
  const dir=dirMap[e.key];if(!dir)return;
  if(tag==='SELECT'&&(dir==='up'||dir==='down'))return;
  if(tag==='TEXTAREA'&&(dir==='up'||dir==='down'))return;
  if(isText&&(dir==='left'||dir==='right')){
    const pos=active.selectionStart||0,len=active.value.length;
    if((dir==='left'&&pos>0)||(dir==='right'&&pos<len))return;
  }
  const root=pwrOn?$('pwr'):modalOn?$('set'):$('app');
  const cands=[...root.querySelectorAll('[data-focusable="true"]:not([disabled])')].filter(el=>{
    const r=el.getBoundingClientRect();return r.width>0&&r.height>0;
  });
  if(!cands.length)return;
  e.preventDefault();
  const spdMap={slow:260,normal:140,fast:65};
  const now=performance.now(),iv=spdMap[S.dpadSpeed]||140;
  window.__dpadLast=window.__dpadLast||0;
  if(e.repeat&&now-window.__dpadLast<iv)return;
  const sb=S.dpadSpeed==='fast'?'auto':'smooth';
  if(!active||!cands.includes(active)){window.__dpadLast=now;cands[0].focus();cands[0].scrollIntoView({behavior:sb,block:'nearest',inline:'center'});return}
  const cr=active.getBoundingClientRect(),cx=cr.left+cr.width/2,cy=cr.top+cr.height/2;
  let best=null,bestScore=1e9;
  for(const el of cands){
    if(el===active)continue;
    const r=el.getBoundingClientRect(),tx=r.left+r.width/2,ty=r.top+r.height/2,dx=tx-cx,dy=ty-cy;
    let ok=false,p=0,c=0;
    if(dir==='right'){ok=dx>4;p=dx;c=Math.abs(dy)}
    else if(dir==='left'){ok=dx<-4;p=-dx;c=Math.abs(dy)}
    else if(dir==='down'){ok=dy>4;p=dy;c=Math.abs(dx)}
    else if(dir==='up'){ok=dy<-4;p=-dy;c=Math.abs(dx)}
    if(!ok)continue;
    const sameRow=active.dataset.dpadRow&&el.dataset.dpadRow&&active.dataset.dpadRow===el.dataset.dpadRow;
    const score=(p+c*2.4)*((dir==='left'||dir==='right')&&sameRow?.55:1);
    if(score<bestScore){bestScore=score;best=el}
  }
  if(best){window.__dpadLast=now;best.focus({preventScroll:true});best.scrollIntoView({behavior:sb,block:'nearest',inline:'center'});navTick()}
});

/* Adzan */
const idb=()=>new Promise((ok,no)=>{const r=indexedDB.open('tvl',1);r.onupgradeneeded=()=>r.result.createObjectStore('f');r.onsuccess=()=>ok(r.result);r.onerror=no});
const idbSet=async v=>{const d=await idb();d.transaction('f','readwrite').objectStore('f').put(v,'adzan')};
const idbGet=async()=>{try{const d=await idb();return await new Promise(ok=>{const q=d.transaction('f').objectStore('f').get('adzan');q.onsuccess=()=>ok(q.result);q.onerror=()=>ok(null)})}catch(e){return null}};
function beep(){
  vizStart=performance.now();setViz('adzan');clearTimeout(vizBeepT);vizBeepT=setTimeout(()=>{if(!vizAudio)setViz('idle')},1650);
  try{const g=getAudioGraph();if(!g)return;[0,.6,1.2].forEach(t=>{const o=g.c.createOscillator(),gn=g.c.createGain();gn.gain.setValueAtTime(.18,g.c.currentTime+t);gn.gain.exponentialRampToValueAtTime(.001,g.c.currentTime+t+.42);o.connect(gn);gn.connect(g.a);o.frequency.value=660;o.start(g.c.currentTime+t);o.stop(g.c.currentTime+t+.45)})}catch(e){}
}
async function playAdzan(){
  if(vizAudio){try{vizAudio.pause()}catch(e){}vizAudio=null}
  try{
    const b=await idbGet(),a=new Audio(b?URL.createObjectURL(b):'adzan.mp3');vizAudio=a;vizStart=performance.now();
    const g=getAudioGraph();if(g){try{g.c.createMediaElementSource(a).connect(g.a)}catch(e){}}
    const done=()=>{if(vizAudio===a){vizAudio=null;setViz('idle')}};
    a.onplaying=()=>setViz('adzan');a.onended=done;a.onpause=done;a.onerror=done;
    await a.play();setViz('adzan');return;
  }catch(e){vizAudio=null}
  beep();
}
$('adzanFile').onchange=async e=>{const f=e.target.files[0];if(f){try{await idbSet(f);alert('Audio adzan tersimpan')}catch(x){alert('Gagal menyimpan')}}};
$('adzanTest').onclick=playAdzan;
let lastAd='',lastSilent='',dismissedSilent='',dndEndsAt=0,dndLabel='';
function renderDndBar(){
  const bar=$('dndBar'),txt=$('dndText');if(!bar||!txt)return;
  if(!dndEndsAt||Date.now()>=dndEndsAt){bar.style.display='none';return}
  const rem=Math.max(0,Math.ceil((dndEndsAt-Date.now())/1000));
  const mm=String(Math.floor(rem/60)).padStart(2,'0'),ss=String(rem%60).padStart(2,'0');
  txt.textContent='Mode Hening ('+dndLabel+') · sisa '+mm+':'+ss;
  bar.style.display='flex';
}
function startDndSession(lbl,ms){
  dndLabel=lbl;dndEndsAt=Date.now()+ms;
  if(window.Android&&Android.setDnd){try{Android.setDnd(true)}catch(e){}}
  renderDndBar();
}
function endDndSession(markDismiss){
  if(markDismiss&&lastSilent)dismissedSilent=lastSilent;
  dndEndsAt=0;dndLabel='';
  if(window.Android&&Android.setDnd){try{Android.setDnd(false)}catch(e){}}
  renderDndBar();
}
if($('dndEnd'))$('dndEnd').onclick=()=>endDndSession(true);
function checkAdzan(p){
  if(dndEndsAt&&Date.now()>=dndEndsAt)endDndSession(false);
  else if(dndEndsAt)renderDndBar();
  if(!T)return;
  const hm=String(p.hour).padStart(2,'0')+':'+p.minute;
  const nowSec=(p.hour*60+ +p.minute)*60+ +p.second;
  const durMin=Number(S.autoSilentDurationMin)||15;
  for(const k of Object.keys(N)){
    const tStr=(T[k]||'').slice(0,5);if(!tStr)continue;
    const adKey=p.day+k;
    if(S.adzan!=='0'&&tStr===hm&&lastAd!==adKey){lastAd=adKey;playAdzan()}
    if(S.autoSilent!=='0'){
      const[th,tm]=tStr.split(':').map(Number);
      const startSec=(th*60+tm)*60,endSec=startSec+durMin*60;
      const sKey=p.year+'-'+p.month+'-'+p.day+'-'+k;
      if(nowSec>=startSec&&nowSec<endSec&&dismissedSilent!==sKey&&lastSilent!==sKey){
        lastSilent=sKey;
        startDndSession(N[k],endSec*1000-nowSec*1000);
      }
    }
  }
}

/* News Ticker (Top 5 Tech / Sports) */
let NCAT='tech',NLIST=[],NIDX=0;
function renderNews(){
  const catBtn=$('newsCat'),lnk=$('newsLink'),cnt=$('newsCount');
  if(!catBtn||!lnk||!cnt)return;
  catBtn.textContent=NCAT==='tech'?'Teknologi':'Olahraga';
  const cur=NLIST[NIDX];
  if(!cur){lnk.textContent='Berita trending belum tersedia';lnk.href='#';cnt.textContent='';return}
  lnk.textContent=cur.title+' · '+cur.source;
  lnk.href=cur.url||'#';
  cnt.textContent=(NIDX+1)+'/'+NLIST.length;
}
async function loadNews(){
  const k='news-'+NCAT;let list=cache(k)||[];
  try{
    if(NCAT==='tech'){
      const ids=(await j('https://hacker-news.firebaseio.com/v0/topstories.json')).slice(0,8);
      const items=await Promise.all(ids.map(id=>j('https://hacker-news.firebaseio.com/v0/item/'+id+'.json').catch(()=>null)));
      const res=items.filter(x=>x&&x.title).slice(0,5).map(x=>{let s='Hacker News';try{if(x.url)s=new URL(x.url).hostname.replace(/^www\\./,'')}catch(e){}return{title:x.title,source:s,url:x.url||'https://news.ycombinator.com/item?id='+x.id}});
      if(res.length){list=res;cache(k,res)}
    }else{
      const r=await j('https://site.api.espn.com/apis/site/v2/sports/news?limit=5');
      const res=(r.articles||[]).filter(a=>a.headline).slice(0,5).map(a=>({title:a.headline,source:'ESPN',url:(a.links&&a.links.web&&a.links.web.href)||'https://www.espn.com'}));
      if(res.length){list=res;cache(k,res)}
    }
  }catch(e){}
  NLIST=list;NIDX=0;renderNews();
}
$('newsCat').onclick=()=>{NCAT=NCAT==='tech'?'sports':'tech';loadNews()};
$('newsNext').onclick=()=>{if(NLIST.length){NIDX=(NIDX+1)%NLIST.length;renderNews()}};
setInterval(()=>{if(NLIST.length>1){NIDX=(NIDX+1)%NLIST.length;renderNews()}},6000);

function init(){setWP();applyDashboardCards();loadLiveWP();renderApps();loadPray();loadWx();loadMatch();loadNews();tick()}
init();setInterval(tick,1000);setInterval(()=>{loadPray();loadWx();loadMatch();loadNews()},30*60*1000);
setTimeout(()=>{const a=document.querySelector('#apps [data-p],#apps a,#open');a&&a.focus()},250);
</script>
</body>
</html>`;
}

export async function generateAndroidTvProjectZip(
  config: ApkBuildConfig,
  currentSettings: LauncherSettings
): Promise<Blob> {
  const zip = new JSZip();
  const pkgPath = config.packageId.replace(/\./g, '/');
  const safeAppName = escapeXml(config.appName);

  // 1. settings.gradle.kts
  zip.file(
    'settings.gradle.kts',
    `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "${config.appName.replace(/[^a-zA-Z0-9_-]/g, '') || 'TVLauncher'}"
include(":app")
`
  );

  // 2. Root build.gradle.kts
  zip.file(
    'build.gradle.kts',
    `plugins {
    id("com.android.application") version "8.5.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.24" apply false
}
`
  );

  // 3. gradle.properties
  zip.file(
    'gradle.properties',
    `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
`
  );

  // 4. gradle-wrapper.properties
  zip.file(
    'gradle/wrapper/gradle-wrapper.properties',
    `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`
  );

  // 5. app/build.gradle.kts
  zip.file(
    'app/build.gradle.kts',
    `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "${config.packageId}"
    compileSdk = 34

    defaultConfig {
        applicationId = "${config.packageId}"
        minSdk = 21
        targetSdk = 34
        versionCode = ${config.versionCode}
        versionName = "${config.versionName}"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.11.0")
}
`
  );

  zip.file('app/proguard-rules.pro', '# Keep JavascriptInterface methods\n-keepattributes JavascriptInterface\n-keepclassmembers class * {\n    @android.webkit.JavascriptInterface <methods>;\n}\n');

  // 6. AndroidManifest.xml
  const homeCategoryXml = config.setAsHomeLauncher
    ? `                <category android:name="android.intent.category.HOME" />
                <category android:name="android.intent.category.DEFAULT" />\n`
    : '';
  const orientationAttr = config.lockLandscape
    ? 'android:screenOrientation="landscape"'
    : 'android:screenOrientation="fullSensor"';

  zip.file(
    'app/src/main/AndroidManifest.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_NOTIFICATION_POLICY" />
    <uses-permission
        android:name="android.permission.QUERY_ALL_PACKAGES"
        tools:ignore="QueryAllPackagesPermission" />

    <!-- Mendukung Android TV resmi maupun Android TV Box AOSP -->
    <uses-feature
        android:name="android.software.leanback"
        android:required="false" />
    <uses-feature
        android:name="android.hardware.touchscreen"
        android:required="false" />

    <application
        android:allowBackup="true"
        android:banner="@drawable/tv_banner"
        android:hardwareAccelerated="true"
        android:icon="@drawable/ic_launcher_tv"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.TVLauncher"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden|keyboard|navigation"
            android:exported="true"
            android:launchMode="singleTask"
            ${orientationAttr}>
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
${homeCategoryXml}            </intent-filter>
        </activity>

    </application>
</manifest>
`
  );

  // 7. MainActivity.kt
  zip.file(
    `app/src/main/java/${pkgPath}/MainActivity.kt`,
    `package ${config.packageId}

import android.annotation.SuppressLint
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Base64
import android.view.KeyEvent
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        enableImmersiveFullscreen()

        webView = WebView(this).apply {
            isFocusable = true
            isFocusableInTouchMode = true
            setBackgroundColor(0xFF070D19.toInt())
        }
        setContentView(webView)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
        }

        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url.toString()
                if (url.startsWith("https://appassets.androidplatform.net/")) {
                    return false
                }
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    true
                } catch (_: Exception) {
                    false
                }
            }
        }

        webView.addJavascriptInterface(AndroidBridge(), "Android")
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
        webView.requestFocus()
    }

    override fun onResume() {
        super.onResume()
        enableImmersiveFullscreen()
        if (::webView.isInitialized) {
            webView.requestFocus()
            webView.evaluateJavascript("window.__tvRefreshApps && window.__tvRefreshApps();", null)
        }
    }

    private fun enableImmersiveFullscreen() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_MENU || keyCode == KeyEvent.KEYCODE_INFO) {
            if (event?.repeatCount == 0) {
                event.startTracking()
            } else if (event?.isLongPress == true) {
                webView.evaluateJavascript("window.__tvPowerMenu && window.__tvPowerMenu();", null)
            }
            return true
        }
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            webView.evaluateJavascript("window.__tvBack && window.__tvBack();") { result ->
                if (result != "true") {
                    if (webView.canGoBack()) {
                        webView.goBack()
                    }${config.setAsHomeLauncher ? '' : ' else { super.onBackPressed() }'}
                }
            }
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyLongPress(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_MENU || keyCode == KeyEvent.KEYCODE_INFO) {
            webView.evaluateJavascript("window.__tvPowerMenu && window.__tvPowerMenu();", null)
            return true
        }
        return super.onKeyLongPress(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_MENU || keyCode == KeyEvent.KEYCODE_INFO) {
            if (event != null && !event.isCanceled && event.isTracking) {
                webView.evaluateJavascript("window.__tvMenu && window.__tvMenu();", null)
            }
            return true
        }
        return super.onKeyUp(keyCode, event)
    }

    inner class AndroidBridge {

        @JavascriptInterface
        fun getApps(): String {
            val pm = packageManager
            val seen = HashSet<String>()
            val results = mutableListOf<Triple<String, String, String>>()

            val intents = listOf(
                Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER),
                Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            )

            for (intent in intents) {
                val list = pm.queryIntentActivities(intent, 0)
                for (ri in list) {
                    val pkg = ri.activityInfo?.packageName ?: continue
                    if (pkg == packageName || !seen.add(pkg)) continue
                    val label = ri.loadLabel(pm)?.toString()?.trim().orEmpty()
                    if (label.isEmpty()) continue
                    val iconDrawable = try {
                        ri.activityInfo.loadBanner(pm) ?: ri.loadIcon(pm)
                    } catch (_: Exception) {
                        ri.loadIcon(pm)
                    }
                    val b64 = drawableToBase64(iconDrawable)
                    results.add(Triple(label, pkg, b64))
                }
            }

            results.sortBy { it.first.lowercase() }
            val arr = JSONArray()
            for ((name, pkg, icon) in results) {
                arr.put(JSONObject().apply {
                    put("n", name)
                    put("p", pkg)
                    put("i", icon)
                })
            }
            return arr.toString()
        }

        @JavascriptInterface
        fun launch(pkg: String) {
            runOnUiThread {
                try {
                    val pm = packageManager
                    val intent = pm.getLeanbackLaunchIntentForPackage(pkg)
                        ?: pm.getLaunchIntentForPackage(pkg)
                    if (intent != null) {
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(intent)
                    }
                } catch (_: Exception) {
                }
            }
        }

        @JavascriptInterface
        fun openSys(target: String) {
            runOnUiThread {
                val action = when (target) {
                    "wifi" -> Settings.ACTION_WIFI_SETTINGS
                    "display" -> Settings.ACTION_DISPLAY_SETTINGS
                    "sound" -> Settings.ACTION_SOUND_SETTINGS
                    else -> Settings.ACTION_SETTINGS
                }
                try {
                    startActivity(Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                } catch (_: Exception) {
                    try {
                        startActivity(Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    } catch (_: Exception) {
                    }
                }
            }
        }

        @JavascriptInterface
        fun hasDndAccess(): Boolean {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            return nm?.isNotificationPolicyAccessGranted == true
        }

        @JavascriptInterface
        fun requestDndPermission() {
            runOnUiThread {
                try {
                    val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                    } else {
                        Intent(Settings.ACTION_SOUND_SETTINGS)
                    }
                    startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                } catch (_: Exception) {
                    try {
                        startActivity(Intent(Settings.ACTION_SOUND_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    } catch (_: Exception) {
                    }
                }
            }
        }

        @JavascriptInterface
        fun setDnd(enabled: Boolean): Boolean {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return false
            if (!nm.isNotificationPolicyAccessGranted) return false
            return try {
                nm.setInterruptionFilter(
                    if (enabled) NotificationManager.INTERRUPTION_FILTER_ALARMS
                    else NotificationManager.INTERRUPTION_FILTER_ALL
                )
                true
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun getDeviceInfo(): String {
            return JSONObject().apply {
                put("model", Build.MODEL ?: "Android TV")
                put("manufacturer", Build.MANUFACTURER ?: "")
                put("sdk", Build.VERSION.SDK_INT)
                put("dndGranted", hasDndAccess())
            }.toString()
        }

        @JavascriptInterface
        fun powerAction(action: String) {
            runOnUiThread {
                try {
                    when (action) {
                        "sleep" -> {
                            try {
                                startActivity(Intent("android.intent.action.MAIN").addCategory("android.intent.category.HOME"))
                            } catch (_: Exception) {
                            }
                            try {
                                Runtime.getRuntime().exec(arrayOf("su", "-c", "input keyevent 223"))
                            } catch (_: Exception) {
                            }
                        }
                        "restart" -> {
                            try {
                                Runtime.getRuntime().exec(arrayOf("su", "-c", "reboot"))
                            } catch (_: Exception) {
                            }
                        }
                        "shutdown" -> {
                            try {
                                Runtime.getRuntime().exec(arrayOf("su", "-c", "reboot -p"))
                            } catch (_: Exception) {
                            }
                        }
                    }
                } catch (_: Exception) {
                }
            }
        }

        private fun drawableToBase64(drawable: Drawable): String {
            val size = 96
            val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            drawable.setBounds(0, 0, size, size)
            drawable.draw(canvas)
            val out = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 90, out)
            return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
        }
    }
}
`
  );

  // 8. Resources: strings.xml, themes.xml, ic_launcher_tv.xml, tv_banner.xml
  zip.file(
    'app/src/main/res/values/strings.xml',
    `<resources>
    <string name="app_name">${safeAppName}</string>
</resources>
`
  );

  zip.file(
    'app/src/main/res/values/themes.xml',
    `<resources>
    <style name="Theme.TVLauncher" parent="Theme.AppCompat.NoActionBar">
        <item name="android:windowBackground">#070D19</item>
        <item name="android:windowFullscreen">true</item>
    </style>
</resources>
`
  );

  zip.file(
    'app/src/main/res/drawable/ic_launcher_tv.xml',
    `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#0B1220"
        android:pathData="M0,0h108v108h-108z" />
    <path
        android:fillColor="#0284C7"
        android:pathData="M24,32h60a6,6 0 0,1 6,6v34a6,6 0 0,1 -6,6h-60a6,6 0 0,1 -6,-6v-34a6,6 0 0,1 6,-6z" />
    <path
        android:fillColor="#0F172A"
        android:pathData="M28,37h52v30h-52z" />
    <path
        android:fillColor="#38BDF8"
        android:pathData="M42,84h24v4h-24z" />
    <path
        android:fillColor="#38BDF8"
        android:pathData="M47,45l16,7l-16,7z" />
</vector>
`
  );

  zip.file(
    'app/src/main/res/drawable/tv_banner.xml',
    `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="320dp"
    android:height="180dp"
    android:viewportWidth="320"
    android:viewportHeight="180">
    <path
        android:fillColor="#0B1220"
        android:pathData="M0,0h320v180h-320z" />
    <path
        android:fillColor="#1E3A5F"
        android:pathData="M0,0h320v90h-320z" />
    <path
        android:fillColor="#38BDF8"
        android:pathData="M116,52h88a8,8 0 0,1 8,8v52a8,8 0 0,1 -8,8h-88a8,8 0 0,1 -8,-8v-52a8,8 0 0,1 8,-8z" />
    <path
        android:fillColor="#070D19"
        android:pathData="M123,59h74v44h-74z" />
    <path
        android:fillColor="#38BDF8"
        android:pathData="M151,71l22,10l-22,10z" />
    <path
        android:fillColor="#38BDF8"
        android:pathData="M140,126h40v6h-40z" />
</vector>
`
  );

  // 9. Bundled Web UI (app/src/main/assets/index.html)
  zip.file('app/src/main/assets/index.html', buildStandaloneHtml(currentSettings, config));

  // 10. GitHub Actions CI workflow so user can build APK in the cloud in 2 mins!
  zip.file(
    '.github/workflows/build-apk.yml',
    `name: Build Android TV APK

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '8.7'

      - name: Build Debug APK
        run: gradle assembleDebug --no-daemon

      - name: Upload APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${config.appName.replace(/[^a-zA-Z0-9_-]/g, '') || 'TVLauncher'}-APK
          path: app/build/outputs/apk/debug/app-debug.apk
`
  );

  // 11. BUILD_APK.md
  zip.file(
    'README_BUILD_APK.md',
    `# ${config.appName} — Panduan Build & Install APK ke Android TV Box

Proyek ini berisi kode sumber Android TV native (Kotlin + WebView + Leanback Launcher + D-Pad Remote Control) untuk **${config.appName}** (\`${config.packageId}\`).

## Opsi 1: Build APK Otomatis via GitHub Actions (Tanpa Install Android Studio)
1. Upload seluruh isi folder ini ke repositori GitHub baru.
2. Buka tab **Actions** di GitHub, lalu jalankan workflow **Build Android TV APK** (atau otomatis berjalan saat push).
3. Tunggu ~2 menit hingga selesai, lalu unduh file **APK** dari bagian **Artifacts** di halaman workflow.

## Opsi 2: Build APK Lokal di PC via Android Studio / Gradle
1. Ekstrak folder ini dan buka dengan **Android Studio** (atau pastikan Android SDK API 34 + JDK 17 terpasang).
2. Jalankan di terminal:
   \`\`\`bash
   gradle assembleDebug
   \`\`\`
3. File APK hasil build tersedia di:
   \`app/build/outputs/apk/debug/app-debug.apk\`

## Cara Install ke Android TV Box
### Menggunakan ADB (WiFi / Kabel):
\`\`\`bash
adb connect <IP_ANDROID_TV_BOX>:5555
adb install -r app-debug.apk
\`\`\`
### Menggunakan Flashdisk USB:
1. Salin \`app-debug.apk\` ke flashdisk USB, colokkan ke Android TV Box.
2. Buka File Manager di TV Box dan pilih \`app-debug.apk\` untuk menginstal.
3. Aktifkan *Sumber Tidak Dikenal (Unknown Sources)* jika diminta.
${config.setAsHomeLauncher ? '\n4. Tekan tombol **Home** di remote TV untuk memilih **' + config.appName + '** sebagai Launcher utama.\n' : ''}
## Fitur Remote Control
- **Panah Atas / Bawah / Kiri / Kanan**: Navigasi spasial 2D antar kartu, daftar pertandingan, pengaturan, dan deretan aplikasi.
- **OK / Enter**: Membuka aplikasi atau memilih opsi.
- **Back**: Menutup menu pengaturan.
- **Tombol Menu**: Membuka pengaturan kapan saja.
`
  );

  return zip.generateAsync({ type: 'blob' });
}
