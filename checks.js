/* =====================================================================
   checks.js — 자동 점검 (브라우저 없이 node 로 돌립니다)
   ---------------------------------------------------------------------
   쓰는 법:   node checks.js
   ---------------------------------------------------------------------
   화면을 눈으로 볼 수 없는 상태에서 고치다 보니, "있어야 할 게 사라졌다"
   "순서가 뒤바뀌었다" 같은 사고가 반복됐습니다. 그때마다 여기에 항목을
   하나씩 늘려서, 같은 실수가 다시 나면 걸리도록 해두었습니다.
   ===================================================================== */
const fs=require("fs"), vm=require("vm"), path=require("path");
const DIR=__dirname+path.sep;
const CSS=fs.readFileSync(DIR+"styles.css","utf8");
const HTML=fs.readFileSync(DIR+"index.html","utf8");

let pass=0,fail=0;const fails=[];
const ok=(c,n)=>{ c?pass++:(fail++,fails.push(n)); };

/* ---- 1. 화면 구조 클래스가 CSS 에 살아 있는가 ---- */
const WATCH=["container","app-head","head-tools","chat-sidebar","cards-area","side-rail",
 "pane","pane-pomo","split-root","split","split-grip","pomo-row","personal-title",
 "goal-wrap","todo-wrap","todo-add","todo-list","user-cards-grid","user-card","card-body",
 "card-side","card-chips","card-ach","card-state","card-state-ghost","card-state-row",
 "card-avatar-wrap","card-avatar","card-foot","card-name","card-goal","goal-line","card-meta",
 "card-prog-track","card-meta-line","card-todo-count","card-pomo-count","card-edit-btn",
 "hidden-panels","hidden-chip","slot-picker","slot-row","slot-name","slot-sel","slot-map",
 "slot-cell","slot-no","slot-cell-head","slot-cell-name","slot-cell-pos","panel-off",
 "layout-pick","layout-opt","theme-chip","man-tab","man-panel","color-well","color-hex",
 "color-chip","card-preview","card-preview-foot","nick-preview","msg-link","pat-dots","pat-grid"];
const miss=WATCH.filter(c=>!new RegExp("\\."+c+"[^a-zA-Z0-9_-]").test(CSS));
ok(miss.length===0, "CSS 규칙 없는 클래스: "+miss.join(", "));

/* ---- 1.5 index.html 구조 검사 ----

   TheMagam 에서 닫는 </div> 를 잘못 잘라 설정 모달이 중간에서 끝나고
   "닫기" 버튼이 화면 절반을 덮은 일이 있었습니다. 눈으로는 잡기 어렵고
   브라우저는 조용히 넘어가는 종류라, 여기서도 같이 지킵니다. */
{
  const t = HTML.replace(/<!--[\s\S]*?-->/g, "");
  const open  = (t.match(/<div\b/g)  || []).length;
  const close = (t.match(/<\/div>/g) || []).length;
  ok(open === close, `<div> 여닫이 개수가 맞다 (열림 ${open} / 닫힘 ${close})`);

  const ids = t.match(/id="([^"]+)"/g).map(x => x.slice(4, -1));
  const dup = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
  ok(dup.length === 0, "중복된 id 가 없다" + (dup.length ? " — " + dup.join(", ") : ""));

  const tabs   = (t.match(/data-tab="(\w+)"/g) || []).map(x => x.slice(10, -1));
  const panels = (t.match(/id="panel-(\w+)"/g) || []).map(x => x.slice(10, -1));
  tabs.forEach(k => ok(panels.includes(k), `설정 탭 ${k} 에 짝이 되는 패널이 있다`));

  /* 보기 고르기 버튼 — 두 겹으로 눌리는지 (인라인 + 위임) */
  const pick = t.slice(t.indexOf('id="layout-pick"'), t.indexOf('id="slot-title"'));
  ["landscape", "portrait"].forEach(o => {
    const m = pick.match(new RegExp(`data-orient="${o}"[^>]*`));
    ok(!!m, `${o} 버튼이 있다`);
    ok(m && /onclick=/.test(m[0]), `${o} 버튼에 인라인 클릭이 달려 있다`);
  });
  ["-1", "1"].forEach(v => {
    const m = pick.match(new RegExp(`data-side="${v}"[^>]*`));
    ok(!!m, `좌우 ${v} 버튼이 있다`);
    ok(m && /onclick=/.test(m[0]), `좌우 ${v} 버튼에 인라인 클릭이 달려 있다`);
  });
  ok(/function bindLayoutPick/.test(fs.readFileSync(DIR+"script_ui.js","utf8")),
     "위임 클릭도 함께 걸려 있다");
}

/* ---- 2. 칸 배치 전수 검사 ---- */
const ctx={window:{addEventListener(){}},document:{readyState:"complete",addEventListener(){},
  getElementById(){return null},querySelectorAll(){return []},querySelector(){return null},
  createElement(){return{style:{},classList:{add(){},remove(){},toggle(){}},dataset:{},
    appendChild(){},setAttribute(){},addEventListener(){}}},
  head:{appendChild(){}},body:{classList:{contains(){return false},add(){},remove(){}}}},
  localStorage:{getItem(){return null},setItem(){}},module:{exports:{}}};
ctx.window.document=ctx.document; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(DIR+"script_layout.js","utf8"),ctx);
const L=ctx.window.LayoutSlots;
const SLOTS=L.SLOT_IDS, PANELS=L.PANELS.map(p=>p.id);
const leaves=(n,a=[])=>{ if(typeof n==="string"){a.push(n);return a;} n.kids.forEach(k=>leaves(k,a)); return a; };
for(const [name,tree] of Object.entries(L.TREES)){
  const lv=leaves(tree);
  ok(lv.length===SLOTS.length && new Set(lv).size===SLOTS.length,
     `[${name}] 자리 ${SLOTS.length}개가 중복 없이 있다`);
}
const perms=a=>{ if(a.length<=1) return [a]; const o=[];
  a.forEach((v,i)=>{ perms([...a.slice(0,i),...a.slice(i+1)]).forEach(p=>o.push([v,...p])); }); return o; };
let cases=0, bad=0;
for(const [,tree] of Object.entries(L.TREES))
 for(const perm of perms(PANELS))
  for(let mask=0; mask<32; mask++){
    const map={}; SLOTS.forEach((s,i)=> map[s]=(mask&(1<<i))?perm[i]:null);
    cases++;
    const pr=L.prune(tree,map), shown=SLOTS.filter(s=>map[s]);
    if(shown.length===0){ if(pr!==null) bad++; continue; }
    if(pr===null){ bad++; continue; }
    const lv=leaves(pr);
    if(lv.length!==shown.length||new Set(lv).size!==lv.length) bad++;
    (function chk(n){ if(typeof n==="string")return;
      if(n.kids.length<2) bad++; n.kids.forEach(chk); })(pr);
  }
ok(bad===0, `칸 배치 전수 ${cases.toLocaleString()}가지 (문제 ${bad})`);

/* ---- 3. 다시 조립할 때 창이 삭제되지 않는가 ---- */
{
  const src=fs.readFileSync(DIR+"script_layout.js","utf8");
  const iClear=src.indexOf('root.innerHTML = ""'), iAttic=src.indexOf("attic.appendChild(el)");
  ok(iAttic>=0 && iClear>=0 && iAttic<iClear, "창을 보관함에 먼저 대피시킨 뒤 뿌리를 비운다");
}

/* ---- 4. 채팅의 글자 선택을 막는 규칙이 없는가 ---- */
{
  const lines=CSS.split("\n"); const culprit=[];
  lines.forEach((l,i)=>{
    if(!/user-select:\s*none/.test(l)) return;
    for(let j=i;j>=0;j--){ if(lines[j].includes("{")){
      const sel=lines[j];
      if(/chat|#message|\.container|\.split(?!-grip)|^body\s*\{/.test(sel) && !/split-dragging/.test(sel))
        culprit.push(sel.trim());
      break; } }
  });
  ok(culprit.length===0, "채팅/입력칸의 선택을 막는 규칙 없음: "+culprit.join(" / "));
  ok(/user-select: text/.test(CSS), "채팅·입력칸에 선택을 되살리는 규칙이 있다");
  const src=fs.readFileSync(DIR+"script_layout.js","utf8");
  ok(!/root\.addEventListener\("pointerdown"/.test(src), "뿌리 전체에 pointerdown 을 걸지 않는다");
}

/* ---- 5. 주소 링크 만들기 ---- */
{
  const src=fs.readFileSync(DIR+"script_chat.js","utf8");
  const m=src.match(/function linkifyEscaped\(html\) \{([\s\S]*?)\n  \}/);
  ok(!!m, "linkifyEscaped 가 있다");
  if(m){
    const fn=new Function("html", m[1]);
    ok(/<a class="msg-link"/.test(fn("https://a.com 확인")), "http 주소가 링크가 된다");
    ok(!/<a /.test(fn("javascript:alert(1)")), "javascript: 는 링크가 안 된다");
    ok(!/<a /.test(fn("&lt;script&gt;")), "이스케이프된 태그를 건드리지 않는다");
    ok(/<\/a>\./.test(fn("http://a.com. 끝")), "문장 끝 마침표는 주소에서 뺀다");
  }
}

/* ---- 6. 뽀모 미참가 시 집중 횟수를 세지 않는가 ---- */
{
  const src=fs.readFileSync(DIR+"script_ui.js","utf8");
  const i=src.indexOf("async function incrementTodayFocusSessions");
  ok(/if \(!_pomoParticipating\) return;/.test(src.slice(i,i+700)), "미참가면 집중 횟수를 올리지 않는다");
}

/* ---- 7. 테마 ---- */
{
  const src=fs.readFileSync(DIR+"script_ui.js","utf8");
  const i=src.indexOf("const themes = {");
  const body=src.slice(i, src.indexOf("\n  };", i));
  const names=[...body.matchAll(/^\s*"([^"]+)":\s*\{/gm)].map(m=>m[1]);
  ok(names.length>0, `테마 ${names.length}종`);
  ok(new Set(names).size===names.length, "테마 이름 중복 없음");
  const badHex=[...body.matchAll(/#[0-9A-Za-z]{2,}/g)].map(m=>m[0])
    .filter(c=>!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(c));
  ok(badHex.length===0, "잘못된 색 코드: "+badHex.join(", "));
  let lack=0;
  body.split(/\n(?=\s*")/).filter(b=>/^\s*"/.test(b))
    .forEach(b=>{ ["bg:","text:","me:","other:","header:"].forEach(k=>{ if(!b.includes(k)) lack++; }); });
  ok(lack===0, `테마마다 필수 색이 다 있다 (빠짐 ${lack})`);
}

/* ---- 8. HTML 뼈대 ---- */
ok(/id="split-root"/.test(HTML), "split-root 있음");
ok(/id="panel-attic"/.test(HTML), "창 보관함 있음");
ok(!/class="(col|row)-grip"/.test(HTML), "옛 격자 손잡이가 없다");
ok(!/id="conn-badge"/.test(HTML), "머리말의 옛 연결 배지가 없다");
ok(/class="card-conn/.test(fs.readFileSync(DIR+"script_realtime.js","utf8")),
   "카드에 연결 안테나를 그린다");
{
  const core=fs.readFileSync(DIR+"script_core.js","utf8");
  ok(/paintConnBadge/.test(core), "연결 상태를 화면에 칠하는 함수가 있다");
  const i=core.indexOf('db.ref(".info/connected").on');
  const seg=core.slice(i, i+400);
  ok(/paintConnBadge\(up\)/.test(seg), "끊길 때도 배지를 갱신한다 (early return 앞에서)");
  ok(/conn-down/.test(core), "끊기면 body 에 conn-down 을 붙인다");
  ok(seg.indexOf("paintConnBadge") < seg.indexOf("if (!up) return"), "배지 갱신이 early return 보다 먼저다");
}
["card-conn"].forEach(c=>
  ok(new RegExp("\\."+c+"[^a-zA-Z0-9_-]").test(CSS), `CSS 에 .${c} 가 있다`));
ok(/body\.conn-down .user-card\.is-me \.card-conn/.test(CSS), "내 카드 안테나는 소켓 상태를 따른다");
ok(/\.card-conn\.off/.test(CSS), "끊김 모양이 정의돼 있다");
{
  /* 받침 — 카드 배경색이 비쳐 올라와 안테나가 묻히던 문제 */
  const i = CSS.indexOf(".card-conn{");
  const seg = CSS.slice(i, CSS.indexOf("}", i));
  ok(/background: rgba\(255,255,255,/.test(seg), "안테나에 받침이 깔려 있다");
  ok(/border-radius/.test(seg), "받침 모서리가 둥글다");
  ok(/box-shadow/.test(seg), "받침에 얇은 테두리가 있다");

  /* 어두운 테마 선택자가 실제로 붙는 표식과 맞는지 —
     예전에 안 쓰는 선택자를 써서 조용히 안 먹은 적이 있습니다. */
  const ui = fs.readFileSync(DIR+"script_ui.js","utf8");
  const m = ui.match(/setAttribute\("data-is-dark",\s*isDark \? "(\w+)"/);
  ok(!!m, "applyTheme 이 data-is-dark 를 쓴다");
  ok(CSS.includes(`html[data-is-dark="${m[1]}"] .card-conn`),
     "받침의 어두운 테마 선택자가 실제 표식과 일치한다");
}

/* 좁은 화면 — 창 하나 + 탭 */
{
  const lay = fs.readFileSync(DIR+"script_layout.js","utf8");
  const ui  = fs.readFileSync(DIR+"script_ui.js","utf8");
  ok(/function renderNarrowTabs/.test(lay), "좁은 화면 탭줄을 그린다");
  ok(/window\.setNarrowPanel/.test(lay), "탭으로 창을 바꿀 수 있다");
  ok(/window\.setNarrowDefault/.test(lay), "기본으로 열릴 창을 정할 수 있다");
  ok(/id="set-narrow-panel"/.test(HTML), "설정에 고르는 칸이 있다");
  ok(/set-narrow-panel/.test(ui), "설정 칸이 코드에 연결돼 있다");

  /* 설정 칸의 값이 실제 창 id 와 맞는가 — 오타 한 자면 조용히 안 먹습니다 */
  const panelIds = lay.match(/const PANELS = \[([\s\S]*?)\];/)[1]
    .match(/id: "(\w+)"/g).map(x => x.slice(5, -1));
  const optVals = (HTML.match(/id="set-narrow-panel"[\s\S]*?<\/select>/)[0]
    .match(/value="(\w+)"/g) || []).map(x => x.slice(7, -1));
  ok(optVals.length === panelIds.length && optVals.every(v => panelIds.includes(v)),
     "설정 선택지가 실제 창 목록과 일치한다 ("+optVals.join(",")+")");

  /* 서명에 좁은 화면 상태가 들어가야 탭이 먹습니다 */
  const i = lay.indexOf("const sig = JSON.stringify");
  ok(/isNarrow\(\)/.test(lay.slice(i, i+220)), "탭을 눌렀을 때 다시 그리도록 서명에 반영한다");
  ok(/was !== on\) \{ try \{ window\.applyLayout/.test(ui),
     "좁아지거나 넓어질 때 배치를 다시 짠다");

  ok(/\.narrow-tabs\{/.test(CSS) && /\.narrow-tab\.active\{/.test(CSS), "탭 CSS 가 있다");

  /* 안 읽은 채팅 배지 */
  const prof = fs.readFileSync(DIR+"script_profile.js","utf8");
  ok(/window\.noteNarrowChatUnread/.test(lay), "안 읽은 개수를 세는 함수가 있다");
  {
    /* 세는 자리는 원본 renderChatMessage 안이어야 합니다.
       감싸개 순서에 기대면 조용히 안 불립니다. */
    const chat = fs.readFileSync(DIR+"script_chat.js","utf8");
    ok(/window\.noteNarrowChatUnread\?\.\(\)/.test(chat),
       "새 메시지가 오면 원본에서 직접 센다");
    const i = chat.indexOf("function renderChatMessage");
    const j = chat.indexOf("window.noteNarrowChatUnread");
    ok(i > 0 && j > i, "세는 코드가 renderChatMessage 안에 있다");
    ok(/if \(!isMe\) \{ try \{ window\.noteNarrowChatUnread/.test(chat),
       "내 메시지는 세지 않는다");
    ok(!/noteNarrowChatUnread/.test(prof), "감싸개 쪽 중복 호출이 없다");
  }
  ok(/data-narrow-exit/.test(lay) && /window\.leaveRoom/.test(lay),
     "좁은 화면에도 나가기 버튼이 있다");
  ok(/\.nt-exit\{/.test(CSS), "나가기 버튼 CSS 가 있다");
  ok(/nt-badge/.test(lay) && /\.nt-badge\{/.test(CSS), "💬 탭에 배지가 붙는다");
  {
    const i = lay.indexOf("window.noteNarrowChatUnread = function");
    const seg = lay.slice(i, i + 400);
    ok(/if \(!isNarrow\(\)\) return;/.test(seg), "넓은 화면에서는 세지 않는다");
    ok(/narrowCurrent\(\) === "chat"\) return;/.test(seg), "채팅을 보고 있으면 세지 않는다");
  }
  ok(/if \(p\.id === "chat"\) _narrowUnread = 0;/.test(lay), "채팅을 열면 개수를 지운다");
  /* 내 메시지와 시스템 메시지는 세지 않아야 합니다 (기존 훅 조건을 함께 씁니다) */
  {
    const i = prof.indexOf("noteChatMessageWhileCollapsed();");
    const seg = prof.slice(Math.max(0, i - 200), i + 200);
    ok(/data\.type !== "system" && data\.user !== myNick/.test(seg),
       "내 메시지와 입퇴장 알림은 세지 않는다");
  }
  ok(!/body\.narrow-chat-focus \.pane,/.test(CSS),
     "좁은 화면에서 .pane 을 통째로 숨기지 않는다 (고른 창이 .pane 일 수 있음)");
  ok(!/body\.narrow-chat-focus \.split-root > \*\{[^}]*display: flex !important/.test(CSS),
     "창의 display 를 강제하지 않는다 (안쪽 배치 깨짐 방지)");
}

/* 자리비움일 때 🍅 가 쌓이지 않는가 */
{
  const ui = fs.readFileSync(DIR+"script_ui.js","utf8");
  const i = ui.indexOf("async function incrementTodayFocusSessions");
  const seg = ui.slice(i, i + 1100);
  ok(/if \(!_pomoParticipating\) return;/.test(seg), "미참여면 세지 않는다");
  ok(/if \(st === "away"\) return;/.test(seg), "자리비움이면 세지 않는다");
  ok(seg.indexOf('st === "away"') < seg.indexOf("_getTodaySessionCount() + 1"),
     "세기 전에 걸러낸다");
}

/* 채팅 반응을 붙였을 때 프사가 안 내려가는가

   [왜] .chat-item 이 align-items: flex-end 였습니다. 말풍선 아래에
   반응 줄이 생기면 그만큼 프사도 같이 내려가, 이름 옆이 아니라 반응
   옆에 붙었습니다. 위쪽 정렬로 바꾸고, 이름 줄만큼만 내려서 첫
   말풍선과 맞춥니다. */
{
  /* 주석에 옛 값을 설명으로 적어두었으므로, 주석을 걷어내고 봅니다.
     (예전에 이 함정에 한 번 걸렸습니다) */
  const bare = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  const i = bare.indexOf(".chat-item{");
  const seg = bare.slice(i, bare.indexOf("}", i));
  ok(/align-items:\s*flex-start/.test(seg), "채팅 줄은 위쪽 정렬이다");
  ok(!/align-items:\s*flex-end/.test(seg), "아래쪽 정렬이 남아 있지 않다");
  ok(/\.chat-item\.other:not\(\.grouped\) \.chat-avatar/.test(CSS),
     "이름 줄만큼 프사를 내려 맞춘다");
}

/* 설정 창 안의 버튼이 배경에 묻히지 않는가

   [왜] .set-block 과 .layout-opt 이 둘 다 var(--panel) 이었습니다.
   판 위에 같은 색 판을 얹은 셈이라, 고르지 않은 버튼은 글자만 떠
   있는 것처럼 보였습니다. 눌리는데도 "안 눌린다" 로 느껴졌어요. */
{
  const bare = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = name => {
    const i = bare.indexOf(name + "{");
    return i < 0 ? "" : bare.slice(i, bare.indexOf("}", i));
  };
  const block = rule(".set-block");
  const opt   = rule(".layout-opt");
  const bg = seg => (seg.match(/background:\s*([^;]+)/) || [])[1];
  ok(!!bg(block) && !!bg(opt), "두 규칙 모두 배경이 정해져 있다");
  ok(bg(block).trim() !== bg(opt).trim(),
     `설정 칸과 그 안의 버튼이 다른 배경을 쓴다 (${bg(block).trim()} vs ${bg(opt).trim()})`);
  ok(/border:\s*1px solid var\(--border-strong/.test(opt), "버튼 테두리가 진하다");
  ok(/\.layout-opt:hover/.test(bare) && /\.layout-opt:active/.test(bare),
     "누를 수 있다는 반응이 있다");
  const row = rule(".slot-row");
  ok(!!bg(row) && bg(row).trim() !== bg(block).trim(), "자리 목록도 배경이 구분된다");
}

/* 방마다 저장 공간이 나뉘어 있는가

   [왜] 두 방이 같은 주소(도메인)를 씁니다. localStorage 는 주소
   단위로 나뉘고 뒤의 폴더 이름은 보지 않으므로, 이름표를 안 붙이면
   두 방이 같은 칸을 함께 씁니다. 실제로 한쪽에서 뽀모가 끝나자
   다른 방 카드의 🍅 가 같이 올라갔습니다. */
{
  const core = fs.readFileSync(DIR + "script_core.js", "utf8");
  const m = core.match(/const STORE_ROOM = "(\w+)"/);
  ok(!!m && m[1].length > 0, "이 방의 이름표가 정해져 있다" + (m ? ` (${m[1]})` : ""));
  ok(m && m[1] === "bl", "이름표가 이 방의 것이다");
  ok(/window\.AppStore = AppStore/.test(core), "AppStore 를 내보낸다");
  ok(/_migrated_v1/.test(core), "예전 값을 한 번 옮겨준다");

  /* 어느 파일에서도 원본 저장소를 직접 쓰면 안 됩니다 (껍데기 안은 예외) */
  const files = fs.readdirSync(DIR).filter(f => /^script_.*\.js$/.test(f));
  const leaks = [];
  files.forEach(f => {
    let src = fs.readFileSync(DIR + f, "utf8");
    if (f === "script_core.js") {
      /* 껍데기가 원본을 감싸는 부분만 잘라냅니다 */
      const end = src.indexOf("// ✅ Utils");
      src = end > 0 ? src.slice(end) : src;
    }
    src = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    if (/(?<![.\w])(localStorage|sessionStorage)\./.test(src)) leaks.push(f);
  });
  ok(leaks.length === 0, "원본 저장소를 직접 쓰는 곳이 없다" + (leaks.length ? " — " + leaks.join(", ") : ""));

  /* 실제로 굴려봅니다 — 두 방이 서로를 못 건드려야 합니다 */
  {
    const raw = {};
    const mk = room => {
      const P = room + ":";
      return {
        getItem: k => (P + k in raw ? raw[P + k] : null),
        setItem: (k, v) => { raw[P + k] = String(v); },
        get length() { return Object.keys(raw).filter(x => x.startsWith(P)).length; },
        key: i => (Object.keys(raw).filter(x => x.startsWith(P))[i] || "").slice(P.length) || null
      };
    };
    const a = mk("bl"), b = mk("tm");
    a.setItem("pomoSessions_x", "1");
    b.setItem("pomoSessions_x", "9");
    ok(a.getItem("pomoSessions_x") === "1" && b.getItem("pomoSessions_x") === "9",
       "같은 이름이라도 방마다 값이 따로다");
    a.setItem("writerTheme", "A"); b.setItem("writerTheme", "B");
    ok(a.getItem("writerTheme") === "A", "테마가 서로 안 덮인다");
    ok(a.length === 2 && b.length === 2, "각 방은 자기 열쇠만 센다");
    ok(a.key(0) === "pomoSessions_x", "열쇠 이름에서 이름표가 벗겨진다");
  }
}

/* PWA — 독립 창 설치 */
{
  const mf = JSON.parse(fs.readFileSync(DIR+"manifest.json","utf8"));
  ok(mf.display === "standalone", "독립 창으로 뜬다");
  ok(!!mf.name && !!mf.short_name, "앱 이름이 있다");
  ok(mf.start_url === "./" && mf.scope === "./",
     "상대 경로다 (GitHub Pages 하위 폴더에서도 동작)");
  const sizes = mf.icons.map(i => i.sizes);
  ok(sizes.includes("192x192") && sizes.includes("512x512"),
     "설치에 필요한 192·512 아이콘이 있다");
  ok(mf.icons.some(i => i.purpose === "maskable"), "마스커블 아이콘이 있다");
  mf.icons.forEach(i =>
    ok(fs.existsSync(DIR+i.src), `아이콘 파일이 실제로 있다 (${i.src})`));
  ["icons/favicon.png","icons/apple-touch-icon.png"].forEach(f =>
    ok(fs.existsSync(DIR+f), `${f} 가 있다`));

  ok(/<link rel="manifest" href="manifest\.json">/.test(HTML), "index.html 이 manifest 를 연결한다");
  ok(/serviceWorker.*register\("sw\.js"\)/s.test(HTML), "서비스 워커를 등록한다");
  ok(/rel="apple-touch-icon"/.test(HTML), "사파리·아이폰 아이콘을 연결한다");

  const sw = fs.readFileSync(DIR+"sw.js","utf8");
  ok(/addEventListener\("fetch"/.test(sw), "fetch 처리기가 있다 (설치 조건)");
  /* ★ 여기서 실패하면 배포 사고 위험입니다 — 캐시 코드가 끼어들었다는 뜻 */
  ok(!/caches\.open|cache\.addAll|cache\.put|e\.respondWith|event\.respondWith/.test(sw),
     "서비스 워커가 캐시를 하지 않는다 (예전 화면이 남는 사고 방지)");
  ok(/caches\.delete/.test(sw), "예전 캐시가 남아 있으면 지운다");
}

/* 열린 구간에도 6시간 상한이 걸리는가 —
   WORK 로 두고 며칠 방치하면 며칠이 전부 집필로 잡히던 문제 */
{
  const tl = fs.readFileSync(DIR+"script_timelog.js","utf8");
  const i = tl.indexOf("아직 열려 있는 구간은");
  const seg = tl.slice(i, i + 700);
  ok(/curStart \+ SEG_CAP_MS/.test(seg), "열린 구간에도 상한을 적용한다");

  /* 실제로 굴려봅니다 */
  const CAP = 6*3600e3, DAY = 24*3600e3;
  const dayStart = t => Math.floor(t/DAY)*DAY;   // 검사용 단순 계산
  function openTotal(start, now, days){
    let sum = 0;
    const end = Math.min(now, start + CAP);
    for (let i=days-1; i>=0; i--){
      const d = dayStart(now) - i*DAY;
      const a = Math.max(start, d), b = Math.min(end, d+DAY);
      if (b>a) sum += b-a;
    }
    return sum;
  }
  const now = 10*DAY;
  ok(openTotal(now - 2*3600e3, now, 7) === 2*3600e3, "2시간 방치는 2시간으로 잡힌다");
  ok(openTotal(now - 3*DAY, now, 7) === CAP, "3일 방치도 6시간에서 멈춘다");
  ok(openTotal(now - 20*3600e3, now, 7) === CAP, "20시간 방치도 6시간이다");
  ok(openTotal(now - 30*60e3, now, 7) === 30*60e3, "30분은 30분이다");
}

/* index.html 이 모든 JS 를 실제로 불러오는가 —
   script_timelog.js 를 빠뜨려서 기록 팝업이 안 열린 적이 있습니다.
   build-single.py 는 자기 목록으로 합치므로 단일파일만 멀쩡했고,
   폴더 버전에서만 조용히 죽었습니다. */
{
  const order = fs.readFileSync(DIR+"build-single.py","utf8")
    .match(/ORDER = \[([\s\S]*?)\]/)[1]
    .match(/"([^"]+\.js)"/g).map(x=>x.slice(1,-1));
  order.forEach(f =>
    ok(new RegExp('<script src="'+f.replace(".","\\.")+'(\\?v=[^"]*)?"').test(HTML),
       `index.html 이 ${f} 를 불러온다`));
  ok(order.length >= 11, "합칠 JS 목록이 온전하다");
}

/* 입장 알림 */
{
  const rt=fs.readFileSync(DIR+"script_realtime.js","utf8");
  const ui=fs.readFileSync(DIR+"script_ui.js","utf8");
  ok(/function notifyJoin/.test(ui), "입장 알림 함수가 있다");
  ok(/_joinNoti/.test(ui) && /joinNoti/.test(ui), "입장 알림은 설정으로 켜고 끈다");
  ok(/AppStore\.getItem\("joinNoti"\) === "true"/.test(ui), "입장 알림은 기본 꺼짐이다");
  {
    const i=ui.indexOf("function notifyJoin");
    const seg=ui.slice(i, i+500);
    ok(/if \(!_joinNoti\) return;/.test(seg), "꺼져 있으면 알리지 않는다");
    ok(/visibilityState === "visible"\) return;/.test(seg), "보고 있을 때는 알리지 않는다");
    ok(/canNotify\(\)/.test(seg), "권한 없으면 알리지 않는다");
  }
  ok(/id="set-join-noti"/.test(HTML), "설정에 입장 알림 스위치가 있다");
  ok(/function detectJoins/.test(rt), "입장 감지 함수가 있다");
  {
    const i=rt.indexOf("function detectJoins");
    const seg=rt.slice(i, i+900);
    ok(/_seenOnline === null\) \{ _seenOnline = cur; return; \}/.test(seg),
       "첫 스냅숏은 씨앗만 심고 알리지 않는다");
    ok(/nick === myNick\) continue;/.test(seg), "내 입장은 알리지 않는다");
  }
  ok(rt.indexOf("_seenOnline = null;   // 다시 붙을 때") > 0, "다시 붙을 때 목록을 비운다");

  /* 실제로 굴려봅니다 — 새 이름만 잡히는가 */
  const now=Date.now();
  const on=()=>({ lastSeen: now });
  let seen=null, fired=[];
  const step=(data)=>{
    const cur=new Set(Object.keys(data));
    if (seen===null){ seen=cur; return; }
    const fresh=[...cur].filter(n=>n!=="나"&&!seen.has(n));
    seen=cur; if(fresh.length) fired.push(fresh.join(","));
  };
  step({"나":on(),"가":on()});                 // 입장 — 알림 없어야
  step({"나":on(),"가":on()});                 // lastSeen 갱신 — 없어야
  step({"나":on(),"가":on(),"나":on()});
  step({"나":on(),"가":on(),"다":on()});       // 다 입장
  step({"나":on(),"다":on()});                 // 가 퇴장 — 없어야
  step({"나":on(),"다":on(),"가":on()});       // 가 재입장 — 알림
  ok(fired.join("|")==="다|가", "새로 들어온 사람만 정확히 잡는다 ("+fired.join("|")+")");
}

/* ---- 9. 접속 판정 — 오래 방치해도 사라지지 않아야 ---- */
{
  const src=fs.readFileSync(DIR+"script_realtime.js","utf8");
  const ev=x=>Function("return "+x)();
  const g=src.match(/DISCONNECT_GRACE_MS\s*=\s*([\d\s*]+);/);
  const st=src.match(/ONLINE_STALE_MS\s*=\s*([\d\s*]+);/);
  const grace=g?ev(g[1]):0, stale=st?ev(st[1]):0;
  ok(grace>=10*60*1000, `끊김 유예가 10분 이상 (${Math.round(grace/60000)}분)`);
  ok(stale>=6*60*60*1000, `lastSeen 창이 6시간 이상 (${Math.round(stale/3600000)}시간)`);
  ok(stale>grace, "lastSeen 창이 유예보다 넉넉하다");

  const isOnline=(row,now)=>{
    if(!row) return false;
    const d=Number(row.disconnectedAt||0);
    if(d>0 && now-d>=grace) return false;
    const s2=Number(row.lastSeen||0);
    if(s2>0 && now-s2>=stale) return false;
    return true;
  };
  const now=Date.now();
  ok(isOnline({lastSeen:now-40*60*1000},now),  "40분간 창을 내려둬도 접속 중");
  ok(isOnline({lastSeen:now-3*60*60*1000},now),"3시간 방치도 접속 중");
  ok(!isOnline({disconnectedAt:now-20*60*1000,lastSeen:now-20*60*1000},now),"20분 전 끊김은 제외");
  ok(isOnline({disconnectedAt:now-60*1000,lastSeen:now-60*1000},now),       "1분 전 끊김은 유지");
  ok(!isOnline({lastSeen:now-30*60*60*1000},now),                            "30시간 전 고아 기록은 제거");
}

/* ---- 10. 뽀모 브라우저 알림 ---- */
{
  const u=fs.readFileSync(DIR+"script_ui.js","utf8");
  const r=fs.readFileSync(DIR+"script_realtime.js","utf8");
  const i=u.indexOf("function notifyPomodoro");
  ok(i>=0, "notifyPomodoro 가 있다");
  ok(/if \(!_pomoParticipating\) return;/.test(u.slice(i,i+400)), "미참여면 알림을 보내지 않는다");
  ok(/visibilityState === "visible"\) return/.test(u.slice(i,i+600)), "보고 있을 때는 알림을 띄우지 않는다");
  ok(/askNotifyPermissionOnce/.test(r), "시작 버튼에서 권한을 물어본다");
  ok(/AppStore\.getItem\(NOTI_ASKED_KEY\)/.test(u), "한 번 물어본 뒤엔 다시 묻지 않는다");
}

/* ---- 벨사탕이 더마감에서 가져온 것들 ---- */
{
  const H   = fs.readFileSync(DIR+"index.html","utf8");
  const css = fs.readFileSync(DIR+"styles.css","utf8");
  const one = css.replace(/\s+/g, " ");
  const rt  = fs.readFileSync(DIR+"script_realtime.js","utf8");
  const lay = fs.readFileSync(DIR+"script_layout.js","utf8");

  /* 파이어베이스 — 이 방 전용 프로젝트여야 합니다.
     예전에는 남의 프로젝트(writer-chat)를 쓰고 있었습니다. */
  const core = fs.readFileSync(DIR+"script_core.js","utf8");
  /* 주석에는 옛 프로젝트 이름이 설명으로 남아 있습니다.
     그래서 설정 덩어리만 잘라내서 봅니다 — 예전에 주석을 보고
     실패로 판정한 적이 있어서요. */
  const cfg = core.slice(core.indexOf("const firebaseConfig = {"),
                         core.indexOf("};", core.indexOf("const firebaseConfig = {")));
  ok(/projectId: "blsatang"/.test(cfg), "벨사탕 전용 프로젝트를 쓴다");
  ok(!/writer-chat/.test(cfg), "옛 프로젝트(writer-chat)가 남아 있지 않다");
  ok(!/themagam/.test(cfg), "더마감 프로젝트가 섞여 있지 않다");
  ok(/blsatang-default-rtdb/.test(cfg), "데이터베이스 주소가 벨사탕 것이다");
  ok(/apiKey: "AIza/.test(cfg), "apiKey 가 들어 있다");
  ["apiKey","authDomain","databaseURL","projectId","storageBucket",
   "messagingSenderId","appId"].forEach(k =>
    ok(new RegExp(k + ':').test(cfg), `설정에 ${k} 가 있다`));

  /* 로그인 */
  ok(/firebase-auth-compat\.js/.test(H), "firebase-auth 를 읽어온다");
  const tags = (H.match(/<script src="(script_[\w.-]+)/g) || []).map(t => t.split('"')[1]);
  ok(tags.indexOf("script_auth.js") === tags.indexOf("script_core.js") + 1,
     "script_auth.js 가 script_core.js 바로 뒤다");
  ok(tags.indexOf("script_auth.js") < tags.indexOf("script_profile.js"),
     "로그인 → 입장 → 프로필 순서다");
  ok(/id="pw-input"/.test(H), "비밀번호 칸이 있다");
  const auth = fs.readFileSync(DIR+"script_auth.js","utf8");
  ok(/belsatang\.local/.test(auth), "가짜 이메일 도메인이 벨사탕 것이다");
  ok(!/themagam\.local/.test(auth), "더마감 도메인이 남아 있지 않다");
  ok(/Persistence\.SESSION/.test(auth), "로그인이 탭 단위다");

  /* 보안 규칙 */
  const rules = JSON.parse(fs.readFileSync(DIR+"보안규칙.json","utf8")).rules;
  ok(rules.nickOwner && /!data\.exists\(\)/.test(rules.nickOwner.$nick[".write"]),
     "필명 도장은 덮어쓸 수 없다");
  ok(/nickOwner/.test(rules.users.$nick[".write"]), "users 는 도장 주인만 쓴다");
  /* 코드가 쓰는 경로가 규칙에 다 있는가 — 빠지면 조용히 거절됩니다 */
  const src = ["script_core.js","script_data.js","script_realtime.js","script_ui.js",
               "script_chat.js","script_timelog.js","script_profile.js","script_reactions.js",
               "script_pet.js","script_wordcount.js","script_auth.js"]
    .map(f => { try { return fs.readFileSync(DIR+f,"utf8"); } catch(e){ return ""; } }).join("\n");
  const roots = new Set();
  src.replace(/(?:db|window\.db|firebase\.database\(\))\s*\.ref\(\s*[`"']([a-zA-Z]+)/g,
              (m, r) => { roots.add(r); return m; });
  roots.forEach(r => ok(!!rules[r], `보안 규칙에 ${r} 경로가 있다`));

  /* 펫 */
  ok(tags.includes("script_pet.js") && tags.includes("script_pet_ui.js"), "펫 파일을 읽어온다");
  ok(/id="panel-pet"/.test(H), "설정에 펫 자리가 있다");
  ok(/petSpecies:/.test(rt), "카드에 펫 요약을 실어 보낸다");
  ok(/window\.Pet\.MAX_LEVEL/.test(rt), "카드가 만렙 값을 코드에서 가져온다 (숫자를 박지 않는다)");
  ok(!/Math\.min\(10, Number\(row\.petLevel\)/.test(rt), "레벨을 10에서 자르지 않는다");

  /* 업적 배지는 닉네임 앞 */
  ok(/<div class="card-name">\$\{achChips\}/.test(rt), "업적 배지가 닉네임 앞에 붙는다");
  ok(/\.card-name \.card-ach\{[^}]*font-size: \.9/.test(one),
     "배지 크기가 닉네임 글자를 따라간다 (em)");

  /* 뽀모 알약이 곧 진행 바 */
  ok(/id="timer-pill" class="is-fillable"/.test(H), "알약이 채워지는 형태다");
  const pillSeg = H.slice(H.indexOf('id="timer-pill"'), H.indexOf('</div>', H.indexOf('id="timer-text"')));
  ok(/id="pomo-bar"/.test(pillSeg), "진행 바가 알약 안에 들어 있다");
  ok((H.match(/id="pomo-bar"/g) || []).length === 1, "진행 바가 하나뿐이다 (옛 줄이 안 남았다)");
  ok(/#timer-pill\.is-fillable\{[^}]*overflow: hidden/.test(one),
     "차오른 색이 둥근 모서리를 넘지 않는다");

  /* 글자수 */
  ok(tags.includes("script_wordcount.js"), "글자수 파일을 읽어온다");
  ok(/<section class="pane pane-word" id="wordcount-block"/.test(H),
     "글자수가 독립된 창이다 (뽀모 안에 들어 있지 않다)");
  ok(H.indexOf('id="wordcount-block"') > H.indexOf('</section>', H.indexOf('id="pomo-block"')),
     "글자수 창이 뽀모 창 밖에 있다");
  ok(rules.wordlog && rules.wordfeed, "글자수 경로가 규칙에 있다");

  /* 네 칸 배치 */
  ok(/id: "word"/.test(lay), "배치 목록에 글자수가 있다");
  ok(!/id: "stat"|id: "todo"/.test(lay), "목표·투두는 창 목록에서 빠졌다");
  ok(/slotMapLand4/.test(lay), "저장 키를 새로 팠다 (칸 수가 바뀌었으므로)");
  ok(/portrait:\s*\{ dir: "v", kids: \["s1", "s2", "s3", "s4"\] \}/.test(lay),
     "세로 보기가 네 덩이를 위아래로 쌓는다");
  ok(/id="goals-modal"/.test(H), "목표·투두 팝업이 있다");
}

function finish(){
  console.log(`\n통과 ${pass} / 전체 ${pass+fail}`);
  if(fail){ console.log("\n실패:"); fails.forEach(f=>console.log("  ✗ "+f)); process.exit(1); }
  else console.log("전부 통과했습니다.");
}

/* ---- 11. 시간 기록 ---- */
{
  const src=fs.readFileSync(DIR+"script_timelog.js","utf8");
  const c2={window:{addEventListener(){}},document:{readyState:"complete",addEventListener(){},
    getElementById(){return null},querySelectorAll(){return []},visibilityState:"visible"},
    localStorage:{_v:{},getItem(k){return this._v[k]??null},setItem(k,v){this._v[k]=v}},
    db:{ref(){return{once:async()=>({val:()=>null}),set:async()=>{},push:async()=>{},remove(){}}}},
    myNick:"테스트", module:{exports:{}}, setInterval(){}, clearInterval(){}};
  c2.window.document=c2.document; vm.createContext(c2); vm.runInContext(src,c2);
  const T=c2.window.TimeLog;
  ok(!!T, "TimeLog 모듈이 로드된다");
  ok(T.STATUS_IDS.join(",")==="writing,focus,rest,away", "상태 네 가지를 구분한다");
  ok(T.OFFLINE_MIN_MS>=5*60*1000, `끊김 인정 간격이 5분 이상 (${Math.round(T.OFFLINE_MIN_MS/60000)}분)`);
  ok(T.SEG_CAP_MS>=4*60*60*1000, `한 구간 상한이 4시간 이상 (${Math.round(T.SEG_CAP_MS/3600000)}시간)`);

  // [중요] 타이머가 멈춘 것만으로 자리비움 처리하면 안 됩니다
  const tl=fs.readFileSync(DIR+"script_timelog.js","utf8");
  ok(!/pushSegment\("away"/.test(tl), "타이머 공백을 자리비움으로 찍지 않는다");
  ok(/\.info\/connected/.test(tl), "끊김 판단을 소켓(.info/connected)으로 한다");

  // 시간 표기
  ok(T.fmtDur(0)==="0분", "0분 표기");
  ok(T.fmtDur(59*1000)==="1분", "59초는 1분으로");
  ok(T.fmtDur(90*60*1000)==="1시간 30분", "90분 → 1시간 30분");
  ok(T.fmtDur(120*60*1000)==="2시간", "정확히 2시간은 분을 안 붙인다");

  // 하루를 넘기는 구간이 날짜별로 쪼개지는가
  const pushed=[];
  c2.db.ref=(path)=>({ push:async(seg)=>{ pushed.push({path,seg}); },
                       set:async()=>{}, once:async()=>({val:()=>null}), remove(){} });
  const d=new Date(); d.setHours(23,0,0,0);
  const from=d.getTime(), to=from+3*60*60*1000;   // 23시 → 다음날 2시
  return T.pushSegment("writing", from, to).then(()=>{
    ok(pushed.length===2, `자정을 넘는 구간이 두 날로 쪼개진다 (${pushed.length}개)`);
    const total=pushed.reduce((a,p)=>a+(p.seg.b-p.seg.a),0);
    ok(total===to-from, "쪼개도 총 시간이 보존된다");
    finish();
  });
}

