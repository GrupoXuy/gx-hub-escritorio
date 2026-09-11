/**
 * Gerador do sprite pixel-art do avatar do GX Hub.
 *
 * Geometria declarativa: camadas de retículos em unidades de 1px sobre um
 * viewBox 32x46. O componente `PixelAvatar` apenas empilha essas camadas em <g>
 * animados, e `scripts/avatar-contact-sheet.ts` rasteriza as mesmas camadas para
 * validar o desenho — arte e código nunca divergem.
 */
import { skinPalette, shade, tint, mix, GOLD, GOLD_LIGHT, type AvatarLook, type Expression, type FacialHair, type GlassesStyle, type HairStyle, type Outfit, type Accessory } from "./avatar";

export type Pixel = { x: number; y: number; w: number; h: number; fill: string; o?: number; r?: number };
/**
 * Ordem de empilhamento (de baixo para cima). `back` recebe o que cai atrás do
 * busto; `headTop` é desenhado depois da pele, então o cabelo de costas vive lá.
 */
export type LayerName = "back" | "legsBack" | "legsFront" | "body" | "arms" | "waveArm" | "headBase" | "eyes" | "headTop";
export const LAYER_NAMES: LayerName[] = ["back", "legsBack", "legsFront", "body", "arms", "waveArm", "headBase", "eyes", "headTop"];
export const SPRITE_W = 32;
export const SPRITE_H = 46;

export type SpriteInput = {
  look: AvatarLook;
  view: "front" | "back";
  sitting: boolean;
  walking: boolean;
  waving: boolean;
  admin: boolean;
  /** Liga microdetalhes (nariz, costuras, brilhos). Desligado em tamanhos pequenos. */
  fine: boolean;
  suit: string;
  /** Desloca as pupilas em direção aonde a pessoa olha (-0.5 / 0 / 0.5 em unidades de sprite). */
  pupilShift?: number;
};

export type Sprite = { layers: Record<LayerName, Pixel[]>; shadow: { cx: number; cy: number; rx: number; ry: number } };

/** Proporções canônicas do avatar — tudo deriva daqui. */
const P = {
  headL: 10, headR: 22, headT: 5, headB: 15,
  jawT: 15, jawB: 16.4, jawL: 11, jawR: 21,
  earT: 9, earB: 12.6,
  neckL: 14, neckR: 18, neckBelow: 18.4,
  shoulderT: 16.6, shoulderB: 19, shoulderL: 6, shoulderR: 26,
  torsoT: 19, torsoB: 28, torsoL: 7, torsoR: 25,
  hipT: 27.6, hipB: 29.2,
  armT: 17.4, armW: 3, armL: 3.4, armR: 25.6, handT: 27, handB: 30.4,
  legT: 29, legB: 38.4, legL: 10.2, legMidL: 14.6, legMidR: 17.4, legR: 21.8,
  shoeT: 38.2, shoeB: 40.6,
  browT: 8.2, eyeT: 9.8, noseT: 12.4, mouthT: 13.2,
};

class Sheet {
  layers: Record<LayerName, Pixel[]> = { back: [], legsBack: [], legsFront: [], body: [], arms: [], waveArm: [], headBase: [], eyes: [], headTop: [] };
  push(layer: LayerName, x: number, y: number, w: number, h: number, fill: string, o?: number, r?: number) {
    if (!(w > 0) || !(h > 0)) return;
    this.layers[layer].push({ x: Math.round(x * 20) / 20, y: Math.round(y * 20) / 20, w, h, fill, o, r });
  }
}

type Ctx = {
  look: AvatarLook; view: "front" | "back"; sitting: boolean; walking: boolean; waving: boolean;
  admin: boolean; fine: boolean;
  skin: ReturnType<typeof skinPalette>;
  hair: string; hairLight: string; hairDark: string;
  suit: string; suitLight: string; suitDark: string; suitEdge: string;
  cloth: string; clothDark: string;
  trouser: string; trouserDark: string; trouserLight: string;
  shoe: string; shoeDark: string;
  tieColor: string; casual: boolean;
  /** Para onde as pupilas apontam, em unidades de sprite (-0.7..0.7). */
  pupilShift: number;
  /** Deslocamento vertical ao sentar: a cabeça afunda mais que o busto. */
  bodyY: number; headY: number;
};

function createContext(input: SpriteInput): Ctx {
  const skin = skinPalette(input.look.skin);
  const hair = input.look.hairColor;
  const casual = input.look.outfit === "hoodie" || input.look.outfit === "tee";
  const suit = input.suit || GOLD;
  return {
    look: input.look,
    view: input.view,
    sitting: input.sitting,
    walking: input.walking,
    waving: input.waving,
    admin: input.admin,
    fine: input.fine,
    skin,
    hair,
    hairLight: tint(hair, 0.28),
    hairDark: shade(hair, 0.36),
    suit,
    suitLight: tint(suit, 0.22),
    suitDark: shade(suit, 0.3),
    suitEdge: shade(suit, 0.46),
    cloth: "#f8f5ee",
    clothDark: "#d5d0c1",
    trouser: input.look.outfit === "hoodie" ? shade(suit, 0.44) : input.look.outfit === "tee" ? "#3a465c" : "#2c333a",
    trouserDark: input.look.outfit === "hoodie" ? shade(suit, 0.62) : input.look.outfit === "tee" ? "#242d3e" : "#1b2027",
    trouserLight: input.look.outfit === "hoodie" ? shade(suit, 0.18) : input.look.outfit === "tee" ? "#4d5f7c" : "#3c454f",
    shoe: casual ? "#eceadf" : "#15181d",
    shoeDark: casual ? "#b4b1a6" : "#0a0c10",
    tieColor: input.look.outfit === "shirt" ? suit : "#1b1e24",
    pupilShift: Number.isFinite(input.pupilShift ?? 0) ? Math.max(-0.7, Math.min(0.7, input.pupilShift ?? 0)) : 0,
    casual,
    bodyY: input.sitting ? 1 : 0,
    headY: input.sitting ? 2 : 0,
  };
}

const hairLength = (style: HairStyle): "none" | "short" | "mid" | "long" => {
  if (style === "long") return "long";
  if (style === "bob" || style === "waves" || style === "afro" || style === "ponytail") return "mid";
  if (style === "bald" || style === "buzz") return "none";
  return "short";
};

/* ------------------------------------------------------------ cabelo */

/** Massa capilar. De costas ela cobre o crânio (camada acima da pele). */
function drawHairMass(sheet: Sheet, c: Ctx) {
  const style = c.look.hair;
  const top = P.headT + c.headY;
  const layer: LayerName = "headTop";
  if (style === "bald") {
    if (c.view !== "back") sheet.push(layer, P.headL, top, P.headR - P.headL, 2, c.skin.light, 0.26);
    if (c.view !== "back") sheet.push(layer, P.headL + 1, top + 1, P.headR - P.headL - 2, 1, c.skin.dark, 0.22);
    return;
  }
  if (style === "buzz") {
    if (c.view !== "back") {
      sheet.push(layer, P.headL - 0.4, top - 0.8, 12.8, 3, c.hair, 0.8);
      sheet.push(layer, P.headL - 0.4, top + 1.6, 12.8, 0.8, c.hair, 0.42);
      sheet.push(layer, P.headL + 1.4, top - 0.8, 9, 1, c.hairLight, 0.22);
    }
    return;
  }
  if (c.view === "back") {
    const height = hairLength(style) === "short" ? 11 : 11;
    sheet.push("headTop", P.headL - 1, top - 1.4, 14, height, c.hair);
    sheet.push("headTop", P.headL - 1, top - 1.4, 14, 2.2, c.hairLight, 0.3);
    sheet.push("headTop", P.headL - 1, top + height - 2.4, 14, 2, c.hairDark, 0.45);
    if (style === "mohawk") {
      sheet.push("headTop", P.headL - 1, top - 1.4, 14, 10, c.skin.mid, 0.42);
      sheet.push("headTop", 13.6, top - 5.4, 4.8, 13, c.hair);
      sheet.push("headTop", 14, top - 5.4, 4, 2, c.hairLight, 0.35);
    }
    return;
  }
  // frente: a massa é desenhada por drawHairFront
}

/** O que cai sobre os ombros e atrás do busto. */
function drawHairDrop(sheet: Sheet, c: Ctx) {
  const style = c.look.hair;
  if (style === "bald" || style === "buzz") return;
  const length = hairLength(style);
  const top = P.headT + c.headY;
  if (c.view === "back") {
    if (length === "mid") sheet.push("body", P.headL - 1, top + 9, 14, 6, c.hair);
    if (length === "long") {
      sheet.push("body", P.headL - 2, top + 9, 16, 14, c.hair);
      sheet.push("body", P.headL - 1, top + 12, 3, 10, c.hairDark, 0.32);
      sheet.push("body", P.headR - 1, top + 12, 3, 10, c.hairDark, 0.32);
      sheet.push("body", P.headL - 2, top + 21, 16, 2, c.hairLight, 0.16);
    }
    if (style === "afro") sheet.push("headTop", P.headL - 4, top - 4.4, 22, 9, c.hair);
    if (style === "ponytail") {
      sheet.push("headTop", 13.6, top + 7.6, 4.8, 12, c.hair);
      sheet.push("headTop", 13.2, top + 7.6, 5.6, 1.6, GOLD, 0.9);
    }
    if (style === "bun") {
      sheet.push("headTop", 13, top - 4.6, 6, 5, c.hair, 1, 2);
      sheet.push("headTop", 13.6, top - 4, 4.8, 1.2, c.hairLight, 0.35, 1);
    }
    if (c.look.accessory === "headset") {
      sheet.push("headTop", 8, top + 2.6, 2, 5.4, "#23282e");
      sheet.push("headTop", 22, top + 2.6, 2, 5.4, "#23282e");
      sheet.push("headTop", 8, top + 4, 2, 1, GOLD, 0.7);
    }
    return;
  }
  // frente: as mechas caem junto ao rosto, por cima dos ombros (sem virar capa)
  if (length === "mid" || length === "long") {
    const bottom = length === "long" ? top + 21 : top + 13;
    sheet.push("headTop", 7, top + 2.2, 3, bottom - top - 2, c.hair);
    sheet.push("headTop", 22, top + 2.2, 3, bottom - top - 2, c.hair);
    sheet.push("headTop", 7.4, bottom - 2.4, 2.2, 2.4, c.hair);
    sheet.push("headTop", 22.4, bottom - 2.4, 2.2, 2.4, c.hair);
    sheet.push("headTop", 7.4, top + 3.4, 1, bottom - top - 6, c.hairLight, 0.22);
    sheet.push("headTop", 23.6, top + 4.4, 0.8, bottom - top - 8, c.hairDark, 0.3);
  }
  if (style === "ponytail") {
    sheet.push("headTop", 22.6, top + 2.6, 3.2, 3, c.hair);
    sheet.push("headTop", 24, top + 5, 2.6, 8, c.hair);
    sheet.push("headTop", 23.4, top + 2.4, 2.4, 1.4, GOLD, 0.85);
  }
  if (style === "afro") sheet.push("back", P.headL - 4, top - 4, 22, 11, c.hair);
}

/** Fronte do cabelo: franja, laterais e volume, por cima do rosto. */
function drawHairFront(sheet: Sheet, c: Ctx) {
  if (c.view === "back") return;
  const style = c.look.hair;
  const top = P.headT + c.headY;
  const left = P.headL;
  const width = P.headR - P.headL;
  const capTop = top - 2.2;
  const cap = (height = 3.4, extra = 0) => {
    sheet.push("headTop", left - 1 - extra, capTop + 2, width + 2 + extra * 2, height, c.hair);
    sheet.push("headTop", left - extra, capTop, width + extra * 2, 2.4, c.hair);
    sheet.push("headTop", left + 1, capTop, width - 3, 1, c.hairLight, 0.45);
  };
  const capForCap = c.look.accessory === "cap";
  if (capForCap) {
    // sob boné fica apenas a nuca e as costeletas
    sheet.push("headTop", left - 1, top + 1.4, 1.6, 3.4, c.hair);
    sheet.push("headTop", P.headR - 0.6, top + 1.4, 1.6, 3.4, c.hair);
    sheet.push("headTop", left, top + 8.6, width, 1.4, c.hair, 0.8);
    return;
  }
  switch (style) {
    case "side": {
      cap();
      sheet.push("headTop", left + 6, top - 1.4, 1, 3.4, c.hairDark, 0.7);
      sheet.push("headTop", left + 7, top - 0.4, 7.4, 2.4, c.hair);
      sheet.push("headTop", left - 1.4, top - 0.4, 4.4, 4.4, c.hair);
      break;
    }
    case "short": {
      sheet.push("headTop", left - 0.8, capTop + 2, width + 1.6, 2.4, c.hair);
      sheet.push("headTop", left, capTop + 0.8, width, 1.8, c.hair);
      sheet.push("headTop", left + 1, capTop + 0.8, width - 3, 0.9, c.hairLight, 0.42);
      sheet.push("headTop", left, top + 1.2, width, 0.8, c.hair);
      break;
    }
    case "curls": {
      for (let i = 0; i < 6; i += 1) {
        const cx = left - 1.6 + i * 2.8;
        sheet.push("headTop", cx, capTop + (i % 2 ? -0.6 : 0.2), 4, 3.6, c.hair, 1, 1.9);
      }
      sheet.push("headTop", left - 1, top - 0.8, width + 2, 2.2, c.hair);
      sheet.push("headTop", left + 0.6, capTop - 0.2, 4, 1.4, c.hairLight, 0.3, 1);
      break;
    }
    case "afro": {
      for (let i = 0; i < 7; i += 1) {
        const cx = left - 4.6 + i * 3.2;
        sheet.push("headTop", cx, capTop - 2 + (i < 1 || i > 5 ? 3 : 0), 5, 5, c.hair, 1, 2.5);
      }
      sheet.push("headTop", left - 3, top - 1.6, width + 6, 3.4, c.hair);
      sheet.push("headTop", left - 1, capTop - 1.6, 6, 1.8, c.hairLight, 0.3, 1);
      break;
    }
    case "bob": {
      cap(3);
      sheet.push("headTop", left - 1.6, top - 0.6, 3.2, 8.6, c.hair);
      sheet.push("headTop", P.headR - 1.6, top - 0.6, 3.2, 8.6, c.hair);
      sheet.push("headTop", left - 1.6, top + 7.4, 3.2, 0.9, c.hairDark, 0.55);
      sheet.push("headTop", P.headR - 1.6, top + 7.4, 3.2, 0.9, c.hairDark, 0.55);
      break;
    }
    case "waves": {
      cap(3);
      sheet.push("headTop", left - 1.6, top - 0.6, 3.2, 10.4, c.hair);
      sheet.push("headTop", P.headR - 1.6, top - 0.6, 3.2, 10.4, c.hair);
      for (let i = 0; i < 4; i += 1) {
        sheet.push("headTop", left - 1.6, top + 1 + i * 2.4, 1.8, 0.9, c.hairDark, 0.42);
        sheet.push("headTop", P.headR - 0.2, top + 2 + i * 2.4, 1.8, 0.9, c.hairDark, 0.42);
      }
      break;
    }
    case "long": {
      cap(3);
      sheet.push("headTop", left - 1.6, top - 0.6, 3.4, 5, c.hair);
      sheet.push("headTop", P.headR - 1.8, top - 0.6, 3.4, 5, c.hair);
      break;
    }
    case "ponytail": {
      cap(3);
      sheet.push("headTop", left, top + 1.4, width, 1, c.hair);
      sheet.push("headTop", left + 1, top + 1.4, 4, 1.4, c.hairDark, 0.45);
      break;
    }
    case "bun": {
      cap(2.8);
      break;
    }
    case "pixie": {
      sheet.push("headTop", left - 1, capTop + 2, width - 1, 2.6, c.hair);
      sheet.push("headTop", left, capTop + 0.6, width - 2, 2, c.hair);
      sheet.push("headTop", left + 0.4, top + 0.4, 5.4, 1.4, c.hair);
      sheet.push("headTop", P.headR - 1.4, capTop + 2, 2.8, 6.4, c.hair);
      sheet.push("headTop", P.headR - 0.4, capTop + 6.4, 2, 2.4, c.hair);
      break;
    }
    case "mohawk": {
      sheet.push("headTop", 13.4, capTop - 3.4, 5.2, 8.4, c.hair);
      sheet.push("headTop", 14, capTop - 3.4, 4, 2, c.hairLight, 0.4);
      sheet.push("headTop", left, top + 0.4, width, 1, c.hairDark, 0.3);
      break;
    }
    case "buzz":
      break;
    default:
      cap();
  }
  if (style === "bun") {
    sheet.push("headTop", 13, capTop - 3.4, 6, 4.4, c.hair, 1, 2);
    sheet.push("headTop", 13.6, capTop - 3, 4.8, 1.2, c.hairLight, 0.35, 1);
    sheet.push("headTop", 12.4, capTop + 0.2, 7.2, 1, c.suitEdge, 0.55);
  }
  if (c.fine && style !== "mohawk" && style !== "buzz") {
    // sombra da franja sobre a testa, bem sutil para não sujar o rosto
    sheet.push("headTop", left + 0.6, top + 2.2, width - 1.2, 0.5, "#000000", 0.1);
  }
}

/* ------------------------------------------------------------ rosto */

function drawFace(sheet: Sheet, c: Ctx) {
  const top = P.headT + c.headY;
  const left = P.headL;
  const browY = top + (P.browT - P.headT) + 0.4;
  const eyeY = top + (P.eyeT - P.headT) + 0.6;
  const expression: Expression = c.look.expression;
  const focused = expression === "focus";
  const eyeW = 3.2;
  const eyeL = left + 0.9;
  const eyeR = P.headR - 0.9 - eyeW;
  sheet.push("headBase", eyeL + 0.2, browY - (focused ? 0.6 : 0), 2.8, 0.9, c.hairDark);
  sheet.push("headBase", eyeR + 0.2, browY - (focused ? 0.6 : 0), 2.8, 0.9, c.hairDark);
  if (focused) {
    sheet.push("headBase", eyeL, browY + 0.5, 1, 0.9, c.hairDark, 0.8);
    sheet.push("headBase", eyeR + 2.4, browY + 0.5, 1, 0.9, c.hairDark, 0.8);
  }
  if (expression === "joy") {
    sheet.push("eyes", eyeL + 0.2, eyeY + 0.4, 2.8, 1, "#241f1d");
    sheet.push("eyes", eyeR + 0.2, eyeY + 0.4, 2.8, 1, "#241f1d");
    sheet.push("eyes", eyeL, eyeY + 1.4, 1.2, 0.9, "#241f1d", 0.5);
    sheet.push("eyes", eyeR + 2, eyeY + 1.4, 1.2, 0.9, "#241f1d", 0.5);
  } else {
    sheet.push("eyes", eyeL, eyeY, eyeW, 2.4, "#f8f5ef");
    sheet.push("eyes", eyeR, eyeY, eyeW, 2.4, "#f8f5ef");
    const px = c.pupilShift;
    sheet.push("eyes", eyeL + 0.7 + px, eyeY + 0.5, 1.8, 1.8, "#241f1d");
    sheet.push("eyes", eyeR + 0.7 + px, eyeY + 0.5, 1.8, 1.8, "#241f1d");
    sheet.push("eyes", eyeL + 0.7 + px, eyeY + 0.3, 0.8, 0.8, "#ffffff", 0.9);
    sheet.push("eyes", eyeR + 0.7 + px, eyeY + 0.3, 0.8, 0.8, "#ffffff", 0.9);
    sheet.push("eyes", eyeL - 0.2, eyeY - 0.6, eyeW + 0.4, 0.7, c.skin.dark, 0.45);
    sheet.push("eyes", eyeR - 0.2, eyeY - 0.6, eyeW + 0.4, 0.7, c.skin.dark, 0.45);
  }
  if (!c.fine) return;
  const mouthY = top + P.mouthT - P.headT;
  sheet.push("headBase", 15, eyeY + 2.8, 2, 1, c.skin.dark, 0.45);
  if (expression === "joy") {
    sheet.push("headBase", 13.6, mouthY, 4.8, 1.8, c.skin.dark, 0.9);
    sheet.push("headBase", 14.2, mouthY + 1, 3.6, 0.8, mix(c.skin.lip, "#ffffff", 0.35), 0.85);
  } else if (expression === "smile") {
    sheet.push("headBase", 14, mouthY, 4, 1, c.skin.lip);
    sheet.push("headBase", 13.2, mouthY - 0.8, 1, 1, c.skin.lip, 0.75);
    sheet.push("headBase", 17.8, mouthY - 0.8, 1, 1, c.skin.lip, 0.75);
    sheet.push("headBase", 14.4, mouthY + 1.1, 3.2, 0.6, c.skin.light, 0.5);
  } else {
    sheet.push("headBase", 14.2, mouthY, 3.6, 0.9, c.skin.lip, expression === "focus" ? 0.9 : 0.7);
  }
  sheet.push("headBase", left + 0.4, eyeY + 2.6, 1.8, 1, c.skin.blush, 0.28);
  sheet.push("headBase", P.headR - 2.2, eyeY + 2.6, 1.8, 1, c.skin.blush, 0.28);
}

function drawFacialHair(sheet: Sheet, c: Ctx) {
  const style: FacialHair = c.look.facial;
  if (style === "none" || c.view === "back") return;
  const top = P.headT + c.headY;
  const cheekY = top + 6.4;          // abaixo dos olhos
  const chinY = top + 9.6;
  if (style === "stubble") {
    sheet.push("headTop", P.headL + 0.6, cheekY + 1.4, P.headR - P.headL - 1.2, 2.6, c.hair, 0.3);
    sheet.push("headTop", 13, chinY + 1.2, 6, 1.4, c.hair, 0.38);
    return;
  }
  if (style === "mustache") {
    sheet.push("headTop", 13.2, top + 8, 5.6, 1.2, c.hair);
    sheet.push("headTop", 12.4, top + 8, 1, 1, c.hairDark, 0.8);
    sheet.push("headTop", 18.6, top + 8, 1, 1, c.hairDark, 0.8);
    return;
  }
  const side = style === "full" ? 2.2 : 1.1;
  sheet.push("headTop", P.headL + 0.2, cheekY + 2, side, 4.4, c.hair);
  sheet.push("headTop", P.headR - side - 0.2, cheekY + 2, side, 4.4, c.hair);
  sheet.push("headTop", 12.6, chinY + 1, 6.8, 2, c.hair);
  if (style === "full") {
    sheet.push("headTop", 12, top + 8.6, 2, 2.4, c.hair);
    sheet.push("headTop", 16, top + 8.6, 2, 2.4, c.hair);
    sheet.push("headTop", 13.2, top + 8.2, 5.6, 1, c.hair);
    sheet.push("headTop", 13.6, chinY + 2.2, 4.8, 0.8, c.hairLight, 0.2);
  } else {
    sheet.push("headTop", 13.2, top + 8.2, 5.6, 1, c.hair, 0.92);
    sheet.push("headTop", 14.4, chinY + 0.6, 3.2, 1.8, c.hair);
  }
}

function drawGlasses(sheet: Sheet, c: Ctx) {
  const style: GlassesStyle = c.look.glasses;
  if (style === "none" || c.view === "back") return;
  const y = P.headT + c.headY + P.eyeT - P.headT - 0.8;
  const frame = style === "gold" ? GOLD : style === "dark" ? "#171a1e" : style === "screen" ? "#3c4a57" : "#2a2e33";
  const glass = style === "dark" ? "#12161b" : style === "screen" ? "#8fc0e8" : null;
  const lensL = P.headL + 0.4;
  const lensR = P.headR - 4.8;
  const lensW = 4.4;
  if (style === "round") {
    sheet.push("headTop", lensL, y, lensW, 3.6, frame, 1, 1.8);
    sheet.push("headTop", lensR, y, lensW, 3.6, frame, 1, 1.8);
    sheet.push("headTop", lensL + 0.7, y + 0.7, 3, 2.2, "#dfeaf2", 0.22, 1.1);
    sheet.push("headTop", lensR + 0.7, y + 0.7, 3, 2.2, "#dfeaf2", 0.22, 1.1);
  } else {
    if (glass) {
      sheet.push("headTop", lensL, y, lensW, 3, glass, style === "dark" ? 0.9 : 0.26);
      sheet.push("headTop", lensR, y, lensW, 3, glass, style === "dark" ? 0.9 : 0.26);
      sheet.push("headTop", lensL + 0.6, y, 1.6, 0.8, "#ffffff", style === "dark" ? 0.22 : 0.42);
    }
    for (const lx of [lensL, lensR]) {
      sheet.push("headTop", lx, y, lensW, 0.8, frame);
      sheet.push("headTop", lx, y + 2.6, lensW, 0.8, frame);
      sheet.push("headTop", lx, y, 0.8, 3.4, frame);
      sheet.push("headTop", lx + lensW - 0.8, y, 0.8, 3.4, frame);
    }
    sheet.push("headTop", lensL + lensW, y + 0.6, lensR - lensL - lensW, 0.8, frame);
  }
  sheet.push("headTop", P.headL - 1.4, y + 1, 1.4, 0.8, frame, 0.85);
  sheet.push("headTop", P.headR, y + 1, 1.4, 0.8, frame, 0.85);
  if (c.fine && style !== "dark") sheet.push("headTop", lensL + 0.8, y + 0.9, 0.8, 0.8, "#ffffff", 0.5);
}

function drawAccessory(sheet: Sheet, c: Ctx) {
  const item: Accessory = c.look.accessory;
  const top = P.headT + c.headY;
  if (item === "earrings") {
    sheet.push("headTop", P.headL - 1.8, top + 6.2, 1.2, 1.8, GOLD);
    sheet.push("headTop", P.headR + 0.6, top + 6.2, 1.2, 1.8, GOLD);
    if (c.fine) {
      sheet.push("headTop", P.headL - 1.8, top + 6.2, 0.6, 0.8, GOLD_LIGHT, 0.9);
      sheet.push("headTop", P.headR + 0.6, top + 6.2, 0.6, 0.8, GOLD_LIGHT, 0.9);
    }
    return;
  }
  if (item === "headset" && c.view === "front") {
    const band = "#23282e";
    sheet.push("headTop", P.headL - 0.6, top - 2.4, 13.2, 1.4, band, 1, 0.6);
    sheet.push("headTop", P.headL - 1.8, top + 2.8, 2, 5.4, band);
    sheet.push("headTop", P.headR - 0.2, top + 2.8, 2, 5.4, band);
    sheet.push("headTop", P.headL - 1.8, top + 4.2, 2, 1, GOLD, 0.8);
    sheet.push("headTop", P.headR + 1, top + 4.2, 1, 1, GOLD, 0.8);
    sheet.push("headTop", P.headR + 1, top + 7.6, 1, 1.8, band);
    sheet.push("headTop", P.headR - 2, top + 8.8, 4, 1.2, band);
    sheet.push("headTop", P.headR - 2.8, top + 8.6, 1.4, 1.4, GOLD_LIGHT);
    return;
  }
  if (item === "cap") {
    const crown = c.look.outfit === "suit" || c.look.outfit === "blazer" ? c.suitDark : c.suit;
    if (c.view === "back") {
      sheet.push("headTop", P.headL - 1, top - 1.4, 14, 3.6, crown);
      sheet.push("headTop", P.headL - 1, top + 1.4, 14, 1, GOLD, 0.45);
      return;
    }
    sheet.push("headTop", P.headL - 1, top - 1.4, 14, 3.4, crown);
    sheet.push("headTop", P.headL - 1, top - 1.4, 14, 1, tint(crown, 0.26), 0.75);
    sheet.push("headTop", 15.6, top + 1.8, 9.6, 1.6, shade(crown, 0.3));
    sheet.push("headTop", 15.6, top + 1.8, 9.6, 0.7, "#000000", 0.18);
    sheet.push("headTop", 11.6, top - 0.8, 3, 2, GOLD_LIGHT, 0.85);
    return;
  }
  if (item === "badge" && c.view === "front") {
    const strap = shade(c.suitDark, 0.15);
    const chest = P.torsoT + c.bodyY;
    sheet.push("body", 15.6, chest - 1.6, 1, 3, strap, 0.85);
    sheet.push("body", 20.4, chest - 1.6, 1, 3, strap, 0.85);
    sheet.push("body", 18.4, chest + 1.4, 5.4, 3.6, "#f6f3ea");
    sheet.push("body", 18.4, chest + 1.4, 5.4, 0.9, GOLD);
    sheet.push("body", 19.2, chest + 3.2, 2, 0.9, "#3c4045", 0.7);
    sheet.push("body", 22, chest + 3.2, 1, 0.9, GOLD);
  }
}

/* ------------------------------------------------------------ tronco */

function drawTorso(sheet: Sheet, c: Ctx) {
  const outfit: Outfit = c.look.outfit;
  const y = P.shoulderT + c.bodyY;
  const back = c.view === "back";
  const bottom = P.hipB + c.bodyY;

  sheet.push("body", P.shoulderL, y, P.shoulderR - P.shoulderL, 3, c.suit);
  sheet.push("body", P.torsoL, y + 2.4, P.torsoR - P.torsoL, bottom - y - 2.4, c.suit);
  if (back) {
    sheet.push("body", P.shoulderL + 2, y, 16, 1, c.suitLight, 0.24);
    sheet.push("body", 15, y + 3, 2, bottom - y - 3, "#000000", 0.2);
    sheet.push("body", P.torsoL, bottom - 1, P.torsoR - P.torsoL, 1, "#000000", 0.16);
    if (outfit === "hoodie") sheet.push("body", 11, y + 3.4, 10, 1, c.suitLight, 0.2);
    if (c.admin) sheet.push("body", 14, y - 0.6, 4, 1, GOLD_LIGHT, 0.7);
    return;
  }
  sheet.push("body", P.shoulderL, y, P.shoulderR - P.shoulderL, 1, c.suitLight, 0.34);
  sheet.push("body", P.torsoL, y + 1.4, 1.6, bottom - y - 1.4, "#000000", 0.13);
  sheet.push("body", P.torsoR - 1.6, y + 1.4, 1.6, bottom - y - 1.4, "#000000", 0.08);
  sheet.push("body", P.torsoL, bottom - 1, P.torsoR - P.torsoL, 1, "#000000", 0.15);

  const neckLine = y - 0.8;
  switch (outfit) {
    case "suit": {
      // colarinho + camisa em V estreito, coberto pelas lapelas
      sheet.push("body", 13.2, neckLine, 5.6, 5.4, c.cloth);
      sheet.push("body", 13.8, neckLine, 4.4, 1, c.clothDark, 0.85);
      sheet.push("body", 10.6, neckLine, 3, 7.4, c.suitLight, 0.92);
      sheet.push("body", 18.4, neckLine, 3, 7.4, c.suitLight, 0.62);
      sheet.push("body", 12.8, neckLine + 0.4, 1.2, 6.4, c.suitEdge, 0.6);
      sheet.push("body", 20, neckLine + 0.4, 1.2, 6.4, c.suitEdge, 0.45);
      sheet.push("body", 15.2, neckLine + 1.2, 1.8, 6, c.tieColor);
      sheet.push("body", 14.8, neckLine + 0.4, 2.6, 1.4, GOLD);
      sheet.push("body", 15.5, neckLine + 6, 1.2, 1.4, shade(c.tieColor, 0.4));
      if (c.fine) {
        sheet.push("body", 19.2, y + 6.4, 3, 1, c.suitEdge, 0.55);
        sheet.push("body", 19.4, y + 6.1, 2, 1, GOLD_LIGHT, 0.7);
      }
      break;
    }
    case "blazer": {
      sheet.push("body", 13, neckLine, 6, 8, c.cloth);
      sheet.push("body", 13.6, neckLine, 4.8, 1, c.clothDark, 0.7);
      sheet.push("body", 15.6, neckLine + 1, 1, 6, "#000000", 0.07);
      sheet.push("body", P.torsoL + 0.4, neckLine, 4.6, 9, c.suit);
      sheet.push("body", P.torsoR - 5, neckLine, 4.6, 9, c.suit);
      sheet.push("body", 11.6, neckLine, 1.4, 9, c.suitEdge, 0.5);
      sheet.push("body", P.torsoR - 6.4, neckLine, 1.4, 9, c.suitEdge, 0.35);
      sheet.push("body", 19.4, y + 2.6, 2.2, 1.2, GOLD_LIGHT, 0.85);
      break;
    }
    case "shirt": {
      sheet.push("body", P.torsoL + 0.4, y, P.torsoR - P.torsoL - 0.8, bottom - y, c.cloth);
      sheet.push("body", 13.2, neckLine, 5.6, 1.8, c.cloth);
      sheet.push("body", 13.4, neckLine + 0.2, 2, 1.2, c.clothDark);
      sheet.push("body", 16.6, neckLine + 0.2, 2, 1.2, c.clothDark);
      sheet.push("body", 15.2, neckLine + 1.4, 1.8, 5.4, c.tieColor);
      sheet.push("body", 14.8, neckLine + 0.8, 2.6, 1.2, tint(c.tieColor, 0.42));
      if (c.fine) {
        sheet.push("body", 15.4, y + 7.4, 1, 1, c.clothDark, 0.9);
        sheet.push("body", 15.4, y + 9.2, 1, 1, c.clothDark, 0.9);
      }
      sheet.push("body", P.torsoL + 0.4, bottom - 1.4, P.torsoR - P.torsoL - 0.8, 1.4, "#000000", 0.1);
      break;
    }
    case "hoodie": {
      // capuz dobrado atrás do pescoço (visível por cima do ombro)
      sheet.push("body", 10.6, neckLine - 1.4, 10.8, 2.6, c.suitDark);
      sheet.push("body", 10.6, neckLine - 1.4, 10.8, 1, c.suitLight, 0.3);
      sheet.push("body", 12.4, neckLine + 0.8, 7.2, 2, shade(c.suit, 0.16));
      sheet.push("body", 14, neckLine + 0.8, 1, 3, c.cloth, 0.55);
      sheet.push("body", 17, neckLine + 0.8, 1, 3, c.cloth, 0.55);
      sheet.push("body", 10.5, y + 6.4, 11, 3.2, c.suitDark, 0.7);
      sheet.push("body", 10.5, y + 6.4, 11, 0.9, "#000000", 0.16);
      sheet.push("body", P.torsoL, bottom - 1.6, P.torsoR - P.torsoL, 1.6, c.suitLight, 0.38);
      break;
    }
    default: {
      sheet.push("body", P.torsoL + 0.4, y, P.torsoR - P.torsoL - 0.8, bottom - y, c.suit);
      sheet.push("body", 13.2, neckLine, 5.6, 1.6, c.suitDark, 0.85);
      sheet.push("body", 13.4, y + 3.2, 2.4, 1, GOLD_LIGHT, 0.8);
      sheet.push("body", 13.4, y + 4.2, 1, 1.6, GOLD_LIGHT, 0.8);
      sheet.push("body", 16.6, y + 3.2, 1.2, 1.2, GOLD_LIGHT, 0.7);
      sheet.push("body", 17.8, y + 4.4, 1.2, 1.6, GOLD_LIGHT, 0.7);
      sheet.push("body", 19, y + 3.2, 2.4, 3.2, GOLD_LIGHT, 0.45);
      if (c.fine) sheet.push("body", P.torsoL + 0.4, bottom - 1.2, P.torsoR - P.torsoL - 0.8, 1.2, "#000000", 0.12);
    }
  }
  if (c.admin) {
    sheet.push("body", 10.8, y + 3.8, 2, 2, GOLD);
    sheet.push("body", 10.8, y + 3.8, 1, 1, GOLD_LIGHT, 0.9);
  }
  if (!c.casual) {
    sheet.push("body", P.torsoL + 1, bottom - 0.4, P.torsoR - P.torsoL - 2, 1.2, "#14181d");
    sheet.push("body", 15, bottom - 0.4, 2, 1.2, GOLD, 0.85);
  }
}

function drawArms(sheet: Sheet, c: Ctx) {
  const back = c.view === "back";
  const sleeve = c.look.outfit === "shirt" ? c.cloth : c.suit;
  const sleeveShade = c.look.outfit === "shirt" ? c.clothDark : c.suitEdge;
  const sleeveLight = c.look.outfit === "shirt" ? "#ffffff" : c.suitLight;
  const shortSleeve = c.look.outfit === "tee";
  const top = P.armT + c.bodyY;
  const bottom = P.handB + c.bodyY;

  const armDown = (layer: LayerName, x: number, far: boolean) => {
    sheet.push(layer, x, top, P.armW, P.handT + c.bodyY - top, sleeve);
    sheet.push(layer, x, top, P.armW, 1, sleeveLight, far ? 0.16 : 0.3);
    sheet.push(layer, x, top, 0.9, P.handT + c.bodyY - top, "#000000", far ? 0.16 : 0.1);
    if (shortSleeve) {
      sheet.push(layer, x, top + 4, P.armW, 1, sleeveShade, 0.5);
      sheet.push(layer, x, top + 4.8, P.armW, bottom - top - 4.8, c.skin.base);
    } else {
      sheet.push(layer, x, bottom - 3.2, P.armW, 1.2, sleeveShade, 0.45);
      sheet.push(layer, x, bottom - 2.4, P.armW, 2.4, c.skin.base);
    }
    sheet.push(layer, x, bottom - 0.8, P.armW, 0.8, c.skin.dark, 0.4);
  };
  const armRaised = (layer: "waveArm", x: number) => {
    const outward = x > 16 ? 1 : -1;
    const hx = x + (outward > 0 ? 0.4 : -1.6);
    // manga dobrada para cima, antebraço e mão abertos — tudo dentro do viewBox
    sheet.push(layer, x, top - 6.4, P.armW, 7.4, sleeve);
    sheet.push(layer, x, top - 6.4, P.armW, 1, c.suitLight, 0.4);
    sheet.push(layer, x, top - 11.4, P.armW, 5.4, c.skin.base);
    sheet.push(layer, x, top - 11.4, P.armW, 1, c.skin.light, 0.45);
    sheet.push(layer, x, top - 6.8, P.armW, 1, sleeveShade, 0.45);
    sheet.push(layer, hx, top - 14.6, 4.2, 3.6, c.skin.base);
    sheet.push(layer, hx, top - 14.6, 4.2, 1, c.skin.light, 0.42);
    if (c.fine) {
      sheet.push(layer, hx + 0.5, top - 11.2, 3.2, 0.7, c.skin.dark, 0.35);
      sheet.push(layer, x + 2, top - 10.6, 1, 2, c.skin.dark, 0.3);
    }
  };

  const farX = back ? P.armR : P.armL;
  const nearX = back ? P.armL : P.armR;
  armDown("arms", farX, true);
  if (c.waving) armRaised("waveArm", nearX);
  else armDown("arms", nearX, false);
}

/* ------------------------------------------------------------ pernas */

function drawLegs(sheet: Sheet, c: Ctx) {
  if (c.sitting) {
    sheet.push("legsBack", 8, 27.4, 16, 4.6, c.trouser);
    sheet.push("legsBack", 8, 27.4, 16, 1, c.trouserLight, 0.45);
    sheet.push("legsBack", 8, 31, 16, 1, "#000000", 0.16);
    sheet.push("legsFront", 10.5, 31.6, 4, 6.6, c.trouser);
    sheet.push("legsFront", 17.5, 31.6, 4, 6.6, c.trouserDark);
    sheet.push("legsFront", 8.6, 38, 6.4, 2.6, c.shoe);
    sheet.push("legsFront", 16.6, 38, 6.4, 2.6, c.shoe);
    sheet.push("legsFront", 8.6, 38, 6.4, 0.8, c.casual ? "#ffffff" : c.trouserLight, 0.4);
    sheet.push("legsFront", 8.6, 39.8, 14.4, 0.9, c.shoeDark, 0.8);
    if (c.casual) {
      sheet.push("legsFront", 9.4, 38.8, 4, 0.8, GOLD, 0.7);
      sheet.push("legsFront", 17.4, 38.8, 4, 0.8, GOLD, 0.7);
    }
    return;
  }
  const hipY = P.legT + 0.4;
  sheet.push("legsBack", P.legL, hipY, P.legMidL - P.legL, P.legB - hipY, c.trouser);
  sheet.push("legsBack", P.legL, hipY, 1, P.legB - hipY, "#000000", 0.14);
  sheet.push("legsFront", P.legMidR, hipY, P.legR - P.legMidR, P.legB - hipY, c.trouser);
  sheet.push("legsFront", P.legR - 1, hipY, 1, P.legB - hipY, "#000000", 0.16);
  if (c.fine) {
    sheet.push("legsFront", P.legMidR, hipY, P.legR - P.legMidR, 0.9, c.trouserLight, 0.3);
    sheet.push("legsBack", P.legL, hipY + 5, P.legMidL - P.legL, 0.9, c.trouserDark, 0.35);
  }
  if (c.casual) {
    sheet.push("legsBack", P.legL, P.legB - 3, P.legMidL - P.legL, 1.6, c.trouserLight, 0.28);
    sheet.push("legsFront", P.legMidR, P.legB - 3, P.legR - P.legMidR, 1.6, c.trouserLight, 0.28);
  }
  // sapatos com bico para fora, separados por vão
  sheet.push("legsBack", 8.6, P.shoeT, 6.6, P.shoeB - P.shoeT, c.shoe);
  sheet.push("legsFront", 16.8, P.shoeT, 6.6, P.shoeB - P.shoeT, c.shoe);
  sheet.push("legsBack", 8.6, P.shoeB - 0.8, 6.6, 0.8, c.shoeDark);
  sheet.push("legsFront", 16.8, P.shoeB - 0.8, 6.6, 0.8, c.shoeDark);
  if (c.casual) {
    sheet.push("legsBack", 9.4, P.shoeT + 0.7, 3.4, 0.9, GOLD, 0.75);
    sheet.push("legsFront", 17.6, P.shoeT + 0.7, 3.4, 0.9, GOLD, 0.75);
  } else if (c.fine) {
    sheet.push("legsBack", 9.4, P.shoeT, 2.8, 0.7, tint(c.shoe, 0.5), 0.35);
    sheet.push("legsFront", 17.6, P.shoeT, 2.8, 0.7, tint(c.shoe, 0.5), 0.35);
  }
}

/* ------------------------------------------------------------ cabeça */

function drawHead(sheet: Sheet, c: Ctx) {
  const top = P.headT + c.headY;
  const left = P.headL;
  const width = P.headR - P.headL;
  sheet.push("headBase", P.neckL, top + 7.6, P.neckR - P.neckL, 4.4, c.skin.mid);
  sheet.push("headBase", P.neckL, top + 7.6, P.neckR - P.neckL, 1.2, c.skin.dark, 0.55);
  sheet.push("headBase", left, top, width, P.headB - P.headT, c.skin.base);
  sheet.push("headBase", P.jawL, P.jawT + c.headY, P.jawR - P.jawL, P.jawB - P.jawT, c.skin.base);
  if (c.view === "front") {
    sheet.push("headBase", left - 1.6, P.earT + c.headY, 1.6, P.earB - P.earT, c.skin.mid);
    sheet.push("headBase", P.headR, P.earT + c.headY, 1.6, P.earB - P.earT, c.skin.mid);
    sheet.push("headBase", left - 1.6, P.earT + c.headY + 1, 0.8, 1.6, c.skin.dark, 0.5);
    if (c.fine) {
      sheet.push("headTop", left, top, 1.4, P.headB - P.headT, "#000000", 0.11);
      sheet.push("headTop", P.headR - 1.4, top, 1.4, P.headB - P.headT + 1.4, "#ffffff", 0.08);
      sheet.push("headTop", P.jawL, P.jawB + c.headY - 0.4, P.jawR - P.jawL, 0.8, c.skin.dark, 0.38);
    }
  } else {
    sheet.push("headBase", left - 1.6, P.earT + c.headY, 1.6, P.earB - P.earT, c.skin.mid, 0.9);
    sheet.push("headBase", P.headR, P.earT + c.headY, 1.6, P.earB - P.earT, c.skin.mid, 0.9);
  }
}

/* ------------------------------------------------------------ público */

export function buildSprite(input: SpriteInput): Sprite {
  const sheet = new Sheet();
  const c = createContext(input);
  drawHairDrop(sheet, c);
  drawLegs(sheet, c);
  drawTorso(sheet, c);
  drawArms(sheet, c);
  drawHead(sheet, c);
  if (c.view === "front") drawFace(sheet, c);
  drawHairMass(sheet, c);
  drawHairFront(sheet, c);
  drawFacialHair(sheet, c);
  drawGlasses(sheet, c);
  drawAccessory(sheet, c);

  return {
    layers: sheet.layers,
    shadow: {
      cx: 16,
      cy: input.sitting ? 41.4 : 42.2,
      rx: input.sitting ? 13 : 11,
      ry: input.sitting ? 3.2 : 2.8,
    },
  };
}
