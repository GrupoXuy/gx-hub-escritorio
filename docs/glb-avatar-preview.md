# GLB avatar preview — GX Hub Office Meet

## Purpose

This branch adds an experimental path to render the supplied Maya GLB with Google's `model-viewer` WebGL renderer. It is deliberately opt-in; the current procedural avatar remains the default and is retained as a fallback.

## Enable for an internal preview

Set these Vercel Preview environment variables only:

- `NEXT_PUBLIC_GX_AVATAR_GLB_ENABLED=true`
- Optional: `NEXT_PUBLIC_GX_AVATAR_3D_MODEL_URL` to override the current hosted GLB URL.

Redeploy the Preview deployment after changing environment variables. Do not enable in Production until the model's orientation, scale, lighting, and browser loading behavior have been manually checked.

## Current limits

- This model currently has the `Idle_Standing` animation only. The real GLB overlay is limited to idle, front-facing states without a raised hand. Walking, sitting, waving, and back-facing states continue to use the existing procedural avatar rather than claiming unsupported animation clips.
- The model is hosted at a public static asset URL for this prototype; move it to a project-controlled asset location before broad production rollout.
- The overlay is a single-avatar proof of concept. Do not assume it is optimized for 8–20 simultaneous GLB instances. A shared Three.js renderer or another shared-canvas architecture should precede broad-room enablement.
- The Google-hosted `model-viewer` script and GLB asset both require network access. If either fails, the procedural avatar remains visible.
- `prefers-reduced-motion` disables autoplay.

## Validation checklist

- [ ] Preview build passes CI, lint, and TypeScript checks.
- [ ] GLB visibly loads in a real browser and the model is correctly framed.
- [ ] Failed script load, failed model load, and WebGL failure preserve the procedural avatar.
- [ ] Reduced motion, mobile sizing, and route changes are checked.
- [ ] Performance is measured with one avatar before any multi-avatar rollout.
- [ ] Existing room movement, profile state, mic/camera controls, and WebRTC are regression-tested.
- [ ] GX Radar remains out of Office Meet.
