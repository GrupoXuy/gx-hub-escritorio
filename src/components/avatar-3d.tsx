"use client";

import type { CSSProperties } from "react";
import { parseLook, skinPalette, GOLD } from "@/lib/avatar";

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
 * Renderer 3D visual do GX Hub.
 *
 * A arte é procedural/CSS, sem GLB externo ou dependência WebGL pesada.
 * A configuração continua vindo do mesmo AvatarLook usado pelo sistema legado.
 */
export function Avatar3D({ member, size = 48 }: { member: Avatar3DMember; size?: number }) {
  const look = parseLook(member.avatarLook, member.id || member.name);
  const skin = skinPalette(look.skin);
  const accent = member.color || GOLD;
  const direction = member.direction || "dr";
  const action = member.action || "idle";
  const tilt = direction === "dl" || direction === "ul" ? -5 : direction === "dr" || direction === "ur" ? 5 : 0;
  const style = {
    "--gx3d-size": `${size}px`,
    "--gx3d-skin": skin.base,
    "--gx3d-skin-light": skin.light,
    "--gx3d-skin-dark": skin.dark,
    "--gx3d-hair": look.hairColor,
    "--gx3d-accent": accent,
    "--gx3d-tilt": `${tilt}deg`,
  } as CSSProperties;

  return (
    <span className={`gx-avatar3d gx-avatar3d-${action}`} style={style} aria-label={member.name ? `Avatar de ${member.name}` : "Avatar"}>
      <span className="gx-avatar3d-glow" />
      <span className="gx-avatar3d-shadow" />
      <span className="gx-avatar3d-figure">
        <span className="gx-avatar3d-legs"><i /><i /></span>
        <span className={`gx-avatar3d-torso outfit-${look.outfit}`}>
          <i className="gx-avatar3d-lapel left" />
          <i className="gx-avatar3d-lapel right" />
          <i className="gx-avatar3d-tie" />
          {look.accessory === "badge" && <b className="gx-avatar3d-badge">X</b>}
        </span>
        <span className="gx-avatar3d-neck" />
        <span className="gx-avatar3d-head">
          {look.hair !== "bald" && <i className={`gx-avatar3d-hair hair-${look.hair}`} />}
          <i className="gx-avatar3d-ear left" />
          <i className="gx-avatar3d-ear right" />
          <i className="gx-avatar3d-eye left" />
          <i className="gx-avatar3d-eye right" />
          {look.glasses !== "none" && <i className={`gx-avatar3d-glasses ${look.glasses === "round" ? "round" : ""}`} />}
          {look.facial !== "none" && <i className="gx-avatar3d-beard" />}
          <i className={`gx-avatar3d-mouth expression-${look.expression}`} />
          {look.accessory === "headset" && <i className="gx-avatar3d-headset" />}
          {look.accessory === "cap" && <i className="gx-avatar3d-cap" />}
        </span>
        {member.handRaised || action === "wave" ? <i className="gx-avatar3d-hand" /> : null}
      </span>
    </span>
  );
}

/**
 * Estilos globais do renderer. O PixelAvatar não é mais sobreposto ao avatar
 * 3D; permanece disponível como renderer legado para scripts/previews.
 */
export function Avatar3DStyles() {
  return (
    <style jsx global>{`
      .gx-avatar3d {
        position: relative;
        display: inline-block;
        flex: 0 0 auto;
        width: var(--gx3d-size);
        height: var(--gx3d-size);
        perspective: 260px;
        isolation: isolate;
        filter: drop-shadow(0 4px 5px #0008);
        overflow: visible;
      }
      .gx-avatar3d-glow {
        position: absolute;
        inset: 7%;
        border-radius: 50%;
        background: radial-gradient(circle, #c7a66e44, transparent 68%);
        opacity: .22;
      }
      .gx-avatar3d-shadow {
        position: absolute;
        left: 14%;
        right: 14%;
        bottom: 3%;
        height: 13%;
        border-radius: 50%;
        background: #0008;
        filter: blur(2px);
      }
      .gx-avatar3d-figure {
        position: absolute;
        inset: 0;
        transform: rotateY(var(--gx3d-tilt));
        transform-origin: 50% 72%;
        animation: gxAvatar3DIdle 3.8s ease-in-out infinite;
      }
      .gx-avatar3d-legs {
        position: absolute;
        left: 31%;
        right: 31%;
        bottom: 7%;
        height: 29%;
        display: flex;
        gap: 8%;
        justify-content: center;
        z-index: 1;
      }
      .gx-avatar3d-legs i {
        width: 37%;
        border-radius: 38% 38% 28% 28%;
        background: linear-gradient(90deg, #111519, #303437 52%, #0c0f11);
        box-shadow: inset 2px 0 2px #fff1;
      }
      .gx-avatar3d-torso {
        position: absolute;
        left: 21%;
        right: 21%;
        bottom: 22%;
        height: 42%;
        border-radius: 25% 25% 14% 14%;
        background: linear-gradient(100deg, #111416, #2b2e30 45%, #0d1012);
        box-shadow: inset 3px 0 5px #fff2, 0 3px 5px #0007;
        overflow: hidden;
      }
      .gx-avatar3d-lapel {
        position: absolute;
        top: 8%;
        width: 27%;
        height: 55%;
        border-left: 1px solid #c7a66e66;
      }
      .gx-avatar3d-lapel.left { left: 26%; transform: skewY(25deg); }
      .gx-avatar3d-lapel.right { right: 26%; transform: skewY(-25deg); }
      .gx-avatar3d-tie {
        position: absolute;
        top: 10%;
        left: 46%;
        width: 8%;
        height: 45%;
        background: linear-gradient(#c7a66e, #745c34);
        clip-path: polygon(35% 0, 65% 0, 100% 20%, 62% 100%, 38% 100%, 0 20%);
      }
      .gx-avatar3d-badge {
        position: absolute;
        right: 14%;
        top: 30%;
        width: 17%;
        aspect-ratio: 1;
        border-radius: 3px;
        background: #c7a66e;
        color: #151719;
        font: 700 45% Arial;
        text-align: center;
        line-height: 2;
      }
      .gx-avatar3d-neck {
        position: absolute;
        left: 42%;
        bottom: 57%;
        width: 16%;
        height: 12%;
        border-radius: 35%;
        background: linear-gradient(90deg, var(--gx3d-skin-dark), var(--gx3d-skin), var(--gx3d-skin-light));
        z-index: 2;
      }
      .gx-avatar3d-head {
        position: absolute;
        left: 27%;
        right: 27%;
        top: 13%;
        height: 44%;
        border-radius: 45% 45% 43% 43%;
        background: linear-gradient(100deg, var(--gx3d-skin-dark), var(--gx3d-skin) 42%, var(--gx3d-skin-light));
        box-shadow: inset -3px -2px 5px #0004, 2px 2px 5px #0007;
        z-index: 3;
      }
      .gx-avatar3d-hair {
        position: absolute;
        left: -4%;
        right: -4%;
        top: -9%;
        height: 43%;
        background: var(--gx3d-hair);
        box-shadow: inset 2px 2px 4px #fff2, 0 2px 3px #0007;
        z-index: 4;
        border-radius: 48% 48% 32% 32%;
      }
      .gx-avatar3d-hair.hair-afro,
      .gx-avatar3d-hair.hair-curls { top: -17%; height: 52%; border-radius: 50%; transform: scaleX(1.08); }
      .gx-avatar3d-hair.hair-bob,
      .gx-avatar3d-hair.hair-waves,
      .gx-avatar3d-hair.hair-long,
      .gx-avatar3d-hair.hair-ponytail { height: 57%; top: -11%; border-radius: 45% 45% 35% 35%; }
      .gx-avatar3d-ear {
        position: absolute;
        top: 42%;
        width: 13%;
        height: 22%;
        border-radius: 50%;
        background: var(--gx3d-skin);
      }
      .gx-avatar3d-ear.left { left: -8%; }
      .gx-avatar3d-ear.right { right: -8%; }
      .gx-avatar3d-eye {
        position: absolute;
        top: 48%;
        width: 11%;
        height: 8%;
        border-radius: 50%;
        background: #fff;
      }
      .gx-avatar3d-eye:after { content: ""; position: absolute; inset: 25%; border-radius: 50%; background: #171717; }
      .gx-avatar3d-eye.left { left: 24%; }
      .gx-avatar3d-eye.right { right: 24%; }
      .gx-avatar3d-mouth {
        position: absolute;
        left: 39%;
        top: 68%;
        width: 22%;
        height: 9%;
        border-bottom: 1.5px solid #7d3934;
        border-radius: 0 0 50% 50%;
      }
      .gx-avatar3d-beard {
        position: absolute;
        left: 20%;
        right: 20%;
        bottom: 5%;
        height: 28%;
        background: linear-gradient(#0000, var(--gx3d-hair));
        border-radius: 0 0 45% 45%;
        opacity: .72;
        z-index: 4;
      }
      .gx-avatar3d-glasses {
        position: absolute;
        left: 18%;
        right: 18%;
        top: 45%;
        height: 14%;
        z-index: 5;
        border: 1px solid #c7a66e;
        border-radius: 4px;
      }
      .gx-avatar3d-glasses.round { border-radius: 50%; }
      .gx-avatar3d-headset {
        position: absolute;
        left: -11%;
        right: -11%;
        top: 13%;
        height: 55%;
        border: 2px solid #34393c;
        border-bottom: 0;
        border-radius: 50%;
        z-index: 1;
      }
      .gx-avatar3d-cap {
        position: absolute;
        left: -4%;
        right: -4%;
        top: -12%;
        height: 23%;
        border-radius: 55% 55% 20% 20%;
        background: linear-gradient(90deg, #111416, #303538);
        z-index: 6;
      }
      .gx-avatar3d-hand {
        position: absolute;
        right: 10%;
        top: 24%;
        width: 17%;
        height: 29%;
        border-radius: 45%;
        background: linear-gradient(90deg, var(--gx3d-skin-dark), var(--gx3d-skin));
        z-index: 5;
        transform: rotate(-25deg);
        animation: gxAvatar3DWave .9s ease-in-out infinite alternate;
      }
      .gx-avatar3d-sit .gx-avatar3d-figure { transform: rotateY(var(--gx3d-tilt)) translateY(7%); transform-origin: 50% 72%; }
      .gx-avatar3d-wave .gx-avatar3d-hand { display: block; }
      .gx-avatar3d-walk .gx-avatar3d-legs i:first-child { animation: gxAvatar3DWalkA .55s ease-in-out infinite alternate; }
      .gx-avatar3d-walk .gx-avatar3d-legs i:last-child { animation: gxAvatar3DWalkB .55s ease-in-out infinite alternate; }
      .gx-avatar3d-sit .gx-avatar3d-legs { bottom: 12%; height: 22%; transform: skewX(-8deg); }
      @keyframes gxAvatar3DIdle { 0%,100% { transform: rotateY(var(--gx3d-tilt)) translateY(0); } 50% { transform: rotateY(var(--gx3d-tilt)) translateY(-2.5%); } }
      @keyframes gxAvatar3DWave { from { transform: rotate(-32deg); } to { transform: rotate(-8deg); } }
      @keyframes gxAvatar3DWalkA { from { transform: translateY(-3%); } to { transform: translateY(4%); } }
      @keyframes gxAvatar3DWalkB { from { transform: translateY(4%); } to { transform: translateY(-3%); } }
      @media (prefers-reduced-motion: reduce) {
        .gx-avatar3d-figure,
        .gx-avatar3d-hand,
        .gx-avatar3d-walk .gx-avatar3d-legs i { animation: none; }
      }
    `}</style>
  );
}
