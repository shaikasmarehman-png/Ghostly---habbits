import { useState, useEffect, useRef, useCallback } from "react";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg0: "#0d0520", bg1: "#1a0a35", bg2: "#2a1155",
  purple: "#9b5de5", pink: "#f72585", cyan: "#00f5d4",
  yellow: "#fee440", orange: "#f15025", white: "#ffffff",
  ghostGood: "#b8f0e6", ghostBad: "#ff6b9d", ghostRare: "#ffe66d",
};

// ── Ghost types per level group ──────────────────────────────────────────────
const GHOST_DEFS = [
  { id:"sleepy",  emoji:"😴", name:"Snooze Ghost",   color:"#a8dadc", habit:"Sleep early",    pts:10, spd:1.2, rare:false },
  { id:"junk",    emoji:"🍟", name:"Junk Ghost",      color:"#ff6b6b", habit:"Skip junk food", pts:15, spd:1.5, rare:false },
  { id:"lazy",    emoji:"🛋️", name:"Couch Ghost",     color:"#ffd166", habit:"Exercise daily", pts:20, spd:1.8, rare:false },
  { id:"phone",   emoji:"📱", name:"Scroll Ghost",    color:"#ef476f", habit:"Less screen time",pts:25,spd:2.0, rare:false },
  { id:"water",   emoji:"💧", name:"Thirsty Ghost",   color:"#118ab2", habit:"Drink water",    pts:30, spd:2.2, rare:false },
  { id:"grumpy",  emoji:"😤", name:"Grumpy Ghost",    color:"#ff9f1c", habit:"Stay positive",  pts:35, spd:2.5, rare:false },
  { id:"night",   emoji:"🌙", name:"Night Owl Ghost", color:"#7b2d8b", habit:"Early to bed",   pts:40, spd:2.8, rare:false },
  { id:"sugar",   emoji:"🍬", name:"Sugar Ghost",     color:"#ff99c8", habit:"Cut sugar",      pts:45, spd:3.0, rare:false },
  { id:"star",    emoji:"⭐", name:"Star Ghost",      color:"#fee440", habit:"BONUS!",         pts:100,spd:3.5, rare:true  },
];

const LEVELS = [
  { num:1, title:"Haunted Bedroom",   bg:"🛏️",  ghostTypes:["sleepy","lazy"],                        quota:5,  timeLimit:20, hint:"Tap ghosts fast!" },
  { num:2, title:"Spooky Kitchen",    bg:"🍳",  ghostTypes:["junk","sugar","sleepy"],               quota:7,  timeLimit:22, hint:"Watch out — they speed up!" },
  { num:3, title:"Phantom Gym",       bg:"🏋️",  ghostTypes:["lazy","phone","water"],                quota:9,  timeLimit:20, hint:"Star ghosts give bonus points!" },
  { num:4, title:"Digital Dungeon",   bg:"💻",  ghostTypes:["phone","night","grumpy"],              quota:11, timeLimit:18, hint:"Miss 3 and you lose!" },
  { num:5, title:"Sugar Castle",      bg:"🏰",  ghostTypes:["sugar","junk","grumpy","star"],        quota:13, timeLimit:17, hint:"Rare stars appear — catch them!" },
  { num:6, title:"Midnight Swamp",    bg:"🌿",  ghostTypes:["night","sleepy","water","phone"],      quota:15, timeLimit:16, hint:"Getting spooky in here..." },
  { num:7, title:"Shadow Carnival",   bg:"🎪",  ghostTypes:["grumpy","lazy","sugar","star"],        quota:17, timeLimit:15, hint:"Almost there, ghost hero!" },
  { num:8, title:"Ghost Realm",       bg:"👑",  ghostTypes:["sleepy","junk","lazy","phone","water","grumpy","night","sugar","star"], quota:20, timeLimit:14, hint:"Final showdown! Catch them all!" },
];

const REWARDS = [
  { level:1, badge:"🥉", title:"Habit Rookie",    msg:"You caught your first ghosts!" },
  { level:2, badge:"🥈", title:"Ghost Chaser",    msg:"Kitchen cleared of bad habits!" },
  { level:3, badge:"🏅", title:"Gym Spirit",      msg:"Exercise habits haunt no more!" },
  { level:4, badge:"🥇", title:"Screen Slayer",   msg:"You beat the Digital Dungeon!" },
  { level:5, badge:"💎", title:"Sugar Crusher",   msg:"Sweet victory over bad habits!" },
  { level:6, badge:"🌟", title:"Midnight Hero",   msg:"You tamed the Midnight Swamp!" },
  { level:7, badge:"👻", title:"Ghost Whisperer", msg:"Carnival of habits defeated!" },
  { level:8, badge:"👑", title:"GHOST MASTER",    msg:"You mastered all ghostly habits!" },
];

let gid = 0;
function makeGhost(levelDef, frameW, frameH) {
  const pool = levelDef.ghostTypes;
  // occasionally spawn rare star
  const typeId = Math.random() < 0.08 ? "star" : pool[Math.floor(Math.random()*pool.length)];
  const def = GHOST_DEFS.find(g => g.id === typeId) || GHOST_DEFS[0];
  const size = def.rare ? 52 : 38 + Math.random()*14;
  const x = size + Math.random() * (frameW - size*2);
  const y = size + Math.random() * (frameH * 0.7);
  const angle = Math.random() * Math.PI * 2;
  const speed = def.spd * (0.8 + Math.random()*0.5);
  return {
    id: gid++, def, x, y, size,
    vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
    wobble: Math.random()*Math.PI*2, wobbleSpd: 2+Math.random()*2,
    alpha: 1, popping: false, popFrame: 0,
    spawnTime: Date.now(), lifespan: 3500 - levelDef.num * 150,
    caught: false, missed: false,
    floatOff: Math.random()*Math.PI*2,
  };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("title"); // title | game | reward | gameover
  const [levelIdx, setLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [caught, setCaught] = useState(0);
  const [missed, setMissed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [ghosts, setGhosts] = useState([]);
  const [popups, setPopups] = useState([]);
  const [stars, setStars] = useState([]);
  const [heroWobble, setHeroWobble] = useState(0);
  const [heroExcited, setHeroExcited] = useState(false);
  const [unlocked, setUnlocked] = useState([]);
  const [showHabit, setShowHabit] = useState(null);
  const [bgStars] = useState(() => Array.from({length:30},(_,i)=>({
    x:Math.random()*100, y:Math.random()*100,
    size:1+Math.random()*2, delay:Math.random()*3, dur:2+Math.random()*2
  })));

  const frameRef = useRef(null);
  const timerRef = useRef(null);
  const spawnRef = useRef(null);
  const caughtRef = useRef(0);
  const missedRef = useRef(0);
  const ghostsRef = useRef([]);
  const popupsRef = useRef([]);

  const level = LEVELS[levelIdx];

  // sync refs
  useEffect(() => { caughtRef.current = caught; }, [caught]);
  useEffect(() => { missedRef.current = missed; }, [missed]);
  useEffect(() => { ghostsRef.current = ghosts; }, [ghosts]);

  // ── Hero float animation ──
  useEffect(() => {
    let t = 0;
    const id = setInterval(() => {
      t += 0.05;
      setHeroWobble(Math.sin(t)*8);
    }, 30);
    return () => clearInterval(id);
  }, []);

  // ── Start game ────────────────────────────────────────────────────────────
  const startGame = useCallback((idx = levelIdx) => {
    gid = 0;
    caughtRef.current = 0;
    missedRef.current = 0;
    ghostsRef.current = [];
    popupsRef.current = [];
    setCaught(0); setMissed(0); setGhosts([]); setPopups([]);
    setTimeLeft(LEVELS[idx].timeLimit);
    setScore(0);
    setScreen("game");
  }, [levelIdx]);

  // ── Spawn ghosts ─────────────────────────────────────────────────────────
  useEffect(() => {
    if(screen !== "game") return;
    const W = frameRef.current?.clientWidth || 360;
    const H = frameRef.current?.clientHeight || 480;
    const interval = Math.max(700, 1400 - level.num * 80);
    spawnRef.current = setInterval(() => {
      setGhosts(prev => {
        if(prev.length >= 7) return prev;
        return [...prev, makeGhost(level, W, H)];
      });
    }, interval);
    return () => clearInterval(spawnRef.current);
  }, [screen, levelIdx]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if(screen !== "game") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if(t <= 1) {
          clearInterval(timerRef.current);
          clearInterval(spawnRef.current);
          // check result
          setTimeout(() => {
            if(caughtRef.current >= level.quota) {
              setUnlocked(u => u.includes(level.num) ? u : [...u, level.num]);
              setTotalScore(s => s + caughtRef.current * 10);
              setScreen("reward");
            } else {
              setScreen("gameover");
            }
          }, 500);
          return 0;
        }
        return t-1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen, levelIdx]);

  // ── Ghost drift & expire ──────────────────────────────────────────────────
  useEffect(() => {
    if(screen !== "game") return;
    const W = frameRef.current?.clientWidth || 360;
    const H = frameRef.current?.clientHeight || 480;
    const id = setInterval(() => {
      const now = Date.now();
      setGhosts(prev => {
        let newMissed = 0;
        const next = prev.map(g => {
          if(g.caught || g.missed) return g;
          // expire
          if(now - g.spawnTime > g.lifespan && !g.popping) {
            newMissed++;
            missedRef.current++;
            return {...g, missed:true, alpha:0};
          }
          // drift
          let nx = g.x + g.vx;
          let ny = g.y + g.vy;
          let nvx = g.vx, nvy = g.vy;
          if(nx < g.size || nx > W-g.size) nvx = -nvx;
          if(ny < g.size || ny > H-g.size) nvy = -nvy;
          const wob = Math.sin(Date.now()/300 * g.wobbleSpd + g.floatOff) * 1.5;
          return {...g, x:nx, y:ny+wob*0.3, vx:nvx, vy:nvy, wobble: wob};
        }).filter(g => !g.missed);
        if(newMissed > 0) setMissed(m => {
          const nm = m + newMissed;
          if(nm >= 3) {
            clearInterval(timerRef.current);
            clearInterval(spawnRef.current);
            setTimeout(() => setScreen("gameover"), 400);
          }
          return nm;
        });
        return next;
      });
      // expire popups
      setPopups(prev => prev.filter(p => Date.now() - p.ts < 900));
    }, 40);
    return () => clearInterval(id);
  }, [screen]);

  // ── Tap ghost ────────────────────────────────────────────────────────────
  const tapGhost = useCallback((g, e) => {
    e.stopPropagation();
    if(g.caught || g.missed) return;
    const pts = g.def.pts;
    setScore(s => s + pts);
    setCaught(c => c+1);
    caughtRef.current++;
    setHeroExcited(true);
    setTimeout(() => setHeroExcited(false), 600);
    setShowHabit({text: g.def.habit, emoji: g.def.emoji});
    setTimeout(() => setShowHabit(null), 1200);
    // pop particle stars
    const rect = e.currentTarget.getBoundingClientRect();
    const px = rect.left + rect.width/2;
    const py = rect.top + rect.height/2;
    setPopups(prev => [...prev, {id:Date.now(), x:px, y:py, pts, ts:Date.now(), rare:g.def.rare}]);
    // spawn sparkle stars
    setStars(prev => [...prev, ...Array.from({length:6},(_,i)=>({
      id:Date.now()+i, x:px, y:py,
      angle:(i/6)*Math.PI*2, spd:3+Math.random()*3,
      color:[C.yellow,C.cyan,C.pink,C.purple][i%4], ts:Date.now()
    }))]);
    setTimeout(() => setStars(prev => prev.filter(s => Date.now()-s.ts < 500)), 600);
    setGhosts(prev => prev.filter(gh => gh.id !== g.id));
  }, []);

  // ── Next level ────────────────────────────────────────────────────────────
  const nextLevel = () => {
    const ni = levelIdx + 1;
    if(ni >= LEVELS.length) { setScreen("title"); return; }
    setLevelIdx(ni);
    setTimeout(() => startGame(ni), 50);
  };

  const retry = () => startGame(levelIdx);

  // ── Timer color ───────────────────────────────────────────────────────────
  const timerColor = timeLeft > 10 ? C.cyan : timeLeft > 5 ? C.yellow : C.pink;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg, ${C.bg0} 0%, ${C.bg1} 50%, ${C.bg2} 100%)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Comic Sans MS', 'Chalkboard SE', cursive", overflow:"hidden", position:"relative", padding:8 }}>

      {/* Twinkling bg stars */}
      {bgStars.map((s,i) => (
        <div key={i} style={{ position:"fixed", left:`${s.x}%`, top:`${s.y}%`, width:s.size, height:s.size, borderRadius:"50%", background:"white", opacity:0.6,
          animation:`twinkle ${s.dur}s ${s.delay}s infinite alternate` }} />
      ))}

      <style>{`
        @keyframes twinkle { from{opacity:0.2} to{opacity:0.9} }
        @keyframes floatUp { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-60px);opacity:0} }
        @keyframes popIn  { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @keyframes shake  { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes ghostFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes slideIn { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        .ghost-btn:hover { transform: scale(1.15) !important; }
        .ghost-btn:active { transform: scale(0.92) !important; }
      `}</style>

      {/* ── TITLE SCREEN ── */}
      {screen === "title" && (
        <div style={{ textAlign:"center", animation:"slideIn 0.5s ease" }}>
          <div style={{ fontSize:56, animation:"bounce 1.5s infinite", display:"block" }}>👻</div>
          <div style={{ fontSize:32, fontWeight:"bold", color:C.cyan, textShadow:`0 0 20px ${C.cyan}`, letterSpacing:2, marginTop:4 }}>GHOSTLY</div>
          <div style={{ fontSize:28, color:C.pink, textShadow:`0 0 15px ${C.pink}`, letterSpacing:3 }}>HABITS</div>
          <div style={{ color:"#a78bfa", fontSize:13, margin:"10px 0 20px", lineHeight:1.6 }}>
            Catch bad-habit ghosts before they escape!<br/>
            <span style={{color:C.yellow}}>★ 8 levels ★ rewards ★ increasing challenge ★</span>
          </div>

          {/* level select */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16, maxWidth:340 }}>
            {LEVELS.map((lv,i) => {
              const done = unlocked.includes(lv.num);
              const avail = i===0 || unlocked.includes(LEVELS[i-1].num);
              return (
                <button key={i} disabled={!avail}
                  onClick={() => { setLevelIdx(i); setTimeout(()=>startGame(i),50); }}
                  style={{ background: done?"linear-gradient(135deg,#7b2d8b,#9b5de5)": avail?"linear-gradient(135deg,#1a0a35,#2a1155)":"#0d0520",
                    border:`2px solid ${done?C.yellow:avail?C.purple:"#333"}`,
                    borderRadius:12, padding:"10px 4px", cursor:avail?"pointer":"not-allowed",
                    color: done?C.yellow:avail?"white":"#444", fontSize:11, fontFamily:"inherit" }}>
                  <div style={{fontSize:20}}>{done ? REWARDS[i].badge : avail ? lv.bg : "🔒"}</div>
                  <div style={{fontSize:9, marginTop:2}}>Lv {lv.num}</div>
                </button>
              );
            })}
          </div>

          {unlocked.length > 0 && (
            <div style={{ color:C.yellow, fontSize:12, marginBottom:12 }}>
              🏅 {unlocked.length} badge{unlocked.length>1?"s":""} earned • Total score: {totalScore}
            </div>
          )}

          <button onClick={() => { setLevelIdx(0); setTimeout(()=>startGame(0),50); }}
            style={{ background:`linear-gradient(135deg,${C.purple},${C.pink})`, color:"white", border:"none", borderRadius:16, padding:"14px 40px", fontSize:18, cursor:"pointer", fontFamily:"inherit", boxShadow:`0 0 25px ${C.purple}88`, animation:"pulse 2s infinite" }}>
            👻 START HAUNTING!
          </button>
        </div>
      )}

      {/* ── GAME SCREEN ── */}
      {screen === "game" && (
        <div style={{ width:"100%", maxWidth:420, userSelect:"none" }}>
          {/* HUD */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, padding:"6px 12px", background:"rgba(0,0,0,0.4)", borderRadius:12, border:"1px solid #3b0764" }}>
            <div style={{ color:C.cyan, fontSize:12 }}>
              <span style={{fontSize:16}}>👻</span> Lv {level.num}<br/>
              <span style={{fontSize:9, color:"#a78bfa"}}>{level.title}</span>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ color:timerColor, fontSize:22, fontWeight:"bold", textShadow:`0 0 12px ${timerColor}`, animation: timeLeft<=5?"shake 0.4s infinite":"none" }}>
                ⏱ {timeLeft}s
              </div>
            </div>
            <div style={{ textAlign:"right", fontSize:12, color:C.yellow }}>
              ⭐ {score}<br/>
              <span style={{color:"#a78bfa", fontSize:10}}>caught {caught}/{level.quota}</span>
            </div>
          </div>

          {/* Missed hearts */}
          <div style={{ textAlign:"center", marginBottom:6, fontSize:18 }}>
            {[0,1,2].map(i => <span key={i} style={{opacity: missed>i?0.2:1, transition:"opacity 0.3s"}}>❤️</span>)}
            <span style={{fontSize:11, color:"#a78bfa", marginLeft:8}}>miss 3 = game over</span>
          </div>

          {/* Ghost arena */}
          <div ref={frameRef} style={{ position:"relative", width:"100%", height:400, background:`radial-gradient(ellipse at 50% 30%, #1a0a4e 0%, #0d0520 100%)`, borderRadius:20, border:`2px solid ${C.purple}55`, overflow:"hidden", cursor:"default" }}>

            {/* Ambient bg emoji */}
            <div style={{position:"absolute", fontSize:60, opacity:0.04, top:"30%", left:"30%", pointerEvents:"none", animation:"spin 30s linear infinite"}}>{level.bg}</div>

            {/* Hint */}
            <div style={{position:"absolute", bottom:8, left:0, right:0, textAlign:"center", color:"#a78bfa", fontSize:10, pointerEvents:"none"}}>{level.hint}</div>

            {/* Ghosts */}
            {ghosts.map(g => {
              const age = (Date.now() - g.spawnTime) / g.lifespan;
              const fadeAlpha = age > 0.75 ? 1-(age-0.75)/0.25 : 1;
              return (
                <div key={g.id} className="ghost-btn"
                  onClick={(e) => tapGhost(g, e)}
                  style={{ position:"absolute", left: g.x - g.size/2, top: g.y - g.size/2,
                    width: g.size, height: g.size, cursor:"pointer",
                    opacity: fadeAlpha, transition:"opacity 0.2s",
                    animation:"ghostFloat 2s ease-in-out infinite",
                    filter: g.def.rare ? `drop-shadow(0 0 10px ${C.yellow})` : `drop-shadow(0 0 6px ${g.def.color})`,
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                    zIndex:10, userSelect:"none" }}>
                  <span style={{fontSize: g.size*0.7, lineHeight:1}}>{g.def.emoji}</span>
                  {g.def.rare && <span style={{fontSize:8, color:C.yellow, fontWeight:"bold", textShadow:`0 0 6px ${C.yellow}`}}>RARE!</span>}
                  {/* lifespan bar */}
                  <div style={{position:"absolute", bottom:-6, left:0, right:0, height:3, background:"#333", borderRadius:2}}>
                    <div style={{width:`${(1-age)*100}%`, height:"100%", background: age<0.5?C.cyan:age<0.75?C.yellow:C.pink, borderRadius:2, transition:"width 0.1s"}}/>
                  </div>
                </div>
              );
            })}

            {/* Habit flash */}
            {showHabit && (
              <div style={{ position:"absolute", top:"15%", left:0, right:0, textAlign:"center", pointerEvents:"none", animation:"popIn 0.3s ease" }}>
                <div style={{ display:"inline-block", background:"rgba(0,0,0,0.7)", border:`2px solid ${C.cyan}`, borderRadius:12, padding:"6px 16px", color:C.cyan, fontSize:13, fontWeight:"bold" }}>
                  {showHabit.emoji} {showHabit.text}
                </div>
              </div>
            )}
          </div>

          {/* Hero strip */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginTop:10 }}>
            <div style={{ fontSize: heroExcited?44:38, transform:`translateY(${heroWobble}px)`, transition:"font-size 0.2s",
              filter:`drop-shadow(0 0 ${heroExcited?16:8}px ${heroExcited?C.yellow:C.cyan})`,
              animation: heroExcited?"bounce 0.3s 2":"none" }}>
              🌟
            </div>
            <div style={{ color:"#a78bfa", fontSize:12, textAlign:"center" }}>
              <b style={{color:C.cyan}}>Boo</b> the Ghost Hero<br/>
              <span style={{fontSize:10}}>Tap ghosts to catch them!</span>
            </div>
            <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:10, padding:"6px 12px", textAlign:"center" }}>
              <div style={{color:C.yellow, fontSize:16, fontWeight:"bold"}}>{caught}<span style={{color:"#a78bfa",fontSize:11}}>/{level.quota}</span></div>
              <div style={{color:"#a78bfa", fontSize:9}}>caught</div>
            </div>
          </div>
        </div>
      )}

      {/* Floating score popups (fixed position) */}
      {popups.map(p => (
        <div key={p.id} style={{ position:"fixed", left:p.x-20, top:p.y-20, pointerEvents:"none", zIndex:999,
          color: p.rare ? C.yellow : C.cyan, fontSize: p.rare?22:16, fontWeight:"bold",
          textShadow:`0 0 10px ${p.rare?C.yellow:C.cyan}`,
          animation:"floatUp 0.9s ease forwards" }}>
          {p.rare?"⭐ ":"+"}${p.pts}
        </div>
      ))}

      {/* ── REWARD SCREEN ── */}
      {screen === "reward" && (
        <div style={{ textAlign:"center", animation:"slideIn 0.5s ease", maxWidth:360 }}>
          <div style={{ fontSize:64, animation:"bounce 0.8s infinite" }}>{REWARDS[levelIdx].badge}</div>
          <div style={{ fontSize:24, color:C.yellow, textShadow:`0 0 20px ${C.yellow}`, fontWeight:"bold", margin:"8px 0" }}>
            LEVEL CLEAR! 🎉
          </div>
          <div style={{ fontSize:18, color:C.cyan, marginBottom:4 }}>{REWARDS[levelIdx].title}</div>
          <div style={{ color:"#c084fc", fontSize:13, marginBottom:16 }}>{REWARDS[levelIdx].msg}</div>

          <div style={{ background:"rgba(0,0,0,0.4)", borderRadius:16, padding:16, marginBottom:16, border:`1px solid ${C.purple}` }}>
            <div style={{color:"#a78bfa", fontSize:12, marginBottom:8}}>Ghosts caught this level:</div>
            <div style={{fontSize:32, color:C.yellow, fontWeight:"bold"}}>{caught}<span style={{color:"#a78bfa",fontSize:16}}>/{level.quota}</span></div>
            <div style={{color:C.cyan, fontSize:14, marginTop:4}}>+{score} points earned!</div>
          </div>

          {/* Habit summary */}
          <div style={{ background:"rgba(155,93,229,0.15)", borderRadius:12, padding:12, marginBottom:16, textAlign:"left" }}>
            <div style={{color:C.yellow, fontSize:12, marginBottom:6, textAlign:"center"}}>🌟 Good Habits Unlocked:</div>
            {level.ghostTypes.slice(0,4).map(t => {
              const def = GHOST_DEFS.find(g=>g.id===t);
              return def ? <div key={t} style={{color:"#c084fc", fontSize:11, margin:"3px 0"}}>{def.emoji} {def.habit}</div> : null;
            })}
          </div>

          <div style={{display:"flex", gap:10, justifyContent:"center"}}>
            {levelIdx < LEVELS.length-1 ? (
              <button onClick={nextLevel} style={{ background:`linear-gradient(135deg,${C.cyan},${C.purple})`, color:"white", border:"none", borderRadius:14, padding:"12px 28px", fontSize:16, cursor:"pointer", fontFamily:"inherit", boxShadow:`0 0 20px ${C.cyan}66` }}>
                Next Level ➡️
              </button>
            ) : (
              <button onClick={()=>setScreen("title")} style={{ background:`linear-gradient(135deg,${C.yellow},${C.orange})`, color:"white", border:"none", borderRadius:14, padding:"12px 28px", fontSize:16, cursor:"pointer", fontFamily:"inherit" }}>
                👑 You Win! Home
              </button>
            )}
            <button onClick={()=>setScreen("title")} style={{ background:"rgba(0,0,0,0.4)", color:"#a78bfa", border:`1px solid ${C.purple}`, borderRadius:14, padding:"12px 18px", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
              🏠 Menu
            </button>
          </div>
        </div>
      )}

      {/* ── GAME OVER SCREEN ── */}
      {screen === "gameover" && (
        <div style={{ textAlign:"center", animation:"slideIn 0.5s ease", maxWidth:340 }}>
          <div style={{ fontSize:64, animation:"shake 0.5s infinite" }}>💀</div>
          <div style={{ fontSize:26, color:C.pink, textShadow:`0 0 20px ${C.pink}`, fontWeight:"bold", margin:"8px 0" }}>
            HAUNTED! 👻
          </div>
          <div style={{ color:"#a78bfa", fontSize:13, marginBottom:16 }}>
            {missed >= 3 ? "3 ghosts escaped! The habits won this time..." : "Time's up! Not enough ghosts caught."}
          </div>
          <div style={{ background:"rgba(0,0,0,0.4)", borderRadius:14, padding:14, marginBottom:16, border:`1px solid #ef476f55` }}>
            <div style={{color:"#a78bfa", fontSize:12}}>You caught</div>
            <div style={{fontSize:28, color:C.yellow, fontWeight:"bold"}}>{caught}<span style={{color:"#a78bfa", fontSize:14}}>/{level.quota}</span></div>
            <div style={{color:C.pink, fontSize:12, marginTop:4}}>Need {Math.max(0,level.quota-caught)} more to pass</div>
          </div>
          <div style={{display:"flex", gap:10, justifyContent:"center"}}>
            <button onClick={retry} style={{ background:`linear-gradient(135deg,${C.purple},${C.pink})`, color:"white", border:"none", borderRadius:14, padding:"12px 24px", fontSize:16, cursor:"pointer", fontFamily:"inherit", boxShadow:`0 0 20px ${C.purple}66` }}>
              🔄 Try Again
            </button>
            <button onClick={()=>setScreen("title")} style={{ background:"rgba(0,0,0,0.4)", color:"#a78bfa", border:`1px solid ${C.purple}`, borderRadius:14, padding:"12px 18px", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
              🏠 Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
