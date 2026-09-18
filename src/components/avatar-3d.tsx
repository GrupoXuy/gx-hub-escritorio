"use client";

import type { CSSProperties } from "react";
import { parseLook, skinPalette, GOLD, shade, tint } from "@/lib/avatar";

export type Avatar3DMember = {
  id?: string;
  name?: string;
  color?: string;
  gender?: string | null;
  action?: string;
  direction?: string;
  handRaised?: boolean;
  avatarLook?: string | null;
};

/**
 * Avatar 3D GX Hub — renderer procedural premium.
 * Mantém a API/AvatarLook existente e não exige assets externos.
 * O visual é inspirado no personagem 3D de referência: proporções humanas,
 * jaqueta corporativa, tênis, volume, luz e animações de corpo inteiro.
 */
export function Avatar3D({ member, size = 48, own = false, showRing = false, isMoving = false }: { member: Avatar3DMember; size?: number; own?: boolean; showRing?: boolean; isMoving?: boolean }) {
  const look = parseLook(member.avatarLook, member.id || member.name);
  const skin = skinPalette(look.skin);
  const accent = member.color || GOLD;
  const direction = member.direction || "dr";
  const action = member.action || "idle";
  const left = direction === "dl" || direction === "ul";
  const back = direction === "ur" || direction === "ul";
  const female = member.gender === "female";
  const style = {
    "--gx-size": `${size}px`,
    "--gx-skin": skin.base,
    "--gx-skin-light": skin.light,
    "--gx-skin-dark": skin.dark,
    "--gx-hair": look.hairColor,
    "--gx-accent": accent,
    "--gx-outfit": accent,
    "--gx-outfit-dark": shade(accent, .34),
    "--gx-outfit-light": tint(accent, .22),
    "--gx-facing": left ? "-1" : "1",
    "--gx-depth": back ? ".96" : "1",
    "--gx-body-scale": female ? ".96" : "1",
    "--gx-look-x": "0deg",
    "--gx-look-y": "0deg",
  } as CSSProperties;

  return (
    <span
      className={`gx3d gx-avatar3d gx-avatar3d-${action} gx-avatar3d-${direction} ${own ? "gx-avatar3d-own" : ""} ${showRing ? "gx-avatar3d-ring" : ""} ${isMoving ? "gx-avatar3d-moving" : ""}`}
      style={style}
      aria-label={member.name ? `Avatar de ${member.name}` : "Avatar"}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        event.currentTarget.style.setProperty("--gx-look-x", `${(x * 5).toFixed(2)}deg`);
        event.currentTarget.style.setProperty("--gx-look-y", `${(y * -4).toFixed(2)}deg`);
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty("--gx-look-x", "0deg");
        event.currentTarget.style.setProperty("--gx-look-y", "0deg");
      }}
    >
      <span className="gx3d-aura" />
      <span className="gx3d-ground" />
      {showRing && <span className="gx3d-ring" aria-hidden="true" />}
      <span className="gx3d-character">
        <span className="gx3d-legs"><i/><i/></span>
        <span className="gx3d-shoes"><i/><i/></span>
        <span className="gx3d-arms"><i className="left"/><i className="right"/></span>
        <span className={`gx3d-jacket outfit-${look.outfit}`}>
          <i className="gx3d-shirt"/>
          <i className="gx3d-lapel left"/><i className="gx3d-lapel right"/>
          <i className="gx3d-zip"/>
          {look.outfit === "suit" && <i className="gx3d-tie"/>}
          {look.outfit === "blazer" && <i className="gx3d-pocket"/>}
          {look.outfit === "hoodie" && <i className="gx3d-hood"/>}
          <i className="gx3d-logo">X</i>
          {look.accessory === "badge" && <b className="gx3d-badge">GX</b>}
        </span>
        <span className="gx3d-neck"/>
        <span className="gx3d-head">
          {look.hair !== "bald" && <i className={`gx3d-hair hair-${look.hair}`}/>}
          <i className="gx3d-ear left"/><i className="gx3d-ear right"/>
          <i className="gx3d-cheek left"/><i className="gx3d-cheek right"/>
          {!back && <><i className="gx3d-eye left"/><i className="gx3d-eye right"/>
            {look.glasses !== "none" && <i className={`gx3d-glasses glasses-${look.glasses}`}/>}
            {look.facial !== "none" && <i className={`gx3d-facial facial-${look.facial}`}/>}
            <i className={`gx3d-mouth expression-${look.expression}`}/></>}
          {look.accessory === "headset" && <i className="gx3d-headset"/>}
          {look.accessory === "cap" && <i className="gx3d-cap"/>}
          {look.accessory === "earrings" && <><i className="gx3d-earring left"/><i className="gx3d-earring right"/></>}
        </span>
        {(member.handRaised || action === "wave") && <i className="gx3d-wave-hand"/>}
      </span>
    </span>
  );
}

export function Avatar3DStyles() {
  return <style jsx global>{`
    .gx-avatar3d{position:relative;display:inline-block;width:var(--gx-size);height:var(--gx-size);flex:0 0 auto;perspective:420px;isolation:isolate;overflow:visible;filter:drop-shadow(0 5px 7px #0008)}
    .gx3d-ring{position:absolute;left:8%;right:8%;bottom:2%;height:13%;border:1px solid var(--gx-accent);border-radius:50%;box-shadow:0 0 0 2px #c7a66e22,0 0 12px #c7a66e33;z-index:0;pointer-events:none}.gx-avatar3d-own .gx3d-aura{opacity:1}.gx3d-aura{position:absolute;inset:4%;border-radius:50%;background:radial-gradient(circle,#d6b46a38 0,#d6b46a12 38%,transparent 72%);opacity:.8}
    .gx3d-ground{position:absolute;left:14%;right:14%;bottom:4%;height:9%;border-radius:50%;background:#0009;filter:blur(2px);transform:scaleX(.85)}
    .gx3d-character{position:absolute;inset:1%;transform:perspective(420px) rotateX(var(--gx-look-y)) rotateY(var(--gx-look-x)) scaleX(var(--gx-facing)) scale(var(--gx-depth)) scale(var(--gx-body-scale));transform-origin:50% 78%;animation:gx3d-idle 4s ease-in-out infinite;transition:transform .28s cubic-bezier(.22,.8,.25,1)}
    .gx3d-legs{position:absolute;left:34%;right:34%;bottom:15%;height:27%;display:flex;gap:7%;z-index:1}
    .gx3d-legs i{width:45%;border-radius:42% 42% 24% 24%;background:linear-gradient(90deg,#101215 0,#35383a 45%,#151719 100%);box-shadow:inset 2px 0 2px #fff2;transform-origin:50% 7%}
    .gx3d-shoes{position:absolute;left:27%;right:24%;bottom:8%;height:10%;z-index:4;display:flex;justify-content:space-between}
    .gx3d-shoes i{width:39%;border-radius:35% 55% 22% 28%;background:linear-gradient(160deg,#fff,#d9dce0 60%,#8d9298);box-shadow:inset 0 -2px 2px #7776,0 2px 3px #0008}
    .gx3d-shoes i:after{content:"";display:block;width:78%;height:18%;margin:72% auto 0;background:#253a59;border-radius:50%}
    .gx3d-jacket{position:absolute;left:20%;right:20%;bottom:30%;height:39%;border-radius:25% 25% 13% 13%;background:linear-gradient(105deg,var(--gx-outfit-dark),var(--gx-outfit) 46%,var(--gx-outfit-dark));box-shadow:inset 4px 0 5px #fff2,0 4px 7px #0008;z-index:2;overflow:hidden;transition:background .2s,border-radius .2s}
    .outfit-suit{background:linear-gradient(105deg,var(--gx-outfit-dark),var(--gx-outfit) 48%,var(--gx-outfit-dark))}
    .outfit-blazer{background:linear-gradient(105deg,var(--gx-outfit-dark),var(--gx-outfit-light) 48%,var(--gx-outfit-dark))}
    .outfit-shirt{background:linear-gradient(105deg,var(--gx-outfit-light),var(--gx-outfit) 50%,var(--gx-outfit-dark))}
    .outfit-hoodie{border-radius:20% 20% 14% 14%;background:linear-gradient(105deg,var(--gx-outfit-dark),var(--gx-outfit) 50%,var(--gx-outfit-dark))}
    .outfit-tee{border-radius:18% 18% 12% 12%;background:linear-gradient(105deg,var(--gx-outfit),var(--gx-outfit-dark))}
    .gx3d-shirt{position:absolute;left:41%;right:41%;top:3%;bottom:0;background:#f3f3ef;opacity:.95}
    .outfit-hoodie .gx3d-shirt,.outfit-tee .gx3d-shirt{display:none}
    .gx3d-lapel{position:absolute;top:5%;width:29%;height:58%;border-left:1px solid #f3d58d88}
    .gx3d-lapel.left{left:23%;transform:skewY(25deg)}.gx3d-lapel.right{right:23%;transform:skewY(-25deg)}
    .outfit-hoodie .gx3d-lapel,.outfit-tee .gx3d-lapel,.outfit-shirt .gx3d-lapel{opacity:.25}
    .gx3d-tie{position:absolute;left:46%;top:8%;width:8%;height:36%;background:linear-gradient(90deg,#b58f4d,#e4c985 45%,#8e6a35);clip-path:polygon(22% 0,78% 0,72% 72%,100% 100%,50% 90%,0 100%,28% 72%);z-index:3}.gx3d-pocket{position:absolute;right:13%;top:40%;width:18%;height:12%;border-bottom:2px solid #e7d4a1;border-radius:0 0 2px 2px;transform:skewY(-8deg);z-index:3}.gx3d-hood{position:absolute;left:28%;right:28%;top:-2%;height:25%;border:3px solid var(--gx-outfit-dark);border-bottom:0;border-radius:50% 50% 0 0;opacity:.9;z-index:3}.gx3d-zip{position:absolute;top:4%;bottom:5%;left:49.2%;width:1px;background:#d7d9dc99;box-shadow:1px 0 #0005}
    .gx3d-logo{position:absolute;left:14%;top:37%;width:16%;aspect-ratio:1;color:#151719;background:#d4b05f;border-radius:30%;font:800 42% Arial;text-align:center;line-height:2.35;box-shadow:0 1px 2px #0007}
    .gx3d-badge{position:absolute;right:12%;top:34%;padding:4% 5%;border-radius:3px;background:#f0f1ef;color:#18202a;font:700 32% Arial;box-shadow:0 1px 2px #0007}
    .gx3d-cheek{position:absolute;top:61%;width:14%;height:8%;border-radius:50%;background:var(--gx-skin-light);opacity:.22;z-index:2}.gx3d-cheek.left{left:16%}.gx3d-cheek.right{right:16%}.gx3d-neck{position:absolute;left:42%;bottom:62%;width:16%;height:10%;border-radius:35%;background:linear-gradient(90deg,var(--gx-skin-dark),var(--gx-skin),var(--gx-skin-light));z-index:2}
    .gx3d-head{position:absolute;left:30%;right:30%;top:9%;height:42%;border-radius:46% 46% 43% 43%;background:linear-gradient(105deg,var(--gx-skin-dark),var(--gx-skin) 43%,var(--gx-skin-light));box-shadow:inset -4px -3px 6px #0004,2px 2px 5px #0008;z-index:5;transform-origin:50% 80%}
    .gx3d-hair{position:absolute;left:-5%;right:-5%;top:-10%;height:43%;background:var(--gx-hair);box-shadow:inset 2px 2px 4px #fff2,0 2px 4px #0008;z-index:6;border-radius:48% 48% 30% 30%;transition:all .2s}
    .hair-side{clip-path:polygon(0 28%,17% 8%,48% 0,100% 14%,94% 52%,75% 32%,55% 38%,42% 28%,0 52%)}
    .hair-short{height:35%;top:-7%;border-radius:48% 48% 25% 25%}.hair-buzz{height:25%;top:-5%;border-radius:50%;opacity:.92}
    .hair-curls{top:-17%;height:52%;border-radius:48%;transform:scaleX(1.08);box-shadow:0 0 0 2px var(--gx-hair),inset 2px 2px 4px #fff2}
    .hair-afro{top:-20%;height:60%;border-radius:50%;transform:scaleX(1.13);box-shadow:0 0 0 3px var(--gx-hair),inset 2px 2px 4px #fff2}
    .hair-bob{top:-11%;height:57%;border-radius:45% 45% 35% 35%;clip-path:polygon(0 0,100% 0,100% 82%,82% 92%,64% 72%,36% 72%,18% 92%,0 82%)}
    .hair-waves{top:-11%;height:55%;border-radius:45%;clip-path:polygon(0 0,100% 0,100% 78%,82% 72%,70% 88%,52% 72%,35% 88%,18% 72%,0 82%)}
    .hair-long{top:-11%;height:72%;left:-9%;right:-9%;border-radius:45% 45% 30% 30%}.hair-ponytail{top:-10%;height:58%;border-radius:45%}.hair-ponytail:after{content:"";position:absolute;right:-18%;top:30%;width:34%;height:65%;border-radius:60%;background:var(--gx-hair);transform:rotate(18deg)}
    .hair-bun{top:-19%;height:45%;border-radius:45%}.hair-bun:after{content:"";position:absolute;right:8%;top:-32%;width:34%;height:42%;border-radius:50%;background:var(--gx-hair)}
    .hair-pixie{top:-8%;height:39%;border-radius:55% 55% 28% 40%;clip-path:polygon(0 28%,28% 0,52% 10%,78% 0,100% 28%,88% 70%,65% 48%,42% 64%,20% 48%)}
    .hair-mohawk{top:-18%;height:50%;left:25%;right:25%;border-radius:50% 50% 18% 18%}
    .gx3d-ear{position:absolute;top:42%;width:13%;height:22%;border-radius:50%;background:var(--gx-skin)}.gx3d-ear.left{left:-8%}.gx3d-ear.right{right:-8%}
    .gx3d-eye{position:absolute;top:47%;width:10%;height:7%;border-radius:50%;background:#fff;z-index:2}.gx3d-eye:after{content:"";position:absolute;inset:25%;border-radius:50%;background:#17191b}.gx3d-eye.left{left:24%}.gx3d-eye.right{right:24%}
    .gx3d-mouth{position:absolute;left:39%;top:68%;width:22%;height:9%;border-bottom:1.5px solid #793a35;border-radius:0 0 50% 50%;z-index:2}.expression-smile{height:13%;border-bottom-width:2px}.expression-focus{border-radius:0}.expression-joy{height:18%;border-radius:50%;border-bottom-width:2px}
    .gx3d-facial{position:absolute;left:20%;right:20%;bottom:5%;height:28%;background:linear-gradient(#0000,var(--gx-hair));border-radius:0 0 45% 45%;opacity:.72;z-index:3}.facial-stubble{left:25%;right:25%;height:20%;opacity:.5}.facial-mustache{left:31%;right:31%;bottom:28%;height:11%;background:var(--gx-hair);border-radius:50%}.facial-goatee{left:34%;right:34%;height:24%;border-radius:0 0 48% 48%}.facial-full{left:18%;right:18%;height:32%;opacity:.8}
    .gx3d-glasses{position:absolute;left:17%;right:17%;top:45%;height:14%;border:1px solid #c9aa62;border-radius:4px;z-index:7}.glasses-round{border-radius:50%}.glasses-dark{border-color:#17191b;background:#17191b66}.glasses-screen{border-color:#79c9ff;background:#79c9ff18}
    .gx3d-headset{position:absolute;left:-11%;right:-11%;top:12%;height:56%;border:2px solid #34393c;border-bottom:0;border-radius:50%;z-index:2}.gx3d-cap{position:absolute;left:-5%;right:-5%;top:-12%;height:23%;border-radius:55% 55% 20% 20%;background:linear-gradient(90deg,#111416,#303538);z-index:8}.gx3d-earring{position:absolute;top:61%;width:5%;height:8%;border:1px solid #d6b45e;border-radius:50%;z-index:8}.gx3d-earring.left{left:-3%}.gx3d-earring.right{right:-3%}
    .gx3d-arms{position:absolute;inset:0;z-index:1}.gx3d-arms i{position:absolute;top:34%;width:10%;height:30%;border-radius:48%;background:linear-gradient(90deg,var(--gx-skin-dark),var(--gx-skin),var(--gx-skin-light));transform-origin:50% 8%;box-shadow:inset 1px 0 2px #fff2}.gx3d-arms .left{left:11%;transform:rotate(9deg)}.gx3d-arms .right{right:11%;transform:rotate(-9deg)}
    .gx3d-wave-hand{position:absolute;right:5%;top:15%;width:16%;height:14%;border-radius:50%;background:var(--gx-skin);z-index:9;transform:rotate(-24deg);animation:gx3d-wave .6s ease-in-out infinite alternate}
    .gx-avatar3d-walk .gx3d-character{animation:none}.gx-avatar3d-walk .gx3d-legs i:first-child{animation:gx3d-step-a .52s ease-in-out infinite alternate}.gx-avatar3d-walk .gx3d-legs i:last-child{animation:gx3d-step-b .52s ease-in-out infinite alternate}.gx-avatar3d-walk .gx3d-arms .left{animation:gx3d-arm-a .52s ease-in-out infinite alternate}.gx-avatar3d-walk .gx3d-arms .right{animation:gx3d-arm-b .52s ease-in-out infinite alternate}.gx-avatar3d-walk .gx3d-jacket{animation:gx3d-bob .26s ease-in-out infinite alternate}.gx-avatar3d-walk .gx3d-head{animation:gx3d-head .52s ease-in-out infinite alternate}.gx-avatar3d-sit .gx3d-character{transform:translateY(8%) scaleX(var(--gx-facing)) scale(var(--gx-depth)) scale(var(--gx-body-scale))}.gx-avatar3d-sit .gx3d-legs{height:20%;bottom:19%;transform:skewX(-8deg)}.gx-avatar3d-wave .gx3d-arms .right{top:24%;transform:rotate(40deg);animation:gx3d-wave-arm .55s ease-in-out infinite alternate}
    .gx-avatar3d-ul .gx3d-eye,.gx-avatar3d-ul .gx3d-mouth,.gx-avatar3d-ul .gx3d-facial,.gx-avatar3d-ul .gx3d-glasses,.gx-avatar3d-ul .gx3d-earring,.gx-avatar3d-ur .gx3d-eye,.gx-avatar3d-ur .gx3d-mouth,.gx-avatar3d-ur .gx3d-facial,.gx-avatar3d-ur .gx3d-glasses,.gx-avatar3d-ur .gx3d-earring{display:none}
    @keyframes gx3d-idle{0%,100%{transform:scaleX(var(--gx-facing)) scale(var(--gx-depth)) scale(var(--gx-body-scale)) translateY(0)}50%{transform:scaleX(var(--gx-facing)) scale(var(--gx-depth)) scale(var(--gx-body-scale)) translateY(-1.8%)}}
    @keyframes gx3d-step-a{from{transform:translateY(-5%) rotate(-6deg)}to{transform:translateY(6%) rotate(6deg)}}@keyframes gx3d-step-b{from{transform:translateY(6%) rotate(6deg)}to{transform:translateY(-5%) rotate(-6deg)}}@keyframes gx3d-arm-a{from{transform:rotate(20deg)}to{transform:rotate(-18deg)}}@keyframes gx3d-arm-b{from{transform:rotate(-20deg)}to{transform:rotate(18deg)}}@keyframes gx3d-bob{from{transform:translateY(-1%)}to{transform:translateY(2%)}}@keyframes gx3d-head{from{transform:translateY(-1%) rotate(-1deg)}to{transform:translateY(1%) rotate(1deg)}}@keyframes gx3d-wave{from{transform:rotate(-32deg)}to{transform:rotate(-8deg)}}@keyframes gx3d-wave-arm{from{transform:rotate(28deg)}to{transform:rotate(58deg)}}
    @media (prefers-reduced-motion:reduce){.gx3d-character,.gx-avatar3d-walk .gx3d-legs i,.gx-avatar3d-walk .gx3d-arms i,.gx-avatar3d-walk .gx3d-jacket,.gx-avatar3d-walk .gx3d-head,.gx3d-wave-hand,.gx-avatar3d-wave .gx3d-arms .right{animation:none}}
  `}</style>;
}
