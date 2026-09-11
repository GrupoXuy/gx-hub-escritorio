"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, LoaderCircle, ShieldCheck, UserPlus } from "lucide-react";
import { BrandMark } from "@/components/ui";
import { AvatarQuickPick } from "@/components/avatar-studio";
import { AVATAR_COLORS, COMPANY_DATA } from "@/lib/workspace";
import { defaultLookFor, serializeLook, withLook, type AvatarLook } from "@/lib/avatar";

type Props = {
  inviteToken: string;
  onLoginEmail: (email: string, password: string) => Promise<void>;
  onRegister: (payload: { name: string; role: string; company: string; color: string; inviteToken: string; email: string; password: string; gender: string; look: string }) => Promise<void>;
};
export function AuthGate({ inviteToken, onLoginEmail, onRegister }: Props) {
  const [registerMode, setRegisterMode] = useState(Boolean(inviteToken));
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [name, setName] = useState(""); const [role, setRole] = useState(""); const [company, setCompany] = useState("Grupo X");
  const [color, setColor] = useState(AVATAR_COLORS[0].value); const [gender, setGender] = useState("male"); const [invite, setInvite] = useState(inviteToken);
  const [look, setLook] = useState<AvatarLook>(() => defaultLookFor("male"));
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { setInvite(inviteToken); if (inviteToken) setRegisterMode(true); }, [inviteToken]);
  const submitLogin = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await onLoginEmail(email.trim(), password); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível entrar."); } finally { setBusy(false); }
  };
  const submitRegister = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await onRegister({ name: name.trim(), role: role.trim(), company, color, gender, look: serializeLook(look), inviteToken: invite.trim(), email: email.trim(), password }); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível concluir o cadastro."); } finally { setBusy(false); }
  };
  return <div className="auth-gate"><div className="auth-card">
    <div className="auth-brand"><BrandMark size={58}/><div><strong>GX <b>HUB</b></strong><span>VIRTUAL WORKSPACE</span></div></div>
    <h1>Seu escritório, sem fronteiras.</h1><p className="auth-subtitle">Acesso individual protegido por email e senha. Não escolha o perfil de outra pessoa.</p>
    <div className="auth-tabs"><button className={!registerMode ? "active" : ""} onClick={() => { setRegisterMode(false); setError(""); }}>Entrar</button><button className={registerMode ? "active" : ""} onClick={() => { setRegisterMode(true); setError(""); }}>Primeiro acesso</button></div>
    {!registerMode ? <form className="auth-email-login" onSubmit={submitLogin}><p className="auth-email-hint"><ShieldCheck size={14}/>Cada usuário possui uma sessão própria.</p><label className="form-field"><span>Email</span><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu.email@empresa.com" autoComplete="email"/></label><label className="form-field"><span>Senha</span><input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha pessoal" autoComplete="current-password"/></label><button className="button button-primary full-width" type="submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin"/> : <ArrowRight size={17}/>}Entrar no escritório</button></form> : <form className="auth-register" onSubmit={submitRegister}><label className="form-field"><span>Seu nome</span><input required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" autoComplete="name"/></label><div className="form-row"><label className="form-field"><span>Cargo ou área</span><input required minLength={2} maxLength={80} value={role} onChange={e => setRole(e.target.value)} placeholder="Seu papel"/></label><label className="form-field"><span>Empresa</span><select value={company} onChange={e => setCompany(e.target.value)}>{COMPANY_DATA.map(c => <option key={c.name}>{c.name}</option>)}<option>GX Hub</option><option>Empresa parceira</option></select></label></div><label className="form-field"><span>Email pessoal</span><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com" autoComplete="email"/></label><label className="form-field"><span>Senha pessoal</span><input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" autoComplete="new-password"/></label><AvatarQuickPick look={look} color={color} gender={gender} onLook={setLook} onColor={setColor} onGender={value => { setGender(value); setLook(withLook(defaultLookFor(value), { skin: look.skin, hairColor: look.hairColor })); }} />
<label className="form-field"><span>Código do convite</span><input required minLength={10} value={invite} onChange={e => setInvite(e.target.value)} placeholder="Código recebido do administrador"/></label><button className="button button-primary full-width" type="submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin"/> : <UserPlus size={17}/>}Cadastrar e entrar</button></form>}
    {error && <div className="form-error auth-error" role="alert">{error}</div>}<p className="auth-footer">Grupo X · Gestão que direciona. Estratégia que multiplica.</p>
  </div></div>;
}
