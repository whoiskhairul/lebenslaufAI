import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../components/Button';
import { InputField } from '../components/InputField';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import {
  Wand2, Download, Printer, Check, X, ShieldAlert, Sparkles, FileText, Brain, Award, Save, RefreshCw, GripVertical, Trash, Plus, Settings, ArrowUp, ArrowDown, Maximize2, Minimize2, LayoutGrid, Layers, Sliders
} from 'lucide-react';
import styles from './EditorNew.module.css';

import { ATSDashboard, ATSReport, Proposal } from '../components/ATSDashboard';
import { Snapshot } from '../components/VersionSnapshotDrawer';

const templateClassMap: { [key: string]: string } = {
  pixel_perfect_pdf: 'pixelPerfectLayout',
  german_style_cv: 'germanLayout',
  modern_minimalist: 'modern_minimalist',
  executive_professional: 'executive_professional',
  creative_tech: 'creative_tech'
};


// TypeScript Types
interface ResumeVersion {
  id: string;
  title: string;
  target_company: string;
  target_role: string;
  ats_score: number;
  tailored_summary: string;
  tailored_details: {
    experiences: Array<{ id: string; bullets: string[] }>;
    skills?: Array<{ id?: string; name: string; category: string; level?: string }>;
    projects?: Array<{ id?: string; title: string; role?: string; technologies?: string[]; bullets?: string[]; link?: string; date?: string }>;
    ats_report: {
      score: number;
      matched_keywords: string[];
      missing_keywords: string[];
      suggestions: string[];
    };
    original_profile: {
      personal_info: {
        full_name: string;
        title: string;
        email: string;
        phone: string;
        location: string;
        summary: string;
        links: Array<{ label: string; url: string }>;
        date_of_birth?: string;
        nationality?: string;
        linkedin?: string;
        github?: string;
        website?: string;
        image_url?: string;
      };
      work_experiences: Array<{
        id: string;
        company: string;
        position: string;
        location?: string;
        start_date?: string;
        end_date?: string;
        bullets: string[];
      }>;
      projects: Array<{
        id: string;
        title: string;
        role?: string;
        technologies: string[];
        bullets: string[];
        link?: string;
        date?: string;
      }>;
      skills: Array<{ id: string; name: string; category: string; level?: string }>;
      educations?: Array<{
        id: string;
        institution: string;
        degree?: string;
        field_of_study?: string;
        location?: string;
        start_date?: string;
        end_date?: string;
        is_current?: boolean;
        bullets?: string[];
      }>;
      certifications?: Array<{
        id: string;
        name: string;
        authority?: string;
        issue_date?: string;
        credential_id?: string;
        credential_url?: string;
      }>;
    };
    customization?: {
      sections?: any[];
      customStyles?: any;
      headerStyles?: any;
    };
  };
  explanations: Array<{
    section: string;
    confidence_score: number;
    evidence_source: string;
    reason: string;
  }>;
  validation_alerts?: Array<{
    severity: string;
    section: string;
    section_label: string;
    value: string;
    message: string;
  }>;
  template: string;
  created_at: string;
  application?: string;
}

interface EditorProps {
  initialJobParams?: { company?: string; position?: string; desc?: string; application_id?: string; tab?: string };
}

// Flat renderable units for the virtual page partitioning algorithm
interface RenderableUnit {
  type: 'header' | 'section-title' | 'summary' | 'experience-item' | 'project-item' | 'education-item' | 'skills-languages' | 'skills-category' | 'custom-content' | 'contacts-static';
  id: string;
  sectionId?: string;
  titleText?: string;
  itemIndex?: number;
  itemData?: any;
  skills?: any[];
  category?: string;
  bullets?: string[];
}

// Custom Date Parser and Formatter to support MM/YYYY, MMM YYYY, YYYY formats
const parseDate = (str: string) => {
  if (!str) return null;
  const s = str.trim().toLowerCase();
  if (s === 'present' || s === 'current' || s === 'heute' || s === 'jetzt' || s === 'laufend') {
    return 'Present';
  }

  // Try to match MM/YYYY or M/YYYY or YYYY-MM or YYYY.MM
  let match = s.match(/^(\d{1,2})[\/\-\.](\d{4})$/);
  if (match) {
    return { month: parseInt(match[1]), year: parseInt(match[2]) };
  }

  match = s.match(/^(\d{4})[\/\-\.](\d{1,2})$/);
  if (match) {
    return { month: parseInt(match[2]), year: parseInt(match[1]) };
  }

  // Match Month Name YYYY (e.g. "May 2022", "Jan. 2020", "März 2021")
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const germanMonths = ['jan', 'feb', 'mär', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dez'];

  const yearMatch = s.match(/\b(\d{4})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    for (let i = 0; i < 12; i++) {
      if (s.includes(months[i]) || s.includes(germanMonths[i])) {
        return { month: i + 1, year };
      }
    }
    return { month: null, year };
  }

  // Raw Year only
  const rawYearMatch = s.match(/^(\d{4})$/);
  if (rawYearMatch) {
    return { month: null, year: parseInt(rawYearMatch[1]) };
  }

  return null;
};

const formatDate = (dateStr: string, format: 'MM/YYYY' | 'MMM YYYY' | 'YYYY') => {
  const parsed = parseDate(dateStr);
  if (!parsed) return dateStr;
  if (parsed === 'Present') return 'Present';

  const { month, year } = parsed;
  if (format === 'YYYY' || !month) {
    return `${year}`;
  }

  if (format === 'MM/YYYY') {
    return `${month.toString().padStart(2, '0')}/${year}`;
  }

  if (format === 'MMM YYYY') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month - 1]} ${year}`;
  }

  return dateStr;
};

const MeasuringContext = React.createContext(false);

// Auto-resizing Textarea supporting clean canvas inline editing
const AutoSizeTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
  id?: string;
  singleLine?: boolean;
  style?: React.CSSProperties;
}> = ({ value, onChange, onKeyDown, onBlur, className, placeholder, id, singleLine, style }) => {
  const isMeasuring = React.useContext(MeasuringContext);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [localVal, setLocalVal] = useState(value);
  const selectionRef = useRef<{ start: number | null; end: number | null }>({ start: null, end: null });
  const isTypingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (isMeasuring) {
    return (
      <div
        className={className}
        style={{
          whiteSpace: singleLine ? 'nowrap' : 'pre-wrap',
          wordBreak: singleLine ? 'keep-all' : 'break-word',
          width: '100%',
          display: 'block',
          fontSize: 'inherit',
          lineHeight: 'inherit',
          fontFamily: 'inherit',
          fontWeight: 'inherit',
          color: 'inherit',
          padding: '2px 0',
          minHeight: '1.2em',
          boxSizing: 'border-box',
          ...style
        }}
      >
        {value || placeholder || ' '}
      </div>
    );
  }

  useEffect(() => {
    if (!isTypingRef.current) {
      setLocalVal(value);
    }
  }, [value]);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useLayoutEffect(() => {
    adjustHeight();
    if (textareaRef.current && document.activeElement === textareaRef.current) {
      const { start, end } = selectionRef.current;
      if (start !== null && end !== null) {
        try {
          textareaRef.current.setSelectionRange(start, end);
        } catch (_) { }
      }
    }
  }, [localVal, value, style?.fontSize, style?.lineHeight, style?.fontWeight, (style as any)?.headingSizeMult]);

  useEffect(() => {
    const handleResizeOrStyle = () => {
      adjustHeight();
      requestAnimationFrame(adjustHeight);
    };
    window.addEventListener('resize', handleResizeOrStyle);
    window.addEventListener('cv-style-change', handleResizeOrStyle);
    return () => {
      window.removeEventListener('resize', handleResizeOrStyle);
      window.removeEventListener('cv-style-change', handleResizeOrStyle);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    isTypingRef.current = true;
    const newVal = e.target.value;
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    selectionRef.current = { start, end };

    setLocalVal(newVal);
    onChange(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 400);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    selectionRef.current = { start: target.selectionStart, end: target.selectionEnd };
  };

  return (
    <textarea
      id={id}
      ref={textareaRef}
      value={localVal}
      onChange={handleChange}
      onSelect={handleSelect}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className={className}
      placeholder={placeholder}
      rows={1}
      style={{
        overflow: 'hidden',
        resize: 'none',
        width: '100%',
        border: 'none',
        background: 'transparent',
        outline: 'none',
        padding: 0,
        margin: 0,
        color: 'inherit',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: 'inherit',
        lineHeight: 'inherit',
        textAlign: 'inherit',
        whiteSpace: singleLine ? 'nowrap' : undefined,
        wordBreak: singleLine ? 'keep-all' : undefined,
        ...style
      }}
    />
  );
};

// Helper for rendering section title with partial / multi-color formatting
const renderFormattedTitle = (title: string, primaryColor?: string, secondaryColor?: string) => {
  if (!title) return null;

  // 1. Color tag syntax e.g. <color:#3b82f6>Summary</color>
  if (title.includes('<color:')) {
    const parts: React.ReactNode[] = [];
    const regex = /<color:(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)>(.*?)<\/color>/g;
    let lastIdx = 0;
    let match;
    while ((match = regex.exec(title)) !== null) {
      if (match.index > lastIdx) {
        parts.push(title.substring(lastIdx, match.index));
      }
      parts.push(
        <span key={match.index} style={{ color: match[1] }}>
          {match[2]}
        </span>
      );
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < title.length) {
      parts.push(title.substring(lastIdx));
    }
    return <>{parts}</>;
  }

  // 2. Dual-color split mode (1st word vs rest of title)
  if (secondaryColor) {
    const words = title.trim().split(/\s+/);
    if (words.length > 1) {
      const firstWord = words[0];
      const rest = words.slice(1).join(' ');
      return (
        <>
          <span style={{ color: primaryColor || 'inherit' }}>{firstWord}</span>{' '}
          <span style={{ color: secondaryColor }}>{rest}</span>
        </>
      );
    }
  }

  return null;
};

const renderFormattedLanguageList = (text: string) => {
  if (!text) return null;
  const items = text.split(',').map(s => s.trim()).filter(Boolean);
  return (
    <>
      {items.map((item, idx) => {
        const parenIdx = item.indexOf('(');
        if (parenIdx !== -1) {
          const langName = item.substring(0, parenIdx).trim();
          const rest = item.substring(parenIdx);
          return (
            <span key={idx}>
              <strong style={{ fontWeight: 700 }}>{langName}</strong>{' '}
              <span style={{ fontWeight: 400 }}>{rest}</span>
              {idx < items.length - 1 ? ', ' : ''}
            </span>
          );
        } else {
          return (
            <span key={idx}>
              <strong style={{ fontWeight: 700 }}>{item}</strong>
              {idx < items.length - 1 ? ', ' : ''}
            </span>
          );
        }
      })}
    </>
  );
};

export const Editor: React.FC<EditorProps> = ({ initialJobParams }) => {
  // Main CV Parameters
  const [jobDescription, setJobDescription] = useState('');
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [template, setTemplate] = useState('pixel_perfect_pdf');
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
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isProjectsCollapsed, setIsProjectsCollapsed] = useState(false);
  const [isAtsChecking, setIsAtsChecking] = useState<boolean>(false);
  const [keywordCategoryPopover, setKeywordCategoryPopover] = useState<string | null>(null);

  // Tabs layout controls
  const [editorTab, setEditorTab] = useState<'resume' | 'letter' | 'job'>('resume');
  const [activeControlTab, setActiveControlTab] = useState<'tailor' | 'style' | 'ats'>('tailor');
  const [expandedSectionSettings, setExpandedSectionSettings] = useState<string | null>(null);
  const [headerStyles, setHeaderStyles] = useState<any>({});
  const [activeSectionSettings, setActiveSectionSettings] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [editingSectionTitleId, setEditingSectionTitleId] = useState<string | null>(null);
  const [editingLanguagesId, setEditingLanguagesId] = useState<string | null>(null);

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resizable Control Panel State
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    const saved = localStorage.getItem('editor_panel_width');
    return saved ? parseInt(saved, 10) : 450;
  });
  const [isResizingPanel, setIsResizingPanel] = useState<boolean>(false);
  const controlPanelRef = useRef<HTMLDivElement>(null);

  // Mouse drag handler for panel resizing
  useEffect(() => {
    if (!isResizingPanel) return;

    const handleMouseMove = (e: MouseEvent) => {
      const MIN_WIDTH = 320;
      const MAX_WIDTH = Math.min(800, window.innerWidth - 350);
      let newWidth = e.clientX;

      if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
      if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH;

      setPanelWidth(newWidth);
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
  }, [isResizingPanel]);

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

  // Global Margins, Colors and Fonts
  const [customStyles, setCustomStyles] = useState<{
    fontSize: number;
    headingSize: number;
    lineHeight: number;
    sectionSpacing: number;
    accentColor: string;
    textColor: string;
    alignment: string;
    pageMargin?: number;
    bulletSpacing?: number;
    personalDetailsOffset?: number;
    headingSecondaryColor?: string;
    dateFormat: 'MM/YYYY' | 'MMM YYYY' | 'YYYY';
    pageSize: 'A4' | 'Letter';
    fontFamily?: string;
  }>({
    fontSize: 13,
    headingSize: 1.4,
    lineHeight: 1.4,
    sectionSpacing: 20,
    accentColor: '#0f172a',
    headingSecondaryColor: '#3d7ee6',
    textColor: '#334155',
    alignment: 'left',
    pageMargin: undefined,
    bulletSpacing: 4,
    personalDetailsOffset: 16,
    dateFormat: 'MM/YYYY',
    pageSize: 'A4',
    fontFamily: ''
  });

  // Section Ordering and Visibility Matrix
  const [sections, setSections] = useState<Array<{
    id: string;
    name: string;
    visible: boolean;
    type: 'summary' | 'experience' | 'skills' | 'projects' | 'education' | 'custom';
    bullets?: string[];
    customStyles?: {
      fontSize?: number;
      spacing?: number;
      alignment?: string;
      headingSize?: number;
      headingColor?: string;
      headingSecondaryColor?: string;
      headingWeight?: string;
      headingStyle?: string;
      headingAlignment?: string;
      lineHeight?: number;
      textColor?: string;
      fontStyle?: string;
      fontWeight?: string;
      itemGap?: number;
      bulletSpacing?: number;
    };
    customFormat?: 'bullets' | 'keyvalue';
    keyValuePairs?: Array<{ key: string; value: string }>;
  }>>([
    { id: 'summary', name: 'Professional Summary', visible: true, type: 'summary' },
    { id: 'experience', name: 'Work Experience', visible: true, type: 'experience' },
    { id: 'projects', name: 'Projects', visible: true, type: 'projects' },
    { id: 'education', name: 'Education', visible: true, type: 'education' },
    { id: 'skills', name: 'Skills', visible: true, type: 'skills' }
  ]);

  // Editable CV text grids
  const [editableSummary, setEditableSummary] = useState('');
  const [editablePersonalInfo, setEditablePersonalInfo] = useState({
    full_name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    date_of_birth: '',
    nationality: '',
    linkedin: '',
    github: '',
    website: '',
    image_url: ''
  });
  const [editableExperiences, setEditableExperiences] = useState<Array<{ id: string; bullets: string[]; company?: string; position?: string; location?: string; start_date?: string; end_date?: string }>>([]);
  const [editableProjects, setEditableProjects] = useState<Array<{ id: string; bullets: string[]; title?: string; role?: string; technologies?: string[] | string; date?: string }>>([]);
  const [editableEducations, setEditableEducations] = useState<Array<{ id: string; institution: string; degree?: string; field_of_study?: string; start_date?: string; end_date?: string; location?: string; bullets?: string[] }>>([]);
  const [editableSkills, setEditableSkills] = useState<Array<{ id: string; name: string; category: string }>>([]);

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

  // 500ms debounced live score update on canvas edit
  useEffect(() => {
    if (scoreDebounceTimerRef.current) clearTimeout(scoreDebounceTimerRef.current);
    scoreDebounceTimerRef.current = setTimeout(() => {
      fetchATSScore();
    }, 500);
    return () => {
      if (scoreDebounceTimerRef.current) clearTimeout(scoreDebounceTimerRef.current);
    };
  }, [editableSummary, editableExperiences, editableSkills, editableProjects, editableEducations, sections, jobDescription, position, company]);

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




  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [languagesFirst, setLanguagesFirst] = useState(false);
  const [languagesTitle, setLanguagesTitle] = useState<string>('');
  const [expandedSkillCats, setExpandedSkillCats] = useState<Record<string, boolean>>({});

  // Focus redirection metadata when editing lists dynamically
  const [focusedBulletInfo, setFocusedBulletInfo] = useState<{ type: 'experience' | 'project' | 'education' | 'custom'; itemId: string; bulletIdx: number } | null>(null);


  // Cover Letter states
  const [letterContent, setLetterContent] = useState('');
  const [letterTone, setLetterTone] = useState('professional');
  const [isLetterLoading, setIsLetterLoading] = useState(false);

  // Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveBanner, setShowSaveBanner] = useState(false);

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

  // Unified Hover AI Controls Renderer for Canvas Text Blocks
  const renderHoverAiControls = (key: string, currentText: string, customChips?: { label: string; prompt: string }[]) => {
    const isPopoverOpen = openAiPopoverId === key;
    const isPending = isRephrasing[key];

    const defaultChips = customChips || [
      { label: "Punchier", prompt: "Make concise with strong action verbs" },
      { label: "Metrics & Impact", prompt: "Highlight quantifiable metrics and technical results" },
      { label: "ATS Polish", prompt: "Optimize key industry terminology for ATS screening" }
    ];

    return (
      <>
        <div className={`${styles.hoverAiBar} ${isPopoverOpen || isPending ? styles.hoverAiBarShow : ''} no-print`}>
          <button
            type="button"
            className={styles.hoverAiBtn}
            onClick={(e) => {
              e.stopPropagation();
              handleAiRewriteBlock(key, currentText);
            }}
            disabled={isPending}
            title="1-Click AI Auto Rewrite"
          >
            <Wand2 size={10} /> {isPending ? 'Rewriting...' : 'AI Rewrite'}
          </button>
          <button
            type="button"
            className={`${styles.hoverAiPromptBtn} ${isPopoverOpen ? styles.hoverAiPromptBtnActive : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpenAiPopoverId(isPopoverOpen ? null : key);
            }}
            title="Custom AI Instruction Prompt"
          >
            <Sparkles size={10} /> Prompt
          </button>
        </div>

        {isPopoverOpen && (
          <div className={`${styles.inlineAiPopover} no-print`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.popoverHeader}>
              <span><Wand2 size={12} /> AI Rewrite Assistant</span>
              <button type="button" onClick={() => setOpenAiPopoverId(null)} className={styles.popoverClose}>
                <X size={12} />
              </button>
            </div>
            <div className={styles.popoverChips}>
              {defaultChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAiRewriteBlock(key, currentText, chip.prompt)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div className={styles.popoverInputRow}>
              <input
                type="text"
                placeholder="e.g. Focus on technical leadership..."
                value={rephrasePrompt[key] || ''}
                onChange={(e) => setRephrasePrompt(prev => ({ ...prev, [key]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAiRewriteBlock(key, currentText);
                  }
                }}
              />
              <button type="button" onClick={() => handleAiRewriteBlock(key, currentText)}>
                Send
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  // Canvas viewport scale settings
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Multi-Page Virtual Matrix state
  const hiddenCanvasRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<RenderableUnit[][]>([[]]);
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});

  // Sync route param hashes
  const updateTabHash = (newTab: 'resume' | 'letter' | 'job') => {
    setEditorTab(newTab);
    if (initialJobParams?.application_id) {
      window.location.hash = `editor?appId=${initialJobParams.application_id}&tab=${newTab}`;
    }
  };

  // Sync category ordering on skills changes
  useEffect(() => {
    const itSkills = editableSkills.filter(s => (s.category || '').toLowerCase().trim() !== 'languages');
    const uniqueCats = Array.from(new Set(itSkills.map(s => s.category || 'technical')));
    setCategoryOrder(prev => {
      const filteredPrev = prev.filter(c => uniqueCats.includes(c));
      const added = uniqueCats.filter(c => !filteredPrev.includes(c));
      return [...filteredPrev, ...added];
    });
  }, [editableSkills]);

  // Adjust canvas viewport zoom scale
  useEffect(() => {
    const handleResize = () => {
      if (viewportRef.current) {
        const viewportWidth = viewportRef.current.clientWidth - 40;
        const pageWidth = customStyles.pageSize === 'A4' ? 794 : 816;
        setScale(Math.min(1, viewportWidth / pageWidth));
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    const timer = setTimeout(handleResize, 150);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [currentVersion, editorTab, customStyles.pageSize]);

  // Trigger DOM layout engine re-calculation when styling changes
  useEffect(() => {
    window.dispatchEvent(new Event('cv-style-change'));
  }, [customStyles, sections, template]);

  // Load master profile projects and info for tailoring selection & diagnostics
  useEffect(() => {
    const fetchMasterProfile = async () => {
      try {
        const res = await api.get('/master-profile/full');
        const profileObj = (res.data && res.data.success) ? res.data.data : res.data;
        if (profileObj) {
          if (profileObj.personal_info) {
            setMasterProfileInfo(profileObj.personal_info);
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
                full_name: profileObj.personal_info.full_name || '',
                title: profileObj.personal_info.title || '',
                email: profileObj.personal_info.email || '',
                phone: profileObj.personal_info.phone || '',
                location: profileObj.personal_info.location || '',
                date_of_birth: profileObj.personal_info.date_of_birth || '',
                nationality: profileObj.personal_info.nationality || '',
                linkedin: profileObj.personal_info.linkedin || '',
                github: profileObj.personal_info.github || '',
                website: profileObj.personal_info.website || '',
                image_url: profileObj.personal_info.image_url || useAuthStore.getState().user?.avatar || ''
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
          const matched = res.data.find((v: any) => v.application === initialJobParams.application_id);
          if (matched) {
            const ver = matched as ResumeVersion;
            setCurrentVersion(ver);
            initializeVersionFields(ver);

            const letterRes = await api.get('/resume/letters');
            const matchedLetter = letterRes.data.find((l: any) => l.application === initialJobParams.application_id);
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
        setEditablePersonalInfo({
          full_name: profile.personal_info.full_name || '',
          title: profile.personal_info.title || '',
          email: profile.personal_info.email || '',
          phone: profile.personal_info.phone || '',
          location: profile.personal_info.location || '',
          date_of_birth: profile.personal_info.date_of_birth || '',
          nationality: profile.personal_info.nationality || '',
          linkedin: profile.personal_info.linkedin || '',
          github: profile.personal_info.github || '',
          website: profile.personal_info.website || '',
          image_url: profile.personal_info.image_url || ''
        });
      }

      const rawExps = ver.tailored_details.experiences || [];
      const profileExps = profile.work_experiences || [];
      const experiences = profileExps.map((exp: any) => {
        const tailored = rawExps.find((e: any) => e.id === exp.id);
        return {
          id: exp.id,
          company: exp.company || '',
          position: exp.position || '',
          location: exp.location || '',
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
      const tailoredProjects = detailsAny.tailored_projects || detailsAny.projects || profile.projects || [];
      const mappedProjects = (profile.projects || tailoredProjects).map((p: any) => {
        const tailoredP = (detailsAny.tailored_projects || []).find((tp: any) => tp.id === p.id);
        return {
          id: p.id || `proj_${Math.random()}`,
          bullets: tailoredP?.bullets || p.bullets || [],
          title: p.title || '',
          role: p.role || '',
          technologies: p.technologies || p.tech_stack || tailoredP?.technologies || [],
          date: p.date || ''
        };
      });
      setEditableProjects(mappedProjects);
      setEditableEducations(profile.educations || []);
    }

    // Load styles config
    const customData = ver.tailored_details.customization;
    if (customData) {
      if (customData.sections) setSections(customData.sections);
      if (customData.customStyles) {
        setCustomStyles({
          ...customStyles,
          ...customData.customStyles
        });
      }
      if (customData.headerStyles) setHeaderStyles(customData.headerStyles);
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
        pageMargin: undefined,
        bulletSpacing: 4,
        dateFormat: 'MM/YYYY',
        pageSize: 'Letter'
      });
    }
  };

  // ----------------------------------------------------
  // LIST OPERATIONS AND CANVAS HANDLERS
  // ----------------------------------------------------

  // Work Experience Operations
  const handleAddExperience = () => {
    const newId = `exp_${Date.now()}`;
    const newExp = {
      id: newId,
      company: 'New Company',
      position: 'Job Title',
      location: 'City, Country',
      start_date: '01/2026',
      end_date: 'Present',
      bullets: ['Describe your major contribution...']
    };
    setEditableExperiences(prev => [...prev, newExp]);
  };

  const handleMoveExperience = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === editableExperiences.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const nextList = [...editableExperiences];
    const temp = nextList[idx];
    nextList[idx] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    setEditableExperiences(nextList);
  };

  const getLocalizedCategoryName = (catName: string): string => {
    const norm = (catName || '').toLowerCase().trim();
    if (targetLanguage === 'de') {
      if (norm === 'languages' || norm === 'languages & dialects' || norm === 'sprachen') return 'Sprachen';
      if (norm === 'programming languages' || norm === 'technical' || norm === 'technologies' || norm === 'programmiersprachen') return 'Programmiersprachen & Kenntnisse';
      if (norm === 'frameworks' || norm === 'frameworks & libraries' || norm === 'frameworks & bibliotheken') return 'Frameworks & Bibliotheken';
      if (norm === 'databases' || norm === 'datenbanken') return 'Datenbanken';
      if (norm === 'cloud' || norm === 'cloud & devops' || norm === 'devops' || norm === 'cloud & infrastructure') return 'Cloud & Infrastructure';
      if (norm === 'tools' || norm === 'development tools' || norm === 'werkzeuge & tools') return 'Werkzeuge & Tools';
      if (norm === 'soft_skills' || norm === 'soft skills') return 'Methodische & Soziale Kompetenzen';
    }
    return catName.charAt(0).toUpperCase() + catName.slice(1).replace(/_/g, ' ');
  };

  const handleMoveSkillInCategory = (skillId: string, direction: 'up' | 'down') => {
    setEditableSkills(prev => {
      const targetSkill = prev.find(s => s.id === skillId);
      if (!targetSkill) return prev;

      const catNormalized = (targetSkill.category || '').toLowerCase().trim();
      const categorySkills = prev.filter(s => (s.category || '').toLowerCase().trim() === catNormalized);
      const idx = categorySkills.findIndex(s => s.id === skillId);

      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === categorySkills.length - 1) return prev;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      const itemToSwap = categorySkills[targetIdx];

      const realIdx1 = prev.findIndex(s => s.id === skillId);
      const realIdx2 = prev.findIndex(s => s.id === itemToSwap.id);

      const updated = [...prev];
      const temp = updated[realIdx1];
      updated[realIdx1] = updated[realIdx2];
      updated[realIdx2] = temp;
      return updated;
    });
  };

  const handleAddExperienceBullet = (expIdx: number, bulletIdx: number = -1) => {
    setEditableExperiences(prev => prev.map((exp, i) => {
      if (i === expIdx) {
        const bullets = [...exp.bullets];
        const insertAt = bulletIdx === -1 ? bullets.length : bulletIdx + 1;
        bullets.splice(insertAt, 0, '');
        // Trigger focus placement on new bullet
        setFocusedBulletInfo({ type: 'experience', itemId: exp.id, bulletIdx: insertAt });
        return { ...exp, bullets };
      }
      return exp;
    }));
  };

  const handleRemoveExperienceBullet = (expIdx: number, bulletIdx: number) => {
    const exp = editableExperiences[expIdx];
    // Focus previous bullet if deleting current
    if (bulletIdx > 0) {
      setFocusedBulletInfo({ type: 'experience', itemId: exp.id, bulletIdx: bulletIdx - 1 });
    }
    setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? {
      ...e,
      bullets: e.bullets.filter((_, bIdx) => bIdx !== bulletIdx)
    } : e));
  };

  // Projects Operations
  const handleAddProject = () => {
    const newId = `proj_${Date.now()}`;
    const newProj = {
      id: newId,
      title: 'Project Title',
      role: 'Your Role / Core Technologies',
      date: '2026',
      bullets: ['Describe project milestone deliverables...']
    };
    setEditableProjects(prev => [...prev, newProj]);
  };

  const handleMoveProject = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === editableProjects.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const nextList = [...editableProjects];
    const temp = nextList[idx];
    nextList[idx] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    setEditableProjects(nextList);
  };

  const handleAddProjectBullet = (projIdx: number, bulletIdx: number = -1) => {
    setEditableProjects(prev => prev.map((proj, i) => {
      if (i === projIdx) {
        const bullets = [...proj.bullets];
        const insertAt = bulletIdx === -1 ? bullets.length : bulletIdx + 1;
        bullets.splice(insertAt, 0, '');
        setFocusedBulletInfo({ type: 'project', itemId: proj.id, bulletIdx: insertAt });
        return { ...proj, bullets };
      }
      return proj;
    }));
  };

  const handleRemoveProjectBullet = (projIdx: number, bulletIdx: number) => {
    const proj = editableProjects[projIdx];
    if (bulletIdx > 0) {
      setFocusedBulletInfo({ type: 'project', itemId: proj.id, bulletIdx: bulletIdx - 1 });
    }
    setEditableProjects(prev => prev.map((p, i) => i === projIdx ? {
      ...p,
      bullets: p.bullets.filter((_, bIdx) => bIdx !== bulletIdx)
    } : p));
  };

  // Education Operations
  const handleAddEducation = () => {
    const newId = `edu_${Date.now()}`;
    const newEdu = {
      id: newId,
      institution: 'Institution Name',
      degree: 'Degree / Academic Title',
      field_of_study: 'Field of Study',
      start_date: '2022',
      end_date: '2026',
      location: 'City, Country'
    };
    setEditableEducations(prev => [...prev, newEdu]);
  };

  const handleMoveEducation = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === editableEducations.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const nextList = [...editableEducations];
    const temp = nextList[idx];
    nextList[idx] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    setEditableEducations(nextList);
  };

  const handleAddEducationBullet = (eduIdx: number, bulletIdx: number = -1) => {
    setEditableEducations(prev => prev.map((edu, i) => {
      if (i === eduIdx) {
        const bullets = [...(edu.bullets || [])];
        const insertAt = bulletIdx === -1 ? bullets.length : bulletIdx + 1;
        bullets.splice(insertAt, 0, '');
        setFocusedBulletInfo({ type: 'education', itemId: edu.id, bulletIdx: insertAt });
        return { ...edu, bullets };
      }
      return edu;
    }));
  };

  const handleRemoveEducationBullet = (eduIdx: number, bulletIdx: number) => {
    const edu = editableEducations[eduIdx];
    if (bulletIdx > 0) {
      setFocusedBulletInfo({ type: 'education', itemId: edu.id, bulletIdx: bulletIdx - 1 });
    }
    setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? {
      ...e,
      bullets: (e.bullets || []).filter((_, bIdx) => bIdx !== bulletIdx)
    } : e));
  };


  // Custom Sections Item Operations
  const handleAddCustomBullet = (secId: string, bulletIdx: number = -1) => {
    setSections(prev => prev.map(s => {
      if (s.id === secId) {
        const bullets = [...(s.bullets || [])];
        const insertAt = bulletIdx === -1 ? bullets.length : bulletIdx + 1;
        bullets.splice(insertAt, 0, '');
        setFocusedBulletInfo({ type: 'custom', itemId: secId, bulletIdx: insertAt });
        return { ...s, bullets };
      }
      return s;
    }));
  };

  const handleRemoveCustomBullet = (secId: string, bulletIdx: number) => {
    if (bulletIdx > 0) {
      setFocusedBulletInfo({ type: 'custom', itemId: secId, bulletIdx: bulletIdx - 1 });
    }
    setSections(prev => prev.map(s => s.id === secId ? {
      ...s,
      bullets: (s.bullets || []).filter((_, bI) => bI !== bulletIdx)
    } : s));
  };

  // Keyboard List Navigation Handlers (Enter and Backspace listeners)
  const handleBulletKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    type: 'experience' | 'project' | 'education' | 'custom',
    itemId: string,
    itemIdx: number,
    bulletIdx: number,
    bulletsArray: string[]
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'experience') {
        handleAddExperienceBullet(itemIdx, bulletIdx);
      } else if (type === 'project') {
        handleAddProjectBullet(itemIdx, bulletIdx);
      } else if (type === 'education') {
        handleAddEducationBullet(itemIdx, bulletIdx);
      } else if (type === 'custom') {
        handleAddCustomBullet(itemId, bulletIdx);
      }
    } else if (e.key === 'Backspace' && bulletsArray[bulletIdx] === '') {
      e.preventDefault();
      if (bulletsArray.length <= 1) return; // Maintain at least 1 bullet point
      if (type === 'experience') {
        handleRemoveExperienceBullet(itemIdx, bulletIdx);
      } else if (type === 'project') {
        handleRemoveProjectBullet(itemIdx, bulletIdx);
      } else if (type === 'education') {
        handleRemoveEducationBullet(itemIdx, bulletIdx);
      } else if (type === 'custom') {
        handleRemoveCustomBullet(itemId, bulletIdx);
      }
    }
  };


  // ----------------------------------------------------
  // VIRTUAL PAGE MATRIX PARTITIONING SYSTEM
  // ----------------------------------------------------
  useEffect(() => {
    const measureAndLayout = () => {
      if (!hiddenCanvasRef.current) return;

      // Create flat elements stream based on sections order and visible elements
      const unitsList: RenderableUnit[] = [];

      unitsList.push({ type: 'header', id: 'header' });

      // Creative tech sidebar contacts static layout
      if (template === 'creative_tech') {
        unitsList.push({ type: 'contacts-static', id: 'contacts-static' });
      }

      sections.forEach(sec => {
        if (!sec.visible) return;

        if (sec.type === 'summary') {
          unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });
          unitsList.push({ type: 'summary', id: `summary-content`, sectionId: sec.id });
        } else if (sec.type === 'experience') {
          unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });
          editableExperiences.forEach((exp, idx) => {
            unitsList.push({
              type: 'experience-item',
              id: `exp-item-${exp.id}`,
              sectionId: sec.id,
              itemIndex: idx,
              itemData: exp
            });
          });
        } else if (sec.type === 'projects') {
          unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });
          editableProjects.forEach((proj, idx) => {
            unitsList.push({
              type: 'project-item',
              id: `proj-item-${proj.id}`,
              sectionId: sec.id,
              itemIndex: idx,
              itemData: proj
            });
          });
        } else if (sec.type === 'education') {
          unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });
          editableEducations.forEach((edu, idx) => {
            unitsList.push({
              type: 'education-item',
              id: `edu-item-${edu.id}`,
              sectionId: sec.id,
              itemIndex: idx,
              itemData: edu
            });
          });
        } else if (sec.type === 'skills') {
          unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });

          const langSkills = editableSkills.filter(s => (s.category || '').toLowerCase().trim() === 'languages');
          const itSkills = editableSkills.filter(s => (s.category || '').toLowerCase().trim() !== 'languages');
          const uniqueCats = Array.from(new Set(itSkills.map(s => s.category || 'technical')));
          const itCategories = categoryOrder.filter(c => uniqueCats.includes(c));
          const extraCats = uniqueCats.filter(c => !itCategories.includes(c));
          const finalCategories = [...itCategories, ...extraCats];

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

          const addLanguagesUnit = () => {
            if (langSkills.length > 0) {
              unitsList.push({ type: 'skills-languages', id: 'skills-languages', sectionId: sec.id, skills: langSkills });
            }
          };

          const addITSkillsUnits = () => {
            finalCategories.forEach((cat, catIdx) => {
              const catSkills = itSkills.filter(s => (s.category || 'technical') === cat);
              if (catSkills.length > 0) {
                unitsList.push({
                  type: 'skills-category',
                  id: `skills-category-${catIdx}`,
                  sectionId: sec.id,
                  category: cat,
                  skills: catSkills
                });
              }
            });
          };

          if (languagesFirst) {
            addLanguagesUnit();
            addITSkillsUnits();
          } else {
            addITSkillsUnits();
            addLanguagesUnit();
          }
        } else if (sec.type === 'custom') {
          unitsList.push({ type: 'section-title', id: `title-${sec.id}`, sectionId: sec.id, titleText: sec.name });
          unitsList.push({
            type: 'custom-content',
            id: `custom-content-${sec.id}`,
            sectionId: sec.id,
            bullets: sec.bullets || [],
            itemData: sec
          });
        }
      });

      // Retrieve actual DOM client dimensions of elements inside hidden canvas
      const measured: Record<string, number> = {};
      const childElements = hiddenCanvasRef.current.querySelectorAll('[data-measuring-id]');
      childElements.forEach((el: any) => {
        const id = el.getAttribute('data-measuring-id');
        if (id) {
          const compStyle = window.getComputedStyle(el);
          const marginTop = parseFloat(compStyle.marginTop) || 0;
          const marginBottom = parseFloat(compStyle.marginBottom) || 0;
          measured[id] = el.getBoundingClientRect().height + marginTop + marginBottom;
        }
      });

      setMeasuredHeights(measured);

      // Distribute stream across isolated pages
      const pageHeight = customStyles.pageSize === 'A4' ? 1123 : 1056;
      const pageMargin = customStyles.pageMargin || (template === 'german_style_cv' ? 76.8 : (template === 'pixel_perfect_pdf' ? 48 : 32));

      // Calculate usable inner content height
      const printableContentHeight = pageHeight - 2 * pageMargin;

      // Reserve a strict 50px buffer above the bottom footer margin to guarantee the footer area stays completely empty
      const totalPrintableHeight = printableContentHeight - 50;

      // Helper to compute unit effective height including header, section, and item slider overrides
      const getUnitEffectiveHeight = (u: RenderableUnit): number => {
        const baseHeight = measured[u.id] || 0;
        if (u.type === 'header') {
          const headerSpacing = headerStyles.spacing !== undefined ? headerStyles.spacing : 24;
          return baseHeight + headerSpacing;
        }

        const sec = sections.find(s => s.id === u.sectionId);
        const localStyles = sec?.customStyles || {};

        if (u.type === 'section-title') {
          const secSpacing = localStyles.spacing !== undefined ? localStyles.spacing : (customStyles.sectionSpacing || 20);
          return baseHeight + secSpacing + 10;
        }

        const itemGap = localStyles.itemGap !== undefined ? localStyles.itemGap : 0;
        const bulletSpacing = localStyles.bulletSpacing !== undefined ? localStyles.bulletSpacing : (customStyles.bulletSpacing !== undefined ? customStyles.bulletSpacing : 4);
        return baseHeight + itemGap + bulletSpacing + 4;
      };

      const newPages: RenderableUnit[][] = [[]];

      // Layout heights tracking (handles split grid column constraints in Creative Tech)
      let currentMainHeight = 0;
      let currentSidebarHeight = 0;

      for (let i = 0; i < unitsList.length; i++) {
        const unit = unitsList[i];
        const effHeight = getUnitEffectiveHeight(unit);

        // Header resides exclusively on page 1 top bounds
        if (unit.type === 'header') {
          newPages[0].push(unit);
          currentMainHeight += effHeight;
          currentSidebarHeight += effHeight;
          continue;
        }

        // Determine columns division mapping
        const isSidebarColumn = template === 'creative_tech' && (unit.sectionId === 'skills' || unit.type === 'contacts-static');
        const activeColumnLimit = totalPrintableHeight;

        let shouldPushPage = false;

        // Atomic Section Page Partitioning:
        // When evaluating a section title, calculate the total effective height of all units in that section.
        // If the entire section cannot fit on the current page, move the whole section to the next page.
        if (unit.type === 'section-title') {
          const sectionUnits = unitsList.filter(u => u.sectionId === unit.sectionId);
          const totalSectionHeight = sectionUnits.reduce((sum, u) => sum + getUnitEffectiveHeight(u), 0);

          if (isSidebarColumn) {
            if (currentSidebarHeight + totalSectionHeight > activeColumnLimit && currentSidebarHeight > 0) {
              shouldPushPage = true;
            }
          } else {
            if (currentMainHeight + totalSectionHeight > activeColumnLimit && currentMainHeight > 0) {
              shouldPushPage = true;
            }
          }
        } else {
          // Standard element sizing check (for individual items if a section is larger than 1 full page)
          if (isSidebarColumn) {
            if (currentSidebarHeight + effHeight > activeColumnLimit && currentSidebarHeight > 0) {
              shouldPushPage = true;
            }
          } else {
            if (currentMainHeight + effHeight > activeColumnLimit && currentMainHeight > 0) {
              shouldPushPage = true;
            }
          }
        }

        if (shouldPushPage) {
          newPages.push([]);
          currentMainHeight = 0;
          currentSidebarHeight = 0;
        }

        // Allocate unit into current page stack
        newPages[newPages.length - 1].push(unit);
        if (isSidebarColumn) {
          currentSidebarHeight += effHeight;
        } else {
          currentMainHeight += effHeight;
        }
      }

      setPages(newPages);
    };

    const timer = setTimeout(measureAndLayout, 100);
    return () => clearTimeout(timer);
  }, [
    editableSummary, editablePersonalInfo, editableExperiences, editableSkills,
    editableProjects, editableEducations, template, sections, customStyles, headerStyles,
    languagesFirst, categoryOrder
  ]);

  // ----------------------------------------------------
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
        save_version: saveAutomatically,
        target_language: targetLanguage,
        selected_project_ids: selectedProjectIds,
        aggressive_mode: aggressiveMode
      });
      if (res.data && res.data.success) {
        const ver = res.data.data as ResumeVersion;
        setCurrentVersion(ver);
        initializeVersionFields(ver);
        setApplicationTracked(!!ver.application);
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
      alert('Please provide a job description first.');
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
        selected_project_ids: selectedProjectIds,
        cv_details: activeCvDetails
      });
      if (res.data && res.data.success) {
        setLetterContent(res.data.content || res.data.data?.content || '');
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

        setCurrentVersion(prev => prev ? {
          ...prev,
          ats_score: newReport.score ?? prev.ats_score,
          tailored_details: {
            ...prev.tailored_details,
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
      if (editorTab === 'resume') {
        const updatedDetails = {
          ...currentVersion.tailored_details,
          skills: editableSkills,
          experiences: editableExperiences.map(e => ({
            id: e.id,
            bullets: e.bullets,
            company: e.company,
            position: e.position,
            location: e.location,
            start_date: e.start_date,
            end_date: e.end_date
          })),
          original_profile: {
            ...currentVersion.tailored_details.original_profile,
            personal_info: {
              ...currentVersion.tailored_details.original_profile?.personal_info,
              ...editablePersonalInfo
            },
            work_experiences: editableExperiences.map(e => ({
              id: e.id,
              company: e.company,
              position: e.position,
              location: e.location,
              start_date: e.start_date,
              end_date: e.end_date,
              bullets: e.bullets
            })),
            skills: editableSkills,
            projects: editableProjects,
            educations: editableEducations
          },
          customization: {
            sections,
            customStyles,
            headerStyles
          }
        };
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
            setCurrentVersion(res.data);
          }
        } else {
          await api.patch(`/resume/versions/${currentVersion.id}`, {
            tailored_summary: editableSummary,
            tailored_details: updatedDetails,
            template: template
          });
        }
      } else {
        const letterRes = await api.get('/resume/letters');
        const matchedLetter = letterRes.data.find((l: any) => l.application === initialJobParams?.application_id || l.target_company === currentVersion.target_company);
        if (matchedLetter) {
          await api.patch(`/resume/letters/${matchedLetter.id}`, {
            content: letterContent,
            tone: letterTone
          });
        } else {
          await api.post('/resume/letters', {
            application: initialJobParams?.application_id,
            target_company: currentVersion.target_company,
            target_role: currentVersion.target_role,
            content: letterContent,
            tone: letterTone
          });
        }
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
    const uniqueCats = Array.from(new Set(itSkills.map(sk => sk.category || 'technical')));
    const itCategories = categoryOrder.filter(c => uniqueCats.includes(c));
    const extraCats = uniqueCats.filter(c => !itCategories.includes(c));
    const finalCategories = [...itCategories, ...extraCats];

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
        const catSkills = itSkills.filter(sk => (sk.category || 'technical') === cat);
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
    const updateHeaderStyle = (key: string, value: any) => {
      setHeaderStyles((prev: any) => ({ ...prev, [key]: value }));
      window.dispatchEvent(new Event('cv-style-change'));
    };

    const topPos = popoverPosition ? Math.max(60, Math.min(window.innerHeight - 480, popoverPosition.top - 10)) : 100;
    const leftPos = popoverPosition ? Math.max(16, popoverPosition.left - 305) : 100;

    return createPortal(
      <div
        className={`${styles.portalPopoverCard} glass-card no-print`}
        style={{
          position: 'fixed',
          top: `${topPos}px`,
          left: `${leftPos}px`,
          width: '290px',
          zIndex: 999999
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.popoverHeader}>
          <h4>Header Customizer</h4>
          <button type="button" onClick={() => setActiveSectionSettings(null)} className={styles.popoverCloseBtn}>
            <X size={12} />
          </button>
        </div>

        <div className={styles.popoverBody}>
          <div className={styles.popoverControlGroup}>
            <label><span>Name Size</span><strong>{headerStyles.nameSize || 20}px</strong></label>
            <input
              type="range"
              min="14"
              max="36"
              step="0.5"
              value={headerStyles.nameSize || 20}
              onChange={(e) => updateHeaderStyle('nameSize', parseFloat(e.target.value))}
            />
          </div>

          <div className={styles.popoverControlGroup}>
            <label><span>Title Size</span><strong>{headerStyles.titleSize || 13}px</strong></label>
            <input
              type="range"
              min="10"
              max="24"
              step="0.5"
              value={headerStyles.titleSize || 13}
              onChange={(e) => updateHeaderStyle('titleSize', parseFloat(e.target.value))}
            />
          </div>

          <div className={styles.popoverControlGroup}>
            <label><span>Contacts Size</span><strong>{headerStyles.contactsSize || 11}px</strong></label>
            <input
              type="range"
              min="8"
              max="16"
              step="0.5"
              value={headerStyles.contactsSize || 11}
              onChange={(e) => updateHeaderStyle('contactsSize', parseFloat(e.target.value))}
            />
          </div>

          <div className={styles.popoverControlGroup}>
            <label><span>Contacts Gap</span><strong>{headerStyles.contactsGap || 8}px</strong></label>
            <input
              type="range"
              min="2"
              max="20"
              step="0.5"
              value={headerStyles.contactsGap || 8}
              onChange={(e) => updateHeaderStyle('contactsGap', parseFloat(e.target.value))}
            />
          </div>

          <div className={styles.popoverControlGroup}>
            <label><span>Personal Details Top Offset</span><strong>{headerStyles.contactsMarginTop !== undefined ? headerStyles.contactsMarginTop : 16}px</strong></label>
            <input
              type="range"
              min="0"
              max="80"
              step="0.5"
              value={headerStyles.contactsMarginTop !== undefined ? headerStyles.contactsMarginTop : 16}
              onChange={(e) => updateHeaderStyle('contactsMarginTop', parseFloat(e.target.value))}
            />
          </div>

          <div className={styles.popoverControlGroup}>
            <label><span>Header Margin Bottom</span><strong>{headerStyles.spacing || 20}px</strong></label>
            <input
              type="range"
              min="5"
              max="60"
              step="0.5"
              value={headerStyles.spacing || 20}
              onChange={(e) => updateHeaderStyle('spacing', parseFloat(e.target.value))}
            />
          </div>

          <div className={styles.popoverInlinePickers}>
            <div className={styles.popoverControlGroup}>
              <label>Name Color</label>
              <input
                type="color"
                value={headerStyles.nameColor || '#0f172a'}
                onChange={(e) => updateHeaderStyle('nameColor', e.target.value)}
              />
            </div>
            <div className={styles.popoverControlGroup}>
              <label>Title Color</label>
              <input
                type="color"
                value={headerStyles.titleColor || '#3d7ee6'}
                onChange={(e) => updateHeaderStyle('titleColor', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.popoverToggles}>
            <button
              type="button"
              className={`${styles.popoverToggleBtn} ${headerStyles.nameWeight === 'normal' ? styles.popoverToggleBtnActive : ''}`}
              onClick={() => updateHeaderStyle('nameWeight', headerStyles.nameWeight === 'normal' ? 'bold' : 'normal')}
              title="Toggle Bold Name"
            >
              <strong>N-Bold</strong>
            </button>
            <button
              type="button"
              className={`${styles.popoverToggleBtn} ${headerStyles.nameStyle === 'italic' ? styles.popoverToggleBtnActive : ''}`}
              onClick={() => updateHeaderStyle('nameStyle', headerStyles.nameStyle === 'italic' ? 'normal' : 'italic')}
              title="Toggle Italic Name"
            >
              <em>N-Italic</em>
            </button>
            <button
              type="button"
              className={`${styles.popoverToggleBtn} ${headerStyles.titleWeight === 'bold' ? styles.popoverToggleBtnActive : ''}`}
              onClick={() => updateHeaderStyle('titleWeight', headerStyles.titleWeight === 'bold' ? 'normal' : 'bold')}
              title="Toggle Bold Title"
            >
              <strong>T-Bold</strong>
            </button>
            <button
              type="button"
              className={`${styles.popoverToggleBtn} ${headerStyles.titleStyle === 'italic' ? styles.popoverToggleBtnActive : ''}`}
              onClick={() => updateHeaderStyle('titleStyle', headerStyles.titleStyle === 'italic' ? 'normal' : 'italic')}
              title="Toggle Italic Title"
            >
              <em>T-Italic</em>
            </button>
          </div>

          <div className={styles.popoverControlGroup} style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Profile Photo</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setEditablePersonalInfo(prev => ({ ...prev, image_url: reader.result as string }));
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ fontSize: '11px', width: '130px' }}
              />
              {editablePersonalInfo.image_url && (
                <button
                  type="button"
                  onClick={() => setEditablePersonalInfo(prev => ({ ...prev, image_url: '' }))}
                  style={{
                    padding: '2px 6px',
                    fontSize: '11px',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // On-Canvas Settings Popover for Sections
  const renderSectionSettingsPopover = (sectionId: string, sec: any) => {
    const localStyles = sec?.customStyles || {};

    const updateStyle = (key: string, value: any) => {
      setSections(prev => prev.map(s => s.id === sectionId ? {
        ...s,
        customStyles: { ...s.customStyles, [key]: value }
      } : s));
      window.dispatchEvent(new Event('cv-style-change'));
    };

    const topPos = popoverPosition ? Math.max(60, Math.min(window.innerHeight - 520, popoverPosition.top - 10)) : 100;
    const leftPos = popoverPosition ? Math.max(16, popoverPosition.left - 305) : 100;

    return createPortal(
      <div
        className={`${styles.portalPopoverCard} glass-card no-print`}
        style={{
          position: 'fixed',
          top: `${topPos}px`,
          left: `${leftPos}px`,
          width: '290px',
          zIndex: 999999
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.popoverHeader}>
          <h4>Customize {sec?.name}</h4>
          <button type="button" onClick={() => setActiveSectionSettings(null)} className={styles.popoverCloseBtn}>
            <X size={12} />
          </button>
        </div>

        <div className={styles.popoverBody}>
          <div className={styles.popoverControlGroup}>
            <label><span>Heading Size</span><strong>{localStyles.headingSize || 16}px</strong></label>
            <input
              type="range"
              min="12"
              max="32"
              step="0.5"
              value={localStyles.headingSize || 16}
              onChange={(e) => updateStyle('headingSize', parseFloat(e.target.value))}
            />
          </div>

          <div className={styles.popoverControlGroup}>
            <label><span>Text Size</span><strong>{localStyles.fontSize || 13}px</strong></label>
            <input
              type="range"
              min="10"
              max="24"
              step="0.5"
              value={localStyles.fontSize || 13}
              onChange={(e) => updateStyle('fontSize', parseFloat(e.target.value))}
            />
          </div>

          <div className={styles.popoverControlGroup}>
            <label><span>Line Height</span><strong>{localStyles.lineHeight || 1.4}</strong></label>
            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.05"
              value={localStyles.lineHeight || 1.4}
              onChange={(e) => updateStyle('lineHeight', parseFloat(e.target.value))}
            />
          </div>

          <div className={styles.popoverControlGroup}>
            <label><span>Section Spacing</span><strong>{localStyles.spacing || 20}px</strong></label>
            <input
              type="range"
              min="5"
              max="60"
              step="0.5"
              value={localStyles.spacing || 20}
              onChange={(e) => updateStyle('spacing', parseFloat(e.target.value))}
            />
          </div>

          <div className={styles.popoverControlGroup}>
            <label><span>Item Gap</span><strong>{localStyles.itemGap || 12}px</strong></label>
            <input
              type="range"
              min="0"
              max="40"
              step="0.5"
              value={localStyles.itemGap || 12}
              onChange={(e) => updateStyle('itemGap', parseFloat(e.target.value))}
            />
          </div>

          {sec?.type !== 'summary' && sec?.type !== 'skills' && (
            <div className={styles.popoverControlGroup}>
              <label><span>Bullet Spacing</span><strong>{localStyles.bulletSpacing || 4}px</strong></label>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={localStyles.bulletSpacing || 4}
                onChange={(e) => updateStyle('bulletSpacing', parseFloat(e.target.value))}
              />
            </div>
          )}

          <div className={styles.popoverInlinePickers}>
            <div className={styles.popoverControlGroup}>
              <label>Text Color</label>
              <input
                type="color"
                value={localStyles.textColor || '#334155'}
                onChange={(e) => updateStyle('textColor', e.target.value)}
              />
            </div>
            <div className={styles.popoverControlGroup}>
              <label>Heading Color</label>
              <input
                type="color"
                value={localStyles.headingColor || '#0f172a'}
                onChange={(e) => updateStyle('headingColor', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.popoverToggles}>
            <button
              type="button"
              className={`${styles.popoverToggleBtn} ${localStyles.fontWeight === 'bold' ? styles.popoverToggleBtnActive : ''}`}
              onClick={() => updateStyle('fontWeight', localStyles.fontWeight === 'bold' ? 'normal' : 'bold')}
              title="Toggle Bold Body Text"
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              className={`${styles.popoverToggleBtn} ${localStyles.fontStyle === 'italic' ? styles.popoverToggleBtnActive : ''}`}
              onClick={() => updateStyle('fontStyle', localStyles.fontStyle === 'italic' ? 'normal' : 'italic')}
              title="Toggle Italic Body Text"
            >
              <em>I</em>
            </button>

            <button
              type="button"
              className={`${styles.popoverToggleBtn} ${localStyles.headingWeight === 'normal' ? styles.popoverToggleBtnActive : ''}`}
              onClick={() => updateStyle('headingWeight', localStyles.headingWeight === 'normal' ? 'bold' : 'normal')}
              title="Toggle Bold Heading"
            >
              <strong>H-B</strong>
            </button>

            <button
              type="button"
              className={`${styles.popoverToggleBtn} ${localStyles.headingStyle === 'italic' ? styles.popoverToggleBtnActive : ''}`}
              onClick={() => updateStyle('headingStyle', localStyles.headingStyle === 'italic' ? 'normal' : 'italic')}
              title="Toggle Italic Heading"
            >
              <em>H-I</em>
            </button>
          </div>

          {sec?.type === 'custom' && (
            <div className={styles.popoverControlGroup}>
              <label><span>Format</span></label>
              <select
                value={sec.customFormat || 'bullets'}
                onChange={(e) => {
                  const val = e.target.value as 'bullets' | 'keyvalue';
                  setSections(prev => prev.map(s => s.id === sectionId ? {
                    ...s,
                    customFormat: val,
                    keyValuePairs: val === 'keyvalue' ? (s.keyValuePairs || [{ key: 'Label', value: 'Description' }]) : undefined
                  } : s));
                }}
                className={styles.popoverSelect}
              >
                <option value="bullets">Multi-bullet list</option>
                <option value="keyvalue">Key-Value list</option>
              </select>
            </div>
          )}

          <div className={styles.popoverActionsRow}>
            {sec?.type === 'experience' && (
              <button
                type="button"
                onClick={() => {
                  setEditableExperiences(prev => [...prev, {
                    id: `exp_${Date.now()}`,
                    company: 'Company Name',
                    position: 'Job Title',
                    location: 'City, Country',
                    start_date: 'Start Date',
                    end_date: 'End Date',
                    bullets: ['Add key achievement or responsibility...']
                  }]);
                }}
                className={styles.popoverAddBtn}
              >
                + Add Job
              </button>
            )}
            {sec?.type === 'projects' && (
              <button
                type="button"
                onClick={() => {
                  setEditableProjects(prev => [...prev, {
                    id: `proj_${Date.now()}`,
                    title: 'Project Title',
                    role: 'Your Role / Contributions',
                    date: 'Date Range',
                    bullets: ['Add key detail or outcome...']
                  }]);
                }}
                className={styles.popoverAddBtn}
              >
                + Add Project
              </button>
            )}
            {sec?.type === 'education' && (
              <button
                type="button"
                onClick={() => {
                  setEditableEducations(prev => [...prev, {
                    id: `edu_${Date.now()}`,
                    institution: 'School Name',
                    degree: 'Degree',
                    field_of_study: 'Field of Study',
                    start_date: 'Start Date',
                    end_date: 'End Date',
                    location: 'City, Country',
                    bullets: []
                  }]);
                }}
                className={styles.popoverAddBtn}
              >
                + Add Degree
              </button>
            )}
            {sec?.type === 'skills' && (
              <button
                type="button"
                onClick={() => {
                  const catName = window.prompt('Enter category name (e.g. databases, cloud):');
                  if (catName && catName.trim()) {
                    setEditableSkills(prev => [...prev, {
                      id: `sk_${Date.now()}`,
                      name: 'New Skill',
                      category: catName.trim().toLowerCase()
                    }]);
                  }
                }}
                className={styles.popoverAddBtn}
              >
                + Add Category
              </button>
            )}
            {sec?.type === 'custom' && (
              <button
                type="button"
                onClick={() => {
                  setSections(prev => prev.map(s => {
                    if (s.id === sectionId) {
                      if (s.customFormat === 'keyvalue') {
                        return {
                          ...s,
                          keyValuePairs: [...(s.keyValuePairs || []), { key: 'Label', value: 'Value details' }]
                        };
                      } else {
                        return {
                          ...s,
                          bullets: [...(s.bullets || []), 'New custom bullet details...']
                        };
                      }
                    }
                    return s;
                  }));
                }}
                className={styles.popoverAddBtn}
              >
                + Add Row
              </button>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // ----------------------------------------------------
  // UNIT RENDERING & TEMPLATES MATRIX
  // ----------------------------------------------------

  const renderUnit = (unit: RenderableUnit, isMeasuring: boolean = false) => {
    const isPP = template === 'pixel_perfect_pdf';
    const isGerman = template === 'german_style_cv';
    const isCreative = template === 'creative_tech';

    // Local section styles cascade config overrides
    const sec = sections.find(s => s.id === unit.sectionId);
    const localStyles = sec?.customStyles || {};

    // Spacing between sections vs gaps between items inside a section
    let spacingStyle: React.CSSProperties = {};
    if (unit.sectionId) {
      const isLastItem = (() => {
        if (sec?.type === 'summary' || sec?.type === 'custom') return true;
        if (sec?.type === 'experience') {
          return unit.type === 'experience-item' && unit.itemData?.id === editableExperiences[editableExperiences.length - 1]?.id;
        }
        if (sec?.type === 'projects') {
          return unit.type === 'project-item' && unit.itemData?.id === editableProjects[editableProjects.length - 1]?.id;
        }
        if (sec?.type === 'education') {
          return unit.type === 'education-item' && unit.itemData?.id === editableEducations[editableEducations.length - 1]?.id;
        }
        if (sec?.type === 'skills') {
          const langSkills = editableSkills.filter(sk => (sk.category || '').toLowerCase().trim() === 'languages');
          const itSkills = editableSkills.filter(sk => (sk.category || '').toLowerCase().trim() !== 'languages');
          const uniqueCats = Array.from(new Set(itSkills.map(sk => (sk.category || 'technical').toLowerCase().trim())));
          const itCategories = categoryOrder.filter(c => uniqueCats.includes(c));
          const extraCats = uniqueCats.filter(c => !itCategories.includes(c));
          const finalCategories = [...itCategories, ...extraCats];

          finalCategories.sort((a, b) => {
            const getCategoryOrderScore = (cat: string) => {
              const order = ['programming languages', 'frameworks & libraries', 'databases', 'cloud & devops', 'development tools', 'testing'];
              const idx = order.indexOf(cat.toLowerCase().trim());
              if (idx !== -1) return idx;
              if (cat.toLowerCase().trim() === 'languages') return 999;
              return 100;
            };
            return getCategoryOrderScore(a) - getCategoryOrderScore(b);
          });

          const lastCat = languagesFirst
            ? (finalCategories.length > 0 ? finalCategories[finalCategories.length - 1] : 'languages')
            : (langSkills.length > 0 ? 'languages' : finalCategories[finalCategories.length - 1]);

          if (unit.type === 'skills-languages') return lastCat === 'languages';
          if (unit.type === 'skills-category') return lastCat === unit.category;
        }
        return false;
      })();

      if (isLastItem) {
        if (localStyles.spacing !== undefined) {
          spacingStyle = { marginBottom: `${localStyles.spacing}px` };
        }
      } else {
        if (localStyles.itemGap !== undefined) {
          spacingStyle = { marginBottom: `${localStyles.itemGap}px` };
        }
      }
    }

    const mergedStyles = {
      '--section-font-size': localStyles.fontSize ? `${localStyles.fontSize}px` : undefined,
      '--section-spacing': localStyles.spacing ? `${localStyles.spacing}px` : undefined,
      '--section-alignment': localStyles.alignment || undefined,

      // Inline overrides
      fontSize: localStyles.fontSize ? `${localStyles.fontSize}px` : undefined,
      lineHeight: localStyles.lineHeight ? `${localStyles.lineHeight}` : undefined,
      color: localStyles.textColor ? localStyles.textColor : undefined,
      textAlign: localStyles.alignment ? localStyles.alignment : undefined,
      fontStyle: localStyles.fontStyle ? localStyles.fontStyle : undefined,
      fontWeight: localStyles.fontWeight ? localStyles.fontWeight : undefined,
      '--bullet-spacing': localStyles.bulletSpacing !== undefined ? `${localStyles.bulletSpacing}px` : undefined,
      ...spacingStyle,
    } as React.CSSProperties;


    const sectionClass = isPP ? styles.ppSection : styles.resumeSection;
    const titleClass = isPP ? styles.ppSectionTitle : (isGerman ? styles.germanSectionTitle : styles.resumeSectionTitle);

    // 1. Header Block Layouts
    if (unit.type === 'header') {
      const isHeaderSettingsOpen = activeSectionSettings === 'header';

      const headerControls = !isMeasuring && (
        <div className={`${styles.sectionControls} no-print`} style={{ top: '4px', left: '-36px', right: 'auto' }}>
          <button
            type="button"
            className={styles.itemSortBtn}
            title="Customize Header Styles"
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setPopoverPosition({ top: rect.top, left: rect.left });
              setActiveSectionSettings(isHeaderSettingsOpen ? null : 'header');
            }}
          >
            <Settings size={13} />
          </button>
        </div>
      );

      const nameStyleOverride = {
        fontSize: headerStyles.nameSize ? `${headerStyles.nameSize}px` : undefined,
        fontWeight: headerStyles.nameWeight ? headerStyles.nameWeight : undefined,
        fontStyle: headerStyles.nameStyle ? headerStyles.nameStyle : undefined,
        color: headerStyles.nameColor ? headerStyles.nameColor : undefined,
      };

      const titleStyleOverride = {
        fontSize: headerStyles.titleSize ? `${headerStyles.titleSize}px` : undefined,
        fontWeight: headerStyles.titleWeight ? headerStyles.titleWeight : undefined,
        fontStyle: headerStyles.titleStyle ? headerStyles.titleStyle : undefined,
        color: headerStyles.titleColor ? headerStyles.titleColor : '#3d7ee6',
      };

      const contactsStyleOverride = {
        fontSize: headerStyles.contactsSize ? `${headerStyles.contactsSize}px` : undefined,
        color: headerStyles.contactsColor ? headerStyles.contactsColor : undefined,
        gap: headerStyles.contactsGap ? `${headerStyles.contactsGap}px` : undefined,
        marginTop: headerStyles.contactsMarginTop !== undefined ? `${headerStyles.contactsMarginTop}px` : undefined,
      };

      const headerContainerStyle = {
        ...mergedStyles,
        marginBottom: headerStyles.spacing !== undefined ? `${headerStyles.spacing}px` : undefined,
        position: 'relative' as const,
      };

      if (isPP) {
        return (
          <div className={styles.ppHeader} style={headerContainerStyle}>
            {headerControls}
            {!isMeasuring && isHeaderSettingsOpen && renderHeaderSettingsPopover()}
            <div className={styles.ppHeaderLeft}>
              <h1 className={styles.ppName} style={nameStyleOverride}>
                <AutoSizeTextarea
                  style={nameStyleOverride}
                  value={editablePersonalInfo.full_name}
                  onChange={(val) => setEditablePersonalInfo(p => ({ ...p, full_name: val }))}
                />
              </h1>
              <h2 className={styles.ppTitle} style={titleStyleOverride}>
                <AutoSizeTextarea
                  style={titleStyleOverride}
                  value={editablePersonalInfo.title}
                  onChange={(val) => setEditablePersonalInfo(p => ({ ...p, title: val }))}
                />
              </h2>
              <div className={styles.ppContactGrid} style={contactsStyleOverride}>
                <div className={styles.ppContactCol}>
                  {!!editablePersonalInfo.location?.trim() && (
                    <div className={styles.ppContactItem}>
                      <span className={styles.ppContactLabel}>Address:</span>
                      <span className={styles.ppContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.location}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, location: val }))}
                        />
                      </span>
                    </div>
                  )}
                  {!!editablePersonalInfo.email?.trim() && (
                    <div className={styles.ppContactItem}>
                      <span className={styles.ppContactLabel}>Email:</span>
                      <span className={styles.ppContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.email}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, email: val }))}
                        />
                      </span>
                    </div>
                  )}
                  {!!editablePersonalInfo.website?.trim() && (
                    <div className={styles.ppContactItem}>
                      <span className={styles.ppContactLabel}>Website:</span>
                      <span className={styles.ppContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.website}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, website: val }))}
                        />
                      </span>
                    </div>
                  )}
                </div>
                <div className={styles.ppContactCol}>
                  {!!editablePersonalInfo.phone?.trim() && (
                    <div className={styles.ppContactItem}>
                      <span className={styles.ppContactLabel}>Phone:</span>
                      <span className={styles.ppContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.phone}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, phone: val }))}
                        />
                      </span>
                    </div>
                  )}
                  {!!editablePersonalInfo.linkedin?.trim() && (
                    <div className={styles.ppContactItem}>
                      <span className={styles.ppContactLabel}>LinkedIn:</span>
                      <span className={styles.ppContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.linkedin}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, linkedin: val }))}
                        />
                      </span>
                    </div>
                  )}
                  {!!editablePersonalInfo.github?.trim() && (
                    <div className={styles.ppContactItem}>
                      <span className={styles.ppContactLabel}>GitHub:</span>
                      <span className={styles.ppContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.github}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, github: val }))}
                        />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {editablePersonalInfo.image_url ? (
              <div className={styles.ppHeaderRight}>
                <img src={editablePersonalInfo.image_url} alt="Profile" className={styles.ppAvatar} />
              </div>
            ) : null}
          </div>
        );
      }

      if (isGerman) {
        return (
          <div className={styles.germanHeader} style={headerContainerStyle}>
            {headerControls}
            {!isMeasuring && isHeaderSettingsOpen && renderHeaderSettingsPopover()}
            <div className={styles.germanHeaderLeft}>
              <h1 className={styles.germanName} style={nameStyleOverride}>
                <AutoSizeTextarea
                  style={nameStyleOverride}
                  value={editablePersonalInfo.full_name}
                  onChange={(val) => setEditablePersonalInfo(p => ({ ...p, full_name: val }))}
                />
              </h1>
              <h2 className={styles.germanTitle} style={titleStyleOverride}>
                <AutoSizeTextarea
                  style={titleStyleOverride}
                  value={editablePersonalInfo.title}
                  onChange={(val) => setEditablePersonalInfo(p => ({ ...p, title: val }))}
                />
              </h2>
              <div className={styles.germanContactGrid} style={contactsStyleOverride}>
                <div className={styles.germanContactCol}>
                  {editablePersonalInfo.location && (
                    <div className={styles.germanContactItem}>
                      <span className={styles.germanContactLabel}>Anschrift:</span>
                      <span className={styles.germanContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.location}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, location: val }))}
                        />
                      </span>
                    </div>
                  )}
                  {editablePersonalInfo.email && (
                    <div className={styles.germanContactItem}>
                      <span className={styles.germanContactLabel}>E-Mail:</span>
                      <span className={styles.germanContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.email}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, email: val }))}
                        />
                      </span>
                    </div>
                  )}
                  {editablePersonalInfo.website && (
                    <div className={styles.germanContactItem}>
                      <span className={styles.germanContactLabel}>Website:</span>
                      <span className={styles.germanContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.website}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, website: val }))}
                        />
                      </span>
                    </div>
                  )}
                </div>
                <div className={styles.germanContactCol}>
                  {editablePersonalInfo.phone && (
                    <div className={styles.germanContactItem}>
                      <span className={styles.germanContactLabel}>Telefon:</span>
                      <span className={styles.germanContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.phone}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, phone: val }))}
                        />
                      </span>
                    </div>
                  )}
                  {editablePersonalInfo.linkedin && (
                    <div className={styles.germanContactItem}>
                      <span className={styles.germanContactLabel}>LinkedIn:</span>
                      <span className={styles.germanContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.linkedin}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, linkedin: val }))}
                        />
                      </span>
                    </div>
                  )}
                  {editablePersonalInfo.github && (
                    <div className={styles.germanContactItem}>
                      <span className={styles.germanContactLabel}>GitHub:</span>
                      <span className={styles.germanContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.github}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, github: val }))}
                        />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {editablePersonalInfo.image_url ? (
              <div className={styles.germanHeaderRight}>
                <img src={editablePersonalInfo.image_url} alt="Profilbild" className={styles.germanAvatar} />
              </div>
            ) : null}
          </div>
        );
      }

      // Classic standard stacked header fallback
      return (
        <div className={styles.resumeHeader} style={headerContainerStyle}>
          {headerControls}
          {!isMeasuring && isHeaderSettingsOpen && renderHeaderSettingsPopover()}
          <div className={styles.headerMain}>
            {editablePersonalInfo.image_url && (
              <img src={editablePersonalInfo.image_url} alt="Profile" className={styles.profileAvatar} />
            )}
            <div className={styles.headerText}>
              <h2 style={nameStyleOverride}>
                <AutoSizeTextarea
                  style={nameStyleOverride}
                  value={editablePersonalInfo.full_name}
                  onChange={(val) => setEditablePersonalInfo(p => ({ ...p, full_name: val }))}
                />
              </h2>
              <p className={styles.resumeTitle} style={titleStyleOverride}>
                <AutoSizeTextarea
                  style={titleStyleOverride}
                  value={editablePersonalInfo.title}
                  onChange={(val) => setEditablePersonalInfo(p => ({ ...p, title: val }))}
                />
              </p>
            </div>
          </div>
          <div className={styles.resumeContacts} style={contactsStyleOverride}>
            {editablePersonalInfo.location && (
              <AutoSizeTextarea
                value={editablePersonalInfo.location}
                onChange={(val) => setEditablePersonalInfo(p => ({ ...p, location: val }))}
              />
            )}
            {editablePersonalInfo.email && (
              <>
                {editablePersonalInfo.location && <span>•</span>}
                <AutoSizeTextarea
                  value={editablePersonalInfo.email}
                  onChange={(val) => setEditablePersonalInfo(p => ({ ...p, email: val }))}
                />
              </>
            )}
            {editablePersonalInfo.website && (
              <>
                {(editablePersonalInfo.location || editablePersonalInfo.email) && <span>•</span>}
                <AutoSizeTextarea
                  value={editablePersonalInfo.website}
                  onChange={(val) => setEditablePersonalInfo(p => ({ ...p, website: val }))}
                />
              </>
            )}
            {editablePersonalInfo.phone && (
              <>
                {(editablePersonalInfo.location || editablePersonalInfo.email || editablePersonalInfo.website) && <span>•</span>}
                <AutoSizeTextarea
                  value={editablePersonalInfo.phone}
                  onChange={(val) => setEditablePersonalInfo(p => ({ ...p, phone: val }))}
                />
              </>
            )}
            {editablePersonalInfo.linkedin && (
              <>
                {(editablePersonalInfo.location || editablePersonalInfo.email || editablePersonalInfo.website || editablePersonalInfo.phone) && <span>•</span>}
                <AutoSizeTextarea
                  value={editablePersonalInfo.linkedin}
                  onChange={(val) => setEditablePersonalInfo(p => ({ ...p, linkedin: val }))}
                />
              </>
            )}
            {editablePersonalInfo.github && (
              <>
                {(editablePersonalInfo.location || editablePersonalInfo.email || editablePersonalInfo.website || editablePersonalInfo.phone || editablePersonalInfo.linkedin) && <span>•</span>}
                <AutoSizeTextarea
                  value={editablePersonalInfo.github}
                  onChange={(val) => setEditablePersonalInfo(p => ({ ...p, github: val }))}
                />
              </>
            )}
          </div>
        </div>
      );
    }

    // 2. Section Title
    if (unit.type === 'section-title') {
      const isSettingsOpen = activeSectionSettings === unit.sectionId;
      return (
        <div className={styles.sectionHeaderWrapper} style={mergedStyles}>
          {/* Section Reordering Canvas overlay controls */}
          {!isMeasuring && (
            <div className={`${styles.sectionControls} no-print`}>
              <button
                type="button"
                className={styles.itemSortBtn}
                title="Customize Section Styles"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setPopoverPosition({ top: rect.top, left: rect.left });
                  setActiveSectionSettings(isSettingsOpen ? null : unit.sectionId!);
                }}
              >
                <Settings size={13} />
              </button>
              <button
                type="button"
                className={styles.deleteBlockBtn}
                title="Hide Section"
                onClick={() => {
                  if (window.confirm(`Hide section "${unit.titleText}"? You can re-enable it in the sidebar.`)) {
                    setSections(prev => prev.map(s => s.id === unit.sectionId ? { ...s, visible: false } : s));
                  }
                }}
              >
                <X size={10} />
              </button>
            </div>
          )}
          {(() => {
            const formattedTitleNode = renderFormattedTitle(
              sec?.name || unit.titleText || '',
              localStyles.headingColor || customStyles.accentColor,
              localStyles.headingSecondaryColor || customStyles.headingSecondaryColor || '#3d7ee6'
            );
            return (
              <h3 className={titleClass} style={{
                textTransform: 'uppercase',
                fontSize: localStyles.headingSize ? `${localStyles.headingSize}px` : undefined,
                color: localStyles.headingColor ? localStyles.headingColor : undefined,
                fontWeight: localStyles.headingWeight ? localStyles.headingWeight : undefined,
                fontStyle: localStyles.headingStyle ? localStyles.headingStyle : undefined,
                textAlign: localStyles.headingAlignment ? localStyles.headingAlignment : undefined,
              } as React.CSSProperties}>
                {formattedTitleNode && editingSectionTitleId !== unit.sectionId ? (
                  <span onClick={() => setEditingSectionTitleId(unit.sectionId!)} style={{ cursor: 'pointer', display: 'inline-block', width: '100%' }}>
                    {formattedTitleNode}
                  </span>
                ) : (
                  <AutoSizeTextarea
                    value={unit.titleText || ''}
                    onChange={(val) => setSections(prev => prev.map(s => s.id === unit.sectionId ? { ...s, name: val } : s))}
                    onBlur={() => setEditingSectionTitleId(null)}
                  />
                )}
              </h3>
            );
          })()}

          {!isMeasuring && isSettingsOpen && renderSectionSettingsPopover(unit.sectionId!, sec)}
        </div>
      );
    }


    // 3. Summary Content
    if (unit.type === 'summary') {
      const summaryAlerts = getAlertsFor('summary');
      return (
        <div
          className={`${styles.summaryBox} ${styles.canvasHoverBlock} ${!reviewedActions['summary'] ? styles.aiHighlighted : ''}`}
          style={mergedStyles}
          onMouseEnter={() => handleMouseEnterSuggestion('summary')}
          onMouseLeave={handleMouseLeaveSuggestion}
        >
          {renderHoverAiControls('summary', editableSummary, [
            { label: "Punchier", prompt: "Make concise and punchier with strong executive tone" },
            { label: "Leadership", prompt: "Highlight leadership, technical strategy, and architecture" },
            { label: "Metrics & Impact", prompt: "Focus on quantifiable business metrics and project ROI" }
          ])}

          {isRephrasing['summary'] ? (
            <div className={styles.canvasSkeletonBlock}>
              <div className={styles.skeletonLine} style={{ width: '96%' }} />
              <div className={styles.skeletonLine} style={{ width: '90%' }} />
              <div className={styles.skeletonLine} style={{ width: '72%' }} />
            </div>
          ) : (
            <AutoSizeTextarea
              value={editableSummary}
              onChange={(val) => setEditableSummary(val)}
            />
          )}
        </div>
      );
    }

    // 4. Experience Card Item
    if (unit.type === 'experience-item') {
      const exp = unit.itemData;
      const expIdx = unit.itemIndex!;
      const expAlerts = getAlertsFor(exp.id);
      const hasAIChange = !reviewedActions[exp.id];

      return (
        <div
          className={`${isPP ? styles.ppSectionRow : (isGerman ? styles.germanRow : styles.resumeItem)}`}
          style={{ ...mergedStyles, position: 'relative' }}
        >
          {/* Card Sort/Trash controls */}
          {!isMeasuring && (
            <div className={`${styles.itemControls} no-print`}>
              <button
                type="button"
                disabled={expIdx === 0}
                onClick={() => handleMoveExperience(expIdx, 'up')}
                className={styles.itemSortBtn}
                title="Move Up"
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                disabled={expIdx === editableExperiences.length - 1}
                onClick={() => handleMoveExperience(expIdx, 'down')}
                className={styles.itemSortBtn}
                title="Move Down"
              >
                <ArrowDown size={12} />
              </button>
              <button
                type="button"
                onClick={() => handleAddExperienceBullet(expIdx)}
                className={styles.itemSortBtn}
                title="Add Bullet Point"
              >
                <Plus size={10} />
              </button>
              <button
                type="button"
                onClick={() => setEditableExperiences(prev => prev.filter(e => e.id !== exp.id))}
                className={styles.deleteBlockBtn}
                title="Exclude item"
              >
                <Trash size={12} />
              </button>
            </div>
          )}

          {isPP || isGerman ? (
            <>
              <div className={isPP ? styles.ppLeftCol : styles.germanLeftCol}>
                <span className={isPP ? styles.ppDateRange : styles.germanDateRange}>
                  <AutoSizeTextarea
                    value={`${exp.start_date || ''} - ${exp.end_date || ''}`}
                    onChange={(val) => {
                      const parts = val.split(' - ');
                      setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, start_date: parts[0] || '', end_date: parts[1] || '' } : e));
                    }}
                  />
                </span>
              </div>
              <div className={isPP ? styles.ppRightCol : styles.germanRightCol}>
                <h4 className={isPP ? styles.ppJobTitle : styles.germanJobTitle}>
                  <AutoSizeTextarea
                    value={exp.position || ''}
                    onChange={(val) => setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, position: val } : e))}
                  />
                </h4>
                <div className={isPP ? styles.ppJobMeta : styles.germanJobMeta}>
                  <span className={isPP ? styles.ppCompany : styles.germanCompany}>
                    <AutoSizeTextarea
                      value={`${exp.company || ''}${exp.location ? `, ${exp.location}` : ''}`}
                      onChange={(val) => {
                        const commaIndex = val.indexOf(',');
                        let newComp = val;
                        let newLoc = '';
                        if (commaIndex !== -1) {
                          newComp = val.substring(0, commaIndex).trim();
                          newLoc = val.substring(commaIndex + 1).trim();
                        }
                        setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, company: newComp, location: newLoc } : e));
                      }}
                    />
                  </span>
                </div>

                <div
                  className={`${hasAIChange ? styles.aiHighlighted : ''}`}
                  onMouseEnter={() => handleMouseEnterSuggestion(exp.id)}
                  onMouseLeave={handleMouseLeaveSuggestion}
                  style={{ width: '100%' }}
                >
                  <ul className={isPP ? styles.ppBulletsList : styles.germanBulletsList}>
                    {exp.bullets.map((bullet: string, bulletIdx: number) => {
                      const inputId = `bullet-input-experience-${exp.id}-${bulletIdx}`;
                      const key = `exp-bullet-${expIdx}-${bulletIdx}`;
                      return (
                        <li key={bulletIdx} className={`${isPP ? styles.ppBulletItem : styles.germanBulletItem} ${styles.canvasHoverBlock}`} style={{ position: 'relative' }}>
                          <span className={styles.bulletDot} />
                          {renderHoverAiControls(key, bullet, [
                            { label: "Action Verbs", prompt: "Make it punchier starting with strong active verbs" },
                            { label: "Metrics & ROI", prompt: "Highlight quantifiable metrics, percentage gains, or ROI" },
                            { label: "ATS Tech", prompt: "Inject relevant technical tools and framework details" }
                          ])}
                          {!isMeasuring && (
                            <div className={`${styles.bulletControls} no-print`} style={{ right: '115px' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveExperienceBullet(expIdx, bulletIdx)}
                                className={styles.deleteBulletBtn}
                                title="Delete bullet"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          )}

                          <div className={styles.bulletContent}>
                            {isRephrasing[key] ? (
                              <div className={styles.canvasSkeletonBlock}>
                                <div className={styles.skeletonLine} style={{ width: '92%' }} />
                              </div>
                            ) : (
                              <AutoSizeTextarea
                                id={inputId}
                                value={bullet}
                                onChange={(val) => setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? {
                                  ...e,
                                  bullets: e.bullets.map((b, bI) => bI === bulletIdx ? val : b)
                                } : e))}
                                onKeyDown={(e) => handleBulletKeyDown(e, 'experience', exp.id, expIdx, bulletIdx, exp.bullets)}
                              />
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            // Classic Stacked Layout
            <div style={{ width: '100%' }}>
              <div className={styles.itemMeta}>
                <strong style={{ color: '#3d7ee6', fontSize: 'calc(var(--base-font-size, 13px) * 0.92)' }}>
                  <AutoSizeTextarea
                    value={exp.position || ''}
                    onChange={(val) => setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, position: val } : e))}
                  />
                </strong>
                <span style={{ fontSize: 'calc(var(--base-font-size, 13px) * 0.92)' }}>
                  <AutoSizeTextarea
                    value={`${exp.start_date || ''} - ${exp.end_date || ''}`}
                    onChange={(val) => {
                      const parts = val.split(' - ');
                      setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, start_date: parts[0] || '', end_date: parts[1] || '' } : e));
                    }}
                  />
                </span>
              </div>
              <div className={styles.itemCompany}>
                <AutoSizeTextarea
                  value={`${exp.company || ''}${exp.location ? `, ${exp.location}` : ''}`}
                  onChange={(val) => {
                    const commaIndex = val.indexOf(',');
                    let newComp = val;
                    let newLoc = '';
                    if (commaIndex !== -1) {
                      newComp = val.substring(0, commaIndex).trim();
                      newLoc = val.substring(commaIndex + 1).trim();
                    }
                    setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, company: newComp, location: newLoc } : e));
                  }}
                />
              </div>

              <div
                className={`${hasAIChange ? styles.aiHighlighted : ''}`}
                onMouseEnter={() => handleMouseEnterSuggestion(exp.id)}
                onMouseLeave={handleMouseLeaveSuggestion}
                style={{ width: '100%' }}
              >
                <ul className={styles.bulletsList}>
                  {exp.bullets.map((bullet: string, bulletIdx: number) => {
                    const inputId = `bullet-input-experience-${exp.id}-${bulletIdx}`;
                    const key = `exp-bullet-${expIdx}-${bulletIdx}`;
                    return (
                      <li key={bulletIdx} className={`${styles.bulletItem} ${styles.canvasHoverBlock}`} style={{ position: 'relative' }}>
                        <span className={styles.bulletDot} />
                        {renderHoverAiControls(key, bullet, [
                          { label: "Action Verbs", prompt: "Make it punchier starting with strong active verbs" },
                          { label: "Metrics & ROI", prompt: "Highlight quantifiable metrics, percentage gains, or ROI" },
                          { label: "ATS Tech", prompt: "Inject relevant technical tools and framework details" }
                        ])}
                        {!isMeasuring && (
                          <div className={`${styles.bulletControls} no-print`} style={{ right: '115px' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveExperienceBullet(expIdx, bulletIdx)}
                              className={styles.deleteBulletBtn}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        )}

                        <div className={styles.bulletContent}>
                          {isRephrasing[key] ? (
                            <div className={styles.canvasSkeletonBlock}>
                              <div className={styles.skeletonLine} style={{ width: '92%' }} />
                            </div>
                          ) : (
                            <AutoSizeTextarea
                              id={inputId}
                              value={bullet}
                              onChange={(val) => setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? {
                                ...e,
                                bullets: e.bullets.map((b, bI) => bI === bulletIdx ? val : b)
                              } : e))}
                              onKeyDown={(e) => handleBulletKeyDown(e, 'experience', exp.id, expIdx, bulletIdx, exp.bullets)}
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 5. Project Card Item
    if (unit.type === 'project-item') {
      const proj = unit.itemData;
      const projIdx = unit.itemIndex!;
      const hasRole = Boolean(proj.role && proj.role.trim());
      const techString = Array.isArray(proj.technologies)
        ? proj.technologies.join(', ')
        : (proj.technologies || '');

      return (
        <div
          className={`${isPP ? styles.ppSectionRow : (isGerman ? styles.germanRow : styles.resumeItem)}`}
          style={{ ...mergedStyles, position: 'relative' }}
        >
          {!isMeasuring && (
            <div className={`${styles.itemControls} no-print`}>
              <button
                type="button"
                disabled={projIdx === 0}
                onClick={() => handleMoveProject(projIdx, 'up')}
                className={styles.itemSortBtn}
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                disabled={projIdx === editableProjects.length - 1}
                onClick={() => handleMoveProject(projIdx, 'down')}
                className={styles.itemSortBtn}
              >
                <ArrowDown size={12} />
              </button>
              <button
                type="button"
                onClick={() => handleAddProjectBullet(projIdx)}
                className={styles.itemSortBtn}
              >
                <Plus size={10} />
              </button>
              <button
                type="button"
                onClick={() => setEditableProjects(prev => prev.filter(p => p.id !== proj.id))}
                className={styles.deleteBlockBtn}
              >
                <Trash size={12} />
              </button>
            </div>
          )}

          {isPP || isGerman ? (
            <>
              <div className={isPP ? styles.ppLeftCol : styles.germanLeftCol}>
                <h4 className={isPP ? styles.ppProjectTitle : styles.germanDegree}>
                  <AutoSizeTextarea
                    value={proj.title || ''}
                    onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? { ...p, title: val } : p))}
                  />
                </h4>
              </div>
              <div className={isPP ? styles.ppRightCol : styles.germanRightCol}>
                <div style={{ display: 'flex', gap: '8px', fontSize: '1em', color: '#64748b', paddingTop: '0px', flexWrap: 'wrap', alignItems: 'baseline', width: '100%' }}>
                  {hasRole ? (
                    <span style={{ fontWeight: 800, flex: 1, minWidth: '100px' }}>
                      <AutoSizeTextarea
                        value={proj.role || ''}
                        onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? { ...p, role: val } : p))}
                      />
                    </span>
                  ) : (
                    <span style={{ fontWeight: 600, flex: 1, minWidth: '100px', fontStyle: 'italic', color: '#64748b' }}>
                      <AutoSizeTextarea
                        value={techString}
                        placeholder="Technologies used (e.g. React, Node.js, Python)..."
                        onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? {
                          ...p,
                          technologies: val.includes(',') ? val.split(',').map(t => t.trim()) : (val ? [val] : [])
                        } : p))}
                      />
                    </span>
                  )}
                  {(hasRole || techString || proj.date) && proj.date && <span style={{ flexShrink: 0 }}>•</span>}
                  {proj.date && (
                    <span style={{ flexShrink: 0 }}>
                      <AutoSizeTextarea
                        singleLine
                        value={proj.date || ''}
                        onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? { ...p, date: val } : p))}
                      />
                    </span>
                  )}
                </div>
                <ul className={isPP ? styles.ppBulletsList : styles.germanBulletsList}>
                  {proj.bullets.map((bullet: string, bulletIdx: number) => {
                    const inputId = `bullet-input-project-${proj.id}-${bulletIdx}`;
                    const key = `proj-bullet-${projIdx}-${bulletIdx}`;
                    return (
                      <li key={bulletIdx} className={`${isPP ? styles.ppBulletItem : styles.germanBulletItem} ${styles.canvasHoverBlock}`} style={{ position: 'relative' }}>
                        <span className={styles.bulletDot} />
                        {renderHoverAiControls(key, bullet, [
                          { label: "Action Verbs", prompt: "Make it punchier with strong active verbs" },
                          { label: "Tech Stack", prompt: "Highlight modern tech stack & system architecture" },
                          { label: "Deliverables", prompt: "Focus on technical deliverables, scope, and results" }
                        ])}
                        {!isMeasuring && (
                          <div className={`${styles.bulletControls} no-print`} style={{ right: '115px' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveProjectBullet(projIdx, bulletIdx)}
                              className={styles.deleteBulletBtn}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        )}

                        <div className={styles.bulletContent}>
                          {isRephrasing[key] ? (
                            <div className={styles.canvasSkeletonBlock}>
                              <div className={styles.skeletonLine} style={{ width: '92%' }} />
                            </div>
                          ) : (
                            <AutoSizeTextarea
                              id={inputId}
                              value={bullet}
                              onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? {
                                ...p,
                                bullets: p.bullets.map((b, bI) => bI === bulletIdx ? val : b)
                              } : p))}
                              onKeyDown={(e) => handleBulletKeyDown(e, 'project', proj.id, projIdx, bulletIdx, proj.bullets)}
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          ) : (
            // Classic stacked projects layout
            <div style={{ width: '100%' }}>
              <div className={styles.itemMeta}>
                <strong>
                  <AutoSizeTextarea
                    value={proj.title || ''}
                    onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? { ...p, title: val } : p))}
                  />
                </strong>
                <span>
                  <AutoSizeTextarea
                    value={proj.date || ''}
                    onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? { ...p, date: val } : p))}
                  />
                </span>
              </div>
              {hasRole ? (
                <p className={styles.itemCompany}>
                  <AutoSizeTextarea
                    value={proj.role || ''}
                    onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? { ...p, role: val } : p))}
                  />
                </p>
              ) : (
                <p className={styles.itemCompany} style={{ fontStyle: 'italic', color: '#64748b' }}>
                  <AutoSizeTextarea
                    value={techString}
                    placeholder="Technologies used (e.g. React, Node.js, Python)..."
                    onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? {
                      ...p,
                      technologies: val.includes(',') ? val.split(',').map(t => t.trim()) : (val ? [val] : [])
                    } : p))}
                  />
                </p>
              )}
              <ul className={styles.bulletsList}>
                {proj.bullets.map((bullet: string, bulletIdx: number) => {
                  const inputId = `bullet-input-project-${proj.id}-${bulletIdx}`;
                  const key = `proj-bullet-${projIdx}-${bulletIdx}`;
                  return (
                    <li key={bulletIdx} className={`${styles.bulletItem} ${styles.canvasHoverBlock}`} style={{ position: 'relative' }}>
                      <span className={styles.bulletDot} />
                      {renderHoverAiControls(key, bullet, [
                        { label: "Action Verbs", prompt: "Make it punchier with strong active verbs" },
                        { label: "Tech Stack", prompt: "Highlight modern tech stack & system architecture" },
                        { label: "Deliverables", prompt: "Focus on technical deliverables, scope, and results" }
                      ])}
                      {!isMeasuring && (
                        <div className={`${styles.bulletControls} no-print`} style={{ right: '115px' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveProjectBullet(projIdx, bulletIdx)}
                            className={styles.deleteBulletBtn}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      )}

                      <div className={styles.bulletContent}>
                        {isRephrasing[key] ? (
                          <div className={styles.canvasSkeletonBlock}>
                            <div className={styles.skeletonLine} style={{ width: '92%' }} />
                          </div>
                        ) : (
                          <AutoSizeTextarea
                            id={inputId}
                            value={bullet}
                            onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? {
                              ...p,
                              bullets: p.bullets.map((b, bI) => bI === bulletIdx ? val : b)
                            } : p))}
                            onKeyDown={(e) => handleBulletKeyDown(e, 'project', proj.id, projIdx, bulletIdx, proj.bullets)}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      );
    }

    // 6. Education Card Item
    if (unit.type === 'education-item') {
      const edu = unit.itemData;
      const eduIdx = unit.itemIndex!;

      return (
        <div
          className={`${isPP ? styles.ppSectionRow : (isGerman ? styles.germanRow : styles.resumeItem)}`}
          style={{ ...mergedStyles, position: 'relative' }}
        >
          {!isMeasuring && (
            <div className={`${styles.itemControls} no-print`}>
              <button
                type="button"
                disabled={eduIdx === 0}
                onClick={() => handleMoveEducation(eduIdx, 'up')}
                className={styles.itemSortBtn}
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                disabled={eduIdx === editableEducations.length - 1}
                onClick={() => handleMoveEducation(eduIdx, 'down')}
                className={styles.itemSortBtn}
              >
                <ArrowDown size={12} />
              </button>
              <button
                type="button"
                onClick={() => handleAddEducationBullet(eduIdx)}
                className={styles.itemSortBtn}
                title="Add Bullet Point"
              >
                <Plus size={10} />
              </button>
              <button
                type="button"
                onClick={() => setEditableEducations(prev => prev.filter(e => e.id !== edu.id))}
                className={styles.deleteBlockBtn}
              >
                <Trash size={12} />
              </button>
            </div>
          )}

          {isPP || isGerman ? (
            <>
              <div className={isPP ? styles.ppLeftCol : styles.germanLeftCol}>
                <span className={isPP ? styles.ppDateRange : styles.germanDateRange}>
                  <AutoSizeTextarea
                    value={`${edu.start_date || ''} - ${edu.end_date || ''}`}
                    onChange={(val) => {
                      const parts = val.split(' - ');
                      setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, start_date: parts[0] || '', end_date: parts[1] || '' } : e));
                    }}
                  />
                </span>
              </div>
              <div className={isPP ? styles.ppRightCol : styles.germanRightCol}>
                <h4 className={isPP ? styles.ppDegree : styles.germanDegree} style={{ color: '#3d7ee6' }}>
                  <AutoSizeTextarea
                    value={`${edu.degree || ''}${edu.field_of_study ? ` in ${edu.field_of_study}` : ''}`}
                    onChange={(val) => {
                      const index = val.toLowerCase().indexOf(' in ');
                      let newDegree = val;
                      let newField = '';
                      if (index !== -1) {
                        newDegree = val.substring(0, index).trim();
                        newField = val.substring(index + 4).trim();
                      }
                      setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, degree: newDegree, field_of_study: newField } : e));
                    }}
                  />
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div className={isPP ? styles.ppCompany : styles.germanCompany} style={{ fontWeight: 600 }}>
                    <AutoSizeTextarea
                      value={edu.institution || ''}
                      onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, institution: val } : e))}
                    />
                  </div>
                  <div className={isPP ? styles.ppLocation : styles.germanLocation} style={{ fontWeight: 400, opacity: 0.8 }}>
                    <AutoSizeTextarea
                      value={edu.location || ''}
                      onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, location: val } : e))}
                    />
                  </div>
                </div>

                <ul className={isPP ? styles.ppBulletsList : styles.germanBulletsList}>
                  {(edu.bullets || []).map((bullet: string, bulletIdx: number) => {
                    const inputId = `bullet-input-education-${edu.id}-${bulletIdx}`;
                    const key = `edu-bullet-${eduIdx}-${bulletIdx}`;
                    return (
                      <li key={bulletIdx} className={`${isPP ? styles.ppBulletItem : styles.germanBulletItem} ${styles.canvasHoverBlock}`} style={{ position: 'relative' }}>
                        <span className={styles.bulletDot} />
                        {renderHoverAiControls(key, bullet, [
                          { label: "Concise", prompt: "Make concise and academic" },
                          { label: "Coursework", prompt: "Highlight key relevant technical coursework & projects" },
                          { label: "Honors", prompt: "Emphasize honors, GPA, or academic distinctions" }
                        ])}
                        {!isMeasuring && (
                          <div className={`${styles.bulletControls} no-print`} style={{ right: '115px' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveEducationBullet(eduIdx, bulletIdx)}
                              className={styles.deleteBulletBtn}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        )}

                        <div className={styles.bulletContent}>
                          {isRephrasing[key] ? (
                            <div className={styles.canvasSkeletonBlock}>
                              <div className={styles.skeletonLine} style={{ width: '92%' }} />
                            </div>
                          ) : (
                            <AutoSizeTextarea
                              id={inputId}
                              value={bullet}
                              onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? {
                                ...e,
                                bullets: (e.bullets || []).map((b: string, bI: number) => bI === bulletIdx ? val : b)
                              } : e))}
                              onKeyDown={(e) => handleBulletKeyDown(e, 'education', edu.id, eduIdx, bulletIdx, edu.bullets || [])}
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          ) : (
            // Classic stacked education layout
            <div style={{ width: '100%' }}>
              <div className={styles.itemMeta}>
                <strong style={{ color: '#3d7ee6' }}>
                  <AutoSizeTextarea
                    value={`${edu.degree || ''}${edu.field_of_study ? ` in ${edu.field_of_study}` : ''}`}
                    onChange={(val) => {
                      const index = val.toLowerCase().indexOf(' in ');
                      let newDegree = val;
                      let newField = '';
                      if (index !== -1) {
                        newDegree = val.substring(0, index).trim();
                        newField = val.substring(index + 4).trim();
                      }
                      setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, degree: newDegree, field_of_study: newField } : e));
                    }}
                  />
                </strong>
                <span>
                  <AutoSizeTextarea
                    value={`${edu.start_date || ''} - ${edu.end_date || ''}`}
                    onChange={(val) => {
                      const parts = val.split(' - ');
                      setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, start_date: parts[0] || '', end_date: parts[1] || '' } : e));
                    }}
                  />
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                <div className={styles.itemCompany} style={{ fontWeight: 600 }}>
                  <AutoSizeTextarea
                    value={edu.institution || ''}
                    onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, institution: val } : e))}
                  />
                </div>
                <div style={{ fontSize: '0.85em', color: '#64748b', fontWeight: 400, opacity: 0.8 }}>
                  <AutoSizeTextarea
                    value={edu.location || ''}
                    onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, location: val } : e))}
                  />
                </div>
              </div>

              <ul className={styles.bulletsList}>
                {(edu.bullets || []).map((bullet: string, bulletIdx: number) => {
                  const inputId = `bullet-input-education-${edu.id}-${bulletIdx}`;
                  const key = `edu-bullet-${eduIdx}-${bulletIdx}`;
                  return (
                    <li key={bulletIdx} className={`${styles.bulletItem} ${styles.canvasHoverBlock}`} style={{ position: 'relative' }}>
                      <span className={styles.bulletDot} />
                      {renderHoverAiControls(key, bullet, [
                        { label: "Concise", prompt: "Make concise and academic" },
                        { label: "Coursework", prompt: "Highlight key relevant technical coursework & projects" },
                        { label: "Honors", prompt: "Emphasize honors, GPA, or academic distinctions" }
                      ])}
                      {!isMeasuring && (
                        <div className={`${styles.bulletControls} no-print`} style={{ right: '115px' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveEducationBullet(eduIdx, bulletIdx)}
                            className={styles.deleteBulletBtn}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      )}

                      <div className={styles.bulletContent}>
                        {isRephrasing[key] ? (
                          <div className={styles.canvasSkeletonBlock}>
                            <div className={styles.skeletonLine} style={{ width: '92%' }} />
                          </div>
                        ) : (
                          <AutoSizeTextarea
                            id={inputId}
                            value={bullet}
                            onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? {
                              ...e,
                              bullets: (e.bullets || []).map((b: string, bI: number) => bI === bulletIdx ? val : b)
                            } : e))}
                            onKeyDown={(e) => handleBulletKeyDown(e, 'education', edu.id, eduIdx, bulletIdx, edu.bullets || [])}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      );
    }


    // 7. Languages Block (Dedicated Subsection)
    if (unit.type === 'skills-languages') {
      const skillsList = unit.skills || [];
      const subTitle = targetLanguage === 'de' ? 'Sprachen' : 'Languages';

      return (
        <div
          style={{ ...mergedStyles, position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', marginTop: '6px', marginBottom: '8px' }}
        >
          {!isMeasuring && (
            <div className={`${styles.itemControls} no-print`} style={{ left: '-48px' }}>
              <button type="button" disabled={languagesFirst} onClick={() => setLanguagesFirst(true)} className={styles.itemSortBtn} title="Move Up"><ArrowUp size={12} /></button>
              <button type="button" disabled={!languagesFirst} onClick={() => setLanguagesFirst(false)} className={styles.itemSortBtn} title="Move Down"><ArrowDown size={12} /></button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Delete languages?")) {
                    setEditableSkills(prev => prev.filter(s => (s.category || '').toLowerCase().trim() !== 'languages'));
                  }
                }}
                className={styles.deleteBlockBtn}
                title="Delete languages"
              >
                <Trash size={12} />
              </button>
            </div>
          )}

          {/* Dedicated Subsection Sub-heading */}
          <div style={{ fontWeight: 700, fontSize: '1.05em', color: 'var(--accent-color, #0f172a)', marginBottom: '4px' }}>
            <AutoSizeTextarea
              value={languagesTitle || (targetLanguage === 'de' ? 'Sprachen' : 'Languages')}
              onChange={(val) => setLanguagesTitle(val)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '24px', width: '100%' }}>
            <span className={styles.bulletDot} />
            <div style={{ flex: 1 }}>
              {(() => {
                const rawLangs = skillsList.map(s => s.name).join(', ');
                const formattedNode = renderFormattedLanguageList(rawLangs);
                return formattedNode && editingLanguagesId !== unit.id ? (
                  <div onClick={() => setEditingLanguagesId(unit.id!)} style={{ cursor: 'pointer', minHeight: '1.2em' }}>
                    {formattedNode}
                  </div>
                ) : (
                  <AutoSizeTextarea
                    value={rawLangs}
                    onChange={(val) => {
                      const names = val.split(',').map(n => n.trim()).filter(Boolean);
                      setEditableSkills(prev => {
                        const nonLang = prev.filter(s => (s.category || '').toLowerCase().trim() !== 'languages');
                        const updatedLangs = names.map((name, i) => ({
                          id: `lang_${i}_${Date.now()}`,
                          name,
                          category: 'languages'
                        }));
                        return [...nonLang, ...updatedLangs];
                      });
                    }}
                    onBlur={() => setEditingLanguagesId(null)}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      );
    }

    // 8. Skills Category Block
    if (unit.type === 'skills-category') {
      const skillsList = unit.skills || [];
      const cat = unit.category!;
      const catLabel = getLocalizedCategoryName(cat);

      return (
        <div
          style={{ ...mergedStyles, position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', marginBottom: '8px' }}
        >
          {!isMeasuring && (
            <div className={`${styles.itemControls} no-print`} style={{ left: '-48px' }}>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete skills category "${catLabel}"?`)) {
                    setEditableSkills(prev => prev.filter(s => (s.category || 'technical').toLowerCase().trim() !== cat.toLowerCase().trim()));
                  }
                }}
                className={styles.deleteBlockBtn}
                title={`Delete ${catLabel}`}
              >
                <Trash size={12} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: '24px', width: '100%' }}>
            <span className={styles.bulletDot} />
            <strong style={{ fontWeight: 700, marginRight: '5px', color: 'var(--text-color, #1e293b)' }}>
              {catLabel}:
            </strong>
            <div style={{ flex: 1 }}>
              <AutoSizeTextarea
                value={skillsList.map(s => s.name).join(', ')}
                onChange={(val) => {
                  const names = val.split(',').map(n => n.trim()).filter(Boolean);
                  setEditableSkills(prev => {
                    const otherSkills = prev.filter(s => s.category.toLowerCase() !== cat.toLowerCase() && (s.category || '').toLowerCase().trim() !== 'languages');
                    const updatedSkills = names.map((name, i) => ({
                      id: `skill_${cat}_${i}_${Date.now()}`,
                      name,
                      category: cat.toLowerCase()
                    }));
                    const finalLangs = prev.filter(s => (s.category || '').toLowerCase().trim() === 'languages');
                    return [...finalLangs, ...otherSkills, ...updatedSkills];
                  });
                }}
              />
            </div>
          </div>
        </div>
      );
    }


    // 9. Custom Section Items (Choice of Bullets or KeyValue formats)
    if (unit.type === 'custom-content') {
      const bulletsList = unit.bullets || [];

      if (sec?.customFormat === 'keyvalue') {
        const pairs = sec.keyValuePairs || [{ key: 'Label', value: 'Detail Description' }];
        return (
          <div style={mergedStyles}>
            {pairs.map((pair, pIdx) => (
              <div
                key={pIdx}
                className={`${isPP ? styles.ppSectionRow : (isGerman ? styles.germanRow : styles.resumeItem)}`}
                style={{ position: 'relative', display: isPP || isGerman ? undefined : 'flex', marginBottom: '6px' }}
              >
                {!isMeasuring && (
                  <div className={`${styles.bulletControls} no-print`} style={{ left: '-40px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSections(prev => prev.map(s => {
                          if (s.id === unit.sectionId) {
                            const newPairs = [...(s.keyValuePairs || [])];
                            newPairs.splice(pIdx, 1);
                            return { ...s, keyValuePairs: newPairs };
                          }
                          return s;
                        }));
                      }}
                      className={styles.deleteBulletBtn}
                    >
                      <Trash size={12} />
                    </button>
                    <button
                      type="button"
                      style={{ color: 'var(--primary)' }}
                      onClick={() => {
                        setSections(prev => prev.map(s => {
                          if (s.id === unit.sectionId) {
                            const newPairs = [...(s.keyValuePairs || [])];
                            newPairs.splice(pIdx + 1, 0, { key: 'Key Label', value: 'Text Value' });
                            return { ...s, keyValuePairs: newPairs };
                          }
                          return s;
                        }));
                      }}
                      className={styles.deleteBulletBtn}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
                <div className={isPP ? styles.ppLeftCol : styles.germanLeftCol}>
                  <strong style={{ color: 'var(--accent-color, #0f172a)' }}>
                    <AutoSizeTextarea
                      value={pair.key}
                      onChange={(val) => {
                        setSections(prev => prev.map(s => {
                          if (s.id === unit.sectionId) {
                            const newPairs = [...(s.keyValuePairs || [])];
                            newPairs[pIdx] = { ...newPairs[pIdx], key: val };
                            return { ...s, keyValuePairs: newPairs };
                          }
                          return s;
                        }));
                      }}
                    />
                  </strong>
                </div>
                <div className={isPP ? styles.ppRightCol : styles.germanRightCol}>
                  <AutoSizeTextarea
                    value={pair.value}
                    onChange={(val) => {
                      setSections(prev => prev.map(s => {
                        if (s.id === unit.sectionId) {
                          const newPairs = [...(s.keyValuePairs || [])];
                          newPairs[pIdx] = { ...newPairs[pIdx], value: val };
                          return { ...s, keyValuePairs: newPairs };
                        }
                        return s;
                      }));
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        );
      }

      // Default custom formats (multi-bullet lists)
      return (
        <div style={mergedStyles}>
          <ul className={isPP ? styles.ppBulletsList : (isGerman ? styles.germanBulletsList : styles.bulletsList)}>
            {bulletsList.map((bullet, bulletIdx) => {
              const inputId = `bullet-input-custom-${unit.sectionId}-${bulletIdx}`;
              const key = `custom-bullet-${unit.sectionId}-${bulletIdx}`;
              return (
                <li key={bulletIdx} className={`${isPP ? styles.ppBulletItem : (isGerman ? styles.germanBulletItem : styles.bulletItem)} ${styles.canvasHoverBlock}`} style={{ position: 'relative' }}>
                  <span className={styles.bulletDot} />
                  {renderHoverAiControls(key, bullet, [
                    { label: "Punchier", prompt: "Make punchier with strong professional impact" },
                    { label: "Tone & Clarity", prompt: "Improve professional tone, grammar, and sentence flow" },
                    { label: "Domain Expertise", prompt: "Highlight key domain expertise and technical achievements" }
                  ])}
                  {!isMeasuring && (
                    <div className={`${styles.bulletControls} no-print`} style={{ right: '115px' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomBullet(unit.sectionId!, bulletIdx)}
                        className={styles.deleteBulletBtn}
                        title="Delete bullet"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}

                  <div className={styles.bulletContent}>
                    {isRephrasing[key] ? (
                      <div className={styles.canvasSkeletonBlock}>
                        <div className={styles.skeletonLine} style={{ width: '92%' }} />
                      </div>
                    ) : (
                      <AutoSizeTextarea
                        id={inputId}
                        value={bullet}
                        onChange={(val) => {
                          setSections(prev => prev.map(s => s.id === unit.sectionId ? {
                            ...s,
                            bullets: s.bullets!.map((b, bI) => bI === bulletIdx ? val : b)
                          } : s));
                        }}
                        onKeyDown={(e) => handleBulletKeyDown(e, 'custom', unit.sectionId!, 0, bulletIdx, bulletsList)}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      );
    }

    // 10. Contacts-Static (Creative Tech Contacts module fallback)
    if (unit.type === 'contacts-static') {
      return (
        <div className={styles.resumeSection} style={mergedStyles}>
          <h3 className={styles.resumeSectionTitle}>Contacts</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#64748b' }}>
            {editablePersonalInfo.email && <div>E-Mail: {editablePersonalInfo.email}</div>}
            {editablePersonalInfo.phone && <div>Telefon: {editablePersonalInfo.phone}</div>}
            {editablePersonalInfo.location && <div>Anschrift: {editablePersonalInfo.location}</div>}
          </div>
        </div>
      );
    }

    return null;
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
      {/* Dynamic print page styling to force correct browser paper size */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: ${customStyles.pageSize === 'A4' ? 'A4' : 'letter'} portrait !important;
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
          <span>CV Revision Saved Successfully!</span>
        </div>
      )}

      <div className={styles.workspace}>
        {/* Sidebar Controls Area */}
        <div
          ref={controlPanelRef}
          className={`${styles.controlPanel} no-print`}
          style={{ width: `${panelWidth}px`, minWidth: `${panelWidth}px` }}
        >
          <div
            className={`${styles.resizerHandle} ${isResizingPanel ? styles.resizerHandleActive : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizingPanel(true);
            }}
            title="Click and drag to adjust control panel width"
          />
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
            editorTab === 'resume' ? (
              // CV Tailoring UI
              <>
                <form onSubmit={handleTailor} className={`${styles.form} glass-card`}>
                  <h3>Job Listing Details</h3>
                  <div className={styles.formGrid}>
                    <InputField
                      label="Company Name"
                      id="editorCompany"
                      placeholder="e.g. Stripe"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                    <InputField
                      label="Target Position"
                      id="editorRole"
                      placeholder="e.g. Lead Frontend Engineer"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    />
                  </div>
                  <InputField
                    label="Job Description Text *"
                    id="editorDesc"
                    type="textarea"
                    placeholder="Paste responsibilities and key requirements..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    required
                  />

                  <div className={styles.selectGroup}>
                    <label htmlFor="editorTemplate">Layout Template</label>
                    <select id="editorTemplate" value={template} onChange={(e) => setTemplate(e.target.value)}>
                      <option value="pixel_perfect_pdf">German Styled Template </option>
                      <option value="modern_minimalist" disabled>More templates Coming soon</option>
                    </select>

                    {/* 1. Language & ATS Strategy Options */}
                    <div className={styles.selectGroup} style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #1e293b)', marginBottom: '6px', display: 'block' }}>
                        Target Output Language
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                        <button
                          type="button"
                          onClick={() => setTargetLanguage('en')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: targetLanguage === 'en' ? '2px solid #6366f1' : '1px solid #cbd5e1',
                            background: targetLanguage === 'en' ? 'rgba(99, 102, 241, 0.1)' : '#ffffff',
                            fontWeight: targetLanguage === 'en' ? 700 : 500,
                            color: targetLanguage === 'en' ? '#4f46e5' : '#475569',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>🇬🇧 English</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetLanguage('de')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: targetLanguage === 'de' ? '2px solid #6366f1' : '1px solid #cbd5e1',
                            background: targetLanguage === 'de' ? 'rgba(99, 102, 241, 0.1)' : '#ffffff',
                            fontWeight: targetLanguage === 'de' ? 700 : 500,
                            color: targetLanguage === 'de' ? '#4f46e5' : '#475569',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>🇩🇪 Deutsch</span>
                        </button>
                      </div>

                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #1e293b)', marginBottom: '6px', display: 'block' }}>
                        ATS Keyword Strategy
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setAggressiveMode(false)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: !aggressiveMode ? '2px solid #6366f1' : '1px solid #cbd5e1',
                            background: !aggressiveMode ? 'rgba(99, 102, 241, 0.08)' : '#ffffff',
                            color: !aggressiveMode ? '#4f46e5' : '#475569',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '12px' }}>🛡️ Standard</span>
                          <span style={{ fontSize: '10px', opacity: 0.8 }}>Strict Profile Match</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAggressiveMode(true)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: aggressiveMode ? '2px solid #8b5cf6' : '1px solid #cbd5e1',
                            background: aggressiveMode ? 'rgba(139, 92, 246, 0.12)' : '#ffffff',
                            color: aggressiveMode ? '#6d28d9' : '#475569',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '12px' }}>⚡ Aggressive</span>
                          <span style={{ fontSize: '10px', opacity: 0.85 }}>High ATS Optimization</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. Selective Projects List in Side Panel */}
                  <div style={{ marginBottom: '16px', background: 'rgba(248, 250, 252, 0.8)', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div
                      onClick={() => setIsProjectsCollapsed(!isProjectsCollapsed)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Include Projects ({masterProjects.length > 0 ? `${selectedProjectIds.length} of ${masterProjects.length} selected` : 'None added in profile'})</span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>
                        {isProjectsCollapsed ? 'Expand ▼' : 'Collapse ▲'}
                      </span>
                    </div>

                    {!isProjectsCollapsed && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                        {masterProjects.length > 0 ? (
                          masterProjects.map(proj => {
                            const isChecked = selectedProjectIds.includes(proj.id);
                            return (
                              <label
                                key={proj.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  background: isChecked ? '#ffffff' : 'transparent',
                                  border: isChecked ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedProjectIds(prev => [...prev, proj.id]);
                                    } else {
                                      setSelectedProjectIds(prev => prev.filter(id => id !== proj.id));
                                    }
                                  }}
                                  style={{ accentColor: '#6366f1' }}
                                />
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <strong style={{ color: '#1e293b', display: 'block', lineHeight: '1.2' }}>{proj.title}</strong>
                                  {proj.role && <span style={{ fontSize: '10.5px', color: '#64748b' }}>{proj.role}</span>}
                                </div>
                              </label>
                            );
                          })
                        ) : (
                          <div style={{ fontSize: '11.5px', color: '#94a3b8', padding: '6px 4px', fontStyle: 'italic' }}>
                            No projects found in Master Profile. Add projects in your profile settings to filter them here.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. Missing Profile Details Diagnostic Widget in Side Panel */}
                  {(() => {
                    const infoToCheck = currentVersion ? editablePersonalInfo : (masterProfileInfo || {});
                    const missing: { field: string; label: string; icon: string }[] = [];
                    if (!infoToCheck.linkedin) missing.push({ field: 'linkedin', label: 'LinkedIn Profile URL', icon: '🔗' });
                    if (!infoToCheck.github) missing.push({ field: 'github', label: 'GitHub Profile URL', icon: '💻' });
                    if (!infoToCheck.phone) missing.push({ field: 'phone', label: 'Phone Number', icon: '📞' });
                    if (!infoToCheck.location) missing.push({ field: 'location', label: 'Location / City', icon: '📍' });
                    if (!infoToCheck.email) missing.push({ field: 'email', label: 'Email Address', icon: '✉️' });

                    if (missing.length === 0) return null;

                    return (
                      <div style={{ marginBottom: '16px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#d48806', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <ShieldAlert size={14} />
                          <span>Missing Profile Details ({missing.length})</span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#8c6b00', marginBottom: '8px', lineHeight: '1.4' }}>
                          {currentVersion
                            ? "The following optional details are missing from your active canvas and won't appear on your CV:"
                            : "The following optional details are missing from your Master Profile:"}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {missing.map((item, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '10.5px',
                                background: '#fff',
                                border: '1px solid #ffe58f',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                color: '#ad6800',
                                fontWeight: 500
                              }}
                            >
                              {item.icon} {item.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <input
                      type="checkbox"
                      id="saveAutomatically"
                      checked={saveAutomatically}
                      onChange={(e) => setSaveAutomatically(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="saveAutomatically" style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer', color: 'var(--text-main, #1e293b)' }}>
                      Save tailored copy automatically
                    </label>
                  </div>

                  <Button type="submit" isLoading={isLoading} className={styles.tailorBtn}>
                    <Wand2 size={16} />
                    <span>Analyze & Tailor</span>
                  </Button>
                </form>

                {currentVersion && (
                  <div className={styles.trackingSection} style={{ marginTop: '16px', padding: '12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #1e293b)' }}>
                        {applicationTracked ? '✓ Tracking this Application' : 'Track this job application?'}
                      </div>
                    </div>
                    {!applicationTracked ? (
                      <Button onClick={handleTrackApplication} isLoading={isTrackingLoading} style={{ width: '100%' }}>
                        Add to Application Tracking
                      </Button>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#475569' }}>
                        This CV is linked to an active job tracking card.
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              // Cover Letter Tailoring UI
              <>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleGenerateLetter(company, position);
                  }}
                  className={`${styles.form} glass-card`}
                >
                  <h3>Cover Letter Tailoring</h3>
                  <div className={styles.formGrid}>
                    <InputField
                      label="Company Name"
                      id="letterCompany"
                      placeholder="e.g. Stripe"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                    <InputField
                      label="Target Position"
                      id="letterRole"
                      placeholder="e.g. Lead Frontend Engineer"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    />
                  </div>
                  <InputField
                    label="Job Description Text *"
                    id="letterDesc"
                    type="textarea"
                    placeholder="Paste job details to tailor your cover letter..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    required
                  />

                  <div className={styles.selectGroup}>
                    <label htmlFor="letterTone">Writing Tone</label>
                    <select
                      id="letterTone"
                      value={letterTone}
                      onChange={(e) => setLetterTone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--card-border, #cbd5e1)',
                        background: 'white',
                        fontSize: '13px',
                        outline: 'none',
                        color: 'var(--text-main, #1e293b)'
                      }}
                    >
                      <option value="professional">Professional & Direct (Recommended)</option>
                      <option value="enthusiastic">Enthusiastic & Passionate</option>
                      <option value="creative">Creative & Narrative</option>
                      <option value="executive">Executive & Formal</option>
                      <option value="direct">Short & Conversational</option>
                    </select>
                  </div>

                  <Button type="submit" isLoading={isLetterLoading} className={styles.tailorBtn}>
                    <Sparkles size={16} />
                    <span>Generate & Tailor Cover Letter</span>
                  </Button>
                </form>

                <div className={`${styles.atsCard} glass-card`}>
                  <h3>Cover Letter Guidelines</h3>
                  <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--muted, #64748b)', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    <p>
                      <strong>1. Premium Structure:</strong> A cover letter should be kept to a single, impactful page. It includes contact details, greeting, hook opening, value body paragraphs, and professional closing.
                    </p>
                    <p>
                      <strong>2. Adaptive Tone:</strong> Startups value enthusiastic/conversational tones, whereas traditional businesses require a professional/executive tone. Match the writing tone above accordingly.
                    </p>
                  </div>
                </div>
              </>
            )
          )}

          {activeControlTab === 'ats' && (
            <ATSDashboard
              report={liveAtsReport}
              onRefreshScore={handleRecheckAtsScore}
              onInjectSkill={handleInjectSkill}
              onRemoveSkill={handleRemoveSkill}
              existingCategories={Array.from(new Set(editableSkills.map(s => (s.category || 'technical').toLowerCase().trim())))}
            />
          )}

          {activeControlTab === 'style' && (
            // Design and Typography Customizers
            editorTab === 'resume' ? (
              // CV Design Options
              <div className={`${styles.styleControlsForm} glass-card`}>
                <h3>Typography & Layout Presets</h3>

                <div className={styles.presetCard}>
                  <div className={styles.presetHeader}>
                    <label className={styles.presetLabel}>
                      <Sliders size={16} style={{ color: 'var(--primary, #6366f1)' }} />
                      <span>Quick Spacing & Density Presets</span>
                    </label>
                  </div>
                  <div className={styles.presetGrid}>
                    {[
                      {
                        id: 'standard',
                        title: 'Standard',
                        subtitle: 'Default balance',
                        icon: LayoutGrid,
                        config: { fontSize: 13, headingSize: 1.4, lineHeight: 1.4, sectionSpacing: 20, bulletSpacing: 4 }
                      },
                      {
                        id: 'tight',
                        title: 'Tight',
                        subtitle: 'Fit ~15% more',
                        icon: Minimize2,
                        config: { fontSize: 12, headingSize: 1.3, lineHeight: 1.3, sectionSpacing: 14, bulletSpacing: 3 }
                      },
                      {
                        id: 'ultra',
                        title: 'Ultra Tight',
                        subtitle: 'Max density',
                        icon: Layers,
                        config: { fontSize: 11, headingSize: 1.2, lineHeight: 1.2, sectionSpacing: 10, bulletSpacing: 2 }
                      }
                    ].map(preset => {
                      const IconComponent = preset.icon;
                      const isActive =
                        customStyles.fontSize === preset.config.fontSize &&
                        customStyles.sectionSpacing === preset.config.sectionSpacing;

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          className={`${styles.presetTile} ${isActive ? styles.presetTileActive : ''}`}
                          onClick={() => setCustomStyles(s => ({ ...s, ...preset.config }))}
                        >
                          <div className={styles.presetTileTop}>
                            <IconComponent size={14} className={styles.presetIcon} />
                            {isActive && (
                              <span className={styles.presetCheck}>
                                <Check size={10} />
                              </span>
                            )}
                          </div>
                          <div>
                            <div className={styles.presetTitle}>{preset.title}</div>
                            <div className={styles.presetSubtitle}>{preset.subtitle}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.slidersTwinGrid}>
                  <div className={styles.sliderGroup}>
                    <label>Base Font Size: <strong>{customStyles.fontSize}px</strong></label>
                    <input
                      type="range"
                      min="10"
                      max="18"
                      step="0.1"
                      value={customStyles.fontSize}
                      onChange={(e) => setCustomStyles(s => ({ ...s, fontSize: parseFloat(e.target.value) }))}
                    />
                  </div>

                  <div className={styles.sliderGroup}>
                    <label>Heading Multiplier: <strong>x{customStyles.headingSize}</strong></label>
                    <input
                      type="range"
                      min="1.0"
                      max="2.2"
                      step="0.05"
                      value={customStyles.headingSize}
                      onChange={(e) => setCustomStyles(s => ({ ...s, headingSize: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className={styles.slidersTwinGrid}>
                  <div className={styles.sliderGroup}>
                    <label>Line Height: <strong>{customStyles.lineHeight}</strong></label>
                    <input
                      type="range"
                      min="1.0"
                      max="2.0"
                      step="0.05"
                      value={customStyles.lineHeight}
                      onChange={(e) => setCustomStyles(s => ({ ...s, lineHeight: parseFloat(e.target.value) }))}
                    />
                  </div>

                  <div className={styles.sliderGroup}>
                    <label>Section Spacing: <strong>{customStyles.sectionSpacing}px</strong></label>
                    <input
                      type="range"
                      min="10"
                      max="45"
                      step="0.5"
                      value={customStyles.sectionSpacing}
                      onChange={(e) => setCustomStyles(s => ({ ...s, sectionSpacing: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className={styles.slidersTwinGrid}>
                  <div className={styles.sliderGroup}>
                    <label>Bullet Point Spacing: <strong>{customStyles.bulletSpacing !== undefined ? customStyles.bulletSpacing : 4}px</strong></label>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="0.5"
                      value={customStyles.bulletSpacing !== undefined ? customStyles.bulletSpacing : 4}
                      onChange={(e) => setCustomStyles(s => ({ ...s, bulletSpacing: parseFloat(e.target.value) }))}
                    />
                  </div>

                  <div className={styles.sliderGroup}>
                    <label>Page Margin: <strong>{customStyles.pageMargin || (template === 'german_style_cv' ? 77 : (template === 'pixel_perfect_pdf' ? 48 : 32))}px</strong></label>
                    <input
                      type="range"
                      min="20"
                      max="90"
                      step="0.5"
                      value={customStyles.pageMargin || (template === 'german_style_cv' ? 76.8 : (template === 'pixel_perfect_pdf' ? 48 : 32))}
                      onChange={(e) => setCustomStyles(s => ({ ...s, pageMargin: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className={styles.colorPickers}>
                  <div className={styles.colorPickerGroup}>
                    <label>Accent Color</label>
                    <input
                      type="color"
                      value={customStyles.accentColor}
                      onChange={(e) => setCustomStyles(s => ({ ...s, accentColor: e.target.value }))}
                    />
                  </div>
                  <div className={styles.colorPickerGroup}>
                    <label>Title 2nd Word Color</label>
                    <input
                      type="color"
                      value={customStyles.headingSecondaryColor || '#3d7ee6'}
                      onChange={(e) => setCustomStyles(s => ({ ...s, headingSecondaryColor: e.target.value }))}
                    />
                  </div>
                  <div className={styles.colorPickerGroup}>
                    <label>Text Color</label>
                    <input
                      type="color"
                      value={customStyles.textColor}
                      onChange={(e) => setCustomStyles(s => ({ ...s, textColor: e.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.selectGroup} style={{ marginTop: '12px' }}>
                  <label htmlFor="globalFontFamily">Font Family</label>
                  <select
                    id="globalFontFamily"
                    value={customStyles.fontFamily || ''}
                    onChange={(e) => setCustomStyles(s => ({ ...s, fontFamily: e.target.value }))}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
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

                <hr style={{ margin: 'var(--space-2) 0', borderColor: 'var(--card-border)' }} />

                <h3>Sections Control Panel</h3>
                <div className={styles.sectionsList}>
                  {sections.map((secItem, idx) => (
                    <div key={secItem.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', width: '100%' }}>
                      <div className={styles.sectionSortRow}>
                        <input
                          type="checkbox"
                          checked={secItem.visible}
                          onChange={(e) => setSections(prev => prev.map((s, i) => i === idx ? { ...s, visible: e.target.checked } : s))}
                        />
                        <span className={styles.sectionSortName}>{secItem.name}</span>

                        <button
                          type="button"
                          className={styles.settingsToggleBtn}
                          onClick={() => setExpandedSectionSettings(expandedSectionSettings === secItem.id ? null : secItem.id)}
                        >
                          <Settings size={12} />
                        </button>

                        {secItem.id.startsWith('custom_') && (
                          <button
                            type="button"
                            className={styles.settingsToggleBtn}
                            style={{ color: '#ef4444' }}
                            onClick={() => setSections(prev => prev.filter(s => s.id !== secItem.id))}
                          >
                            <Trash size={12} />
                          </button>
                        )}

                        <div className={styles.sortButtons}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              const reordered = [...sections];
                              const temp = reordered[idx];
                              reordered[idx] = reordered[idx - 1];
                              reordered[idx - 1] = temp;
                              setSections(reordered);
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={idx === sections.length - 1}
                            onClick={() => {
                              const reordered = [...sections];
                              const temp = reordered[idx];
                              reordered[idx] = reordered[idx + 1];
                              reordered[idx + 1] = temp;
                              setSections(reordered);
                            }}
                          >
                            ↓
                          </button>
                        </div>
                      </div>

                      {/* Local individual section styles panel */}
                      {expandedSectionSettings === secItem.id && (
                        <div className={styles.sectionSettingsCard}>
                          <h4>{secItem.name} Config</h4>

                          <div className={styles.sliderGroup}>
                            <label>Font Size</label>
                            <input
                              type="range"
                              min="10"
                              max="18"
                              value={secItem.customStyles?.fontSize || customStyles.fontSize}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setSections(prev => prev.map(s => s.id === secItem.id ? {
                                  ...s,
                                  customStyles: { ...s.customStyles, fontSize: val }
                                } : s));
                              }}
                            />
                          </div>

                          <div className={styles.sliderGroup}>
                            <label>Spacing</label>
                            <input
                              type="range"
                              min="5"
                              max="50"
                              value={secItem.customStyles?.spacing || customStyles.sectionSpacing}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setSections(prev => prev.map(s => s.id === secItem.id ? {
                                  ...s,
                                  customStyles: { ...s.customStyles, spacing: val }
                                } : s));
                              }}
                            />
                          </div>

                          {/* Local layout choice for custom sections */}
                          {secItem.type === 'custom' && (
                            <div className={styles.sliderGroup}>
                              <label>Section Format</label>
                              <select
                                value={secItem.customFormat || 'bullets'}
                                onChange={(e) => {
                                  const val = e.target.value as 'bullets' | 'keyvalue';
                                  setSections(prev => prev.map(s => s.id === secItem.id ? {
                                    ...s,
                                    customFormat: val,
                                    keyValuePairs: val === 'keyvalue' ? (s.keyValuePairs || [{ key: 'Languages', value: 'German (Native), English (C1)' }]) : undefined
                                  } : s));
                                }}
                                style={{
                                  padding: '4px',
                                  fontSize: '11px',
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--card-border)',
                                  color: 'var(--foreground)'
                                }}
                              >
                                <option value="bullets">Multi-bullet list</option>
                                <option value="keyvalue">Structured Key-Value grid</option>
                              </select>
                            </div>
                          )}

                          {secItem.type === 'skills' && (
                            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {/* 1. IT Skills Categories */}
                              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                IT Skills Categories
                              </div>
                              {Array.from(new Set(editableSkills.filter(s => (s.category || '').toLowerCase().trim() !== 'languages').map(s => (s.category || 'technical').toLowerCase().trim()))).map((catName, catIdx) => {
                                const categorySkills = editableSkills.filter(s => (s.category || 'technical').toLowerCase().trim() === catName);
                                const originalCategory = categorySkills[0]?.category || catName;
                                const displayHeader = getLocalizedCategoryName(originalCategory);
                                const isExpanded = !!expandedSkillCats[catName];

                                return (
                                  <div
                                    key={`skill_cat_panel_${catIdx}`}
                                    style={{
                                      background: 'var(--card-bg, rgba(255, 255, 255, 0.8))',
                                      border: '1px solid var(--card-border, rgba(226, 232, 240, 0.8))',
                                      borderRadius: 'var(--radius-md, 10px)',
                                      overflow: 'hidden',
                                      backdropFilter: 'blur(8px)',
                                      boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05))',
                                      transition: 'all 0.2s ease'
                                    }}
                                  >
                                    {/* Accordion Header Bar */}
                                    <div
                                      onClick={() => setExpandedSkillCats(prev => ({ ...prev, [catName]: !prev[catName] }))}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px 12px',
                                        cursor: 'pointer',
                                        background: isExpanded ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                        userSelect: 'none',
                                        borderBottom: isExpanded ? '1px solid var(--card-border, #e2e8f0)' : 'none'
                                      }}
                                    >
                                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--foreground, #0f172a)' }}>
                                        {displayHeader} <span style={{ fontSize: '10.5px', color: 'var(--muted, #64748b)', fontWeight: 500 }}>({categorySkills.length})</span>
                                      </span>
                                      <span style={{ fontSize: '11px', color: 'var(--primary, #6366f1)', fontWeight: 600 }}>
                                        {isExpanded ? 'Collapse ▲' : 'Expand ▼'}
                                      </span>
                                    </div>

                                    {/* Collapsible Content Body */}
                                    {isExpanded && (
                                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {/* Category Title Rename */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                          <label style={{ fontSize: '10.5px', color: 'var(--muted, #64748b)', whiteSpace: 'nowrap', fontWeight: 600 }}>Title:</label>
                                          <input
                                            type="text"
                                            value={displayHeader}
                                            onChange={(e) => {
                                              const newCatName = e.target.value;
                                              if (!newCatName.trim()) return;
                                              setEditableSkills(prev => prev.map(s => (s.category || 'technical').toLowerCase().trim() === catName ? { ...s, category: newCatName.trim() } : s));
                                            }}
                                            style={{
                                              flex: 1,
                                              fontSize: '11.5px',
                                              fontWeight: 700,
                                              padding: '4px 8px',
                                              borderRadius: 'var(--radius-sm, 6px)',
                                              border: '1px solid var(--card-border, #cbd5e1)',
                                              color: 'var(--primary, #6366f1)',
                                              background: 'var(--background, #f8fafc)'
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (window.confirm(`Delete category "${displayHeader}" and all its skills?`)) {
                                                setEditableSkills(prev => prev.filter(s => (s.category || 'technical').toLowerCase().trim() !== catName));
                                              }
                                            }}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--danger, #ef4444)', cursor: 'pointer', padding: '4px' }}
                                            title="Delete Category"
                                          >
                                            <Trash size={13} />
                                          </button>
                                        </div>

                                        {/* List of Skills with Reorder & Delete */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                          {categorySkills.map((sk, idx) => (
                                            <div key={sk.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <input
                                                type="text"
                                                value={sk.name}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  setEditableSkills(prev => prev.map(item => item.id === sk.id ? { ...item, name: val } : item));
                                                }}
                                                style={{
                                                  flex: 1,
                                                  fontSize: '11.5px',
                                                  padding: '4px 8px',
                                                  borderRadius: 'var(--radius-sm, 6px)',
                                                  border: '1px solid var(--card-border, #cbd5e1)',
                                                  background: 'var(--background, #ffffff)',
                                                  color: 'var(--foreground, #1e293b)'
                                                }}
                                              />
                                              <button
                                                type="button"
                                                disabled={idx === 0}
                                                onClick={() => handleMoveSkillInCategory(sk.id, 'up')}
                                                style={{ opacity: idx === 0 ? 0.3 : 1, background: 'transparent', border: 'none', color: 'var(--muted, #64748b)', cursor: 'pointer', padding: '2px' }}
                                                title="Move Up"
                                              >
                                                <ArrowUp size={12} />
                                              </button>
                                              <button
                                                type="button"
                                                disabled={idx === categorySkills.length - 1}
                                                onClick={() => handleMoveSkillInCategory(sk.id, 'down')}
                                                style={{ opacity: idx === categorySkills.length - 1 ? 0.3 : 1, background: 'transparent', border: 'none', color: 'var(--muted, #64748b)', cursor: 'pointer', padding: '2px' }}
                                                title="Move Down"
                                              >
                                                <ArrowDown size={12} />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditableSkills(prev => prev.filter(item => item.id !== sk.id))}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--danger, #ef4444)', cursor: 'pointer', padding: '2px' }}
                                                title="Remove Skill"
                                              >
                                                <X size={12} />
                                              </button>
                                            </div>
                                          ))}
                                        </div>

                                        {/* Add Skill to this Category */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const skillName = window.prompt(`Add new skill to ${displayHeader}:`, 'New Skill');
                                            if (skillName && skillName.trim()) {
                                              const targetCat = categorySkills[0]?.category || catName;
                                              setEditableSkills(prev => [...prev, { id: `sk_${Date.now()}`, name: skillName.trim(), category: targetCat }]);
                                            }
                                          }}
                                          style={{
                                            marginTop: '4px',
                                            fontSize: '11px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--primary, #6366f1)',
                                            cursor: 'pointer',
                                            padding: '4px 0',
                                            fontWeight: 600,
                                            textAlign: 'left',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                          }}
                                        >
                                          + Add skill to {displayHeader}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              <Button
                                type="button"
                                variant="ghost"
                                style={{ fontSize: '11px', padding: '8px', color: 'var(--primary, #6366f1)' }}
                                onClick={() => {
                                  const newCat = window.prompt('Enter new category name (e.g. Tools, Soft Skills):');
                                  if (newCat && newCat.trim()) {
                                    setEditableSkills(prev => [...prev, { id: `sk_${Date.now()}`, name: 'New Skill', category: newCat.trim() }]);
                                    setExpandedSkillCats(prev => ({ ...prev, [newCat.trim().toLowerCase()]: true }));
                                  }
                                }}
                              >
                                + Add New Category
                              </Button>

                              {/* 2. Separate Languages Subsection Card */}
                              {(() => {
                                const languageSkills = editableSkills.filter(s => (s.category || '').toLowerCase().trim() === 'languages');
                                const isExpanded = !!expandedSkillCats.languages;
                                const displayLangTitle = languagesTitle || (targetLanguage === 'de' ? 'Sprachen' : 'Languages');

                                return (
                                  <div
                                    style={{
                                      marginTop: '8px',
                                      background: 'var(--card-bg, rgba(255, 255, 255, 0.8))',
                                      border: '1px solid var(--card-border, rgba(226, 232, 240, 0.8))',
                                      borderRadius: 'var(--radius-md, 10px)',
                                      overflow: 'hidden',
                                      backdropFilter: 'blur(8px)',
                                      boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05))',
                                      transition: 'all 0.2s ease'
                                    }}
                                  >
                                    <div
                                      onClick={() => setExpandedSkillCats(prev => ({ ...prev, languages: !prev.languages }))}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px 12px',
                                        cursor: 'pointer',
                                        background: isExpanded ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.04)',
                                        userSelect: 'none',
                                        borderBottom: isExpanded ? '1px solid var(--card-border, #e2e8f0)' : 'none'
                                      }}
                                    >
                                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--primary, #4f46e5)' }}>
                                        🌐 {displayLangTitle} <span style={{ fontSize: '10.5px', color: 'var(--muted, #64748b)', fontWeight: 500 }}>({languageSkills.length})</span>
                                      </span>
                                      <span style={{ fontSize: '11px', color: 'var(--primary, #6366f1)', fontWeight: 600 }}>
                                        {isExpanded ? 'Collapse ▲' : 'Expand ▼'}
                                      </span>
                                    </div>

                                    {isExpanded && (
                                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                          <label style={{ fontSize: '10.5px', color: 'var(--muted, #64748b)', whiteSpace: 'nowrap', fontWeight: 600 }}>Title:</label>
                                          <input
                                            type="text"
                                            value={displayLangTitle}
                                            onChange={(e) => setLanguagesTitle(e.target.value)}
                                            style={{
                                              flex: 1,
                                              fontSize: '11.5px',
                                              fontWeight: 700,
                                              padding: '4px 8px',
                                              borderRadius: 'var(--radius-sm, 6px)',
                                              border: '1px solid var(--card-border, #cbd5e1)',
                                              color: 'var(--primary, #4f46e5)',
                                              background: 'var(--background, #f8fafc)'
                                            }}
                                          />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                          {languageSkills.map((sk, idx) => (
                                            <div key={sk.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <input
                                                type="text"
                                                value={sk.name}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  setEditableSkills(prev => prev.map(item => item.id === sk.id ? { ...item, name: val } : item));
                                                }}
                                                style={{
                                                  flex: 1,
                                                  fontSize: '11.5px',
                                                  padding: '4px 8px',
                                                  borderRadius: 'var(--radius-sm, 6px)',
                                                  border: '1px solid var(--card-border, #cbd5e1)',
                                                  background: 'var(--background, #ffffff)',
                                                  color: 'var(--foreground, #1e293b)'
                                                }}
                                              />
                                              <button
                                                type="button"
                                                disabled={idx === 0}
                                                onClick={() => handleMoveSkillInCategory(sk.id, 'up')}
                                                style={{ opacity: idx === 0 ? 0.3 : 1, background: 'transparent', border: 'none', color: 'var(--muted, #64748b)', cursor: 'pointer', padding: '2px' }}
                                                title="Move Up"
                                              >
                                                <ArrowUp size={12} />
                                              </button>
                                              <button
                                                type="button"
                                                disabled={idx === languageSkills.length - 1}
                                                onClick={() => handleMoveSkillInCategory(sk.id, 'down')}
                                                style={{ opacity: idx === languageSkills.length - 1 ? 0.3 : 1, background: 'transparent', border: 'none', color: 'var(--muted, #64748b)', cursor: 'pointer', padding: '2px' }}
                                                title="Move Down"
                                              >
                                                <ArrowDown size={12} />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditableSkills(prev => prev.filter(item => item.id !== sk.id))}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--danger, #ef4444)', cursor: 'pointer', padding: '2px' }}
                                                title="Remove Language"
                                              >
                                                <X size={12} />
                                              </button>
                                            </div>
                                          ))}
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const langName = window.prompt('Add new language (e.g. German (Native)):', 'French (B2)');
                                            if (langName && langName.trim()) {
                                              setEditableSkills(prev => [...prev, { id: `lang_${Date.now()}`, name: langName.trim(), category: 'languages' }]);
                                            }
                                          }}
                                          style={{
                                            marginTop: '4px',
                                            fontSize: '11px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--primary, #4f46e5)',
                                            cursor: 'pointer',
                                            padding: '4px 0',
                                            fontWeight: 600,
                                            textAlign: 'left'
                                          }}
                                        >
                                          + Add Language
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className={styles.addCustomSecBtn}
                  onClick={() => {
                    const secName = window.prompt("Enter Section Title:", "Certifications");
                    if (secName) {
                      setSections(prev => [...prev, {
                        id: `custom_${Date.now()}`,
                        name: secName,
                        visible: true,
                        type: 'custom',
                        bullets: ['Add certification credential detail...']
                      }]);
                    }
                  }}
                >
                  <Plus size={14} /> Add Custom Section
                </button>
              </div>
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
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
                    <label>Base Font Size: <strong>{customStyles.fontSize}px</strong></label>
                    <input
                      type="range"
                      min="11"
                      max="18"
                      value={customStyles.fontSize}
                      onChange={(e) => setCustomStyles(s => ({ ...s, fontSize: parseInt(e.target.value) }))}
                    />
                  </div>

                  <div className={styles.sliderGroup}>
                    <label>Line Height: <strong>{customStyles.lineHeight}</strong></label>
                    <input
                      type="range"
                      min="1.2"
                      max="2.2"
                      step="0.1"
                      value={customStyles.lineHeight}
                      onChange={(e) => setCustomStyles(s => ({ ...s, lineHeight: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className={styles.slidersTwinGrid}>
                  <div className={styles.sliderGroup}>
                    <label>Page Size: <strong>{customStyles.pageSize}</strong></label>
                    <select
                      value={customStyles.pageSize}
                      onChange={(e) => setCustomStyles(s => ({ ...s, pageSize: e.target.value as 'A4' | 'Letter' }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--card-border, #cbd5e1)',
                        background: 'white',
                        fontSize: '13px',
                        outline: 'none',
                        color: 'var(--text-main, #1e293b)'
                      }}
                    >
                      <option value="A4">A4 (210mm x 297mm)</option>
                      <option value="Letter">Letter (8.5in x 11in)</option>
                    </select>
                  </div>

                  <div className={styles.sliderGroup}>
                    <label>Text Color</label>
                    <input
                      type="color"
                      value={customStyles.textColor}
                      onChange={(e) => setCustomStyles(s => ({ ...s, textColor: e.target.value }))}
                      style={{
                        width: '100%',
                        height: '36px',
                        border: '1px solid var(--card-border, #cbd5e1)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        padding: '0',
                        background: 'transparent'
                      }}
                    />
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
            <div className={styles.previewContainer}>
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
                      width: `${customStyles.pageSize === 'A4' ? 794 : 816}px`,
                      height: 'auto',
                      visibility: 'hidden',
                      pointerEvents: 'none',
                      boxSizing: 'border-box',
                      padding: `${customStyles.pageMargin || (template === 'german_style_cv' ? 76.8 : (template === 'pixel_perfect_pdf' ? 48 : 32))}px`,
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
                      style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px',
                        width: `${customStyles.pageSize === 'A4' ? 794 : 816}px`
                      }}
                    >
                      {pages.map((pageUnits, pageIdx) => {
                        const pageMargin = customStyles.pageMargin || (template === 'german_style_cv' ? 76.8 : (template === 'pixel_perfect_pdf' ? 48 : 32));
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
                                width: `${customStyles.pageSize === 'A4' ? 794 : 816}px`,
                                height: `${customStyles.pageSize === 'A4' ? 1123 : 1056}px`,
                                '--print-page-width': customStyles.pageSize === 'A4' ? '210mm' : '8.5in',
                                '--print-page-height': customStyles.pageSize === 'A4' ? '297mm' : '11in',
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
                                  {headerUnit && renderUnit(headerUnit)}
                                  <div className={styles.gridContainer}>
                                    <div className={styles.sidebarColumn}>
                                      {sidebarUnits.map(unit => renderUnit(unit))}
                                    </div>
                                    <div className={styles.mainColumn}>
                                      {mainUnits.map(unit => renderUnit(unit))}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                  {pageUnits.map(unit => renderUnit(unit))}
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
                      style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px',
                        width: `${customStyles.pageSize === 'A4' ? 794 : 816}px`
                      }}
                    >
                      <div
                        className={`${styles.pageContainer} ${styles.letterPage}`}
                        style={{
                          width: `${customStyles.pageSize === 'A4' ? 794 : 816}px`,
                          height: `${customStyles.pageSize === 'A4' ? 1123 : 1056}px`,
                          '--print-page-width': customStyles.pageSize === 'A4' ? '210mm' : '8.5in',
                          '--print-page-height': customStyles.pageSize === 'A4' ? '297mm' : '11in',
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
                        ) : (
                          <textarea
                            className={styles.letterTextarea}
                            value={letterContent}
                            onChange={(e) => setLetterContent(e.target.value)}
                            style={{
                              width: '100%',
                              height: '100%',
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
                          />
                        )}
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
    </div>
  );
};
