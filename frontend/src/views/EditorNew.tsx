import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../components/Button';
import { InputField } from '../components/InputField';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Toast } from '../components/Toast';
import { Wand2, Download, Printer, Check, X, ShieldAlert, Sparkles, FileText, Brain, Save, RefreshCw, Trash, Plus, Settings, Minimize2, LayoutGrid, Layers, Sliders, User, Briefcase, Code, GraduationCap, Globe, Eye, EyeOff, RotateCcw } from 'lucide-react';
import styles from './editorStyles';

import { ATSDashboard, ATSReport, Proposal, WeakBulletWithOriginal, RecommendedKeyword } from '../components/ATSDashboard';
import { DeepAnalysis } from './editor/types/editor.types';
import { computeReadinessChecklist, buildOptimizationMarkdown, downloadMarkdown } from '../features/editor/utils/atsLocal';
import { Snapshot } from '../components/VersionSnapshotDrawer';

const templateClassMap: { [key: string]: string } = {
  pixel_perfect_pdf: 'pixelPerfectLayout',
  german_style_cv: 'germanLayout',
  modern_minimalist: 'modern_minimalist',
  executive_professional: 'executive_professional',
  creative_tech: 'creative_tech'
};


import { ResumeVersion, EditorProps, RenderableUnit } from './editor/types/editor.types';
import { parseDate, formatDate } from './editor/utils/dateUtils';
import { formatPhoneNumber } from './editor/utils/phoneUtils';
import { renderFormattedTitle } from './editor/utils/titleUtils';
import { renderFormattedLanguageList } from './editor/utils/languageUtils';
import { AutoSizeTextarea, MeasuringContext } from './editor/components/AutoSizeTextarea';
import { SectionAiPolishModal } from './editor/components/SectionAiPolishModal';
import { HeaderSettingsPopover } from './editor/components/HeaderSettingsPopover';
import { SectionSettingsPopover } from './editor/components/SectionSettingsPopover';
import { UnitRenderer } from './editor/components/UnitRenderer';
import { SectionDetailEditor } from './editor/components/sidepanel/SectionDetailEditor';
import { AddCustomSectionModal, CustomSectionFormat } from './editor/components/AddCustomSectionModal';
import { useCanvasZoom } from '../features/editor/hooks/useCanvasZoom';
import { useCvPagination } from '../features/editor/hooks/useCvPagination';
import { useCvDocumentStore } from '../features/editor/state/cvDocumentStore';
import { StyleControlsPanel } from '../features/editor/panels/StyleControlsPanel';
import { TailorPanel } from '../features/editor/panels/TailorPanel';
import { useSectionOps } from '../features/editor/hooks/useSectionOps';
import { getParsedLetter, ParsedLetter, normalizeLetterDate } from '../features/editor/utils/parsedLetter';
const ResizableSignature: React.FC<{ src: string; height: number; onChange: (h: number) => void }> = ({ src, height, onChange }) => {
  const [isSelected, setIsSelected] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaY = e.clientY - startYRef.current;
      const newHeight = Math.max(20, Math.min(150, startHeightRef.current + deltaY));
      onChange(newHeight);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isResizing, onChange]);

  useEffect(() => {
    if (!isSelected) return;

    const handleGlobalClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSelected(false);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [isSelected]);

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        e.stopPropagation();
        setIsSelected(true);
      }}
      style={{
        position: 'relative',
        display: 'inline-block',
        height: `${height}px`,
        margin: '4px 0',
        userSelect: 'none',
        cursor: 'pointer',
        padding: '2px'
      }}
    >
      <img
        src={src}
        alt="Signature"
        style={{ height: '100%', width: 'auto', objectFit: 'contain', display: 'block' }}
      />
      {isSelected && (
        <>
          <div
            className="no-print"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              border: '1.5px dashed #4f46e5',
              pointerEvents: 'none',
              borderRadius: '2px'
            }}
          />
          <div
            className="no-print"
            onPointerDown={handleResizeStart}
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              width: '18px',
              height: '18px',
              background: '#4f46e5',
              border: '1.5px solid white',
              borderRadius: '50%',
              cursor: 'se-resize',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              zIndex: 10,
              touchAction: 'none'
            }}
          />
        </>
      )}
    </div>
  );
};

export const Editor: React.FC<EditorProps> = ({ initialJobParams }) => {
  const { sidebarCollapsed, mobileActivePane, setMobileActivePane } = useAuthStore();

  // Main CV Parameters
  const [jobDescription, setJobDescription] = useState('');
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const template = useCvDocumentStore((s) => s.template);
  const setTemplate = useCvDocumentStore((s) => s.setTemplate);
  const [isLoading, setIsLoading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<ResumeVersion | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [applicationTracked, setApplicationTracked] = useState(false);
  const [saveAutomatically, setSaveAutomatically] = useState(true);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  // New Features: Language Selection, Aggressive Mode & Selective Projects
  const [targetLanguage, setTargetLanguage] = useState<'en' | 'de'>('en');
  const [aggressiveMode, setAggressiveMode] = useState<boolean>(false);
  const [masterProjects, setMasterProjects] = useState<Array<{ id: string; title: string; role?: string; technologies?: string[] }>>([]);
  const [masterProfileInfo, setMasterProfileInfo] = useState<any>(null);
  const liveSignatureRef = useRef<string>('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isProjectsCollapsed, setIsProjectsCollapsed] = useState(false);
  const [isAtsChecking, setIsAtsChecking] = useState<boolean>(false);
  const [keywordCategoryPopover, setKeywordCategoryPopover] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [polishModalInfo, setPolishModalInfo] = useState<{ text: string; onAccept: (newText: string) => void } | null>(null);
  const [polishInstruction, setPolishInstruction] = useState('Improve impact, metrics, and professional polish');
  const [isPolishing, setIsPolishing] = useState(false);

  // Tabs layout controls
  const [editorTab, setEditorTab] = useState<'resume' | 'letter' | 'job'>('resume');
  const [activeControlTab, setActiveControlTab] = useState<'tailor' | 'style' | 'ats'>('tailor');
  const [activeStyleSubTab, setActiveStyleSubTab] = useState<'theme' | 'sections'>('sections');
  const [activeDetailSectionId, setActiveDetailSectionId] = useState<string | null>(null);
  const [expandedSectionSettings, setExpandedSectionSettings] = useState<string | null>(null);
  const headerStyles = useCvDocumentStore((s) => s.headerStyles);
  const setHeaderStyles = useCvDocumentStore((s) => s.setHeaderStyles);
  const [activeSectionSettings, setActiveSectionSettings] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [editingSectionTitleId, setEditingSectionTitleId] = useState<string | null>(null);
  const [editingLanguagesId, setEditingLanguagesId] = useState<string | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);

  // Enhanced Section Controls State (AI Polish & Side-by-Side Review)
  const [openSectionAiModalId, setOpenSectionAiModalId] = useState<string | null>(null);
  const [sectionAiScope, setSectionAiScope] = useState<string>('all');
  const [sectionAiPrompt, setSectionAiPrompt] = useState<string>('');
  const [isGeneratingSectionAi, setIsGeneratingSectionAi] = useState<boolean>(false);
  const [sectionAiProposal, setSectionAiProposal] = useState<{
    sectionId: string;
    originalText: string;
    proposedText: string;
    payload: any;
  } | null>(null);

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add Custom Section Modal State
  const [isAddCustomSectionOpen, setIsAddCustomSectionOpen] = useState(false);

  // Smooth Section Hide / Show Animation State
  const [animatingHideSectionId, setAnimatingHideSectionId] = useState<string | null>(null);
  const [animatingShowSectionId, setAnimatingShowSectionId] = useState<string | null>(null);

  const toggleSectionVisibility = (sectionId: string) => {
    const target = sections.find(s => s.id === sectionId);
    if (!target) return;

    if (target.visible) {
      // Begin smooth collapse & glide-up of subsequent sections
      setAnimatingHideSectionId(sectionId);
      setTimeout(() => {
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, visible: false } : s));
        setTimeout(() => {
          setAnimatingHideSectionId(null);
        }, 50);
      }, 340);
    } else {
      // Begin smooth expand & glide-down of subsequent sections
      setAnimatingShowSectionId(sectionId);
      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, visible: true } : s));
      setTimeout(() => {
        setAnimatingShowSectionId(null);
      }, 360);
    }
  };

  // Resizable Control Panel State
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    const saved = localStorage.getItem('editor_panel_width');
    return saved ? parseInt(saved, 10) : 450;
  });
  const [isResizingPanel, setIsResizingPanel] = useState<boolean>(false);
  const controlPanelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // When navbar is collapsed (72px vs 260px), control panel claims the +188px reclaimed space
  const effectivePanelWidth = sidebarCollapsed ? panelWidth + 188 : panelWidth;

  // Mouse drag handler for panel resizing
  useEffect(() => {
    if (!isResizingPanel) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      let newBaseWidth = startWidthRef.current + deltaX;

      // Responsive bounds: leave at least adequate space for the CV canvas
      const minCanvasSpace = window.innerWidth < 1200 ? 360 : 460;
      const navOffset = sidebarCollapsed ? 72 : 260;
      const MIN_WIDTH = 320;
      const MAX_WIDTH = Math.max(MIN_WIDTH, Math.min(850, window.innerWidth - navOffset - minCanvasSpace));

      if (newBaseWidth < MIN_WIDTH) newBaseWidth = MIN_WIDTH;
      if (newBaseWidth > MAX_WIDTH) newBaseWidth = MAX_WIDTH;

      setPanelWidth(newBaseWidth);
    };

    const handleMouseUp = () => {
      setIsResizingPanel(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizingPanel, sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('editor_panel_width', panelWidth.toString());
  }, [panelWidth]);


  // Close active section settings popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!activeSectionSettings) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        if (
          target.closest(`.${styles.portalPopoverCard}`) ||
          target.closest(`.${styles.popoverSettingsCard}`) ||
          target.closest(`.${styles.settingsToggleBtn}`) ||
          target.closest(`.${styles.sectionControls}`)
        ) {
          return;
        }
      }
      setActiveSectionSettings(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeSectionSettings]);

  // Global Margins, Colors and Fonts (document store)
  const customStyles = useCvDocumentStore((s) => s.customStyles);
  const setCustomStyles = useCvDocumentStore((s) => s.setCustomStyles);

  const [letterStyles, setLetterStyles] = useState<{
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
  }>({
    fontSize: 13,
    lineHeight: 1.4,
    fontFamily: ''
  });

  // Section Ordering and Visibility Matrix (document store)
  const sections = useCvDocumentStore((s) => s.sections);
  const setSections = useCvDocumentStore((s) => s.setSections);

  // Editable CV text grids (document store)
  const editableSummary = useCvDocumentStore((s) => s.editableSummary);
  const setEditableSummary = useCvDocumentStore((s) => s.setEditableSummary);
  const editablePersonalInfo = useCvDocumentStore((s) => s.editablePersonalInfo);
  const setEditablePersonalInfo = useCvDocumentStore((s) => s.setEditablePersonalInfo);
  const editableExperiences = useCvDocumentStore((s) => s.editableExperiences);
  const setEditableExperiences = useCvDocumentStore((s) => s.setEditableExperiences);
  const editableProjects = useCvDocumentStore((s) => s.editableProjects);
  const setEditableProjects = useCvDocumentStore((s) => s.setEditableProjects);
  const editableEducations = useCvDocumentStore((s) => s.editableEducations);
  const setEditableEducations = useCvDocumentStore((s) => s.setEditableEducations);
  const editableSkills = useCvDocumentStore((s) => s.editableSkills);
  const setEditableSkills = useCvDocumentStore((s) => s.setEditableSkills);
  const [expandedProjectCards, setExpandedProjectCards] = useState<Record<string, boolean>>({});

  // Document state lives in a shared store — start every editor visit from clean defaults
  useEffect(() => {
    useCvDocumentStore.getState().resetDocument();
  }, []);

  // Dynamic Document Title: "name of the applicant_Lebenslauf"
  useEffect(() => {
    const name = editablePersonalInfo.full_name?.trim();
    if (name) {
      document.title = `${name}_Lebenslauf`;
    } else {
      document.title = 'Lebenslauf';
    }
  }, [editablePersonalInfo.full_name]);

  // ATS Optimizer & Real-time Scoring States
  const [atsReport, setAtsReport] = useState<ATSReport | null>(null);
  const [atsProposals, setAtsProposals] = useState<Proposal[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isAtsOptimizing, setIsAtsOptimizing] = useState<boolean>(false);
  const scoreDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createSnapshot = (label: string) => {
    const newSnap: Snapshot = {
      id: `snap_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      label,
      score: atsReport?.score || 0,
      data: {
        summary: editableSummary,
        experiences: JSON.parse(JSON.stringify(editableExperiences)),
        skills: JSON.parse(JSON.stringify(editableSkills)),
        projects: JSON.parse(JSON.stringify(editableProjects)),
        educations: JSON.parse(JSON.stringify(editableEducations)),
        sections: JSON.parse(JSON.stringify(sections))
      }
    };
    setSnapshots(prev => [newSnap, ...prev.slice(0, 19)]);
  };

  const revertSnapshot = (snapshot: Snapshot) => {
    if (!snapshot?.data) return;
    createSnapshot(`Before revert to '${snapshot.label}'`);
    if (snapshot.data.summary !== undefined) setEditableSummary(snapshot.data.summary);
    if (snapshot.data.experiences) setEditableExperiences(snapshot.data.experiences);
    if (snapshot.data.skills) setEditableSkills(snapshot.data.skills);
    if (snapshot.data.projects) setEditableProjects(snapshot.data.projects);
    if (snapshot.data.educations) setEditableEducations(snapshot.data.educations);
    if (snapshot.data.sections) setSections(snapshot.data.sections);
  };

  const fetchATSScore = async () => {
    try {
      const cvDetails = {
        summary: editableSummary,
        experiences: editableExperiences,
        skills: editableSkills,
        projects: editableProjects,
        educations: editableEducations,
        sections: sections
      };
      const targetJd = jobDescription || (position ? `${position} at ${company}` : '');
      if (!targetJd) return;

      const res = await api.post('/resume/ats/score', {
        job_description: targetJd,
        cv_details: cvDetails
      });
      if (res.data?.success && res.data.ats_report) {
        setAtsReport(res.data.ats_report);
      }
    } catch (err) {
      console.error("Failed to calculate ATS score:", err);
    }
  };

  // Note: ATS score is retrieved from currentVersion.tailored_details.ats_report or calculated locally via liveAtsReport.
  // We remove automatic debounced API calls to /resume/ats/score to avoid consuming API credits on page load/edits.

  // Track manually injected / removed skills for reliable 100% green matched tag transfer
  const [userInjectedSkills, setUserInjectedSkills] = useState<string[]>([]);
  const [userRemovedSkills, setUserRemovedSkills] = useState<string[]>([]);

  const handleInjectSkill = (skillName: string, category?: string) => {
    createSnapshot(`Before inject skill '${skillName}'`);
    const catNormalized = (category || 'technical').toLowerCase().trim();
    const normalized = skillName.trim();

    setUserRemovedSkills(prev => prev.filter(s => s.toLowerCase() !== normalized.toLowerCase()));
    setUserInjectedSkills(prev => Array.from(new Set([...prev, normalized])));

    setEditableSkills(prev => {
      // Find existing category to reuse exact casing or fallback to normalized
      const existingMatch = prev.find(s => (s.category || '').toLowerCase().trim() === catNormalized);
      const targetCategory = existingMatch ? existingMatch.category : catNormalized;

      if (prev.some(s => s.name.toLowerCase() === normalized.toLowerCase())) return prev;
      return [
        ...prev,
        { id: `sk_${Date.now()}`, name: normalized, category: targetCategory }
      ];
    });
  };

  const handleRemoveSkill = (skillName: string) => {
    createSnapshot(`Before remove skill '${skillName}'`);
    const normalized = skillName.trim();

    setUserInjectedSkills(prev => prev.filter(s => s.toLowerCase() !== normalized.toLowerCase()));
    setUserRemovedSkills(prev => Array.from(new Set([...prev, normalized])));
    setEditableSkills(prev => prev.filter(s => s.name.toLowerCase() !== normalized.toLowerCase()));
  };

  const handleAcceptProposal = (proposal: Proposal) => {
    createSnapshot(`Before apply proposal '${proposal.title}'`);
    if (proposal.type === 'add_skills' && proposal.skills_to_add) {
      setEditableSkills(prev => [
        ...prev,
        ...proposal.skills_to_add!.map((s: string, idx: number) => ({ id: `sk_${Date.now()}_${idx}`, name: s, category: 'technical' }))
      ]);
    } else if (proposal.type === 'section_reorder' && proposal.target_section) {
      setSections(prev => {
        const reordered = [...prev];
        const targetIdx = reordered.findIndex(s => s.id === proposal.target_section);
        if (targetIdx !== -1) {
          const [item] = reordered.splice(targetIdx, 1);
          reordered.splice(proposal.new_index || 0, 0, item);
        }
        return reordered;
      });
    } else if (proposal.type === 'bullet_rephrase' && proposal.experience_id && proposal.proposed_bullet) {
      setEditableExperiences(prev => prev.map(exp => {
        if (exp.id !== proposal.experience_id) return exp;
        const updatedBullets = [...exp.bullets];
        if (updatedBullets.length > 0) {
          updatedBullets[0] = proposal.proposed_bullet!;
        }
        return { ...exp, bullets: updatedBullets };
      }));
    }
    setAtsProposals(prev => prev.filter(p => p.id !== proposal.id));
  };

  const handleRequestOptimization = async () => {
    setIsAtsOptimizing(true);
    try {
      const cvDetails = {
        summary: editableSummary,
        experiences: editableExperiences,
        skills: editableSkills,
        projects: editableProjects,
        educations: editableEducations,
        sections: sections
      };
      const targetJd = jobDescription || (position ? `${position} at ${company}` : '');
      const res = await api.post('/resume/ats/optimize', {
        job_description: targetJd,
        cv_details: cvDetails
      });
      if (res.data?.success) {
        setAtsProposals(res.data.proposals || []);
      }
    } catch (err) {
      console.error("Failed to generate optimization proposals:", err);
    } finally {
      setIsAtsOptimizing(false);
    }
  };

  // Rely strictly on AI-generated ATS report from tailoring version payload
  const liveAtsReport: ATSReport | null = React.useMemo(() => {
    const aiReport = currentVersion?.tailored_details?.ats_report;
    const aiBaseScore = currentVersion?.ats_score || aiReport?.score || 0;

    const extractKwList = (keywords: any): string[] => {
      if (!keywords) return [];
      if (Array.isArray(keywords)) {
        return keywords.map(k => (typeof k === 'string' ? k : k?.name || '')).map(k => String(k).trim()).filter(Boolean);
      }
      if (typeof keywords === 'object') {
        return Object.values(keywords)
          .flat()
          .map((k: any) => (typeof k === 'string' ? k : k?.name || ''))
          .map(k => String(k).trim())
          .filter(Boolean);
      }
      return [];
    };

    const rawMatched = extractKwList(aiReport?.matched_keywords);
    const rawMissing = extractKwList(aiReport?.missing_keywords);

    const matchedList: Array<{ name: string; category: string }> = [];
    const missingList: Array<{ name: string; category: string }> = [];

    // 1. Process AI Matched Keywords
    rawMatched.forEach(kw => {
      const isRemoved = userRemovedSkills.some(s => s.toLowerCase() === kw.toLowerCase());
      if (isRemoved) {
        missingList.push({ name: kw, category: 'missing' });
      } else {
        matchedList.push({ name: kw, category: 'matched' });
      }
    });

    // 2. Process AI Missing Keywords
    rawMissing.forEach(kw => {
      const isUserInjected = userInjectedSkills.some(s => s.toLowerCase() === kw.toLowerCase() || kw.toLowerCase().includes(s.toLowerCase()));
      if (isUserInjected) {
        matchedList.push({ name: kw, category: 'matched' });
      } else {
        missingList.push({ name: kw, category: 'missing' });
      }
    });

    const newlyMatchedCount = matchedList.filter(m => rawMissing.some(rm => rm.toLowerCase() === m.name.toLowerCase())).length;
    const finalScore = Math.min(100, Math.max(0, aiBaseScore + (newlyMatchedCount * 3)));

    const totalKw = (rawMatched.length + rawMissing.length) || 1;
    const kwCoverage = Math.min(100, Math.round((matchedList.length / totalKw) * 100));

    return {
      score: finalScore,
      breakdown: {
        keywords: kwCoverage,
        structure: 85,
        bullets: 80,
        format: 90,
        semantics: 85
      },
      matched_keywords: {
        hard_skills: matchedList.map(m => m.name),
        tools: [],
        soft_skills: [],
        action_verbs: []
      },
      missing_keywords: {
        hard_skills: missingList.map(m => m.name),
        tools: [],
        soft_skills: [],
        action_verbs: []
      },
      all_matched: matchedList,
      all_missing: missingList,
      suggestions: aiReport?.suggestions || (
        missingList.length > 0
          ? [`Add missing keywords to boost callbacks: ${missingList.slice(0, 4).map(m => m.name).join(', ')}.`]
          : ['Perfect keyword coverage! 100% matched with target job ad.']
      )
    };
  }, [currentVersion, userInjectedSkills, userRemovedSkills]);

  const activeAtsScore = liveAtsReport?.score ?? (currentVersion?.ats_score || 85);

  // ---- Deep ATS analysis (single combined AI call, persisted in tailored_details) ----
  const [dismissedAts, setDismissedAts] = useState<string[]>(
    (currentVersion?.tailored_details as any)?.customization?.dismissed_ats || []
  );

  const deepAnalysis: DeepAnalysis | null = React.useMemo(() => {
    const td: any = (currentVersion?.tailored_details ?? {}) as any;
    const d = td.deep_analysis || td.ats_report?.deep_analysis || (atsReport as any)?.deep_analysis;
    if (!d || typeof d !== 'object') return null;
    return {
      section_scores: Array.isArray(d.section_scores) ? d.section_scores : [],
      weak_bullets: Array.isArray(d.weak_bullets) ? d.weak_bullets : [],
      recommended_keywords: Array.isArray(d.recommended_keywords) ? d.recommended_keywords : [],
      recruiter_impression: d.recruiter_impression || {},
      fit_report: d.fit_report || {}
    };
  }, [currentVersion, atsReport]);

  const handleDismissAtsItem = (id: string) => {
    setDismissedAts(prev => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleApplyBulletFix = (wb: WeakBulletWithOriginal) => {
    createSnapshot(`Before apply bullet fix (${wb.contextLabel})`);
    if (wb.type === 'project') {
      setEditableProjects(prev => prev.map(proj => {
        if (!proj.id || proj.id !== wb.id) return proj;
        const bullets = [...(proj.bullets || [])];
        if (bullets.length > wb.bullet_index) bullets[wb.bullet_index] = wb.improved;
        return { ...proj, bullets };
      }));
    } else {
      setEditableExperiences(prev => prev.map(exp => {
        if (exp.id !== wb.id) return exp;
        const bullets = [...(exp.bullets || [])];
        if (bullets.length > wb.bullet_index) bullets[wb.bullet_index] = wb.improved;
        return { ...exp, bullets };
      }));
    }
    handleDismissAtsItem(`bullet:${wb.id}:${wb.bullet_index}`);
  };

  const recommendedKeywords: RecommendedKeyword[] = React.useMemo(() => {
    const kw = deepAnalysis?.recommended_keywords || [];
    return kw.map(k => ({
      name: k.name,
      category: k.category || 'hard_skills',
      reason: k.reason,
      applied: editableSkills.some(s => s.name.toLowerCase() === k.name.toLowerCase())
    }));
  }, [deepAnalysis, editableSkills]);

  const weakBullets: WeakBulletWithOriginal[] = React.useMemo(() => {
    const list = deepAnalysis?.weak_bullets || [];
    return list.map(wb => {
      let original = '';
      let contextLabel = '';
      if (wb.type === 'project') {
        const proj = editableProjects.find(p => p.id === wb.id);
        original = proj?.bullets?.[wb.bullet_index] || '';
        contextLabel = proj?.title || 'Project';
      } else {
        const exp = editableExperiences.find(e => e.id === wb.id);
        original = exp?.bullets?.[wb.bullet_index] || '';
        contextLabel = exp ? `${exp.position || 'Role'}${exp.company ? ` @ ${exp.company}` : ''}` : 'Experience';
      }
      return { ...wb, original, contextLabel };
    }).filter(wb => wb.original || wb.improved);
  }, [deepAnalysis, editableExperiences, editableProjects]);

  const atsChecklist = React.useMemo(() => computeReadinessChecklist({
    personalInfo: editablePersonalInfo,
    summary: editableSummary,
    experiences: editableExperiences,
    projects: editableProjects,
    skills: editableSkills,
    educations: editableEducations,
    sections
  }), [editablePersonalInfo, editableSummary, editableExperiences, editableProjects, editableSkills, editableEducations, sections]);

  const atsCoverage = React.useMemo(() => {
    if (!liveAtsReport) return null;
    const matched = liveAtsReport.all_matched.length;
    const total = matched + liveAtsReport.all_missing.length;
    return { matched, total, percent: total > 0 ? Math.round((matched / total) * 100) : 0 };
  }, [liveAtsReport]);

  const beforeAfter = React.useMemo(() => {
    const orig = currentVersion?.tailored_details?.original_profile;
    if (!orig) return null;
    const origBullets = [
      ...(orig.work_experiences || []).flatMap(e => e.bullets || []),
      ...(orig.projects || []).flatMap(p => p.bullets || []),
    ].filter(b => b && b.trim());
    const curBullets = [
      ...editableExperiences.flatMap(e => e.bullets || []),
      ...editableProjects.flatMap(p => p.bullets || []),
    ].filter(b => b && b.trim());
    const origSet = new Set(origBullets.map(b => b.trim()));
    const changedCount = curBullets.filter(b => !origSet.has(b.trim())).length;
    return {
      originalSummary: orig.personal_info?.summary || '',
      currentSummary: editableSummary,
      changedBullets: changedCount,
      totalBullets: curBullets.length,
      originalSkillCount: (orig.skills || []).length,
      currentSkillCount: editableSkills.length
    };
  }, [currentVersion, editableSummary, editableExperiences, editableProjects, editableSkills]);

  const handleExportAtsReport = () => {
    if (!liveAtsReport) return;
    const md = buildOptimizationMarkdown({
      targetRole: currentVersion?.target_role || position || '',
      targetCompany: currentVersion?.target_company || company || '',
      report: liveAtsReport,
      coverage: atsCoverage,
      checklist: atsChecklist,
      deep: deepAnalysis
    });
    downloadMarkdown(
      `ats-report-${(currentVersion?.target_company || 'resume').toLowerCase().replace(/\s+/g, '-')}.md`,
      md
    );
  };




  const categoryOrder = useCvDocumentStore((s) => s.categoryOrder);
  const setCategoryOrder = useCvDocumentStore((s) => s.setCategoryOrder);
  const languagesFirst = useCvDocumentStore((s) => s.languagesFirst);
  const setLanguagesFirst = useCvDocumentStore((s) => s.setLanguagesFirst);
  const languagesTitle = useCvDocumentStore((s) => s.languagesTitle);
  const setLanguagesTitle = useCvDocumentStore((s) => s.setLanguagesTitle);
  const [expandedSkillCats, setExpandedSkillCats] = useState<Record<string, boolean>>({});

  // Focus redirection metadata when editing lists dynamically
  const [focusedBulletInfo, setFocusedBulletInfo] = useState<{ type: 'experience' | 'project' | 'education' | 'custom'; itemId: string; bulletIdx: number } | null>(null);


  // Cover Letter states
  const [letterContent, setLetterContent] = useState('');
  const [letterTone, setLetterTone] = useState('professional');
  const [letterLanguage, setLetterLanguage] = useState<'auto' | 'en' | 'de'>('auto');
  const [showSignature, setShowSignature] = useState(true);
  const signatureHeight = customStyles.signatureHeight || 48;
  const setSignatureHeight = (height: number | ((prev: number) => number)) => {
    setCustomStyles(s => ({
      ...s,
      signatureHeight: typeof height === 'function' ? height(s.signatureHeight || 48) : height
    }));
  };
  const [isLetterLoading, setIsLetterLoading] = useState(false);

  // Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveBanner, setShowSaveBanner] = useState(false);
  const [saveBannerMessage, setSaveBannerMessage] = useState('CV Revision Saved Successfully!');
  const [isSigDragOver, setIsSigDragOver] = useState(false);

  // Interactive AI Recommendation Tooltips
  const [hoveredSuggestion, setHoveredSuggestion] = useState<string | null>(null);
  const [reviewedActions, setReviewedActions] = useState<Record<string, 'accepted' | 'rejected'>>({});
  const [rephrasePrompt, setRephrasePrompt] = useState<Record<string, string>>({});
  const [isRephrasing, setIsRephrasing] = useState<Record<string, boolean>>({});
  const [openAiPopoverId, setOpenAiPopoverId] = useState<string | null>(null);

  const handleAiRewriteBlock = async (key: string, originalText: string, customInstruction?: string) => {
    if (!originalText || !originalText.trim()) return;
    setIsRephrasing(prev => ({ ...prev, [key]: true }));
    const instruction = customInstruction || rephrasePrompt[key] || "Improve impact, technical polish, and clarity for ATS optimization";

    try {
      const res = await api.post('/resume/rephrase', {
        text: originalText,
        instruction: instruction
      });

      if (res.data && res.data.success && res.data.rephrased_text) {
        const newText = res.data.rephrased_text;

        if (key === 'summary') {
          setEditableSummary(newText);
        } else if (key.startsWith('exp-bullet-')) {
          const parts = key.replace('exp-bullet-', '').split('-');
          const expIdx = parseInt(parts[0]);
          const bulletIdx = parseInt(parts[1]);
          setEditableExperiences(prev => prev.map((exp, idx) => {
            if (idx !== expIdx) return exp;
            const updatedBullets = [...exp.bullets];
            updatedBullets[bulletIdx] = newText;
            return { ...exp, bullets: updatedBullets };
          }));
        } else if (key.startsWith('exp-position-')) {
          const expIdx = parseInt(key.replace('exp-position-', ''));
          setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, position: newText } : e));
        } else if (key.startsWith('proj-bullet-')) {
          const parts = key.replace('proj-bullet-', '').split('-');
          const projIdx = parseInt(parts[0]);
          const bulletIdx = parseInt(parts[1]);
          setEditableProjects(prev => prev.map((proj, idx) => {
            if (idx !== projIdx) return proj;
            const updatedBullets = [...proj.bullets];
            updatedBullets[bulletIdx] = newText;
            return { ...proj, bullets: updatedBullets };
          }));
        } else if (key.startsWith('proj-title-')) {
          const projIdx = parseInt(key.replace('proj-title-', ''));
          setEditableProjects(prev => prev.map((p, i) => i === projIdx ? { ...p, title: newText } : p));
        } else if (key.startsWith('edu-bullet-')) {
          const parts = key.replace('edu-bullet-', '').split('-');
          const eduIdx = parseInt(parts[0]);
          const bulletIdx = parseInt(parts[1]);
          setEditableEducations(prev => prev.map((edu, idx) => {
            if (idx !== eduIdx) return edu;
            const updatedBullets = [...(edu.bullets || [])];
            updatedBullets[bulletIdx] = newText;
            return { ...edu, bullets: updatedBullets };
          }));
        } else if (key.startsWith('custom-bullet-')) {
          const parts = key.replace('custom-bullet-', '').split('-');
          const secId = parts[0];
          const bulletIdx = parseInt(parts[1]);
          setSections(prev => prev.map(s => {
            if (s.id !== secId) return s;
            const updatedBullets = [...(s.bullets || [])];
            updatedBullets[bulletIdx] = newText;
            return { ...s, bullets: updatedBullets };
          }));
        }

        setRephrasePrompt(prev => ({ ...prev, [key]: '' }));
        setOpenAiPopoverId(null);
      }
    } catch (err) {
      console.error('Failed to rewrite block:', err);
    } finally {
      setIsRephrasing(prev => ({ ...prev, [key]: false }));
    }
  };

  // Close AI popover when clicking outside
  useEffect(() => {
    const handleClosePopover = (e: MouseEvent) => {
      if (!openAiPopoverId) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.closest(`.${styles.inlineAiPopover}`) || target.closest(`.${styles.hoverAiBar}`))) {
        return;
      }
      setOpenAiPopoverId(null);
    };
    document.addEventListener('mousedown', handleClosePopover);
    return () => document.removeEventListener('mousedown', handleClosePopover);
  }, [openAiPopoverId]);

  // Unified Hover AI Controls Renderer for Canvas Text Blocks (Integrated into Section AI Polish)
  const renderHoverAiControls = (_key?: string, _currentText?: string, _customChips?: any[]) => {
    return null;
  };

  // Canvas viewport scale settings
  const viewportRef = useRef<HTMLDivElement>(null);

  const MOBILE_BREAKPOINT = 1024;
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT);

  useEffect(() => {
    const handleViewportChange = () => setIsMobileViewport(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, []);

  // Multi-Page Virtual Matrix state
  const hiddenCanvasRef = useRef<HTMLDivElement>(null);
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});

  // Sync route param hashes
  const updateTabHash = (newTab: 'resume' | 'letter' | 'job') => {
    setEditorTab(newTab);
    if (initialJobParams?.application_id) {
      window.location.hash = `editor?appId=${initialJobParams.application_id}&tab=${newTab}`;
    }
  };

  // Sync category ordering on skills changes (preserving custom category order)
  useEffect(() => {
    const itSkills = editableSkills.filter(s => (s.category || '').toLowerCase().trim() !== 'languages');
    const uniqueCats = Array.from(new Set(itSkills.map(s => (s.category || 'technical').toLowerCase().trim())));
    setCategoryOrder(prev => {
      if (prev.length === 0) return uniqueCats;
      const normalizedPrev = prev.map(c => c.toLowerCase().trim());
      const filteredPrev = normalizedPrev.filter(c => uniqueCats.includes(c));
      const added = uniqueCats.filter(c => !filteredPrev.includes(c));
      return [...filteredPrev, ...added];
    });
  }, [editableSkills]);

  // Virtual page matrix + canvas zoom-to-fit
  const pages = useCvPagination(
    hiddenCanvasRef,
    {
      template, sections, editableExperiences, editableProjects,
      editableEducations, editableSkills, customStyles,
      languagesFirst, categoryOrder,
    },
    [
      editableSummary, editablePersonalInfo, editableExperiences, editableSkills,
      editableProjects, editableEducations, template, sections, customStyles, headerStyles,
      languagesFirst, categoryOrder, mobileActivePane
    ]
  );

  const { scale, scaledWrapperRef, wrapperHeightCompensation } = useCanvasZoom(
    viewportRef,
    [currentVersion, editorTab, customStyles.pageSize, mobileActivePane],
    [editorTab, pages, customStyles]
  );

  // Trigger DOM layout engine re-calculation when styling changes
  useEffect(() => {
    window.dispatchEvent(new Event('cv-style-change'));
  }, [customStyles, sections, template]);

  // Re-measure canvas fields when the preview pane becomes visible again on mobile —
  // textareas measured while display:none collapse to zero height
  useEffect(() => {
    if (!isMobileViewport || mobileActivePane !== 'preview') return;
    window.dispatchEvent(new Event('cv-style-change'));
    const timer = setTimeout(() => window.dispatchEvent(new Event('cv-style-change')), 150);
    return () => clearTimeout(timer);
  }, [isMobileViewport, mobileActivePane]);

  const [masterProfileData, setMasterProfileData] = useState<any>(null);

  // Load master profile projects and info for tailoring selection & diagnostics
  useEffect(() => {
    const fetchMasterProfile = async () => {
      try {
        const res = await api.get('/master-profile/full');
        const profileObj = (res.data && res.data.success) ? res.data.data : res.data;
        if (profileObj) {
          setMasterProfileData(profileObj);
          if (profileObj.personal_info) {
            setMasterProfileInfo(profileObj.personal_info);
            const liveSig = profileObj.personal_info.signature_image || '';
            liveSignatureRef.current = liveSig;
            if (liveSig) {
              setEditablePersonalInfo(prev => {
                if (!prev.signature_image) {
                  return { ...prev, signature_image: liveSig };
                }
                return prev;
              });
            }
          }
          if (profileObj.projects && profileObj.projects.length > 0) {
            const projs = profileObj.projects.map((p: any) => ({
              id: p.id,
              title: p.title || 'Untitled Project',
              role: p.role || '',
              technologies: p.technologies || []
            }));
            setMasterProjects(projs);
            setSelectedProjectIds(projs.map((p: any) => p.id));
          }

          // Only set default editable fields if no existing version/application is loaded
          if (!initialJobParams?.application_id) {
            if (profileObj.personal_info) {
              setEditablePersonalInfo({
                id: profileObj.personal_info.id,
                full_name: profileObj.personal_info.full_name || '',
                title: profileObj.personal_info.title || '',
                email: profileObj.personal_info.email || '',
                phone: formatPhoneNumber(profileObj.personal_info.phone || ''),
                location: profileObj.personal_info.location || '',
                date_of_birth: profileObj.personal_info.date_of_birth || '',
                nationality: profileObj.personal_info.nationality || '',
                linkedin: profileObj.personal_info.linkedin || '',
                github: profileObj.personal_info.github || '',
                website: profileObj.personal_info.website || '',
                image_url: profileObj.personal_info.image_url || useAuthStore.getState().user?.avatar || '',
                signature_image: profileObj.personal_info.signature_image || ''
              });
              if (profileObj.personal_info.summary) {
                setEditableSummary(profileObj.personal_info.summary);
              }
            }
            if (profileObj.work_experiences && profileObj.work_experiences.length > 0) {
              setEditableExperiences(profileObj.work_experiences);
            }
            if (profileObj.skills && profileObj.skills.length > 0) {
              setEditableSkills(profileObj.skills);
            }
            if (profileObj.educations && profileObj.educations.length > 0) {
              setEditableEducations(profileObj.educations);
            }
            if (profileObj.projects && profileObj.projects.length > 0) {
              setEditableProjects(profileObj.projects);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load master profile:', err);
      }
    };
    fetchMasterProfile();
  }, [initialJobParams]);


  // Keyboard focus relocation hook for bullet list manipulation
  useEffect(() => {
    if (focusedBulletInfo) {
      const inputId = `bullet-input-${focusedBulletInfo.type}-${focusedBulletInfo.itemId}-${focusedBulletInfo.bulletIdx}`;
      const element = document.getElementById(inputId);
      if (element) {
        (element as HTMLTextAreaElement).focus();
      }
      setFocusedBulletInfo(null);
    }
  }, [focusedBulletInfo]);

  // Load resume application version on startup
  useEffect(() => {
    if (initialJobParams) {
      if (initialJobParams.tab && ['resume', 'letter', 'job'].includes(initialJobParams.tab)) {
        setEditorTab(initialJobParams.tab as any);
      }
      if (initialJobParams.company) setCompany(initialJobParams.company);
      if (initialJobParams.position) setPosition(initialJobParams.position);
      if (initialJobParams.desc) setJobDescription(initialJobParams.desc);
    }

    const fetchExistingVersion = async () => {
      // Chrome-extension deep link: /editor?versionId=<uuid>
      if (initialJobParams?.version_id) {
        try {
          const res = await api.get('/resume/versions');
          const ver = (res.data as any[]).find((v: any) => v.id === initialJobParams.version_id);
          if (ver) {
            setCompany(ver.target_company || '');
            setPosition(ver.target_role || '');
            setCurrentVersion(ver);
            initializeVersionFields(ver);
          } else {
            setToast({ message: 'Linked CV version was not found.', type: 'error' });
          }
        } catch (err) {
          console.error('Failed to load linked version:', err);
          setToast({ message: 'Failed to load the CV generated by the extension.', type: 'error' });
        }
        return;
      }

      if (initialJobParams?.application_id) {
        try {
          const appRes = await api.get(`/applications/${initialJobParams.application_id}`);
          if (appRes.data) {
            setCompany(appRes.data.company || '');
            setPosition(appRes.data.position || '');
            setJobDescription(appRes.data.job_description || '');
          }
        } catch (err) {
          console.error('Failed to load application specs:', err);
        }

        try {
          const res = await api.get('/resume/versions');
          const sortedVersions = [...res.data].sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const matched = sortedVersions.find((v: any) => v.application === initialJobParams.application_id);
          if (matched) {
            const ver = matched as ResumeVersion;
            setCurrentVersion(ver);
            initializeVersionFields(ver);

            const letterRes = await api.get('/resume/letters');
            const sortedLetters = [...letterRes.data].sort((a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            const matchedLetter = sortedLetters.find((l: any) => l.application === initialJobParams.application_id);
            if (matchedLetter) {
              setLetterContent(matchedLetter.content);
              setLetterTone(matchedLetter.tone);
            }
          }
        } catch (err) {
          console.error('Failed to load version details:', err);
        }
      }
    };
    fetchExistingVersion();
  }, [initialJobParams]);

  // Helper to initialize fields from version object
  const initializeVersionFields = (ver: ResumeVersion) => {
    setApplicationTracked(!!ver.application);
    setEditableSummary(ver.tailored_summary || '');
    setTemplate(ver.template);

    const profile = ver.tailored_details.original_profile;
    if (profile) {
      if (profile.personal_info) {
        const tailoredPI = ver.tailored_details.personal_info || {};
        setEditablePersonalInfo({
          id: profile.personal_info.id,
          full_name: profile.personal_info.full_name || '',
          title: tailoredPI.title || profile.personal_info.title || '',
          email: profile.personal_info.email || '',
          phone: formatPhoneNumber(profile.personal_info.phone || ''),
          location: tailoredPI.location || profile.personal_info.location || '',
          date_of_birth: profile.personal_info.date_of_birth || '',
          nationality: profile.personal_info.nationality || '',
          linkedin: profile.personal_info.linkedin || '',
          github: profile.personal_info.github || '',
          website: profile.personal_info.website || '',
          image_url: profile.personal_info.image_url || '',
          signature_image: profile.personal_info.signature_image || liveSignatureRef.current || ''
        });
      }

      const rawExps = ver.tailored_details.experiences || [];
      const profileExps = profile.work_experiences || [];
      const experiences = profileExps.map((exp: any) => {
        const tailored = rawExps.find((e: any) => e.id === exp.id);
        return {
          id: exp.id,
          company: exp.company || '',
          position: tailored?.position || exp.position || '',
          location: tailored?.location || exp.location || '',
          start_date: exp.start_date || '',
          end_date: exp.end_date || '',
          bullets: tailored ? tailored.bullets : exp.bullets
        };
      });
      setEditableExperiences(experiences);

      const rawSkills = ver.tailored_details.skills || profile.skills || [];
      const remappedSkills = rawSkills.map((s: any) => {
        const COMMON_TECH_WORDS = [
          'typescript', 'javascript', 'js', 'ts', 'python', 'java', 'c++', 'c#', 'php', 'ruby',
          'golang', 'html', 'css', 'sql', 'react', 'vue', 'angular', 'node', 'django', 'postgresql',
          'mysql', 'mongodb', 'docker', 'kubernetes', 'aws', 'git', 'flutter', 'dart', 'kotlin', 'swift'
        ];
        const isTech = COMMON_TECH_WORDS.includes((s.name || '').toLowerCase().trim());
        if (isTech && (s.category || '').toLowerCase().trim() === 'languages') {
          return { ...s, category: 'programming languages' };
        }
        return s;
      });
      setEditableSkills(remappedSkills);
      const detailsAny = ver.tailored_details as any;
      const tailoredProjectsList = detailsAny.projects || detailsAny.tailored_projects || [];
      const mappedProjects = (profile.projects || []).map((p: any) => {
        const tailoredP = tailoredProjectsList.find((tp: any) => String(tp.id) === String(p.id));
        return {
          id: p.id || `proj_${Math.random()}`,
          bullets: (tailoredP && tailoredP.bullets && tailoredP.bullets.length > 0) ? tailoredP.bullets : (p.bullets || []),
          title: tailoredP?.title || p.title || '',
          role: tailoredP?.role || p.role || '',
          technologies: p.technologies || p.tech_stack || tailoredP?.technologies || [],
          date: p.date || '',
          link: p.link || tailoredP?.link || ''
        };
      });
      setEditableProjects(mappedProjects);

      const rawEdus = ver.tailored_details.educations || [];
      const profileEdus = profile.educations || [];
      const educations = profileEdus.map((edu: any) => {
        const tailored = rawEdus.find((e: any) => e.id === edu.id);
        return {
          id: edu.id,
          institution: edu.institution || '',
          degree: tailored?.degree || edu.degree || '',
          field_of_study: tailored?.field_of_study || edu.field_of_study || '',
          location: tailored?.location || edu.location || '',
          start_date: edu.start_date || '',
          end_date: edu.end_date || ''
        };
      });
      setEditableEducations(educations);
    }

    // Load styles config
    const customData = ver.tailored_details.customization;
    // Restore resume language so German-tailored CVs get localized labels
    // (section names, date formats, category headers like 'Sprachen').
    {
      const savedLang = String((ver.tailored_details as any)?.target_language || '').toLowerCase();
      if (savedLang) {
        setTargetLanguage(['de', 'deutsch', 'german'].includes(savedLang) ? 'de' : 'en');
      } else {
        // Legacy versions: heuristic detection from tailored content
        const sample = [
          ver.tailored_summary || '',
          ...((ver.tailored_details?.experiences || []) as any[]).flatMap(e => e.bullets || [])
        ].join(' ');
        const germanHits = (sample.match(/\b(und|für|über|durch|bereich|entwicklung|verantwortlich|projekte|team)\b/gi) || []).length;
        setTargetLanguage(germanHits >= 3 ? 'de' : 'en');
      }
    }
    if (customData) {
      if (customData.sections) setSections(customData.sections);
      if (customData.customStyles) {
        setCustomStyles({
          ...customStyles,
          ...customData.customStyles,
          pageSize: customData.customStyles?.pageSize || 'A4'
        });
      }
      if (customData.headerStyles) setHeaderStyles(customData.headerStyles);
      if (customData.categoryOrder) setCategoryOrder(customData.categoryOrder);
      if (typeof customData.languagesFirst === 'boolean') setLanguagesFirst(customData.languagesFirst);
      if (customData.languagesTitle) setLanguagesTitle(customData.languagesTitle);
      if (customData.letterStyles) {
        setLetterStyles(customData.letterStyles);
      } else {
        setLetterStyles({
          fontSize: 13,
          lineHeight: 1.4,
          fontFamily: ''
        });
      }
    } else {
      setHeaderStyles({});
      const detailsAny = ver.tailored_details as any;
      const secNames = detailsAny.tailored_section_names || (
        targetLanguage === 'de' ? {
          summary: 'Zusammenfassung',
          experience: 'Berufserfahrung',
          projects: 'Projekte',
          education: 'Ausbildung',
          skills: 'Kenntnisse'
        } : null
      );

      setSections([
        { id: 'summary', name: secNames?.summary || 'Professional Summary', visible: true, type: 'summary' },
        { id: 'experience', name: secNames?.experience || 'Work Experience', visible: true, type: 'experience' },
        { id: 'projects', name: secNames?.projects || 'Projects', visible: true, type: 'projects' },
        { id: 'education', name: secNames?.education || 'Education', visible: true, type: 'education' },
        { id: 'skills', name: secNames?.skills || 'Skills', visible: true, type: 'skills' }
      ]);
      setCustomStyles({
        fontSize: 13,
        headingSize: 1.4,
        lineHeight: 1.4,
        sectionSpacing: 20,
        accentColor: ver.template === 'executive_professional' ? '#1e3a8a' : (ver.template === 'creative_tech' ? '#10b981' : '#0f172a'),
        textColor: '#334155',
        alignment: 'left',
        pageMargin: 48,
        bulletSpacing: 4,
        dateFormat: 'MM/YYYY',
        pageSize: 'A4'
      });
      setLetterStyles({
        fontSize: 13,
        lineHeight: 1.4,
        fontFamily: ''
      });
    }
  };

  // ----------------------------------------------------
  // LIST OPERATIONS AND CANVAS HANDLERS
  // ----------------------------------------------------

  // Section Reordering Handler
  // ----------------------------------------------------
  // SECTION OPERATIONS (logic lives in useSectionOps hook)
  // ----------------------------------------------------
  const {
    handleMoveSection,
    handleQuickAddSectionItem,
    getSectionAiScopeOptions,
    extractContentForScope,
    handleGenerateSectionAi,
    handleResetSectionToMasterProfile,
    handleToggleSectionVersion,
    handleApplySectionAiProposal,
    handleAddExperience,
    handleMoveExperience,
    getLocalizedCategoryName,
    handleMoveSkillInCategory,
    handleMoveSkillCategory,
    handleAddExperienceBullet,
    handleRemoveExperienceBullet,
    handleAddProject,
    handleMoveProject,
    handleAddProjectBullet,
    handleRemoveProjectBullet,
    handleAddEducation,
    handleMoveEducation,
    handleAddEducationBullet,
    handleRemoveEducationBullet,
    handleOpenSectionDetail,
    handlePolishInlineText,
    handleAddCustomBullet,
    handleRemoveCustomBullet,
    handleBulletKeyDown
  } = useSectionOps({
    masterProfileData,
    targetLanguage,
    sectionAiScope,
    sectionAiPrompt,
    sectionAiProposal,
    focusedBulletInfo,
    setFocusedBulletInfo,
    setSectionAiProposal,
    setIsGeneratingSectionAi,
    setOpenSectionAiModalId,
    setSectionAiPrompt,
    setActiveDetailSectionId,
    setPolishModalInfo
  });

  const handleCreateCustomSection = (title: string, format: CustomSectionFormat) => {
    const newSecId = `custom_${Date.now()}`;
    const newSec: any = {
      id: newSecId,
      name: title,
      visible: true,
      type: 'custom',
      customFormat: format
    };

    if (format === 'keyvalue') {
      newSec.keyValuePairs = [
        { key: 'Category / Key', value: 'Tools, proficiencies, or relevant details' }
      ];
    } else if (format === 'entries') {
      newSec.entries = [
        {
          id: `entry_${Date.now()}`,
          title: `${title} Contributor / Role`,
          subtitle: 'Organization or Project',
          location: 'City, Country',
          date: '2023 - Present',
          bullets: ['Spearheaded key project initiative and delivered measurable performance outcomes.']
        }
      ];
    } else if (format === 'paragraph') {
      newSec.paragraphText = 'Experienced professional committed to delivering high-impact solutions, optimizing system performance, and driving core project objectives.';
    } else {
      newSec.bullets = ['Earned credential / accomplishment with distinguished outcome.'];
    }

    setSections(prev => [...prev, newSec]);
    handleOpenSectionDetail(newSecId);
  };
  // API INTEGRATIONS & SERVICES
  // ----------------------------------------------------

  const handleTailor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription) return;

    setIsLoading(true);
    setCurrentVersion(null);
    setApplicationTracked(false);
    setReviewedActions({});

    try {
      const res = await api.post('/resume/tailor', {
        job_description: jobDescription,
        company,
        position,
        template,
        application_id: initialJobParams?.application_id,
        save_version: true,
        target_language: targetLanguage,
        selected_project_ids: selectedProjectIds,
        aggressive_mode: aggressiveMode
      });
      if (res.data && res.data.success) {
        const ver = res.data.data as ResumeVersion;
        setCurrentVersion(ver);
        initializeVersionFields(ver);
        setApplicationTracked(!!ver.application);
        // On mobile, bring the fresh result into view immediately
        if (isMobileViewport && mobileActivePane === 'editor') {
          setMobileActivePane('preview');
        }
        setEditorTab('resume');
      }
    } catch (err) {
      console.error('Tailoring failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackApplication = async () => {
    if (!currentVersion) return;
    setIsTrackingLoading(true);
    try {
      const appRes = await api.post('/applications', {
        company: currentVersion.target_company,
        position: currentVersion.target_role,
        status: 'preparing',
        job_description: jobDescription
      });
      if (appRes.data && appRes.data.id) {
        const appId = appRes.data.id;
        const patchRes = await api.patch(`/resume/versions/${currentVersion.id}`, {
          application: appId
        });
        if (patchRes.data) {
          setCurrentVersion(prev => prev ? { ...prev, application: appId } : null);
          setApplicationTracked(true);
        }
      }
    } catch (err) {
      console.error('Failed to track application:', err);
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const handleGenerateLetter = async (targetCompany?: string, targetRole?: string) => {
    if (!jobDescription.trim()) {
      setToast({ message: 'Please provide a job description first.', type: 'info' });
      return;
    }
    setIsLetterLoading(true);
    try {
      const activeCvDetails = {
        personal_info: editablePersonalInfo,
        summary: editableSummary,
        work_experiences: editableExperiences,
        projects: editableProjects,
        skills: editableSkills,
        educations: editableEducations
      };

      const res = await api.post('/resume/cover-letter', {
        job_description: jobDescription,
        company: targetCompany || company || currentVersion?.target_company || '',
        position: targetRole || position || currentVersion?.target_role || '',
        tone: letterTone,
        application_id: initialJobParams?.application_id,
        target_language: targetLanguage,
        letter_language: letterLanguage,
        selected_project_ids: selectedProjectIds,
        cv_details: activeCvDetails
      });
      if (res.data && res.data.success) {
        setLetterContent(normalizeLetterDate(res.data.content || res.data.data?.content || ''));
        // On mobile, bring the fresh letter into view immediately
        if (isMobileViewport && mobileActivePane === 'editor') {
          setMobileActivePane('preview');
        }
        setEditorTab('letter');
      }
    } catch (err) {
      console.error('Letter generation failed:', err);
    } finally {
      setIsLetterLoading(false);
    }
  };

  const handleRecheckAtsScore = async () => {
    const targetJd = jobDescription || (position ? `${position} at ${company}` : currentVersion?.target_role || '');
    if (!targetJd) return;

    setIsAtsChecking(true);
    try {
      const activeCvPayload = {
        summary: editableSummary,
        experiences: editableExperiences,
        projects: editableProjects,
        skills: editableSkills,
        educations: editableEducations,
        sections: sections
      };

      const res = await api.post('/resume/ats/score', {
        job_description: targetJd,
        cv_details: activeCvPayload
      });

      if (res.data?.success && res.data?.ats_report) {
        const newReport = res.data.ats_report;
        const parseKws = (kw: any): string[] => {
          if (!kw) return [];
          if (Array.isArray(kw)) return kw.map(k => (typeof k === 'string' ? k : k?.name || '')).filter(Boolean);
          if (typeof kw === 'object') return Object.values(kw).flat().map((k: any) => (typeof k === 'string' ? k : k?.name || '')).filter(Boolean);
          return [];
        };
        const cleanMatched = parseKws(newReport.matched_keywords);
        const cleanMissing = parseKws(newReport.missing_keywords);
        const newDeep: DeepAnalysis | undefined = (newReport as any)?.deep_analysis || undefined;

        setCurrentVersion(prev => prev ? {
          ...prev,
          ats_score: newReport.score ?? prev.ats_score,
          tailored_details: {
            ...prev.tailored_details,
            deep_analysis: newDeep ?? prev.tailored_details.deep_analysis,
            ats_report: {
              ...newReport,
              matched_keywords: cleanMatched,
              missing_keywords: cleanMissing
            }
          }
        } : null);
      }
    } catch (err) {
      console.error('Failed to recheck ATS score:', err);
    } finally {
      setIsAtsChecking(false);
    }
  };

  const handleAction = (id: string, action: 'accepted' | 'rejected') => {
    setReviewedActions(prev => ({ ...prev, [id]: action }));

    if (action === 'rejected') {
      if (id === 'summary') {
        setEditableSummary(currentVersion?.tailored_details.original_profile.personal_info.summary || '');
      } else if (id.includes('-')) {
        const [expId, bulletIdxStr] = id.split('-');
        const bulletIdx = parseInt(bulletIdxStr, 10);
        const origExp = currentVersion?.tailored_details.original_profile.work_experiences.find(x => x.id === expId);
        if (origExp && origExp.bullets[bulletIdx]) {
          setEditableExperiences(prev => prev.map(exp =>
            exp.id === expId ? {
              ...exp,
              bullets: exp.bullets.map((b, idx) => idx === bulletIdx ? origExp.bullets[bulletIdx] : b)
            } : exp
          ));
        }
      } else {
        const origExp = currentVersion?.tailored_details.original_profile.work_experiences.find(x => x.id === id);
        if (origExp) {
          setEditableExperiences(prev => prev.map(exp =>
            exp.id === id ? { ...exp, bullets: origExp.bullets } : exp
          ));
        }
      }
    }
  };

  const handleRephrase = async (blockKey: string, currentText: string) => {
    const promptText = rephrasePrompt[blockKey];
    if (!promptText) return;

    setIsRephrasing(prev => ({ ...prev, [blockKey]: true }));
    try {
      const res = await api.post('/resume/rephrase', {
        text: currentText,
        instruction: promptText
      });
      if (res.data && res.data.success) {
        const rephrased = res.data.rephrased_text;
        if (blockKey === 'summary') {
          setEditableSummary(rephrased);
        } else if (blockKey.includes('-')) {
          const [expId, bulletIdxStr] = blockKey.split('-');
          const bulletIdx = parseInt(bulletIdxStr, 10);
          setEditableExperiences(prev => prev.map(exp =>
            exp.id === expId ? {
              ...exp,
              bullets: exp.bullets.map((b, idx) => idx === bulletIdx ? rephrased : b)
            } : exp
          ));
        }
        setRephrasePrompt(prev => ({ ...prev, [blockKey]: '' }));
      }
    } catch (err) {
      console.error('Rephrasing failed:', err);
    } finally {
      setIsRephrasing(prev => ({ ...prev, [blockKey]: false }));
    }
  };

  const handleSave = async () => {
    if (!currentVersion) return;
    setIsSaving(true);
    try {
      // Persist personal info (including signature) to master profile
      try {
        const infoId = editablePersonalInfo.id || masterProfileInfo?.id;
        if (infoId) {
          await api.put(`/master-profile/personal-info/${infoId}`, editablePersonalInfo);
        } else {
          const infoRes = await api.post('/master-profile/personal-info', editablePersonalInfo);
          if (infoRes.data && infoRes.data.id) {
            setEditablePersonalInfo(prev => ({ ...prev, id: infoRes.data.id }));
            editablePersonalInfo.id = infoRes.data.id;
          }
        }
      } catch (err) {
        console.error("Failed to save personal info to master profile:", err);
      }

      // Always compile and save the updated CV details / customization config (containing signature height)
      const updatedDetails = {
        ...currentVersion.tailored_details,
        skills: editableSkills,
        experiences: editableExperiences.map(e => ({
          id: e.id,
          bullets: e.bullets,
          company: e.company || '',
          position: e.position || '',
          location: e.location || '',
          start_date: e.start_date || '',
          end_date: e.end_date || ''
        })),
        original_profile: {
          ...currentVersion.tailored_details.original_profile,
          personal_info: {
            ...currentVersion.tailored_details.original_profile?.personal_info,
            ...editablePersonalInfo
          },
          work_experiences: editableExperiences.map(e => ({
            id: e.id,
            company: e.company || '',
            position: e.position || '',
            location: e.location || '',
            start_date: e.start_date || '',
            end_date: e.end_date || '',
            bullets: e.bullets
          })),
          skills: editableSkills,
          projects: editableProjects,
          educations: editableEducations
        },
        customization: {
          sections,
          customStyles,
          headerStyles,
          categoryOrder,
          languagesFirst,
          languagesTitle,
          letterStyles,
          dismissed_ats: dismissedAts
        }
      };

      let savedVersion = currentVersion;
      if (currentVersion.id.startsWith('unsaved_')) {
        const res = await api.post('/resume/versions', {
          application: initialJobParams?.application_id || null,
          title: `Resume for ${currentVersion.target_role} at ${currentVersion.target_company}`,
          target_company: currentVersion.target_company,
          target_role: currentVersion.target_role,
          ats_score: currentVersion.ats_score,
          tailored_summary: editableSummary,
          tailored_details: updatedDetails,
          template: template
        });
        if (res.data) {
          savedVersion = res.data;
          setCurrentVersion(res.data);
        }
      } else {
        const res = await api.patch(`/resume/versions/${currentVersion.id}`, {
          tailored_summary: editableSummary,
          tailored_details: updatedDetails,
          template: template
        });
        if (res.data) {
          savedVersion = res.data;
          setCurrentVersion(res.data);
        } else {
          setCurrentVersion(prev => prev ? ({
            ...prev,
            tailored_summary: editableSummary,
            tailored_details: updatedDetails as any,
            template: template
          }) : prev);
        }
      }

      if (letterContent) {
        const targetAppId = initialJobParams?.application_id || savedVersion.application || currentVersion.application;
        const letterRes = await api.get('/resume/letters');
        const matchedLetter = letterRes.data.find((l: any) => (targetAppId && l.application === targetAppId) || l.target_company === savedVersion.target_company);
        if (matchedLetter) {
          await api.patch(`/resume/letters/${matchedLetter.id}`, {
            content: letterContent,
            tone: letterTone
          });
        } else {
          await api.post('/resume/letters', {
            application: targetAppId || null,
            target_company: savedVersion.target_company,
            target_role: savedVersion.target_role,
            content: letterContent,
            tone: letterTone
          });
        }
      }

      if (editorTab === 'letter') {
        setSaveBannerMessage('Cover Letter Saved Successfully!');
      } else {
        setSaveBannerMessage('CV Revision Saved Successfully!');
      }
      setShowSaveBanner(true);
      setTimeout(() => setShowSaveBanner(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportMarkdown = () => {
    if (!currentVersion) return;
    const md = `
# ${editablePersonalInfo.full_name}
${editablePersonalInfo.title} | ${editablePersonalInfo.email} | ${editablePersonalInfo.phone} | ${editablePersonalInfo.location}

## Summary
${editableSummary}

## Experience
${editableExperiences.map(exp => `
### ${exp.position} at ${exp.company} (${exp.location})
${exp.start_date} - ${exp.end_date}
${exp.bullets.map(b => `* ${b}`).join('\n')}
`).join('\n')}

## Skills
${editableSkills.map(s => `* ${s.name} (${s.category})`).join('\n')}
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentVersion.title.replace(/\s+/g, '_')}.md`;
    a.click();
  };

  const getAlertsFor = (section: string) => {
    if (!currentVersion?.validation_alerts) return [];
    return currentVersion.validation_alerts.filter(a => a.section === section);
  };

  const renderSectionMeasuringUnits = (s: any) => {
    const items: React.ReactNode[] = [];
    if (s.type === 'summary') {
      items.push(
        <div key="summary-content" data-measuring-id="summary-content" style={{ width: '100%' }}>
          {renderUnit({ type: 'summary', id: 'summary-content', sectionId: s.id }, true)}
        </div>
      );
    } else if (s.type === 'experience') {
      editableExperiences.forEach((exp, idx) => {
        items.push(
          <div key={`exp-item-${exp.id}`} data-measuring-id={`exp-item-${exp.id}`} style={{ width: '100%' }}>
            {renderUnit({ type: 'experience-item', id: `exp-item-${exp.id}`, sectionId: s.id, itemIndex: idx, itemData: exp }, true)}
          </div>
        );
      });
    } else if (s.type === 'projects') {
      editableProjects.forEach((proj, idx) => {
        items.push(
          <div key={`proj-item-${proj.id}`} data-measuring-id={`proj-item-${proj.id}`} style={{ width: '100%' }}>
            {renderUnit({ type: 'project-item', id: `proj-item-${proj.id}`, sectionId: s.id, itemIndex: idx, itemData: proj }, true)}
          </div>
        );
      });
    } else if (s.type === 'education') {
      editableEducations.forEach((edu, idx) => {
        items.push(
          <div key={`edu-item-${edu.id}`} data-measuring-id={`edu-item-${edu.id}`} style={{ width: '100%' }}>
            {renderUnit({ type: 'education-item', id: `edu-item-${edu.id}`, sectionId: s.id, itemIndex: idx, itemData: edu }, true)}
          </div>
        );
      });
    } else if (s.type === 'custom') {
      items.push(
        <div key={`custom-content-${s.id}`} data-measuring-id={`custom-content-${s.id}`} style={{ width: '100%' }}>
          {renderUnit({ type: 'custom-content', id: `custom-content-${s.id}`, sectionId: s.id, bullets: s.bullets || [] }, true)}
        </div>
      );
    }
    return <React.Fragment key={s.id}>{items}</React.Fragment>;
  };

  const renderSkillsMeasuringUnits = (s: any) => {
    const items: React.ReactNode[] = [];
    const langSkills = editableSkills.filter(sk => (sk.category || '').toLowerCase().trim() === 'languages');
    const itSkills = editableSkills.filter(sk => (sk.category || '').toLowerCase().trim() !== 'languages');
    const uniqueCats = Array.from(new Set(itSkills.map(sk => (sk.category || 'technical').toLowerCase().trim())));

    const normalizedOrder = categoryOrder.map(c => c.toLowerCase().trim());
    const itCategories = normalizedOrder.filter(c => uniqueCats.includes(c));
    const extraCats = uniqueCats.filter(c => !itCategories.includes(c));
    const finalCategories = [...itCategories, ...extraCats];

    if (categoryOrder.length === 0) {
      finalCategories.sort((a, b) => {
        const getCategoryOrderScore = (cat: string) => {
          const order = [
            'programming languages',
            'frameworks & libraries',
            'databases',
            'cloud & devops',
            'development tools',
            'testing'
          ];
          const idx = order.indexOf(cat.toLowerCase().trim());
          if (idx !== -1) return idx;
          if (cat.toLowerCase().trim() === 'languages') return 999;
          return 100;
        };
        return getCategoryOrderScore(a) - getCategoryOrderScore(b);
      });
    }

    const pushLang = () => {
      if (langSkills.length > 0) {
        items.push(
          <div key="skills-languages" data-measuring-id="skills-languages" style={{ width: '100%' }}>
            {renderUnit({ type: 'skills-languages', id: 'skills-languages', sectionId: s.id, skills: langSkills }, true)}
          </div>
        );
      }
    };

    const pushIT = () => {
      finalCategories.forEach(cat => {
        const catSkills = itSkills.filter(sk => (sk.category || 'technical').toLowerCase().trim() === cat);
        if (catSkills.length > 0) {
          items.push(
            <div key={`skills-category-${cat}`} data-measuring-id={`skills-category-${cat}`} style={{ width: '100%' }}>
              {renderUnit({ type: 'skills-category', id: `skills-category-${cat}`, sectionId: s.id, category: cat, skills: catSkills }, true)}
            </div>
          );
        }
      });
    };

    if (languagesFirst) {
      pushLang();
      pushIT();
    } else {
      pushIT();
      pushLang();
    }
    return <React.Fragment key={s.id}>{items}</React.Fragment>;
  };

  // On-Canvas Settings Popover for Header
  const renderHeaderSettingsPopover = () => {
    return (
      <HeaderSettingsPopover
        popoverPosition={popoverPosition}
        headerStyles={headerStyles}
        setHeaderStyles={setHeaderStyles}
        onClose={() => setActiveSectionSettings(null)}
        editablePersonalInfo={editablePersonalInfo}
        setEditablePersonalInfo={setEditablePersonalInfo}
      />
    );
  };

  // On-Canvas Settings Popover for Sections
  const renderSectionSettingsPopover = (sectionId: string, sec: any) => {
    return (
      <SectionSettingsPopover
        sectionId={sectionId}
        sec={sec}
        popoverPosition={popoverPosition}
        setSections={setSections}
        onClose={() => setActiveSectionSettings(null)}
        setEditableExperiences={setEditableExperiences}
        setEditableProjects={setEditableProjects}
        setEditableEducations={setEditableEducations}
      />
    );
  };

  // ----------------------------------------------------
  // UNIT RENDERING & TEMPLATES MATRIX
  // ----------------------------------------------------

  const renderUnit = (unit: RenderableUnit, isMeasuring: boolean = false) => {
    return (
      <UnitRenderer
        unit={unit}
        isMeasuring={isMeasuring}
        template={template}
        sections={sections}
        customStyles={customStyles}
        headerStyles={headerStyles}
        editablePersonalInfo={editablePersonalInfo}
        setEditablePersonalInfo={setEditablePersonalInfo}
        editableExperiences={editableExperiences}
        setEditableExperiences={setEditableExperiences}
        editableProjects={editableProjects}
        setEditableProjects={setEditableProjects}
        editableEducations={editableEducations}
        setEditableEducations={setEditableEducations}
        editableSkills={editableSkills}
        setEditableSkills={setEditableSkills}
        editableSummary={editableSummary}
        setEditableSummary={setEditableSummary}
        activeSectionSettings={activeSectionSettings}
        setActiveSectionSettings={setActiveSectionSettings}
        popoverPosition={popoverPosition}
        setPopoverPosition={setPopoverPosition}
        setHeaderStyles={setHeaderStyles}
        setSections={setSections}
        editingSectionTitleId={editingSectionTitleId}
        setEditingSectionTitleId={setEditingSectionTitleId}
        editingLanguagesId={editingLanguagesId}
        setEditingLanguagesId={setEditingLanguagesId}
        hoveredSectionId={hoveredSectionId}
        setHoveredSectionId={setHoveredSectionId}
        handleMoveSection={handleMoveSection}
        handleQuickAddSectionItem={handleQuickAddSectionItem}
        setOpenSectionAiModalId={setOpenSectionAiModalId}
        handleMouseEnterSuggestion={handleMouseEnterSuggestion}
        handleMouseLeaveSuggestion={handleMouseLeaveSuggestion}
        reviewedActions={reviewedActions}
        renderHoverAiControls={renderHoverAiControls}
        isRephrasing={isRephrasing}
        handleMoveExperience={handleMoveExperience}
        handleAddExperienceBullet={handleAddExperienceBullet}
        handleRemoveExperienceBullet={handleRemoveExperienceBullet}
        handleBulletKeyDown={handleBulletKeyDown}
        handleMoveProject={handleMoveProject}
        handleAddProjectBullet={handleAddProjectBullet}
        handleRemoveProjectBullet={handleRemoveProjectBullet}
        handleMoveEducation={handleMoveEducation}
        handleAddEducationBullet={handleAddEducationBullet}
        handleRemoveEducationBullet={handleRemoveEducationBullet}
        languagesFirst={languagesFirst}
        setLanguagesFirst={setLanguagesFirst}
        languagesTitle={languagesTitle}
        setLanguagesTitle={setLanguagesTitle}
        targetLanguage={targetLanguage}
        categoryOrder={categoryOrder}
        handleMoveSkillCategory={handleMoveSkillCategory}
        getLocalizedCategoryName={getLocalizedCategoryName}
        getAlertsFor={getAlertsFor}
        toggleSectionVisibility={toggleSectionVisibility}
        onResetToMasterProfile={handleResetSectionToMasterProfile}
      />
    );
  };

  const handleMouseEnterSuggestion = (id: string) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredSuggestion(id);
  };

  const handleMouseLeaveSuggestion = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoveredSuggestion(null);
    }, 250);
  };

  return (
    <div className={styles.container}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {/* Dynamic print page styling to force correct browser paper size */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: 210mm 297mm !important;
            margin: 0 !important;
          }
        }
      `}} />
      <div className={`${styles.headerRow} no-print`}>
        <div>
          <h2 className={styles.title}>Premium CV Rebuilder</h2>
          <p className={styles.subtitle}>Audit ATS match scores, approve real-time tailored variations and edit canvas inline.</p>
        </div>
      </div>

      {showSaveBanner && (
        <div className={styles.saveBanner}>
          <Check size={16} />
          <span>{saveBannerMessage}</span>
        </div>
      )}

      <div className={`${styles.workspace} ${isMobileViewport ? styles.workspaceMobile : ''}`}>
        {/* Sidebar Controls Area */}
        <div
          ref={controlPanelRef}
          className={`${styles.controlPanel} no-print ${isMobileViewport && mobileActivePane !== 'editor' ? styles.paneHiddenMobile : ''}`}
          style={{
            width: isMobileViewport ? '100%' : `${effectivePanelWidth}px`,
            minWidth: isMobileViewport ? '0' : `${effectivePanelWidth}px`,
            transition: isResizingPanel ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {!isMobileViewport && (
            <div
              className={`${styles.resizerHandle} ${isResizingPanel ? styles.resizerHandleActive : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                startXRef.current = e.clientX;
                startWidthRef.current = panelWidth;
                setIsResizingPanel(true);
              }}
              title="Click and drag to adjust control panel width"
            />
          )}
          <div className={styles.controlPanelTabs}>
            <button
              type="button"
              className={`${styles.controlTabBtn} ${activeControlTab === 'tailor' ? styles.activeControlTab : ''}`}
              onClick={() => setActiveControlTab('tailor')}
            >
              AI Tailoring
            </button>
            <button
              type="button"
              className={`${styles.controlTabBtn} ${activeControlTab === 'ats' ? styles.activeControlTab : ''}`}
              onClick={() => setActiveControlTab('ats')}
            >
              ATS Optimization
            </button>
            <button
              type="button"
              className={`${styles.controlTabBtn} ${activeControlTab === 'style' ? styles.activeControlTab : ''}`}
              onClick={() => setActiveControlTab('style')}
            >
              Design & Layout
            </button>
          </div>


          {activeControlTab === 'tailor' && (
            <TailorPanel
              editorTabIsResume={editorTab === 'resume'}
              company={company}
              setCompany={setCompany}
              position={position}
              setPosition={setPosition}
              jobDescription={jobDescription}
              setJobDescription={setJobDescription}
              template={template}
              setTemplate={setTemplate}
              targetLanguage={targetLanguage}
              setTargetLanguage={setTargetLanguage}
              aggressiveMode={aggressiveMode}
              setAggressiveMode={setAggressiveMode}
              masterProjects={masterProjects}
              selectedProjectIds={selectedProjectIds}
              setSelectedProjectIds={setSelectedProjectIds}
              isProjectsCollapsed={isProjectsCollapsed}
              setIsProjectsCollapsed={setIsProjectsCollapsed}
              masterProfileInfo={masterProfileInfo}
              editablePersonalInfo={editablePersonalInfo}
              currentVersion={currentVersion}
              saveAutomatically={saveAutomatically}
              setSaveAutomatically={setSaveAutomatically}
              isLoading={isLoading}
              applicationTracked={applicationTracked}
              isTrackingLoading={isTrackingLoading}
              onTailor={handleTailor}
              onTrackApplication={handleTrackApplication}
              letterTone={letterTone}
              setLetterTone={setLetterTone}
              letterLanguage={letterLanguage}
              setLetterLanguage={(v) => setLetterLanguage(v as any)}
              isLetterLoading={isLetterLoading}
              letterContent={letterContent}
              onGenerateLetter={handleGenerateLetter}
            />
          )}

          {activeControlTab === 'ats' && (
            <ATSDashboard
              report={liveAtsReport}
              onRefreshScore={handleRecheckAtsScore}
              onInjectSkill={handleInjectSkill}
              onRemoveSkill={handleRemoveSkill}
              existingCategories={Array.from(new Set(editableSkills.map(s => (s.category || 'technical').toLowerCase().trim())))}
              deepAnalysis={deepAnalysis}
              checklist={atsChecklist}
              dismissedIds={dismissedAts}
              onDismiss={handleDismissAtsItem}
              onApplyBulletFix={handleApplyBulletFix}
              onExportReport={handleExportAtsReport}
              isRefreshing={isAtsChecking}
              coverage={atsCoverage}
              recommendedKeywords={recommendedKeywords}
              weakBullets={weakBullets}
              jobDescription={jobDescription || ''}
              beforeAfter={beforeAfter}
            />
          )}

          {activeControlTab === 'style' && (
            // Design and Typography Customizers
            editorTab === 'resume' ? (
              // CV Design & Layout Options

            <StyleControlsPanel
              activeStyleSubTab={activeStyleSubTab}
              setActiveStyleSubTab={setActiveStyleSubTab}
              activeDetailSectionId={activeDetailSectionId}
              targetLanguage={targetLanguage}
              animatingHideSectionId={animatingHideSectionId}
              onOpenSectionDetail={handleOpenSectionDetail}
              onCloseSectionDetail={() => setActiveDetailSectionId(null)}
              onAddExperience={handleAddExperience}
              onAddProject={handleAddProject}
              onAddEducation={handleAddEducation}
              onMoveSkillCategory={handleMoveSkillCategory}
              getLocalizedCategoryName={getLocalizedCategoryName}
              onPolishBullet={handlePolishInlineText}
              onToggleSectionVersion={handleToggleSectionVersion}
              onResetToMasterProfile={handleResetSectionToMasterProfile}
              toggleSectionVisibility={toggleSectionVisibility}
              onOpenAiModal={setOpenSectionAiModalId}
              onOpenAddCustomSection={() => setIsAddCustomSectionOpen(true)}
            />
            ) : (
              // Cover Letter Design Options
              <div className={`${styles.styleControlsForm} glass-card`}>
                <h3>Cover Letter Generator</h3>
                <p style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '12px', lineHeight: '1.4' }}>
                  Generate a cover letter based on your active tailored/edited CV canvas content and job description.
                </p>

                <Button
                  type="button"
                  onClick={() => handleGenerateLetter(company, position)}
                  isLoading={isLetterLoading}
                  style={{
                    width: '100%',
                    marginBottom: '16px',
                    background: 'var(--primary, #4f46e5)',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Sparkles size={16} />
                  <span>{letterContent ? 'Regenerate Cover Letter' : 'Generate Cover Letter from Tailored CV'}</span>
                </Button>

                <h3>Cover Letter Style</h3>

                <div className={styles.slidersTwinGrid}>
                  <div className={styles.sliderGroup}>
                    <label>Base Font Size: <strong>{letterStyles.fontSize}px</strong></label>
                    <input
                      type="range"
                      min="11"
                      max="18"
                      value={letterStyles.fontSize}
                      onChange={(e) => setLetterStyles(s => ({ ...s, fontSize: parseInt(e.target.value) }))}
                    />
                  </div>

                  <div className={styles.sliderGroup}>
                    <label>Line Height: <strong>{letterStyles.lineHeight}</strong></label>
                    <input
                      type="range"
                      min="1.2"
                      max="2.2"
                      step="0.1"
                      value={letterStyles.lineHeight}
                      onChange={(e) => setLetterStyles(s => ({ ...s, lineHeight: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className={styles.slidersTwinGrid}>
                  <div className={styles.sliderGroup}>
                    <label>Paper Standard: <strong>DIN A4</strong></label>
                    <div
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--card-border, #cbd5e1)',
                        background: 'rgba(99, 102, 241, 0.05)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--primary, #4f46e5)',
                        boxSizing: 'border-box'
                      }}
                    >
                      A4 (210mm × 297mm)
                    </div>
                  </div>

                  <div className={styles.sliderGroup}>
                    <label htmlFor="coverLetterFontFamily">Font Family</label>
                    <select
                      id="coverLetterFontFamily"
                      value={letterStyles.fontFamily || ''}
                      onChange={(e) => setLetterStyles(s => ({ ...s, fontFamily: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid var(--card-border, #cbd5e1)',
                        background: '#ffffff',
                        fontSize: '12.5px',
                        color: '#1e293b',
                        outline: 'none',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                        height: '35px'
                      }}
                    >
                      <option value="">Template Default</option>
                      <option value="'Aptos', 'Calibri', sans-serif">Aptos</option>
                      <option value="'Inter', sans-serif">Inter</option>
                      <option value="'Calibri', 'Segoe UI', sans-serif">Calibri</option>
                      <option value="'Helvetica Neue', 'Helvetica', 'Arial', sans-serif">Helvetica</option>
                      <option value="'Source Sans 3', 'Source Sans Pro', sans-serif">Source Sans 3</option>
                      <option value="'IBM Plex Sans', sans-serif">IBM Plex Sans</option>
                      <option value="'Arial', sans-serif">Arial</option>
                    </select>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '16px', paddingTop: '16px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    ✍️ Signature Settings
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                      <input
                        type="checkbox"
                        checked={showSignature}
                        onChange={(e) => setShowSignature(e.target.checked)}
                      />
                      Show Signature on Cover Letter
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Signature Image:</span>
                      {editablePersonalInfo.signature_image ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div
                            style={{
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '16px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px), radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
                              backgroundSize: '12px 12px',
                              backgroundPosition: '0 0, 6px 6px',
                              minHeight: '60px',
                              width: '100%',
                              boxSizing: 'border-box'
                            }}
                          >
                            <img
                              src={editablePersonalInfo.signature_image}
                              alt="Signature Preview"
                              style={{ maxHeight: '44px', maxWidth: '100%', objectFit: 'contain' }}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              const updatedInfo = { ...editablePersonalInfo, signature_image: '' };
                              setEditablePersonalInfo(updatedInfo);
                              liveSignatureRef.current = '';
                              try {
                                if (updatedInfo.id) {
                                  await api.put(`/master-profile/personal-info/${updatedInfo.id}`, updatedInfo);
                                } else {
                                  const res = await api.post('/master-profile/personal-info', updatedInfo);
                                  if (res.data && res.data.id) {
                                    setEditablePersonalInfo(prev => ({ ...prev, id: res.data.id }));
                                  }
                                }
                              } catch (e) {
                                console.error("Failed to delete signature:", e);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              width: '100%',
                              padding: '8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#ef4444',
                              backgroundColor: '#fef2f2',
                              border: '1px solid #fee2e2',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#fee2e2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#fef2f2';
                            }}
                          >
                            <X size={12} />
                            Remove Signature
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            type="file"
                            accept="image/*"
                            id="sigUploadInputSidebar"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (readerEvent) => {
                                  const img = new Image();
                                  img.onload = async () => {
                                    const canvas = document.createElement('canvas');
                                    canvas.width = img.naturalWidth;
                                    canvas.height = img.naturalHeight;
                                    const ctx = canvas.getContext('2d');
                                    if (ctx) {
                                      ctx.drawImage(img, 0, 0);
                                      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                      const data = imgData.data;
                                      for (let i = 0; i < data.length; i += 4) {
                                        const r = data[i];
                                        const g = data[i + 1];
                                        const b = data[i + 2];
                                        if (r > 200 && g > 200 && b > 200) {
                                          data[i + 3] = 0;
                                        }
                                      }
                                      ctx.putImageData(imgData, 0, 0);
                                      const base64 = canvas.toDataURL('image/png');
                                      const updatedInfo = { ...editablePersonalInfo, signature_image: base64 };
                                      setEditablePersonalInfo(updatedInfo);
                                      liveSignatureRef.current = base64;
                                      try {
                                        if (updatedInfo.id) {
                                          await api.put(`/master-profile/personal-info/${updatedInfo.id}`, updatedInfo);
                                        } else {
                                          const res = await api.post('/master-profile/personal-info', updatedInfo);
                                          if (res.data && res.data.id) {
                                            setEditablePersonalInfo(prev => ({ ...prev, id: res.data.id }));
                                          }
                                        }
                                      } catch (err) {
                                        console.error("Failed to save signature:", err);
                                      }
                                    }
                                  };
                                  img.src = readerEvent.target?.result as string;
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <div
                            onClick={() => document.getElementById('sigUploadInputSidebar')?.click()}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsSigDragOver(true);
                            }}
                            onDragLeave={() => {
                              setIsSigDragOver(false);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsSigDragOver(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (readerEvent) => {
                                  const img = new Image();
                                  img.onload = async () => {
                                    const canvas = document.createElement('canvas');
                                    canvas.width = img.naturalWidth;
                                    canvas.height = img.naturalHeight;
                                    const ctx = canvas.getContext('2d');
                                    if (ctx) {
                                      ctx.drawImage(img, 0, 0);
                                      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                      const data = imgData.data;
                                      for (let i = 0; i < data.length; i += 4) {
                                        const r = data[i];
                                        const g = data[i + 1];
                                        const b = data[i + 2];
                                        if (r > 200 && g > 200 && b > 200) {
                                          data[i + 3] = 0;
                                        }
                                      }
                                      ctx.putImageData(imgData, 0, 0);
                                      const base64 = canvas.toDataURL('image/png');
                                      const updatedInfo = { ...editablePersonalInfo, signature_image: base64 };
                                      setEditablePersonalInfo(updatedInfo);
                                      liveSignatureRef.current = base64;
                                      try {
                                        if (updatedInfo.id) {
                                          await api.put(`/master-profile/personal-info/${updatedInfo.id}`, updatedInfo);
                                        } else {
                                          const res = await api.post('/master-profile/personal-info', updatedInfo);
                                          if (res.data && res.data.id) {
                                            setEditablePersonalInfo(prev => ({ ...prev, id: res.data.id }));
                                          }
                                        }
                                      } catch (err) {
                                        console.error("Failed to save signature:", err);
                                      }
                                    }
                                  };
                                  img.src = readerEvent.target?.result as string;
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '16px',
                              borderRadius: '8px',
                              border: isSigDragOver ? '1.5px dashed #6366f1' : '1.5px dashed #cbd5e1',
                              backgroundColor: isSigDragOver ? '#e0e7ff33' : '#f8fafc',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#6366f1';
                              e.currentTarget.style.backgroundColor = '#e0e7ff33';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSigDragOver) {
                                e.currentTarget.style.borderColor = '#cbd5e1';
                                e.currentTarget.style.backgroundColor = '#f8fafc';
                              }
                            }}
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '6px' }}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#4f46e5' }}>Upload Signature</span>
                            <span style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Drag image or click here. Transparent output.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>


              </div>
            )
          )}




        </div>

        {/* Right Preview Area */}
        <div className={styles.previewCanvas}>
          {isLoading ? (
            <div className={styles.skeletonContainer}>
              <div className={styles.skeletonLoaderBanner} style={{ width: `${794 * scale}px` }}>
                <RefreshCw className={styles.skeletonSpinner} size={16} />
                <span>AI is compiling keywords and tailoring resume cards...</span>
              </div>
              <div
                className={styles.skeletonPaperWrapper}
                style={{
                  width: `${794 * scale}px`,
                  height: `${1123 * scale}px`,
                  position: 'relative'
                }}
              >
                <div
                  className={styles.skeletonPaper}
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '794px',
                    height: '1123px',
                    padding: '48px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                  }}
                >
                  {/* Pixel Perfect Header structure */}
                  <div className={styles.ppHeader} style={{ marginBottom: '24px', borderBottom: 'none', display: 'flex', justifyContent: 'space-between' }}>
                    <div className={styles.ppHeaderLeft} style={{ flex: 1 }}>
                      {/* Name Skeleton */}
                      <div className={styles.skeletonLineLarge} style={{ height: '26px', width: '220px', marginBottom: '8px' }} />
                      {/* Title Skeleton */}
                      <div className={styles.skeletonLineMedium} style={{ height: '14px', width: '130px', marginBottom: '16px' }} />
                      {/* Contacts Skeleton matching grid columns */}
                      <div className={styles.ppContactGrid} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                        <div className={styles.ppContactCol} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div className={styles.ppContactItem} style={{ display: 'flex', alignItems: 'center' }}>
                            <span className={styles.ppContactLabel} style={{ width: '40px', height: '10px', display: 'inline-block', backgroundColor: '#e2e8f0', borderRadius: '2px', animation: 'pulse 1.5s infinite', marginRight: '4px' }}></span>
                            <span className={styles.skeletonLineSmall} style={{ height: '10px', width: '100px' }} />
                          </div>
                          <div className={styles.ppContactItem} style={{ display: 'flex', alignItems: 'center' }}>
                            <span className={styles.ppContactLabel} style={{ width: '35px', height: '10px', display: 'inline-block', backgroundColor: '#e2e8f0', borderRadius: '2px', animation: 'pulse 1.5s infinite', marginRight: '4px' }}></span>
                            <span className={styles.skeletonLineSmall} style={{ height: '10px', width: '110px' }} />
                          </div>
                        </div>
                        <div className={styles.ppContactCol} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div className={styles.ppContactItem} style={{ display: 'flex', alignItems: 'center' }}>
                            <span className={styles.ppContactLabel} style={{ width: '40px', height: '10px', display: 'inline-block', backgroundColor: '#e2e8f0', borderRadius: '2px', animation: 'pulse 1.5s infinite', marginRight: '4px' }}></span>
                            <span className={styles.skeletonLineSmall} style={{ height: '10px', width: '90px' }} />
                          </div>
                          <div className={styles.ppContactItem} style={{ display: 'flex', alignItems: 'center' }}>
                            <span className={styles.ppContactLabel} style={{ width: '45px', height: '10px', display: 'inline-block', backgroundColor: '#e2e8f0', borderRadius: '2px', animation: 'pulse 1.5s infinite', marginRight: '4px' }}></span>
                            <span className={styles.skeletonLineSmall} style={{ height: '10px', width: '120px' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.ppHeaderRight} style={{ flexShrink: 0, marginLeft: '24px' }}>
                      {/* Avatar Skeleton */}
                      <div className={styles.skeletonAvatar} style={{ width: '90px', height: '110px', borderRadius: '4px' }} />
                    </div>
                  </div>

                  {/* Summary Section */}
                  <div className={styles.ppSection} style={{ paddingBottom: '20px' }}>
                    <div className={styles.ppSectionTitle} style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1px solid #1e293b', paddingBottom: '3px', marginBottom: '12px', width: '110px', height: '14px', backgroundColor: '#cbd5e1', borderRadius: '2px', animation: 'pulse 1.5s infinite' }} />
                    <div className={styles.skeletonParagraph}>
                      <div className={styles.skeletonLineFull} />
                      <div className={styles.skeletonLineFull} />
                      <div className={styles.skeletonLineTwoThirds} />
                    </div>
                  </div>

                  {/* Experience Section */}
                  <div className={styles.ppSection} style={{ paddingBottom: '20px' }}>
                    <div className={styles.ppSectionTitle} style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1px solid #1e293b', paddingBottom: '3px', marginBottom: '12px', width: '160px', height: '14px', backgroundColor: '#cbd5e1', borderRadius: '2px', animation: 'pulse 1.5s infinite' }} />

                    {/* Item 1 */}
                    <div className={styles.ppSectionRow} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '16px', paddingBottom: '12px' }}>
                      <div className={styles.ppLeftCol}>
                        <div className={styles.skeletonLineMedium} style={{ height: '12px', width: '90px' }} />
                      </div>
                      <div className={styles.ppRightCol}>
                        <div className={styles.skeletonLineLarge} style={{ height: '14px', width: '220px', marginBottom: '6px' }} />
                        <div className={styles.skeletonLineSmall} style={{ height: '10px', width: '120px', marginBottom: '8px' }} />
                        <div className={styles.skeletonParagraph}>
                          <div className={styles.skeletonLineFull} style={{ height: '8px', marginBottom: '4px' }} />
                          <div className={styles.skeletonLineFull} style={{ height: '8px', marginBottom: '4px' }} />
                          <div className={styles.skeletonLineTwoThirds} style={{ height: '8px' }} />
                        </div>
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className={styles.ppSectionRow} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '16px' }}>
                      <div className={styles.ppLeftCol}>
                        <div className={styles.skeletonLineMedium} style={{ height: '12px', width: '80px' }} />
                      </div>
                      <div className={styles.ppRightCol}>
                        <div className={styles.skeletonLineLarge} style={{ height: '14px', width: '180px', marginBottom: '6px' }} />
                        <div className={styles.skeletonLineSmall} style={{ height: '10px', width: '90px', marginBottom: '8px' }} />
                        <div className={styles.skeletonParagraph}>
                          <div className={styles.skeletonLineFull} style={{ height: '8px', marginBottom: '4px' }} />
                          <div className={styles.skeletonLineTwoThirds} style={{ height: '8px' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div className={styles.ppSection} style={{ paddingBottom: '20px' }}>
                    <div className={styles.ppSectionTitle} style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1px solid #1e293b', paddingBottom: '3px', marginBottom: '12px', width: '90px', height: '14px', backgroundColor: '#cbd5e1', borderRadius: '2px', animation: 'pulse 1.5s infinite' }} />
                    <div className={styles.ppSectionRow} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '16px' }}>
                      <div className={styles.ppLeftCol}>
                        <div className={styles.skeletonLineMedium} style={{ height: '12px', width: '100px' }} />
                      </div>
                      <div className={styles.ppRightCol}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          <div className={styles.skeletonLineSmall} style={{ height: '22px', width: '80px', borderRadius: '4px' }} />
                          <div className={styles.skeletonLineSmall} style={{ height: '22px', width: '65px', borderRadius: '4px' }} />
                          <div className={styles.skeletonLineSmall} style={{ height: '22px', width: '90px', borderRadius: '4px' }} />
                          <div className={styles.skeletonLineSmall} style={{ height: '22px', width: '70px', borderRadius: '4px' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          ) : currentVersion ? (
            <div className={`${styles.previewContainer} ${isMobileViewport && mobileActivePane !== 'preview' ? styles.paneHiddenMobile : ''}`}>
              <div className={`${styles.tabHeader} no-print`}>
                <div className={styles.canvasTabs}>
                  <button
                    className={`${styles.canvasTabBtn} ${editorTab === 'resume' ? styles.activeCanvasTab : ''}`}
                    onClick={() => updateTabHash('resume')}
                  >
                    Tailored Resume
                  </button>
                  <button
                    className={`${styles.canvasTabBtn} ${editorTab === 'letter' ? styles.activeCanvasTab : ''}`}
                    onClick={() => updateTabHash('letter')}
                  >
                    Cover Letter
                  </button>
                </div>

                <div className={styles.exportActions} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Button variant="secondary" onClick={handleSave} isLoading={isSaving}>
                    <Save size={16} />
                    <span>{currentVersion.id.startsWith('unsaved_') ? 'Save as New Version' : 'Save Changes'}</span>
                  </Button>
                  <div style={{ position: 'relative' }}>
                    <Button variant="secondary" onClick={() => setIsDownloadOpen(!isDownloadOpen)}>
                      <Download size={16} />
                      <span>Download</span>
                    </Button>
                    {isDownloadOpen && (
                      <div className={styles.downloadDropdown}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDownloadOpen(false);
                            handlePrint();
                          }}
                          className={styles.dropdownItem}
                        >
                          <Printer size={14} />
                          <span>Print / PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDownloadOpen(false);
                            exportMarkdown();
                          }}
                          className={styles.dropdownItem}
                        >
                          <FileText size={14} />
                          <span>Markdown</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Multi-page warning banner */}
              {editorTab === 'resume' && pages.length > 1 && (
                <div className={`${styles.pageWarningBanner} no-print`}>
                  <ShieldAlert size={16} />
                  <span>
                    <strong>Layout Notice:</strong> Your CV occupies {pages.length} pages. Fit your details on fewer pages if possible to keep it compact.
                  </span>
                </div>
              )}

              {/* Hidden off-screen unscaled layout for DOM measurements */}
              {editorTab === 'resume' && (
                <MeasuringContext.Provider value={true}>
                  <div
                    ref={hiddenCanvasRef}
                    className={`${styles.pageContainer} ${styles[templateClassMap[template] || template] || ''} no-print`}
                    style={{
                      position: 'absolute',
                      left: '-9999px',
                      top: 0,
                      width: '210mm',
                      height: 'auto',
                      visibility: 'hidden',
                      pointerEvents: 'none',
                      boxSizing: 'border-box',
                      padding: `${customStyles.pageMargin || 48}px`,
                      fontSize: `${customStyles.fontSize}px`,
                      lineHeight: customStyles.lineHeight,
                      '--base-font-size': `${customStyles.fontSize}px`,
                      '--heading-size-mult': customStyles.headingSize,
                      '--line-height-mult': customStyles.lineHeight,
                      '--section-spacing': `${customStyles.sectionSpacing}px`,
                      '--bullet-spacing': `${customStyles.bulletSpacing || 4}px`,
                      '--accent-color': customStyles.accentColor,
                      '--text-color': customStyles.textColor,
                      '--text-alignment': customStyles.alignment,
                      '--font-override': customStyles.fontFamily || undefined
                    } as React.CSSProperties}
                  >
                    {template === 'creative_tech' ? (
                      <>
                        <div data-measuring-id="header" style={{ width: '100%' }}>
                          {renderUnit({ type: 'header', id: 'header' }, true)}
                        </div>
                        <div className={styles.gridContainer}>
                          <div className={styles.sidebarColumn}>
                            <div data-measuring-id="contacts-static" style={{ width: '100%' }}>
                              {renderUnit({ type: 'contacts-static', id: 'contacts-static' }, true)}
                            </div>
                            {sections.filter(s => s.id === 'skills').map(s => {
                              if (!s.visible) return null;
                              return (
                                <React.Fragment key={s.id}>
                                  <div data-measuring-id={`title-${s.id}`} style={{ width: '100%' }}>
                                    {renderUnit({ type: 'section-title', id: `title-${s.id}`, sectionId: s.id, titleText: s.name }, true)}
                                  </div>
                                  {renderSkillsMeasuringUnits(s)}
                                </React.Fragment>
                              );
                            })}
                          </div>
                          <div className={styles.mainColumn}>
                            {sections.filter(s => s.id !== 'skills').map(s => {
                              if (!s.visible) return null;
                              return (
                                <React.Fragment key={s.id}>
                                  <div data-measuring-id={`title-${s.id}`} style={{ width: '100%' }}>
                                    {renderUnit({ type: 'section-title', id: `title-${s.id}`, sectionId: s.id, titleText: s.name }, true)}
                                  </div>
                                  {renderSectionMeasuringUnits(s)}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div data-measuring-id="header" style={{ width: '100%' }}>
                          {renderUnit({ type: 'header', id: 'header' }, true)}
                        </div>
                        {sections.map(s => {
                          if (!s.visible) return null;
                          return (
                            <React.Fragment key={s.id}>
                              <div data-measuring-id={`title-${s.id}`} style={{ width: '100%' }}>
                                {renderUnit({ type: 'section-title', id: `title-${s.id}`, sectionId: s.id, titleText: s.name }, true)}
                              </div>
                              {s.id === 'skills' ? renderSkillsMeasuringUnits(s) : renderSectionMeasuringUnits(s)}
                            </React.Fragment>
                          );
                        })}
                      </>
                    )}
                  </div>
                </MeasuringContext.Provider>
              )}

              {/* Viewport render canvas mapping pages array */}
              {editorTab === 'resume' && (
                <MeasuringContext.Provider value={false}>
                  <div ref={viewportRef} className={styles.canvasViewport}>
                    <div
                      className={styles.pagesScaledWrapper}
                      ref={scaledWrapperRef}
                      style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px',
                        width: '210mm',
                        marginBottom: `-${wrapperHeightCompensation}px`
                      }}
                    >
                      {pages.map((pageUnits, pageIdx) => {
                        const pageMargin = customStyles.pageMargin || 48;
                        const isCreative = template === 'creative_tech';

                        // Content inside this page
                        const headerUnit = pageUnits.find(u => u.type === 'header');
                        const sidebarUnits = pageUnits.filter(u => isCreative && (u.sectionId === 'skills' || u.type === 'contacts-static'));
                        const mainUnits = pageUnits.filter(u => !headerUnit && (!isCreative || (u.sectionId !== 'skills' && u.type !== 'contacts-static')));

                        return (
                          <React.Fragment key={pageIdx}>
                            {pageIdx > 0 && <div className={`${styles.pageBreakLine} no-print`}>PAGE {pageIdx + 1}</div>}
                            <div
                              className={`${styles.pageContainer} ${styles[templateClassMap[template] || template] || ''}`}
                              style={{
                                width: '210mm',
                                height: '297mm',
                                '--print-page-width': '210mm',
                                '--print-page-height': '297mm',
                                '--print-page-margin': `${pageMargin}px`,
                                padding: `${pageMargin}px`,
                                boxSizing: 'border-box',
                                fontSize: `${customStyles.fontSize}px`,
                                lineHeight: customStyles.lineHeight,
                                '--base-font-size': `${customStyles.fontSize}px`,
                                '--heading-size-mult': customStyles.headingSize,
                                '--line-height-mult': customStyles.lineHeight,
                                '--section-spacing': `${customStyles.sectionSpacing}px`,
                                '--bullet-spacing': `${customStyles.bulletSpacing || 4}px`,
                                '--accent-color': customStyles.accentColor,
                                '--text-color': customStyles.textColor,
                                '--text-alignment': customStyles.alignment,
                                '--font-override': customStyles.fontFamily || undefined
                              } as React.CSSProperties}
                            >
                              {/* Standard single column or split grid column templates */}
                              {isCreative ? (
                                <>
                                  {headerUnit && (
                                    <div className={styles.unitTransitionWrapper}>
                                      {renderUnit(headerUnit)}
                                    </div>
                                  )}
                                  <div className={styles.gridContainer}>
                                    <div className={styles.sidebarColumn}>
                                      {sidebarUnits.map(unit => {
                                        const sec = sections.find(s => s.id === unit.sectionId);
                                        if (sec && !sec.visible) return null;
                                        const isHiding = Boolean(animatingHideSectionId && unit.sectionId === animatingHideSectionId);
                                        const isEntering = Boolean(animatingShowSectionId && unit.sectionId === animatingShowSectionId);
                                        return (
                                          <div
                                            key={unit.id}
                                            className={`${styles.unitTransitionWrapper} ${isHiding ? styles.unitTransitionHiding : ''} ${isEntering ? styles.unitTransitionEntering : ''}`}
                                          >
                                            {renderUnit(unit)}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div className={styles.mainColumn}>
                                      {mainUnits.map(unit => {
                                        const sec = sections.find(s => s.id === unit.sectionId);
                                        if (sec && !sec.visible) return null;
                                        const isHiding = Boolean(animatingHideSectionId && unit.sectionId === animatingHideSectionId);
                                        const isEntering = Boolean(animatingShowSectionId && unit.sectionId === animatingShowSectionId);
                                        return (
                                          <div
                                            key={unit.id}
                                            className={`${styles.unitTransitionWrapper} ${isHiding ? styles.unitTransitionHiding : ''} ${isEntering ? styles.unitTransitionEntering : ''}`}
                                          >
                                            {renderUnit(unit)}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className='allowedPageContentHeight' style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                                  {pageUnits.map(unit => {
                                    const sec = sections.find(s => s.id === unit.sectionId);
                                    if (sec && !sec.visible) return null;
                                    const isHiding = Boolean(animatingHideSectionId && unit.sectionId === animatingHideSectionId);
                                    const isEntering = Boolean(animatingShowSectionId && unit.sectionId === animatingShowSectionId);
                                    return (
                                      <div
                                        key={unit.id}
                                        className={`${styles.unitTransitionWrapper} ${isHiding ? styles.unitTransitionHiding : ''} ${isEntering ? styles.unitTransitionEntering : ''}`}
                                      >
                                        {renderUnit(unit)}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Render dashed margin guidelines strictly on canvas viewport */}
                              <div
                                className="no-print"
                                style={{
                                  position: 'absolute',
                                  top: `${pageMargin}px`,
                                  left: `${pageMargin}px`,
                                  right: `${pageMargin}px`,
                                  bottom: `${pageMargin}px`,
                                  border: 'none',
                                  pointerEvents: 'none',
                                  zIndex: 1
                                }}
                              />
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </MeasuringContext.Provider>
              )}

              {editorTab === 'letter' && (
                <MeasuringContext.Provider value={false}>
                  <div ref={viewportRef} className={styles.canvasViewport}>
                    <div
                      className={styles.pagesScaledWrapper}
                      ref={scaledWrapperRef}
                      style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px',
                        width: '210mm',
                        marginBottom: `-${wrapperHeightCompensation}px`
                      }}
                    >
                      <div
                        className={`${styles.pageContainer} ${styles.letterPage}`}
                        style={{
                          width: '210mm',
                          height: '297mm',
                          '--print-page-width': '210mm',
                          '--print-page-height': '297mm',
                          padding: '75px 75px 75px 75px', // Modern German A4 margins (~2 cm margins)
                          boxSizing: 'border-box',
                          background: '#ffffff',
                          fontFamily: "'Arial', 'Helvetica Neue', Helvetica, sans-serif",
                          fontSize: '14px',
                          lineHeight: '1.6',
                          color: '#1d2939',
                          position: 'relative'
                        } as React.CSSProperties}
                      >
                        {isLetterLoading ? (
                          <div
                            className={styles.skeletonPaper}
                            style={{
                              padding: '0px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '20px',
                              width: '100%',
                              height: '100%',
                              boxSizing: 'border-box',
                              background: 'transparent'
                            }}
                          >
                            {/* Header info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                              <div className={styles.skeletonLineLarge} style={{ height: '20px', width: '200px' }} />
                              <div className={styles.skeletonLineSmall} style={{ height: '10px', width: '300px' }} />
                            </div>

                            {/* Date */}
                            <div className={styles.skeletonLineSmall} style={{ height: '10px', width: '100px', marginBottom: '15px' }} />

                            {/* Recruiter / Company */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                              <div className={styles.skeletonLineMedium} style={{ height: '12px', width: '120px' }} />
                              <div className={styles.skeletonLineSmall} style={{ height: '10px', width: '150px' }} />
                            </div>

                            {/* Dear Hiring Manager */}
                            <div className={styles.skeletonLineSmall} style={{ height: '12px', width: '140px', marginBottom: '10px' }} />

                            {/* Paragraph 1 */}
                            <div className={styles.skeletonParagraph} style={{ marginBottom: '12px' }}>
                              <div className={styles.skeletonLineFull} />
                              <div className={styles.skeletonLineFull} />
                              <div className={styles.skeletonLineTwoThirds} />
                            </div>

                            {/* Paragraph 2 */}
                            <div className={styles.skeletonParagraph} style={{ marginBottom: '12px' }}>
                              <div className={styles.skeletonLineFull} />
                              <div className={styles.skeletonLineFull} />
                              <div className={styles.skeletonLineFull} />
                              <div className={styles.skeletonLineTwoThirds} />
                            </div>

                            {/* Paragraph 3 */}
                            <div className={styles.skeletonParagraph} style={{ marginBottom: '12px' }}>
                              <div className={styles.skeletonLineFull} />
                              <div className={styles.skeletonLineFull} />
                              <div className={styles.skeletonLineTwoThirds} />
                            </div>

                            {/* Paragraph 4 */}
                            <div className={styles.skeletonParagraph} style={{ marginBottom: '24px' }}>
                              <div className={styles.skeletonLineFull} />
                              <div className={styles.skeletonLineTwoThirds} />
                            </div>

                            {/* Sign-off */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div className={styles.skeletonLineSmall} style={{ height: '10px', width: '80px' }} />
                              <div className={styles.skeletonLineMedium} style={{ height: '12px', width: '120px' }} />
                            </div>
                          </div>
                        ) : (() => {
                          const letter = getParsedLetter(letterContent, editablePersonalInfo);

                          const updateField = (key: keyof ParsedLetter, value: any) => {
                            if (letter.is_json) {
                              try {
                                const parsed = JSON.parse(letterContent);
                                const updated = {
                                  ...parsed,
                                  [key]: value
                                };
                                setLetterContent(JSON.stringify(updated));
                              } catch (e) {
                                console.error(e);
                              }
                            } else {
                              // Legacy content updates
                              if (key === 'body') {
                                setLetterContent(value + '\n' + letter.closing_salutation + '\n' + letter.candidate_name);
                              } else if (key === 'closing_salutation') {
                                setLetterContent(letter.body + '\n' + value + '\n' + letter.candidate_name);
                              } else if (key === 'candidate_name') {
                                setLetterContent(letter.body + '\n' + letter.closing_salutation + '\n' + value);
                              }
                            }
                          };

                          if (!letter.is_json) {
                            // Legacy raw text layout (with signature logic if present)
                            return (
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  height: '100%',
                                  width: '100%',
                                  fontFamily: letterStyles.fontFamily || 'inherit',
                                  fontSize: `${letterStyles.fontSize}px`,
                                  lineHeight: letterStyles.lineHeight,
                                  color: '#1e293b'
                                }}
                              >
                                <AutoSizeTextarea
                                  value={letter.body}
                                  onChange={(val) => updateField('body', val)}
                                  style={{
                                    width: '100%',
                                    flex: 1,
                                    border: 'none',
                                    outline: 'none',
                                    resize: 'none',
                                    fontFamily: 'inherit',
                                    fontSize: 'inherit',
                                    lineHeight: 'inherit',
                                    color: 'inherit',
                                    padding: 0,
                                    margin: 0,
                                    background: 'transparent',
                                    overflow: 'hidden'
                                  }}
                                  placeholder="Cover letter body..."
                                />

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                                  <textarea
                                    value={letter.closing_salutation}
                                    onChange={(e) => updateField('closing_salutation', e.target.value)}
                                    rows={1}
                                    style={{
                                      width: '100%',
                                      border: 'none',
                                      outline: 'none',
                                      resize: 'none',
                                      fontFamily: 'inherit',
                                      fontSize: 'inherit',
                                      lineHeight: 'inherit',
                                      color: 'inherit',
                                      padding: 0,
                                      margin: 0,
                                      background: 'transparent',
                                      overflow: 'hidden',
                                      fontWeight: 'inherit'
                                    }}
                                    placeholder="Closing salutation..."
                                  />

                                  {showSignature && editablePersonalInfo.signature_image && (
                                    <ResizableSignature
                                      src={editablePersonalInfo.signature_image}
                                      height={signatureHeight}
                                      onChange={setSignatureHeight}
                                    />
                                  )}

                                  <textarea
                                    value={letter.candidate_name}
                                    onChange={(e) => updateField('candidate_name', e.target.value)}
                                    rows={2}
                                    style={{
                                      width: '100%',
                                      border: 'none',
                                      outline: 'none',
                                      resize: 'none',
                                      fontFamily: 'inherit',
                                      fontSize: 'inherit',
                                      lineHeight: 'inherit',
                                      color: 'inherit',
                                      padding: 0,
                                      margin: 0,
                                      background: 'transparent',
                                      overflow: 'hidden',
                                      fontWeight: 'inherit'
                                    }}
                                    placeholder="Applicant name..."
                                  />
                                </div>
                              </div>
                            );
                          }

                          // Structured JSON Letter Layout with custom side arrangements!
                          return (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: '100%',
                                width: '100%',
                                fontFamily: letterStyles.fontFamily || 'inherit',
                                fontSize: `${letterStyles.fontSize}px`,
                                lineHeight: letterStyles.lineHeight,
                                color: '#1e293b'
                              }}
                            >
                              {/* 1. Sender Info Header (Applicant details aligned to the top-right) */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'right', alignItems: 'flex-end', width: '280px' }}>
                                  <input
                                    value={letter.sender_name}
                                    onChange={(e) => updateField('sender_name', e.target.value)}
                                    style={{ fontWeight: 'bold', fontSize: '15px', border: 'none', outline: 'none', background: 'transparent', width: '100%', textAlign: 'right', padding: 0 }}
                                    placeholder="Your Name"
                                  />
                                  <input
                                    value={letter.sender_address}
                                    onChange={(e) => updateField('sender_address', e.target.value)}
                                    style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', textAlign: 'right', padding: 0, fontSize: '12px', color: '#64748b' }}
                                    placeholder="Your Address"
                                  />
                                  <input
                                    value={letter.sender_phone}
                                    onChange={(e) => updateField('sender_phone', e.target.value)}
                                    style={{ border: 'none', outline: 'none', background: 'transparent', textAlign: 'right', padding: 0, fontSize: '12px', color: '#64748b', width: '100%' }}
                                    placeholder="Your Phone"
                                  />
                                  <input
                                    value={letter.sender_email}
                                    onChange={(e) => updateField('sender_email', e.target.value)}
                                    style={{ border: 'none', outline: 'none', background: 'transparent', textAlign: 'right', padding: 0, fontSize: '12px', color: '#64748b', width: '100%' }}
                                    placeholder="Your Email"
                                  />
                                </div>
                              </div>

                              {/* 2. Recipient Info (Company name first, then contact person, then address) */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '320px', marginBottom: '20px' }}>
                                <input
                                  value={letter.recipient_company}
                                  onChange={(e) => updateField('recipient_company', e.target.value)}
                                  style={{ fontWeight: 'bold', border: 'none', outline: 'none', background: 'transparent', width: '100%', padding: 0 }}
                                  placeholder="Company Name"
                                />
                                <input
                                  value={
                                    letter.recipient_contact && letter.recipient_contact !== 'NOT PROVIDED'
                                      ? letter.recipient_contact
                                      : (letter.salutation.toLowerCase().includes('damen') || letter.salutation.toLowerCase().includes('geehrte')
                                        ? 'Sehr geehrte Damen und Herren'
                                        : 'Hiring Manager')
                                  }
                                  onChange={(e) => updateField('recipient_contact', e.target.value)}
                                  style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', padding: 0, color: '#475569' }}
                                  placeholder="Contact Person / Hiring Manager"
                                />
                                <textarea
                                  value={letter.recipient_address}
                                  onChange={(e) => updateField('recipient_address', e.target.value)}
                                  rows={2}
                                  style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', padding: 0, resize: 'none', overflow: 'hidden', color: '#475569', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
                                  placeholder="Company Address"
                                />
                              </div>

                              {/* 3. Location and Date (to the right side, combined to prevent empty gaps) */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px' }}>
                                <input
                                  value={letter.location && letter.date ? `${letter.location}, ${letter.date}` : (letter.location || letter.date || '')}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const commaIndex = val.indexOf(',');
                                    if (commaIndex !== -1) {
                                      const loc = val.substring(0, commaIndex).trim();
                                      const dt = val.substring(commaIndex + 1).trim();
                                      updateField('location', loc);
                                      updateField('date', dt);
                                    } else {
                                      updateField('location', val);
                                      updateField('date', '');
                                    }
                                  }}
                                  style={{ border: 'none', outline: 'none', background: 'transparent', textAlign: 'right', padding: 0, width: '250px', fontSize: '12.5px', color: '#475569' }}
                                  placeholder="City, Date"
                                />
                              </div>

                              {/* 4. Subject Line (Bold, Clean, No Bold Asterisks!) */}
                              <div style={{ marginBottom: '20px' }}>
                                <textarea
                                  value={letter.subject}
                                  onChange={(e) => updateField('subject', e.target.value)}
                                  rows={1}
                                  style={{ fontWeight: 'bold', fontSize: '14.5px', color: '#0f172a', border: 'none', outline: 'none', background: 'transparent', width: '100%', padding: 0, resize: 'none', overflow: 'hidden', fontFamily: 'inherit', lineHeight: 'inherit' }}
                                  placeholder="Subject Line"
                                />
                              </div>

                              {/* 5. Salutation */}
                              <div style={{ marginBottom: '16px' }}>
                                <input
                                  value={letter.salutation}
                                  onChange={(e) => updateField('salutation', e.target.value)}
                                  style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', padding: 0, fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit', color: 'inherit' }}
                                  placeholder="Salutation"
                                />
                              </div>

                              {/* 6. Body Paragraphs (using AutoSizeTextarea for dynamic resizable height!) */}
                              <div style={{ marginBottom: '24px' }}>
                                <AutoSizeTextarea
                                  value={letter.body}
                                  onChange={(val) => updateField('body', val)}
                                  style={{
                                    width: '100%',
                                    border: 'none',
                                    outline: 'none',
                                    resize: 'none',
                                    fontFamily: 'inherit',
                                    fontSize: 'inherit',
                                    lineHeight: 'inherit',
                                    color: 'inherit',
                                    padding: 0,
                                    margin: 0,
                                    background: 'transparent',
                                    overflow: 'hidden'
                                  }}
                                  placeholder="Type your cover letter body here..."
                                />
                              </div>

                              {/* 7. Closing, Signature and Name */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <input
                                  value={letter.closing_salutation}
                                  onChange={(e) => updateField('closing_salutation', e.target.value)}
                                  style={{ border: 'none', outline: 'none', background: 'transparent', width: '250px', padding: 0, fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit', color: 'inherit' }}
                                  placeholder="Closing Salutation"
                                />

                                {showSignature && editablePersonalInfo.signature_image && (
                                  <ResizableSignature
                                    src={editablePersonalInfo.signature_image}
                                    height={signatureHeight}
                                    onChange={setSignatureHeight}
                                  />
                                )}

                                <input
                                  value={letter.candidate_name}
                                  onChange={(e) => updateField('candidate_name', e.target.value)}
                                  style={{ fontWeight: 'bold', border: 'none', outline: 'none', background: 'transparent', width: '250px', padding: 0, fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit', color: 'inherit' }}
                                  placeholder="Your Name"
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </MeasuringContext.Provider>
              )}
            </div>
          ) : (
            <div className={styles.emptyWorkspace}>
              <Brain size={48} className={styles.emptyIcon} />
              <h3>Tailoring Workspace Ready</h3>
              <p>Tailor your master profile credentials against standard job descriptions to start.</p>
            </div>
          )}
        </div>
      </div>

      {/* Side-by-Side Section AI Polish Review Modal */}
      {openSectionAiModalId && (
        <SectionAiPolishModal
          openSectionAiModalId={openSectionAiModalId}
          onClose={() => { setOpenSectionAiModalId(null); setSectionAiProposal(null); }}
          sectionAiScope={sectionAiScope}
          setSectionAiScope={setSectionAiScope}
          sectionAiPrompt={sectionAiPrompt}
          setSectionAiPrompt={setSectionAiPrompt}
          isGeneratingSectionAi={isGeneratingSectionAi}
          sectionAiProposal={sectionAiProposal}
          setSectionAiProposal={setSectionAiProposal}
          getSectionAiScopeOptions={getSectionAiScopeOptions}
          handleGenerateSectionAi={handleGenerateSectionAi}
          handleAcceptSectionAiProposal={handleApplySectionAiProposal}
        />
      )}

      {/* Add Custom Section Modal */}
      <AddCustomSectionModal
        isOpen={isAddCustomSectionOpen}
        onClose={() => setIsAddCustomSectionOpen(false)}
        onCreateSection={handleCreateCustomSection}
      />

      {/* Inline AI Polish Modal */}
      {polishModalInfo && (
        <div className={styles.sectionAiModalOverlay}>
          <div className={styles.sectionAiModalCard} style={{ maxWidth: '480px', padding: '24px', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} style={{ color: 'var(--primary, #6366f1)' }} />
                AI Polish Bullet Point
              </h3>
              <button
                type="button"
                onClick={() => setPolishModalInfo(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Original Text:</span>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '13px', color: '#cbd5e1', fontStyle: 'italic', lineHeight: '1.4' }}>
                "{polishModalInfo.text}"
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Polish Instructions:</span>
              <textarea
                value={polishInstruction}
                onChange={(e) => setPolishInstruction(e.target.value)}
                placeholder="Improve impact, metrics, and professional polish..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button variant="secondary" onClick={() => setPolishModalInfo(null)}>
                Cancel
              </Button>
              <Button
                isLoading={isPolishing}
                onClick={async () => {
                  setIsPolishing(true);
                  try {
                    const res = await api.post('/resume/rephrase', {
                      text: polishModalInfo.text,
                      instruction: polishInstruction || "Improve impact, metrics, and professional polish"
                    });
                    if (res.data && res.data.success && res.data.rephrased_text) {
                      polishModalInfo.onAccept(res.data.rephrased_text);
                    }
                  } catch (err) {
                    console.error('Failed to polish text:', err);
                  } finally {
                    setIsPolishing(false);
                    setPolishModalInfo(null);
                  }
                }}
                style={{ background: 'var(--primary, #4f46e5)', color: '#ffffff', fontWeight: 600 }}
              >
                Apply Polish
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
