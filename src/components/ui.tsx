"use client";
import { useId, useMemo, useEffect, useRef, type ReactNode, type ButtonHTMLAttributes } from "react";
import { Armchair, Monitor, Presentation, Coffee, ShieldCheck, X } from "lucide-react";
import { initials, type Direction, type AvatarAction } from "@/lib/workspace";
import { buildSprite, LAYER_NAMES, SPRITE_W, SPRITE_H, type LayerName } from "@/lib/avatar-sprite";
import { parseLook, hashId, GOLD, GOLD_LIGHT } from "@/lib/avatar";

export function BrandMark({ size = 44 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-label="Grupo X">
      <defs>
        <linearGradient id={`${id}a`} x1="7" y1="9" x2="45" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5DFAC" />
          <stop offset=".36" stopColor="#C6A068" />
          <stop offset=".53" stopColor="#F0D7A0" />
          <stop offset="1" stopColor="#957040" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="38" y1="7" x2="12" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EBD19A" />
          <stop offset=".5" stopColor="#99703C" />
          <stop offset="1" stopColor="#DBBD82" />
        </linearGradient>
      </defs>
      <path d="M12 8A22 22 0 0 1 40 8M47 17A22 22 0 0 1 46 37M39 46A22 22 0 0 1 13 45M6 36A22 22 0 0 1 6 16" stroke={`url(#${id}a)`} strokeWidth="1.2" />
      <path d="M36 8H47L16 45H5L36 8Z" fill={`url(#${id}b)`} />
      <path d="M5 8H17L47 45H35L5 8Z" fill={`url(#${id}a)`} />
      <path d="M7 9L36 44M17 9L46 44" stroke="#F8E6BD" strokeWidth=".5" opacity=".7" />
    </svg>
  );
}

export function Avatar({
  member,
  size = 34,
  status = false,
  className = "",
  ring = false,
}: {
  member: AvatarLike;
  size?: number;
  status?: boolean;
  className?: string;
  ring?: boolean;
}) {
  const photo = member.avatar && /^https?:\/\//.test(member.avatar) ? member.avatar : "";
  return (
    <span
      className={`avatar ${photo ? "has-photo" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 22%, ${member.color}30, ${member.color}0e 52%, #14161700 76%), linear-gradient(180deg, #202325, #191b1c)`,
        borderColor: `${member.color}55`,
      }}
    >
      <span className="avatar-plate" />
      {photo ? (
        <img src={photo} alt={initials(member.name || "")} loading="lazy" />
      ) : (
        <PixelAvatar
          member={{ ...member, action: member.action || "idle", direction: member.direction || "dr" }}
          size={Math.max(15, Math.round(size * 0.94))}
          preview={size < 30}
        />
      )}
      {status && <i className={`presence-dot ${member.status || "available"}`} />}
      {ring && <i className="avatar-ring" />}
    </span>
  );
}

export type AvatarLike = {
  id?: string;
  /** URL de foto, se houver. Sem foto, o sprite pixel do avatar é a identidade. */
  avatar?: string | null;
  name?: string;
  color: string;
  gender?: string | null;
  status?: string;
  handRaised?: boolean;
  action?: AvatarAction;
  direction?: Direction;
  micEnabled?: boolean;
  isAdmin?: boolean;
  avatarLook?: string | null;
};

const INK = "#0b0e10";

/**
 * Sprite do avatar. Toda a arte vem de `buildSprite` (camadas de pixels);
 * aqui entram só as camadas animadas, o contorno por dilatação de alpha
 * (feMorphology), a luz de recorte dourada e a sombra de chão suavizada.
 */
export function PixelAvatar({
  member,
  size = 48,
  own = false,
  action,
  direction,
  isMoving = false,
  preview = false,
  showRing,
}: {
  member: AvatarLike;
  size?: number;
  own?: boolean;
  action?: AvatarAction;
  direction?: Direction;
  isMoving?: boolean;
  /** Modo vitrine: sem animação, sem contorno e sem indicadores flutuantes. */
  preview?: boolean;
  showRing?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const seed = member.id || member.name || "";
  const look = useMemo(() => parseLook(member.avatarLook, seed), [member.avatarLook, seed]);
  const currentAction = action || member.action || "idle";
  const currentDir = direction || member.direction || "dr";
  const isBack = currentDir === "ul" || currentDir === "ur";
  const isFlipped = currentDir === "dl" || currentDir === "ul";
  const sitting = currentAction === "sit";
  const walking = isMoving || currentAction === "walk";
  const waving = !!member.handRaised || currentAction === "wave";
  const speaking = !!member.micEnabled;
  const fine = size >= 40;
  // os olhos apontam para onde a pessoa está virada (em coordenadas locais: o espelhamento inverte o sinal)
  const facing = currentDir === "dr" || currentDir === "ur" ? 1 : currentDir === "dl" || currentDir === "ul" ? -1 : 0;
  const pupilShift = isFlipped ? -facing * 0.5 : facing * 0.5;
  const sprite = useMemo(
    () => buildSprite({ look, view: isBack ? "back" : "front", sitting, walking, waving, admin: member.isAdmin === true, fine, suit: member.color || GOLD, pupilShift }),
    [look, isBack, sitting, walking, waving, member.isAdmin, fine, member.color, pupilShift]
  );
  const inkOn = !preview && size >= 26;
  const halo = own || look.aura;
  const seedOffset = -(hashId(seed) % 41) / 10;
  const shadow = sprite.shadow;
  const ratio = SPRITE_W / SPRITE_H;
  const cls = [
    "pixel-avatar-wrapper",
    own ? "is-own" : "",
    preview ? "is-preview" : "",
    sitting ? "is-sitting" : "",
    walking && !preview ? "is-walking" : "",
    !walking && !sitting && !preview ? "is-idle" : "",
    waving ? "is-waving" : "",
    speaking ? "is-speaking" : "",
    halo ? "has-halo" : "",
    showRing ? "has-ring" : "",
  ].filter(Boolean).join(" ");

  return (
    <span className={cls} style={{ width: size * ratio, height: size, ["--av-color" as string]: member.color || GOLD }}>
      <svg viewBox={`0 0 ${SPRITE_W} ${SPRITE_H}`} width="100%" height="100%" shapeRendering="crispEdges" className="pixel-avatar-svg" aria-hidden="true" style={{ overflow: "visible" }}>
        <defs>
          <filter id={`${uid}-ink`} x="-14%" y="-10%" width="128%" height="122%" colorInterpolationFilters="sRGB">
            <feMorphology in="SourceAlpha" operator="dilate" radius={inkOn ? 0.55 : 0} result="fat" />
            <feFlood floodColor={INK} floodOpacity={0.9} result="ink" />
            <feComposite in="ink" in2="fat" operator="in" result="outline" />
            {halo ? (
              <>
                <feOffset in="fat" dx={-0.6} dy={-0.9} result="lift" />
                <feComposite in="lift" in2="SourceAlpha" operator="out" result="liftRim" />
                <feFlood floodColor={GOLD_LIGHT} floodOpacity="0.62" result="liftColor" />
                <feComposite in="liftColor" in2="liftRim" operator="in" result="rimLight" />
                <feMerge>
                  <feMergeNode in="outline" />
                  <feMergeNode in="rimLight" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </>
            ) : (
              <feMerge>
                <feMergeNode in="outline" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            )}
          </filter>
          <filter id={`${uid}-soft`} x="-40%" y="-60%" width="180%" height="240%">
            <feGaussianBlur stdDeviation="1.1" />
          </filter>
        </defs>

        {/* sombra de contato suave + halo de presença */}
        <g className="avatar-ground" filter={`url(#${uid}-soft)`}>
          {halo && <ellipse cx={shadow.cx} cy={shadow.cy} rx={shadow.rx + 3.4} ry={shadow.ry + 1.6} fill={GOLD} opacity="0.2" className="avatar-halo" />}
          <ellipse
            cx={shadow.cx}
            cy={shadow.cy}
            rx={shadow.rx}
            ry={shadow.ry}
            fill={own ? "#c7a66e" : "#05070a"}
            opacity={own ? 0.42 : 0.44}
            className="avatar-ground-shadow"
          />
        </g>

        <g className="avatar-figure" transform={isFlipped ? `translate(${SPRITE_W}, 0) scale(-1, 1)` : undefined} filter={inkOn ? `url(#${uid}-ink)` : undefined}>
          {LAYER_NAMES.map(name => (
            <g key={name} className={`av-layer av-${name}`} style={name === "eyes" ? { animationDelay: `${seedOffset}s` } : undefined}>
              {sprite.layers[name as LayerName].map((px, index) => (
                <rect key={index} x={px.x} y={px.y} width={px.w} height={px.h} fill={px.fill} opacity={px.o} rx={px.r} />
              ))}
            </g>
          ))}
        </g>
      </svg>

      {!preview && (
        <>
          {waving && <span className="wave-bubble">👋</span>}
          {speaking && (
            <span className="avatar-speaking-waves" title="Falando">
              <i /><i /><i />
            </span>
          )}
          {sitting && <span className="avatar-sitting-indicator" title="Sentado">🪑</span>}
        </>
      )}
    </span>
  );
}
export function RoomIcon({ kind, size = 18 }: { kind: string; size?: number }) {
  const Icon = ({ reception: Armchair, work: Monitor, meeting: Presentation, lounge: Coffee, private: ShieldCheck })[kind] || Armchair;
  return <Icon size={size} strokeWidth={1.65} />;
}

export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

export function Modal({
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
        ) || []
      );
    const timeout = setTimeout(() => focusable()[0]?.focus(), 40);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = focusable();
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      clearTimeout(timeout);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className={`modal-shell ${wide ? "modal-wide" : ""} ${className}`}>
        <div className="modal-heading">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2 id={id}>{title}</h2>
          </div>
          <IconButton label="Fechar janela" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
