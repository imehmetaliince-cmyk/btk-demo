import { useState, useMemo } from "react";
import { PROVINCES, PROFESSIONS } from "./data.js";

// ─── RENK & TEMA ─────────────────────────────────────────────────────────────
const C = {
  navBg: "#0f2342",
  navBorder: "#1a3a6b",
  accent: "#1d4ed8",
  accentLight: "#dbeafe",
  bg: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  borderMed: "#cbd5e1",
  text: "#0f172a",
  textSec: "#475569",
  textMuted: "#94a3b8",
  r1c: "#b91c1c", r1bg: "#fef2f2", r1br: "#fecaca",
  r2c: "#c2410c", r2bg: "#fff7ed", r2br: "#fed7aa",
  r3c: "#b45309", r3bg: "#fffbeb", r3br: "#fde68a",
  r4c: "#15803d", r4bg: "#f0fdf4", r4br: "#bbf7d0",
};

function getRisk(s) {
  if (s >= 65) return { label:"YÜKSEK",      c:C.r1c, bg:C.r1bg, br:C.r1br };
  if (s >= 45) return { label:"ORTA-YÜKSEK", c:C.r2c, bg:C.r2bg, br:C.r2br };
  if (s >= 25) return { label:"ORTA",         c:C.r3c, bg:C.r3bg, br:C.r3br };
  return               { label:"DÜŞÜK",       c:C.r4c, bg:C.r4bg, br:C.r4br };
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

// ─── HARİTA: koordinat dönüşümü ──────────────────────────────────────────────
const VW = 1020, VH = 480;
const LON0 = 25.5, LOND = 20.5;
const LAT0 = 42.5, LATD = 7.0;
const tx = lon => ((lon - LON0) / LOND) * VW;
const ty = lat => ((LAT0 - lat) / LATD) * VH;

// ─── MODAL: SKOR AÇIKLAMASI ──────────────────────────────────────────────────
function ScoreModal({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, background:"rgba(15,35,66,0.55)", zIndex:2000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.surface, borderRadius:12, border:`1px solid ${C.border}`,
        width:"100%", maxWidth:640, maxHeight:"88vh", overflowY:"auto",
        boxShadow:"0 24px 64px rgba(0,0,0,0.18)"
      }}>
        <div style={{ padding:"24px 28px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:700, color:C.text, marginBottom:4 }}>Maruziyet Skoru Nasıl Hesaplanır?</h2>
            <p style={{ fontSize:13, color:C.textMuted, margin:0 }}>Observed Exposure Metriği — Massenkoff & McCrory, Anthropic (Mart 2026)</p>
          </div>
          <button onClick={onClose} style={{
            background:"none", border:`1px solid ${C.border}`, borderRadius:6,
            width:32, height:32, cursor:"pointer", fontSize:18, color:C.textSec, lineHeight:1
          }}>×</button>
        </div>
        <div style={{ padding:"24px 28px" }}>
          <div style={{ background:C.accentLight, border:"1px solid #bfdbfe", borderRadius:8, padding:"14px 16px", marginBottom:24 }}>
            <p style={{ fontSize:13, color:"#1e40af", lineHeight:1.75, margin:0 }}>
              <strong>Temel soru:</strong> Bir meslekte görevler, büyük dil modelleri tarafından ne ölçüde <em>fiilen</em> gerçekleştiriliyor? Bu skor, teorik potansiyeli değil, gerçek dünya kullanımını ölçer.
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:18, marginBottom:24 }}>
            {[
              { n:"01", color:"#1d4ed8", title:"Teorik AI Kapasitesi",
                body:"Bir mesleğin görevlerinin yapay zeka tarafından teorik olarak ne kadarının gerçekleştirilebileceğini ölçer. O*NET iş tanımları LLM yetkinlik matrisi ile çapraz eşleştirilerek hesaplanır." },
              { n:"02", color:"#7c3aed", title:"Fiili Kullanım Oranı (Claude API Verisi)",
                body:"Anthropic'in Claude API'nin gerçek dünya kullanım örüntülerinden türetilir. Kullanıcıların hangi görevler için AI kullandığı izlenerek 'teorik yapabilir' ile 'pratikte kullanılıyor' arasındaki fark ortaya çıkar." },
              { n:"03", color:"#dc2626", title:"Gözlemlenen Maruziyet = Sonuç Skoru",
                body:"İki bileşenin bileşimidir: Teorik Kapasite × Fiili Kullanım Yoğunluğu. Örneğin bilgisayar programcıları için teorik kapasite %94 iken gözlemlenen maruziyet %74.5'tir — pratikte henüz tam kapasite kullanılmıyor." },
            ].map(s => (
              <div key={s.n} style={{ display:"flex", gap:14 }}>
                <div style={{
                  width:32, height:32, borderRadius:8, background:s.color, color:"white",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:11, fontWeight:700, flexShrink:0, fontFamily:"monospace"
                }}>{s.n}</div>
                <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"12px 14px", flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:C.text, marginBottom:6 }}>{s.title}</div>
                  <div style={{ fontSize:12, color:C.textSec, lineHeight:1.75 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:16, marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:1, marginBottom:12 }}>SKOR SKALASI</div>
            {[
              { range:"%65 ve üzeri", label:"Yüksek Risk", c:C.r1c, bg:C.r1bg, br:C.r1br, desc:"Görevlerin büyük çoğunluğu AI tarafından aktif olarak yapılıyor" },
              { range:"%45 – %64",   label:"Orta-Yüksek", c:C.r2c, bg:C.r2bg, br:C.r2br, desc:"Görevlerin önemli bölümü AI ile yapılıyor; dönüşüm hızlanıyor" },
              { range:"%25 – %44",   label:"Orta Risk",   c:C.r3c, bg:C.r3bg, br:C.r3br, desc:"Bazı görevler AI ile yapılıyor; insan yetkinliği kritik" },
              { range:"%25 altı",    label:"Düşük Risk",  c:C.r4c, bg:C.r4bg, br:C.r4br, desc:"Fiziksel veya sosyal beceriler AI'nın ikame edemeyeceği alanlar" },
            ].map(r => (
              <div key={r.range} style={{ background:r.bg, border:`1px solid ${r.br}`, borderRadius:6, padding:"8px 12px", marginBottom:6, display:"flex", gap:12, alignItems:"center" }}>
                <span style={{ fontSize:11, fontFamily:"monospace", fontWeight:700, color:r.c, minWidth:100 }}>{r.range}</span>
                <span style={{ fontSize:12, fontWeight:600, color:r.c }}>{r.label}: </span>
                <span style={{ fontSize:12, color:C.textSec }}>{r.desc}</span>
              </div>
            ))}
          </div>
          <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:1, marginBottom:8 }}>KAYNAK</div>
            <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.7, margin:0 }}>
              Massenkoff, M. & McCrory, E. (2026). <em>Labor Market Impacts of AI: A New Measure and Early Evidence.</em> Anthropic, March 5, 2026.<br/>
              Veri seti: huggingface.co/datasets/Anthropic/EconomicIndex
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL: HERO STAT DETAYLARI ──────────────────────────────────────────────
function HeroModal({ type, stats, onClose }) {
  if (!type) return null;

  const highRiskProfs  = PROFESSIONS.filter(p => p.score >= 65).sort((a,b) => b.score - a.score);
  const workforceProfs = PROFESSIONS.filter(p => p.score >= 50).sort((a,b) => b.score - a.score);

  // Sektör bazlı işgücü özeti
  const sectorMap = {};
  workforceProfs.forEach(p => {
    if (!sectorMap[p.sector]) sectorMap[p.sector] = { workers:0, count:0, maxScore:0 };
    sectorMap[p.sector].workers  += p.workers;
    sectorMap[p.sector].count    += 1;
    sectorMap[p.sector].maxScore  = Math.max(sectorMap[p.sector].maxScore, p.score);
  });
  const sectors = Object.entries(sectorMap)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a,b) => b.workers - a.workers)
    .slice(0, 8);

  const fmtW = w => w >= 1000000 ? (w/1000000).toFixed(1)+"M" : (w/1000).toFixed(0)+"K";

  const titles = {
    workforce: "Yüksek Risk İşgücü — Kimler Etkileniyor?",
    critical:  "Kritik Meslekler — %65 Üzeri Maruziyet",
    avg:       "Ortalama Skor Nasıl Hesaplandı?",
  };
  const subtitles = {
    workforce: `Türkiye'de ${fmtW(stats.atRisk)} çalışan AI dönüşümünün yoğun baskısı altında`,
    critical:  `${highRiskProfs.length} meslek grubunda görevlerin büyük çoğunluğu AI tarafından üstleniliyor`,
    avg:       `${PROFESSIONS.length} mesleğin gözlemlenen maruziyet skorlarının ağırlıksız ortalaması`,
  };

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, background:"rgba(15,35,66,0.6)", zIndex:2000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.surface, borderRadius:14, border:`1px solid ${C.border}`,
        width:"100%", maxWidth: type === "critical" ? 780 : 660,
        maxHeight:"90vh", overflowY:"auto",
        boxShadow:"0 28px 80px rgba(0,0,0,0.22)"
      }}>
        {/* Başlık */}
        <div style={{ padding:"22px 26px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start", background:"#0f2342", borderRadius:"14px 14px 0 0" }}>
          <div>
            <h2 style={{ fontSize:17, fontWeight:800, color:"white", marginBottom:4 }}>{titles[type]}</h2>
            <p style={{ fontSize:12, color:"#93c5fd", margin:0 }}>{subtitles[type]}</p>
          </div>
          <button onClick={onClose} style={{
            background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)",
            borderRadius:6, width:32, height:32, cursor:"pointer", fontSize:18, color:"white", lineHeight:1
          }}>×</button>
        </div>

        <div style={{ padding:"24px 26px" }}>

          {/* ── WORKFORCE ── */}
          {type === "workforce" && (
            <>
              {/* Özet kartları */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10, marginBottom:22 }}>
                {[
                  { val: fmtW(stats.atRisk), label:"Toplam Riskli İşgücü", desc:"Maruziyet skoru %50+", c:"#b91c1c", bg:"#fef2f2", br:"#fecaca" },
                  { val: fmtW(PROFESSIONS.filter(p=>p.score>=65).reduce((s,p)=>s+p.workers,0)), label:"Kritik Risk İşgücü", desc:"Maruziyet skoru %65+", c:"#c2410c", bg:"#fff7ed", br:"#fed7aa" },
                  { val: PROFESSIONS.filter(p=>p.score>=50).length+"", label:"Etkilenen Meslek", desc:`${PROFESSIONS.length} mesleğin ${Math.round(PROFESSIONS.filter(p=>p.score>=50).length/PROFESSIONS.length*100)}%'i`, c:"#b45309", bg:"#fffbeb", br:"#fde68a" },
                ].map(s => (
                  <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.br}`, borderRadius:10, padding:"14px 16px" }}>
                    <div style={{ fontSize:24, fontWeight:900, color:s.c, fontFamily:"monospace", lineHeight:1 }}>{s.val}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:s.c, marginTop:5 }}>{s.label}</div>
                    <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{s.desc}</div>
                  </div>
                ))}
              </div>

              {/* Sektör dağılımı */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:1, marginBottom:10 }}>SEKTÖR BAZINDA ETKİLENEN İŞGÜCÜ (İLK 8)</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {sectors.map(s => {
                    const col = s.maxScore >= 65 ? { c:C.r1c, bg:C.r1bg, br:C.r1br } : { c:C.r2c, bg:C.r2bg, br:C.r2br };
                    const pct = Math.round(s.workers / stats.atRisk * 100);
                    return (
                      <div key={s.name} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                          <div>
                            <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{s.name}</span>
                            <span style={{ fontSize:10, color:C.textMuted, marginLeft:8 }}>{s.count} meslek</span>
                          </div>
                          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                            <span style={{ fontSize:10, fontWeight:700, color:col.c, background:col.bg, border:`1px solid ${col.br}`, borderRadius:3, padding:"2px 6px" }}>max %{s.maxScore}</span>
                            <span style={{ fontSize:13, fontWeight:800, color:C.text, fontFamily:"monospace" }}>{fmtW(s.workers)}</span>
                          </div>
                        </div>
                        <div style={{ height:5, background:C.border, borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:col.c, borderRadius:3 }}/>
                        </div>
                        <div style={{ fontSize:10, color:C.textMuted, marginTop:3 }}>Toplam riskli işgücünün %{pct}'i</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* En yüksek riskli 5 meslek */}
              <div style={{ background:C.r1bg, border:`1px solid ${C.r1br}`, borderRadius:10, padding:"14px 16px" }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.r1c, letterSpacing:1, marginBottom:10 }}>EN YÜKSEK MARUZIYET — İLK 5 MESLEK</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {workforceProfs.slice(0,5).map(p => (
                    <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(255,255,255,0.6)", borderRadius:6, padding:"8px 12px" }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{p.title}</div>
                        <div style={{ fontSize:10, color:C.textMuted }}>{p.sector} · {fmtW(p.workers)} çalışan</div>
                      </div>
                      <div style={{ fontSize:16, fontWeight:900, color:C.r1c, fontFamily:"monospace" }}>%{p.score}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── CRITICAL ── */}
          {type === "critical" && (
            <>
              <div style={{ background:C.r1bg, border:`1px solid ${C.r1br}`, borderRadius:10, padding:"12px 16px", marginBottom:18 }}>
                <p style={{ fontSize:13, color:C.r1c, lineHeight:1.7, margin:0 }}>
                  <strong>%65 eşiği:</strong> Bu grupta görevlerin büyük çoğunluğu Claude API verilerine göre AI tarafından aktif olarak üstleniliyor. Rutin bilişsel görevler büyük ölçüde otomasyona geçmiş durumda.
                </p>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:7 }}>
                {highRiskProfs.map(p => (
                  <div key={p.id} style={{
                    background:C.surface, border:`1px solid ${C.r1br}`,
                    borderLeft:`3px solid ${C.r1c}`, borderRadius:8,
                    padding:"10px 13px", display:"flex", justifyContent:"space-between", alignItems:"center"
                  }}>
                    <div style={{ flex:1, minWidth:0, marginRight:10 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title}</div>
                      <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{p.sector}</div>
                      {/* Skor çubuğu */}
                      <div style={{ height:3, background:C.bg, borderRadius:2, marginTop:5, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${p.score}%`, background:C.r1c, borderRadius:2 }}/>
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:16, fontWeight:900, color:C.r1c, fontFamily:"monospace" }}>%{p.score}</div>
                      <div style={{ fontSize:9, color:C.textMuted }}>Teo: %{p.theoretical}</div>
                    </div>
                  </div>
                ))}
              </div>

              {highRiskProfs.length === 0 && (
                <div style={{ textAlign:"center", color:C.textMuted, padding:40 }}>Kritik meslek bulunamadı.</div>
              )}

              <div style={{ marginTop:16, background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"12px 14px" }}>
                <p style={{ fontSize:12, color:C.textSec, lineHeight:1.7, margin:0 }}>
                  <strong>Not:</strong> Bu mesleklerde yetkinlik dönüşümü artık isteğe bağlı değil, zorunluluktur. BTK Akademi eğitimleri bu gruba en acil şekilde ulaşmalıdır.
                </p>
              </div>
            </>
          )}

          {/* ── AVG ── */}
          {type === "avg" && (
            <>
              {/* Formül */}
              <div style={{ background:"#0f2342", borderRadius:10, padding:"18px 20px", marginBottom:22, textAlign:"center" }}>
                <div style={{ fontSize:11, color:"#93c5fd", letterSpacing:1, marginBottom:8 }}>HESAPLAMA FORMÜLÜ</div>
                <div style={{ fontSize:20, fontWeight:900, color:"white", fontFamily:"monospace", letterSpacing:2 }}>
                  Σ(skorlar) ÷ {PROFESSIONS.length}
                </div>
                <div style={{ fontSize:13, color:"#94a3b8", marginTop:8 }}>
                  = {PROFESSIONS.reduce((s,p)=>s+p.score,0).toFixed(1)} ÷ {PROFESSIONS.length} = <span style={{ color:"#fbbf24", fontWeight:800 }}>%{stats.avg}</span>
                </div>
              </div>

              {/* Dağılım */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:1, marginBottom:12 }}>SKOR DAĞILIMI</div>
                {[
                  { label:"Yüksek (%65+)",      count: PROFESSIONS.filter(p=>p.score>=65).length,   c:C.r1c, bg:C.r1bg, br:C.r1br },
                  { label:"Orta-Yüksek (%45–64)",count: PROFESSIONS.filter(p=>p.score>=45&&p.score<65).length, c:C.r2c, bg:C.r2bg, br:C.r2br },
                  { label:"Orta (%25–44)",        count: PROFESSIONS.filter(p=>p.score>=25&&p.score<45).length, c:C.r3c, bg:C.r3bg, br:C.r3br },
                  { label:"Düşük (%25 altı)",     count: PROFESSIONS.filter(p=>p.score<25).length,   c:C.r4c, bg:C.r4bg, br:C.r4br },
                ].map(row => {
                  const pct = Math.round(row.count / PROFESSIONS.length * 100);
                  return (
                    <div key={row.label} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                        <span style={{ color:row.c, fontWeight:600 }}>{row.label}</span>
                        <span style={{ fontFamily:"monospace", color:C.text, fontWeight:700 }}>{row.count} meslek &nbsp;(%{pct})</span>
                      </div>
                      <div style={{ height:8, background:C.bg, border:`1px solid ${C.border}`, borderRadius:4, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:row.c, borderRadius:4 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* İstatistikler */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10, marginBottom:18 }}>
                {[
                  { label:"En Yüksek", val:"%"+Math.max(...PROFESSIONS.map(p=>p.score)), name: PROFESSIONS.reduce((a,b)=>a.score>b.score?a:b).title },
                  { label:"Medyan",    val:"%"+[...PROFESSIONS].sort((a,b)=>a.score-b.score)[Math.floor(PROFESSIONS.length/2)].score, name:"Orta değer meslek" },
                  { label:"En Düşük", val:"%"+Math.min(...PROFESSIONS.map(p=>p.score)), name: PROFESSIONS.reduce((a,b)=>a.score<b.score?a:b).title },
                ].map(s => (
                  <div key={s.label} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"12px 14px" }}>
                    <div style={{ fontSize:18, fontWeight:900, color:C.text, fontFamily:"monospace" }}>{s.val}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:C.textSec, marginTop:4 }}>{s.label}</div>
                    <div style={{ fontSize:10, color:C.textMuted, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</div>
                  </div>
                ))}
              </div>

              <div style={{ background:C.accentLight, border:"1px solid #bfdbfe", borderRadius:8, padding:"12px 14px" }}>
                <p style={{ fontSize:12, color:"#1e40af", lineHeight:1.7, margin:0 }}>
                  <strong>Yorum:</strong> %{stats.avg} ortalama, Türkiye işgücünün genel olarak <strong>orta düzey</strong> AI maruziyeti altında olduğunu gösteriyor. Ancak bu ortalama; %2 ile %74.5 arasındaki geniş dağılımı gizliyor — politika üretiminde sektör bazlı hedefleme kritik önem taşıyor.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TÜRKİYE HARİTASI ────────────────────────────────────────────────────────
function TurkeyMap({ onModalOpen }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div>
      <div style={{ display:"flex", gap:16, flexWrap:"wrap", alignItems:"center", marginBottom:14 }}>
        <span style={{ fontSize:12, color:C.textMuted, fontWeight:600 }}>Maruziyet Seviyesi:</span>
        {[
          { f:"#fca5a5", s:"#ef4444", l:"%60+ Yüksek" },
          { f:"#fdba74", s:"#f97316", l:"%40–60 Orta-Yüksek" },
          { f:"#fde68a", s:"#d97706", l:"%25–40 Orta" },
          { f:"#86efac", s:"#16a34a", l:"< %25 Düşük" },
        ].map(item => (
          <div key={item.l} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <svg width="16" height="12"><rect x="0" y="0" width="16" height="12" rx="2" fill={item.f} stroke={item.s} strokeWidth="1.5"/></svg>
            <span style={{ fontSize:11, color:C.textSec }}>{item.l}</span>
          </div>
        ))}
      </div>

      <div style={{ position:"relative", background:"#e0ecfb", borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width:"100%", display:"block" }}>
          <rect width={VW} height={VH} fill="#dbeafe"/>
          <defs>
            <pattern id="mapgrid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#bfdbfe" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width={VW} height={VH} fill="url(#mapgrid)"/>
          {PROVINCES.map(p => {
            const col = getMapColor(p.score);
            const x1 = tx(p.bounds[0]);
            const y1 = ty(p.bounds[3]);
            const w  = tx(p.bounds[2]) - x1;
            const h  = ty(p.bounds[1]) - y1;
            const isH = hovered?.code === p.code;
            return (
              <g key={p.code}
                onMouseEnter={() => setHovered(p)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor:"pointer" }}
              >
                <rect x={x1} y={y1} width={w} height={h} rx={2}
                  fill={isH ? col.stroke : col.fill}
                  stroke={col.stroke} strokeWidth={isH ? 2 : 0.8}
                  opacity={isH ? 0.95 : 0.82}
                  style={{ transition:"all 0.15s" }}
                />
                {w > 28 && h > 16 && (
                  <text x={x1 + w/2} y={y1 + h/2 + 3.5} textAnchor="middle"
                    fill={isH ? "white" : col.stroke}
                    fontSize={Math.min(9, w/4)} fontWeight="700" fontFamily="monospace"
                    style={{ pointerEvents:"none", userSelect:"none" }}
                  >{p.score}%</text>
                )}
              </g>
            );
          })}
        </svg>
        {hovered && (
          <div style={{
            position:"absolute", top:12, right:12,
            background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:10, padding:"14px 18px", minWidth:220,
            boxShadow:"0 4px 20px rgba(0,0,0,0.12)"
          }}>
            <div style={{ fontWeight:800, fontSize:16, color:C.text, marginBottom:2 }}>{hovered.name}</div>
            <div style={{ fontSize:11, color:C.textMuted, marginBottom:12, fontFamily:"monospace" }}>İl Kodu: {hovered.code} · {hovered.sector}</div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontSize:12, color:C.textSec }}>AI Maruziyet Skoru</span>
              <span style={{ fontSize:12, fontFamily:"monospace", fontWeight:700, color:getMapColor(hovered.score).stroke }}>{hovered.score}%</span>
            </div>
            <div style={{ height:6, background:C.bg, borderRadius:3, overflow:"hidden", border:`1px solid ${C.border}`, marginBottom:10 }}>
              <div style={{ height:"100%", width:`${hovered.score}%`, background:getMapColor(hovered.score).stroke, borderRadius:3 }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:11, color:C.textMuted }}>Baskın sektör</span>
              <span style={{ fontSize:11, fontWeight:600, color:C.textSec }}>{hovered.sector}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, letterSpacing:1, marginBottom:10 }}>EN YÜKSEK SKORA SAHİP 10 İL</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:7 }}>
          {[...PROVINCES].sort((a,b)=>b.score-a.score).slice(0,10).map(p => {
            const col = getMapColor(p.score);
            return (
              <div key={p.code} style={{
                background:C.surface, border:`1px solid ${col.stroke}44`,
                borderLeft:`3px solid ${col.stroke}`, borderRadius:7,
                padding:"9px 12px", display:"flex", alignItems:"center", gap:10
              }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{p.name}</div>
                  <div style={{ fontSize:10, color:C.textMuted }}>{p.sector}</div>
                </div>
                <div style={{ fontSize:15, fontWeight:800, color:col.stroke, fontFamily:"monospace" }}>{p.score}%</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop:16, background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"14px 18px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#1d4ed8", letterSpacing:1, marginBottom:8 }}>POLİTİKA NOTU</div>
        <p style={{ fontSize:13, color:"#1e40af", lineHeight:1.75, margin:0 }}>
          Batı illerinde finans ve bilgi-iletişim sektörlerinin yoğunluğu nedeniyle AI maruziyeti yüksek. Doğu illerinde tarım ağırlıklı yapı doğal bir koruma sağlıyor; ancak bu illerde dijital beceri açığı farklı bir politika sorunu yaratıyor. BTK Akademi'nin coğrafi hedefleme kapasitesi her iki ihtiyacı da karşılayabilecek konumda.
        </p>
      </div>
    </div>
  );
}

// ─── DETAY PANELİ ────────────────────────────────────────────────────────────
function DetailPanel({ prof, onModalOpen }) {
  if (!prof) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:420, textAlign:"center", padding:40 }}>
      <div style={{ width:52, height:52, borderRadius:10, background:C.bg, border:`2px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14, fontSize:20, color:C.textMuted }}>↖</div>
      <div style={{ fontSize:15, fontWeight:600, color:C.textSec, marginBottom:6 }}>Listeden Meslek Seçin</div>
      <div style={{ fontSize:13, color:C.textMuted, lineHeight:1.6 }}>Arama yapın veya listeden<br/>bir meslek seçerek detayları görüntüleyin.</div>
    </div>
  );

  const risk = getRisk(prof.score);
  const R = 44;
  const CIRC = 2 * Math.PI * R;
  const gap = prof.gap !== undefined ? prof.gap : +(prof.theoretical - prof.score).toFixed(1);

  return (
    <div>
      <div style={{ padding:"18px 22px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:12, alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:17, color:C.text, marginBottom:4, lineHeight:1.3 }}>{prof.title}</div>
          <div style={{ fontSize:11, color:C.textMuted, fontFamily:"monospace" }}>
            ISCO-08: {prof.isco}
            {prof.nace && <> &nbsp;·&nbsp; NACE: {prof.nace}</>}
            &nbsp;·&nbsp; {prof.sector}
          </div>
          {prof.naceName && (
            <div style={{ fontSize:10, color:"#cbd5e1", marginTop:2 }}>{prof.naceName}</div>
          )}
          <div style={{ fontSize:10, color:"#f59e0b", marginTop:3, fontWeight:600 }}>
            Benimseme Açığı: %{gap} — teorik kapasite henüz tam gerçekleşmemiş
          </div>
        </div>
        <span style={{ fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:4, background:risk.bg, color:risk.c, border:`1px solid ${risk.br}`, whiteSpace:"nowrap", marginTop:2 }}>{risk.label}</span>
      </div>

      <div style={{ padding:"18px 22px" }}>
        <div style={{ display:"flex", gap:18, alignItems:"center", marginBottom:16 }}>
          <div style={{ flexShrink:0 }}>
            <svg width="110" height="110" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r={R} fill="none" stroke={C.bg} strokeWidth="10"
                strokeDasharray={`${CIRC*0.75} ${CIRC*0.25}`} strokeLinecap="round" transform="rotate(135 55 55)"/>
              <circle cx="55" cy="55" r={R} fill="none" stroke={risk.c} strokeWidth="10"
                strokeDasharray={`${CIRC*0.75*(prof.score/100)} ${CIRC}`} strokeLinecap="round" transform="rotate(135 55 55)"
                style={{ filter:`drop-shadow(0 0 4px ${risk.c}55)` }}/>
              <text x="55" y="51" textAnchor="middle" fill={C.text} fontSize="18" fontWeight="800" fontFamily="monospace">{prof.score}%</text>
              <text x="55" y="65" textAnchor="middle" fill={C.textMuted} fontSize="7.5" fontFamily="sans-serif">MARUZIYET</text>
            </svg>
            <div style={{ textAlign:"center", marginTop:-2 }}>
              <button onClick={onModalOpen} style={{ fontSize:11, color:C.accent, background:"none", border:"none", cursor:"pointer", textDecoration:"underline", padding:0 }}>
                Bu skor nedir?
              </button>
            </div>
          </div>
          <div style={{ flex:1 }}>
            {[
              { label:"Teorik Kapasite",  val:prof.theoretical, color:C.textSec },
              { label:"Gerçek Kullanım",  val:prof.score,       color:risk.c },
              { label:"Benimseme Açığı",  val:gap,              color:"#f59e0b" },
            ].map(b => (
              <div key={b.label} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                  <span style={{ color:C.textSec }}>{b.label}</span>
                  <span style={{ color:b.color, fontFamily:"monospace", fontWeight:700 }}>{b.val}%</span>
                </div>
                <div style={{ height:6, background:C.bg, borderRadius:3, overflow:"hidden", border:`1px solid ${C.border}` }}>
                  <div style={{ height:"100%", width:`${Math.min(b.val,100)}%`, background:b.color, borderRadius:3 }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {[
            { label:"Türkiye İşgücü", val: prof.workers>=1000000 ? (prof.workers/1000000).toFixed(1)+"M" : (prof.workers/1000).toFixed(0)+"K" },
            { label:"Büyüme (BLS 2034)", val: (prof.trend>0?"+":"")+prof.trend+"%" },
          ].map(s => (
            <div key={s.label} style={{ flex:1, background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px" }}>
              <div style={{ fontSize:18, fontWeight:800, color:C.text, fontFamily:"monospace" }}>{s.val}</div>
              <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, letterSpacing:1, marginBottom:6 }}>SEKTÖR ETKİSİ</div>
          <p style={{ fontSize:12, color:C.textSec, lineHeight:1.75, margin:0 }}>{prof.impact}</p>
        </div>

        <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, letterSpacing:1, marginBottom:8 }}>BTK AKADEMİ — ÖNERİLEN KURSLAR</div>
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {prof.courses.map((c, i) => {
            const pr = getPriority(i, prof.score);
            return (
              <div key={i} style={{ background:pr.bg, border:`1px solid ${pr.br}`, borderRadius:7, padding:"9px 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, fontWeight:500, color:C.text }}>{c}</span>
                <span style={{ fontSize:10, fontWeight:700, color:pr.c, border:`1px solid ${pr.br}`, borderRadius:3, padding:"2px 7px", marginLeft:8, whiteSpace:"nowrap" }}>{pr.label}</span>
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
      <h2 style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:6 }}>Analiz Metodolojisi</h2>
      <p style={{ fontSize:14, color:C.textSec, lineHeight:1.75, marginBottom:28 }}>
        Platformdaki maruziyet skorları Anthropic'in Mart 2026 tarihli işgücü araştırmasından türetilmiş ve Türkiye ISCO-08 + NACE Rev.2 kodlarıyla eşleştirilmiştir.{" "}
        <button onClick={onModalOpen} style={{ fontSize:13, color:C.accent, background:"none", border:"none", cursor:"pointer", textDecoration:"underline", padding:0 }}>
          Skor hesaplama yöntemi için tıklayın
        </button>
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:28 }}>
        {[
          { n:"01", color:"#1d4ed8", title:"Anthropic Economic Index",
            body:"Massenkoff & McCrory (2026) tarafından geliştirilen 'Observed Exposure' metriği, Claude API'nin gerçek dünya kullanım verilerinden türetiliyor. 800'den fazla meslek için teorik AI kapasitesi ve fiilen gözlemlenen otomasyon oranı tek çatı altında ölçüldü." },
          { n:"02", color:"#7c3aed", title:"NACE Rev.2 + ISCO-08 Çift Standart Eşleştirmesi",
            body:"O*NET meslek kodları Türkiye'nin NACE Rev.2 (işyeri faaliyet) ve ISCO-08 (bireysel meslek) standartlarıyla çapraz eşleştirildi. Her meslek hem ISCO hem NACE kodu taşır — SGK, İŞKUR ve KOSGEB veri tabanlarıyla doğrudan sorgulanabilir. Core9Tech ekibi tarafından manuel doğrulandı." },
          { n:"03", color:"#0891b2", title:"Türkiye İşgücü Ağırlıklandırması",
            body:"Her meslek grubunun çalışan sayısı TÜİK Hanehalkı İşgücü Araştırması (2024) ile ağırlıklandırıldı. İl bazlı risk skoru baskın sektör ağırlıklı ortalama yöntemiyle hesaplandı." },
          { n:"04", color:"#059669", title:"BTK Akademi Kurs Eşleştirmesi",
            body:"Maruziyet profilinden yola çıkarak BTK Akademi kurs kataloğundaki içerikler öncelik skoru hesaplanarak eşleştirildi. Öncelik: benimseme açığı × işgücü büyüklüğü × büyüme trendi." },
        ].map(s => (
          <div key={s.n} style={{ display:"flex", gap:14 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:s.color, color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, fontFamily:"monospace", flexShrink:0 }}>{s.n}</div>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px", flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14, color:C.text, marginBottom:6 }}>{s.title}</div>
              <div style={{ fontSize:13, color:C.textSec, lineHeight:1.75 }}>{s.body}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:18 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:1, marginBottom:12 }}>KAYNAKÇA</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[
            "Massenkoff, M. & McCrory, E. (2026). Labor Market Impacts of AI: A New Measure and Early Evidence. Anthropic.",
            "Anthropic Economic Index. huggingface.co/datasets/Anthropic/EconomicIndex",
            "TÜİK Hanehalkı İşgücü Araştırması (2024). Türkiye İstatistik Kurumu.",
            "ISCO-08 Uluslararası Meslek Standart Sınıflaması. ILO / TÜİK Uyarlaması.",
            "NACE Rev.2 Ekonomik Faaliyet Sınıflaması. EUROSTAT / TÜİK.",
            "BLS Employment Projections 2024–2034. U.S. Bureau of Labor Statistics.",
          ].map((r,i) => (
            <div key={i} style={{ fontSize:12, color:C.textSec, lineHeight:1.6, paddingLeft:12, borderLeft:`2px solid ${C.border}` }}>{r}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ANA UYGULAMA ─────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState("analysis");
  const [search, setSearch]     = useState("");
  const [selected, setSel]      = useState(null);
  const [sortBy, setSort]       = useState("score");
  const [modal, setModal]       = useState(false);
  const [heroModal, setHeroModal] = useState(null); // 'workforce' | 'critical' | 'avg'
  const [sectorFilter, setSectorFilter] = useState("Tümü");

  const sectors = useMemo(() => {
    const s = new Set(PROFESSIONS.map(p=>p.sector));
    return ["Tümü", ...Array.from(s).sort()];
  }, []);

  const filtered = useMemo(() => {
    let list = PROFESSIONS;
    if (sectorFilter !== "Tümü") list = list.filter(p => p.sector === sectorFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.sector.toLowerCase().includes(q) ||
        p.isco.includes(q) ||
        (p.nace && p.nace.includes(q))
      );
    }
    return [...list].sort((a,b) =>
      sortBy === "score" ? b.score - a.score :
      sortBy === "gap"   ? (b.gap ?? b.theoretical - b.score) - (a.gap ?? a.theoretical - a.score) :
      a.title.localeCompare(b.title, "tr")
    );
  }, [search, sortBy, sectorFilter]);

  const stats = useMemo(() => ({
    atRisk:   PROFESSIONS.filter(p=>p.score>=50).reduce((s,p)=>s+p.workers,0),
    highRisk: PROFESSIONS.filter(p=>p.score>=65).length,
    avg:      Math.round(PROFESSIONS.reduce((s,p)=>s+p.score,0)/PROFESSIONS.length),
  }), []);

  const fmtW = w => w >= 1000000 ? (w/1000000).toFixed(1)+"M" : (w/1000).toFixed(0)+"K";

  const NAV_TABS = [
    { id:"analysis", label:"Meslek Analizi" },
    { id:"map",      label:"İl Risk Haritası" },
    { id:"method",   label:"Metodoloji" },
  ];

  const heroStats = [
    {
      val: String(PROFESSIONS.length),
      label: "Analiz Edilen Meslek",
      sub:  "NACE Rev.2 + ISCO-08 kodlu",
      accent:"white",
      clickable: false,
    },
    {
      val: "81",
      label: "İl Bazında Veri",
      sub:  "Tüm Türkiye illeri kapsanıyor",
      accent:"white",
      clickable: false,
    },
    {
      val: fmtW(stats.atRisk),
      label: "Yüksek Risk İşgücü",
      sub:  "Türkiye aktif nüfusunda",
      accent:"#fca5a5",
      clickable: true,
      onClick: () => setHeroModal("workforce"),
      hint: "tıkla → detaylar",
    },
    {
      val: String(stats.highRisk),
      label: "Kritik Meslek",
      sub:  "%65 üzeri maruziyet skoru",
      accent:"#fdba74",
      clickable: true,
      onClick: () => setHeroModal("critical"),
      hint: "tıkla → meslek isimleri",
    },
    {
      val: `${stats.avg}%`,
      label: "Ortalama Skor",
      sub:  `${PROFESSIONS.length} meslek ortalaması`,
      accent:"white",
      clickable: true,
      onClick: () => setHeroModal("avg"),
      hint: "tıkla → hesaplama",
    },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        input,button{font-family:inherit}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:${C.bg}}
        ::-webkit-scrollbar-thumb{background:${C.borderMed};border-radius:3px}
        .hero-stat-btn:hover{background:rgba(255,255,255,0.12)!important;transform:translateY(-1px);transition:all .15s}
        .hero-stat-btn{transition:all .15s}
      `}</style>

      {modal      && <ScoreModal onClose={()=>setModal(false)}/>}
      {heroModal  && <HeroModal type={heroModal} stats={stats} onClose={()=>setHeroModal(null)}/>}

      {/* ── NAV ── */}
      <nav style={{ background:C.navBg, position:"sticky", top:0, zIndex:100, borderBottom:`1px solid ${C.navBorder}` }}>
        <div style={{ maxWidth:1240, margin:"0 auto", padding:"0 24px", display:"flex", alignItems:"stretch", height:58 }}>
          <div style={{ display:"flex", flexDirection:"column", justifyContent:"center", marginRight:"auto", paddingRight:24, borderRight:`1px solid ${C.navBorder}` }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
              <span style={{ fontSize:17, fontWeight:900, color:"white", letterSpacing:-0.5 }}>TAME</span>
              <span style={{ fontSize:11, color:"#64748b", fontWeight:400 }}>Türkiye AI Maruziyet Endeksi</span>
            </div>
            <div style={{ fontSize:10, color:"#334155", letterSpacing:0.5 }}>Core9Tech × BTK Akademi · Pilot, Mart 2026</div>
          </div>
          {NAV_TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              background:"none", border:"none",
              borderBottom:`2px solid ${tab===t.id?"#60a5fa":"transparent"}`,
              color: tab===t.id ? "white" : "#64748b",
              fontSize:13, fontWeight: tab===t.id ? 600 : 400,
              padding:"0 18px", cursor:"pointer", transition:"all 0.15s", marginTop:2
            }}>{t.label}</button>
          ))}
          <div style={{ display:"flex", flexDirection:"column", justifyContent:"center", paddingLeft:20, borderLeft:`1px solid ${C.navBorder}`, marginLeft:8 }}>
            <div style={{ fontSize:10, color:"#334155" }}>Kaynak</div>
            <div style={{ fontSize:10, color:"#94a3b8", fontWeight:600 }}>Anthropic Economic Index</div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ background:C.navBg, padding:"36px 24px 40px", borderBottom:"3px solid #1d4ed8" }}>
        <div style={{ maxWidth:1240, margin:"0 auto" }}>
          <div style={{ marginBottom:10 }}>
            <span style={{ background:"#1e3a5f", color:"#93c5fd", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:4, letterSpacing:1.5, border:"1px solid #1d4ed8" }}>PİLOT ÇALIŞMA</span>
          </div>
          <h1 style={{ fontSize:"clamp(22px,3.5vw,36px)", fontWeight:900, color:"white", lineHeight:1.2, marginBottom:10, letterSpacing:-0.5 }}>
            Türkiye'de Hangi Meslekler<br/>Yapay Zekadan Etkileniyor?
          </h1>
          <p style={{ color:"#94a3b8", fontSize:14, lineHeight:1.75, maxWidth:560, marginBottom:28 }}>
            Anthropic'in Mart 2026 işgücü raporu {PROFESSIONS.length} meslek ve 81 il düzeyinde Türkiye verisiyle eşleştirildi. Kanıta dayalı maruziyet skorları ve BTK Akademi kurs önerileriyle işgücü dönüşümünü inceleyin.
          </p>

          {/* Hero stat kartları */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {heroStats.map(s => (
              <div
                key={s.label}
                className={s.clickable ? "hero-stat-btn" : ""}
                onClick={s.clickable ? s.onClick : undefined}
                style={{
                  background:"rgba(255,255,255,0.06)",
                  border: s.clickable ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.1)",
                  borderRadius:10, padding:"14px 20px", minWidth:148,
                  cursor: s.clickable ? "pointer" : "default",
                  position:"relative",
                }}
              >
                {s.clickable && (
                  <div style={{ position:"absolute", top:6, right:8, fontSize:9, color:"rgba(255,255,255,0.35)", fontWeight:600 }}>
                    ↗
                  </div>
                )}
                <div style={{ fontSize:26, fontWeight:900, color:s.accent, fontFamily:"monospace", lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:12, color:"#e2e8f0", marginTop:5, fontWeight:600 }}>{s.label}</div>
                <div style={{ fontSize:10, color: s.clickable ? "rgba(255,255,255,0.4)" : "#475569", marginTop:2 }}>
                  {s.clickable ? s.hint : s.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── İÇERİK ── */}
      <div style={{ maxWidth:1240, margin:"0 auto", padding:"28px 24px 64px" }}>

        {/* MESLEK ANALİZİ */}
        {tab === "analysis" && (
          <div style={{ display:"grid", gridTemplateColumns:"minmax(280px,400px) 1fr", gap:20, alignItems:"start" }}>
            {/* Sol: Filtre + Liste */}
            <div>
              <div style={{ marginBottom:8 }}>
                <input
                  type="text" placeholder="Meslek adı, sektör, ISCO veya NACE kodu..."
                  value={search} onChange={e=>setSearch(e.target.value)}
                  style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, color:C.text }}
                />
              </div>
              <div style={{ display:"flex", gap:6, marginBottom:8, alignItems:"center", flexWrap:"wrap" }}>
                <select
                  value={sectorFilter} onChange={e=>setSectorFilter(e.target.value)}
                  style={{ flex:1, fontSize:12, padding:"5px 8px", border:`1px solid ${C.border}`, borderRadius:6, background:C.surface, color:C.text, cursor:"pointer" }}
                >
                  {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ display:"flex", gap:4 }}>
                  {[
                    { v:"score", l:"Skora Göre"       },
                    { v:"gap",   l:"Benimseme Açığı"  },
                    { v:"name",  l:"A–Z"               },
                  ].map(b => (
                    <button key={b.v} onClick={()=>setSort(b.v)} style={{
                      fontSize:11, padding:"4px 8px", borderRadius:5,
                      border:`1px solid ${sortBy===b.v ? C.accent : C.border}`,
                      background: sortBy===b.v ? C.accentLight : C.surface,
                      color: sortBy===b.v ? C.accent : C.textSec,
                      cursor:"pointer",
                      fontWeight: sortBy===b.v ? 700 : 400,
                    }}>{b.l}</button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize:11, color:C.textMuted, marginBottom:8 }}>
                {filtered.length} meslek listeleniyor
                {sortBy === "gap" && <span style={{ color:"#f59e0b", marginLeft:6 }}>· benimseme açığına göre sıralı</span>}
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:5, maxHeight:"65vh", overflowY:"auto", paddingRight:2 }}>
                {filtered.map(p => {
                  const risk = getRisk(p.score);
                  const isSel = selected?.id === p.id;
                  const gap = p.gap !== undefined ? p.gap : +(p.theoretical - p.score).toFixed(1);
                  return (
                    <div key={p.id} onClick={()=>setSel(p)} style={{
                      background: isSel ? risk.bg : C.surface,
                      border:`1px solid ${isSel ? risk.c+"66" : C.border}`,
                      borderLeft:`3px solid ${isSel ? risk.c : C.border}`,
                      borderRadius:8, padding:"9px 12px", cursor:"pointer", transition:"all 0.13s",
                      display:"flex", alignItems:"center", gap:10
                    }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:C.text, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title}</div>
                        <div style={{ display:"flex", gap:5, alignItems:"center", flexWrap:"wrap" }}>
                          <span style={{ fontSize:10, fontWeight:700, color:risk.c, border:`1px solid ${risk.br}`, background:risk.bg, borderRadius:3, padding:"1px 5px" }}>{risk.label}</span>
                          {p.nace && <span style={{ fontSize:9, color:C.textMuted, background:"#f1f5f9", border:`1px solid ${C.border}`, borderRadius:3, padding:"1px 5px", fontFamily:"monospace" }}>NACE {p.nace}</span>}
                          <span style={{ fontSize:10, color:C.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.sector}</span>
                        </div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontSize:16, fontWeight:900, color:risk.c, fontFamily:"monospace" }}>{p.score}%</div>
                        {sortBy === "gap" && (
                          <div style={{ fontSize:9, color:"#f59e0b", fontFamily:"monospace", fontWeight:700 }}>Δ{gap}%</div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div style={{ textAlign:"center", color:C.textMuted, padding:40, fontSize:13 }}>Sonuç bulunamadı.</div>
                )}
              </div>
            </div>

            {/* Sağ: Detay */}
            <div style={{
              background: C.surface,
              border:`1px solid ${selected ? getRisk(selected.score).br : C.border}`,
              borderRadius:12, boxShadow:"0 2px 12px rgba(0,0,0,0.05)",
              position:"sticky", top:72, maxHeight:"84vh", overflowY:"auto"
            }}>
              <DetailPanel prof={selected} onModalOpen={()=>setModal(true)}/>
            </div>
          </div>
        )}

        {/* HARİTA */}
        {tab === "map" && (
          <div>
            <div style={{ marginBottom:20 }}>
              <h2 style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:6 }}>İl Bazında AI Maruziyet Dağılımı</h2>
              <p style={{ fontSize:14, color:C.textSec, lineHeight:1.7 }}>Her ilin baskın sektörü temel alınarak AI maruziyet skoru atandı. İlerin üzerine gelerek detayları görüntüleyin.</p>
            </div>
            <TurkeyMap onModalOpen={()=>setModal(true)}/>
          </div>
        )}

        {/* METODOLOJİ */}
        {tab === "method" && <MethodSection onModalOpen={()=>setModal(true)}/>}
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ background:C.navBg, borderTop:"1px solid #1a3a6b", padding:"24px 24px" }}>
        <div style={{ maxWidth:1240, margin:"0 auto", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"white", marginBottom:3 }}>Core9Tech Teknoloji A.Ş.</div>
            <div style={{ fontSize:12, color:"#475569" }}>ASBÜ Sosyokent Teknopark, Ankara &nbsp;·&nbsp; core9tech.com</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:12, color:"#475569" }}>Kaynak: Massenkoff & McCrory (2026) · Anthropic Economic Index</div>
            <div style={{ fontSize:12, color:"#334155", marginTop:3 }}>Pilot Demo v3.0 · Mart 2026 · &copy; 2026 Core9Tech</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
