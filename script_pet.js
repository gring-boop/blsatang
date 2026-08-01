/* =====================================================================
   script_pet.js — 펫 키우기

   ---------------------------------------------------------------------
   무엇을 하는가

     집필 시간(WORK + 🔥초집중)이 쌓이면 펫이 자랍니다.
       · 5시간마다 1레벨, 100시간에 Lv.20 만렙
       · 만렙을 찍으면 도감에 들어가고, 안 가진 종류가 자동으로 시작
       · 20종 · 색은 종류마다 고정

   ---------------------------------------------------------------------
   Lv.1 은 "껍데기" 입니다

     무엇이 나올지 모르는 채로 시작합니다. 종류에 따라 담긴 것이 달라요.
       알        용 · 공작 · 병아리 · 펭귄
       보자기     고양이 · 강아지 · 토끼 · 다람쥐
       나무 상자  곰 · 물개 · 고래 · 판다
       씨앗       꽃 · 나무 · 풀
       선물 상자  구름 · 돌멩이 · 해 · 별

     Lv.2 에서 껍데기를 걸친 모습으로 태어나고, Lv.3 부터 온전해집니다.
     껍데기에는 펫 색이 들어가므로 "색은 미리, 종류는 나중에" 보입니다.

   ---------------------------------------------------------------------
   그림을 왜 계산으로 만드는가

     42종 × 20레벨 = 840장을 손으로 그릴 수는 없습니다.

     그래서 레벨을 0~1 값(t)으로 바꿔서 비율을 이어 움직이고, 특정
     레벨에서 부품을 붙입니다 (Lv.5 꼬리 · Lv.10 무늬 · Lv.15 날개 · 만렙 반짝이).
     색도 하나만 받아서 밝은 색·어두운 색을 계산해 씁니다.

     새 종류를 넣을 때는 DRAW 에 함수 하나만 추가하면 됩니다.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------
     [1] 규칙
     --------------------------------------------------------------- */
  /* [변경] 4시간 10레벨(40시간) → 5시간 20레벨(100시간)

     너무 빨리 다 자란다는 이야기가 있어서 늦췄습니다. 하루 2시간 쓰는
     분이 50일쯤 걸립니다. 부품이 붙는 자리도 Lv.5 / 10 / 15 / 20 으로
     벌려서, 오래 볼 거리가 생기게 했습니다. */
  const HOURS_PER_LEVEL = 5;
  const MAX_LEVEL       = 20;

  /* 부품이 붙는 레벨 — 한곳에 모아두면 다 같이 옮기기 쉽습니다 */
  const AT_TAIL = 5;    // 꼬리·날갯짓 같은 첫 변화
  const AT_MARK = 10;   // 무늬·잔가지
  const AT_WING = 15;   // 날개·수염

  const MS_PER_HOUR     = 60 * 60 * 1000;
  const PET_MS          = HOURS_PER_LEVEL * MAX_LEVEL * MS_PER_HOUR;   // 40시간

  const INK        = "#4A3F35";   // 껍데기 윤곽선 — 늘 같은 진한 갈색
  const HORN_GOLD  = "#E9B44C";   // 용의 뿔
  const RIBBON     = "#FFD028";   // 선물 상자 리본

  /* 종류 — group 이 Lv.1 껍데기를, hex 가 몸 색을 정합니다.

     [변경] 색은 이제 고를 수 없습니다. 종류마다 하나로 못박았어요.
     그래야 "무엇이 나왔나" 가 색으로도 읽히고, 도감이 20칸으로
     단순해집니다. 20색이 서로 겹치지 않게 골랐습니다. */
  const SPECIES = [
    { id: "dragon",   label: "용",      group: "egg",   hex: "#17A67F" },
    { id: "peacock",  label: "공작",    group: "egg",   hex: "#0E7C86" },
    { id: "chick",    label: "병아리",  group: "egg",   hex: "#FFD447" },
    { id: "penguin",  label: "펭귄",    group: "egg",   hex: "#2C4E8A" },
    { id: "frog",     label: "개구리",  group: "egg",   hex: "#5FB84A" },
    { id: "owl",      label: "부엉이",  group: "egg",   hex: "#8A6A4A" },
    { id: "parrot",   label: "앵무새",  group: "egg",   hex: "#E0453C" },
    { id: "turtle",   label: "거북이",  group: "egg",   hex: "#4E9A6B" },
    { id: "butterfly",label: "나비",    group: "egg",   hex: "#C46BD4" },
    { id: "bee",      label: "벌",      group: "egg",   hex: "#F2B417" },

    { id: "cat",      label: "고양이",  group: "cloth", hex: "#9C988E" },
    { id: "dog",      label: "강아지",  group: "cloth", hex: "#C08A3E" },
    { id: "rabbit",   label: "토끼",    group: "cloth", hex: "#F4A9C0" },
    { id: "squirrel", label: "다람쥐",  group: "cloth", hex: "#D9744A" },
    { id: "hedgehog", label: "고슴도치", group: "cloth", hex: "#8A6F5C" },
    { id: "hamster",  label: "햄스터",  group: "cloth", hex: "#E8C48A" },

    { id: "bear",     label: "곰",      group: "crate", hex: "#7E5233" },
    { id: "seal",     label: "물개",    group: "crate", hex: "#8095A8" },
    { id: "whale",    label: "고래",    group: "crate", hex: "#52A8E0" },
    { id: "panda",    label: "판다",    group: "crate", hex: "#3A3A38" },
    { id: "octopus",  label: "문어",    group: "crate", hex: "#B54A8C" },
    { id: "fox",      label: "여우",    group: "crate", hex: "#E07A33" },
    { id: "unicorn",  label: "유니콘",  group: "crate", hex: "#EFE6F2" },
    { id: "deer",     label: "사슴",    group: "crate", hex: "#B98552" },
    { id: "sheep",    label: "양",      group: "crate", hex: "#F0EDE6" },
    { id: "monkey",   label: "원숭이",  group: "crate", hex: "#B07A46" },
    { id: "coral",    label: "산호",    group: "crate", hex: "#F2736A" },

    { id: "rose",      label: "장미",    group: "seed",  hex: "#D8384C" },
    { id: "tulip",     label: "튤립",    group: "seed",  hex: "#E8574C" },
    { id: "lily",      label: "백합",    group: "seed",  hex: "#E8E3D6" },
    { id: "chrysanth", label: "국화",    group: "seed",  hex: "#F2C13D" },
    { id: "hydrangea", label: "수국",    group: "seed",  hex: "#7E9BE0" },
    { id: "sunflower", label: "해바라기", group: "seed", hex: "#F5A81C" },
    { id: "berry",     label: "열매",    group: "seed",  hex: "#C4304E" },
    { id: "tree",      label: "나무",    group: "seed",  hex: "#45822A" },
    { id: "grass",     label: "풀",      group: "seed",  hex: "#9DC94F" },

    { id: "cloud",    label: "구름",    group: "gift",  hex: "#B7CFE4" },
    { id: "stone",    label: "돌멩이",  group: "gift",  hex: "#6B6760" },
    { id: "sun",      label: "해",      group: "gift",  hex: "#F7A62B" },
    { id: "star",     label: "별",      group: "gift",  hex: "#A78BE0" },
    { id: "rainbow",  label: "무지개",  group: "gift",  hex: "#E86A6A" },
    { id: "moon",     label: "달",      group: "gift",  hex: "#F2D98C" }
  ];

  const SHELLS = {
    egg:   "알",
    cloth: "보자기",
    crate: "나무 상자",
    seed:  "씨앗",
    gift:  "선물 상자"
  };

  /* 껍데기 색은 종류와 무관하게 고정입니다.

     [중요] 몸 색이 종류마다 다르니, 껍데기에 그 색을 쓰면 색만 보고
     무엇이 들었는지 알 수 있습니다. 껍데기의 뜻이 사라지므로 껍데기
     종류마다 정해진 색을 씁니다. */
  const SHELL_COLOR = {
    egg:   "#EFC7D8",
    cloth: "#A9A0E8",
    crate: "#B98A52",
    seed:  "#C69A5E",
    gift:  "#F4A9C0"
  };

  const SPECIES_IDS = SPECIES.map(s => s.id);

  /* 이름이 바뀐 종류들.

     예전에 "꽃" 하나였던 것을 장미·튤립·백합·국화·수국·해바라기로
     나눴습니다. 이미 "flower" 를 키우고 계시거나 도감에 넣어두신 분이
     있어서, 옛 이름이 들어오면 장미로 읽습니다. 이 표가 없으면 그런
     분들의 펫이 엉뚱하게 용으로 보입니다. */
  const ALIAS = { flower: "rose" };

  function spec(id) {
    const key = ALIAS[id] || id;
    return SPECIES.find(s => s.id === key) || SPECIES[0];
  }
  function speciesLabel(id) { return spec(id).label; }
  function speciesGroup(id) { return spec(id).group; }
  function shellLabel(id) { return SHELLS[speciesGroup(id)] || "알"; }
  function colorHex(id) { return spec(id).hex; }

  /* ---------------------------------------------------------------
     [2] 색 계산 — 몸통색 하나에서 나머지를 만듭니다
     --------------------------------------------------------------- */
  function hexToRgb(hex) {
    const h = String(hex).replace("#", "");
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  function rgbToHex(r, g, b) {
    const c = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return "#" + c(r) + c(g) + c(b);
  }
  /** amt > 0 이면 밝게, < 0 이면 어둡게 (−1 ~ 1) */
  function shade(hex, amt) {
    const { r, g, b } = hexToRgb(hex);
    if (amt >= 0) return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
    const k = 1 + amt;
    return rgbToHex(r * k, g * k, b * k);
  }

  /** 색표는 종류 하나로 만듭니다 (색은 고를 수 없습니다) */
  function palette(species) {
    const base = spec(species).hex;
    const p = {
      body:  base,
      light: shade(base, 0.42),
      pale:  shade(base, 0.72),
      soft:  shade(base, 0.86),
      dark:  shade(base, -0.55),
      line:  shade(base, -0.30)
    };
    /* 판다만 예외 — 몸이 **검고** 배와 얼굴이 흽니다.

       [바뀐 이야기]
       처음엔 몸을 흰빛으로 두고 검은 무늬를 얹었는데, 흰 덩어리가
       너무 커서 곰인지 판다인지 애매했습니다. 실제 판다는 몸통과
       팔다리가 검고 배·얼굴이 흰 쪽이라, 그대로 뒤집었습니다.
       판다의 매력이 대비라서 여기서만 규칙이 다릅니다. */
    if (species === "panda") {
      p.body = base;                    // 몸 — 검정
      p.mark = "#F4F2EC";               // 무늬 — 흰빛 (배·얼굴)
      p.markDark = shade(base, -0.35);
      p.dark = shade(base, -0.6);
    }
    return p;
  }

  /* ---------------------------------------------------------------
     [3] 레벨 계산
     --------------------------------------------------------------- */
  function levelFromMs(ms) {
    const lv = Math.floor(Math.max(0, ms) / (HOURS_PER_LEVEL * MS_PER_HOUR)) + 1;
    return Math.max(1, Math.min(MAX_LEVEL, lv));
  }

  function petProgress(totalMs, doneCount) {
    const used = Math.max(0, Number(doneCount) || 0) * PET_MS;
    const curMs = Math.max(0, (Number(totalMs) || 0) - used);
    const capped = Math.min(curMs, PET_MS);
    const isMax = capped >= PET_MS;
    const intoLevel = capped % (HOURS_PER_LEVEL * MS_PER_HOUR);
    return {
      level: levelFromMs(capped),
      isMax,
      curMs: capped,
      totalNeed: PET_MS,
      ratio: Math.max(0, Math.min(1, capped / PET_MS)),
      toNextMs: isMax ? 0 : (HOURS_PER_LEVEL * MS_PER_HOUR) - intoLevel,
      overflowMs: Math.max(0, curMs - PET_MS)
    };
  }

  /* ---------------------------------------------------------------
     [4] 다음 펫 뽑기 — 같은 것이 또 나오지 않게
     --------------------------------------------------------------- */
  function pickNextPet(dex, rnd) {
    const rand = typeof rnd === "function" ? rnd : Math.random;
    const owned = new Set(Object.keys(dex || {}));

    /* 색이 종류에 묶였으니 도감은 20칸입니다.
       아직 못 모은 종류가 있으면 그중에서, 다 모았으면 아무거나. */
    const fresh = SPECIES_IDS.filter(sp => !owned.has(sp));
    const pool = fresh.length ? fresh : SPECIES_IDS;
    return { species: pool[Math.floor(rand() * pool.length)] };
  }

  /* 도감 열쇠는 종류뿐입니다 (색을 못 고르므로 조합이 없습니다) */
  function dexKey(species) { return species; }

  /* 껍데기를 고르면 그 그룹 안에서 무작위로 하나를 뽑습니다.

     고르는 것은 "껍데기"까지이고 안에 든 것은 여전히 비밀입니다.
     그래서 고르는 행위가 결과를 조작하지 않아요 — 원하는 종류를
     노려서 뽑을 수는 없습니다.
     아직 못 모은 종류를 먼저 씁니다. */
  function pickInGroup(group, dex, rnd) {
    const rand = typeof rnd === "function" ? rnd : Math.random;
    const owned = new Set(Object.keys(dex || {}));
    const inGroup = SPECIES_IDS.filter(id => speciesGroup(id) === group);
    if (!inGroup.length) return null;
    const fresh = inGroup.filter(id => !owned.has(id));
    const pool = fresh.length ? fresh : inGroup;
    return pool[Math.floor(rand() * pool.length)];
  }

  /* ---------------------------------------------------------------
     [5] 그림 — 좌표계는 60 × 56 고정
     --------------------------------------------------------------- */
  function lerp(a, b, t) { return a + (b - a) * t; }
  const n1 = v => Number(v).toFixed(1);

  function sparkles(show) {
    if (!show) return "";
    /* [변경 2026-08] 두 톤 금색 4각 별 — 큰 별 + 작은 별을 짝지어 답니다 */
    const s = (x, y, r, c) =>
      `<path d="M${x} ${n1(y - r * 3)}L${n1(x + r)} ${n1(y - r)}L${n1(x + r * 3)} ${y}L${n1(x + r)} ${n1(y + r)}L${x} ${n1(y + r * 3)}L${n1(x - r)} ${n1(y + r)}L${n1(x - r * 3)} ${y}L${n1(x - r)} ${n1(y - r)}Z" fill="${c}"/>`;
    return s(52, 8, 1.15, "#EF9F27") + s(50.2, 12.4, .6, "#FFD028")
         + s(7, 24, .95, "#EF9F27") + s(10.4, 19.6, .55, "#FFD028");
  }

  /* ---- 업그레이드 그림 공통 부품 (2026-08 리뉴얼) ----
     25종을 새로 그리면서 반복되는 조각을 모았습니다.
     기존 15종은 옛 face()/모양을 그대로 씁니다. */
  const oE = (cx, cy, rx, ry, f, sw) => `<ellipse cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="${f}"${sw ? ` stroke="${INK}" stroke-width="${sw}"` : ""}/>`;
  const oC = (cx, cy, r, f, sw) => `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r)}" fill="${f}"${sw ? ` stroke="${INK}" stroke-width="${sw}"` : ""}/>`;

  /** 업그레이드용 눈 — 흰 반짝임·볼터치·미소가 들어갑니다 */
  function eyes2(cx, cy, r, dark, o) {
    o = o || {};
    const dx = r * 0.36, ey = cy - r * 0.05, er = Math.max(1.3, r * 0.19);
    let s = `<circle cx="${n1(cx - dx)}" cy="${n1(ey)}" r="${n1(er)}" fill="${dark}"/><circle cx="${n1(cx + dx)}" cy="${n1(ey)}" r="${n1(er)}" fill="${dark}"/>`;
    s += `<circle cx="${n1(cx - dx + er * 0.3)}" cy="${n1(ey - er * 0.35)}" r=".6" fill="#fff"/><circle cx="${n1(cx + dx + er * 0.3)}" cy="${n1(ey - er * 0.35)}" r=".6" fill="#fff"/>`;
    if (o.blush) s += `<ellipse cx="${n1(cx - r * 0.72)}" cy="${n1(cy + r * 0.28)}" rx="${n1(r * 0.22)}" ry="${n1(r * 0.14)}" fill="#F2A2A2" opacity=".65"/><ellipse cx="${n1(cx + r * 0.72)}" cy="${n1(cy + r * 0.28)}" rx="${n1(r * 0.22)}" ry="${n1(r * 0.14)}" fill="#F2A2A2" opacity=".65"/>`;
    if (o.smile) s += `<path d="M${n1(cx - r * 0.2)} ${n1(cy + r * 0.4)}q${n1(r * 0.2)} ${n1(r * 0.2)} ${n1(r * 0.4)} 0" stroke="${dark}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    return s;
  }
  const belly2 = (b, col) => oE(b.cx, b.cy + b.ry * 0.3, b.rx * 0.55, b.ry * 0.5, col, 0);
  const feet2 = (b, col) => oE(b.cx - 5, b.cy + b.ry * 0.88, 3, 1.9, col, 1.1) + oE(b.cx + 5, b.cy + b.ry * 0.88, 3, 1.9, col, 1.1);

  /** 고정 좌표(만렙 기준)로 그린 그림을 레벨에 맞춰 줄입니다.
      바닥 중앙(28, 52)을 기준점으로 삼아 아기 때는 72%까지 작아져요. */
  function grow(t, inner) {
    const s = lerp(0.72, 1, t);
    if (s > 0.995) return inner;
    return `<g transform="translate(${(28 * (1 - s)).toFixed(2)} ${(52 * (1 - s)).toFixed(2)}) scale(${s.toFixed(3)})">${inner}</g>`;
  }

  /** 눈·입 — 거의 모든 종류가 같이 씁니다 */
  function face(cx, cy, r, p, smile) {
    const dx = r * 0.36, ey = cy - r * 0.05, er = Math.max(1.2, r * 0.18);
    return `
      <circle cx="${n1(cx - dx)}" cy="${n1(ey)}" r="${n1(er)}" fill="${p.dark}"/>
      <circle cx="${n1(cx + dx)}" cy="${n1(ey)}" r="${n1(er)}" fill="${p.dark}"/>
      ${smile ? `<path d="M${n1(cx - r * 0.22)} ${n1(cy + r * 0.38)}q${n1(r * 0.22)} ${n1(r * 0.2)} ${n1(r * 0.44)} 0" stroke="${p.dark}" stroke-width="1.2" fill="none" stroke-linecap="round"/>` : ""}`;
  }

  /* ===============================================================
     [5-1] Lv.1 껍데기
     =============================================================== */
  /* 보자기는 clipPath 를 씁니다. id 가 겹치면 한 화면에 여러 마리를 그릴 때
     (도감처럼) 서로의 잘라내기 틀을 물어와 줄무늬가 사라집니다.
     그래서 그릴 때마다 새 id 를 붙입니다. */
  let _clipSeq = 0;

  /** 껍데기용 색표 — 껍데기 종류의 고정색에서 만듭니다 */
  function shellPalette(group) {
    const base = SHELL_COLOR[group] || SHELL_COLOR.egg;
    return {
      body:  base,
      light: shade(base, 0.30),
      pale:  shade(base, 0.58),
      soft:  shade(base, 0.78),
      dark:  shade(base, -0.55),
      line:  shade(base, -0.30)
    };
  }

  const SHELL_DRAW = {

    egg(p) {
      return `
        <ellipse cx="30" cy="32" rx="11" ry="14" fill="#F4F1E8" stroke="${INK}" stroke-width="1.4"/>
        <ellipse cx="28" cy="27" rx="6.5" ry="8" fill="#FFFFFF" opacity=".55"/>
        <circle cx="24" cy="37" r="2.2" fill="${p.light}"/>
        <circle cx="34" cy="30" r="1.7" fill="${p.light}"/>
        <circle cx="31" cy="41" r="1.4" fill="${p.light}"/>`;
    },

    /* 보자기 — 세로 줄무늬 + 큰 두 갈래 리본 */
    cloth(p) {
      const body = "M30 22C13 24 9 35 13 43 17 50 43 50 47 43 51 35 47 24 30 22Z";
      const cid = "petclip" + (++_clipSeq);
      return `
        <defs><clipPath id="${cid}"><path d="${body}"/></clipPath></defs>
        <g clip-path="url(#${cid})">
          <rect x="8"  y="20" width="12" height="32" fill="${p.light}"/>
          <rect x="20" y="20" width="10" height="32" fill="${p.soft}"/>
          <rect x="30" y="20" width="9"  height="32" fill="${p.pale}"/>
          <rect x="39" y="20" width="13" height="32" fill="${p.body}"/>
        </g>
        <path d="${body}" fill="none" stroke="${INK}" stroke-width="1.5"/>
        <path d="M20 22.6v25M30 21.8v27M39 22.4v25.6" stroke="${INK}" stroke-width="1.1"/>
        <path d="M27 21C18 9 5 7 8 15 10 20 21 23 27 21Z" fill="${p.soft}" stroke="${INK}" stroke-width="1.5"/>
        <path d="M33 21C42 9 55 7 52 15 50 20 39 23 33 21Z" fill="${p.light}" stroke="${INK}" stroke-width="1.5"/>
        <path d="M27 18.5q-2.5 -1.5 -1 -3.5" stroke="${INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
        <path d="M33 18.5q2.5 -1.5 1 -3.5" stroke="${INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
        <rect x="26.6" y="16.5" width="6.8" height="6.5" rx="2" fill="${p.pale}" stroke="${INK}" stroke-width="1.4"/>`;
    },

    crate(p) {
      return `
        <rect x="14" y="24" width="28" height="20" rx="2.5" fill="#B98A52" stroke="${INK}" stroke-width="1.4"/>
        <rect x="14" y="24" width="28" height="5"  rx="2"   fill="#A0743F" stroke="${INK}" stroke-width="1.2"/>
        <path d="M14 34h28M22 29v15M34 29v15" stroke="${INK}" stroke-width="1.1" opacity=".55"/>
        <circle cx="18.5" cy="26.5" r="1" fill="${INK}" opacity=".6"/>
        <circle cx="37.5" cy="26.5" r="1" fill="${INK}" opacity=".6"/>
        <path d="M19 22h22" stroke="${p.body}" stroke-width="2.6" stroke-linecap="round"/>`;
    },

    seed(p) {
      return `
        <path d="M30 45q-8.5 -4.5 -8.5 -12.5 0 -8.5 8.5 -12.5 8.5 4 8.5 12.5 0 8 -8.5 12.5z"
              fill="#C69A5E" stroke="${INK}" stroke-width="1.4"/>
        <path d="M30 42q-5 -4 -5 -10 0 -6 5 -10" stroke="${INK}" stroke-width="1" fill="none" opacity=".45"/>
        <path d="M30 20v-5" stroke="${p.body}" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M30 16q4.5 -4.5 6.5 -1 -3 3.5 -6.5 1z" fill="${p.light}" stroke="${INK}" stroke-width="1.1"/>`;
    },

    /* 선물 상자 — 납작한 정면 상자 + 노란 리본 */
    gift(p) {
      return `
        <rect x="14" y="26" width="28" height="18" rx="2.5" fill="${p.light}" stroke="${INK}" stroke-width="1.4"/>
        <rect x="12" y="21.5" width="32" height="6.5" rx="2" fill="${p.body}" stroke="${INK}" stroke-width="1.4"/>
        <path d="M30 22v22" stroke="${RIBBON}" stroke-width="3.4"/>
        <path d="M30 21.5q-7.5 -9.5 -10.5 -3 3 4.5 10.5 3z" fill="${RIBBON}" stroke="${INK}" stroke-width="1.2"/>
        <path d="M30 21.5q7.5 -9.5 10.5 -3 -3 4.5 -10.5 3z" fill="${RIBBON}" stroke="${INK}" stroke-width="1.2"/>
        <circle cx="30" cy="20" r="2.3" fill="${shade(RIBBON, -0.2)}" stroke="${INK}" stroke-width="1.1"/>`;
    }
  };

  /* Lv.2 — 껍데기를 걸친 모습 (몸 위에 조각만 얹습니다) */
  function shellRemnant(group, p, head) {
    const h = head || { cx: 28, cy: 20, r: 9 };
    switch (group) {
      case "egg":
        return `
          <path d="M${n1(h.cx - h.r - 1)} ${n1(h.cy - h.r * 0.35)}
                   l3 3 3 -3 3 3 3 -3 3 3 3 -3"
                stroke="#E4DFD2" stroke-width="2" fill="none" stroke-linejoin="round"/>
          <path d="M${n1(h.cx - h.r - 1)} ${n1(h.cy - h.r * 0.35)}
                   a${n1(h.r + 1)} ${n1(h.r + 1)} 0 0 1 ${n1((h.r + 1) * 2)} 0z"
                fill="#F4F1E8" stroke="${INK}" stroke-width="1.1"/>`;
      case "cloth":
        return `<path d="M${n1(h.cx - 10)} ${n1(h.cy + h.r)}q10 14 20 0 -4 12 -20 0z"
                      fill="${p.soft}" stroke="${INK}" stroke-width="1.1"/>`;
      case "crate":
        return `<rect x="${n1(h.cx - 13)}" y="38" width="26" height="10" rx="2"
                      fill="#B98A52" stroke="${INK}" stroke-width="1.2"/>`;
      case "seed":
        return `<path d="M${n1(h.cx - 5)} 46q5 4 10 0 -2 -5 -10 0z"
                      fill="#C69A5E" stroke="${INK}" stroke-width="1.1"/>`;
      case "gift":
        return `
          <path d="M${n1(h.cx)} ${n1(h.cy - h.r + 1)}q-6 -7 -8.5 -2 2.5 3.5 8.5 2z" fill="${RIBBON}" stroke="${INK}" stroke-width="1"/>
          <path d="M${n1(h.cx)} ${n1(h.cy - h.r + 1)}q6 -7 8.5 -2 -2.5 3.5 -8.5 2z" fill="${RIBBON}" stroke="${INK}" stroke-width="1"/>`;
      default: return "";
    }
  }

  /* ===============================================================
     [5-2] 종류별 그리기
     =============================================================== */
/* ── 씨앗에서 나오는 무리 (꽃) ────────────────────────────────
     [성장 단계]
     화분은 두지 않습니다. 땅에서 바로 자라는 모습이 더 시원해요.

       Lv.2~4    싹     — 짧은 줄기에 떡잎 두 장
       Lv.5~9    잎     — 줄기가 자라고 잎이 붙습니다
       Lv.10~14  꽃봉오리 — 아직 다물고 있어요
       Lv.15~    꽃     — 활짝 핍니다

     여섯 꽃이 이 뼈대를 그대로 씁니다. 다른 것은 **핀 모습**뿐이라,
     줄기·잎·봉오리를 한 곳에 모아두고 꽃만 갈아 끼웁니다.
     그래야 여섯 꽃이 한 식구로 보이고, 고칠 때도 한 번만 고칩니다. */

  /* 단계 나누기 — 숫자를 여기 한 곳에만 둡니다 */
  function plantStage(lv) {
    if (lv < AT_TAIL)  return "sprout";   // Lv.2~4
    if (lv < AT_MARK)  return "leaf";     // Lv.5~9
    if (lv < AT_WING)  return "bud";      // Lv.10~14
    return "bloom";                       // Lv.15~
  }

  const STEM = "#5E9130";
  const LEAF = "#7FB53F";

  /* 줄기와 잎 — 단계에 따라 키가 자랍니다 */
  function plantBase(lv, t, topY) {
    const st = plantStage(lv);
    const leafR = lerp(4.6, 6.4, t);
    const leaf = (sx, y, scale) => `
      <path d="M28 ${n1(y)}q${n1(sx * leafR * scale * 1.5)} -${n1(leafR * scale * 0.9)} ${n1(sx * leafR * scale * 2)} ${n1(leafR * scale * 0.1)}
               q-${n1(sx * leafR * scale * 0.9)} ${n1(leafR * scale * 1.1)} -${n1(sx * leafR * scale * 2)} -${n1(leafR * scale * 0.1)}z"
            fill="${LEAF}"/>`;
    if (st === "sprout") {
      /* 싹 — 떡잎 두 장. 줄기는 아주 짧게 */
      return `
        <path d="M28 50V${n1(topY + 2)}" stroke="${STEM}" stroke-width="2.2" stroke-linecap="round"/>
        ${leaf(-1, topY + 4, 0.72)}${leaf(1, topY + 4, 0.72)}`;
    }
    return `
      <path d="M28 50V${n1(topY)}" stroke="${STEM}" stroke-width="${n1(lerp(2.4, 3.2, t))}" stroke-linecap="round"/>
      ${leaf(-1, 40, 1)}
      ${st !== "leaf" ? leaf(1, 34, 0.92) : ""}`;
  }

  /* 아직 다문 봉오리 — 꽃마다 색만 다릅니다 */
  function plantBud(p, cy, r) {
    return `
      <ellipse cx="28" cy="${n1(cy)}" rx="${n1(r * 0.62)}" ry="${n1(r * 0.95)}" fill="${p.body}"/>
      <path d="M${n1(28 - r * 0.62)} ${n1(cy + r * 0.5)}q${n1(r * 0.62)} ${n1(r * 0.5)} ${n1(r * 1.24)} 0" fill="${LEAF}"/>`;
  }

  /* 꽃 한 종류를 만드는 틀.
     bloom(p, cy, r, t) 만 넘기면 나머지는 다 같습니다. */
  function makeFlower(bloom) {
    return function (g) {
      const { p, t, lv } = g;
      const st = plantStage(lv);
      const cy = st === "sprout" ? 34 : lerp(26, 21, t);
      const r  = lerp(5.4, 7.4, t);
      const topY = st === "sprout" ? 38 : cy + r * 0.8;
      return `
        ${plantBase(lv, t, topY)}
        ${st === "sprout" ? "" : st === "leaf" ? "" : st === "bud"
          ? plantBud(p, cy, r)
          : bloom(p, cy, r, t)}`;
    };
  }

  const DRAW = {

    cat(g) {
      const { p, t, lv, body: b, head: h } = g;
      const earH = lerp(5, 8, t);
      return `
        ${lv >= AT_TAIL ? `<path d="M${n1(b.cx + b.rx * 1.05)} ${n1(b.cy - 2)}q${n1(lerp(8, 12, t))} -1 ${n1(lerp(6, 9, t))} ${n1(lerp(9, 12, t))}" stroke="${p.body}" stroke-width="${n1(lerp(3, 4, t))}" fill="none" stroke-linecap="round"/>` : ""}
        <ellipse cx="${b.cx}" cy="${n1(b.cy)}" rx="${n1(b.rx)}" ry="${n1(b.ry)}" fill="${p.body}"/>
        <circle cx="${h.cx}" cy="${n1(h.cy)}" r="${n1(h.r)}" fill="${p.body}"/>
        <path d="M${n1(h.cx - h.r * 0.85)} ${n1(h.cy - h.r * 0.75)}l${n1(h.r * 0.06)} -${n1(earH)} ${n1(h.r * 0.68)} ${n1(earH * 0.58)}z" fill="${p.body}"/>
        <path d="M${n1(h.cx + h.r * 0.85)} ${n1(h.cy - h.r * 0.75)}l-${n1(h.r * 0.06)} -${n1(earH)} -${n1(h.r * 0.68)} ${n1(earH * 0.58)}z" fill="${p.body}"/>
        ${lv >= AT_WING ? `<path d="M${n1(h.cx - h.r - 5)} ${n1(h.cy + 2)}h6M${n1(h.cx + h.r - 1)} ${n1(h.cy + 2)}h6" stroke="${p.body}" stroke-width="1.1" stroke-linecap="round"/>` : ""}
        ${face(h.cx, h.cy, h.r, p, lv >= AT_TAIL)}`;
    },

    dog(g) {
      /* [2026-08 리뉴얼] 늘어진 귀 윤곽 + 주둥이·코·입, 혀는 Lv.15 */
      const { p, t, lv, body: b, head: h } = g;
      const ear = s => `<path d="M${n1(h.cx + s * (h.r - 1))} ${n1(h.cy - h.r * 0.75)}q${s * 8} 0 ${s * 7} 12 q-1 4 -5 3 q-3.4 -1 -3.4 -6z" fill="${p.line}" stroke="${INK}" stroke-width="1.3"/>`;
      return `
        ${lv >= AT_TAIL ? `<path d="M${n1(b.cx + b.rx)} ${n1(b.cy - 4)}q7.4 -7 9.6 1.6" stroke="${INK}" stroke-width="5.6" fill="none" stroke-linecap="round"/>
        <path d="M${n1(b.cx + b.rx)} ${n1(b.cy - 4)}q7.4 -7 9.6 1.6" stroke="${p.body}" stroke-width="4" fill="none" stroke-linecap="round"/>` : ""}
        ${oE(b.cx, b.cy, b.rx, b.ry, p.body, 1.4)}
        ${belly2(b, p.pale)}${feet2(b, p.body)}
        ${oC(h.cx, h.cy, h.r, p.body, 1.4)}
        ${ear(-1)}${ear(1)}
        ${eyes2(h.cx, h.cy, h.r, p.dark, { blush: lv >= AT_MARK })}
        ${oE(h.cx, h.cy + h.r * 0.5, h.r * 0.46, h.r * 0.36, p.pale, 0)}
        <ellipse cx="${h.cx}" cy="${n1(h.cy + h.r * 0.36)}" rx="1.9" ry="1.4" fill="${p.dark}"/>
        <path d="M${h.cx} ${n1(h.cy + h.r * 0.5)}v1.6M${h.cx} ${n1(h.cy + h.r * 0.68)}q-1.6 1.4 -2.8 .4M${h.cx} ${n1(h.cy + h.r * 0.68)}q1.6 1.4 2.8 .4" stroke="${p.dark}" stroke-width=".9" fill="none" stroke-linecap="round"/>
        ${lv >= AT_WING ? `<path d="M${n1(h.cx + 1)} ${n1(h.cy + h.r * 0.74)}q1.4 2.6 -.6 3.2 -1.6 -.4 -1 -2.6" fill="#E88AA0" stroke="#C86A80" stroke-width=".7"/>` : ""}`;
    },

    rabbit(g) {
      const { p, t, lv, body: b, head: h } = g;
      const earH = lerp(7.5, 11.5, t);
      const ear = sx => `
        <ellipse cx="${n1(h.cx + sx * h.r * 0.6)}" cy="${n1(h.cy - h.r - earH * 0.45)}" rx="${n1(lerp(2.8, 3.6, t))}" ry="${n1(earH)}" fill="${p.body}"/>
        <ellipse cx="${n1(h.cx + sx * h.r * 0.6)}" cy="${n1(h.cy - h.r - earH * 0.4)}" rx="${n1(lerp(1.1, 1.6, t))}" ry="${n1(earH * 0.68)}" fill="${p.light}"/>`;
      return `
        ${lv >= AT_TAIL ? `<circle cx="${n1(b.cx + b.rx * 1.05)}" cy="${n1(b.cy + 3)}" r="${n1(lerp(3.4, 5, t))}" fill="${p.pale}"/>` : ""}
        <ellipse cx="${b.cx}" cy="${n1(b.cy)}" rx="${n1(b.rx)}" ry="${n1(b.ry)}" fill="${p.body}"/>
        ${ear(-1)}${ear(1)}
        <circle cx="${h.cx}" cy="${n1(h.cy)}" r="${n1(h.r)}" fill="${p.body}"/>
        ${face(h.cx, h.cy, h.r, p, true)}`;
    },

/* ── 보자기에서 나오는 무리 (2차) ───────────────────────────── */

    hedgehog(g) {
      /* [2026-08 리뉴얼] 정면 — 흰 얼굴 + 붓터치 가시 갈기 (캡쳐 참고).
         이마 잔가시 Lv.10, 앞발 Lv.5, 발가락 선 Lv.15 */
      const { t, lv } = g;
      const CREAM = "#F6F1E6", BR1 = "#7A5230", BR2 = "#9A7248", BR3 = "#5C3A20", TAN = "#D8A87E";
      const cx = 28, cy = 29, R0 = 10.6, N = 20;
      let mane = "";
      for (let k = 0; k < N; k++) {
        const a = Math.PI * 2 * k / N - Math.PI / 2;
        const bottom = Math.sin(a) > 0.62;
        const len = (bottom ? 4 : 6.8 + (k % 3) * 1.6) * lerp(0.7, 1, t);
        const w = 0.26;
        const x1 = cx + Math.cos(a - w) * R0, y1 = cy + Math.sin(a - w) * R0 * 0.96;
        const x2 = cx + Math.cos(a) * (R0 + len), y2 = cy + Math.sin(a) * (R0 + len) * 0.96;
        const x3 = cx + Math.cos(a + w) * R0, y3 = cy + Math.sin(a + w) * R0 * 0.96;
        mane += `<path d="M${n1(x1)} ${n1(y1)}L${n1(x2)} ${n1(y2)}L${n1(x3)} ${n1(y3)}z" fill="${[BR1, BR2, BR3][k % 3]}" stroke="${INK}" stroke-width=".7" stroke-linejoin="round"/>`;
      }
      return grow(t, `
        ${mane}
        <circle cx="${cx}" cy="${cy}" r="${R0 + 1}" fill="${CREAM}" stroke="${INK}" stroke-width="1.4"/>
        ${lv >= AT_MARK ? `<path d="M${cx - 4.6} ${cy - 8.2}l1.4 -3.4 1.6 3M${cx - 0.8} ${cy - 9.2}l1.2 -3.2 1.6 2.8M${cx + 3.2} ${cy - 8.4}l1.6 -3 1.2 3.2" stroke="${BR1}" stroke-width="1.2" fill="none" stroke-linejoin="round"/>` : ""}
        <circle cx="${cx - 8.2}" cy="${cy - 6.6}" r="2" fill="${TAN}" stroke="${INK}" stroke-width="1"/>
        <circle cx="${cx + 8.2}" cy="${cy - 6.6}" r="2" fill="${TAN}" stroke="${INK}" stroke-width="1"/>
        <circle cx="${cx - 3.6}" cy="${n1(cy - 1.2)}" r="1.6" fill="#2A2A28"/>
        <circle cx="${cx + 3.6}" cy="${n1(cy - 1.2)}" r="1.6" fill="#2A2A28"/>
        <circle cx="${n1(cx - 3.1)}" cy="${n1(cy - 1.7)}" r=".55" fill="#fff"/>
        <circle cx="${n1(cx + 4.1)}" cy="${n1(cy - 1.7)}" r=".55" fill="#fff"/>
        <ellipse cx="${cx}" cy="${n1(cy + 2.6)}" rx="2" ry="1.5" fill="${BR1}" stroke="${INK}" stroke-width=".9"/>
        <path d="M${cx} ${n1(cy + 4.1)}v1.5M${cx} ${n1(cy + 5.6)}q-1.6 1.4 -3 .5M${cx} ${n1(cy + 5.6)}q1.6 1.4 3 .5" stroke="${BR3}" stroke-width=".95" fill="none" stroke-linecap="round"/>
        <ellipse cx="${cx - 7}" cy="${n1(cy + 3.2)}" rx="2" ry="1.3" fill="#F088A0" opacity=".75"/>
        <ellipse cx="${cx + 7}" cy="${n1(cy + 3.2)}" rx="2" ry="1.3" fill="#F088A0" opacity=".75"/>
        ${lv >= AT_TAIL ? `<ellipse cx="${cx - 2.6}" cy="${n1(cy + 9.4)}" rx="2.5" ry="3.2" fill="${TAN}" stroke="${INK}" stroke-width="1.1" transform="rotate(14 ${cx - 2.6} ${n1(cy + 9.4)})"/>
        <ellipse cx="${cx + 2.6}" cy="${n1(cy + 9.4)}" rx="2.5" ry="3.2" fill="${TAN}" stroke="${INK}" stroke-width="1.1" transform="rotate(-14 ${cx + 2.6} ${n1(cy + 9.4)})"/>` : ""}
        ${lv >= AT_WING ? `<path d="M${n1(cx - 3.2)} ${n1(cy + 8)}l0 3M${n1(cx - 1.6)} ${n1(cy + 8.2)}l0 3M${n1(cx + 1.6)} ${n1(cy + 8.2)}l0 3M${n1(cx + 3.2)} ${n1(cy + 8)}l0 3" stroke="${BR2}" stroke-width=".7" opacity=".8"/>` : ""}`);
    },

    hamster(g) {
      /* [2026-08 리뉴얼] 머리·몸이 한 덩어리, 분홍 귀 안쪽·볼주머니.
         씨앗은 Lv.10부터 손에 쥡니다 */
      const { p, t, lv, body: b } = g;
      return `
        ${oE(b.cx, b.cy - 4, b.rx, b.ry + 4, p.body, 1.4)}
        ${oE(b.cx, b.cy + 2, b.rx * 0.62, b.ry * 0.62, p.pale, 0)}
        ${oC(b.cx - 9.4, b.cy - 9, 4.4, p.body, 1.2)}${oC(b.cx + 9.4, b.cy - 9, 4.4, p.body, 1.2)}
        <circle cx="${n1(b.cx - 9.4)}" cy="${n1(b.cy - 9)}" r="2.2" fill="#F2C8D0"/>
        <circle cx="${n1(b.cx + 9.4)}" cy="${n1(b.cy - 9)}" r="2.2" fill="#F2C8D0"/>
        <ellipse cx="${n1(b.cx - 7)}" cy="${n1(b.cy)}" rx="4.4" ry="3.8" fill="${p.light}" opacity=".85"/>
        <ellipse cx="${n1(b.cx + 7)}" cy="${n1(b.cy)}" rx="4.4" ry="3.8" fill="${p.light}" opacity=".85"/>
        ${eyes2(b.cx, b.cy - 6, 7, p.dark, { blush: true })}
        <path d="M${n1(b.cx - 1.2)} ${n1(b.cy - 3.2)}h2.4l-1.2 1.4z" fill="#E88AA0"/>
        <path d="M${n1(b.cx)} ${n1(b.cy - 1.8)}q-1.6 1.6 -3 .6M${n1(b.cx)} ${n1(b.cy - 1.8)}q1.6 1.6 3 .6" stroke="${p.dark}" stroke-width=".9" fill="none" stroke-linecap="round"/>
        ${oE(b.cx - 4, b.cy + 5, 2.5, 1.9, p.pale, 1)}${oE(b.cx + 4, b.cy + 5, 2.5, 1.9, p.pale, 1)}
        ${lv >= AT_MARK ? `<ellipse cx="${n1(b.cx)}" cy="${n1(b.cy + 3.2)}" rx="2" ry="2.6" fill="#E8D4A0" stroke="${INK}" stroke-width=".8"/>` : ""}
        ${oE(b.cx - 5, b.cy + b.ry * 0.82, 3, 1.9, p.body, 1.1)}${oE(b.cx + 5, b.cy + b.ry * 0.82, 3, 1.9, p.body, 1.1)}`;
    },

    chick(g) {
      const { p, t, lv, body: b, head: h } = g;
      return `
        <path d="M${n1(b.cx - 3)} ${n1(b.cy + b.ry)}v3.5M${n1(b.cx + 3)} ${n1(b.cy + b.ry)}v3.5" stroke="${p.line}" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="${b.cx}" cy="${n1(b.cy)}" rx="${n1(b.rx)}" ry="${n1(b.ry)}" fill="${p.body}"/>
        ${lv >= AT_TAIL ? `<ellipse cx="${n1(b.cx - b.rx * 0.92)}" cy="${n1(b.cy - 1)}" rx="${n1(lerp(3.4, 4.6, t))}" ry="${n1(lerp(5.4, 7, t))}" fill="${p.light}"/>
                     <ellipse cx="${n1(b.cx + b.rx * 0.92)}" cy="${n1(b.cy - 1)}" rx="${n1(lerp(3.4, 4.6, t))}" ry="${n1(lerp(5.4, 7, t))}" fill="${p.light}"/>` : ""}
        <circle cx="${h.cx}" cy="${n1(h.cy)}" r="${n1(h.r)}" fill="${p.body}"/>
        ${lv >= AT_WING ? `<path d="M${n1(h.cx - 4)} ${n1(h.cy - h.r - 0.5)}q4 -6 8 0z" fill="${p.light}"/>` : ""}
        ${face(h.cx, h.cy, h.r, p, false)}
        <path d="M${h.cx} ${n1(h.cy + h.r * 0.3)}l-2.4 3h4.8z" fill="#D85A30"/>`;
    },

    penguin(g) {
      /* [2026-08 리뉴얼] 윤곽선·흰 배 판·볼 — 날개 Lv.5, 발 Lv.15는 그대로 */
      const { p, lv, body: b, head: h } = g;
      const wing = s => `
        <path d="M${n1(b.cx + s * b.rx)} ${n1(b.cy - 6)}q${n1(s * 7)} 5 ${n1(s * 2.4)} 14" stroke="${INK}" stroke-width="5.8" fill="none" stroke-linecap="round"/>
        <path d="M${n1(b.cx + s * b.rx)} ${n1(b.cy - 6)}q${n1(s * 7)} 5 ${n1(s * 2.4)} 14" stroke="${p.body}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      return `
        ${lv >= AT_WING ? `<path d="M${n1(b.cx - 8)} ${n1(b.cy + b.ry - 1)}l-5.5 4.6h11zM${n1(b.cx + 8)} ${n1(b.cy + b.ry - 1)}l5.5 4.6h-11z" fill="#EF9F27" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` : ""}
        ${lv >= AT_TAIL ? wing(-1) + wing(1) : ""}
        ${oE(b.cx, b.cy, b.rx, b.ry, p.body, 1.4)}
        <path d="M${n1(b.cx)} ${n1(b.cy - b.ry + 1.5)}q${n1(b.rx * 0.62)} 1.5 ${n1(b.rx * 0.62)} ${n1(b.ry * 0.9)} 0 ${n1(b.ry * 0.95)} -${n1(b.rx * 0.62)} ${n1(b.ry * 1.02)} -${n1(b.rx * 0.62)} 0 -${n1(b.rx * 0.62)} -${n1(b.ry * 1.02)} 0 -${n1(b.ry * 0.9)} ${n1(b.rx * 0.62)} -${n1(b.ry * 0.9)}z" fill="#F6F3EA"/>
        ${oC(h.cx, h.cy, h.r, p.body, 1.4)}
        <circle cx="${n1(h.cx - h.r * 0.38)}" cy="${n1(h.cy + h.r * 0.02)}" r="${n1(h.r * 0.44)}" fill="#F6F3EA"/>
        <circle cx="${n1(h.cx + h.r * 0.38)}" cy="${n1(h.cy + h.r * 0.02)}" r="${n1(h.r * 0.44)}" fill="#F6F3EA"/>
        ${eyes2(h.cx, h.cy, h.r, "#2A2A28", { blush: lv >= AT_MARK })}
        <path d="M${h.cx} ${n1(h.cy + h.r * 0.26)}l-3 3.4h6z" fill="#EF9F27" stroke="${INK}" stroke-width="1"/>`;
    },

/* ── 알에서 나오는 무리 (2차) ──────────────────────────────────
       기존 넷(용·공작·병아리·펭귄)과 같은 결로 그립니다.
       몸통 타원 + 머리 원을 기본으로 두고, 그 종만의 표시를 얹어요. */

    frog(g) {
      /* 개구리 — 눈이 머리 위로 볼록 솟은 게 전부입니다.
         입을 넓게 그으면 개구리다움이 확 살아나서 얼굴은 따로 그립니다. */
      const { p, t, lv, body: b, head: h } = g;
      const eyeR = lerp(2.6, 3.2, t);
      const eye = sx => `
        <circle cx="${n1(h.cx + sx * h.r * 0.52)}" cy="${n1(h.cy - h.r * 0.72)}" r="${n1(eyeR)}" fill="${p.light}"/>
        <circle cx="${n1(h.cx + sx * h.r * 0.52)}" cy="${n1(h.cy - h.r * 0.72)}" r="${n1(eyeR * 0.45)}" fill="${p.dark}"/>`;
      return `
        ${lv >= AT_TAIL ? `<ellipse cx="${n1(b.cx - b.rx * 0.9)}" cy="${n1(b.cy + b.ry * 0.8)}" rx="${n1(lerp(3.4, 4.6, t))}" ry="${n1(lerp(1.8, 2.4, t))}" fill="${p.dark}"/>
                     <ellipse cx="${n1(b.cx + b.rx * 0.9)}" cy="${n1(b.cy + b.ry * 0.8)}" rx="${n1(lerp(3.4, 4.6, t))}" ry="${n1(lerp(1.8, 2.4, t))}" fill="${p.dark}"/>` : ""}
        <ellipse cx="${b.cx}" cy="${n1(b.cy)}" rx="${n1(b.rx)}" ry="${n1(b.ry)}" fill="${p.body}"/>
        <ellipse cx="${b.cx}" cy="${n1(b.cy + 2)}" rx="${n1(b.rx * 0.58)}" ry="${n1(b.ry * 0.7)}" fill="${p.pale}"/>
        <circle cx="${h.cx}" cy="${n1(h.cy)}" r="${n1(h.r)}" fill="${p.body}"/>
        ${eye(-1)}${eye(1)}
        <path d="M${n1(h.cx - h.r * 0.55)} ${n1(h.cy + h.r * 0.25)}q${n1(h.r * 0.55)} ${n1(h.r * 0.45)} ${n1(h.r * 1.1)} 0" stroke="${p.dark}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
        ${lv >= AT_MARK ? `<circle cx="${n1(b.cx - 4)}" cy="${n1(b.cy - 2)}" r="1.6" fill="${p.dark}" opacity=".55"/>
                     <circle cx="${n1(b.cx + 5)}" cy="${n1(b.cy + 2)}" r="1.3" fill="${p.dark}" opacity=".55"/>` : ""}`;
    },

    owl(g) {
      /* 부엉이 — 큰 눈테와 머리 위 뿔깃.
         눈테를 두 겹으로 그려야 "부엉이 눈"으로 읽힙니다. */
      const { p, t, lv, body: b, head: h } = g;
      const tuftH = lerp(3.6, 5.4, t);
      const ring = sx => `
        <circle cx="${n1(h.cx + sx * h.r * 0.42)}" cy="${n1(h.cy - h.r * 0.05)}" r="${n1(h.r * 0.42)}" fill="${p.pale}"/>
        <circle cx="${n1(h.cx + sx * h.r * 0.42)}" cy="${n1(h.cy - h.r * 0.05)}" r="${n1(h.r * 0.2)}" fill="${p.dark}"/>`;
      const tuft = sx => `<path d="M${n1(h.cx + sx * h.r * 0.7)} ${n1(h.cy - h.r * 0.72)}l${n1(sx * 1.6)} -${n1(tuftH)} ${n1(sx * 2.4)} ${n1(tuftH * 0.75)}z" fill="${p.line}"/>`;
      return `
        <ellipse cx="${b.cx}" cy="${n1(b.cy)}" rx="${n1(b.rx)}" ry="${n1(b.ry)}" fill="${p.body}"/>
        ${lv >= AT_MARK ? `<path d="M${n1(b.cx - b.rx * 0.5)} ${n1(b.cy - 2)}q${n1(b.rx * 0.5)} 3 ${n1(b.rx)} 0" stroke="${p.pale}" stroke-width="1.3" fill="none"/>
                     <path d="M${n1(b.cx - b.rx * 0.5)} ${n1(b.cy + 3)}q${n1(b.rx * 0.5)} 3 ${n1(b.rx)} 0" stroke="${p.pale}" stroke-width="1.3" fill="none"/>` : ""}
        ${lv >= AT_WING ? `<ellipse cx="${n1(b.cx - b.rx * 0.95)}" cy="${n1(b.cy)}" rx="${n1(lerp(3, 4, t))}" ry="${n1(lerp(6, 8, t))}" fill="${p.line}"/>
                     <ellipse cx="${n1(b.cx + b.rx * 0.95)}" cy="${n1(b.cy)}" rx="${n1(lerp(3, 4, t))}" ry="${n1(lerp(6, 8, t))}" fill="${p.line}"/>` : ""}
        <circle cx="${h.cx}" cy="${n1(h.cy)}" r="${n1(h.r)}" fill="${p.body}"/>
        ${tuft(-1)}${tuft(1)}
        ${ring(-1)}${ring(1)}
        <path d="M${h.cx} ${n1(h.cy + h.r * 0.3)}l-2 2.6h4z" fill="#E0A02B"/>
        ${lv >= AT_TAIL ? `<path d="M${n1(b.cx - 3)} ${n1(b.cy + b.ry)}v3M${n1(b.cx + 3)} ${n1(b.cy + b.ry)}v3" stroke="#E0A02B" stroke-width="1.8" stroke-linecap="round"/>` : ""}`;
    },

    parrot(g) {
      /* [2026-08 리뉴얼] 옆모습 마카우 — 왼쪽을 봅니다.
         꼬리깃 Lv.5, 초록 날개층 Lv.10, 파랑 날개층 Lv.15 */
      const { p, t, lv } = g;
      return grow(t, `
        ${lv >= AT_TAIL ? `<path d="M36 40Q46 46 50 53L44.6 51Q40 46 34.4 43z" fill="#2E9E4A" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M34 42Q42 48 44 54.6L38.8 52.4Q35.6 48 31.6 44.6z" fill="#2860C4" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` : ""}
        <path d="M24 18Q14.6 24 15.8 35Q17 46.6 27 48.4Q37.4 50 39 40Q40 31 33 24.6Q29 21 24 18Z" fill="${p.body}" stroke="${INK}" stroke-width="1.4"/>
        <path d="M19 34Q19.6 44.6 27.6 46.4Q33 47 35.6 43Q30 44 25.6 40.6Q21.4 37.4 19 34Z" fill="#FFC421"/>
        <path d="M27 26Q38 28 37.4 40Q32 43.6 27.4 40Q23.4 33 27 26Z" fill="#FFC421" stroke="${INK}" stroke-width="1.2"/>
        ${lv >= AT_MARK ? `<path d="M27.6 29.4Q36.4 31 35.8 40.4Q31.6 43 28 40.2Q25.2 34.6 27.6 29.4Z" fill="#2E9E4A" stroke="${INK}" stroke-width="1.1"/>` : ""}
        ${lv >= AT_WING ? `<path d="M28.4 33Q34.6 34.4 34.2 40.8Q31.2 42.6 28.6 40.4Q26.8 37 28.4 33Z" fill="#2860C4" stroke="${INK}" stroke-width="1.1"/>` : ""}
        <path d="M25 48.4v3.4M22.8 51.8h4.4M30 48.8v3M28 51.8h4" stroke="#8A6238" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="21.5" cy="19.5" r="8" fill="${p.body}" stroke="${INK}" stroke-width="1.4"/>
        <path d="M17 13.2q.6 -3.6 3.6 -3.4 2.6 .4 2.6 3M23.2 12.6q1.4 -2.6 3.8 -1.8 1.8 1 1.2 3.2" fill="#C42B20" stroke="${INK}" stroke-width="1"/>
        <path d="M13.8 18.2a7.6 7.4 0 0 1 8 -6q-1.4 4.4 -1 8.8 -.4 2.8 -3.4 2.8 -3.2 -.6 -3.6 -5.6z" fill="#F6F3EA"/>
        <circle cx="17.6" cy="18.6" r="1.9" fill="#2A2A28"/>
        <circle cx="18.2" cy="18" r=".65" fill="#fff"/>
        <path d="M14.6 21.4Q9.6 21.4 9.4 25Q11 28.4 14.6 27.6L14 29.8L16.6 28Q19 26.6 18.8 23.4Q17 21.6 14.6 21.4Z" fill="#28418A" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M11.4 24.6q2.8 1.4 5.6 .6" stroke="${INK}" stroke-width=".7" fill="none" opacity=".6"/>
        <ellipse cx="22.8" cy="24" rx="1.7" ry="1.05" fill="#F2A2A2" opacity=".6"/>`);
    },

    turtle(g) {
      /* [2026-08 리뉴얼] 등껍질 테두리 판 + 육각 무늬(Lv.10) + 정면 얼굴 */
      const { p, t, lv, body: b, head: h } = g;
      return `
        ${lv >= AT_TAIL ? `<path d="M${n1(b.cx - b.rx - 1)} ${n1(b.cy + 2)}l-${n1(lerp(3.5, 5, t))} ${n1(lerp(1.5, 2.2, t))} ${n1(lerp(3.5, 5, t))} ${n1(lerp(1.6, 2.4, t))}z" fill="${p.light}" stroke="${INK}" stroke-width="1"/>` : ""}
        ${oC(h.cx, h.cy + 2, h.r * 0.92, p.light, 1.4)}
        ${oE(b.cx - b.rx * 0.82, b.cy + b.ry * 0.72, 3.6, 2.4, p.light, 1.1)}
        ${oE(b.cx + b.rx * 0.82, b.cy + b.ry * 0.72, 3.6, 2.4, p.light, 1.1)}
        ${oE(b.cx, b.cy, b.rx, b.ry * 0.92, p.body, 1.4)}
        <path d="M${n1(b.cx - b.rx)} ${n1(b.cy + b.ry * 0.5)}q${n1(b.rx)} 4 ${n1(b.rx * 2)} 0" stroke="${INK}" stroke-width="1.2" fill="none"/>
        <path d="M${n1(b.cx - b.rx + 1)} ${n1(b.cy + b.ry * 0.52)}q${n1(b.rx - 1)} 3.6 ${n1((b.rx - 1) * 2)} 0v3q-${n1(b.rx - 1)} 3 -${n1((b.rx - 1) * 2)} 0z" fill="${p.pale}"/>
        ${lv >= AT_MARK ? `<path d="M${n1(b.cx - 4)} ${n1(b.cy - b.ry * 0.85)}l4 2.6 4 -2.6M${n1(b.cx - 8.6)} ${n1(b.cy - 2)}l4.6 .8 0 -4.6M${n1(b.cx + 8.6)} ${n1(b.cy - 2)}l-4.6 .8 0 -4.6M${n1(b.cx - 4)} ${n1(b.cy - 1.2)}h8l-1.6 5h-4.8z" stroke="${p.dark}" stroke-width="1.1" fill="none" stroke-linejoin="round" opacity=".7"/>` : ""}
        ${eyes2(h.cx, h.cy - 1, h.r * 0.8, p.dark, { blush: lv >= AT_WING, smile: true })}`;
    },

    butterfly(g) {
      /* 나비 — 날개가 전부입니다. 몸통은 가늘게.
         날개는 위·아래 두 쌍이라야 나비로 읽혀요. */
      const { p, t, lv, body: b, head: h } = g;
      const wr = lerp(5.5, 9, t);
      const wing = sx => `
        <ellipse cx="${n1(b.cx + sx * wr * 0.95)}" cy="${n1(b.cy - wr * 0.42)}" rx="${n1(wr)}" ry="${n1(wr * 0.82)}" fill="${p.light}" opacity=".95"/>
        <ellipse cx="${n1(b.cx + sx * wr * 0.8)}" cy="${n1(b.cy + wr * 0.55)}" rx="${n1(wr * 0.76)}" ry="${n1(wr * 0.62)}" fill="${p.body}" opacity=".95"/>
        ${lv >= AT_MARK ? `<circle cx="${n1(b.cx + sx * wr * 1.05)}" cy="${n1(b.cy - wr * 0.45)}" r="${n1(wr * 0.24)}" fill="${p.pale}"/>` : ""}`;
      const ant = sx => `<path d="M${n1(h.cx + sx * 1.4)} ${n1(h.cy - h.r * 0.8)}q${n1(sx * 3)} -${n1(lerp(3.5, 5, t))} ${n1(sx * 5)} -${n1(lerp(3, 4.2, t))}" stroke="${p.dark}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
      return `
        ${wing(-1)}${wing(1)}
        <ellipse cx="${b.cx}" cy="${n1(b.cy)}" rx="${n1(b.rx * 0.28)}" ry="${n1(b.ry * 0.95)}" fill="${p.dark}"/>
        <circle cx="${h.cx}" cy="${n1(h.cy)}" r="${n1(h.r * 0.62)}" fill="${p.dark}"/>
        ${ant(-1)}${ant(1)}
        <circle cx="${n1(h.cx - h.r * 0.24)}" cy="${n1(h.cy)}" r="1.1" fill="${p.pale}"/>
        <circle cx="${n1(h.cx + h.r * 0.24)}" cy="${n1(h.cy)}" r="1.1" fill="${p.pale}"/>`;
    },

    bee(g) {
      /* [2026-08 리뉴얼] 옆모습 — 왼쪽으로 날아갑니다.
         침 Lv.5, 뒷날개 Lv.10, 날갯짓 자국 Lv.15 */
      const { t, lv } = g;
      const YEL = "#FFC421", BLK = "#1E1E1E", WING = "#A8D8F0";
      return grow(t, `
        ${lv >= AT_WING ? `<path d="M45 38q3 1 4.4 3.4M46.6 33.4q3.4 .2 5.4 2" stroke="#B8C8D8" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".8"/>` : ""}
        ${lv >= AT_MARK ? `<ellipse cx="34" cy="17.4" rx="4.6" ry="8.4" fill="${WING}" stroke="${INK}" stroke-width="1.4" transform="rotate(30 34 17.4)"/>` : ""}
        ${lv >= AT_TAIL ? `<path d="M43.6 34l6 1.6 -5.6 2.8z" fill="${BLK}"/>` : ""}
        <path d="M17 33.4Q17 24.4 27 23.6Q37.6 23 42.4 29Q45.4 33 42.6 37.6Q38.4 43.6 28.6 43.2Q17.6 42.6 17 33.4Z" fill="${YEL}" stroke="${INK}" stroke-width="1.8"/>
        <path d="M26.6 23.7c-1.6 6.2 -1.6 13 0 19.3l5 .1c-1.8 -6.4 -1.8 -13.2 0 -19.6zM36.6 25.4c2 5.2 2.2 10.4 .4 15.8l4 -2.4q1.8 -3.6 .4 -7.2q-2 -4.2 -4.8 -6.2z" fill="${BLK}"/>
        <path d="M17 33.4Q17 24.4 27 23.6Q37.6 23 42.4 29Q45.4 33 42.6 37.6Q38.4 43.6 28.6 43.2Q17.6 42.6 17 33.4Z" fill="none" stroke="${INK}" stroke-width="1.8"/>
        <ellipse cx="27" cy="15" rx="5.4" ry="9.4" fill="${WING}" stroke="${INK}" stroke-width="1.5" transform="rotate(14 27 15)"/>
        <path d="M26 9.4q1.6 5.4 .6 11" stroke="#6AA8CC" stroke-width=".9" fill="none" opacity=".7"/>
        <circle cx="13.6" cy="30.4" r="7.4" fill="${YEL}" stroke="${INK}" stroke-width="1.8"/>
        <ellipse cx="10.8" cy="27.2" rx="2.3" ry="1.5" fill="#fff" opacity=".6" transform="rotate(-24 10.8 27.2)"/>
        <path d="M11.4 23.6q-1.6 -3.8 -4.6 -4.8M15.8 23.2q.2 -4.2 2.8 -6.2" stroke="${INK}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <circle cx="6.4" cy="18.2" r="1.7" fill="${BLK}"/><circle cx="19.2" cy="16.4" r="1.7" fill="${BLK}"/>
        <circle cx="11" cy="30.4" r="1.75" fill="${BLK}"/>
        <circle cx="11.6" cy="29.8" r=".6" fill="#fff"/>
        <path d="M8.6 33.6q2 1.8 4.2 .6" stroke="${BLK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
        <ellipse cx="15.4" cy="34.4" rx="1.8" ry="1.1" fill="#F2A2A2" opacity=".7"/>`);
    },

    bear(g) {
      const { p, t, body: b, head: h } = g;
      const er = lerp(4.2, 5.6, t);
      const ear = sx => `
        <circle cx="${n1(h.cx + sx * h.r * 0.92)}" cy="${n1(h.cy - h.r * 0.78)}" r="${n1(er)}" fill="${p.body}"/>
        <circle cx="${n1(h.cx + sx * h.r * 0.92)}" cy="${n1(h.cy - h.r * 0.78)}" r="${n1(er * 0.48)}" fill="${p.light}"/>`;
      return `
        <ellipse cx="${b.cx}" cy="${n1(b.cy)}" rx="${n1(b.rx)}" ry="${n1(b.ry)}" fill="${p.body}"/>
        ${ear(-1)}${ear(1)}
        <circle cx="${h.cx}" cy="${n1(h.cy)}" r="${n1(h.r)}" fill="${p.body}"/>
        ${face(h.cx, h.cy, h.r, p, false)}
        <ellipse cx="${h.cx}" cy="${n1(h.cy + h.r * 0.5)}" rx="${n1(h.r * 0.5)}" ry="${n1(h.r * 0.36)}" fill="${p.pale}"/>
        <ellipse cx="${h.cx}" cy="${n1(h.cy + h.r * 0.4)}" rx="${n1(h.r * 0.2)}" ry="${n1(h.r * 0.15)}" fill="${p.dark}"/>`;
    },

    dragon(g) {
      const { p, t, lv, body: b, head: h } = g;
      const stem = lerp(6, 9.5, t);
      const antler = sx => {
        const x0 = h.cx + sx * h.r * 0.38, y0 = h.cy - h.r * 0.86;
        let d = `<path d="M${n1(x0)} ${n1(y0)}C${n1(x0 + sx * 0.6)} ${n1(y0 - stem * 0.42)} ${n1(x0 + sx * 1.6)} ${n1(y0 - stem * 0.7)} ${n1(x0 + sx * 3.2)} ${n1(y0 - stem)}"/>`;
        if (lv >= AT_MARK) d += `<path d="M${n1(x0 + sx * 1.0)} ${n1(y0 - stem * 0.48)}L${n1(x0 - sx * 1.4)} ${n1(y0 - stem * 0.72)}"/>`;
        if (lv >= AT_WING) d += `<path d="M${n1(x0 + sx * 2.1)} ${n1(y0 - stem * 0.78)}L${n1(x0 + sx * 4.6)} ${n1(y0 - stem * 0.62)}"/>`;
        return d;
      };
      return `
        ${lv >= AT_WING ? `<path d="M${n1(b.cx + b.rx * 0.95)} ${n1(b.cy - b.ry)}q10 -17 15 -5 -3 11 -15 5z" fill="${p.light}"/>` : ""}
        <ellipse cx="${b.cx}" cy="${n1(b.cy)}" rx="${n1(b.rx)}" ry="${n1(b.ry)}" fill="${p.body}"/>
        ${lv >= AT_TAIL ? `<path d="M${n1(b.cx - 7)} ${n1(b.cy - b.ry * 0.85)}l3 -3 3 3 3 -3 3 3" stroke="${p.line}" stroke-width="1.6" fill="none" stroke-linecap="round"/>` : ""}
        <g stroke="${HORN_GOLD}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">${antler(-1)}${antler(1)}</g>
        <circle cx="${h.cx}" cy="${n1(h.cy)}" r="${n1(h.r)}" fill="${p.body}"/>
        ${face(h.cx, h.cy, h.r, p, true)}`;
    },

    squirrel(g) {
      const { p, t, lv, body: b, head: h } = g;
      return `
        ${lv >= AT_TAIL ? `<path d="M${n1(b.cx + b.rx * 0.85)} ${n1(b.cy + 2)}q${n1(lerp(12, 16, t))} 2 ${n1(lerp(7, 10, t))} -${n1(lerp(11, 15, t))} -${n1(lerp(4, 6, t))} -3 -${n1(lerp(6, 9, t))} ${n1(lerp(5, 7, t))}" fill="${p.pale}"/>` : ""}
        <ellipse cx="${b.cx}" cy="${n1(b.cy)}" rx="${n1(b.rx)}" ry="${n1(b.ry)}" fill="${p.body}"/>
        <circle cx="${h.cx}" cy="${n1(h.cy)}" r="${n1(h.r)}" fill="${p.body}"/>
        ${lv >= AT_WING ? `<path d="M${n1(h.cx - h.r * 0.9)} ${n1(h.cy - h.r * 0.7)}q-3 -8 5 -5z" fill="${p.line}"/>
                     <path d="M${n1(h.cx + h.r * 0.9)} ${n1(h.cy - h.r * 0.7)}q3 -8 -5 -5z" fill="${p.line}"/>` : ""}
        ${face(h.cx, h.cy, h.r, p, false)}
        <path d="M${h.cx} ${n1(h.cy + h.r * 0.32)}l-2 2.4h4z" fill="${p.dark}"/>`;
    },

    /* ---- 새로 추가된 종류들 ---- */

    peacock(g) {
      /* [2026-08 리뉴얼] 잎 모양 초록 깃털 부채.
         깃털 3장 → Lv.5에 5장 → Lv.15에 7장, 눈꼴 무늬는 Lv.10부터 */
      const { p, t, lv, body: b, head: h } = g;
      const fr = lerp(0.78, 1, t);
      const nF = lv >= AT_WING ? 7 : lv >= AT_TAIL ? 5 : 3;
      const k = (nF - 1) / 2;
      let fan = "";
      for (let i = -k; i <= k; i++) {
        const a = i * 0.34, x = b.cx + Math.sin(a) * 16.5 * fr, y = b.cy - 7 - Math.cos(a) * 14.5 * fr;
        const rot = n1(a * 180 / Math.PI);
        fan += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(4.3 * fr)}" ry="${n1(8.8 * fr)}" fill="#5FA845" stroke="${INK}" stroke-width="1.1" transform="rotate(${rot} ${n1(x)} ${n1(y)})"/>
          <ellipse cx="${n1(x)}" cy="${n1(y + 1.2 * fr)}" rx="${n1(2.7 * fr)}" ry="${n1(6.2 * fr)}" fill="#3E7E30" transform="rotate(${rot} ${n1(x)} ${n1(y + 1.2 * fr)})"/>`;
        if (lv >= AT_MARK) fan += `<circle cx="${n1(x)}" cy="${n1(y - 2.4 * fr)}" r="${n1(2.4 * fr)}" fill="#F2C030" stroke="${INK}" stroke-width=".7"/>
          <circle cx="${n1(x)}" cy="${n1(y - 2.4 * fr)}" r="${n1(1.5 * fr)}" fill="#E07A33"/>
          <circle cx="${n1(x)}" cy="${n1(y - 2.4 * fr)}" r="${n1(0.8 * fr)}" fill="#2C4E8A"/>`;
      }
      return `
        ${fan}
        <path d="M${n1(b.cx - 3.5)} ${n1(b.cy + b.ry - 0.5)}v4.6M${n1(b.cx - 5.4)} ${n1(b.cy + b.ry + 4.1)}h3.8M${n1(b.cx + 3.5)} ${n1(b.cy + b.ry - 0.5)}v4.6M${n1(b.cx + 1.6)} ${n1(b.cy + b.ry + 4.1)}h3.8" stroke="#E07A33" stroke-width="1.7" stroke-linecap="round"/>
        ${oE(b.cx, b.cy, b.rx * 0.92, b.ry, p.body, 1.4)}
        ${belly2(b, p.pale)}
        ${lv >= AT_MARK ? `<path d="M${n1(b.cx - b.rx * 0.62)} ${n1(b.cy - 2)}q-3.4 5 .4 9.4 q4 -.6 4.4 -5.4z" fill="${p.light}" stroke="${INK}" stroke-width="1" opacity=".9"/>` : ""}
        ${oC(h.cx, h.cy, h.r, p.body, 1.4)}
        <path d="M${n1(h.cx - 2.6)} ${n1(h.cy - h.r)}q-1.4 -4.4 .2 -4.6M${n1(h.cx)} ${n1(h.cy - h.r - 0.6)}q0 -4.4 1 -4.6M${n1(h.cx + 2.6)} ${n1(h.cy - h.r)}q1.4 -4.4 .4 -4.8" stroke="${p.line}" stroke-width="1" fill="none" stroke-linecap="round"/>
        <circle cx="${n1(h.cx - 2.6)}" cy="${n1(h.cy - h.r - 4.8)}" r="1.15" fill="#E9B44C" stroke="${INK}" stroke-width=".8"/>
        <circle cx="${n1(h.cx + 0.9)}" cy="${n1(h.cy - h.r - 5.3)}" r="1.15" fill="#E9B44C" stroke="${INK}" stroke-width=".8"/>
        <circle cx="${n1(h.cx + 3.2)}" cy="${n1(h.cy - h.r - 4.9)}" r="1.15" fill="#E9B44C" stroke="${INK}" stroke-width=".8"/>
        ${eyes2(h.cx, h.cy, h.r, p.dark, { blush: true })}
        <path d="M${h.cx} ${n1(h.cy + h.r * 0.26)}l-2.2 2.4h4.4z" fill="#E9B44C" stroke="${INK}" stroke-width=".9"/>`;
    },

    seal(g) {
      /* [2026-08 리뉴얼] 옆모습 — 머리 들고 엎드린 자세 (캡쳐 참고).
         꼬리 골 Lv.5, 등 얼룩 Lv.10, 가슴 주름 Lv.15 */
      const { p, t, lv } = g;
      return grow(t, `
        <path d="M14 17Q22 15.5 25 22Q27.5 28 34 32.5Q39 35.5 43.6 36.2Q44.8 32 49.2 29.6L48.4 34.2Q52.4 33 54 36.2Q49.6 37.6 46 40.4Q44.6 41.8 41.6 41.8Q30 44.8 20 43.6Q10 42.4 9.6 33.6Q9.4 23.6 14 17Z" fill="${p.body}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        ${lv >= AT_TAIL ? `<path d="M45.2 36.8q2 -2.6 3.2 -3.2M46.4 38.4q2.6 -1.8 4.4 -2" stroke="${p.dark}" stroke-width=".8" fill="none" opacity=".6"/>` : ""}
        ${lv >= AT_WING ? `<path d="M15.4 34.6q.4 3.6 2 6M18.8 35.4q.4 3.2 1.8 5.4M22.2 36q.4 3 1.6 5" stroke="${p.dark}" stroke-width=".9" fill="none" opacity=".55" stroke-linecap="round"/>` : ""}
        ${lv >= AT_MARK ? `<circle cx="30" cy="30" r="1.05" fill="${p.dark}" opacity=".5"/>
        <circle cx="34.6" cy="34" r=".9" fill="${p.dark}" opacity=".5"/>
        <circle cx="27" cy="26" r=".8" fill="${p.dark}" opacity=".5"/>
        <circle cx="38.4" cy="37.4" r=".85" fill="${p.dark}" opacity=".5"/>` : ""}
        <ellipse cx="21.6" cy="44.2" rx="3" ry="5.6" fill="${p.body}" stroke="${INK}" stroke-width="1.2" transform="rotate(-24 21.6 44.2)"/>
        <path d="M20 42.2q.8 2.6 .4 4.6M22.6 42q.8 2.6 .4 4.6" stroke="${p.dark}" stroke-width=".8" fill="none" opacity=".6"/>
        <circle cx="12.4" cy="22.4" r="1.6" fill="#2A2A28"/>
        <circle cx="18.2" cy="22.4" r="1.6" fill="#2A2A28"/>
        <circle cx="13" cy="21.8" r=".55" fill="#fff"/>
        <circle cx="18.8" cy="21.8" r=".55" fill="#fff"/>
        ${oE(15.2, 27, 4.2, 3.2, p.pale, 0)}
        <ellipse cx="15.2" cy="25.4" rx="1.5" ry="1.15" fill="${p.dark}"/>
        <path d="M15.2 26.6v1.6M15.2 28.2q-1.5 1.3 -2.8 .4M15.2 28.2q1.5 1.3 2.8 .4" stroke="${p.dark}" stroke-width=".85" fill="none" stroke-linecap="round"/>
        <circle cx="11.6" cy="26.2" r=".38" fill="${p.dark}"/><circle cx="12.4" cy="27.6" r=".38" fill="${p.dark}"/>
        <circle cx="18.8" cy="26.2" r=".38" fill="${p.dark}"/><circle cx="18" cy="27.6" r=".38" fill="${p.dark}"/>
        <path d="M10.8 26.6q-2.6 -.4 -4 -1M11.2 27.8q-2.4 .2 -3.8 0M19.6 26.6q2.6 -.4 4 -1M19.2 27.8q2.4 .2 3.8 0" stroke="${p.dark}" stroke-width=".6" fill="none" opacity=".7"/>
        <ellipse cx="10.4" cy="24.6" rx="1.6" ry="1.05" fill="#F088A0" opacity=".7"/>
        <ellipse cx="20" cy="24.6" rx="1.6" ry="1.05" fill="#F088A0" opacity=".7"/>`);
    },

    whale(g) {
      /* [2026-08 리뉴얼] 윤곽선 + 배 주름 + 눈 반짝임·볼터치.
         꼬리 Lv.5, 배 주름 Lv.10, 물줄기 Lv.15 (기존 타이밍 유지) */
      const { p, t, lv, body: b } = g;
      const cx = b.cx - 2.5, cy = b.cy - 1;
      const rx = b.rx * 1.16, ry = b.ry;
      return `
        ${lv >= AT_WING ? `<path d="M${n1(cx)} ${n1(cy - ry - 2)}q-2.6 -5 -6 -6.4M${n1(cx)} ${n1(cy - ry - 2)}q0 -6 0 -8M${n1(cx)} ${n1(cy - ry - 2)}q2.6 -5 6 -6.4" stroke="#9CCBEE" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <circle cx="${n1(cx - 6.6)}" cy="${n1(cy - ry - 9)}" r="1.4" fill="#9CCBEE"/><circle cx="${n1(cx)}" cy="${n1(cy - ry - 11)}" r="1.5" fill="#9CCBEE"/><circle cx="${n1(cx + 6.6)}" cy="${n1(cy - ry - 9)}" r="1.4" fill="#9CCBEE"/>` : ""}
        ${lv >= AT_TAIL ? `<path d="M${n1(cx + rx * 0.85)} ${n1(cy)}q6 -1.2 9 -10.2 q-.8 6.6 4.2 9 q-5.4 6 -13.2 1.2z" fill="${p.line}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` : ""}
        <path d="M${n1(cx - rx)} ${n1(cy)}q0 -${n1(ry * 1.05)} ${n1(rx * 0.95)} -${n1(ry * 0.95)}q${n1(rx * 0.9)} 0 ${n1(rx * 1.85)} ${n1(ry * 0.85)}q-${n1(rx * 0.95)} ${n1(ry * 1.1)} -${n1(rx * 1.85)} ${n1(ry * 0.25)}q-${n1(rx * 0.95)} -${n1(ry * 0.3)} -${n1(rx * 0.95)} -${n1(ry * 0.15)}z" fill="${p.body}" stroke="${INK}" stroke-width="1.4"/>
        <path d="M${n1(cx - rx + 1.6)} ${n1(cy + ry * 0.35)}q${n1(rx * 0.8)} ${n1(ry * 0.55)} ${n1(rx * 1.7)} ${n1(ry * 0.1)}" stroke="${p.pale}" stroke-width="4.6" fill="none" stroke-linecap="round"/>
        ${lv >= AT_MARK ? `<path d="M${n1(cx - rx + 3)} ${n1(cy + ry * 0.28)}q${n1(rx * 0.35)} ${n1(ry * 0.2)} ${n1(rx * 0.8)} ${n1(ry * 0.18)}M${n1(cx - rx + 3.4)} ${n1(cy + ry * 0.52)}q${n1(rx * 0.32)} ${n1(ry * 0.16)} ${n1(rx * 0.72)} ${n1(ry * 0.14)}" stroke="${p.line}" stroke-width=".8" fill="none" opacity=".5"/>` : ""}
        ${oE(cx + 1, cy + ry * 0.45, 3.8, 2, p.body, 1.1)}
        <circle cx="${n1(cx - rx * 0.5)}" cy="${n1(cy - ry * 0.15)}" r="1.6" fill="${p.dark}"/>
        <circle cx="${n1(cx - rx * 0.5 + 0.55)}" cy="${n1(cy - ry * 0.15 - 0.55)}" r=".6" fill="#fff"/>
        <path d="M${n1(cx - rx * 0.62)} ${n1(cy + ry * 0.28)}q1.8 1.6 3.8 .4" stroke="${p.dark}" stroke-width="1" fill="none" stroke-linecap="round"/>
        <ellipse cx="${n1(cx - rx * 0.28)}" cy="${n1(cy + ry * 0.1)}" rx="1.8" ry="1.1" fill="#F2A2A2" opacity=".55"/>`;
    },

/* ── 나무 상자에서 나오는 무리 (2차) ────────────────────────── */

    fox(g) {
      /* 여우 — 뾰족한 삼각 귀와 크고 풍성한 꼬리.
         꼬리 끝을 밝게 해야 여우로 읽힙니다. */
      const { p, t, lv, body: b, head: h } = g;
      const ear = sx => `<path d="M${n1(h.cx + sx * h.r * 0.62)} ${n1(h.cy - h.r * 0.62)}
                                  l${n1(sx * h.r * 0.1)} -${n1(lerp(6, 8.5, t))}
                                  ${n1(sx * h.r * 0.72)} ${n1(lerp(4, 5.4, t))}z"
                              fill="${p.body}" stroke="${p.body}" stroke-width="2" stroke-linejoin="round"/>
                         <path d="M${n1(h.cx + sx * h.r * 0.72)} ${n1(h.cy - h.r * 0.7)}
                                  l${n1(sx * h.r * 0.06)} -${n1(lerp(3.4, 4.6, t))}
                                  ${n1(sx * h.r * 0.36)} ${n1(lerp(2.2, 3, t))}z" fill="${p.dark}" opacity=".45"/>`;
      return `
        ${lv >= AT_TAIL ? `<path d="M${n1(b.cx + b.rx * 0.9)} ${n1(b.cy)}
                                 q${n1(lerp(10, 14, t))} -${n1(lerp(3, 4, t))} ${n1(lerp(8, 11, t))} ${n1(lerp(8, 11, t))}
                                 q-${n1(lerp(5, 7, t))} ${n1(lerp(2, 3, t))} -${n1(lerp(9, 12, t))} -${n1(lerp(4, 5, t))}z"
                               fill="${p.body}"/>
                     <path d="M${n1(b.cx + b.rx * 0.9 + lerp(9, 12.5, t))} ${n1(b.cy + lerp(2, 3, t))}
                              q${n1(lerp(2, 3, t))} ${n1(lerp(3, 4, t))} -${n1(lerp(1, 1.5, t))} ${n1(lerp(4, 5, t))}
                              q-${n1(lerp(2, 3, t))} -${n1(lerp(1, 1.5, t))} -${n1(lerp(1, 1.5, t))} -${n1(lerp(4, 5, t))}z"
                            fill="${p.pale}"/>` : ""}
        <ellipse cx="${b.cx}" cy="${n1(b.cy)}" rx="${n1(b.rx)}" ry="${n1(b.ry)}" fill="${p.body}"/>
        <ellipse cx="${b.cx}" cy="${n1(b.cy + b.ry * 0.3)}" rx="${n1(b.rx * 0.5)}" ry="${n1(b.ry * 0.55)}" fill="${p.pale}"/>
        ${ear(-1)}${ear(1)}
        <circle cx="${h.cx}" cy="${n1(h.cy)}" r="${n1(h.r)}" fill="${p.body}"/>
        <path d="M${n1(h.cx - h.r * 0.46)} ${n1(h.cy + h.r * 0.18)}
                 q${n1(h.r * 0.46)} ${n1(h.r * 0.9)} ${n1(h.r * 0.92)} 0z" fill="${p.pale}"/>
        ${face(h.cx, h.cy, h.r, p, false)}
        <ellipse cx="${h.cx}" cy="${n1(h.cy + h.r * 0.62)}" rx="${n1(h.r * 0.16)}" ry="${n1(h.r * 0.12)}" fill="${p.dark}"/>`;
    },

    unicorn(g) {
      /* 유니콘 — 이마의 나선 뿔과 색색의 갈기.
         몸이 거의 흰색이라, 갈기 색으로 살아납니다. */
      const { p, t, lv, body: b, head: h } = g;
      const hornH = lerp(7, 10.5, t);
      const mane = "#C48BE0";
      return `
        <!-- 꼬리 — 위로 뻗쳐 올립니다.

             처음엔 아래로 늘어뜨렸는데 말꼬리처럼 축 처져 보였어요.
             위로 휘어 올리면 갈기와 이어져 한 덩어리로 읽히고,
             유니콘다운 기세가 납니다. -->
        ${lv >= AT_TAIL ? `<path d="M${n1(b.cx + b.rx * 0.92)} ${n1(b.cy + 1)}
                                 q${n1(lerp(8, 11, t))} -${n1(lerp(3, 4, t))} ${n1(lerp(9, 12.5, t))} -${n1(lerp(11, 15, t))}"
                               stroke="${mane}" stroke-width="${n1(lerp(3.4, 4.6, t))}" fill="none" stroke-linecap="round"/>
                     <path d="M${n1(b.cx + b.rx * 0.92 + lerp(5, 7, t))} ${n1(b.cy - lerp(3, 4, t))}
                              q${n1(lerp(6, 8, t))} -${n1(lerp(2, 3, t))} ${n1(lerp(6, 8.5, t))} -${n1(lerp(8, 11, t))}"
                            stroke="#7EC8E3" stroke-width="${n1(lerp(2, 2.8, t))}" fill="none" stroke-linecap="round" opacity=".9"/>` : ""}
        <ellipse cx="${b.cx}" cy="${n1(b.cy)}" rx="${n1(b.rx)}" ry="${n1(b.ry)}" fill="${p.body}"/>
        <circle cx="${h.cx}" cy="${n1(h.cy)}" r="${n1(h.r)}" fill="${p.body}"/>

        <!-- 갈기 — 머리 뒤로 흘러내립니다 -->
        <path d="M${n1(h.cx - h.r * 0.9)} ${n1(h.cy - h.r * 0.5)}
                 q-${n1(h.r * 0.7)} ${n1(h.r * 0.9)} -${n1(h.r * 0.2)} ${n1(h.r * 1.7)}
                 q${n1(h.r * 0.5)} -${n1(h.r * 0.4)} ${n1(h.r * 0.75)} -${n1(h.r * 1.3)}z" fill="${mane}"/>
        ${lv >= AT_MARK ? `<path d="M${n1(h.cx - h.r * 0.72)} ${n1(h.cy - h.r * 0.75)}
                                 q-${n1(h.r * 0.5)} ${n1(h.r * 0.7)} -${n1(h.r * 0.1)} ${n1(h.r * 1.2)}"
                               stroke="#7EC8E3" stroke-width="1.6" fill="none" stroke-linecap="round"/>` : ""}

        <!-- 귀 -->
        <path d="M${n1(h.cx + h.r * 0.62)} ${n1(h.cy - h.r * 0.66)}l${n1(h.r * 0.1)} -${n1(h.r * 0.5)} ${n1(h.r * 0.4)} ${n1(h.r * 0.34)}z" fill="${p.line}"/>

        <!-- 뿔 — 나선 세 칸 -->
        <path d="M${h.cx} ${n1(h.cy - h.r)}l-${n1(lerp(1.8, 2.4, t))} 0 ${n1(lerp(1.8, 2.4, t))} -${n1(hornH)} ${n1(lerp(1.8, 2.4, t))} ${n1(lerp(1.8, 2.4, t) * 0)}z"
              fill="${HORN_GOLD}"/>
        <path d="M${n1(h.cx - 1.4)} ${n1(h.cy - h.r - hornH * 0.28)}h2.8M${n1(h.cx - 1)} ${n1(h.cy - h.r - hornH * 0.55)}h2"
              stroke="#C9922E" stroke-width=".8" stroke-linecap="round"/>
        ${face(h.cx, h.cy, h.r, p, true)}`;
    },

    deer(g) {
      /* 사슴 — 나뭇가지 뿔과 등의 흰 점무늬.
         뿔은 용의 뿔과 같은 결로, 레벨이 오르면 가지가 늘어납니다. */
      const { p, t, lv, body: b, head: h } = g;
      const aH = lerp(6, 10, t);
      const antler = sx => `
        <path d="M${n1(h.cx + sx * h.r * 0.5)} ${n1(h.cy - h.r * 0.78)}l${n1(sx * 1.2)} -${n1(aH)}"
              stroke="${HORN_GOLD}" stroke-width="${n1(lerp(1.6, 2.2, t))}" stroke-linecap="round"/>
        <path d="M${n1(h.cx + sx * (h.r * 0.5 + 0.7))} ${n1(h.cy - h.r * 0.78 - aH * 0.45)}l${n1(sx * 3.2)} -${n1(aH * 0.4)}"
              stroke="${HORN_GOLD}" stroke-width="${n1(lerp(1.3, 1.8, t))}" stroke-linecap="round"/>
        ${lv >= AT_MARK ? `<path d="M${n1(h.cx + sx * (h.r * 0.5 + 1))} ${n1(h.cy - h.r * 0.78 - aH * 0.78)}l${n1(sx * 2.6)} -${n1(aH * 0.34)}"
                               stroke="${HORN_GOLD}" stroke-width="${n1(lerp(1.2, 1.6, t))}" stroke-linecap="round"/>` : ""}`;
      return `
        ${lv >= AT_TAIL ? `<ellipse cx="${n1(b.cx + b.rx * 0.95)}" cy="${n1(b.cy - 1)}" rx="${n1(lerp(2.4, 3.2, t))}" ry="${n1(lerp(3, 4, t))}" fill="${p.pale}"/>` : ""}
        <ellipse cx="${b.cx}" cy="${n1(b.cy)}" rx="${n1(b.rx)}" ry="${n1(b.ry)}" fill="${p.body}"/>
        ${lv >= AT_MARK ? `<circle cx="${n1(b.cx - b.rx * 0.4)}" cy="${n1(b.cy - b.ry * 0.3)}" r="1.5" fill="${p.pale}"/>
                     <circle cx="${n1(b.cx + b.rx * 0.1)}" cy="${n1(b.cy - b.ry * 0.5)}" r="1.3" fill="${p.pale}"/>
                     <circle cx="${n1(b.cx + b.rx * 0.5)}" cy="${n1(b.cy - b.ry * 0.2)}" r="1.4" fill="${p.pale}"/>` : ""}
        ${antler(-1)}${antler(1)}
        <ellipse cx="${n1(h.cx - h.r * 0.92)}" cy="${n1(h.cy - h.r * 0.42)}" rx="${n1(h.r * 0.24)}" ry="${n1(h.r * 0.4)}" fill="${p.line}"/>
        <ellipse cx="${n1(h.cx + h.r * 0.92)}" cy="${n1(h.cy - h.r * 0.42)}" rx="${n1(h.r * 0.24)}" ry="${n1(h.r * 0.4)}" fill="${p.line}"/>
        <circle cx="${h.cx}" cy="${n1(h.cy)}" r="${n1(h.r)}" fill="${p.body}"/>
        <ellipse cx="${h.cx}" cy="${n1(h.cy + h.r * 0.5)}" rx="${n1(h.r * 0.42)}" ry="${n1(h.r * 0.32)}" fill="${p.pale}"/>
        ${face(h.cx, h.cy, h.r, p, true)}
        <ellipse cx="${h.cx}" cy="${n1(h.cy + h.r * 0.42)}" rx="${n1(h.r * 0.15)}" ry="${n1(h.r * 0.11)}" fill="${p.dark}"/>`;
    },

    sheep(g) {
      /* 양 — 몸 전체가 뭉게뭉게. 원을 여러 개 겹쳐 털을 만듭니다.
         얼굴만 어두운 색으로 빼면 양으로 확 읽혀요. */
      const { p, t, lv, body: b, head: h } = g;
      const puff = (dx, dy, r) => `<circle cx="${n1(b.cx + dx)}" cy="${n1(b.cy + dy)}" r="${n1(r)}" fill="${p.body}"/>`;
      const R = b.rx * 0.52;
      const faceC = shade(p.body, -0.42);
      return `
        ${lv >= AT_TAIL ? `<path d="M${n1(b.cx - 3)} ${n1(b.cy + b.ry * 0.95)}v${n1(lerp(3, 4, t))}
                                 M${n1(b.cx + 3)} ${n1(b.cy + b.ry * 0.95)}v${n1(lerp(3, 4, t))}"
                               stroke="${faceC}" stroke-width="2" stroke-linecap="round"/>` : ""}
        ${puff(-b.rx * 0.62, 0, R)}${puff(b.rx * 0.62, 0, R)}
        ${puff(0, -b.ry * 0.42, R * 1.05)}${puff(0, b.ry * 0.34, R * 1.05)}
        ${puff(-b.rx * 0.36, b.ry * 0.36, R * 0.85)}${puff(b.rx * 0.36, b.ry * 0.36, R * 0.85)}
        <ellipse cx="${n1(h.cx - h.r * 0.95)}" cy="${n1(h.cy + h.r * 0.1)}" rx="${n1(h.r * 0.34)}" ry="${n1(h.r * 0.24)}" fill="${faceC}"/>
        <ellipse cx="${n1(h.cx + h.r * 0.95)}" cy="${n1(h.cy + h.r * 0.1)}" rx="${n1(h.r * 0.34)}" ry="${n1(h.r * 0.24)}" fill="${faceC}"/>
        <circle cx="${h.cx}" cy="${n1(h.cy)}" r="${n1(h.r * 0.82)}" fill="${faceC}"/>
        <circle cx="${h.cx}" cy="${n1(h.cy - h.r * 0.72)}" r="${n1(h.r * 0.5)}" fill="${p.body}"/>
        <circle cx="${n1(h.cx - h.r * 0.5)}" cy="${n1(h.cy - h.r * 0.58)}" r="${n1(h.r * 0.36)}" fill="${p.body}"/>
        <circle cx="${n1(h.cx + h.r * 0.5)}" cy="${n1(h.cy - h.r * 0.58)}" r="${n1(h.r * 0.36)}" fill="${p.body}"/>
        <circle cx="${n1(h.cx - h.r * 0.3)}" cy="${n1(h.cy + h.r * 0.05)}" r="${n1(Math.max(1.1, h.r * 0.14))}" fill="#FFFFFF"/>
        <circle cx="${n1(h.cx + h.r * 0.3)}" cy="${n1(h.cy + h.r * 0.05)}" r="${n1(Math.max(1.1, h.r * 0.14))}" fill="#FFFFFF"/>`;
    },

    monkey(g) {
      /* 원숭이 — 옆으로 큰 동그란 귀, 밝은 얼굴판, 말린 꼬리 */
      const { p, t, lv, body: b, head: h } = g;
      const er = lerp(3.2, 4.2, t);
      return `
        ${lv >= AT_TAIL ? `<path d="M${n1(b.cx + b.rx * 0.9)} ${n1(b.cy)}
                                 q${n1(lerp(8, 11, t))} -${n1(lerp(1, 2, t))} ${n1(lerp(7, 9, t))} ${n1(lerp(5, 7, t))}
                                 q-${n1(lerp(1, 2, t))} ${n1(lerp(4, 5, t))} -${n1(lerp(5, 6, t))} ${n1(lerp(2, 3, t))}"
                               stroke="${p.body}" stroke-width="${n1(lerp(2.4, 3.2, t))}" fill="none" stroke-linecap="round"/>` : ""}
        <ellipse cx="${b.cx}" cy="${n1(b.cy)}" rx="${n1(b.rx)}" ry="${n1(b.ry)}" fill="${p.body}"/>
        <ellipse cx="${b.cx}" cy="${n1(b.cy + b.ry * 0.22)}" rx="${n1(b.rx * 0.58)}" ry="${n1(b.ry * 0.6)}" fill="${p.pale}"/>
        <circle cx="${n1(h.cx - h.r - er * 0.35)}" cy="${n1(h.cy)}" r="${n1(er)}" fill="${p.body}"/>
        <circle cx="${n1(h.cx + h.r + er * 0.35)}" cy="${n1(h.cy)}" r="${n1(er)}" fill="${p.body}"/>
        <circle cx="${n1(h.cx - h.r - er * 0.35)}" cy="${n1(h.cy)}" r="${n1(er * 0.55)}" fill="${p.pale}"/>
        <circle cx="${n1(h.cx + h.r + er * 0.35)}" cy="${n1(h.cy)}" r="${n1(er * 0.55)}" fill="${p.pale}"/>
        <circle cx="${h.cx}" cy="${n1(h.cy)}" r="${n1(h.r)}" fill="${p.body}"/>
        <ellipse cx="${h.cx}" cy="${n1(h.cy + h.r * 0.18)}" rx="${n1(h.r * 0.72)}" ry="${n1(h.r * 0.66)}" fill="${p.pale}"/>
        ${face(h.cx, h.cy, h.r, p, true)}
        <circle cx="${n1(h.cx - h.r * 0.14)}" cy="${n1(h.cy + h.r * 0.3)}" r=".9" fill="${p.dark}"/>
        <circle cx="${n1(h.cx + h.r * 0.14)}" cy="${n1(h.cy + h.r * 0.3)}" r=".9" fill="${p.dark}"/>`;
    },

    coral(g) {
      /* [2026-08 리뉴얼] 이중 선 가지 + 모래 바닥 + 얼굴.
         곁가지 Lv.5, 모래알 Lv.10, 물방울 Lv.15 */
      const { p, t, lv } = g;
      const br = (x, d, w) => `
        <path d="M${x} 48${d}" stroke="${shade(p.body, -0.25)}" stroke-width="${n1(w + 2.2)}" fill="none" stroke-linecap="round"/>
        <path d="M${x} 48${d}" stroke="${p.body}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
      return grow(t, `
        ${lv >= AT_WING ? `<circle cx="14" cy="18" r="1.4" fill="#B8DCF0" stroke="#8CBCDC" stroke-width=".7"/>
        <circle cx="18" cy="12" r="1.9" fill="#B8DCF0" stroke="#8CBCDC" stroke-width=".7"/>
        <circle cx="45" cy="22" r="1.5" fill="#B8DCF0" stroke="#8CBCDC" stroke-width=".7"/>` : ""}
        ${lv >= AT_TAIL ? br(22, "q-1 -9 -6 -12 M22 40q4 -1 5 -6", 4.4) : ""}
        ${br(28, "q0 -13 0 -18 M28 34q-4 -2 -5 -7 M28 30q4 -1.6 5.4 -6.6", 5)}
        ${lv >= AT_TAIL ? br(35, "q2 -8 7 -11 M35 42q-3.6 -1.4 -4 -5", 4.2) : ""}
        <path d="M12 49q16 -4.4 32 0 v3h-32z" fill="#E8D4A8" stroke="${INK}" stroke-width="1.2"/>
        ${lv >= AT_MARK ? `<circle cx="19" cy="50.4" r=".8" fill="#C8AC78"/><circle cx="30" cy="51" r=".7" fill="#C8AC78"/><circle cx="39" cy="50.2" r=".8" fill="#C8AC78"/>` : ""}
        ${eyes2(28, 36, 5, shade(p.body, -0.5), { blush: true, smile: true })}`);
    },

    panda(g) {
      /* [2026-08 리뉴얼] 검은 눈 패치 안에 흰 눈동자, 윤곽선.
         볼터치는 Lv.10부터 */
      const { p, t, lv, body: b, head: h } = g;
      const ear = s => oC(h.cx + s * h.r * 0.72, h.cy - h.r * 0.72, 3.5, p.body, 1.3);
      const patch = s => `<ellipse cx="${n1(h.cx + s * h.r * 0.38)}" cy="${n1(h.cy - h.r * 0.02)}" rx="2.9" ry="3.6" fill="${p.body}" transform="rotate(${s * 18} ${n1(h.cx + s * h.r * 0.38)} ${n1(h.cy - h.r * 0.02)})"/>
        <circle cx="${n1(h.cx + s * h.r * 0.38)}" cy="${n1(h.cy)}" r="1.35" fill="#fff"/>
        <circle cx="${n1(h.cx + s * h.r * 0.38)}" cy="${n1(h.cy)}" r=".85" fill="#2A2A28"/>
        <circle cx="${n1(h.cx + s * h.r * 0.38 + 0.4)}" cy="${n1(h.cy - 0.4)}" r=".35" fill="#fff"/>`;
      return `
        ${oE(b.cx, b.cy, b.rx, b.ry, p.body, 1.4)}
        ${oE(b.cx, b.cy + b.ry * 0.26, b.rx * 0.58, b.ry * 0.56, "#F4F2EC", 0)}
        ${feet2(b, p.body)}
        ${ear(-1)}${ear(1)}
        ${oC(h.cx, h.cy, h.r, "#F4F2EC", 1.4)}
        ${patch(-1)}${patch(1)}
        <ellipse cx="${h.cx}" cy="${n1(h.cy + h.r * 0.38)}" rx="1.7" ry="1.3" fill="#2A2A28"/>
        <path d="M${h.cx} ${n1(h.cy + h.r * 0.52)}v1.3M${h.cx} ${n1(h.cy + h.r * 0.68)}q-1.5 1.2 -2.6 .3M${h.cx} ${n1(h.cy + h.r * 0.68)}q1.5 1.2 2.6 .3" stroke="#2A2A28" stroke-width=".9" fill="none" stroke-linecap="round"/>
        ${lv >= AT_MARK ? `<ellipse cx="${n1(h.cx - h.r * 0.74)}" cy="${n1(h.cy + h.r * 0.34)}" rx="1.6" ry="1" fill="#F2A2A2" opacity=".65"/>
        <ellipse cx="${n1(h.cx + h.r * 0.74)}" cy="${n1(h.cy + h.r * 0.34)}" rx="1.6" ry="1" fill="#F2A2A2" opacity=".65"/>` : ""}`;
    },

    /* 문어 — 다리가 레벨에 따라 늘어납니다 (Lv.1 둘 → Lv.10 여섯).
       머리는 둥근 종 모양이고, 몸통 자리를 다리가 대신합니다. */
    octopus(g) {
      const { p, t, lv, body: b, head: h } = g;
      const legs = Math.max(2, Math.min(6, 2 + Math.floor(t * 4.2)));
      const baseY = b.cy + b.ry * 0.35;
      let arms = "";
      for (let i = 0; i < legs; i++) {
        const span = b.rx * 1.25;
        const x = b.cx - span + (span * 2 * i) / Math.max(1, legs - 1);
        const dir = x < b.cx ? -1 : 1;
        const len = lerp(7, 11, t);
        arms += `<path d="M${n1(x)} ${n1(baseY - 2)}q${n1(dir * 2)} ${n1(len * 0.6)} ${n1(dir * 3.4)} ${n1(len)}"
                       stroke="${p.body}" stroke-width="${n1(lerp(3, 4, t))}" fill="none" stroke-linecap="round"/>`;
      }
      return `
        ${arms}
        <path d="M${n1(b.cx - b.rx)} ${n1(baseY)}q0 -${n1(b.ry * 1.9)} ${n1(b.rx)} -${n1(b.ry * 1.9)}
                 q${n1(b.rx)} 0 ${n1(b.rx)} ${n1(b.ry * 1.9)}z" fill="${p.body}"/>
        <ellipse cx="${b.cx}" cy="${n1(baseY - b.ry * 1.15)}" rx="${n1(b.rx * 0.52)}" ry="${n1(b.ry * 0.42)}" fill="${p.light}" opacity=".55"/>
        ${lv >= AT_WING ? `<circle cx="${n1(b.cx - b.rx * 0.45)}" cy="${n1(baseY - b.ry * 0.35)}" r="1.6" fill="${p.pale}"/>
                     <circle cx="${n1(b.cx + b.rx * 0.45)}" cy="${n1(baseY - b.ry * 0.35)}" r="1.6" fill="${p.pale}"/>` : ""}
        ${face(b.cx, baseY - b.ry * 1.0, h.r * 0.78, p, lv >= AT_TAIL)}`;
    },

/* 여섯 꽃 — 핀 모습만 다릅니다 */

    rose: makeFlower((p, cy, r) => {
      /* [2026-08 리뉴얼] 나선 꽃잎 + 바깥 겹 선 */
      const a = v => n1(v * r / 8.6);
      return `
        <circle cx="28" cy="${n1(cy)}" r="${n1(r)}" fill="${p.body}" stroke="${INK}" stroke-width="1.2"/>
        <path d="M28 ${n1(cy)}m-${n1(r)} 0a${n1(r)} ${n1(r)} 0 0 1 ${n1(r)} -${n1(r)}a${a(6.4)} ${a(6.4)} 0 0 1 ${a(6.2)} ${a(6.4)}a${a(4.8)} ${a(4.8)} 0 0 1 -${a(4.8)} ${a(4.6)}a${a(3.5)} ${a(3.5)} 0 0 1 -${a(3.4)} -${a(3.4)}a${a(2.4)} ${a(2.4)} 0 0 1 ${a(2.4)} -${a(2.4)}" stroke="${p.dark}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
        <path d="M${n1(28 - r)} ${n1(cy)}q-${a(0.6)} ${a(5.6)} ${a(4.4)} ${a(7.8)}M${n1(28 + r * 0.98)} ${n1(cy - r * 0.19)}q${a(1.4)} ${a(5.4)} -${a(3.2)} ${a(8.2)}" stroke="${p.dark}" stroke-width="1" fill="none" opacity=".7"/>
        <circle cx="${n1(28 - r * 0.4)}" cy="${n1(cy - r * 0.4)}" r="${n1(Math.max(0.9, r * 0.13))}" fill="${p.light}" opacity=".8"/>`;
    }),

    tulip: makeFlower((p, cy, r) => {
      /* [2026-08 리뉴얼] 윤곽 있는 컵 + 밝은 왼쪽 꽃잎 */
      return `
        <path d="M${n1(28 - r)} ${n1(cy - r * 0.54)}q-${n1(r * 0.08)} ${n1(r * 1.27)} ${n1(r)} ${n1(r * 1.4)}q${n1(r * 1.08)} -${n1(r * 0.13)} ${n1(r)} -${n1(r * 1.4)}l-${n1(r * 0.49)} ${n1(r * 0.46)} -${n1(r * 0.51)} -${n1(r * 0.73)} -${n1(r * 0.51)} ${n1(r * 0.73)}z" fill="${p.body}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>
        <ellipse cx="${n1(28 - r * 0.42)}" cy="${n1(cy + r * 0.2)}" rx="${n1(r * 0.28)}" ry="${n1(r * 0.55)}" fill="${p.light}" opacity=".55"/>
        <path d="M${n1(28 - r * 0.46)} ${n1(cy + r * 0.46)}q${n1(r * 0.46)} ${n1(r * 0.22)} ${n1(r * 0.92)} 0" stroke="${p.dark}" stroke-width=".9" fill="none" opacity=".5"/>`;
    }),

    lily: makeFlower((p, cy, r) => {
      /* [2026-08 리뉴얼] 뾰족한 여섯 꽃잎 + 수술·꽃밥 */
      let petals = "";
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * 2 * i / 6 - Math.PI / 2;
        petals += `<path d="M28 ${n1(cy)}L${n1(28 + Math.cos(a - 0.38) * r * 0.75)} ${n1(cy + Math.sin(a - 0.38) * r * 0.75)}Q${n1(28 + Math.cos(a) * r)} ${n1(cy + Math.sin(a) * r)} ${n1(28 + Math.cos(a + 0.38) * r * 0.75)} ${n1(cy + Math.sin(a + 0.38) * r * 0.75)}z" fill="${p.body}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
      }
      return `
        ${petals}
        <path d="M28 ${n1(cy)}l-${n1(r * 0.28)} -${n1(r * 0.58)}M28 ${n1(cy)}l0 -${n1(r * 0.67)}M28 ${n1(cy)}l${n1(r * 0.28)} -${n1(r * 0.58)}" stroke="#C89838" stroke-width="1" fill="none" stroke-linecap="round"/>
        <circle cx="${n1(28 - r * 0.3)}" cy="${n1(cy - r * 0.63)}" r="${n1(Math.max(0.7, r * 0.1))}" fill="#B4451F"/>
        <circle cx="28" cy="${n1(cy - r * 0.72)}" r="${n1(Math.max(0.7, r * 0.1))}" fill="#B4451F"/>
        <circle cx="${n1(28 + r * 0.3)}" cy="${n1(cy - r * 0.63)}" r="${n1(Math.max(0.7, r * 0.1))}" fill="#B4451F"/>`;
    }),

    chrysanth: makeFlower((p, cy, r) => {
      /* [2026-08 리뉴얼] 두 겹 가는 꽃잎 링 + 짙은 중심 */
      const ring = (R, nP, rx, ry, col, rot0) => {
        let s = "";
        for (let i = 0; i < nP; i++) {
          const a = Math.PI * 2 * i / nP + rot0;
          const x = 28 + Math.cos(a) * R, y = cy + Math.sin(a) * R;
          s += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="${col}" stroke="${INK}" stroke-width=".6" transform="rotate(${n1(a * 180 / Math.PI + 90)} ${n1(x)} ${n1(y)})"/>`;
        }
        return s;
      };
      return `
        ${ring(r * 0.93, 16, r * 0.16, r * 0.5, p.light, 0)}
        ${ring(r * 0.6, 12, r * 0.17, r * 0.45, p.body, 0.26)}
        <circle cx="28" cy="${n1(cy)}" r="${n1(r * 0.32)}" fill="${shade(p.body, -0.3)}" stroke="${INK}" stroke-width=".8"/>
        <circle cx="${n1(28 - r * 0.09)}" cy="${n1(cy - r * 0.09)}" r="${n1(Math.max(0.7, r * 0.11))}" fill="${p.light}" opacity=".8"/>`;
    }),

    hydrangea: makeFlower((p, cy, r) => {
      /* [2026-08 리뉴얼] 네잎 소화(小花) 여섯 뭉치 */
      const fl = (dx, dy, col) => {
        const fr = r * 0.27, x = 28 + dx * r, y = cy + dy * r;
        let s = "";
        for (let i = 0; i < 4; i++) {
          const a = Math.PI / 2 * i + Math.PI / 4;
          s += `<circle cx="${n1(x + Math.cos(a) * fr)}" cy="${n1(y + Math.sin(a) * fr)}" r="${n1(fr * 1.05)}" fill="${col}" stroke="${INK}" stroke-width=".55"/>`;
        }
        return s + `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(fr * 0.5)}" fill="${p.pale}"/>`;
      };
      return `
        ${fl(-0.75, 0.22, p.light)}${fl(0.75, 0.22, p.light)}${fl(-0.54, -0.54, p.body)}
        ${fl(0.54, -0.54, p.body)}${fl(0, 0.52, p.body)}${fl(0, -0.16, p.light)}`;
    }),

    sunflower: makeFlower((p, cy, r) => {
      /* [2026-08 리뉴얼] 꽃잎 두 겹 + 씨앗 나선 패턴 */
      const ring = (R, rot0, col) => {
        let s = "";
        for (let i = 0; i < 12; i++) {
          const a = Math.PI * 2 * i / 12 + rot0;
          const x = 28 + Math.cos(a) * R, y = cy + Math.sin(a) * R;
          s += `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(r * 0.33)}" ry="${n1(r * 0.58)}" fill="${col}" stroke="${INK}" stroke-width=".8" transform="rotate(${n1(a * 180 / Math.PI + 90)} ${n1(x)} ${n1(y)})"/>`;
        }
        return s;
      };
      let seeds = "";
      for (let rr = r * 0.17; rr <= r * 0.47; rr += r * 0.15)
        for (let i = 0; i < Math.round(rr * 4); i++) {
          const a = Math.PI * 2 * i / Math.round(rr * 4) + rr;
          seeds += `<circle cx="${n1(28 + Math.cos(a) * rr)}" cy="${n1(cy + Math.sin(a) * rr)}" r="${n1(Math.max(0.4, r * 0.06))}" fill="#5C3A1E" opacity=".8"/>`;
        }
      return `
        ${ring(r, 0, p.light)}
        ${ring(r * 0.87, 0.26, p.body)}
        <circle cx="28" cy="${n1(cy)}" r="${n1(r * 0.66)}" fill="#7E5233" stroke="${INK}" stroke-width="1.1"/>
        <circle cx="28" cy="${n1(cy)}" r="${n1(r * 0.66)}" fill="none" stroke="#5C3A1E" stroke-width=".7" opacity=".5"/>
        ${seeds}`;
    }),

    berry(g) {
      /* [2026-08 리뉴얼] 알맹이에 윤곽선·꼭지를 달았습니다.
         구조(줄기·단계)는 그대로 */
      const { p, t, lv } = g;
      const st = plantStage(lv);
      const cy = st === "sprout" ? 34 : lerp(27, 22, t);
      const br = lerp(3, 4.4, t);
      const topY = st === "sprout" ? 38 : cy + br;
      const one = (dx, dy, scale) => `
        <path d="M${n1(28 + dx)} ${n1(cy + dy - br * scale - 2)}v2" stroke="#5E9130" stroke-width="1.2" stroke-linecap="round"/>
        <circle cx="${n1(28 + dx)}" cy="${n1(cy + dy)}" r="${n1(br * scale)}" fill="${p.body}" stroke="${INK}" stroke-width="1.1"/>
        <circle cx="${n1(28 + dx - br * scale * 0.32)}" cy="${n1(cy + dy - br * scale * 0.32)}" r="${n1(br * scale * 0.28)}" fill="${p.light}" opacity=".85"/>`;
      return `
        ${plantBase(lv, t, topY)}
        ${st === "sprout" || st === "leaf" ? "" :
          st === "bud" ? one(0, 0, 0.72)
                       : one(-br * 0.95, 1, 1) + one(br * 0.95, 1, 1) + one(0, -br * 0.85, 1)}`;
    },

    tree(g) {
      /* [2026-08 리뉴얼] 갈라진 줄기 + 겹친 수관.
         곁수관 Lv.5, 열매 Lv.10, 하이라이트 Lv.15 */
      const { p, t, lv } = g;
      return grow(t, `
        <path d="M24.8 50c.6 -6 .2 -9 -3.6 -13l2.4 -1.4q2.6 3.4 3.2 6 .6 -4.4 4 -7.4l2.2 1.6c-3.4 3.4 -3.8 8 -3.4 14.2z" fill="#8A6238" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
        ${lv >= AT_TAIL ? `<circle cx="20" cy="26" r="7.6" fill="${p.body}" stroke="${INK}" stroke-width="1.3"/>
        <circle cx="36" cy="26" r="7.6" fill="${p.body}" stroke="${INK}" stroke-width="1.3"/>` : ""}
        <circle cx="28" cy="18.6" r="8.4" fill="${p.body}" stroke="${INK}" stroke-width="1.3"/>
        <circle cx="28" cy="24" r="9" fill="${p.body}"/>
        ${lv >= AT_WING ? `<circle cx="23.6" cy="17" r="3.2" fill="${p.light}" opacity=".7"/>` : ""}
        ${lv >= AT_MARK ? `<circle cx="21" cy="29" r="1.5" fill="#D8384C"/><circle cx="33.4" cy="22" r="1.5" fill="#D8384C"/><circle cx="29" cy="30" r="1.5" fill="#D8384C"/>
        <circle cx="21.4" cy="28.6" r=".45" fill="#fff" opacity=".8"/><circle cx="33.8" cy="21.6" r=".45" fill="#fff" opacity=".8"/><circle cx="29.4" cy="29.6" r=".45" fill="#fff" opacity=".8"/>` : ""}`);
    },

    grass(g) {
      /* [2026-08 리뉴얼] 여러 갈래 잎 다발 + 들꽃.
         바깥 잎 Lv.5, 들꽃 Lv.10·Lv.15 */
      const { p, t, lv } = g;
      const blade = (x, h2, w, col, bend) => `<path d="M${x} 50q${n1(bend * 0.4)} -${n1(h2 * 0.55)} ${bend} -${h2}q${n1(w * 0.5 - bend * 0.4)} ${n1(h2 * 0.35)} ${n1(w - bend)} ${h2}z" fill="${col}" stroke="#5E9130" stroke-width=".8" stroke-linejoin="round"/>`;
      return grow(t, `
        ${lv >= AT_TAIL ? blade(18, 16, 4.4, p.body, -3) : ""}
        ${blade(23, 22, 4.8, p.light, -1.6)}
        ${blade(28.2, 26, 5, p.body, 0.4)}
        ${blade(33, 21, 4.6, p.light, 2)}
        ${lv >= AT_TAIL ? blade(38, 15, 4.2, p.body, 3.2) : ""}
        <path d="M12 50q16 -3 32 0" stroke="#5E9130" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        ${lv >= AT_MARK ? `<circle cx="21" cy="42" r="1.6" fill="#fff" stroke="#E8C048" stroke-width=".8"/>
        <circle cx="21" cy="42" r=".6" fill="#E8C048"/>` : ""}
        ${lv >= AT_WING ? `<circle cx="36.6" cy="45" r="1.3" fill="#fff" stroke="#E8C048" stroke-width=".7"/>
        <circle cx="36.6" cy="45" r=".5" fill="#E8C048"/>` : ""}`);
    },

    cloud(g) {
      /* [2026-08 리뉴얼] 뭉게 윤곽 + 얼굴.
         곁구름 Lv.5·Lv.15, 하이라이트 Lv.10 */
      const { p, t, lv } = g;
      return grow(t, `
        ${lv >= AT_TAIL ? `<ellipse cx="46" cy="14" rx="4.6" ry="2.9" fill="${p.light}" stroke="${INK}" stroke-width="1" opacity=".85"/>` : ""}
        ${lv >= AT_WING ? `<ellipse cx="11" cy="40" rx="3.8" ry="2.4" fill="${p.light}" stroke="${INK}" stroke-width="1" opacity=".85"/>` : ""}
        <path d="M14 36a7.4 7.4 0 0 1 3 -13.6 9.4 9.4 0 0 1 18.4 -2.6 8 8 0 0 1 9.4 8.4 6.6 6.6 0 0 1 -1.6 7.8q-14.6 4.6 -29.2 0z" fill="${p.body}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M14 36q14.6 4.4 29.2 0" stroke="${INK}" stroke-width="1.4" fill="none"/>
        ${lv >= AT_MARK ? `<ellipse cx="22" cy="23" rx="4.6" ry="3" fill="#fff" opacity=".65"/>` : ""}
        ${eyes2(28.5, 29, 6.2, "#5A6B7C", { blush: true, smile: true })}`);
    },

    stone(g) {
      /* [2026-08 리뉴얼] 모난 바위 + 이끼 모자.
         이끼 Lv.5, 면 사이 금 Lv.10, 곁이끼 Lv.15 */
      const { p, t, lv } = g;
      return grow(t, `
        <path d="M15 42l2.6 -12 6.4 -6.6 9.4 -1.4 8 4.6 3.6 9.4 -2.6 8 -8.4 3.4 -13.4 -.8z" fill="${p.body}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        ${lv >= AT_MARK ? `<path d="M17.6 30l7.4 -6.2M33.4 22.6l4.4 8.2M20.6 44.2l3 -6.4" stroke="${p.dark}" stroke-width="1" fill="none" opacity=".5"/>` : ""}
        <path d="M24 23.4l9.4 -1.4 3.2 1.8 -7.2 2.4z" fill="${p.light}" opacity=".7"/>
        ${lv >= AT_TAIL ? `<path d="M18 23.6q4 -4.6 9.6 -4.8 -1.4 3 -4.6 4.4 q3.2 .4 5.4 -1 -1 3.2 -5.2 4.2z" fill="#7FA858" stroke="#5E8140" stroke-width="1" stroke-linejoin="round"/>` : ""}
        ${lv >= AT_WING ? `<path d="M37 34.6q4.4 -3 6 1 -2.6 2.6 -6 -1z" fill="#B4D686" stroke="#5E8140" stroke-width=".8"/>` : ""}
        ${eyes2(29, 33, 6.4, "#3A3630", { blush: true, smile: true })}`);
    },

/* ── 선물 상자에서 나오는 무리 (2차) ────────────────────────── */

    rainbow(g) {
      /* [2026-08 리뉴얼] 윤곽 있는 띠 + 양끝 뭉게구름에 얼굴.
         띠 2개 → Lv.10에 3개 → Lv.15에 4개 */
      const { t, lv } = g;
      const cols = ["#E86A6A", "#F2B417", "#7FB53F", "#52A8E0"];
      const shown = lv >= AT_WING ? 4 : (lv >= AT_MARK ? 3 : 2);
      let arcs = "";
      for (let i = 0; i < shown; i++) {
        const r = 17.4 - i * 3.1;
        arcs += `<path d="M${n1(28 - r)} 41a${n1(r)} ${n1(r)} 0 0 1 ${n1(r * 2)} 0" stroke="${cols[i]}" stroke-width="3.1" fill="none"/>`;
      }
      const inR = 17.4 - (shown - 1) * 3.1 - 1.55;
      const puff = (x, y) => `
        <ellipse cx="${x}" cy="${y}" rx="6.2" ry="4.4" fill="#fff" stroke="${INK}" stroke-width="1.2"/>
        <ellipse cx="${n1(x - 3)}" cy="${n1(y - 2)}" rx="3" ry="2.4" fill="#fff" stroke="${INK}" stroke-width="1"/>
        <ellipse cx="${n1(x + 3.4)}" cy="${n1(y - 1.6)}" rx="2.7" ry="2.2" fill="#fff" stroke="${INK}" stroke-width="1"/>`;
      return grow(t, `
        <path d="M${n1(28 - 18.9)} 41a18.9 18.9 0 0 1 37.8 0" stroke="${INK}" stroke-width="1.2" fill="none"/>
        <path d="M${n1(28 - inR)} 41a${n1(inR)} ${n1(inR)} 0 0 1 ${n1(inR * 2)} 0" stroke="${INK}" stroke-width="1.2" fill="none"/>
        ${arcs}
        ${puff(11.4, 41)}${puff(44.6, 41)}
        ${eyes2(11.4, 41.4, 3.6, "#5A6B7C", { blush: true, smile: true })}
        ${eyes2(44.6, 41.4, 3.6, "#5A6B7C", { blush: true, smile: true })}`);
    },

    moon(g) {
      /* [2026-08 리뉴얼] 한 획 초승달(도려내기 없음) + 크레이터.
         금별 Lv.5, 크레이터 Lv.10, 작은 별 Lv.15 */
      const { p, t, lv } = g;
      return grow(t, `
        <path d="M35.4 10.6a17 17 0 1 0 8.2 30.8 13.6 13.6 0 0 1 -8.2 -30.8z" fill="${p.body}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        ${lv >= AT_MARK ? `<circle cx="22" cy="20" r="2.1" fill="${p.light}" opacity=".9"/><circle cx="17.4" cy="30" r="1.5" fill="${p.light}" opacity=".9"/><circle cx="23" cy="40" r="1.7" fill="${p.light}" opacity=".9"/>
        <circle cx="22" cy="20" r="2.1" fill="none" stroke="${shade(p.body, -0.25)}" stroke-width=".7"/><circle cx="17.4" cy="30" r="1.5" fill="none" stroke="${shade(p.body, -0.25)}" stroke-width=".7"/>` : ""}
        ${eyes2(24.5, 28.5, 5.4, "#8A7434", { blush: true, smile: true })}
        ${lv >= AT_TAIL ? `<path d="M44 16l1 2.9 2.9 1 -2.9 1 -1 2.9 -1 -2.9 -2.9 -1 2.9 -1z" fill="#EF9F27"/>` : ""}
        ${lv >= AT_WING ? `<path d="M46 34l.7 2 2 .7 -2 .7 -.7 2 -.7 -2 -2 -.7 2 -.7z" fill="#FFD028"/>` : ""}`);
    },

    sun(g) {
      /* [2026-08 리뉴얼] 삼각 햇살(두 색 번갈아) + 얼굴.
         햇살 4개 → Lv.5에 6개 → Lv.15에 8개 */
      const { p, t, lv } = g;
      const count = lv >= AT_WING ? 8 : (lv >= AT_TAIL ? 6 : 4);
      let rays = "";
      for (let i = 0; i < count; i++) {
        const a = Math.PI * 2 * i / count - Math.PI / 2, R = i % 2 ? 15.4 : 18;
        const x1 = 28 + Math.cos(a - 0.22) * 11.6, y1 = 28 + Math.sin(a - 0.22) * 11.6;
        const x2 = 28 + Math.cos(a) * R, y2 = 28 + Math.sin(a) * R;
        const x3 = 28 + Math.cos(a + 0.22) * 11.6, y3 = 28 + Math.sin(a + 0.22) * 11.6;
        rays += `<path d="M${n1(x1)} ${n1(y1)}L${n1(x2)} ${n1(y2)}L${n1(x3)} ${n1(y3)}z" fill="${i % 2 ? p.light : p.body}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
      }
      return grow(t, `
        ${rays}
        <circle cx="28" cy="28" r="11" fill="${p.body}" stroke="${INK}" stroke-width="1.4"/>
        <circle cx="28" cy="28" r="8.4" fill="${p.light}" opacity=".45"/>
        ${lv >= AT_MARK ? `<ellipse cx="24" cy="23.4" rx="3.4" ry="2.2" fill="#fff" opacity=".55" transform="rotate(-24 24 23.4)"/>` : ""}
        ${eyes2(28, 28.5, 6.4, "#8A5A18", { blush: true, smile: true })}`);
    },

    star(g) {
      /* [2026-08 리뉴얼] 윤곽 있는 별 + 속 하이라이트.
         작은 별 Lv.5, 하이라이트 Lv.10, 둘째 작은 별 Lv.15 */
      const { p, t, lv } = g;
      const sp = (cx, cy, R, r2) => {
        let d = "";
        for (let i = 0; i < 10; i++) {
          const a = Math.PI * i / 5 - Math.PI / 2, rr = i % 2 === 0 ? R : r2;
          d += (i ? "L" : "M") + n1(cx + Math.cos(a) * rr) + " " + n1(cy + Math.sin(a) * rr);
        }
        return d + "Z";
      };
      return grow(t, `
        ${lv >= AT_TAIL ? `<path d="${sp(48.5, 15, 3, 1.35)}" fill="${p.light}" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>` : ""}
        ${lv >= AT_WING ? `<path d="${sp(9.5, 41, 2.5, 1.1)}" fill="${p.light}" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>` : ""}
        <path d="${sp(28, 27, 18.6, 8.4)}" fill="${p.body}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
        ${lv >= AT_MARK ? `<path d="${sp(28, 27, 13.6, 6.2)}" fill="${p.light}" opacity=".5"/>` : ""}
        ${eyes2(28, 27.5, 6, "#5A4A80", { blush: true, smile: true })}`);
    }
  };

  /* ===============================================================
     [5-3] 한 마리 그리기
     =============================================================== */
  /**
   * @param maxed 정말로 40시간을 다 채웠는가 (Lv.10 도달과 4시간 차이가 납니다)
   */
  function petSvg(species, level, size, maxed) {
    const sp = SPECIES_IDS.includes(species) ? species : SPECIES_IDS[0];
    const lv = Math.max(1, Math.min(MAX_LEVEL, Number(level) || 1));
    const t = (lv - 1) / (MAX_LEVEL - 1);
    const p = palette(sp);
    const px = Number(size) || 56;
    const group = speciesGroup(sp);
    const showSpark = (maxed === undefined) ? (lv >= MAX_LEVEL) : !!maxed;

    let inner;
    if (lv === 1) {
      /* 아직 껍데기 — 무엇이 나올지 모릅니다.

         껍데기 색은 껍데기 종류로만 정합니다. 몸 색을 쓰면 색만 보고
         무엇이 들었는지 알 수 있어서, 껍데기의 뜻이 사라집니다. */
      inner = (SHELL_DRAW[group] || SHELL_DRAW.egg)(shellPalette(group));
    } else {
      /* 아기일 때는 머리가 크고 몸이 작습니다. 자라면서 반대가 됩니다.
         이 비율 하나가 "자랐다"는 느낌의 대부분을 만듭니다. */
      const headR  = lerp(9.6, 8.4, t);
      const bodyRx = lerp(8.6, 14, t);
      const bodyRy = lerp(8.2, 12, t);
      const bodyCy = lerp(34, 37, t);
      const headCy = bodyCy - lerp(11.5, 16, t);

      const g = {
        p, t, lv,
        body: { cx: 28, cy: bodyCy, rx: bodyRx, ry: bodyRy },
        head: { cx: 28, cy: headCy, r: headR }
      };
      inner = (DRAW[sp] || DRAW.cat)(g);
      // Lv.2 는 껍데기를 걸치고 나옵니다
      if (lv === 2) inner += shellRemnant(group, p, g.head);
    }

    const label = lv === 1
      ? `${shellLabel(sp)} · 아직 안 태어났어요`
      : `${speciesLabel(sp)} 레벨 ${lv}${showSpark ? " 만렙" : ""}`;

    return `<svg class="pet-svg" viewBox="0 0 60 56" width="${px}" height="${Math.round(px * 56 / 60)}"
      role="img" aria-label="${label}">${inner}${sparkles(showSpark)}</svg>`;
  }

  /* ---------------------------------------------------------------
     [6] 시간 표기
     --------------------------------------------------------------- */
  function fmtHM(ms) {
    const m = Math.max(0, Math.round(ms / 60000));
    const h = Math.floor(m / 60), mm = m % 60;
    if (h <= 0) return `${mm}분`;
    return mm ? `${h}시간 ${mm}분` : `${h}시간`;
  }

  const api = {
    HOURS_PER_LEVEL, MAX_LEVEL, PET_MS, MS_PER_HOUR, AT_TAIL, AT_MARK, AT_WING,
    SPECIES, SPECIES_IDS, SHELLS, SHELL_COLOR, INK, HORN_GOLD, RIBBON,
    speciesLabel, speciesGroup, shellLabel, colorHex, palette, shellPalette, shade,
    levelFromMs, petProgress, pickNextPet, pickInGroup, dexKey, petSvg, fmtHM
  };

  if (typeof window !== "undefined") window.Pet = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
