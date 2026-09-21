"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Copy, Download, Globe2, LoaderCircle, Mail, MessageCircle, Search, Users, X } from "lucide-react";
import { Modal, EmptyState } from "@/components/ui";
import { InstagramGlyph } from "@/components/ecosystem-nav";
import { api } from "@/lib/workspace";

type Lead = {
  id: string;
  ownerId: string;
  ownerName: string;
  source: string;
  name: string;
  companyName: string;
  gender: string;
  whatsapp: string;
  email: string;
  instagram: string | null;
  website: string | null;
  meetingTitle: string | null;
  createdAt: string;
};

function whatsappHref(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

function socialHref(value: string | null) {
  if (!value) return "";
  const clean = value.trim();
  if (/^https?:\/\//i.test(clean)) return clean;
  return `https://www.instagram.com/${clean.replace(/^@/, "").replace(/^\/+/, "")}/`;
}

function siteHref(value: string | null) {
  if (!value) return "";
  const clean = value.trim();
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
}

export function LeadsDialog({ notify, onClose }: { notify: (message: string) => void; onClose: () => void }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ leads: Lead[] }>("/api/leads")
      .then(r => setLeads(r.leads))
      .catch(e => setError(e instanceof Error ? e.message : "Não foi possível carregar seus leads."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return leads;
    return leads.filter(lead =>
      `${lead.name} ${lead.companyName} ${lead.email} ${lead.whatsapp} ${lead.instagram || ""} ${lead.meetingTitle || ""} ${lead.source}`
        .toLowerCase()
        .includes(query)
    );
  }, [leads, search]);

  const csv = () => {
    const rows = [
      ["Origem", "Empresa", "Nome", "WhatsApp", "Email", "Instagram", "Site", "Reunião", "Data"],
      ...leads.map(l => [
        l.source === "gx-radar" ? "GX Radar" : "Convite",
        l.companyName,
        l.name,
        l.whatsapp,
        l.email,
        l.instagram || "",
        l.website || "",
        l.meetingTitle || "",
        new Date(l.createdAt).toLocaleString("pt-BR"),
      ]),
    ];
    const content = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" }));
    a.download = "leads-minha-base-grupo-x.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    notify("Sua base de leads foi exportada em CSV.");
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify("Contato copiado.");
    } catch {
      notify(text);
    }
  };

  return (
    <Modal title="Leads" eyebrow="SUA BASE DE CLIENTES" onClose={onClose} wide>
      <p className="modal-description">Clientes captados pelo GX Radar e contatos gerados por reuniões ficam aqui, separados das empresas do Ecossistema Grupo X. Cada usuário visualiza somente a própria base.</p>

      <div className="leads-toolbar">
        <label className="search-field users-search">
          <Search size={16} />
          <input
            placeholder="Buscar empresa, nome, WhatsApp, Instagram ou site"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Buscar leads"
          />
        </label>
        <span className="filter-summary">{filtered.length} de {leads.length} leads</span>
        <button className="button button-secondary" onClick={csv} disabled={!leads.length}>
          <Download size={15} />Exportar CSV
        </button>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      {loading ? (
        <div className="users-loading"><LoaderCircle size={22} className="spin" />Carregando sua base…</div>
      ) : filtered.length ? (
        <div className="leads-list">
          {filtered.map(lead => {
            const wa = whatsappHref(lead.whatsapp);
            const ig = socialHref(lead.instagram);
            const site = siteHref(lead.website);
            return (
              <article className="lead-row" key={lead.id}>
                <span className="lead-avatar"><Users size={17} /></span>
                <div className="lead-info">
                  <strong>{lead.companyName || lead.name}</strong>
                  {lead.companyName && <span className="lead-person-name">{lead.name}</span>}
                  <span className="lead-meta">
                    {lead.source === "gx-radar" ? <b className="lead-source-chip radar">GX Radar</b> : <b className="lead-source-chip">Convite</b>}
                    {lead.meetingTitle && <><CalendarDays size={12} />{lead.meetingTitle}</>}
                    <time>{new Date(lead.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</time>
                  </span>
                </div>

                <div className="lead-contact">
                  {wa && <a className="lead-channel whatsapp" href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp de ${lead.name}`} title="WhatsApp">
                    <MessageCircle size={14} /><span>WhatsApp</span><ArrowUpRight size={11} />
                  </a>}
                  {ig && <a className="lead-channel" href={ig} target="_blank" rel="noopener noreferrer" aria-label={`Abrir Instagram de ${lead.name}`} title="Instagram">
                    <InstagramGlyph size={14} /><span>Instagram</span><ArrowUpRight size={11} />
                  </a>}
                  {site && <a className="lead-channel" href={site} target="_blank" rel="noopener noreferrer" aria-label={`Abrir site de ${lead.name}`} title="Site">
                    <Globe2 size={14} /><span>Site</span><ArrowUpRight size={11} />
                  </a>}
                  {lead.email && <button className="lead-channel" onClick={() => void copy(lead.email)} title="Copiar email">
                    <Mail size={14} /><span>Email</span><Copy size={11} />
                  </button>}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Users size={26} />}
          title="Nenhum lead na sua base"
          description="Quando o GX Radar enviar um cliente para o seu usuário, ele aparecerá aqui com os canais disponíveis."
        />
      )}

      <p className="modal-footnote">Os leads do GX Radar ficam separados das empresas do ecossistema. <button className="text-link" onClick={onClose}><X size={12} />Fechar</button></p>
    </Modal>
  );
}
