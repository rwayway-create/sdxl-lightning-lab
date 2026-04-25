export interface Env {
  AI: any;
  ASSETS: Fetcher;
  LLM_API_KEY?: string;
  LLM_BASE_URL?: string;
  LLM_MODEL?: string;
}

const MODEL = "@cf/bytedance/stable-diffusion-xl-lightning";

const TRANSLATE_SYSTEM =
  "Rewrite the user's prompt into a vivid English image-generation prompt for SDXL. " +
  "Keep concrete subjects, locations, and named entities (e.g. Taipei 101 → 'Taipei 101 skyscraper'). " +
  "Add 3-6 visual descriptors (lighting, lens, mood, composition) that help SDXL render correctly. " +
  "Output ONLY the English prompt on a single line. No quotes, no preamble, no explanation, no thinking.";

async function maybeTranslate(prompt: string, env: Env): Promise<string> {
  // Only translate when CJK chars are present
  if (!/[㐀-鿿぀-ヿ가-힯]/.test(prompt)) return prompt;
  const apiKey = env.LLM_API_KEY;
  if (!apiKey) return prompt;
  const baseUrl = env.LLM_BASE_URL || "https://api.moonshot.cn/v1";
  const model = env.LLM_MODEL || "moonshot-v1-auto";
  try {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: TRANSLATE_SYSTEM },
          { role: "user", content: prompt },
        ],
        temperature: 1,
        stream: false,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return prompt;
    const j: any = await r.json();
    let en: string =
      j?.choices?.[0]?.message?.content?.trim() ||
      j?.choices?.[0]?.message?.reasoning_content?.trim() ||
      "";
    en = en.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    en = en.replace(/^["'“”`]+|["'“”`]+$/g, "");
    return en.length > 0 ? en : prompt;
  } catch {
    return prompt;
  }
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (url.pathname === "/api/generate" && req.method === "POST") {
      try {
        const body = await req.json() as Record<string, any>;
        if (!body.prompt || typeof body.prompt !== "string") {
          return new Response(JSON.stringify({ error: "prompt required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...cors },
          });
        }
        const rawPrompt = body.prompt.slice(0, 2048);
        const enPrompt = await maybeTranslate(rawPrompt, env);
        const inputs: Record<string, any> = {
          prompt: enPrompt,
          num_steps: Math.max(1, Math.min(20, +body.num_steps || 8)),
          width: [256, 512, 768, 1024].includes(+body.width) ? +body.width : 1024,
          height: [256, 512, 768, 1024].includes(+body.height) ? +body.height : 1024,
        };
        if (body.negative_prompt) inputs.negative_prompt = String(body.negative_prompt).slice(0, 500);
        if (body.image_b64) {
          inputs.image_b64 = String(body.image_b64);
          inputs.strength = Math.max(0, Math.min(1, +body.strength || 0.75));
        }
        const out = await env.AI.run(MODEL, inputs);
        return new Response(out, {
          headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store", ...cors },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...cors },
        });
      }
    }

    return env.ASSETS.fetch(req);
  },
};
