import { useState, useEffect, useRef } from "react";

// ── SUPABASE CONFIG ───────────────────────────────────────────────────────────
const SUPABASE_URL = "https://wtlasakivblbqaqlgkqo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bGFzYWtpdmJsYnFhcWxna3FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDM1ODIsImV4cCI6MjA5NDUxOTU4Mn0.N67H80w3MfQf7o9gHfLueaRE32lLzljjYcEnkZcb_x8";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
};

const db = {
  getClients: async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/clients?order=created_at.desc`, { headers });
    return res.json();
  },
  addClient: async (row) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
      method: "POST",
      headers: { ...headers, "Prefer": "return=representation" },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  updateClient: async (id, row) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...headers, "Prefer": "return=minimal" },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(await res.text());
  },
  deleteClient: async (id) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${id}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) throw new Error(await res.text());
  },
};

function toRow(c) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone || "",
    join_date: c.joinDate,
    round: c.round || 1,
    is_new: c.isNew !== false,
    notes: c.notes || "",
    scores: c.scores,
    disputes: c.disputes || [],
    bureau_timers: c.bureauTimers || {},
    messages: c.messages || [],
    bureau_accounts: c.bureauAccounts || {},
    score_submissions: c.scoreSubmissions || [],
    notifications: c.notifications || [],
  };
}

function fromRow(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone || "",
    joinDate: r.join_date,
    round: r.round || 1,
    isNew: r.is_new,
    notes: r.notes || "",
    scores: r.scores || { Experian:{start:0,current:0,goal:750}, Equifax:{start:0,current:0,goal:750}, TransUnion:{start:0,current:0,goal:750} },
    disputes: r.disputes || [],
    bureauTimers: r.bureau_timers || { Experian:null, Equifax:null, TransUnion:null },
    messages: r.messages || [],
    bureauAccounts: r.bureau_accounts || { Experian:{username:"",password:""}, Equifax:{username:"",password:""}, TransUnion:{username:"",password:""}, CreditKarma:{username:"",password:""} },
    scoreSubmissions: r.score_submissions || [],
    notifications: r.notifications || [],
  };
}

const ADMIN_PASSWORD = "KRIS-ADMIN";

const B = {
  bg:           "#0a0f0a",
  bgCard:       "#111811",
  gold:         "#D4AF37",
  goldLight:    "#F0CF6B",
  goldBorder:   "rgba(212,175,55,0.22)",
  goldBorderHi: "rgba(212,175,55,0.50)",
  neon:         "#39FF14",
  text:         "#F0EAD8",
  textMuted:    "#8a9a8a",
  textDim:      "#4a5a4a",
  red:          "#ef4444",
  redBg:        "rgba(239,68,68,0.08)",
  redBorder:    "rgba(239,68,68,0.25)",
};

const DISPUTE_STATUSES = ["Pending","In Progress","Resolved","Rejected"];
const BUREAUS = ["Equifax","Experian","TransUnion"];
const ITEM_TYPES = ["Late Payment","Collection","Charge-off","Inquiry","Bankruptcy","Judgment","Repossession","Other"];

const BUREAU_META = {
  Experian:   {color:"#4A90D9",light:"#82B4E8",bg:"rgba(74,144,217,0.08)",  border:"rgba(74,144,217,0.25)",letter:"EX"},
  Equifax:    {color:"#E31837",light:"#F47C8A",bg:"rgba(227,24,55,0.08)",   border:"rgba(227,24,55,0.25)", letter:"EQ"},
  TransUnion: {color:"#1B75BC",light:"#6EB0E0",bg:"rgba(27,117,188,0.08)",  border:"rgba(27,117,188,0.25)",letter:"TU"},
};

function daysRemaining(d){
  if(!d) return null;
  return Math.ceil((new Date(new Date(d).getTime()+30*24*60*60*1000)-new Date())/(1000*60*60*24));
}
function avgScore(scores){
  if(!scores) return 0;
  const v=Object.values(scores).map(s=>s.current).filter(Boolean);
  return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):0;
}
function scoreColor(s){return s>=750?"#39FF14":s>=670?B.goldLight:s>=580?"#f59e0b":B.red;}
function scorePct(s){
  if(!s||s.goal<=s.start) return 0;
  return Math.min(100,Math.max(0,Math.round(((s.current-s.start)/(s.goal-s.start))*100)));
}
function generateCode(name, existing){
  const clean=name.trim().toUpperCase().replace(/[^A-Z]/g,"");
  const prefix=clean.slice(0,4).padEnd(4,"X");
  const used=existing.map(c=>c.id);
  for(let i=1;i<=999;i++){
    const code=`${prefix}${String(i).padStart(3,"0")}`;
    if(!used.includes(code)) return code;
  }
  return `${prefix}001`;
}

const GoldLine=()=>(
  <div style={{display:"flex",alignItems:"center",gap:10,margin:"8px 0"}}>
    <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,transparent,${B.goldBorder})`}}/>
    <div style={{width:3,height:3,borderRadius:"50%",background:B.gold,opacity:0.45}}/>
    <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,${B.goldBorder},transparent)`}}/>
  </div>
);

function Toast({toast,onDismiss}){
  useEffect(()=>{const t=setTimeout(onDismiss,4000);return()=>clearTimeout(t);},[]);
  return(
    <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:999,maxWidth:420,width:"calc(100% - 40px)",background:"#131813",border:`1px solid ${B.goldBorderHi}`,borderRadius:16,padding:"14px 18px",boxShadow:"0 8px 40px rgba(0,0,0,0.8)",display:"flex",alignItems:"center",gap:12,animation:"clUp 0.3s ease"}}>
      <style>{`@keyframes clUp{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes floatGlass{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
      <div style={{fontSize:22}}>{toast.icon}</div>
      <div style={{flex:1,fontSize:14,color:B.text,fontWeight:600}}>{toast.msg}</div>
      <button onClick={onDismiss} style={{background:"none",border:"none",color:B.textMuted,cursor:"pointer",fontSize:16}}>✕</button>
    </div>
  );
}

function BureauScoreCard({bureau,scoreData,onChange}){
  const meta=BUREAU_META[bureau];
  const pct=scorePct(scoreData);
  const gain=(scoreData?.current||0)-(scoreData?.start||0);
  return(
    <div style={{borderRadius:14,border:`1px solid ${meta.border}`,background:meta.bg,padding:"16px 18px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:32,height:32,borderRadius:9,background:`${meta.color}22`,border:`1px solid ${meta.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:meta.light,fontFamily:"'DM Mono',monospace"}}>{meta.letter}</div>
          <div style={{fontSize:14,fontWeight:700,color:B.text}}>{bureau}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:26,fontWeight:800,color:scoreColor(scoreData?.current||0),fontFamily:"'DM Mono',monospace",lineHeight:1,opacity:0.9}}>{scoreData?.current||0}</div>
          {gain!==0&&<div style={{fontSize:11,color:gain>0?B.neon:B.red,fontWeight:600}}>{gain>0?`+${gain}`:gain} pts</div>}
        </div>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{height:5,background:"rgba(255,255,255,0.05)",borderRadius:99,overflow:"hidden"}}>
          <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${meta.color}88,${meta.color})`,borderRadius:99}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:B.textDim,marginTop:3}}>
          <span>Start: {scoreData?.start||0}</span>
          <span style={{color:meta.light}}>{pct}% to goal</span>
          <span>Goal: {scoreData?.goal||750}</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[{l:"Start",k:"start"},{l:"Current",k:"current"},{l:"Goal",k:"goal"}].map(f=>(
          <div key={f.k}>
            <div style={{fontSize:10,fontWeight:600,color:B.textDim,textTransform:"uppercase",letterSpacing:0.8,marginBottom:4}}>{f.l}</div>
            <input type="number" value={scoreData?.[f.k]||""} onChange={e=>onChange(bureau,f.k,parseInt(e.target.value)||0)}
              style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1px solid ${meta.border}`,background:"rgba(0,0,0,0.3)",color:f.k==="current"?scoreColor(scoreData?.current||0):B.text,fontSize:13,fontFamily:"'DM Mono',monospace",fontWeight:700,outline:"none",boxSizing:"border-box",textAlign:"center"}}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddClientModal({onAdd,onClose,existingClients}){
  const [form,setForm]=useState({name:"",email:"",phone:"",code:"",notes:"",exStart:"",exGoal:"750",eqStart:"",eqGoal:"750",tuStart:"",tuGoal:"750"});
  const [codeManual,setCodeManual]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));

  useEffect(()=>{
    if(!codeManual&&form.name.trim().length>=2){
      setForm(p=>({...p,code:generateCode(form.name,existingClients)}));
    }
  },[form.name,codeManual]);

  async function submit(){
    if(!form.name||!form.code||!form.email){setError("Name, email and code are required.");return;}
    setSaving(true);setError("");
    const exS=parseInt(form.exStart)||0;
    const eqS=parseInt(form.eqStart)||0;
    const tuS=parseInt(form.tuStart)||0;
    const client={
      id:form.code.trim().toUpperCase(),
      name:form.name,email:form.email,phone:form.phone,
      joinDate:new Date().toISOString().split("T")[0],
      round:1,isNew:true,notes:form.notes,
      scores:{
        Experian:  {start:exS,current:exS,goal:parseInt(form.exGoal)||750},
        Equifax:   {start:eqS,current:eqS,goal:parseInt(form.eqGoal)||750},
        TransUnion:{start:tuS,current:tuS,goal:parseInt(form.tuGoal)||750},
      },
      disputes:[],
      bureauTimers:{Experian:null,Equifax:null,TransUnion:null},
      messages:[{from:"advisor",text:`Welcome to Credit Lounge, ${form.name.split(" ")[0]}! 🥂 Cheers to good credit — we're on it!`,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})+" · "+new Date().toLocaleDateString([],{month:"short",day:"numeric"})}],
      bureauAccounts:{Experian:{username:"",password:""},Equifax:{username:"",password:""},TransUnion:{username:"",password:""},CreditKarma:{username:"",password:""}},
      scoreSubmissions:[],notifications:[],
    };
    try{
      await onAdd(client);
    } catch(e){
      setError("Error saving. Check your connection and try again.");
      console.error(e);
    }
    setSaving(false);
  }

  const inp={width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${B.goldBorder}`,background:"rgba(0,0,0,0.35)",color:B.text,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"};
  const lbl={display:"block",fontSize:11,fontWeight:600,color:B.textMuted,textTransform:"uppercase",letterSpacing:1,marginBottom:5};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:20}}>
      <div style={{background:B.bgCard,border:`1px solid ${B.goldBorder}`,borderRadius:20,padding:28,width:"100%",maxWidth:540,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:20,fontWeight:700,color:B.text}}>Add New Client</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:B.textMuted,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <GoldLine/>
        <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:14}}>

          <div>
            <label style={lbl}>Full Name *</label>
            <input value={form.name} onChange={e=>f("name",e.target.value)} placeholder="Jane Smith" style={inp}/>
          </div>

          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
              <label style={{...lbl,marginBottom:0}}>Access Code *</label>
              <button onClick={()=>setCodeManual(v=>!v)} style={{fontSize:11,color:B.goldLight,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
                {codeManual?"↩ Auto-generate":"✏️ Edit manually"}
              </button>
            </div>
            <div style={{position:"relative"}}>
              <input
                value={form.code}
                onChange={e=>{setCodeManual(true);f("code",e.target.value.toUpperCase());}}
                readOnly={!codeManual}
                placeholder="Type name above to auto-generate"
                style={{...inp,fontFamily:"'DM Mono',monospace",letterSpacing:3,textTransform:"uppercase",background:codeManual?"rgba(0,0,0,0.35)":"rgba(57,255,20,0.06)",borderColor:codeManual?B.goldBorder:"rgba(57,255,20,0.3)",color:codeManual?B.text:B.neon,fontWeight:700,fontSize:16}}
              />
              {!codeManual&&form.code&&<div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:11,color:B.neon,opacity:0.7}}>auto ✓</div>}
            </div>
            {form.code&&(
              <div style={{marginTop:8,padding:"10px 14px",borderRadius:10,background:"rgba(57,255,20,0.04)",border:"1px solid rgba(57,255,20,0.15)",fontSize:13,color:B.textMuted,lineHeight:1.6}}>
                📱 Tell client: First name + code <span style={{fontFamily:"monospace",color:B.neon,fontWeight:700}}>{form.code}</span>
              </div>
            )}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label style={lbl}>Email *</label><input value={form.email} onChange={e=>f("email",e.target.value)} placeholder="jane@email.com" style={inp}/></div>
            <div><label style={lbl}>Phone</label><input value={form.phone} onChange={e=>f("phone",e.target.value)} placeholder="(555) 000-0000" style={inp}/></div>
          </div>

          <div>
            <div style={{fontSize:14,fontWeight:700,color:B.text,marginBottom:6}}>Starting Bureau Scores</div>
            <GoldLine/>
            <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:12}}>
              {[{bureau:"Experian",sk:"ex"},{bureau:"Equifax",sk:"eq"},{bureau:"TransUnion",sk:"tu"}].map(({bureau,sk})=>{
                const meta=BUREAU_META[bureau];
                return(
                  <div key={bureau} style={{borderRadius:12,border:`1px solid ${meta.border}`,background:meta.bg,padding:"14px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <div style={{width:28,height:28,borderRadius:8,background:`${meta.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:meta.light,fontFamily:"monospace"}}>{meta.letter}</div>
                      <div style={{fontSize:14,fontWeight:700,color:B.text}}>{bureau}</div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <div>
                        <label style={{...lbl,color:meta.light}}>Starting Score</label>
                        <input type="number" value={form[`${sk}Start`]} onChange={e=>f(`${sk}Start`,e.target.value)} placeholder="e.g. 524"
                          style={{...inp,textAlign:"center",fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:15,border:`1px solid ${meta.border}`}}/>
                      </div>
                      <div>
                        <label style={{...lbl,color:meta.light}}>Goal Score</label>
                        <input type="number" value={form[`${sk}Goal`]} onChange={e=>f(`${sk}Goal`,e.target.value)} placeholder="e.g. 750"
                          style={{...inp,textAlign:"center",fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:15,border:`1px solid ${meta.border}`}}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label style={lbl}>Notes</label>
            <textarea value={form.notes} onChange={e=>f("notes",e.target.value)} placeholder="Any initial notes…" rows={3}
              style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${B.goldBorder}`,background:"rgba(0,0,0,0.3)",color:B.text,fontSize:13,outline:"none",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
          </div>

          {error&&<div style={{padding:"10px 14px",borderRadius:10,background:B.redBg,border:`1px solid ${B.redBorder}`,color:"#fca5a5",fontSize:13}}>{error}</div>}

          <button onClick={submit} disabled={saving}
            style={{width:"100%",padding:14,borderRadius:12,border:"none",background:saving?"rgba(255,255,255,0.1)":"rgba(57,255,20,0.75)",color:saving?B.textMuted:"#0a0f0a",fontWeight:800,fontSize:15,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {saving?"⏳ Saving to Supabase...":"✅ Add Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientDetail({client,onBack,onUpdate,onDelete,setToast}){
  const [tab,setTab]           = useState("scores");
  const [scores,setScores]     = useState(client.scores);
  const [disputes,setDisputes] = useState(client.disputes||[]);
  const [timers,setTimers]     = useState(client.bureauTimers||{Experian:null,Equifax:null,TransUnion:null});
  const [notes,setNotes]       = useState(client.notes||"");
  const [round,setRound]       = useState(client.round||1);
  const [messages,setMessages] = useState(client.messages||[]);
  const [msgInput,setMsgInput] = useState("");
  const [showAddDispute,setShowAddDispute]=useState(false);
  const [newDispute,setNewDispute]=useState({creditor:"",bureau:"Equifax",type:"Collection",status:"Pending",filed:new Date().toISOString().split("T")[0]});
  const [showShareCard,setShowShareCard]=useState(false);
  const [saving,setSaving]=useState(false);
  const msgEnd=useRef(null);
  useEffect(()=>{msgEnd.current?.scrollIntoView({behavior:"smooth"});},[messages,tab]);

  function updateScore(bureau,key,val){setScores(prev=>({...prev,[bureau]:{...prev[bureau],[key]:val}}));}

  async function save(){
    setSaving(true);
    try{
      await onUpdate({...client,scores,disputes,bureauTimers:timers,notes,round,messages});
      setToast({icon:"✅",msg:`${client.name} saved!`});
    } catch(e){
      setToast({icon:"❌",msg:"Error saving. Try again."});
    }
    setSaving(false);
  }

  function updateDisputeStatus(id,status){
    setDisputes(prev=>prev.map(d=>d.id===id?{...d,status,resolvedDate:status==="Resolved"?new Date().toISOString().split("T")[0]:null}:d));
  }
  function addDispute(){
    if(!newDispute.creditor) return;
    setDisputes(prev=>[...prev,{...newDispute,id:Date.now(),resolvedDate:null}]);
    setNewDispute({creditor:"",bureau:"Equifax",type:"Collection",status:"Pending",filed:new Date().toISOString().split("T")[0]});
    setShowAddDispute(false);
    setToast({icon:"📋",msg:"Dispute added — tap Save!"});
  }
  function sendMessage(){
    if(!msgInput.trim()) return;
    const now=new Date();
    const time=now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})+" · "+now.toLocaleDateString([],{month:"short",day:"numeric"});
    setMessages(prev=>[...prev,{from:"advisor",text:msgInput.trim(),time}]);
    setMsgInput("");
  }

  const statusMeta={
    "Resolved":    {color:"#39FF14",bg:"rgba(57,255,20,0.07)",   border:"rgba(57,255,20,0.2)", icon:"✓"},
    "In Progress": {color:B.goldLight,bg:"rgba(212,175,55,0.08)",border:"rgba(212,175,55,0.22)",icon:"↻"},
    "Pending":     {color:B.textMuted,bg:"rgba(138,154,138,0.08)",border:"rgba(138,154,138,0.2)",icon:"○"},
    "Rejected":    {color:B.red,bg:B.redBg,border:B.redBorder,icon:"✕"},
  };
  const inp2={width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${B.goldBorder}`,background:"rgba(0,0,0,0.3)",color:B.text,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"};

  return(
    <div>
      <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={onBack} style={{padding:"8px 16px",borderRadius:10,border:`1px solid ${B.goldBorder}`,background:"transparent",color:B.textMuted,fontSize:13,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>← Back</button>
        <div style={{flex:1}}>
          <div style={{fontSize:22,fontWeight:700,color:B.text}}>{client.name}</div>
          <div style={{fontSize:12,color:B.textMuted,marginTop:2}}>{client.email} · {client.phone}</div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4,flexWrap:"wrap"}}>
            <span style={{fontFamily:"'DM Mono',monospace",color:B.neon,fontWeight:700,fontSize:13,background:"rgba(57,255,20,0.08)",padding:"2px 10px",borderRadius:6,border:"1px solid rgba(57,255,20,0.2)"}}>{client.id}</span>
            <button onClick={()=>setShowShareCard(v=>!v)} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:`1px solid ${B.goldBorder}`,background:"transparent",color:B.goldLight,cursor:"pointer",fontFamily:"inherit"}}>📤 Share Login</button>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexShrink:0}}>
          <select value={round} onChange={e=>setRound(parseInt(e.target.value))}
            style={{padding:"8px 12px",borderRadius:10,border:`1px solid ${B.goldBorder}`,background:"rgba(0,0,0,0.3)",color:B.goldLight,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",outline:"none"}}>
            <option value={1}>Round 1</option><option value={2}>Round 2</option><option value={3}>Round 3</option>
          </select>
          <button onClick={()=>{if(window.confirm(`Delete ${client.name}?`))onDelete(client.id);}}
            style={{padding:"8px 14px",borderRadius:10,border:`1px solid ${B.redBorder}`,background:"transparent",color:B.red,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>🗑</button>
        </div>
      </div>

      {showShareCard&&(
        <div style={{marginBottom:16,padding:"16px 18px",borderRadius:14,background:"rgba(57,255,20,0.05)",border:"1px solid rgba(57,255,20,0.25)"}}>
          <div style={{fontSize:13,fontWeight:700,color:B.neon,marginBottom:10,opacity:0.85}}>📱 Client Login — Copy & Send</div>
          <div style={{fontFamily:"monospace",fontSize:13,color:B.text,lineHeight:2,background:"rgba(0,0,0,0.3)",padding:"12px 14px",borderRadius:10,border:`1px solid ${B.goldBorder}`}}>
            Hey {client.name.split(" ")[0]}! Your Credit Lounge portal is ready 🥂{"\n"}
            First Name: <strong>{client.name.split(" ")[0]}</strong>{"\n"}
            Access Code: <strong style={{color:B.neon}}>{client.id}</strong>{"\n"}
            Hours: Mon–Fri 10:30AM–4:30PM
          </div>
          <button onClick={()=>{
            navigator.clipboard.writeText(`Hey ${client.name.split(" ")[0]}! Your Credit Lounge portal is ready 🥂\nFirst Name: ${client.name.split(" ")[0]}\nAccess Code: ${client.id}\nHours: Mon–Fri 10:30AM–4:30PM`);
            setToast({icon:"📋",msg:"Copied!"});
          }} style={{marginTop:10,width:"100%",padding:"10px",borderRadius:10,border:"none",background:"rgba(57,255,20,0.15)",color:B.neon,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            📋 Copy Message
          </button>
        </div>
      )}

      <div style={{background:B.bgCard,border:"1px solid rgba(57,255,20,0.18)",borderRadius:14,padding:"14px 20px",marginBottom:16,display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:10,color:B.textDim,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Avg</div>
          <div style={{fontSize:36,fontWeight:800,color:B.neon,fontFamily:"'DM Mono',monospace",lineHeight:1,opacity:0.88}}>{avgScore(scores)}</div>
        </div>
        <div style={{flex:1,display:"flex",gap:14,flexWrap:"wrap"}}>
          {BUREAUS.map(b=>{
            const s=scores[b];const meta=BUREAU_META[b];
            return(
              <div key={b} style={{textAlign:"center",flex:1}}>
                <div style={{fontSize:10,color:meta.light,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{meta.letter}</div>
                <div style={{fontSize:20,fontWeight:800,color:scoreColor(s?.current||0),fontFamily:"'DM Mono',monospace",opacity:0.9}}>{s?.current||"—"}</div>
                <div style={{fontSize:10,color:(s?.current||0)>(s?.start||0)?B.neon:B.red}}>{(s?.current||0)>(s?.start||0)?`+${(s?.current||0)-(s?.start||0)}`:(s?.current||0)-(s?.start||0)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:18}}>
        {[{id:"scores",label:"📊 Scores"},{id:"disputes",label:"📋 Disputes"},{id:"timers",label:"⏱️ Timers"},{id:"messages",label:"💬 Messages"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"10px 4px",borderRadius:10,border:`1px solid ${tab===t.id?"rgba(57,255,20,0.4)":"rgba(255,255,255,0.07)"}`,background:tab===t.id?"rgba(57,255,20,0.08)":"rgba(255,255,255,0.02)",color:tab===t.id?B.neon:B.textMuted,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="scores"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {BUREAUS.map(bureau=>(
            <BureauScoreCard key={bureau} bureau={bureau} scoreData={scores[bureau]||{start:0,current:0,goal:750}} onChange={updateScore}/>
          ))}
          <div style={{background:B.bgCard,border:`1px solid ${B.goldBorder}`,borderRadius:14,padding:"16px 18px"}}>
            <div style={{fontSize:13,fontWeight:700,color:B.text,marginBottom:8}}>Client Notes</div>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Notes…"
              style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${B.goldBorder}`,background:"rgba(0,0,0,0.3)",color:B.text,fontSize:13,outline:"none",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",lineHeight:1.6}}/>
          </div>
          <button onClick={save} disabled={saving} style={{width:"100%",padding:13,borderRadius:12,border:"none",background:saving?"rgba(255,255,255,0.1)":"rgba(57,255,20,0.75)",color:saving?B.textMuted:"#0a0f0a",fontWeight:800,fontSize:15,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {saving?"⏳ Saving...":"💾 Save All Changes"}
          </button>
        </div>
      )}

      {tab==="disputes"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:15,fontWeight:700,color:B.text}}>Disputes ({disputes.length})</div>
            <button onClick={()=>setShowAddDispute(true)} style={{padding:"9px 16px",borderRadius:10,border:"none",background:"rgba(57,255,20,0.75)",color:"#0a0f0a",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>+ Add</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {disputes.map(d=>{
              const meta=statusMeta[d.status]||statusMeta["Pending"];
              const bm=BUREAU_META[d.bureau]||{light:B.goldLight,bg:"rgba(212,175,55,0.08)",border:B.goldBorder};
              return(
                <div key={d.id} style={{background:B.bgCard,border:`1px solid ${d.status==="Resolved"?"rgba(57,255,20,0.22)":B.goldBorder}`,borderRadius:14,padding:"14px 16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:700,color:B.text,marginBottom:5}}>{d.creditor}</div>
                      <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:6}}>
                        <span style={{fontSize:11,padding:"2px 9px",borderRadius:99,background:bm.bg,color:bm.light,fontWeight:600,border:`1px solid ${bm.border}`}}>{d.bureau}</span>
                        <span style={{fontSize:11,padding:"2px 9px",borderRadius:99,background:"rgba(255,255,255,0.04)",color:B.textMuted,fontWeight:600,border:"1px solid rgba(255,255,255,0.08)"}}>{d.type}</span>
                      </div>
                      <div style={{fontSize:11,color:B.textDim}}>Filed {d.filed}{d.resolvedDate?` · Resolved ${d.resolvedDate}`:""}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:7,alignItems:"flex-end"}}>
                      <select value={d.status} onChange={e=>updateDisputeStatus(d.id,e.target.value)}
                        style={{padding:"5px 9px",borderRadius:99,border:`1px solid ${meta.border}`,background:meta.bg,color:meta.color,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",outline:"none"}}>
                        {DISPUTE_STATUSES.map(s=><option key={s}>{s}</option>)}
                      </select>
                      <button onClick={()=>setDisputes(prev=>prev.filter(x=>x.id!==d.id))}
                        style={{padding:"3px 9px",borderRadius:7,border:`1px solid ${B.redBorder}`,background:"transparent",color:B.red,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Remove</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {disputes.length===0&&<div style={{textAlign:"center",padding:"32px",color:B.textDim,fontSize:13,background:B.bgCard,borderRadius:14,border:`1px solid ${B.goldBorder}`}}>No disputes yet.</div>}
          </div>
          <button onClick={save} disabled={saving} style={{width:"100%",padding:12,borderRadius:12,border:"none",background:saving?"rgba(255,255,255,0.1)":"rgba(57,255,20,0.75)",color:saving?B.textMuted:"#0a0f0a",fontWeight:800,fontSize:14,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",marginTop:14}}>
            {saving?"⏳ Saving...":"💾 Save"}
          </button>
          {showAddDispute&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:60,padding:20}}>
              <div style={{background:B.bgCard,border:`1px solid ${B.goldBorder}`,borderRadius:20,padding:24,width:"100%",maxWidth:420}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:17,fontWeight:700,color:B.text}}>Add Dispute</div>
                  <button onClick={()=>setShowAddDispute(false)} style={{background:"none",border:"none",color:B.textMuted,fontSize:20,cursor:"pointer"}}>✕</button>
                </div>
                <GoldLine/>
                <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:11}}>
                  <div><label style={{display:"block",fontSize:11,fontWeight:600,color:B.textMuted,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Creditor</label><input value={newDispute.creditor} onChange={e=>setNewDispute(p=>({...p,creditor:e.target.value}))} placeholder="e.g. Capital One" style={inp2}/></div>
                  <div><label style={{display:"block",fontSize:11,fontWeight:600,color:B.textMuted,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Date Filed</label><input type="date" value={newDispute.filed} onChange={e=>setNewDispute(p=>({...p,filed:e.target.value}))} style={inp2}/></div>
                  {[{l:"Bureau",k:"bureau",opts:BUREAUS},{l:"Item Type",k:"type",opts:ITEM_TYPES},{l:"Status",k:"status",opts:DISPUTE_STATUSES}].map(fi=>(
                    <div key={fi.k}>
                      <label style={{display:"block",fontSize:11,fontWeight:600,color:B.textMuted,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{fi.l}</label>
                      <select value={newDispute[fi.k]} onChange={e=>setNewDispute(p=>({...p,[fi.k]:e.target.value}))} style={{...inp2,cursor:"pointer"}}>{fi.opts.map(o=><option key={o}>{o}</option>)}</select>
                    </div>
                  ))}
                  <button onClick={addDispute} style={{width:"100%",padding:12,borderRadius:12,border:"none",background:"rgba(57,255,20,0.75)",color:"#0a0f0a",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Add Dispute</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab==="timers"&&(
        <div>
          <div style={{marginBottom:14,padding:"12px 14px",borderRadius:12,background:"rgba(57,255,20,0.03)",border:"1px solid rgba(57,255,20,0.12)",fontSize:13,color:B.textMuted,lineHeight:1.6}}>
            ⏱️ Set the filing date per bureau. The 30-day countdown shows in the client's portal.
          </div>
          {BUREAUS.map(bureau=>{
            const meta=BUREAU_META[bureau];
            const days=daysRemaining(timers[bureau]);
            const isDone=days!==null&&days<=0;
            const isActive=days!==null&&days>0;
            return(
              <div key={bureau} style={{background:B.bgCard,border:`1px solid ${isDone?B.redBorder:meta.border}`,borderRadius:14,padding:"16px 18px",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:30,height:30,borderRadius:9,background:`${meta.color}22`,border:`1px solid ${meta.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:meta.light,fontFamily:"monospace"}}>{meta.letter}</div>
                    <div style={{fontSize:14,fontWeight:700,color:B.text}}>{bureau}</div>
                  </div>
                  {isActive&&<div style={{padding:"4px 12px",borderRadius:99,background:"rgba(57,255,20,0.08)",border:"1px solid rgba(57,255,20,0.2)",fontSize:13,fontWeight:700,color:B.neon,opacity:0.88}}>{days} days left</div>}
                  {isDone&&<div style={{padding:"4px 12px",borderRadius:99,background:B.redBg,border:`1px solid ${B.redBorder}`,fontSize:12,fontWeight:700,color:B.red}}>⏰ Time's Up</div>}
                  {!timers[bureau]&&<div style={{fontSize:12,color:B.textDim,fontStyle:"italic"}}>Not started</div>}
                </div>
                {timers[bureau]&&(
                  <div style={{height:6,background:"rgba(255,255,255,0.05)",borderRadius:99,overflow:"hidden",marginBottom:10}}>
                    <div style={{width:`${isDone?100:Math.round((1-days/30)*100)}%`,height:"100%",background:isDone?`linear-gradient(90deg,${B.red},#dc2626)`:days<=5?"linear-gradient(90deg,#f59e0b,#d97706)":`linear-gradient(90deg,${meta.color}88,${meta.color})`,borderRadius:99}}/>
                  </div>
                )}
                <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
                  <div style={{flex:1}}>
                    <label style={{display:"block",fontSize:11,fontWeight:600,color:meta.light,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Filing Date</label>
                    <input type="date" value={timers[bureau]||""} onChange={e=>setTimers(p=>({...p,[bureau]:e.target.value||null}))} style={{...inp2,border:`1px solid ${meta.border}`,fontSize:13}}/>
                  </div>
                  {timers[bureau]&&<button onClick={()=>setTimers(p=>({...p,[bureau]:null}))} style={{padding:"9px 12px",borderRadius:9,border:`1px solid ${B.redBorder}`,background:"transparent",color:B.red,fontSize:12,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>Clear</button>}
                </div>
              </div>
            );
          })}
          <button onClick={save} disabled={saving} style={{width:"100%",padding:12,borderRadius:12,border:"none",background:saving?"rgba(255,255,255,0.1)":"rgba(57,255,20,0.75)",color:saving?B.textMuted:"#0a0f0a",fontWeight:800,fontSize:14,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {saving?"⏳ Saving...":"💾 Save Timer Dates"}
          </button>
        </div>
      )}

      {tab==="messages"&&(
        <div style={{background:B.bgCard,border:`1px solid ${B.goldBorder}`,borderRadius:16,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${B.goldBorder}`}}>
            <div style={{fontSize:15,fontWeight:700,color:B.text}}>Chat with {client.name.split(" ")[0]}</div>
            <div style={{fontSize:12,color:B.textDim,marginTop:2}}>Tap Send to save to database</div>
          </div>
          <div style={{padding:"14px 16px",overflowY:"auto",display:"flex",flexDirection:"column",gap:12,maxHeight:400}}>
            {messages.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.from==="advisor"?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"80%"}}>
                  {m.from==="client"&&<div style={{fontSize:11,color:B.textMuted,marginBottom:4,paddingLeft:4}}>{client.name.split(" ")[0]}</div>}
                  {m.from==="advisor"&&<div style={{fontSize:11,color:B.neon,marginBottom:4,paddingRight:4,textAlign:"right",opacity:0.7}}>Kris</div>}
                  <div style={{padding:"10px 14px",borderRadius:m.from==="advisor"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.from==="advisor"?"rgba(57,255,20,0.12)":"rgba(255,255,255,0.05)",border:m.from==="advisor"?"1px solid rgba(57,255,20,0.25)":`1px solid ${B.goldBorder}`,color:B.text,fontSize:14,lineHeight:1.5}}>
                    {m.text}
                  </div>
                  <div style={{fontSize:11,color:B.textDim,marginTop:4,textAlign:m.from==="advisor"?"right":"left"}}>{m.time}</div>
                </div>
              </div>
            ))}
            <div ref={msgEnd}/>
          </div>
          <div style={{padding:"12px 14px",borderTop:`1px solid ${B.goldBorder}`,display:"flex",gap:10}}>
            <input value={msgInput} onChange={e=>setMsgInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder={`Message ${client.name.split(" ")[0]}…`}
              style={{flex:1,padding:"10px 12px",borderRadius:10,border:`1px solid ${B.goldBorder}`,background:"rgba(0,0,0,0.3)",color:B.text,fontSize:14,outline:"none",fontFamily:"inherit"}}/>
            <button onClick={async()=>{sendMessage();setTimeout(()=>save(),300);}} style={{padding:"10px 18px",borderRadius:10,border:"none",background:"rgba(57,255,20,0.7)",color:"#0a0f0a",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreditLoungeAdmin(){
  const [screen,setScreen]    = useState("login");
  const [password,setPassword]= useState("");
  const [pwError,setPwError]  = useState("");
  const [clients,setClients]  = useState([]);
  const [loading,setLoading]  = useState(false);
  const [selected,setSelected]= useState(null);
  const [showAdd,setShowAdd]  = useState(false);
  const [search,setSearch]    = useState("");
  const [toast,setToast]      = useState(null);
  const [dbStatus,setDbStatus]= useState("connecting");

  async function loadClients(){
    setLoading(true);
    try{
      const rows=await db.getClients();
      setClients(rows.map(fromRow));
      setDbStatus("connected");
    } catch(e){
      setDbStatus("error");
      setToast({icon:"❌",msg:"Cannot connect to database."});
    }
    setLoading(false);
  }

  function login(){
    if(password.trim().toUpperCase()===ADMIN_PASSWORD){
      setScreen("admin");setPwError("");loadClients();
    } else setPwError("Incorrect password.");
  }

  async function addClient(c){
    await db.addClient(toRow(c));
    setClients(prev=>[c,...prev]);
    setShowAdd(false);
    setToast({icon:"✅",msg:`${c.name} added! Code: ${c.id}`});
  }

  async function updateClient(c){
    await db.updateClient(c.id,toRow(c));
    setClients(prev=>prev.map(x=>x.id===c.id?c:x));
    setSelected(c);
  }

  async function deleteClient(id){
    await db.deleteClient(id);
    setClients(prev=>prev.filter(c=>c.id!==id));
    setSelected(null);
    setToast({icon:"🗑",msg:"Client removed."});
  }

  const filtered=clients.filter(c=>
    c.name?.toLowerCase().includes(search.toLowerCase())||
    c.email?.toLowerCase().includes(search.toLowerCase())||
    c.id?.toLowerCase().includes(search.toLowerCase())
  );

  const totalResolved=clients.reduce((a,c)=>a+(c.disputes||[]).filter(d=>d.status==="Resolved").length,0);
  const totalDisputes=clients.reduce((a,c)=>a+(c.disputes||[]).length,0);
  const overallAvg=clients.length?Math.round(clients.reduce((a,c)=>a+avgScore(c.scores),0)/clients.length):0;
  const timersDue=clients.reduce((a,c)=>a+BUREAUS.filter(b=>{const d=daysRemaining(c.bureauTimers?.[b]);return d!==null&&d<=0;}).length,0);

  const card={background:B.bgCard,border:`1px solid ${B.goldBorder}`,borderRadius:16};

  if(screen==="login") return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0a0f0a,#0d150d,#080f08)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Outfit',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
      <style>{`*{box-sizing:border-box;}input{color:#F0EAD8!important;}input::placeholder{color:#4a5a4a;}@keyframes floatGlass{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes clUp{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}`}</style>
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{fontSize:52,animation:"floatGlass 3s ease-in-out infinite",display:"inline-block",marginBottom:14}}>🥂</div>
        <div style={{fontSize:32,fontWeight:900,color:"#fff",letterSpacing:4,textTransform:"uppercase",lineHeight:1,marginBottom:8}}>CREDIT LOUNGE</div>
        <div style={{fontSize:14,color:B.gold,letterSpacing:2,marginBottom:4}}>Admin Dashboard</div>
        <div style={{fontSize:12,color:B.textMuted}}>by Kris</div>
      </div>
      <div style={{...card,padding:30,width:"100%",maxWidth:400}}>
        <div style={{fontSize:19,fontWeight:700,color:B.text,marginBottom:6}}>Admin Login</div>
        <GoldLine/>
        <div style={{marginTop:18}}>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:B.textMuted,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter admin password" onKeyDown={e=>e.key==="Enter"&&login()}
            style={{width:"100%",padding:"13px 16px",borderRadius:12,border:`1px solid ${B.goldBorder}`,background:"rgba(0,0,0,0.4)",fontSize:16,outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:14}}/>
          {pwError&&<div style={{marginBottom:14,padding:"10px 14px",borderRadius:10,background:B.redBg,border:`1px solid ${B.redBorder}`,color:"#fca5a5",fontSize:13}}>{pwError}</div>}
          <button onClick={login} style={{width:"100%",padding:14,borderRadius:12,border:"none",background:"rgba(57,255,20,0.75)",color:"#0a0f0a",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>
            Enter Admin Dashboard →
          </button>
        </div>
        <div style={{marginTop:14,padding:"10px 14px",borderRadius:10,background:"rgba(212,175,55,0.04)",border:`1px solid ${B.goldBorder}`,fontSize:12,color:B.textDim}}>
          Password: <span style={{fontFamily:"monospace",color:B.textMuted}}>KRIS-ADMIN</span>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0a0f0a,#0d150d,#080f08)",color:B.text,fontFamily:"'Outfit',sans-serif",display:"flex",flexDirection:"column"}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
      <style>{`*{box-sizing:border-box;}input::placeholder{color:${B.textDim};}select option{background:#111811;color:#F0EAD8;}::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:rgba(57,255,20,0.2);border-radius:2px;}@keyframes floatGlass{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}@keyframes clUp{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{background:"rgba(10,15,10,0.97)",borderBottom:"1px solid rgba(57,255,20,0.15)",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:24,animation:"floatGlass 3.5s ease-in-out infinite"}}>🥂</div>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:B.text,letterSpacing:2,textTransform:"uppercase",lineHeight:1}}>Credit Lounge</div>
            <div style={{fontSize:10,letterSpacing:1.5,marginTop:2,color:dbStatus==="connected"?B.neon:dbStatus==="error"?B.red:B.gold,opacity:0.85}}>
              {dbStatus==="connected"?"● Supabase Connected":dbStatus==="error"?"● Connection Error":"● Connecting..."}
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {timersDue>0&&<div style={{padding:"5px 12px",borderRadius:99,background:B.redBg,border:`1px solid ${B.redBorder}`,fontSize:12,fontWeight:700,color:B.red}}>⏰ {timersDue} due</div>}
          <button onClick={loadClients} style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${B.goldBorder}`,background:"transparent",color:B.goldLight,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>🔄 Refresh</button>
          <button onClick={()=>setScreen("login")} style={{padding:"7px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:B.textMuted,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Sign Out</button>
        </div>
      </div>

      <div style={{maxWidth:780,width:"100%",margin:"0 auto",padding:"24px 20px 60px"}}>
        {loading?(
          <div style={{textAlign:"center",padding:"80px 20px",color:B.textMuted}}>
            <div style={{fontSize:36,marginBottom:16,display:"inline-block",animation:"spin 1s linear infinite"}}>⏳</div>
            <div style={{fontSize:16,fontWeight:600}}>Loading from Supabase...</div>
          </div>
        ):!selected?(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
              {[
                {label:"Clients",  value:clients.length,  color:B.neon},
                {label:"Disputes", value:totalDisputes,   color:B.goldLight},
                {label:"Resolved", value:totalResolved,   color:B.neon},
                {label:"Avg Score",value:overallAvg||"—", color:B.goldLight},
              ].map(s=>(
                <div key={s.label} style={{...card,padding:"16px 18px"}}>
                  <div style={{fontSize:10,fontWeight:600,color:B.textMuted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>{s.label}</div>
                  <div style={{fontSize:28,fontWeight:800,color:s.color,fontFamily:"'DM Mono',monospace",opacity:0.88,lineHeight:1}}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search by name, email, or code…"
                style={{flex:1,minWidth:200,padding:"11px 16px",borderRadius:12,border:`1px solid ${B.goldBorder}`,background:"rgba(0,0,0,0.3)",color:B.text,fontSize:14,outline:"none",fontFamily:"inherit"}}/>
              <button onClick={()=>setShowAdd(true)} style={{padding:"11px 20px",borderRadius:12,border:"none",background:"rgba(57,255,20,0.75)",color:"#0a0f0a",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>+ Add Client</button>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {filtered.length===0&&!loading&&(
                <div style={{textAlign:"center",padding:"50px 20px",color:B.textDim,fontSize:14,...card}}>
                  <div style={{fontSize:36,marginBottom:12}}>👤</div>
                  No clients yet. Tap "+ Add Client" to get started.
                </div>
              )}
              {filtered.map(c=>{
                const timerAlerts=BUREAUS.filter(b=>{const d=daysRemaining(c.bureauTimers?.[b]);return d!==null&&d<=0;});
                return(
                  <div key={c.id} onClick={()=>setSelected(c)} style={{...card,padding:"16px 20px",cursor:"pointer"}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(57,255,20,0.4)"}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=B.goldBorder}>
                    <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                      <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(57,255,20,0.1)",border:"2px solid rgba(57,255,20,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:B.neon,flexShrink:0}}>
                        {c.name?.charAt(0)||"?"}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                          <div style={{fontSize:16,fontWeight:700,color:B.text}}>{c.name}</div>
                          <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:B.neon,background:"rgba(57,255,20,0.08)",padding:"2px 8px",borderRadius:6,border:"1px solid rgba(57,255,20,0.2)",fontWeight:700}}>{c.id}</div>
                          <div style={{fontSize:11,color:B.textMuted}}>R{c.round}/3</div>
                          {timerAlerts.length>0&&<div style={{fontSize:11,color:B.red,background:B.redBg,padding:"2px 8px",borderRadius:6,border:`1px solid ${B.redBorder}`,fontWeight:600}}>⏰ {timerAlerts.join(", ")}</div>}
                        </div>
                        <div style={{fontSize:12,color:B.textMuted,marginBottom:6}}>{c.email}</div>
                        <div style={{display:"flex",gap:14}}>
                          {BUREAUS.map(b=>{
                            const s=c.scores?.[b];const meta=BUREAU_META[b];
                            return s?(
                              <div key={b} style={{display:"flex",alignItems:"center",gap:5}}>
                                <span style={{fontSize:10,fontWeight:700,color:meta.light,fontFamily:"monospace"}}>{meta.letter}</span>
                                <span style={{fontSize:14,fontWeight:800,color:scoreColor(s.current),fontFamily:"'DM Mono',monospace",opacity:0.9}}>{s.current}</span>
                                <span style={{fontSize:10,color:s.current>s.start?B.neon:B.red,fontWeight:600}}>{s.current>s.start?`+${s.current-s.start}`:s.current-s.start}</span>
                              </div>
                            ):null;
                          })}
                        </div>
                      </div>
                      <div style={{textAlign:"center",flexShrink:0}}>
                        <div style={{fontSize:20,fontWeight:800,color:B.goldLight,fontFamily:"'DM Mono',monospace"}}>{(c.disputes||[]).filter(d=>d.status==="Resolved").length}/{(c.disputes||[]).length}</div>
                        <div style={{fontSize:10,color:B.textDim}}>Resolved</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ):(
          <ClientDetail client={selected} onBack={()=>setSelected(null)} onUpdate={updateClient} onDelete={deleteClient} setToast={setToast}/>
        )}

        <div style={{textAlign:"center",marginTop:28,fontSize:12,color:B.textDim}}>
          <GoldLine/>
          <div style={{marginTop:10}}>© 2026 Credit Lounge Admin · Powered by Supabase</div>
        </div>
      </div>

      {showAdd&&<AddClientModal onAdd={addClient} onClose={()=>setShowAdd(false)} existingClients={clients}/>}
      {toast&&<Toast toast={toast} onDismiss={()=>setToast(null)}/>}
    </div>
  );
}

function toRow(c){
  return {
    id:c.id, name:c.name, email:c.email, phone:c.phone||"",
    join_date:c.joinDate, round:c.round||1, is_new:c.isNew!==false,
    notes:c.notes||"", scores:c.scores, disputes:c.disputes||[],
    bureau_timers:c.bureauTimers||{}, messages:c.messages||[],
    bureau_accounts:c.bureauAccounts||{}, score_submissions:c.scoreSubmissions||[],
    notifications:c.notifications||[],
  };
}
