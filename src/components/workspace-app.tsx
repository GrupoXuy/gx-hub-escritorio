"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, Video, Users, CalendarDays, ChevronRight, ChevronsUpDown, ArrowUpRight, UserPlus, Search, Bell, CircleHelp, Menu, X, Clock3, UserRoundPen, Plus, Wifi, WifiOff, Settings2, Sparkles, Check, Info, PhoneOff, Maximize2, Headphones, ShieldCheck, LogOut, Globe2, LoaderCircle } from "lucide-react";
import { BrandMark, Avatar, IconButton } from "@/components/ui";
import { OfficeMap } from "@/components/office-map";
import { SocialPanel } from "@/components/social-panel";
import { MeetingsPreview, RoomsView, TeamView, AgendaView } from "@/components/workspace-views";
import { DirectorRoom } from "@/components/director-room";
import { ProfileDialog, InviteDialog, ScheduleDialog, MeetingDialog, MemberDialog, SettingsDialog, HelpDialog, SearchDialog, CompanyDialog, DEFAULT_PREFERENCES, type Preferences } from "@/components/dialogs";
import { PrejoinDialog, ActiveCallDialog } from "@/components/call-dialog";
import { AuthGate } from "@/components/auth-gate";
import { UsersDialog } from "@/components/users-dialog";
import { ClientInviteDialog } from "@/components/client-invite-dialog";
import { LeadsDialog } from "@/components/leads-dialog";
import { EcosystemNav } from "@/components/ecosystem-nav";
import type { EcosystemCompany } from "@/lib/ecosystem";
import { useWorkspace } from "@/hooks/use-workspace";
import { useCall } from "@/hooks/use-call";
import { api, ROOM_POSITIONS, STATUS_LABELS, timeLabel, type View, type Room, type Member, type Meeting, type Message, type Direction, type AvatarAction } from "@/lib/workspace";

type Dialog = { type: "profile" | "invite" | "schedule" | "settings" | "help" | "search" | "users" | "leads" } | { type: "member"; member: Member } | { type: "meeting"; meeting: Meeting } | { type: "clientInvite"; meeting: Meeting } | { type: "join"; room: Room } | { type: "company"; name?: string } | null;
const NAV = [{ id: "office" as const, label: "Escritório virtual", icon: Building2 }, { id: "rooms" as const, label: "Salas de reunião", icon: Video }, { id: "team" as const, label: "Equipe", icon: Users }, { id: "agenda" as const, label: "Agenda", icon: CalendarDays }];
const HEADINGS: Record<View, { eyebrow: string; title: string; description: string }> = {
  office: { eyebrow: "PESSOAS. CONEXÕES. POSSIBILIDADES.", title: "Juntos, de onde você estiver.", description: "Um só ecossistema. Pessoas, ideias e resultados conectados." },
  rooms: { eyebrow: "ESPAÇOS QUE APROXIMAM", title: "Toda boa conversa tem seu lugar.", description: "Escolha um ambiente, reúna sua equipe e faça as ideias acontecerem." },
  team: { eyebrow: "NOSSA MAIOR FORÇA SÃO AS PESSOAS", title: "Talentos diferentes. Uma só direção.", description: "Encontre as pessoas que constroem o ecossistema Grupo X com você." },
  agenda: { eyebrow: "UM TEMPO PARA CONSTRUIR JUNTOS", title: "O próximo passo começa na conversa.", description: "Organize seus encontros e abra espaço para novas possibilidades." },
  director: { eyebrow: "AMBIENTE EXECUTIVO RESTRITO", title: "Decisões que movem o próximo capítulo.", description: "Uma sala reservada para a diretoria Grupo X." },
};

export default function WorkspaceApp() {
  const { data, setData, connected, error, ready, refresh, updateMe, authNeeded, roster, login, loginEmail, claim, register, saveCredentials, logout } = useWorkspace();
  // Estados que dependem de window (URL, localStorage) começam com o valor do
  // servidor e são sincronizados no efeito de montagem. Inicializá-los lendo o
  // navegador fazia o primeiro render do cliente divergir do HTML hidratado
  // (ex.: recarregar com ?view=team ou abrir um link de convite).
  const [view, setView] = useState<View>("office");
  const [activeRoom, setActiveRoom] = useState("all");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("gx-preferences");
        if (saved) return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      } catch {}
    }
    return DEFAULT_PREFERENCES;
  });
  const [clock, setClock] = useState("");
  const [reaction, setReaction] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [toast, setToast] = useState<{ message: string; key: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastSeq = useRef(1);
  const lastMessage = useRef<string | null>(null);

  const notify = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, key: ++toastSeq.current });
    toastTimer.current = setTimeout(() => setToast(null), 5500);
  }, []);

  const refreshAfterCall = useCallback(() => {
    void refresh();
  }, [refresh]);

  const call = useCall(data.me, notify, refreshAfterCall);
  const close = useCallback(() => setDialog(null), []);

  const navigate = useCallback((next: View) => {
    setView(next);
    setSidebarOpen(false);
    setNotificationsOpen(false);
    const url = new URL(window.location.href);
    if (next === "office") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    window.history.pushState({}, "", url.toString());
  }, []);

  useEffect(() => {
    const fromUrl = () => {
      const next = new URLSearchParams(window.location.search).get("view");
      setView(NAV.some((n) => n.id === next) ? (next as View) : "office");
    };
    const syncFromBrowser = () => {
      fromUrl();
      try {
        setNotificationsRead(localStorage.getItem("gx-notifications-read") === "true");
      } catch {}
      setInviteToken(new URLSearchParams(window.location.search).get("invite") || "");
    };
    syncFromBrowser();
    window.addEventListener("popstate", fromUrl);
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        })
      );
    tick();
    const timer = setInterval(tick, 30000);
    const shortcut = (event: KeyboardEvent) => {
      const input =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement;
      if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") || (!input && event.key === "/")) {
        event.preventDefault();
        setDialog({ type: "search" });
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => {
      clearInterval(timer);
      window.removeEventListener("popstate", fromUrl);
      window.removeEventListener("keydown", shortcut);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (movementTimer.current) clearTimeout(movementTimer.current);
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", preferences.reduceMotion);
  }, [preferences.reduceMotion]);

  useEffect(() => {
    if (authNeeded) return;
    const url = new URL(window.location.href);
    const room = url.searchParams.get("room");
    if (room || url.searchParams.get("invite") || url.searchParams.get("acesso")) {
      url.searchParams.delete("invite");
      url.searchParams.delete("acesso");
      url.searchParams.delete("room");
      window.history.replaceState({}, "", url);
    }
    if (room) {
      const target = data.rooms.find((r) => r.id === room);
      if (target) {
        const timer = setTimeout(() => setDialog({ type: "join", room: target }), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [authNeeded, data.rooms]);

  useEffect(() => {
    const latest = data.messages[data.messages.length - 1];
    if (!latest) return;
    if (lastMessage.current && lastMessage.current !== latest.id && latest.senderId !== data.me.id && !latest.sender.isDemo) {
      const timer = setTimeout(() => setNotificationsRead(false), 0);
      if (preferences.notifications) {
        try {
          const context = new AudioContext();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.frequency.value = 660;
          gain.gain.setValueAtTime(0.035, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.18);
          oscillator.onended = () => {
            void context.close();
          };
        } catch {}
      }
      return () => clearTimeout(timer);
    }
    lastMessage.current = latest.id;
  }, [data.messages, data.me.id, preferences.notifications]);

  const patch = useCallback((value: Partial<Member>) => { void updateMe(value).catch(err => notify(err instanceof Error ? err.message : "Não foi possível atualizar seu perfil.")); }, [updateMe, notify]);
  const move = useCallback((x: number, y: number, action: AvatarAction = "idle", direction: Direction = "dr", sittingOn: string | null = null) => {
    const roomId = y < 55 ? x < 49 ? "estrategia" : "coworking" : x < 48 ? "lounge" : "recepcao";
    setData(previous => ({
      ...previous,
      me: { ...previous.me, x, y, roomId, action, direction, sittingOn },
      members: previous.members.map(m => m.id === previous.me.id ? { ...m, x, y, roomId, action, direction, sittingOn } : m)
    }));
    if (movementTimer.current) clearTimeout(movementTimer.current);
    movementTimer.current = setTimeout(() => patch({ x, y, roomId, action, direction, sittingOn }), 180);
  }, [setData, patch]);
  const moveDirector = useCallback((x: number, y: number, action: AvatarAction = "idle", direction: Direction = "dr", sittingOn: string | null = null) => {
    setData(previous => ({
      ...previous,
      me: { ...previous.me, x, y, roomId: "diretoria", action, direction, sittingOn },
      members: previous.members.map(m => m.id === previous.me.id ? { ...m, x, y, roomId: "diretoria", action, direction, sittingOn } : m)
    }));
    if (movementTimer.current) clearTimeout(movementTimer.current);
    movementTimer.current = setTimeout(() => patch({ x, y, roomId: "diretoria", action, direction, sittingOn }), 180);
  }, [setData, patch]);
  const visit = useCallback((id: string) => { if (id === "diretoria" && !data.me.isAdmin) { notify("A Sala da diretoria é exclusiva para administradores."); return; } setActiveRoom(id); setDialog(null); if (id === "diretoria") { navigate("director"); return; } if (view !== "office") navigate("office"); if (id !== "all") { const position = ROOM_POSITIONS[id]; patch({ roomId: id, ...position }); } }, [data.me.isAdmin, view, navigate, patch, notify]);
  const openJoin = (room: Room) => { if (call.roomId === room.id) { setDialog(null); setCallOpen(true); } else setDialog({ type: "join", room }); };
  const showMember = (member: Member) => setDialog({ type: "member", member });
  const showMeeting = (meeting: Meeting) => { setNotificationsOpen(false); setDialog({ type: "meeting", meeting }); };
  const onMessage = (message: Message) => setData(previous => ({ ...previous, messages: [...previous.messages.filter(m => m.id !== message.id), message].slice(-100) }));
  const onClearHistory = () => setData(previous => ({ ...previous, messages: [] }));
  const react = (emoji: string) => { if (reactionTimer.current) clearTimeout(reactionTimer.current); setReaction(emoji); reactionTimer.current = setTimeout(() => setReaction(""), 3000); void api<Message>("/api/messages", { method: "POST", body: JSON.stringify({ content: emoji, roomId: "geral" }) }).then(onMessage).catch(err => notify(err instanceof Error ? err.message : "Reação não enviada.")); };
  const saveProfile = async (value: Partial<Member>) => { await updateMe(value); setDialog(null); notify("Seu avatar foi atualizado. Sua essência, em cada conexão."); };
  const savePreferences = (value: Preferences) => { setPreferences(value); try { localStorage.setItem("gx-preferences", JSON.stringify(value)); } catch {} setDialog(null); notify("Preferências salvas neste dispositivo."); };
  const markRead = () => { setNotificationsRead(true); try { localStorage.setItem("gx-notifications-read", "true"); } catch {} };
  const signOut = () => { void call.leave().catch(() => {}); void logout(); };
  const heading = HEADINGS[view];
  const activeCallRoom = data.rooms.find(r => r.id === call.roomId);
  const directorRoom = data.rooms.find(r => r.id === "diretoria")!;
  const hasGroupSystemAccess = data.me.isAdmin || data.me.canAccessGroupSystem;
  const findMember = (id: string) => data.team.find(m => m.id === id) || data.members.find(m => m.id === id);

  // Enquanto a primeira resposta do workspace não chega, não dá para saber se
  // há sessão: renderizar o escritório aqui exibia o mapa com um "você"
  // provisório (dados padrão) antes do login — inclusive para visitantes.
  if (!ready) {
    return <div className="app-boot" role="status" aria-label="Carregando o escritório"><BrandMark size={48} /><LoaderCircle size={18} className="spin" /></div>;
  }

  if (authNeeded) {
    return <><AuthGate inviteToken={inviteToken} onLoginEmail={loginEmail} onRegister={register} />
      {toast && <div className="toast" key={toast.key} role="status"><span><Info size={18} /></span><p>{toast.message}</p><button aria-label="Fechar aviso" onClick={() => setToast(null)}><X size={16} /></button></div>}</>;
  }

  return <div className="app-shell">
    {sidebarOpen && <button className="sidebar-backdrop" aria-label="Fechar navegação" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}><button className="brand" onClick={() => navigate("office")} aria-label="GX Hub — início"><BrandMark size={43} /><span><strong>GX <b>HUB</b></strong><small>VIRTUAL WORKSPACE</small></span></button>
      <button className="workspace-switcher" onClick={() => setDialog({ type: "company", name: "Grupo X" })}><span className="workspace-mini-logo">X</span><span><strong>Grupo X</strong><small>Nosso ecossistema</small></span><ChevronsUpDown size={14} /></button>
      <nav className="main-nav" aria-label="Navegação principal"><span className="nav-group-label">SEU WORKSPACE</span>{NAV.map(item => <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => navigate(item.id)}><item.icon size={18} strokeWidth={1.65} /><span>{item.label}</span>{item.id === "team" ? <span className="nav-counter">{data.team.length}</span> : view === item.id ? <span className="nav-active-dot" /> : null}</button>)}</nav>
      <EcosystemNav onCompany={(company: EcosystemCompany) => setDialog({ type: "company", name: company.name })} onExplore={() => setDialog({ type: "company" })} />
      <div className="sidebar-bottom"><div className="sidebar-manifesto"><span className="manifesto-symbol">✳</span><p>Mais que um escritório.<br /><strong>Um ponto de conexão.</strong></p><span className="manifesto-background-x">X</span></div><button className="connection-state" onClick={() => setDialog({ type: "help" })}>{connected ? <Wifi size={13} /> : <WifiOff size={13} />}<span>{connected ? "Conexão estável" : "Conectando ao escritório"}</span><span className={`small-status-dot ${connected ? "available" : "away"}`} /></button>{hasGroupSystemAccess && <a className="group-system-button" href="https://gxhubuy.lovable.app/" target="_blank" rel="noopener noreferrer"><span className="group-system-icon"><Globe2 size={15} /></span><span><strong>Sistema Grupo X</strong><small>Acesso exclusivo</small></span><ArrowUpRight size={13} /></a>}{data.me.isAdmin && <><button className="sidebar-invite sidebar-manage" onClick={() => setDialog({ type: "users" })}><ShieldCheck size={16} />Painel administrativo</button><button className="sidebar-invite sidebar-leads" onClick={() => setDialog({ type: "leads" })}><Users size={16} />Leads de clientes</button></>}<button className="sidebar-invite" onClick={() => setDialog({ type: "invite" })}><UserPlus size={16} />Convidar pessoas<Plus size={13} /></button><button className="sidebar-user" onClick={() => setDialog({ type: "profile" })}><Avatar member={data.me} size={35} status /><span><strong>{data.me.name}</strong><small>{data.me.role}</small></span><Settings2 size={15} /></button></div>
    </aside>
    <div className="workspace-main"><header className="topbar"><div className="topbar-left"><IconButton label="Abrir menu" className="mobile-menu-button" onClick={() => setSidebarOpen(true)}><Menu size={21} /></IconButton><span className="breadcrumb-workspace">Workspace</span><ChevronRight size={13} className="breadcrumb-chevron" /><span className="breadcrumb-current">{NAV.find(n => n.id === view)?.label || (view === "director" ? "Sala da diretoria" : "Workspace")}</span></div><div className="topbar-right"><button className="topbar-search" aria-label="Buscar no workspace" onClick={() => setDialog({ type: "search" })}><Search size={16} /><span>Buscar</span><kbd>⌘ K</kbd></button><span className="header-divider" /><span className="topbar-clock"><Clock3 size={14} /><strong>{clock || "--:--"}</strong><span>BRT</span></span><IconButton label="Como funciona o GX Hub" onClick={() => setDialog({ type: "help" })}><CircleHelp size={18} /></IconButton><button className={`icon-button notification-button ${notificationsOpen ? "selected" : ""}`} aria-label="Notificações" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={18} />{!notificationsRead && <span className="notification-dot" />}</button><IconButton label="Sair do escritório" onClick={signOut}><LogOut size={17} /></IconButton><span className="header-divider" /><button className="header-group-brand" onClick={() => setDialog({ type: "company", name: "Grupo X" })}>GRUPO <span>X</span></button></div>
      {notificationsOpen && <div className="notification-popover"><div className="popover-heading"><h3>Suas conexões</h3><button className="text-link" onClick={markRead}>{notificationsRead ? <><Check size={13} />Tudo em dia</> : "Marcar como lidas"}</button></div><button className="notification-item" onClick={() => { setNotificationsOpen(false); setDialog({ type: "help" }); }}><span className="notification-icon"><Sparkles size={18} /></span><span><strong>Seu lugar está aqui.</strong><small>Explore o escritório e conecte-se com a equipe.</small></span></button>{data.meetings.slice(0, 2).map(meeting => <button className="notification-item" key={meeting.id} onClick={() => showMeeting(meeting)}><span className="notification-icon"><CalendarDays size={18} /></span><span><strong>{meeting.title}</strong><small>{timeLabel(meeting.startsAt)} · {data.rooms.find(r => r.id === meeting.roomId)?.name}</small></span><ChevronRight size={14} /></button>)}<p className="notification-footer">Grandes resultados começam com boas conexões.</p></div>}
    </header>
    {notificationsOpen && <button className="popover-dismiss" aria-label="Fechar notificações" onClick={() => setNotificationsOpen(false)} />}
    <main className="main-content"><div className="page-heading"><div><p className="eyebrow"><span />{heading.eyebrow}</p><h1>{heading.title}</h1><p className="page-description">{heading.description}</p></div><div className="page-heading-actions">{view === "office" ? <button className="button button-secondary avatar-edit-button" onClick={() => setDialog({ type: "profile" })}><UserRoundPen size={16} />Personalizar avatar</button> : view === "team" ? (data.me.isAdmin ? <button className="button button-primary" onClick={() => setDialog({ type: "users" })}><ShieldCheck size={16} />Painel administrativo</button> : <button className="button button-primary" onClick={() => setDialog({ type: "invite" })}><UserPlus size={16} />Convidar pessoas</button>) : view === "director" ? null : <button className="button button-primary" onClick={() => setDialog({ type: "schedule" })}><Plus size={17} />Agendar reunião</button>}</div></div>
      {error && <div className="connection-error" role="alert"><WifiOff size={16} /><span>{error}</span><button onClick={() => void refresh()}>Reconectar</button></div>}
      {view === "office" && <><div className="office-layout"><OfficeMap data={data} activeRoom={activeRoom} onRoom={visit} onMove={move} onMember={showMember} onJoin={openJoin} onProfile={() => setDialog({ type: "profile" })} onStatus={status => patch({ status })} onSettings={() => setDialog({ type: "settings" })} onHand={() => patch({ handRaised: !data.me.handRaised })} onReaction={react} reaction={reaction} call={call} onOpenCall={() => setCallOpen(true)} /><SocialPanel data={data} onMember={showMember} onTeam={() => navigate("team")} onMessage={onMessage} onClearHistory={onClearHistory} notify={notify} /></div><MeetingsPreview data={data} onAgenda={() => navigate("agenda")} onMeeting={showMeeting} /></>}
      {view === "rooms" && <RoomsView data={data} onJoin={openJoin} onVisit={visit} onSchedule={() => setDialog({ type: "schedule" })} />}
      {view === "team" && <TeamView data={data} onMember={showMember} onInvite={() => setDialog({ type: "invite" })} />}
      {view === "agenda" && <AgendaView data={data} onMeeting={showMeeting} onSchedule={() => setDialog({ type: "schedule" })} />}
      {view === "director" && data.me.isAdmin && (
        <>
          <div className="office-layout">
            <DirectorRoom
              room={directorRoom}
              data={data}
              call={call}
              onBack={() => {
                setActiveRoom("all");
                navigate("office");
              }}
              onJoin={() => (call.roomId === "diretoria" ? setCallOpen(true) : openJoin(directorRoom))}
              onMove={moveDirector}
              onProfile={() => setDialog({ type: "profile" })}
              onStatus={(status) => patch({ status })}
              onSettings={() => setDialog({ type: "settings" })}
              onHand={() => patch({ handRaised: !data.me.handRaised })}
              onReaction={react}
              reaction={reaction}
              onOpenCall={() => setCallOpen(true)}
            />
            <SocialPanel
              data={data}
              onMember={showMember}
              onTeam={() => navigate("team")}
              onMessage={onMessage}
              onClearHistory={onClearHistory}
              notify={notify}
            />
          </div>
          <MeetingsPreview data={data} onAgenda={() => navigate("agenda")} onMeeting={showMeeting} />
        </>
      )}
      <footer className="workspace-footer"><span><span className="footer-x">X</span>Um ecossistema. Infinitas possibilidades.</span><span>Feito para aproximar.<Sparkles size={11} /></span></footer>
    </main></div>
    {/* key por identidade: se o diálogo abrir antes de a sessão real chegar
        (dados padrão) ele remonta com o look correto em vez de manter um
        visual provisório que, se salvo, sobrescreveria o look persistido. */}
    {dialog?.type === "profile" && <ProfileDialog key={data.me.id} me={data.me} onSave={saveProfile} onSaveCredentials={data.me.isAdmin ? saveCredentials : undefined} onClose={close} />}
    {dialog?.type === "invite" && <InviteDialog roomId={call.roomId} onClose={close} />}
    {dialog?.type === "users" && <UsersDialog me={data.me} onChanged={() => void refresh()} notify={notify} onClose={close} />}
    {dialog?.type === "leads" && <LeadsDialog notify={notify} onClose={close} />}
    {dialog?.type === "clientInvite" && <ClientInviteDialog meeting={dialog.meeting} onClose={close} />}
    {dialog?.type === "schedule" && <ScheduleDialog rooms={data.rooms} onSaved={() => { close(); void refresh(); notify("Reunião agendada. Mais um espaço para construir juntos."); }} onClose={close} />}
    {dialog?.type === "meeting" && <MeetingDialog meeting={dialog.meeting} data={data} onJoin={openJoin} onClientInvite={() => setDialog({ type: "clientInvite", meeting: dialog.meeting })} onCancelled={() => { close(); void refresh(); notify("Reunião cancelada. O horário está disponível novamente."); }} onClose={close} />}
    {dialog?.type === "member" && <MemberDialog member={findMember(dialog.member.id) || dialog.member} rooms={data.rooms} own={dialog.member.id === data.me.id} onProfile={() => setDialog({ type: "profile" })} onVisit={visit} onJoin={openJoin} onClose={close} />}
    {dialog?.type === "settings" && <SettingsDialog preferences={preferences} onSave={savePreferences} onClose={close} />}
    {dialog?.type === "help" && <HelpDialog onClose={close} onInvite={() => setDialog({ type: "invite" })} />}
    {dialog?.type === "search" && <SearchDialog data={data} onMember={showMember} onRoom={visit} onMeeting={showMeeting} onClose={close} />}
    {dialog?.type === "company" && <CompanyDialog name={dialog.name} onClose={close} />}
    {dialog?.type === "join" && <PrejoinDialog room={dialog.room} me={data.me} call={call} devices={preferences} onClose={close} onJoined={() => { setActiveRoom(dialog.room.id); patch({ roomId: dialog.room.id, ...ROOM_POSITIONS[dialog.room.id] }); close(); setCallOpen(true); }} />}
    {callOpen && activeCallRoom && !dialog && <ActiveCallDialog room={activeCallRoom} me={data.me} call={call} onMinimize={() => setCallOpen(false)} onInvite={() => { setCallOpen(false); setDialog({ type: "invite" }); }} volume={preferences.volume} />}
    {activeCallRoom && !callOpen && <div className="floating-call"><button onClick={() => setCallOpen(true)}><span className="call-wave"><i /><i /><i /><i /></span><span><strong>{activeCallRoom.name}</strong><small>Em chamada · {Math.max(1, call.participants.length)} {call.participants.length > 1 ? "pessoas" : "pessoa"}</small></span><Maximize2 size={15} /></button><IconButton label="Encerrar chamada" className="danger-soft" onClick={() => void call.leave()}><PhoneOff size={17} /></IconButton></div>}
    {toast && <div className="toast" key={toast.key} role="status"><span><Info size={18} /></span><p>{toast.message}</p><button aria-label="Fechar aviso" onClick={() => setToast(null)}><X size={16} /></button></div>}
  </div>;
}
