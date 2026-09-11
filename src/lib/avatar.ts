/**
 * Identidade visual do avatar do GX Hub.
 *
 * Módulo puro (sem React) que define o "look" de cada pessoa: tom de pele,
 * penteado, cor do cabelo, barba, óculos, roupa, acessório, expressão e aura.
 * O mesmo módulo é usado pelo sprite SVG, pelo estúdio de personalização e
 * pela validação no servidor, garantindo que todos falem a mesma linguagem.
 */

export type HairStyle =
  | "side" | "short" | "buzz" | "curls" | "afro" | "bob" | "waves" | "long"
  | "ponytail" | "bun" | "pixie" | "mohawk" | "bald";
export type FacialHair = "none" | "stubble" | "mustache" | "goatee" | "full";
export type GlassesStyle = "none" | "gold" | "round" | "dark" | "screen";
export type Outfit = "suit" | "blazer" | "shirt" | "hoodie" | "tee";
export type Accessory = "none" | "headset" | "cap" | "earrings" | "badge";
export type Expression = "calm" | "smile" | "focus" | "joy";

export type AvatarLook = {
  skin: number;
  hair: HairStyle;
  hairColor: string;
  facial: FacialHair;
  glasses: GlassesStyle;
  outfit: Outfit;
  accessory: Accessory;
  expression: Expression;
  aura: boolean;
};

/* ---------------------------------------------------------------- paletas */

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map(c => c + c).join("") : value;
  const int = Number.parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(int)) return [128, 128, 128];
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function rgbToHex(r: number, g: number, b: number) {
  const to = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Mistura uma cor com outra, útil para gerar sombras sem duplicar paletas. */
export function mix(from: string, to: string, amount: number) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const t = clamp(amount, 0, 1);
  return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

/** Escurece uma cor (`0..1`). */
export const shade = (hex: string, amount: number) => mix(hex, "#05070a", amount);
/** Clareia uma cor (`0..1`). */
export const tint = (hex: string, amount: number) => mix(hex, "#ffffff", amount);
/** Aplica a cor sobre um fundo escuro com transparência, devolvendo hex sólido. */
export const onDark = (hex: string, alpha: number, backdrop = "#1a1c1d") => mix(backdrop, hex, alpha);

export const SKIN_TONES = [
  { name: "Marfim", base: "#f4d5bd" },
  { name: "Clara", base: "#e8bc94" },
  { name: "Morena leve", base: "#dda888" },
  { name: "Morena", base: "#c18a5f" },
  { name: "Parda", base: "#9b6440" },
  { name: "Negra", base: "#6f4530" },
] as const;

export type SkinTone = { name: string; base: string; mid: string; dark: string; light: string; blush: string; lip: string };

export function skinPalette(index: number): SkinTone {
  const tone = SKIN_TONES[Math.abs(index) % SKIN_TONES.length] ?? SKIN_TONES[1];
  return {
    name: tone.name,
    base: tone.base,
    light: tint(tone.base, 0.3),
    mid: shade(tone.base, 0.12),
    dark: shade(tone.base, 0.32),
    blush: mix(tone.base, "#d9615a", 0.42),
    lip: mix(tone.base, "#8e3f37", 0.55),
  };
}

export const HAIR_COLORS = [
  { value: "#1b1613", name: "Preto azulado" },
  { value: "#33231b", name: "Castanho escuro" },
  { value: "#5a3a26", name: "Castanho" },
  { value: "#8a5a34", name: "Mel" },
  { value: "#c39a5f", name: "Loiro escuro" },
  { value: "#e2cfa4", name: "Platinado" },
  { value: "#9a3f22", name: "Ruivo" },
  { value: "#2c3134", name: "Grafite" },
  { value: "#a9adb0", name: "Prata" },
  { value: "#c7a66e", name: "Dourado GX" },
] as const;

export const HAIR_STYLES: { id: HairStyle; label: string; length: "none" | "short" | "mid" | "long" }[] = [
  { id: "side", label: "Social riscado", length: "short" },
  { id: "short", label: "Curto", length: "short" },
  { id: "buzz", label: "Raspado", length: "none" },
  { id: "curls", label: "Cacheado", length: "short" },
  { id: "afro", label: "Black power", length: "mid" },
  { id: "bun", label: "Coque", length: "short" },
  { id: "pixie", label: "Pixie", length: "short" },
  { id: "bob", label: "Chanel", length: "mid" },
  { id: "waves", label: "Ondulado", length: "mid" },
  { id: "ponytail", label: "Rabo de cavalo", length: "mid" },
  { id: "long", label: "Longo solto", length: "long" },
  { id: "mohawk", label: "Moicano", length: "short" },
  { id: "bald", label: "Careca", length: "none" },
];

export const FACIAL_STYLES: { id: FacialHair; label: string }[] = [
  { id: "none", label: "Sem barba" },
  { id: "stubble", label: "Por fazer" },
  { id: "mustache", label: "Bigode" },
  { id: "goatee", label: "Cavanhaque" },
  { id: "full", label: "Barba cheia" },
];

export const GLASSES_STYLES: { id: GlassesStyle; label: string }[] = [
  { id: "none", label: "Nenhum" },
  { id: "gold", label: "Armação dourada" },
  { id: "round", label: "Redondo vintage" },
  { id: "dark", label: "Óculos de sol" },
  { id: "screen", label: "Filtro azul" },
];

export const OUTFIT_STYLES: { id: Outfit; label: string; hint: string }[] = [
  { id: "suit", label: "Terno executivo", hint: "Paletó, camisa e gravata com nó dourado" },
  { id: "blazer", label: "Blazer aberto", hint: "Camisa clara com lenço no bolso" },
  { id: "shirt", label: "Camisa social", hint: "Mangas dobradas e gravata na sua cor" },
  { id: "hoodie", label: "Moletom", hint: "Capuz, bolso canguru e tênis branco" },
  { id: "tee", label: "Camiseta GX", hint: "Estampa dourada, jeans e tênis" },
];

export const ACCESSORY_STYLES: { id: Accessory; label: string }[] = [
  { id: "none", label: "Nenhum" },
  { id: "headset", label: "Fone de trabalho" },
  { id: "cap", label: "Boné" },
  { id: "earrings", label: "Brinco dourado" },
  { id: "badge", label: "Crachá GX" },
];

export const EXPRESSION_STYLES: { id: Expression; label: string }[] = [
  { id: "calm", label: "Sereno" },
  { id: "smile", label: "Sorrindo" },
  { id: "focus", label: "Focado" },
  { id: "joy", label: "Animado" },
];

export const GOLD = "#c7a66e";
export const GOLD_LIGHT = "#f0d7a0";

/* ------------------------------------------------------------- catálogo */

const IN = <T extends string>(list: readonly { id: T }[], value: unknown, fallback: T): T =>
  list.some(item => item.id === value) ? (value as T) : fallback;

const COLOR = /^#[0-9a-f]{6}$/i;

export const DEFAULT_LOOK: AvatarLook = {
  skin: 1,
  hair: "side",
  hairColor: "#33231b",
  facial: "none",
  glasses: "none",
  outfit: "suit",
  accessory: "none",
  expression: "smile",
  aura: false,
};

export function defaultLookFor(gender?: string | null): AvatarLook {
  if (gender === "female") return { ...DEFAULT_LOOK, hair: "waves", outfit: "blazer", expression: "smile", skin: 1 };
  return { ...DEFAULT_LOOK };
}

export function hashId(id?: string | null) {
  if (!id) return 0;
  let sum = 0;
  for (const char of id) sum = (sum * 31 + char.charCodeAt(0)) % 100003;
  return sum;
}

/**
 * Gera um visual determinístico a partir do id. Assim, quem nunca abriu o
 * estúdio não aparece com o "clone" padrão: cada pessoa já chega com cara própria.
 */
export function lookFromId(id?: string | null): AvatarLook {
  const h = hashId(id);
  const pick = <T>(list: readonly T[], offset: number) => list[(h + offset * 7) % list.length];
  const hair = pick(HAIR_STYLES, 3);
  const facial = pick(FACIAL_STYLES, 5);
  return {
    skin: h % SKIN_TONES.length,
    hair: hair.id,
    hairColor: (pick(HAIR_COLORS, 2) as { value: string }).value,
    facial: hair.length === "long" || hair.id === "bald" ? "none" : facial.id,
    glasses: pick(GLASSES_STYLES, 4).id,
    outfit: pick(OUTFIT_STYLES, 1).id,
    accessory: pick(ACCESSORY_STYLES, 6).id,
    expression: pick(EXPRESSION_STYLES, 2).id,
    aura: h % 11 === 0,
  };
}

/** Visual aleatório para o botão "Surpreenda-me". */
export function randomLook(seed = Math.floor(Math.random() * 100000)): AvatarLook {
  return lookFromId(`roll-${seed}`);
}

/** Normaliza qualquer entrada (client ou server) em um look válido. */
export function sanitizeLook(input: unknown): AvatarLook {
  const source = typeof input === "string" ? safeParse(input) : input;
  if (!source || typeof source !== "object") return { ...DEFAULT_LOOK };
  const raw = source as Record<string, unknown>;
  const skin = typeof raw.skin === "number" && Number.isFinite(raw.skin) ? Math.abs(Math.trunc(raw.skin)) % SKIN_TONES.length : DEFAULT_LOOK.skin;
  return {
    skin,
    hair: IN(HAIR_STYLES, raw.hair, DEFAULT_LOOK.hair),
    hairColor: typeof raw.hairColor === "string" && COLOR.test(raw.hairColor) ? raw.hairColor.toLowerCase() : DEFAULT_LOOK.hairColor,
    facial: IN(FACIAL_STYLES, raw.facial, DEFAULT_LOOK.facial),
    glasses: IN(GLASSES_STYLES, raw.glasses, DEFAULT_LOOK.glasses),
    outfit: IN(OUTFIT_STYLES, raw.outfit, DEFAULT_LOOK.outfit),
    accessory: IN(ACCESSORY_STYLES, raw.accessory, DEFAULT_LOOK.accessory),
    expression: IN(EXPRESSION_STYLES, raw.expression, DEFAULT_LOOK.expression),
    aura: raw.aura === true,
  };
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Lê o texto salvo no banco; sem registro, usa o visual determinístico do id. */
export function parseLook(raw: string | null | undefined, seedId?: string | null): AvatarLook {
  if (!raw) return seedId ? lookFromId(seedId) : { ...DEFAULT_LOOK };
  const parsed = safeParse(raw);
  if (!parsed || typeof parsed !== "object") return seedId ? lookFromId(seedId) : { ...DEFAULT_LOOK };
  return sanitizeLook(parsed);
}

/** Formato compacto guardado em `gx_users.avatar_look`. */
export function serializeLook(look: Partial<AvatarLook>): string {
  return JSON.stringify(sanitizeLook(look));
}

export function lookKey(look: AvatarLook) {
  return `${look.skin}|${look.hair}|${look.hairColor}|${look.facial}|${look.glasses}|${look.outfit}|${look.accessory}|${look.expression}|${look.aura ? 1 : 0}`;
}

/** Combina parciais sobre um look base. */
export function withLook(base: AvatarLook, patch: Partial<AvatarLook>): AvatarLook {
  return sanitizeLook({ ...base, ...patch });
}

/* ------------------------------------------------------------- presets */

export type AvatarPreset = { id: string; label: string; hint: string; look: Partial<AvatarLook> };

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "gx-executivo", label: "Executivo GX", hint: "Terno dourado, riscado lateral", look: { hair: "side", hairColor: "#33231b", facial: "none", glasses: "none", outfit: "suit", accessory: "badge", expression: "calm", aura: false } },
  { id: "gx-estrategia", label: "Mesa de estratégia", hint: "Blazer, óculos dourado, crachá", look: { hair: "bob", hairColor: "#1b1613", facial: "none", glasses: "gold", outfit: "blazer", accessory: "badge", expression: "focus" } },
  { id: "gx-tech", label: "Tech & atendimento", hint: "Moletom, fone e cabelo preso", look: { hair: "ponytail", hairColor: "#5a3a26", facial: "none", glasses: "screen", outfit: "hoodie", accessory: "headset", expression: "smile" } },
  { id: "gx-lounge", label: "Lounge & café", hint: "Camiseta GX, boné, tranquilo", look: { hair: "curls", hairColor: "#8a5a34", facial: "stubble", glasses: "none", outfit: "tee", accessory: "cap", expression: "joy" } },
  { id: "gx-recepcao", label: "Recepção", hint: "Camisa social e brinco dourado", look: { hair: "long", hairColor: "#c39a5f", facial: "none", glasses: "none", outfit: "shirt", accessory: "earrings", expression: "smile" } },
  { id: "gx-autoridade", label: "Diretoria", hint: "Terno, barba cheia e aura dourada", look: { hair: "short", hairColor: "#2c3134", facial: "full", glasses: "round", outfit: "suit", accessory: "none", expression: "focus", aura: true } },
];

export function presetLook(id: string, base: AvatarLook = DEFAULT_LOOK): AvatarLook {
  const preset = AVATAR_PRESETS.find(item => item.id === id);
  return preset ? withLook(base, preset.look) : { ...base };
}
