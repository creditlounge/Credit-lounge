import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://wtlasakivblbqaqlgkqo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bGFzYWtpdmJsYnFhcWxna3FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDM1ODIsImV4cCI6MjA5NDUxOTU4Mn0.N67H80w3MfQf7o9gHfLueaRE32lLzljjYcEnkZcb_x8";

async function fetchClient(code) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${code.toUpperCase()}`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
  });
  const data = await res.json();
  if (!data.length) return null;
  const r = data[0];
  return {
    id: r.id, name: r.name, email: r.email, phone: r.phone,
    joinDate: r.join_date, round: r.round || 1, isNew: r.is_new,
    scores: r.scores || { Experian:{start:0,current:0,goal:750}, Equifax:{start:0,current:0,goal:750}, TransUnion:{start:0,current:0,goal:750} },
    disputes: r.disputes || [],
    bureauTimers: r.bureau_timers || { Experian:null, Equifax:null, TransUnion:null },
    messages: r.messages || [],
    bureauAccounts: r.bureau_accounts || { Experian:{username:"",password:""}, Equifax:{username:"",password:""}, TransUnion:{username:"",password:""}, CreditKarma:{username:"",password:""} },
    scoreSubmissions: r.score_submissions || [],
    notifications: r.notifications || [],
  };
}

async function saveClient(id, updates) {
  await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Content-Type":"application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Prefer":"return=minimal" },
    body: JSON.stringify(updates),
  });
}

const B = {
  bg:"#0a0f0a", bgCard:"#111811",
  gold:"#D4AF37", goldLight:"#F0CF6B",
  goldBorder:"rgba(212,175,55,0.22)", goldBorderHi:"rgba(212,175,55,0.50)",
  neon:"#39FF14", text:"#F0EAD8", textMuted:"#8a9a8a", textDim:"#4a5a4a",
};

const BM = {
  Experian:  {color:"#4A90D9",light:"#82B4E8",bg:"rgba(74,144,217,0.08)", border:"rgba(74,144,217,0.25)",letter:"EX"},
  Equifax:   {color:"#E31837",light:"#F47C8A",bg:"rgba(227,24,55,0.08)",  border:"rgba(227,24,55,0.25)", letter:"EQ"},
  TransUnion:{color:"#1B75BC",light:"#6EB0E0",bg:"rgba(27,117,188,0.08)", border:"rgba(27,117,188,0.25)",letter:"TU"},
};

const SM = {
  "Resolved":    {color:"#39FF14",  bg:"rgba(57,255,20,0.07)",  border:"rgba(57,255,20,0.2)", icon:"✓"},
  "In Progress": {color:"#F0CF6B",  bg:"rgba(212,175,55,0.08)", border:"rgba(212,175,55,0.22)",icon:"↻"},
  "Pending":     {color:"#8a9a8a",  bg:"rgba(138,154,138,0.08)",border:"rgba(138,154,138,0.2)",icon:"○"},
  "Rejected":    {color:"#ef4444",  bg:"rgba(239,68,68,0.08)",  border:"rgba(239,68,68,0.2)", icon:"✕"},
};

function sc(s){return s>=750?"#39FF14":s>=670?"#F0CF6B":s>=580?"#f59e0b":"#ef4444";}
function sl(s){return s>=750?"Excellent":s>=670?"Good":s>=580?"Fair":"Needs Work";}
function avg(scores){const v=Object.values(scores).map(s=>s.current);return Math.round(v.reduce((a,b)=>a+b,0)/v.length);}
function pct(s){if(!s||s.goal<=s.start)return 0;return Math.min(100,Math.max(0,Math.round(((s.current-s.start)/(s.goal-s.start))*100)));}
function dr(d){if(!d)return null;return Math.ceil((new Date(new Date(d).getTime()+30*24*60*60*1000)-new Date())/(1000*60*60*24));}

const GL=()=>(
  <div style={{display:"flex",alignItems:"center",gap:10,margin:"8px 0"}}>
    <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,transparent,rgba(212,175,55,0.22))`}}/>
    <div style={{width:3,height:3,borderRadius:"50%",background:"#D4AF37",opacity:0.45}}/>
    <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,rgba(212,175,55,0.22),transparent)`}}/>
  </div>
);

// INTRO STEPS
const INTRO=[
  {icon:"🥂",title:"Welcome to Credit Lounge!",sub:"by Kris",body:"Hey {name}! This is YOUR personal credit repair portal. Here you can track your scores, see your disputes in real time, message me directly, and access everything you need for your credit journey.\n\nLet me take you on a quick tour!",cta:"Show Me Around →",welcome:true},
  {icon:"📊",title:"Your Credit Scores",body:"Your dashboard shows your scores from all three bureaus:\n\n• Experian (EX)\n• Equifax (EQ)\n• TransUnion (TU)\n\nEach bureau is different — that's normal! We track all three separately.",cta:"Next →"},
  {icon:"📋",title:"Your Disputes",body:"In the Disputes tab you can see every item filed on your behalf:\n\n✓ Resolved — removed! 🎉\n↻ In Progress — bureau reviewing\n○ Pending — just filed\n✕ Rejected — we'll try again\n\nKris does up to 3 rounds of disputes.",cta:"Next →"},
  {icon:"🚫",title:"Important — Please Read!",body:"While Kris is working on your credit:\n\n❌ Do NOT let anyone pull your credit\n❌ Do NOT apply for new accounts\n❌ Do NOT let any account go late\n❌ Do NOT max out credit cards\n\nThese will slow your progress!",cta:"Next →",warn:true},
  {icon:"⚡",title:"Quick Win — Do This Today!",body:"Sign up for Experian Boost at Experian.com:\n\n✅ It's completely FREE\n✅ Can add points the SAME DAY\n✅ Just connect your bank account\n\n⚠️ IMPORTANT: The address on your Experian file must match your bank account address!\n\nAlso keep credit card balances under 10% of your limit.",cta:"Next →"},
  {icon:"💬",title:"Message Kris Anytime",body:"Use the Messages tab to reach Kris directly.\n\nBusiness hours:\n📅 Monday – Friday\n🕐 10:30 AM – 4:30 PM\n\nSaturday by exception, Sunday closed.\nResponses within 1 business day.",cta:"Enter My Portal →",last:true},
];

function Intro({name,onDone}){
  const [step,setStep]=useState(0);
  const cur=INTRO[step];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.96)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:20,fontFamily:"'Outfit',sans-serif"}}>
      <style>{`@keyframes fi{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{width:"100%",maxWidth:440}} key={step}>
        <div style={{display:"flex",justifyContent:"center",gap:7,marginBottom:24}}>
          {INTRO.map((_,i)=>(
            <div key={i} style={{width:i===step?22:7,height:7,borderRadius:99,background:i<=step?"rgba(57,255,20,0.8)":"rgba(255,255,255,0.12)",transition:"all 0.3s"}}/>
          ))}
        </div>
        <div style={{background:cur.warn?"rgba(239,68,68,0.05)":cur.welcome?"rgba(57,255,20,0.04)":"#111811",border:`1px solid ${cur.warn?"rgba(239,68,68,0.3)":cur.welcome?"rgba(57,255,20,0.35)":"rgba(212,175,55,0.22)"}`,borderRadius:22,padding:"28px 24px",animation:"fi 0.35s ease",boxShadow:"0 30px 80px rgba(0,0,0,0.7)"}}>
          <div style={{fontSize:48,textAlign:"center",marginBottom:14}}>{cur.icon}</div>
          <div style={{fontSize:21,fontWeight:800,color:cur.warn?"#fca5a5":cur.welcome?"#39FF14":B.text,textAlign:"center",marginBottom:cur.sub?4:16,lineHeight:1.2}}>{cur.title}</div>
          {cur.sub&&<div style={{fontSize:12,color:B.gold,textAlign:"center",marginBottom:16,letterSpacing:1}}>{cur.sub}</div>}
          <div style={{fontSize:14,color:B.textMuted,lineHeight:1.8,whiteSpace:"pre-line",marginBottom:22}}>{cur.body.replace("{name}",name.split(" ")[0])}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:12,color:B.textDim}}>Step {step+1} of {INTRO.length}</div>
            {!cur.welcome&&!cur.last&&<button onClick={()=>setStep(INTRO.length-1)} style={{fontSize:12,color:B.textDim,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Skip</button>}
          </div>
          <button onClick={()=>cur.last?onDone():setStep(s=>s+1)}
            style={{width:"100%",padding:"13px",borderRadius:14,border:"none",background:cur.welcome||cur.last?"rgba(57,255,20,0.75)":cur.warn?"rgba(239,68,68,0.2)":"rgba(212,175,55,0.15)",color:cur.welcome||cur.last?"#0a0f0a":cur.warn?"#fca5a5":B.goldLight,fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>
            {cur.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

function BureauCard({bureau,s}){
  const m=BM[bureau];const p=pct(s);const g=s.current-s.start;
  return(
    <div style={{borderRadius:13,border:`1px solid ${m.border}`,background:m.bg,padding:"13px 13px 11px",flex:1,minWidth:0}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:26,height:26,borderRadius:7,background:`${m.color}22`,border:`1px solid ${m.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:m.light,fontFamily:"monospace"}}>{m.letter}</div>
          <div style={{fontSize:11,fontWeight:700,color:B.text}}>{bureau}</div>
        </div>
        <div style={{fontSize:22,fontWeight:800,color:sc(s.current),fontFamily:"'DM Mono',monospace",opacity:0.9}}>{s.current}</div>
      </div>
      <div style={{height:4,background:"rgba(255,255,255,0.05)",borderRadius:99,overflow:"hidden",marginBottom:5}}>
        <div style={{width:`${p}%`,height:"100%",background:`linear-gradient(90deg,${m.color}88,${m.color})`,borderRadius:99}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10}}>
        <span style={{color:B.textDim}}>{s.start}</span>
        <span style={{color:g>0?"#39FF14":"#ef4444",fontWeight:600}}>{g>0?`+${g}`:g}</span>
        <span style={{color:B.textDim}}>{s.goal}</span>
      </div>
    </div>
  );
}

function CountdownCard({bureau,startDate,clientName,clientEmail}){
  const days=dr(startDate);const m=BM[bureau];
  const isDone=days!==null&&days<=0;const isActive=days!==null&&days>0;
  return(
    <div style={{borderRadius:13,border:`1px solid ${isDone?"rgba(239,68,68,0.35)":m.border}`,background:isDone?"rgba(239,68,68,0.05)":m.bg,padding:"14px 16px",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:isActive||isDone?10:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:28,height:28,borderRadius:8,background:`${m.color}22`,border:`1px solid ${m.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:m.light,fontFamily:"monospace"}}>{m.letter}</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:B.text}}>{bureau}</div>
            {startDate&&<div style={{fontSize:10,color:B.textDim}}>Filed {startDate}</div>}
          </div>
        </div>
        {!startDate&&<div style={{fontSize:12,color:B.textDim,fontStyle:"italic"}}>Not started</div>}
        {isActive&&<div style={{textAlign:"center",padding:"5px 12px",borderRadius:99,background:"rgba(57,255,20,0.08)",border:"1px solid rgba(57,255,20,0.2)"}}>
          <div style={{fontSize:18,fontWeight:800,color:"#39FF14",fontFamily:"'DM Mono',monospace",lineHeight:1,opacity:0.88}}>{days}</div>
          <div style={{fontSize:10,color:B.textDim}}>days left</div>
        </div>}
        {isDone&&<div style={{padding:"5px 12px",borderRadius:99,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",fontSize:12,fontWeight:700,color:"#ef4444"}}>⏰ Time's Up</div>}
      </div>
      {startDate&&(
        <div style={{height:5,background:"rgba(255,255,255,0.05)",borderRadius:99,overflow:"hidden"}}>
          <div style={{width:`${isDone?100:Math.round((1-days/30)*100)}%`,height:"100%",background:isDone?"linear-gradient(90deg,#ef4444,#dc2626)":days<=5?"linear-gradient(90deg,#f59e0b,#d97706)":`linear-gradient(90deg,${m.color}88,${m.color})`,borderRadius:99}}/>
        </div>
      )}
      {isDone&&<div style={{marginTop:10,fontSize:13,color:"#fca5a5",lineHeight:1.5}}>⏰ 30 days is up! Message Kris to start the next round.</div>}
    </div>
  );
}

function AccountsTab({accounts,onSave}){
  const bureaus=["Experian","Equifax","TransUnion","CreditKarma"];
  const info={Experian:{icon:"🔵",url:"experian.com",note:"Required for Experian Boost. Address must match bank."},Equifax:{icon:"🔴",url:"equifax.com",note:"Monitor your Equifax report."},TransUnion:{icon:"🔷",url:"transunion.com",note:"Monitor your TransUnion report."},CreditKarma:{icon:"🟢",url:"creditkarma.com",note:"Free monitoring — shows EQ & TU scores."}};
  const [accs,setAccs]=useState(accounts||{Experian:{username:"",password:""},Equifax:{username:"",password:""},TransUnion:{username:"",password:""},CreditKarma:{username:"",password:""}});
  const [show,setShow]=useState({});const [saved,setSaved]=useState({});
  function upd(b,f,v){setAccs(p=>({...p,[b]:{...p[b],[f]:v}}));setSaved(p=>({...p,[b]:false}));}
  function save(b){onSave({...accs});setSaved(p=>({...p,[b]:true}));setTimeout(()=>setSaved(p=>({...p,[b]:false})),2500);}
  const inp={width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${B.goldBorder}`,background:"rgba(0,0,0,0.3)",color:B.text,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"};
  return(
    <div>
      <div style={{marginBottom:16,padding:"12px 14px",borderRadius:12,background:"rgba(212,175,55,0.05)",border:`1px solid ${B.goldBorder}`,fontSize:13,color:B.textMuted,lineHeight:1.6}}>
        🔒 <strong style={{color:B.goldLight}}>Stored only on this device.</strong> Never shared or sold.
      </div>
      {bureaus.map(b=>{
        const nfo=info[b];const acc=accs[b]||{username:"",password:""};
        return(
          <div key={b} style={{borderRadius:13,border:`1px solid ${B.goldBorder}`,background:B.bgCard,padding:"16px 18px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
              <div style={{fontSize:20}}>{nfo.icon}</div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:B.text}}>{b==="CreditKarma"?"Credit Karma":b}</div>
                <div style={{fontSize:11,color:B.textDim}}>{nfo.url}</div>
              </div>
            </div>
            <div style={{fontSize:12,color:B.textMuted,marginBottom:12,padding:"7px 10px",borderRadius:8,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",lineHeight:1.5}}>💡 {nfo.note}</div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:600,color:B.textMuted,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>Username / Email</div>
              <input value={acc.username} onChange={e=>upd(b,"username",e.target.value)} placeholder="Your email" style={inp}/>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,color:B.textMuted,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>Password</div>
              <div style={{position:"relative"}}>
                <input type={show[b]?"text":"password"} value={acc.password} onChange={e=>upd(b,"password",e.target.value)} placeholder="Your password"
                  style={{...inp,paddingRight:42}}/>
                <button onClick={()=>setShow(p=>({...p,[b]:!p[b]}))} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:B.textMuted,cursor:"pointer",fontSize:15}}>
                  {show[b]?"🙈":"👁️"}
                </button>
              </div>
            </div>
            <button onClick={()=>save(b)} style={{width:"100%",padding:"10px",borderRadius:10,border:`1px solid ${saved[b]?"rgba(57,255,20,0.4)":B.goldBorder}`,background:saved[b]?"rgba(57,255,20,0.08)":"rgba(212,175,55,0.06)",color:saved[b]?"#39FF14":B.goldLight,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
              {saved[b]?"✅ Saved!":"💾 Save"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function TipsTab(){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{borderRadius:14,border:"1px solid rgba(239,68,68,0.25)",background:"rgba(239,68,68,0.04)",padding:"18px 18px"}}>
        <div style={{fontSize:15,fontWeight:700,color:"#ff6b6b",marginBottom:12}}>🚫 Do NOT Do While We're Working</div>
        {[["❌","Do NOT let anyone pull your credit","No new cards, loans, or mortgages — every hard inquiry hurts your score."],["❌","Do NOT apply for new accounts","New accounts reduce your average account age."],["❌","Do NOT let any account go late","Even accounts being disputed — missing a payment hurts your score significantly."],["❌","Do NOT max out credit cards","High balances spike your utilization and lower your score."]].map(([i,t,s])=>(
          <div key={t} style={{display:"flex",gap:10,marginBottom:10,paddingBottom:10,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <div style={{fontSize:16,flexShrink:0}}>{i}</div>
            <div><div style={{fontSize:13,color:"#fca5a5",fontWeight:500,marginBottom:3}}>{t}</div><div style={{fontSize:12,color:B.textMuted,lineHeight:1.5}}>{s}</div></div>
          </div>
        ))}
      </div>
      <div style={{borderRadius:14,border:"1px solid rgba(57,255,20,0.22)",background:"rgba(57,255,20,0.03)",padding:"18px 18px"}}>
        <div style={{fontSize:15,fontWeight:700,color:"#39FF14",marginBottom:12}}>✅ Things TO DO</div>
        {[["⚡","Sign up for Experian Boost — free same day points!","Go to Experian.com, connect your bank account. Address on Experian MUST match your bank address."],["💳","Keep credit cards below 10% of your limit","$1,000 limit = keep balance under $100 for max score benefit."],["📅","Pay all bills on time","Payment history = 35% of your score. Set up autopay!"],["📬","Keep your address consistent everywhere","Bank, cards, and bureaus should all have the same address."]].map(([i,t,s])=>(
          <div key={t} style={{display:"flex",gap:10,marginBottom:10,paddingBottom:10,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <div style={{fontSize:16,flexShrink:0}}>{i}</div>
            <div><div style={{fontSize:13,color:"#39FF14",fontWeight:500,marginBottom:3,opacity:0.85}}>{t}</div><div style={{fontSize:12,color:B.textMuted,lineHeight:1.5}}>{s}</div></div>
          </div>
        ))}
      </div>
      <div style={{borderRadius:14,border:`1px solid ${B.goldBorder}`,background:"rgba(212,175,55,0.03)",padding:"18px 18px"}}>
        <div style={{fontSize:15,fontWeight:700,color:B.goldLight,marginBottom:12}}>📊 Utilization Guide</div>
        {[["Under 10%","🏆 Best — Maximum score benefit"],["10–30%","👍 Good — Moderate impact"],["30–50%","⚠️ Fair — Pay down if possible"],["Over 50%","🔴 Hurts — Significant negative impact"]].map(([r,l])=>(
          <div key={r} style={{display:"flex",gap:12,padding:"9px 12px",borderRadius:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",marginBottom:8}}>
            <div style={{minWidth:80,fontSize:12,fontWeight:700,color:B.goldLight,fontFamily:"monospace"}}>{r}</div>
            <div style={{fontSize:13,color:B.textMuted}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{borderRadius:14,border:`1px solid ${B.goldBorder}`,background:"rgba(212,175,55,0.03)",padding:"18px 18px"}}>
        <div style={{fontSize:15,fontWeight:700,color:B.goldLight,marginBottom:10}}>💎 Tradeline Services</div>
        <div style={{fontSize:13,color:B.textMuted,lineHeight:1.7,marginBottom:10}}>Authorized user tradelines available to boost your profile quickly.</div>
        {[["💳","Credit Limits","$5,000 – $20,000"],["📅","Account Age","2 – 10 years old"],["💰","Price Range","$250 – $450 per tradeline"]].map(([i,l,v])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,background:"rgba(255,255,255,0.03)",border:`1px solid ${B.goldBorder}`,marginBottom:8}}>
            <div>{i}</div><div style={{flex:1,fontSize:13,color:B.textMuted}}>{l}</div><div style={{fontSize:13,fontWeight:700,color:B.goldLight}}>{v}</div>
          </div>
        ))}
        <div style={{marginTop:8,fontSize:12,color:B.textMuted,padding:"9px 12px",borderRadius:10,background:"rgba(212,175,55,0.04)",border:`1px solid ${B.goldBorder}`}}>💬 Message Kris to ask about tradelines.</div>
      </div>
      <div style={{borderRadius:14,border:"1px solid rgba(147,197,253,0.2)",background:"rgba(147,197,253,0.03)",padding:"18px 18px"}}>
        <div style={{fontSize:15,fontWeight:700,color:"#93c5fd",marginBottom:10}}>📋 Policy & Guarantee</div>
        {[["🔄","Up to 3 rounds of disputes","If an item doesn't come off after 3 rounds it's legally verified — this is credit repair, not a credit sweep."],["🛡️","1-Year Re-removal Guarantee","If any removed item comes back within 1 year, Kris removes it again at no extra cost."],["📬","When to follow up","After 30 days, if you haven't seen results message Kris to start the next round."]].map(([i,t,s])=>(
          <div key={t} style={{display:"flex",gap:10,marginBottom:10,paddingBottom:10,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <div style={{fontSize:16,flexShrink:0}}>{i}</div>
            <div><div style={{fontSize:13,color:"#93c5fd",fontWeight:500,marginBottom:3}}>{t}</div><div style={{fontSize:12,color:B.textMuted,lineHeight:1.5}}>{s}</div></div>
          </div>
        ))}
      </div>
      <div style={{borderRadius:14,border:`1px solid ${B.goldBorder}`,background:"rgba(212,175,55,0.03)",padding:"18px 18px"}}>
        <div style={{fontSize:15,fontWeight:700,color:B.goldLight,marginBottom:10}}>🕐 Business Hours</div>
        {[["Monday","10:30 AM – 4:30 PM",true],["Tuesday","10:30 AM – 4:30 PM",true],["Wednesday","10:30 AM – 4:30 PM",true],["Thursday","10:30 AM – 4:30 PM",true],["Friday","10:30 AM – 4:30 PM",true],["Saturday","By Exception Only",null],["Sunday","Closed",false]].map(([d,h,o])=>(
          <div key={d} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",borderRadius:9,marginBottom:6,background:o===true?"rgba(57,255,20,0.04)":o===null?"rgba(212,175,55,0.04)":"rgba(255,255,255,0.02)",border:`1px solid ${o===true?"rgba(57,255,20,0.15)":o===null?B.goldBorder:"rgba(255,255,255,0.05)"}`}}>
            <div style={{fontSize:13,fontWeight:600,color:o===true?B.text:o===null?B.goldLight:B.textDim}}>{d}</div>
            <div style={{fontSize:13,color:o===true?"#39FF14":o===null?B.gold:B.textDim,fontWeight:o===true?600:400}}>{h}</div>
          </div>
        ))}
      </div>
      <div style={{padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",fontSize:12,color:B.textDim,lineHeight:1.75}}>
        <strong style={{color:B.textMuted}}>Disclaimer:</strong> Credit Lounge provides credit repair services. Individual results vary. This is credit repair, not a credit sweep. © 2026 Credit Lounge by Kris.
      </div>
    </div>
  );
}

export default function CreditLounge(){
  const [screen,setScreen]   = useState("login");
  const [client,setClient]   = useState(null);
  const [showIntro,setShowIntro]=useState(false);
  const [tab,setTab]         = useState("disputes");
  const [name,setName]       = useState("");
  const [code,setCode]       = useState("");
  const [err,setErr]         = useState("");
  const [loading,setLoading] = useState(false);
  const [msgs,setMsgs]       = useState([]);
  const [msgIn,setMsgIn]     = useState("");
  const [notifs,setNotifs]   = useState([]);
  const [showNotif,setShowNotif]=useState(false);
  const [toast,setToast]     = useState(null);
  const [showScore,setShowScore]=useState(false);
  const [scoreIn,setScoreIn] = useState("");
  const [scoreBureau,setScoreBureau]=useState("Experian");
  const [scoreDone,setScoreDone]=useState(false);
  const msgEnd=useRef(null);

  useEffect(()=>{if(client){setMsgs(client.messages||[]);setNotifs(client.notifications||[]);}},[client]);
  useEffect(()=>{msgEnd.current?.scrollIntoView({behavior:"smooth"});},[msgs,tab]);

  async function login(){
    if(!name.trim()||!code.trim()){setErr("Please enter your name and code.");return;}
    setLoading(true);setErr("");
    try{
      const c=await fetchClient(code.trim());
      if(c&&c.name.toLowerCase().startsWith(name.trim().toLowerCase().split(" ")[0])){
        setClient(c);setScreen("portal");
        if(c.isNew) setShowIntro(true);
      } else setErr("Name or code not recognized. Contact Kris.");
    } catch(e){ setErr("Connection error. Try again."); }
    setLoading(false);
  }

  async function sendMsg(){
    if(!msgIn.trim()) return;
    const now=new Date();
    const time=now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})+" · "+now.toLocaleDateString([],{month:"short",day:"numeric"});
    const newMsg={from:"client",text:msgIn.trim(),time};
    const updated=[...msgs,newMsg];
    setMsgs(updated);setMsgIn("");
    await saveClient(client.id,{messages:updated});
    setTimeout(async()=>{
      const reply={from:"advisor",text:"Thank you! Kris will respond within 1 business day. 🙏🏽",time};
      const withReply=[...updated,reply];
      setMsgs(withReply);
      await saveClient(client.id,{messages:withReply});
    },1200);
  }

  async function submitScore(){
    const score=parseInt(scoreIn);
    if(!score||score<300||score>850) return;
    const now=new Date();
    const time=now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})+" · "+now.toLocaleDateString([],{month:"short",day:"numeric"});
    const newMsg={from:"client",text:`📊 ${scoreBureau} score update: ${score}`,time};
    const updated=[...msgs,newMsg];
    setMsgs(updated);
    await saveClient(client.id,{messages:updated});
    setTimeout(async()=>{
      const reply={from:"advisor",text:`Got it! ${scoreBureau} score of ${score} received. Kris will verify within 1–2 business days. 💪🏽`,time};
      const withReply=[...updated,reply];
      setMsgs(withReply);
      await saveClient(client.id,{messages:withReply});
    },1200);
    setScoreDone(true);
    setTimeout(()=>{setShowScore(false);setScoreDone(false);setScoreIn("");},2400);
  }

  const unread=notifs.filter(n=>!n.read).length;
  const resolved=client?.disputes.filter(d=>d.status==="Resolved").length??0;
  const overall=client?avg(client.scores):0;

  const card={background:B.bgCard,border:"1px solid rgba(57,255,20,0.18)",borderRadius:16};
  const inp={width:"100%",padding:"13px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(0,0,0,0.4)",color:B.text,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box"};

  if(screen==="login") return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0a0f0a,#0d150d,#080f08)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"44px 22px 40px",fontFamily:"'Outfit',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      <style>{`*{box-sizing:border-box;}input{color:#F0EAD8!important;}input::placeholder{color:#4a5a4a;}@keyframes fg{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes clUp{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}`}</style>
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{fontSize:60,lineHeight:1,marginBottom:14,animation:"fg 3s ease-in-out infinite",display:"inline-block"}}>🥂</div>
        <div style={{fontSize:40,fontWeight:900,color:"#fff",letterSpacing:4,textTransform:"uppercase",lineHeight:1,marginBottom:10}}>CREDIT LOUNGE</div>
        <div style={{fontSize:16,color:B.gold,fontWeight:500,letterSpacing:1,marginBottom:4}}>Cheers to Good Credit</div>
        <div style={{fontSize:13,color:B.textMuted}}>by Kris</div>
      </div>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{...card,padding:26,marginBottom:14}}>
          <div style={{fontSize:20,fontWeight:700,color:B.text,marginBottom:5}}>Member Login</div>
          <div style={{fontSize:13,color:B.textMuted,marginBottom:22,lineHeight:1.6}}>Enter your first name and the access code Kris gave you.</div>
          <div style={{fontSize:12,color:B.textMuted,marginBottom:5}}>First Name</div>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Jane" onKeyDown={e=>e.key==="Enter"&&login()} style={{...inp,marginBottom:14}}/>
          <div style={{fontSize:12,color:B.textMuted,marginBottom:5}}>Access Code</div>
          <input value={code} onChange={e=>setCode(e.target.value)} placeholder="e.g. JANE001" onKeyDown={e=>e.key==="Enter"&&login()} style={{...inp,fontFamily:"'DM Mono',monospace",letterSpacing:2,textTransform:"uppercase",marginBottom:18}}/>
          {err&&<div style={{marginBottom:14,padding:"10px 14px",borderRadius:10,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#fca5a5",fontSize:13}}>{err}</div>}
          <button onClick={login} disabled={loading} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:loading?"rgba(255,255,255,0.1)":"rgba(57,255,20,0.75)",color:loading?B.textMuted:"#0a0f0a",fontWeight:800,fontSize:15,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {loading?"Connecting...":"Enter the Lounge"}
          </button>
        </div>
        <div style={{...card,padding:18,marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:700,color:B.text,marginBottom:8}}>📱 Add to Your Phone</div>
          <div style={{fontSize:13,color:B.textMuted,lineHeight:1.75}}>
            <strong style={{color:B.text}}>iPhone:</strong> Safari → Share → Add to Home Screen.<br/>
            <strong style={{color:B.text}}>Android:</strong> Chrome → Menu ⋮ → Add to Home screen.
          </div>
        </div>
        <div style={{textAlign:"center",fontSize:12,color:B.textDim}}>© 2026 Credit Lounge · All rights reserved</div>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0a0f0a,#0d150d,#080f08)",color:B.text,fontFamily:"'Outfit',sans-serif",display:"flex",flexDirection:"column"}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      <style>{`*{box-sizing:border-box;}input::placeholder{color:${B.textDim};}::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:rgba(57,255,20,0.2);border-radius:2px;}@keyframes nb{0%,100%{text-shadow:0 0 10px rgba(57,255,20,0.28),0 0 20px rgba(57,255,20,0.10);}50%{text-shadow:0 0 16px rgba(57,255,20,0.40),0 0 32px rgba(57,255,20,0.14);}}@keyframes fg{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}@keyframes bp{0%,100%{box-shadow:0 0 0 0 rgba(57,255,20,0.3)}50%{box-shadow:0 0 0 4px rgba(57,255,20,0)}}@keyframes clUp{from{transform:translateX(-50%) translateY(28px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}`}</style>

      {showIntro&&<Intro name={client.name} onDone={async()=>{setShowIntro(false);await saveClient(client.id,{is_new:false});}}/>}

      <div style={{background:"rgba(10,15,10,0.95)",borderBottom:"1px solid rgba(57,255,20,0.15)",padding:"11px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:24,animation:"fg 3.5s ease-in-out infinite",lineHeight:1}}>🥂</div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:B.text,letterSpacing:2,textTransform:"uppercase",lineHeight:1}}>Credit Lounge</div>
            <div style={{fontSize:10,color:B.gold,letterSpacing:1.5,marginTop:2,opacity:0.8}}>Cheers to Good Credit</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>setShowIntro(true)} style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${B.goldBorder}`,background:"transparent",color:B.goldLight,fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>👋 Tour</button>
          <button onClick={()=>{setShowNotif(v=>!v);if(!showNotif)setNotifs(p=>p.map(n=>({...n,read:true})));}}
            style={{position:"relative",background:unread>0?"rgba(57,255,20,0.08)":"none",border:`1px solid ${unread>0?"rgba(57,255,20,0.4)":"rgba(255,255,255,0.1)"}`,borderRadius:10,width:38,height:38,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
            🔔
            {unread>0&&<span style={{position:"absolute",top:-5,right:-5,width:18,height:18,borderRadius:"50%",background:"#39FF14",color:"#0a0f0a",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${B.bg}`,animation:"bp 2s infinite"}}>{unread}</span>}
          </button>
          <button onClick={()=>{setScreen("login");setClient(null);}} style={{padding:"6px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:B.textMuted,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Out</button>
        </div>
      </div>

      {showNotif&&(
        <div onClick={()=>setShowNotif(false)} style={{position:"fixed",inset:0,zIndex:25}}>
          <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:62,right:14,width:320,maxHeight:420,overflowY:"auto",background:B.bgCard,border:"1px solid rgba(57,255,20,0.2)",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.8)"}}>
            <div style={{padding:"13px 16px",borderBottom:"1px solid rgba(57,255,20,0.12)",fontWeight:700,fontSize:14,color:B.text,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              Notifications<button onClick={()=>setShowNotif(false)} style={{background:"none",border:"none",color:B.textMuted,cursor:"pointer",fontSize:16}}>✕</button>
            </div>
            {notifs.length===0&&<div style={{padding:"32px 16px",textAlign:"center",color:B.textDim,fontSize:13}}>🔕 No notifications yet</div>}
            {notifs.map(n=>(
              <div key={n.id} style={{padding:"13px 16px",borderBottom:"1px solid rgba(57,255,20,0.08)",background:n.read?"transparent":"rgba(57,255,20,0.03)",display:"flex",gap:11,alignItems:"flex-start"}}>
                <div style={{fontSize:20,flexShrink:0}}>{n.type==="dispute_resolved"?"🎉":"📢"}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:12,color:n.type==="dispute_resolved"?"#39FF14":B.text,marginBottom:3}}>{n.title}</div>
                  <div style={{fontSize:12,color:B.textMuted,lineHeight:1.5}}>{n.body}</div>
                  <div style={{fontSize:11,color:B.textDim,marginTop:4}}>{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{maxWidth:680,width:"100%",margin:"0 auto",padding:"20px 18px 60px"}}>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:20,fontWeight:700,color:B.text}}>Welcome back, {client.name.split(" ")[0]} 👋🏽</div>
          <div style={{fontSize:12,color:B.textMuted,marginTop:2}}>Round {client.round}/3 · Credit Lounge</div>
        </div>

        {/* Score Banner */}
        <div style={{...card,padding:"20px 20px 18px",marginBottom:12,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-40,right:-40,width:140,height:140,borderRadius:"50%",background:"radial-gradient(circle,rgba(57,255,20,0.05),transparent 70%)",pointerEvents:"none"}}/>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:14}}>
            <div>
              <div style={{fontSize:10,fontWeight:600,color:"#39FF14",textTransform:"uppercase",letterSpacing:2,opacity:0.7,marginBottom:5}}>Average Score</div>
              <div style={{fontSize:58,fontWeight:900,color:"#39FF14",fontFamily:"'DM Mono',monospace",lineHeight:1,animation:"nb 4s ease-in-out infinite",letterSpacing:-2,opacity:0.88}}>{overall}</div>
              <div style={{fontSize:12,color:"#39FF14",opacity:0.65,marginTop:3}}>{sl(overall)}</div>
            </div>
            <button onClick={()=>setShowScore(true)} style={{padding:"9px 14px",borderRadius:10,border:"1px solid rgba(57,255,20,0.3)",background:"rgba(57,255,20,0.06)",color:"#39FF14",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit",opacity:0.9}}>
              📊 Update Score
            </button>
          </div>
          <div style={{display:"flex",gap:8}}>
            {["Experian","Equifax","TransUnion"].map(b=>(
              <BureauCard key={b} bureau={b} s={client.scores[b]}/>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {[{l:"Disputes",v:client.disputes.length,c:B.text},{l:"Resolved",v:resolved,c:"#39FF14",n:true},{l:"In Progress",v:client.disputes.filter(d=>d.status==="In Progress").length,c:B.goldLight}].map(s=>(
            <div key={s.l} style={{flex:1,textAlign:"center",padding:"11px 6px",background:B.bgCard,borderRadius:12,border:"1px solid rgba(57,255,20,0.1)"}}>
              <div style={{fontSize:20,fontWeight:800,color:s.c,fontFamily:"'DM Mono',monospace",opacity:s.n?0.85:1,textShadow:s.n?"0 0 10px rgba(57,255,20,0.22)":undefined}}>{s.v}</div>
              <div style={{fontSize:10,color:B.textDim,marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:7}}>
          {[{id:"disputes",l:"📋 Disputes"},{id:"messages",l:"💬 Messages"},{id:"timers",l:"⏱️ Timers"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"10px 4px",borderRadius:10,border:`1px solid ${tab===t.id?"rgba(57,255,20,0.4)":"rgba(255,255,255,0.07)"}`,background:tab===t.id?"rgba(57,255,20,0.08)":"rgba(255,255,255,0.02)",color:tab===t.id?"#39FF14":B.textMuted,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              {t.l}
            </button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:18}}>
          {[{id:"accounts",l:"🔐 My Accounts"},{id:"tips",l:"💡 Tips & Policy"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"10px 4px",borderRadius:10,border:`1px solid ${tab===t.id?(t.id==="accounts"?B.goldBorderHi:"rgba(57,255,20,0.4)"):"rgba(255,255,255,0.07)"}`,background:tab===t.id?(t.id==="accounts"?"rgba(212,175,55,0.07)":"rgba(57,255,20,0.08)"):"rgba(255,255,255,0.02)",color:tab===t.id?(t.id==="accounts"?B.goldLight:"#39FF14"):B.textMuted,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              {t.l}
            </button>
          ))}
        </div>

        {/* DISPUTES */}
        {tab==="disputes"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {notifs.filter(n=>n.type==="dispute_resolved").length>0&&(
              <div style={{padding:"14px 16px",borderRadius:13,background:"rgba(57,255,20,0.04)",border:"1px solid rgba(57,255,20,0.15)"}}>
                <div style={{fontWeight:700,fontSize:14,color:"#39FF14",marginBottom:8,opacity:0.85}}>🎉 Recent Wins</div>
                {notifs.filter(n=>n.type==="dispute_resolved").map(n=>(
                  <div key={n.id} style={{fontSize:13,color:"#86efac",lineHeight:1.7,display:"flex",gap:8,opacity:0.85}}>
                    <span style={{color:"#39FF14",fontWeight:700}}>✓</span>{n.body}
                  </div>
                ))}
              </div>
            )}
            {client.disputes.length===0&&<div style={{textAlign:"center",padding:"40px",color:B.textDim,fontSize:13,...card}}>No disputes filed yet.</div>}
            {client.disputes.map(d=>{
              const m=SM[d.status]||SM["Pending"];
              const bm=BM[d.bureau]||{light:B.goldLight,bg:"rgba(212,175,55,0.08)",border:B.goldBorder};
              return(
                <div key={d.id} style={{...card,padding:"16px 18px",borderColor:d.status==="Resolved"?"rgba(57,255,20,0.2)":"rgba(57,255,20,0.12)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:15,color:B.text,marginBottom:5}}>{d.creditor}</div>
                      <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:6}}>
                        <span style={{fontSize:11,padding:"2px 9px",borderRadius:99,background:bm.bg,color:bm.light,fontWeight:600,border:`1px solid ${bm.border}`}}>{d.bureau}</span>
                        <span style={{fontSize:11,padding:"2px 9px",borderRadius:99,background:"rgba(255,255,255,0.04)",color:B.textMuted,fontWeight:600,border:"1px solid rgba(255,255,255,0.08)"}}>{d.type}</span>
                      </div>
                      <div style={{fontSize:11,color:B.textDim}}>Filed {d.filed}</div>
                      {d.status==="Resolved"&&d.resolvedDate&&<div style={{fontSize:11,color:"#39FF14",marginTop:2,opacity:0.8}}>✓ Removed {d.resolvedDate}</div>}
                    </div>
                    <div style={{padding:"6px 11px",borderRadius:99,background:m.bg,color:m.color,fontWeight:700,fontSize:11,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4,border:`1px solid ${m.border}`,flexShrink:0}}>
                      <span>{m.icon}</span>{d.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MESSAGES */}
        {tab==="messages"&&(
          <div style={{...card,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid rgba(57,255,20,0.1)"}}>
              <div style={{fontSize:15,fontWeight:700,color:B.text}}>Message Kris</div>
              <div style={{fontSize:12,color:B.textDim,marginTop:2}}>Mon–Fri · 10:30 AM – 4:30 PM</div>
            </div>
            <div style={{padding:"14px 16px",overflowY:"auto",display:"flex",flexDirection:"column",gap:12,maxHeight:360}}>
              {msgs.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.from==="client"?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:"82%"}}>
                    {m.from==="advisor"&&<div style={{fontSize:11,color:"#39FF14",marginBottom:4,paddingLeft:4,fontWeight:600,opacity:0.7}}>Kris · Credit Lounge</div>}
                    <div style={{padding:"10px 14px",borderRadius:m.from==="client"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.from==="client"?"rgba(57,255,20,0.12)":"rgba(255,255,255,0.05)",border:m.from==="client"?"1px solid rgba(57,255,20,0.25)":`1px solid ${B.goldBorder}`,color:B.text,fontSize:13,lineHeight:1.55}}>
                      {m.text}
                    </div>
                    <div style={{fontSize:11,color:B.textDim,marginTop:3,textAlign:m.from==="client"?"right":"left"}}>{m.time}</div>
                  </div>
                </div>
              ))}
              <div ref={msgEnd}/>
            </div>
            <div style={{padding:"11px 14px",borderTop:"1px solid rgba(57,255,20,0.1)",display:"flex",gap:8}}>
              <input value={msgIn} onChange={e=>setMsgIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} placeholder="Send a message to Kris…"
                style={{flex:1,padding:"10px 12px",borderRadius:10,border:`1px solid ${B.goldBorder}`,background:"rgba(0,0,0,0.3)",color:B.text,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              <button onClick={sendMsg} style={{padding:"10px 18px",borderRadius:10,border:"none",background:"rgba(57,255,20,0.7)",color:"#0a0f0a",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Send</button>
            </div>
          </div>
        )}

        {/* TIMERS */}
        {tab==="timers"&&(
          <div>
            <div style={{marginBottom:14,padding:"12px 14px",borderRadius:12,background:"rgba(57,255,20,0.03)",border:"1px solid rgba(57,255,20,0.12)",fontSize:13,color:B.textMuted,lineHeight:1.6}}>
              ⏱️ Kris files disputes with each bureau separately. Your 30-day countdown starts from the filing date.
            </div>
            {["Experian","Equifax","TransUnion"].map(b=>(
              <CountdownCard key={b} bureau={b} startDate={client.bureauTimers[b]} clientName={client.name} clientEmail={client.email}/>
            ))}
            <div style={{padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",fontSize:13,color:B.textMuted,lineHeight:1.65}}>
              📬 After 30 days message Kris if you haven't seen results. Up to <strong style={{color:B.goldLight}}>3 rounds</strong> available.
            </div>
          </div>
        )}

        {tab==="accounts"&&<AccountsTab accounts={client.bureauAccounts} onSave={async(accs)=>{await saveClient(client.id,{bureau_accounts:accs});}}/>}
        {tab==="tips"&&<TipsTab/>}

        <div style={{textAlign:"center",marginTop:22,fontSize:12,color:B.textDim}}>
          <GL/>
          <div style={{marginTop:10}}>© 2026 Credit Lounge · Cheers to Good Credit</div>
        </div>
      </div>

      {/* Score Modal */}
      {showScore&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:20}}>
          <div style={{...card,padding:26,width:"100%",maxWidth:420}}>
            {scoreDone?(
              <div style={{textAlign:"center",padding:"22px 0"}}>
                <div style={{fontSize:48,marginBottom:10}}>✅</div>
                <div style={{fontSize:20,fontWeight:700,color:"#39FF14",marginBottom:8}}>Score Submitted!</div>
                <div style={{fontSize:14,color:B.textMuted}}>Kris will verify within 1–2 business days.</div>
              </div>
            ):(
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:19,fontWeight:700,color:B.text}}>Update My Score</div>
                  <button onClick={()=>setShowScore(false)} style={{background:"none",border:"none",color:B.textMuted,fontSize:20,cursor:"pointer"}}>✕</button>
                </div>
                <GL/>
                <div style={{marginTop:14,marginBottom:5,fontSize:12,fontWeight:600,color:B.textMuted,textTransform:"uppercase",letterSpacing:1}}>Which bureau?</div>
                <div style={{display:"flex",gap:8,marginBottom:18}}>
                  {["Experian","Equifax","TransUnion"].map(b=>{
                    const m=BM[b];
                    return(
                      <button key={b} onClick={()=>setScoreBureau(b)}
                        style={{flex:1,padding:"9px 4px",borderRadius:10,border:`1px solid ${scoreBureau===b?m.border:"rgba(255,255,255,0.08)"}`,background:scoreBureau===b?m.bg:"transparent",color:scoreBureau===b?m.light:B.textMuted,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                        <div style={{fontSize:13,marginBottom:2}}>{m.letter}</div>
                        <div style={{fontSize:10}}>{b}</div>
                      </button>
                    );
                  })}
                </div>
                <div style={{marginBottom:5,fontSize:12,fontWeight:600,color:B.textMuted,textTransform:"uppercase",letterSpacing:1}}>Your {scoreBureau} Score</div>
                <input type="number" value={scoreIn} onChange={e=>setScoreIn(e.target.value)} placeholder="e.g. 648" min="300" max="850"
                  style={{width:"100%",padding:"12px",borderRadius:12,border:`1px solid ${B.goldBorder}`,background:"rgba(0,0,0,0.4)",color:scoreIn&&parseInt(scoreIn)>=300?sc(parseInt(scoreIn)):B.textDim,fontSize:34,fontFamily:"'DM Mono',monospace",fontWeight:800,textAlign:"center",outline:"none",letterSpacing:3,boxSizing:"border-box"}}/>
                <div style={{fontSize:12,color:B.textDim,textAlign:"center",marginTop:4,marginBottom:14}}>Valid: 300 – 850</div>
                {scoreIn&&parseInt(scoreIn)>=300&&parseInt(scoreIn)<=850&&(
                  <div style={{marginBottom:14,padding:"9px 12px",borderRadius:10,background:"rgba(57,255,20,0.05)",border:"1px solid rgba(57,255,20,0.15)",fontSize:13,color:"#39FF14",fontWeight:600,textAlign:"center",opacity:0.85}}>
                    {parseInt(scoreIn)>=750?"🌟 Excellent!":parseInt(scoreIn)>=670?"👍 Good":parseInt(scoreIn)>=580?"📈 Progress":"💪🏽 Keep Going!"}
                  </div>
                )}
                <button onClick={submitScore} disabled={!scoreIn||parseInt(scoreIn)<300||parseInt(scoreIn)>850}
                  style={{width:"100%",padding:13,borderRadius:12,border:"none",background:scoreIn&&parseInt(scoreIn)>=300&&parseInt(scoreIn)<=850?"rgba(57,255,20,0.75)":"rgba(255,255,255,0.08)",color:scoreIn&&parseInt(scoreIn)>=300&&parseInt(scoreIn)<=850?"#0a0f0a":B.textDim,fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit",opacity:scoreIn&&parseInt(scoreIn)>=300&&parseInt(scoreIn)<=850?1:0.5}}>
                  Submit to Kris →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {toast&&(
        <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:999,maxWidth:400,width:"calc(100% - 40px)",background:"#131813",border:`1px solid ${B.goldBorderHi}`,borderRadius:18,padding:"14px 18px",boxShadow:"0 8px 40px rgba(0,0,0,0.8)",display:"flex",alignItems:"center",gap:12,animation:"clUp 0.4s ease"}}>
          <div style={{fontSize:24}}>{toast.icon}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:15,color:B.goldLight,marginBottom:3}}>{toast.title}</div>
            <div style={{fontSize:13,color:B.textMuted}}>{toast.body}</div>
          </div>
          <button onClick={()=>setToast(null)} style={{background:"none",border:"none",color:B.goldBorder,cursor:"pointer",fontSize:18}}>✕</button>
        </div>
      )}
    </div>
  );
}
