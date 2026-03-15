import { useState, useMemo, useRef } from "react";
import { PROVINCES, PROFESSIONS } from "./data.js";

// ─── RENK & TEMA ─────────────────────────────────────────────────────────────
const C = {
  navBg:"#0f2342", navBorder:"#1a3a6b", accent:"#1d4ed8", accentLight:"#dbeafe",
  bg:"#f8fafc", surface:"#ffffff", border:"#e2e8f0", borderMed:"#cbd5e1",
  text:"#0f172a", textSec:"#475569", textMuted:"#94a3b8",
  r1c:"#b91c1c", r1bg:"#fef2f2", r1br:"#fecaca",
  r2c:"#c2410c", r2bg:"#fff7ed", r2br:"#fed7aa",
  r3c:"#b45309", r3bg:"#fffbeb", r3br:"#fde68a",
  r4c:"#15803d", r4bg:"#f0fdf4", r4br:"#bbf7d0",
};

function getRisk(s) {
  if (s >= 65) return { label:"YÜKSEK",      c:C.r1c, bg:C.r1bg, br:C.r1br };
  if (s >= 45) return { label:"ORTA-YÜKSEK", c:C.r2c, bg:C.r2bg, br:C.r2br };
  if (s >= 25) return { label:"ORTA",        c:C.r3c, bg:C.r3bg, br:C.r3br };
  return               { label:"DÜŞÜK",      c:C.r4c, bg:C.r4bg, br:C.r4br };
}
function getMapColor(s) {
  if (s >= 60) return { fill:"#fca5a5", stroke:"#ef4444" };
  if (s >= 40) return { fill:"#fdba74", stroke:"#f97316" };
  if (s >= 25) return { fill:"#fde68a", stroke:"#d97706" };
  return               { fill:"#86efac", stroke:"#16a34a" };
}
function getPriority(idx, score) {
  if (idx === 0) return score >= 60
    ? { label:"Yüksek Öncelikli", c:C.r1c, bg:C.r1bg, br:C.r1br }
    : score >= 35
    ? { label:"Yüksek Öncelikli", c:C.r2c, bg:C.r2bg, br:C.r2br }
    : { label:"Yüksek Öncelikli", c:C.r3c, bg:C.r3bg, br:C.r3br };
  if (idx === 1) return score >= 50
    ? { label:"Öncelikli", c:C.r2c, bg:C.r2bg, br:C.r2br }
    : { label:"Öncelikli", c:C.r3c, bg:C.r3bg, br:C.r3br };
  return { label:"Orta", c:C.r3c, bg:C.r3bg, br:C.r3br };
}
const fmtW = w => w >= 1000000 ? (w/1000000).toFixed(1)+"M" : (w/1000).toFixed(0)+"K";
const fmtTL = v => v >= 1000000 ? (v/1000000).toFixed(1)+"M ₺" : (v/1000).toFixed(0)+"K ₺";

// ─── HARİTA koordinat dönüşümü ────────────────────────────────────────────────
const VW=1020,VH=480,LON0=25.5,LOND=20.5,LAT0=42.5,LATD=7.0;
const tx = lon => ((lon-LON0)/LOND)*VW;
const ty = lat => ((LAT0-lat)/LATD)*VH;

// ─── KURUM PRELİMİNER VERİSİ ─────────────────────────────────────────────────
const INSTITUTION_PRESETS = {
  "Çalışma ve Sosyal Güvenlik Bakanlığı":
    {"İdari Hizmetler":30,"Kamu":35,"Finans":15,"Hukuk Hizmetleri":10,"Hizmet":10},
  "SGK":
    {"Finans":25,"İdari Hizmetler":40,"Kamu":25,"Bilgi ve İletişim":10},
  "BTK":
    {"Bilgi ve İletişim":55,"Kamu":25,"İletişim":20},
  "MEB":
    {"Eğitim":75,"Kamu":15,"İdari Hizmetler":10},
  "Hazine ve Maliye Bakanlığı":
    {"Finans":50,"Kamu":30,"İdari Hizmetler":20},
  "Sağlık Bakanlığı":
    {"Sağlık":60,"Kamu":25,"İdari Hizmetler":15},
  "İŞKUR":
    {"Kamu":40,"İdari Hizmetler":30,"İş Hizmetleri":30},
  "KOSGEB":
    {"İş Hizmetleri":45,"Kamu":30,"Finans":25},
  "Büyükşehir Belediyesi":
    {"Kamu":35,"İdari Hizmetler":25,"İnşaat":20,"Hizmet":10,"Bilgi ve İletişim":10},
  "Devlet Üniversitesi":
    {"Eğitim":65,"Bilgi ve İletişim":15,"İdari Hizmetler":20},
  "ÖSYM":
    {"Kamu":40,"İdari Hizmetler":35,"Bilgi ve İletişim":25},
  "Hazine Müsteşarlığı/TCMB":
    {"Finans":60,"Kamu":25,"Bilgi ve İletişim":15},
};

// ─── EĞİTİM PLANI HESAPLAYICI ────────────────────────────────────────────────
function calcTrainingPlan(sectorWeights, headcount) {
  let totalW = 0, weightedScore = 0;
  const courseFreq = {};
  const riskDist = { h:0, mh:0, m:0, l:0 };

  Object.entries(sectorWeights).forEach(([sector, pct]) => {
    const profs = PROFESSIONS.filter(p => p.sector === sector);
    if (!profs.length) return;
    const w = pct / 100;
    totalW += w;
    profs.forEach(p => {
      const pw = w / profs.length;
      weightedScore += p.score * pw;
      if (p.score >= 65) riskDist.h  += pw;
      else if (p.score >= 45) riskDist.mh += pw;
      else if (p.score >= 25) riskDist.m  += pw;
      else riskDist.l += pw;
      p.courses.forEach((c, i) => {
        const weight = (5 - i) * pw;
        courseFreq[c] = (courseFreq[c] || 0) + weight;
      });
    });
  });

  if (totalW === 0) return null;

  const avgScore = Math.round(weightedScore / totalW);
  const normRisk = {
    h:  Math.round(riskDist.h / totalW * 100),
    mh: Math.round(riskDist.mh / totalW * 100),
    m:  Math.round(riskDist.m / totalW * 100),
    l:  Math.round(riskDist.l / totalW * 100),
  };

  const topCourses = Object.entries(courseFreq)
    .sort((a,b) => b[1]-a[1]).slice(0,10)
    .map(([course], i) => {
      const priority = i < 3 ? "Acil" : i < 6 ? "Yüksek" : "Orta";
      const hours    = i < 3 ? 16    : i < 6 ? 12      : 8;
      const pct      = i < 3 ? 85    : i < 6 ? 65      : 40;
      return { course, priority, hours, participants: Math.round(headcount * pct / 100) };
    });

  const totalPersonHours = topCourses.reduce((s,c) => s + c.hours * c.participants, 0);
  const budgetTL = totalPersonHours * 350;
  const maxHrs = topCourses.slice(0,3).reduce((s,c) => s + c.hours, 0);
  const duration = maxHrs > 40 ? "12 ay" : maxHrs > 24 ? "9 ay" : "6 ay";

  return { avgScore, normRisk, topCourses, totalPersonHours, budgetTL, duration, headcount };
}

// ─── PDF RAPOR ÜRETİCİSİ ────────────────────────────────────────────────────
function generateReport(plan, institutionName) {
  const top20 = [...PROFESSIONS].sort((a,b) => b.score-a.score).slice(0,20);
  const byScore = { h:0, mh:0, m:0, l:0 };
  PROFESSIONS.forEach(p => {
    if (p.score>=65) byScore.h++;
    else if (p.score>=45) byScore.mh++;
    else if (p.score>=25) byScore.m++;
    else byScore.l++;
  });
  const totalAtRisk = PROFESSIONS.filter(p=>p.score>=50).reduce((s,p)=>s+p.workers,0);

  const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<title>TAME 2026 — Türkiye Dijital Beceri Açığı Raporu</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;background:#fff}
  .cover{background:#0f2342;color:#fff;padding:60px 48px;min-height:100vh;display:flex;flex-direction:column;justify-content:space-between}
  .cover h1{font-size:42px;font-weight:900;line-height:1.2;margin:32px 0 16px;letter-spacing:-1px}
  .cover p{font-size:16px;color:#94a3b8;line-height:1.7;max-width:600px}
  .cover .meta{font-size:13px;color:#475569}
  .section{padding:40px 48px;border-bottom:1px solid #e2e8f0}
  .section h2{font-size:22px;font-weight:800;margin-bottom:8px;color:#0f172a}
  .section .sub{font-size:14px;color:#64748b;margin-bottom:24px}
  .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px}
  .stat-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px}
  .stat-card .val{font-size:28px;font-weight:900;font-family:monospace;line-height:1}
  .stat-card .lbl{font-size:12px;font-weight:600;margin-top:6px;color:#475569}
  .stat-card .sub{font-size:10px;color:#94a3b8;margin-top:3px}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th{background:#0f2342;color:#fff;padding:10px 14px;font-size:12px;text-align:left}
  td{padding:9px 14px;font-size:12px;border-bottom:1px solid #e2e8f0}
  tr:nth-child(even) td{background:#f8fafc}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700}
  .badge-h{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
  .badge-mh{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa}
  .badge-m{background:#fffbeb;color:#b45309;border:1px solid #fde68a}
  .badge-l{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
  .policy-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px 24px;margin-top:20px}
  .policy-box h3{font-size:15px;font-weight:800;color:#1d4ed8;margin-bottom:10px}
  .policy-box p{font-size:13px;color:#1e40af;line-height:1.7}
  .dist-bar{height:12px;background:#e2e8f0;border-radius:6px;overflow:hidden;display:flex;margin:8px 0}
  .footer-page{background:#0f2342;color:#475569;padding:20px 48px;font-size:11px;display:flex;justify-content:space-between}
  @media print{.page-break{page-break-before:always}.no-print{display:none}}
  ${plan ? `
  .plan-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:8px}
  .plan-row{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid #e2e8f0}
  ` : ''}
</style></head><body>

<!-- KAPAK -->
<div class="cover">
  <div>
    <div style="font-size:11px;color:#1d4ed8;letter-spacing:2px;font-weight:700;background:#1e3a5f;display:inline-block;padding:4px 12px;border-radius:4px;border:1px solid #1d4ed8">
      PİLOT ÇALIŞMA — MART 2026
    </div>
    <h1>Türkiye Dijital Beceri Açığı Raporu 2026</h1>
    <p>Anthropic'in Mart 2026 işgücü araştırması Türkiye NACE Rev.2 ve ISCO-08 standartlarıyla eşleştirildi. Bu rapor ${PROFESSIONS.length} meslek ve 81 il için kanıta dayalı AI maruziyet analizini sunmaktadır.</p>
    ${institutionName ? `<p style="color:#93c5fd;margin-top:12px;font-weight:600">Kurum: ${institutionName}</p>` : ''}
  </div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end">
    <div>
      <div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:4px">TAME</div>
      <div style="font-size:13px;color:#475569">Türkiye AI Maruziyet Endeksi</div>
      <div style="font-size:12px;color:#334155;margin-top:2px">Core9Tech Teknoloji A.Ş. · ASBÜ Sosyokent Teknopark, Ankara</div>
    </div>
    <div style="text-align:right;font-size:12px;color:#334155">
      <div>Kaynak: Anthropic Economic Index</div>
      <div>Massenkoff & McCrory (2026)</div>
    </div>
  </div>
</div>

<!-- YÖNETİCİ ÖZETİ -->
<div class="section">
  <h2>Yönetici Özeti</h2>
  <div class="sub">Türkiye İşgücünde AI Dönüşümü — Temel Bulgular</div>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="val" style="color:#0f172a">${PROFESSIONS.length}</div>
      <div class="lbl">Analiz Edilen Meslek</div>
      <div class="sub">NACE Rev.2 + ISCO-08 kodlu</div>
    </div>
    <div class="stat-card">
      <div class="val" style="color:#b91c1c">${fmtW(totalAtRisk)}</div>
      <div class="lbl">Yüksek Risk İşgücü</div>
      <div class="sub">Maruziyet skoru %50 ve üzeri</div>
    </div>
    <div class="stat-card">
      <div class="val" style="color:#c2410c">${byScore.h}</div>
      <div class="lbl">Kritik Meslek</div>
      <div class="sub">%65 üzeri gözlemlenen otomasyon</div>
    </div>
    <div class="stat-card">
      <div class="val" style="color:#1d4ed8">${Math.round(PROFESSIONS.reduce((s,p)=>s+p.score,0)/PROFESSIONS.length)}%</div>
      <div class="lbl">Ortalama Maruziyet</div>
      <div class="sub">${PROFESSIONS.length} meslek ağırlıksız ortalaması</div>
    </div>
  </div>
  
  <div style="margin-bottom:16px">
    <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1px;margin-bottom:8px">RİSK DAĞILIMI (${PROFESSIONS.length} meslek)</div>
    <div class="dist-bar">
      <div style="width:${Math.round(byScore.h/PROFESSIONS.length*100)}%;background:#b91c1c"></div>
      <div style="width:${Math.round(byScore.mh/PROFESSIONS.length*100)}%;background:#c2410c"></div>
      <div style="width:${Math.round(byScore.m/PROFESSIONS.length*100)}%;background:#b45309"></div>
      <div style="width:${Math.round(byScore.l/PROFESSIONS.length*100)}%;background:#15803d"></div>
    </div>
    <div style="display:flex;gap:16px;font-size:11px">
      <span style="color:#b91c1c"><strong>${byScore.h}</strong> Yüksek (%65+)</span>
      <span style="color:#c2410c"><strong>${byScore.mh}</strong> Orta-Yüksek (%45-64)</span>
      <span style="color:#b45309"><strong>${byScore.m}</strong> Orta (%25-44)</span>
      <span style="color:#15803d"><strong>${byScore.l}</strong> Düşük (%25 altı)</span>
    </div>
  </div>

  <div class="policy-box">
    <h3>Temel Politika Bulgusu</h3>
    <p>Türkiye işgücünün yaklaşık <strong>%${Math.round(PROFESSIONS.filter(p=>p.score>=45).length/PROFESSIONS.length*100)}'i</strong> orta-yüksek veya yüksek AI maruziyet kategorisinde yer almaktadır. Ancak teorik kapasite ile fiili kullanım arasındaki ortalama açık <strong>%${Math.round(PROFESSIONS.reduce((s,p)=>s+(p.theoretical-p.score),0)/PROFESSIONS.length)} puan</strong>tır — bu, eğitim yatırımı için somut bir fırsat penceresi sunmaktadır. BTK Akademi ve İŞKUR programlarının bu mesleklere odaklanması dijital dönüşümü yönetmek için kritik öneme sahiptir.</p>
  </div>
</div>

<!-- EN YÜKSEK RİSKLİ 20 MESLEK -->
<div class="section page-break">
  <h2>En Yüksek Riskli 20 Meslek</h2>
  <div class="sub">AI maruziyet skoru en yüksek meslekler — benimseme açığı ve çalışan büyüklüğüyle birlikte</div>
  <table>
    <thead>
      <tr><th>#</th><th>Meslek</th><th>ISCO-08</th><th>NACE</th><th>Risk</th><th>Skor</th><th>Teorik</th><th>Açık</th><th>İşgücü</th></tr>
    </thead>
    <tbody>
      ${top20.map((p,i) => {
        const risk = getRisk(p.score);
        const badgeCls = p.score>=65?'badge-h':p.score>=45?'badge-mh':p.score>=25?'badge-m':'badge-l';
        return `<tr>
          <td style="font-weight:700;color:#94a3b8">${String(i+1).padStart(2,'0')}</td>
          <td style="font-weight:600">${p.title}</td>
          <td style="font-family:monospace;color:#475569">${p.isco}</td>
          <td style="font-family:monospace;color:#475569">${p.nace||'-'}</td>
          <td><span class="badge ${badgeCls}">${risk.label}</span></td>
          <td style="font-family:monospace;font-weight:800;color:#b91c1c">%${p.score}</td>
          <td style="font-family:monospace;color:#475569">%${p.theoretical}</td>
          <td style="font-family:monospace;color:#f59e0b">%${p.gap||+(p.theoretical-p.score).toFixed(1)}</td>
          <td style="font-family:monospace">${fmtW(p.workers)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>

${plan ? `
<!-- EĞİTİM PLANI -->
<div class="section page-break">
  <h2>Eğitim Planı${institutionName ? ` — ${institutionName}` : ''}</h2>
  <div class="sub">Kuruma özgü AI beceri dönüşüm programı · ${plan.headcount.toLocaleString('tr')} çalışan hedefi</div>
  
  <div class="stats-grid">
    <div class="stat-card">
      <div class="val" style="color:#b91c1c">%${plan.avgScore}</div>
      <div class="lbl">Ortalama Risk Skoru</div>
      <div class="sub">Kurum işgücü profili</div>
    </div>
    <div class="stat-card">
      <div class="val" style="color:#1d4ed8">${plan.topCourses.length}</div>
      <div class="lbl">Önerilen Eğitim</div>
      <div class="sub">Öncelik sıralamalı program</div>
    </div>
    <div class="stat-card">
      <div class="val" style="color:#0f172a">${(plan.totalPersonHours/1000).toFixed(0)}K</div>
      <div class="lbl">Toplam Kişi-Saat</div>
      <div class="sub">Tahmini toplam eğitim yükü</div>
    </div>
    <div class="stat-card">
      <div class="val" style="color:#15803d">${plan.duration}</div>
      <div class="lbl">Tahmini Süre</div>
      <div class="sub">Program tamamlama hedefi</div>
    </div>
  </div>

  <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1px;margin-bottom:12px">ÖNERİLEN EĞİTİM PROGRAMI</div>
  <table>
    <thead><tr><th>#</th><th>Eğitim Başlığı</th><th>Öncelik</th><th>Süre (saat)</th><th>Katılımcı</th><th>Toplam Saat</th></tr></thead>
    <tbody>
      ${plan.topCourses.map((c,i) => {
        const cls = c.priority==='Acil'?'badge-h':c.priority==='Yüksek'?'badge-mh':'badge-m';
        return `<tr>
          <td style="font-weight:700;color:#94a3b8">${String(i+1).padStart(2,'0')}</td>
          <td style="font-weight:600">${c.course}</td>
          <td><span class="badge ${cls}">${c.priority}</span></td>
          <td style="font-family:monospace;text-align:center">${c.hours}</td>
          <td style="font-family:monospace;text-align:center">${c.participants.toLocaleString('tr')}</td>
          <td style="font-family:monospace;text-align:center">${(c.hours*c.participants).toLocaleString('tr')}</td>
        </tr>`;
      }).join('')}
      <tr style="background:#f8fafc;font-weight:700">
        <td colspan="4" style="text-align:right;font-weight:700;color:#475569">TOPLAM</td>
        <td style="font-family:monospace;text-align:center">${plan.headcount.toLocaleString('tr')}</td>
        <td style="font-family:monospace;text-align:center">${plan.totalPersonHours.toLocaleString('tr')}</td>
      </tr>
    </tbody>
  </table>

  <div class="policy-box" style="margin-top:20px">
    <h3>Tahmini Bütçe</h3>
    <p><strong>${fmtTL(plan.budgetTL)}</strong> — Kişi başı ortalama 350 ₺/saat standart eğitim maliyeti üzerinden hesaplanmıştır (KDV hariç). 4734 sayılı Kamu İhale Kanunu 22/d maddesi kapsamında doğrudan temin eşiği (1.021.827 ₺) gözetilerek modüler paketler halinde planlanması önerilir.</p>
  </div>
</div>` : ''}

<!-- BÖLGESEL ANALİZ -->
<div class="section page-break">
  <h2>Bölgesel Maruziyet Analizi</h2>
  <div class="sub">81 il AI risk dağılımı — baskın sektör ağırlıklı hesaplama</div>
  <table>
    <thead><tr><th>Sıra</th><th>İl</th><th>Baskın Sektör</th><th>Risk Skoru</th><th>Seviye</th></tr></thead>
    <tbody>
      ${[...PROVINCES].sort((a,b)=>b.score-a.score).slice(0,20).map((p,i) => {
        const col = getMapColor(p.score);
        return `<tr>
          <td style="font-weight:700;color:#94a3b8">${String(i+1).padStart(2,'0')}</td>
          <td style="font-weight:600">${p.name}</td>
          <td style="color:#475569">${p.sector}</td>
          <td style="font-family:monospace;font-weight:800;color:${col.stroke}">%${p.score}</td>
          <td>${p.score>=60?'<span class="badge badge-h">YÜKSEK</span>':p.score>=40?'<span class="badge badge-mh">ORTA-Y.</span>':'<span class="badge badge-m">ORTA</span>'}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  <div class="policy-box">
    <h3>Bölgesel Politika Notu</h3>
    <p>İstanbul (%71), Ankara (%58) ve İzmir (%52) başta olmak üzere batı illeri finans ve BİT sektörlerinin yoğunluğu nedeniyle yüksek maruziyet sergiliyken, Doğu Anadolu illeri tarım ağırlıklı yapı nedeniyle daha düşük skorlar göstermektedir. BTK Akademi eğitimlerinin coğrafi hedeflenmesinde bu fark gözetilmelidir: batıda dönüşüm programları, doğuda temel dijital okuryazarlık programları öncelik kazanmalıdır.</p>
  </div>
</div>

<!-- KAYNAKÇA -->
<div class="section">
  <h2>Kaynakça ve Metodoloji</h2>
  <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
    ${["Massenkoff, M. & McCrory, E. (2026). Labor Market Impacts of AI: A New Measure and Early Evidence. Anthropic, March 5, 2026.",
       "Anthropic Economic Index Dataset. huggingface.co/datasets/Anthropic/EconomicIndex",
       "TÜİK Hanehalkı İşgücü Araştırması (2024). Türkiye İstatistik Kurumu.",
       "ISCO-08 Uluslararası Meslek Standart Sınıflaması. ILO / TÜİK Uyarlaması.",
       "NACE Rev.2 Ekonomik Faaliyet Sınıflaması. EUROSTAT / TÜİK.",
       "BLS Employment Projections 2024–2034. U.S. Bureau of Labor Statistics."
      ].map(r => `<div style="font-size:12px;color:#475569;padding-left:12px;border-left:2px solid #e2e8f0;line-height:1.6">${r}</div>`).join('')}
  </div>
</div>

<div class="footer-page">
  <span>TAME — Türkiye AI Maruziyet Endeksi · Core9Tech Teknoloji A.Ş. · ASBÜ Sosyokent Teknopark, Ankara</span>
  <span>Pilot Demo v3.0 · Mart 2026 · core9tech.com</span>
</div>

<script>window.onload = () => window.print();</script>
</body></html>`;
  return html;
}

// ─── MODAL: SKOR ─────────────────────────────────────────────────────────────
function ScoreModal({ onClose }) {
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(15,35,66,0.55)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,width:"100%",maxWidth:640,maxHeight:"88vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.18)" }}>
        <div style={{ padding:"24px 28px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
          <div>
            <h2 style={{ fontSize:18,fontWeight:700,color:C.text,marginBottom:4 }}>Maruziyet Skoru Nasıl Hesaplanır?</h2>
            <p style={{ fontSize:13,color:C.textMuted,margin:0 }}>Observed Exposure Metriği — Massenkoff & McCrory, Anthropic (Mart 2026)</p>
          </div>
          <button onClick={onClose} style={{ background:"none",border:`1px solid ${C.border}`,borderRadius:6,width:32,height:32,cursor:"pointer",fontSize:18,color:C.textSec,lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:"24px 28px" }}>
          <div style={{ background:C.accentLight,border:"1px solid #bfdbfe",borderRadius:8,padding:"14px 16px",marginBottom:24 }}>
            <p style={{ fontSize:13,color:"#1e40af",lineHeight:1.75,margin:0 }}><strong>Temel soru:</strong> Bir meslekte görevler, büyük dil modelleri tarafından ne ölçüde <em>fiilen</em> gerçekleştiriliyor? Bu skor, teorik potansiyeli değil, gerçek dünya kullanımını ölçer.</p>
          </div>
          {[
            { n:"01", color:"#1d4ed8", title:"Teorik AI Kapasitesi", body:"Bir mesleğin görevlerinin yapay zeka tarafından teorik olarak ne kadarının gerçekleştirilebileceğini ölçer. O*NET iş tanımları LLM yetkinlik matrisi ile çapraz eşleştirilerek hesaplanır." },
            { n:"02", color:"#7c3aed", title:"Fiili Kullanım Oranı (Claude API Verisi)", body:"Anthropic'in Claude API'nin gerçek dünya kullanım örüntülerinden türetilir. 'Teorik yapabilir' ile 'pratikte kullanılıyor' arasındaki fark ortaya çıkar." },
            { n:"03", color:"#dc2626", title:"Gözlemlenen Maruziyet = Sonuç Skoru", body:"Teorik Kapasite × Fiili Kullanım Yoğunluğu. Örneğin programcılar için teorik kapasite %94 iken gözlemlenen maruziyet %74.5 — pratikte henüz tam kapasite kullanılmıyor." },
          ].map(s => (
            <div key={s.n} style={{ display:"flex",gap:14,marginBottom:16 }}>
              <div style={{ width:32,height:32,borderRadius:8,background:s.color,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0,fontFamily:"monospace" }}>{s.n}</div>
              <div style={{ background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px",flex:1 }}>
                <div style={{ fontWeight:700,fontSize:13,color:C.text,marginBottom:6 }}>{s.title}</div>
                <div style={{ fontSize:12,color:C.textSec,lineHeight:1.75 }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MODAL: HERO STAT ────────────────────────────────────────────────────────
function HeroModal({ type, stats, onClose }) {
  if (!type) return null;
  const highRiskProfs = PROFESSIONS.filter(p=>p.score>=65).sort((a,b)=>b.score-a.score);
  const workforceProfs = PROFESSIONS.filter(p=>p.score>=50).sort((a,b)=>b.score-a.score);
  const sectorMap = {};
  workforceProfs.forEach(p => {
    if (!sectorMap[p.sector]) sectorMap[p.sector]={workers:0,count:0,maxScore:0};
    sectorMap[p.sector].workers+=p.workers; sectorMap[p.sector].count+=1;
    sectorMap[p.sector].maxScore=Math.max(sectorMap[p.sector].maxScore,p.score);
  });
  const topSectors = Object.entries(sectorMap).map(([name,d])=>({name,...d})).sort((a,b)=>b.workers-a.workers).slice(0,8);

  const titles = { workforce:"Yüksek Risk İşgücü — Kimler Etkileniyor?", critical:"Kritik Meslekler — %65 Üzeri Maruziyet", avg:"Ortalama Skor Nasıl Hesaplandı?" };
  const subtitles = {
    workforce:`Türkiye'de ${fmtW(stats.atRisk)} çalışan AI dönüşümünün yoğun baskısı altında`,
    critical:`${highRiskProfs.length} meslek grubunda görevlerin büyük çoğunluğu AI tarafından üstleniliyor`,
    avg:`${PROFESSIONS.length} mesleğin gözlemlenen maruziyet skorlarının ağırlıksız ortalaması`,
  };

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(15,35,66,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,width:"100%",maxWidth:type==="critical"?780:660,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 28px 80px rgba(0,0,0,0.22)" }}>
        <div style={{ padding:"22px 26px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",background:"#0f2342",borderRadius:"14px 14px 0 0" }}>
          <div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"white",marginBottom:4 }}>{titles[type]}</h2>
            <p style={{ fontSize:12,color:"#93c5fd",margin:0 }}>{subtitles[type]}</p>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,width:32,height:32,cursor:"pointer",fontSize:18,color:"white",lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:"24px 26px" }}>
          {type==="workforce" && (<>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:22 }}>
              {[
                { val:fmtW(stats.atRisk), label:"Toplam Riskli İşgücü", desc:"Maruziyet skoru %50+", c:"#b91c1c", bg:"#fef2f2", br:"#fecaca" },
                { val:fmtW(PROFESSIONS.filter(p=>p.score>=65).reduce((s,p)=>s+p.workers,0)), label:"Kritik Risk İşgücü", desc:"Maruziyet skoru %65+", c:"#c2410c", bg:"#fff7ed", br:"#fed7aa" },
                { val:PROFESSIONS.filter(p=>p.score>=50).length+"", label:"Etkilenen Meslek", desc:`${PROFESSIONS.length} mesleğin ${Math.round(PROFESSIONS.filter(p=>p.score>=50).length/PROFESSIONS.length*100)}%'i`, c:"#b45309", bg:"#fffbeb", br:"#fde68a" },
              ].map(s => (
                <div key={s.label} style={{ background:s.bg,border:`1px solid ${s.br}`,borderRadius:10,padding:"14px 16px" }}>
                  <div style={{ fontSize:24,fontWeight:900,color:s.c,fontFamily:"monospace",lineHeight:1 }}>{s.val}</div>
                  <div style={{ fontSize:12,fontWeight:700,color:s.c,marginTop:5 }}>{s.label}</div>
                  <div style={{ fontSize:10,color:C.textMuted,marginTop:2 }}>{s.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:10 }}>SEKTÖR BAZINDA ETKİLENEN İŞGÜCÜ</div>
            {topSectors.map(s => {
              const col = s.maxScore>=65?{c:C.r1c,bg:C.r1bg,br:C.r1br}:{c:C.r2c,bg:C.r2bg,br:C.r2br};
              const pct = Math.round(s.workers/stats.atRisk*100);
              return (
                <div key={s.name} style={{ background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",marginBottom:6 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5 }}>
                    <div><span style={{ fontSize:13,fontWeight:600,color:C.text }}>{s.name}</span><span style={{ fontSize:10,color:C.textMuted,marginLeft:8 }}>{s.count} meslek</span></div>
                    <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                      <span style={{ fontSize:10,fontWeight:700,color:col.c,background:col.bg,border:`1px solid ${col.br}`,borderRadius:3,padding:"2px 6px" }}>max %{s.maxScore}</span>
                      <span style={{ fontSize:13,fontWeight:800,color:C.text,fontFamily:"monospace" }}>{fmtW(s.workers)}</span>
                    </div>
                  </div>
                  <div style={{ height:5,background:C.border,borderRadius:3,overflow:"hidden" }}>
                    <div style={{ height:"100%",width:`${pct}%`,background:col.c,borderRadius:3 }}/>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop:16,background:C.r1bg,border:`1px solid ${C.r1br}`,borderRadius:10,padding:"14px 16px" }}>
              <div style={{ fontSize:11,fontWeight:700,color:C.r1c,letterSpacing:1,marginBottom:10 }}>EN YÜKSEK MARUZIYET — İLK 5 MESLEK</div>
              {workforceProfs.slice(0,5).map(p => (
                <div key={p.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,0.6)",borderRadius:6,padding:"8px 12px",marginBottom:5 }}>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,color:C.text }}>{p.title}</div>
                    <div style={{ fontSize:10,color:C.textMuted }}>{p.sector} · {fmtW(p.workers)} çalışan</div>
                  </div>
                  <div style={{ fontSize:16,fontWeight:900,color:C.r1c,fontFamily:"monospace" }}>%{p.score}</div>
                </div>
              ))}
            </div>
          </>)}
          {type==="critical" && (<>
            <div style={{ background:C.r1bg,border:`1px solid ${C.r1br}`,borderRadius:10,padding:"12px 16px",marginBottom:18 }}>
              <p style={{ fontSize:13,color:C.r1c,lineHeight:1.7,margin:0 }}><strong>%65 eşiği:</strong> Bu grupta görevlerin büyük çoğunluğu Claude API verilerine göre AI tarafından aktif olarak üstleniliyor.</p>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:7 }}>
              {highRiskProfs.map(p => (
                <div key={p.id} style={{ background:C.surface,border:`1px solid ${C.r1br}`,borderLeft:`3px solid ${C.r1c}`,borderRadius:8,padding:"10px 13px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <div style={{ flex:1,minWidth:0,marginRight:10 }}>
                    <div style={{ fontSize:12,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.title}</div>
                    <div style={{ fontSize:10,color:C.textMuted,marginTop:2 }}>{p.sector}</div>
                    <div style={{ height:3,background:C.bg,borderRadius:2,marginTop:5,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${p.score}%`,background:C.r1c,borderRadius:2 }}/>
                    </div>
                  </div>
                  <div style={{ textAlign:"right",flexShrink:0 }}>
                    <div style={{ fontSize:16,fontWeight:900,color:C.r1c,fontFamily:"monospace" }}>%{p.score}</div>
                    <div style={{ fontSize:9,color:C.textMuted }}>Teo: %{p.theoretical}</div>
                  </div>
                </div>
              ))}
            </div>
          </>)}
          {type==="avg" && (<>
            <div style={{ background:"#0f2342",borderRadius:10,padding:"18px 20px",marginBottom:22,textAlign:"center" }}>
              <div style={{ fontSize:11,color:"#93c5fd",letterSpacing:1,marginBottom:8 }}>HESAPLAMA FORMÜLÜ</div>
              <div style={{ fontSize:20,fontWeight:900,color:"white",fontFamily:"monospace",letterSpacing:2 }}>Σ(skorlar) ÷ {PROFESSIONS.length}</div>
              <div style={{ fontSize:13,color:"#94a3b8",marginTop:8 }}>= {PROFESSIONS.reduce((s,p)=>s+p.score,0).toFixed(1)} ÷ {PROFESSIONS.length} = <span style={{ color:"#fbbf24",fontWeight:800 }}>%{stats.avg}</span></div>
            </div>
            {[
              { label:"Yüksek (%65+)", count:PROFESSIONS.filter(p=>p.score>=65).length, c:C.r1c, bg:C.r1bg, br:C.r1br },
              { label:"Orta-Yüksek (%45–64)", count:PROFESSIONS.filter(p=>p.score>=45&&p.score<65).length, c:C.r2c, bg:C.r2bg, br:C.r2br },
              { label:"Orta (%25–44)", count:PROFESSIONS.filter(p=>p.score>=25&&p.score<45).length, c:C.r3c, bg:C.r3bg, br:C.r3br },
              { label:"Düşük (%25 altı)", count:PROFESSIONS.filter(p=>p.score<25).length, c:C.r4c, bg:C.r4bg, br:C.r4br },
            ].map(row => {
              const pct = Math.round(row.count/PROFESSIONS.length*100);
              return (
                <div key={row.label} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4 }}>
                    <span style={{ color:row.c,fontWeight:600 }}>{row.label}</span>
                    <span style={{ fontFamily:"monospace",color:C.text,fontWeight:700 }}>{row.count} meslek (%{pct})</span>
                  </div>
                  <div style={{ height:8,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden" }}>
                    <div style={{ height:"100%",width:`${pct}%`,background:row.c,borderRadius:4 }}/>
                  </div>
                </div>
              );
            })}
          </>)}
        </div>
      </div>
    </div>
  );
}

// ─── 1. ÖNCELİK MATRİSİ ─────────────────────────────────────────────────────
function PriorityMatrix() {
  const [tooltip, setTooltip] = useState(null);
  const [activeQ, setActiveQ] = useState(null);
  const svgRef = useRef(null);

  const SVG_W=820, SVG_H=480, ML=72, MR=16, MT=28, MB=50;
  const PW = SVG_W-ML-MR, PH = SVG_H-MT-MB;
  const SCORE_DIV = 45, WORKER_DIV = 100000;
  const LOG_MIN = Math.log10(1000), LOG_MAX = Math.log10(6000000);

  const xScale = s => ML + (s/100)*PW;
  const yScale = w => {
    const lw = Math.log10(Math.max(w,1000));
    return MT + PH - ((lw-LOG_MIN)/(LOG_MAX-LOG_MIN))*PH;
  };
  const xDiv = xScale(SCORE_DIV);
  const yDiv = yScale(WORKER_DIV);

  const getQ = (score, workers) => {
    const hr = score >= SCORE_DIV, hw = workers >= WORKER_DIV;
    if (hr && hw) return "urgent";
    if (hr && !hw) return "strategy";
    if (!hr && hw) return "opportunity";
    return "watch";
  };

  const QCfg = {
    urgent:      { label:"ACİL MÜDAHALE",     c:"#b91c1c", bg:"rgba(254,242,242,0.65)", desc:"Yüksek risk + geniş kitle → En büyük bütçe önceliği" },
    strategy:    { label:"STRATEJİK",          c:"#c2410c", bg:"rgba(255,247,237,0.65)", desc:"Yüksek risk + niş kitle → Uzmanlaşmış program gerekli" },
    opportunity: { label:"DÖNÜŞÜM FIRSATI",   c:"#15803d", bg:"rgba(240,253,244,0.65)", desc:"Düşük risk + geniş kitle → Geniş kapsamlı farkındalık" },
    watch:       { label:"İZLE",               c:"#475569", bg:"rgba(248,250,252,0.65)", desc:"Düşük risk + niş kitle → Düşük aciliyet" },
  };

  const dotColor = s => s>=65?C.r1c:s>=45?C.r2c:s>=25?C.r3c:C.r4c;

  const handleMouseMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) / rect.width * SVG_W;
    const svgY = (e.clientY - rect.top)  / rect.height * SVG_H;
    // Find nearest profession
    let best = null, bestDist = 16;
    PROFESSIONS.forEach(p => {
      const px = xScale(p.score), py = yScale(p.workers);
      const d = Math.hypot(svgX-px, svgY-py);
      if (d < bestDist) { bestDist = d; best = p; }
    });
    setTooltip(best ? { p:best, x:e.clientX, y:e.clientY } : null);
  };

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <h2 style={{ fontSize:20,fontWeight:800,color:C.text,marginBottom:6 }}>Risk × İşgücü Öncelik Matrisi</h2>
        <p style={{ fontSize:14,color:C.textSec,lineHeight:1.7 }}>
          Her mesleğin AI maruziyet skoru (yatay) ve çalışan büyüklüğü (dikey, log ölçek) birlikte gösteriliyor.
          <strong> Sağ üst kadran</strong> — acil eğitim müdahalesi gerektiren meslekleri işaret ediyor.
          Kadrana tıklayarak filtreleyin.
        </p>
      </div>

      {/* Kadran filtre butonları */}
      <div style={{ display:"flex",gap:8,marginBottom:14,flexWrap:"wrap" }}>
        {Object.entries(QCfg).map(([key,cfg]) => {
          const cnt = PROFESSIONS.filter(p=>getQ(p.score,p.workers)===key).length;
          return (
            <button key={key} onClick={()=>setActiveQ(activeQ===key?null:key)} style={{
              padding:"6px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700,
              border:`1px solid ${cfg.c}66`,
              background:activeQ===key?cfg.c:"white",
              color:activeQ===key?"white":cfg.c,
              transition:"all 0.15s"
            }}>{cfg.label} · {cnt}</button>
          );
        })}
        {activeQ && <button onClick={()=>setActiveQ(null)} style={{ padding:"6px 10px",borderRadius:6,cursor:"pointer",fontSize:11,border:`1px solid ${C.border}`,background:C.bg,color:C.textMuted }}>Tümü</button>}
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 290px",gap:16,alignItems:"start" }}>
        {/* SVG Scatter Plot */}
        <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:12,overflow:"hidden" }}>
          <svg ref={svgRef} viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width:"100%",display:"block",cursor:"crosshair" }}
            onMouseMove={handleMouseMove} onMouseLeave={()=>setTooltip(null)}>

            {/* Kadran arka planları */}
            <rect x={xDiv} y={MT}     width={SVG_W-MR-xDiv} height={yDiv-MT}          fill={QCfg.urgent.bg}      rx={3}/>
            <rect x={ML}   y={MT}     width={xDiv-ML}         height={yDiv-MT}          fill={QCfg.opportunity.bg} rx={3}/>
            <rect x={xDiv} y={yDiv}   width={SVG_W-MR-xDiv} height={MT+PH-yDiv}        fill={QCfg.strategy.bg}    rx={3}/>
            <rect x={ML}   y={yDiv}   width={xDiv-ML}         height={MT+PH-yDiv}        fill={QCfg.watch.bg}       rx={3}/>

            {/* Bölücü çizgiler */}
            <line x1={xDiv} y1={MT} x2={xDiv} y2={MT+PH} stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="6,3"/>
            <line x1={ML}   y1={yDiv} x2={SVG_W-MR} y2={yDiv} stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="6,3"/>

            {/* Kadran etiketleri */}
            <text x={xDiv+10} y={MT+18} fontSize={9.5} fontWeight="700" fill="#b91c1c" fontFamily="monospace" style={{pointerEvents:"none"}}>ACİL MÜDAHALE ▶</text>
            <text x={ML+10}  y={MT+18} fontSize={9.5} fontWeight="700" fill="#15803d" fontFamily="monospace" style={{pointerEvents:"none"}}>DÖNÜŞÜM FIRSATI ▶</text>
            <text x={xDiv+10} y={MT+PH-10} fontSize={9.5} fontWeight="700" fill="#c2410c" fontFamily="monospace" style={{pointerEvents:"none"}}>STRATEJİK ▶</text>
            <text x={ML+10}  y={MT+PH-10} fontSize={9.5} fontWeight="700" fill="#475569" fontFamily="monospace" style={{pointerEvents:"none"}}>İZLE ▶</text>

            {/* Y ekseni etiketleri */}
            {[1500,10000,100000,1000000,5000000].map(w => {
              const y = yScale(w);
              const lbl = w>=1000000?(w/1000000).toFixed(1)+"M":w>=1000?(w/1000).toFixed(0)+"K":w;
              return (
                <g key={w}>
                  <line x1={ML-4} y1={y} x2={ML} y2={y} stroke={C.textMuted} strokeWidth={0.7}/>
                  <text x={ML-6} y={y+3} fontSize={7.5} fill={C.textMuted} textAnchor="end" fontFamily="monospace">{lbl}</text>
                </g>
              );
            })}

            {/* X ekseni etiketleri */}
            {[0,25,45,65,100].map(s => {
              const x = xScale(s);
              return (
                <g key={s}>
                  <line x1={x} y1={MT+PH} x2={x} y2={MT+PH+4} stroke={C.textMuted} strokeWidth={0.7}/>
                  <text x={x} y={MT+PH+14} fontSize={7.5} fill={C.textMuted} textAnchor="middle" fontFamily="monospace">%{s}</text>
                </g>
              );
            })}
            <text x={ML+PW/2} y={SVG_H-4} fontSize={9.5} fill={C.textMuted} textAnchor="middle" fontFamily="sans-serif">AI Maruziyet Skoru →</text>
            <text x={13} y={MT+PH/2} fontSize={9.5} fill={C.textMuted} textAnchor="middle" fontFamily="sans-serif" transform={`rotate(-90 13 ${MT+PH/2})`}>Çalışan Sayısı (log) ↑</text>

            {/* Noktalar */}
            {PROFESSIONS.map(p => {
              const q = getQ(p.score, p.workers);
              const dimmed = activeQ && activeQ !== q;
              return (
                <circle key={p.id}
                  cx={xScale(p.score)} cy={yScale(p.workers)} r={4}
                  fill={dotColor(p.score)} opacity={dimmed?0.08:0.72}
                  style={{ transition:"opacity 0.18s" }}
                />
              );
            })}
          </svg>
        </div>

        {/* Sağ panel */}
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {Object.entries(QCfg).map(([key,cfg]) => {
            const profs = PROFESSIONS.filter(p=>getQ(p.score,p.workers)===key).sort((a,b)=>b.workers-a.workers);
            const totalW = profs.reduce((s,p)=>s+p.workers,0);
            const isActive = activeQ===key;
            return (
              <div key={key} onClick={()=>setActiveQ(isActive?null:key)} style={{
                background:isActive?"white":C.bg, border:`1px solid ${isActive?cfg.c:C.border}`,
                borderLeft:`3px solid ${cfg.c}`, borderRadius:10, padding:"11px 14px",
                cursor:"pointer", transition:"all 0.15s",
                boxShadow:isActive?"0 2px 12px rgba(0,0,0,0.08)":"none"
              }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4 }}>
                  <div style={{ fontSize:12,fontWeight:800,color:cfg.c }}>{cfg.label}</div>
                  <span style={{ fontSize:11,fontFamily:"monospace",fontWeight:700,color:cfg.c }}>{profs.length}</span>
                </div>
                <div style={{ fontSize:10,color:C.textMuted,marginBottom:5,lineHeight:1.4 }}>{cfg.desc}</div>
                <div style={{ fontSize:12,fontWeight:700,color:C.text }}>{fmtW(totalW)} çalışan</div>
                {isActive && (
                  <div style={{ marginTop:10,maxHeight:200,overflowY:"auto" }}>
                    {profs.slice(0,10).map(p => (
                      <div key={p.id} style={{ fontSize:11,color:C.textSec,padding:"4px 0",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between" }}>
                        <span style={{ fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70%" }}>{p.title}</span>
                        <span style={{ color:cfg.c,fontFamily:"monospace",flexShrink:0 }}>%{p.score}</span>
                      </div>
                    ))}
                    {profs.length>10 && <div style={{ fontSize:10,color:C.textMuted,fontStyle:"italic",paddingTop:4 }}>+{profs.length-10} meslek daha</div>}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"10px 12px" }}>
            <div style={{ fontSize:10,fontWeight:700,color:C.accent,marginBottom:5 }}>BÜTÇE ÖNCELIK SIRASI</div>
            <div style={{ fontSize:11,color:"#1e40af",lineHeight:1.7 }}>
              1. Acil Müdahale — en büyük bütçe<br/>2. Stratejik — yoğun uzmanlaşma<br/>3. Dönüşüm Fırsatı — geniş kapsam<br/>4. İzle — düşük aciliyet
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{ position:"fixed",left:tooltip.x+14,top:tooltip.y-10,background:C.navBg,color:"white",borderRadius:8,padding:"10px 14px",fontSize:12,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.3)",pointerEvents:"none",maxWidth:230 }}>
          <div style={{ fontWeight:700,marginBottom:3 }}>{tooltip.p.title}</div>
          <div style={{ color:"#93c5fd",fontSize:11,marginBottom:6 }}>{tooltip.p.sector}</div>
          <div style={{ display:"flex",gap:12 }}>
            <span>Skor: <strong style={{ color:"#fca5a5" }}>%{tooltip.p.score}</strong></span>
            <span>Çalışan: <strong style={{ color:"#86efac" }}>{fmtW(tooltip.p.workers)}</strong></span>
          </div>
          <div style={{ color:"#f59e0b",fontSize:10,marginTop:4,fontWeight:600 }}>
            {QCfg[getQ(tooltip.p.score,tooltip.p.workers)].label}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 2. EĞİTİM HESAPLAYICISI ─────────────────────────────────────────────────
function EducationCalculator() {
  const [institution, setInstitution] = useState("");
  const [headcount, setHeadcount] = useState(500);
  const [customMode, setCustomMode] = useState(false);
  const [customWeights, setCustomWeights] = useState({});
  const [showPlan, setShowPlan] = useState(false);

  const allSectors = useMemo(()=>[...new Set(PROFESSIONS.map(p=>p.sector))].sort(),[]);

  const activeWeights = customMode ? customWeights : (institution ? INSTITUTION_PRESETS[institution] : {});
  const weightTotal = Object.values(activeWeights).reduce((s,v)=>s+v,0);

  const plan = useMemo(()=>showPlan?calcTrainingPlan(activeWeights,headcount):null,[showPlan,activeWeights,headcount]);

  const handleDownload = () => {
    const html = generateReport(plan, institution || "Özel Kurum");
    const blob = new Blob([html],{type:"text/html;charset=utf-8"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href=url; a.download="TAME_2026_Rapor.html"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <h2 style={{ fontSize:20,fontWeight:800,color:C.text,marginBottom:6 }}>Eğitim Açığı Hesaplayıcısı</h2>
        <p style={{ fontSize:14,color:C.textSec,lineHeight:1.7 }}>Kurumunuzun sektör profilini ve hedef çalışan sayısını girin. Platform, öncelikli eğitim programını, toplam saat ihtiyacını ve tahmini bütçeyi otomatik hesaplar.</p>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"start" }}>
        {/* Sol: Giriş formu */}
        <div>
          {/* Kurum seçimi */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:8 }}>KURUM / KAPSAM</div>
            <div style={{ display:"flex",gap:8,marginBottom:8 }}>
              <button onClick={()=>{setCustomMode(false);setShowPlan(false);}} style={{ fontSize:12,padding:"5px 12px",borderRadius:6,border:`1px solid ${!customMode?C.accent:C.border}`,background:!customMode?C.accentLight:"white",color:!customMode?C.accent:C.textSec,cursor:"pointer",fontWeight:!customMode?700:400 }}>Hazır Profil</button>
              <button onClick={()=>{setCustomMode(true);setShowPlan(false);}} style={{ fontSize:12,padding:"5px 12px",borderRadius:6,border:`1px solid ${customMode?C.accent:C.border}`,background:customMode?C.accentLight:"white",color:customMode?C.accent:C.textSec,cursor:"pointer",fontWeight:customMode?700:400 }}>Özel Tanım</button>
            </div>
            {!customMode ? (
              <select value={institution} onChange={e=>{setInstitution(e.target.value);setShowPlan(false);}} style={{ width:"100%",fontSize:13,padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,color:C.text,cursor:"pointer" }}>
                <option value="">— Kurum seçin —</option>
                {Object.keys(INSTITUTION_PRESETS).map(k=><option key={k} value={k}>{k}</option>)}
              </select>
            ) : (
              <div style={{ background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:12 }}>
                <div style={{ fontSize:11,color:C.textMuted,marginBottom:8 }}>Sektör ağırlıklarını girin (toplam 100 olmalı)</div>
                {allSectors.slice(0,12).map(sec => (
                  <div key={sec} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                    <span style={{ fontSize:11,color:C.text,minWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{sec}</span>
                    <input type="number" min={0} max={100} value={customWeights[sec]||""} placeholder="0"
                      onChange={e=>setCustomWeights(p=>({...p,[sec]:parseInt(e.target.value)||0}))}
                      style={{ width:60,padding:"3px 6px",border:`1px solid ${C.border}`,borderRadius:4,fontSize:12,textAlign:"center" }}/>
                    <span style={{ fontSize:11,color:C.textMuted }}>%</span>
                  </div>
                ))}
                <div style={{ fontSize:11,marginTop:8,fontWeight:700,color:weightTotal===100?C.r4c:weightTotal>100?"#b91c1c":"#b45309" }}>
                  Toplam: {weightTotal}% {weightTotal===100?"✓":weightTotal>100?"— 100'ü aşıyor":"— 100 olmalı"}
                </div>
              </div>
            )}
          </div>

          {/* Çalışan sayısı */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:8 }}>HEDEF ÇALIŞAN SAYISI</div>
            <div style={{ display:"flex",gap:8,alignItems:"center" }}>
              <input type="number" value={headcount} min={10} max={100000} step={50}
                onChange={e=>setHeadcount(parseInt(e.target.value)||100)}
                style={{ flex:1,padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:18,fontWeight:700,fontFamily:"monospace",color:C.text }}/>
              <span style={{ fontSize:13,color:C.textMuted }}>kişi</span>
            </div>
            <div style={{ display:"flex",gap:8,marginTop:6 }}>
              {[100,500,1000,5000].map(v=>(
                <button key={v} onClick={()=>setHeadcount(v)} style={{ flex:1,padding:"4px 0",fontSize:11,borderRadius:5,border:`1px solid ${C.border}`,background:headcount===v?C.navBg:"white",color:headcount===v?"white":C.textSec,cursor:"pointer" }}>{v.toLocaleString('tr')}</button>
              ))}
            </div>
          </div>

          {/* Mevcut profil özeti */}
          {Object.keys(activeWeights).length > 0 && (
            <div style={{ background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:14 }}>
              <div style={{ fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:8 }}>SEÇİLEN PROFİL</div>
              {Object.entries(activeWeights).map(([sec,pct])=>(
                <div key={sec} style={{ marginBottom:5 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2 }}>
                    <span style={{ color:C.text }}>{sec}</span>
                    <span style={{ fontFamily:"monospace",fontWeight:700,color:C.accent }}>%{pct}</span>
                  </div>
                  <div style={{ height:4,background:C.border,borderRadius:2,overflow:"hidden" }}>
                    <div style={{ height:"100%",width:`${pct}%`,background:C.accent,borderRadius:2 }}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={()=>setShowPlan(true)}
            disabled={Object.keys(activeWeights).length===0}
            style={{ width:"100%",padding:"12px 0",borderRadius:8,border:"none",cursor:Object.keys(activeWeights).length===0?"not-allowed":"pointer",fontSize:14,fontWeight:700,background:Object.keys(activeWeights).length===0?C.border:C.navBg,color:"white",transition:"all 0.15s" }}>
            Eğitim Planını Hesapla →
          </button>
        </div>

        {/* Sağ: Sonuçlar */}
        <div>
          {!showPlan && (
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:420,background:C.bg,border:`2px dashed ${C.border}`,borderRadius:12,textAlign:"center",padding:40 }}>
              <div style={{ fontSize:32,marginBottom:12 }}>📊</div>
              <div style={{ fontSize:15,fontWeight:600,color:C.textSec,marginBottom:6 }}>Kurumunuzu Seçin</div>
              <div style={{ fontSize:13,color:C.textMuted,lineHeight:1.6 }}>Kurum profili ve çalışan sayısı girdikten sonra<br/>öncelikli eğitim planı otomatik oluşturulur.</div>
            </div>
          )}
          {showPlan && plan && (
            <div>
              {/* Özet kartlar */}
              <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:14 }}>
                {[
                  { val:`%${plan.avgScore}`, label:"Ortalama Risk Skoru", c:getRisk(plan.avgScore).c, bg:getRisk(plan.avgScore).bg, br:getRisk(plan.avgScore).br },
                  { val:plan.duration, label:"Tahmini Süre", c:C.accent, bg:C.accentLight, br:"#bfdbfe" },
                  { val:(plan.totalPersonHours/1000).toFixed(1)+"K", label:"Toplam Kişi-Saat", c:C.text, bg:C.bg, br:C.border },
                  { val:fmtTL(plan.budgetTL), label:"Tahmini Bütçe", c:"#15803d", bg:"#f0fdf4", br:"#bbf7d0" },
                ].map(s=>(
                  <div key={s.label} style={{ background:s.bg,border:`1px solid ${s.br}`,borderRadius:8,padding:"12px 14px" }}>
                    <div style={{ fontSize:18,fontWeight:900,color:s.c,fontFamily:"monospace",lineHeight:1 }}>{s.val}</div>
                    <div style={{ fontSize:10,color:C.textMuted,marginTop:4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Risk dağılımı */}
              <div style={{ background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",marginBottom:12 }}>
                <div style={{ fontSize:10,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:8 }}>KURUM RİSK PROFİLİ</div>
                <div style={{ display:"flex",height:10,borderRadius:5,overflow:"hidden",marginBottom:6 }}>
                  <div style={{ width:`${plan.normRisk.h}%`,background:C.r1c }}/>
                  <div style={{ width:`${plan.normRisk.mh}%`,background:C.r2c }}/>
                  <div style={{ width:`${plan.normRisk.m}%`,background:C.r3c }}/>
                  <div style={{ width:`${plan.normRisk.l}%`,background:C.r4c }}/>
                </div>
                <div style={{ display:"flex",gap:10,fontSize:10,flexWrap:"wrap" }}>
                  <span style={{ color:C.r1c }}><strong>%{plan.normRisk.h}</strong> Yüksek</span>
                  <span style={{ color:C.r2c }}><strong>%{plan.normRisk.mh}</strong> Orta-Y.</span>
                  <span style={{ color:C.r3c }}><strong>%{plan.normRisk.m}</strong> Orta</span>
                  <span style={{ color:C.r4c }}><strong>%{plan.normRisk.l}</strong> Düşük</span>
                </div>
              </div>

              {/* Kurs tablosu */}
              <div style={{ fontSize:10,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:8 }}>ÖNCELİKLİ EĞİTİM PROGRAMI</div>
              <div style={{ display:"flex",flexDirection:"column",gap:5,marginBottom:14 }}>
                {plan.topCourses.map((c,i)=>{
                  const pr = c.priority==="Acil"?{c:C.r1c,bg:C.r1bg,br:C.r1br}:c.priority==="Yüksek"?{c:C.r2c,bg:C.r2bg,br:C.r2br}:{c:C.r3c,bg:C.r3bg,br:C.r3br};
                  return (
                    <div key={i} style={{ background:pr.bg,border:`1px solid ${pr.br}`,borderRadius:7,padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8 }}>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:12,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.course}</div>
                        <div style={{ fontSize:10,color:C.textMuted,marginTop:2 }}>{c.hours} saat · {c.participants.toLocaleString('tr')} katılımcı</div>
                      </div>
                      <span style={{ fontSize:10,fontWeight:700,color:pr.c,border:`1px solid ${pr.br}`,borderRadius:4,padding:"2px 8px",flexShrink:0 }}>{c.priority}</span>
                    </div>
                  );
                })}
              </div>

              {/* PDF butonu */}
              <button onClick={handleDownload} style={{ width:"100%",padding:"11px 0",borderRadius:8,border:`1px solid #1d4ed8`,cursor:"pointer",fontSize:13,fontWeight:700,background:C.accentLight,color:C.accent,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                <span>⬇</span> 2026 Türkiye Dijital Beceri Açığı Raporunu İndir
              </button>
              <div style={{ fontSize:10,color:C.textMuted,textAlign:"center",marginTop:5 }}>HTML dosyası indirilir — tarayıcıdan Yazdır → PDF olarak kaydedebilirsiniz</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 3. KURUM ANALİZİ ────────────────────────────────────────────────────────
function InstitutionProfile() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [searchRes, setSearchRes] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = (q) => {
    setSearch(q);
    if (q.trim().length < 2) { setSearchRes([]); return; }
    setSearchRes(PROFESSIONS.filter(p=>p.title.toLowerCase().includes(q.toLowerCase())||p.sector.toLowerCase().includes(q.toLowerCase())).slice(0,8));
  };

  const addRow = (prof) => {
    if (rows.find(r=>r.profId===prof.id)) return;
    setRows(r=>[...r,{ profId:prof.id, title:prof.title, sector:prof.sector, score:prof.score, theoretical:prof.theoretical, count:100 }]);
    setSearch(""); setSearchRes([]); setShowSearch(false);
  };

  const updateCount = (profId, val) => setRows(r=>r.map(row=>row.profId===profId?{...row,count:Math.max(1,parseInt(val)||1)}:row));
  const removeRow = (profId) => setRows(r=>r.filter(row=>row.profId!==profId));

  const totalCount = rows.reduce((s,r)=>s+r.count,0);
  const weightedScore = totalCount>0?Math.round(rows.reduce((s,r)=>s+r.score*r.count,0)/totalCount):0;
  const riskDist = { h:0, mh:0, m:0, l:0 };
  rows.forEach(r=>{ if(r.score>=65)riskDist.h+=r.count; else if(r.score>=45)riskDist.mh+=r.count; else if(r.score>=25)riskDist.m+=r.count; else riskDist.l+=r.count; });

  // Top courses
  const courseFreq = {};
  rows.forEach(row => {
    const prof = PROFESSIONS.find(p=>p.id===row.profId);
    if (!prof) return;
    prof.courses.forEach((c,i)=>{ courseFreq[c]=(courseFreq[c]||0)+(5-i)*row.count; });
  });
  const topCourses = Object.entries(courseFreq).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([c])=>c);

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <h2 style={{ fontSize:20,fontWeight:800,color:C.text,marginBottom:6 }}>Kurum Profil Analizi</h2>
        <p style={{ fontSize:14,color:C.textSec,lineHeight:1.7 }}>Kurumunuzdaki pozisyonları ve çalışan sayılarını girin. Sistem kurumunuza özgü AI risk profilini, sektörel dağılımı ve öncelikli eğitim planını hesaplar.</p>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"start" }}>
        {/* Sol: Pozisyon ekleme */}
        <div>
          {/* Arama */}
          <div style={{ position:"relative",marginBottom:12 }}>
            <div style={{ fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:8 }}>POZİSYON EKLE</div>
            <input
              type="text" placeholder="Meslek ara (örn. 'Muhasebe', 'Yazılım')..."
              value={search} onChange={e=>handleSearch(e.target.value)}
              onFocus={()=>setShowSearch(true)}
              style={{ width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.text }}
            />
            {showSearch && searchRes.length>0 && (
              <div style={{ position:"absolute",top:"100%",left:0,right:0,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",zIndex:200,maxHeight:280,overflowY:"auto" }}>
                {searchRes.map(p=>(
                  <div key={p.id} onClick={()=>addRow(p)} style={{ padding:"10px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:13,fontWeight:600,color:C.text }}>{p.title}</div>
                      <div style={{ fontSize:10,color:C.textMuted }}>{p.sector}</div>
                    </div>
                    <span style={{ fontSize:13,fontWeight:900,color:getRisk(p.score).c,fontFamily:"monospace" }}>%{p.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Satır listesi */}
          {rows.length===0 ? (
            <div style={{ background:C.bg,border:`2px dashed ${C.border}`,borderRadius:10,padding:32,textAlign:"center" }}>
              <div style={{ fontSize:24,marginBottom:8 }}>🏛</div>
              <div style={{ fontSize:14,fontWeight:600,color:C.textSec,marginBottom:4 }}>Henüz pozisyon eklenmedi</div>
              <div style={{ fontSize:12,color:C.textMuted }}>Yukarıdan meslek arayarak kurumunuzdaki pozisyonları ekleyin</div>
            </div>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              {rows.map(row=>{
                const risk = getRisk(row.score);
                return (
                  <div key={row.profId} style={{ background:C.surface,border:`1px solid ${risk.br}`,borderLeft:`3px solid ${risk.c}`,borderRadius:8,padding:"9px 12px",display:"flex",alignItems:"center",gap:10 }}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{row.title}</div>
                      <div style={{ fontSize:10,color:C.textMuted }}>{row.sector}</div>
                    </div>
                    <div style={{ fontSize:14,fontWeight:800,color:risk.c,fontFamily:"monospace",flexShrink:0 }}>%{row.score}</div>
                    <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                      <input type="number" value={row.count} min={1}
                        onChange={e=>updateCount(row.profId,e.target.value)}
                        style={{ width:70,padding:"4px 6px",border:`1px solid ${C.border}`,borderRadius:5,fontSize:12,textAlign:"center",fontFamily:"monospace" }}/>
                      <span style={{ fontSize:10,color:C.textMuted }}>kişi</span>
                    </div>
                    <button onClick={()=>removeRow(row.profId)} style={{ background:"none",border:`1px solid ${C.border}`,borderRadius:4,width:24,height:24,cursor:"pointer",fontSize:14,color:C.textMuted,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
                  </div>
                );
              })}
              <div style={{ fontSize:11,color:C.textMuted,textAlign:"right",paddingTop:4 }}>
                Toplam: <strong style={{ color:C.text }}>{totalCount.toLocaleString("tr")} çalışan</strong> · {rows.length} pozisyon
              </div>
            </div>
          )}
        </div>

        {/* Sağ: Analiz */}
        {rows.length===0 ? (
          <div style={{ background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:32,textAlign:"center",minHeight:300,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
            <div style={{ fontSize:13,color:C.textMuted,lineHeight:1.6 }}>Pozisyon eklendikten sonra<br/>kurum risk analizi burada görünecek</div>
          </div>
        ) : (
          <div>
            {/* Kurum skoru */}
            <div style={{ background:C.navBg,borderRadius:12,padding:"20px 22px",marginBottom:12,textAlign:"center" }}>
              <div style={{ fontSize:11,color:"#93c5fd",letterSpacing:1,marginBottom:6 }}>KURUM ORTALAMA AI RİSK SKORU</div>
              <div style={{ fontSize:48,fontWeight:900,color:getRisk(weightedScore).c==="white"?"#fbbf24":getRisk(weightedScore).c,fontFamily:"monospace",lineHeight:1 }}>%{weightedScore}</div>
              <div style={{ fontSize:12,color:"#94a3b8",marginTop:6 }}>{getRisk(weightedScore).label} · {totalCount.toLocaleString("tr")} çalışan</div>
            </div>

            {/* Dağılım */}
            <div style={{ background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:12 }}>
              <div style={{ fontSize:10,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:8 }}>ÇALIŞANLARın RİSK DAĞILIMI</div>
              <div style={{ display:"flex",height:12,borderRadius:6,overflow:"hidden",marginBottom:8 }}>
                {[{v:riskDist.h,c:C.r1c},{v:riskDist.mh,c:C.r2c},{v:riskDist.m,c:C.r3c},{v:riskDist.l,c:C.r4c}].map((d,i)=>(
                  totalCount>0 && <div key={i} style={{ width:`${d.v/totalCount*100}%`,background:d.c }}/>
                ))}
              </div>
              {[
                { label:"Yüksek (%65+)",val:riskDist.h,c:C.r1c },
                { label:"Orta-Yüksek (%45–64)",val:riskDist.mh,c:C.r2c },
                { label:"Orta (%25–44)",val:riskDist.m,c:C.r3c },
                { label:"Düşük (%25 altı)",val:riskDist.l,c:C.r4c },
              ].filter(d=>d.val>0).map(d=>(
                <div key={d.label} style={{ display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3 }}>
                  <span style={{ color:d.c,fontWeight:600 }}>{d.label}</span>
                  <span style={{ fontFamily:"monospace",fontWeight:700,color:C.text }}>{d.val.toLocaleString("tr")} kişi (%{Math.round(d.val/totalCount*100)})</span>
                </div>
              ))}
            </div>

            {/* Öncelikli kurslar */}
            {topCourses.length>0 && (
              <div>
                <div style={{ fontSize:10,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:8 }}>ÖNCELİKLİ EĞİTİMLER</div>
                {topCourses.map((c,i)=>{
                  const pr = i<2?{c:C.r1c,bg:C.r1bg,br:C.r1br}:i<4?{c:C.r2c,bg:C.r2bg,br:C.r2br}:{c:C.r3c,bg:C.r3bg,br:C.r3br};
                  return (
                    <div key={i} style={{ background:pr.bg,border:`1px solid ${pr.br}`,borderRadius:7,padding:"8px 12px",marginBottom:5,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                      <span style={{ fontSize:12,fontWeight:600,color:C.text }}>{c}</span>
                      <span style={{ fontSize:10,fontWeight:700,color:pr.c,border:`1px solid ${pr.br}`,borderRadius:3,padding:"2px 7px",flexShrink:0,marginLeft:8 }}>{i<2?"Acil":i<4?"Öncelikli":"Orta"}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* İhale notu */}
            <div style={{ marginTop:12,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"10px 14px" }}>
              <div style={{ fontSize:10,fontWeight:700,color:C.accent,letterSpacing:1,marginBottom:5 }}>4734 KİK DOĞRUDAN TEMİN EŞİĞİ</div>
              <p style={{ fontSize:11,color:"#1e40af",lineHeight:1.6,margin:0 }}>
                {totalCount<=3000 ? `${totalCount.toLocaleString("tr")} çalışan için tahmini eğitim maliyeti 4734/22-d doğrudan temin eşiği içinde kalabilir. Modüler paketler halinde planlama önerilir.` : "Bu ölçekteki program için TÜBİTAK 1509 veya kalkınma ajansı desteği araştırılması önerilir."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HARİTA ──────────────────────────────────────────────────────────────────
function TurkeyMap({ onModalOpen }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div>
      <div style={{ display:"flex",gap:16,flexWrap:"wrap",alignItems:"center",marginBottom:14 }}>
        <span style={{ fontSize:12,color:C.textMuted,fontWeight:600 }}>Maruziyet Seviyesi:</span>
        {[{f:"#fca5a5",s:"#ef4444",l:"%60+ Yüksek"},{f:"#fdba74",s:"#f97316",l:"%40–60 Orta-Y."},{f:"#fde68a",s:"#d97706",l:"%25–40 Orta"},{f:"#86efac",s:"#16a34a",l:"< %25 Düşük"}].map(item=>(
          <div key={item.l} style={{ display:"flex",alignItems:"center",gap:5 }}>
            <svg width="16" height="12"><rect x="0" y="0" width="16" height="12" rx="2" fill={item.f} stroke={item.s} strokeWidth="1.5"/></svg>
            <span style={{ fontSize:11,color:C.textSec }}>{item.l}</span>
          </div>
        ))}
      </div>
      <div style={{ position:"relative",background:"#e0ecfb",borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden" }}>
        <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width:"100%",display:"block" }}>
          <rect width={VW} height={VH} fill="#dbeafe"/>
          <defs><pattern id="mapgrid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#bfdbfe" strokeWidth="0.5"/></pattern></defs>
          <rect width={VW} height={VH} fill="url(#mapgrid)"/>
          {PROVINCES.map(p=>{
            const col=getMapColor(p.score); const x1=tx(p.bounds[0]); const y1=ty(p.bounds[3]); const w=tx(p.bounds[2])-x1; const h=ty(p.bounds[1])-y1; const isH=hovered?.code===p.code;
            return (
              <g key={p.code} onMouseEnter={()=>setHovered(p)} onMouseLeave={()=>setHovered(null)} style={{ cursor:"pointer" }}>
                <rect x={x1} y={y1} width={w} height={h} rx={2} fill={isH?col.stroke:col.fill} stroke={col.stroke} strokeWidth={isH?2:0.8} opacity={isH?0.95:0.82} style={{ transition:"all 0.15s" }}/>
                {w>28&&h>16&&<text x={x1+w/2} y={y1+h/2+3.5} textAnchor="middle" fill={isH?"white":col.stroke} fontSize={Math.min(9,w/4)} fontWeight="700" fontFamily="monospace" style={{ pointerEvents:"none",userSelect:"none" }}>{p.score}%</text>}
              </g>
            );
          })}
        </svg>
        {hovered&&(
          <div style={{ position:"absolute",top:12,right:12,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 18px",minWidth:220,boxShadow:"0 4px 20px rgba(0,0,0,0.12)" }}>
            <div style={{ fontWeight:800,fontSize:16,color:C.text,marginBottom:2 }}>{hovered.name}</div>
            <div style={{ fontSize:11,color:C.textMuted,marginBottom:12,fontFamily:"monospace" }}>İl Kodu: {hovered.code} · {hovered.sector}</div>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}><span style={{ fontSize:12,color:C.textSec }}>AI Maruziyet Skoru</span><span style={{ fontSize:12,fontFamily:"monospace",fontWeight:700,color:getMapColor(hovered.score).stroke }}>{hovered.score}%</span></div>
            <div style={{ height:6,background:C.bg,borderRadius:3,overflow:"hidden",border:`1px solid ${C.border}`,marginBottom:10 }}><div style={{ height:"100%",width:`${hovered.score}%`,background:getMapColor(hovered.score).stroke,borderRadius:3 }}/></div>
            <div style={{ display:"flex",justifyContent:"space-between" }}><span style={{ fontSize:11,color:C.textMuted }}>Baskın sektör</span><span style={{ fontSize:11,fontWeight:600,color:C.textSec }}>{hovered.sector}</span></div>
          </div>
        )}
      </div>
      <div style={{ marginTop:16 }}>
        <div style={{ fontSize:12,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:10 }}>EN YÜKSEK SKORA SAHİP 10 İL</div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:7 }}>
          {[...PROVINCES].sort((a,b)=>b.score-a.score).slice(0,10).map(p=>{
            const col=getMapColor(p.score);
            return (
              <div key={p.code} style={{ background:C.surface,border:`1px solid ${col.stroke}44`,borderLeft:`3px solid ${col.stroke}`,borderRadius:7,padding:"9px 12px",display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600,color:C.text }}>{p.name}</div><div style={{ fontSize:10,color:C.textMuted }}>{p.sector}</div></div>
                <div style={{ fontSize:15,fontWeight:800,color:col.stroke,fontFamily:"monospace" }}>{p.score}%</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop:16,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"14px 18px" }}>
        <div style={{ fontSize:11,fontWeight:700,color:"#1d4ed8",letterSpacing:1,marginBottom:8 }}>POLİTİKA NOTU</div>
        <p style={{ fontSize:13,color:"#1e40af",lineHeight:1.75,margin:0 }}>Batı illerinde finans ve bilgi-iletişim sektörlerinin yoğunluğu nedeniyle AI maruziyeti yüksek. Doğu illerinde tarım ağırlıklı yapı doğal bir koruma sağlıyor; ancak bu illerde dijital beceri açığı farklı bir politika sorunu yaratıyor. BTK Akademi'nin coğrafi hedefleme kapasitesi her iki ihtiyacı da karşılayabilecek konumda.</p>
      </div>
    </div>
  );
}

// ─── DETAY PANELİ ────────────────────────────────────────────────────────────
function DetailPanel({ prof, onModalOpen }) {
  if (!prof) return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:420,textAlign:"center",padding:40 }}>
      <div style={{ width:52,height:52,borderRadius:10,background:C.bg,border:`2px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14,fontSize:20,color:C.textMuted }}>↖</div>
      <div style={{ fontSize:15,fontWeight:600,color:C.textSec,marginBottom:6 }}>Listeden Meslek Seçin</div>
      <div style={{ fontSize:13,color:C.textMuted,lineHeight:1.6 }}>Arama yapın veya listeden<br/>bir meslek seçerek detayları görüntüleyin.</div>
    </div>
  );
  const risk=getRisk(prof.score); const R=44; const CIRC=2*Math.PI*R;
  const gap=prof.gap!==undefined?prof.gap:+(prof.theoretical-prof.score).toFixed(1);
  return (
    <div>
      <div style={{ padding:"18px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:12,alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800,fontSize:17,color:C.text,marginBottom:4,lineHeight:1.3 }}>{prof.title}</div>
          <div style={{ fontSize:11,color:C.textMuted,fontFamily:"monospace" }}>ISCO-08: {prof.isco}{prof.nace&&<> &nbsp;·&nbsp; NACE: {prof.nace}</>} &nbsp;·&nbsp; {prof.sector}</div>
          {prof.naceName&&<div style={{ fontSize:10,color:"#94a3b8",marginTop:2 }}>{prof.naceName}</div>}
          <div style={{ fontSize:10,color:"#f59e0b",marginTop:3,fontWeight:600 }}>Benimseme Açığı: %{gap} — teorik kapasite henüz tam gerçekleşmemiş</div>
        </div>
        <span style={{ fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:4,background:risk.bg,color:risk.c,border:`1px solid ${risk.br}`,whiteSpace:"nowrap",marginTop:2 }}>{risk.label}</span>
      </div>
      <div style={{ padding:"18px 22px" }}>
        <div style={{ display:"flex",gap:18,alignItems:"center",marginBottom:16 }}>
          <div style={{ flexShrink:0 }}>
            <svg width="110" height="110" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r={R} fill="none" stroke={C.bg} strokeWidth="10" strokeDasharray={`${CIRC*0.75} ${CIRC*0.25}`} strokeLinecap="round" transform="rotate(135 55 55)"/>
              <circle cx="55" cy="55" r={R} fill="none" stroke={risk.c} strokeWidth="10" strokeDasharray={`${CIRC*0.75*(prof.score/100)} ${CIRC}`} strokeLinecap="round" transform="rotate(135 55 55)" style={{ filter:`drop-shadow(0 0 4px ${risk.c}55)` }}/>
              <text x="55" y="51" textAnchor="middle" fill={C.text} fontSize="18" fontWeight="800" fontFamily="monospace">{prof.score}%</text>
              <text x="55" y="65" textAnchor="middle" fill={C.textMuted} fontSize="7.5" fontFamily="sans-serif">MARUZIYET</text>
            </svg>
            <div style={{ textAlign:"center",marginTop:-2 }}>
              <button onClick={onModalOpen} style={{ fontSize:11,color:C.accent,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",padding:0 }}>Bu skor nedir?</button>
            </div>
          </div>
          <div style={{ flex:1 }}>
            {[{label:"Teorik Kapasite",val:prof.theoretical,color:C.textSec},{label:"Gerçek Kullanım",val:prof.score,color:risk.c},{label:"Benimseme Açığı",val:gap,color:"#f59e0b"}].map(b=>(
              <div key={b.label} style={{ marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3 }}><span style={{ color:C.textSec }}>{b.label}</span><span style={{ color:b.color,fontFamily:"monospace",fontWeight:700 }}>{b.val}%</span></div>
                <div style={{ height:6,background:C.bg,borderRadius:3,overflow:"hidden",border:`1px solid ${C.border}` }}><div style={{ height:"100%",width:`${Math.min(b.val,100)}%`,background:b.color,borderRadius:3 }}/></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:"flex",gap:8,marginBottom:14 }}>
          {[{label:"Türkiye İşgücü",val:fmtW(prof.workers)},{label:"Büyüme (BLS 2034)",val:(prof.trend>0?"+":"")+prof.trend+"%"}].map(s=>(
            <div key={s.label} style={{ flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px" }}>
              <div style={{ fontSize:18,fontWeight:800,color:C.text,fontFamily:"monospace" }}>{s.val}</div>
              <div style={{ fontSize:10,color:C.textMuted,marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:14,marginBottom:14 }}>
          <div style={{ fontSize:10,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:6 }}>SEKTÖR ETKİSİ VE KARİYER STRATEJİSİ</div>
          <p style={{ fontSize:12,color:C.textSec,lineHeight:1.75,margin:0 }}>{prof.impact}</p>
        </div>
        <div style={{ fontSize:10,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:8 }}>ÖNERİLEN KURSLAR</div>
        <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
          {prof.courses.map((c,i)=>{
            const pr=getPriority(i,prof.score);
            return (
              <div key={i} style={{ background:pr.bg,border:`1px solid ${pr.br}`,borderRadius:7,padding:"9px 12px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <span style={{ fontSize:12,fontWeight:500,color:C.text }}>{c}</span>
                <span style={{ fontSize:10,fontWeight:700,color:pr.c,border:`1px solid ${pr.br}`,borderRadius:3,padding:"2px 7px",marginLeft:8,whiteSpace:"nowrap" }}>{pr.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── METODOLOJİ ──────────────────────────────────────────────────────────────
function MethodSection({ onModalOpen }) {
  return (
    <div style={{ maxWidth:700 }}>
      <h2 style={{ fontSize:20,fontWeight:800,color:C.text,marginBottom:6 }}>Analiz Metodolojisi</h2>
      <p style={{ fontSize:14,color:C.textSec,lineHeight:1.75,marginBottom:28 }}>
        Platformdaki maruziyet skorları Anthropic'in Mart 2026 tarihli işgücü araştırmasından türetilmiş ve Türkiye ISCO-08 + NACE Rev.2 kodlarıyla eşleştirilmiştir.{" "}
        <button onClick={onModalOpen} style={{ fontSize:13,color:C.accent,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",padding:0 }}>Skor hesaplama yöntemi için tıklayın</button>
      </p>
      <div style={{ display:"flex",flexDirection:"column",gap:16,marginBottom:28 }}>
        {[
          { n:"01", color:"#1d4ed8", title:"Anthropic Economic Index", body:"Massenkoff & McCrory (2026) tarafından geliştirilen 'Observed Exposure' metriği, Claude API'nin gerçek dünya kullanım verilerinden türetiliyor. 800'den fazla meslek için teorik AI kapasitesi ve fiilen gözlemlenen otomasyon oranı tek çatı altında ölçüldü." },
          { n:"02", color:"#7c3aed", title:"NACE Rev.2 + ISCO-08 Çift Standart", body:"O*NET meslek kodları Türkiye'nin NACE Rev.2 (işyeri faaliyet) ve ISCO-08 (bireysel meslek) standartlarıyla çapraz eşleştirildi. SGK, İŞKUR ve KOSGEB veri tabanlarıyla doğrudan sorgulanabilir. Core9Tech ekibi tarafından manuel doğrulandı." },
          { n:"03", color:"#0891b2", title:"Türkiye İşgücü Ağırlıklandırması", body:"Her meslek grubunun çalışan sayısı TÜİK Hanehalkı İşgücü Araştırması (2024) ile ağırlıklandırıldı. İl bazlı risk skoru baskın sektör ağırlıklı ortalama yöntemiyle hesaplandı." },
          { n:"04", color:"#059669", title:"BTK Akademi Kurs Eşleştirmesi", body:"Maruziyet profilinden yola çıkarak kurs kataloğundaki içerikler öncelik skoru hesaplanarak eşleştirildi. Öncelik: benimseme açığı × işgücü büyüklüğü × büyüme trendi." },
        ].map(s=>(
          <div key={s.n} style={{ display:"flex",gap:14 }}>
            <div style={{ width:36,height:36,borderRadius:8,background:s.color,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,fontFamily:"monospace",flexShrink:0 }}>{s.n}</div>
            <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",flex:1 }}>
              <div style={{ fontWeight:700,fontSize:14,color:C.text,marginBottom:6 }}>{s.title}</div>
              <div style={{ fontSize:13,color:C.textSec,lineHeight:1.75 }}>{s.body}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:18 }}>
        <div style={{ fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:12 }}>KAYNAKÇA</div>
        {["Massenkoff, M. & McCrory, E. (2026). Labor Market Impacts of AI. Anthropic.","Anthropic Economic Index. huggingface.co/datasets/Anthropic/EconomicIndex","TÜİK Hanehalkı İşgücü Araştırması (2024). Türkiye İstatistik Kurumu.","ISCO-08 Uluslararası Meslek Standart Sınıflaması. ILO / TÜİK Uyarlaması.","NACE Rev.2 Ekonomik Faaliyet Sınıflaması. EUROSTAT / TÜİK.","BLS Employment Projections 2024–2034. U.S. Bureau of Labor Statistics."].map((r,i)=>(
          <div key={i} style={{ fontSize:12,color:C.textSec,lineHeight:1.6,paddingLeft:12,borderLeft:`2px solid ${C.border}`,marginBottom:7 }}>{r}</div>
        ))}
      </div>
    </div>
  );
}

// ─── ANA UYGULAMA ─────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]         = useState("analysis");
  const [search, setSearch]   = useState("");
  const [selected, setSel]    = useState(null);
  const [sortBy, setSort]     = useState("score");
  const [modal, setModal]     = useState(false);
  const [heroModal, setHeroModal] = useState(null);
  const [sectorFilter, setSectorFilter] = useState("Tümü");

  const sectors = useMemo(()=>["Tümü",...new Set(PROFESSIONS.map(p=>p.sector))].sort((a,b)=>a==="Tümü"?-1:a.localeCompare(b,"tr")),[]);

  const filtered = useMemo(()=>{
    let list = PROFESSIONS;
    if (sectorFilter!=="Tümü") list=list.filter(p=>p.sector===sectorFilter);
    if (search.trim()) { const q=search.toLowerCase(); list=list.filter(p=>p.title.toLowerCase().includes(q)||p.sector.toLowerCase().includes(q)||p.isco.includes(q)||(p.nace&&p.nace.includes(q))); }
    return [...list].sort((a,b)=>sortBy==="score"?b.score-a.score:sortBy==="gap"?(b.gap??b.theoretical-b.score)-(a.gap??a.theoretical-a.score):a.title.localeCompare(b.title,"tr"));
  },[search,sortBy,sectorFilter]);

  const stats = useMemo(()=>({
    atRisk:   PROFESSIONS.filter(p=>p.score>=50).reduce((s,p)=>s+p.workers,0),
    highRisk: PROFESSIONS.filter(p=>p.score>=65).length,
    avg:      Math.round(PROFESSIONS.reduce((s,p)=>s+p.score,0)/PROFESSIONS.length),
  }),[]);

  const NAV_TABS = [
    { id:"analysis",  label:"Meslek Analizi"  },
    { id:"matrix",    label:"Öncelik Matrisi" },
    { id:"profile",   label:"Kurum Analizi"   },
    { id:"training",  label:"Eğitim Planı"    },
    { id:"map",       label:"İl Haritası"     },
    { id:"method",    label:"Metodoloji"      },
  ];

  const heroStats = [
    { val:String(PROFESSIONS.length), label:"Analiz Edilen Meslek", sub:"NACE Rev.2 + ISCO-08 kodlu", accent:"white",    clickable:false },
    { val:"81",                        label:"İl Bazında Veri",       sub:"Tüm Türkiye illeri",         accent:"white",    clickable:false },
    { val:fmtW(stats.atRisk),          label:"Yüksek Risk İşgücü",   hint:"tıkla → detaylar",           accent:"#fca5a5",  clickable:true, onClick:()=>setHeroModal("workforce") },
    { val:String(stats.highRisk),      label:"Kritik Meslek",         hint:"tıkla → meslek isimleri",    accent:"#fdba74",  clickable:true, onClick:()=>setHeroModal("critical")  },
    { val:`${stats.avg}%`,             label:"Ortalama Skor",         hint:"tıkla → hesaplama",          accent:"white",    clickable:true, onClick:()=>setHeroModal("avg")       },
  ];

  return (
    <div style={{ minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}input,button,select{font-family:inherit}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.borderMed};border-radius:3px}
        .hsb:hover{background:rgba(255,255,255,0.12)!important;transform:translateY(-1px)}.hsb{transition:all .15s}
      `}</style>

      {modal    && <ScoreModal onClose={()=>setModal(false)}/>}
      {heroModal&& <HeroModal type={heroModal} stats={stats} onClose={()=>setHeroModal(null)}/>}

      {/* NAV */}
      <nav style={{ background:C.navBg,position:"sticky",top:0,zIndex:100,borderBottom:`1px solid ${C.navBorder}` }}>
        <div style={{ maxWidth:1280,margin:"0 auto",padding:"0 20px",display:"flex",alignItems:"stretch",height:56 }}>
          <div style={{ display:"flex",flexDirection:"column",justifyContent:"center",marginRight:"auto",paddingRight:20,borderRight:`1px solid ${C.navBorder}` }}>
            <div style={{ display:"flex",alignItems:"baseline",gap:8 }}><span style={{ fontSize:17,fontWeight:900,color:"white",letterSpacing:-0.5 }}>TAME</span><span style={{ fontSize:11,color:"#64748b" }}>Türkiye AI Maruziyet Endeksi</span></div>
            <div style={{ fontSize:10,color:"#334155" }}>Core9Tech × BTK Akademi · Pilot, Mart 2026</div>
          </div>
          {NAV_TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:"none",border:"none",borderBottom:`2px solid ${tab===t.id?"#60a5fa":"transparent"}`,color:tab===t.id?"white":"#64748b",fontSize:12,fontWeight:tab===t.id?600:400,padding:"0 14px",cursor:"pointer",transition:"all 0.15s",marginTop:2,whiteSpace:"nowrap" }}>{t.label}</button>
          ))}
          <div style={{ display:"flex",flexDirection:"column",justifyContent:"center",paddingLeft:16,borderLeft:`1px solid ${C.navBorder}`,marginLeft:4 }}>
            <div style={{ fontSize:10,color:"#334155" }}>Kaynak</div>
            <div style={{ fontSize:10,color:"#94a3b8",fontWeight:600 }}>Anthropic Index</div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ background:C.navBg,padding:"32px 24px 36px",borderBottom:"3px solid #1d4ed8" }}>
        <div style={{ maxWidth:1280,margin:"0 auto" }}>
          <div style={{ marginBottom:10 }}><span style={{ background:"#1e3a5f",color:"#93c5fd",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:4,letterSpacing:1.5,border:"1px solid #1d4ed8" }}>PİLOT ÇALIŞMA</span></div>
          <h1 style={{ fontSize:"clamp(20px,3.5vw,34px)",fontWeight:900,color:"white",lineHeight:1.2,marginBottom:10,letterSpacing:-0.5 }}>Türkiye'de Hangi Meslekler<br/>Yapay Zekadan Etkileniyor?</h1>
          <p style={{ color:"#94a3b8",fontSize:14,lineHeight:1.75,maxWidth:560,marginBottom:26 }}>Anthropic'in Mart 2026 işgücü raporu {PROFESSIONS.length} meslek ve 81 il düzeyinde Türkiye verisiyle eşleştirildi. Öncelik matrisi, eğitim hesaplayıcısı ve kurum analiz araçlarıyla işgücü dönüşümünü yönetin.</p>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {heroStats.map(s=>(
              <div key={s.label} className={s.clickable?"hsb":""} onClick={s.clickable?s.onClick:undefined} style={{ background:"rgba(255,255,255,0.06)",border:s.clickable?"1px solid rgba(255,255,255,0.18)":"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"12px 18px",minWidth:138,cursor:s.clickable?"pointer":"default",position:"relative" }}>
                {s.clickable&&<div style={{ position:"absolute",top:6,right:8,fontSize:9,color:"rgba(255,255,255,0.35)",fontWeight:600 }}>↗</div>}
                <div style={{ fontSize:24,fontWeight:900,color:s.accent,fontFamily:"monospace",lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:12,color:"#e2e8f0",marginTop:4,fontWeight:600 }}>{s.label}</div>
                <div style={{ fontSize:10,color:s.clickable?"rgba(255,255,255,0.4)":"#475569",marginTop:2 }}>{s.clickable?s.hint:s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* İÇERİK */}
      <div style={{ maxWidth:1280,margin:"0 auto",padding:"24px 24px 64px" }}>

        {tab==="analysis" && (
          <div style={{ display:"grid",gridTemplateColumns:"minmax(280px,390px) 1fr",gap:20,alignItems:"start" }}>
            <div>
              <input type="text" placeholder="Meslek adı, sektör, ISCO veya NACE kodu..." value={search} onChange={e=>setSearch(e.target.value)} style={{ width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:C.text,marginBottom:8 }}/>
              <div style={{ display:"flex",gap:6,marginBottom:8,alignItems:"center",flexWrap:"wrap" }}>
                <select value={sectorFilter} onChange={e=>setSectorFilter(e.target.value)} style={{ flex:1,fontSize:12,padding:"5px 8px",border:`1px solid ${C.border}`,borderRadius:6,background:C.surface,color:C.text,cursor:"pointer" }}>
                  {sectors.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ display:"flex",gap:4 }}>
                  {[{v:"score",l:"Skora"},{v:"gap",l:"Açığa"},{v:"name",l:"A–Z"}].map(b=>(
                    <button key={b.v} onClick={()=>setSort(b.v)} style={{ fontSize:11,padding:"4px 8px",borderRadius:5,border:`1px solid ${sortBy===b.v?C.accent:C.border}`,background:sortBy===b.v?C.accentLight:C.surface,color:sortBy===b.v?C.accent:C.textSec,cursor:"pointer",fontWeight:sortBy===b.v?700:400 }}>{b.l}</button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize:11,color:C.textMuted,marginBottom:8 }}>{filtered.length} meslek{sortBy==="gap"&&<span style={{ color:"#f59e0b",marginLeft:6 }}>· açığa göre sıralı</span>}</div>
              <div style={{ display:"flex",flexDirection:"column",gap:5,maxHeight:"65vh",overflowY:"auto",paddingRight:2 }}>
                {filtered.map(p=>{
                  const risk=getRisk(p.score); const isSel=selected?.id===p.id; const gap=p.gap!==undefined?p.gap:+(p.theoretical-p.score).toFixed(1);
                  return (
                    <div key={p.id} onClick={()=>setSel(p)} style={{ background:isSel?risk.bg:C.surface,border:`1px solid ${isSel?risk.c+"66":C.border}`,borderLeft:`3px solid ${isSel?risk.c:C.border}`,borderRadius:8,padding:"9px 12px",cursor:"pointer",transition:"all 0.13s",display:"flex",alignItems:"center",gap:10 }}>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontWeight:600,fontSize:13,color:C.text,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.title}</div>
                        <div style={{ display:"flex",gap:5,alignItems:"center",flexWrap:"wrap" }}>
                          <span style={{ fontSize:10,fontWeight:700,color:risk.c,border:`1px solid ${risk.br}`,background:risk.bg,borderRadius:3,padding:"1px 5px" }}>{risk.label}</span>
                          {p.nace&&<span style={{ fontSize:9,color:C.textMuted,background:"#f1f5f9",border:`1px solid ${C.border}`,borderRadius:3,padding:"1px 5px",fontFamily:"monospace" }}>NACE {p.nace}</span>}
                          <span style={{ fontSize:10,color:C.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.sector}</span>
                        </div>
                      </div>
                      <div style={{ textAlign:"right",flexShrink:0 }}>
                        <div style={{ fontSize:16,fontWeight:900,color:risk.c,fontFamily:"monospace" }}>{p.score}%</div>
                        {sortBy==="gap"&&<div style={{ fontSize:9,color:"#f59e0b",fontFamily:"monospace",fontWeight:700 }}>Δ{gap}%</div>}
                      </div>
                    </div>
                  );
                })}
                {filtered.length===0&&<div style={{ textAlign:"center",color:C.textMuted,padding:40,fontSize:13 }}>Sonuç bulunamadı.</div>}
              </div>
            </div>
            <div style={{ background:C.surface,border:`1px solid ${selected?getRisk(selected.score).br:C.border}`,borderRadius:12,boxShadow:"0 2px 12px rgba(0,0,0,0.05)",position:"sticky",top:68,maxHeight:"86vh",overflowY:"auto" }}>
              <DetailPanel prof={selected} onModalOpen={()=>setModal(true)}/>
            </div>
          </div>
        )}

        {tab==="matrix"   && <PriorityMatrix/>}
        {tab==="profile"  && <InstitutionProfile/>}
        {tab==="training" && <EducationCalculator/>}

        {tab==="map" && (
          <div>
            <div style={{ marginBottom:20 }}>
              <h2 style={{ fontSize:20,fontWeight:800,color:C.text,marginBottom:6 }}>İl Bazında AI Maruziyet Dağılımı</h2>
              <p style={{ fontSize:14,color:C.textSec,lineHeight:1.7 }}>Her ilin baskın sektörü temel alınarak AI maruziyet skoru atandı. İlerin üzerine gelerek detayları görüntüleyin.</p>
            </div>
            <TurkeyMap onModalOpen={()=>setModal(true)}/>
          </div>
        )}

        {tab==="method" && <MethodSection onModalOpen={()=>setModal(true)}/>}
      </div>

      {/* FOOTER */}
      <footer style={{ background:C.navBg,borderTop:"1px solid #1a3a6b",padding:"24px 24px" }}>
        <div style={{ maxWidth:1280,margin:"0 auto",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
          <div>
            <div style={{ fontSize:14,fontWeight:700,color:"white",marginBottom:3 }}>Core9Tech Teknoloji A.Ş.</div>
            <div style={{ fontSize:12,color:"#475569" }}>ASBÜ Sosyokent Teknopark, Ankara &nbsp;·&nbsp; core9tech.com</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:12,color:"#475569" }}>Kaynak: Massenkoff & McCrory (2026) · Anthropic Economic Index</div>
            <div style={{ fontSize:12,color:"#334155",marginTop:3 }}>Pilot Demo v4.0 · Mart 2026 · © 2026 Core9Tech</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
