"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, DEFAULT_ME, ROOM_DATA, type AuthNeeded, type RosterEntry, type Workspace, type Member } from "@/lib/workspace";
export function useWorkspace() {
  const [data, setData] = useState<Workspace>({ me: DEFAULT_ME, members: [], team: [], rooms: ROOM_DATA, messages: [], meetings: [] });
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [authNeeded, setAuthNeeded] = useState(false);
  const [ready, setReady] = useState(false);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [inviteRequired, setInviteRequired] = useState(true);
  const fetching = useRef(false);
  const mutating = useRef(0);
  const refresh = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const next = await api<Workspace>("/api/workspace");
      setData(previous => mutating.current ? { ...next, me: previous.me, members: next.members.map(m => m.id === previous.me.id ? previous.me : m) } : next);
      setConnected(true); setError(""); setAuthNeeded(false);
    } catch (err) {
      const status = (err as { status?: number }).status;
      const payload = (err as { data?: AuthNeeded }).data;
      if (status === 401 && payload && typeof payload === "object" && "needsAuth" in payload) {
        setConnected(true); setError(""); setAuthNeeded(true);
        setRoster(payload.users || []); setInviteRequired(payload.inviteRequired !== false);
      } else {
        setConnected(false); setError(err instanceof Error ? err.message : "Não foi possível conectar ao escritório.");
      }
    }
    finally { fetching.current = false; setReady(true); }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 4000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [refresh]);
  const updateMe = useCallback(async (patch: Partial<Member>) => {
    mutating.current++;
    setData(previous => ({ ...previous, me: { ...previous.me, ...patch }, members: previous.members.map(m => m.id === previous.me.id ? { ...m, ...patch } : m) }));
    try {
      const me = await api<Member>("/api/workspace", { method: "PATCH", body: JSON.stringify(patch) });
      setData(previous => ({ ...previous, me, members: previous.members.map(m => m.id === me.id ? me : m) }));
      return me;
    } finally { mutating.current--; if (mutating.current === 0) void refresh(); }
  }, [refresh]);
  // Os fluxos de autenticação buscam o workspace ANTES de revelá-lo: revelar
  // primeiro (setAuthNeeded(false) seguido de refresh) exibia o escritório com
  // os dados padrão da sessão anterior durante a busca.
  const claim = useCallback(async (token: string) => {
    await api("/api/auth/claim", { method: "POST", body: JSON.stringify({ token }) });
    await refresh();
  }, [refresh]);
  const loginEmail = useCallback(async (email: string, password: string) => {
    await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    await refresh();
  }, [refresh]);
  const saveCredentials = useCallback(async (email: string, password: string) => {
    await api("/api/auth/credentials", { method: "PATCH", body: JSON.stringify({ email, password }) });
  }, []);
  const register = useCallback(async (payload: { name: string; role: string; company: string; color: string; gender: string; look?: string; inviteToken: string; email: string; password: string }) => {
    await api("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
    await refresh();
  }, [refresh]);
  const logout = useCallback(async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch {}
    await refresh();
  }, [refresh]);
  return { data, setData, connected, error, ready, refresh, updateMe, authNeeded, roster, inviteRequired, loginEmail, claim, register, saveCredentials, logout };
}
