"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CalendarDays, Check, Clock3, LoaderCircle, Mail, MessageCircle, Maximize2, PhoneOff, ShieldCheck, Video, Users, X } from "lucide-react";
import { PixelAvatar, BrandMark } from "@/components/ui";
import { PrejoinDialog, ActiveCallDialog } from "@/components/call-dialog";
import { OfficeMap } from "@/components/office-map";
import { api, ROOM_POSITIONS, type AvatarAction, type Direction, type Member, type Room, type Workspace } from "@/lib/workspace";
import { useCall, type CallController } from "@/hooks/use-call";

type Info = { valid: boolean; expiresAt: string; meeting: { id: string; title: string; description: string; startsAt: string; duration: number }; room: Room };
/** O que o endpoint do escritório de convidado devolve — nada além disso. */
type GuestOffice = { me: Member; members: Member[]; rooms: Room[] };
type Props = { token: string };

export default function ClientMeetingPage({ token }: Props) {
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<Member | null>(null);
  const [showPrejoin, setShowPrejoin] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [office, setOffice] = useState<GuestOffice | null>(null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("male");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const leaving = useRef(false);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMove = useRef(0);
  const notify = (message: string) => setError(message);
  const call = useCall(submitted || { id: "guest", name: "Visitante", role: "Cliente", company: "Visitante", avatar: "", color: "#c7a66e", roomId: "recepcao", status: "available", x: 61, y: 47, isDemo: false, isAdmin: false, canAccessGroupSystem: false, gender: "male", handRaised: false, callRoom: null, micEnabled: false, cameraEnabled: false }, () => {}, () => {});
  // Minimizar a chamada vira uma chamada de voz: o vídeo desliga, mas o
  // microfone não é tocado e a conexão continua de pé.
  const minimizeCall = () => {
    if (call.cameraOn) void call.toggleCamera();
    setCallOpen(false);
  };

  useEffect(() => {
    void api<Info>(`/api/client-invites?token=${encodeURIComponent(token)}`).then(setInfo).catch(err => setError(err instanceof Error ? err.message : "Este convite não está disponível.")).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const leave = () => {
      if (leaving.current) return;
      leaving.current = true;
      navigator.sendBeacon("/api/client-invites/leave", new Blob([JSON.stringify({ token })], { type: "application/json" }));
    };
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, [token]);

  useEffect(() => () => { if (moveTimer.current) clearTimeout(moveTimer.current); }, []);

  // Presença no escritório do convidado: enquanto a chamada está ativa e
  // minimizada, o mapa é o corpo da página e o GET serve de batimento extra
  // (durante o painel da chamada, o próprio /api/call já mantém lastSeen).
  // Movimento local muito recente vence o servidor, para o avatar não voltar
  // ao ponto antigo no meio de uma caminhada.
  useEffect(() => {
    if (!submitted || !call.roomId || callOpen) return;
    let stopped = false;
    const tick = async () => {
      try {
        const data = await api<GuestOffice>("/api/guest-office");
        if (stopped) return;
        const fresh = Date.now() - lastMove.current < 1200;
        setOffice(prev => prev && fresh ? { ...prev, members: data.members } : data);
      } catch {}
    };
    void tick();
    const timer = setInterval(() => void tick(), 2500);
    return () => { stopped = true; clearInterval(timer); };
  }, [submitted, call.roomId, callOpen]);

  // Movimento do avatar convidado: otimista no cliente e persistido com uma
  // pequena espera, igual ao comportamento do escritório da equipe. A divisão
  // de salas é a mesma fórmula do andar 01.
  const moveGuest = (x: number, y: number, action: AvatarAction = "idle", direction: Direction = "dr", sittingOn: string | null = null) => {
    const roomId = y < 55 ? (x < 49 ? "estrategia" : "coworking") : (x < 48 ? "lounge" : "recepcao");
    lastMove.current = Date.now();
    setOffice(prev => prev ? {
      ...prev,
      me: { ...prev.me, x, y, roomId, action, direction, sittingOn },
      members: prev.members.map(m => m.id === prev.me.id ? { ...m, x, y, roomId, action, direction, sittingOn } : m),
    } : prev);
    if (moveTimer.current) clearTimeout(moveTimer.current);
    moveTimer.current = setTimeout(() => {
      void api("/api/guest-office", { method: "PATCH", body: JSON.stringify({ x, y, roomId, action, direction, sittingOn }) }).catch(() => {});
    }, 180);
  };

  const patchGuest = (value: Partial<Member>) => {
    setOffice(prev => prev ? { ...prev, me: { ...prev.me, ...value } } : prev);
    void api("/api/guest-office", { method: "PATCH", body: JSON.stringify(value) }).catch(() => {});
  };

  const leaveMeeting = () => {
    if (moveTimer.current) clearTimeout(moveTimer.current);
    setOffice(null);
    void call.leave();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await api<{ guest: Member }>("/api/client-invites/claim", { method: "POST", body: JSON.stringify({ token, name, gender, whatsapp, email }) });
      setSubmitted(result.guest); setShowPrejoin(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível confirmar seus dados."); }
    finally { setBusy(false); }
  };

  if (loading) return <ClientShell><div className="client-loading"><LoaderCircle size={28} className="spin" /><span>Preparando seu convite…</span></div></ClientShell>;
  if (error && !info) return <ClientShell><div className="client-error"><span><X size={28} /></span><h1>Este convite não está disponível.</h1><p>{error}</p></div></ClientShell>;
  if (!info) return null;
  if (callOpen && submitted) return <><ClientShell><div className="client-call-backdrop"><div className="client-call-card"><BrandMark size={42}/><h1>Você está na reunião</h1><p>{info.meeting.title}</p><button className="button button-danger" onClick={() => { leaveMeeting(); setCallOpen(false); }}>Sair da reunião</button></div></div></ClientShell><ActiveCallDialog room={info.room} me={submitted} call={call} onMinimize={minimizeCall} onInvite={() => {}} volume={80}/></>;
  // Chamada minimizada: o convidado enxerga o escritório e move o próprio
  // avatar. Ao sair da reunião, volta para o cartão de confirmação.
  if (submitted && call.roomId && !callOpen) return <ClientShell>{office ? <GuestOfficeView office={office} call={call} room={info.room} onMove={moveGuest} onPatch={patchGuest} onBack={() => setCallOpen(true)} onLeave={leaveMeeting} /> : <div className="client-loading"><LoaderCircle size={28} className="spin" /><span>Abrindo o escritório…</span></div>}</ClientShell>;

  return <ClientShell>
    <div className="client-brand"><BrandMark size={46}/><span><strong>GX <b>HUB</b></strong><small>CONVITE DE REUNIÃO</small></span></div>
    <div className="client-layout">
      <section className="client-meeting-card">
        <span className="eyebrow"><span/>VOCÊ FOI CONVIDADO</span>
        <h1>{info.meeting.title}</h1>
        <p className="client-description">{info.meeting.description || "Uma conversa para compartilhar ideias, conectar possibilidades e construir próximos passos."}</p>
        <div className="client-meeting-details"><div><CalendarDays size={16}/><span>{new Date(info.meeting.startsAt).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span></div><div><Clock3 size={16}/><span>{new Date(info.meeting.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {info.meeting.duration} minutos</span></div><div><Users size={16}/><span>{info.room.name}</span></div></div>
        <div className="client-privacy"><ShieldCheck size={16}/><span>Seu convite dá acesso apenas a esta reunião.<br/>Ele expira ao fechar esta página.</span></div>
      </section>
      {!submitted ? <section className="client-form-card"><div className="client-form-heading"><span className="client-form-icon"><MessageCircle size={19}/></span><div><h2>Antes de entrar</h2><p>Preencha seus dados para confirmarmos sua participação.</p></div></div><form onSubmit={submit}>
        <label className="form-field"><span>Nome completo</span><input required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Como podemos chamar você?" autoComplete="name" /></label>
        <div className="form-field"><span>Como você se identifica?</span><div className="client-gender-options"><button type="button" className={gender === "male" ? "selected" : ""} onClick={() => setGender("male")}><PixelAvatar member={{ id: "guest-male", color: "#7295a1", gender: "male", handRaised: false }} size={45}/>Masculino</button><button type="button" className={gender === "female" ? "selected" : ""} onClick={() => setGender("female")}><PixelAvatar member={{ id: "guest-female", color: "#b29bc3", gender: "female", handRaised: false }} size={45}/>Feminino</button></div></div>
        <label className="form-field"><span>WhatsApp</span><input required value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" inputMode="tel" autoComplete="tel" /></label>
        <label className="form-field"><span>Email</span><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com" autoComplete="email" /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button type="submit" className="button button-primary full-width" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin"/> : <Check size={17}/>}Confirmar e entrar na reunião</button>
      </form><p className="client-form-footnote"><ShieldCheck size={12}/>Seus dados entram na base de relacionamento do Grupo X.</p></section> : <section className="client-confirmed-card"><span className="client-success"><Check size={25}/></span><h2>Dados confirmados.</h2><p>Olá, {submitted.name}. Sua participação está registrada.</p><button className="button button-primary full-width" onClick={() => setShowPrejoin(true)}><Video size={17}/>Entrar na reunião</button></section>}
    </div>
    <p className="client-footer">Grupo X · Gestão que direciona. Estratégia que multiplica.</p>
    {showPrejoin && submitted && <PrejoinDialog room={info.room} me={submitted} call={call} devices={{}} onClose={() => setShowPrejoin(false)} onJoined={() => { setShowPrejoin(false); setCallOpen(true); }} />}
  </ClientShell>;
}

/**
 * Escritório visto pelo convidado: o mesmo mapa do andar 01 (OfficeMap só lê
 * data.me, data.rooms e data.members), com os dados mínimos do endpoint de
 * convidado. Mic, câmera e compartilhamento continuam na barra do mapa,
 * operando sobre a chamada em que a pessoa já está.
 */
function GuestOfficeView({ office, call, room, onMove, onPatch, onBack, onLeave }: { office: GuestOffice; call: CallController; room: Room; onMove: (x: number, y: number, action?: AvatarAction, direction?: Direction, sittingOn?: string | null) => void; onPatch: (value: Partial<Member>) => void; onBack: () => void; onLeave: () => void }) {
  const [activeRoom, setActiveRoom] = useState("all");
  const [reaction, setReaction] = useState("");
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (reactionTimer.current) clearTimeout(reactionTimer.current); }, []);
  const data: Workspace = { ...office, team: [], messages: [], meetings: [] };
  const react = (emoji: string) => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    setReaction(emoji);
    reactionTimer.current = setTimeout(() => setReaction(""), 3000);
  };
  const visit = (id: string) => {
    if (id === "diretoria") return;
    setActiveRoom(id);
    const position = ROOM_POSITIONS[id];
    if (position) onMove(position.x, position.y);
  };
  return <>
    <div className="client-brand"><BrandMark size={46}/><span><strong>GX <b>HUB</b></strong><small>CONVITE DE REUNIÃO</small></span></div>
    <div className="guest-office">
      <OfficeMap data={data} activeRoom={activeRoom} onRoom={visit} onMove={onMove} onMember={() => {}} onJoin={onBack} onProfile={() => {}} onStatus={status => onPatch({ status })} onSettings={() => {}} onHand={() => onPatch({ handRaised: !office.me.handRaised })} onReaction={react} reaction={reaction} call={call} onOpenCall={onBack} />
      <div className="guest-office-bar">
        <div className="guest-office-info"><BrandMark size={30}/><span><strong>{office.me.name} está no escritório</strong><small>Reunião em {room.name} · ande pelo mapa, sente-se ou abra a chamada</small></span></div>
        <div className="guest-office-actions">
          <button className="button button-primary" onClick={onBack}><Maximize2 size={15}/>Ver chamada</button>
          <button className="button button-danger" onClick={onLeave}><PhoneOff size={15}/>Sair da reunião</button>
        </div>
      </div>
    </div>
    <p className="client-footer">Grupo X · Gestão que direciona. Estratégia que multiplica.</p>
  </>;
}

function ClientShell({ children }: { children: ReactNode }) {
  return <main className="client-shell">{children}</main>;
}
