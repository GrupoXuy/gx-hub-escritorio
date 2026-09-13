"use client";

import { useMemo, useRef, useState } from "react";
import { PixelAvatar } from "@/components/ui";
import { FLOOR_1_FURNITURE, FLOOR_2_FURNITURE, type FurnitureSpot, type Direction } from "@/lib/workspace";
import { presetLook, serializeLook } from "@/lib/avatar";

/**
 * Ferramenta de calibração das mobílias (somente desenvolvimento).
 *
 * Serve para marcar, em cima da própria ilustração, onde fica cada cadeira,
 * sofá, poltrona e mesa — e para qual lado cada uma aponta. A cena replica a
 * estrutura e as classes do mapa real (office-card > office-tabs >
 * office-scene > office-world), então o que aparece aqui é exatamente o que
 * aparece no escritório, incluindo o alongamento da ilustração e a escala
 * maior da diretoria.
 *
 * Como usar:
 *  - clique na ilustração para criar um ponto;
 *  - arraste um ponto para reposicioná-lo;
 *  - com um ponto selecionado, as setas movem 0,1% e Shift+setas movem 1%;
 *  - escolha a direção para o avatar sentar virado para o lado certo;
 *  - ao final, copie o código gerado e substitua em src/lib/workspace.ts.
 */

const DIRS: { value: Direction; label: string; hint: string }[] = [
  { value: "ur", label: "↗", hint: "cima-direita" },
  { value: "ul", label: "↖", hint: "cima-esquerda" },
  { value: "dr", label: "↘", hint: "baixo-direita" },
  { value: "dl", label: "↙", hint: "baixo-esquerda" },
];

const TYPES: FurnitureSpot["type"][] = ["chair", "desk", "sofa", "armchair", "coffee"];
const ROOMS_FLOOR_1 = ["recepcao", "coworking", "estrategia", "lounge"];
const ROOMS_FLOOR_2 = ["diretoria"];
const LOOK = serializeLook(presetLook("gx-executivo"));

function clone(floor: 1 | 2): FurnitureSpot[] {
  return (floor === 1 ? FLOOR_1_FURNITURE : FLOOR_2_FURNITURE).map((spot) => ({ ...spot }));
}

export function Calibrador() {
  const [floor, setFloor] = useState<1 | 2>(1);
  // Os dois andares ficam no mesmo estado e o andar visível é só uma leitura:
  // assim trocar de andar não precisa de efeito nem de setState em cascata.
  const [edits, setEdits] = useState<Record<1 | 2, FurnitureSpot[]>>(() => ({ 1: clone(1), 2: clone(2) }));
  const spots = edits[floor];
  const setSpots = (updater: (list: FurnitureSpot[]) => FurnitureSpot[]) =>
    setEdits((current) => ({ ...current, [floor]: updater(current[floor]) }));
  const [selected, setSelected] = useState<string | null>(null);
  const [showAvatars, setShowAvatars] = useState(true);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef<string | null>(null);
  // Contador em ref em vez de Date.now(): ids de pontos novos precisam ser
  // estáveis e a regra de pureza do React proíbe Date.now durante o render.
  const sequence = useRef(0);

  const positionFrom = (clientX: number, clientY: number) => {
    const rect = worldRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: +(((clientX - rect.left) / rect.width) * 100).toFixed(2),
      y: +(((clientY - rect.top) / rect.height) * 100).toFixed(2),
    };
  };

  const addSpot = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest("[data-marker]")) return;
    const { x, y } = positionFrom(event.clientX, event.clientY);
    sequence.current += 1;
    const id = `f${floor}-novo-${sequence.current}`;
    setSpots((current) => [
      ...current,
      {
        id,
        label: "Novo ponto",
        actionLabel: "Sentar",
        x,
        y,
        direction: "dr",
        type: "chair",
        room: floor === 1 ? "recepcao" : "diretoria",
        floor,
      },
    ]);
    setSelected(id);
  };

  const patch = (id: string, changes: Partial<FurnitureSpot>) =>
    setSpots((current) => current.map((spot) => (spot.id === id ? { ...spot, ...changes } : spot)));

  const nudge = (event: React.KeyboardEvent, id: string) => {
    const step = event.shiftKey ? 1 : 0.1;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    const spot = spots.find((item) => item.id === id);
    if (!spot) return;
    patch(id, { x: +(spot.x + move[0]).toFixed(2), y: +(spot.y + move[1]).toFixed(2) });
  };

  const code = useMemo(() => {
    const name = floor === 1 ? "FLOOR_1_FURNITURE" : "FLOOR_2_FURNITURE";
    const rows = spots.map(
      (spot) =>
        `  { id: ${JSON.stringify(spot.id)}, label: ${JSON.stringify(spot.label)}, actionLabel: ${JSON.stringify(
          spot.actionLabel
        )}, x: ${spot.x}, y: ${spot.y}, direction: ${JSON.stringify(spot.direction)}, type: ${JSON.stringify(
          spot.type
        )}, room: ${JSON.stringify(spot.room)}, floor: ${floor} },`
    );
    return `export const ${name}: FurnitureSpot[] = [\n${rows.join("\n")}\n];`;
  }, [spots, floor]);

  const current = spots.find((spot) => spot.id === selected) ?? null;
  const image = floor === 1 ? "/images/gx-office.jpg" : "/images/director-office.jpg";

  const panel: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) 320px",
    gap: 20,
    alignItems: "start",
    padding: 24,
  };
  const card: React.CSSProperties = {
    background: "#1c1e1f",
    border: "1px solid #2e3031",
    borderRadius: 9,
    padding: 14,
  };
  const label: React.CSSProperties = { display: "block", fontSize: 10, color: "#9aa0a2", marginBottom: 5 };
  const field: React.CSSProperties = {
    width: "100%",
    background: "#111313",
    border: "1px solid #393b3c",
    borderRadius: 5,
    color: "#e3e5e6",
    padding: "7px 9px",
    fontSize: 12,
  };
  const smallButton: React.CSSProperties = {
    background: "#26292a",
    border: "1px solid #3d4041",
    borderRadius: 5,
    color: "#d6d8d9",
    padding: "6px 9px",
    fontSize: 11,
    cursor: "pointer",
  };

  return (
    <main style={{ minHeight: "100dvh", background: "#141617", color: "#e3e5e6", fontFamily: "Manrope, sans-serif" }}>
      <header style={{ padding: "20px 24px 0" }}>
        <h1 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>Calibrar mobílias</h1>
        <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#9aa0a2", lineHeight: 1.7, maxWidth: 820 }}>
          Clique na ilustração para criar um ponto, arraste para mover e use as setas para ajuste fino
          (Shift+seta move 1%). O avatar aparece sentado virado para a direção escolhida — é assim que ele
          vai ficar no escritório. Quando terminar um andar, troque para o outro e copie o código gerado.
        </p>
      </header>

      <div style={panel}>
        <section className="office-card" style={{ margin: 0 }}>
          <div className="office-card-heading">
            <div className="office-heading-left">
              <div>
                <h2>
                  {floor === 1 ? "Andar 01 — Escritório" : "Andar 02 — Diretoria"} <span className="live-dot" />
                </h2>
                <p>{spots.length} pontos marcados</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                style={smallButton}
                onClick={() => {
                  setFloor((value) => (value === 1 ? 2 : 1));
                  setSelected(null);
                }}
              >
                Trocar para {floor === 1 ? "a diretoria" : "o escritório"}
              </button>
            </div>
          </div>

          <div className="office-tabs">
            <button className={showAvatars ? "active" : ""} onClick={() => setShowAvatars((value) => !value)}>
              {showAvatars ? "Avatares visíveis" : "Avatares ocultos"}
            </button>
            <span className="office-tabs-spacer" />
            <button
              onClick={() => {
                setSpots(() => clone(floor));
                setSelected(null);
              }}
            >
              Restaurar original
            </button>
          </div>

          <div className={`office-scene ${floor === 2 ? "director-scene" : ""}`}>
            <div
              className="office-world"
              ref={worldRef}
              onClick={addSpot}
              style={{ transform: "translate(-50%, -50%)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="office-illustration" src={image} alt="" draggable={false} />

              {spots.map((spot) => {
                const isSelected = spot.id === selected;
                return (
                  <span
                    key={spot.id}
                    data-marker
                    tabIndex={0}
                    className={`map-person is-seated ${isSelected ? "is-selected" : ""}`}
                    style={
                      {
                        left: `${spot.x}%`,
                        top: `${spot.y}%`,
                        zIndex: Math.round(spot.y) + 5,
                        "--person-color": isSelected ? "#e3b23c" : "#c7a66e",
                        outline: isSelected ? "1px dashed #e3b23c" : "none",
                        outlineOffset: 3,
                        cursor: "grab",
                        touchAction: "none",
                      } as React.CSSProperties
                    }
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      dragging.current = spot.id;
                      setSelected(spot.id);
                    }}
                    onPointerMove={(event) => {
                      if (dragging.current !== spot.id) return;
                      const { x, y } = positionFrom(event.clientX, event.clientY);
                      patch(spot.id, { x, y });
                    }}
                    onPointerUp={() => {
                      dragging.current = null;
                    }}
                    onKeyDown={(event) => nudge(event, spot.id)}
                  >
                    {showAvatars ? (
                      <PixelAvatar
                        member={{
                          id: spot.id,
                          name: spot.label,
                          color: "#c7a66e",
                          avatarLook: LOOK,
                          direction: spot.direction,
                          action: "sit",
                          isAdmin: false,
                        }}
                        size={48}
                        action="sit"
                        direction={spot.direction}
                      />
                    ) : (
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: isSelected ? "#e3b23c" : "#c7a66e",
                          border: "2px solid #141617",
                        }}
                      />
                    )}
                    <span className="person-name">{spot.label}</span>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="office-toolbar" />
        </section>

        <aside style={{ display: "grid", gap: 14 }}>
          <div style={card}>
            <strong style={{ fontSize: 12 }}>Pontos ({spots.length})</strong>
            <div style={{ marginTop: 10, display: "grid", gap: 4, maxHeight: 240, overflow: "auto" }}>
              {spots.map((spot) => (
                <button
                  key={spot.id}
                  onClick={() => setSelected(spot.id)}
                  style={{
                    ...smallButton,
                    textAlign: "left",
                    borderColor: spot.id === selected ? "#c7a66e" : "#3d4041",
                    background: spot.id === selected ? "#312c20" : "#26292a",
                  }}
                >
                  {spot.label} — {spot.x}, {spot.y} — {spot.direction}
                </button>
              ))}
            </div>
          </div>

          {current ? (
            <div style={card}>
              <strong style={{ fontSize: 12 }}>Ponto selecionado</strong>
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <label>
                  <span style={label}>Identificador</span>
                  <input style={field} value={current.id} onChange={(event) => patch(current.id, { id: event.target.value })} />
                </label>
                <label>
                  <span style={label}>Nome</span>
                  <input style={field} value={current.label} onChange={(event) => patch(current.id, { label: event.target.value })} />
                </label>
                <label>
                  <span style={label}>Texto do botão</span>
                  <input
                    style={field}
                    value={current.actionLabel}
                    onChange={(event) => patch(current.id, { actionLabel: event.target.value })}
                  />
                </label>
                <div>
                  <span style={label}>Direção em que a mobília aponta</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>
                    {DIRS.map((dir) => (
                      <button
                        key={dir.value}
                        title={dir.hint}
                        onClick={() => patch(current.id, { direction: dir.value })}
                        style={{
                          ...smallButton,
                          fontSize: 15,
                          borderColor: current.direction === dir.value ? "#c7a66e" : "#3d4041",
                          background: current.direction === dir.value ? "#312c20" : "#26292a",
                        }}
                      >
                        {dir.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label>
                  <span style={label}>Tipo</span>
                  <select style={field} value={current.type} onChange={(event) => patch(current.id, { type: event.target.value as FurnitureSpot["type"] })}>
                    {TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span style={label}>Ambiente</span>
                  <select style={field} value={current.room} onChange={(event) => patch(current.id, { room: event.target.value })}>
                    {(floor === 1 ? ROOMS_FLOOR_1 : ROOMS_FLOOR_2).map((room) => (
                      <option key={room} value={room}>
                        {room}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ ...field, flex: 1 }}>x {current.x}</span>
                  <span style={{ ...field, flex: 1 }}>y {current.y}</span>
                </div>
                <button
                  style={{ ...smallButton, borderColor: "#6b3a3a", color: "#e8b4b4" }}
                  onClick={() => {
                    setSpots((list) => list.filter((spot) => spot.id !== current.id));
                    setSelected(null);
                  }}
                >
                  Remover ponto
                </button>
              </div>
            </div>
          ) : (
            <div style={card}>
              <span style={{ fontSize: 11.5, color: "#9aa0a2" }}>
                Clique em um ponto da lista ou na ilustração para editar.
              </span>
            </div>
          )}

          <div style={card}>
            <strong style={{ fontSize: 12 }}>Código gerado</strong>
            <textarea
              readOnly
              value={code}
              style={{ ...field, marginTop: 10, height: 220, fontFamily: "monospace", fontSize: 10.5, lineHeight: 1.5 }}
            />
            <button
              style={{ ...smallButton, marginTop: 8, width: "100%" }}
              onClick={() => navigator.clipboard?.writeText(code)}
            >
              Copiar código
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
