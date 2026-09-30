import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  MapPin,
  DollarSign,
  Pencil,
  Trash2,
  LayoutList,
  Building2,
  StickyNote,
  FileText,
  Mail,
  Sparkles,
  Undo2,
  Archive,
  ExternalLink,
  Check,
  Brain,
  ChevronDown,
} from 'lucide-react';
import { Button } from './Button';
import { CompanyLogo } from './CompanyLogo';

export type ApplicationStatus =
  | 'wishlist'
  | 'preparing'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'archived';

export interface DetailsApplication {
  id: string;
  company: string;
  company_domain?: string | null;
  position: string;
  status: ApplicationStatus;
  url?: string;
  salary?: string;
  location?: string;
  notes?: string;
  job_description?: string;
  contact_name?: string | null;
  contact_email?: string | null;
  deadline?: string;
  status_history?: Array<{ status: string; date: string }>;
  created_at?: string;
  updated_at: string;
}

export interface DetailsResumeVersion {
  id: string;
  ats_score: number;
  created_at: string;
  tailored_details?: any;
  validation_alerts?: Array<{ section?: string; message?: string; text?: string }>;
}

export interface DetailsCoverLetter {
  id: string;
  tone: string;
  length: string;
  content: string;
  created_at: string;
}

type TabId = 'overview' | 'company' | 'notes' | 'documents' | 'insights';

interface Props {
  app: DetailsApplication;
  statusOptions: ReadonlyArray<{ id: ApplicationStatus; label: string }>;
  resumeVersions: DetailsResumeVersion[];
  coverLetters: DetailsCoverLetter[];
  previousStatusLabel: string;
  onClose: () => void;
  onStatusChange: (appId: string, status: ApplicationStatus) => void;
  onDelete: (appId: string) => void;
  onEdit: (app: DetailsApplication) => void;
  onRestore: (appId: string) => void;
  onArchive: (appId: string) => void;
  onOpenEditor: () => void;
  onOpenVersion: () => void;
  onOpenLetter: () => void;
  onDeleteHistoryStep: (entryIndex: number) => void;
  onDeleteVersion: (versionId: string) => void;
  onPatchFields: (appId: string, fields: Partial<DetailsApplication>) => Promise<void>;
}

const TABS: Array<{ id: TabId; label: string; Icon: React.ElementType }> = [
  { id: 'overview', label: 'Overview', Icon: LayoutList },
  { id: 'company', label: 'Company', Icon: Building2 },
  { id: 'notes', label: 'Notes', Icon: StickyNote },
  { id: 'documents', label: 'Documents', Icon: FileText },
  { id: 'insights', label: 'AI Insights', Icon: Brain },
];

const STATUS_META: Record<string, { label: string; color: string }> = {
  wishlist: { label: 'Wishlist', color: '#94A3B8' },
  preparing: { label: 'Preparing', color: '#38BDF8' },
  applied: { label: 'Applied', color: '#818CF8' },
  interview: { label: 'Interview', color: '#FBBF24' },
  offer: { label: 'Offer', color: '#34D399' },
  rejected: { label: 'Rejected', color: '#F87171' },
  archived: { label: 'Archived', color: '#64748B' },
};

// Compact custom status dropdown (dot + label, theme-aware, wraps on mobile).
const StatusSelect: React.FC<{
  value: string;
  options: ReadonlyArray<{ id: string; label: string }>;
  onChange: (status: ApplicationStatus) => void;
}> = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  const current = STATUS_META[value] ?? { label: value, color: '#94A3B8' };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Change application status"
        className="inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-lg border border-cardline bg-card text-foreground text-xs font-bold hover:border-primary transition-colors max-w-[150px]"
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: current.color }} />
        <span className="truncate capitalize">{current.label}</span>
        <ChevronDown size={13} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-[calc(100%+6px)] min-w-[160px] p-1 rounded-xl bg-card border border-cardline shadow-lg z-[100]"
        >
          {options.map((s) => {
            const meta = STATUS_META[s.id] ?? { label: s.label, color: '#94A3B8' };
            const active = s.id === value;
            return (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setOpen(false);
                  if (!active) onChange(s.id as ApplicationStatus);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-mutedlight'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                <span className="flex-1 text-left truncate capitalize">{meta.label}</span>
                {active && <Check size={13} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Flatten AI keyword payloads (arrays of strings, {name} objects, or
// category-keyed objects) into plain name lists.
const kwNames = (v: any): string[] => {
  if (!v) return [];
  const one = (k: any): string | null => {
    if (typeof k === 'string') return k.trim() || null;
    if (k && typeof k.name === 'string' && k.name.trim()) return k.name.trim();
    return null;
  };
  if (Array.isArray(v)) return v.map(one).filter(Boolean) as string[];
  if (typeof v === 'object') return Object.values(v).flat().map(one).filter(Boolean) as string[];
  return [];
};

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toDateString();
};

export const ApplicationDetailsPopover: React.FC<Props> = (p) => {
  const { app } = p;
  const [tab, setTab] = useState<TabId>('overview');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(app.job_description || '');
  const [savingDesc, setSavingDesc] = useState(false);
  const [notesDraft, setNotesDraft] = useState(app.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSavedTick, setNotesSavedTick] = useState(false);

  // Reset per-application UI state when switching cards.
  useEffect(() => {
    setTab('overview');
    setEditingDesc(false);
    setDescDraft(app.job_description || '');
    setNotesDraft(app.notes || '');
    setNotesSavedTick(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.id]);

  // Keep drafts in sync after a successful save round-trip.
  useEffect(() => {
    setDescDraft(app.job_description || '');
  }, [app.job_description]);
  useEffect(() => {
    setNotesDraft(app.notes || '');
  }, [app.notes]);

  // Esc closes the popover.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') p.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDescription = async () => {
    setSavingDesc(true);
    try {
      await p.onPatchFields(app.id, { job_description: descDraft });
      setEditingDesc(false);
    } finally {
      setSavingDesc(false);
    }
  };

  const saveNotes = async () => {
    if (notesDraft === (app.notes || '')) return;
    setSavingNotes(true);
    try {
      await p.onPatchFields(app.id, { notes: notesDraft });
      setNotesSavedTick(true);
      setTimeout(() => setNotesSavedTick(false), 2500);
    } finally {
      setSavingNotes(false);
    }
  };

  const history = [...(app.status_history || [])].reverse();

  return (
    <div
      className="fixed inset-0 z-[800] bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 md:p-6"
      onClick={p.onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Job details"
    >
      <div
        className="w-[min(1120px,100%)] h-[min(800px,calc(100vh-2rem))] md:h-[min(800px,calc(100vh-4rem))] bg-card border border-cardline rounded-2xl shadow-lg flex flex-col overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-cardline shrink-0">
          <h3 className="font-header text-base md:text-lg font-bold text-foreground">Job Details</h3>
          <button
            type="button"
            onClick={p.onClose}
            aria-label="Close job details"
            className="w-[30px] h-[30px] rounded-md flex items-center justify-center text-muted hover:text-foreground hover:bg-mutedlight transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Identity header */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-3 px-4 md:px-6 py-4 border-b border-cardline shrink-0">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="shrink-0 w-14 h-14 rounded-lg border border-cardline bg-mutedlight flex items-center justify-center overflow-hidden">
              <CompanyLogo company={app.company} domain={app.company_domain} size={40} />
            </div>
            <div className="min-w-0">
              <h2 className="font-header text-lg md:text-xl font-extrabold text-foreground truncate">{app.position}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
                  <Building2 size={14} className="text-muted" />
                  <span className="truncate max-w-[180px]" title={app.company}>{app.company}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} />
                  <span className="truncate max-w-[180px]">{app.location || 'Location Not Specified'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <DollarSign size={14} />
                  <span className="truncate max-w-[180px]">Salary: {app.salary || 'Not specified'}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start lg:items-end gap-1 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => p.onDelete(app.id)}
                title="Delete application"
                aria-label="Delete application"
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-danger/60 text-danger hover:bg-danger/10 transition-colors"
              >
                <Trash2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => p.onEdit(app)}
                title="Edit application"
                aria-label="Edit application"
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-primary/60 text-primary hover:bg-primary/10 transition-colors"
              >
                <Pencil size={14} />
              </button>
              {app.status === 'archived' ? (
                <button
                  type="button"
                  onClick={() => p.onRestore(app.id)}
                  title={`Restore to ${p.previousStatusLabel}`}
                  aria-label="Restore application"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-cardline text-foreground hover:border-success hover:text-success transition-colors"
                >
                  <Undo2 size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => p.onArchive(app.id)}
                  title="Archive application"
                  aria-label="Archive application"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-cardline text-muted hover:text-foreground hover:border-muted transition-colors"
                >
                  <Archive size={14} />
                </button>
              )}
              <StatusSelect
                value={app.status}
                options={p.statusOptions}
                onChange={(s) => p.onStatusChange(app.id, s)}
              />
            </div>
            {app.created_at && (
              <p className="text-xs text-muted">Added on {formatDate(app.created_at)}.</p>
            )}
          </div>
        </div>

        {/* 3-column body */}
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          <div className="grid lg:grid-cols-[190px_minmax(0,1fr)_270px] min-h-full lg:h-full">
            {/* Left tabs */}
            <nav
              aria-label="Detail sections"
              className="flex lg:flex-col gap-1.5 p-3 lg:p-4 lg:border-r border-b lg:border-b-0 border-cardline overflow-x-auto lg:overflow-visible shrink-0"
            >
              {TABS.map(({ id, label, Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    aria-current={active ? 'true' : undefined}
                    className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors border ${
                      active
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-transparent text-muted hover:text-foreground hover:bg-mutedlight'
                    }`}
                  >
                    <Icon size={17} />
                    {label}
                  </button>
                );
              })}
            </nav>

            {/* Middle content */}
            <div className="p-4 md:p-6 lg:overflow-y-auto lg:min-h-0 thin-scrollbar">
              {tab === 'overview' && (
                <div>
                  {app.url && (
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[13px] font-bold text-primary hover:underline mb-3"
                    >
                      Open job posting <ExternalLink size={13} />
                    </a>
                  )}
                  <h4 className="font-header text-xl font-bold text-foreground mb-4">Description</h4>
                  {app.job_description ? (
                    editingDesc ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={descDraft}
                          onChange={(e) => setDescDraft(e.target.value)}
                          rows={10}
                          className="w-full px-3 py-2.5 rounded-lg border border-cardline bg-card text-foreground text-sm outline-none focus:border-primary resize-y"
                        />
                        <div className="flex gap-2">
                          <Button onClick={saveDescription} isLoading={savingDesc} style={{ padding: '8px 16px', fontSize: '13px' }}>
                            Save Description
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setDescDraft(app.job_description || '');
                              setEditingDesc(false);
                            }}
                            style={{ padding: '8px 16px', fontSize: '13px' }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div
                          className="whitespace-pre-wrap max-h-[420px] overflow-y-auto thin-scrollbar pr-1"
                          style={{
                            fontFamily: "Georgia, 'Times New Roman', serif",
                            fontSize: '14.5px',
                            lineHeight: 1.75,
                            color: 'var(--foreground)',
                          }}
                        >
                          {app.job_description}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingDesc(true)}
                          className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-primary hover:underline"
                        >
                          <Pencil size={12} /> Edit description
                        </button>
                      </div>
                    )
                  ) : editingDesc ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={descDraft}
                        onChange={(e) => setDescDraft(e.target.value)}
                        rows={8}
                        placeholder="Paste the full job advertisement description text here..."
                        className="w-full px-3 py-2.5 rounded-lg border border-cardline bg-card text-foreground text-sm outline-none focus:border-primary resize-y"
                      />
                      <div className="flex gap-2">
                        <Button onClick={saveDescription} isLoading={savingDesc} style={{ padding: '8px 16px', fontSize: '13px' }}>
                          Save Description
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setDescDraft('');
                            setEditingDesc(false);
                          }}
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center py-6">
                      <div className="w-20 h-20 rounded-2xl bg-sky-100 dark:bg-sky-500/10 flex items-center justify-center mb-5">
                        <FileText size={44} className="text-sky-300 dark:text-sky-400" />
                      </div>
                      <p className="font-header text-lg font-bold text-foreground mb-3">
                        This job does not have any description
                      </p>
                      <p className="text-sm text-muted leading-relaxed max-w-[520px] mb-6">
                        You can edit this job to add a description to it. Once you add a description
                        you will also be able to tailor your CV against it.
                      </p>
                      <Button onClick={() => setEditingDesc(true)} style={{ padding: '10px 22px', fontSize: '14px' }}>
                        Add Description
                      </Button>
                    </div>
                  )}

                  <Button onClick={p.onOpenEditor} className="w-full mt-5">
                    <Sparkles size={16} />
                    <span>Launch Tailoring Canvas</span>
                  </Button>
                </div>
              )}

              {tab === 'company' && (
                <div>
                  <h4 className="font-header text-xl font-bold text-foreground mb-4">Company</h4>
                  <div className="flex flex-col gap-3">
                    {[
                      { label: 'Company Name', value: app.company },
                      { label: 'Company Domain', value: app.company_domain || '—' },
                      { label: 'Location', value: app.location || 'Not Specified' },
                      { label: 'Contact Name', value: app.contact_name || '—' },
                      { label: 'Contact Email', value: app.contact_email || '—' },
                    ].map((row) => (
                      <div key={row.label} className="flex flex-col gap-0.5 border-b border-cardline pb-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">{row.label}</span>
                        <span className="text-sm font-semibold text-foreground break-words">{row.value}</span>
                      </div>
                    ))}
                    {app.url && (
                      <div className="flex flex-col gap-0.5 border-b border-cardline pb-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Job Posting URL</span>
                        <a href={app.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-secondary hover:text-secondaryhover text-sm break-all">
                          {app.url} <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                  <Button variant="secondary" onClick={() => p.onEdit(app)} className="mt-4">
                    <Pencil size={14} />
                    <span>Edit Company Details</span>
                  </Button>
                </div>
              )}

              {tab === 'notes' && (
                <div>
                  <h4 className="font-header text-xl font-bold text-foreground mb-4">Notes</h4>
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={10}
                    placeholder="Add any details, contact notes or interview dates."
                    className="w-full px-3 py-2.5 rounded-lg border border-cardline bg-card text-foreground text-sm outline-none focus:border-primary resize-y"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      onClick={saveNotes}
                      isLoading={savingNotes}
                      disabled={notesDraft === (app.notes || '')}
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      Save Notes
                    </Button>
                    {notesSavedTick && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-success">
                        <Check size={13} /> Saved
                      </span>
                    )}
                  </div>
                </div>
              )}

              {tab === 'documents' && (
                <div>
                  <h4 className="font-header text-xl font-bold text-foreground mb-4">Documents</h4>
                  {p.resumeVersions.length === 0 && p.coverLetters.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-8">
                      <div className="w-16 h-16 rounded-2xl bg-mutedlight flex items-center justify-center mb-4">
                        <FileText size={32} className="text-muted" />
                      </div>
                      <p className="font-header text-base font-bold text-foreground mb-2">No tailored documents yet</p>
                      <p className="text-sm text-muted leading-relaxed max-w-[440px] mb-5">
                        Tailored CV versions and cover letters for this application will appear here.
                      </p>
                      <Button onClick={p.onOpenEditor} style={{ padding: '9px 18px', fontSize: '13px' }}>
                        <Sparkles size={15} />
                        <span>Launch Tailoring Canvas</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {p.resumeVersions.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Tailored Resumes</p>
                          {p.resumeVersions.map((v) => (
                            <div key={v.id} className="flex justify-between items-center bg-mutedlight/60 border border-cardline px-3 py-2 rounded-lg">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText size={16} className="text-primary shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-foreground m-0">Tailored Resume</p>
                                  <span className="text-[10px] text-muted">
                                    Score:{' '}
                                    <strong style={{ color: v.ats_score > 80 ? 'var(--success)' : 'var(--warning)' }}>
                                      {v.ats_score}%
                                    </strong>{' '}
                                    • {new Date(v.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1 items-center shrink-0">
                                <Button variant="ghost" onClick={p.onOpenVersion} style={{ padding: '6px 12px', fontSize: '12px' }}>
                                  Open
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => p.onDeleteVersion(v.id)}
                                  style={{ color: 'var(--danger)', padding: '6px 8px' }}
                                  title="Delete CV version"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {p.coverLetters.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Cover Letters</p>
                          {p.coverLetters.map((l) => (
                            <div key={l.id} className="flex justify-between items-center bg-mutedlight/60 border border-cardline px-3 py-2 rounded-lg">
                              <div className="flex items-center gap-2 min-w-0">
                                <Mail size={16} className="text-primary shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-foreground m-0 capitalize">{l.tone} Letter</p>
                                  <span className="text-[10px] text-muted">
                                    {l.length} • {new Date(l.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0">
                                <Button variant="ghost" onClick={p.onOpenLetter} style={{ padding: '6px 12px', fontSize: '12px' }}>
                                  Open
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tab === 'insights' && (
                <div>
                  <h4 className="font-header text-xl font-bold text-foreground mb-4">AI Insights</h4>
                  {(() => {
                    const version = p.resumeVersions[0];
                    if (!version) {
                      return (
                        <div className="flex flex-col items-center text-center py-8">
                          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <Brain size={30} className="text-primary" />
                          </div>
                          <p className="font-header text-base font-bold text-foreground mb-2">No AI insights yet</p>
                          <p className="text-sm text-muted leading-relaxed max-w-[440px] mb-5">
                            Once you generate a tailored resume for this job, the AI&apos;s analysis —
                            match score, keywords, recruiter impression and gaps — will appear here.
                          </p>
                          <Button onClick={p.onOpenEditor} style={{ padding: '9px 18px', fontSize: '13px' }}>
                            <Sparkles size={15} />
                            <span>Generate Tailored Resume</span>
                          </Button>
                        </div>
                      );
                    }
                    const details = version.tailored_details || {};
                    const report = details.ats_report || {};
                    const deep = details.deep_analysis || {};
                    const score = typeof report.score === 'number' ? report.score : version.ats_score;
                    const breakdown = report.breakdown || {};
                    const matched = report.all_matched || [];
                    const missingRaw = report.all_missing || [];
                    const missing = missingRaw.length > 0
                      ? missingRaw
                      : [...kwNames(report.missing_keywords)].map((name) => ({ name, category: 'missing' }));
                    const suggestions: string[] = report.suggestions || [];
                    const impression = deep.recruiter_impression || {};
                    const gaps: Array<{ gap: string; cover_letter_tip?: string }> =
                      deep.fit_report?.gaps || [];
                    const alerts = version.validation_alerts || [];
                    const bars = [
                      { label: 'Keywords', val: breakdown.keywords },
                      { label: 'Experience', val: breakdown.bullets },
                      { label: 'Structure', val: breakdown.structure },
                    ].filter((b) => typeof b.val === 'number');
                    return (
                      <div className="flex flex-col gap-4">
                        {/* Score hero */}
                        <div className="flex items-center gap-4 bg-mutedlight/60 border border-cardline rounded-xl px-4 py-3">
                          <span
                            className="font-header text-3xl font-extrabold"
                            style={{ color: score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--danger)' }}
                          >
                            {Math.round(score)}%
                          </span>
                          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-muted m-0">ATS Match Score</p>
                            {bars.map((b) => (
                              <div key={b.label} className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-muted w-[70px] shrink-0">{b.label}</span>
                                <div className="flex-1 h-1.5 rounded-full bg-cardline/60 overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${Math.min(100, Math.max(0, b.val))}%`, background: 'var(--primary)' }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-foreground w-7 text-right">{Math.round(b.val)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Recruiter impression */}
                        {(impression.verdict || impression.first_impression ||
                          (impression.strengths || []).length > 0 || (impression.concerns || []).length > 0) && (
                          <div className="flex flex-col gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-muted m-0">Recruiter Impression</p>
                            {impression.verdict && (
                              <p className="text-[13px] font-bold text-primary m-0">{impression.verdict}</p>
                            )}
                            {impression.first_impression && (
                              <p className="text-[13px] text-foreground leading-relaxed m-0">{impression.first_impression}</p>
                            )}
                            {(impression.strengths || []).length > 0 && (
                              <ul className="m-0 pl-4 flex flex-col gap-1">
                                {(impression.strengths || []).map((s: string, i: number) => (
                                  <li key={i} className="text-[13px] text-success leading-snug">+ {s}</li>
                                ))}
                              </ul>
                            )}
                            {(impression.concerns || []).length > 0 && (
                              <ul className="m-0 pl-4 flex flex-col gap-1">
                                {(impression.concerns || []).map((s: string, i: number) => (
                                  <li key={i} className="text-[13px] text-warning leading-snug">! {s}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        {/* Gaps + cover-letter tips */}
                        {gaps.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-muted m-0">Gaps to Address</p>
                            {gaps.map((gap, i) => (
                              <div key={i} className="bg-mutedlight/60 border border-cardline rounded-lg px-3 py-2">
                                <p className="text-[13px] font-semibold text-foreground m-0">{gap.gap}</p>
                                {gap.cover_letter_tip && (
                                  <p className="text-xs text-muted leading-relaxed m-0 mt-1">
                                    <strong className="text-primary">Cover letter tip:</strong> {gap.cover_letter_tip}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Keywords */}
                        {(matched.length > 0 || missing.length > 0) && (
                          <div className="flex flex-col gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-muted m-0">
                              Keywords · {matched.length} matched / {missing.length} missing
                            </p>
                            {missing.slice(0, 14).length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {missing.slice(0, 14).map((k: any, i: number) => (
                                  <span key={i} className="text-[11px] font-semibold text-warning bg-amber-500/10 px-2 py-0.5 rounded-full">
                                    {typeof k === 'string' ? k : k.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            {matched.slice(0, 14).length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {matched.slice(0, 14).map((k: any, i: number) => (
                                  <span key={i} className="text-[11px] font-semibold text-success bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    {typeof k === 'string' ? k : k.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Suggestions */}
                        {suggestions.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-muted m-0">Suggestions</p>
                            <ul className="m-0 pl-4 flex flex-col gap-1.5">
                              {suggestions.slice(0, 5).map((s, i) => (
                                <li key={i} className="text-[13px] text-foreground leading-relaxed">{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Validation alerts */}
                        {alerts.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-muted m-0">Review Flags</p>
                            {alerts.map((a, i) => (
                              <p key={i} className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 m-0">
                                {a.section ? <strong>[{a.section}] </strong> : null}
                                {a.message || a.text || 'Needs review'}
                              </p>
                            ))}
                          </div>
                        )}

                        <Button variant="secondary" onClick={p.onOpenEditor} className="w-full">
                          <Sparkles size={15} />
                          <span>Open in Tailoring Canvas</span>
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Right timeline */}
            <aside aria-label="Status history" className="p-4 md:p-5 lg:border-l border-t lg:border-t-0 border-cardline lg:overflow-y-auto lg:min-h-0 thin-scrollbar">
              <h4 className="font-header text-lg font-bold text-foreground mb-4">Timeline</h4>
              {history.length === 0 ? (
                <p className="text-xs text-muted">No history yet.</p>
              ) : (
                <ol className="relative flex flex-col gap-3 pl-5 before:content-[''] before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-[2px] before:bg-cardline before:rounded">
                  {history.map((h, i) => {
                    const isCreation = i === history.length - 1;
                    const prevEntry = history[i + 1];
                    // Index into the chronological status_history array.
                    const entryIndex = history.length - 1 - i;
                    return (
                      <li key={`${h.status}-${h.date}-${i}`} className="relative group">
                        <span className="absolute -left-5 top-1.5 w-[11px] h-[11px] rounded-full bg-muted border-2 border-card translate-x-[0.5px]" />
                        <div className="relative bg-mutedlight/60 border border-cardline rounded-lg px-3 py-2 pr-7">
                          <button
                            type="button"
                            onClick={() => p.onDeleteHistoryStep(entryIndex)}
                            title="Delete this timeline entry"
                            aria-label="Delete this timeline entry"
                            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center text-muted opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 hover:text-danger hover:bg-danger/10 transition-all"
                          >
                            <X size={12} />
                          </button>
                          <p className="text-[13px] font-bold text-foreground m-0">
                            {isCreation ? 'New Job created' : `Moved to ${capitalize(h.status)}`}
                          </p>
                          <p className="text-[11px] text-muted m-0 mt-0.5 leading-snug">
                            {isCreation
                              ? 'You added a new job'
                              : prevEntry
                                ? `You moved this job from ${capitalize(prevEntry.status)} to ${capitalize(h.status)}`
                                : `Status set to ${capitalize(h.status)}`}
                          </p>
                          <p className="text-[10px] text-muted/80 m-0 mt-1">{formatDate(h.date)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};
