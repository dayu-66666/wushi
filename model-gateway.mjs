import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 4317);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROTOTYPE_HTML = process.env.PROTOTYPE_HTML || path.join(ROOT, "ui-previews/preview-interaction.html");

loadDotEnv(path.join(ROOT, ".env.local"));
loadDotEnv(path.join(ROOT, ".env"));

const STYLE_SPECS = {
  cream: {
    palette: ["warm ivory", "oatmeal", "soft beige", "pale natural wood"],
    materials: ["boucle", "cotton-linen", "matte pale wood", "soft woven rug"],
    furnitureLanguage: ["low rounded sofa", "soft corners", "quiet tactile surfaces", "light visual weight"],
    atmosphere: "gentle, bright, calm and residential with soft editorial daylight",
    decor: ["restrained abstract art", "ceramic objects", "one slim floor lamp", "minimal greenery"],
    avoid: ["high-saturation colors", "sharp aggressive geometry", "ornate carving", "glossy luxury styling"]
  },
  wood: {
    palette: ["natural oak", "warm white", "linen beige", "soft charcoal accents"],
    materials: ["oak", "ash wood", "linen", "paper or woven lighting"],
    furnitureLanguage: ["low-profile sofa", "simple solid-wood table", "slender joinery", "Japanese-Scandinavian restraint"],
    atmosphere: "airy, natural, practical and quietly warm",
    decor: ["paper lamp", "wood-framed art", "linen textiles", "small green plant"],
    avoid: ["orange varnished wood", "heavy carved furniture", "cold chrome", "busy decoration"]
  },
  wabi: {
    palette: ["chalk white", "stone grey", "raw timber", "earthy taupe"],
    materials: ["raw wood", "stone", "limewash texture", "coarse linen", "handmade ceramics"],
    furnitureLanguage: ["low linen sofa", "monolithic coffee table", "organic irregular edges", "quiet negative space"],
    atmosphere: "still, tactile, imperfect and meditative",
    decor: ["single branch arrangement", "handmade vessel", "textural art", "soft indirect light"],
    avoid: ["polished glamour", "symmetrical showroom styling", "bright colors", "excessive accessories"]
  },
  midcentury: {
    palette: ["walnut", "warm cream", "olive", "controlled rust accents"],
    materials: ["walnut wood", "textured wool", "leather accents", "aged brass"],
    furnitureLanguage: ["slim tapered legs", "sculptural lounge forms", "compact proportions", "clean vintage lines"],
    atmosphere: "cultivated, warm and characterful without looking retro-themed",
    decor: ["sculptural lamp", "graphic art", "small vintage object", "restrained color accent"],
    avoid: ["theme-park retro", "too many accent colors", "bulky contemporary sectional", "random antiques"]
  },
  modern: {
    palette: ["warm white", "light grey", "charcoal", "natural wood accent"],
    materials: ["matte fabric", "fine-grain wood", "clear glass", "subtle stone"],
    furnitureLanguage: ["clean low sofa", "precise geometry", "integrated storage", "thin visual profiles"],
    atmosphere: "functional, calm, uncluttered and quietly premium",
    decor: ["one large artwork", "architectural floor lamp", "minimal object grouping", "tonal rug"],
    avoid: ["sterile office feeling", "excessive black", "decorative clutter", "futuristic gimmicks"]
  },
  italian: {
    palette: ["warm greige", "travertine beige", "dark brown", "muted metal"],
    materials: ["travertine", "soft leather", "fine wool", "brushed metal", "dark timber"],
    furnitureLanguage: ["refined generous sofa", "sculptural low table", "precise tailoring", "quiet luxury proportions"],
    atmosphere: "restrained, polished and substantial without ostentation",
    decor: ["statement floor lamp", "large tonal artwork", "stone object", "subtle metallic detail"],
    avoid: ["gold overload", "glossy marble everywhere", "hotel-lobby staging", "ornate luxury"]
  },
  song: {
    palette: ["rice paper white", "pale timber", "ink grey", "celadon accent"],
    materials: ["pale wood", "linen", "paper", "celadon ceramic", "dark restrained metal"],
    furnitureLanguage: ["low balanced furniture", "fine timber lines", "elegant Chinese proportions", "generous breathing space"],
    atmosphere: "scholarly, serene, light and distinctly Eastern",
    decor: ["single ceramic vessel", "ink-inspired art", "paper lantern", "restrained natural branch"],
    avoid: ["literal palace decor", "red-and-gold symbolism", "dense antique display", "heavy traditional carving"]
  },
  oldmoney: {
    palette: ["deep walnut", "warm ivory", "olive", "oxblood accent", "aged brass"],
    materials: ["dark timber", "wool", "leather", "aged brass", "woven rug"],
    furnitureLanguage: ["timeless tailored sofa", "classic but restrained silhouettes", "solid proportions", "collected character"],
    atmosphere: "settled, cultured, warm and quietly established",
    decor: ["traditional art in simple frames", "brass reading lamp", "books", "one patterned textile"],
    avoid: ["costume-like mansion styling", "excessive darkness", "gold ornament", "crowded antique shop feeling"]
  },
  custom: {
    palette: ["colors extracted from the uploaded reference"],
    materials: ["materials extracted from the uploaded reference"],
    furnitureLanguage: ["furniture language extracted from the uploaded reference"],
    atmosphere: "match the reference mood without copying its room composition",
    decor: ["decor language extracted from the uploaded reference"],
    avoid: ["copying the reference room architecture", "copying the reference camera angle", "copying the reference furniture positions"]
  }
};

const ROOM_ANALYSIS_CACHE = new Map();
const STYLE_ANALYSIS_CACHE = new Map();

const LAYOUT_RULES = [
  "Design the room like a professional interior designer, not a random collage.",
  "Use one coherent living-room furniture group plus restrained soft furnishings.",
  "Furniture set: exactly one main sofa or sectional, exactly one accent lounge chair, one coffee table centered in front of the sofa, one rug anchoring the seating group, one low TV console or media cabinet when a usable wall exists, one floor lamp, sofa cushions, one framed artwork, a floral arrangement on the coffee table, and books on the media console.",
  "Place the main sofa directly against or very close to the longest usable wall, parallel to the wall plane, with its back visually anchored to the wall.",
  "Place the accent chair at an angle beside or diagonally opposite the sofa, facing the coffee table and conversation center; it must never sit randomly in the middle or block circulation.",
  "Furniture must be rich enough to look like a complete styled living room, but not cluttered.",
  "Do not leave the room with only a sofa and a rug.",
  "Do not create two opposing sofas unless the original room is very wide and the layout plan explicitly asks for it.",
  "Keep a clear walkway from the camera/entrance toward the balcony or window; do not block doors, sliding doors, balcony access, wall switches, outlets, vents, or circulation paths.",
  "Coffee table must sit on the rug and align with the sofa. Rug must sit flat on the floor and follow the room perspective.",
  "All furniture must be grounded on the existing floor plane, correct scale, correct perspective, no floating objects, no oversized furniture, no tiny furniture.",
  "Leave the back window/balcony area visually open. Do not place a seating group directly in front of the balcony door unless there is clear space to pass.",
  "Use the selected style only for color palette, tone, materials, furniture silhouette, textiles, decor language, and atmosphere.",
  "Never copy the composition, camera angle, room architecture, or furniture coordinates of a preset style image. Composition may be copied only when an explicit user instruction requests it.",
  "The result should feel like a plausible real apartment staging plan."
];

const LIVING_ROOM_RECIPE = [
  { id: "sofa", label: "main sofa", requirement: "exactly one correctly scaled main sofa with coordinated cushions" },
  { id: "accent_chair", label: "accent lounge chair", requirement: "exactly one accent lounge chair angled toward the sofa and coffee table" },
  { id: "rug", label: "area rug", requirement: "one generously sized area rug anchoring the entire seating group" },
  { id: "coffee_table", label: "coffee table", requirement: "one coffee table centered on the rug at a usable distance from the sofa" },
  { id: "floral_arrangement", label: "floral arrangement", requirement: "one restrained floral or branch arrangement in a vessel on the coffee table" },
  { id: "media_console", label: "media console", requirement: "one low media console on the wall opposite the sofa when a safe wall exists" },
  { id: "books_on_console", label: "books on media console", requirement: "a small intentional stack of books or design magazines on the media console" },
  { id: "floor_lamp", label: "floor lamp", requirement: "one style-appropriate floor lamp beside the sofa or accent chair" },
  { id: "cushions", label: "sofa cushions", requirement: "two to four coordinated cushions with controlled color and textile variation" },
  { id: "artwork", label: "artwork", requirement: "one or two appropriately scaled framed artworks on a genuinely usable wall" }
];

const STYLE_RECIPE_DETAILS = {
  cream: {
    accentChair: "a rounded ivory boucle lounge chair with soft compact proportions",
    cushions: "oatmeal, warm ivory and pale beige boucle or linen cushions",
    coffeeStyling: "a pale rounded wood table with a low ceramic vase and soft seasonal flowers",
    consoleStyling: "a light natural-wood console with two neutral design books and one small ceramic object",
    lampAndArt: "a slim cream floor lamp and low-saturation abstract artwork"
  },
  wood: {
    accentChair: "a light-oak lounge chair with woven or natural linen upholstery",
    cushions: "linen beige, warm white and restrained charcoal cushions",
    coffeeStyling: "a simple solid-oak coffee table with a handmade vessel and fresh green branch",
    consoleStyling: "a shallow oak console with two architecture books and one small wood or ceramic object",
    lampAndArt: "a paper or woven floor lamp and quiet wood-framed artwork"
  },
  wabi: {
    accentChair: "a low sculptural lounge chair in raw timber, linen or woven fiber",
    cushions: "chalk, stone and earthy taupe coarse-linen cushions",
    coffeeStyling: "a monolithic stone or raw-wood table with one handmade vessel and asymmetrical branch arrangement",
    consoleStyling: "a very low raw-wood cabinet with a small stack of art books and one aged ceramic object",
    lampAndArt: "a softly diffused paper floor lamp and one restrained textural artwork"
  },
  midcentury: {
    accentChair: "a sculptural walnut lounge chair with cognac leather, olive wool or woven upholstery",
    cushions: "warm cream, olive and one controlled rust accent cushion",
    coffeeStyling: "a walnut or smoked-glass coffee table with a vintage vessel and graphic floral arrangement",
    consoleStyling: "a low walnut media console with two art books, a small vintage object and restrained brass detail",
    lampAndArt: "a sculptural aged-brass floor lamp and bold but controlled graphic artwork"
  },
  modern: {
    accentChair: "a compact architectural lounge chair with a thin dark frame and warm-grey upholstery",
    cushions: "warm white, light grey and one charcoal cushion with precise tailoring",
    coffeeStyling: "a low glass, fine-wood or subtle-stone table with a minimal floral composition",
    consoleStyling: "a thin-profile wood media console with two monochrome design books and one precise object grouping",
    lampAndArt: "an architectural floor lamp and one large tonal abstract artwork"
  },
  italian: {
    accentChair: "a refined sculptural lounge chair in warm greige leather or fine wool with a slim metal base",
    cushions: "warm greige, dark brown and travertine-beige tailored cushions",
    coffeeStyling: "a sculptural travertine or dark-wood table with an elegant low floral arrangement",
    consoleStyling: "a precise dark-timber and stone console with luxury design books and one subtle metal object",
    lampAndArt: "a statement brushed-metal floor lamp and large tonal textural artwork"
  },
  song: {
    accentChair: "an elegant low pale-wood armchair with linen upholstery and refined Chinese proportions",
    cushions: "rice-paper white, linen beige and one restrained ink-grey cushion",
    coffeeStyling: "a balanced pale-wood table with celadon vessel and one natural branch arrangement",
    consoleStyling: "a restrained Eastern wood cabinet with two art books and one celadon or scholar-object accent",
    lampAndArt: "a paper floor lantern and one ink-inspired framed artwork with generous negative space"
  },
  oldmoney: {
    accentChair: "a timeless walnut lounge chair in olive wool or oxblood leather with solid classic proportions",
    cushions: "warm ivory, olive and one restrained patterned or oxblood cushion",
    coffeeStyling: "a deep-walnut table with a traditional floral arrangement in a dark ceramic or glass vessel",
    consoleStyling: "a substantial dark-timber console with collected books, one brass object and restrained styling",
    lampAndArt: "an aged-brass reading floor lamp and one or two traditionally framed artworks"
  },
  custom: {
    accentChair: "an accent lounge chair matching the extracted furniture silhouette, palette and material language",
    cushions: "two to four cushions derived from the extracted palette and textile language",
    coffeeStyling: "a coffee table matching the extracted style with a coordinated vessel and floral arrangement",
    consoleStyling: "a style-matched low media console with books and one restrained decorative object",
    lampAndArt: "a floor lamp and framed artwork following the extracted decorative language"
  }
};

const STYLE_NAMES = {
  cream: "奶油风",
  wood: "原木风",
  wabi: "侘寂风",
  midcentury: "中古风",
  modern: "现代简约",
  italian: "意式轻奢",
  song: "宋代美学",
  oldmoney: "老钱风",
  custom: "自定义参考风格"
};

const STYLE_DESCS = {
  cream: "温柔奶油色调，圆润线条，柔软织物质感。",
  wood: "天然木质纹理，简洁明亮，通透好打理。",
  wabi: "粗粝质感与留白美学，追求岁月痕迹。",
  midcentury: "复古线条与撞色家具，个性张力十足。",
  modern: "极简形态，功能优先，干净利落。",
  italian: "低调石材、皮革与金属细节，克制但有分量。",
  song: "清雅留白、木作线条与器物感，安静东方。",
  oldmoney: "深木色、皮革与黄铜细节，安静沉稳的经典感。",
  custom: "基于你上传的参考图，AI 生成的家具搭配方案。"
};

const PROMPT_CACHE = new Map();

function pctBox(box) {
  if (!box || typeof box !== "object") return "";
  const parts = ["x", "y", "w", "h"].map(key => Number.isFinite(Number(box[key])) ? `${key}:${Math.round(Number(box[key]) * 100)}%` : null).filter(Boolean);
  return parts.join(", ");
}

function describeLayoutPlan(plan) {
  if (!plan || typeof plan !== "object") {
    return [
      "Layout plan: one main sofa group only.",
      "Keep the far window, balcony, and door areas open.",
      "Put one rug and one coffee table in front of the sofa.",
      "Avoid mirrored sofas, scattered chairs, and furniture blocking circulation."
    ].join(" ");
  }
  const zones = plan.zones || {};
  const forbidden = plan.forbiddenZones || {};
  return [
    `Layout mode: ${plan.designIntent || "layout guided furniture staging"}.`,
    `Room type: ${plan.roomType || "living_room"}. Camera view: ${plan.cameraView || "uploaded room photo"}.`,
    zones.sofa ? `Sofa zone: ${zones.sofa.role || "main sofa"} (${pctBox(zones.sofa)}). Put exactly one main sofa here, aligned to the room perspective.` : "",
    zones.accentChair ? `Accent-chair zone: ${zones.accentChair.role || "one lounge chair facing the conversation center"} (${pctBox(zones.accentChair)}). Put exactly one accent chair here, angled toward the coffee table.` : "",
    zones.rugTable ? `Rug and coffee table zone: ${zones.rugTable.role || "rug and single coffee table"} (${pctBox(zones.rugTable)}). Put one rug flat on the floor and one coffee table centered on it.` : "",
    zones.mediaConsole ? `Media console zone: ${zones.mediaConsole.role || "low TV console"} (${pctBox(zones.mediaConsole)}). Put one shallow low cabinet here, grounded on the wall/floor line.` : "",
    zones.wallArt ? `Wall art zone: ${zones.wallArt.role || "framed artwork"} (${pctBox(zones.wallArt)}). Put one restrained framed artwork here, flat on the wall.` : "",
    zones.lighting ? `Ceiling light zone: ${zones.lighting.role || "pendant or ceiling light"} (${pctBox(zones.lighting)}). Add one refined light fixture only in this small ceiling area.` : "",
    zones.curtain ? `Curtain zone: ${zones.curtain.role || "sheer curtains"} (${pctBox(zones.curtain)}). Add light curtains only along the existing window edges; keep the opening readable.` : "",
    zones.decor ? `Small decor zone: ${zones.decor.role || "optional small plant or floor lamp"} (${pctBox(zones.decor)}). Use it only if it keeps the layout clean.` : "",
    forbidden.farOpening ? `Forbidden far opening zone: ${forbidden.farOpening.role || "far window/balcony/door stays open"} (${pctBox(forbidden.farOpening)}). Do not place sofa, table, plant, cabinet, or chair here.` : "",
    Array.isArray(plan.placementRules) && plan.placementRules.length ? `Placement rules: ${plan.placementRules.join("; ")}.` : "",
    Array.isArray(plan.fixedStructure) && plan.fixedStructure.length ? `Fixed structure that must not be edited: ${plan.fixedStructure.join(", ")}.` : ""
  ].filter(Boolean).join(" ");
}

function livingRoomRecipePrompt(styleId) {
  const details = STYLE_RECIPE_DETAILS[styleId] || STYLE_RECIPE_DETAILS.custom;
  return [
    `Mandatory living-room object contract: ${LIVING_ROOM_RECIPE.map(item => item.requirement).join("; ")}.`,
    `Style-specific accent chair: ${details.accentChair}.`,
    `Style-specific cushions: ${details.cushions}.`,
    `Coffee-table styling: ${details.coffeeStyling}.`,
    `Media-console styling: ${details.consoleStyling}.`,
    `Lighting and art: ${details.lampAndArt}.`,
    "Every mandatory object must be clearly visible, coherent with the selected style, realistically scaled and intentionally composed."
  ].join(" ");
}

function styleSpecToPrompt(spec) {
  const value = spec || STYLE_SPECS.custom;
  const list = (key) => Array.isArray(value[key]) ? value[key].filter(Boolean).join(", ") : "";
  return [
    list("palette") ? `palette: ${list("palette")}` : "",
    list("materials") ? `materials: ${list("materials")}` : "",
    list("furnitureLanguage") ? `furniture language: ${list("furnitureLanguage")}` : "",
    value.atmosphere ? `atmosphere: ${value.atmosphere}` : "",
    list("decor") ? `decor language: ${list("decor")}` : "",
    list("avoid") ? `avoid: ${list("avoid")}` : "",
    "style influence applies to color, tone, material, furniture form and mood only; it does not determine room composition"
  ].filter(Boolean).join("; ");
}

function imageCacheKey(value) {
  if (typeof value !== "string") return "";
  return createHash("sha256").update(value).digest("hex");
}

function parseJsonOutput(value) {
  const text = String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("vision model returned no JSON object");
  return JSON.parse(text.slice(start, end + 1));
}

function clamp(value, min = 0, max = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(max, Math.max(min, number));
}

function normalizeBox(value) {
  if (!value || typeof value !== "object") return null;
  let x = clamp(value.x ?? value.x_min);
  let y = clamp(value.y ?? value.y_min);
  let w = clamp(value.w ?? value.width);
  let h = clamp(value.h ?? value.height);
  if (w === null && value.x_max !== undefined && x !== null) w = clamp(Number(value.x_max) - x);
  if (h === null && value.y_max !== undefined && y !== null) h = clamp(Number(value.y_max) - y);
  if ([x, y, w, h].some(item => item === null) || w < 0.035 || h < 0.035) return null;
  w = Math.min(w, 1 - x);
  h = Math.min(h, 1 - y);
  return { x, y, w, h };
}

function overlapRatio(box, obstacle) {
  if (!box || !obstacle) return 0;
  const left = Math.max(box.x, obstacle.x);
  const top = Math.max(box.y, obstacle.y);
  const right = Math.min(box.x + box.w, obstacle.x + obstacle.w);
  const bottom = Math.min(box.y + box.h, obstacle.y + obstacle.h);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  return intersection / Math.max(0.0001, box.w * box.h);
}

function accentChairPenalty(box, zones, forbiddenZones) {
  let penalty = 0;
  if (zones.sofa) penalty += overlapRatio(box, zones.sofa) * 12;
  if (zones.rugTable) penalty += overlapRatio(box, zones.rugTable) * 1.5;
  if (zones.mediaConsole) penalty += overlapRatio(box, zones.mediaConsole) * 10;
  for (const [key, forbidden] of Object.entries(forbiddenZones)) {
    const label = `${key} ${forbidden.role || ""}`.toLowerCase();
    const isOpening = /(door|window|balcony|opening|门|窗|阳台)/.test(label);
    const isCirculation = /(circulation|walking|walkway|path|通行|动线)/.test(label);
    penalty += overlapRatio(box, forbidden) * (isOpening ? 16 : (isCirculation ? 10 : 6));
  }
  return penalty;
}

function repairAccentChairZone(zones, forbiddenZones) {
  const rug = zones.rugTable;
  const sofa = zones.sofa;
  if (!rug || !sofa) return null;
  const w = Math.min(0.2, Math.max(0.13, rug.w * 0.4));
  const h = Math.min(0.23, Math.max(0.15, sofa.h * 0.72));
  const clampCandidate = (x, y, role) => ({
    x: Math.min(1 - w, Math.max(0.02, x)),
    y: Math.min(1 - h, Math.max(0.35, y)),
    w,
    h,
    role
  });
  const candidates = [
    clampCandidate(rug.x - w - 0.035, rug.y - h * 0.15, "one accent lounge chair beside the left edge of the rug, angled toward the coffee table"),
    clampCandidate(rug.x + rug.w + 0.035, rug.y - h * 0.15, "one accent lounge chair beside the right edge of the rug, angled toward the coffee table"),
    clampCandidate(rug.x - w * 0.75, rug.y + rug.h - h * 0.72, "one accent lounge chair at the front-left of the seating group, angled inward"),
    clampCandidate(rug.x + rug.w - w * 0.25, rug.y + rug.h - h * 0.72, "one accent lounge chair at the front-right of the seating group, angled inward")
  ];
  return candidates
    .map(candidate => ({ candidate, penalty: accentChairPenalty(candidate, zones, forbiddenZones) }))
    .sort((a, b) => a.penalty - b.penalty)[0]?.candidate || null;
}

function validateRoomPlanGeometry(zones, forbiddenZones) {
  const openings = Object.entries(forbiddenZones).filter(([key, zone]) => {
    const label = `${key} ${zone.role || ""}`.toLowerCase();
    return /(door|window|balcony|opening|门|窗|阳台)/.test(label)
      && !/(circulation|walking|walkway|path|通行|动线)/.test(label);
  });
  const limits = { sofa: 0.25, accentChair: 0.35, rugTable: 0.55, mediaConsole: 0.45, wallArt: 0.5 };
  for (const [zoneKey, limit] of Object.entries(limits)) {
    const zone = zones[zoneKey];
    if (!zone) continue;
    for (const [openingKey, opening] of openings) {
      const ratio = overlapRatio(zone, opening);
      if (ratio > limit) {
        throw new Error(`${zoneKey} overlaps ${openingKey} by ${Math.round(ratio * 100)}%`);
      }
    }
  }
  if (zones.mediaConsole && zones.rugTable && overlapRatio(zones.mediaConsole, zones.rugTable) > 0.4) {
    throw new Error("mediaConsole overlaps the rugTable floor zone");
  }
  if (zones.accentChair && zones.sofa && overlapRatio(zones.accentChair, zones.sofa) > 0.35) {
    throw new Error("accentChair overlaps the main sofa zone");
  }
  if (zones.accentChair && zones.mediaConsole && overlapRatio(zones.accentChair, zones.mediaConsole) > 0.25) {
    throw new Error("accentChair overlaps the media console zone");
  }
}

function normalizeRoomPlan(raw) {
  const sourceZones = raw?.zones && typeof raw.zones === "object" ? raw.zones : {};
  const sourceForbidden = Array.isArray(raw?.forbiddenZones)
    ? Object.fromEntries(raw.forbiddenZones.map((value, index) => [value?.id || `opening${index + 1}`, value]))
    : (raw?.forbiddenZones && typeof raw.forbiddenZones === "object" ? raw.forbiddenZones : {});
  const zoneRoles = {
    sofa: "one main sofa close to and parallel with the best usable wall",
    accentChair: "one accent lounge chair angled toward the sofa and coffee table, outside circulation",
    rugTable: "one rug and one coffee table centered in front of the sofa",
    mediaConsole: "one shallow low media console on the wall opposite the sofa",
    wallArt: "one restrained framed artwork flat on a genuinely empty wall",
    decor: "one slim floor lamp or plant beside the sofa, outside circulation",
    lighting: "one ceiling light only around the existing ceiling-light point",
    curtain: "sheer curtain fabric only at the existing window edges"
  };
  const zones = {};
  for (const [key, role] of Object.entries(zoneRoles)) {
    const box = normalizeBox(sourceZones[key]);
    if (!box) continue;
    zones[key] = { ...box, role: String(sourceZones[key]?.role || role) };
  }

  const forbiddenZones = {};
  for (const [key, value] of Object.entries(sourceForbidden)) {
    const box = normalizeBox(value);
    if (!box) continue;
    forbiddenZones[key] = { ...box, role: String(value?.role || `${key} must stay clear`) };
  }

  if (zones.sofa && zones.rugTable) {
    const currentPenalty = zones.accentChair ? accentChairPenalty(zones.accentChair, zones, forbiddenZones) : Infinity;
    if (!zones.accentChair || currentPenalty > 0.4) {
      const repairedAccentChair = repairAccentChairZone(zones, forbiddenZones);
      if (repairedAccentChair) zones.accentChair = repairedAccentChair;
    }
  }

  if (!zones.sofa || !zones.accentChair || !zones.rugTable) {
    throw new Error("vision plan did not identify safe sofa, accent-chair and rug/table zones");
  }
  const uniqueBoxes = new Set(Object.values(zones).map(zone => [zone.x, zone.y, zone.w, zone.h].map(value => Number(value).toFixed(3)).join(":")));
  if (Object.keys(zones).length >= 3 && uniqueBoxes.size <= 1) {
    throw new Error("vision plan returned placeholder furniture coordinates");
  }
  validateRoomPlanGeometry(zones, forbiddenZones);

  return {
    version: 2,
    source: "vision-plan",
    roomType: String(raw?.roomType || "living_room"),
    cameraView: String(raw?.cameraView || "uploaded room photo"),
    designIntent: "place a complete, coherent living-room furniture set in the photographed room while preserving all hard architecture",
    fixedStructure: ["walls", "floor", "ceiling", "doors", "windows", "balcony", "openings", "vents", "switches", "outlets", "perspective", "camera angle"],
    placementRules: Array.isArray(raw?.placementRules) ? raw.placementRules.slice(0, 10).map(String) : [],
    zones,
    forbiddenZones,
    analysisSummary: String(raw?.analysisSummary || "")
  };
}

function normalizeStyleSpec(raw) {
  const toList = (value, fallback) => Array.isArray(value) && value.length
    ? value.slice(0, 8).map(String)
    : fallback;
  return {
    palette: toList(raw?.palette, STYLE_SPECS.custom.palette),
    materials: toList(raw?.materials, STYLE_SPECS.custom.materials),
    furnitureLanguage: toList(raw?.furnitureLanguage, STYLE_SPECS.custom.furnitureLanguage),
    atmosphere: String(raw?.atmosphere || STYLE_SPECS.custom.atmosphere),
    decor: toList(raw?.decor, STYLE_SPECS.custom.decor),
    avoid: [
      ...toList(raw?.avoid, []),
      "copying the reference room composition",
      "copying the reference architecture",
      "copying the reference furniture coordinates"
    ]
  };
}

async function queryFalVision(imageUrl, prompt) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY missing");
  const model = process.env.FAL_VISION_MODEL || "fal-ai/moondream3-preview/query";
  const response = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Key ${key}`
    },
    body: JSON.stringify({
      image_url: imageUrl,
      prompt,
      reasoning: false,
      temperature: 0
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.detail || body?.error || body?.message || `fal vision API ${response.status}`);
  return { raw: body.output, usage: body.usage_info || null, model };
}

async function queryOpenRouterVision(imageUrl, prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY missing");
  const model = process.env.OPENROUTER_VISION_MODEL || "qwen/qwen3-vl-32b-instruct";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || `http://127.0.0.1:${PORT}`,
      "X-Title": "Wushi Room Planner"
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 1200
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || `OpenRouter vision API ${response.status}`);
  const output = body?.choices?.[0]?.message?.content;
  if (!output) throw new Error("OpenRouter vision returned empty output");
  return { raw: output, usage: body.usage || null, model };
}

async function queryOpenRouterVisionPair(originalImage, generatedImage, prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY missing");
  const model = process.env.OPENROUTER_VISION_MODEL || "qwen/qwen3-vl-32b-instruct";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || `http://127.0.0.1:${PORT}`,
      "X-Title": "Wushi Room Quality Inspector"
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "text", text: "IMAGE 1 — original room photograph:" },
          { type: "image_url", image_url: { url: originalImage } },
          { type: "text", text: "IMAGE 2 — generated furnished result to inspect:" },
          { type: "image_url", image_url: { url: generatedImage } }
        ]
      }],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 900
    }),
    signal: AbortSignal.timeout(Number(process.env.OPENROUTER_REQUEST_TIMEOUT_MS || 60000))
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || `OpenRouter quality API ${response.status}`);
  const output = body?.choices?.[0]?.message?.content;
  if (!output) throw new Error("OpenRouter quality inspection returned empty output");
  return { raw: output, usage: body.usage || null, model };
}

function qualityScore(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : fallback;
}

function normalizeQualityReport(raw) {
  const sourceObjects = raw?.objects && typeof raw.objects === "object" ? raw.objects : {};
  const objects = {};
  for (const item of LIVING_ROOM_RECIPE) {
    const value = sourceObjects[item.id];
    objects[item.id] = value === true || value?.present === true;
  }
  const missingRequired = LIVING_ROOM_RECIPE.filter(item => !objects[item.id]).map(item => item.id);
  const structureScore = qualityScore(raw?.structureScore);
  const placementScore = qualityScore(raw?.placementScore);
  const styleScore = qualityScore(raw?.styleScore);
  const completenessScore = Math.round(((LIVING_ROOM_RECIPE.length - missingRequired.length) / LIVING_ROOM_RECIPE.length) * 100);
  const severeIssues = Array.isArray(raw?.severeIssues) ? raw.severeIssues.slice(0, 8).map(String) : [];
  const issues = Array.isArray(raw?.issues) ? raw.issues.slice(0, 12).map(String) : [];
  const overallScore = Math.round(structureScore * 0.45 + completenessScore * 0.35 + placementScore * 0.12 + styleScore * 0.08);
  const pass = missingRequired.length === 0
    && structureScore >= 88
    && placementScore >= 75
    && styleScore >= 70
    && severeIssues.length === 0;
  return {
    pass,
    overallScore,
    structureScore,
    completenessScore,
    placementScore,
    styleScore,
    objects,
    missingRequired,
    structureChanges: Array.isArray(raw?.structureChanges) ? raw.structureChanges.slice(0, 10).map(String) : [],
    severeIssues,
    issues,
    repairInstruction: String(raw?.repairInstruction || "").trim()
  };
}

async function assessGeneratedRoom(originalImage, generatedImage, input) {
  const requiredObjectShape = Object.fromEntries(LIVING_ROOM_RECIPE.map(item => [item.id, { present: true }]));
  const prompt = [
    "You are the final visual quality inspector for a photorealistic living-room staging product.",
    "Compare IMAGE 2 against IMAGE 1. Judge conservatively and return only valid JSON.",
    "First check hard structure: walls, floor pattern, ceiling, doors, windows, balcony, openings, vents, switches, outlets, crop, perspective and camera angle must remain consistent.",
    "Then inspect furniture completeness, scale, floor contact, wall anchoring, conversation layout and circulation. The balcony and main path must stay clear.",
    "Exactly one accent lounge chair must be clearly visible, angled toward the sofa and coffee table, and outside circulation.",
    `Every required object key must be evaluated: ${LIVING_ROOM_RECIPE.map(item => `${item.id} (${item.label})`).join(", ")}.`,
    "A floral arrangement must visibly sit on the coffee table. Books or design magazines must visibly sit on the media console. Cushions must visibly sit on the sofa.",
    `Selected style: ${input.styleName || STYLE_NAMES[input.styleId] || input.styleId || "interior style"}.`,
    `Approved layout plan: ${JSON.stringify(input.layoutPlan || {}).slice(0, 6500)}.`,
    "Scoring: structureScore, placementScore and styleScore are integers 0-100. Put architecture changes, blocked openings, floating furniture, severe scale errors or duplicated primary furniture in severeIssues.",
    "repairInstruction must be one concise English editing instruction that fixes every missing object and visible issue while preserving all correct content.",
    `Schema: ${JSON.stringify({ objects: requiredObjectShape, structureScore: 100, placementScore: 100, styleScore: 100, structureChanges: [], severeIssues: [], issues: [], repairInstruction: "" })}`
  ].join(" ");
  const result = await queryOpenRouterVisionPair(originalImage, generatedImage, prompt);
  return {
    ...normalizeQualityReport(parseJsonOutput(result.raw)),
    provider: "openrouter_vision",
    model: result.model,
    usage: result.usage
  };
}

async function analyzeRoomWithFalVision(roomImage) {
  const key = imageCacheKey(roomImage);
  if (ROOM_ANALYSIS_CACHE.has(key)) return ROOM_ANALYSIS_CACHE.get(key);
  const prompt = [
    "Act as a conservative interior space planner. Inspect this exact room photograph.",
    "Return only valid compact JSON, with every box normalized from 0 to 1 relative to the image.",
    "Do not infer a different room. Identify openings and circulation before furniture placement.",
    "Schema:",
    '{"roomType":"living_room","cameraView":"...","analysisSummary":"...","zones":{"sofa":{"x":0,"y":0,"w":0,"h":0,"role":"..."},"rugTable":{"x":0,"y":0,"w":0,"h":0,"role":"..."},"mediaConsole":{"x":0,"y":0,"w":0,"h":0,"role":"..."},"wallArt":{"x":0,"y":0,"w":0,"h":0,"role":"..."},"decor":{"x":0,"y":0,"w":0,"h":0,"role":"..."}},"forbiddenZones":{"opening1":{"x":0,"y":0,"w":0,"h":0,"role":"door/window/balcony/circulation"}},"placementRules":["..."]}',
    "The sofa box must cover one realistic sofa footprint and nearby wall area, placed against the best usable wall, never floating in the center.",
    "The rugTable box must lie on visible floor in front of the sofa. Media console is optional if no safe opposite wall exists.",
    "Do not create furniture zones inside doors, windows, balcony openings, hallways, or the main walking path.",
    "Prefer fewer safe zones over speculative zones. Do not include curtains or ceiling lighting in this first-pass plan."
  ].join(" ");
  const result = await queryFalVision(roomImage, prompt);
  const value = {
    layoutPlan: {
      ...normalizeRoomPlan(parseJsonOutput(result.raw)),
      source: result.model
    },
    provider: "fal_vision",
    model: result.model,
    usage: result.usage
  };
  ROOM_ANALYSIS_CACHE.set(key, value);
  return value;
}

async function analyzeRoomWithOpenRouterVision(roomImage) {
  const key = `openrouter:${imageCacheKey(roomImage)}`;
  if (ROOM_ANALYSIS_CACHE.has(key)) return ROOM_ANALYSIS_CACHE.get(key);
  const prompt = [
    "You are a conservative spatial planner for photorealistic furniture staging.",
    "Analyze the exact uploaded room photograph. Do not imagine a different room.",
    "Return only valid JSON. All x, y, w, h values must be normalized 0 to 1 relative to the original image.",
    "First identify walls, floor plane, doors, windows, balcony openings and the main walking path. Then select physically plausible furniture zones.",
    "Required JSON keys: roomType, cameraView, analysisSummary, zones, forbiddenZones, placementRules.",
    "zones must contain sofa, accentChair and rugTable. mediaConsole, wallArt and decor may be null only when physically unsafe.",
    "For an empty living room, plan a complete but restrained set: sofa, exactly one accentChair, rugTable, mediaConsole, wallArt and decor whenever each has a genuinely safe wall or floor location.",
    "Each non-null zone must be {x,y,w,h,role}.",
    "forbiddenZones must be an array of {id,x,y,w,h,role} covering every visible door, doorway, window, balcony opening and essential circulation strip.",
    "Opening boxes must tightly cover only the visible physical opening. Do not include reflections on the floor, the floor in front of an opening, or nearby usable wall area inside a door/window/balcony box.",
    "A circulation strip describes floor that should stay walkable, but its image-space box must not overlap any furniture zone. If the perspective makes a non-overlapping rectangle impossible, omit that circulation box and express the rule in placementRules instead.",
    "The sofa zone must be against the longest genuinely usable wall and must include the floor contact area. Never place a sofa in the center or in front of an opening.",
    "The accentChair zone must hold exactly one compact lounge chair beside or diagonally opposite the sofa, angled toward the coffee table. It must not overlap the sofa, sit in the central path, or block an opening.",
    "The rugTable zone must be on the visible floor directly in front of the sofa. Keep one continuous walking path from the camera/entrance to the far opening.",
    "Do not plan curtains or ceiling-light edits in this pass. Do not copy composition from any style reference.",
    'Example shape only: {"roomType":"living_room","cameraView":"entrance toward balcony","analysisSummary":"...","zones":{"sofa":{"x":0.58,"y":0.53,"w":0.32,"h":0.27,"role":"..."},"accentChair":{"x":0.20,"y":0.62,"w":0.16,"h":0.20,"role":"..."},"rugTable":{"x":0.30,"y":0.66,"w":0.38,"h":0.22,"role":"..."},"mediaConsole":null,"wallArt":null,"decor":null},"forbiddenZones":[{"id":"balcony","x":0.34,"y":0.18,"w":0.35,"h":0.37,"role":"keep open"}],"placementRules":["..."]}'
  ].join(" ");
  let result = await queryOpenRouterVision(roomImage, prompt);
  let layoutPlan;
  try {
    layoutPlan = normalizeRoomPlan(parseJsonOutput(result.raw));
  } catch (error) {
    const repairPrompt = [
      prompt,
      `Your previous plan failed geometric validation: ${error.message}.`,
      "Re-analyze the image and return a corrected JSON plan. Side walls are preferable to any wall containing a balcony or large opening.",
      "No sofa or wall art may be centered on, placed in front of, or substantially overlap a door, window, or balcony box.",
      "Return exactly one safe accentChair zone beside or diagonally opposite the sofa, facing the rug and coffee table, with no overlap with the sofa or circulation.",
      "The media console must be on a wall opposite the sofa, never inside the rug/coffee-table floor zone.",
      `Previous invalid JSON: ${String(result.raw).slice(0, 6000)}`
    ].join(" ");
    result = await queryOpenRouterVision(roomImage, repairPrompt);
    layoutPlan = normalizeRoomPlan(parseJsonOutput(result.raw));
  }
  const value = {
    layoutPlan: {
      ...layoutPlan,
      source: result.model
    },
    provider: "openrouter_vision",
    model: result.model,
    usage: result.usage
  };
  ROOM_ANALYSIS_CACHE.set(key, value);
  return value;
}

async function analyzeRoom(roomImage) {
  if (process.env.OPENROUTER_API_KEY) return analyzeRoomWithOpenRouterVision(roomImage);
  throw new Error("A spatial vision model is required. Add OPENROUTER_API_KEY to enable room planning.");
}

async function analyzeStyleWithFalVision(styleImage) {
  const key = imageCacheKey(styleImage);
  if (STYLE_ANALYSIS_CACHE.has(key)) return STYLE_ANALYSIS_CACHE.get(key);
  const prompt = [
    "Analyze this interior reference only as a style and mood reference.",
    "Ignore its room layout, camera angle, architecture, furniture coordinates, and composition.",
    "Return only valid compact JSON using this schema:",
    '{"palette":["..."],"materials":["..."],"furnitureLanguage":["..."],"atmosphere":"...","decor":["..."],"avoid":["..."]}',
    "Describe colors, tone, materials, furniture silhouettes, textile language, lighting mood, and decorative character that can transfer to a different room."
  ].join(" ");
  const result = await queryFalVision(styleImage, prompt);
  const spec = normalizeStyleSpec(parseJsonOutput(result.raw));
  STYLE_ANALYSIS_CACHE.set(key, spec);
  return spec;
}

async function resolveStyleSpec(input, styleId) {
  if (styleId !== "custom") return STYLE_SPECS[styleId] || STYLE_SPECS.cream;
  if (!input.styleReferenceImage) return STYLE_SPECS.custom;
  try {
    return await analyzeStyleWithFalVision(input.styleReferenceImage);
  } catch (error) {
    console.error("[gateway] custom style analysis failed, using generic custom style:", error.message);
    return STYLE_SPECS.custom;
  }
}

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  });
  res.end(JSON.stringify(body));
}

function html(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function staticFile(req, res, file) {
  const ext = path.extname(file).toLowerCase();
  const type = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  }[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=3600",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(file).pipe(res);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 18 * 1024 * 1024) {
        reject(new Error("request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function makePrompt(input, styleId, variantIndex) {
  const styleSpec = input.styleSpec || STYLE_SPECS[styleId] || STYLE_SPECS.custom;
  const stylePrompt = styleSpecToPrompt(styleSpec);
  const layoutPrompt = describeLayoutPlan(input.layoutPlan);
  return [
    "Interior furniture staging inside the uploaded room photo, not a new room.",
    "Use the uploaded image as the fixed base image.",
    "Preserve the exact room architecture, walls, floor, ceiling, beams, columns, windows, doors, balcony, air vents, switches, outlets, skirting boards, hard finishes, perspective, camera angle, and lighting direction.",
    "Do not repaint walls, do not change flooring, do not change ceiling, do not change door or window positions, do not crop or zoom the room, do not add impossible openings.",
    "Fill every supplied furniture mask zone with its assigned object.",
    livingRoomRecipePrompt(styleId),
    "Only add movable furniture and soft decoration inside the white mask. Do not leave a planned white zone empty and do not merely retouch the original empty room.",
    "The original empty room shell must remain visibly the same.",
    layoutPrompt,
    ...LAYOUT_RULES,
    `Furniture style specification: ${stylePrompt}.`,
    "Treat any preset gallery image as UI inspiration only. Do not reconstruct its shot, architecture, furniture arrangement, or viewing angle.",
    `Generate option ${variantIndex + 1} with high-end interior magazine realism, calm composition, natural light, photorealistic furniture placement.`
  ].join(" ");
}

function makeInpaintPrompt(input, styleId) {
  const styleSpec = input.styleSpec || STYLE_SPECS[styleId] || STYLE_SPECS.custom;
  const zones = input.layoutPlan?.zones || {};
  const assignments = [
    zones.sofa ? `one correctly scaled main sofa: ${zones.sofa.role}` : "",
    zones.accentChair ? `one correctly scaled accent lounge chair: ${zones.accentChair.role}` : "",
    zones.rugTable ? `one large flat rug with one coffee table centered on it: ${zones.rugTable.role}` : "",
    zones.mediaConsole ? `one shallow low media console: ${zones.mediaConsole.role}` : "",
    zones.wallArt ? `one framed artwork flat on the wall: ${zones.wallArt.role}` : "",
    zones.decor ? `one slim floor lamp, plant, or restrained decor element: ${zones.decor.role}` : ""
  ].filter(Boolean);
  return [
    "Photorealistic high-end living-room furniture staging in this exact empty apartment.",
    `Add a complete coordinated furniture set inside the supplied masked areas: ${assignments.join("; ")}.`,
    "Every planned masked area must contain its assigned visible object; do not return an empty room and do not merely retouch the floor or walls.",
    livingRoomRecipePrompt(styleId),
    "Furniture must have realistic apartment scale, correct perspective, natural floor contact and believable shadows matching the existing light.",
    "Keep the balcony access and central walking path visibly clear. Use exactly one sofa, one coffee table and one rug; no duplicate furniture or clutter.",
    `Style: ${styleSpecToPrompt(styleSpec)}.`,
    "Blend the unoccupied parts of each masked area back into the existing unchanged wall or floor. No text, labels, logos or watermark."
  ].join(" ");
}

function makeKontextPrompt(input, styleId) {
  const styleSpec = input.styleSpec || STYLE_SPECS[styleId] || STYLE_SPECS.custom;
  const zones = input.layoutPlan?.zones || {};
  const assignments = [
    zones.sofa ? `Place one main sofa ${zones.sofa.role}.` : "Place one correctly scaled main sofa against the best usable side wall.",
    zones.accentChair ? `Place exactly one accent lounge chair ${zones.accentChair.role}. Angle it toward the sofa and coffee table.` : "Place exactly one compact accent lounge chair beside or diagonally opposite the sofa, facing the coffee table without blocking circulation.",
    zones.rugTable ? `Place one rug and one coffee table ${zones.rugTable.role}.` : "Place one rug and one coffee table directly in front of the sofa.",
    zones.mediaConsole ? `Place one low media console ${zones.mediaConsole.role}.` : "",
    zones.wallArt ? `Place one framed artwork ${zones.wallArt.role}.` : "",
    zones.decor ? `Place one slim floor lamp, plant, or restrained decor element ${zones.decor.role}.` : ""
  ].filter(Boolean);
  return [
    "Edit this exact room photograph into a furnished living room; do not create a different room.",
    assignments.join(" "),
    livingRoomRecipePrompt(styleId),
    "Add a complete, coherent furniture and soft-furnishing set, not an empty room and not a sparse retouch. Do not omit any mandatory recipe object.",
    "Keep the exact walls, marble floor pattern, ceiling, recessed lights, air-conditioning vents, balcony doors, black frames, openings, switches, outlets, skirting boards, perspective, crop and camera angle unchanged.",
    "Keep the balcony doorway and the central walking route clear. Use exactly one sofa, one accent chair, one coffee table and one rug. No furniture may float, block an opening, or appear at an unrealistic scale.",
    `Use this style only for the new furniture and decor: ${styleSpecToPrompt(styleSpec)}.`,
    "Match the existing daylight, reflections, perspective and contact shadows. Photorealistic high-end interior magazine finish. No text, labels, logos or watermark."
  ].join(" ");
}

function nearestKontextAspectRatio(meta) {
  const width = Number(meta?.imageWidth);
  const height = Number(meta?.imageHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return undefined;
  const ratio = width / height;
  const options = [
    [21 / 9, "21:9"], [16 / 9, "16:9"], [3 / 2, "3:2"], [4 / 3, "4:3"],
    [1, "1:1"], [3 / 4, "3:4"], [2 / 3, "2:3"], [9 / 16, "9:16"], [9 / 21, "9:21"]
  ];
  return options.reduce((best, option) => Math.abs(option[0] - ratio) < Math.abs(best[0] - ratio) ? option : best)[1];
}

function makeKontextRepairPrompt(input, report, regenerateFromOriginal) {
  const missing = report.missingRequired.length
    ? report.missingRequired.map(id => LIVING_ROOM_RECIPE.find(item => item.id === id)?.label || id).join(", ")
    : "none";
  const issueText = [...report.severeIssues, ...report.issues, ...report.structureChanges].slice(0, 12).join("; ") || "none";
  if (regenerateFromOriginal) {
    return [
      makeKontextPrompt(input, input.styleId || "cream"),
      "The previous attempt changed or weakened the original architecture, so generate a new result from this original room photograph.",
      `Previous missing objects: ${missing}. Previous issues to avoid: ${issueText}.`,
      "Match every original structural line and opening exactly while still making every mandatory recipe object clearly visible."
    ].join(" ");
  }
  return [
    "Refine this existing furnished living-room image without redesigning it.",
    "Keep all architecture and all already-correct furniture exactly where they are. Do not change the crop, camera, walls, floor, ceiling, windows, doors, balcony or lighting direction.",
    `Add or correct only these missing mandatory objects: ${missing}.`,
    `Also fix these issues: ${issueText}.`,
    report.repairInstruction ? `Inspector instruction: ${report.repairInstruction}.` : "",
    livingRoomRecipePrompt(input.styleId || "cream"),
    "Exactly one accent chair must face the sofa and coffee table without blocking the main path. Keep the result photorealistic, restrained and coherent."
  ].filter(Boolean).join(" ");
}

async function makeDeepSeekPrompt(input, styleId, variantIndex) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key || process.env.TEXT_PROVIDER !== "deepseek") {
    return makePrompt(input, styleId, variantIndex);
  }

  const cacheKey = JSON.stringify({
    styleId,
    styleName: input.styleName,
    hasReference: Boolean(input.styleReferenceImage),
    layoutPlan: input.layoutPlan || null,
    variantIndex
  });
  if (PROMPT_CACHE.has(cacheKey)) return PROMPT_CACHE.get(cacheKey);

  const fallback = makePrompt(input, styleId, variantIndex);
  const stylePrompt = styleSpecToPrompt(input.styleSpec || STYLE_SPECS[styleId] || STYLE_SPECS.custom);
  const styleName = input.styleName || STYLE_NAMES[styleId] || "interior style";
  const layoutPrompt = describeLayoutPlan(input.layoutPlan);
  const system = [
    "You are a senior interior design prompt engineer.",
    "Write one concise English prompt for an image-to-image interior redesign model.",
    "The model receives the original room photo as image input.",
    "The prompt must treat the original room photo as a fixed base image.",
    "The prompt must preserve hard architecture and only add or redesign loose furniture, decor, textiles, lighting, curtains, rugs, plants and art.",
    "Strongly forbid changing walls, floor, ceiling, windows, doors, balcony, vents, outlets, perspective, crop, camera angle, or room layout.",
    "The prompt must include strict furniture layout rules: one coherent seating group, clear circulation path, correct scale, correct floor contact, no random furniture scatter.",
    "If a layout plan is provided, follow the furniture zones and forbidden zones exactly.",
    "Avoid mentioning UI, app, before/after labels, captions, watermarks, or text.",
    "Return only the final prompt, no markdown."
  ].join(" ");
  const user = [
    `Style name: ${styleName}`,
    `Style guidance: ${stylePrompt}`,
    input.styleReferenceImage ? "A custom reference image has already been reduced to a style specification. Use only that style specification, never its composition or furniture positions." : "",
    `Layout plan from the app: ${layoutPrompt}`,
    "Required constraints: keep walls, floor, ceiling, beams, columns, balcony, doors, windows, vents, switches, outlets, structural openings, perspective, camera angle, crop and room layout unchanged.",
    "Only place suitable movable furniture and soft furnishings inside the existing photographed room.",
    "Furniture layout rules:",
    ...LAYOUT_RULES.map(rule => `- ${rule}`),
    "Output should look like a high-end interior magazine photograph, realistic, elegant, coherent, naturally lit, while the original room shell stays visibly identical."
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.35,
        max_tokens: 360
      })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error?.message || `DeepSeek API ${res.status}`);
    const prompt = body?.choices?.[0]?.message?.content?.trim();
    if (!prompt) throw new Error("DeepSeek returned empty prompt");
    PROMPT_CACHE.set(cacheKey, prompt);
    return prompt;
  } catch (err) {
    console.error("[gateway] DeepSeek prompt failed, using fallback:", err.message);
    return fallback;
  }
}

function mockPlans(input) {
  const requested = input.styleId || "cream";
  const order = ["cream", "wood", "wabi", "midcentury", "modern", "italian", "song", "oldmoney"];
  const start = Math.max(0, order.indexOf(requested));
  const ids = requested === "custom"
    ? ["custom"]
    : [order[start]];

  return {
    provider: "mock",
    model: "local-model-gateway",
    plans: ids.map((id, index) => ({
      tab: "A",
      id,
      name: STYLE_NAMES[id] || input.styleName || "家具风格",
      desc: STYLE_DESCS[id] || STYLE_DESCS.custom,
      after: id === "custom" && input.styleReferenceImage
        ? input.styleReferenceImage
        : `https://picsum.photos/seed/ai-home-${id}-gateway-${index + 1}/800/1400`,
      prompt: makePrompt(input, id, index)
    }))
  };
}

async function generateWithOpenRouter(input) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY missing");

  const model = process.env.OPENROUTER_IMAGE_MODEL || "openai/gpt-image-1";
  const styleId = input.styleId || "cream";
  const prompt = makePrompt(input, styleId, 0);
  const references = [];
  if (input.roomImage) {
    references.push({ type: "image_url", image_url: { url: input.roomImage } });
  }
  if (input.styleReferenceImage) {
    references.push({ type: "image_url", image_url: { url: input.styleReferenceImage } });
  }

  const res = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://127.0.0.1:4317",
      "X-Title": "AI Huanran Home Prototype"
    },
    body: JSON.stringify({
      model,
      prompt,
      input_references: references,
      aspect_ratio: "9:16",
      output_format: "png",
      quality: "medium",
      n: 1
    })
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message || `OpenRouter image API ${res.status}`);
  }

  const item = body.data && body.data[0];
  const mediaType = item?.media_type || "image/png";
  const after = item?.url || (item?.b64_json ? `data:${mediaType};base64,${item.b64_json}` : null);
  if (!after) throw new Error("OpenRouter returned no image");

  const fallback = mockPlans(input);
  fallback.provider = "openrouter";
  fallback.model = model;
  fallback.usage = body.usage || null;
  fallback.plans[0] = {
    ...fallback.plans[0],
    after
  };
  return fallback;
}

async function generateWithFal(input) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY missing");

  const model = process.env.FAL_MODEL || "fal-ai/flux/dev/image-to-image";
  const styleId = input.styleId || "cream";
  const prompt = makePrompt(input, styleId, 0);
  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Key ${key}`
    },
    body: JSON.stringify({
      image_url: input.roomImage,
      prompt,
      strength: Number(process.env.FAL_STRENGTH || 0.82),
      num_inference_steps: Number(process.env.FAL_STEPS || 36),
      guidance_scale: Number(process.env.FAL_GUIDANCE || 3.5),
      num_images: 1,
      enable_safety_checker: true,
      output_format: "jpeg",
      acceleration: process.env.FAL_ACCELERATION || "regular"
    })
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.detail || body?.error || body?.message || `fal API ${res.status}`);
  }

  const fallback = mockPlans(input);
  const images = body.images || [];
  fallback.provider = "fal";
  fallback.model = model;
  fallback.seed = body.seed || null;
  fallback.timings = body.timings || null;
  fallback.layoutPlan = input.layoutPlan || null;
  fallback.plans = fallback.plans.map((plan, index) => ({
    ...plan,
    after: images[index]?.url || images[0]?.url || plan.after,
    prompt: body.prompt || prompt
  }));
  return fallback;
}

async function generateWithFalInpaint(input) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY missing");
  if (!input.roomMask) throw new Error("roomMask missing for inpainting");
  const editableCoverage = Number(input.roomMaskMeta?.editableCoverage);
  const zoneCount = Number(input.roomMaskMeta?.zoneCount);
  if (!Number.isFinite(editableCoverage) || editableCoverage < 0.08) {
    throw new Error(`furniture mask coverage too small (${Number.isFinite(editableCoverage) ? Math.round(editableCoverage * 100) : 0}%)`);
  }
  if (!Number.isFinite(zoneCount) || zoneCount < 2) {
    throw new Error("furniture mask does not contain enough placement zones");
  }

  const model = process.env.FAL_INPAINT_MODEL || "fal-ai/flux-general/inpainting";
  const styleId = input.styleId || "cream";
  const prompt = makeInpaintPrompt(input, styleId);
  const negativePrompt = [
    "new room layout",
    "changed walls",
    "changed floor",
    "changed ceiling",
    "changed windows",
    "changed doors",
    "different camera angle",
    "cropped image",
    "distorted perspective",
    "text",
    "watermark",
    "logo",
    "random furniture",
    "scattered chairs",
    "only one sofa in an empty room",
    "floating furniture",
    "sofa floating away from wall",
    "furniture blocking doors",
    "furniture blocking balcony",
    "wrong scale furniture",
    "oversized sofa",
    "tiny furniture",
    "multiple coffee tables",
    "cluttered layout",
    "unrealistic furniture placement"
  ].join(", ");

  const isFluxProFill = model.includes("flux-pro") && model.includes("/fill");
  const inputPayload = isFluxProFill
    ? {
        image_url: input.roomImage,
        mask_url: input.roomMask,
        prompt,
        num_images: 1,
        output_format: "jpeg",
        safety_tolerance: process.env.FAL_SAFETY_TOLERANCE || "2",
        enhance_prompt: false
      }
    : {
        image_url: input.roomImage,
        mask_url: input.roomMask,
        prompt,
        negative_prompt: negativePrompt,
        strength: Number(process.env.FAL_INPAINT_STRENGTH || 0.82),
        num_inference_steps: Number(process.env.FAL_INPAINT_STEPS || 30),
        guidance_scale: Number(process.env.FAL_INPAINT_GUIDANCE || 3.5),
        num_images: 1,
        enable_safety_checker: true,
        output_format: "jpeg",
        scheduler: process.env.FAL_INPAINT_SCHEDULER || "euler"
      };

  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Key ${key}`
    },
    body: JSON.stringify(inputPayload),
    signal: AbortSignal.timeout(Number(process.env.FAL_REQUEST_TIMEOUT_MS || 120000))
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.detail || body?.error || body?.message || `fal inpaint API ${res.status}`);
  }

  const fallback = mockPlans(input);
  const images = body.images || [];
  const generatedImage = images[0]?.url;
  if (!generatedImage) throw new Error("fal inpaint returned no generated image");
  fallback.provider = "fal_inpaint";
  fallback.model = model;
  fallback.seed = body.seed || null;
  fallback.timings = body.timings || null;
  fallback.layoutPlan = input.layoutPlan || null;
  fallback.plans = fallback.plans.map((plan) => ({
    ...plan,
    after: generatedImage,
    prompt: body.prompt || prompt
  }));
  return fallback;
}

async function callFalKontext({ key, model, imageUrl, prompt, aspectRatio }) {
  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Key ${key}`
    },
    body: JSON.stringify({
      image_url: imageUrl,
      prompt,
      guidance_scale: Number(process.env.FAL_EDIT_GUIDANCE || 3.5),
      num_images: 1,
      output_format: "jpeg",
      safety_tolerance: process.env.FAL_SAFETY_TOLERANCE || "2",
      enhance_prompt: false,
      aspect_ratio: aspectRatio
    }),
    signal: AbortSignal.timeout(Number(process.env.FAL_REQUEST_TIMEOUT_MS || 120000))
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.detail || body?.error || body?.message || `fal Kontext API ${res.status}`);
  }
  const generatedImage = body.images?.[0]?.url;
  if (!generatedImage) throw new Error("fal Kontext returned no generated image");
  return { body, imageUrl: generatedImage, prompt: body.prompt || prompt };
}

async function generateWithFalKontext(input) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY missing");
  if (!input.roomImage) throw new Error("roomImage missing for Kontext editing");

  const model = process.env.FAL_EDIT_MODEL || "fal-ai/flux-pro/kontext";
  const styleId = input.styleId || "cream";
  const prompt = makeKontextPrompt(input, styleId);
  const aspectRatio = nearestKontextAspectRatio(input.roomMaskMeta);
  const initial = await callFalKontext({
    key,
    model,
    imageUrl: input.roomImage,
    prompt,
    aspectRatio
  });

  let selected = initial;
  let initialQuality = null;
  let finalQuality = null;
  let repairAttempted = false;
  let repairSelected = false;
  let qualityError = null;

  try {
    initialQuality = await assessGeneratedRoom(input.roomImage, initial.imageUrl, input);
    finalQuality = initialQuality;
    if (!initialQuality.pass) {
      repairAttempted = true;
      const regenerateFromOriginal = initialQuality.structureScore < 88;
      const repairPrompt = makeKontextRepairPrompt(input, initialQuality, regenerateFromOriginal);
      const repaired = await callFalKontext({
        key,
        model,
        imageUrl: regenerateFromOriginal ? input.roomImage : initial.imageUrl,
        prompt: repairPrompt,
        aspectRatio
      });
      const repairedQuality = await assessGeneratedRoom(input.roomImage, repaired.imageUrl, input);
      if (repairedQuality.overallScore >= initialQuality.overallScore) {
        selected = repaired;
        finalQuality = repairedQuality;
        repairSelected = true;
      }
    }
  } catch (error) {
    qualityError = error.message;
    console.error("[gateway] visual quality inspection/repair failed, keeping initial result:", error.message);
  }

  const result = mockPlans(input);
  result.provider = "fal_kontext";
  result.model = model;
  result.seed = selected.body.seed || null;
  result.timings = selected.body.timings || null;
  result.layoutPlan = input.layoutPlan || null;
  result.quality = {
    initial: initialQuality,
    final: finalQuality,
    repairAttempted,
    repairSelected,
    error: qualityError
  };
  result.plans = result.plans.map(plan => ({
    ...plan,
    after: selected.imageUrl,
    prompt: selected.prompt
  }));
  return result;
}

async function handleGenerate(req, res) {
  const received = await readBody(req);
  const styleId = received.styleId || "cream";
  const input = {
    ...received,
    styleSpec: await resolveStyleSpec(received, styleId)
  };
  const provider = process.env.MODEL_PROVIDER || "mock";

  if (provider === "openrouter") {
    try {
      return json(res, 200, await generateWithOpenRouter(input));
    } catch (err) {
      console.error("[gateway] OpenRouter failed, falling back to mock:", err.message);
      const fallback = mockPlans(input);
      fallback.provider = "mock-after-openrouter-error";
      fallback.error = err.message;
      return json(res, 200, fallback);
    }
  }

  if (provider === "fal") {
    try {
      return json(res, 200, await generateWithFal(input));
    } catch (err) {
      console.error("[gateway] fal failed, falling back to mock:", err.message);
      const fallback = mockPlans(input);
      fallback.provider = "mock-after-fal-error";
      fallback.error = err.message;
      return json(res, 200, fallback);
    }
  }

  if (provider === "fal_inpaint") {
    try {
      return json(res, 200, await generateWithFalInpaint(input));
    } catch (err) {
      console.error("[gateway] fal inpaint failed:", err.message);
      return json(res, 502, { error: err.message || "fal inpaint failed" });
    }
  }

  if (provider === "fal_kontext") {
    try {
      return json(res, 200, await generateWithFalKontext(input));
    } catch (err) {
      console.error("[gateway] fal Kontext failed:", err.message);
      return json(res, 502, { error: err.message || "fal Kontext failed" });
    }
  }

  return json(res, 200, mockPlans(input));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    if (req.method === "OPTIONS") {
      return json(res, 200, { ok: true });
    }
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/prototype")) {
      if (!fs.existsSync(PROTOTYPE_HTML)) {
        return html(res, 404, "<h1>Prototype HTML not found</h1>");
      }
      return html(res, 200, fs.readFileSync(PROTOTYPE_HTML, "utf8"));
    }
    if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/assets/")) {
      const assetsRoot = path.join(ROOT, "assets");
      const file = path.normalize(path.join(ROOT, url.pathname));
      if (!file.startsWith(assetsRoot + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        return json(res, 404, { error: "asset not found" });
      }
      return staticFile(req, res, file);
    }
    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, {
        ok: true,
        provider: process.env.MODEL_PROVIDER || "mock",
        hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
        hasFalKey: Boolean(process.env.FAL_KEY),
        hasDeepSeekKey: Boolean(process.env.DEEPSEEK_API_KEY),
        textProvider: process.env.TEXT_PROVIDER || null,
        imageModel: process.env.MODEL_PROVIDER === "fal_kontext"
          ? (process.env.FAL_EDIT_MODEL || "fal-ai/flux-pro/kontext")
          : (process.env.OPENROUTER_IMAGE_MODEL || process.env.FAL_INPAINT_MODEL || process.env.FAL_MODEL || null),
        visionModel: process.env.OPENROUTER_API_KEY
          ? (process.env.OPENROUTER_VISION_MODEL || "qwen/qwen3-vl-32b-instruct")
          : null
      });
    }
    if (req.method === "POST" && url.pathname === "/api/analyze-room") {
      const input = await readBody(req);
      if (!input.roomImage) return json(res, 400, { error: "roomImage missing" });
      try {
        return json(res, 200, await analyzeRoom(input.roomImage));
      } catch (error) {
        console.error("[gateway] room analysis failed:", error.message);
        return json(res, 502, { error: error.message || "room analysis failed" });
      }
    }
    if (req.method === "GET" && url.pathname === "/api/generate") {
      return html(res, 200, `<!doctype html>
<meta charset="utf-8" />
<title>AI 焕然一居模型网关</title>
<style>
  body{margin:0;padding:40px;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;background:#050505;color:#f4f1ea;line-height:1.7}
  code,pre{background:#161616;border:1px solid #2a2927;border-radius:10px}
  code{padding:2px 6px}
  pre{padding:16px;overflow:auto}
  a{color:#f4f1ea}
</style>
<h1>AI 焕然一居模型网关已启动</h1>
<p>这个地址是后端接口，不是原型页面。前端会用 <code>POST /api/generate</code> 调它。</p>
<p>当前状态可以看：<a href="/health">/health</a></p>
<p>请回到原型页面测试流程：</p>
<pre>http://${req.headers.host || `127.0.0.1:${PORT}`}/</pre>
<p>命令行测试：</p>
<pre>curl -X POST http://127.0.0.1:${PORT}/api/generate \\
  -H 'Content-Type: application/json' \\
  -d '{"styleId":"cream","roomImage":"https://picsum.photos/seed/test-room/800/1400"}'</pre>`);
    }
    if (req.method === "POST" && url.pathname === "/api/generate") {
      return await handleGenerate(req, res);
    }
    return json(res, 404, { error: "not found" });
  } catch (err) {
    console.error("[gateway]", err);
    return json(res, 500, { error: err.message || "server error" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[gateway] listening on http://0.0.0.0:${PORT}`);
  console.log(`[gateway] prototype=${PROTOTYPE_HTML}`);
  console.log(`[gateway] provider=${process.env.MODEL_PROVIDER || "mock"}`);
});
