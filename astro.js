/* ============================================================
 * astro.js — 星象师工具核心天文算法
 * 基于 Jean Meeus《Astronomical Formulae for Calculators》(4th ed.)
 * 轨道根数来自 braeunig.us/space/plntpos.htm（公开教学资料）
 * 冥王星根数：JPL/J2000 近似根数
 * 全部输出为「回归黄道」（历元平春分点）地心视黄经，单位度 [0,360)
 * 精度说明：内行星 <0.5°，外行星 0.1~1.0°，月亮 ±0.3°，适合占星参考
 * ============================================================ */
(function (global) {
  'use strict';

  var RAD = Math.PI / 180;

  /* ---------- 基础工具 ---------- */
  function norm360(d) { d = d % 360; return d < 0 ? d + 360 : d; }
  function norm180(d) { d = d % 360; return d < -180 ? d + 360 : (d > 180 ? d - 360 : d); }

  /* 儒略日：h/min 为北京时间（东八区），内部转世界时并处理跨天/跨月/跨年 */
  function julianDay(y, m, d, h, min) {
    h = h === undefined ? 12 : h;
    min = min === undefined ? 0 : min;
    var ut = h + min / 60 - 8;
    if (ut < 0) { ut += 24; d -= 1; }
    var dt = new Date(Date.UTC(y, m - 1, d));
    var uy = dt.getUTCFullYear(), um = dt.getUTCMonth() + 1, ud = dt.getUTCDate();
    if (um <= 2) { uy -= 1; um += 12; }
    return 367 * uy - Math.floor(7 * (uy + Math.floor((um + 9) / 12)) / 4) +
      Math.floor(275 * um / 9) + ud + 1721013.5 + ut / 24;
  }

  /* 儒略世纪：T 以 1900 Jan 0.5 (JD 2415020.0) 为原点（braeunig 方法） */
  function T1900(jd) { return (jd - 2415020.0) / 36525; }

  /* 开普勒方程迭代解偏近点角 E（度输入/输出） */
  function kepler(Mdeg, e) {
    var M = Mdeg * RAD;
    var E = M;
    for (var i = 0; i < 12; i++) {
      var dE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
      E += dE;
      if (Math.abs(dE) < 1e-9) break;
    }
    return E / RAD;
  }

  /* ---------- VSOP87 截断级数（J2000 平春分点 · 日心坐标） ----------
   * 依赖 astro-vsop.js 的全局 VSOP87 与 astro-pluto.js 的冥王表
   * 级数求和：L = Σ_i τ^i · Σ_k A_ik·cos(B_ik + C_ik·τ)，τ 为 J2000 起儒略千年
   * 单位：角度 1e-8 rad，距离 1e-8 AU */
  var VSOP = (typeof VSOP87 !== 'undefined') ? VSOP87 : null;

  function vsopSum(terms, tau) {
    // 霍纳法：sum_list[0] + τ(sum_list[1] + τ(...))
    var s = 0, i, k, t;
    // terms 为混合系列平铺，需按系列长度还原——数据结构见 astro-vsop.js 注释
    // 这里 terms 已是单系列合并（series 顺序保存在生成端），用幂次遍历
    throw new Error('vsopSum 需要系列结构，请使用 vsopSeriesSum');
  }

  /* 标准 VSOP87 多系列求和 */
  function vsopSeriesSum(series, tau) {
    var acc = 0, i, k;
    for (i = series.length - 1; i >= 1; i--) {
      var s = 0;
      for (k = 0; k < series[i].length; k++) s += series[i][k][0] * Math.cos(series[i][k][1] + series[i][k][2] * tau);
      acc = (acc + s) * tau;
    }
    var s0 = 0;
    for (k = 0; k < series[0].length; k++) s0 += series[0][k][0] * Math.cos(series[0][k][1] + series[0][k][2] * tau);
    return acc + s0;
  }

  /* 某天体 J2000 日心坐标（L/B 弧度，R AU） */
  function vsopHelio(key, jd) {
    if (!VSOP || !VSOP[key]) throw new Error('VSOP87 数据缺失: ' + key);
    var tau = (jd - 2451545.0) / 365250.0;
    var d = VSOP[key];
    var L = vsopSeriesSum(d.L, tau) / 1e8;
    var B = vsopSeriesSum(d.B, tau) / 1e8;
    var R = vsopSeriesSum(d.R, tau) / 1e8;
    return { lon: norm360(L / RAD), lat: B / RAD, r: R };
  }

  /* 冥王星日心坐标（Meeus 理论，J2000 系） */
  function plutoHelio(jd) {
    if (typeof PLUTO_ARGUMENT === 'undefined') throw new Error('冥王星数据缺失');
    var t = (jd - 2451545.0) / 36525.0;
    var jj = 34.35 + 3034.9057 * t;
    var ss = 50.08 + 1222.1138 * t;
    var pp = 238.96 + 144.96 * t;
    var corrLon = 0, corrLat = 0, corrRad = 0, n;
    for (n = 0; n < PLUTO_ARGUMENT.length; n++) {
      var arg = PLUTO_ARGUMENT[n];
      var alpha = norm360(arg[0] * jj + arg[1] * ss + arg[2] * pp) * RAD;
      var sa = Math.sin(alpha), ca = Math.cos(alpha);
      corrLon += PLUTO_LONGITUDE[n][0] * sa + PLUTO_LONGITUDE[n][1] * ca;
      corrLat += PLUTO_LATITUDE[n][0] * sa + PLUTO_LATITUDE[n][1] * ca;
      corrRad += PLUTO_RADIUS_VECTOR[n][0] * sa + PLUTO_RADIUS_VECTOR[n][1] * ca;
    }
    return {
      lon: norm360(238.958116 + 144.96 * t + corrLon / 1000000.0),
      lat: -3.908239 + corrLat / 1000000.0,
      r: 40.7241346 + corrRad / 10000000.0
    };
  }

  /* 岁差修正：J2000 平春分点 → 历元平春分点（回归黄经，黄经方向近似，±100 年内误差<0.01°） */
  function precession(jd) {
    var T = (jd - 2451545.0) / 36525.0;
    return (5029.0966 * T + 1.11113 * T * T) / 3600.0;
  }

  /* 日心 → 地心（J2000 直角坐标），返回地心黄经（J2000 系） */
  function geoFromHelio(helio, jd) {
    var et = vsopHelio('earth', jd);
    var xp = helio.r * Math.cos(helio.lat * RAD) * Math.cos(helio.lon * RAD);
    var yp = helio.r * Math.cos(helio.lat * RAD) * Math.sin(helio.lon * RAD);
    var xe = et.r * Math.cos(et.lat * RAD) * Math.cos(et.lon * RAD);
    var ye = et.r * Math.cos(et.lat * RAD) * Math.sin(et.lon * RAD);
    return norm360(Math.atan2(yp - ye, xp - xe) / RAD);
  }

  /* 太阳地心黄经（= 地球日心黄经 + 180°，回归黄经）
   * 加 FK5 修正（Meeus ch.25：VSOP87 理论黄经 → FK5 参考系，-1.397°/世纪）
   * 行星地心黄经在日心差中 FK5 自动抵消，无需修正；太阳为单天体输出必须修正 */
  function sunLongitude(jd) {
    var e = vsopHelio('earth', jd);
    var T = (jd - 2451545.0) / 36525.0;
    var fk5 = -1.397 * T - 0.00031 * T * T;
    return norm360(norm360(e.lon + 180) + precession(jd) + fk5);
  }

  /* 月亮地心黄经（braeunig/Meeus 简化级数，±0.3°） */
  function moonLongitude(jd) {
    var T = T1900(jd);
    var Lp = 270.434164 + 481267.8831 * T;
    var M  = 358.475833 + 35999.0498 * T;
    var Mp = 296.104608 + 477198.8491 * T;
    var D  = 350.737486 + 445267.1142 * T;
    var F  = 11.250889 + 483202.0251 * T;
    var l = Lp
      + 6.288750 * Math.sin(Mp * RAD)
      + 1.274018 * Math.sin((2 * D - Mp) * RAD)
      + 0.658309 * Math.sin(2 * D * RAD)
      + 0.213616 * Math.sin(2 * Mp * RAD)
      - 0.185596 * Math.sin(M * RAD)
      - 0.114336 * Math.sin(2 * F * RAD);
    return norm360(l);
  }

  /* ---------- 行星位置总入口 ---------- */
  /* 各行星地心回归黄经 = VSOP87 日心(J2000) → 地心(J2000) → 岁差到历元平春分点 */
  var GEO_PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

  function planetPositions(jd) {
    var out = {}, i, k;
    for (i = 0; i < GEO_PLANETS.length; i++) {
      k = GEO_PLANETS[i];
      var h = vsopHelio(k, jd);
      out[k] = { lon: norm360(geoFromHelio(h, jd) + precession(jd)), retro: false };
    }
    // 冥王星（Meeus 理论）
    var ph = plutoHelio(jd);
    out.pluto = { lon: norm360(geoFromHelio(ph, jd) + precession(jd)), retro: false };
    // 太阳 / 月亮
    out.sun = { lon: sunLongitude(jd), retro: false };
    out.moon = { lon: moonLongitude(jd), retro: false };
    return out;
  }

  /* 顺逆行：比较 jd 前后 2 天的黄经变化（负 = 逆行） */
  function retrograde(jd, name) {
    var dt = 2; // 天
    var before = planetPositions(jd - dt)[name].lon;
    var after = planetPositions(jd + dt)[name].lon;
    var delta = norm180(after - before);
    return delta < -0.0005; // 微小负值归顺行（数值噪声）
  }

  function withRetrograde(jd) {
    var p = planetPositions(jd);
    var names = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
    for (var i = 0; i < names.length; i++) p[names[i]].retro = retrograde(jd, names[i]);
    return p;
  }

  /* ---------- 黄道与宫位 ---------- */
  var SIGNS = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
  var ELEMENTS = { 白羊: '火', 狮子: '火', 射手: '火', 金牛: '土', 处女: '土', 摩羯: '土',
    双子: '风', 天秤: '风', 水瓶: '风', 巨蟹: '水', 天蝎: '水', 双鱼: '水' };
  var MODES = { 白羊: '开创', 巨蟹: '开创', 天秤: '开创', 摩羯: '开创',
    金牛: '固定', 狮子: '固定', 天蝎: '固定', 水瓶: '固定',
    双子: '变动', 处女: '变动', 射手: '变动', 双鱼: '变动' };
  var PLANET_NAMES = { sun: '太阳', moon: '月亮', mercury: '水星', venus: '金星', mars: '火星',
    jupiter: '木星', saturn: '土星', uranus: '天王星', neptune: '海王星', pluto: '冥王星' };
  var PLANET_GLYPH = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
    jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇' };

  function signOf(lon) { return SIGNS[Math.floor(norm360(lon) / 30) % 12]; }
  function degInSign(lon) { return Math.floor(norm360(lon) % 30); }
  function signIndex(lon) { return Math.floor(norm360(lon) / 30) % 12; }

  function formatLon(lon) {
    var n = norm360(lon);
    var s = SIGNS[Math.floor(n / 30)];
    var d = Math.floor(n % 30);
    var m = Math.floor((n % 1) * 60);
    return s + ' ' + d + '°' + (m < 10 ? '0' : '') + m + '′';
  }

  /* 中天 MC（黄经） */
  function midheaven(jd, lon) {
    var T = (jd - 2451545.0) / 36525;
    var gmst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0) +
      0.000387933 * T * T - T * T * T / 38710000);
    var ramc = norm360(gmst + lon);
    var eps = 23.4392911 - 0.0130042 * T;
    var R = RAD;
    var mc = Math.atan2(Math.sin(ramc * R), Math.cos(ramc * R) * Math.cos(eps * R)) / R;
    return norm360(mc);
  }

  /* 上升（东升点） */
  function ascendant(jd, lat, lon) {
    var T = (jd - 2451545.0) / 36525;
    var gmst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0) +
      0.000387933 * T * T - T * T * T / 38710000);
    var ramc = norm360(gmst + lon);
    var eps = 23.4392911 - 0.0130042 * T;
    var R = RAD, l = ramc * R, b = lat * R, e = eps * R;
    var asc = Math.atan2(Math.cos(l), -(Math.sin(l) * Math.cos(e) + Math.tan(b) * Math.sin(e)));
    return norm360(asc / R);
  }

  /* 宫位：houseSystem 'whole'(整宫) / 'equal'(等宫)
   * whole：上升所在星座为第 1 宫，每宫=一星座
   * equal：从上升起每 30° 一宫 */
  function houses(jd, lat, lon, system) {
    var asc = ascendant(jd, lat, lon);
    var cusps = [];
    var i;
    if (system === 'whole') {
      var ascSignDeg = Math.floor(asc / 30) * 30;
      for (i = 0; i < 12; i++) cusps.push(norm360(ascSignDeg + i * 30));
    } else { // equal
      for (i = 0; i < 12; i++) cusps.push(norm360(asc + i * 30));
    }
    return { cusps: cusps, asc: asc, mc: midheaven(jd, lon) };
  }

  /* 行星落宫：黄经落在某宫范围内即属该宫 */
  function houseOf(lon, cusps) {
    for (var i = 0; i < 12; i++) {
      var a = cusps[i], b = cusps[(i + 1) % 12];
      var inRange = (a <= b) ? (lon >= a && lon < b) : (lon >= a || lon < b);
      if (inRange) return i + 1;
    }
    return 1;
  }

  /* ---------- 相位 ---------- */
  var ASPECTS = [
    { name: '合相', deg: 0, orb: 8, glyph: '☌', symbol: 'conj' },
    { name: '六分相', deg: 60, orb: 5, glyph: '⚹', symbol: 'sextile' },
    { name: '四分相', deg: 90, orb: 6, glyph: '□', symbol: 'square' },
    { name: '三分相', deg: 120, orb: 7, glyph: '△', symbol: 'trine' },
    { name: '对冲相', deg: 180, orb: 8, glyph: '☍', symbol: 'opposition' }
  ];

  /* 计算两黄经之间的相位；返回 null 或 {aspect, orb} */
  function aspectBetween(lonA, lonB, orbSunMoon) {
    var diff = Math.abs(norm180(lonA - lonB));
    for (var i = 0; i < ASPECTS.length; i++) {
      var a = ASPECTS[i];
      var d = Math.abs(diff - a.deg);
      var limit = a.orb + (orbSunMoon ? 2 : 0);
      if (d <= limit) return { aspect: a, orb: d };
    }
    return null;
  }

  /* ---------- 导出 ---------- */
  global.Astro = {
    julianDay: julianDay, T1900: T1900, kepler: kepler,
    sunLongitude: sunLongitude, moonLongitude: moonLongitude,
    planetPositions: planetPositions, withRetrograde: withRetrograde,
    ascendant: ascendant, midheaven: midheaven, houses: houses,
    houseOf: houseOf, aspectBetween: aspectBetween,
    signOf: signOf, degInSign: degInSign, signIndex: signIndex, formatLon: formatLon,
    SIGNS: SIGNS, ELEMENTS: ELEMENTS, MODES: MODES,
    PLANET_NAMES: PLANET_NAMES, PLANET_GLYPH: PLANET_GLYPH,
    ASPECTS: ASPECTS, norm360: norm360, norm180: norm180
  };
})(typeof window !== 'undefined' ? window : globalThis);
