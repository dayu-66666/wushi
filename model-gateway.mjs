import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 4317);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROTOTYPE_HTML = process.env.PROTOTYPE_HTML || path.join(ROOT, "ui-previews/preview-interaction.html");

loadDotEnv(path.join(ROOT, ".env.local"));
loadDotEnv(path.join(ROOT, ".env"));

const STYLE_PROMPTS = {
  cream: "warm cream palette, low rounded sofa, boucle or cotton-linen upholstery, pale wood coffee table, soft rug, calm residential interior, refined editorial lighting",
  wood: "natural oak wood, linen textures, low-profile sofa, simple wood coffee table, airy daylight, minimal Japanese Scandinavian home",
  wabi: "wabi-sabi interior, low linen sofa, raw wood or stone coffee table, textured neutral rug, quiet negative space, handmade ceramics",
  midcentury: "mid-century modern furniture, walnut wood, slim legs, sculptural lamps, vintage but refined, controlled warm accents",
  modern: "modern minimal interior, clean low sofa, simple geometric coffee table, low saturation palette, uncluttered luxury",
  italian: "Italian quiet luxury interior, refined sofa, travertine or marble coffee table, leather accents, brushed metal details, restrained elegance",
  song: "Song dynasty inspired interior, pale wood, sparse low furniture, elegant Chinese objects, quiet balance, restrained textiles",
  oldmoney: "old money interior, dark wood, leather or wool upholstery, brass lamp, wool rug, timeless library mood",
  custom: "match the uploaded reference image style while preserving the original room structure"
};

const LAYOUT_RULES = [
  "Design the room like a professional interior designer, not a random collage.",
  "Use one coherent living-room furniture group plus restrained soft furnishings.",
  "Furniture set: exactly one main sofa or sectional, one coffee table centered in front of it, one rug anchoring the seating area, one low TV console or media cabinet when a usable wall exists, one floor lamp or plant, one framed artwork, optional sheer curtains, and one refined pendant or ceiling light.",
  "Place the main sofa directly against or very close to the longest usable wall, parallel to the wall plane, with its back visually anchored to the wall.",
  "Furniture must be rich enough to look like a complete styled living room, but not cluttered.",
  "Do not leave the room with only a sofa and a rug.",
  "Do not create two opposing sofas unless the original room is very wide and the layout plan explicitly asks for it.",
  "Keep a clear walkway from the camera/entrance toward the balcony or window; do not block doors, sliding doors, balcony access, wall switches, outlets, vents, or circulation paths.",
  "Coffee table must sit on the rug and align with the sofa. Rug must sit flat on the floor and follow the room perspective.",
  "All furniture must be grounded on the existing floor plane, correct scale, correct perspective, no floating objects, no oversized furniture, no tiny furniture.",
  "Leave the back window/balcony area visually open. Do not place a seating group directly in front of the balcony door unless there is clear space to pass.",
  "Use the selected style only for furniture silhouette, materials, color palette, textiles, and atmosphere; do not copy a different room layout from the reference style.",
  "The result should feel like a plausible real apartment staging plan."
];

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
  const stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.custom;
  const layoutPrompt = describeLayoutPlan(input.layoutPlan);
  return [
    "Interior furniture staging inside the uploaded room photo, not a new room.",
    "Use the uploaded image as the fixed base image.",
    "Preserve the exact room architecture, walls, floor, ceiling, beams, columns, windows, doors, balcony, air vents, switches, outlets, skirting boards, hard finishes, perspective, camera angle, and lighting direction.",
    "Do not repaint walls, do not change flooring, do not change ceiling, do not change door or window positions, do not crop or zoom the room, do not add impossible openings.",
    "Only add or replace movable furniture and soft decoration: sofa, chairs, table, rug, curtains, lamps, plants, artwork, bedding, storage, small decor.",
    "The original empty room shell must remain visibly the same.",
    layoutPrompt,
    ...LAYOUT_RULES,
    `Furniture style: ${stylePrompt}.`,
    `Generate option ${variantIndex + 1} with high-end interior magazine realism, calm composition, natural light, photorealistic furniture placement.`
  ].join(" ");
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
  const stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.custom;
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
    input.styleReferenceImage ? "There is also a style reference image; match its mood, material palette, and furniture language." : "",
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
  const prompt = await makeDeepSeekPrompt(input, styleId, 0);
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
  const prompt = await makeDeepSeekPrompt(input, styleId, 0);
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

  const model = process.env.FAL_INPAINT_MODEL || "fal-ai/flux-general/inpainting";
  const styleId = input.styleId || "cream";
  const prompt = await makeDeepSeekPrompt(input, styleId, 0);
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
    body: JSON.stringify(inputPayload)
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.detail || body?.error || body?.message || `fal inpaint API ${res.status}`);
  }

  const fallback = mockPlans(input);
  const images = body.images || [];
  fallback.provider = "fal_inpaint";
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

async function handleGenerate(req, res) {
  const input = await readBody(req);
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
      console.error("[gateway] fal inpaint failed, falling back to fal/img2img:", err.message);
      try {
        const fallback = await generateWithFal(input);
        fallback.provider = "fal-after-inpaint-error";
        fallback.error = err.message;
        return json(res, 200, fallback);
      } catch (fallbackErr) {
        const fallback = mockPlans(input);
        fallback.provider = "mock-after-fal-inpaint-error";
        fallback.error = `${err.message}; fallback failed: ${fallbackErr.message}`;
        return json(res, 200, fallback);
      }
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
        imageModel: process.env.OPENROUTER_IMAGE_MODEL || process.env.FAL_INPAINT_MODEL || process.env.FAL_MODEL || null
      });
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
