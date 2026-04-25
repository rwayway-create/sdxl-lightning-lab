export interface Env {
  AI: any;
  ASSETS: Fetcher;
}

const MODEL = "@cf/bytedance/stable-diffusion-xl-lightning";

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
        const inputs: Record<string, any> = {
          prompt: body.prompt.slice(0, 2048),
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
