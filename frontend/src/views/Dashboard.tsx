import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/Button';
import { InputField } from '../components/InputField';
import api from '../services/api';
import { navigateTo } from '../utils/navigation';
import { CompanyAutocomplete } from '../components/CompanyAutocomplete';
import { ConfirmPopover } from '../components/ConfirmPopover';
import { CompanyLogo } from '../components/CompanyLogo';
import { Toast } from '../components/Toast';
import { ApplicationDetailsPopover, type ApplicationStatus } from '../components/ApplicationDetailsPopover';
import { KanbanCardSkeleton } from '../components/skeleton/DashboardSkeleton';
import { Skeleton } from '../components/skeleton/Skeleton';
import { Plus, Calendar, MapPin, DollarSign, ArrowLeft, ArrowRight, Trash2, ExternalLink, Sparkles, Info, FileText, Archive, Undo2, Search } from 'lucide-react';

// Shared utility class strings for the kanban icon buttons
const iconBtnBase = 'w-[26px] h-[26px] rounded-md flex items-center justify-center text-muted transition-colors';
const fieldLabelCls = 'font-header text-xs font-bold uppercase tracking-wide text-muted';

// Manual column ordering (fractional index; legacy rows without `order`
// keep their previous relative order via updated_at tiebreak).
const orderOf = (a: { order?: number }): number => a.order ?? 0;

const sortedByOrder = <T extends { order?: number; updated_at: string }>(apps: T[]): T[] =>
  [...apps].sort(
    (a, b) => orderOf(a) - orderOf(b) || (+new Date(b.updated_at) - +new Date(a.updated_at))
  );

const maxOrderIn = <T extends { id: string; status: string; order?: number }>(
  apps: T[],
  status: string,
  excludeId?: string
): number =>
  apps.reduce(
    (m, a) => (a.status === status && a.id !== excludeId ? Math.max(m, orderOf(a)) : m),
    0
  );

// Fractional insertion order between two neighbours (single-PATCH moves).
const orderForInsert = <T extends { order?: number }>(sortedOthers: T[], index: number): number => {
  const prev = index > 0 ? orderOf(sortedOthers[index - 1]) : null;
  const next = index < sortedOthers.length ? orderOf(sortedOthers[index]) : null;
  if (prev === null && next === null) return 1;
  if (prev === null) return (next as number) - 1;
  if (next === null) return (prev as number) + 1;
  return (prev + next) / 2;
};

// Insertion index of a pointer Y within a column list (dragged card excluded).
const insertIndexFor = (listEl: HTMLElement, excludeId: string, y: number): number => {
  const cards = [...listEl.querySelectorAll<HTMLElement>('[data-app-id]')].filter(
    (el) => el.dataset.appId !== excludeId
  );
  let idx = 0;
  for (const card of cards) {
    const r = card.getBoundingClientRect();
    if (y < r.top + r.height / 2) break;
    idx++;
  }
  return idx;
};

// FLIP helpers: animate sibling glide when a gap opens/closes or a card lands.
const captureTops = (listEl: HTMLElement | null): Map<string, number> => {
  const m = new Map<string, number>();
  listEl?.querySelectorAll<HTMLElement>('[data-app-id]').forEach((card) => {
    m.set(card.dataset.appId as string, card.getBoundingClientRect().top);
  });
  return m;
};

const flipList = (listEl: HTMLElement | null, prevTops: Map<string, number>) => {
  if (!listEl || prevTops.size === 0) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  listEl.querySelectorAll<HTMLElement>('[data-app-id]').forEach((card) => {
    const id = card.dataset.appId as string;
    const prev = prevTops.get(id);
    if (prev === undefined) {
      card.animate(
        [{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 200, easing: 'ease-out' }
      );
      return;
    }
    const dy = prev - card.getBoundingClientRect().top;
    if (Math.abs(dy) > 2) {
      card.animate(
        [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0px)' }],
        { duration: 260, easing: 'cubic-bezier(0.22,1,0.36,1)' }
      );
    }
  });
};

const doubleRaf = (fn: () => void) => {
  requestAnimationFrame(() => requestAnimationFrame(fn));
};


interface Application {
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
  // Manual board position within a status column (fractional index).
  order?: number;
  updated_at: string;
}

interface DashboardProps {
  onNavigateToEditor: (params?: { company?: string; position?: string; desc?: string; application_id?: string; tab?: string }) => void;
  activeAppId?: string;
}

// In-progress pointer drag for a kanban card (see handlers below).
interface CardGesture {
  appId: string;
  fromStatus: Application['status'];
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  offsetX: number;
  offsetY: number;
  node: HTMLElement;
  ghost: HTMLElement | null;
  active: boolean;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  raf: number | null;
  escapeHandler: ((e: KeyboardEvent) => void) | null;
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
  // Optimistic status moves: card jumps instantly, server syncs in background.
  const [pendingStatus, setPendingStatus] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Board vs Archived list view
  const [activeView, setActiveView] = useState<'board' | 'archived'>('board');
  const [archivedSearch, setArchivedSearch] = useState('');

  // Form Fields
  const [company, setCompany] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('wishlist');
  const [url, setUrl] = useState('');
  const [salary, setSalary] = useState('');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  // When set, the Track modal edits this application instead of creating one.
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const resetForm = () => {
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
    setContactName('');
    setContactEmail('');
    setEditingId(null);
  };

  const openEdit = (app: Application) => {
    setCompany(app.company || '');
    setCompanyDomain(app.company_domain || '');
    setPosition(app.position || '');
    setStatus(app.status === 'archived' ? previousStatusFor(app) : app.status);
    setUrl(app.url || '');
    setSalary(app.salary || '');
    setLocation(app.location || '');
    setDeadline(app.deadline || '');
    setNotes(app.notes || '');
    setJobDescription(app.job_description || '');
    setContactName(app.contact_name || '');
    setContactEmail(app.contact_email || '');
    setEditingId(app.id);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Partial inline update (notes / description tabs in the details popover).
  const handlePatchFields = async (appId: string, fields: Partial<Application>) => {
    try {
      await api.patch(`/applications/${appId}`, fields);
      await fetchApplications();
      setSelectedApp((prev) => (prev && prev.id === appId ? { ...prev, ...fields } : prev));
    } catch (err) {
      console.error('Failed to update application:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !position) {
      setErrorMsg('Company and Position are required fields.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');

    const payload = {
      company,
      company_domain: companyDomain || null,
      position,
      status,
      url,
      salary,
      location,
      deadline,
      notes,
      job_description: jobDescription,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      // New cards append at the end of their column.
      order: maxOrderIn(applications, status) + 1,
    };

    try {
      if (editingId) {
        await api.patch(`/applications/${editingId}`, payload);
        setSelectedApp((prev) => (prev && prev.id === editingId ? { ...prev, ...payload } as Application : prev));
      } else {
        await api.post('/applications', payload);
      }
      setIsModalOpen(false);
      resetForm();
      fetchApplications();
      fetchAtsScores();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error?.message || 'Failed to save job tracking card.');
    } finally {
      setIsLoading(false);
    }
  };

  // Shared server sync for a status/order move (optimistic state is applied
  // by the caller so FLIP measurements stay exact). Rolls back on failure.
  const persistStatusMove = async (
    appId: string,
    newStatus: Application['status'],
    targetOrder: number,
    rollback: { status: Application['status']; order: number }
  ) => {
    setPendingStatus((prev) => ({ ...prev, [appId]: true }));
    try {
      await api.patch(`/applications/${appId}`, { status: newStatus, order: targetOrder });
      await fetchApplications();
    } catch (err) {
      console.error(err);
      // Roll back — but only if the user hasn't moved the card again
      // meanwhile (a newer optimistic move always wins).
      setApplications((prev) =>
        prev.map((a) =>
          a.id === appId && a.status === newStatus && orderOf(a) === targetOrder
            ? { ...a, status: rollback.status, order: rollback.order }
            : a
        )
      );
      setSelectedApp((prev) =>
        prev && prev.id === appId && prev.status === newStatus && orderOf(prev) === targetOrder
          ? { ...prev, status: rollback.status, order: rollback.order }
          : prev
      );
      setToast({ message: 'Could not move the card. Please try again.', type: 'error' });
    } finally {
      setPendingStatus((prev) => {
        const next = { ...prev };
        delete next[appId];
        return next;
      });
    }
  };

  const applyOptimisticMove = (appId: string, newStatus: Application['status'], targetOrder: number) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: newStatus, order: targetOrder } : a))
    );
    setSelectedApp((prev) =>
      prev && prev.id === appId ? { ...prev, status: newStatus, order: targetOrder } : prev
    );
  };

  const handleUpdateStatus = async (
    appId: string,
    newStatus: Application['status'],
    newOrder?: number
  ) => {
    const app = applications.find((a) => a.id === appId) ?? selectedApp;
    const current = app && app.id === appId ? app.status : undefined;
    const currentOrder = app && app.id === appId ? orderOf(app) : 0;
    if (!current || pendingStatus[appId]) return;
    // Moves without an explicit position land at the end of the target column.
    const targetOrder = newOrder ?? maxOrderIn(applications, newStatus, appId) + 1;
    if (current === newStatus && targetOrder === currentOrder) return;

    // 1. Move instantly in local state (card + open popover stay in sync).
    applyOptimisticMove(appId, newStatus, targetOrder);

    // 2. Persist in the background, then reconcile with server truth
    // (fresh status_history included).
    await persistStatusMove(appId, newStatus, targetOrder, { status: current, order: currentOrder });
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

  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; action: () => void } | null>(null);

  const handleDelete = async (appId: string) => {
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
    try {
      await api.delete(`/resume/versions/${versionId}`);
      fetchAtsScores();
    } catch (err) {
      console.error('Failed to delete tailored CV version:', err);
    }
  };

  // Pointer-driven kanban drag: a real clone node follows the cursor fully
  // opaque and tilted (native ghosts can't do either). Mouse drags from
  // anywhere on the card; touch uses long-press so list scrolling keeps
  // working (cards keep `touch-pan-y`).
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const suppressClickRef = useRef(false);
  const gestureRef = useRef<CardGesture | null>(null);
  // Live drop gap during a drag (column + index among the other cards).
  const [dropIndicator, setDropIndicator] = useState<{ colId: string; index: number } | null>(null);
  const indicatorRef = useRef<{ colId: string; index: number } | null>(null);
  const showIndicator = (v: { colId: string; index: number } | null) => {
    indicatorRef.current = v;
    setDropIndicator(v);
  };
  // Id of the card being dragged (hidden from its source list while lifted).
  const [dragId, setDragId] = useState<string | null>(null);
  // Measured height of the lifted card, so the gap matches its size.
  const dragHeightRef = useRef(0);

  const listElFor = (colId: string): HTMLElement | null =>
    boardScrollRef.current?.querySelector<HTMLElement>(`[data-kanban-list="${colId}"]`) ?? null;

  // Run a mutation flanked by FLIP measurements so siblings glide instead
  // of jumping when a gap opens/closes or a card lands.
  const withFlip = (colIds: Array<string | null | undefined>, mutate: () => void) => {
    const board = boardScrollRef.current;
    const ids = [...new Set(colIds.filter(Boolean))] as string[];
    const prevs = new Map(
      ids.map((id) => [id, captureTops(board?.querySelector<HTMLElement>(`[data-kanban-list="${id}"]`) ?? null)])
    );
    mutate();
    doubleRaf(() => {
      prevs.forEach((tops, id) => {
        flipList(board?.querySelector<HTMLElement>(`[data-kanban-list="${id}"]`) ?? null, tops);
      });
    });
  };

  // Animated teardown of drag visuals (gap closes, source card returns).
  const cancelDragUI = () => {
    const g = gestureRef.current;
    const cols = [indicatorRef.current?.colId, g?.fromStatus].filter(Boolean) as string[];
    withFlip(cols, () => {
      showIndicator(null);
      setDragId(null);
    });
    finishGesture();
  };

  const finishGesture = () => {
    const g = gestureRef.current;
    gestureRef.current = null;
    setDragOverCol(null);
    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUp);
    window.removeEventListener('pointercancel', onWindowPointerCancel);
    if (!g) return;
    if (g.longPressTimer) clearTimeout(g.longPressTimer);
    if (g.raf !== null) cancelAnimationFrame(g.raf);
    if (g.escapeHandler) window.removeEventListener('keydown', g.escapeHandler);
    g.ghost?.remove();
    g.node.style.opacity = '';
  };

  // Window-level tracking for the ACTIVE drag: the lifted source card
  // unmounts (hidden), which would kill element-level capture/listeners,
  // so moves, release and cancel are observed globally instead.
  const onWindowPointerMove = (e: PointerEvent) => {
    const g = gestureRef.current;
    if (!g?.active || e.pointerId !== g.pointerId) return;
    moveGhost(g, e.clientX, e.clientY);
  };

  const onWindowPointerUp = (e: PointerEvent) => {
    const g = gestureRef.current;
    if (!g?.active || e.pointerId !== g.pointerId) return;
    commitDrop();
  };

  const onWindowPointerCancel = (e: PointerEvent) => {
    const g = gestureRef.current;
    if (!g || e.pointerId !== g.pointerId) return;
    if (g.active) suppressClickRef.current = true;
    cancelDragUI();
  };

  // Shared drop commit used by pointer-up (and only there): land at the live
  // gap with a fractional order, or glide everything back when released
  // outside any column.
  const commitDrop = () => {
    const g = gestureRef.current;
    if (!g) return;
    const target = indicatorRef.current;
    const { appId, fromStatus } = g;
    const mover = applications.find((a) => a.id === appId);
    const currentOrder = mover ? orderOf(mover) : 0;
    suppressClickRef.current = true;
    if (!target) {
      cancelDragUI();
      return;
    }
    const targetStatus = target.colId as Application['status'];
    const others = sortedByOrder(
      activeApplications.filter((a) => a.status === target.colId && a.id !== appId)
    );
    const targetOrder = orderForInsert(others, Math.min(target.index, others.length));
    if (targetStatus === fromStatus && targetOrder === currentOrder) {
      cancelDragUI();
      return;
    }
    withFlip([fromStatus, target.colId], () => {
      showIndicator(null);
      setDragId(null);
      applyOptimisticMove(appId, targetStatus, targetOrder);
    });
    finishGesture();
    persistStatusMove(appId, targetStatus, targetOrder, { status: fromStatus, order: currentOrder });
  };

  const moveGhost = (g: CardGesture, x: number, y: number) => {
    g.lastX = x;
    g.lastY = y;
    if (g.ghost) {
      g.ghost.style.transform = `translate3d(${x - g.offsetX}px, ${y - g.offsetY}px, 0) rotate(-3deg)`;
    }
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const colEl = el?.closest?.('[data-kanban-col]') as HTMLElement | null;
    const colId = colEl?.dataset?.kanbanCol ?? null;
    setDragOverCol(colId);
    // Live insertion gap: index among the other cards, siblings glide via FLIP.
    const listEl = colId ? listElFor(colId) : null;
    const next = colId && listEl ? { colId, index: insertIndexFor(listEl, g.appId, y) } : null;
    const cur = indicatorRef.current;
    if (!next !== !cur || next?.colId !== cur?.colId || (next && cur && next.index !== cur.index)) {
      const cols = [cur?.colId, next?.colId].filter(Boolean) as string[];
      withFlip(cols, () => showIndicator(next));
    }
  };

  const activateGesture = (g: CardGesture, x: number, y: number) => {
    if (gestureRef.current !== g || g.active) return;
    const ghost = g.node.cloneNode(true) as HTMLElement;
    const rect = g.node.getBoundingClientRect();
    ghost.style.width = `${rect.width}px`;
    ghost.style.position = 'fixed';
    ghost.style.left = '0';
    ghost.style.top = '0';
    ghost.style.margin = '0';
    ghost.style.opacity = '1';
    ghost.style.transition = 'none';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '1000';
    ghost.style.boxShadow = '0 16px 40px rgba(15, 23, 42, 0.28)';
    document.body.appendChild(ghost);
    g.ghost = ghost;
    g.active = true;
    g.node.style.opacity = '0.35';
    // Size the drop gap like the lifted card and hide the source card so
    // siblings close ranks (animated via FLIP).
    dragHeightRef.current = g.node.offsetHeight || 120;
    withFlip([g.fromStatus], () => setDragId(g.appId));
    // Track the active drag on window: the lifted card unmounts, so
    // element-level listeners/capture would die with it.
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerCancel);
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        suppressClickRef.current = true;
        cancelDragUI();
      }
    };
    g.escapeHandler = onEscape;
    window.addEventListener('keydown', onEscape);
    try {
      navigator.vibrate?.(10);
    } catch {
      // Haptics unsupported — ignore.
    }
    // Edge auto-scroll for the (horizontally scrolling) board.
    const loop = () => {
      const gg = gestureRef.current;
      const sc = boardScrollRef.current;
      if (!gg?.active || !sc) return;
      const r = sc.getBoundingClientRect();
      if (gg.lastX > r.right - 56) sc.scrollLeft += 14;
      else if (gg.lastX < r.left + 56) sc.scrollLeft -= 14;
      gg.raf = requestAnimationFrame(loop);
    };
    g.raf = requestAnimationFrame(loop);
    moveGhost(g, x, y);
  };

  const onCardPointerDown = (e: React.PointerEvent, app: Application) => {
    if (gestureRef.current || pendingStatus[app.id]) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // A previous drag may have set this without any click consuming it
    // (source card unmounts on lift, so release clicks land elsewhere).
    suppressClickRef.current = false;
    const node = e.currentTarget as HTMLElement;
    const rect = node.getBoundingClientRect();
    const g: CardGesture = {
      appId: app.id,
      fromStatus: app.status,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      node,
      ghost: null,
      active: false,
      longPressTimer: null,
      raf: null,
      escapeHandler: null,
    };
    gestureRef.current = g;
    if (e.pointerType === 'touch') {
      g.longPressTimer = setTimeout(() => {
        const cur = gestureRef.current;
        if (cur === g) activateGesture(g, g.lastX, g.lastY);
      }, 380);
    }
  };

  // Pre-activation tracking only (threshold / long-press). Once the drag
  // is active the source card is unmounted and window listeners take over.
  const onCardPointerMove = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g || g.active || e.pointerId !== g.pointerId) return;
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    const dist = Math.hypot(e.clientX - g.startX, e.clientY - g.startY);
    if (e.pointerType === 'touch') {
      // Finger wandered before long-press fired → it's a scroll, not a drag.
      if (dist > 10) finishGesture();
      return;
    }
    if (dist > 6) activateGesture(g, e.clientX, e.clientY);
  };

  // Card-level release/cancel are pre-activation only (plain taps). Active
  // drags are owned by the window listeners above.
  const onCardPointerUp = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g || g.active || e.pointerId !== g.pointerId) return;
    finishGesture();
  };

  const onCardPointerCancel = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g || g.active || e.pointerId !== g.pointerId) return;
    finishGesture();
  };

  // Metrics calculators (archived cards are excluded from the active pipeline)
  const activeApplications = applications.filter(a => a.status !== 'archived');
  const archivedApplications = applications.filter(a => a.status === 'archived');
  const totalApps = activeApplications.length;
  const interviewApps = activeApplications.filter(a => a.status === 'interview').length;
  // Conversion = reached interview or beyond. Denominator = every card that
  // went through "applied" (applied + rejected + interview + offer — the
  // latter two count as applied since they got there via applying).
  // Wishlist / preparing never entered the pipeline; archived is already
  // excluded via activeApplications.
  const convertedApps = activeApplications.filter(a => a.status === 'interview' || a.status === 'offer').length;
  const conversionBaseApps = activeApplications.filter(
    a => a.status === 'applied' || a.status === 'rejected' || a.status === 'interview' || a.status === 'offer'
  ).length;

  const scoreValues = Object.values(atsScores);
  const avgMatchScore = scoreValues.length > 0
    ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
    : '--';

  const conversionRate = conversionBaseApps > 0 ? Math.round((convertedApps / conversionBaseApps) * 100) : 0;

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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
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
            <span>Create New Application</span>
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
        <div ref={boardScrollRef} className="relative h-[calc(100dvh-400px)] min-h-[340px] md:h-auto md:flex-1 overflow-x-auto overflow-y-hidden p-1 pb-4 snap-x snap-mandatory md:snap-none thin-scrollbar">
          <div className="flex gap-3.5 h-full w-max md:w-full min-w-full">
            {columns.map((col) => {
              const colApps = sortedByOrder(activeApplications.filter((app) => app.status === col.id));
              const isDragOver = dragOverCol === col.id;
              return (
                <div
                  key={col.id}
                  data-kanban-col={col.id}
                  style={{ '--col-accent': col.color } as React.CSSProperties}
                  className={`relative overflow-hidden flex flex-col bg-card border border-cardline rounded-[14px] p-3 w-[82vw] sm:w-[320px] md:w-auto md:flex-1 md:min-w-[220px] shrink-0 md:shrink snap-start h-full transition-all duration-200
                  before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-[var(--col-accent,var(--primary))] before:opacity-85
                  ${isDragOver ? 'border-[var(--col-accent,var(--primary))] shadow-[0_0_0_2px_var(--col-accent,var(--primary))] scale-[1.01]' : ''}`}
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

                  <div data-kanban-list={col.id} className="flex flex-col gap-2.5 flex-1 min-h-0 overflow-y-auto px-0.5 pb-1.5 thin-scrollbar">
                    {isInitialLoading ? (
                      <>
                        <KanbanCardSkeleton />
                        <KanbanCardSkeleton />
                      </>
                    ) : colApps.length === 0 && (!dropIndicator || dropIndicator.colId !== col.id) ? (
                      <div className="flex justify-center items-center h-[72px] text-muted text-xs border-[1.5px] border-dashed border-cardline rounded-[10px] opacity-80">No items</div>
                    ) : (
                      (() => {
                        const items: React.ReactNode[] = [];
                        // Lifted card hides from its source list; the gap takes its place.
                        const visible = colApps.filter((a) => a.id !== dragId);
                        visible.forEach((app) => {
                          const score = atsScores[app.id];
                          items.push(
                            <div
                              key={app.id}
                              data-app-id={app.id}
                              onPointerDown={(e) => onCardPointerDown(e, app)}
                              onPointerMove={onCardPointerMove}
                              onPointerUp={onCardPointerUp}
                              onPointerCancel={onCardPointerCancel}
                            onDragStart={(e) => e.preventDefault()}
                            onClick={() => {
                              if (suppressClickRef.current) {
                                suppressClickRef.current = false;
                                return;
                              }
                              setSelectedApp(app);
                              setIsDetailsOpen(true);
                              navigateTo(`/dashboard?appId=${app.id}`);
                            }}
                            className={`min-w-0 shrink-0 overflow-hidden select-none touch-pan-y px-3.5 py-3 text-left flex flex-col gap-2 bg-card border border-cardline rounded-xl shadow-sm animate-cardSlideIn cursor-grab active:cursor-grabbing transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--col-accent,var(--primary))] active:scale-[0.98] ${pendingStatus[app.id] ? 'opacity-70' : ''}`}
                          >


                            <div className="min-w-0">
                              <div className="flex justify-between items-start gap-2 min-w-0">
                                <h4
                                  className="min-w-0 flex-1 font-header text-sm font-bold text-foreground break-words line-clamp-2"
                                  title={app.position}
                                >
                                  {app.position}
                                </h4>
                                {score !== undefined && (
                                  <span
                                    className={`text-[10px] font-bold px-[5px] py-px rounded shrink-0 ${score > 80 ? 'bg-emerald-500/10 text-success' : 'bg-amber-500/10 text-warning'}`}
                                  >
                                    {score}%
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 min-w-0">
                                <CompanyLogo company={app.company} domain={app.company_domain} size={24} />
                                <p className="min-w-0 flex-1 text-xs text-muted font-medium truncate">{app.company}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5 min-w-0">
                              {app.location && (
                                <span className="inline-flex items-center gap-1 max-w-full min-w-0 text-[11px] text-muted bg-mutedlight px-2 py-0.5 rounded-full">
                                  <MapPin size={11} className="shrink-0" />
                                  <span className="truncate">{app.location}</span>
                                </span>
                              )}
                              {app.salary && (
                                <span className="inline-flex items-center gap-1 max-w-full min-w-0 text-[11px] text-muted bg-mutedlight px-2 py-0.5 rounded-full">
                                  <DollarSign size={11} className="shrink-0" />
                                  <span className="truncate">{app.salary}</span>
                                </span>
                              )}
                              {app.deadline && (
                                <span className="inline-flex items-center gap-1 max-w-full min-w-0 text-[11px] text-muted bg-mutedlight px-2 py-0.5 rounded-full">
                                  <Calendar size={11} className="shrink-0" />
                                  <span className="truncate">{app.deadline}</span>
                                </span>
                              )}
                            </div>

                            {app.notes && (
                              <p className="min-w-0 text-[11px] text-muted leading-snug break-words line-clamp-2 bg-black/[0.03] px-2 py-1.5 rounded-md m-0">
                                {app.notes}
                              </p>
                            )}

                            <div className="flex justify-between items-center mt-auto border-t border-cardline pt-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    const idx = columns.findIndex(c => c.id === app.status);
                                    if (idx > 0) handleUpdateStatus(app.id, columns[idx - 1].id);
                                  }}
                                  disabled={app.status === 'wishlist' || !!pendingStatus[app.id]}
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
                                  disabled={app.status === 'rejected' || !!pendingStatus[app.id]}
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
                                <button onClick={() => setPendingConfirm({ message: 'Are you sure you want to remove this job tracking card?', action: () => handleDelete(app.id) })} title="Delete card" className={`${iconBtnBase} hover:bg-mutedlight`}>
                                  <Trash2 size={14} className="text-danger" />
                                </button>
                              </div>
                            </div>
                          </div>
                          );
                        });
                        if (dropIndicator && dropIndicator.colId === col.id) {
                          items.splice(
                            Math.min(dropIndicator.index, items.length),
                            0,
                            <div
                              key="drop-gap"
                              aria-hidden="true"
                              className="kanban-drop-gap"
                              style={{ height: dragHeightRef.current || 120 }}
                            />
                          );
                        }
                        return <>{items}</>;
                      })()
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Right-edge fade: hints at more boards off-screen (mobile only) */}
          <div aria-hidden="true" className="md:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--background)] to-transparent" />
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
              const rows = sortedByOrder(archivedApplications.filter(a =>
                !q || a.company.toLowerCase().includes(q) || a.position.toLowerCase().includes(q)
              ));
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
                        <button onClick={() => setPendingConfirm({ message: 'Are you sure you want to permanently delete this job tracking card?', action: () => handleDelete(app.id) })} title="Delete permanently" className={`${iconBtnBase} hover:bg-mutedlight`}>
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

      {/* Application Details Popover (replaces the old slide-out sidebar) */}
      {isDetailsOpen && selectedApp && (
        <ApplicationDetailsPopover
          app={selectedApp}
          statusOptions={[...columns.map((c) => ({ id: c.id, label: c.label })), { id: 'archived' as const, label: 'Archived' }]}
          resumeVersions={resumeVersions
            .filter((v) => v.application === selectedApp.id)
            .map((v) => ({ id: v.id, ats_score: v.ats_score, created_at: v.created_at }))}
          coverLetters={coverLetters
            .filter((l: any) => l.application === selectedApp.id || (!l.application && l.target_company === selectedApp.company))
            .map((l: any) => ({ id: l.id, tone: l.tone, length: l.length, content: l.content, created_at: l.created_at }))}
          previousStatusLabel={previousStatusFor(selectedApp)}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedApp(null);
            navigateTo('/dashboard');
          }}
          onStatusChange={handleUpdateStatus}
          onDelete={(id) => setPendingConfirm({ message: 'Are you sure you want to remove this job tracking card?', action: () => handleDelete(id) })}
          onEdit={openEdit}
          onRestore={handleRestore}
          onArchive={handleArchive}
          onOpenEditor={() => {
            setIsDetailsOpen(false);
            onNavigateToEditor({
              company: selectedApp.company,
              position: selectedApp.position,
              desc: selectedApp.job_description || selectedApp.notes || '',
              application_id: selectedApp.id,
            });
          }}
          onOpenVersion={() => {
            setIsDetailsOpen(false);
            onNavigateToEditor({
              company: selectedApp.company,
              position: selectedApp.position,
              desc: selectedApp.job_description || selectedApp.notes || '',
              application_id: selectedApp.id,
            });
          }}
          onOpenLetter={() => {
            setIsDetailsOpen(false);
            onNavigateToEditor({
              company: selectedApp.company,
              position: selectedApp.position,
              desc: selectedApp.job_description || selectedApp.notes || '',
              application_id: selectedApp.id,
              tab: 'letter',
            });
          }}
          onDeleteVersion={(versionId) => setPendingConfirm({ message: 'Are you sure you want to delete this tailored CV version?', action: () => handleDeleteVersion(versionId) })}
          onPatchFields={handlePatchFields}
        />
      )}

      {/* Creation Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[800] bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-[580px] mx-3 md:mx-0 bg-card border border-cardline rounded-2xl md:rounded-3xl p-4 md:p-6 max-h-[85vh] md:max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-4 border-b border-cardline pb-2">
              <h3 className="text-base md:text-lg text-foreground">{editingId ? 'Edit Job Application' : 'Track Job Application'}</h3>
              <Button variant="ghost" onClick={() => { setIsModalOpen(false); resetForm(); }} className="w-[30px] h-[30px] flex items-center justify-center p-0">
                X
              </Button>
            </div>

            {errorMsg && <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm mb-4">{errorMsg}</div>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-1">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Contact Name"
                  id="modalContactName"
                  placeholder="e.g. Jane Doe (Recruiter)"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
                <InputField
                  label="Contact Email"
                  id="modalContactEmail"
                  placeholder="e.g. jane@company.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
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
                <Button variant="secondary" type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isLoading}>
                  {editingId ? 'Save Changes' : 'Save Card'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {pendingConfirm && (
        <ConfirmPopover
          message={pendingConfirm.message}
          onConfirm={() => {
            const action = pendingConfirm.action;
            setPendingConfirm(null);
            action();
          }}
          onCancel={() => setPendingConfirm(null)}
        />
      )}
    </div>
  );
};
