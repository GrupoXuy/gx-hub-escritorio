"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Users, ArrowUpRight, Headphones, Coffee, MessageSquare, ChevronDown, Send, Smile, LoaderCircle, Hash, Trash2 } from "lucide-react";
import { Avatar, EmptyState } from "@/components/ui";
import { api, isOnline, timeLabel, type Workspace, type Member, type Message } from "@/lib/workspace";

type Props = { data: Workspace; onMember: (member: Member) => void; onTeam: () => void; onMessage: (message: Message) => void; notify: (message: string) => void; onClearHistory: () => void };
export function SocialPanel({ data, onMember, onTeam, onMessage, notify, onClearHistory }: Props) {
  const [channel, setChannel] = useState("geral");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [emojis, setEmojis] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const messages = data.messages.filter(message => message.roomId === channel);
  const others = data.members.filter(member => member.id !== data.me.id);
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [messages.length, channel]);
  const clearHistory = async () => {
    if (!data.me.isAdmin || !window.confirm("Apagar todo o histórico deste chat para a equipe? Esta ação não pode ser desfeita.")) return;
    try { await api("/api/messages", { method: "DELETE" }); onClearHistory(); notify("Histórico do chat apagado."); }
    catch (error) { notify(error instanceof Error ? error.message : "Não foi possível apagar o histórico."); }
  };
  const send = async (event: FormEvent) => {
    event.preventDefault(); if (!draft.trim() || sending) return;
    setSending(true);
    try {
      const message = await api<Message>("/api/messages", { method: "POST", body: JSON.stringify({ content: draft, roomId: channel }) });
      onMessage(message); setDraft(""); setEmojis(false); input.current?.focus();
    } catch (error) { notify(error instanceof Error ? error.message : "A mensagem não foi enviada."); }
    finally { setSending(false); }
  };
  return <aside className="social-panel" aria-label="Equipe e conversa do escritório">
    <div className="team-preview"><div className="panel-section-heading"><h2><Users size={16}/>No escritório <span className="count-badge">{data.members.length}</span></h2><span className="small-status-dot available" title="Workspace conectado"/></div><div className="member-preview-list">{others.slice(0, 4).map(member => <button className="member-preview" key={member.id} onClick={() => onMember(member)}><Avatar member={member} size={31} ring={isOnline(member.lastSeen)} status/><span className="member-preview-info"><strong>{member.name}</strong><span>{data.rooms.find(room => room.id === member.roomId)?.name}</span></span><span className={`member-room-symbol ${member.roomId === "estrategia" ? "gold" : ""}`}>{member.roomId === "lounge" ? <Coffee size={14}/> : member.roomId === "estrategia" || member.callRoom ? <Headphones size={14}/> : <span className="subtle-dot"/>}</span></button>)}</div><button className="text-link team-view-link" onClick={onTeam}>Ver toda a equipe<ArrowUpRight size={14}/></button></div>
    <div className="chat-section"><div className="panel-section-heading chat-heading"><h2><MessageSquare size={15}/>Conversa</h2><div className="chat-heading-actions">{data.me.isAdmin && <button className="chat-clear-button" aria-label="Apagar histórico do chat" title="Apagar histórico do chat" onClick={() => void clearHistory()}><Trash2 size={14}/></button>}<div className="channel-select"><Hash size={12}/><select aria-label="Canal de conversa" value={channel} onChange={e => setChannel(e.target.value)}><option value="geral">geral</option>{data.rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select><ChevronDown size={11}/></div></div></div>
      <div className="chat-messages" ref={scroll} aria-live="polite" aria-relevant="additions"><div className="chat-day"><span/>HOJE<span/></div>{messages.length ? messages.map(message => <article className={`chat-message ${message.senderId === data.me.id ? "own-message" : ""}`} key={message.id}><button className="plain-button" onClick={() => onMember(message.sender)} aria-label={`Perfil de ${message.sender.name}`}><Avatar member={message.sender} size={25}/></button><div className="message-body"><div className="message-meta"><strong>{message.senderId === data.me.id ? "Você" : message.sender.name.split(" ")[0]}</strong><time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time></div><p>{message.content}</p></div></article>) : <EmptyState icon={<MessageSquare size={23}/>} title="Comece uma boa conversa" description="As mensagens deste ambiente aparecem aqui."/>}</div>
      <form className="chat-composer" onSubmit={send}><div className="chat-input-row"><input ref={input} aria-label="Escreva uma mensagem" placeholder="Escreva uma mensagem..." value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000}/><button className="composer-emoji" type="button" aria-label="Inserir emoji" onClick={() => setEmojis(!emojis)}><Smile size={17}/></button><button className="send-button" type="submit" aria-label="Enviar mensagem" disabled={!draft.trim() || sending}>{sending ? <LoaderCircle size={15} className="spin"/> : <Send size={15}/>}</button></div>{emojis && <div className="chat-emoji-picker">{["👋", "😊", "🚀", "🙌", "💛", "☕", "🎯", "👏"].map(emoji => <button type="button" key={emoji} onClick={() => { setDraft(value => value + emoji); setEmojis(false); input.current?.focus(); }}>{emoji}</button>)}</div>}<p><span className="keyboard-key">↵</span> para enviar <span className="composer-privacy">Vamos construir juntos.</span></p></form>
    </div>
  </aside>;
}
