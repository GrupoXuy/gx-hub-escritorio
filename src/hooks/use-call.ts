"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Member } from "@/lib/workspace";

type SignalPayload = { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
type Peer = { pc: RTCPeerConnection; audio: RTCRtpSender; video: RTCRtpSender; makingOffer: boolean; ignoreOffer: boolean; settingAnswer: boolean; candidates: RTCIceCandidateInit[]; stream: MediaStream; recoveryTimer: ReturnType<typeof setTimeout> | null };
type CallPoll = { participants: Member[]; signals: { id: number; fromId: string; payload: SignalPayload }[] };
export type CallMode = "audio" | "video" | "listen";
export type DevicePreferences = { audioId?: string; videoId?: string };

function closePeer(peer: Peer) {
  if (peer.recoveryTimer) { clearTimeout(peer.recoveryTimer); peer.recoveryTimer = null; }
  peer.pc.close();
}

function hasDeviceId(constraint?: boolean | MediaTrackConstraints): boolean {
  return typeof constraint === "object" && constraint !== null && !!constraint.deviceId;
}

// Um dispositivo salvo nas preferências (mic/câmera) pode não existir mais —
// desconectado, permissão revogada para aquele device específico, fone
// bluetooth desparelhado. deviceId "exact" falha com OverconstrainedError
// nesse caso e, sem este fallback, a pessoa não conseguia entrar na chamada
// nem ligar o microfone/câmera até corrigir manualmente nas preferências.
async function requestMedia(constraints: MediaStreamConstraints, onFallback?: () => void): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    const overconstrained = (error as { name?: string })?.name === "OverconstrainedError";
    if (overconstrained && (hasDeviceId(constraints.audio) || hasDeviceId(constraints.video))) {
      const strip = (c?: boolean | MediaTrackConstraints) => {
        if (typeof c !== "object" || c === null) return c;
        const { deviceId: _deviceId, ...rest } = c; return rest;
      };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: strip(constraints.audio), video: strip(constraints.video) });
      onFallback?.();
      return stream;
    }
    throw error;
  }
}

export function useCall(me: Member, notify: (message: string) => void, onChange: () => void) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [participants, setParticipants] = useState<Member[]>([]);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [connecting, setConnecting] = useState(false);
  const peers = useRef(new Map<string, Peer>());
  const local = useRef<MediaStream | null>(null);
  const screen = useRef<MediaStream | null>(null);
  const activeRoom = useRef<string | null>(null);
  const cursor = useRef(0);
  const config = useRef<RTCConfiguration>({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  const meRef = useRef(me); meRef.current = me;
  const devices = useRef<DevicePreferences>({});
  const generation = useRef(0);
  const mediaFlags = useRef({ mic: micOn, camera: cameraOn });
  mediaFlags.current = { mic: micOn, camera: cameraOn };

  const sendSignal = useCallback(async (toId: string, payload: SignalPayload) => {
    if (!activeRoom.current) return;
    await api("/api/signals", { method: "POST", body: JSON.stringify({ toId, payload }) });
  }, []);

  const getPeer = useCallback((id: string) => {
    const existing = peers.current.get(id); if (existing) return existing;
    const pc = new RTCPeerConnection(config.current);
    const audio = pc.addTransceiver("audio", { direction: "sendrecv" }).sender;
    const video = pc.addTransceiver("video", { direction: "sendrecv" }).sender;
    const peer: Peer = { pc, audio, video, makingOffer: false, ignoreOffer: false, settingAnswer: false, candidates: [], stream: new MediaStream(), recoveryTimer: null };
    peers.current.set(id, peer);
    void audio.replaceTrack(local.current?.getAudioTracks()[0] || null);
    void video.replaceTrack(screen.current?.getVideoTracks()[0] || local.current?.getVideoTracks()[0] || null);
    pc.onicecandidate = ({ candidate }) => { if (candidate) void sendSignal(id, { candidate: candidate.toJSON() }).catch(() => {}); };
    pc.ontrack = ({ track }) => {
      if (!peer.stream.getTrackById(track.id)) peer.stream.addTrack(track);
      setRemoteStreams(previous => ({ ...previous, [id]: peer.stream }));
      track.onunmute = () => setRemoteStreams(previous => ({ ...previous, [id]: new MediaStream(peer.stream.getTracks()) }));
    };
    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) await sendSignal(id, { description: pc.localDescription.toJSON() });
      } catch (error) { if (pc.connectionState !== "closed") console.warn("WebRTC negotiation", error); }
      finally { peer.makingOffer = false; }
    };
    pc.onconnectionstatechange = () => {
      if (peer.recoveryTimer) { clearTimeout(peer.recoveryTimer); peer.recoveryTimer = null; }
      if (pc.connectionState === "failed") {
        pc.restartIce();
        notify("Reconectando a chamada. Em redes restritas, pode ser necessário configurar um servidor TURN.");
      } else if (pc.connectionState === "disconnected") {
        // "disconnected" é comum e costuma se resolver sozinho em 1-2s (troca de
        // wifi/dados no celular, rede instável). Só forçamos restartIce() se
        // continuar assim depois de um tempo, em vez de esperar os ~30s que
        // alguns navegadores levam para declarar "failed".
        peer.recoveryTimer = setTimeout(() => {
          peer.recoveryTimer = null;
          if (pc.connectionState === "disconnected") pc.restartIce();
        }, 3000);
      }
    };
    return peer;
  }, [sendSignal, notify]);

  const handleSignal = useCallback(async (fromId: string, payload: SignalPayload) => {
    const peer = getPeer(fromId); const pc = peer.pc;
    // Comparação ordinal (não localeCompare): os dois lados precisam concordar
    // em quem é "polite" para o padrão de negociação perfeita funcionar.
    // localeCompare depende do locale/coleção do navegador — em teoria dois
    // dispositivos com locales diferentes podem discordar sobre a ordem e os
    // dois lados viram "impolite" (ou "polite") ao mesmo tempo, travando a
    // renegociação. Comparação de string simples é sempre a mesma em qualquer
    // navegador/locale.
    const polite = meRef.current.id > fromId;
    if (payload.description) {
      const ready = !peer.makingOffer && (pc.signalingState === "stable" || peer.settingAnswer);
      const collision = payload.description.type === "offer" && !ready;
      peer.ignoreOffer = !polite && collision;
      if (peer.ignoreOffer) { peer.candidates = []; return; }
      peer.settingAnswer = payload.description.type === "answer";
      await pc.setRemoteDescription(payload.description);
      peer.settingAnswer = false;
      for (const candidate of peer.candidates.splice(0)) { try { await pc.addIceCandidate(candidate); } catch {} }
      if (payload.description.type === "offer") {
        await pc.setLocalDescription();
        if (pc.localDescription) await sendSignal(fromId, { description: pc.localDescription.toJSON() });
      }
    } else if (payload.candidate && !peer.ignoreOffer) {
      if (pc.remoteDescription) { try { await pc.addIceCandidate(payload.candidate); } catch {} }
      else peer.candidates.push(payload.candidate);
    }
  }, [getPeer, sendSignal]);

  useEffect(() => {
    if (!roomId) return;
    let stopped = false; let polling = false; let failures = 0;
    const currentGeneration = generation.current;
    const poll = async () => {
      if (polling || stopped) return; polling = true;
      try {
        const data = await api<CallPoll>(`/api/call?roomId=${encodeURIComponent(roomId)}&after=${cursor.current}`);
        if (stopped || currentGeneration !== generation.current) return;
        failures = 0; setParticipants(data.participants);
        for (const participant of data.participants) if (participant.id !== meRef.current.id) getPeer(participant.id);
        for (const signal of data.signals) {
          if (stopped) return;
          try { await handleSignal(signal.fromId, signal.payload); } catch (error) { console.warn("WebRTC signal", error); }
          cursor.current = Math.max(cursor.current, signal.id);
        }
        const ids = new Set(data.participants.map(p => p.id));
        for (const [id, peer] of peers.current) if (!ids.has(id)) {
          closePeer(peer); peers.current.delete(id);
          setRemoteStreams(previous => { const next = { ...previous }; delete next[id]; return next; });
        }
      } catch { failures++; if (failures === 4) notify("A conexão com a chamada está instável. Estamos tentando reconectar."); }
      finally { polling = false; }
    };
    void poll(); const timer = setInterval(() => void poll(), 1300);
    return () => { stopped = true; clearInterval(timer); };
  }, [roomId, getPeer, handleSignal, notify]);

  const clearMedia = useCallback(() => {
    generation.current++;
    peers.current.forEach(closePeer); peers.current.clear();
    local.current?.getTracks().forEach(track => track.stop());
    screen.current?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    local.current = null; screen.current = null; activeRoom.current = null;
  }, []);

  const leave = useCallback(async () => {
    clearMedia(); setRoomId(null); setLocalStream(null); setScreenStream(null); setRemoteStreams({}); setParticipants([]); setMicOn(false); setCameraOn(false);
    try { await api("/api/call", { method: "POST", body: JSON.stringify({ action: "leave" }) }); } catch { notify("Chamada encerrada neste dispositivo."); }
    onChange();
  }, [clearMedia, notify, onChange]);

  useEffect(() => {
    // pagehide também dispara quando a página entra no bfcache — trocar de app
    // ou de aba no celular — e nesse caso ela volta intacta, com as
    // RTCPeerConnections vivas. Derrubar a mídia aí encerrava a chamada sem a
    // pessoa pedir. Só avisamos o servidor quando a página está sendo destruída
    // de fato (persisted === false); se ela for descartada do bfcache sem novo
    // evento, o batimento de lastSeen (25s) já remove a pessoa da sala.
    const unload = (event: PageTransitionEvent) => {
      if (event.persisted) return;
      if (activeRoom.current) navigator.sendBeacon("/api/call", new Blob([JSON.stringify({ action: "leave" })], { type: "application/json" }));
      clearMedia();
    };
    window.addEventListener("pagehide", unload);
    return () => { window.removeEventListener("pagehide", unload); clearMedia(); };
  }, [clearMedia]);

  const join = useCallback(async (targetRoom: string, mode: CallMode, preferences: DevicePreferences = {}) => {
    setConnecting(true); let stream: MediaStream | null = null;
    try {
      if (activeRoom.current) await leave();
      devices.current = preferences;
      if (mode !== "listen") {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Seu navegador precisa de uma conexão HTTPS para acessar a câmera e o microfone.");
        stream = await requestMedia({
          audio: { echoCancellation: true, noiseSuppression: true, ...(preferences.audioId ? { deviceId: { exact: preferences.audioId } } : {}) },
          video: mode === "video" ? { width: { ideal: 960 }, height: { ideal: 540 }, ...(preferences.videoId ? { deviceId: { exact: preferences.videoId } } : {}) } : false,
        }, () => notify("O dispositivo salvo nas preferências não está mais disponível — usamos o padrão do sistema."));
      } else stream = new MediaStream();
      const result = await api<{ iceServers: RTCIceServer[] }>("/api/call", { method: "POST", body: JSON.stringify({ action: "join", roomId: targetRoom, micEnabled: mode !== "listen", cameraEnabled: mode === "video" }) });
      config.current = { iceServers: result.iceServers };
      local.current = stream; activeRoom.current = targetRoom; cursor.current = 0; generation.current++;
      setLocalStream(stream); setMicOn(mode !== "listen"); setCameraOn(mode === "video"); setCameraFacing("user"); setRoomId(targetRoom); onChange();
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop());
      if (error instanceof DOMException && ["NotAllowedError", "PermissionDeniedError"].includes(error.name)) throw new Error("O acesso à câmera ou ao microfone foi bloqueado. Permita o acesso no navegador ou entre apenas para ouvir.");
      if (error instanceof DOMException && error.name === "NotFoundError") throw new Error("Não encontramos a câmera ou o microfone. Conecte um dispositivo ou entre apenas para ouvir.");
      throw error;
    } finally { setConnecting(false); }
  }, [leave, onChange, notify]);

  const updateMedia = useCallback((mic: boolean, cam: boolean) => {
    void api("/api/call", { method: "POST", body: JSON.stringify({ action: "media", micEnabled: mic, cameraEnabled: cam }) }).then(onChange).catch(() => {});
  }, [onChange]);

  const toggleMic = useCallback(async () => {
    if (!activeRoom.current) return;
    try {
      let track = local.current?.getAudioTracks()[0];
      const enabled = !micOn;
      if (!track && enabled) {
        const stream = await requestMedia({ audio: { echoCancellation: true, ...(devices.current.audioId ? { deviceId: { exact: devices.current.audioId } } : {}) } }, () => notify("O microfone salvo nas preferências não está mais disponível — usamos o padrão do sistema."));
        track = stream.getAudioTracks()[0]; local.current?.addTrack(track);
        await Promise.all([...peers.current.values()].map(peer => peer.audio.replaceTrack(track!)));
      }
      if (track) track.enabled = enabled;
      setMicOn(enabled); updateMedia(enabled, cameraOn);
      if (local.current) setLocalStream(new MediaStream(local.current.getTracks()));
    } catch { notify("Não foi possível acessar o microfone. Verifique as permissões do navegador."); }
  }, [micOn, cameraOn, notify, updateMedia]);

  const switchCamera = useCallback(async () => {
    if (!activeRoom.current || !cameraOn || screen.current) return;
    try {
      const nextFacing = cameraFacing === "user" ? "environment" : "user";
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: nextFacing }, width: { ideal: 960 }, height: { ideal: 540 } } });
      const nextTrack = stream.getVideoTracks()[0];
      local.current?.getVideoTracks().forEach(track => { track.stop(); local.current?.removeTrack(track); });
      local.current?.addTrack(nextTrack);
      await Promise.all([...peers.current.values()].map(peer => peer.video.replaceTrack(nextTrack)));
      setCameraFacing(nextFacing);
      setLocalStream(new MediaStream(local.current?.getTracks() || []));
    } catch { notify("Não foi possível alternar entre a câmera frontal e traseira."); }
  }, [cameraFacing, cameraOn, notify]);

  const toggleCamera = useCallback(async () => {
    if (!activeRoom.current) return;
    try {
      const enabled = !cameraOn;
      let track: MediaStreamTrack | null = null;
      if (enabled) {
        const stream = await requestMedia({ video: { width: { ideal: 960 }, ...(devices.current.videoId ? { deviceId: { exact: devices.current.videoId } } : {}) } }, () => notify("A câmera salva nas preferências não está mais disponível — usamos o padrão do sistema."));
        track = stream.getVideoTracks()[0]; local.current?.addTrack(track);
      } else {
        local.current?.getVideoTracks().forEach(t => { t.stop(); local.current?.removeTrack(t); });
      }
      if (!screen.current) await Promise.all([...peers.current.values()].map(peer => peer.video.replaceTrack(track)));
      setCameraOn(enabled); updateMedia(micOn, enabled || !!screen.current);
      if (local.current) setLocalStream(new MediaStream(local.current.getTracks()));
    } catch { notify("Não foi possível acessar a câmera. Verifique as permissões do navegador."); }
  }, [cameraOn, micOn, notify, updateMedia]);

  const stopSharing = useCallback(async () => {
    screen.current?.getTracks().forEach(track => { track.onended = null; track.stop(); }); screen.current = null; setScreenStream(null);
    await Promise.all([...peers.current.values()].map(peer => peer.video.replaceTrack(local.current?.getVideoTracks()[0] || null)));
    updateMedia(mediaFlags.current.mic, mediaFlags.current.camera);
  }, [updateMedia]);
  const shareScreen = useCallback(async () => {
    if (!activeRoom.current) return;
    if (screen.current) { await stopSharing(); return; }
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) { notify("O compartilhamento de tela não está disponível neste navegador."); return; }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screen.current = stream; setScreenStream(stream);
      const track = stream.getVideoTracks()[0]; track.onended = () => void stopSharing();
      await Promise.all([...peers.current.values()].map(peer => peer.video.replaceTrack(track)));
      updateMedia(micOn, true);
    } catch (error) { if (!(error instanceof DOMException && error.name === "NotAllowedError")) notify("Não foi possível compartilhar a tela. Tente novamente."); }
  }, [stopSharing, notify, updateMedia, micOn]);

  return { roomId, localStream, screenStream, remoteStreams, participants, micOn, cameraOn, cameraFacing, connecting, join, leave, toggleMic, toggleCamera, switchCamera, shareScreen };
}
export type CallController = ReturnType<typeof useCall>;
