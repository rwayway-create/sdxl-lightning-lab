# SDXL Lightning Lab

Cloudflare Worker that serves a frosted-glass single-page UI for **SDXL Lightning** (text-to-image + img2img), powered by `@cf/bytedance/stable-diffusion-xl-lightning` via the AI binding.

🌐 **Live**: https://sdxl.daedalus.work

## What it does

- **Text-to-image**: Type a prompt, get a 1024×1024 JPEG in ~4s.
- **img2img**: Drag, paste (Ctrl+V), or click to attach a reference photo. Strength slider blends prompt vs source.
- **Free**: SDXL Lightning is in CF Workers AI free beta ($0.00/step).
- **Token never in client**: Worker proxies the AI binding; no API key in browser.

## Stack

- Frontend: vanilla HTML + Tailwind (CDN), Lexend font, Material Symbols icons. Design by Stitch (Cyberpunk Culinary Noir).
- Backend: single TS Worker with `[ai]` binding + `[assets]` directory.

## Deploy

```bash
npx wrangler deploy
```

`wrangler.toml` already binds `sdxl.daedalus.work` as a custom domain.

## API

`POST /api/generate`

```json
{
  "prompt": "鐵板麵 台灣早餐 黑胡椒醬",
  "num_steps": 8,
  "width": 1024,
  "height": 1024,
  "negative_prompt": "blurry",
  "image_b64": "<base64 reference, optional>",
  "strength": 0.75
}
```

Returns `image/jpeg` binary.
