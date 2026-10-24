/* ============================================================
 * astro-words.js — 星象师解读引擎
 * 结构：行星原型 × 星座表达 × 宫位主题 → 组合解读
 *      相位词典 + 三巨头画像 + 元素模式
 * 口径：心理占星 / 自我探索语言，去绝对化
 * ============================================================ */
(function () {
  'use strict';

  var P = {
    sun:    { name: '太阳',  glyph: '☉',  core: '自我意识、生命力与核心意志，你选择成为什么样的人' },
    moon:   { name: '月亮',  glyph: '☽',  core: '情绪底色、安全感与内在需要，你如何被滋养' },
    mercury:{ name: '水星',  glyph: '☿',  core: '思维方式、表达与信息处理，你如何理解与沟通' },
    venus:  { name: '金星',  glyph: '♀',  core: '爱与关系、审美与价值感，你如何靠近与珍惜' },
    mars:   { name: '火星',  glyph: '♂',  core: '行动力、勇气与欲望，你如何争取与捍卫' },
    jupiter:{ name: '木星',  glyph: '♃',  core: '信念、成长与机遇，你在何处感到被鼓励' },
    saturn: { name: '土星',  glyph: '♄',  core: '边界、责任与秩序，你在何处学习自律与成熟' },
    uranus: { name: '天王星', glyph: '♅',  core: '独立、变革与独特性，你在何处需要自由与突破' },
    neptune:{ name: '海王星', glyph: '♆',  core: '想象、直觉与消融，你在何处做梦与疗愈' },
    pluto:  { name: '冥王星', glyph: '♇',  core: '转化、深层与权力，你在何处经历重生' },
    north:  { name: '北交点', glyph: '☊',  core: '灵魂成长方向，此生值得靠近的经验' },
    chiron: { name: '凯龙星', glyph: '⚷',  core: '深层创伤与疗愈天赋，先痛过才能助人' }
  };

  var SIGNS = [
    { n: '白羊', en: 'Aries',    el: '火', md: '开创',   w: '直接、勇敢、即刻行动',          d: '把“我”放在前面，先出发再完善' },
    { n: '金牛', en: 'Taurus',   el: '土', md: '固定',   w: '稳定、感官、持久',              d: '慢慢确认价值，用身体与物质安顿自己' },
    { n: '双子', en: 'Gemini',   el: '风', md: '变动',   w: '好奇、灵活、信息',              d: '在交流与变化中理解世界' },
    { n: '巨蟹', en: 'Cancer',   el: '水', md: '开创',   w: '共情、守护、记忆',              d: '用情感与家建立归属' },
    { n: '狮子', en: 'Leo',      el: '火', md: '固定',   w: '发光、慷慨、创造',              d: '需要被看见，也愿意照亮他人' },
    { n: '处女', en: 'Virgo',    el: '土', md: '变动',   w: '细致、分析、服务',              d: '在完善细节中找到秩序感' },
    { n: '天秤', en: 'Libra',    el: '风', md: '开创',   w: '平衡、审美、关系',              d: '在他人与自我之间寻求和谐' },
    { n: '天蝎', en: 'Scorpio',  el: '水', md: '固定',   w: '深刻、专注、洞察',              d: '愿意潜入深层，信任需要时间' },
    { n: '射手', en: 'Sagittarius', el: '火', md: '变动', w: '自由、远方、信念',             d: '用经历和意义感喂养自己' },
    { n: '摩羯', en: 'Capricorn', el: '土', md: '开创',  w: '务实、自律、结构',              d: '相信慢慢建起来的才牢固' },
    { n: '水瓶', en: 'Aquarius', el: '风', md: '固定',   w: '独立、前瞻、群体',              d: '先成为自己，再连接世界' },
    { n: '双鱼', en: 'Pisces',   el: '水', md: '变动',   w: '柔软、想象、慈悲',              d: '在感受与直觉中接近真相' }
  ];

  var HOUSES = [
    { n: '一宫', k: '自我与外在形象' }, { n: '二宫', k: '资源与价值感' },
    { n: '三宫', k: '沟通与日常学习' }, { n: '四宫', k: '家与内在根基' },
    { n: '五宫', k: '创造、恋爱与乐趣' }, { n: '六宫', k: '工作、健康与日常秩序' },
    { n: '七宫', k: '伴侣与重要关系' }, { n: '八宫', k: '深层联结与转化' },
    { n: '九宫', k: '远方、信念与学问' }, { n: '十宫', k: '事业与公众身份' },
    { n: '十一宫', k: '群体、朋友与愿景' }, { n: '十二宫', k: '潜意识与独处' }
  ];

  var ASPECTS = [
    { key: 'conjunction', n: '合相',   deg: 0,  orb: 8,  el: '两股能量融合成一体，彼此放大' },
    { key: 'sextile',     n: '六分相', deg: 60, orb: 4,  el: '两个领域能轻松互助，机会藏在日常' },
    { key: 'square',      n: '刑相',   deg: 90, orb: 6,  el: '内在张力与摩擦，是推动成长的功课' },
    { key: 'trine',       n: '拱相',   deg: 120, orb: 7, el: '天赋顺流，资源互认，但易被当作理所当然' },
    { key: 'opposition',  n: '冲相',   deg: 180, orb: 7, el: '两股力量在对岸互相照见，需要整合而非取舍' },
    { key: 'quincunx',    n: '梅花相', deg: 150, orb: 2, el: '难以言说的错位感，提醒调整生活细节' },
    { key: 'semisextile', n: '半六分相', deg: 30, orb: 1.5, el: '微弱但持续的磨合，像生活中的小提醒' },
    { key: 'sesquiquadrate', n: '八分相', deg: 135, orb: 1.5, el: '反复出现的别扭感，指向需要主动修的部分' }
  ];

  /* 相位容许度（占星师常用）：日月放宽，外行星收紧 */
  function orbOf(aKey, bKey) {
    var ks = String(aKey + '|' + bKey).split('|');
    var isLum = function (k) { return k === 'sun' || k === 'moon'; };
    var isFast = function (k) { return isLum(k) || k === 'mercury' || k === 'venus' || k === 'mars'; };
    var base = 0, asp;
    for (var i = 0; i < ASPECTS.length; i++) if (ASPECTS[i].key === aKey) asp = ASPECTS[i];
    base = asp ? asp.orb : 6;
    var hasLum = ks.some(isLum), hasFast = ks.some(isFast), hasSlow = ks.some(function (k) { return !isLum(k) && !isFast(k); });
    if (hasLum) base += 2;
    if (hasSlow && !hasLum) base -= 1;
    return Math.max(base, 1.5);
  }

  /* 找出两黄经间所有相位（返回标准 0-360 最短弧的相位） */
  function aspectsBetween(lonA, lonB, keys) {
    var out = [], i;
    var d = Math.abs(norm360(lonA) - norm360(lonB)); if (d > 180) d = 360 - d;
    for (i = 0; i < ASPECTS.length; i++) {
      var asp = ASPECTS[i];
      var orb = orbOf(asp.key, keys);
      if (Math.abs(d - asp.deg) <= orb) {
        out.push({ key: asp.key, n: asp.n, deg: asp.deg, orb: orb, actual: d, el: asp.el });
      }
    }
    return out;
  }

  function norm360(x) { x = x % 360; if (x < 0) x += 360; return x; }

  /* ---------- 组合解读 ---------- */
  function planetInSign(planetKey, signIdx) {
    var pl = P[planetKey] || P.sun;
    var sg = SIGNS[signIdx];
    return {
      title: pl.name + ' · ' + sg.n + '座',
      glyph: pl.glyph,
      line: pl.core + '。落在' + sg.n + '座：' + sg.w + '，' + sg.d + '。',
      element: sg.el, mode: sg.md
    };
  }

  function planetInHouse(planetKey, houseIdx) {
    var pl = P[planetKey] || P.sun;
    var hs = HOUSES[houseIdx];
    return {
      title: pl.name + ' · ' + hs.n,
      line: pl.name + '的功课主要发生在「' + hs.k + '」的领域，' + pl.core + '，在这里被反复练习。'
    };
  }

  /* 三巨头画像（太阳×月亮×上升）——按元素组合给出主画像 */
  function bigThreeProfile(sunIdx, moonIdx, ascIdx) {
    var sunEl = SIGNS[sunIdx].el, moonEl = SIGNS[moonIdx].el;
    var ascEl = SIGNS[ascIdx].el;
    var map = {
      '火火': '行动型：想到就去试，情绪来得快去得也快，需要学会给冲动留一点停顿。',
      '火土': '行动+务实：目标感强，先做事后说话，容易对自己太严格。',
      '火风': '行动+思辨：想法多、冲劲足，在交流中不断校准方向。',
      '火水': '行动+感受：做事的动力来自情绪，需要先安顿内心再行动。',
      '土土': '稳妥型：重承诺、重结构，安全感来自一步步积累。',
      '土火': '务实+行动：有耐心也有冲劲，适合长期主义路线。',
      '土风': '务实+思辨：理性规划生活，善于把想法落地成制度。',
      '土水': '务实+感受：外表冷静内在细腻，情感需要被认真对待。',
      '风风': '思辨型：靠信息和关系理解世界，容易想得多做得少。',
      '风火': '思辨+行动：点子多、执行快，注意别同时开太多战线。',
      '风土': '思辨+务实：擅长设计框架并推进，是天然的规划者。',
      '风水': '思辨+感受：能说也能共情，适合做桥梁型角色。',
      '水水': '感受型：直觉敏锐、共情力强，需要守护好自己的情绪边界。',
      '水火': '感受+行动：情绪是燃料，爆发力强，学会在冲动前先命名情绪。',
      '水风': '感受+思辨：心思细腻且善于表达，偶尔会过度思虑。',
      '水土': '感受+务实：重感情也重责任，值得深交的稳定型。'
    };
    var key = sunEl + moonEl;
    var line = map[key] || '混合型：' + sunEl + '与' + moonEl + '元素的太阳与月亮，在不同场景切换能量，关键在找到平衡点。';
    return {
      title: '三巨头画像',
      sun: '太阳·' + SIGNS[sunIdx].n + '座（' + sunEl + '）',
      moon: '月亮·' + SIGNS[moonIdx].n + '座（' + moonEl + '）',
      asc: '上升·' + SIGNS[ascIdx].n + '座（' + ascEl + '）',
      line: line
    };
  }

  /* 行星对相位解读（主要组合） */
  var PAIR_WORDS = {
    'sun-moon':   { conjunction: '自我与情绪高度一致，内外如一；若相位紧张，则自我表达与内在需要时常打架。',
                    opposition:  '清醒的自我与柔软的内在常常拉锯，学会两边都照顾。',
                    trine:       '你活得比较自洽，情绪能顺畅服务于你的目标。',
                    square:      '内心需要与现实节奏互相较劲，是重要的成长功课。' },
    'sun-mercury':{ conjunction: '表达即自我，说话直接反映立场。',
                    square:      '思维容易自我较劲，先厘清再开口。' },
    'sun-venus':  { conjunction: '自我与爱意融合，天然吸引他人。',
                    trine:       '气质讨喜，关系里容易得到善意。',
                    square:      '自我主张与关系和谐常有冲突，需要练习“同时成立”。' },
    'sun-mars':   { conjunction: '行动力强，敢作敢为。',
                    square:      '急躁易上头，冲动前需要三秒停顿。',
                    opposition:  '自我与欲望互相拉扯，学会合作而非对抗。' },
    'moon-mercury':{ conjunction: '情绪想得快说得快，感受与表达同步。',
                    square:      '想太多容易内耗，把话说出来反而轻松。' },
    'moon-venus': { conjunction: '情感细腻，懂得给人温柔。',
                    trine:       '情绪与关系和谐，容易获得情感滋养。' },
    'moon-mars':  { square:      '情绪来得猛，先让情绪落地再决定行动。',
                    trine:       '情绪能量用得好，是行动派的燃料。' },
    'venus-mars': { conjunction: '爱与欲望合流，魅力直接。',
                    trine:       '魅力与行动配合自然，关系里主动而松弛。',
                    square:      '“要爱”和“要赢”偶尔打架，需要分清场合。',
                    opposition:  '亲密与独立来回摇摆，信任是核心功课。' },
    'mercury-mars':{ conjunction: '反应快、嘴快，辩论高手。',
                    square:      '说话容易带刺，练习把批评换成建议。' },
    'mercury-jupiter': { trine: '视野开阔，学什么都快。',
                    square:      '表达容易夸张，注意核实再下结论。' },
    'sun-jupiter':{ trine:       '乐观豁达，贵人运常有。',
                    square:      '容易高估自己，量力而行更长久。' },
    'sun-saturn': { conjunction: '责任感强，成熟早，对自己要求高。',
                    square:      '自我设限偏多，学会肯定自己的努力。',
                    trine:      '自律能转化为成果，稳步向上。',
                    opposition: '权威与自我常有张力，终要自己定义标准。' },
    'moon-saturn':{ conjunction: '情绪克制，安全感来自秩序。',
                    square:      '情感需求容易被压抑，练习表达需要。' },
    'saturn-uranus': { square:   '稳定与变革拉扯，规则是用来打破还是遵守，是长期议题。',
                    trine:      '既能守规矩又能创新，是稀缺能力。' },
    'jupiter-saturn': { conjunction: '扩张与收缩交替，像呼吸，学会把握节奏。' },
    'neptune-sun':{ conjunction: '想象力丰富，理想主义底色。',
                    square:      '容易自我美化，练习用事实核对期待。' },
    'pluto-moon': { conjunction: '情绪深刻，感知力强，需要定期清理内心库存。',
                    square:      '占有欲与信任功课，学会放手。' },
    'pluto-sun':  { conjunction: '意志强烈，人生常有“归零重建”的章节。',
                    square:      '控制欲与自我较劲，放下才能翻篇。' },
    'uranus-moon':{ square:      '情绪需要独立空间，情绪波动时给自己独处。',
                    trine:      '情绪灵活，适应变化快。' },
    'uranus-venus':{ trine:     '审美独特，关系里要自由。',
                    square:      '忽冷忽热是常态，需要稳定承诺反而要更耐心。' },
    'venus-saturn':{ conjunction: '对感情认真谨慎，值得托付也容易晚熟。',
                    square:      '怕受伤所以先设防，练习逐步信任。',
                    trine:      '长久关系是加分项，越久越懂珍惜。' },
    'mars-saturn':{ trine:       '耐力型行动者，越难越稳。',
                    square:      '行动易被自我怀疑卡住，从小目标开始。' },
    'mars-jupiter':{ conjunction: '冲劲与运气叠加，敢闯。',
                    square:      '用力过猛容易反弹，节奏比速度重要。' },
    'moon-jupiter':{ trine:     '情绪天然乐观，能自我消化。',
                    square:      '情绪容易被放大，练习把烦恼写下来。' },
    'sun-uranus': { conjunction: '强烈想做自己，讨厌被安排。',
                    trine:      '独立而清醒，容易吸引同类。',
                    square:      '自我表达常走“不按牌理”路线，理解他人的规则也很重要。' },
    'sun-neptune':{ conjunction: '有理想主义气质，适合艺术与疗愈。',
                    square:      '边界模糊容易消耗，练习“清醒地善良”。' },
    'mercury-venus':{ trine:    '说话好听，文字有美感。',
                    conjunction: '表达即魅力，情商在线。' },
    'mercury-neptune':{ conjunction: '直觉型思考，想象力丰富。',
                    square:      '表述容易绕，练习把话说直。' },
    'mercury-pluto':{ trine:    '洞察力强，一眼看穿本质。',
                    square:      '说话一针见血但容易伤人，练习留白。' },
    'venus-jupiter':{ trine:    '慷慨大方，关系里给予多。',
                    square:      '容易过度付出，练习先爱自己。' },
    'mars-pluto': { conjunction: '意志强悍，爆发力惊人。',
                    square:      '好胜心强，学会把力量用在建设而非对抗。' },
    'saturn-moon': { opposition: '家庭与责任拉扯，练习照顾自己。' }
  };

  /* 行星固定顺序，用于相位对 key 规范化 */
  var PLANET_ORDER = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','north','chiron'];
  function pairKey(a, b) {
    var ia = PLANET_ORDER.indexOf(a), ib = PLANET_ORDER.indexOf(b);
    if (ia === -1) ia = 99; if (ib === -1) ib = 99;
    return (ia <= ib ? a + '-' + b : b + '-' + a);
  }

  function pairAspectWord(a, b, aspKey) {
    var map = PAIR_WORDS[pairKey(a, b)];
    if (!map) return '';
    return map[aspKey] || '';
  }

  /* 顺逆行说明 */
  var RETRO_WORD = {
    mercury: '水星逆行期：沟通与出行易有反复，适合复盘、修改与重联，不宜急着做重大签约。',
    venus:   '金星逆行期：关系与审美进入回顾模式，旧人旧事可能回访，适合重新评估价值。',
    mars:    '火星逆行期：行动容易卡顿或反复，先收力再发力，避免硬刚。',
    jupiter: '木星逆行期：外在机会减少，转向内在成长与复盘，是消化和学习的时段。',
    saturn:  '土星逆行期：规则与责任需要重新审视，适合修订计划而非冒进。',
    uranus:  '天王星逆行期：内在变革涌动，外在变化放缓，是调整自我的窗口。',
    neptune: '海王星逆行期：直觉更活跃也更容易模糊，练习分辨梦想与逃避。',
    pluto:   '冥王星逆行期：深层议题浮现，适合向内探索，不适合急于向外抓取。'
  };

  /* ---------- 导出 ---------- */
  var AstroWords = {
    P: P, SIGNS: SIGNS, HOUSES: HOUSES, ASPECTS: ASPECTS,
    planetInSign: planetInSign,
    planetInHouse: planetInHouse,
    bigThreeProfile: bigThreeProfile,
    aspectsBetween: aspectsBetween,
    pairAspectWord: pairAspectWord,
    orbOf: orbOf,
    RETRO_WORD: RETRO_WORD
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AstroWords;
  if (typeof globalThis !== 'undefined') globalThis.AstroWords = AstroWords;
  else if (typeof window !== 'undefined') window.AstroWords = AstroWords;
})();
