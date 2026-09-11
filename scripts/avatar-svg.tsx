/** Gista o SVG real do PixelAvatar (mesmo código do app) para inspeção/render. */
import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { PixelAvatar } from "../src/components/ui";
import { presetLook, serializeLook, DEFAULT_LOOK } from "../src/lib/avatar";

const cases = [
  { name: "exec", look: presetLook("gx-executivo"), action: "idle" },
  { name: "estrategia", look: presetLook("gx-estrategia"), action: "idle" },
  { name: "tech", look: presetLook("gx-tech"), action: "wave" },
  { name: "lounge", look: presetLook("gx-lounge"), action: "sit" },
  { name: "recepcao", look: presetLook("gx-recepcao"), action: "idle" },
  { name: "diretoria", look: presetLook("gx-autoridade"), action: "idle" },
  { name: "costas", look: DEFAULT_LOOK, action: "idle", dir: "ur" },
  { name: "esquerda", look: presetLook("gx-tech"), action: "walk", dir: "dl" },
];

const cell = (item: (typeof cases)[number]) => {
  const member = { id: item.name, name: item.name, color: "#c7a66e", gender: "male", avatarLook: serializeLook(item.look), isAdmin: item.name === "diretoria" };
  return renderToStaticMarkup(
    createElement(PixelAvatar as any, { member, size: 128, own: item.name === "exec", action: item.action as any, direction: (item.dir || "dr") as any, isMoving: item.action === "walk" })
  );
};

const body = cases.map((item, index) => `<g transform="translate(${(index % 4) * 150 + 10}, ${Math.floor(index / 4) * 210 + 10})">${cell(item)}</g>`).join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="440" viewBox="0 0 620 440"><rect width="620" height="440" fill="#151819"/>${body}</svg>`;
writeFileSync(process.argv[2] ?? "/home/user/.avatar-qa/react.svg", svg);
console.log("svg escrito", svg.length, "bytes");
