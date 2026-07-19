import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/Button';
import { InputField } from '../components/InputField';
import api from '../services/api';
import {
  Wand2, Download, Printer, Check, X, ShieldAlert, Sparkles, FileText, Brain, Award, Save, RefreshCw, GripVertical, Trash, Plus, Settings, ArrowUp, ArrowDown
} from 'lucide-react';
import styles from './Editor.module.css';

interface ResumeVersion {
  id: string;
  title: string;
  target_company: string;
  target_role: string;
  ats_score: number;
  tailored_summary: string;
  tailored_details: {
    experiences: Array<{ id: string; bullets: string[] }>;
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
}

interface EditorProps {
  initialJobParams?: { company?: string; position?: string; desc?: string; application_id?: string; tab?: string };
}

// Auto-resizing Textarea component
const AutoSizeTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}> = ({ value, onChange, className, placeholder }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
    // Also adjust height on a small delay to handle font loading/rendering timing
    const timer = setTimeout(adjustHeight, 50);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const handleStyleChange = () => {
      adjustHeight();
      setTimeout(adjustHeight, 50);
    };
    window.addEventListener('cv-style-change', handleStyleChange);
    return () => {
      window.removeEventListener('cv-style-change', handleStyleChange);
    };
  }, []);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
        lineHeight: 'inherit'
      }}
    />
  );
};

export const Editor: React.FC<EditorProps> = ({ initialJobParams }) => {
  const [jobDescription, setJobDescription] = useState('');
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [template, setTemplate] = useState('pixel_perfect_pdf');
  const [isLoading, setIsLoading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<ResumeVersion | null>(null);

  // Tab control
  const [editorTab, setEditorTab] = useState<'resume' | 'letter' | 'job'>('resume');

  const updateTabHash = (newTab: 'resume' | 'letter' | 'job') => {
    setEditorTab(newTab);
    if (initialJobParams?.application_id) {
      window.location.hash = `editor?appId=${initialJobParams.application_id}&tab=${newTab}`;
    }
  };

  // Auto-fit Scale states
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Active control panel tab
  const [activeControlTab, setActiveControlTab] = useState<'tailor' | 'style'>('tailor');
  const [expandedSectionSettings, setExpandedSectionSettings] = useState<string | null>(null);

  // Customization & Spacing variables
  const [sections, setSections] = useState<Array<{
    id: string;
    name: string;
    visible: boolean;
    type: 'summary' | 'experience' | 'skills' | 'projects' | 'education' | 'custom';
    bullets?: string[];
    customStyles?: { fontSize?: number; spacing?: number; alignment?: string };
  }>>([
    { id: 'summary', name: 'Professional Summary', visible: true, type: 'summary' },
    { id: 'experience', name: 'Work Experience', visible: true, type: 'experience' },
    { id: 'projects', name: 'Other Projects', visible: true, type: 'projects' },
    { id: 'education', name: 'Education', visible: true, type: 'education' },
    { id: 'skills', name: 'Skills & Competencies', visible: true, type: 'skills' }
  ]);

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
  }>({
    fontSize: 13,
    headingSize: 1.4,
    lineHeight: 1.4,
    sectionSpacing: 20,
    accentColor: '#0f172a',
    textColor: '#334155',
    alignment: 'left',
    pageMargin: undefined,
    bulletSpacing: 4
  });

  // Cloned editable fields
  const [editableSummary, setEditableSummary] = useState('');
  const [editableExperiences, setEditableExperiences] = useState<Array<{ id: string; bullets: string[]; company?: string; position?: string; location?: string; start_date?: string; end_date?: string }>>([]);
  const [editableProjects, setEditableProjects] = useState<Array<{ id: string; bullets: string[]; title?: string; role?: string; date?: string }>>([]);
  const [editableEducations, setEditableEducations] = useState<Array<{ id: string; institution: string; degree: string; field_of_study?: string; start_date?: string; end_date?: string; location?: string }>>([]);
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
  const [editableSkills, setEditableSkills] = useState<Array<{ id: string; name: string; category: string }>>([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('technical');
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [languagesFirst, setLanguagesFirst] = useState(true);

  // Sync category order when editableSkills change
  useEffect(() => {
    const itSkills = editableSkills.filter(s => (s.category || '').toLowerCase().trim() !== 'languages');
    const uniqueCats = Array.from(new Set(itSkills.map(s => s.category || 'technical')));
    setCategoryOrder(prev => {
      const filteredPrev = prev.filter(c => uniqueCats.includes(c));
      const added = uniqueCats.filter(c => !filteredPrev.includes(c));
      return [...filteredPrev, ...added];
    });
  }, [editableSkills]);

  // Dynamic paper height auto-fit states
  const [paperHeight, setPaperHeight] = useState(1056);
  const paperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [spacers, setSpacers] = useState<Record<string, number>>({});
  const hiddenCanvasRef = useRef<HTMLDivElement>(null);

  const renderWrappedBlock = (blockKey: string, isMeasuring: boolean, renderFn: () => React.ReactNode) => {
    const spacerHeight = !isMeasuring ? (spacers[blockKey] || 0) : 0;
    return (
      <React.Fragment key={blockKey}>
        {!isMeasuring && spacerHeight > 0 && (
          <div
            className={`${styles.pagePrintSpacer} page-print-spacer`}
            style={{ height: `${spacerHeight}px`, width: '100%', display: 'block', position: 'relative' }}
          >
            <div className={`${styles.pagePrintSpacerLine} no-print`} />
            <span className={`${styles.pagePrintSpacerLabel} no-print`}>
              Page Break Safeguard: Card pushed to next page
            </span>
          </div>
        )}
        <div data-measuring-key={blockKey} style={{ width: '100%' }}>
          {renderFn()}
        </div>
      </React.Fragment>
    );
  };

  const calculatePagination = () => {
    if (!hiddenCanvasRef.current) return;

    const pageHeight = 1056;
    const pageMargin = customStyles.pageMargin || (template === 'german_style_cv' ? 76.8 : (template === 'pixel_perfect_pdf' ? 48 : 32));
    
    // Find all blocks marked for measurement
    const elements = hiddenCanvasRef.current.querySelectorAll('[data-measuring-key]');
    const parentRect = hiddenCanvasRef.current.getBoundingClientRect();

    // Map block IDs to their offsetTop and height (measured unscaled!)
    const blockPositions: Array<{ key: string; top: number; height: number }> = [];
    
    elements.forEach((el: any) => {
      const key = el.getAttribute('data-measuring-key');
      if (key) {
        const rect = el.getBoundingClientRect();
        // Since hiddenCanvas has transform: none, rect.top - parentRect.top is 100% accurate unscaled offsetTop
        const top = rect.top - parentRect.top;
        const height = rect.height;
        blockPositions.push({ key, top, height });
      }
    });

    // Run the pagination layout engine
    let currentPage = 1;
    const newSpacers: Record<string, number> = {};

    blockPositions.forEach((block, index) => {
      const blockHeight = block.height;
      const originalTop = block.top;

      // Calculate where the block sits relative to the current page start
      // Note: el is pushed by any spacers preceding it.
      let currentOffsetTop = originalTop + Object.keys(newSpacers).reduce((sum, key) => sum + newSpacers[key], 0);

      // Update currentPage if the element naturally sits on a subsequent page
      const estimatedPage = Math.floor(currentOffsetTop / pageHeight) + 1;
      if (estimatedPage > currentPage) {
        currentPage = estimatedPage;
      }

      const currentPageStart = (currentPage - 1) * pageHeight + pageMargin;
      const pageEndLimit = currentPage * pageHeight - pageMargin;

      // Check if it sits in the top margin or overflows the bottom limit
      let shouldPush = currentOffsetTop < currentPageStart || (currentOffsetTop + blockHeight > pageEndLimit);

      if (!shouldPush && block.key.startsWith('section_title_')) {
        // Keep-with-next logic: check if the first item of this section overflows
        const nextBlock = blockPositions[index + 1];
        if (nextBlock && nextBlock.key.startsWith('item_')) {
          const nextOriginalTop = nextBlock.top;
          const nextOffsetTop = nextOriginalTop + Object.keys(newSpacers).reduce((sum, key) => sum + newSpacers[key], 0) + blockHeight;
          if (nextOffsetTop + nextBlock.height > pageEndLimit) {
            shouldPush = true;
          }
        }
      }

      if (shouldPush) {
        let targetStart = currentPageStart;
        if (currentOffsetTop + blockHeight > pageEndLimit) {
          // Overflows bottom, push to next page
          targetStart = currentPage * pageHeight + pageMargin;
        }

        if (currentOffsetTop < targetStart) {
          const spacerHeight = targetStart - currentOffsetTop;
          newSpacers[block.key] = spacerHeight;
          currentOffsetTop = targetStart;

          if (targetStart > currentPageStart) {
            currentPage += 1;
          }
        }
      }
    });

    setSpacers(newSpacers);
    setPaperHeight(currentPage * pageHeight);
  };


  // Helper to initialize all fields from a version object
  const initializeVersionFields = (ver: any) => {
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
      const remappedSkills = (profile.skills || []).map((s: any) => {
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
      setEditableProjects(profile.projects || []);
      setEditableEducations(profile.educations || []);
    }

    // Customization & Styles
    const customData = ver.tailored_details.customization;
    if (customData) {
      if (customData.sections) setSections(customData.sections);
      if (customData.customStyles) setCustomStyles(customData.customStyles);
    } else {
      // Reset to defaults
      setSections([
        { id: 'summary', name: 'Professional Summary', visible: true, type: 'summary' },
        { id: 'experience', name: 'Work Experience', visible: true, type: 'experience' },
        { id: 'projects', name: 'Other Projects', visible: true, type: 'projects' },
        { id: 'education', name: 'Education', visible: true, type: 'education' },
        { id: 'skills', name: 'Skills & Competencies', visible: true, type: 'skills' }
      ]);
      setCustomStyles({
        fontSize: 13,
        headingSize: 1.4,
        lineHeight: 1.4,
        sectionSpacing: 20,
        accentColor: ver.template === 'executive_professional' ? '#1e3a8a' : (ver.template === 'creative_tech' ? '#10b981' : '#0f172a'),
        textColor: '#334155',
        alignment: 'left'
      });
    }
  };

  // Canvas Handlers for Work Experience
  const handleAddExperience = () => {
    const newId = `exp_${Date.now()}`;
    const newExp = {
      id: newId,
      company: 'New Company',
      position: 'Job Title',
      location: 'City, Country',
      start_date: 'Start Date',
      end_date: 'Present',
      bullets: ['Describe your accomplishments...']
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

  // Canvas Handlers for Projects
  const handleAddProject = () => {
    const newId = `proj_${Date.now()}`;
    const newProj = {
      id: newId,
      title: 'Project Title',
      role: 'Your Role / Technologies',
      date: 'Project Date',
      bullets: ['Describe your project deliverables...']
    };
    setEditableProjects(prev => [...prev, newProj]);
  };

  const handleRemoveProject = (idx: number) => {
    setEditableProjects(prev => prev.filter((_, i) => i !== idx));
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

  const handleAddProjectBullet = (projIdx: number) => {
    setEditableProjects(prev => prev.map((p, i) => i === projIdx ? {
      ...p,
      bullets: [...p.bullets, 'New project milestone...']
    } : p));
  };

  const handleRemoveProjectBullet = (projIdx: number, bulletIdx: number) => {
    setEditableProjects(prev => prev.map((p, i) => i === projIdx ? {
      ...p,
      bullets: p.bullets.filter((_, bI) => bI !== bulletIdx)
    } : p));
  };

  // Canvas Handlers for Education
  const handleAddEducation = () => {
    const newId = `edu_${Date.now()}`;
    const newEdu = {
      id: newId,
      institution: 'Institution Name',
      degree: 'Degree Title',
      field_of_study: 'Field of Study',
      start_date: 'Start Year',
      end_date: 'End Year',
      location: 'City, Country'
    };
    setEditableEducations(prev => [...prev, newEdu]);
  };

  const handleRemoveEducation = (idx: number) => {
    setEditableEducations(prev => prev.filter((_, i) => i !== idx));
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

  // Canvas Handlers for Skills
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    const newSkill = {
      id: `skill_${Date.now()}`,
      name: newSkillName.trim(),
      category: newSkillCategory
    };
    setEditableSkills(prev => [...prev, newSkill]);
    setNewSkillName('');
  };

  const handleRemoveSkill = (skillId: string) => {
    setEditableSkills(prev => prev.filter(s => s.id !== skillId));
  };

  const handleMoveCategory = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === categoryOrder.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const nextList = [...categoryOrder];
    const temp = nextList[idx];
    nextList[idx] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    setCategoryOrder(nextList);
  };

  const handleDeleteCategory = (catName: string) => {
    if (window.confirm(`Delete skills category "${catName}"?`)) {
      setEditableSkills(prev => prev.filter(s => (s.category || '').toLowerCase() !== catName.toLowerCase()));
    }
  };

  // Trigger textareas adjustment when styles or layout properties change
  useEffect(() => {
    window.dispatchEvent(new Event('cv-style-change'));
  }, [customStyles, sections, template]);

  // Measure layout height of the resume paper dynamically
  useEffect(() => {
    const timer = setTimeout(() => {
      calculatePagination();
    }, 100);
    return () => clearTimeout(timer);
  }, [editableSummary, editableExperiences, editableSkills, editablePersonalInfo, editableProjects, editableEducations, template, editorTab, sections, customStyles]);

  const [reviewedActions, setReviewedActions] = useState<Record<string, 'accepted' | 'rejected'>>({});
  const [hoveredSuggestion, setHoveredSuggestion] = useState<string | null>(null);

  // Cover Letter states
  const [letterContent, setLetterContent] = useState('');
  const [letterTone, setLetterTone] = useState('professional');
  const [isLetterLoading, setIsLetterLoading] = useState(false);

  // Rephrasing states
  const [rephrasePrompt, setRephrasePrompt] = useState<Record<string, string>>({});
  const [isRephrasing, setIsRephrasing] = useState<Record<string, boolean>>({});

  // Save states
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveBanner, setShowSaveBanner] = useState(false);

  // Hover Tooltip timer ref
  const tooltipTimeoutRef = useRef<any>(null);

  const handleMouseEnterSuggestion = (id: string) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setHoveredSuggestion(id);
  };

  const handleMouseLeaveSuggestion = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setHoveredSuggestion(null);
    }, 400);
  };

  // Reordering & Block adjustments
  const handleDragStartExp = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', `exp:${index}`);
  };

  const handleDropExp = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (data.startsWith('exp:')) {
      const sourceIndex = parseInt(data.split(':')[1], 10);
      if (sourceIndex === targetIndex) return;
      const updated = [...editableExperiences];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      setEditableExperiences(updated);
    }
  };

  const handleDragStartBullet = (e: React.DragEvent, expIdx: number, bulletIdx: number) => {
    e.dataTransfer.setData('text/plain', `bullet:${expIdx}:${bulletIdx}`);
  };

  const handleDropBullet = (e: React.DragEvent, expIdx: number, targetBulletIdx: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (data.startsWith('bullet:')) {
      const parts = data.split(':');
      const sourceExpIdx = parseInt(parts[1], 10);
      const sourceBulletIdx = parseInt(parts[2], 10);
      if (sourceExpIdx !== expIdx) return;
      if (sourceBulletIdx === targetBulletIdx) return;
      const updated = [...editableExperiences];
      const bullets = [...updated[expIdx].bullets];
      const [moved] = bullets.splice(sourceBulletIdx, 1);
      bullets.splice(targetBulletIdx, 0, moved);
      updated[expIdx] = { ...updated[expIdx], bullets };
      setEditableExperiences(updated);
    }
  };

  const handleRemoveExperience = (idx: number) => {
    setEditableExperiences(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveBullet = (expIdx: number, bulletIdx: number) => {
    setEditableExperiences(prev => prev.map((exp, i) => i === expIdx ? {
      ...exp,
      bullets: exp.bullets.filter((_, bIdx) => bIdx !== bulletIdx)
    } : exp));
  };

  const handleAddBullet = (expIdx: number) => {
    setEditableExperiences(prev => prev.map((exp, i) => i === expIdx ? {
      ...exp,
      bullets: [...exp.bullets, 'New bullet point description...']
    } : exp));
  };

  // Auto scale execution
  useEffect(() => {
    const handleResize = () => {
      if (viewportRef.current) {
        const width = viewportRef.current.clientWidth - 40;
        const newScale = Math.min(1, width / 816);
        setScale(newScale);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    const timer = setTimeout(handleResize, 150);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [currentVersion, editorTab]);

  // Load params & fetch existing versions
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
          // Fetch application specs from API directly to support refresh deep links
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

          const res = await api.get('/resume/versions');
          const matched = res.data.find((v: any) => v.application === initialJobParams.application_id);
          if (matched) {
            const ver = matched as ResumeVersion;
            setCurrentVersion(ver);
            initializeVersionFields(ver);

            // Cover letter

            // Cover letter
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

  const handleTailor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription) return;

    setIsLoading(true);
    setCurrentVersion(null);
    setReviewedActions({});

    try {
      const res = await api.post('/resume/tailor', {
        job_description: jobDescription,
        company,
        position,
        template,
        application_id: initialJobParams?.application_id
      });
      if (res.data && res.data.success) {
        const ver = res.data.data as ResumeVersion;
        setCurrentVersion(ver);
        initializeVersionFields(ver);

        handleGenerateLetter(ver.target_company, ver.target_role);
      }
    } catch (err) {
      console.error('Tailoring failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateLetter = async (targetCompany: string, targetRole: string) => {
    setIsLetterLoading(true);
    try {
      const res = await api.post('/resume/cover-letter', {
        job_description: jobDescription,
        company: targetCompany,
        position: targetRole,
        tone: letterTone,
        application_id: initialJobParams?.application_id
      });
      if (res.data && res.data.success) {
        setLetterContent(res.data.data.content);
      }
    } catch (err) {
      console.error('Letter generation failed:', err);
    } finally {
      setIsLetterLoading(false);
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
              ...currentVersion.tailored_details.original_profile.personal_info,
              ...editablePersonalInfo
            },
            skills: editableSkills,
            projects: editableProjects,
            educations: editableEducations
          },
          customization: {
            sections,
            customStyles
          }
        };
        await api.patch(`/resume/versions/${currentVersion.id}`, {
          tailored_summary: editableSummary,
          tailored_details: updatedDetails,
          template: template
        });
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

  // Find warnings linked to specific sections (from Agent 4)
  const getAlertsFor = (section: string) => {
    if (!currentVersion?.validation_alerts) return [];
    return currentVersion.validation_alerts.filter(a => a.section === section);
  };

  // Layout Rendering of Document Sheet elements
  const renderResumeSheetContent = (isMeasuring: boolean = false) => {
    if (!currentVersion) return null;

    const summaryAlerts = getAlertsFor('summary');

    const headerBlock = renderWrappedBlock('header', isMeasuring, () => (
      <div className={styles.resumeHeader}>
        <div className={styles.headerMain}>
          {editablePersonalInfo.image_url && (
            <img src={editablePersonalInfo.image_url} alt="Profile" className={styles.profileAvatar} />
          )}
          <div className={styles.headerText}>
            <h2>
              <AutoSizeTextarea
                value={editablePersonalInfo.full_name}
                onChange={(val) => setEditablePersonalInfo(p => ({ ...p, full_name: val }))}
              />
            </h2>
            <p className={styles.resumeTitle}>
              <AutoSizeTextarea
                value={editablePersonalInfo.title}
                onChange={(val) => setEditablePersonalInfo(p => ({ ...p, title: val }))}
              />
            </p>
          </div>
        </div>
        <div className={styles.resumeContacts}>
          {editablePersonalInfo.email && (
            <AutoSizeTextarea
              value={editablePersonalInfo.email}
              onChange={(val) => setEditablePersonalInfo(p => ({ ...p, email: val }))}
            />
          )}
          {editablePersonalInfo.phone && (
            <>
              {editablePersonalInfo.email && <span>•</span>}
              <AutoSizeTextarea
                value={editablePersonalInfo.phone}
                onChange={(val) => setEditablePersonalInfo(p => ({ ...p, phone: val }))}
              />
            </>
          )}
          {editablePersonalInfo.location && (
            <>
              {(editablePersonalInfo.email || editablePersonalInfo.phone) && <span>•</span>}
              <AutoSizeTextarea
                value={editablePersonalInfo.location}
                onChange={(val) => setEditablePersonalInfo(p => ({ ...p, location: val }))}
              />
            </>
          )}
          {editablePersonalInfo.date_of_birth && (
            <>
              {(editablePersonalInfo.email || editablePersonalInfo.phone || editablePersonalInfo.location) && <span>•</span>}
              <AutoSizeTextarea
                value={editablePersonalInfo.date_of_birth}
                onChange={(val) => setEditablePersonalInfo(p => ({ ...p, date_of_birth: val }))}
              />
            </>
          )}
          {editablePersonalInfo.nationality && (
            <>
              {(editablePersonalInfo.email || editablePersonalInfo.phone || editablePersonalInfo.location || editablePersonalInfo.date_of_birth) && <span>•</span>}
              <AutoSizeTextarea
                value={editablePersonalInfo.nationality}
                onChange={(val) => setEditablePersonalInfo(p => ({ ...p, nationality: val }))}
              />
            </>
          )}
        </div>
        {(editablePersonalInfo.website || editablePersonalInfo.linkedin || editablePersonalInfo.github) && (
          <div className={styles.resumeLinksContacts}>
            {editablePersonalInfo.website && (
              <AutoSizeTextarea
                value={editablePersonalInfo.website}
                onChange={(val) => setEditablePersonalInfo(p => ({ ...p, website: val }))}
              />
            )}
            {editablePersonalInfo.linkedin && (
              <>
                {editablePersonalInfo.website && <span>•</span>}
                <AutoSizeTextarea
                  value={editablePersonalInfo.linkedin}
                  onChange={(val) => setEditablePersonalInfo(p => ({ ...p, linkedin: val }))}
                />
              </>
            )}
            {editablePersonalInfo.github && (
              <>
                {(editablePersonalInfo.website || editablePersonalInfo.linkedin) && <span>•</span>}
                <AutoSizeTextarea
                  value={editablePersonalInfo.github}
                  onChange={(val) => setEditablePersonalInfo(p => ({ ...p, github: val }))}
                />
              </>
            )}
          </div>
        )}
      </div>
    ));

    const summaryBlock = (
      <div className={styles.resumeSection}>
        <h3 className={styles.resumeSectionTitle}>Professional Summary</h3>
        <div
          className={`${styles.summaryBox} ${!reviewedActions['summary'] ? styles.aiHighlighted : ''}`}
          onMouseEnter={() => handleMouseEnterSuggestion('summary')}
          onMouseLeave={handleMouseLeaveSuggestion}
        >
          <AutoSizeTextarea
            value={editableSummary}
            onChange={(val) => setEditableSummary(val)}
          />

          {summaryAlerts.map((a, i) => (
            <span key={i} className={styles.alertBadge} title={a.message}>
              <ShieldAlert size={10} /> {a.value}
            </span>
          ))}

          {hoveredSuggestion === 'summary' && !reviewedActions['summary'] && (
            <div
              className={`${styles.tooltip} glass no-print`}
              onMouseEnter={() => handleMouseEnterSuggestion('summary')}
              onMouseLeave={handleMouseLeaveSuggestion}
            >
              <div className={styles.tooltipHeader}>
                <Brain size={14} />
                <span>AI Recommendation</span>
                <span className={styles.tooltipConfidence}>95% Match</span>
              </div>
              <p className={styles.tooltipReason}>
                Tailored summary matches required keywords for {company}.
              </p>
              <div className={styles.tooltipActions}>
                <button onClick={() => handleAction('summary', 'rejected')} className={styles.rejectBtn}>
                  <X size={12} /> Reject
                </button>
                <button onClick={() => handleAction('summary', 'accepted')} className={styles.acceptBtn}>
                  <Check size={12} /> Accept
                </button>
              </div>
              <div className={styles.rephraseForm}>
                <input
                  type="text"
                  placeholder="Ask AI to rephrase... (e.g. make it punchier)"
                  value={rephrasePrompt['summary'] || ''}
                  onChange={(e) => setRephrasePrompt(prev => ({ ...prev, summary: e.target.value }))}
                  className={styles.rephraseInput}
                />
                <button
                  onClick={() => handleRephrase('summary', editableSummary)}
                  disabled={isRephrasing['summary']}
                  className={styles.rephraseSend}
                >
                  {isRephrasing['summary'] ? '...' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );

    const experiencesBlock = (
      <div className={styles.resumeSection}>
        <h3 className={styles.resumeSectionTitle}>Work Experience</h3>
        {editableExperiences.map((exp, expIdx) => {
          const expAlerts = getAlertsFor(exp.id);
          const hasAIChange = !reviewedActions[exp.id];

          return (
            <div
              key={exp.id}
              className={styles.resumeItem}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropExp(e, expIdx)}
            >
              {/* Drag handle and Exclude/Delete controls */}
              <div className={`${styles.itemControls} no-print`}>
                <div
                  draggable
                  onDragStart={(e) => handleDragStartExp(e, expIdx)}
                  className={styles.dragHandleBtn}
                  title="Drag to reorder"
                >
                  <GripVertical size={14} />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveExperience(expIdx)}
                  className={styles.deleteBlockBtn}
                  title="Exclude work experience"
                >
                  <Trash size={12} />
                </button>
              </div>

              <div className={styles.itemMeta}>
                <strong>
                  <AutoSizeTextarea
                    value={exp.position || ''}
                    onChange={(val) => setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, position: val } : e))}
                  />
                </strong>
                <span>
                  <AutoSizeTextarea
                    value={`${exp.start_date || ''} - ${exp.end_date || ''}`}
                    onChange={(val) => {
                      const parts = val.split(' - ');
                      setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? {
                        ...e,
                        start_date: parts[0] || '',
                        end_date: parts[1] || ''
                      } : e));
                    }}
                  />
                </span>
              </div>
              <div className={styles.itemCompany}>
                <span>
                  <AutoSizeTextarea
                    value={exp.company || ''}
                    onChange={(val) => setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, company: val } : e))}
                  />
                </span>
                <span>•</span>
                <span>
                  <AutoSizeTextarea
                    value={exp.location || ''}
                    onChange={(val) => setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, location: val } : e))}
                  />
                </span>
              </div>

              <div
                className={`${styles.bulletsBox} ${hasAIChange ? styles.aiHighlighted : ''}`}
                onMouseEnter={() => handleMouseEnterSuggestion(exp.id)}
                onMouseLeave={handleMouseLeaveSuggestion}
              >
                <ul className={styles.bulletsList}>
                  {exp.bullets.map((bullet, bulletIdx) => {
                    const blockKey = `${exp.id}-${bulletIdx}`;
                    const bulletAlerts = expAlerts.filter(a => a.message.includes(`Bullet ${bulletIdx + 1}`));

                    return (
                      <li
                        key={bulletIdx}
                        className={styles.bulletItem}
                        style={{ position: 'relative' }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDropBullet(e, expIdx, bulletIdx)}
                      >
                        <div className={`${styles.bulletControls} no-print`}>
                          <div
                            draggable
                            onDragStart={(e) => handleDragStartBullet(e, expIdx, bulletIdx)}
                            className={styles.bulletDragHandle}
                            title="Drag to reorder"
                          >
                            <GripVertical size={11} />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveBullet(expIdx, bulletIdx)}
                            className={styles.deleteBulletBtn}
                            title="Delete bullet"
                          >
                            <X size={10} />
                          </button>
                        </div>
                        <div className={styles.bulletContent}>
                          <AutoSizeTextarea
                            value={bullet}
                            onChange={(val) => setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? {
                              ...e,
                              bullets: e.bullets.map((b, bIdx) => bIdx === bulletIdx ? val : b)
                            } : e))}
                          />
                        </div>
                        {bulletAlerts.map((a, i) => (
                          <span key={i} className={styles.alertBadge} title={a.message}>
                            <ShieldAlert size={10} /> {a.value}
                          </span>
                        ))}
                      </li>
                    );
                  })}
                </ul>

                <button
                  type="button"
                  onClick={() => handleAddBullet(expIdx)}
                  className={`${styles.addBulletBtn} no-print`}
                >
                  <Plus size={10} /> Add Bullet
                </button>

                {hoveredSuggestion === exp.id && hasAIChange && (
                  <div
                    className={`${styles.tooltip} glass no-print`}
                    onMouseEnter={() => handleMouseEnterSuggestion(exp.id)}
                    onMouseLeave={handleMouseLeaveSuggestion}
                  >
                    <div className={styles.tooltipHeader}>
                      <Brain size={14} />
                      <span>AI Recommendation</span>
                      <span className={styles.tooltipConfidence}>90% Match</span>
                    </div>
                    <p className={styles.tooltipReason}>
                      Optimized experience bullet points targeting role requirements.
                    </p>
                    <div className={styles.tooltipActions}>
                      <button onClick={() => handleAction(exp.id, 'rejected')} className={styles.rejectBtn}>
                        <X size={12} /> Reject
                      </button>
                      <button onClick={() => handleAction(exp.id, 'accepted')} className={styles.acceptBtn}>
                        <Check size={12} /> Accept
                      </button>
                    </div>
                    <div className={styles.rephraseForm}>
                      <input
                        type="text"
                        placeholder="Rephrase first bullet... (e.g. add leadership)"
                        value={rephrasePrompt[exp.id] || ''}
                        onChange={(e) => setRephrasePrompt(prev => ({ ...prev, [exp.id]: e.target.value }))}
                        className={styles.rephraseInput}
                      />
                      <button
                        onClick={() => handleRephrase(`${exp.id}-0`, exp.bullets[0])}
                        disabled={isRephrasing[exp.id]}
                        className={styles.rephraseSend}
                      >
                        {isRephrasing[exp.id] ? '...' : 'Send'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );

    const skillsBlock = (
      <div className={styles.resumeSection}>
        <h3 className={styles.resumeSectionTitle}>Skills & Competencies</h3>
        <div className={styles.resumeSkills}>
          {editableSkills.map((s, idx) => (
            <span key={s.id || idx} className={styles.resumeSkill}>
              <AutoSizeTextarea
                value={s.name}
                onChange={(val) => setEditableSkills(prev => prev.map((sk, i) => i === idx ? { ...sk, name: val } : sk))}
              />
            </span>
          ))}
        </div>
      </div>
    );

    // Unified dynamic in-canvas section rendering helper
    const renderSection = (sectionId: string, templName: string, isMeasuring: boolean = false) => {
      const sec = sections.find(s => s.id === sectionId);
      if (!sec || !sec.visible) return null;

      const isPP = templName === 'pixel_perfect_pdf';
      const isGerman = templName === 'german_style_cv';

      const sectionClass = isPP ? styles.ppSection : styles.resumeSection;
      const titleClass = isPP ? styles.ppSectionTitle : (isGerman ? styles.germanSectionTitle : styles.resumeSectionTitle);

      // Use CSS custom properties so they cascade to all children via CSS rules
      const localStyles = sec.customStyles || {};
      const mergedStyles = {
        '--section-font-size': localStyles.fontSize ? `${localStyles.fontSize}px` : undefined,
        '--section-spacing': localStyles.spacing ? `${localStyles.spacing}px` : undefined,
        '--section-alignment': localStyles.alignment || undefined,
      } as React.CSSProperties;

      let contentJSX = null;

      if (sec.type === 'summary') {
        return renderWrappedBlock(`section_${sec.id}`, isMeasuring, () => (
          <div key={sec.id} className={sectionClass} style={mergedStyles}>
            <h3 className={titleClass}>
              <AutoSizeTextarea
                value={sec.name}
                onChange={(val) => setSections(prev => prev.map(s => s.id === sec.id ? { ...s, name: val } : s))}
              />
            </h3>
            <div className={isPP ? styles.ppSummaryBox : (isGerman ? styles.germanSummaryBox : styles.summaryBox)}>
              <AutoSizeTextarea value={editableSummary} onChange={(val) => setEditableSummary(val)} />
            </div>
          </div>
        ));
      } else if (sec.type === 'experience') {
        contentJSX = (
          <>
            {editableExperiences.map((exp, expIdx) =>
              renderWrappedBlock(`item_${exp.id}`, isMeasuring, () => (
                <div
                  key={exp.id}
                  className={isPP ? styles.ppSectionRow : (isGerman ? styles.germanRow : styles.resumeItem)}
                  style={{ position: 'relative' }}
                >
                {/* In-canvas item reorder/delete overlay controls */}
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
                    onClick={() => handleAddBullet(expIdx)}
                    className={styles.itemSortBtn}
                    style={{ color: 'var(--primary-color, #4f46e5)', fontWeight: 'bold' }}
                    title="Add Bullet Point"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditableExperiences(prev => prev.filter((_, i) => i !== expIdx))}
                    className={styles.deleteBlockBtn}
                    title="Exclude / Delete item"
                  >
                    <Trash size={12} />
                  </button>
                </div>

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
                      <h4 className={isPP ? styles.ppJobTitle : styles.germanDegree}>
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

                      <ul className={isPP ? styles.ppBulletsList : styles.germanBulletsList}>
                        {exp.bullets.map((bullet, bulletIdx) => (
                          <li key={bulletIdx} className={isPP ? styles.ppBulletItem : styles.germanBulletItem} style={{ position: 'relative' }}>
                            <div className={`${styles.bulletControls} no-print`}>
                              <button
                                type="button"
                                onClick={() => handleRemoveBullet(expIdx, bulletIdx)}
                                className={styles.deleteBulletBtn}
                              >
                                <X size={10} />
                              </button>
                            </div>
                            <div className={styles.bulletContent}>
                              <AutoSizeTextarea
                                value={bullet}
                                onChange={(val) => setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? {
                                  ...e,
                                  bullets: e.bullets.map((b, bIdx) => bIdx === bulletIdx ? val : b)
                                } : e))}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.itemMeta}>
                      <strong>
                        <AutoSizeTextarea
                          value={exp.position || ''}
                          onChange={(val) => setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? { ...e, position: val } : e))}
                        />
                      </strong>
                      <span>
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
                    <ul className={styles.bulletsList}>
                      {exp.bullets.map((bullet, bulletIdx) => (
                        <li key={bulletIdx} className={styles.bulletItem} style={{ position: 'relative' }}>
                          <div className={`${styles.bulletControls} no-print`}>
                            <button
                              type="button"
                              onClick={() => handleRemoveBullet(expIdx, bulletIdx)}
                              className={styles.deleteBulletBtn}
                            >
                              <X size={10} />
                            </button>
                          </div>
                          <div className={styles.bulletContent}>
                            <AutoSizeTextarea
                              value={bullet}
                              onChange={(val) => setEditableExperiences(prev => prev.map((e, i) => i === expIdx ? {
                                ...e,
                                bullets: e.bullets.map((b, bIdx) => bIdx === bulletIdx ? val : b)
                              } : e))}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )))}
          </>
        );
      } else if (sec.type === 'projects') {
        contentJSX = (
          <>
            {editableProjects.map((proj, projIdx) =>
              renderWrappedBlock(`item_${proj.id}`, isMeasuring, () => (
                <div
                  key={proj.id}
                  className={isPP ? styles.ppSectionRow : (isGerman ? styles.germanRow : styles.resumeItem)}
                  style={{ position: 'relative' }}
                >
                <div className={`${styles.itemControls} no-print`}>
                  <button
                    type="button"
                    disabled={projIdx === 0}
                    onClick={() => handleMoveProject(projIdx, 'up')}
                    className={styles.itemSortBtn}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={projIdx === editableProjects.length - 1}
                    onClick={() => handleMoveProject(projIdx, 'down')}
                    className={styles.itemSortBtn}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddProjectBullet(projIdx)}
                    className={styles.itemSortBtn}
                    style={{ color: 'var(--primary-color, #4f46e5)', fontWeight: 'bold' }}
                    title="Add Bullet Point"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveProject(projIdx)}
                    className={styles.deleteBlockBtn}
                  >
                    <Trash size={12} />
                  </button>
                </div>

                {isPP || isGerman ? (
                  <>
                    <div className={isPP ? styles.ppLeftCol : styles.germanLeftCol}>
                      <h4 className={isPP ? styles.ppProjectTitle : styles.germanDegree} style={{ margin: 0, fontWeight: 'bold' }}>
                        <AutoSizeTextarea
                          value={proj.title || ''}
                          onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? { ...p, title: val } : p))}
                        />
                      </h4>
                    </div>
                    <div className={isPP ? styles.ppRightCol : styles.germanRightCol}>
                      <div className={isPP ? styles.ppJobMeta : styles.germanJobMeta} style={{ display: 'flex', gap: '8px', fontSize: '0.85em', color: '#64748b', marginBottom: '4px' }}>
                        {proj.role && (
                          <span style={{ fontWeight: 600 }}>
                            <AutoSizeTextarea
                              value={proj.role || ''}
                              onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? { ...p, role: val } : p))}
                            />
                          </span>
                        )}
                        {proj.role && proj.date && <span>•</span>}
                        {proj.date && (
                          <span>
                            <AutoSizeTextarea
                              value={proj.date || ''}
                              onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? { ...p, date: val } : p))}
                            />
                          </span>
                        )}
                      </div>
                      <ul className={isPP ? styles.ppBulletsList : styles.germanBulletsList}>
                        {proj.bullets.map((bullet, bulletIdx) => (
                          <li key={bulletIdx} className={isPP ? styles.ppBulletItem : styles.germanBulletItem} style={{ position: 'relative' }}>
                            <div className={`${styles.bulletControls} no-print`}>
                              <button
                                type="button"
                                onClick={() => handleRemoveProjectBullet(projIdx, bulletIdx)}
                                className={styles.deleteBulletBtn}
                              >
                                <X size={10} />
                              </button>
                            </div>
                            <div className={styles.bulletContent}>
                              <AutoSizeTextarea
                                value={bullet}
                                onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? {
                                  ...p,
                                  bullets: p.bullets.map((b, bIdx) => bIdx === bulletIdx ? val : b)
                                } : p))}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
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
                    {proj.role && (
                      <p className={styles.itemCompany}>
                        <AutoSizeTextarea
                          value={proj.role || ''}
                          onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? { ...p, role: val } : p))}
                        />
                      </p>
                    )}
                    <ul className={styles.bulletsList}>
                      {proj.bullets.map((bullet, bulletIdx) => (
                        <li key={bulletIdx} className={styles.bulletItem} style={{ position: 'relative' }}>
                          <div className={`${styles.bulletControls} no-print`}>
                            <button
                              type="button"
                              onClick={() => handleRemoveProjectBullet(projIdx, bulletIdx)}
                              className={styles.deleteBulletBtn}
                            >
                              <X size={10} />
                            </button>
                          </div>
                          <div className={styles.bulletContent}>
                            <AutoSizeTextarea
                              value={bullet}
                              onChange={(val) => setEditableProjects(prev => prev.map((p, i) => i === projIdx ? {
                                ...p,
                                bullets: p.bullets.map((b, bIdx) => bIdx === bulletIdx ? val : b)
                              } : p))}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )))}
          </>
        );
      } else if (sec.type === 'education') {
        contentJSX = (
          <>
            {editableEducations.map((edu, eduIdx) =>
              renderWrappedBlock(`item_${edu.id}`, isMeasuring, () => (
                <div
                  key={edu.id}
                  className={isPP ? styles.ppSectionRow : (isGerman ? styles.germanRow : styles.resumeItem)}
                  style={{ position: 'relative' }}
                >
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
                    onClick={() => handleRemoveEducation(eduIdx)}
                    className={styles.deleteBlockBtn}
                  >
                    <Trash size={12} />
                  </button>
                </div>

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
                      <h4 className={isPP ? styles.ppDegree : styles.germanDegree} style={{ marginBottom: '2px' }}>
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
                        <div className={isPP ? styles.ppCompany : styles.germanCompany}>
                          <AutoSizeTextarea
                            value={edu.institution || ''}
                            onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, institution: val } : e))}
                          />
                        </div>
                        <div className={isPP ? styles.ppLocation : styles.germanLocation}>
                          <AutoSizeTextarea
                            value={edu.location || ''}
                            onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, location: val } : e))}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.itemMeta}>
                      <strong>
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
                      <div className={styles.itemCompany}>
                        <AutoSizeTextarea
                          value={edu.institution || ''}
                          onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, institution: val } : e))}
                        />
                      </div>
                      <div style={{ fontSize: '0.85em', color: '#64748b' }}>
                        <AutoSizeTextarea
                          value={edu.location || ''}
                          onChange={(val) => setEditableEducations(prev => prev.map((e, i) => i === eduIdx ? { ...e, location: val } : e))}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )))}
          </>
        );
      } else if (sec.type === 'skills') {
        // Separate languages from IT skills
        const langSkills = editableSkills.filter(s => (s.category || '').toLowerCase().trim() === 'languages');
        const itSkills = editableSkills.filter(s => (s.category || '').toLowerCase().trim() !== 'languages');

        // Group IT skills by category
        const uniqueCats = Array.from(new Set(itSkills.map(s => s.category || 'technical')));
        const itCategories = categoryOrder.filter(c => uniqueCats.includes(c));
        const extraCats = uniqueCats.filter(c => !itCategories.includes(c));
        const finalCategories = [...itCategories, ...extraCats];

        // Sort finalCategories so that "programming languages" always comes first
        finalCategories.sort((a, b) => {
          const aIsProg = a.toLowerCase().includes('programming');
          const bIsProg = b.toLowerCase().includes('programming');
          if (aIsProg && !bIsProg) return -1;
          if (!aIsProg && bIsProg) return 1;
          return 0;
        });

        const languagesJSX = langSkills.length > 0 && (
          <div className={isPP ? styles.ppSectionRow : (isGerman ? styles.germanRow : styles.resumeItem)} style={{ position: 'relative', display: 'flex', marginBottom: '8px' }}>
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
            {isPP || isGerman ? (
              <>
                <div className={isPP ? styles.ppLeftCol : styles.germanLeftCol}>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent-color, #0f172a)' }}>Languages</span>
                </div>
                <div className={isPP ? styles.ppRightCol : styles.germanRightCol}>
                  <AutoSizeTextarea
                    value={langSkills.map(s => s.name).join(', ')}
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
                  />
                </div>
              </>
            ) : (
              // Fallback style
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 'bold', marginRight: '6px', whiteSpace: 'nowrap' }}>Languages:</span>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <AutoSizeTextarea
                    value={langSkills.map(s => s.name).join(', ')}
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
                  />
                </div>
              </div>
            )}
          </div>
        );
        const itSkillsJSX = itSkills.length > 0 && (
          <div className={isPP ? styles.ppSectionRow : (isGerman ? styles.germanRow : styles.resumeItem)} style={{ position: 'relative', display: 'flex', marginBottom: '8px' }}>
            {isPP || isGerman ? (
              <>
                <div className={isPP ? styles.ppLeftCol : styles.germanLeftCol}>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent-color, #0f172a)' }}>IT-Skills</span>
                </div>
                <div className={isPP ? styles.ppRightCol : styles.germanRightCol} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {finalCategories.map((cat, catIdx) => {
                    const catSkills = itSkills.filter(s => (s.category || 'technical') === cat);
                    const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ');
                    return (
                      <div key={cat} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%' }}>
                        <div className={`${styles.itemControls} no-print`} style={{ left: '-48px' }}>
                          <button type="button" disabled={catIdx === 0} onClick={() => handleMoveCategory(catIdx, 'up')} className={styles.itemSortBtn} title="Move Up"><ArrowUp size={12} /></button>
                          <button type="button" disabled={catIdx === finalCategories.length - 1} onClick={() => handleMoveCategory(catIdx, 'down')} className={styles.itemSortBtn} title="Move Down"><ArrowDown size={12} /></button>
                          <button type="button" onClick={() => handleDeleteCategory(cat)} className={styles.deleteBlockBtn} title="Delete category"><Trash size={12} /></button>
                        </div>
                        <span style={{ fontWeight: 'bold', marginRight: '6px', whiteSpace: 'nowrap' }}>{catLabel}:</span>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <AutoSizeTextarea
                            value={catSkills.map(s => s.name).join(', ')}
                            onChange={(val) => {
                              const names = val.split(',').map(n => n.trim()).filter(Boolean);
                              setEditableSkills(prev => {
                                const otherSkills = prev.filter(s => s.category.toLowerCase() !== cat.toLowerCase());
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
                    );
                  })}
                </div>
              </>
            ) : (
              // Fallback style
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 'bold', marginBottom: '2px' }}>IT-Skills:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '12px' }}>
                  {finalCategories.map((cat, catIdx) => {
                    const catSkills = itSkills.filter(s => (s.category || 'technical') === cat);
                    const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ');
                    return (
                      <div key={cat} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div className={`${styles.itemControls} no-print`} style={{ left: '-48px' }}>
                          <button type="button" disabled={catIdx === 0} onClick={() => handleMoveCategory(catIdx, 'up')} className={styles.itemSortBtn} title="Move Up"><ArrowUp size={12} /></button>
                          <button type="button" disabled={catIdx === finalCategories.length - 1} onClick={() => handleMoveCategory(catIdx, 'down')} className={styles.itemSortBtn} title="Move Down"><ArrowDown size={12} /></button>
                          <button type="button" onClick={() => handleDeleteCategory(cat)} className={styles.deleteBlockBtn} title="Delete category"><Trash size={12} /></button>
                        </div>
                        <span style={{ fontWeight: 'bold', marginRight: '6px', whiteSpace: 'nowrap' }}>{catLabel}:</span>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <AutoSizeTextarea
                            value={catSkills.map(s => s.name).join(', ')}
                            onChange={(val) => {
                              const names = val.split(',').map(n => n.trim()).filter(Boolean);
                              setEditableSkills(prev => {
                                const otherSkills = prev.filter(s => s.category.toLowerCase() !== cat.toLowerCase());
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
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

        contentJSX = (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', marginTop: '6px' }}>
            {languagesFirst ? (
              <>
                {languagesJSX}
                {itSkillsJSX}
              </>
            ) : (
              <>
                {itSkillsJSX}
                {languagesJSX}
              </>
            )}
          </div>
        );
      } else if (sec.type === 'custom') {
        contentJSX = (
          <>
            <ul className={isPP ? styles.ppBulletsList : (isGerman ? styles.germanBulletsList : styles.bulletsList)}>
              {(sec.bullets || []).map((bullet, bulletIdx) => (
                <li key={bulletIdx} className={isPP ? styles.ppBulletItem : (isGerman ? styles.germanBulletItem : styles.bulletItem)} style={{ position: 'relative' }}>
                  <div className={`${styles.bulletControls} no-print`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSections(prev => prev.map(s => s.id === sec.id ? {
                          ...s,
                          bullets: s.bullets!.filter((_, bI) => bI !== bulletIdx)
                        } : s));
                      }}
                      className={styles.deleteBulletBtn}
                      title="Delete bullet"
                    >
                      <X size={10} />
                    </button>
                  </div>
                  <div className={styles.bulletContent}>
                    <AutoSizeTextarea
                      value={bullet}
                      onChange={(val) => {
                        setSections(prev => prev.map(s => s.id === sec.id ? {
                          ...s,
                          bullets: s.bullets!.map((b, bI) => bI === bulletIdx ? val : b)
                        } : s));
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        );
      }



      if (sec.type === 'skills' || sec.type === 'custom') {
        return renderWrappedBlock(`section_${sec.id}`, isMeasuring, () => (
          <div key={sec.id} className={sectionClass} style={mergedStyles}>
            <h3 className={titleClass}>
              <AutoSizeTextarea
                value={sec.name}
                onChange={(val) => setSections(prev => prev.map(s => s.id === sec.id ? { ...s, name: val } : s))}
              />
            </h3>
            {contentJSX}
          </div>
        ));
      }

      return (
        <div key={sec.id} className={sectionClass} style={mergedStyles}>
          {renderWrappedBlock(`section_title_${sec.id}`, isMeasuring, () => (
            <h3 className={titleClass}>
              <AutoSizeTextarea
                value={sec.name}
                onChange={(val) => setSections(prev => prev.map(s => s.id === sec.id ? { ...s, name: val } : s))}
              />
            </h3>
          ))}
          {contentJSX}
        </div>
      );
    };

    // Dedicated pixel-perfect user PDF layout
    if (template === 'pixel_perfect_pdf') {
      return (
        <div className={styles.pixelPerfectLayout}>
          {/* Header block */}
          {renderWrappedBlock('header', isMeasuring, () => (
            <div className={styles.ppHeader}>
              <div className={styles.ppHeaderLeft}>
                <h1 className={styles.ppName}>
                  <AutoSizeTextarea
                    value={editablePersonalInfo.full_name}
                    onChange={(val) => setEditablePersonalInfo(p => ({ ...p, full_name: val }))}
                  />
                </h1>
                <h2 className={styles.ppTitle}>
                  <AutoSizeTextarea
                    value={editablePersonalInfo.title}
                    onChange={(val) => setEditablePersonalInfo(p => ({ ...p, title: val }))}
                  />
                </h2>

                {/* Contact info in 2 columns */}
                <div className={styles.ppContactGrid}>
                  <div className={styles.ppContactCol}>
                    {editablePersonalInfo.location && (
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
                    {editablePersonalInfo.email && (
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
                    {editablePersonalInfo.nationality && (
                      <div className={styles.ppContactItem}>
                        <span className={styles.ppContactLabel}>Nationality:</span>
                        <span className={styles.ppContactVal}>
                          <AutoSizeTextarea
                            value={editablePersonalInfo.nationality}
                            onChange={(val) => setEditablePersonalInfo(p => ({ ...p, nationality: val }))}
                          />
                        </span>
                      </div>
                    )}
                    {editablePersonalInfo.website && (
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
                    {editablePersonalInfo.phone && (
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
                    {editablePersonalInfo.date_of_birth && (
                      <div className={styles.ppContactItem}>
                        <span className={styles.ppContactLabel}>Date of birth:</span>
                        <span className={styles.ppContactVal}>
                          <AutoSizeTextarea
                            value={editablePersonalInfo.date_of_birth}
                            onChange={(val) => setEditablePersonalInfo(p => ({ ...p, date_of_birth: val }))}
                          />
                        </span>
                      </div>
                    )}
                    {editablePersonalInfo.linkedin && (
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
                    {editablePersonalInfo.github && (
                      <div className={styles.ppContactItem}>
                        <span className={styles.ppContactLabel}>Github:</span>
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

              <div className={styles.ppHeaderRight}>
                {editablePersonalInfo.image_url ? (
                  <img src={editablePersonalInfo.image_url} alt="Profile" className={styles.ppAvatar} />
                ) : (
                  <div className={styles.ppAvatarPlaceholder}>No Photo</div>
                )}
              </div>
            </div>
          ))}

          {/* Dynamic layout of sections */}
          {sections.map(s => renderSection(s.id, 'pixel_perfect_pdf', isMeasuring))}
        </div>
      );
    }

    // German-Style CV Template layout
    if (template === 'german_style_cv') {
      return (
        <div className={styles.germanLayout}>
          {/* Header section */}
          {renderWrappedBlock('header', isMeasuring, () => (
            <>
              <div className={styles.germanHeader}>
                <div className={styles.germanHeaderLeft}>
                  <h1 className={styles.germanName}>
                    <AutoSizeTextarea
                      value={editablePersonalInfo.full_name}
                      onChange={(val) => setEditablePersonalInfo(p => ({ ...p, full_name: val }))}
                    />
                  </h1>
                  <h2 className={styles.germanTitle}>
                    <AutoSizeTextarea
                      value={editablePersonalInfo.title}
                      onChange={(val) => setEditablePersonalInfo(p => ({ ...p, title: val }))}
                    />
                  </h2>
                </div>

                <div className={styles.germanHeaderRight}>
                  {editablePersonalInfo.image_url ? (
                    <img src={editablePersonalInfo.image_url} alt="Profile" className={styles.germanAvatar} />
                  ) : (
                    <div className={styles.germanAvatarPlaceholder}>Photo</div>
                  )}
                </div>
              </div>

              {/* Contact Details */}
              <div className={styles.germanContactGrid}>
                <div className={styles.germanContactCol}>
                  {editablePersonalInfo.location && (
                    <div className={styles.germanContactItem}>
                      <span className={styles.germanContactLabel}>Address:</span>
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
                      <span className={styles.germanContactLabel}>Email:</span>
                      <span className={styles.germanContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.email}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, email: val }))}
                        />
                      </span>
                    </div>
                  )}
                  {editablePersonalInfo.nationality && (
                    <div className={styles.germanContactItem}>
                      <span className={styles.germanContactLabel}>Nationality:</span>
                      <span className={styles.germanContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.nationality}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, nationality: val }))}
                        />
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.germanContactCol}>
                  {editablePersonalInfo.phone && (
                    <div className={styles.germanContactItem}>
                      <span className={styles.germanContactLabel}>Phone:</span>
                      <span className={styles.germanContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.phone}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, phone: val }))}
                        />
                      </span>
                    </div>
                  )}
                  {editablePersonalInfo.date_of_birth && (
                    <div className={styles.germanContactItem}>
                      <span className={styles.germanContactLabel}>Date of birth:</span>
                      <span className={styles.germanContactVal}>
                        <AutoSizeTextarea
                          value={editablePersonalInfo.date_of_birth}
                          onChange={(val) => setEditablePersonalInfo(p => ({ ...p, date_of_birth: val }))}
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
                </div>
              </div>
            </>
          ))}

          {/* Dynamic layout of sections */}
          {sections.map(s => renderSection(s.id, 'german_style_cv', isMeasuring))}
        </div>
      );
    }

    // Dynamic grid layout for Creative Tech template
    if (template === 'creative_tech') {
      return (
        <>
          {headerBlock}
          <div className={styles.gridContainer}>
            <div className={styles.sidebarColumn}>
              {sections.filter(s => s.id === 'skills').map(s => renderSection(s.id, 'creative_tech', isMeasuring))}
              <div className={styles.resumeSection}>
                <h3 className={styles.resumeSectionTitle}>Contacts</h3>
                <p style={{ fontSize: '11px', color: '#64748b' }}>
                  Use top headers to adjust contact metadata values.
                </p>
              </div>
            </div>
            <div className={styles.mainColumn}>
              {sections.filter(s => s.id !== 'skills').map(s => renderSection(s.id, 'creative_tech', isMeasuring))}
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        {headerBlock}
        {sections.map(s => renderSection(s.id, template, isMeasuring))}
      </>
    );
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.headerRow} no-print`}>
        <div>
          <h2 className={styles.title}>Resume Tailoring Canvas</h2>
          <p className={styles.subtitle}>Audit ATS match scores, approve AI revisions, and edit CV sheets inline.</p>
        </div>
      </div>

      {showSaveBanner && (
        <div className={styles.saveBanner}>
          <Check size={16} />
          <span>Revision Saved Successfully!</span>
        </div>
      )}

      <div className={styles.workspace}>
        <div className={`${styles.controlPanel} no-print`}>
          {/* Tab Selection */}
          <div className={styles.controlPanelTabs}>
            <button
              type="button"
              className={`${styles.controlTabBtn} ${activeControlTab === 'tailor' ? styles.activeControlTab : ''}`}
              onClick={() => setActiveControlTab('tailor')}
            >
              AI Tailoring & ATS
            </button>
            <button
              type="button"
              className={`${styles.controlTabBtn} ${activeControlTab === 'style' ? styles.activeControlTab : ''}`}
              onClick={() => setActiveControlTab('style')}
            >
              Design & Layout
            </button>
          </div>

          {activeControlTab === 'tailor' ? (
            <>
              <form onSubmit={handleTailor} className={`${styles.form} glass-card`}>
                <h3>Job Listing Parameters</h3>
                <InputField
                  label="Company Name"
                  id="editorCompany"
                  placeholder="e.g. Stripe"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
                <InputField
                  label="Target Role"
                  id="editorRole"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />

                <InputField
                  label="Job Description Text *"
                  id="editorDesc"
                  type="textarea"
                  placeholder="Paste full responsibilities, requirements, and keywords list here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  required
                />

                <div className={styles.selectGroup}>
                  <label htmlFor="editorTemplate">Layout Template</label>
                  <select id="editorTemplate" value={template} onChange={(e) => setTemplate(e.target.value)}>
                    <option value="pixel_perfect_pdf">Pixel Perfect CV Template</option>
                    <option value="german_style_cv">German-Style CV Template</option>
                    <option value="modern_minimalist">Modern Minimalist</option>
                    <option value="executive_professional">Executive Professional</option>
                    <option value="creative_tech">Creative Tech</option>
                  </select>
                </div>

                <Button type="submit" isLoading={isLoading} className={styles.tailorBtn}>
                  <Wand2 size={16} />
                  <span>Analyze & Tailor</span>
                </Button>
              </form>

              {/* ATS Scoring Panel */}
              {currentVersion && (
                <div className={`${styles.atsCard} glass-card`}>
                  <div className={styles.atsHeader}>
                    <h3>ATS Match Score</h3>
                    <div className={styles.scoreGauge} style={{
                      color: currentVersion.ats_score > 80 ? 'var(--success)' : 'var(--warning)',
                      borderColor: currentVersion.ats_score > 80 ? 'var(--success)' : 'var(--warning)'
                    }}>
                      {currentVersion.ats_score}%
                    </div>
                  </div>

                  <div className={styles.keywordsBlock}>
                    <h4>Matched Keywords ({currentVersion.tailored_details.ats_report.matched_keywords.length})</h4>
                    <div className={styles.keywordsGrid}>
                      {currentVersion.tailored_details.ats_report.matched_keywords.map((k, i) => (
                        <span key={i} className={styles.matchedKw}>{k}</span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.keywordsBlock}>
                    <h4>Missing Keywords ({currentVersion.tailored_details.ats_report.missing_keywords.length})</h4>
                    <div className={styles.keywordsGrid}>
                      {currentVersion.tailored_details.ats_report.missing_keywords.map((k, i) => (
                        <span key={i} className={styles.missingKw}>{k}</span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.suggestionsList}>
                    <h4>ATS Optimization Suggestions</h4>
                    <ul>
                      {currentVersion.tailored_details.ats_report.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={`${styles.styleControlsForm} glass-card`} style={{ padding: 'var(--space-4)' }}>
              <h3>Typography & Spacing</h3>

              <div className={styles.sliderGroup}>
                <label>Base Font Size: <strong>{customStyles.fontSize}px</strong></label>
                <input
                  type="range"
                  min="10"
                  max="18"
                  value={customStyles.fontSize}
                  onChange={(e) => setCustomStyles(s => ({ ...s, fontSize: parseInt(e.target.value) }))}
                />
              </div>

              <div className={styles.sliderGroup}>
                <label>Heading Size: <strong>x{customStyles.headingSize}</strong></label>
                <input
                  type="range"
                  min="1.0"
                  max="2.2"
                  step="0.1"
                  value={customStyles.headingSize}
                  onChange={(e) => setCustomStyles(s => ({ ...s, headingSize: parseFloat(e.target.value) }))}
                />
              </div>

              <div className={styles.sliderGroup}>
                <label>Line Height: <strong>{customStyles.lineHeight}</strong></label>
                <input
                  type="range"
                  min="1.0"
                  max="2.0"
                  step="0.1"
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
                  value={customStyles.sectionSpacing}
                  onChange={(e) => setCustomStyles(s => ({ ...s, sectionSpacing: parseInt(e.target.value) }))}
                />
              </div>

              <div className={styles.sliderGroup}>
                <label>Bullet Point Spacing: <strong>{customStyles.bulletSpacing !== undefined ? customStyles.bulletSpacing : 4}px</strong></label>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={customStyles.bulletSpacing !== undefined ? customStyles.bulletSpacing : 4}
                  onChange={(e) => setCustomStyles(s => ({ ...s, bulletSpacing: parseInt(e.target.value) }))}
                />
              </div>

              <div className={styles.sliderGroup}>
                <label>Page Margin: <strong>{customStyles.pageMargin || (template === 'german_style_cv' ? 77 : (template === 'pixel_perfect_pdf' ? 48 : 32))}px</strong></label>
                <input
                  type="range"
                  min="20"
                  max="90"
                  value={customStyles.pageMargin || (template === 'german_style_cv' ? 76.8 : (template === 'pixel_perfect_pdf' ? 48 : 32))}
                  onChange={(e) => setCustomStyles(s => ({ ...s, pageMargin: parseInt(e.target.value) }))}
                />
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
                  <label>Text Color</label>
                  <input
                    type="color"
                    value={customStyles.textColor}
                    onChange={(e) => setCustomStyles(s => ({ ...s, textColor: e.target.value }))}
                  />
                </div>
              </div>

              <div className={styles.sliderGroup}>
                <label>Text Alignment</label>
                <select
                  value={customStyles.alignment}
                  onChange={(e) => setCustomStyles(s => ({ ...s, alignment: e.target.value }))}
                  style={{
                    padding: 'var(--space-2)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--card-border)',
                    background: 'var(--card-bg)',
                    color: 'var(--foreground)'
                  }}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                  <option value="justify">Justified</option>
                </select>
              </div>

              <hr style={{ margin: 'var(--space-2) 0', borderColor: 'var(--card-border)' }} />

              <h3>Reorder & Toggle Sections</h3>
              <div className={styles.sectionsList}>
                {sections.map((sec, idx) => (
                  <div key={sec.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', width: '100%', marginBottom: 'var(--space-1)' }}>
                    <div className={styles.sectionSortRow}>
                      <input
                        type="checkbox"
                        checked={sec.visible}
                        onChange={(e) => setSections(prev => prev.map((s, i) => i === idx ? { ...s, visible: e.target.checked } : s))}
                      />
                      <span className={styles.sectionSortName}>{sec.name}</span>

                      {/* Local settings gear */}
                      <button
                        type="button"
                        className={styles.settingsToggleBtn}
                        title="Customize section layout"
                        onClick={() => setExpandedSectionSettings(expandedSectionSettings === sec.id ? null : sec.id)}
                      >
                        <Settings size={12} />
                      </button>

                      {/* Delete Custom Section */}
                      {sec.id.startsWith('custom_') && (
                        <button
                          type="button"
                          className={styles.settingsToggleBtn}
                          style={{ color: '#ef4444' }}
                          title="Delete custom section"
                          onClick={() => {
                            if (window.confirm(`Delete custom section "${sec.name}"?`)) {
                              setSections(prev => prev.filter(s => s.id !== sec.id));
                            }
                          }}
                        >
                          <Trash size={12} />
                        </button>
                      )}

                      <div className={styles.sortButtons}>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            const newSections = [...sections];
                            const temp = newSections[idx];
                            newSections[idx] = newSections[idx - 1];
                            newSections[idx - 1] = temp;
                            setSections(newSections);
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={idx === sections.length - 1}
                          onClick={() => {
                            const newSections = [...sections];
                            const temp = newSections[idx];
                            newSections[idx] = newSections[idx + 1];
                            newSections[idx + 1] = temp;
                            setSections(newSections);
                          }}
                        >
                          ↓
                        </button>
                      </div>
                    </div>

                    {/* Expandable settings card */}
                    {expandedSectionSettings === sec.id && (
                      <div className={styles.sectionSettingsCard}>
                        <h4>{sec.name} Styles</h4>

                        <div className={styles.sliderGroup}>
                          <label>Font Size: <strong>{sec.customStyles?.fontSize ? `${sec.customStyles.fontSize}px` : 'Inherited'}</strong></label>
                          <input
                            type="range"
                            min="10"
                            max="18"
                            value={sec.customStyles?.fontSize || customStyles.fontSize}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setSections(prev => prev.map(s => s.id === sec.id ? {
                                ...s,
                                customStyles: { ...s.customStyles, fontSize: val }
                              } : s));
                            }}
                          />
                          {sec.customStyles?.fontSize && (
                            <button
                              type="button"
                              style={{ fontSize: '10px', color: 'var(--primary)', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                              onClick={() => {
                                setSections(prev => prev.map(s => s.id === sec.id ? {
                                  ...s,
                                  customStyles: { ...s.customStyles, fontSize: undefined }
                                } : s));
                              }}
                            >
                              Reset to inherit
                            </button>
                          )}
                        </div>

                        <div className={styles.sliderGroup}>
                          <label>Spacing: <strong>{sec.customStyles?.spacing ? `${sec.customStyles.spacing}px` : 'Inherited'}</strong></label>
                          <input
                            type="range"
                            min="5"
                            max="50"
                            value={sec.customStyles?.spacing || customStyles.sectionSpacing}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setSections(prev => prev.map(s => s.id === sec.id ? {
                                ...s,
                                customStyles: { ...s.customStyles, spacing: val }
                              } : s));
                            }}
                          />
                          {sec.customStyles?.spacing && (
                            <button
                              type="button"
                              style={{ fontSize: '10px', color: 'var(--primary)', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                              onClick={() => {
                                setSections(prev => prev.map(s => s.id === sec.id ? {
                                  ...s,
                                  customStyles: { ...s.customStyles, spacing: undefined }
                                } : s));
                              }}
                            >
                              Reset to inherit
                            </button>
                          )}
                        </div>

                        <div className={styles.sliderGroup}>
                          <label>Text Alignment</label>
                          <select
                            value={sec.customStyles?.alignment || ''}
                            onChange={(e) => {
                              const val = e.target.value || undefined;
                              setSections(prev => prev.map(s => s.id === sec.id ? {
                                ...s,
                                customStyles: { ...s.customStyles, alignment: val }
                              } : s));
                            }}
                            style={{
                              padding: '4px 6px',
                              fontSize: '11px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--card-border)',
                              background: 'var(--card-bg)',
                              color: 'var(--foreground)'
                            }}
                          >
                            <option value="">Inherited ({customStyles.alignment})</option>
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                            <option value="justify">Justified</option>
                          </select>
                        </div>

                        {/* Skills management - only for skills-type sections */}
                        {sec.type === 'skills' && (
                          <>
                            <hr style={{ margin: 'var(--space-2) 0', borderColor: 'var(--card-border)' }} />
                            <h4>Manage Skills</h4>

                            {/* Add new category */}
                            <div style={{ display: 'flex', gap: '4px', marginBottom: 'var(--space-2)' }}>
                              <button
                                type="button"
                                style={{
                                  fontSize: '10px', padding: '4px 8px', cursor: 'pointer',
                                  background: 'var(--primary)', color: '#fff', border: 'none',
                                  borderRadius: 'var(--radius-sm)', fontWeight: 600
                                }}
                                onClick={() => {
                                  const catName = window.prompt('New IT-Skills category name (e.g. backend, frontend, database, tools):');
                                  if (catName && catName.trim()) {
                                    const skillName = window.prompt(`First skill in "${catName}":`);
                                    if (skillName && skillName.trim()) {
                                      setEditableSkills(prev => [...prev, {
                                        id: `skill_${Date.now()}`,
                                        name: skillName.trim(),
                                        category: catName.trim().toLowerCase()
                                      }]);
                                    }
                                  }
                                }}
                              >
                                + Add IT Category
                              </button>
                              <button
                                type="button"
                                style={{
                                  fontSize: '10px', padding: '4px 8px', cursor: 'pointer',
                                  background: 'var(--card-bg)', color: 'var(--foreground)',
                                  border: '1px solid var(--card-border)',
                                  borderRadius: 'var(--radius-sm)', fontWeight: 600
                                }}
                                onClick={() => {
                                  const langName = window.prompt('Add language (e.g. "French (B1)"):');
                                  if (langName && langName.trim()) {
                                    setEditableSkills(prev => [...prev, {
                                      id: `skill_${Date.now()}`,
                                      name: langName.trim(),
                                      category: 'languages'
                                    }]);
                                  }
                                }}
                              >
                                + Add Language
                              </button>
                            </div>

                            {/* List skills with category changer */}
                            <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '10px' }}>
                              {editableSkills.map(skill => {
                                const allCats = Array.from(new Set(editableSkills.map(s => s.category || 'technical')));
                                return (
                                  <div key={skill.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    padding: '2px 0', borderBottom: '1px solid var(--card-border)'
                                  }}>
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {skill.name}
                                    </span>
                                    <select
                                      value={skill.category}
                                      onChange={(e) => {
                                        setEditableSkills(prev => prev.map(s =>
                                          s.id === skill.id ? { ...s, category: e.target.value } : s
                                        ));
                                      }}
                                      style={{
                                        fontSize: '9px', padding: '1px 2px',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: '2px', background: 'var(--card-bg)',
                                        color: 'var(--foreground)', maxWidth: '80px'
                                      }}
                                    >
                                      {allCats.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => setEditableSkills(prev => prev.filter(s => s.id !== skill.id))}
                                      style={{
                                        fontSize: '10px', cursor: 'pointer', color: '#ef4444',
                                        border: 'none', background: 'transparent', padding: '0 2px'
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                        {sec.type === 'experience' && (
                          <div style={{ marginTop: '12px', borderTop: '1px solid var(--card-border)', paddingTop: '10px' }}>
                            <Button
                              type="button"
                              variant="ghost"
                              style={{ width: '100%', fontSize: '11px', padding: '6px' }}
                              onClick={handleAddExperience}
                            >
                              <Plus size={12} /> Add Experience
                            </Button>
                            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {editableExperiences.map((exp, expIdx) => (
                                <div key={exp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                                  <span style={{ fontSize: '10px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                                    {exp.company || `Experience ${expIdx + 1}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleAddBullet(expIdx)}
                                    style={{ fontSize: '10px', padding: '2px 8px', cursor: 'pointer', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '2px' }}
                                  >
                                    + Add Bullet
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {sec.type === 'projects' && (
                          <div style={{ marginTop: '12px', borderTop: '1px solid var(--card-border)', paddingTop: '10px' }}>
                            <Button
                              type="button"
                              variant="ghost"
                              style={{ width: '100%', fontSize: '11px', padding: '6px' }}
                              onClick={handleAddProject}
                            >
                              <Plus size={12} /> Add Project
                            </Button>
                            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {editableProjects.map((proj, projIdx) => (
                                <div key={proj.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                                  <span style={{ fontSize: '10px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                                    {proj.title || `Project ${projIdx + 1}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleAddProjectBullet(projIdx)}
                                    style={{ fontSize: '10px', padding: '2px 8px', cursor: 'pointer', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '2px' }}
                                  >
                                    + Add Bullet
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {sec.type === 'education' && (
                          <div style={{ marginTop: '12px', borderTop: '1px solid var(--card-border)', paddingTop: '10px' }}>
                            <Button
                              type="button"
                              variant="ghost"
                              style={{ width: '100%', fontSize: '11px', padding: '6px' }}
                              onClick={handleAddEducation}
                            >
                              <Plus size={12} /> Add Education
                            </Button>
                          </div>
                        )}

                        {sec.type === 'custom' && (
                          <div style={{ marginTop: '12px', borderTop: '1px solid var(--card-border)', paddingTop: '10px' }}>
                            <Button
                              type="button"
                              variant="ghost"
                              style={{ width: '100%', fontSize: '11px', padding: '6px' }}
                              onClick={() => {
                                setSections(prev => prev.map(s => s.id === sec.id ? {
                                  ...s,
                                  bullets: [...(s.bullets || []), 'New custom item detail...']
                                } : s));
                              }}
                            >
                              <Plus size={12} /> Add Bullet Item
                            </Button>
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
                  const secName = window.prompt("Enter Custom Section Title:", "Additional Information");
                  if (secName) {
                    const newId = `custom_${Date.now()}`;
                    setSections(prev => [...prev, {
                      id: newId,
                      name: secName,
                      visible: true,
                      type: 'custom',
                      bullets: ['Enter bullet point 1...', 'Enter bullet point 2...']
                    }]);
                  }
                }}
              >
                <Plus size={14} /> Add Custom Section
              </button>
            </div>
          )}
        </div>

        {/* Right Editor Workspace Preview Canvas */}
        <div className={styles.previewCanvas}>
          {isLoading ? (
            <div className={styles.skeletonContainer}>
              <div className={styles.skeletonLoaderBanner}>
                <RefreshCw className={styles.skeletonSpinner} size={16} />
                <span>AI is analyzing keywords and tailoring your resume...</span>
              </div>
              <div
                className={styles.skeletonPaperWrapper}
                style={{
                  width: `${816 * scale}px`,
                  height: `${1056 * scale}px`,
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
                    width: '816px',
                    height: '1056px',
                    margin: 0
                  }}
                >
                  {/* Header Skeleton */}
                  <div className={styles.skeletonHeader}>
                    <div className={styles.skeletonAvatar} />
                    <div className={styles.skeletonHeaderLines}>
                      <div className={styles.skeletonLineLarge} />
                      <div className={styles.skeletonLineMedium} />
                    </div>
                  </div>
                  {/* Divider */}
                  <div className={styles.skeletonDivider} />

                  {/* Contact grid */}
                  <div className={styles.skeletonContactGrid}>
                    <div className={styles.skeletonLineSmall} />
                    <div className={styles.skeletonLineSmall} />
                    <div className={styles.skeletonLineSmall} />
                    <div className={styles.skeletonLineSmall} />
                  </div>

                  {/* Summary Section */}
                  <div className={styles.skeletonSection}>
                    <div className={styles.skeletonSectionTitle} />
                    <div className={styles.skeletonParagraph}>
                      <div className={styles.skeletonLineFull} />
                      <div className={styles.skeletonLineFull} />
                      <div className={styles.skeletonLineTwoThirds} />
                    </div>
                  </div>

                  {/* Experience Section */}
                  <div className={styles.skeletonSection}>
                    <div className={styles.skeletonSectionTitle} />
                    <div className={styles.skeletonExpRow}>
                      <div className={styles.skeletonExpHeader}>
                        <div className={styles.skeletonLineMedium} />
                        <div className={styles.skeletonLineSmall} />
                      </div>
                      <div className={styles.skeletonBullets}>
                        <div className={styles.skeletonBulletLine} />
                        <div className={styles.skeletonBulletLine} />
                        <div className={styles.skeletonBulletLine} />
                      </div>
                    </div>

                    <div className={styles.skeletonExpRow}>
                      <div className={styles.skeletonExpHeader}>
                        <div className={styles.skeletonLineMedium} />
                        <div className={styles.skeletonLineSmall} />
                      </div>
                      <div className={styles.skeletonBullets}>
                        <div className={styles.skeletonBulletLine} />
                        <div className={styles.skeletonBulletLine} />
                      </div>
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div className={styles.skeletonSection}>
                    <div className={styles.skeletonSectionTitle} />
                    <div className={styles.skeletonSkillsGrid}>
                      <div className={styles.skeletonSkillTag} />
                      <div className={styles.skeletonSkillTag} />
                      <div className={styles.skeletonSkillTag} />
                      <div className={styles.skeletonSkillTag} />
                      <div className={styles.skeletonSkillTag} />
                      <div className={styles.skeletonSkillTag} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : currentVersion ? (
            <div className={styles.previewContainer}>
              {/* Tab Selector & Exports */}
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

                <div className={styles.exportActions}>
                  <Button variant="secondary" onClick={handleSave} isLoading={isSaving}>
                    <Save size={16} />
                    <span>Save Changes</span>
                  </Button>
                  <Button variant="secondary" onClick={handlePrint}>
                    <Printer size={16} />
                    <span>Print PDF</span>
                  </Button>
                  <Button variant="secondary" onClick={exportMarkdown}>
                    <Download size={16} />
                    <span>Markdown</span>
                  </Button>
                </div>
              </div>

              {/* Page Warning Banner */}
              {editorTab === 'resume' && paperHeight > 1056 && (
                <div className={`${styles.pageWarningBanner} no-print`}>
                  <ShieldAlert size={16} />
                  <span>
                    <strong>Optimization Tip:</strong> Your CV spans {Math.ceil(paperHeight / 1056)} pages. Keeping your CV to a single page is highly recommended to maximize recruiter engagement. Try pruning details or phrasing bullet points more concisely.
                  </span>
                </div>
              )}

              {/* Hidden off-screen unscaled canvas for physical pagination measurements */}
              {editorTab === 'resume' && (
                <div
                  className={`${styles.resumePaper} ${styles[template]} no-print`}
                  ref={hiddenCanvasRef}
                  style={{
                    position: 'absolute',
                    left: '-9999px',
                    top: 0,
                    width: '816px',
                    height: 'auto',
                    margin: 0,
                    transform: 'none',
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    boxSizing: 'border-box',
                    '--base-font-size': `${customStyles.fontSize}px`,
                    '--heading-size-mult': customStyles.headingSize,
                    '--line-height-mult': customStyles.lineHeight,
                    '--section-spacing': `${customStyles.sectionSpacing}px`,
                    '--accent-color': customStyles.accentColor,
                    '--text-color': customStyles.textColor,
                    '--text-alignment': customStyles.alignment,
                    '--bullet-spacing': `${customStyles.bulletSpacing || 4}px`,
                  } as React.CSSProperties}
                >
                  {renderResumeSheetContent(true)}
                </div>
              )}

              {/* Viewport render wrapper with scale zoom */}
              {editorTab === 'resume' && (
                <div ref={viewportRef} className={styles.canvasViewport}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', paddingBottom: '40px' }}>
                    <div
                      className={styles.resumePaperWrapper}
                      style={{
                        width: `${816 * scale}px`,
                        height: `${Math.max(1056, Math.ceil(paperHeight / 1056) * 1056) * scale}px`,
                        position: 'relative'
                      }}
                    >
                      <div
                        ref={paperRef}
                        className={`${styles.resumePaper} ${styles[template]} fadeIn`}
                        style={{
                          transform: `scale(${scale})`,
                          transformOrigin: 'top left',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '816px',
                          height: `${Math.max(1056, Math.ceil(paperHeight / 1056) * 1056)}px`,
                          margin: 0,
                          boxSizing: 'border-box',
                          '--base-font-size': `${customStyles.fontSize}px`,
                          '--heading-size-mult': customStyles.headingSize,
                          '--line-height-mult': customStyles.lineHeight,
                          '--section-spacing': `${customStyles.sectionSpacing}px`,
                          '--accent-color': customStyles.accentColor,
                          '--text-color': customStyles.textColor,
                          '--text-alignment': customStyles.alignment,
                          '--bullet-spacing': `${customStyles.bulletSpacing || 4}px`,
                        } as React.CSSProperties}
                      >
                        <div ref={contentRef} style={{ width: '100%', height: 'auto', overflow: 'hidden' }}>
                          {renderResumeSheetContent(false)}
                        </div>

                        {/* Render Margin Guides dynamically for each page on screen */}
                        {Array.from({ length: Math.ceil(paperHeight / 1056) }).map((_, idx) => {
                          const pageMargin = customStyles.pageMargin || (template === 'german_style_cv' ? 76.8 : (template === 'pixel_perfect_pdf' ? 48 : 32));
                          return (
                            <div
                              key={idx}
                              className="no-print"
                              style={{
                                position: 'absolute',
                                top: `${idx * 1056 + pageMargin}px`,
                                left: `${pageMargin}px`,
                                width: `${816 - 2 * pageMargin}px`,
                                height: `${1056 - 2 * pageMargin}px`,
                                border: '1px dashed rgba(99, 102, 241, 0.25)',
                                pointerEvents: 'none',
                                zIndex: 1
                              }}
                            />
                          );
                        })}

                        {/* Render Page Break Gaps Dynamically */}
                        {Array.from({ length: Math.max(0, Math.ceil(paperHeight / 1056) - 1) }).map((_, idx) => {
                          const pageMargin = customStyles.pageMargin || (template === 'german_style_cv' ? 76.8 : (template === 'pixel_perfect_pdf' ? 48 : 32));
                          return (
                            <div
                              key={idx}
                              className={`${styles.pageBreakLine} no-print`}
                              style={{
                                top: `${(idx + 1) * 1056}px`,
                                left: `-${pageMargin}px`,
                                right: `-${pageMargin}px`
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Action buttons outside of the A4 page container */}
                    <div className="no-print" style={{ display: 'flex', gap: '12px', justifyContent: 'center', width: '100%' }}>
                      <Button onClick={handleAddExperience} variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Plus size={14} /> Add Experience
                      </Button>
                      <Button onClick={handleAddProject} variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Plus size={14} /> Add Project
                      </Button>
                      <Button onClick={handleAddEducation} variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Plus size={14} /> Add Education
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {editorTab === 'letter' && (
                <div className={`${styles.letterPaper} fadeIn`}>
                  {isLetterLoading ? (
                    <div className={styles.loader}>Generating letter...</div>
                  ) : (
                    <textarea
                      className={styles.letterTextarea}
                      value={letterContent}
                      onChange={(e) => setLetterContent(e.target.value)}
                    />
                  )}
                </div>
              )}


            </div>
          ) : (
            <div className={styles.emptyWorkspace}>
              <Brain size={48} className={styles.emptyIcon} />
              <h3>Tailoring Workspace Ready</h3>
              <p>Enter a job description on the left panel or click a command center card application link to begin tailoring.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
