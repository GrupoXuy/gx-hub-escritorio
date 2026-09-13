"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CalendarDays, Check, Clock3, LoaderCircle, Mail, MessageCircle, ShieldCheck, Video, Users, X } from "lucide-react";
import { PixelAvatar, BrandMark } from "@/components/ui";
import { PrejoinDialog, ActiveCallDialog } from "@/components/call-dialog";
import { api, type Member, type Room } from "@/lib/workspace";
import { useCall } from "@/hooks/use-call";

type Info = { valid: boolean; expiresAt: string; meeting: { id: string; title: string; description: string; startsAt: string; duration: number }; room: Room };
type Props = { token: string };

export default function ClientMeetingPage({ token }: Props) {
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<Member | null>(null);
  const [showPrejoin, setShowPrejoin] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("male");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const leaving = useRef(false);
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
  if (callOpen && submitted) return <><ClientShell><div className="client-call-backdrop"><div className="client-call-card"><BrandMark size={42}/><h1>Você está na reunião</h1><p>{info.meeting.title}</p><button className="button button-danger" onClick={() => { void call.leave(); setCallOpen(false); }}>Sair da reunião</button></div></div></ClientShell><ActiveCallDialog room={info.room} me={submitted} call={call} onMinimize={() => setCallOpen(false)} onInvite={() => {}} volume={80}/></>;

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

function ClientShell({ children }: { children: ReactNode }) {
  return <main className="client-shell">{children}</main>;
}
