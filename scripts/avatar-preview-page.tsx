/**
 * Gera uma prévia estática (HTML) do pack do avatar: o Estúdio do avatar com o
 * CSS real do app, uma cena do mapa com nomes, e as listas de chat/equipe.
 *
 * Serve para revisar tipografia, contorno, animações e cores no navegador sem
 * depender de banco de dados. O arquivo vai para `public/` e é ignorado pelo Git.
 *
 * Uso: npm run avatar:preview  →  /preview-estudio.html no servidor de dev
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PixelAvatar, Avatar } from "../src/components/ui";
import { AvatarStudio } from "../src/components/avatar-studio";
import { DEFAULT_LOOK, lookFromId, parseLook, presetLook, serializeLook, AVATAR_PRESETS } from "../src/lib/avatar";

const noChange = () => {};

const studio = renderToStaticMarkup(
  createElement(AvatarStudio as never, {
    look: presetLook("gx-estrategia"),
    color: "#c7a66e",
    gender: "female",
    onChange: noChange,
    onColor: noChange,
  } as never)
);

const mapCast = [
  { id: "henrique", name: "Henrique S.", x: 30, y: 40, color: "#c7a66e", preset: "gx-executivo", action: "idle", dir: "dr", own: true },
  { id: "marina", name: "Marina R.", x: 58, y: 33, color: "#b29bc3", preset: "gx-estrategia", action: "idle", dir: "dl" },
  { id: "caio", name: "Caio P.", x: 70, y: 58, color: "#7295a1", preset: "gx-tech", action: "wave", dir: "dr" },
  { id: "rafa", name: "Rafael T.", x: 22, y: 66, color: "#839c83", preset: "gx-lounge", action: "sit", dir: "ur" },
  { id: "julia", name: "Júlia M.", x: 46, y: 74, color: "#c58b77", preset: "gx-recepcao", action: "idle", dir: "dr" },
  { id: "diego", name: "Diego A.", x: 84, y: 26, color: "#c4c9ca", preset: "gx-autoridade", action: "idle", dir: "ul" },
];

const avatarOf = (person: (typeof mapCast)[number]) => ({
  id: person.id,
  name: person.name,
  color: person.color,
  gender: person.preset === "gx-recepcao" || person.preset === "gx-estrategia" ? "female" : "male",
  avatarLook: serializeLook(presetLook(person.preset)),
  handRaised: person.action === "wave",
  micEnabled: person.id === "caio",
  isAdmin: person.preset === "gx-autoridade",
});

const mapScene = mapCast
  .map(person => {
    const member = avatarOf(person);
    const avatar = renderToStaticMarkup(
      createElement(PixelAvatar as never, {
        member,
        size: 62,
        own: person.own,
        showRing: person.own,
        action: person.action,
        direction: person.dir,
        isMoving: person.id === "julia",
      } as never)
    );
    return `<button class="map-person ${person.action === "sit" ? "is-seated" : ""} ${person.own ? "is-me" : ""}" style="left:${person.x}%;top:${person.y}%;z-index:${Math.round(person.y) + 5};--person-color:${person.color}">
      ${avatar}
      <span class="person-name">${person.name}${person.own ? '<span class="me-marker"></span>' : ""}${person.action === "sit" ? '<small class="seat-subtag">🪑</small>' : ""}</span>
    </button>`;
  })
  .join("");

const chatRows = mapCast
  .slice(0, 4)
  .map(person => {
    const member = { ...avatarOf(person), status: "available", lastSeen: new Date().toISOString() };
    const avatar = renderToStaticMarkup(createElement(Avatar as never, { member, size: 31, ring: true, status: true } as never));
    return `<div class="chat-message"><div class="message-author">${avatar}<span>${person.name}</span></div><p>Boa. O novo avatar já aparece em todo o escritório, inclusive na chamada.</p></div>`;
  })
  .join("");

const teamCards = mapCast
  .map(person => {
    const member = { ...avatarOf(person), role: "Ecossistema Grupo X", company: "Grupo X", status: "available", lastSeen: new Date().toISOString() };
    const avatar = renderToStaticMarkup(createElement(Avatar as never, { member, size: 62, ring: true } as never));
    return `<button class="team-card"><span class="team-card-top"><span class="company-mini">Grupo X</span><span class="member-status-chip available"><span></span>Disponível</span></span>${avatar}<h2>${person.name}</h2><p>${member.role}</p></button>`;
  })
  .join("");

const hashed = Array.from({ length: 6 }, (_, index) => {
  const look = lookFromId(`pessoa-${index + 7}`);
  const member = { id: `pessoa-${index + 7}`, name: "x", color: ["#c7a66e", "#839c83", "#7295a1", "#b29bc3", "#c58b77", "#c4c9ca"][index], avatarLook: serializeLook(look) };
  return `<div class="hash-cell">${renderToStaticMarkup(createElement(PixelAvatar as never, { member, size: 56, preview: true } as never))}<code>parseLook(null) → ${look.hair}</code></div>`;
}).join("");

void Fragment;
void DEFAULT_LOOK;
void parseLook;
void AVATAR_PRESETS;

const css = readFileSync("src/app/globals.css", "utf8").replace(/@import\s+["']tailwindcss["'];?/g, "");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>GX Hub · prévia do pack do avatar</title>
<style>${css}
body{margin:0;padding:0 0 60px;background:#101213;color:#d8dadb;font-family:ui-sans-serif,system-ui,"Segoe UI",sans-serif}
main{max-width:1180px;margin:0 auto;padding:0 22px;display:flex;flex-direction:column;gap:34px}
h1{font-size:20px;margin:26px 0 2px;letter-spacing:-.4px}
h1 b{color:#c7a66e}
.lede{color:#9a9c9d;font-size:11.4px;margin:0 0 10px}
.section{border:1px solid #343637;border-radius:12px;background:#171a1b;overflow:hidden}
.section-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:11px 14px;border-bottom:1px solid #2f3132;background:#1b1e1f}
.section-head h2{margin:0;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#a99266;font-weight:700}
.section-head small{font-size:9.6px;color:#7f8182}
.section-body{padding:14px}
.map-bg{position:relative;height:420px;background:linear-gradient(#1d2122,#171a1b);border-radius:8px;overflow:hidden;background-image:radial-gradient(#2a2e2f 1px,transparent 1px);background-size:22px 22px}
.map-person{position:absolute;transform:translate(-50%,-90%);display:flex;flex-direction:column;align-items:center;gap:0;border:0;background:none;padding:0;cursor:default}
.chat-list{display:flex;flex-direction:column;gap:10px;max-width:520px}
.hash-grid{display:flex;flex-wrap:wrap;gap:12px}
.hash-cell{display:flex;flex-direction:column;align-items:center;gap:5px;padding:9px;border:1px solid #343637;border-radius:9px;background:#1d1f20}
.hash-cell code{font-size:8px;color:#8b8d8e}
.team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:11px}
.notice{font-size:10.4px;color:#8f9192;padding:10px 14px;border-top:1px solid #2f3132;background:#141617}
</style></head>
<body><main>
<h1>GX HUB · prévia do <b>pack gráfico do avatar</b></h1>
<p class="lede">HTML gerado por <code>scripts/avatar-preview-page.tsx</code> com o CSS e o sprite reais do app. Não é commitado.</p>

<section class="section">
  <div class="section-head"><h2>Estúdio do avatar (ProfileDialog)</h2><small>clique nas opções para ver o estado selecionado</small></div>
  <div class="section-body" style="background:#101213">
    <div class="modal-shell modal-wide profile-studio-modal" style="position:static;max-width:none;box-shadow:none;border:0;background:transparent">
      <div class="modal-heading"><div><span class="eyebrow">DO SEU JEITO</span><h2>Estúdio do avatar</h2></div></div>
      <p class="modal-description">Escolha pele, cabelo, traje e detalhes. Cada conexão começa com você — e agora dá para ver isso no mapa.</p>
      ${studio}
    </div>
  </div>
  <p class="notice">O palco mostra frente/costas, em pé, sentado e acenando. Cada miniatura das abas é o sprite real daquele item.</p>
</section>

<section class="section">
  <div class="section-head"><h2>No mapa do escritório</h2><small>contorno, luz de recorte, aura, ondas de fala e 🪑 de assento</small></div>
  <div class="section-body"><div class="map-bg">${mapScene}</div></div>
</section>

<section class="section">
  <div class="section-head"><h2>Chat e lista de equipe</h2><small>Avatar 31px com anel de presença</small></div>
  <div class="section-body"><div class="chat-list">${chatRows}</div></div>
</section>

<section class="section">
  <div class="section-head"><h2>Diretório da equipe</h2><small>62px dentro do cartão</small></div>
  <div class="section-body"><div class="team-grid">${teamCards}</div></div>
</section>

<section class="section">
  <div class="section-head"><h2>Sem look salvo → visual determinístico pelo id</h2><small>lookFromId()</small></div>
  <div class="section-body"><div class="hash-grid">${hashed}</div></div>
</section>
</main>
<script>
document.querySelectorAll('.studio-row, .quickpick-presets, .quickpick-gender').forEach(function (row) {
  row.addEventListener('click', function (event) {
    var button = event.target.closest('.sprite-option, .chip-option, button');
    if (!button || !row.contains(button)) return;
    row.querySelectorAll('.on').forEach(function (item) { item.classList.remove('on'); });
    button.classList.add('on');
    var art = button.querySelector('.sprite-option-art > *, .pixel-avatar-wrapper');
    if (art) { art.style.transition = 'transform .18s'; art.style.transform = 'translateY(-2px)'; setTimeout(function () { art.style.transform = ''; }, 220); }
  });
});
</script>
</body></html>`;

writeFileSync("public/preview-estudio.html", html);
console.log(`prévia escrita em public/preview-estudio.html (${(html.length / 1024).toFixed(0)} KB)`);
