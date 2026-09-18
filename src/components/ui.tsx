"use client";
import { useId, useEffect, useRef, type ReactNode, type ButtonHTMLAttributes } from "react";
import { Armchair, Monitor, Presentation, Coffee, ShieldCheck, X } from "lucide-react";
import { initials, type Direction, type AvatarAction } from "@/lib/workspace";
import { Avatar3D } from "@/components/avatar-3d";

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
  const avatarMember = { ...member, action: member.action || "idle", direction: member.direction || "dr" };
  const lastSeenMs = member.lastSeen ? Date.now() - new Date(member.lastSeen).getTime() : Number.POSITIVE_INFINITY;
  const presence = lastSeenMs > 60000 ? "offline" : (member.status || "available");
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
        // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitrária do perfil, sem dominio conhecido para o next/image
        <img src={photo} alt={initials(member.name || "")} loading="lazy" />
      ) : (
        <Avatar3D member={avatarMember} size={Math.max(15, Math.round(size * 0.94))} />
      )}
      {status && <i className={`presence-dot ${presence}`} aria-label={presence === "offline" ? "Offline" : presence === "busy" ? "Em foco" : presence === "away" ? "Ausente" : "Disponível"} title={presence === "offline" ? "Offline" : presence === "busy" ? "Em foco" : presence === "away" ? "Ausente" : "Disponível"} />}
      {ring && <i className="avatar-ring" />}
    </span>
  );
}

export type AvatarLike = {
  id?: string;
  /** URL de foto, se houver. Sem foto, o avatar 3D é a identidade visual. */
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
  lastSeen?: string | null;
};

/**
 * Compatibilidade de API para telas antigas.
 * O nome PixelAvatar permanece temporariamente para evitar alterações em cadeia,
 * mas o renderer entregue ao usuário é o Avatar3D em todo o aplicativo.
 */
export function PixelAvatar({
  member,
  size = 48,
  action,
  direction,
}: {
  member: AvatarLike;
  size?: number;
  own?: boolean;
  action?: AvatarAction;
  direction?: Direction;
  isMoving?: boolean;
  preview?: boolean;
  showRing?: boolean;
}) {
  const avatarMember = {
    ...member,
    action: action || member.action || "idle",
    direction: direction || member.direction || "dr",
  };
  return <Avatar3D member={avatarMember} size={size} />;
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