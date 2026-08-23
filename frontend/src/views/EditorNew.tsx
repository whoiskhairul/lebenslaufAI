import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../components/Button';
import { InputField } from '../components/InputField';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Toast } from '../components/Toast';
import { Wand2, Download, Printer, Check, X, ShieldAlert, Sparkles, FileText, Brain, Save, RefreshCw, Trash, Plus, Settings, Minimize2, LayoutGrid, Layers, Sliders, User, Briefcase, Code, GraduationCap, Globe, Eye, EyeOff, RotateCcw } from 'lucide-react';
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
interface ParsedLetter {
  sender_name: string;
  sender_address: string;
  sender_phone: string;
  sender_email: string;
  recipient_contact: string;
  recipient_company: string;
  recipient_department: string;
  recipient_address: string;
  location: string;
  date: string;
  subject: string;
  salutation: string;
  body: string;
  closing_salutation: string;
  candidate_name: string;
  verification_notes?: {
    requirements_emphasized?: string[];
    resume_evidence_used?: string[];
    placeholders?: string[];
    confirmation_needed?: string[];
  };
  is_json: boolean;
}

const getParsedLetter = (content: string, editablePersonalInfo: any): ParsedLetter => {
  if (!content) {
    return {
      sender_name: editablePersonalInfo.full_name || '',
      sender_address: editablePersonalInfo.location || '',
      sender_phone: editablePersonalInfo.phone || '',
      sender_email: editablePersonalInfo.email || '',
      recipient_contact: '',
      recipient_company: '',
      recipient_department: '',
      recipient_address: '',
      location: editablePersonalInfo.location?.split(',')?.[0]?.trim() || '',
      date: new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }),
      subject: '',
      salutation: '',
      body: '',
      closing_salutation: 'Mit freundlichen Grüßen',
      candidate_name: editablePersonalInfo.full_name || '',
      is_json: false
    };
  }

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      return {
        sender_name: parsed.sender_name || '',
        sender_address: parsed.sender_address || '',
        sender_phone: parsed.sender_phone || '',
        sender_email: parsed.sender_email || '',
        recipient_contact: parsed.recipient_contact || '',
        recipient_company: parsed.recipient_company || '',
        recipient_department: parsed.recipient_department || '',
        recipient_address: parsed.recipient_address || '',
        location: parsed.location || '',
        date: parsed.date || '',
        subject: parsed.subject || '',
        salutation: parsed.salutation || '',
        body: parsed.body || '',
        closing_salutation: parsed.closing_salutation || '',
        candidate_name: parsed.candidate_name || '',
        verification_notes: parsed.verification_notes,
        is_json: true
      };
    }
  } catch (e) {
    // Not JSON
  }

  // Legacy plain text parser fallback
  const lines = content.split('\n');
  let closingIndex = -1;
  const triggers = [
    'mit freundlichen',
    'sincerely',
    'best regards',
    'kind regards',
    'viele grüße',
    'freundliche grüße',
    'hochachtungsvoll',
    'yours truly',
    'mit besten',
    'grüße'
  ];
  for (let i = lines.length - 1; i >= 0; i--) {
    const lineLower = lines[i].toLowerCase().trim();
    if (triggers.some(t => lineLower.includes(t))) {
      closingIndex = i;
      break;
    }
  }

  let bodyText = '';
  let closingText = '';
  let nameText = '';

  if (closingIndex !== -1) {
    bodyText = lines.slice(0, closingIndex).join('\n');
    closingText = lines[closingIndex];
    nameText = lines.slice(closingIndex + 1).join('\n');
  } else if (lines.length > 2) {
    bodyText = lines.slice(0, lines.length - 2).join('\n');
    closingText = lines[lines.length - 2];
    nameText = lines[lines.length - 1];
  } else {
    bodyText = content;
  }

  return {
    sender_name: editablePersonalInfo.full_name || '',
    sender_address: editablePersonalInfo.location || '',
    sender_phone: editablePersonalInfo.phone || '',
    sender_email: editablePersonalInfo.email || '',
    recipient_contact: '',
    recipient_company: '',
    recipient_department: '',
    recipient_address: '',
    location: editablePersonalInfo.location?.split(',')?.[0]?.trim() || '',
    date: new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }),
    subject: '',
    salutation: '',
    body: bodyText,
    closing_salutation: closingText || 'Mit freundlichen Grüßen',
    candidate_name: nameText || editablePersonalInfo.full_name || '',
    is_json: false
  };
};

const ResizableSignature: React.FC<{ src: string; height: number; onChange: (h: number) => void }> = ({ src, height, onChange }) => {
  const [isSelected, setIsSelected] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startYRef.current;
      const newHeight = Math.max(20, Math.min(150, startHeightRef.current + deltaY));
      onChange(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
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
            onMouseDown={handleMouseDown}
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              width: '10px',
              height: '10px',
              background: '#4f46e5',
              border: '1.5px solid white',
              borderRadius: '50%',
              cursor: 'se-resize',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              zIndex: 10
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
  const [headerStyles, setHeaderStyles] = useState<any>({});
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
    pageSize: 'A4';
    fontFamily?: string;
    signatureHeight?: number;
  }>({
    fontSize: 13,
    headingSize: 1.4,
    lineHeight: 1.4,
    sectionSpacing: 20,
    accentColor: '#0f172a',
    headingSecondaryColor: '#3d7ee6',
    textColor: '#334155',
    alignment: 'left',
    pageMargin: 48,
    bulletSpacing: 4,
    personalDetailsOffset: 16,
    dateFormat: 'MM/YYYY',
    pageSize: 'A4',
    fontFamily: '',
    signatureHeight: 48
  });

  const [letterStyles, setLetterStyles] = useState<{
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
  }>({
    fontSize: 13,
    lineHeight: 1.4,
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
    customFormat?: 'bullets' | 'keyvalue' | 'entries' | 'paragraph';
    keyValuePairs?: Array<{ key: string; value: string }>;
    entries?: any[];
    paragraphText?: string;
    originalSnapshot?: any;
    aiSnapshot?: any;
    activeVersion?: 'original' | 'ai';
  }>>([
    { id: 'summary', name: 'Professional Summary', visible: true, type: 'summary' },
    { id: 'experience', name: 'Work Experience', visible: true, type: 'experience' },
    { id: 'projects', name: 'Projects', visible: true, type: 'projects' },
    { id: 'education', name: 'Education', visible: true, type: 'education' },
    { id: 'skills', name: 'Skills', visible: true, type: 'skills' }
  ]);

  // Editable CV text grids
  const [editableSummary, setEditableSummary] = useState('');
  const [editablePersonalInfo, setEditablePersonalInfo] = useState<{
    id?: string;
    full_name: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    date_of_birth: string;
    nationality: string;
    linkedin: string;
    github: string;
    website: string;
    image_url: string;
    signature_image?: string;
  }>({
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
    image_url: '',
    signature_image: ''
  });
  const [editableExperiences, setEditableExperiences] = useState<Array<{ id: string; bullets: string[]; company?: string; position?: string; location?: string; start_date?: string; end_date?: string }>>([]);
  const [editableProjects, setEditableProjects] = useState<Array<{ id: string; bullets: string[]; title?: string; role?: string; technologies?: string[] | string; date?: string; link?: string; github_url?: string; demo_url?: string }>>([]);
  const [editableEducations, setEditableEducations] = useState<Array<{ id: string; institution: string; degree?: string; field_of_study?: string; start_date?: string; end_date?: string; location?: string; bullets?: string[] }>>([]);
  const [editableSkills, setEditableSkills] = useState<Array<{ id: string; name: string; category: string }>>([]);
  const [expandedProjectCards, setExpandedProjectCards] = useState<Record<string, boolean>>({});

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




  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [languagesFirst, setLanguagesFirst] = useState(false);
  const [languagesTitle, setLanguagesTitle] = useState<string>('');
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
  const [scale, setScale] = useState(1);

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
  const [pages, setPages] = useState<RenderableUnit[][]>([[]]);
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

  // Adjust canvas viewport zoom scale
  useEffect(() => {
    const handleResize = () => {
      if (viewportRef.current) {
        const viewportWidth = viewportRef.current.clientWidth - 40;
        if (viewportWidth <= 0) return;
        const pageWidth = 794;
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
  }, [currentVersion, editorTab, customStyles.pageSize, mobileActivePane]);

  // Compensate the layout height of the scaled page stack (transform does not affect flow size)
  const scaledWrapperRef = useRef<HTMLDivElement>(null);
  const [wrapperHeightCompensation, setWrapperHeightCompensation] = useState(0);

  useEffect(() => {
    const el = scaledWrapperRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.offsetHeight;
      setWrapperHeightCompensation(h > 0 ? h * (1 - scale) : 0);
    };
    measure();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(el);
    }
    return () => {
      if (observer) observer.disconnect();
    };
  }, [scale, editorTab, pages, customStyles]);

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
      const tailoredProjects = detailsAny.tailored_projects || detailsAny.projects || profile.projects || [];
      const mappedProjects = (profile.projects || tailoredProjects).map((p: any) => {
        const tailoredP = (detailsAny.tailored_projects || []).find((tp: any) => tp.id === p.id);
        return {
          id: p.id || `proj_${Math.random()}`,
          bullets: tailoredP?.bullets || p.bullets || [],
          title: tailoredP?.title || p.title || p.title || '',
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
  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === sectionId);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      const nextList = [...prev];
      const temp = nextList[idx];
      nextList[idx] = nextList[targetIdx];
      nextList[targetIdx] = temp;
      return nextList;
    });
  };

  // Quick Add Item Handler for Section Header Action Bar
  const handleQuickAddSectionItem = (secId: string) => {
    const targetSec = sections.find(s => s.id === secId);
    if (!targetSec) return;

    if (targetSec.type === 'summary') {
      setEditableSummary(prev => prev ? `${prev}\n- Driven professional with expertise in technical execution and business impact.` : '- Driven professional with expertise in technical execution and business impact.');
    } else if (targetSec.type === 'experience') {
      handleAddExperience();
    } else if (targetSec.type === 'projects') {
      handleAddProject();
    } else if (targetSec.type === 'education') {
      handleAddEducation();
    } else if (targetSec.type === 'skills') {
      const newSkill = {
        id: `skill_${Date.now()}`,
        name: 'New Skill',
        category: 'Technical Skills'
      };
      setEditableSkills(prev => [...prev, newSkill]);
    } else if (targetSec.type === 'custom') {
      handleAddCustomBullet(secId);
    }
  };

  // AI Section Polish with Side-by-Side Comparison Generator
  // Section AI Scope Options Generator (Section, Item, or Bullet)
  const getSectionAiScopeOptions = (sectionId: string) => {
    const targetSec = sections.find(s => s.id === sectionId);
    if (!targetSec) return [{ id: 'all', label: 'Entire Section (All Content)' }];

    const options: Array<{ id: string; label: string }> = [
      { id: 'all', label: `Entire ${targetSec.name} Section` }
    ];

    if (targetSec.type === 'experience') {
      editableExperiences.forEach((exp, expIdx) => {
        const entryId = `entry_${exp.id}`;
        options.push({
          id: entryId,
          label: `ðŸ¢ Job #${expIdx + 1}: ${exp.position || 'Position'} @ ${exp.company || 'Company'}`
        });
        (exp.bullets || []).forEach((bullet, bIdx) => {
          options.push({
            id: `bullet_${exp.id}_${bIdx}`,
            label: `  ↳ Bullet #${bIdx + 1}: "${bullet.length > 40 ? bullet.substring(0, 40) + '...' : bullet}"`
          });
        });
      });
    } else if (targetSec.type === 'projects') {
      editableProjects.forEach((proj, projIdx) => {
        const entryId = `entry_${proj.id}`;
        options.push({
          id: entryId,
          label: `ðŸš€ Project #${projIdx + 1}: ${proj.title || 'Project'}`
        });
        (proj.bullets || []).forEach((bullet, bIdx) => {
          options.push({
            id: `bullet_${proj.id}_${bIdx}`,
            label: `  ↳ Bullet #${bIdx + 1}: "${bullet.length > 40 ? bullet.substring(0, 40) + '...' : bullet}"`
          });
        });
      });
    } else if (targetSec.type === 'education') {
      editableEducations.forEach((edu, eduIdx) => {
        const entryId = `entry_${edu.id}`;
        options.push({
          id: entryId,
          label: `ðŸŽ“ Education #${eduIdx + 1}: ${edu.degree || 'Degree'} - ${edu.institution || 'Institution'}`
        });
        (edu.bullets || []).forEach((bullet, bIdx) => {
          options.push({
            id: `bullet_${edu.id}_${bIdx}`,
            label: `  ↳ Bullet #${bIdx + 1}: "${bullet.length > 40 ? bullet.substring(0, 40) + '...' : bullet}"`
          });
        });
      });
    } else if (targetSec.type === 'custom') {
      (targetSec.bullets || []).forEach((bullet, bIdx) => {
        options.push({
          id: `bullet_${targetSec.id}_${bIdx}`,
          label: `↳ Bullet #${bIdx + 1}: "${bullet.length > 40 ? bullet.substring(0, 40) + '...' : bullet}"`
        });
      });
    }

    return options;
  };

  const extractContentForScope = (sectionId: string, scope: string): string => {
    const targetSec = sections.find(s => s.id === sectionId);
    if (!targetSec) return '';

    if (scope === 'all') {
      if (targetSec.type === 'summary') return editableSummary;
      if (targetSec.type === 'experience') {
        return editableExperiences.map(e => `${e.position || 'Position'} at ${e.company || 'Company'}\n${(e.bullets || []).join('\n')}`).join('\n\n');
      }
      if (targetSec.type === 'projects') {
        return editableProjects.map(p => `${p.title || 'Project'}\n${(p.bullets || []).join('\n')}`).join('\n\n');
      }
      if (targetSec.type === 'education') {
        return editableEducations.map(e => `${e.degree || 'Degree'} - ${e.institution || 'School'}\n${(e.bullets || []).join('\n')}`).join('\n\n');
      }
      if (targetSec.type === 'skills') {
        return editableSkills.map(s => `${s.category}: ${s.name}`).join('\n');
      }
      if (targetSec.type === 'custom') {
        return (targetSec.bullets || []).join('\n');
      }
    }

    if (scope.startsWith('entry_')) {
      const itemId = scope.replace('entry_', '');
      if (targetSec.type === 'experience') {
        const exp = editableExperiences.find(e => e.id === itemId);
        return exp ? (exp.bullets || []).join('\n') : '';
      }
      if (targetSec.type === 'projects') {
        const proj = editableProjects.find(p => p.id === itemId);
        return proj ? (proj.bullets || []).join('\n') : '';
      }
      if (targetSec.type === 'education') {
        const edu = editableEducations.find(e => e.id === itemId);
        return edu ? (edu.bullets || []).join('\n') : '';
      }
    }

    if (scope.startsWith('bullet_')) {
      const parts = scope.replace('bullet_', '').split('_');
      const itemId = parts[0];
      const bulletIdx = parseInt(parts[1], 10);

      if (targetSec.type === 'experience') {
        const exp = editableExperiences.find(e => e.id === itemId);
        return exp && exp.bullets ? (exp.bullets[bulletIdx] || '') : '';
      }
      if (targetSec.type === 'projects') {
        const proj = editableProjects.find(p => p.id === itemId);
        return proj && proj.bullets ? (proj.bullets[bulletIdx] || '') : '';
      }
      if (targetSec.type === 'education') {
        const edu = editableEducations.find(e => e.id === itemId);
        return edu && edu.bullets ? (edu.bullets[bulletIdx] || '') : '';
      }
      if (targetSec.type === 'custom') {
        return targetSec.bullets ? (targetSec.bullets[bulletIdx] || '') : '';
      }
    }

    return '';
  };

  // AI Section/Entry/Bullet Polish Generator
  const handleGenerateSectionAi = async (sectionId: string, customInstruction?: string, scopeOverride?: string) => {
    const targetSec = sections.find(s => s.id === sectionId);
    if (!targetSec) return;

    const activeScope = scopeOverride || sectionAiScope || 'all';
    const contentToRewrite = extractContentForScope(sectionId, activeScope);

    if (!contentToRewrite.trim()) return;

    setIsGeneratingSectionAi(true);

    try {
      const instruction = customInstruction || sectionAiPrompt || 'Enhance impact with strong action verbs, professional tone, and ATS keyword relevance.';

      const res = await api.post('/resume/rephrase', {
        text: contentToRewrite,
        instruction: instruction
      });

      const proposed = res.data?.rephrased || res.data?.rewritten_text || res.data?.result || res.data?.text || contentToRewrite;

      setSectionAiProposal({
        sectionId,
        originalText: contentToRewrite,
        proposedText: proposed,
        payload: { sectionId, type: targetSec.type, scope: activeScope, proposed }
      });
    } catch (err) {
      console.error('Section AI polish failed:', err);
    } finally {
      setIsGeneratingSectionAi(false);
    }
  };

  const handleResetSectionToMasterProfile = (sectionId: string) => {
    if (!masterProfileData) return;
    if (sectionId === 'header') {
      if (masterProfileData.personal_info) {
        setEditablePersonalInfo(JSON.parse(JSON.stringify(masterProfileData.personal_info)));
      }
      return;
    }
    const sec = sections.find(s => s.id === sectionId);
    if (!sec) return;

    if (sec.type === 'summary') {
      if (masterProfileData.personal_info?.summary) {
        setEditableSummary(masterProfileData.personal_info.summary);
      }
    } else if (sec.type === 'experience') {
      if (masterProfileData.work_experiences) {
        setEditableExperiences(JSON.parse(JSON.stringify(masterProfileData.work_experiences)));
      }
    } else if (sec.type === 'projects') {
      if (masterProfileData.projects) {
        setEditableProjects(JSON.parse(JSON.stringify(masterProfileData.projects)));
      }
    } else if (sec.type === 'education') {
      if (masterProfileData.educations) {
        setEditableEducations(JSON.parse(JSON.stringify(masterProfileData.educations)));
      }
    } else if (sec.type === 'skills') {
      if (masterProfileData.skills) {
        setEditableSkills(JSON.parse(JSON.stringify(masterProfileData.skills)));
      }
    }
  };

  const handleToggleSectionVersion = (sectionId: string) => {
    const sec = sections.find(s => s.id === sectionId);
    if (!sec || !sec.originalSnapshot) return;

    const isCurrentlyAi = sec.activeVersion !== 'original';
    const nextVersion = isCurrentlyAi ? 'original' : 'ai';
    const snapshot = isCurrentlyAi ? sec.originalSnapshot : sec.aiSnapshot;
    if (!snapshot) return;

    if (sec.type === 'summary') {
      if (snapshot.summary !== undefined) setEditableSummary(snapshot.summary);
    } else if (sec.type === 'experience') {
      if (snapshot.experiences) setEditableExperiences(snapshot.experiences);
    } else if (sec.type === 'projects') {
      if (snapshot.projects) setEditableProjects(snapshot.projects);
    } else if (sec.type === 'education') {
      if (snapshot.educations) setEditableEducations(snapshot.educations);
    }

    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        activeVersion: nextVersion,
        ...(s.type === 'custom' ? snapshot : {})
      };
    }));
  };

  const handleApplySectionAiProposal = () => {
    if (!sectionAiProposal) return;
    const { sectionId, type, scope, proposed } = sectionAiProposal.payload;

    // 1. Capture original snapshot before applying AI changes
    const targetSec = sections.find(s => s.id === sectionId);
    if (targetSec && !targetSec.originalSnapshot) {
      let origSnapshot: any = {};
      if (targetSec.type === 'summary') {
        origSnapshot = { summary: editableSummary };
      } else if (targetSec.type === 'experience') {
        origSnapshot = { experiences: JSON.parse(JSON.stringify(editableExperiences)) };
      } else if (targetSec.type === 'projects') {
        origSnapshot = { projects: JSON.parse(JSON.stringify(editableProjects)) };
      } else if (targetSec.type === 'education') {
        origSnapshot = { educations: JSON.parse(JSON.stringify(editableEducations)) };
      } else if (targetSec.type === 'custom') {
        origSnapshot = {
          bullets: targetSec.bullets ? [...targetSec.bullets] : undefined,
          keyValuePairs: targetSec.keyValuePairs ? JSON.parse(JSON.stringify(targetSec.keyValuePairs)) : undefined,
          entries: targetSec.entries ? JSON.parse(JSON.stringify(targetSec.entries)) : undefined,
          paragraphText: targetSec.paragraphText
        };
      }

      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, originalSnapshot: origSnapshot, activeVersion: 'ai' } : s));
    }

    // 2. Apply proposed AI content
    if (scope === 'all') {
      if (type === 'summary') {
        setEditableSummary(proposed);
      } else if (type === 'custom') {
        const bullets = proposed.split('\n').map((b: string) => b.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, bullets } : s));
      } else if (type === 'experience') {
        const blocks = proposed.split('\n\n');
        setEditableExperiences(prev => prev.map((exp, idx) => {
          const block = blocks[idx] || blocks[0];
          if (!block) return exp;
          const bullets = block.split('\n').map((b: string) => b.replace(/^[-•*]\s*/, '').trim()).filter((b: string) => b && !b.toLowerCase().includes(' at '));
          return bullets.length > 0 ? { ...exp, bullets } : exp;
        }));
      } else if (type === 'projects') {
        const blocks = proposed.split('\n\n');
        setEditableProjects(prev => prev.map((proj, idx) => {
          const block = blocks[idx] || blocks[0];
          if (!block) return proj;
          const bullets = block.split('\n').map((b: string) => b.replace(/^[-•*]\s*/, '').trim()).filter((b: string) => b && !b.includes('('));
          return bullets.length > 0 ? { ...proj, bullets } : proj;
        }));
      } else if (type === 'education') {
        const blocks = proposed.split('\n\n');
        setEditableEducations(prev => prev.map((edu, idx) => {
          const block = blocks[idx] || blocks[0];
          if (!block) return edu;
          const bullets = block.split('\n').map((b: string) => b.replace(/^[-•*]\s*/, '').trim()).filter((b: string) => b && !b.includes('-'));
          return bullets.length > 0 ? { ...edu, bullets } : edu;
        }));
      }
    } else if (scope.startsWith('entry_')) {
      const itemId = scope.replace('entry_', '');
      const bullets = proposed.split('\n').map((b: string) => b.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
      if (bullets.length > 0) {
        if (type === 'experience') {
          setEditableExperiences(prev => prev.map(e => e.id === itemId ? { ...e, bullets } : e));
        } else if (type === 'projects') {
          setEditableProjects(prev => prev.map(p => p.id === itemId ? { ...p, bullets } : p));
        } else if (type === 'education') {
          setEditableEducations(prev => prev.map(e => e.id === itemId ? { ...e, bullets } : e));
        }
      }
    } else if (scope.startsWith('bullet_')) {
      const parts = scope.replace('bullet_', '').split('_');
      const itemId = parts[0];
      const bulletIdx = parseInt(parts[1], 10);
      const cleanBullet = proposed.trim().replace(/^[-•*]\s*/, '');

      if (cleanBullet) {
        if (type === 'experience') {
          setEditableExperiences(prev => prev.map(exp => {
            if (exp.id !== itemId) return exp;
            const updated = [...exp.bullets];
            updated[bulletIdx] = cleanBullet;
            return { ...exp, bullets: updated };
          }));
        } else if (type === 'projects') {
          setEditableProjects(prev => prev.map(proj => {
            if (proj.id !== itemId) return proj;
            const updated = [...proj.bullets];
            updated[bulletIdx] = cleanBullet;
            return { ...proj, bullets: updated };
          }));
        } else if (type === 'education') {
          setEditableEducations(prev => prev.map(edu => {
            if (edu.id !== itemId) return edu;
            const updated = [...(edu.bullets || [])];
            updated[bulletIdx] = cleanBullet;
            return { ...edu, bullets: updated };
          }));
        } else if (type === 'custom') {
          setSections(prev => prev.map(s => {
            if (s.id !== sectionId) return s;
            const updated = [...(s.bullets || [])];
            updated[bulletIdx] = cleanBullet;
            return { ...s, bullets: updated };
          }));
        }
      }
    }

    // 3. Save AI snapshot for future toggle
    setTimeout(() => {
      setSections(prev => prev.map(s => {
        if (s.id !== sectionId) return s;
        let aiSnap: any = {};
        if (s.type === 'summary') {
          aiSnap = { summary: editableSummary };
        } else if (s.type === 'experience') {
          aiSnap = { experiences: JSON.parse(JSON.stringify(editableExperiences)) };
        } else if (s.type === 'projects') {
          aiSnap = { projects: JSON.parse(JSON.stringify(editableProjects)) };
        } else if (s.type === 'education') {
          aiSnap = { educations: JSON.parse(JSON.stringify(editableEducations)) };
        } else if (s.type === 'custom') {
          aiSnap = {
            bullets: s.bullets ? [...s.bullets] : undefined,
            keyValuePairs: s.keyValuePairs ? JSON.parse(JSON.stringify(s.keyValuePairs)) : undefined,
            entries: s.entries ? JSON.parse(JSON.stringify(s.entries)) : undefined,
            paragraphText: s.paragraphText
          };
        }
        return { ...s, aiSnapshot: aiSnap, activeVersion: 'ai' };
      }));
    }, 60);

    setSectionAiProposal(null);
    setOpenSectionAiModalId(null);
    setSectionAiPrompt('');
  };

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

  const handleMoveSkillCategory = (catName: string, direction: 'up' | 'down') => {
    const itSkills = editableSkills.filter(sk => (sk.category || '').toLowerCase().trim() !== 'languages');
    const uniqueCats = Array.from(new Set(itSkills.map(sk => (sk.category || 'technical').toLowerCase().trim())));

    const normalizedOrder = categoryOrder.map(c => c.toLowerCase().trim());
    const currentItCats = normalizedOrder.filter(c => uniqueCats.includes(c));
    const extraCats = uniqueCats.filter(c => !currentItCats.includes(c));
    let currentList = [...currentItCats, ...extraCats];

    if (categoryOrder.length === 0) {
      const defaultOrder = ['programming languages', 'frameworks & libraries', 'databases', 'cloud & devops', 'development tools', 'testing'];
      currentList.sort((a, b) => {
        const idxA = defaultOrder.indexOf(a);
        const idxB = defaultOrder.indexOf(b);
        return (idxA !== -1 ? idxA : 100) - (idxB !== -1 ? idxB : 100);
      });
    }

    const targetCat = catName.toLowerCase().trim();
    const idx = currentList.indexOf(targetCat);
    if (idx === -1) return;

    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= currentList.length) return;

    const updatedList = [...currentList];
    const temp = updatedList[idx];
    updatedList[idx] = updatedList[newIdx];
    updatedList[newIdx] = temp;

    setCategoryOrder(updatedList);
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

  const handleOpenSectionDetail = (secId: string) => {
    setActiveDetailSectionId(secId);
    setTimeout(() => {
      const secEl = document.querySelector(`[data-section-id="${secId}"]`);
      if (secEl) {
        secEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handlePolishInlineText = (text: string, onAccept: (newText: string) => void) => {
    if (!text || !text.trim()) return;
    setPolishModalInfo({ text, onAccept });
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
      // Defer measurement while the canvas pane is hidden (mobile Editor mode) — zero-height reads would corrupt pagination
      if (hiddenCanvasRef.current.getBoundingClientRect().width === 0) return;

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
          const uniqueCats = Array.from(new Set(itSkills.map(s => (s.category || 'technical').toLowerCase().trim())));

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

          const addLanguagesUnit = () => {
            if (langSkills.length > 0) {
              unitsList.push({ type: 'skills-languages', id: 'skills-languages', sectionId: sec.id, skills: langSkills });
            }
          };

          const addITSkillsUnits = () => {
            finalCategories.forEach((cat) => {
              const catSkills = itSkills.filter(s => (s.category || 'technical').toLowerCase().trim() === cat);
              if (catSkills.length > 0) {
                unitsList.push({
                  type: 'skills-category',
                  id: `skills-category-${cat}`,
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
      const pageHeight = 1123;
      const pageMargin = customStyles.pageMargin || 48;

      // Usable inner content height for allowedPageContentHeight zone (exact top/bottom margin bounds)
      const printableContentHeight = pageHeight - 2 * pageMargin;
      const activeColumnLimit = printableContentHeight;

      // Helper to compute unit effective height directly from true measured DOM height
      const getUnitEffectiveHeight = (u: RenderableUnit): number => {
        const baseHeight = measured[u.id] || 0;
        const unitGap = u.type === 'section-title' ? (customStyles.sectionSpacing || 14) : 4;
        return baseHeight + unitGap;
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

        let shouldPushPage = false;

        // Strict Section Atomicity Page Partitioning:
        // When encountering a section-title, calculate the height of this title PLUS ALL ITS SUBSEQUENT ITEMS in unitsList.
        if (unit.type === 'section-title') {
          // Find all units belonging to this section starting from this title
          let remainingSectionHeight = 0;
          for (let j = i; j < unitsList.length && unitsList[j].sectionId === unit.sectionId; j++) {
            remainingSectionHeight += getUnitEffectiveHeight(unitsList[j]);
          }

          const currentHeight = isSidebarColumn ? currentSidebarHeight : currentMainHeight;

          // If the entire section can fit on a clean blank page (remainingSectionHeight <= activeColumnLimit),
          // but DOES NOT fit in the current page's remaining space, push the ENTIRE section to the next page!
          if (remainingSectionHeight <= activeColumnLimit) {
            if (currentHeight + remainingSectionHeight > activeColumnLimit && currentHeight > 0) {
              shouldPushPage = true;
            }
          } else {
            // Section itself is larger than 1 full page:
            // At least ensure title + first content item fit on the current page, otherwise push title to next page.
            const firstContentUnit = unitsList[i + 1] && unitsList[i + 1].sectionId === unit.sectionId ? unitsList[i + 1] : null;
            const minHeaderGroupHeight = effHeight + (firstContentUnit ? getUnitEffectiveHeight(firstContentUnit) : 0);
            if (currentHeight + minHeaderGroupHeight > activeColumnLimit && currentHeight > 0) {
              shouldPushPage = true;
            }
          }
        } else {
          // Individual item overflow check
          const currentHeight = isSidebarColumn ? currentSidebarHeight : currentMainHeight;
          if (currentHeight + effHeight > activeColumnLimit && currentHeight > 0) {
            shouldPushPage = true;
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

    measureAndLayout();
    const timer = setTimeout(measureAndLayout, 60);
    return () => clearTimeout(timer);
  }, [
    editableSummary, editablePersonalInfo, editableExperiences, editableSkills,
    editableProjects, editableEducations, template, sections, customStyles, headerStyles,
    languagesFirst, categoryOrder, mobileActivePane
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
        setLetterContent(res.data.content || res.data.data?.content || '');
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
          letterStyles
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
        const letterRes = await api.get('/resume/letters');
        const matchedLetter = letterRes.data.find((l: any) => l.application === initialJobParams?.application_id || l.target_company === savedVersion.target_company);
        if (matchedLetter) {
          await api.patch(`/resume/letters/${matchedLetter.id}`, {
            content: letterContent,
            tone: letterTone
          });
        } else {
          await api.post('/resume/letters', {
            application: initialJobParams?.application_id,
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
                            border: aggressiveMode ? '2px solid #6366f1' : '1px solid #cbd5e1',
                            background: aggressiveMode ? 'rgba(99, 102, 241, 0.12)' : '#ffffff',
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
                    if (!infoToCheck.linkedin) missing.push({ field: 'linkedin', label: 'LinkedIn Profile URL', icon: 'ðŸ”—' });
                    if (!infoToCheck.github) missing.push({ field: 'github', label: 'GitHub Profile URL', icon: 'ðŸ’»' });
                    if (!infoToCheck.phone) missing.push({ field: 'phone', label: 'Phone Number', icon: 'ðŸ“ž' });
                    if (!infoToCheck.location) missing.push({ field: 'location', label: 'Location / City', icon: 'ðŸ“' });
                    if (!infoToCheck.email) missing.push({ field: 'email', label: 'Email Address', icon: 'âœ‰ï¸' });

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
                        {applicationTracked ? 'âœ“ Tracking this Application' : 'Track this job application?'}
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

                  <div className={styles.formGrid} style={{ marginBottom: '16px' }}>
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

                    <div className={styles.selectGroup}>
                      <label htmlFor="letterLanguageSelect">Cover Letter Language</label>
                      <select
                        id="letterLanguageSelect"
                        value={letterLanguage}
                        onChange={(e) => setLetterLanguage(e.target.value as any)}
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
                        <option value="auto">Auto (Match Resume Language)</option>
                        <option value="en">English</option>
                        <option value="de">German</option>
                      </select>
                    </div>
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

                {(() => {
                  const letter = getParsedLetter(letterContent, editablePersonalInfo);
                  const notes = letter.verification_notes;
                  if (!notes || (!notes.requirements_emphasized?.length && !notes.resume_evidence_used?.length && !notes.placeholders?.length && !notes.confirmation_needed?.length)) {
                    return null;
                  }
                  return (
                    <div className={`${styles.atsCard} glass-card`} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontSize: '14px', fontWeight: 700, margin: 0 }}>
                          <Sparkles size={16} style={{ color: '#6366f1' }} />
                          AI Generation Audit
                        </h3>
                        <span style={{ fontSize: '10px', background: '#e0e7ff', color: '#4f46e5', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>Active Audit</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {notes.requirements_emphasized && notes.requirements_emphasized.length > 0 && (
                          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', borderLeft: '3.5px solid #6366f1', border: '1px solid #e2e8f0', borderLeftWidth: '3.5px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '14px' }}>ðŸŽ¯</span>
                              <strong style={{ fontSize: '12px', color: '#1e293b' }}>Emphasized Requirements</strong>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {notes.requirements_emphasized.map((req, idx) => (
                                <li key={idx} style={{ lineHeight: '1.4' }}>{req}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {notes.resume_evidence_used && notes.resume_evidence_used.length > 0 && (
                          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', borderLeft: '3.5px solid #10b981', border: '1px solid #e2e8f0', borderLeftWidth: '3.5px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '14px' }}>ðŸ“„</span>
                              <strong style={{ fontSize: '12px', color: '#1e293b' }}>Evidence Used from CV</strong>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {notes.resume_evidence_used.map((ev, idx) => (
                                <li key={idx} style={{ lineHeight: '1.4' }}>{ev}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {notes.placeholders && notes.placeholders.length > 0 && (
                          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fffbeb', borderLeft: '3.5px solid #f59e0b', border: '1px solid #fef3c7', borderLeftWidth: '3.5px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '14px' }}>âš ï¸</span>
                              <strong style={{ fontSize: '12px', color: '#b45309' }}>Missing Facts / Placeholders</strong>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#78350f', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {notes.placeholders.map((pl, idx) => (
                                <li key={idx} style={{ lineHeight: '1.4' }}>{pl}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {notes.confirmation_needed && notes.confirmation_needed.length > 0 && (
                          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fef2f2', borderLeft: '3.5px solid #ef4444', border: '1px solid #fee2e2', borderLeftWidth: '3.5px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '14px' }}>ðŸ”</span>
                              <strong style={{ fontSize: '12px', color: '#b91c1c' }}>Confirmation Required</strong>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#991b1b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {notes.confirmation_needed.map((conf, idx) => (
                                <li key={idx} style={{ lineHeight: '1.4' }}>{conf}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
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
              // CV Design & Layout Options
              <div className={`${styles.styleControlsForm} glass-card`}>
                {/* Sub-Tab Navigation Bar: Theme vs Sections */}
                <div className={styles.subTabContainer}>
                  <button
                    type="button"
                    className={`${styles.subTabBtn} ${activeStyleSubTab === 'sections' ? styles.activeSubTab : ''}`}
                    onClick={() => setActiveStyleSubTab('sections')}
                  >
                    <Layers size={13} />
                    <span>Sections & Content</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.subTabBtn} ${activeStyleSubTab === 'theme' ? styles.activeSubTab : ''}`}
                    onClick={() => setActiveStyleSubTab('theme')}
                  >
                    <Sliders size={13} />
                    <span>Theme & Typography</span>
                  </button>
                </div>

                {/* Sub-Tab 1: Theme & Typography */}
                {activeStyleSubTab === 'theme' && (
                  <>
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
                        <label>Page Margin: <strong>{customStyles.pageMargin || 48}px</strong></label>
                        <input
                          type="range"
                          min="15"
                          max="90"
                          step="0.5"
                          value={customStyles.pageMargin || 48}
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
                  </>
                )}

                {/* Sub-Tab 2: Sections & Content */}
                {activeStyleSubTab === 'sections' && (
                  activeDetailSectionId ? (
                    /* Master-Detail Full Section Editor */
                    <SectionDetailEditor
                      sectionId={activeDetailSectionId}
                      sections={sections}
                      setSections={setSections}
                      onBack={() => setActiveDetailSectionId(null)}
                      onSelectSection={(newSecId) => handleOpenSectionDetail(newSecId)}
                      personalInfo={editablePersonalInfo}
                      setPersonalInfo={setEditablePersonalInfo}
                      summary={editableSummary}
                      setSummary={setEditableSummary}
                      experiences={editableExperiences}
                      setExperiences={setEditableExperiences}
                      onAddExperience={handleAddExperience}
                      projects={editableProjects}
                      setProjects={setEditableProjects}
                      onAddProject={handleAddProject}
                      educations={editableEducations}
                      setEducations={setEditableEducations}
                      onAddEducation={handleAddEducation}
                      skills={editableSkills}
                      setSkills={setEditableSkills}
                      categoryOrder={categoryOrder}
                      onMoveSkillCategory={handleMoveSkillCategory}
                      getLocalizedCategoryName={getLocalizedCategoryName}
                      languagesTitle={languagesTitle}
                      setLanguagesTitle={setLanguagesTitle}
                      targetLanguage={targetLanguage}
                      onOpenAiPolishModal={(secId) => setOpenSectionAiModalId(secId)}
                      onPolishBullet={handlePolishInlineText}
                      toggleSectionVisibility={toggleSectionVisibility}
                      animatingHideSectionId={animatingHideSectionId}
                      onToggleSectionVersion={handleToggleSectionVersion}
                      onResetToMasterProfile={handleResetSectionToMasterProfile}
                    />
                  ) : (
                    /* Section Control Overview Matrix */
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0 }}>Sections Control Panel</h3>
                        <span style={{ fontSize: '11px', color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                          {sections.filter(s => s.visible).length} visible / {sections.length + 1} total
                        </span>
                      </div>

                      {/* Header / Personal Info Card */}
                      <div className={`${styles.sectionCardItem} ${styles.sectionCardHeaderItem}`} style={{ marginBottom: '8px' }}>
                        <div
                          className={styles.sectionCardLeft}
                          onClick={() => handleOpenSectionDetail('header')}
                        >
                          <div
                            className={styles.sectionIconBadge}
                            style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#4f46e5' }}
                          >
                            <User size={16} />
                          </div>
                          <div className={styles.sectionCardInfo}>
                            <div className={styles.sectionCardTitle}>
                              <span>Personal Info & Header</span>
                            </div>
                            <div className={styles.sectionCardSubtitle}>
                              {editablePersonalInfo.full_name || 'Your name'} • {editablePersonalInfo.title || 'Headline & Contact'}
                            </div>
                          </div>
                        </div>

                        <div className={styles.sectionCardRight}>
                          <button
                            type="button"
                            className={styles.sectionAiCardBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResetSectionToMasterProfile('header');
                            }}
                            title="Reset Personal Info & Header to Master Profile Original"
                            style={{ marginRight: '4px' }}
                          >
                            <RotateCcw size={13} />
                          </button>
                          <button
                            type="button"
                            className={styles.sectionEditCardBtn}
                            onClick={() => handleOpenSectionDetail('header')}
                            title="Edit Personal Information"
                          >
                            <span>Edit</span>
                            <Settings size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Dynamic CV Sections Cards */}
                      <div className={styles.sectionsList}>
                        {sections.map((secItem, idx) => {
                          const meta = (() => {
                            if (secItem.type === 'summary' || secItem.id === 'summary') {
                              const words = editableSummary ? editableSummary.trim().split(/\s+/).filter(Boolean).length : 0;
                              return {
                                icon: <FileText size={16} />,
                                iconBg: 'rgba(99, 102, 241, 0.12)',
                                iconColor: '#6366f1',
                                subtitle: words > 0 ? `${words} words pitch` : 'Summary not set'
                              };
                            }
                            if (secItem.type === 'experience' || secItem.id === 'experience') {
                              return {
                                icon: <Briefcase size={16} />,
                                iconBg: 'rgba(59, 130, 246, 0.12)',
                                iconColor: '#3b82f6',
                                subtitle: `${editableExperiences.length} position${editableExperiences.length === 1 ? '' : 's'}`
                              };
                            }
                            if (secItem.type === 'projects' || secItem.id === 'projects') {
                              return {
                                icon: <Code size={16} />,
                                iconBg: 'rgba(16, 185, 129, 0.12)',
                                iconColor: '#10b981',
                                subtitle: `${editableProjects.length} project${editableProjects.length === 1 ? '' : 's'}`
                              };
                            }
                            if (secItem.type === 'education' || secItem.id === 'education') {
                              return {
                                icon: <GraduationCap size={16} />,
                                iconBg: 'rgba(245, 158, 11, 0.12)',
                                iconColor: '#f59e0b',
                                subtitle: `${editableEducations.length} degree${editableEducations.length === 1 ? '' : 's'}`
                              };
                            }
                            if (secItem.type === 'skills' || secItem.id === 'skills') {
                              const langCount = editableSkills.filter(s => (s.category || '').toLowerCase().trim() === 'languages').length;
                              const itCount = editableSkills.length - langCount;
                              return {
                                icon: <Globe size={16} />,
                                iconBg: 'rgba(236, 72, 153, 0.12)',
                                iconColor: '#ec4899',
                                subtitle: `${itCount} skills • ${langCount} languages`
                              };
                            }
                            const count = secItem.customFormat === 'keyvalue' ? (secItem.keyValuePairs?.length || 0) : (secItem.bullets?.length || 0);
                            return {
                              icon: <Layers size={16} />,
                              iconBg: 'rgba(99, 102, 241, 0.12)',
                              iconColor: '#6366f1',
                              subtitle: `${count} custom item${count === 1 ? '' : 's'}`
                            };
                          })();

                          return (
                            <div
                              key={secItem.id}
                              className={`${styles.sectionCardItem} ${!secItem.visible ? styles.sectionCardDisabled : ''}`}
                            >
                              <div
                                className={styles.sectionCardLeft}
                                onClick={() => handleOpenSectionDetail(secItem.id)}
                              >
                                <div
                                  className={styles.sectionIconBadge}
                                  style={{ background: meta.iconBg, color: meta.iconColor }}
                                >
                                  {meta.icon}
                                </div>
                                <div className={styles.sectionCardInfo}>
                                  <div className={styles.sectionCardTitle}>
                                    <span>{secItem.name}</span>
                                    {!secItem.visible && (
                                      <span className={styles.sectionHiddenBadge}>Hidden</span>
                                    )}
                                  </div>
                                  <div className={styles.sectionCardSubtitle}>
                                    {meta.subtitle}
                                  </div>
                                </div>
                              </div>

                              <div className={styles.sectionCardRight}>
                                <button
                                  type="button"
                                  className={`${styles.sectionVisibilityBtn} ${secItem.visible && animatingHideSectionId !== secItem.id ? styles.sectionVisibilityBtnActive : ''}`}
                                  onClick={() => toggleSectionVisibility(secItem.id)}
                                  title={secItem.visible && animatingHideSectionId !== secItem.id ? 'Hide section from CV' : 'Show section on CV'}
                                >
                                  {secItem.visible && animatingHideSectionId !== secItem.id ? <Eye size={13} /> : <EyeOff size={13} />}
                                </button>

                                <button
                                  type="button"
                                  className={styles.sectionAiCardBtn}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenSectionAiModalId(secItem.id);
                                  }}
                                  title={`AI Polish & Tailor ${secItem.name}`}
                                >
                                  <Sparkles size={13} />
                                </button>

                                <button
                                  type="button"
                                  className={styles.sectionAiCardBtn}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResetSectionToMasterProfile(secItem.id);
                                  }}
                                  title={`Reset ${secItem.name} to Master Profile Original`}
                                >
                                  <RotateCcw size={13} />
                                </button>

                                <button
                                  type="button"
                                  className={styles.sectionEditCardBtn}
                                  onClick={() => handleOpenSectionDetail(secItem.id)}
                                  title={`Edit ${secItem.name}`}
                                >
                                  <span>Edit</span>
                                  <Settings size={11} />
                                </button>

                                {secItem.id.startsWith('custom_') && (
                                  <button
                                    type="button"
                                    className={styles.sectionDeleteBtn}
                                    onClick={() => {
                                      if (window.confirm(`Delete section "${secItem.name}"?`)) {
                                        setSections(prev => prev.filter(s => s.id !== secItem.id));
                                      }
                                    }}
                                    title="Delete Custom Section"
                                  >
                                    <Trash size={12} />
                                  </button>
                                )}

                                <div className={styles.sectionSortGroup}>
                                  <button
                                    type="button"
                                    className={styles.sectionSortBtn}
                                    disabled={idx === 0}
                                    onClick={() => {
                                      const reordered = [...sections];
                                      const temp = reordered[idx];
                                      reordered[idx] = reordered[idx - 1];
                                      reordered[idx - 1] = temp;
                                      setSections(reordered);
                                    }}
                                    title="Move Up"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.sectionSortBtn}
                                    disabled={idx === sections.length - 1}
                                    onClick={() => {
                                      const reordered = [...sections];
                                      const temp = reordered[idx];
                                      reordered[idx] = reordered[idx + 1];
                                      reordered[idx + 1] = temp;
                                      setSections(reordered);
                                    }}
                                    title="Move Down"
                                  >
                                    ▼
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        className={styles.addCustomSectionCard}
                        onClick={() => setIsAddCustomSectionOpen(true)}
                      >
                        <Plus size={15} />
                        <span>Add Custom Section (Certifications, Awards, etc.)</span>
                      </button>
                    </>
                  )
                )}
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
                    âœï¸ Signature Settings
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
