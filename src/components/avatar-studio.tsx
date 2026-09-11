"use client";
import { useState } from "react";
import { Check, Dice5, RotateCcw, Sparkles } from "lucide-react";
import { PixelAvatar } from "@/components/ui";
import { AVATAR_COLORS } from "@/lib/workspace";
import {
  ACCESSORY_STYLES, AVATAR_PRESETS, DEFAULT_LOOK, EXPRESSION_STYLES, FACIAL_STYLES, GLASSES_STYLES,
  HAIR_COLORS, HAIR_STYLES, OUTFIT_STYLES, SKIN_TONES, defaultLookFor, presetLook, randomLook, serializeLook, withLook,
  type AvatarLook,
} from "@/lib/avatar";

type Preview = "idle" | "sit" | "wave";
type View = "front" | "back";

/**
 * Estúdio do avatar: palco com o sprite grande, previas ao vivo de cada opção
 * e presets prontos. Toda escolha vira um `AvatarLook`, serializado no perfil.
 */
export function AvatarStudio({
  look,
  color,
  gender,
  onChange,
  onColor,
}: {
  look: AvatarLook;
  color: string;
  gender?: string | null;
  onChange: (look: AvatarLook) => void;
  onColor: (color: string) => void;
}) {
  const [tab, setTab] = useState<"corpo" | "cabelo" | "roupa" | "extras">("corpo");
  const [preview, setPreview] = useState<Preview>("idle");
  const [view, setView] = useState<View>("front");

  const memberFor = (next: AvatarLook) => ({ id: "studio", name: "Studio", color, gender, avatarLook: serializeLook(next) });
  const pick = (patch: Partial<AvatarLook>) => onChange(withLook(look, patch));
  const tabs = [
    { id: "corpo" as const, label: "Pele & rosto" },
    { id: "cabelo" as const, label: "Cabelo" },
    { id: "roupa" as const, label: "Roupa" },
    { id: "extras" as const, label: "Detalhes" },
  ];

  return (
    <div className="avatar-studio">
      <div className="avatar-stage">
        <div className="stage-light" />
        <div className="stage-floor" />
        <PixelAvatar
          member={memberFor(look)}
          size={148}
          own
          preview={false}
          action={preview === "idle" ? (view === "back" ? "idle" : "idle") : preview}
          direction={view === "back" ? "ur" : "dr"}
        />
        <div className="stage-tools" role="group" aria-label="Prévia do avatar">
          {([["front", "Frente"], ["back", "Costas"]] as [View, string][]).map(([id, label]) => (
            <button key={id} type="button" className={view === id ? "on" : ""} onClick={() => setView(id)}>{label}</button>
          ))}
          <i />
          {([["idle", "Em pé"], ["sit", "Sentado"], ["wave", "Acenando"]] as [Preview, string][]).map(([id, label]) => (
            <button key={id} type="button" className={preview === id ? "on" : ""} onClick={() => setPreview(id)}>{label}</button>
          ))}
        </div>
        {look.aura && <span className="stage-aura-note"><Sparkles size={11} /> aura dourada ativa</span>}
      </div>

      <div className="avatar-controls">
        <div className="studio-tabs" role="tablist" aria-label="Partes do avatar">
          {tabs.map(item => (
            <button key={item.id} role="tab" type="button" aria-selected={tab === item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </div>

        {tab === "corpo" && (
          <>
            <StudioRow label="Tom de pele">
              {SKIN_TONES.map((tone, index) => (
                <SpriteOption key={tone.name} label={tone.name} selected={look.skin === index} member={memberFor({ ...look, skin: index })} onClick={() => pick({ skin: index })} />
              ))}
            </StudioRow>
            <StudioRow label="Expressão">
              {EXPRESSION_STYLES.map(item => (
                <ChipOption key={item.id} label={item.label} selected={look.expression === item.id} onClick={() => pick({ expression: item.id })} />
              ))}
            </StudioRow>
          </>
        )}

        {tab === "cabelo" && (
          <>
            <StudioRow label="Penteado">
              {HAIR_STYLES.map(item => (
                <SpriteOption key={item.id} label={item.label} selected={look.hair === item.id} member={memberFor({ ...look, hair: item.id })} onClick={() => pick({ hair: item.id })} />
              ))}
            </StudioRow>
            <StudioRow label="Cor do cabelo">
              <div className="swatch-row">
                {HAIR_COLORS.map(item => (
                  <button key={item.value} type="button" className={look.hairColor === item.value ? "on" : ""} style={{ background: item.value }} aria-label={item.name} title={item.name} onClick={() => pick({ hairColor: item.value })}>
                    {look.hairColor === item.value && <Check size={13} />}
                  </button>
                ))}
              </div>
            </StudioRow>
            <StudioRow label="Barba">
              {FACIAL_STYLES.map(item => (
                <ChipOption key={item.id} label={item.label} selected={look.facial === item.id} onClick={() => pick({ facial: item.id })} />
              ))}
            </StudioRow>
          </>
        )}

        {tab === "roupa" && (
          <>
            <StudioRow label="Traje">
              {OUTFIT_STYLES.map(item => (
                <SpriteOption key={item.id} label={item.label} hint={item.hint} selected={look.outfit === item.id} member={memberFor({ ...look, outfit: item.id })} onClick={() => pick({ outfit: item.id })} />
              ))}
            </StudioRow>
            <StudioRow label="Cor do traje">
              <div className="swatch-row">
                {AVATAR_COLORS.map(item => (
                  <button key={item.value} type="button" className={color === item.value ? "on" : ""} style={{ background: item.value }} aria-label={item.name} title={item.name} onClick={() => onColor(item.value)}>
                    {color === item.value && <Check size={13} />}
                  </button>
                ))}
              </div>
            </StudioRow>
          </>
        )}

        {tab === "extras" && (
          <>
            <StudioRow label="Óculos">
              {GLASSES_STYLES.map(item => (
                <ChipOption key={item.id} label={item.label} selected={look.glasses === item.id} onClick={() => pick({ glasses: item.id })} />
              ))}
            </StudioRow>
            <StudioRow label="Acessório">
              {ACCESSORY_STYLES.map(item => (
                <ChipOption key={item.id} label={item.label} selected={look.accessory === item.id} onClick={() => pick({ accessory: item.id })} />
              ))}
            </StudioRow>
            <StudioRow label="Presença">
              <button type="button" className={`aura-toggle ${look.aura ? "on" : ""}`} onClick={() => pick({ aura: !look.aura })}>
                <span className="aura-dot" />
                <span><strong>Aura dourada</strong><small>Realça você no mapa e ilumina o avatar em qualquer tela.</small></span>
              </button>
            </StudioRow>
          </>
        )}

        <StudioRow label="Comece de um visual pronto">
          {AVATAR_PRESETS.map(item => (
            <SpriteOption key={item.id} label={item.label} hint={item.hint} selected={false} member={memberFor(presetLook(item.id, look))} onClick={() => onChange(presetLook(item.id, look))} />
          ))}
        </StudioRow>

        <div className="studio-actions">
          <button type="button" className="button button-secondary" onClick={() => onChange(randomLook())}><Dice5 size={15} /> Surpreenda-me</button>
          <button type="button" className="button button-quiet" onClick={() => { onChange({ ...DEFAULT_LOOK }); onColor(AVATAR_COLORS[0].value); }}><RotateCcw size={14} /> Restaurar padrão</button>
        </div>
      </div>
    </div>
  );
}

function StudioRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="studio-row">
      <span className="studio-row-label">{label}</span>
      <div className="studio-options">{children}</div>
    </div>
  );
}

function SpriteOption({ label, hint, selected, member, onClick }: { label: string; hint?: string; selected: boolean; member: { id: string; name: string; color: string; gender?: string | null; avatarLook: string }; onClick: () => void }) {
  return (
    <button type="button" className={`sprite-option ${selected ? "on" : ""}`} onClick={onClick} title={hint || label} aria-label={label} aria-pressed={selected}>
      <span className="sprite-option-art">
        <PixelAvatar member={member} size={54} preview />
      </span>
      <span className="sprite-option-label">{label}</span>
      {selected && <Check size={12} className="sprite-option-check" />}
    </button>
  );
}

function ChipOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`chip-option ${selected ? "on" : ""}`} onClick={onClick} aria-pressed={selected}>
      {selected && <Check size={12} />}
      {label}
    </button>
  );
}

/**
 * Versão compacta do estúdio para telas sem modal (primeiro acesso e
 * cadastro pelo painel administrativo): escolhe sexo, preset, cor e sorteia.
 */
export function AvatarQuickPick({
  look,
  color,
  gender,
  onLook,
  onColor,
  onGender,
  title = "Seu avatar",
}: {
  look: AvatarLook;
  color: string;
  gender: string;
  onLook: (look: AvatarLook) => void;
  onColor: (color: string) => void;
  onGender?: (gender: string) => void;
  title?: string;
}) {
  const member = { id: "quick", name: "Quick", color, gender, avatarLook: serializeLook(look) };
  return (
    <div className="avatar-quickpick">
      <div className="quickpick-preview">
        <PixelAvatar member={member} size={96} own />
      </div>
      <div className="quickpick-controls">
        <span className="studio-row-label">{title}</span>
        {onGender && (
          <div className="quickpick-gender">
            {[{ value: "male", label: "Masculino" }, { value: "female", label: "Feminino" }].map(option => (
              <button key={option.value} type="button" className={gender === option.value ? "on" : ""} onClick={() => onGender(option.value)}>
                <PixelAvatar member={{ ...member, gender: option.value, avatarLook: serializeLook(defaultLookFor(option.value)) }} size={38} preview />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        )}
        <div className="quickpick-presets">
          {AVATAR_PRESETS.map(preset => (
            <button key={preset.id} type="button" title={preset.hint} onClick={() => onLook(presetLook(preset.id, look))}>
              <PixelAvatar member={{ ...member, avatarLook: serializeLook(presetLook(preset.id, look)) }} size={44} preview />
            </button>
          ))}
        </div>
        <div className="quickpick-foot">
          <div className="swatch-row">
            {AVATAR_COLORS.map(item => (
              <button key={item.value} type="button" className={color === item.value ? "on" : ""} style={{ background: item.value }} aria-label={item.name} title={item.name} onClick={() => onColor(item.value)}>
                {color === item.value && <Check size={12} />}
              </button>
            ))}
          </div>
          <button type="button" className="quickpick-dice" onClick={() => onLook(randomLook())} title="Sortear um visual diferente">
            <Dice5 size={14} /> Sortear
          </button>
        </div>
      </div>
    </div>
  );
}
