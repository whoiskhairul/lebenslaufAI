import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { InputField } from '../components/InputField';
import api from '../services/api';
import { navigateTo } from '../utils/navigation';
import { CompanyAutocomplete } from '../components/CompanyAutocomplete';
import { CompanyLogo } from '../components/CompanyLogo';
import { KanbanCardSkeleton } from '../components/skeleton/DashboardSkeleton';
import { Skeleton } from '../components/skeleton/Skeleton';
import { Plus, Calendar, MapPin, DollarSign, ArrowLeft, ArrowRight, Trash2, ExternalLink, Sparkles, Info, FileText, Archive, Undo2, Search } from 'lucide-react';

// Shared utility class strings for the kanban icon buttons
const iconBtnBase = 'w-[26px] h-[26px] rounded-md flex items-center justify-center text-muted transition-colors';
const fieldLabelCls = 'font-header text-xs font-bold uppercase tracking-wide text-muted';

// Truncate long job titles to keep kanban cards compact (full text on hover / click)
const TITLE_MAX_WORDS = 6;
const truncateTitle = (text: string): { display: string; truncated: boolean } => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= TITLE_MAX_WORDS) return { display: text, truncated: false };
  return { display: words.slice(0, TITLE_MAX_WORDS).join(' ') + ' …', truncated: true };
};


interface Application {
  id: string;
  company: string;
  company_domain?: string | null;
  position: string;
  status: 'wishlist' | 'preparing' | 'applied' | 'interview' | 'offer' | 'rejected' | 'archived';
  url?: string;
  salary?: string;
  location?: string;
  notes?: string;
  job_description?: string;
  deadline?: string;
  status_history?: Array<{ status: string; date: string }>;
  updated_at: string;
}

interface DashboardProps {
  onNavigateToEditor: (params?: { company?: string; position?: string; desc?: string; application_id?: string }) => void;
  activeAppId?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToEditor, activeAppId }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [atsScores, setAtsScores] = useState<Record<string, number>>({});
  const [resumeVersions, setResumeVersions] = useState<any[]>([]);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Selected Card Details Sidebar State
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Board vs Archived list view
  const [activeView, setActiveView] = useState<'board' | 'archived'>('board');
  const [archivedSearch, setArchivedSearch] = useState('');

  // Job titles expanded in place (kanban cards)
  const [expandedTitles, setExpandedTitles] = useState<Record<string, boolean>>({});

  // Form Fields
  const [company, setCompany] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState<'wishlist' | 'preparing' | 'applied' | 'interview' | 'offer' | 'rejected'>('wishlist');
  const [url, setUrl] = useState('');
  const [salary, setSalary] = useState('');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const fetchApplications = async () => {
    try {
      const res = await api.get('/applications');
      if (res.data) {
        setApplications(res.data);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    }
  };

  const fetchAtsScores = async () => {
    try {
      const res = await api.get('/resume/versions');
      if (res.data) {
        setResumeVersions(res.data);
        const scores: Record<string, number> = {};
        res.data.forEach((v: any) => {
          if (v.application) {
            scores[v.application] = Math.max(scores[v.application] || 0, v.ats_score);
          }
        });
        setAtsScores(scores);
      }

      const lettersRes = await api.get('/resume/letters');
      if (lettersRes.data) {
        setCoverLetters(lettersRes.data);
      }
    } catch (err) {
      console.error('Error fetching ATS scores/letters:', err);
    }
  };

  useEffect(() => {
    const initData = async () => {
      setIsInitialLoading(true);
      await Promise.all([fetchApplications(), fetchAtsScores()]);
      setIsInitialLoading(false);
    };
    initData();
  }, []);

  useEffect(() => {
    if (activeAppId && applications.length > 0) {
      const matched = applications.find(a => a.id === activeAppId);
      if (matched) {
        // Deep-linking an archived card opens the Archived view instead of the board.
        setActiveView(matched.status === 'archived' ? 'archived' : 'board');
        setSelectedApp(matched);
        setIsDetailsOpen(true);
      }
    } else if (!activeAppId) {
      setIsDetailsOpen(false);
      setSelectedApp(null);
    }
  }, [activeAppId, applications]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !position) {
      setErrorMsg('Company and Position are required fields.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');

    try {
      await api.post('/applications', {
        company, company_domain: companyDomain || null, position, status, url, salary, location, deadline, notes, job_description: jobDescription
      });
      setIsModalOpen(false);
      // Reset form
      setCompany('');
      setCompanyDomain('');
      setPosition('');
      setStatus('wishlist');
      setUrl('');
      setSalary('');
      setLocation('');
      setDeadline('');
      setNotes('');
      setJobDescription('');
      fetchApplications();
      fetchAtsScores();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error?.message || 'Failed to create job tracking card.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (appId: string, newStatus: Application['status']) => {
    try {
      await api.patch(`/applications/${appId}`, { status: newStatus });
      fetchApplications();
      // If details pane is open, sync details
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (appId: string) => {
    await handleUpdateStatus(appId, 'archived');
  };

  const previousStatusFor = (app: Application): Application['status'] => {
    const history = app.status_history || [];
    for (let i = history.length - 1; i >= 0; i--) {
      const s = history[i]?.status;
      if (s && s !== 'archived') return s as Application['status'];
    }
    return 'wishlist';
  };

  const handleRestore = async (appId: string) => {
    const app = applications.find(a => a.id === appId) || selectedApp;
    const target = app ? previousStatusFor(app) : 'wishlist';
    await handleUpdateStatus(appId, target);
  };

  const handleDelete = async (appId: string) => {
    if (!window.confirm('Are you sure you want to remove this job tracking card?')) return;
    try {
      await api.delete(`/applications/${appId}`);
      setIsDetailsOpen(false);
      setSelectedApp(null);
      navigateTo('/dashboard');
      fetchApplications();
      fetchAtsScores();
    } catch (err) {
      console.error('Failed to delete application:', err);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!window.confirm('Are you sure you want to delete this tailored CV version?')) return;
    try {
      await api.delete(`/resume/versions/${versionId}`);
      fetchAtsScores();
    } catch (err) {
      console.error('Failed to delete tailored CV version:', err);
    }
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.setData('text/plain', appId);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: Application['status']) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('text/plain');
    if (appId) {
      handleUpdateStatus(appId, targetStatus);
    }
  };

  // Metrics calculators (archived cards are excluded from the active pipeline)
  const activeApplications = applications.filter(a => a.status !== 'archived');
  const archivedApplications = applications.filter(a => a.status === 'archived');
  const totalApps = activeApplications.length;
  const interviewApps = activeApplications.filter(a => a.status === 'interview').length;
  const offerApps = activeApplications.filter(a => a.status === 'offer').length;

  const scoreValues = Object.values(atsScores);
  const avgMatchScore = scoreValues.length > 0
    ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
    : '--';

  const conversionRate = totalApps > 0 ? Math.round((offerApps / totalApps) * 100) : 0;

  const columns = [
    { id: 'wishlist', label: 'Wishlist', color: '#94A3B8' },
    { id: 'preparing', label: 'Preparing', color: '#38BDF8' },
    { id: 'applied', label: 'Applied', color: '#818CF8' },
    { id: 'interview', label: 'Interview', color: '#FBBF24' },
    { id: 'offer', label: 'Offer', color: '#34D399' },
    { id: 'rejected', label: 'Rejected', color: '#F87171' },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      {/* Top Banner Row - Renders immediately! */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4 md:mb-6 shrink-0">
        <div>
          <h2 className="font-header text-xl md:text-2xl font-extrabold text-foreground">Career Command Center</h2>
          <p className="text-xs md:text-sm text-muted">Track applications, verify conversions, and launch tailoring tasks.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-mutedlight rounded-lg p-1" role="tablist" aria-label="Board or archived view">
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'board'}
              onClick={() => setActiveView('board')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${activeView === 'board' ? 'bg-card text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}
            >
              Board ({isInitialLoading ? '…' : activeApplications.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'archived'}
              onClick={() => setActiveView('archived')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1 ${activeView === 'archived' ? 'bg-card text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}
            >
              <Archive size={13} />
              Archived ({isInitialLoading ? '…' : archivedApplications.length})
            </button>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 justify-center">
            <Plus size={18} />
            <span>Track Application</span>
          </Button>
        </div>
      </div>

      {/* Analytics Panel - Values show inline skeleton while loading */}
      <div className="grid grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 md:gap-4 mb-6 md:mb-8 shrink-0">
        <div className="glass-card px-4 py-3 md:px-6 md:py-4 text-left">
          <p className={fieldLabelCls}>Total Applications</p>
          <p className="font-header text-lg md:text-2xl font-extrabold text-foreground">
            {isInitialLoading ? <Skeleton variant="text" width={40} height={28} /> : totalApps}
          </p>
        </div>
        <div className="glass-card px-4 py-3 md:px-6 md:py-4 text-left">
          <p className={fieldLabelCls}>Average Match Score</p>
          <p className="font-header text-lg md:text-2xl font-extrabold text-foreground">
            {isInitialLoading ? (
              <Skeleton variant="text" width={55} height={28} />
            ) : avgMatchScore === '--' ? (
              avgMatchScore
            ) : (
              `${avgMatchScore}%`
            )}
          </p>
        </div>
        <div className="glass-card px-4 py-3 md:px-6 md:py-4 text-left">
          <p className={fieldLabelCls}>Upcoming Interviews</p>
          <p className="font-header text-lg md:text-2xl font-extrabold text-foreground">
            {isInitialLoading ? <Skeleton variant="text" width={40} height={28} /> : interviewApps}
          </p>
        </div>
        <div className="glass-card px-4 py-3 md:px-6 md:py-4 text-left">
          <p className={fieldLabelCls}>Conversion Rate</p>
          <p className="font-header text-lg md:text-2xl font-extrabold text-foreground">
            {isInitialLoading ? <Skeleton variant="text" width={50} height={28} /> : `${conversionRate}%`}
          </p>
        </div>
      </div>

      {/* Kanban Board Container - Board layout & headers render immediately */}
      {activeView === 'board' ? (
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-1 pb-4 snap-x snap-proximity md:snap-none thin-scrollbar">
        <div className="flex gap-3.5 h-full min-w-[1000px]">
          {columns.map((col) => {
            const colApps = activeApplications.filter((app) => app.status === col.id);
            const isDragOver = dragOverCol === col.id;
            return (
              <div
                key={col.id}
                style={{ '--col-accent': col.color } as React.CSSProperties}
                className={`relative overflow-hidden flex-1 flex flex-col bg-card border border-cardline rounded-[14px] p-3 min-w-[240px] h-full transition-all duration-200
                  before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-[var(--col-accent,var(--primary))] before:opacity-85
                  ${isDragOver ? 'border-[var(--col-accent,var(--primary))] shadow-[0_0_0_2px_var(--col-accent,var(--primary))] scale-[1.01]' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverCol !== col.id) {
                    setDragOverCol(col.id);
                  }
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => {
                  handleDrop(e, col.id);
                  setDragOverCol(null);
                }}
              >
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-cardline shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[var(--col-accent,var(--primary))] shadow-[0_0_6px_var(--col-accent,transparent)] shrink-0"></span>
                    <h3 className="font-header text-sm font-bold text-foreground truncate">{col.label}</h3>
                  </div>
                  <span className="text-xs font-bold text-muted bg-mutedlight px-2 py-0.5 rounded-full shrink-0">
                    {isInitialLoading ? <Skeleton variant="text" width={16} height={14} /> : colApps.length}
                  </span>
                </div>

                <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto px-0.5 pb-1.5 thin-scrollbar">
                  {isInitialLoading ? (
                    <>
                      <KanbanCardSkeleton />
                      <KanbanCardSkeleton />
                    </>
                  ) : colApps.length === 0 ? (
                    <div className="flex justify-center items-center h-[72px] text-muted text-xs border-[1.5px] border-dashed border-cardline rounded-[10px] opacity-80">No items</div>
                  ) : (
                    colApps.map((app) => {
                      const score = atsScores[app.id];
                      return (
                        <div
                          key={app.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, app.id)}
                          onClick={() => {
                            setSelectedApp(app);
                            setIsDetailsOpen(true);
                            navigateTo(`/dashboard?appId=${app.id}`);
                          }}
                          className="px-4 py-3 text-left flex flex-col bg-card border border-cardline rounded-xl shadow-sm animate-cardSlideIn cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--col-accent,var(--primary))] active:scale-[0.98]"
                        >


                          <div>
                            <div className="flex justify-between items-start gap-2">
                              {(() => {
                                const t = truncateTitle(app.position);
                                const isExpanded = !!expandedTitles[app.id];
                                return (
                                  <h4
                                    className={`font-header text-sm font-bold text-foreground mb-0.5 break-words ${t.truncated ? 'cursor-pointer' : ''}`}
                                    title={app.position}
                                    onClick={t.truncated ? (e) => {
                                      e.stopPropagation();
                                      setExpandedTitles(prev => ({ ...prev, [app.id]: !isExpanded }));
                                    } : undefined}
                                  >
                                    {!t.truncated ? app.position : (
                                      <span>
                                        {isExpanded ? app.position : t.display}{' '}
                                        <span className="text-primary font-semibold text-xs">{isExpanded ? '(less)' : '(more)'}</span>
                                      </span>
                                    )}
                                  </h4>
                                );
                              })()}
                              {score !== undefined && (
                                <span
                                  className={`text-[10px] font-bold px-[5px] py-px rounded shrink-0 ${score > 80 ? 'bg-emerald-500/10 text-success' : 'bg-amber-500/10 text-warning'}`}
                                >
                                  {score}%
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <CompanyLogo company={app.company} domain={app.company_domain} size={24} />
                              <p className="text-xs text-muted font-medium truncate">{app.company}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 my-3">
                            {app.location && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted">
                                <MapPin size={12} /> {app.location}
                              </span>
                            )}
                            {app.salary && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted">
                                <DollarSign size={12} /> {app.salary}
                              </span>
                            )}
                            {app.deadline && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted">
                                <Calendar size={12} /> {app.deadline}
                              </span>
                            )}
                          </div>

                          {app.notes && <p className="text-xs text-muted leading-normal mb-3 bg-black/[0.03] px-2 py-2 rounded-md max-h-[50px] overflow-hidden text-ellipsis whitespace-nowrap">{app.notes}</p>}

                          <div className="flex justify-between items-center mt-auto border-t border-cardline pt-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  const idx = columns.findIndex(c => c.id === app.status);
                                  if (idx > 0) handleUpdateStatus(app.id, columns[idx - 1].id);
                                }}
                                disabled={app.status === 'wishlist'}
                                title="Move left"
                                className={`${iconBtnBase} hover:bg-mutedlight hover:text-foreground disabled:opacity-30`}
                              >
                                <ArrowLeft size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  const idx = columns.findIndex(c => c.id === app.status);
                                  if (idx < columns.length - 1) handleUpdateStatus(app.id, columns[idx + 1].id);
                                }}
                                disabled={app.status === 'rejected'}
                                title="Move right"
                                className={`${iconBtnBase} hover:bg-mutedlight hover:text-foreground disabled:opacity-30`}
                              >
                                <ArrowRight size={14} />
                              </button>
                            </div>

                            <div className="flex gap-1">
                              <button
                                onClick={() => onNavigateToEditor({
                                  company: app.company,
                                  position: app.position,
                                  desc: app.job_description || app.notes || '',
                                  application_id: app.id
                                })}
                                title="Open Tailoring Canvas"
                                className={`${iconBtnBase} hover:bg-mutedlight hover:text-primary`}
                              >
                                <ExternalLink size={14} />
                              </button>
                              <button onClick={() => handleArchive(app.id)} title="Archive card" className={`${iconBtnBase} hover:bg-mutedlight hover:text-foreground`}>
                                <Archive size={14} />
                              </button>
                              <button onClick={() => handleDelete(app.id)} title="Delete card" className={`${iconBtnBase} hover:bg-mutedlight`}>
                                <Trash2 size={14} className="text-danger" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      ) : (
      /* Archived list view — compact rows, not a kanban board */
      <div className="flex-1 overflow-y-auto p-1 pb-4 thin-scrollbar">
        <div className="glass-card p-4 md:p-6 max-w-[900px] mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <div>
              <h3 className="font-header text-base font-bold text-foreground">Archived Applications</h3>
              <p className="text-xs text-muted">Cards you archived stay here — restore them to their previous column or delete permanently.</p>
            </div>
            <div className="relative md:ml-auto w-full md:w-[280px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={archivedSearch}
                onChange={(e) => setArchivedSearch(e.target.value)}
                placeholder="Search company or position…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-cardline bg-card text-foreground text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          {isInitialLoading ? (
            <>
              <KanbanCardSkeleton />
              <KanbanCardSkeleton />
            </>
          ) : (() => {
            const q = archivedSearch.trim().toLowerCase();
            const rows = archivedApplications.filter(a =>
              !q || a.company.toLowerCase().includes(q) || a.position.toLowerCase().includes(q)
            );
            if (rows.length === 0) {
              return (
                <div className="flex justify-center items-center h-[120px] text-muted text-sm border-[1.5px] border-dashed border-cardline rounded-[10px]">
                  {archivedApplications.length === 0 ? 'Nothing archived yet. Use the archive icon on any card.' : 'No archived cards match your search.'}
                </div>
              );
            }
            return (
              <div className="flex flex-col gap-2">
                {rows.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => {
                      setSelectedApp(app);
                      setIsDetailsOpen(true);
                      navigateTo(`/dashboard?appId=${app.id}`);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-cardline bg-card hover:border-primary hover:shadow-sm cursor-pointer transition-all"
                  >
                    <CompanyLogo company={app.company} domain={app.company_domain} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{app.position}</p>
                      <p className="text-xs text-muted truncate">{app.company}{app.location ? ` • ${app.location}` : ''}</p>
                    </div>
                    <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wide text-muted bg-mutedlight px-2 py-1 rounded-full shrink-0">
                      was: {previousStatusFor(app)}
                    </span>
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRestore(app.id)}
                        title={`Restore to ${previousStatusFor(app)}`}
                        className={`${iconBtnBase} hover:bg-mutedlight hover:text-success`}
                      >
                        <Undo2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(app.id)} title="Delete permanently" className={`${iconBtnBase} hover:bg-mutedlight`}>
                        <Trash2 size={14} className="text-danger" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
      )}

      {/* Slide-out Application Details Side Panel */}
      {isDetailsOpen && selectedApp && (
        <div className="fixed inset-0 z-[800] bg-black/50 backdrop-blur-sm flex items-center justify-center" onClick={() => { setIsDetailsOpen(false); setSelectedApp(null); navigateTo('/dashboard'); }}>
          <div className="absolute top-0 right-0 w-full max-w-[480px] h-auto md:h-full bottom-[calc(76px+env(safe-area-inset-bottom,0px))] md:bottom-0 bg-card border-l border-cardline shadow-lg flex flex-col z-[800] animate-panelSlideIn text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4 border-b border-cardline">
              <h3 className="text-base text-foreground">Application Command Center</h3>
              <Button variant="ghost" onClick={() => { setIsDetailsOpen(false); setSelectedApp(null); navigateTo('/dashboard'); }} className="w-[30px] h-[30px] flex items-center justify-center p-0">
                X
              </Button>
            </div>


            <div className="flex-1 px-4 md:px-6 py-4 md:py-6 overflow-y-auto flex flex-col gap-4 md:gap-6">
              <div className="flex items-center gap-3">
                <CompanyLogo company={selectedApp.company} domain={selectedApp.company_domain} size={44} />
                <div className="flex flex-col gap-1 min-w-0">
                  <h2 className="truncate">{selectedApp.position}</h2>
                  <h3 className="text-primary text-lg font-semibold truncate">{selectedApp.company}</h3>
                  {selectedApp.company_domain && (
                    <span className="text-xs text-muted">{selectedApp.company_domain}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-500/5 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-muted">
                  <MapPin size={16} />
                  <div>
                    <label className={fieldLabelCls}>Location</label>
                    <p className="text-foreground text-sm font-semibold m-0">{selectedApp.location || 'Not Specified'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <DollarSign size={16} />
                  <div>
                    <label className={fieldLabelCls}>Salary</label>
                    <p className="text-foreground text-sm font-semibold m-0">{selectedApp.salary || 'Not Specified'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <Calendar size={16} />
                  <div>
                    <label className={fieldLabelCls}>Deadline</label>
                    <p className="text-foreground text-sm font-semibold m-0">{selectedApp.deadline || 'Not Specified'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <Info size={16} />
                  <div>
                    <label className={fieldLabelCls}>Status</label>
                    <p style={{ textTransform: 'capitalize' }} className="text-foreground text-sm font-semibold m-0">{selectedApp.status}</p>
                  </div>
                </div>
              </div>

              {selectedApp.url && (
                <div className="flex flex-col gap-1">
                  <label className={fieldLabelCls}>Job Listing URL</label>
                  <a href={selectedApp.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-secondary hover:text-secondaryhover text-sm break-all">
                    {selectedApp.url} <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {selectedApp.job_description && (
                <div className="flex flex-col gap-1">
                  <label className={fieldLabelCls}>Raw Job Description</label>
                  <pre className="bg-slate-500/5 p-4 rounded-lg font-body text-xs text-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto border border-cardline">{selectedApp.job_description}</pre>
                </div>
              )}

              {selectedApp.notes && (
                <div className="flex flex-col gap-1">
                  <label className={fieldLabelCls}>Progress Notes</label>
                  <p className="text-sm text-foreground leading-relaxed m-0">{selectedApp.notes}</p>
                </div>
              )}


              {/* Tailored Document Reference */}
              {resumeVersions.filter(v => v.application === selectedApp.id).length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className={fieldLabelCls}>Tailored Document</label>
                  <div className="flex flex-col gap-2 mt-2">
                    {resumeVersions.filter(v => v.application === selectedApp.id).map((v) => (
                      <div key={v.id} className="flex justify-between items-center bg-slate-500/5 border border-cardline px-3 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-primary shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-foreground m-0">Tailored Resume</p>
                            <span className="text-[10px] text-muted">
                              Score: <strong style={{ color: v.ats_score > 80 ? 'var(--success)' : 'var(--warning)' }}>{v.ats_score}%</strong> • {new Date(v.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setIsDetailsOpen(false);
                              onNavigateToEditor({
                                company: selectedApp.company,
                                position: selectedApp.position,
                                desc: selectedApp.job_description || selectedApp.notes || '',
                                application_id: selectedApp.id
                              });
                            }}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            Open
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => handleDeleteVersion(v.id)}
                            style={{ color: 'var(--danger)', padding: '6px 8px' }}
                            title="Delete CV version"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-cardline">
                <Button
                  onClick={() => {
                    setIsDetailsOpen(false);
                    onNavigateToEditor({
                      company: selectedApp.company,
                      position: selectedApp.position,
                      desc: selectedApp.job_description || selectedApp.notes || '',
                      application_id: selectedApp.id
                    });
                  }}
                  className="w-full"
                >
                  <Sparkles size={16} />
                  <span>Launch Tailoring Canvas</span>
                </Button>

                {selectedApp.status === 'archived' ? (
                  <Button
                    variant="secondary"
                    onClick={() => handleRestore(selectedApp.id)}
                    className="w-full"
                  >
                    <Undo2 size={16} />
                    <span>Restore to {previousStatusFor(selectedApp)}</span>
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => handleArchive(selectedApp.id)}
                    className="w-full"
                  >
                    <Archive size={16} />
                    <span>Archive Tracking Card</span>
                  </Button>
                )}

                <Button
                  variant="secondary"
                  onClick={() => handleDelete(selectedApp.id)}
                  className="w-full text-danger"
                >
                  <Trash2 size={16} />
                  <span>Delete Tracking Card</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Creation Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[800] bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-[580px] mx-3 md:mx-0 bg-card border border-cardline rounded-2xl md:rounded-3xl p-4 md:p-6 max-h-[85vh] md:max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-4 border-b border-cardline pb-2">
              <h3 className="text-base md:text-lg text-foreground">Track Job Application</h3>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="w-[30px] h-[30px] flex items-center justify-center p-0">
                X
              </Button>
            </div>

            {errorMsg && <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm mb-4">{errorMsg}</div>}

            <form onSubmit={handleCreate} className="flex flex-col gap-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CompanyAutocomplete
                  id="modalCompany"
                  label="Company Name *"
                  placeholder="e.g. Google"
                  value={company}
                  domain={companyDomain}
                  onCompanyChange={setCompany}
                  onDomainChange={setCompanyDomain}
                />
                <InputField
                  label="Position / Role *"
                  id="modalPosition"
                  placeholder="e.g. Senior React Developer"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Salary Range"
                  id="modalSalary"
                  placeholder="e.g. $120k - $140k"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                />
                <InputField
                  label="Location"
                  id="modalLocation"
                  placeholder="e.g. Berlin (Hybrid) / Remote"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Application Deadline"
                  id="modalDeadline"
                  placeholder="e.g. July 25th"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
                <div className="flex flex-col mb-4">
                  <label htmlFor="modalStatus" className="font-header font-semibold text-sm mb-1 text-left text-foreground">Kanban Column</label>
                  <select
                    id="modalStatus"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="px-4 py-3 rounded-lg border border-cardline bg-card text-foreground focus:border-primary outline-none transition-colors"
                  >
                    <option value="wishlist">Wishlist</option>
                    <option value="preparing">Preparing</option>
                    <option value="applied">Applied</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <InputField
                label="Job Posting URL"
                id="modalUrl"
                placeholder="https://jobs.company.com/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />

              <InputField
                label="Raw Job Description (For Tailoring Pipeline)"
                id="modalJobDescription"
                type="textarea"
                placeholder="Paste the full job advertisement description text here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />

              <InputField
                label="Internal Notes / Progress Diary"
                id="modalNotes"
                type="textarea"
                placeholder="Add any details, contact notes or interview dates."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="flex flex-col-reverse md:flex-row md:justify-end gap-3 mt-4 border-t border-cardline pt-4 [&>button]:w-full md:[&>button]:w-auto">
                <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isLoading}>
                  Save Card
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
