export type View = "office" | "rooms" | "team" | "agenda" | "director";
export type Direction = "dr" | "dl" | "ur" | "ul";
export type AvatarAction = "idle" | "walk" | "sit" | "wave";

/**
 * Camada de calibração fina por assento — o equivalente 2D do SeatAnchor.
 *
 * ATENÇÃO: este app é uma ilustração 2D, não um mundo 3D. Não existe metro,
 * bounding box nem rotação em graus; tudo aqui é ponto percentual da
 * ilustração, igual a `x` e `y` do assento. Os nomes seguem o vocabulário de
 * calibração (approach/seat/stand/rotation) para facilitar o ajuste, mas a
 * unidade é % do cenário.
 *
 * Todos os campos são opcionais. Sem `offsets` o assento se comporta como
 * antes da calibração: o avatar caminha até o ponto, senta nele e, ao
 * levantar, recua 2.5 em y.
 */
export type SeatOffsets = {
  /** Ajuste fino do ponto onde o avatar efetivamente senta. */
  seat?: { x: number; y: number };
  /** Ponto de aproximação: o avatar caminha até aqui ANTES de sentar. */
  approach?: { x: number; y: number };
  /** Ponto seguro para onde o avatar vai ao levantar. */
  stand?: { x: number; y: number };
  /** Sobrescreve a direção do assento quando a calculada não serve. */
  rotation?: Direction;
};

export type FurnitureSpot = {
  id: string;
  label: string;
  actionLabel: string;
  x: number;
  y: number;
  direction: Direction;
  type: "chair" | "desk" | "sofa" | "armchair" | "coffee";
  room: string;
  floor: 1 | 2;
  offsets?: SeatOffsets;
};

/** Recuo padrão ao levantar, usado quando o assento não define `stand`. */
const STAND_BACKOFF_Y = 2.5;

/**
 * Resolve os pontos de um assento aplicando os offsets de calibração.
 * Ajustar um assento aqui não altera nenhum outro.
 */
export function seatAnchor(spot: FurnitureSpot) {
  const seatX = spot.x + (spot.offsets?.seat?.x ?? 0);
  const seatY = spot.y + (spot.offsets?.seat?.y ?? 0);
  return {
    seat: { x: seatX, y: seatY },
    approach: {
      x: seatX + (spot.offsets?.approach?.x ?? 0),
      y: seatY + (spot.offsets?.approach?.y ?? 0),
    },
    stand: {
      x: seatX + (spot.offsets?.stand?.x ?? 0),
      y: Math.min(85, seatY + (spot.offsets?.stand?.y ?? STAND_BACKOFF_Y)),
    },
    rotation: spot.offsets?.rotation ?? spot.direction,
  };
}

export type Member = {
  id: string; name: string; role: string; company: string; avatar: string; color: string; avatarLook?: string | null;
  roomId: string; status: string; x: number; y: number; isDemo: boolean; isAdmin: boolean;
  canAccessGroupSystem: boolean; gender?: string | null; email?: string | null; accessToken?: string | null; handRaised: boolean;
  action?: AvatarAction; direction?: Direction; sittingOn?: string | null;
  callRoom: string | null; micEnabled: boolean; cameraEnabled: boolean; lastSeen?: string;
};
export const GENDER_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Feminino" },
];
export type RosterEntry = {
  id: string; name: string; role: string; company: string; avatar: string; color: string; avatarLook?: string | null;
  isAdmin: boolean; online: boolean;
};
export type Room = { id: string; name: string; description: string; kind: string; capacity: number; color: string };
export type Message = { id: string; senderId: string; roomId: string; content: string; createdAt: string; sender: Member };
export type Meeting = { id: string; title: string; description: string; roomId: string; startsAt: string; duration: number; organizerId: string };
export type Workspace = { me: Member; members: Member[]; team: Member[]; rooms: Room[]; messages: Message[]; meetings: Meeting[] };
export type AuthNeeded = { needsAuth: true; users: RosterEntry[]; inviteRequired: boolean };
export const ROOM_DATA: Room[] = [
  { id: "recepcao", name: "Recepção", description: "O começo de todas as boas conexões. Chegue, encontre a equipe e sinta-se em casa.", kind: "reception", capacity: 20, color: "#c7a66e" },
  { id: "coworking", name: "Coworking", description: "Ideias lado a lado. Seu espaço para trabalhar, colaborar e fazer acontecer.", kind: "work", capacity: 12, color: "#8faaa0" },
  { id: "estrategia", name: "Sala de estratégia", description: "Grandes decisões merecem um lugar à altura. Alinhe os próximos passos da sua empresa.", kind: "meeting", capacity: 8, color: "#c7a66e" },
  { id: "lounge", name: "Lounge & café", description: "Uma pausa, um café, uma nova ideia. Aqui, a conversa flui sem pauta.", kind: "lounge", capacity: 10, color: "#ba947b" },
  { id: "diretoria", name: "Sala da diretoria", description: "Foco no que importa. Um ambiente reservado para as conversas que transformam.", kind: "private", capacity: 6, color: "#9c93b5" },
];
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=96&h=96&q=80`;
export const DEFAULT_ME: Member = {
  id: "local", name: "Henrique Senna", role: "Fundador & CEO", company: "Grupo X",
  avatar: photo("photo-1472099645785-5658abf4ff4e"), color: "#c7a66e", roomId: "recepcao",
  status: "available", x: 61, y: 73, isDemo: false, isAdmin: false, canAccessGroupSystem: true, accessToken: null,
  handRaised: false, callRoom: null, micEnabled: false, cameraEnabled: false,
};
export const AVATAR_COLORS = [
  { value: "#c7a66e", name: "Dourado Grupo X" },
  { value: "#839c83", name: "Verde sálvia" },
  { value: "#7295a1", name: "Azul oceano" },
  { value: "#b29bc3", name: "Lilás" },
  { value: "#c58b77", name: "Terracota" },
  { value: "#c4c9ca", name: "Prata" },
  { value: "#7f8ea3", name: "Aço escuro" },
  { value: "#a97f86", name: "Rosé queimado" },
  { value: "#8a7f52", name: "Oliva" },
  { value: "#5f7f74", name: "Verde floresta" },
];
export const ROOM_POSITIONS: Record<string, { x: number; y: number }> = {
  recepcao: { x: 61, y: 73 }, coworking: { x: 61, y: 47 }, estrategia: { x: 42, y: 48 }, lounge: { x: 36, y: 68 }, diretoria: { x: 48, y: 39 },
};

/**
 * Assentos do andar 01, calibrados a partir de landmarks em pixels medidos
 * sobre a ilustração (referência 1366x768, convertida para % da cena).
 *
 * Sobre as direções: cada assento aponta para o centro funcional do seu
 * móvel. Os alvos usados foram os centroides de cada conjunto (estratégia e
 * coworking) e, no lounge, o centroide dos assentos existentes como
 * aproximação da mesa de centro. São inferências geométricas — conferir na
 * tela com /calibrar e, se algum ficar errado, corrigir com
 * `offsets.rotation` naquele assento só.
 */
export const FLOOR_1_FURNITURE: FurnitureSpot[] = [
  { id: "str-01", label: "Cadeira Estratégia 01", actionLabel: "Sentar na mesa de estratégia", x: 23, y: 46.06, direction: "ul", type: "chair", room: "estrategia", floor: 1 },
  { id: "str-02", label: "Cadeira Estratégia 02", actionLabel: "Sentar na mesa de estratégia", x: 29.86, y: 35.75, direction: "dr", type: "chair", room: "estrategia", floor: 1 },
  { id: "str-03", label: "Cadeira Estratégia 03", actionLabel: "Sentar na mesa de estratégia", x: 36.14, y: 35.19, direction: "dl", type: "chair", room: "estrategia", floor: 1 },
  { id: "str-04", label: "Cadeira Estratégia 04", actionLabel: "Sentar na mesa de estratégia", x: 25.86, y: 38.26, direction: "dl", type: "chair", room: "estrategia", floor: 1 },
  { id: "str-05", label: "Cadeira Estratégia 05", actionLabel: "Sentar na mesa de estratégia", x: 37.57, y: 41.04, direction: "ur", type: "chair", room: "estrategia", floor: 1 },
  { id: "str-06", label: "Cadeira Estratégia 06", actionLabel: "Sentar na mesa de estratégia", x: 22.43, y: 41.04, direction: "ul", type: "chair", room: "estrategia", floor: 1 },
  { id: "str-07", label: "Cadeira Estratégia 07", actionLabel: "Sentar na mesa de estratégia", x: 30, y: 47.17, direction: "ul", type: "chair", room: "estrategia", floor: 1 },
  { id: "cow-01", label: "Estação Coworking 01", actionLabel: "Sentar e trabalhar na estação", x: 68.14, y: 25.44, direction: "ur", type: "desk", room: "coworking", floor: 1 },
  { id: "cow-02", label: "Estação Coworking 02", actionLabel: "Sentar e trabalhar na estação", x: 61.86, y: 33.8, direction: "ur", type: "desk", room: "coworking", floor: 1 },
  { id: "cow-03", label: "Estação Coworking 03", actionLabel: "Sentar e trabalhar na estação", x: 68.81, y: 41.67, direction: "dl", type: "desk", room: "coworking", floor: 1 },
  { id: "cow-04", label: "Estação Coworking 04", actionLabel: "Sentar e trabalhar na estação", x: 76, y: 36.86, direction: "dr", type: "desk", room: "coworking", floor: 1 },
  { id: "cow-05", label: "Estação Coworking 05", actionLabel: "Sentar e trabalhar na estação", x: 78.86, y: 49.68, direction: "ul", type: "desk", room: "coworking", floor: 1 },
  { id: "cow-06", label: "Estação Coworking 06", actionLabel: "Sentar e trabalhar na estação", x: 70.71, y: 48.84, direction: "ul", type: "desk", room: "coworking", floor: 1 },
  { id: "lounge-sofa-01", label: "Sofá do Lounge — lugar 1", actionLabel: "Sentar no sofá", x: 33.71, y: 64.72, direction: "dr", type: "sofa", room: "lounge", floor: 1 },
  { id: "lounge-sofa-02", label: "Sofá do Lounge — lugar 2", actionLabel: "Sentar no sofá", x: 33.71, y: 44.11, direction: "dr", type: "sofa", room: "lounge", floor: 1 },
  { id: "lounge-sofa-03", label: "Sofá do Lounge — lugar 3", actionLabel: "Sentar no sofá", x: 38, y: 60.82, direction: "dr", type: "sofa", room: "lounge", floor: 1 },
  { id: "lounge-arm-01", label: "Poltrona do Lounge", actionLabel: "Sentar na poltrona", x: 43.86, y: 78.09, direction: "ur", type: "armchair", room: "lounge", floor: 1 },
  { id: "lounge-arm-02", label: "Poltrona do Café", actionLabel: "Sentar para tomar um café", x: 49.71, y: 70.57, direction: "ul", type: "armchair", room: "lounge", floor: 1 },
  { id: "f1-novo-1", label: "Novo ponto", actionLabel: "Sentar", x: 85, y: 45.78, direction: "ul", type: "chair", room: "recepcao", floor: 1 },
];

export const FLOOR_2_FURNITURE: FurnitureSpot[] = [
  { id: "f2-pres-desk", label: "Cadeira da Presidência", actionLabel: "Sentar na mesa presidencial de vidro", x: 37.29, y: 49.96, direction: "dr", type: "desk", room: "diretoria", floor: 2 },
  { id: "f2-guest-1", label: "Poltrona Executiva 1", actionLabel: "Sentar como convidado", x: 77, y: 53.86, direction: "dr", type: "armchair", room: "diretoria", floor: 2 },
  { id: "f2-guest-2", label: "Poltrona Executiva 2", actionLabel: "Sentar como convidado", x: 71, y: 51.07, direction: "dl", type: "armchair", room: "diretoria", floor: 2 },
  { id: "f2-sofa", label: "Sofá Executivo Privado", actionLabel: "Sentar no lounge executivo", x: 42.86, y: 61.1, direction: "ul", type: "sofa", room: "diretoria", floor: 2 },
  { id: "f2-armchair", label: "Poltrona Relax", actionLabel: "Sentar na poltrona executiva", x: 49.43, y: 56.92, direction: "ur", type: "armchair", room: "diretoria", floor: 2 },
];
export const COMPANY_DATA = [
  { name: "Grupo X", category: "Ecossistema empresarial", description: "Construindo empresas. Desenvolvendo empresários. Criando oportunidades.", color: "#c7a66e" },
  { name: "Senna Cell X", category: "Tecnologia & inovação", description: "Tecnologia aplicada para conectar pessoas, empresas e inovação. Soluções de varejo, serviços e conectividade.", color: "#aeb9c2" },
  { name: "Grupo Reis X", category: "Serviços empresariais", description: "Excelência operacional com foco em eficiência, organização e execução consistente.", color: "#87a195" },
  { name: "Primeiro Passo X", category: "Desenvolvimento humano", description: "Recrutamento e desenvolvimento humano para preparar profissionais e conectar talentos a oportunidades globais.", color: "#9c95b4" },
  { name: "Mazari Trading X", category: "Mercado financeiro", description: "Informação e inteligência de mercado para quem investe no próximo capítulo.", color: "#9bacba" },
];
export const STATUS_LABELS: Record<string, string> = { available: "Disponível", busy: "Em foco", away: "Ausente" };
export function initials(name: string) { return name.split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join(""); }
export function timeLabel(date: string | Date) { return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
export function dayLabel(date: string | Date) { return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); }
export function isOnline(lastSeen?: string | Date | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 60000;
}
export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || "Não foi possível concluir. Tente novamente.") as Error & { status?: number; data?: unknown };
    error.status = response.status; error.data = body;
    throw error;
  }
  return body as T;
}
