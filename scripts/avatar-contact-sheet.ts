/**
 * Folha de contatos do avatar — ferramenta de validação visual do pack gráfico.
 *
 * Rasteriza exatamente as camadas que o `PixelAvatar` desenha em SVG, incluindo
 * o contorno por dilatação de alpha (equivalente ao feMorphology) e o rim light
 * dourado. Cada célula é renderizada com supersampling e depois reduzida ao
 * tamanho real de exibição, então a amostra de 18px mostra o que o navegador
 * realmente vai exibir na lista de equipe.
 *
 * Uso: npx tsx scripts/avatar-contact-sheet.ts [saida.png]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import {
  AVATAR_PRESETS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, OUTFIT_STYLES, FACIAL_STYLES,
  GLASSES_STYLES, ACCESSORY_STYLES, EXPRESSION_STYLES, presetLook, DEFAULT_LOOK, lookFromId,
  type AvatarLook,
} from "../src/lib/avatar";
import { buildSprite, type Sprite } from "../src/lib/avatar-sprite";

const SUB = 8;                    // subpixels por unidade de sprite
const SPRITE_W = 32;
const SPRITE_H = 46;
const SW = SPRITE_W * SUB;        // 256
const SH = SPRITE_H * SUB;        // 368
const DISPLAY = SPRITE_W * 4;     // célula grande: 128px de largura
const DISPLAY_H = Math.round(DISPLAY * SH / SW);
const GUTTER = 12;
const COLS = 14;

type Cell = {
  look: AvatarLook; suit?: string; view?: "front" | "back"; sitting?: boolean;
  walking?: boolean; waving?: boolean; fine?: boolean; own?: boolean; admin?: boolean;
  /** Tamanho real de exibição em px (simula avatares pequenos). */
  size?: number; bg?: string; label?: string;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const v = hex.replace("#", "");
  const int = Number.parseInt(v.length === 3 ? v.split("").map(c => c + c).join("") : v.slice(0, 6), 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

class Sub {
  color = new Float32Array(SW * SH * 3);
  alpha = new Float32Array(SW * SH);
  mask = new Uint8Array(SW * SH);
  constructor(bg: [number, number, number]) {
    for (let i = 0; i < SW * SH; i += 1) {
      this.alpha[i] = 1;
      this.color[i * 3] = bg[0];
      this.color[i * 3 + 1] = bg[1];
      this.color[i * 3 + 2] = bg[2];
    }
  }
  rect(x: number, y: number, w: number, h: number, rgb: [number, number, number], a: number) {
    if (a <= 0) return;
    const x0 = Math.max(0, Math.round(x));
    const x1 = Math.min(SW, Math.round(x + w));
    const y0 = Math.max(0, Math.round(y));
    const y1 = Math.min(SH, Math.round(y + h));
    for (let py = y0; py < y1; py += 1) {
      for (let px = x0; px < x1; px += 1) {
        const i = py * SW + px;
        const oa = a + this.alpha[i] * (1 - a);
        for (let k = 0; k < 3; k += 1) {
          this.color[i * 3 + k] = oa > 0 ? (rgb[k] * a + this.color[i * 3 + k] * this.alpha[i] * (1 - a)) / oa : 0;
        }
        this.alpha[i] = oa;
      }
    }
  }
}

function paint(mask: Uint8Array, x: number, y: number, w: number, h: number) {
  const x0 = Math.max(0, Math.round(x));
  const x1 = Math.min(SW, Math.round(x + w));
  const y0 = Math.max(0, Math.round(y));
  const y1 = Math.min(SH, Math.round(y + h));
  for (let py = y0; py < y1; py += 1) mask.fill(1, py * SW + x0, py * SW + x1);
}

/** Dilatação separável (máximo) — mesmo efeito do feMorphology operator="dilate". */
function dilate(mask: Uint8Array, radius: number) {
  const tmp = new Uint8Array(SW * SH);
  for (let y = 0; y < SH; y += 1) {
    for (let x = 0; x < SW; x += 1) {
      let v = 0;
      for (let sx = Math.max(0, x - radius); sx <= Math.min(SW - 1, x + radius); sx += 1) if (mask[y * SW + sx]) { v = 1; break; }
      tmp[y * SW + x] = v;
    }
  }
  const out = new Uint8Array(SW * SH);
  for (let x = 0; x < SW; x += 1) {
    for (let y = 0; y < SH; y += 1) {
      let v = 0;
      for (let sy = Math.max(0, y - radius); sy <= Math.min(SH - 1, y + radius); sy += 1) if (tmp[sy * SW + x]) { v = 1; break; }
      out[y * SW + x] = v;
    }
  }
  return out;
}

function offset(mask: Uint8Array, dx: number, dy: number) {
  const out = new Uint8Array(SW * SH);
  for (let y = 0; y < SH; y += 1) {
    const sy = y - dy;
    if (sy < 0 || sy >= SH) continue;
    for (let x = 0; x < SW; x += 1) {
      const sx = x - dx;
      if (sx < 0 || sx >= SW) continue;
      out[y * SW + x] = mask[sy * SW + sx];
    }
  }
  return out;
}

/** Retorna a célula já no tamanho real de exibição (RGB por pixel). */
function renderCell(cell: Cell) {
  const sprite: Sprite = buildSprite({
    look: cell.look,
    view: cell.view ?? "front",
    sitting: cell.sitting ?? false,
    walking: cell.walking ?? false,
    waving: cell.waving ?? false,
    admin: cell.admin ?? false,
    fine: cell.fine ?? true,
    suit: cell.suit ?? "#c7a66e",
  });

  const flat: { x: number; y: number; w: number; h: number; rgb: [number, number, number]; a: number; r: number }[] = [];
  for (const name of Object.keys(sprite.layers) as (keyof Sprite["layers"])[]) {
    for (const rect of sprite.layers[name]) {
      flat.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, rgb: hexToRgb(rect.fill), a: rect.o ?? 1, r: rect.r ?? 0 });
    }
  }

  const target = cell.size ?? DISPLAY;
  const f = (SPRITE_W * SUB) / target;         // subpixels por pixel de saída
  const outW = Math.round((SPRITE_W * SUB) / f);
  const outH = Math.round((SPRITE_H * SUB) / f);
  const sub = new Sub(hexToRgb(cell.bg ?? "#151819"));

  // contorno: silhueta dilatada menos a própria silhueta
  const ink = new Uint8Array(SW * SH);
  for (const item of flat) if (item.a > 0.2) paint(ink, item.x * SUB, item.y * SUB, item.w * SUB, item.h * SUB);
  const thick = Math.max(1, Math.round(SUB * 0.55));
  const rim = dilate(ink, thick);
  sub.rect(0, 0, SW, SH, [10, 12, 14], 0); // no-op defensivo
  for (let i = 0; i < SW * SH; i += 1) if (rim[i] && !ink[i]) { sub.alpha[i] = 1; sub.color[i * 3] = 10; sub.color[i * 3 + 1] = 12; sub.color[i * 3 + 2] = 14; }
  if (cell.own) {
    const lit = dilate(offset(ink, -Math.round(SUB * 0.7), -Math.round(SUB * 0.9)), Math.round(SUB * 0.4));
    for (let i = 0; i < SW * SH; i += 1) if (lit[i] && !ink[i]) sub.rect(i % SW, Math.floor(i / SW), 1, 1, [240, 215, 160], 0.55);
  }

  for (const item of flat) {
    sub.rect(item.x * SUB, item.y * SUB, item.w * SUB, item.h * SUB, item.rgb, item.a);
  }

  // downsample por média de caixa
  const out = new Float32Array(outW * outH * 3);
  const span = Math.max(1, Math.round(f));
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = 0; sy < span; sy += 1) {
        const iy = Math.min(SH - 1, Math.round(y * f) + sy);
        for (let sx = 0; sx < span; sx += 1) {
          const ix = Math.min(SW - 1, Math.round(x * f) + sx);
          const i = (iy * SW + ix) * 3;
          r += sub.color[i]; g += sub.color[i + 1]; b += sub.color[i + 2]; n += 1;
        }
      }
      const o = (y * outW + x) * 3;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
    }
  }
  return { out, outW, outH, shadow: sprite.shadow };
}

function pngEncode(width: number, height: number, rgb: Float32Array) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y += 1) {
    raw[o++] = 0;
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      raw[o++] = Math.min(255, Math.round(rgb[i]));
      raw[o++] = Math.min(255, Math.round(rgb[i + 1]));
      raw[o++] = Math.min(255, Math.round(rgb[i + 2]));
    }
  }
  let table: number[] | null = null;
  const crc = (buf: Buffer) => {
    if (!table) {
      table = [];
      for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
      }
    }
    let crc = 0xffffffff;
    for (const byte of buf) crc = table![(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, payload: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(payload.length);
    const head = Buffer.concat([Buffer.from(type, "ascii"), payload]);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(head));
    return Buffer.concat([len, head, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------ cenas */

const rows: Cell[][] = [
  [
    ...AVATAR_PRESETS.map((preset, index) => ({ look: presetLook(preset.id), own: index === 0, admin: index === 5, label: preset.label })),
    { look: presetLook("gx-executivo"), size: 48, label: "mapa 48" },
    { look: presetLook("gx-estrategia"), size: 34, fine: false, label: "chat 34" },
    { look: presetLook("gx-tech"), size: 25, fine: false, label: "equipe 25" },
    { look: presetLook("gx-lounge"), size: 18, fine: false, label: "agenda 18" },
    { look: presetLook("gx-executivo"), view: "back", label: "costas" },
    { look: presetLook("gx-executivo"), sitting: true, label: "sentado" },
    { look: presetLook("gx-tech"), walking: true, label: "andando" },
    { look: presetLook("gx-lounge"), waving: true, label: "acenando" },
  ],
  [
    ...HAIR_STYLES.map(style => ({ look: { ...DEFAULT_LOOK, hair: style.id, facial: "none" as const }, label: style.label })),
    { look: { ...DEFAULT_LOOK, hair: "bald" as const, skin: 2 }, label: "careca" },
  ],
  [
    ...SKIN_TONES.map((tone, index) => ({ look: { ...DEFAULT_LOOK, skin: index, hair: "short" as const }, label: tone.name })),
    ...HAIR_COLORS.slice(0, 7).map(color => ({ look: { ...DEFAULT_LOOK, hairColor: color.value, hair: "curls" as const }, label: color.name })),
    { look: { ...DEFAULT_LOOK, hairColor: "#c7a66e", hair: "ponytail" as const }, label: "dourado GX" },
  ],
  [
    ...OUTFIT_STYLES.map(outfit => ({ look: { ...DEFAULT_LOOK, outfit: outfit.id, hair: "short" as const }, label: outfit.label })),
    ...FACIAL_STYLES.map(facial => ({ look: { ...DEFAULT_LOOK, facial: facial.id, hair: "short" as const }, label: facial.label })),
    ...GLASSES_STYLES.slice(0, 4).map(glasses => ({ look: { ...DEFAULT_LOOK, glasses: glasses.id, facial: "none" as const }, label: glasses.label })),
  ],
  [
    ...ACCESSORY_STYLES.map(accessory => ({ look: { ...DEFAULT_LOOK, accessory: accessory.id, hair: "short" as const }, label: accessory.label })),
    ...EXPRESSION_STYLES.map(expression => ({ look: { ...DEFAULT_LOOK, expression: expression.id, hair: "side" as const }, label: expression.label })),
    { look: { ...DEFAULT_LOOK, hair: "afro" as const, skin: 5, outfit: "hoodie" as const, accessory: "headset" as const }, label: "afro+fone" },
    { look: { ...DEFAULT_LOOK, hair: "bald" as const, skin: 3, facial: "full" as const, glasses: "gold" as const }, label: "careca+barba" },
    { look: { ...DEFAULT_LOOK, hair: "long" as const, outfit: "shirt" as const, expression: "joy" as const }, label: "longo+camisa" },
  ],
  [
    { look: DEFAULT_LOOK, label: "parado" },
    { look: DEFAULT_LOOK, sitting: true, label: "sentado" },
    { look: DEFAULT_LOOK, view: "back", sitting: true, label: "sentado costas" },
    { look: DEFAULT_LOOK, view: "back", label: "costas" },
    { look: DEFAULT_LOOK, view: "back", waving: true, label: "acena costas" },
    { look: DEFAULT_LOOK, waving: true, view: "back", admin: true, label: "admin costas" },
    { look: DEFAULT_LOOK, admin: true, label: "pino admin" },
    { look: DEFAULT_LOOK, own: true, label: "aura própria" },
    { look: DEFAULT_LOOK, suit: "#839c83", label: "sálvia" },
    { look: { ...DEFAULT_LOOK, outfit: "hoodie" }, suit: "#7295a1", label: "oceano hoodie" },
    { look: { ...DEFAULT_LOOK, outfit: "blazer" }, suit: "#b29bc3", label: "lilás blazer" },
    { look: { ...DEFAULT_LOOK, outfit: "shirt" }, suit: "#c4c9ca", label: "prata camisa" },
    { look: { ...DEFAULT_LOOK, outfit: "tee" }, suit: "#c58b77", label: "terracota tee" },
    { look: { ...DEFAULT_LOOK, hair: "side", accessory: "badge" }, suit: "#c7a66e", label: "crachá" },
  ],
  Array.from({ length: COLS }, (_, i) => ({ look: lookFromId(`membro-${i + 1}`), label: `hash ${i + 1}` })),
];

/* ------------------------------------------------------------ saída */

const target = process.argv[2] ?? "/home/user/.avatar-qa/sheet.png";
const totalWidth = COLS * (DISPLAY + GUTTER) + GUTTER;
const totalHeight = rows.length * (DISPLAY_H + GUTTER) + GUTTER;
const sheet = new Float32Array(totalWidth * totalHeight * 3);
for (let i = 0; i < totalWidth * totalHeight; i += 1) { sheet[i * 3] = 26; sheet[i * 3 + 1] = 29; sheet[i * 3 + 2] = 30; }

const started = Date.now();
rows.forEach((row, rowIndex) => {
  row.slice(0, COLS).forEach((cell, colIndex) => {
    const { out, outW, outH } = renderCell(cell);
    // nearest-neighbor até DISPLAY para manter a grade legível
    const zoomX = DISPLAY / outW;
    const zoomY = DISPLAY_H / outH;
    for (let y = 0; y < DISPLAY_H; y += 1) {
      const sy = Math.min(outH - 1, Math.floor(y / zoomY));
      for (let x = 0; x < DISPLAY; x += 1) {
        const sx = Math.min(outW - 1, Math.floor(x / zoomX));
        const s = (sy * outW + sx) * 3;
        const d = ((GUTTER + rowIndex * (DISPLAY_H + GUTTER) + y) * totalWidth + GUTTER + colIndex * (DISPLAY + GUTTER) + x) * 3;
        sheet[d] = out[s]; sheet[d + 1] = out[s + 1]; sheet[d + 2] = out[s + 2];
      }
    }
  });
  console.log(`linha ${rowIndex + 1}/${rows.length} renderizada (${Math.round((Date.now() - started) / 100) / 10}s)`);
});

mkdirSync(target.slice(0, target.lastIndexOf("/")), { recursive: true });
writeFileSync(target, pngEncode(totalWidth, totalHeight, sheet));
console.log(`ok: ${target} ${totalWidth}x${totalHeight} em ${Date.now() - started}ms`);
