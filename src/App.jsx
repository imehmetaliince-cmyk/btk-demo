import { useState, useMemo, useRef, useEffect } from "react";
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
const getRisk = s => s>=65?{label:"YÜKSEK",c:C.r1c,bg:C.r1bg,br:C.r1br}:s>=45?{label:"ORTA-YÜKSEK",c:C.r2c,bg:C.r2bg,br:C.r2br}:s>=25?{label:"ORTA",c:C.r3c,bg:C.r3bg,br:C.r3br}:{label:"DÜŞÜK",c:C.r4c,bg:C.r4bg,br:C.r4br};
const getMapColor = s => s>=60?{fill:"#fca5a5",stroke:"#ef4444"}:s>=40?{fill:"#fdba74",stroke:"#f97316"}:s>=25?{fill:"#fde68a",stroke:"#d97706"}:{fill:"#86efac",stroke:"#16a34a"};
const getPriority = (idx,score) => idx===0?score>=60?{label:"Yüksek Öncelikli",c:C.r1c,bg:C.r1bg,br:C.r1br}:score>=35?{label:"Yüksek Öncelikli",c:C.r2c,bg:C.r2bg,br:C.r2br}:{label:"Yüksek Öncelikli",c:C.r3c,bg:C.r3bg,br:C.r3br}:idx===1?score>=50?{label:"Öncelikli",c:C.r2c,bg:C.r2bg,br:C.r2br}:{label:"Öncelikli",c:C.r3c,bg:C.r3bg,br:C.r3br}:{label:"Orta",c:C.r3c,bg:C.r3bg,br:C.r3br};
const fmtW = w => w>=1000000?(w/1000000).toFixed(1)+"M":(w/1000).toFixed(0)+"K";
const VW=1020,VH=480,LON0=25.5,LOND=20.5,LAT0=42.5,LATD=7.0;
const tx = lon => ((lon-LON0)/LOND)*VW;
const ty = lat => ((LAT0-lat)/LATD)*VH;
const NAT_AVG = Math.round(PROFESSIONS.reduce((s,p)=>s+p.score,0)/PROFESSIONS.length);

// ─── KURUM PRELİMİNER VERİSİ ─────────────────────────────────────────────────
const INSTITUTION_PRESETS = {
  // KAMU
  "Çalışma ve Sosyal Güvenlik Bakanlığı":{"İdari Hizmetler":30,"Kamu":35,"Finans":15,"Hukuk Hizmetleri":10,"Hizmet":10},
  "SGK":{"Finans":25,"İdari Hizmetler":40,"Kamu":25,"Bilgi ve İletişim":10},
  "BTK":{"Bilgi ve İletişim":55,"Kamu":25,"İletişim":20},
  "MEB":{"Eğitim":75,"Kamu":15,"İdari Hizmetler":10},
  "Hazine ve Maliye Bakanlığı":{"Finans":50,"Kamu":30,"İdari Hizmetler":20},
  "Sağlık Bakanlığı":{"Sağlık Hizmetleri":60,"Kamu":25,"İdari Hizmetler":15},
  "İŞKUR":{"Kamu":40,"İdari Hizmetler":30,"İş Hizmetleri":30},
  "KOSGEB":{"İş Hizmetleri":45,"Kamu":30,"Finans":25},
  "Büyükşehir Belediyesi":{"Kamu":35,"İdari Hizmetler":25,"İnşaat":20,"Hizmet":10,"Bilgi ve İletişim":10},
  "Devlet Üniversitesi":{"Eğitim":65,"Bilgi ve İletişim":15,"İdari Hizmetler":20},
  "ÖSYM":{"Kamu":40,"İdari Hizmetler":35,"Bilgi ve İletişim":25},
  "TCMB / Merkez Bankası":{"Finans":60,"Kamu":25,"Bilgi ve İletişim":15},
  // ÖZEL SEKTÖR
  "Banka / Özel Finans":{"Finans":65,"Bilgi ve İletişim":20,"İdari Hizmetler":15},
  "Teknoloji / Yazılım Şirketi":{"Bilgi ve İletişim":75,"İş Hizmetleri":15,"İdari Hizmetler":10},
  "Özel Hastane / Klinik":{"Sağlık Hizmetleri":70,"İdari Hizmetler":20,"Bilgi ve İletişim":10},
  "Hukuk Bürosu":{"Hukuk":60,"Hukuk Hizmetleri":20,"İdari Hizmetler":20},
  "Yönetim Danışmanlığı":{"İş Hizmetleri":55,"Bilgi ve İletişim":25,"İdari Hizmetler":20},
  "Üretim / İmalat Fabrikası":{"Sanayi":50,"İdari Hizmetler":20,"Ticaret":20,"Bilgi ve İletişim":10},
  "Lojistik / Kargo Şirketi":{"Ulaştırma":60,"İdari Hizmetler":25,"Ticaret":15},
  "Perakende / E-Ticaret":{"Ticaret":55,"Ulaştırma":20,"İdari Hizmetler":15,"Bilgi ve İletişim":10},
  "Sigorta Şirketi":{"Finans":65,"İdari Hizmetler":20,"Bilgi ve İletişim":15},
  "Medya / Yayın Kuruluşu":{"Medya":50,"İletişim":30,"İdari Hizmetler":20},
  "Özel Okul / Eğitim Kurumu":{"Eğitim":70,"İdari Hizmetler":20,"Bilgi ve İletişim":10},
  "Gayrimenkul Şirketi":{"Gayrimenkul":55,"Finans":25,"İdari Hizmetler":20},
};

const INST_TYPES = {
  "Çalışma ve Sosyal Güvenlik Bakanlığı":"kamu","SGK":"kamu","BTK":"kamu","MEB":"kamu",
  "Hazine ve Maliye Bakanlığı":"kamu","Sağlık Bakanlığı":"kamu","İŞKUR":"kamu","KOSGEB":"kamu",
  "Büyükşehir Belediyesi":"kamu","Devlet Üniversitesi":"kamu","ÖSYM":"kamu","TCMB / Merkez Bankası":"kamu",
};

// ─── EĞİTİM PLANI HESAPLAYICI ────────────────────────────────────────────────
function calcTrainingPlan(sectorWeights, headcount) {
  let totalW=0, weightedScore=0;
  const courseFreq={}, riskDist={h:0,mh:0,m:0,l:0};
  Object.entries(sectorWeights).forEach(([sector,pct])=>{
    const profs=PROFESSIONS.filter(p=>p.sector===sector);
    if(!profs.length) return;
    const w=pct/100; totalW+=w;
    profs.forEach(p=>{
      const pw=w/profs.length;
      weightedScore+=p.score*pw;
      if(p.score>=65)riskDist.h+=pw; else if(p.score>=45)riskDist.mh+=pw; else if(p.score>=25)riskDist.m+=pw; else riskDist.l+=pw;
      p.courses.forEach((c,i)=>{ courseFreq[c]=(courseFreq[c]||0)+(5-i)*pw; });
    });
  });
  if(totalW===0) return null;
  const avgScore=Math.round(weightedScore/totalW);
  const normRisk={h:Math.round(riskDist.h/totalW*100),mh:Math.round(riskDist.mh/totalW*100),m:Math.round(riskDist.m/totalW*100),l:Math.round(riskDist.l/totalW*100)};
  const isHigh=avgScore>=55, isMed=avgScore>=35&&avgScore<55;
  const numCourses=isHigh?10:isMed?8:6;
  const hoursByPos={high:[24,20,16,16,12,12,8,8,8,8],medium:[16,14,12,10,8,8,6,6],low:[8,8,6,6,6,4]};
  const partByPos={high:[100,90,80,70,65,55,50,45,40,35],medium:[80,70,65,55,45,35,30,25],low:[60,50,45,35,30,20]};
  const hk=isHigh?"high":isMed?"medium":"low";
  const topCourses=Object.entries(courseFreq).sort((a,b)=>b[1]-a[1]).slice(0,numCourses).map(([course],i)=>{
    const priority=isHigh?(i<3?"Kritik":i<6?"Yüksek":"Standart"):isMed?(i<2?"Kritik":i<5?"Yüksek":"Standart"):(i<1?"Kritik":i<3?"Yüksek":"Standart");
    const hours=hoursByPos[hk][i]||6;
    const participants=Math.round(headcount*(partByPos[hk][i]||15)/100);
    return {course,priority,hours,participants,personHours:hours*participants};
  });
  const totalPersonHours=topCourses.reduce((s,c)=>s+c.personHours,0);
  const totalHoursPerPerson=topCourses.reduce((s,c)=>s+c.hours,0);
  const monthlyCapacity=isHigh?40:isMed?24:16;
  const durationMonths=Math.max(1,Math.ceil(totalHoursPerPerson/monthlyCapacity));
  const durationLabel=durationMonths<=2?`${durationMonths} ay — Yoğun Dönüşüm`:durationMonths<=4?`${durationMonths} ay — Standart Program`:durationMonths<=7?`${durationMonths} ay — Kademeli Program`:`${durationMonths} ay — Uzun Vadeli Dönüşüm`;
  const intensity=isHigh?"Kritik Dönüşüm":isMed?"Orta Dönüşüm":"Temel Uyum";
  const vsNational=avgScore-NAT_AVG;
  return {avgScore,normRisk,topCourses,totalPersonHours,totalHoursPerPerson,monthlyCapacity,durationMonths,durationLabel,headcount,intensity,vsNational,numCourses};
}

// ─── EĞİTİM TAKİP DEPOLAMA ──────────────────────────────────────────────────
const TK="tame_training_v1";
const loadTD=()=>{ try{ return JSON.parse(localStorage.getItem(TK)||"{}"); }catch{ return {}; }};
const saveTD=d=>{ try{ localStorage.setItem(TK,JSON.stringify(d)); }catch{} };

const DEFAULT_COURSES=["Temel Yapay Zeka Okuryazarlığı","Dijital Dönüşüm Temelleri","Veri Analitiği ve İş Zekası","Üretken Yapay Zeka Araçları ile Çalışma","Siber Güvenlik Farkındalığı","Yapay Zeka Etik ve Sorumluluk"];

function getInstitutionCourses(instName) {
  const preset=INSTITUTION_PRESETS[instName];
  if(!preset) return DEFAULT_COURSES;
  const plan=calcTrainingPlan(preset,1000);
  if(!plan||!plan.topCourses.length) return DEFAULT_COURSES;
  return plan.topCourses.map(c=>c.course);
}

// ─── DEMO VERİ YÜKLE ─────────────────────────────────────────────────────────
function loadDemoData() {
  const courses=getInstitutionCourses("BTK");
  const now=new Date();
  const daysAgo=(d)=>new Date(now-d*86400000).toISOString();
  const demoData={
    "BTK":{
      hrNote:"BTK pilot eğitim programı Mart 2026 itibarıyla başlatılmıştır. Tüm personelin 6 ay içinde temel AI modüllerini tamamlaması hedeflenmektedir.",
      customCourses:[],
      employees:[
        {id:"emp1",name:"Ayşe Yılmaz",dept:"Yazılım ve Altyapı",addedAt:daysAgo(14),completions:{
          [courses[0]]:{status:"approved",certRef:"BTK-2026-0142",submittedAt:daysAgo(7)},
          [courses[1]]:{status:"approved",certRef:"BTK-2026-0155",submittedAt:daysAgo(5)},
          [courses[2]]:{status:"pending", certRef:"BTK-2026-0189",submittedAt:daysAgo(1)},
        }},
        {id:"emp2",name:"Mehmet Demir",dept:"Regülasyon Birimi",addedAt:daysAgo(14),completions:{
          [courses[0]]:{status:"approved",certRef:"BTK-2026-0143",submittedAt:daysAgo(8)},
          [courses[1]]:{status:"rejected",certRef:"",submittedAt:daysAgo(6)},
        }},
        {id:"emp3",name:"Zeynep Kaya",dept:"Veri Analiz",addedAt:daysAgo(12),completions:{
          [courses[0]]:{status:"approved",certRef:"BTK-2026-0151",submittedAt:daysAgo(6)},
          [courses[1]]:{status:"approved",certRef:"BTK-2026-0162",submittedAt:daysAgo(4)},
          [courses[2]]:{status:"approved",certRef:"BTK-2026-0177",submittedAt:daysAgo(2)},
          [courses[3]]:{status:"pending", certRef:"BTK-2026-0201",submittedAt:daysAgo(1)},
        }},
        {id:"emp4",name:"Ali Çelik",dept:"İdari İşler",addedAt:daysAgo(10),completions:{
          [courses[0]]:{status:"pending",certRef:"BTK-2026-0198",submittedAt:daysAgo(2)},
        }},
        {id:"emp5",name:"Fatma Arslan",dept:"Yazılım ve Altyapı",addedAt:daysAgo(10),completions:{
          [courses[0]]:{status:"approved",certRef:"BTK-2026-0159",submittedAt:daysAgo(7)},
          [courses[1]]:{status:"approved",certRef:"BTK-2026-0171",submittedAt:daysAgo(5)},
          [courses[2]]:{status:"approved",certRef:"BTK-2026-0185",submittedAt:daysAgo(3)},
          [courses[3]]:{status:"approved",certRef:"BTK-2026-0196",submittedAt:daysAgo(1)},
        }},
        {id:"emp6",name:"Hasan Öztürk",dept:"Regülasyon Birimi",addedAt:daysAgo(8),completions:{}},
        {id:"emp7",name:"Selin Yıldız",dept:"Veri Analiz",addedAt:daysAgo(7),completions:{
          [courses[0]]:{status:"approved",certRef:"BTK-2026-0167",submittedAt:daysAgo(5)},
        }},
        {id:"emp8",name:"Burak Şahin",dept:"İdari İşler",addedAt:daysAgo(6),completions:{
          [courses[0]]:{status:"approved",certRef:"BTK-2026-0173",submittedAt:daysAgo(4)},
          [courses[1]]:{status:"pending",certRef:"BTK-2026-0204",submittedAt:daysAgo(0)},
        }},
      ],
    },
  };
  saveTD(demoData);
  return demoData;
}


// ─── PDF RAPOR (GÖRSELLEŞTİRİLMİŞ) ─────────────────────────────────────────
function generateReport(plan, institutionName) {
  const top15=[...PROFESSIONS].sort((a,b)=>b.score-a.score).slice(0,15);
  const byScore={h:0,mh:0,m:0,l:0};
  PROFESSIONS.forEach(p=>{ if(p.score>=65)byScore.h++; else if(p.score>=45)byScore.mh++; else if(p.score>=25)byScore.m++; else byScore.l++; });
  const totalAtRisk=PROFESSIONS.filter(p=>p.score>=50).reduce((s,p)=>s+p.workers,0);
  const total=PROFESSIONS.length;

  // SVG: Donut chart segmentleri
  const segments=[
    {count:byScore.h, color:"#b91c1c", label:"Yüksek"},
    {count:byScore.mh,color:"#c2410c", label:"Orta-Y."},
    {count:byScore.m, color:"#b45309", label:"Orta"},
    {count:byScore.l, color:"#15803d", label:"Düşük"},
  ];
  let cumAngle=-Math.PI/2;
  const CX=80,CY=80,R=65,IR=40;
  const donutPaths=segments.map(seg=>{
    const angle=(seg.count/total)*2*Math.PI;
    const x1=CX+R*Math.cos(cumAngle),y1=CY+R*Math.sin(cumAngle);
    cumAngle+=angle;
    const x2=CX+R*Math.cos(cumAngle),y2=CY+R*Math.sin(cumAngle);
    const ix1=CX+IR*Math.cos(cumAngle-angle),iy1=CY+IR*Math.sin(cumAngle-angle);
    const ix2=CX+IR*Math.cos(cumAngle),iy2=CY+IR*Math.sin(cumAngle);
    const large=angle>Math.PI?1:0;
    return `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${ix2.toFixed(1)},${iy2.toFixed(1)} A${IR},${IR} 0 ${large},0 ${ix1.toFixed(1)},${iy1.toFixed(1)} Z" fill="${seg.color}" stroke="white" stroke-width="2"/>`;
  }).join('');

  // SVG: Top 15 meslek yatay bar
  const BAR_H=top15.length*28+20;
  const topBars=top15.map((p,i)=>{
    const bw=Math.round(p.score/100*340);
    const color=p.score>=65?"#b91c1c":p.score>=45?"#c2410c":"#b45309";
    const y=10+i*28;
    const title=p.title.length>26?p.title.slice(0,25)+"…":p.title;
    return `<g><text x="0" y="${y+13}" font-size="9.5" fill="#475569">${title}</text><rect x="0" y="${y+15}" width="340" height="8" rx="3" fill="#e2e8f0"/><rect x="0" y="${y+15}" width="${bw}" height="8" rx="3" fill="${color}"/><text x="${bw+4}" y="${y+23}" font-size="9" fill="${color}" font-weight="700">%${p.score}</text></g>`;
  }).join('');

  // SVG: Top 15 il yatay bar
  const top15prov=[...PROVINCES].sort((a,b)=>b.score-a.score).slice(0,15);
  const PROV_H=top15prov.length*22+16;
  const provBars=top15prov.map((p,i)=>{
    const bw=Math.round(p.score/100*300);
    const color=p.score>=60?"#ef4444":p.score>=40?"#f97316":"#d97706";
    const y=i*22+6;
    return `<g><text x="0" y="${y+13}" font-size="9.5" fill="#0f172a" font-weight="600">${p.name}</text><rect x="64" y="${y+3}" width="300" height="10" rx="3" fill="#e2e8f0"/><rect x="64" y="${y+3}" width="${bw}" height="10" rx="3" fill="${color}"/><text x="368" y="${y+13}" font-size="9" fill="${color}" font-weight="700">%${p.score}</text></g>`;
  }).join('');

  // Eğitim Gantt
  const maxHrs=plan?Math.max(...plan.topCourses.map(c=>c.hours)):1;
  const ganttBars=plan?plan.topCourses.map((c,i)=>{
    const bw=Math.round((c.hours/maxHrs)*300);
    const color=c.priority==="Kritik"?"#b91c1c":c.priority==="Yüksek"?"#c2410c":"#b45309";
    const y=i*24+6;
    const title=c.course.length>28?c.course.slice(0,27)+"…":c.course;
    return `<g><text x="0" y="${y+12}" font-size="9" fill="#475569">${title}</text><rect x="0" y="${y+13}" width="${bw}" height="8" rx="3" fill="${color}" opacity="0.8"/><text x="${bw+4}" y="${y+21}" font-size="8" fill="${color}" font-weight="700">${c.hours}s</text></g>`;
  }).join(''):'';
  const GANTT_H=plan?(plan.topCourses.length*24+20):0;

  const theAvgTh=Math.round(PROFESSIONS.reduce((s,p)=>s+p.theoretical,0)/PROFESSIONS.length);
  const avgGap=Math.round(PROFESSIONS.reduce((s,p)=>s+(p.theoretical-p.score),0)/PROFESSIONS.length);

  const html=`<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8">
<title>TAME 2026 — Türkiye Dijital Beceri Açığı Raporu</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;background:#fff;font-size:13px}
.cover{background:linear-gradient(135deg,#0f2342 0%,#1e3a6b 100%);color:#fff;padding:56px 52px;min-height:100vh;display:flex;flex-direction:column;justify-content:space-between}
.cover h1{font-size:38px;font-weight:900;line-height:1.18;margin:24px 0 12px;letter-spacing:-1.5px;max-width:580px}
.section{padding:32px 52px;border-bottom:2px solid #f1f5f9}
.sec-hdr{display:flex;align-items:center;gap:10px;margin-bottom:18px}
.sec-hdr h2{font-size:19px;font-weight:800;color:#0f172a}
.sec-num{width:30px;height:30px;background:#0f2342;color:white;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;font-family:monospace;flex-shrink:0}
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}
.kpi{border-radius:10px;padding:14px 16px;border:1px solid}
.kpi .num{font-size:26px;font-weight:900;font-family:monospace;line-height:1;margin-bottom:4px}
.kpi .lbl{font-size:10.5px;font-weight:700}
.kpi .sub{font-size:9.5px;margin-top:2px;opacity:0.75}
.kr{background:#fef2f2;border-color:#fecaca}.kr .num,.kr .lbl{color:#b91c1c}
.ko{background:#fff7ed;border-color:#fed7aa}.ko .num,.ko .lbl{color:#c2410c}
.kb{background:#eff6ff;border-color:#bfdbfe}.kb .num,.kb .lbl{color:#1d4ed8}
.kg{background:#f0fdf4;border-color:#bbf7d0}.kg .num,.kg .lbl{color:#15803d}
.ks{background:#f8fafc;border-color:#e2e8f0}.ks .lbl{color:#475569}
.cb{background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:16px 18px}
.ct{font-size:9.5px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.ins{background:#eff6ff;border-left:4px solid #1d4ed8;border-radius:0 8px 8px 0;padding:12px 16px;margin-top:18px}
.ins h3{font-size:12px;font-weight:800;color:#1d4ed8;margin-bottom:5px}
.ins p{font-size:11px;color:#1e40af;line-height:1.7;margin:0}
.dbar{height:12px;border-radius:5px;overflow:hidden;display:flex;margin:8px 0}
.leg{display:flex;gap:12px;flex-wrap:wrap;font-size:10.5px}
.li{display:flex;align-items:center;gap:4px}
.ld{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.cr{display:flex;align-items:center;padding:8px 12px;border-radius:7px;margin-bottom:5px;gap:10px}
.cn{font-size:10.5px;font-weight:700;font-family:monospace;color:#94a3b8;width:18px;flex-shrink:0}
.cv{flex:1;min-width:0}
.cv .ct2{font-size:11.5px;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cv .cm{font-size:9.5px;color:#475569;margin-top:1px}
.cb2{padding:2px 7px;border-radius:3px;font-size:9.5px;font-weight:700;flex-shrink:0}
.cbk{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
.cby{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa}
.cbs{background:#fffbeb;color:#b45309;border:1px solid #fde68a}
.pt{width:100%;border-collapse:collapse}
.pt th{background:#0f2342;color:white;padding:7px 11px;font-size:10.5px;text-align:left}
.pt td{padding:6.5px 11px;font-size:10.5px;border-bottom:1px solid #f1f5f9}
.pt tr:nth-child(even) td{background:#f8fafc}
.sp{display:inline-block;padding:2px 7px;border-radius:3px;font-size:9.5px;font-weight:700;font-family:monospace}
.sph{background:#fef2f2;color:#b91c1c}
.spm{background:#fff7ed;color:#c2410c}
.spmo{background:#fffbeb;color:#b45309}
.spl{background:#f0fdf4;color:#15803d}
.footer{background:#0f2342;color:#475569;padding:16px 52px;display:flex;justify-content:space-between;font-size:10px}
@media print{.pb{page-break-before:always}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head><body>

<div class="cover">
  <div>
    <div style="background:#1e3a5f;color:#93c5fd;font-size:10px;font-weight:700;padding:4px 12px;border-radius:4px;border:1px solid #1d4ed8;letter-spacing:2px;display:inline-block;margin-bottom:8px">PİLOT ÇALIŞMA — MART 2026</div>
    <h1>Türkiye Dijital Beceri Açığı Raporu 2026</h1>
    <p style="font-size:14px;color:#94a3b8;line-height:1.75;max-width:560px;margin-bottom:28px">Anthropic'in Mart 2026 işgücü araştırması ${PROFESSIONS.length} meslek ve 81 il düzeyinde Türkiye NACE Rev.2 / ISCO-08 standartlarıyla eşleştirildi.</p>
    ${institutionName?`<div style="background:rgba(29,78,216,0.22);border:1px solid #1d4ed8;border-radius:9px;padding:12px 16px;display:inline-block"><div style="font-size:9.5px;color:#93c5fd;letter-spacing:1.5px;font-weight:700;margin-bottom:3px">HAZIRLANDIĞI KURUM</div><div style="font-size:18px;font-weight:800;color:white">${institutionName}</div></div>`:""}
  </div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08)">
    <div>
      <div style="font-size:20px;font-weight:900;color:white">TAME</div>
      <div style="font-size:11px;color:#475569;margin-top:2px">Türkiye AI Maruziyet Endeksi · Core9Tech Teknoloji A.Ş.</div>
    </div>
    <div style="text-align:right;font-size:10.5px;color:#334155">
      <div>Kaynak: Anthropic Economic Index · Massenkoff & McCrory (2026)</div>
      <div>core9tech.com · ASBÜ Sosyokent Teknopark, Ankara</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="sec-hdr"><div class="sec-num">01</div><h2>Yönetici Özeti</h2></div>
  <div class="kpi-row">
    <div class="kpi ks"><div class="num">${PROFESSIONS.length}</div><div class="lbl">Analiz Edilen Meslek</div><div class="sub">NACE Rev.2 + ISCO-08</div></div>
    <div class="kpi kr"><div class="num">${fmtW(totalAtRisk)}</div><div class="lbl">Yüksek Risk İşgücü</div><div class="sub">Maruziyet skoru %50+</div></div>
    <div class="kpi ko"><div class="num">${byScore.h}</div><div class="lbl">Kritik Meslek</div><div class="sub">%65 üzeri otomasyon</div></div>
    <div class="kpi kb"><div class="num">${NAT_AVG}%</div><div class="lbl">Ulusal Ort. Skor</div><div class="sub">Ağırlıksız ortalama</div></div>
  </div>

  <div class="two">
    <div class="cb">
      <div class="ct">Risk Skor Dağılımı — ${PROFESSIONS.length} Meslek</div>
      <div style="display:flex;align-items:center;gap:16px">
        <svg width="160" height="160" viewBox="0 0 160 160" style="flex-shrink:0">
          ${donutPaths}
          <text x="80" y="75" text-anchor="middle" font-size="20" font-weight="900" fill="#0f172a" font-family="monospace">${NAT_AVG}%</text>
          <text x="80" y="89" text-anchor="middle" font-size="8.5" fill="#94a3b8">ORTALAMA</text>
        </svg>
        <div style="flex:1">
          ${segments.map(s=>`<div style="display:flex;align-items:center;gap:7px;margin-bottom:9px">
            <div style="width:11px;height:11px;border-radius:3px;background:${s.color};flex-shrink:0"></div>
            <div><div style="font-size:14px;font-weight:800;color:${s.color};font-family:monospace">${s.count}</div><div style="font-size:9.5px;color:#475569">${s.label} (%${Math.round(s.count/total*100)})</div></div>
          </div>`).join("")}
        </div>
      </div>
    </div>
    <div class="cb">
      <div class="ct">Teorik Kapasite vs Gerçek Kullanım</div>
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:10.5px;margin-bottom:4px"><span style="color:#475569">Teorik AI Kapasitesi (ort.)</span><span style="color:#1d4ed8;font-weight:700;font-family:monospace">%${theAvgTh}</span></div>
        <div style="height:10px;background:#e2e8f0;border-radius:4px;overflow:hidden"><div style="height:100%;width:${theAvgTh}%;background:#1d4ed8;border-radius:4px"></div></div>
      </div>
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:10.5px;margin-bottom:4px"><span style="color:#475569">Gözlemlenen Maruziyet (ort.)</span><span style="color:#b91c1c;font-weight:700;font-family:monospace">%${NAT_AVG}</span></div>
        <div style="height:10px;background:#e2e8f0;border-radius:4px;overflow:hidden"><div style="height:100%;width:${NAT_AVG}%;background:#b91c1c;border-radius:4px"></div></div>
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:7px;padding:10px 12px">
        <div style="font-size:10.5px;font-weight:700;color:#b91c1c;margin-bottom:2px">Ort. Benimseme Açığı</div>
        <div style="font-size:24px;font-weight:900;color:#b91c1c;font-family:monospace">%${avgGap}</div>
        <div style="font-size:9.5px;color:#b45309;margin-top:2px">Eğitim yatırımı için fırsat penceresi</div>
      </div>
    </div>
  </div>
  <div class="ins">
    <h3>Temel Politika Bulgusu</h3>
    <p>Türkiye işgücünün yaklaşık <strong>%${Math.round(PROFESSIONS.filter(p=>p.score>=45).length/PROFESSIONS.length*100)}'i</strong> orta-yüksek veya yüksek AI maruziyet kategorisinde yer almaktadır. Teorik kapasite ile fiili kullanım arasındaki ortalama açık <strong>%${avgGap} puan</strong>tır. BTK Akademi ve İŞKUR programlarının bu mesleklere odaklanması kritik öneme sahiptir.</p>
  </div>
</div>

<div class="section pb">
  <div class="sec-hdr"><div class="sec-num">02</div><h2>En Riskli 15 Meslek — Görsel Analiz</h2></div>
  <div class="two">
    <div class="cb">
      <div class="ct">Maruziyet Skoru Karşılaştırması</div>
      <svg width="100%" viewBox="0 0 440 ${BAR_H}" preserveAspectRatio="xMidYMid meet" style="overflow:visible">
        <g transform="translate(96,0)">${topBars}</g>
      </svg>
    </div>
    <div>
      ${top15.map((p,i)=>{
        const spCls=p.score>=65?"sph":p.score>=45?"spm":"spmo";
        const gap=p.gap||+(p.theoretical-p.score).toFixed(1);
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f1f5f9">
          <div style="flex:1;min-width:0;margin-right:8px">
            <div style="font-size:10.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.title}</div>
            <div style="font-size:9px;color:#94a3b8">${p.sector} · ${fmtW(p.workers)} · Açık:%${gap}</div>
          </div>
          <span class="sp ${spCls}">%${p.score}</span>
        </div>`;
      }).join("")}
    </div>
  </div>
</div>

<div class="section pb">
  <div class="sec-hdr"><div class="sec-num">03</div><h2>Bölgesel Maruziyet Analizi</h2></div>
  <div class="two">
    <div class="cb">
      <div class="ct">En Yüksek Riskli 15 İl</div>
      <svg width="100%" viewBox="0 0 420 ${PROV_H}" preserveAspectRatio="xMidYMid meet">
        ${provBars}
      </svg>
    </div>
    <div>
      <table class="pt">
        <thead><tr><th>#</th><th>İl</th><th>Sektör</th><th>Skor</th></tr></thead>
        <tbody>
          ${[...PROVINCES].sort((a,b)=>b.score-a.score).slice(0,15).map((p,i)=>{
            const sc=p.score>=60?"sph":p.score>=40?"spm":"spmo";
            return `<tr><td style="color:#94a3b8;font-weight:700">${String(i+1).padStart(2,"0")}</td><td style="font-weight:600">${p.name}</td><td style="color:#475569;font-size:9.5px">${p.sector}</td><td><span class="sp ${sc}">%${p.score}</span></td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  </div>
  <div class="ins" style="background:#f0fdf4;border-left-color:#15803d">
    <h3 style="color:#15803d">Bölgesel Politika Notu</h3>
    <p style="color:#166534">Batı illeri finans ve BİT sektörlerinin yoğunluğu nedeniyle yüksek maruziyet sergiliyken, Doğu Anadolu illeri daha düşük skorlar göstermektedir. Batıda dönüşüm programları, doğuda temel dijital okuryazarlık programları öncelik kazanmalıdır.</p>
  </div>
</div>

${plan?`
<div class="section pb">
  <div class="sec-hdr"><div class="sec-num">04</div><h2>Kişiselleştirilmiş Eğitim Planı${institutionName?` — ${institutionName}`:""}</h2></div>
  <div class="kpi-row">
    <div class="kpi kr"><div class="num">%${plan.avgScore}</div><div class="lbl">Kurum Risk Skoru</div><div class="sub">${plan.intensity}</div></div>
    <div class="kpi kb"><div class="num">${plan.topCourses.length}</div><div class="lbl">Eğitim Modülü</div><div class="sub">Risk düzeyine özel</div></div>
    <div class="kpi ks"><div class="num">${Math.round(plan.totalHoursPerPerson)}s</div><div class="lbl">Kişi Başı Yük</div><div class="sub">${plan.monthlyCapacity}s/ay</div></div>
    <div class="kpi kg"><div class="num">${plan.durationMonths} ay</div><div class="lbl">Program Süresi</div><div class="sub">${plan.durationLabel.split("—")[1]?.trim()||""}</div></div>
  </div>
  <div class="cb" style="margin-bottom:18px">
    <div class="ct">Kurum Risk Profili</div>
    <div class="dbar">
      <div style="width:${plan.normRisk.h}%;background:#b91c1c"></div>
      <div style="width:${plan.normRisk.mh}%;background:#c2410c"></div>
      <div style="width:${plan.normRisk.m}%;background:#b45309"></div>
      <div style="width:${plan.normRisk.l}%;background:#15803d"></div>
    </div>
    <div class="leg">
      <span class="li"><span class="ld" style="background:#b91c1c"></span><strong>%${plan.normRisk.h}</strong> Yüksek</span>
      <span class="li"><span class="ld" style="background:#c2410c"></span><strong>%${plan.normRisk.mh}</strong> Orta-Y.</span>
      <span class="li"><span class="ld" style="background:#b45309"></span><strong>%${plan.normRisk.m}</strong> Orta</span>
      <span class="li"><span class="ld" style="background:#15803d"></span><strong>%${plan.normRisk.l}</strong> Düşük</span>
    </div>
  </div>
  <div class="two">
    <div>
      <div class="ct" style="margin-bottom:10px">EĞİTİM MODÜLLERI</div>
      ${plan.topCourses.map((c,i)=>{
        const clsCr=c.priority==="Kritik"?"cbk":c.priority==="Yüksek"?"cby":"cbs";
        const rowBg=c.priority==="Kritik"?"#fef2f2":c.priority==="Yüksek"?"#fff7ed":"#fffbeb";
        return `<div class="cr" style="background:${rowBg}">
          <span class="cn">${String(i+1).padStart(2,"0")}</span>
          <div class="cv"><div class="ct2">${c.course}</div><div class="cm">${c.hours}s × ${c.participants.toLocaleString("tr")} kişi = ${c.personHours.toLocaleString("tr")} kişi-saat</div></div>
          <span class="cb2 ${clsCr}">${c.priority}</span>
        </div>`;
      }).join("")}
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;margin-top:6px;display:flex;justify-content:space-between">
        <span style="font-size:10.5px;font-weight:700;color:#475569">TOPLAM KİŞİ-SAAT</span>
        <span style="font-size:10.5px;font-family:monospace;font-weight:700;color:#0f172a">${plan.totalPersonHours.toLocaleString("tr")}</span>
      </div>
    </div>
    <div class="cb">
      <div class="ct">Eğitim Yükü Dağılımı (Saat/Kurs)</div>
      <svg width="100%" viewBox="0 0 360 ${GANTT_H}" preserveAspectRatio="xMidYMid meet" style="overflow:visible">
        <g transform="translate(0,0)">${ganttBars}</g>
      </svg>
      <div class="ins" style="margin-top:10px;padding:9px 12px">
        <h3>Hesap</h3>
        <p>${plan.topCourses.length} modül × ort. ${Math.round(plan.totalHoursPerPerson/plan.topCourses.length)}s = ${Math.round(plan.totalHoursPerPerson)}s/kişi ÷ ${plan.monthlyCapacity}s/ay = <strong>${plan.durationMonths} ay</strong></p>
      </div>
    </div>
  </div>
</div>
`:""}

<div class="section">
  <div class="sec-hdr"><div class="sec-num">${plan?"05":"04"}</div><h2>Kaynakça</h2></div>
  <div class="three">
    ${[
      {t:"Anthropic Economic Index",d:"Massenkoff & McCrory (2026) · Mart 5, 2026",u:"huggingface.co/datasets/Anthropic/EconomicIndex"},
      {t:"TÜİK İşgücü Araştırması",d:"2024 Hanehalkı İşgücü Araştırması",u:"tuik.gov.tr"},
      {t:"ISCO-08 / NACE Rev.2",d:"ILO / EUROSTAT · TÜİK Uyarlaması",u:"ilo.org"},
    ].map(s=>`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:11px 13px">
      <div style="font-size:11px;font-weight:700;margin-bottom:3px">${s.t}</div>
      <div style="font-size:9.5px;color:#475569;margin-bottom:2px">${s.d}</div>
      <div style="font-size:9.5px;color:#1d4ed8">${s.u}</div>
    </div>`).join("")}
  </div>
</div>

<div class="footer">
  <span>TAME — Türkiye AI Maruziyet Endeksi · Core9Tech Teknoloji A.Ş. · Pilot Demo v5.0 · Mart 2026</span>
  <span>core9tech.com · ASBÜ Sosyokent Teknopark, Ankara</span>
</div>
<script>window.onload=()=>window.print();</script>
</body></html>`;
  return html;
}

// ─── MODAL: SKOR ─────────────────────────────────────────────────────────────
function ScoreModal({onClose}) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,35,66,0.55)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,width:"100%",maxWidth:620,maxHeight:"88vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.18)"}}>
        <div style={{padding:"22px 26px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><h2 style={{fontSize:17,fontWeight:700,color:C.text,marginBottom:3}}>Maruziyet Skoru Nasıl Hesaplanır?</h2><p style={{fontSize:12,color:C.textMuted,margin:0}}>Observed Exposure — Massenkoff & McCrory, Anthropic (Mart 2026)</p></div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,width:32,height:32,cursor:"pointer",fontSize:18,color:C.textSec,lineHeight:1}}>×</button>
        </div>
        <div style={{padding:"22px 26px"}}>
          <div style={{background:C.accentLight,border:"1px solid #bfdbfe",borderRadius:8,padding:"12px 14px",marginBottom:20}}>
            <p style={{fontSize:13,color:"#1e40af",lineHeight:1.75,margin:0}}><strong>Temel soru:</strong> Bir meslekte görevler, büyük dil modelleri tarafından ne ölçüde <em>fiilen</em> gerçekleştiriliyor? Bu skor teorik potansiyeli değil, gerçek dünya kullanımını ölçer.</p>
          </div>
          {[{n:"01",color:"#1d4ed8",title:"Teorik AI Kapasitesi",body:"Bir mesleğin görevlerinin yapay zeka tarafından teorik olarak ne kadarının gerçekleştirilebileceğini ölçer. O*NET iş tanımları LLM yetkinlik matrisi ile çapraz eşleştirilerek hesaplanır."},{n:"02",color:"#7c3aed",title:"Fiili Kullanım Oranı (Claude API)",body:"Anthropic'in Claude API gerçek dünya kullanım örüntülerinden türetilir. 'Teorik yapabilir' ile 'pratikte kullanılıyor' arasındaki farkı ortaya çıkarır."},{n:"03",color:"#dc2626",title:"Gözlemlenen Maruziyet = Sonuç Skoru",body:"Teorik Kapasite × Fiili Kullanım Yoğunluğu bileşimidir. Programcılar için teorik kapasite %94 iken gözlemlenen maruziyet %74.5 — pratikte tam kapasite henüz kullanılmıyor."}].map(s=>(
            <div key={s.n} style={{display:"flex",gap:12,marginBottom:14}}>
              <div style={{width:30,height:30,borderRadius:7,background:s.color,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0,fontFamily:"monospace"}}>{s.n}</div>
              <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,padding:"10px 12px",flex:1}}>
                <div style={{fontWeight:700,fontSize:12,color:C.text,marginBottom:4}}>{s.title}</div>
                <div style={{fontSize:11,color:C.textSec,lineHeight:1.7}}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MODAL: HERO STAT ────────────────────────────────────────────────────────
function HeroModal({type,stats,onClose}) {
  if(!type) return null;
  const hr=PROFESSIONS.filter(p=>p.score>=65).sort((a,b)=>b.score-a.score);
  const wf=PROFESSIONS.filter(p=>p.score>=50).sort((a,b)=>b.score-a.score);
  const sm={};
  wf.forEach(p=>{ if(!sm[p.sector])sm[p.sector]={workers:0,count:0,max:0}; sm[p.sector].workers+=p.workers;sm[p.sector].count+=1;sm[p.sector].max=Math.max(sm[p.sector].max,p.score); });
  const ts=Object.entries(sm).map(([n,d])=>({n,...d})).sort((a,b)=>b.workers-a.workers).slice(0,8);
  const titles={workforce:"Yüksek Risk İşgücü — Kimler Etkileniyor?",critical:"Kritik Meslekler — %65 Üzeri Maruziyet",avg:"Ortalama Skor Nasıl Hesaplandı?"};
  const subs={workforce:`Türkiye'de ${fmtW(stats.atRisk)} çalışan AI dönüşümünün yoğun baskısı altında`,critical:`${hr.length} meslek grubunda görevlerin büyük çoğunluğu AI tarafından üstleniliyor`,avg:`${PROFESSIONS.length} mesleğin gözlemlenen maruziyet skorlarının ağırlıksız ortalaması`};
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,35,66,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,width:"100%",maxWidth:type==="critical"?780:660,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 28px 80px rgba(0,0,0,0.22)"}}>
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",background:"#0f2342",borderRadius:"14px 14px 0 0"}}>
          <div><h2 style={{fontSize:16,fontWeight:800,color:"white",marginBottom:3}}>{titles[type]}</h2><p style={{fontSize:11,color:"#93c5fd",margin:0}}>{subs[type]}</p></div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,width:30,height:30,cursor:"pointer",fontSize:16,color:"white",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:"22px 24px"}}>
          {type==="workforce"&&(<>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
              {[{val:fmtW(stats.atRisk),label:"Toplam Riskli İşgücü",desc:"Skor %50+",c:"#b91c1c",bg:"#fef2f2",br:"#fecaca"},{val:fmtW(PROFESSIONS.filter(p=>p.score>=65).reduce((s,p)=>s+p.workers,0)),label:"Kritik Risk İşgücü",desc:"Skor %65+",c:"#c2410c",bg:"#fff7ed",br:"#fed7aa"},{val:PROFESSIONS.filter(p=>p.score>=50).length+"",label:"Etkilenen Meslek",desc:`${PROFESSIONS.length} mesleğin ${Math.round(PROFESSIONS.filter(p=>p.score>=50).length/PROFESSIONS.length*100)}%'i`,c:"#b45309",bg:"#fffbeb",br:"#fde68a"}].map(s=>(
                <div key={s.label} style={{background:s.bg,border:`1px solid ${s.br}`,borderRadius:9,padding:"12px 14px"}}><div style={{fontSize:22,fontWeight:900,color:s.c,fontFamily:"monospace",lineHeight:1}}>{s.val}</div><div style={{fontSize:11,fontWeight:700,color:s.c,marginTop:4}}>{s.label}</div><div style={{fontSize:10,color:C.textMuted,marginTop:2}}>{s.desc}</div></div>
              ))}
            </div>
            {ts.map(s=>{const col=s.max>=65?{c:C.r1c,bg:C.r1bg,br:C.r1br}:{c:C.r2c,bg:C.r2bg,br:C.r2br};const pct=Math.round(s.workers/stats.atRisk*100);return(
              <div key={s.n} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,padding:"9px 12px",marginBottom:5}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div><span style={{fontSize:13,fontWeight:600,color:C.text}}>{s.n}</span><span style={{fontSize:10,color:C.textMuted,marginLeft:6}}>{s.count} meslek</span></div><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:10,fontWeight:700,color:col.c,background:col.bg,border:`1px solid ${col.br}`,borderRadius:3,padding:"2px 6px"}}>max %{s.max}</span><span style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"monospace"}}>{fmtW(s.workers)}</span></div></div>
                <div style={{height:4,background:C.border,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:col.c,borderRadius:2}}/></div>
              </div>
            );})}
            <div style={{marginTop:14,background:C.r1bg,border:`1px solid ${C.r1br}`,borderRadius:9,padding:"12px 14px"}}>
              <div style={{fontSize:10,fontWeight:700,color:C.r1c,letterSpacing:1,marginBottom:8}}>EN YÜKSEK MARUZIYET — İLK 5</div>
              {wf.slice(0,5).map(p=>(
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,0.6)",borderRadius:5,padding:"7px 10px",marginBottom:4}}>
                  <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{p.title}</div><div style={{fontSize:10,color:C.textMuted}}>{p.sector} · {fmtW(p.workers)}</div></div>
                  <div style={{fontSize:15,fontWeight:900,color:C.r1c,fontFamily:"monospace"}}>%{p.score}</div>
                </div>
              ))}
            </div>
          </>)}
          {type==="critical"&&(<>
            <div style={{background:C.r1bg,border:`1px solid ${C.r1br}`,borderRadius:9,padding:"10px 14px",marginBottom:16}}><p style={{fontSize:12,color:C.r1c,lineHeight:1.7,margin:0}}><strong>%65 eşiği:</strong> Bu grupta görevlerin büyük çoğunluğu Claude API verilerine göre AI tarafından aktif olarak üstleniliyor.</p></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
              {hr.map(p=>(
                <div key={p.id} style={{background:C.surface,border:`1px solid ${C.r1br}`,borderLeft:`3px solid ${C.r1c}`,borderRadius:7,padding:"9px 11px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{flex:1,minWidth:0,marginRight:8}}><div style={{fontSize:12,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div><div style={{fontSize:9,color:C.textMuted,marginTop:1}}>{p.sector}</div><div style={{height:3,background:C.bg,borderRadius:2,marginTop:4,overflow:"hidden"}}><div style={{height:"100%",width:`${p.score}%`,background:C.r1c,borderRadius:2}}/></div></div>
                  <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:15,fontWeight:900,color:C.r1c,fontFamily:"monospace"}}>%{p.score}</div><div style={{fontSize:9,color:C.textMuted}}>Teo:%{p.theoretical}</div></div>
                </div>
              ))}
            </div>
          </>)}
          {type==="avg"&&(<>
            <div style={{background:"#0f2342",borderRadius:9,padding:"16px 18px",marginBottom:20,textAlign:"center"}}>
              <div style={{fontSize:10,color:"#93c5fd",letterSpacing:1,marginBottom:6}}>HESAPLAMA</div>
              <div style={{fontSize:18,fontWeight:900,color:"white",fontFamily:"monospace"}}>Σ(skorlar) ÷ {PROFESSIONS.length}</div>
              <div style={{fontSize:13,color:"#94a3b8",marginTop:6}}>= {PROFESSIONS.reduce((s,p)=>s+p.score,0).toFixed(1)} ÷ {PROFESSIONS.length} = <span style={{color:"#fbbf24",fontWeight:800}}>%{stats.avg}</span></div>
            </div>
            {[{label:"Yüksek (%65+)",count:PROFESSIONS.filter(p=>p.score>=65).length,c:C.r1c,bg:C.r1bg,br:C.r1br},{label:"Orta-Yüksek (%45–64)",count:PROFESSIONS.filter(p=>p.score>=45&&p.score<65).length,c:C.r2c,bg:C.r2bg,br:C.r2br},{label:"Orta (%25–44)",count:PROFESSIONS.filter(p=>p.score>=25&&p.score<45).length,c:C.r3c,bg:C.r3bg,br:C.r3br},{label:"Düşük (%25 altı)",count:PROFESSIONS.filter(p=>p.score<25).length,c:C.r4c,bg:C.r4bg,br:C.r4br}].map(row=>{const pct=Math.round(row.count/PROFESSIONS.length*100);return(
              <div key={row.label} style={{marginBottom:9}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span style={{color:row.c,fontWeight:600}}>{row.label}</span><span style={{fontFamily:"monospace",color:C.text,fontWeight:700}}>{row.count} meslek (%{pct})</span></div>
                <div style={{height:7,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:row.c,borderRadius:4}}/></div>
              </div>
            );})}
          </>)}
        </div>
      </div>
    </div>
  );
}

// ─── ÖNCELİK MATRİSİ ────────────────────────────────────────────────────────
function PriorityMatrix() {
  const [tooltip,setTooltip]=useState(null);const [activeQ,setActiveQ]=useState(null);const svgRef=useRef(null);
  const SW=820,SH=480,ML=72,MR=16,MT=28,MB=50,PW=SW-ML-MR,PH=SH-MT-MB;
  const SD=45,WD=100000,LMN=Math.log10(1000),LMX=Math.log10(6000000);
  const xs=s=>ML+(s/100)*PW;const ys=w=>{const lw=Math.log10(Math.max(w,1000));return MT+PH-((lw-LMN)/(LMX-LMN))*PH;};
  const xd=xs(SD),yd=ys(WD);
  const getQ=(s,w)=>s>=SD&&w>=WD?"urgent":s>=SD&&w<WD?"strategy":s<SD&&w>=WD?"opportunity":"watch";
  const QC={urgent:{label:"ACİL MÜDAHALE",c:"#b91c1c",bg:"rgba(254,242,242,0.65)",desc:"Yüksek risk + geniş kitle"},strategy:{label:"STRATEJİK",c:"#c2410c",bg:"rgba(255,247,237,0.65)",desc:"Yüksek risk + niş kitle"},opportunity:{label:"DÖNÜŞÜM FIRSATI",c:"#15803d",bg:"rgba(240,253,244,0.65)",desc:"Düşük risk + geniş kitle"},watch:{label:"İZLE",c:"#475569",bg:"rgba(248,250,252,0.65)",desc:"Düşük risk + niş kitle"}};
  const dc=s=>s>=65?C.r1c:s>=45?C.r2c:s>=25?C.r3c:C.r4c;
  const handleMM=e=>{const rect=svgRef.current.getBoundingClientRect();const sx=(e.clientX-rect.left)/rect.width*SW;const sy=(e.clientY-rect.top)/rect.height*SH;let best=null,bd=16;PROFESSIONS.forEach(p=>{const d=Math.hypot(xs(p.score)-sx,ys(p.workers)-sy);if(d<bd){bd=d;best=p;}});setTooltip(best?{p:best,x:e.clientX,y:e.clientY}:null);};
  return (
    <div>
      <div style={{marginBottom:16}}><h2 style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:6}}>Risk × İşgücü Öncelik Matrisi</h2><p style={{fontSize:14,color:C.textSec,lineHeight:1.7}}>Her mesleğin AI maruziyet skoru (yatay) ve çalışan büyüklüğü (dikey, log ölçek). <strong>Sağ üst kadran</strong> acil eğitim müdahalesi gerektiriyor. Kadrana tıklayarak filtreleyin.</p></div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        {Object.entries(QC).map(([k,c])=>{const cnt=PROFESSIONS.filter(p=>getQ(p.score,p.workers)===k).length;return(<button key={k} onClick={()=>setActiveQ(activeQ===k?null:k)} style={{padding:"5px 12px",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:700,border:`1px solid ${c.c}66`,background:activeQ===k?c.c:"white",color:activeQ===k?"white":c.c,transition:"all 0.15s"}}>{c.label} · {cnt}</button>);})}
        {activeQ&&<button onClick={()=>setActiveQ(null)} style={{padding:"5px 10px",borderRadius:5,cursor:"pointer",fontSize:11,border:`1px solid ${C.border}`,background:C.bg,color:C.textMuted}}>Tümü</button>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:14,alignItems:"start"}}>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:11,padding:10,overflow:"hidden"}}>
          <svg ref={svgRef} viewBox={`0 0 ${SW} ${SH}`} style={{width:"100%",display:"block",cursor:"crosshair"}} onMouseMove={handleMM} onMouseLeave={()=>setTooltip(null)}>
            <rect x={xd} y={MT} width={SW-MR-xd} height={yd-MT} fill={QC.urgent.bg} rx={2}/>
            <rect x={ML} y={MT} width={xd-ML} height={yd-MT} fill={QC.opportunity.bg} rx={2}/>
            <rect x={xd} y={yd} width={SW-MR-xd} height={MT+PH-yd} fill={QC.strategy.bg} rx={2}/>
            <rect x={ML} y={yd} width={xd-ML} height={MT+PH-yd} fill={QC.watch.bg} rx={2}/>
            <line x1={xd} y1={MT} x2={xd} y2={MT+PH} stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="6,3"/>
            <line x1={ML} y1={yd} x2={SW-MR} y2={yd} stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="6,3"/>
            <text x={xd+8} y={MT+16} fontSize={9} fontWeight="700" fill="#b91c1c" fontFamily="monospace" style={{pointerEvents:"none"}}>ACİL MÜDAHALE ▶</text>
            <text x={ML+8} y={MT+16} fontSize={9} fontWeight="700" fill="#15803d" fontFamily="monospace" style={{pointerEvents:"none"}}>DÖNÜŞÜM FIRSATI ▶</text>
            <text x={xd+8} y={MT+PH-8} fontSize={9} fontWeight="700" fill="#c2410c" fontFamily="monospace" style={{pointerEvents:"none"}}>STRATEJİK ▶</text>
            <text x={ML+8} y={MT+PH-8} fontSize={9} fontWeight="700" fill="#475569" fontFamily="monospace" style={{pointerEvents:"none"}}>İZLE ▶</text>
            {[1500,10000,100000,1000000,5000000].map(w=>{const y=ys(w);const lb=w>=1000000?(w/1000000).toFixed(1)+"M":w>=1000?(w/1000).toFixed(0)+"K":w;return(<g key={w}><line x1={ML-4} y1={y} x2={ML} y2={y} stroke={C.textMuted} strokeWidth={0.7}/><text x={ML-6} y={y+3} fontSize={7.5} fill={C.textMuted} textAnchor="end" fontFamily="monospace">{lb}</text></g>);})}
            {[0,25,45,65,100].map(s=>{const x=xs(s);return(<g key={s}><line x1={x} y1={MT+PH} x2={x} y2={MT+PH+4} stroke={C.textMuted} strokeWidth={0.7}/><text x={x} y={MT+PH+13} fontSize={7.5} fill={C.textMuted} textAnchor="middle" fontFamily="monospace">%{s}</text></g>);})}
            <text x={ML+PW/2} y={SH-3} fontSize={9} fill={C.textMuted} textAnchor="middle">AI Maruziyet Skoru →</text>
            <text x={12} y={MT+PH/2} fontSize={9} fill={C.textMuted} textAnchor="middle" transform={`rotate(-90 12 ${MT+PH/2})`}>Çalışan (log) ↑</text>
            {PROFESSIONS.map(p=>{const q=getQ(p.score,p.workers);const dimmed=activeQ&&activeQ!==q;return(<circle key={p.id} cx={xs(p.score)} cy={ys(p.workers)} r={4} fill={dc(p.score)} opacity={dimmed?0.07:0.72} style={{transition:"opacity 0.15s"}}/>);})}
          </svg>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {Object.entries(QC).map(([k,cfg])=>{const profs=PROFESSIONS.filter(p=>getQ(p.score,p.workers)===k).sort((a,b)=>b.workers-a.workers);const totalW=profs.reduce((s,p)=>s+p.workers,0);const isA=activeQ===k;return(
            <div key={k} onClick={()=>setActiveQ(isA?null:k)} style={{background:isA?"white":C.bg,border:`1px solid ${isA?cfg.c:C.border}`,borderLeft:`3px solid ${cfg.c}`,borderRadius:9,padding:"10px 12px",cursor:"pointer",transition:"all 0.15s",boxShadow:isA?"0 2px 10px rgba(0,0,0,0.08)":"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><div style={{fontSize:11,fontWeight:800,color:cfg.c}}>{cfg.label}</div><span style={{fontSize:11,fontFamily:"monospace",fontWeight:700,color:cfg.c}}>{profs.length}</span></div>
              <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>{cfg.desc}</div>
              <div style={{fontSize:12,fontWeight:700,color:C.text}}>{fmtW(totalW)} çalışan</div>
              {isA&&(<div style={{marginTop:8,maxHeight:180,overflowY:"auto"}}>{profs.slice(0,10).map(p=>(<div key={p.id} style={{fontSize:10,color:C.textSec,padding:"3px 0",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70%"}}>{p.title}</span><span style={{color:cfg.c,fontFamily:"monospace",flexShrink:0}}>%{p.score}</span></div>))}{profs.length>10&&<div style={{fontSize:9,color:C.textMuted,fontStyle:"italic",paddingTop:3}}>+{profs.length-10} meslek daha</div>}</div>)}
            </div>
          );})}
        </div>
      </div>
      {tooltip&&(<div style={{position:"fixed",left:tooltip.x+14,top:tooltip.y-10,background:C.navBg,color:"white",borderRadius:7,padding:"9px 12px",fontSize:11,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.3)",pointerEvents:"none",maxWidth:210}}><div style={{fontWeight:700,marginBottom:2}}>{tooltip.p.title}</div><div style={{color:"#93c5fd",fontSize:10,marginBottom:5}}>{tooltip.p.sector}</div><div style={{display:"flex",gap:10}}><span>%{tooltip.p.score}</span><span>{fmtW(tooltip.p.workers)} çalışan</span></div><div style={{color:"#f59e0b",fontSize:9,marginTop:3,fontWeight:600}}>{QC[getQ(tooltip.p.score,tooltip.p.workers)].label}</div></div>)}
    </div>
  );
}

// ─── EĞİTİM PLANI HESAPLAYICISI (GELİŞTİRİLMİŞ) ─────────────────────────────
function EducationCalculator() {
  const [institution,setInstitution]=useState("");const [headcount,setHeadcount]=useState(500);
  const [customMode,setCustomMode]=useState(false);const [customWeights,setCustomWeights]=useState({});
  const [showPlan,setShowPlan]=useState(false);
  const allSectors=useMemo(()=>[...new Set(PROFESSIONS.map(p=>p.sector))].sort(),[]);
  const activeWeights=customMode?customWeights:(institution?INSTITUTION_PRESETS[institution]:{});
  const weightTotal=Object.values(activeWeights).reduce((s,v)=>s+v,0);
  const plan=useMemo(()=>showPlan?calcTrainingPlan(activeWeights,headcount):null,[showPlan,activeWeights,headcount]);

  const handleDownload=()=>{
    const html=generateReport(plan,institution||"Özel Kurum");
    const blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="TAME_2026_Rapor.html";a.click();
    URL.revokeObjectURL(url);
  };

  const riskMsg=plan?plan.avgScore>=55?"Kurumunuzun risk profili KRİTİK seviyede. Acil ve yoğun bir dönüşüm programı başlatılması gerekiyor.":plan.avgScore>=35?"Kurumunuz ORTA-YÜKSEK risk kategorisinde. Sistematik bir dönüşüm programı 6 ay içinde hayata geçirilmelidir.":"Kurumunuz ORTA risk kategorisinde. Temel dijital okuryazarlık ve farkındalık programı planlanabilir.":"";

  return (
    <div>
      <div style={{marginBottom:18}}>
        <h2 style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:6}}>Eğitim Açığı Hesaplayıcısı</h2>
        <p style={{fontSize:14,color:C.textSec,lineHeight:1.7}}>Kurumunuzun sektör profilini ve çalışan sayısını girin. Sistem risk düzeyinize özel kurs listesi, kişiselleştirilmiş saat dağılımı ve program takvimi oluşturur.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"start"}}>
        <div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:8}}>KURUM / KAPSAM</div>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <button onClick={()=>{setCustomMode(false);setShowPlan(false);}} style={{fontSize:12,padding:"5px 12px",borderRadius:6,border:`1px solid ${!customMode?C.accent:C.border}`,background:!customMode?C.accentLight:"white",color:!customMode?C.accent:C.textSec,cursor:"pointer",fontWeight:!customMode?700:400}}>Hazır Profil</button>
              <button onClick={()=>{setCustomMode(true);setShowPlan(false);}} style={{fontSize:12,padding:"5px 12px",borderRadius:6,border:`1px solid ${customMode?C.accent:C.border}`,background:customMode?C.accentLight:"white",color:customMode?C.accent:C.textSec,cursor:"pointer",fontWeight:customMode?700:400}}>Özel Tanım</button>
            </div>
            {!customMode?(
              <select value={institution} onChange={e=>{setInstitution(e.target.value);setShowPlan(false);}} style={{width:"100%",fontSize:13,padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,color:C.text,cursor:"pointer"}}>
                <option value="">— Kurum seçin —</option>
                <optgroup label="Kamu Kurumları">{Object.keys(INSTITUTION_PRESETS).filter(k=>INST_TYPES[k]==="kamu").map(k=><option key={k} value={k}>{k}</option>)}</optgroup>
                <optgroup label="Özel Sektör">{Object.keys(INSTITUTION_PRESETS).filter(k=>!INST_TYPES[k]).map(k=><option key={k} value={k}>{k}</option>)}</optgroup>
              </select>
            ):(
              <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
                <div style={{fontSize:11,color:C.textMuted,marginBottom:8}}>Sektör ağırlıklarını girin (toplam 100 olmalı)</div>
                {allSectors.slice(0,14).map(sec=>(
                  <div key={sec} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                    <span style={{fontSize:11,color:C.text,minWidth:155,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sec}</span>
                    <input type="number" min={0} max={100} value={customWeights[sec]||""} placeholder="0" onChange={e=>setCustomWeights(p=>({...p,[sec]:parseInt(e.target.value)||0}))} style={{width:55,padding:"3px 6px",border:`1px solid ${C.border}`,borderRadius:4,fontSize:12,textAlign:"center"}}/>
                    <span style={{fontSize:11,color:C.textMuted}}>%</span>
                  </div>
                ))}
                <div style={{fontSize:11,marginTop:8,fontWeight:700,color:weightTotal===100?C.r4c:weightTotal>100?"#b91c1c":"#b45309"}}>
                  Toplam: {weightTotal}% {weightTotal===100?"✓":weightTotal>100?"— 100'ü aşıyor":"— 100 olmalı"}
                </div>
              </div>
            )}
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:8}}>HEDEF ÇALIŞAN SAYISI</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="number" value={headcount} min={10} max={100000} step={10} onChange={e=>setHeadcount(Math.max(10,parseInt(e.target.value)||10))} style={{flex:1,padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:20,fontWeight:700,fontFamily:"monospace",color:C.text}}/>
              <span style={{fontSize:13,color:C.textMuted}}>kişi</span>
            </div>
            <div style={{display:"flex",gap:6,marginTop:6}}>
              {[10,50,100,500,1000,5000].map(v=>(<button key={v} onClick={()=>setHeadcount(v)} style={{flex:1,padding:"4px 0",fontSize:11,borderRadius:5,border:`1px solid ${C.border}`,background:headcount===v?C.navBg:"white",color:headcount===v?"white":C.textSec,cursor:"pointer"}}>{v.toLocaleString("tr")}</button>))}
            </div>
          </div>
          {Object.keys(activeWeights).length>0&&(
            <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:6}}>SEÇİLEN PROFİL</div>
              {Object.entries(activeWeights).map(([sec,pct])=>(
                <div key={sec} style={{marginBottom:4}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}><span style={{color:C.text}}>{sec}</span><span style={{fontFamily:"monospace",fontWeight:700,color:C.accent}}>%{pct}</span></div>
                  <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:C.accent,borderRadius:2}}/></div>
                </div>
              ))}
            </div>
          )}
          <button onClick={()=>setShowPlan(true)} disabled={Object.keys(activeWeights).length===0} style={{width:"100%",padding:"12px 0",borderRadius:8,border:"none",cursor:Object.keys(activeWeights).length===0?"not-allowed":"pointer",fontSize:14,fontWeight:700,background:Object.keys(activeWeights).length===0?C.border:C.navBg,color:"white",transition:"all 0.15s"}}>
            Kişiselleştirilmiş Plan Oluştur →
          </button>

          {/* Bilgi kutusu */}
          <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:7}}>
            {[
              {icon:"🏛",color:"#1d4ed8",bg:"#eff6ff",br:"#bfdbfe",title:"Kurum İçerikleri",desc:"Bakanlıklar ve firmalar kendi eğitim içeriklerini platforma ekleyebilir. Özel müfredat ve kurum politikasına göre modüller özelleştirilebilir."},
              {icon:"📚",color:"#7c3aed",bg:"#faf5ff",br:"#e9d5ff",title:"Genel Eğitimler",desc:"Temel AI okuryazarlığı ve dijital dönüşüm içerikleri Core9Tech tarafından hazırlanmış olup tüm kurumlara sunulmaktadır."},
              {icon:"🎓",color:"#15803d",bg:"#f0fdf4",br:"#bbf7d0",title:"Sertifika",desc:"Her tamamlanan eğitim modülü için dijital sertifika düzenlenir. Sertifikalar Eğitim Takibi sekmesinde yönetici onayından geçerek kayıt altına alınır."},
            ].map(item=>(
              <div key={item.title} style={{background:item.bg,border:`1px solid ${item.br}`,borderRadius:8,padding:"9px 12px",display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:16,flexShrink:0}}>{item.icon}</span>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:item.color,marginBottom:2}}>{item.title}</div>
                  <div style={{fontSize:10,color:item.color,lineHeight:1.55,opacity:0.85}}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {!showPlan&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:420,background:C.bg,border:`2px dashed ${C.border}`,borderRadius:12,textAlign:"center",padding:40}}>
              <div style={{fontSize:36,marginBottom:12}}>📊</div>
              <div style={{fontSize:15,fontWeight:600,color:C.textSec,marginBottom:6}}>Kurumunuzu Seçin</div>
              <div style={{fontSize:13,color:C.textMuted,lineHeight:1.6}}>Kurum profili ve çalışan sayısı girdikten sonra<br/>risk düzeyinize özel eğitim planı oluşturulur.<br/><br/><span style={{color:C.accent}}>Her kurum için farklı plan üretilir.</span></div>
            </div>
          )}
          {showPlan&&plan&&(
            <div>
              {/* Risk skoru - büyük ve dikkat çekici */}
              <div style={{background:C.navBg,borderRadius:12,padding:"18px 20px",marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:10,color:"#93c5fd",letterSpacing:1,marginBottom:4}}>KURUM ORTALAMA RISK SKORU</div>
                    <div style={{display:"flex",alignItems:"baseline",gap:10}}>
                      <div style={{fontSize:52,fontWeight:900,color:getRisk(plan.avgScore).c,fontFamily:"monospace",lineHeight:1}}>%{plan.avgScore}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:800,color:getRisk(plan.avgScore).c,background:getRisk(plan.avgScore).bg,border:`1px solid ${getRisk(plan.avgScore).br}`,borderRadius:5,padding:"3px 8px",display:"inline-block"}}>{getRisk(plan.avgScore).label}</div>
                        <div style={{fontSize:11,color:plan.vsNational>0?"#fca5a5":"#86efac",marginTop:4,fontWeight:600}}>
                          {plan.vsNational>0?"▲":"▼"} Türkiye ortalamasının {Math.abs(plan.vsNational)} puan {plan.vsNational>0?"üzerinde":"altında"} (%{NAT_AVG})
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:10,color:"#64748b",marginBottom:4}}>PROGRAM TİPİ</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#93c5fd"}}>{plan.intensity}</div>
                  </div>
                </div>
                <div style={{marginTop:12}}>
                  <div style={{fontSize:11,color:"#f59e0b",fontWeight:600,lineHeight:1.6}}>{riskMsg}</div>
                </div>
                {/* Risk dağılım çubuğu */}
                <div style={{marginTop:10}}>
                  <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",marginBottom:5}}>
                    <div style={{width:`${plan.normRisk.h}%`,background:C.r1c}}/><div style={{width:`${plan.normRisk.mh}%`,background:C.r2c}}/><div style={{width:`${plan.normRisk.m}%`,background:C.r3c}}/><div style={{width:`${plan.normRisk.l}%`,background:C.r4c}}/>
                  </div>
                  <div style={{display:"flex",gap:8,fontSize:9,flexWrap:"wrap"}}>
                    <span style={{color:C.r1c}}><strong>%{plan.normRisk.h}</strong> Yüksek</span>
                    <span style={{color:C.r2c}}><strong>%{plan.normRisk.mh}</strong> O-Y.</span>
                    <span style={{color:C.r3c}}><strong>%{plan.normRisk.m}</strong> Orta</span>
                    <span style={{color:C.r4c}}><strong>%{plan.normRisk.l}</strong> Düşük</span>
                  </div>
                </div>
              </div>

              {/* Program metrikleri */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
                {[
                  {val:plan.durationMonths+" ay",sub:plan.durationLabel.split("—")[1]?.trim()||"Program",label:"Tahmini Süre",c:C.accent,bg:C.accentLight,br:"#bfdbfe"},
                  {val:plan.topCourses.length+" modül",sub:`${plan.numCourses} kurs × ${Math.round(plan.totalHoursPerPerson/plan.topCourses.length)} ort. saat`,label:"Eğitim Kapsamı",c:C.text,bg:C.bg,br:C.border},
                  {val:Math.round(plan.totalHoursPerPerson)+" saat",sub:`Kişi başı toplam eğitim`,label:"Kişi Başı Yük",c:"#7c3aed",bg:"#faf5ff",br:"#e9d5ff"},
                ].map(s=>(
                  <div key={s.label} style={{background:s.bg,border:`1px solid ${s.br}`,borderRadius:8,padding:"10px 12px"}}>
                    <div style={{fontSize:18,fontWeight:900,color:s.c,fontFamily:"monospace",lineHeight:1}}>{s.val}</div>
                    <div style={{fontSize:10,color:C.textMuted,marginTop:4}}>{s.label}</div>
                    <div style={{fontSize:9,color:s.c,marginTop:2,fontStyle:"italic"}}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Kişi-saat formülü açıklaması */}
              <div style={{background:"#faf5ff",border:"1px solid #e9d5ff",borderRadius:9,padding:"10px 14px",marginBottom:12}}>
                <div style={{fontSize:10,fontWeight:700,color:"#7c3aed",letterSpacing:1,marginBottom:6}}>KİŞİ-SAAT HESABI</div>
                <div style={{fontSize:11,color:"#4c1d95",lineHeight:1.6}}>
                  <strong>{plan.topCourses.length} kurs</strong> × <strong>ort. {Math.round(plan.totalHoursPerPerson/plan.topCourses.length)} saat/kurs</strong> = <strong>{Math.round(plan.totalHoursPerPerson)} saat/kişi</strong><br/>
                  Bu yük <strong>{plan.monthlyCapacity} saat/ay</strong> eğitim kapasitesine bölününce <strong>{plan.durationMonths} aylık</strong> program çıkıyor.<br/>
                  <span style={{color:"#6d28d9",fontSize:10}}>Toplam kişi-saat = {Math.round(plan.totalHoursPerPerson)} × katılımcılar (kurs bazında değişir) = {plan.totalPersonHours.toLocaleString("tr")} kişi-saat</span>
                </div>
              </div>

              {/* Kurs listesi */}
              <div style={{fontSize:10,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:8}}>KİŞİSELLEŞTİRİLMİŞ EĞİTİM PROGRAMI</div>
              <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:14}}>
                {plan.topCourses.map((c,i)=>{
                  const pr=c.priority==="Kritik"?{c:C.r1c,bg:C.r1bg,br:C.r1br}:c.priority==="Yüksek"?{c:C.r2c,bg:C.r2bg,br:C.r2br}:{c:C.r3c,bg:C.r3bg,br:C.r3br};
                  return(
                    <div key={i} style={{background:pr.bg,border:`1px solid ${pr.br}`,borderRadius:7,padding:"8px 12px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.course}</div>
                          <div style={{fontSize:10,color:C.textMuted,marginTop:2}}>
                            <strong>{c.hours}s</strong> × <strong>{c.participants.toLocaleString("tr")} kişi</strong> = <strong style={{color:pr.c}}>{c.personHours.toLocaleString("tr")} kişi-saat</strong>
                          </div>
                        </div>
                        <span style={{fontSize:10,fontWeight:700,color:pr.c,border:`1px solid ${pr.br}`,borderRadius:4,padding:"2px 7px",flexShrink:0}}>{c.priority}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={handleDownload} style={{width:"100%",padding:"11px 0",borderRadius:8,border:`1px solid #1d4ed8`,cursor:"pointer",fontSize:13,fontWeight:700,background:C.accentLight,color:C.accent,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <span>⬇</span> 2026 Türkiye Dijital Beceri Açığı Raporunu İndir
              </button>
              <div style={{fontSize:10,color:C.textMuted,textAlign:"center",marginTop:4}}>HTML — tarayıcıdan Yazdır → PDF olarak kaydedebilirsiniz</div>
              {/* Eğitim bilgi notu */}
              <div style={{marginTop:16,background:"#fefce8",border:"1px solid #fde68a",borderRadius:9,padding:"12px 14px"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#b45309",letterSpacing:1,marginBottom:8}}>EĞİTİM İÇERİĞİ HAKKINDA</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {[{icon:"🏛",text:"Eğitim içerikleri bağlı olunan bakanlık veya kurumun önerileri doğrultusunda güncellenir."},{icon:"🏢",text:"Özel sektör kurumları kendi eğitim içeriklerini platforma ekleyebilir."},{icon:"📚",text:"Genel AI okuryazarlığı eğitimleri Core9Tech tarafından sağlanır."},{icon:"🎓",text:"Her eğitim modülünün tamamlanmasının ardından dijital sertifika verilecektir."}].map(item=>(
                    <div key={item.icon} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{fontSize:14,lineHeight:1.4}}>{item.icon}</span>
                      <span style={{fontSize:11,color:"#92400e",lineHeight:1.5}}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Eğitim bilgi notu */}
              <div style={{marginTop:16,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontSize:10,fontWeight:700,color:C.r4c,letterSpacing:1,marginBottom:8}}>EĞİTİM HAKKINDA</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {[
                    {icon:"🏛",title:"Kurum / Bakanlık İçerikleri",desc:"Bakanlıklar ve kurum yöneticileri kendi öğrenme yönetim sistemlerindeki içerikleri bu platforma ekleyebilir. Onaylanan içerikler çalışanlara otomatik atanır."},
                    {icon:"📚",title:"Genel Eğitimler (Core9Tech)",desc:"Temel yapay zeka okuryazarlığı, dijital dönüşüm ve sektörel AI uygulamaları başlıklı standart modüller Core9Tech tarafından sağlanmaktadır."},
                    {icon:"🎓",title:"Sertifika",desc:"Her tamamlanan eğitim modülü için dijital sertifika düzenlenir. Sertifikalar Eğitim Takibi sekmesinde yönetici onayından geçerek kayıt altına alınır."},
                  ].map(item=>(
                    <div key={item.title} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{fontSize:16,flexShrink:0,marginTop:1}}>{item.icon}</span>
                      <div><div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:2}}>{item.title}</div><div style={{fontSize:11,color:C.textSec,lineHeight:1.6}}>{item.desc}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── KURUM ANALİZİ (GELİŞTİRİLMİŞ) ─────────────────────────────────────────
function InstitutionProfile() {
  const [rows,setRows]=useState([]);const [search,setSearch]=useState("");const [searchRes,setSearchRes]=useState([]);
  const [showSearch,setShowSearch]=useState(false);const [instName,setInstName]=useState("");

  const handleSearch=q=>{setSearch(q);if(q.trim().length<2){setSearchRes([]);return;}setSearchRes(PROFESSIONS.filter(p=>p.title.toLowerCase().includes(q.toLowerCase())||p.sector.toLowerCase().includes(q.toLowerCase())).slice(0,8));};
  const addRow=prof=>{if(rows.find(r=>r.profId===prof.id))return;setRows(r=>[...r,{profId:prof.id,title:prof.title,sector:prof.sector,score:prof.score,theoretical:prof.theoretical,count:100}]);setSearch("");setSearchRes([]);setShowSearch(false);};
  const updateCount=(profId,val)=>setRows(r=>r.map(row=>row.profId===profId?{...row,count:Math.max(1,parseInt(val)||1)}:row));
  const removeRow=profId=>setRows(r=>r.filter(row=>row.profId!==profId));

  const totalCount=rows.reduce((s,r)=>s+r.count,0);
  const weightedScore=totalCount>0?Math.round(rows.reduce((s,r)=>s+r.score*r.count,0)/totalCount):0;
  const riskDist={h:0,mh:0,m:0,l:0};
  rows.forEach(r=>{if(r.score>=65)riskDist.h+=r.count;else if(r.score>=45)riskDist.mh+=r.count;else if(r.score>=25)riskDist.m+=r.count;else riskDist.l+=r.count;});
  const courseFreq={};
  rows.forEach(row=>{const prof=PROFESSIONS.find(p=>p.id===row.profId);if(!prof)return;prof.courses.forEach((c,i)=>{courseFreq[c]=(courseFreq[c]||0)+(5-i)*row.count;});});
  const topCourses=Object.entries(courseFreq).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([c])=>c);
  const vsNat=weightedScore-NAT_AVG;
  const riskMsg=weightedScore>=55?"Kritik dönüşüm gerekiyor. Bu risk seviyesi ulusal ortalamanın belirgin üzerinde.":weightedScore>=35?"Sistematik bir dönüşüm programı planlanmalı.":"Temel dijital farkındalık programı yeterli olabilir.";

  // En riskli pozisyonlar
  const topRisk=[...rows].sort((a,b)=>b.score-a.score).slice(0,3);
  // Toplam riskli çalışan (skor >=45)
  const atRiskCount=rows.filter(r=>r.score>=45).reduce((s,r)=>s+r.count,0);

  return (
    <div>
      <div style={{marginBottom:18}}>
        <h2 style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:6}}>Kurum Profil Analizi</h2>
        <div style={{display:"flex",gap:12,marginBottom:10,flexWrap:"wrap"}}>
          {[{icon:"🏛",title:"Kamu Kurumları",desc:"Bakanlıklar, belediyeler, üniversiteler"},{icon:"🏢",title:"Özel Şirketler",desc:"Bankalar, teknoloji, sağlık, üretim"},{icon:"⚖️",title:"Hukuk & Danışmanlık",desc:"Büyüklükten bağımsız tüm firmalar"}].map(t=>(
            <div key={t.title} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",flex:1,minWidth:140}}>
              <div style={{fontSize:16,marginBottom:3}}>{t.icon}</div>
              <div style={{fontSize:12,fontWeight:700,color:C.text}}>{t.title}</div>
              <div style={{fontSize:10,color:C.textMuted}}>{t.desc}</div>
            </div>
          ))}
        </div>
        <p style={{fontSize:14,color:C.textSec,lineHeight:1.7}}>Kurumunuzdaki pozisyonları ve çalışan sayılarını girin. Sistem kuruma özgü AI risk profilini, etkilenen çalışan sayısını ve öncelikli eğitim planını hesaplar.</p>
      </div>

      {/* Kurum adı */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:6}}>KURUM / FİRMA ADI (İsteğe Bağlı)</div>
        <input type="text" value={instName} onChange={e=>setInstName(e.target.value)} placeholder="örn. SGK Genel Müdürlüğü, XYZ Teknoloji A.Ş." style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.text}}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"start"}}>
        <div>
          <div style={{position:"relative",marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:6}}>POZİSYON / MESLEK EKLE</div>
            <input type="text" placeholder="Meslek ara — 'Muhasebe', 'Yazılım', 'Hemşire'..." value={search} onChange={e=>handleSearch(e.target.value)} onFocus={()=>setShowSearch(true)} onBlur={()=>setTimeout(()=>setShowSearch(false),150)} style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.accent}`,borderRadius:8,fontSize:13,color:C.text,outline:"none"}}/>
            {showSearch&&searchRes.length>0&&(
              <div style={{position:"absolute",top:"100%",left:0,right:0,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",zIndex:200,maxHeight:280,overflowY:"auto"}}>
                {searchRes.map(p=>(
                  <div key={p.id} onMouseDown={()=>addRow(p)} style={{padding:"9px 12px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{p.title}</div><div style={{fontSize:10,color:C.textMuted}}>{p.sector} · NACE {p.nace}</div></div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:14,fontWeight:900,color:getRisk(p.score).c,fontFamily:"monospace"}}>%{p.score}</div>
                      <div style={{fontSize:9,color:C.textMuted}}>{getRisk(p.score).label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {rows.length===0?(
            <div style={{background:C.bg,border:`2px dashed ${C.border}`,borderRadius:10,padding:28,textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:8}}>🏛</div>
              <div style={{fontSize:14,fontWeight:600,color:C.textSec,marginBottom:4}}>Pozisyon eklenmedi</div>
              <div style={{fontSize:12,color:C.textMuted,lineHeight:1.6}}>Kurumunuzdaki meslek gruplarını arayıp ekleyin.<br/>Her pozisyon için çalışan sayısını girebilirsiniz.</div>
            </div>
          ):(
            <>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {rows.map(row=>{const risk=getRisk(row.score);return(
                  <div key={row.profId} style={{background:C.surface,border:`1px solid ${risk.br}`,borderLeft:`3px solid ${risk.c}`,borderRadius:8,padding:"8px 11px",display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.title}</div>
                      <div style={{display:"flex",alignItems:"center",gap:5,marginTop:1}}>
                        <span style={{fontSize:9,fontWeight:700,color:risk.c,background:risk.bg,border:`1px solid ${risk.br}`,borderRadius:3,padding:"1px 5px"}}>{risk.label}</span>
                        <span style={{fontSize:9,color:C.textMuted}}>{row.sector}</span>
                      </div>
                    </div>
                    <div style={{fontSize:13,fontWeight:800,color:risk.c,fontFamily:"monospace",flexShrink:0}}>%{row.score}</div>
                    <div style={{display:"flex",alignItems:"center",gap:3}}>
                      <input type="number" value={row.count} min={1} onChange={e=>updateCount(row.profId,e.target.value)} style={{width:65,padding:"3px 5px",border:`1px solid ${C.border}`,borderRadius:4,fontSize:12,textAlign:"center",fontFamily:"monospace"}}/>
                      <span style={{fontSize:10,color:C.textMuted}}>k.</span>
                    </div>
                    <button onClick={()=>removeRow(row.profId)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:4,width:22,height:22,cursor:"pointer",fontSize:13,color:C.textMuted,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
                  </div>
                );})}
              </div>
              <div style={{fontSize:11,color:C.textMuted,textAlign:"right",paddingTop:5}}>
                Toplam: <strong style={{color:C.text}}>{totalCount.toLocaleString("tr")} çalışan</strong> · {rows.length} pozisyon
              </div>
            </>
          )}
        </div>

        {rows.length===0?(
          <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:28,textAlign:"center",minHeight:280,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:32,marginBottom:10}}>📈</div>
            <div style={{fontSize:13,color:C.textMuted,lineHeight:1.6}}>Pozisyon ekledikten sonra<br/>kurum risk analizi burada görünecek</div>
          </div>
        ):(
          <div>
            {/* Ana risk skoru */}
            <div style={{background:C.navBg,borderRadius:12,padding:"18px 20px",marginBottom:10}}>
              <div style={{fontSize:10,color:"#93c5fd",letterSpacing:1,marginBottom:4}}>KURUM ORTALAMA AI RİSK SKORU</div>
              <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:8}}>
                <div style={{fontSize:48,fontWeight:900,color:getRisk(weightedScore).c,fontFamily:"monospace",lineHeight:1}}>%{weightedScore}</div>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:getRisk(weightedScore).c,background:getRisk(weightedScore).bg,border:`1px solid ${getRisk(weightedScore).br}`,borderRadius:5,padding:"3px 8px",display:"inline-block"}}>{getRisk(weightedScore).label}</div>
                  <div style={{fontSize:11,color:vsNat>0?"#fca5a5":"#86efac",marginTop:3,fontWeight:600}}>
                    {vsNat>0?"▲":"▼"} Ulusal ortalamadan {Math.abs(vsNat)} puan {vsNat>0?"yüksek":"düşük"}
                  </div>
                </div>
              </div>
              <div style={{fontSize:11,color:"#f59e0b",fontWeight:600,marginBottom:8,lineHeight:1.5}}>{riskMsg}</div>
              {/* Dağılım */}
              <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",marginBottom:4}}>
                {[{v:riskDist.h,c:C.r1c},{v:riskDist.mh,c:C.r2c},{v:riskDist.m,c:C.r3c},{v:riskDist.l,c:C.r4c}].map((d,i)=>totalCount>0&&<div key={i} style={{width:`${d.v/totalCount*100}%`,background:d.c}}/>)}
              </div>
              <div style={{display:"flex",gap:8,fontSize:9,flexWrap:"wrap"}}>
                {[{label:"Yüksek",v:riskDist.h,c:C.r1c},{label:"O-Y.",v:riskDist.mh,c:C.r2c},{label:"Orta",v:riskDist.m,c:C.r3c},{label:"Düşük",v:riskDist.l,c:C.r4c}].filter(d=>d.v>0).map(d=>(<span key={d.label} style={{color:d.c}}><strong>{d.v.toLocaleString("tr")}</strong> {d.label}</span>))}
              </div>
            </div>

            {/* Özet metrikler */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:10}}>
              <div style={{background:C.r1bg,border:`1px solid ${C.r1br}`,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:20,fontWeight:900,color:C.r1c,fontFamily:"monospace"}}>{atRiskCount.toLocaleString("tr")}</div>
                <div style={{fontSize:10,color:C.r1c,fontWeight:700,marginTop:2}}>Dönüşüm Gerektiren Çalışan</div>
                <div style={{fontSize:9,color:C.textMuted,marginTop:1}}>Maruziyet skoru %45 ve üzeri</div>
              </div>
              <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:20,fontWeight:900,color:C.text,fontFamily:"monospace"}}>{rows.length}</div>
                <div style={{fontSize:10,color:C.textSec,fontWeight:700,marginTop:2}}>Pozisyon Tipi</div>
                <div style={{fontSize:9,color:C.textMuted,marginTop:1}}>{totalCount.toLocaleString("tr")} toplam çalışan</div>
              </div>
            </div>

            {/* En riskli pozisyonlar */}
            {topRisk.length>0&&(
              <div style={{background:C.r1bg,border:`1px solid ${C.r1br}`,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:700,color:C.r1c,letterSpacing:1,marginBottom:8}}>EN YÜKSEK RİSKLİ POZİSYONLAR</div>
                {topRisk.map(r=>(
                  <div key={r.profId} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <div><div style={{fontSize:12,fontWeight:600,color:C.text}}>{r.title}</div><div style={{fontSize:10,color:C.textMuted}}>{r.count.toLocaleString("tr")} kişi</div></div>
                    <div style={{fontSize:15,fontWeight:900,color:C.r1c,fontFamily:"monospace"}}>%{r.score}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Öncelikli kurslar */}
            {topCourses.length>0&&(
              <div>
                <div style={{fontSize:10,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:7}}>ÖNCELİKLİ EĞİTİMLER</div>
                {topCourses.map((c,i)=>{const pr=i<2?{c:C.r1c,bg:C.r1bg,br:C.r1br}:i<4?{c:C.r2c,bg:C.r2bg,br:C.r2br}:{c:C.r3c,bg:C.r3bg,br:C.r3br};return(
                  <div key={i} style={{background:pr.bg,border:`1px solid ${pr.br}`,borderRadius:6,padding:"7px 11px",marginBottom:5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:12,fontWeight:600,color:C.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginRight:8}}>{c}</span>
                    <span style={{fontSize:10,fontWeight:700,color:pr.c,border:`1px solid ${pr.br}`,borderRadius:3,padding:"2px 7px",flexShrink:0}}>{i<2?"Kritik":i<4?"Öncelikli":"Standart"}</span>
                  </div>
                );})}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DEMO VERİSİ (sunum için) ────────────────────────────────────────────────
const DEMO_INST = "BTK";
const DEMO_COURSES = getInstitutionCourses(DEMO_INST);
const DEMO_DATA = (() => {
  const emps = [
    {id:"d1",name:"Ayşe Yıldız",dept:"Bilgi İşlem",addedAt:"2026-01-15T09:00:00Z",
     completions:{
       [DEMO_COURSES[0]]:{status:"approved",certRef:"BTK-2026-0101",submittedAt:"2026-02-03T10:00:00Z"},
       [DEMO_COURSES[1]]:{status:"approved",certRef:"BTK-2026-0102",submittedAt:"2026-02-18T10:00:00Z"},
       [DEMO_COURSES[2]]:{status:"pending",certRef:"BTK-2026-0103",submittedAt:"2026-03-10T10:00:00Z"},
     }},
    {id:"d2",name:"Mehmet Kara",dept:"Strateji",addedAt:"2026-01-15T09:00:00Z",
     completions:{
       [DEMO_COURSES[0]]:{status:"approved",certRef:"BTK-2026-0201",submittedAt:"2026-02-05T10:00:00Z"},
       [DEMO_COURSES[2]]:{status:"approved",certRef:"BTK-2026-0202",submittedAt:"2026-02-28T10:00:00Z"},
     }},
    {id:"d3",name:"Fatma Demir",dept:"İdari İşler",addedAt:"2026-01-20T09:00:00Z",
     completions:{
       [DEMO_COURSES[0]]:{status:"approved",certRef:"BTK-2026-0301",submittedAt:"2026-02-10T10:00:00Z"},
       [DEMO_COURSES[1]]:{status:"rejected",certRef:"",submittedAt:"2026-02-22T10:00:00Z"},
     }},
    {id:"d4",name:"Ali Çelik",dept:"Yazılım Geliştirme",addedAt:"2026-01-20T09:00:00Z",
     completions:{
       [DEMO_COURSES[0]]:{status:"approved",certRef:"BTK-2026-0401",submittedAt:"2026-02-08T10:00:00Z"},
       [DEMO_COURSES[1]]:{status:"approved",certRef:"BTK-2026-0402",submittedAt:"2026-02-19T10:00:00Z"},
       [DEMO_COURSES[2]]:{status:"approved",certRef:"BTK-2026-0403",submittedAt:"2026-02-27T10:00:00Z"},
       [DEMO_COURSES[3]]:{status:"pending",certRef:"BTK-2026-0404",submittedAt:"2026-03-12T10:00:00Z"},
     }},
    {id:"d5",name:"Selin Şahin",dept:"Hukuk",addedAt:"2026-02-01T09:00:00Z",completions:{}},
    {id:"d6",name:"Emre Arslan",dept:"Finans",addedAt:"2026-02-01T09:00:00Z",
     completions:{
       [DEMO_COURSES[0]]:{status:"pending",certRef:"BTK-2026-0601",submittedAt:"2026-03-14T10:00:00Z"},
     }},
  ];
  return { [DEMO_INST]: { employees: emps } };
})();

function loadOrDemo() {
  try {
    const stored = JSON.parse(localStorage.getItem(TK)||"{}");
    // Demo verisini stored'da yoksa merge et
    if (!stored[DEMO_INST]) {
      return { ...stored, ...DEMO_DATA };
    }
    return stored;
  } catch { return DEMO_DATA; }
}

// ─── İK PORTALI ─────────────────────────────────────────────────────────────
function HRPortal() {
  const [inst,setInst]=useState("");const [customInst,setCustomInst]=useState("");
  const [td,setTd]=useState(loadOrDemo);const [activeEmp,setActiveEmp]=useState(null);
  const [newCourse,setNewCourse]=useState("");const [editMode,setEditMode]=useState(null);

  const instKey=inst==="other"?customInst:inst;
  const refresh=()=>setTd(loadOrDemo());

  const instData=td[instKey];
  const employees=instData?.employees||[];
  const courses=getInstitutionCourses(instKey);

  // Yeni çalışan ekle
  const [newEmpName,setNewEmpName]=useState("");const [newEmpDept,setNewEmpDept]=useState("");
  const handleAddEmployee=()=>{
    if(!instKey||!newEmpName.trim())return;
    const d=loadOrDemo();const ki=d[instKey]||{employees:[]};
    if(!ki.employees.find(e=>e.name===newEmpName.trim())){
      ki.employees=[...ki.employees,{id:Date.now().toString(),name:newEmpName.trim(),dept:newEmpDept.trim(),addedAt:new Date().toISOString(),completions:{}}];
      d[instKey]=ki;saveTD(d);
    }
    setNewEmpName("");setNewEmpDept("");refresh();
  };
  const handleRemoveEmployee=id=>{
    const d=loadOrDemo();const ki=d[instKey];if(!ki)return;
    ki.employees=ki.employees.filter(e=>e.id!==id);saveTD(d);refresh();
  };

  // Toplu kurs ata / kaldır
  const handleAssignCourse=courseName=>{
    const d=loadOrDemo();const ki=d[instKey];if(!ki)return;
    // Kurs henüz kuruma atanmamışsa "atama" kaydı yok — sadece kurs listesine ekle
    // Burada kurum bazlı özel kurs listesini localStorage'da tutacağız
    const customKey=`tame_courses_${instKey}`;
    let cList=[];try{cList=JSON.parse(localStorage.getItem(customKey)||"[]");}catch{}
    if(!cList.includes(courseName)){cList=[...cList,courseName];localStorage.setItem(customKey,JSON.stringify(cList));}
    setNewCourse("");refresh();
  };

  // Özel kurslar
  const customCoursesKey=`tame_courses_${instKey}`;
  let customCourses=[];try{customCourses=JSON.parse(localStorage.getItem(customCoursesKey)||"[]");}catch{}
  const allCourses=[...new Set([...courses,...customCourses])];

  const totalApproved=employees.reduce((s,e)=>s+Object.values(e.completions||{}).filter(v=>v.status==="approved").length,0);
  const totalPossible=employees.length*allCourses.length;
  const completionPct=totalPossible>0?Math.round(totalApproved/totalPossible*100):0;

  const handleResetDemo=()=>{
    saveTD({ ...loadOrDemo(), [DEMO_INST]: DEMO_DATA[DEMO_INST] });
    refresh();
  };

  return (
    <div>
      <div style={{background:"#faf5ff",border:"1px solid #e9d5ff",borderRadius:10,padding:"12px 16px",marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:700,color:"#7c3aed",letterSpacing:1,marginBottom:4}}>İNSAN KAYNAKLARI (İK) PORTALI</div>
        <p style={{fontSize:13,color:"#4c1d95",lineHeight:1.65,margin:0}}>Personel ekleyip çıkarın, kuruma özel eğitim modülleri tanımlayın ve tüm çalışanların kayıt durumunu yönetin. Yönetici Paneli ile birlikte çalışır.</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"start"}}>
        {/* Sol: Kurum + personel yönetimi */}
        <div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:6}}>KURUM SEÇİMİ</div>
            <select value={inst} onChange={e=>{setInst(e.target.value);setActiveEmp(null);}} style={{width:"100%",fontSize:13,padding:"9px 10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,color:C.text,cursor:"pointer",marginBottom:inst==="other"?8:0}}>
              <option value="">— Kurumu seçin —</option>
              <optgroup label="Kamu">{Object.keys(INSTITUTION_PRESETS).filter(k=>INST_TYPES[k]==="kamu").map(k=><option key={k} value={k}>{k}</option>)}</optgroup>
              <optgroup label="Özel Sektör">{Object.keys(INSTITUTION_PRESETS).filter(k=>!INST_TYPES[k]).map(k=><option key={k} value={k}>{k}</option>)}</optgroup>
              <option value="other">Diğer</option>
            </select>
            {inst==="other"&&<input type="text" value={customInst} onChange={e=>setCustomInst(e.target.value)} placeholder="Kurum adını girin" style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:7,fontSize:13,color:C.text,marginTop:6}}/>}
            {instKey==="BTK"&&(
              <button onClick={handleResetDemo} style={{marginTop:6,fontSize:10,padding:"4px 10px",borderRadius:4,border:`1px solid #e9d5ff`,background:"#faf5ff",color:"#7c3aed",cursor:"pointer"}}>↺ Demo verisini sıfırla</button>
            )}
          </div>

          {instKey&&(<>
            {/* Özet */}
            {employees.length>0&&(
              <div style={{background:"#faf5ff",border:"1px solid #e9d5ff",borderRadius:9,padding:"12px 14px",marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:22,fontWeight:900,color:"#7c3aed",fontFamily:"monospace"}}>{completionPct}%</div>
                    <div style={{fontSize:10,color:"#7c3aed",fontWeight:700}}>Tamamlama Oranı</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{employees.length} çalışan</div>
                    <div style={{fontSize:11,color:C.textMuted}}>{allCourses.length} eğitim modülü</div>
                  </div>
                </div>
                <div style={{height:6,background:"#e9d5ff",borderRadius:3,overflow:"hidden",marginTop:8}}>
                  <div style={{height:"100%",width:`${completionPct}%`,background:"#7c3aed",borderRadius:3}}/>
                </div>
              </div>
            )}

            {/* Yeni çalışan ekle */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:6}}>ÇALIŞAN EKLE</div>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <input type="text" value={newEmpName} onChange={e=>setNewEmpName(e.target.value)} placeholder="Ad Soyad" style={{flex:2,padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,color:C.text}}/>
                <input type="text" value={newEmpDept} onChange={e=>setNewEmpDept(e.target.value)} placeholder="Birim (isteğe bağlı)" style={{flex:2,padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,color:C.text}}/>
                <button onClick={handleAddEmployee} disabled={!newEmpName.trim()} style={{padding:"7px 12px",borderRadius:6,border:"none",cursor:newEmpName.trim()?"pointer":"not-allowed",fontSize:12,fontWeight:700,background:newEmpName.trim()?C.navBg:C.border,color:"white",flexShrink:0}}>+ Ekle</button>
              </div>
            </div>

            {/* Çalışan listesi */}
            <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:6}}>KAYITLI ÇALIŞANLAR ({employees.length})</div>
            {employees.length===0?(
              <div style={{background:C.bg,border:`2px dashed ${C.border}`,borderRadius:8,padding:20,textAlign:"center",fontSize:12,color:C.textMuted}}>Henüz çalışan yok — yukarıdan ekleyin</div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:260,overflowY:"auto"}}>
                {employees.map(emp=>{
                  const approved=Object.values(emp.completions||{}).filter(v=>v.status==="approved").length;
                  const pending=Object.values(emp.completions||{}).filter(v=>v.status==="pending").length;
                  const isActive=activeEmp===emp.id;
                  return(
                    <div key={emp.id} onClick={()=>setActiveEmp(isActive?null:emp.id)} style={{background:isActive?"#faf5ff":C.surface,border:`1px solid ${isActive?"#e9d5ff":C.border}`,borderLeft:`3px solid ${isActive?"#7c3aed":C.border}`,borderRadius:7,padding:"8px 11px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all 0.1s"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name}</div>
                        <div style={{fontSize:10,color:C.textMuted}}>{emp.dept||"Birim belirtilmedi"}</div>
                      </div>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <span style={{fontSize:10,color:C.r4c,fontWeight:700}}>✅ {approved}</span>
                        {pending>0&&<span style={{fontSize:10,color:C.r3c,fontWeight:700}}>⏳ {pending}</span>}
                        <button onClick={e=>{e.stopPropagation();handleRemoveEmployee(emp.id);}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:4,width:20,height:20,cursor:"pointer",fontSize:12,color:C.textMuted,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>)}
        </div>

        {/* Sağ: Eğitim modülü yönetimi */}
        <div>
          {!instKey?(
            <div style={{background:C.bg,border:`2px dashed ${C.border}`,borderRadius:10,padding:28,textAlign:"center",minHeight:250,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <div style={{fontSize:28,marginBottom:8}}>👔</div>
              <div style={{fontSize:13,color:C.textMuted}}>Kurumu seçin ve personel ile<br/>eğitim modüllerini yönetin</div>
            </div>
          ):(
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:8}}>EĞİTİM MODÜLLERİ ({allCourses.length})</div>
              <div style={{marginBottom:8,display:"flex",gap:6}}>
                <input type="text" value={newCourse} onChange={e=>setNewCourse(e.target.value)} placeholder="Yeni eğitim modülü ekle..." style={{flex:1,padding:"8px 10px",border:`1px solid #e9d5ff`,borderRadius:7,fontSize:12,color:C.text,background:"#faf5ff"}}/>
                <button onClick={()=>newCourse.trim()&&handleAssignCourse(newCourse.trim())} style={{padding:"8px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:"#7c3aed",color:"white",flexShrink:0}}>+ Ekle</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12,maxHeight:200,overflowY:"auto"}}>
                {allCourses.map((c,i)=>{
                  const isCustom=customCourses.includes(c);
                  const pr=i<2?{c:C.r1c,bg:C.r1bg,br:C.r1br}:i<5?{c:C.r2c,bg:C.r2bg,br:C.r2br}:{c:C.r3c,bg:C.r3bg,br:C.r3br};
                  return(
                    <div key={c} style={{background:isCustom?"#faf5ff":pr.bg,border:`1px solid ${isCustom?"#e9d5ff":pr.br}`,borderRadius:6,padding:"7px 11px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <span style={{fontSize:12,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{c}</span>
                        <span style={{fontSize:9,color:isCustom?"#7c3aed":pr.c,marginTop:1,display:"block"}}>{isCustom?"Kuruma özel":"Platform önerisi"}</span>
                      </div>
                      {isCustom&&(
                        <button onClick={()=>{let cl=[];try{cl=JSON.parse(localStorage.getItem(customCoursesKey)||"[]");}catch{}cl=cl.filter(x=>x!==c);localStorage.setItem(customCoursesKey,JSON.stringify(cl));refresh();}} style={{background:"none",border:`1px solid #e9d5ff`,borderRadius:4,width:20,height:20,cursor:"pointer",fontSize:12,color:"#7c3aed",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Seçili çalışan detayı */}
              {activeEmp&&(()=>{
                const emp=employees.find(e=>e.id===activeEmp);if(!emp)return null;
                return(
                  <div style={{background:"#faf5ff",border:"1px solid #e9d5ff",borderRadius:10,padding:"14px 16px"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#7c3aed",letterSpacing:1,marginBottom:10}}>{emp.name.toUpperCase()} — EĞİTİM DURUMU</div>
                    {allCourses.map(c=>{
                      const comp=emp.completions?.[c];
                      const s=comp?.status;
                      return(
                        <div key={c} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid #e9d5ff`}}>
                          <span style={{fontSize:11,color:C.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginRight:8}}>{c}</span>
                          <span style={{fontSize:12,fontWeight:700,flexShrink:0,color:s==="approved"?C.r4c:s==="pending"?C.r3c:s==="rejected"?C.r1c:C.textMuted}}>
                            {s==="approved"?"✅ Tamamlandı":s==="pending"?"⏳ Bekliyor":s==="rejected"?"❌ Reddedildi":"— Başlanmadı"}
                          </span>
                        </div>
                      );
                    })}
                    {emp.dept&&<div style={{fontSize:10,color:"#7c3aed",marginTop:8}}>Birim: {emp.dept}</div>}
                  </div>
                );
              })()}

              <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"10px 14px",marginTop:10}}>
                <div style={{fontSize:10,fontWeight:700,color:C.accent,marginBottom:4}}>İK NOTU</div>
                <p style={{fontSize:11,color:"#1e40af",lineHeight:1.6,margin:0}}>Buradan eklenen eğitim modülleri Çalışan Portalı ve Yönetici Paneli'ne otomatik yansır. Kurum onaylı içerikler <strong>"Kuruma özel"</strong> etiketi alır.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EĞİTİM TAKİBİ: ÇALIŞAN PORTALI ─────────────────────────────────────────
function EmployeePortal() {
  const [step,setStep]=useState(1);const [inst,setInst]=useState("");const [customInst,setCustomInst]=useState("");const [name,setName]=useState("");const [dept,setDept]=useState("");
  const [td,setTd]=useState(loadOrDemo);const [certRefs,setCertRefs]=useState({});

  const instKey=inst==="other"?customInst:inst;
  const courses=getInstitutionCourses(instKey);

  const handleRegister=()=>{
    if(!instKey||!name.trim())return;
    const d=loadOrDemo();const ki=d[instKey]||{employees:[]};
    if(!ki.employees.find(e=>e.name===name.trim())){ki.employees=[...ki.employees,{id:Date.now().toString(),name:name.trim(),dept:dept.trim(),addedAt:new Date().toISOString(),completions:{}}];d[instKey]=ki;saveTD(d);}
    setTd(loadTD());setStep(2);
  };

  const currentEmp=td[instKey]?.employees?.find(e=>e.name===name.trim());

  const handleSubmit=courseName=>{
    const ref=certRefs[courseName]?.trim();
    const d=loadOrDemo();const ki=d[instKey];if(!ki)return;
    const ei=ki.employees.findIndex(e=>e.name===name.trim());if(ei<0)return;
    ki.employees[ei].completions[courseName]={status:"pending",certRef:ref||"Sertifika referansı girilmedi",submittedAt:new Date().toISOString()};
    saveTD(d);setTd(loadTD());
  };

  const getStatus=cn=>{const comp=currentEmp?.completions?.[cn];if(!comp)return null;return comp.status;};
  const statusIcon=s=>s==="approved"?"✅":s==="pending"?"⏳":s==="rejected"?"❌":null;
  const statusColor=s=>s==="approved"?C.r4c:s==="pending"?"#b45309":C.r1c;
  const statusLabel=s=>s==="approved"?"Onaylandı":s==="pending"?"Onay Bekliyor":s==="rejected"?"Reddedildi — Yeniden Gönder":"";

  return (
    <div>
      {step===1&&(
        <div style={{maxWidth:520,margin:"0 auto"}}>
          <div style={{background:C.accentLight,border:"1px solid #bfdbfe",borderRadius:10,padding:"14px 18px",marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:C.accent,letterSpacing:1,marginBottom:5}}>ÇALIŞAN PORTALI</div>
            <p style={{fontSize:13,color:"#1e40af",lineHeight:1.7,margin:0}}>Tamamladığınız eğitimleri bildirerek yöneticinizin onayına sunabilirsiniz. Kurum ve adınızı girdikten sonra size atanan kursları göreceksiniz.</p>
          </div>

          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:6}}>KURUM / FİRMA</div>
            <select value={inst} onChange={e=>setInst(e.target.value)} style={{width:"100%",fontSize:13,padding:"9px 10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,color:C.text,cursor:"pointer",marginBottom:8}}>
              <option value="">— Kurumunuzu seçin —</option>
              <optgroup label="Kamu Kurumları">{Object.keys(INSTITUTION_PRESETS).filter(k=>INST_TYPES[k]==="kamu").map(k=><option key={k} value={k}>{k}</option>)}</optgroup>
              <optgroup label="Özel Sektör">{Object.keys(INSTITUTION_PRESETS).filter(k=>!INST_TYPES[k]).map(k=><option key={k} value={k}>{k}</option>)}</optgroup>
              <option value="other">Diğer (Adını Gir)</option>
            </select>
            {inst==="other"&&<input type="text" value={customInst} onChange={e=>setCustomInst(e.target.value)} placeholder="Kurum / firma adını girin" style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.text}}/>}
          </div>

          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:6}}>AD SOYAD</div>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Adınız ve soyadınız" style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.text}}/>
          </div>

          <div style={{marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:6}}>BİRİM / UNVAN (İsteğe Bağlı)</div>
            <input type="text" value={dept} onChange={e=>setDept(e.target.value)} placeholder="örn. Bilgi İşlem, Muhasebe, İnsan Kaynakları" style={{width:"100%",padding:"9px 12px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.text}}/>
          </div>

          <button onClick={handleRegister} disabled={!instKey||!name.trim()} style={{width:"100%",padding:"13px 0",borderRadius:8,border:"none",cursor:!instKey||!name.trim()?"not-allowed":"pointer",fontSize:14,fontWeight:700,background:!instKey||!name.trim()?C.border:C.navBg,color:"white"}}>
            Eğitim Takibime Erişin →
          </button>
        </div>
      )}

      {step===2&&(
        <div style={{maxWidth:620,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:C.text}}>{name}</div>
              <div style={{fontSize:12,color:C.textMuted}}>{dept&&<><strong>{dept}</strong> · </>}{instKey}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:C.textMuted}}>Tamamlanan</div>
              <div style={{fontSize:18,fontWeight:900,color:C.r4c,fontFamily:"monospace"}}>
                {courses.filter(c=>getStatus(c)==="approved").length}/{courses.length}
              </div>
            </div>
          </div>

          {/* İlerleme çubuğu */}
          <div style={{height:8,background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden",marginBottom:18}}>
            <div style={{height:"100%",width:`${Math.round(courses.filter(c=>getStatus(c)==="approved").length/courses.length*100)}%`,background:C.r4c,borderRadius:4,transition:"width 0.3s"}}/>
          </div>

          <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:10}}>ATANAN EĞİTİMLER</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {courses.map((course,i)=>{
              const status=getStatus(course);
              const pr=i<2?{c:C.r1c,bg:C.r1bg,br:C.r1br}:i<5?{c:C.r2c,bg:C.r2bg,br:C.r2br}:{c:C.r3c,bg:C.r3bg,br:C.r3br};
              const pLabel=i<2?"Kritik":i<5?"Yüksek Öncelikli":"Standart";
              return (
                <div key={course} style={{background:status==="approved"?"#f0fdf4":status==="pending"?"#fffbeb":C.surface,border:`1px solid ${status==="approved"?C.r4br:status==="pending"?C.r3br:C.border}`,borderLeft:`3px solid ${status==="approved"?C.r4c:status==="pending"?C.r3c:pr.c}`,borderRadius:9,padding:"12px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:status&&status!=="rejected"?8:10}}>
                    <div style={{flex:1,marginRight:10}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.text}}>{course}</div>
                      <span style={{fontSize:10,fontWeight:700,color:pr.c,background:pr.bg,border:`1px solid ${pr.br}`,borderRadius:3,padding:"1px 6px",marginTop:3,display:"inline-block"}}>{pLabel}</span>
                    </div>
                    {status&&<div style={{fontSize:13,color:statusColor(status),fontWeight:600,display:"flex",alignItems:"center",gap:5,flexShrink:0}}>{statusIcon(status)} {statusLabel(status)}</div>}
                  </div>
                  {status==="approved"&&<div style={{fontSize:11,color:C.r4c}}>Sertifika: {currentEmp?.completions?.[course]?.certRef}</div>}
                  {(!status||status==="rejected")&&(
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input type="text" value={certRefs[course]||""} onChange={e=>setCertRefs(p=>({...p,[course]:e.target.value}))} placeholder="Sertifika numarası / referans kodu (isteğe bağlı)" style={{flex:1,padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:12,color:C.text}}/>
                      <button onClick={()=>handleSubmit(course)} style={{padding:"7px 14px",borderRadius:6,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:C.navBg,color:"white",flexShrink:0,whiteSpace:"nowrap"}}>
                        {status==="rejected"?"Yeniden Gönder":"Tamamlandı Olarak Bildir"}
                      </button>
                    </div>
                  )}
                  {status==="pending"&&<div style={{fontSize:10,color:C.r3c,marginTop:4}}>Yönetici onayı bekleniyor · {currentEmp?.completions?.[course]?.certRef&&<>Ref: {currentEmp.completions[course].certRef}</>}</div>}
                </div>
              );
            })}
          </div>

          <button onClick={()=>{setStep(1);setName("");setDept("");setInst("");setCustomInst("");}} style={{width:"100%",padding:"10px 0",borderRadius:7,border:`1px solid ${C.border}`,cursor:"pointer",fontSize:12,fontWeight:600,background:C.bg,color:C.textSec,marginTop:16}}>← Çıkış Yap</button>
        </div>
      )}
    </div>
  );
}

// ─── EĞİTİM TAKİBİ: YÖNETİCİ PANELİ ─────────────────────────────────────────
function ManagerDashboard() {
  const [inst,setInst]=useState("");const [customInst,setCustomInst]=useState("");const [td,setTd]=useState(loadOrDemo);const [filter,setFilter]=useState("all");

  const instKey=inst==="other"?customInst:inst;
  const refresh=()=>setTd(loadOrDemo());
  const instData=td[instKey];
  const employees=instData?.employees||[];
  const courses=getInstitutionCourses(instKey);

  const handleApprove=(empName,courseName)=>{
    const d=loadOrDemo();const ki=d[instKey];if(!ki)return;
    const ei=ki.employees.findIndex(e=>e.name===empName);if(ei<0)return;
    ki.employees[ei].completions[courseName].status="approved";saveTD(d);refresh();
  };
  const handleReject=(empName,courseName)=>{
    const d=loadOrDemo();const ki=d[instKey];if(!ki)return;
    const ei=ki.employees.findIndex(e=>e.name===empName);if(ei<0)return;
    ki.employees[ei].completions[courseName].status="rejected";saveTD(d);refresh();
  };

  const pending=employees.flatMap(e=>Object.entries(e.completions||{}).filter(([,v])=>v.status==="pending").map(([c,v])=>({emp:e.name,dept:e.dept,course:c,certRef:v.certRef,submittedAt:v.submittedAt})));
  const totalApproved=employees.reduce((s,e)=>s+Object.values(e.completions||{}).filter(v=>v.status==="approved").length,0);
  const totalPossible=employees.length*courses.length;
  const completionPct=totalPossible>0?Math.round(totalApproved/totalPossible*100):0;

  const getEmpStatus=(emp,course)=>{const c=emp.completions?.[course];return c?c.status:null;};
  const statusIcon=s=>s==="approved"?"✅":s==="pending"?"⏳":s==="rejected"?"❌":"—";

  return (
    <div>
      <div style={{background:"#fefce8",border:"1px solid #fde68a",borderRadius:9,padding:"12px 16px",marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:700,color:"#b45309",letterSpacing:1,marginBottom:4}}>YÖNETİCİ PANELİ</div>
        <p style={{fontSize:13,color:"#92400e",lineHeight:1.65,margin:0}}>Kurumunuzu seçin ve personelin eğitim durumunu takip edin. Bekleyen bildirimleri onaylayabilir veya reddedebilirsiniz.</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:6}}>KURUM / FİRMA</div>
          <select value={inst} onChange={e=>{setInst(e.target.value);setCustomInst("");}} style={{width:"100%",fontSize:13,padding:"9px 10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,color:C.text,cursor:"pointer",marginBottom:inst==="other"?8:0}}>
            <option value="">— Kurumu seçin —</option>
            <optgroup label="Kamu">{Object.keys(INSTITUTION_PRESETS).filter(k=>INST_TYPES[k]==="kamu").map(k=><option key={k} value={k}>{k}</option>)}</optgroup>
            <optgroup label="Özel Sektör">{Object.keys(INSTITUTION_PRESETS).filter(k=>!INST_TYPES[k]).map(k=><option key={k} value={k}>{k}</option>)}</optgroup>
            <option value="other">Diğer</option>
          </select>
          {inst==="other"&&<input type="text" value={customInst} onChange={e=>setCustomInst(e.target.value)} placeholder="Kurum adını girin" style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:7,fontSize:13,color:C.text}}/>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {instKey&&employees.length>0&&(
            <>
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1,background:C.r4bg,border:`1px solid ${C.r4br}`,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                  <div style={{fontSize:22,fontWeight:900,color:C.r4c,fontFamily:"monospace"}}>{completionPct}%</div>
                  <div style={{fontSize:10,color:C.r4c,fontWeight:700}}>Tamamlama Oranı</div>
                </div>
                <div style={{flex:1,background:C.r3bg,border:`1px solid ${C.r3br}`,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                  <div style={{fontSize:22,fontWeight:900,color:C.r3c,fontFamily:"monospace"}}>{pending.length}</div>
                  <div style={{fontSize:10,color:C.r3c,fontWeight:700}}>Bekleyen Onay</div>
                </div>
              </div>
              <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",textAlign:"center",fontSize:12,color:C.textSec}}>
                <strong style={{color:C.text}}>{employees.length} çalışan</strong> · <strong style={{color:C.text}}>{courses.length} kurs</strong> · <strong style={{color:C.text}}>{totalApproved}</strong> onaylı tamamlama
              </div>
            </>
          )}
        </div>
      </div>

      {instKey&&employees.length===0&&(
        <div style={{background:C.bg,border:`2px dashed ${C.border}`,borderRadius:10,padding:32,textAlign:"center"}}>
          <div style={{fontSize:28,marginBottom:8}}>👥</div>
          <div style={{fontSize:14,fontWeight:600,color:C.textSec,marginBottom:4}}>Henüz kayıtlı çalışan yok</div>
          <div style={{fontSize:12,color:C.textMuted}}>Çalışanlar "Çalışan Portalı"ndan sisteme katıldığında burada görünecekler.</div>
        </div>
      )}

      {instKey&&employees.length>0&&(<>
        {/* Bekleyen onaylar */}
        {pending.length>0&&(
          <div style={{marginBottom:18}}>
            <div style={{fontSize:12,fontWeight:700,color:C.r3c,letterSpacing:1,marginBottom:10,background:C.r3bg,border:`1px solid ${C.r3br}`,borderRadius:7,padding:"6px 12px",display:"inline-flex",alignItems:"center",gap:6}}>
              ⏳ {pending.length} Bekleyen Onay
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {pending.map((item,i)=>(
                <div key={i} style={{background:C.surface,border:`1px solid ${C.r3br}`,borderLeft:`3px solid ${C.r3c}`,borderRadius:9,padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{item.emp}{item.dept&&<span style={{fontSize:11,color:C.textMuted,fontWeight:400}}> · {item.dept}</span>}</div>
                    <div style={{fontSize:12,color:C.textSec,marginTop:2}}>{item.course}</div>
                    {item.certRef&&<div style={{fontSize:10,color:C.textMuted,marginTop:2}}>Referans: {item.certRef}</div>}
                    <div style={{fontSize:10,color:C.textMuted,marginTop:1}}>Bildirildi: {new Date(item.submittedAt).toLocaleDateString("tr-TR")}</div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <button onClick={()=>handleApprove(item.emp,item.course)} style={{padding:"7px 14px",borderRadius:6,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:C.r4c,color:"white"}}>✓ Onayla</button>
                    <button onClick={()=>handleReject(item.emp,item.course)} style={{padding:"7px 14px",borderRadius:6,border:`1px solid ${C.r1br}`,cursor:"pointer",fontSize:12,fontWeight:700,background:C.r1bg,color:C.r1c}}>✗ Reddet</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtre */}
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          {[{v:"all",l:"Tümü"},{v:"incomplete",l:"Eksik Eğitimler"},{v:"pending",l:"Bekleyenler"}].map(f=>(
            <button key={f.v} onClick={()=>setFilter(f.v)} style={{fontSize:11,padding:"4px 10px",borderRadius:5,border:`1px solid ${filter===f.v?C.accent:C.border}`,background:filter===f.v?C.accentLight:C.surface,color:filter===f.v?C.accent:C.textSec,cursor:"pointer",fontWeight:filter===f.v?700:400}}>{f.l}</button>
          ))}
        </div>

        {/* Tamamlama matrisi */}
        <div style={{overflowX:"auto",borderRadius:10,border:`1px solid ${C.border}`}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
            <thead>
              <tr style={{background:C.navBg}}>
                <th style={{padding:"10px 14px",fontSize:12,fontWeight:700,color:"white",textAlign:"left",whiteSpace:"nowrap"}}>Çalışan</th>
                {courses.slice(0,6).map(c=>(
                  <th key={c} style={{padding:"10px 10px",fontSize:10,fontWeight:600,color:"#93c5fd",textAlign:"center",whiteSpace:"nowrap",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis"}}>{c.length>22?c.slice(0,22)+"…":c}</th>
                ))}
                <th style={{padding:"10px 10px",fontSize:11,fontWeight:700,color:"#fbbf24",textAlign:"center"}}>Toplam</th>
              </tr>
            </thead>
            <tbody>
              {employees.filter(e=>{
                if(filter==="all")return true;
                if(filter==="incomplete")return courses.some(c=>!e.completions?.[c]||e.completions[c].status!=="approved");
                if(filter==="pending")return Object.values(e.completions||{}).some(v=>v.status==="pending");
                return true;
              }).map((emp,ei)=>{
                const approved=courses.filter(c=>getEmpStatus(emp,c)==="approved").length;
                return(
                  <tr key={emp.id} style={{background:ei%2===0?"white":C.bg}}>
                    <td style={{padding:"9px 14px",fontWeight:600,fontSize:13,whiteSpace:"nowrap"}}>
                      {emp.name}<br/>
                      {emp.dept&&<span style={{fontSize:10,color:C.textMuted,fontWeight:400}}>{emp.dept}</span>}
                    </td>
                    {courses.slice(0,6).map(c=>{
                      const status=getEmpStatus(emp,c);
                      return(
                        <td key={c} style={{padding:"9px 10px",textAlign:"center",fontSize:16}}>
                          {statusIcon(status)}
                        </td>
                      );
                    })}
                    <td style={{padding:"9px 10px",textAlign:"center"}}>
                      <span style={{fontSize:13,fontWeight:800,color:approved===courses.length?C.r4c:approved>0?C.r3c:C.r1c,fontFamily:"monospace"}}>{approved}/{courses.length}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{display:"flex",gap:16,marginTop:8,fontSize:11,color:C.textMuted}}>
          <span>✅ Onaylandı</span><span>⏳ Onay Bekliyor</span><span>❌ Reddedildi</span><span>— Başlanmadı</span>
        </div>
      </>)}
    </div>
  );
}

// ─── EĞİTİM TAKİP PORTALI ────────────────────────────────────────────────────
function TrainingPortal() {
  const [mode,setMode]=useState("manager");
  return (
    <div>
      <div style={{marginBottom:18}}>
        <h2 style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:6}}>Eğitim Takip Sistemi</h2>
        <p style={{fontSize:14,color:C.textSec,lineHeight:1.7}}>Çalışanlar tamamladıkları eğitimleri bildirerek yönetici onayına sunar. İK personeli çalışan ve kurs listesini yönetir. Yöneticiler tüm tabloyu gerçek zamanlı izler.</p>
      </div>

      {/* Demo notu */}
      <div style={{background:"#fefce8",border:"1px solid #fde68a",borderRadius:9,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:16}}>💡</span>
        <p style={{fontSize:12,color:"#92400e",lineHeight:1.6,margin:0}}>
          <strong>Sunum Demo'su:</strong> Yönetici Paneli ve İK Portalı <strong>BTK</strong> kurumuna ait örnek verilerle önceden doldurulmuştur. Çalışan Portalı'nda "BTK" seçip bir isim girerek gerçek akışı deneyimleyebilirsiniz.
        </p>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:22,flexWrap:"wrap"}}>
        <button onClick={()=>setMode("employee")} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:8,border:`1px solid ${mode==="employee"?C.accent:C.border}`,background:mode==="employee"?C.accentLight:C.surface,color:mode==="employee"?C.accent:C.textSec,cursor:"pointer",fontSize:13,fontWeight:700}}>
          <span style={{fontSize:16}}>👤</span> Çalışan Portalı
        </button>
        <button onClick={()=>setMode("manager")} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:8,border:`1px solid ${mode==="manager"?"#b45309":C.border}`,background:mode==="manager"?"#fffbeb":C.surface,color:mode==="manager"?"#b45309":C.textSec,cursor:"pointer",fontSize:13,fontWeight:700}}>
          <span style={{fontSize:16}}>📊</span> Yönetici Paneli
        </button>
        <button onClick={()=>setMode("hr")} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:8,border:`1px solid ${mode==="hr"?"#7c3aed":C.border}`,background:mode==="hr"?"#faf5ff":C.surface,color:mode==="hr"?"#7c3aed":C.textSec,cursor:"pointer",fontSize:13,fontWeight:700}}>
          <span style={{fontSize:16}}>👔</span> İK Portalı
        </button>
      </div>
      {mode==="employee"&&<EmployeePortal/>}
      {mode==="manager"&&<ManagerDashboard/>}
      {mode==="hr"&&<HRPortal/>}
    </div>
  );
}

// ─── HARİTA ──────────────────────────────────────────────────────────────────
function TurkeyMap() {
  const [hovered,setHovered]=useState(null);
  return (
    <div>
      <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:12,color:C.textMuted,fontWeight:600}}>Seviye:</span>
        {[{f:"#fca5a5",s:"#ef4444",l:"%60+"},{f:"#fdba74",s:"#f97316",l:"%40–60"},{f:"#fde68a",s:"#d97706",l:"%25–40"},{f:"#86efac",s:"#16a34a",l:"< %25"}].map(item=>(
          <div key={item.l} style={{display:"flex",alignItems:"center",gap:5}}><svg width="14" height="10"><rect x="0" y="0" width="14" height="10" rx="2" fill={item.f} stroke={item.s} strokeWidth="1.5"/></svg><span style={{fontSize:11,color:C.textSec}}>{item.l}</span></div>
        ))}
      </div>
      <div style={{position:"relative",background:"#e0ecfb",borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
        <svg viewBox={`0 0 ${VW} ${VH}`} style={{width:"100%",display:"block"}}>
          <rect width={VW} height={VH} fill="#dbeafe"/>
          <defs><pattern id="mg" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#bfdbfe" strokeWidth="0.5"/></pattern></defs>
          <rect width={VW} height={VH} fill="url(#mg)"/>
          {PROVINCES.map(p=>{const col=getMapColor(p.score);const x1=tx(p.bounds[0]);const y1=ty(p.bounds[3]);const w=tx(p.bounds[2])-x1;const h=ty(p.bounds[1])-y1;const isH=hovered?.code===p.code;return(
            <g key={p.code} onMouseEnter={()=>setHovered(p)} onMouseLeave={()=>setHovered(null)} style={{cursor:"pointer"}}>
              <rect x={x1} y={y1} width={w} height={h} rx={2} fill={isH?col.stroke:col.fill} stroke={col.stroke} strokeWidth={isH?2:0.8} opacity={isH?0.95:0.82} style={{transition:"all 0.15s"}}/>
              {w>28&&h>16&&<text x={x1+w/2} y={y1+h/2+3.5} textAnchor="middle" fill={isH?"white":col.stroke} fontSize={Math.min(9,w/4)} fontWeight="700" fontFamily="monospace" style={{pointerEvents:"none",userSelect:"none"}}>{p.score}%</text>}
            </g>
          );})}
        </svg>
        {hovered&&(<div style={{position:"absolute",top:12,right:12,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",minWidth:210,boxShadow:"0 4px 20px rgba(0,0,0,0.12)"}}>
          <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:2}}>{hovered.name}</div>
          <div style={{fontSize:11,color:C.textMuted,marginBottom:10}}>{hovered.code} · {hovered.sector}</div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:C.textSec}}>AI Maruziyet</span><span style={{fontSize:12,fontFamily:"monospace",fontWeight:700,color:getMapColor(hovered.score).stroke}}>{hovered.score}%</span></div>
          <div style={{height:5,background:C.bg,borderRadius:2,overflow:"hidden",border:`1px solid ${C.border}`}}><div style={{height:"100%",width:`${hovered.score}%`,background:getMapColor(hovered.score).stroke,borderRadius:2}}/></div>
        </div>)}
      </div>
      <div style={{marginTop:14}}>
        <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:8}}>EN YÜKSEK SKORA SAHİP 10 İL</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:6}}>
          {[...PROVINCES].sort((a,b)=>b.score-a.score).slice(0,10).map(p=>{const col=getMapColor(p.score);return(<div key={p.code} style={{background:C.surface,border:`1px solid ${col.stroke}44`,borderLeft:`3px solid ${col.stroke}`,borderRadius:6,padding:"8px 11px",display:"flex",alignItems:"center",gap:8}}><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:C.text}}>{p.name}</div><div style={{fontSize:9,color:C.textMuted}}>{p.sector}</div></div><div style={{fontSize:14,fontWeight:800,color:col.stroke,fontFamily:"monospace"}}>{p.score}%</div></div>);})}
        </div>
      </div>
      <div style={{marginTop:14,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:9,padding:"12px 16px"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#1d4ed8",letterSpacing:1,marginBottom:6}}>POLİTİKA NOTU</div>
        <p style={{fontSize:13,color:"#1e40af",lineHeight:1.75,margin:0}}>Batı illerinde finans ve BİT sektörlerinin yoğunluğu nedeniyle AI maruziyeti yüksek. Doğu illerinde tarım ağırlıklı yapı doğal bir koruma sağlıyor; ancak bu illerde dijital beceri açığı farklı bir politika sorunu yaratıyor.</p>
      </div>
    </div>
  );
}

// ─── DETAY PANELİ ────────────────────────────────────────────────────────────
function DetailPanel({prof,onModalOpen}) {
  if(!prof) return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:420,textAlign:"center",padding:40}}>
      <div style={{width:50,height:50,borderRadius:10,background:C.bg,border:`2px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12,fontSize:20,color:C.textMuted}}>↖</div>
      <div style={{fontSize:15,fontWeight:600,color:C.textSec,marginBottom:5}}>Listeden Meslek Seçin</div>
      <div style={{fontSize:13,color:C.textMuted,lineHeight:1.6}}>Arama yapın veya listeden<br/>bir meslek seçerek detayları görüntüleyin.</div>
    </div>
  );
  const risk=getRisk(prof.score);const R=44;const CIRC=2*Math.PI*R;
  const gap=prof.gap!==undefined?prof.gap:+(prof.theoretical-prof.score).toFixed(1);
  return(
    <div>
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:10,alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:16,color:C.text,marginBottom:3,lineHeight:1.3}}>{prof.title}</div>
          <div style={{fontSize:10,color:C.textMuted,fontFamily:"monospace"}}>ISCO-08: {prof.isco}{prof.nace&&<> · NACE: {prof.nace}</>} · {prof.sector}</div>
          {prof.naceName&&<div style={{fontSize:9,color:"#94a3b8",marginTop:1}}>{prof.naceName}</div>}
          <div style={{fontSize:10,color:"#f59e0b",marginTop:2,fontWeight:600}}>Benimseme Açığı: %{gap}</div>
        </div>
        <span style={{fontSize:10,fontWeight:700,padding:"4px 9px",borderRadius:4,background:risk.bg,color:risk.c,border:`1px solid ${risk.br}`,whiteSpace:"nowrap"}}>{risk.label}</span>
      </div>
      <div style={{padding:"16px 20px"}}>
        <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:14}}>
          <div style={{flexShrink:0}}>
            <svg width="100" height="100" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r={R} fill="none" stroke={C.bg} strokeWidth="10" strokeDasharray={`${CIRC*0.75} ${CIRC*0.25}`} strokeLinecap="round" transform="rotate(135 55 55)"/>
              <circle cx="55" cy="55" r={R} fill="none" stroke={risk.c} strokeWidth="10" strokeDasharray={`${CIRC*0.75*(prof.score/100)} ${CIRC}`} strokeLinecap="round" transform="rotate(135 55 55)" style={{filter:`drop-shadow(0 0 4px ${risk.c}55)`}}/>
              <text x="55" y="51" textAnchor="middle" fill={C.text} fontSize="18" fontWeight="800" fontFamily="monospace">{prof.score}%</text>
              <text x="55" y="65" textAnchor="middle" fill={C.textMuted} fontSize="7.5">MARUZIYET</text>
            </svg>
            <div style={{textAlign:"center",marginTop:-2}}><button onClick={onModalOpen} style={{fontSize:10,color:C.accent,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",padding:0}}>Bu skor nedir?</button></div>
          </div>
          <div style={{flex:1}}>
            {[{label:"Teorik Kapasite",val:prof.theoretical,color:C.textSec},{label:"Gerçek Kullanım",val:prof.score,color:risk.c},{label:"Benimseme Açığı",val:gap,color:"#f59e0b"}].map(b=>(
              <div key={b.label} style={{marginBottom:9}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}><span style={{color:C.textSec}}>{b.label}</span><span style={{color:b.color,fontFamily:"monospace",fontWeight:700}}>{b.val}%</span></div>
                <div style={{height:5,background:C.bg,borderRadius:3,overflow:"hidden",border:`1px solid ${C.border}`}}><div style={{height:"100%",width:`${Math.min(b.val,100)}%`,background:b.color,borderRadius:3}}/></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {[{label:"Türkiye İşgücü",val:fmtW(prof.workers)},{label:"Büyüme (BLS 2034)",val:(prof.trend>0?"+":"")+prof.trend+"%"}].map(s=>(<div key={s.label} style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,padding:"9px 11px"}}><div style={{fontSize:17,fontWeight:800,color:C.text,fontFamily:"monospace"}}>{s.val}</div><div style={{fontSize:10,color:C.textMuted,marginTop:2}}>{s.label}</div></div>))}
        </div>
        <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,padding:12,marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:5}}>SEKTÖR ETKİSİ VE KARİYER STRATEJİSİ</div>
          <p style={{fontSize:12,color:C.textSec,lineHeight:1.75,margin:0}}>{prof.impact}</p>
        </div>
        <div style={{fontSize:10,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:7}}>ÖNERİLEN KURSLAR</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {prof.courses.map((c,i)=>{const pr=getPriority(i,prof.score);return(<div key={i} style={{background:pr.bg,border:`1px solid ${pr.br}`,borderRadius:6,padding:"8px 11px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:500,color:C.text}}>{c}</span><span style={{fontSize:10,fontWeight:700,color:pr.c,border:`1px solid ${pr.br}`,borderRadius:3,padding:"2px 6px",marginLeft:8,whiteSpace:"nowrap"}}>{pr.label}</span></div>);})}
        </div>
      </div>
    </div>
  );
}

// ─── METODOLOJİ ──────────────────────────────────────────────────────────────
function MethodSection({onModalOpen}) {
  return(
    <div style={{maxWidth:700}}>
      <h2 style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:6}}>Analiz Metodolojisi</h2>
      <p style={{fontSize:14,color:C.textSec,lineHeight:1.75,marginBottom:26}}>Platformdaki maruziyet skorları Anthropic'in Mart 2026 işgücü araştırmasından türetilmiş, ISCO-08 + NACE Rev.2 standartlarıyla eşleştirilmiştir. <button onClick={onModalOpen} style={{fontSize:13,color:C.accent,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",padding:0}}>Skor hesaplama yöntemi</button></p>
      <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:26}}>
        {[
          {n:"01",color:"#1d4ed8",title:"Anthropic Economic Index",body:"Massenkoff & McCrory (2026) 'Observed Exposure' metriği — Claude API gerçek dünya kullanım verilerinden türetildi. 800+ meslek için teorik kapasite ve fiili otomasyon oranı ölçüldü."},
          {n:"02",color:"#7c3aed",title:"NACE Rev.2 + ISCO-08 Çift Standart",body:"O*NET meslek kodları NACE Rev.2 (işyeri) ve ISCO-08 (bireysel) standartlarıyla çapraz eşleştirildi. SGK, İŞKUR ve KOSGEB veri tabanlarıyla doğrudan sorgulanabilir. Core9Tech tarafından manuel doğrulandı."},
          {n:"03",color:"#0891b2",title:"Türkiye İşgücü Ağırlıklandırması",body:"Çalışan sayıları TÜİK Hanehalkı İşgücü Araştırması (2024) ile ağırlıklandırıldı. İl bazlı risk skoru baskın sektör ağırlıklı ortalama yöntemiyle hesaplandı."},
          {n:"04",color:"#059669",title:"Kurs Eşleştirme ve Eğitim Hesaplayıcı",body:"Maruziyet profili × benimseme açığı × işgücü büyüklüğü formülüyle kurs önceliklendirmesi yapıldı. Eğitim planı kurum risk seviyesine göre dinamik olarak oluşturulur."},
        ].map(s=>(<div key={s.n} style={{display:"flex",gap:12}}><div style={{width:34,height:34,borderRadius:7,background:s.color,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,fontFamily:"monospace",flexShrink:0}}>{s.n}</div><div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:"12px 14px",flex:1}}><div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:5}}>{s.title}</div><div style={{fontSize:12,color:C.textSec,lineHeight:1.75}}>{s.body}</div></div></div>))}
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:16}}>
        <div style={{fontSize:10,fontWeight:700,color:C.textMuted,letterSpacing:1,marginBottom:10}}>KAYNAKÇA</div>
        {["Massenkoff, M. & McCrory, E. (2026). Labor Market Impacts of AI. Anthropic.","Anthropic Economic Index. huggingface.co/datasets/Anthropic/EconomicIndex","TÜİK Hanehalkı İşgücü Araştırması (2024). Türkiye İstatistik Kurumu.","ISCO-08 Uluslararası Meslek Standart Sınıflaması. ILO / TÜİK.","NACE Rev.2 Ekonomik Faaliyet Sınıflaması. EUROSTAT / TÜİK.","BLS Employment Projections 2024–2034. U.S. Bureau of Labor Statistics."].map((r,i)=>(<div key={i} style={{fontSize:11,color:C.textSec,lineHeight:1.6,paddingLeft:10,borderLeft:`2px solid ${C.border}`,marginBottom:6}}>{r}</div>))}
      </div>
    </div>
  );
}

// ─── ANA UYGULAMA ─────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]=useState("analysis");const [search,setSearch]=useState("");const [selected,setSel]=useState(null);
  const [sortBy,setSort]=useState("score");const [modal,setModal]=useState(false);const [heroModal,setHeroModal]=useState(null);
  const [sectorFilter,setSectorFilter]=useState("Tümü");
  const sectors=useMemo(()=>["Tümü",...new Set(PROFESSIONS.map(p=>p.sector))].sort((a,b)=>a==="Tümü"?-1:a.localeCompare(b,"tr")),[]);
  const filtered=useMemo(()=>{let list=PROFESSIONS;if(sectorFilter!=="Tümü")list=list.filter(p=>p.sector===sectorFilter);if(search.trim()){const q=search.toLowerCase();list=list.filter(p=>p.title.toLowerCase().includes(q)||p.sector.toLowerCase().includes(q)||p.isco.includes(q)||(p.nace&&p.nace.includes(q)));}return[...list].sort((a,b)=>sortBy==="score"?b.score-a.score:sortBy==="gap"?(b.gap??b.theoretical-b.score)-(a.gap??a.theoretical-a.score):a.title.localeCompare(b.title,"tr"));},[search,sortBy,sectorFilter]);
  const stats=useMemo(()=>({atRisk:PROFESSIONS.filter(p=>p.score>=50).reduce((s,p)=>s+p.workers,0),highRisk:PROFESSIONS.filter(p=>p.score>=65).length,avg:NAT_AVG}),[]);
  const NAV_TABS=[{id:"analysis",label:"Meslek Analizi"},{id:"matrix",label:"Öncelik Matrisi"},{id:"profile",label:"Kurum Analizi"},{id:"training",label:"Eğitim Planı"},{id:"tracker",label:"Eğitim Takibi"},{id:"map",label:"İl Haritası"},{id:"method",label:"Metodoloji"}];
  const heroStats=[{val:String(PROFESSIONS.length),label:"Analiz Edilen Meslek",sub:"NACE Rev.2 + ISCO-08",accent:"white",clickable:false},{val:"81",label:"İl Bazında Veri",sub:"Tüm Türkiye illeri",accent:"white",clickable:false},{val:fmtW(stats.atRisk),label:"Yüksek Risk İşgücü",hint:"tıkla → detaylar",accent:"#fca5a5",clickable:true,onClick:()=>setHeroModal("workforce")},{val:String(stats.highRisk),label:"Kritik Meslek",hint:"tıkla → isimler",accent:"#fdba74",clickable:true,onClick:()=>setHeroModal("critical")},{val:`${stats.avg}%`,label:"Ortalama Skor",hint:"tıkla → hesaplama",accent:"white",clickable:true,onClick:()=>setHeroModal("avg")}];

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}input,button,select{font-family:inherit}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.borderMed};border-radius:3px}.hsb:hover{background:rgba(255,255,255,0.12)!important;transform:translateY(-1px)}.hsb{transition:all .15s}`}</style>
      {modal&&<ScoreModal onClose={()=>setModal(false)}/>}
      {heroModal&&<HeroModal type={heroModal} stats={stats} onClose={()=>setHeroModal(null)}/>}

      <nav style={{background:C.navBg,position:"sticky",top:0,zIndex:100,borderBottom:`1px solid ${C.navBorder}`}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 16px",display:"flex",alignItems:"stretch",height:54}}>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"center",marginRight:"auto",paddingRight:16,borderRight:`1px solid ${C.navBorder}`}}>
            <div style={{display:"flex",alignItems:"baseline",gap:7}}><span style={{fontSize:16,fontWeight:900,color:"white",letterSpacing:-0.5}}>TAME</span><span style={{fontSize:10,color:"#64748b"}}>Türkiye AI Maruziyet Endeksi</span></div>
            <div style={{fontSize:9,color:"#334155"}}>Core9Tech × BTK Akademi · Pilot, Mart 2026</div>
          </div>
          {NAV_TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{background:"none",border:"none",borderBottom:`2px solid ${tab===t.id?"#60a5fa":"transparent"}`,color:tab===t.id?"white":"#64748b",fontSize:11,fontWeight:tab===t.id?700:400,padding:"0 11px",cursor:"pointer",transition:"all 0.15s",marginTop:2,whiteSpace:"nowrap"}}>{t.label}</button>))}
          <div style={{display:"flex",flexDirection:"column",justifyContent:"center",paddingLeft:12,borderLeft:`1px solid ${C.navBorder}`,marginLeft:4}}><div style={{fontSize:9,color:"#334155"}}>Kaynak</div><div style={{fontSize:9,color:"#94a3b8",fontWeight:600}}>Anthropic Index</div></div>
        </div>
      </nav>

      <div style={{background:C.navBg,padding:"28px 24px 32px",borderBottom:"3px solid #1d4ed8"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{marginBottom:8}}><span style={{background:"#1e3a5f",color:"#93c5fd",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:4,letterSpacing:1.5,border:"1px solid #1d4ed8"}}>PİLOT ÇALIŞMA</span></div>
          <h1 style={{fontSize:"clamp(18px,3.5vw,32px)",fontWeight:900,color:"white",lineHeight:1.2,marginBottom:9,letterSpacing:-0.5}}>Türkiye'de Hangi Meslekler<br/>Yapay Zekadan Etkileniyor?</h1>
          <p style={{color:"#94a3b8",fontSize:13,lineHeight:1.75,maxWidth:520,marginBottom:22}}>Anthropic'in Mart 2026 işgücü raporu {PROFESSIONS.length} meslek ve 81 il düzeyinde Türkiye verisiyle eşleştirildi. Öncelik matrisi, eğitim planı, kurum analizi ve personel takip sistemiyle işgücü dönüşümünü yönetin.</p>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            {heroStats.map(s=>(<div key={s.label} className={s.clickable?"hsb":""} onClick={s.clickable?s.onClick:undefined} style={{background:"rgba(255,255,255,0.06)",border:s.clickable?"1px solid rgba(255,255,255,0.18)":"1px solid rgba(255,255,255,0.1)",borderRadius:9,padding:"11px 16px",minWidth:130,cursor:s.clickable?"pointer":"default",position:"relative"}}>
              {s.clickable&&<div style={{position:"absolute",top:5,right:7,fontSize:9,color:"rgba(255,255,255,0.35)",fontWeight:600}}>↗</div>}
              <div style={{fontSize:22,fontWeight:900,color:s.accent,fontFamily:"monospace",lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:11,color:"#e2e8f0",marginTop:4,fontWeight:600}}>{s.label}</div>
              <div style={{fontSize:9,color:s.clickable?"rgba(255,255,255,0.4)":"#475569",marginTop:2}}>{s.clickable?s.hint:s.sub}</div>
            </div>))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1280,margin:"0 auto",padding:"22px 24px 60px"}}>
        {tab==="analysis"&&(
          <div style={{display:"grid",gridTemplateColumns:"minmax(270px,380px) 1fr",gap:18,alignItems:"start"}}>
            <div>
              <input type="text" placeholder="Meslek adı, sektör, ISCO veya NACE..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 11px",fontSize:13,color:C.text,marginBottom:7}}/>
              <div style={{display:"flex",gap:5,marginBottom:7,alignItems:"center",flexWrap:"wrap"}}>
                <select value={sectorFilter} onChange={e=>setSectorFilter(e.target.value)} style={{flex:1,fontSize:11,padding:"4px 7px",border:`1px solid ${C.border}`,borderRadius:5,background:C.surface,color:C.text,cursor:"pointer"}}>
                  {sectors.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{display:"flex",gap:4}}>
                  {[{v:"score",l:"Skora"},{v:"gap",l:"Açığa"},{v:"name",l:"A–Z"}].map(b=>(<button key={b.v} onClick={()=>setSort(b.v)} style={{fontSize:11,padding:"4px 7px",borderRadius:4,border:`1px solid ${sortBy===b.v?C.accent:C.border}`,background:sortBy===b.v?C.accentLight:C.surface,color:sortBy===b.v?C.accent:C.textSec,cursor:"pointer",fontWeight:sortBy===b.v?700:400}}>{b.l}</button>))}
                </div>
              </div>
              <div style={{fontSize:11,color:C.textMuted,marginBottom:7}}>{filtered.length} meslek{sortBy==="gap"&&<span style={{color:"#f59e0b",marginLeft:5}}>· açığa göre sıralı</span>}</div>
              <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:"64vh",overflowY:"auto",paddingRight:2}}>
                {filtered.map(p=>{const risk=getRisk(p.score);const isSel=selected?.id===p.id;const gap=p.gap!==undefined?p.gap:+(p.theoretical-p.score).toFixed(1);return(
                  <div key={p.id} onClick={()=>setSel(p)} style={{background:isSel?risk.bg:C.surface,border:`1px solid ${isSel?risk.c+"66":C.border}`,borderLeft:`3px solid ${isSel?risk.c:C.border}`,borderRadius:7,padding:"8px 11px",cursor:"pointer",transition:"all 0.12s",display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:12,color:C.text,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div>
                      <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
                        <span style={{fontSize:9,fontWeight:700,color:risk.c,border:`1px solid ${risk.br}`,background:risk.bg,borderRadius:3,padding:"1px 5px"}}>{risk.label}</span>
                        {p.nace&&<span style={{fontSize:8,color:C.textMuted,background:"#f1f5f9",border:`1px solid ${C.border}`,borderRadius:3,padding:"1px 4px",fontFamily:"monospace"}}>NACE {p.nace}</span>}
                        <span style={{fontSize:9,color:C.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.sector}</span>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:15,fontWeight:900,color:risk.c,fontFamily:"monospace"}}>{p.score}%</div>
                      {sortBy==="gap"&&<div style={{fontSize:8,color:"#f59e0b",fontFamily:"monospace",fontWeight:700}}>Δ{gap}%</div>}
                    </div>
                  </div>
                );})}
                {filtered.length===0&&<div style={{textAlign:"center",color:C.textMuted,padding:36,fontSize:13}}>Sonuç bulunamadı.</div>}
              </div>
            </div>
            <div style={{background:C.surface,border:`1px solid ${selected?getRisk(selected.score).br:C.border}`,borderRadius:11,boxShadow:"0 2px 12px rgba(0,0,0,0.05)",position:"sticky",top:66,maxHeight:"86vh",overflowY:"auto"}}>
              <DetailPanel prof={selected} onModalOpen={()=>setModal(true)}/>
            </div>
          </div>
        )}
        {tab==="matrix"&&<PriorityMatrix/>}
        {tab==="profile"&&<InstitutionProfile/>}
        {tab==="training"&&<EducationCalculator/>}
        {tab==="tracker"&&<TrainingPortal/>}
        {tab==="map"&&(
          <div>
            <div style={{marginBottom:18}}><h2 style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:5}}>İl Bazında AI Maruziyet Dağılımı</h2><p style={{fontSize:14,color:C.textSec,lineHeight:1.7}}>Her ilin baskın sektörü temel alınarak AI maruziyet skoru atandı.</p></div>
            <TurkeyMap/>
          </div>
        )}
        {tab==="method"&&<MethodSection onModalOpen={()=>setModal(true)}/>}
      </div>

      <footer style={{background:C.navBg,borderTop:"1px solid #1a3a6b",padding:"20px 24px"}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div><div style={{fontSize:13,fontWeight:700,color:"white",marginBottom:2}}>Core9Tech Teknoloji A.Ş.</div><div style={{fontSize:11,color:"#475569"}}>ASBÜ Sosyokent Teknopark, Ankara · core9tech.com</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#475569"}}>Kaynak: Massenkoff & McCrory (2026) · Anthropic Economic Index</div><div style={{fontSize:11,color:"#334155",marginTop:2}}>Pilot Demo v5.0 · Mart 2026 · © 2026 Core9Tech</div></div>
        </div>
      </footer>
    </div>
  );
}
