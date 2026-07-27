import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { InputField } from '../components/InputField';
import api from '../services/api';
import { navigateTo } from '../utils/navigation';
import {
  Plus, Calendar, MapPin, DollarSign, ArrowLeft, ArrowRight, Trash2, ExternalLink, ShieldAlert, Sparkles, CheckSquare, Info, FileText
} from 'lucide-react';
import styles from './Dashboard.module.css';


interface Application {
  id: string;
  company: string;
  position: string;
  status: 'wishlist' | 'preparing' | 'applied' | 'interview' | 'offer' | 'rejected';
  url?: string;
  salary?: string;
  location?: string;
  notes?: string;
  job_description?: string;
  deadline?: string;
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
  const [errorMsg, setErrorMsg] = useState('');

  // Selected Card Details Sidebar State
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Form Fields
  const [company, setCompany] = useState('');
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
    fetchApplications();
    fetchAtsScores();
  }, []);

  useEffect(() => {
    if (activeAppId && applications.length > 0) {
      const matched = applications.find(a => a.id === activeAppId);
      if (matched) {
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
        company, position, status, url, salary, location, deadline, notes, job_description: jobDescription
      });
      setIsModalOpen(false);
      // Reset form
      setCompany('');
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
      console.error('Failed to update status:', err);
    }
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

  // Metrics calculators (Section 8)
  const totalApps = applications.length;
  const interviewApps = applications.filter(a => a.status === 'interview').length;
  const offerApps = applications.filter(a => a.status === 'offer').length;

  // Average Match Score
  const scoreValues = Object.values(atsScores);
  const avgMatchScore = scoreValues.length > 0
    ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
    : '--'; // baseline default

  // Conversion rate (offers / total)
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
    <div className={styles.container}>
      {/* Top Banner Row */}
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Career Command Center</h2>
          <p className={styles.subtitle}>Track applications, verify conversions, and launch tailoring tasks.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className={styles.newBtn}>
          <Plus size={18} />
          <span>Track Application</span>
        </Button>
      </div>

      {/* Analytics Panel */}
      <div className={styles.metricsGrid}>
        <div className={`${styles.metricCard} glass-card`}>
          <p className={styles.metricLabel}>Total Applications</p>
          <p className={styles.metricVal}>{totalApps}</p>
        </div>
        <div className={`${styles.metricCard} glass-card`}>
          <p className={styles.metricLabel}>Average Match Score</p>
          <p className={styles.metricVal}>{avgMatchScore === '--' ? avgMatchScore : `${avgMatchScore}%`}</p>
        </div>
        <div className={`${styles.metricCard} glass-card`}>
          <p className={styles.metricLabel}>Upcoming Interviews</p>
          <p className={styles.metricVal}>{interviewApps}</p>
        </div>
        <div className={`${styles.metricCard} glass-card`}>
          <p className={styles.metricLabel}>Conversion Rate</p>
          <p className={styles.metricVal}>{conversionRate}%</p>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className={styles.boardScroll}>
        <div className={styles.board}>
          {columns.map((col) => {
            const colApps = applications.filter((app) => app.status === col.id);
            return (
              <div
                key={col.id}
                className={`${styles.column} ${dragOverCol === col.id ? styles.columnDragOver : ''}`}
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
                <div className={styles.columnHeader} style={{ borderColor: col.color }}>
                  <div className={styles.columnLabel}>
                    <span className={styles.dot} style={{ backgroundColor: col.color }}></span>
                    <h3>{col.label}</h3>
                  </div>
                  <span className={styles.countBadge}>{colApps.length}</span>
                </div>

                <div className={styles.cardsContainer}>
                  {colApps.length === 0 ? (
                    <div className={styles.emptyState}>No items</div>
                  ) : (
                    colApps.map((app) => {
                      const score = atsScores[app.id];
                      return (
                        <div
                          key={app.id}
                          className={`${styles.card} glass-card`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, app.id)}
                          onClick={() => {
                            setSelectedApp(app);
                            setIsDetailsOpen(true);
                            navigateTo(`/dashboard?appId=${app.id}`);
                          }}
                          style={{ cursor: 'pointer' }}
                        >


                          <div className={styles.cardHeader}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <h4>{app.position}</h4>
                              {score !== undefined && (
                                <span className={styles.scoreBadge} style={{
                                  background: score > 80 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                  color: score > 80 ? 'var(--success)' : 'var(--warning)',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  padding: '1px 5px',
                                  borderRadius: '4px'
                                }}>
                                  {score}%
                                </span>
                              )}
                            </div>
                            <p>{app.company}</p>
                          </div>

                          <div className={styles.cardDetails}>
                            {app.location && (
                              <span className={styles.detailItem}>
                                <MapPin size={12} /> {app.location}
                              </span>
                            )}
                            {app.salary && (
                              <span className={styles.detailItem}>
                                <DollarSign size={12} /> {app.salary}
                              </span>
                            )}
                            {app.deadline && (
                              <span className={styles.detailItem}>
                                <Calendar size={12} /> {app.deadline}
                              </span>
                            )}
                          </div>

                          {app.notes && <p className={styles.cardNotes}>{app.notes}</p>}

                          <div className={styles.cardFooter} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.arrows}>
                              <button
                                onClick={() => {
                                  const idx = columns.findIndex(c => c.id === app.status);
                                  if (idx > 0) handleUpdateStatus(app.id, columns[idx - 1].id);
                                }}
                                disabled={app.status === 'wishlist'}
                                title="Move left"
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
                              >
                                <ArrowRight size={14} />
                              </button>
                            </div>

                            <div className={styles.actions}>
                              <button
                                onClick={() => onNavigateToEditor({
                                  company: app.company,
                                  position: app.position,
                                  desc: app.job_description || app.notes || '',
                                  application_id: app.id
                                })}
                                title="Open Tailoring Canvas"
                                className={styles.editorLink}
                              >
                                <ExternalLink size={14} />
                              </button>
                              <button onClick={() => handleDelete(app.id)} title="Delete card">
                                <Trash2 size={14} className={styles.deleteIcon} />
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

      {/* Slide-out Application Details Side Panel */}
      {isDetailsOpen && selectedApp && (
        <div className={styles.modalOverlay} onClick={() => { setIsDetailsOpen(false); setSelectedApp(null); navigateTo('/dashboard'); }}>
          <div className={`${styles.detailsSidebar} glass`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sidebarHeader}>
              <h3>Application Command Center</h3>
              <Button variant="ghost" onClick={() => { setIsDetailsOpen(false); setSelectedApp(null); navigateTo('/dashboard'); }} className={styles.closeBtn}>
                X
              </Button>
            </div>


            <div className={styles.sidebarContent}>
              <div className={styles.sidebarField}>
                <h2>{selectedApp.position}</h2>
                <h3 className={styles.sidebarCompany}>{selectedApp.company}</h3>
              </div>

              <div className={styles.sidebarMetaGrid}>
                <div className={styles.metaBox}>
                  <MapPin size={16} />
                  <div>
                    <label>Location</label>
                    <p>{selectedApp.location || 'Not Specified'}</p>
                  </div>
                </div>
                <div className={styles.metaBox}>
                  <DollarSign size={16} />
                  <div>
                    <label>Salary</label>
                    <p>{selectedApp.salary || 'Not Specified'}</p>
                  </div>
                </div>
                <div className={styles.metaBox}>
                  <Calendar size={16} />
                  <div>
                    <label>Deadline</label>
                    <p>{selectedApp.deadline || 'Not Specified'}</p>
                  </div>
                </div>
                <div className={styles.metaBox}>
                  <Info size={16} />
                  <div>
                    <label>Status</label>
                    <p style={{ textTransform: 'capitalize' }}>{selectedApp.status}</p>
                  </div>
                </div>
              </div>

              {selectedApp.url && (
                <div className={styles.sidebarField}>
                  <label>Job Listing URL</label>
                  <a href={selectedApp.url} target="_blank" rel="noreferrer" className={styles.listingUrl}>
                    {selectedApp.url} <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {selectedApp.job_description && (
                <div className={styles.sidebarField}>
                  <label>Raw Job Description</label>
                  <pre className={styles.jobDescPre}>{selectedApp.job_description}</pre>
                </div>
              )}

              {selectedApp.notes && (
                <div className={styles.sidebarField}>
                  <label>Progress Notes</label>
                  <p className={styles.sidebarNotes}>{selectedApp.notes}</p>
                </div>
              )}


              {/* Tailored Documents Reference List */}
              {resumeVersions.filter(v => v.application === selectedApp.id).length > 0 && (
                <div className={styles.sidebarField}>
                  <label>Tailored Documents</label>
                  <div className={styles.versionsList}>
                    {resumeVersions.filter(v => v.application === selectedApp.id).map((v, i) => (
                      <div key={v.id} className={styles.versionItem}>
                        <div className={styles.versionInfo}>
                          <FileText size={16} className={styles.docIcon} />
                          <div>
                            <p className={styles.versionName}>Tailored Resume v{i + 1}</p>
                            <span className={styles.versionDate}>
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

              <div className={styles.sidebarActions}>
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
                  className={styles.sidebarActionBtn}
                >
                  <Sparkles size={16} />
                  <span>Launch Tailoring Canvas</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => handleDelete(selectedApp.id)}
                  className={styles.sidebarDeleteBtn}
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
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} glass`}>
            <div className={styles.modalHeader}>
              <h3>Track Job Application</h3>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className={styles.closeBtn}>
                X
              </Button>
            </div>

            {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

            <form onSubmit={handleCreate} className={styles.modalForm}>
              <div className={styles.formRow}>
                <InputField
                  label="Company Name *"
                  id="modalCompany"
                  placeholder="e.g. Google"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
                <InputField
                  label="Position / Role *"
                  id="modalPosition"
                  placeholder="e.g. Senior React Developer"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
              </div>

              <div className={styles.formRow}>
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

              <div className={styles.formRow}>
                <InputField
                  label="Application Deadline"
                  id="modalDeadline"
                  placeholder="e.g. July 25th"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
                <div className={styles.selectGroup}>
                  <label htmlFor="modalStatus">Kanban Column</label>
                  <select
                    id="modalStatus"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
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

              <div className={styles.modalFooter}>
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
