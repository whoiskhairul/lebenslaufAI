import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { InputField } from '../components/InputField';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { MasterProfileSkeleton } from '../components/skeleton/MasterProfileSkeleton';
import { User, Briefcase, FolderGit2, Dumbbell, GraduationCap, Trash2, Plus, Edit3, Check, X, Upload, Brain, Wand2, Sparkles, Lock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Toast } from '../components/Toast';

// Tailwind class map -------- replaces the former MasterProfile.module.css (mobile-first, md: = desktop)
const cls = {
  container: 'flex flex-col h-auto min-h-full md:h-full',
  headerRow: 'mb-4 md:mb-6 shrink-0 text-left',
  title: 'font-header text-xl md:text-2xl font-extrabold text-foreground',
  subtitle: 'text-sm text-muted',
  importBtn: 'flex items-center gap-2',
  layout: 'flex flex-col md:flex-row gap-6 flex-1 items-stretch overflow-visible md:overflow-hidden',
  tabs: 'glass-card flex w-full flex-row overflow-x-auto p-2 md:w-[220px] md:flex-col md:p-4 md:shrink-0 thin-scrollbar',
  tabBtn: 'flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-md whitespace-nowrap text-muted font-header font-semibold text-sm transition-colors text-left hover:bg-mutedlight hover:text-foreground',
  activeTab: 'bg-[rgba(99,102,241,0.08)] text-primary max-md:border-b-[3px] max-md:border-b-primary md:border-l-[3px] md:border-l-primary',
  viewport: 'glass-card flex-1 p-4 md:p-8 text-left md:h-full md:overflow-y-auto',
  successBanner: 'bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] text-success px-4 py-3 rounded-lg mb-4 md:mb-6 text-sm font-medium',
  errorBanner: 'bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg mb-4 md:mb-6 text-sm font-medium',
  form: 'flex flex-col gap-2',
  formGrid: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  saveBtn: 'self-start mt-4',
  listSection: 'flex flex-col gap-4',
  sectionHeader: 'flex flex-wrap justify-between items-center gap-2 [&>h3]:text-lg [&>h3]:text-foreground [&>h3]:m-0',
  inlineForm: 'glass-card p-4 md:p-6 flex flex-col gap-2 mb-4',
  checkboxLabel: 'inline-flex items-center gap-2 text-sm mb-4 cursor-pointer text-foreground',
  formActions: 'flex flex-wrap justify-end gap-3 mt-2 max-md:[&>button]:flex-1',
  itemsList: 'flex flex-col gap-4',
  listItem: 'glass-card p-4 md:px-6',
  itemHeader: 'flex justify-between items-start gap-2 [&>h4]:text-base [&>h4]:font-bold [&>h4]:text-foreground [&>h4]:break-words',
  itemSub: 'text-sm text-muted font-medium mt-0.5 break-words',
  subtext: 'font-medium text-muted text-sm',
  deleteBtn: 'bg-transparent border-none p-1 cursor-pointer inline-flex items-center justify-center text-muted transition-colors hover:text-danger shrink-0',
  itemBullets: 'mt-4 pl-4 flex flex-col gap-2 list-disc [&>li]:text-sm [&>li]:text-muted [&>li]:leading-normal marker:text-muted',
  tags: 'flex flex-wrap gap-2 mt-2',
  tag: 'bg-mutedlight text-muted text-xs px-2.5 py-0.5 rounded-md font-semibold',
  selectGroup: 'flex flex-col mb-4 [&>label]:font-header [&>label]:font-semibold [&>label]:text-sm [&>label]:mb-1 [&>select]:px-4 [&>select]:py-3 [&>select]:rounded-lg [&>select]:border [&>select]:border-cardline [&>select]:bg-card [&>select]:text-foreground [&>select]:outline-none [&>select]:focus:border-primary [&>select]:transition-colors',
  skillsRegistry: 'flex flex-col gap-6',
  skillCategoryBlock: 'border-b border-cardline pb-4 last:border-b-0 last:pb-0',
  categoryTitle: 'text-base mb-3 text-foreground m-0',
  categoryActionBtn: 'bg-transparent border-none p-1 cursor-pointer inline-flex items-center justify-center text-muted opacity-60 hover:text-primary hover:opacity-100 transition-colors',
  skillsGrid: 'flex flex-wrap gap-3',
  animateFadeOut: 'opacity-15 scale-95 transition-all duration-150',
  skillTagCard: 'inline-flex items-center gap-3 bg-card border border-cardline px-3 py-1.5 rounded-lg text-sm font-medium',
  iconOrderBtn: 'bg-transparent border-none p-0.5 cursor-pointer inline-flex items-center justify-center text-muted transition-colors hover:text-primary',
  skillDeleteBtn: 'bg-transparent border-none cursor-pointer text-danger font-bold text-xs',
  inlineSkillInputContainer: 'inline-flex items-center gap-2 bg-card border border-primary px-3 py-1.5 rounded-lg',
  inlineSkillInput: 'border-none bg-transparent outline-none text-sm text-foreground w-[130px]',
  inlineSkillActionBtn: 'bg-transparent border-none p-0.5 cursor-pointer inline-flex items-center justify-center text-muted transition-colors hover:text-primary [title=Cancel]&:hover:text-danger',
  addSkillTriggerBtn: 'inline-flex items-center gap-1 bg-transparent border border-dashed border-cardline text-primary px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-mutedlight hover:border-primary',
  modalOverlay: 'fixed inset-0 z-[800] bg-black/50 backdrop-blur-sm flex items-center justify-center',
  modal: 'w-full max-w-[640px] mx-3 bg-card border border-cardline rounded-2xl md:rounded-3xl p-4 md:p-6 max-h-[85vh] md:max-h-[90vh] flex flex-col shadow-lg text-foreground',
  modalHeader: 'flex justify-between items-center mb-4 border-b border-cardline pb-2 shrink-0 [&>h3]:text-lg [&>h3]:text-foreground [&>h3]:font-header [&>h3]:font-extrabold [&>h3]:m-0',
  closeBtn: 'w-[30px] h-[30px] flex items-center justify-center text-muted transition-colors hover:text-foreground bg-transparent border-none cursor-pointer p-0',
  wizardStep: 'flex flex-col flex-1 overflow-hidden',
  stepDesc: 'text-sm text-muted leading-normal mb-4 text-left',
  fileInputGroup: 'mb-3 flex justify-start',
  fileLabel: 'inline-flex items-center gap-2 px-4 py-2 border border-dashed border-cardline rounded-lg text-xs cursor-pointer text-muted transition-all bg-[var(--glass-bg)] hover:border-primary hover:text-foreground',
  cvTextarea: 'w-full h-[180px] p-4 rounded-lg border border-cardline bg-card text-foreground text-sm leading-normal resize-none mb-4 outline-none font-body focus:border-primary transition-colors',
  wizardScroller: 'flex-1 overflow-y-auto pr-2 flex flex-col gap-4 mb-4 thin-scrollbar',
  parsedCard: 'bg-[var(--glass-bg)] border border-cardline rounded-2xl p-4 text-left [&>h4]:text-xs md:[&>h4]:text-sm [&>h4]:font-header [&>h4]:font-bold [&>h4]:uppercase [&>h4]:text-primary [&>h4]:border-b [&>h4]:border-cardline [&>h4]:pb-2 [&>h4]:mb-3 [&>h4]:mt-0',
  reviewItem: 'border-b border-dashed border-cardline py-3 last:border-b-0',
  reviewCheckbox: 'inline-flex items-center gap-2 text-sm font-semibold cursor-pointer mb-2 text-foreground',
  reviewFields: 'pl-4 md:pl-6 flex flex-col gap-2',
  bulletsEdit: 'w-full h-[90px] px-3 py-2 rounded-lg border border-cardline bg-card text-foreground text-xs leading-snug resize-y outline-none font-body focus:border-primary transition-colors',
  skillsReviewGrid: 'flex flex-wrap gap-2',
  skillCheckCard: 'inline-flex items-center gap-2 bg-card border border-cardline px-3 py-1.5 rounded-lg text-xs cursor-pointer text-foreground transition-all has-[:checked]:border-primary has-[:checked]:bg-[rgba(99,102,241,0.05)]',
  modalFooter: 'flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-cardline pt-4 shrink-0 max-sm:[&>button]:w-full',
  aiSummaryWidgetCompact: 'flex justify-between items-center gap-3 bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.25)] rounded-lg px-3 py-2.5 mb-3',
  aiCompactLeft: 'flex items-center gap-2 flex-wrap',
  aiCompactTitle: 'text-[0.82rem] font-bold text-foreground',
  tagDoneCompact: 'text-[0.72rem] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-green-600 border border-emerald-500/30',
  tagMissingCompact: 'text-[0.72rem] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/30',
  generateAiBtnCompact: '!inline-flex !items-center !gap-1 !bg-primary !text-white !border-none font-semibold !text-[0.78rem] !px-3 !py-1.5 rounded-md shadow-[0_2px_8px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)] hover:-translate-y-px transition-all',
  lockedBadgeCompact: 'inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-500/[0.08] border border-red-500/25 text-red-500 rounded-md text-xs font-semibold',
  missingInlineNotice: 'flex items-center flex-wrap gap-1.5 text-xs text-muted mb-3',
  lockedBadge: 'inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg text-[0.78rem] font-semibold',
  missingNotice: 'mt-3 pt-3 border-t border-dashed border-[rgba(99,102,241,0.2)] [&>p]:m-0 [&>p]:mb-2 [&>p]:text-[0.8rem] [&>p]:text-muted',
  missingTags: 'flex flex-wrap gap-2',
  tagDone: 'text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/[0.12] text-green-600 border border-emerald-500/30',
  tagMissing: 'text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/30',
  summaryContainer: 'relative w-full',
  skeletonOverlay: 'absolute top-8 inset-x-0 bottom-0 z-10 bg-slate-900/85 backdrop-blur-sm rounded-lg p-5 flex flex-col gap-3 border border-primary animate-fadeIn',
  skeletonHeader: 'flex items-center gap-2 text-[0.85rem] font-semibold text-indigo-300',
  skeletonShimmerLine: 'h-3 rounded bg-[linear-gradient(90deg,rgba(99,102,241,0.15)_25%,rgba(99,102,241,0.35)_50%,rgba(99,102,241,0.15)_75%)] bg-[length:200%_100%] animate-shimmer',
  errorAlertBanner: 'flex items-start gap-3 bg-gradient-to-br from-red-500/10 to-rose-600/[0.06] border border-red-500/30 border-l-4 border-l-red-500 rounded-lg px-4 py-3 mb-4 animate-fadeIn',
  errorAlertIcon: 'text-red-500 shrink-0 mt-0.5',
  errorAlertContent: 'flex flex-col gap-0.5 flex-1 text-[0.85rem] text-foreground [&>strong]:font-semibold [&>strong]:text-red-400 [&>strong]:text-[0.88rem] [&>span]:text-muted [&>span]:leading-tight',
  errorDismissBtn: 'bg-transparent border-none text-muted cursor-pointer p-0.5 inline-flex items-center justify-center rounded transition-all hover:text-foreground hover:bg-white/10',
  // Previously referenced but never defined in the old module - given sensible equivalents
  modalContent: 'w-full bg-card border border-cardline rounded-2xl',
  aiSparkleIcon: 'text-primary shrink-0 animate-pulse',
  fieldOfStudyText: 'text-sm text-muted break-words',
};


interface PersonalInfo {
  id?: string;
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
  signature_image?: string;
}

interface WorkExperience {
  id?: string;
  company: string;
  position: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  bullets: string[];
}

interface Project {
  id?: string;
  title: string;
  role?: string;
  technologies: string[];
  bullets: string[];
  link?: string;
  date?: string;
}

interface Skill {
  id?: string;
  name: string;
  category: string;
  level?: string;
  order?: number;
}

interface Education {
  id?: string;
  institution: string;
  degree?: string;
  field_of_study?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
}

interface Certification {
  id?: string;
  name: string;
  authority?: string;
  issue_date?: string;
  credential_id?: string;
  credential_url?: string;
}

export const MasterProfile: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'info' | 'experience' | 'projects' | 'skills' | 'education' | 'certs'>('info');

  const [profile, setProfile] = useState<{
    personal_info: PersonalInfo;
    work_experiences: WorkExperience[];
    projects: Project[];
    skills: Skill[];
    educations: Education[];
    certifications: Certification[];
  }>({
    personal_info: {
      full_name: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      summary: '',
      links: [],
      date_of_birth: '',
      nationality: '',
      linkedin: '',
      github: '',
      website: '',
      image_url: '',
      signature_image: ''
    },
    work_experiences: [],
    projects: [],
    skills: [],
    educations: [],
    certifications: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigDragOver, setIsSigDragOver] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Check section completeness to unlock Executive Summary AI Generation
  const missingSummarySections: string[] = [];
  if (profile.work_experiences.length === 0) missingSummarySections.push('Work History');
  if (profile.projects.length === 0) missingSummarySections.push('Featured Projects');
  if (profile.skills.length === 0) missingSummarySections.push('Skills');
  const isSummaryAiUnlocked = missingSummarySections.length === 0;

  const handleGenerateSummaryAI = async () => {
    if (!isSummaryAiUnlocked) return;
    setIsGeneratingSummary(true);
    try {
      const res = await api.post('/master-profile/generate-summary');
      if (res.data && res.data.success && res.data.summary) {
        setProfile(prev => ({
          ...prev,
          personal_info: { ...prev.personal_info, summary: res.data.summary }
        }));
        setMsg({ type: 'success', text: 'Executive Profile Summary generated by AI!' });
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error?.message || 'Failed to generate AI executive summary.';
      setMsg({ type: 'error', text: errorMsg });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // CV Importer Wizard states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [cvText, setCvText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<{
    personal_info?: PersonalInfo;
    work_experiences?: WorkExperience[];
    projects?: Project[];
    skills?: Skill[];
    educations?: Education[];
  } | null>(null);

  const [selectedExperiences, setSelectedExperiences] = useState<Record<number, boolean>>({});
  const [selectedProjects, setSelectedProjects] = useState<Record<number, boolean>>({});
  const [selectedSkills, setSelectedSkills] = useState<Record<number, boolean>>({});
  const [selectedEducations, setSelectedEducations] = useState<Record<number, boolean>>({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setCvText(''); // clear text box if file chosen
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setProfile(prev => ({
        ...prev,
        personal_info: { ...prev.personal_info, image_url: base64String }
      }));
    };
    reader.readAsDataURL(file);
  };

  const processAndSetSignatureFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
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
          setProfile(prev => ({
            ...prev,
            personal_info: { ...prev.personal_info, signature_image: base64 }
          }));
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndSetSignatureFile(file);
    }
  };

  const [parseError, setParseError] = useState<string | null>(null);

  const handleParseCV = async () => {
    if (!cvText.trim() && !selectedFile) return;
    setIsParsing(true);
    setParseError(null);
    try {
      let res;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        res = await api.post('/master-profile/import-cv', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        res = await api.post('/master-profile/import-cv', { cv_text: cvText });
      }
      if (res.data && res.data.success) {
        const data = res.data.data;
        if (data.educations) {
          data.educations = data.educations.map((edu: any) => ({
            ...edu,
            institution: edu.institution || edu.school || '',
            location: edu.location || ''
          }));
        }
        setParsedData(data);

        // Pre-select all extracted items by default
        const expSelection: Record<number, boolean> = {};
        data.work_experiences?.forEach((_: any, idx: number) => { expSelection[idx] = true; });
        setSelectedExperiences(expSelection);

        const projSelection: Record<number, boolean> = {};
        data.projects?.forEach((_: any, idx: number) => { projSelection[idx] = true; });
        setSelectedProjects(projSelection);

        const skillSelection: Record<number, boolean> = {};
        data.skills?.forEach((_: any, idx: number) => { skillSelection[idx] = true; });
        setSelectedSkills(skillSelection);

        const eduSelection: Record<number, boolean> = {};
        data.educations?.forEach((_: any, idx: number) => { eduSelection[idx] = true; });
        setSelectedEducations(eduSelection);

        setImportStep(2);
      }
    } catch (err: any) {
      console.error(err);
      const serverMsg = err?.response?.data?.error?.message;
      setParseError(serverMsg || 'AI Parsing service is currently unavailable. Please check your API key in Settings or try again later.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData) return;
    setIsSaving(true);
    try {
      // 1. Personal Info (always import/merge if filled)
      if (parsedData.personal_info?.full_name) {
        const currentInfoId = profile.personal_info.id;
        const payload = {
          full_name: parsedData.personal_info.full_name,
          title: parsedData.personal_info.title || profile.personal_info.title,
          email: parsedData.personal_info.email || profile.personal_info.email,
          phone: parsedData.personal_info.phone || profile.personal_info.phone,
          location: parsedData.personal_info.location || profile.personal_info.location,
          summary: parsedData.personal_info.summary || profile.personal_info.summary,
          links: parsedData.personal_info.links || profile.personal_info.links
        };
        if (currentInfoId) {
          await api.put(`/master-profile/personal-info/${currentInfoId}`, payload);
        } else {
          await api.post('/master-profile/personal-info', payload);
        }
      }

      // 2. Work Experiences (import only selected)
      const selectedExps = parsedData.work_experiences?.filter((_, idx) => selectedExperiences[idx]);
      if (selectedExps && selectedExps.length > 0) {
        for (const exp of selectedExps) {
          await api.post('/master-profile/experience', exp);
        }
      }

      // 3. Projects (import only selected)
      const selectedProjs = parsedData.projects?.filter((_, idx) => selectedProjects[idx]);
      if (selectedProjs && selectedProjs.length > 0) {
        for (const proj of selectedProjs) {
          await api.post('/master-profile/projects', proj);
        }
      }

      // 4. Skills (import only selected)
      const selectedSkls = parsedData.skills?.filter((_, idx) => selectedSkills[idx]);
      if (selectedSkls && selectedSkls.length > 0) {
        for (const skill of selectedSkls) {
          const exists = profile.skills.some(s => s.name.toLowerCase() === skill.name.toLowerCase());
          if (!exists) {
            await api.post('/master-profile/skills', {
              name: skill.name,
              category: skill.category || 'General',
              level: 'intermediate'
            });
          }
        }
      }

      // 5. Educations (import only selected)
      const selectedEdus = parsedData.educations?.filter((_, idx) => selectedEducations[idx]);
      if (selectedEdus && selectedEdus.length > 0) {
        for (const edu of selectedEdus) {
          await api.post('/master-profile/education', edu);
        }
      }

      await fetchProfile();
      setIsImportModalOpen(false);
      setImportStep(1);
      setCvText('');
      setParsedData(null);
      setToast({ message: 'CV details imported successfully!', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'An error occurred while importing CV data.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Accordion / Inline Add Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Experience form temp state
  const [expCompany, setExpCompany] = useState('');
  const [expPosition, setExpPosition] = useState('');
  const [expLocation, setExpLocation] = useState('');
  const [expStart, setExpStart] = useState('');
  const [expEnd, setExpEnd] = useState('');
  const [expCurrent, setExpCurrent] = useState(false);
  const [expBullets, setExpBullets] = useState('');

  // Education form temp state
  const [eduInstitution, setEduInstitution] = useState('');
  const [eduDegree, setEduDegree] = useState('');
  const [eduFieldOfStudy, setEduFieldOfStudy] = useState('');
  const [eduLocation, setEduLocation] = useState('');
  const [eduStart, setEduStart] = useState('');
  const [eduEnd, setEduEnd] = useState('');
  const [eduCurrent, setEduCurrent] = useState(false);

  // Skill temp state
  const [skillName, setSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState('');
  const [skillLevel, setSkillLevel] = useState('intermediate');
  const [sessionCustomCats, setSessionCustomCats] = useState<string[]>([]);
  const [inlineCategoryInput, setInlineCategoryInput] = useState<string | null>(null);
  const [inlineSkillName, setInlineSkillName] = useState('');
  const [localSkills, setLocalSkills] = useState<Skill[]>([]);
  const [deletedSkillIds, setDeletedSkillIds] = useState<string[]>([]);
  const [dragSkillId, setDragSkillId] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [animatingSkillId, setAnimatingSkillId] = useState<string | null>(null);
  const [animatingPartnerSkillId, setAnimatingPartnerSkillId] = useState<string | null>(null);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [promptModal, setPromptModal] = useState<{
    title: string;
    description: string;
    defaultValue: string;
    onConfirm: (val: string) => void;
  } | null>(null);
  const [promptValue, setPromptValue] = useState('');

  // Project temp state
  const [projTitle, setProjTitle] = useState('');
  const [projRole, setProjRole] = useState('');
  const [projTech, setProjTech] = useState('');
  const [projBullets, setProjBullets] = useState('');
  const [projLink, setProjLink] = useState('');
  const [projDate, setProjDate] = useState('');

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/master-profile/full');
      if (res.data && res.data.success) {
        const loadedProfile = res.data.data;
        if (loadedProfile.personal_info && !loadedProfile.personal_info.image_url && user?.avatar) {
          loadedProfile.personal_info.image_url = user.avatar;
        }
        setProfile(loadedProfile);
        setLocalSkills(loadedProfile.skills || []);
        setDeletedSkillIds([]);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMsg({ type: '', text: '' });

    try {
      const infoId = profile.personal_info.id;
      if (infoId) {
        await api.put(`/master-profile/personal-info/${infoId}`, profile.personal_info);
      } else {
        await api.post('/master-profile/personal-info', profile.personal_info);
      }
      setMsg({ type: 'success', text: 'Personal information saved successfully!' });
      fetchProfile();
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Failed to save personal information.' });
    } finally {
      setIsSaving(false);
    }
  };

  // CRUD handlers for Experience
  // CRUD handlers for Experience
  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expCompany || !expPosition) return;
    setIsSaving(true);
    try {
      const bulletsList = expBullets.split('\n').map(b => b.trim()).filter(b => b);
      const payload = {
        company: expCompany,
        position: expPosition,
        location: expLocation,
        start_date: expStart,
        end_date: expEnd,
        is_current: expCurrent,
        bullets: bulletsList
      };

      if (editingId) {
        await api.put(`/master-profile/experience/${editingId}`, payload);
      } else {
        await api.post('/master-profile/experience', payload);
      }

      setIsAdding(false);
      setEditingId(null);
      // Reset fields
      setExpCompany(''); setExpPosition(''); setExpLocation(''); setExpStart(''); setExpEnd(''); setExpCurrent(false); setExpBullets('');
      fetchProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditExperience = (exp: WorkExperience) => {
    setExpCompany(exp.company);
    setExpPosition(exp.position);
    setExpLocation(exp.location || '');
    setExpStart(exp.start_date || '');
    setExpEnd(exp.end_date || '');
    setExpCurrent(exp.is_current || false);
    setExpBullets((exp.bullets || []).join('\n'));
    setEditingId(exp.id!);
    setIsAdding(true);
  };

  const handleDeleteExperience = async (id: string) => {
    if (!window.confirm('Delete this work experience?')) return;
    try {
      await api.delete(`/master-profile/experience/${id}`);
      fetchProfile();
    } catch (err) {
      console.error(err);
    }
  };

  // CRUD handlers for Education
  const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduInstitution) return;
    setIsSaving(true);
    try {
      const payload = {
        institution: eduInstitution,
        degree: eduDegree,
        field_of_study: eduFieldOfStudy,
        location: eduLocation,
        start_date: eduStart,
        end_date: eduEnd,
        is_current: eduCurrent
      };

      if (editingId) {
        await api.put(`/master-profile/education/${editingId}`, payload);
      } else {
        await api.post('/master-profile/education', payload);
      }

      setIsAdding(false);
      setEditingId(null);
      // Reset fields
      setEduInstitution('');
      setEduDegree('');
      setEduFieldOfStudy('');
      setEduLocation('');
      setEduStart('');
      setEduEnd('');
      setEduCurrent(false);
      fetchProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditEducation = (edu: Education) => {
    setEduInstitution(edu.institution);
    setEduDegree(edu.degree || '');
    setEduFieldOfStudy(edu.field_of_study || '');
    setEduLocation(edu.location || '');
    setEduStart(edu.start_date || '');
    setEduEnd(edu.end_date || '');
    setEduCurrent(edu.is_current || false);
    setEditingId(edu.id!);
    setIsAdding(true);
  };

  const handleDeleteEducation = async (id: string) => {
    if (!window.confirm('Delete this education?')) return;
    try {
      await api.delete(`/master-profile/education/${id}`);
      fetchProfile();
    } catch (err) {
      console.error(err);
    }
  };

  // CRUD handlers for Skills
  // NOTE: every skill operation persists IMMEDIATELY (matching the
  // Experience/Projects tabs) so edits are never silently lost.
  const persistSkill = async (skill: Skill): Promise<Skill> => {
    const payload = {
      name: skill.name,
      category: skill.category,
      level: skill.level || '',
      order: skill.order || 0
    };
    if (skill.id && !skill.id.startsWith('temp_')) {
      const res = await api.patch(`/master-profile/skills/${skill.id}`, payload);
      return { ...skill, ...res.data };
    }
    const res = await api.post('/master-profile/skills', payload);
    return { ...skill, ...res.data };
  };

  const persistCategoryOrders = (categoryName: string, skills: Skill[]) => {
    const catSkills = skills.filter(s => s.category === categoryName);
    catSkills.forEach((s, idx) => {
      if (s.id && !s.id.startsWith('temp_') && (s.order || 0) !== idx) {
        api.patch(`/master-profile/skills/${s.id}`, { order: idx }).catch(err =>
          console.error('Failed to persist skill order:', err)
        );
      }
    });
  };

  const handleMoveSkill = (skillId: string, direction: 'left' | 'right') => {
    const skillToMove = localSkills.find(s => s.id === skillId);
    if (!skillToMove) return;

    const catSkills = localSkills
      .filter(s => s.category === skillToMove.category)
      .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));

    const idx = catSkills.findIndex(s => s.id === skillId);
    if (idx === -1) return;

    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= catSkills.length) return;

    const targetSkill = catSkills[targetIdx];

    // Trigger the fade animation
    setAnimatingSkillId(skillId);
    setAnimatingPartnerSkillId(targetSkill.id!);

    // Wait for the fade-out to complete before updating state
    setTimeout(() => {
      let updatedSkills: Skill[] = [];
      setLocalSkills(prev => {
        const updated = prev.map(s => {
          if (s.id === skillId) {
            return { ...s, order: targetIdx };
          } else if (s.id === targetSkill.id) {
            return { ...s, order: idx };
          }
          if (s.category === skillToMove.category) {
            const indexInCat = catSkills.findIndex(cs => cs.id === s.id);
            if (indexInCat !== idx && indexInCat !== targetIdx) {
              return { ...s, order: indexInCat };
            }
          }
          return s;
        });
        updatedSkills = updated;
        return updated;
      });

      // Persist new ordering immediately
      setTimeout(() => persistCategoryOrders(skillToMove.category, updatedSkills), 0);

      // Clear animation states (fades back in)
      setAnimatingSkillId(null);
      setAnimatingPartnerSkillId(null);
    }, 120);
  };

  const handleSaveInlineSkill = async (categoryName: string) => {
    if (!inlineSkillName.trim()) return;
    const catSkills = localSkills.filter(s => s.category === categoryName);
    const newSkill: Skill = {
      id: `temp_${Date.now()}_${Math.random()}`,
      name: inlineSkillName.trim(),
      category: categoryName,
      level: categoryName.toLowerCase() === 'languages' ? '' : 'intermediate',
      order: catSkills.length
    };
    setInlineSkillName('');
    setInlineCategoryInput(null);
    try {
      const saved = await persistSkill(newSkill);
      setLocalSkills(prev => prev.map(s => (s.id === newSkill.id ? saved : s)));
    } catch (err) {
      console.error('Failed to save skill:', err);
      setToast({ message: 'Failed to save skill.', type: 'error' });
      setLocalSkills(prev => prev.filter(s => s.id !== newSkill.id));
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName || !skillCategory) return;

    const isEdit = Boolean(editingId);
    const catSkills = localSkills.filter(s => s.category === skillCategory);
    const targetSkill: Skill = isEdit
      ? { ...(localSkills.find(s => s.id === editingId) || { id: editingId! }), name: skillName.trim(), category: skillCategory }
      : { id: `temp_${Date.now()}_${Math.random()}`, name: skillName.trim(), category: skillCategory, level: skillCategory.toLowerCase() === 'languages' ? '' : skillLevel, order: catSkills.length };

    // Optimistically update local state
    setLocalSkills(prev => isEdit
      ? prev.map(s => (s.id === editingId ? { ...s, name: targetSkill.name, category: targetSkill.category } : s))
      : [...prev, targetSkill]
    );

    setIsAdding(false);
    setEditingId(null);
    setSkillName('');
    setSkillCategory('');

    try {
      const saved = await persistSkill(targetSkill);
      setLocalSkills(prev => prev.map(s => (s.id === targetSkill.id ? saved : s)));
    } catch (err) {
      console.error('Failed to save skill:', err);
      setToast({ message: 'Failed to save skill.', type: 'error' });
      // Revert optimistic update on failure
      setLocalSkills(prev => isEdit ? prev : prev.filter(s => s.id !== targetSkill.id));
    }
  };

  const handleStartEditSkill = (skill: Skill) => {
    setSkillName(skill.name);
    setSkillCategory(skill.category);
    if ((skill.category || '').toLowerCase() === 'languages') {
      setSkillLevel('B2');
    }
    setEditingId(skill.id!);
    setIsAdding(true);
  };

  const handleDeleteSkill = async (id: string) => {
    // Remove locally first for instant feedback
    const removed = localSkills.find(s => s.id === id);
    setLocalSkills(prev => prev.filter(s => s.id !== id));
    if (id && !id.startsWith('temp_')) {
      try {
        await api.delete(`/master-profile/skills/${id}`);
      } catch (err) {
        console.error('Failed to delete skill:', err);
        setToast({ message: 'Failed to delete skill.', type: 'error' });
        if (removed) setLocalSkills(prev => [...prev, removed]);
      }
    }
  };

  const handleRenameCategory = (oldCategoryName: string) => {
    setPromptValue(oldCategoryName);
    setPromptModal({
      title: 'Rename Category',
      description: `Enter a new name for the category "${oldCategoryName}":`,
      defaultValue: oldCategoryName,
      onConfirm: async (newName) => {
        if (!newName.trim() || newName.trim() === oldCategoryName) return;
        const affected = localSkills.filter(s => s.category === oldCategoryName);
        // Optimistic rename
        setLocalSkills(prev => prev.map(s => (s.category === oldCategoryName ? { ...s, category: newName.trim() } : s)));
        try {
          for (const s of affected) {
            if (s.id && !s.id.startsWith('temp_')) {
              await api.patch(`/master-profile/skills/${s.id}`, { category: newName.trim() });
            }
          }
        } catch (err) {
          console.error('Failed to rename category:', err);
          setToast({ message: 'Failed to rename category on server.', type: 'error' });
        }
      }
    });
  };

  // Drag & drop: move a skill into a different category
  const handleDropSkillToCategory = async (skillId: string | null, newCategory: string) => {
    setDragOverCategory(null);
    if (!skillId) return;
    const skill = localSkills.find(s => s.id === skillId);
    if (!skill || skill.category === newCategory) return;

    const catSkills = localSkills.filter(s => s.category === newCategory && s.id !== skillId);
    const updatedSkill: Skill = { ...skill, category: newCategory, order: catSkills.length };

    // Optimistic move
    setLocalSkills(prev => prev.map(s => (s.id === skillId ? { ...s, category: newCategory, order: catSkills.length } : s)));
    // Renumber the source category so no gaps remain
    const sourceCat = skill.category;
    setTimeout(() => {
      setLocalSkills(prev => {
        const renumbered = prev.map(s => {
          if (s.category === sourceCat) {
            const siblings = prev.filter(x => x.category === sourceCat);
            const idx = siblings.findIndex(x => x.id === s.id);
            return { ...s, order: idx };
          }
          return s;
        });
        persistCategoryOrders(sourceCat, renumbered);
        return renumbered;
      });
    }, 0);

    try {
      await persistSkill(updatedSkill);
      setToast({ message: `'${skill.name}' moved to ${newCategory}.`, type: 'success' });
    } catch (err) {
      console.error('Failed to move skill:', err);
      setToast({ message: 'Failed to move skill to the new category.', type: 'error' });
      setLocalSkills(prev => prev.map(s => (s.id === skillId ? { ...skill } : s)));
    }
  };

  // CRUD handlers for Projects
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle) return;
    setIsSaving(true);
    try {
      const techList = projTech.split(',').map(t => t.trim()).filter(t => t);
      const bulletsList = projBullets.split('\n').map(b => b.trim()).filter(b => b);
      const payload = {
        title: projTitle,
        role: projRole,
        technologies: techList,
        bullets: bulletsList,
        link: projLink || null,
        date: projDate || null
      };

      if (editingId) {
        await api.put(`/master-profile/projects/${editingId}`, payload);
      } else {
        await api.post('/master-profile/projects', payload);
      }

      setIsAdding(false);
      setEditingId(null);
      setProjTitle(''); setProjRole(''); setProjTech(''); setProjBullets(''); setProjLink(''); setProjDate('');
      fetchProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditProject = (proj: Project) => {
    setProjTitle(proj.title);
    setProjRole(proj.role || '');
    setProjTech((proj.technologies || []).join(', '));
    setProjBullets((proj.bullets || []).join('\n'));
    setProjLink(proj.link || '');
    setProjDate(proj.date || '');
    setEditingId(proj.id!);
    setIsAdding(true);
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await api.delete(`/master-profile/projects/${id}`);
      fetchProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const tabs = [
    { id: 'info', label: 'Personal Info', icon: User },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'projects', label: 'Projects', icon: FolderGit2 },
    { id: 'skills', label: 'Skills', icon: Dumbbell },
    { id: 'education', label: 'Education', icon: GraduationCap },
  ];

  return (
    <div className={cls.container}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {promptModal && (
        <div className={cls.modalOverlay}>
          <div className={`${cls.modalContent} glass-card`} style={{ maxWidth: '400px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 10000 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{promptModal.title}</h3>
              <button
                type="button"
                onClick={() => setPromptModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--foreground)' }}>{promptModal.description}</label>
              <input
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--card-bg)',
                  color: 'var(--foreground)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    promptModal.onConfirm(promptValue);
                    setPromptModal(null);
                  } else if (e.key === 'Escape') {
                    setPromptModal(null);
                  }
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button variant="secondary" onClick={() => setPromptModal(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  promptModal.onConfirm(promptValue);
                  setPromptModal(null);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className={cls.headerRow}>
        <div>
          <h2 className={cls.title}>Master Profile Registry</h2>
          <p className={cls.subtitle}>Your career single-source-of-truth. Securely shielded from AI alterations.</p>
        </div>
        <Button onClick={() => setIsImportModalOpen(true)} className={cls.importBtn}>
          <Upload size={16} /> Import CV
        </Button>
      </div>

      <div className={cls.layout}>
        {/* Sub Navigation Tabs */}
        <div className={`${cls.tabs} glass-card`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`${cls.tabBtn} ${activeTab === tab.id ? cls.activeTab : ''}`}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setIsAdding(false);
                }}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Viewport */}
        <div className={`${cls.viewport} glass-card`}>
          {isLoading ? (
            <MasterProfileSkeleton />
          ) : (
            <>
              {msg.text && (
                <div className={msg.type === 'success' ? cls.successBanner : cls.errorBanner}>
                  {msg.text}
                </div>
              )}

              {/* Personal Info Tab */}
              {activeTab === 'info' && (
                <form onSubmit={handleSaveInfo} className={cls.form}>
                  <div className={cls.formGrid}>
                    <InputField
                      label="Full Name"
                      id="infoName"
                      value={profile.personal_info.full_name}
                      onChange={(e) => setProfile({
                        ...profile,
                        personal_info: { ...profile.personal_info, full_name: e.target.value }
                      })}
                    />
                    <InputField
                      label="Professional Title"
                      id="infoTitle"
                      placeholder="e.g. Senior Fullstack Architect"
                      value={profile.personal_info.title}
                      onChange={(e) => setProfile({
                        ...profile,
                        personal_info: { ...profile.personal_info, title: e.target.value }
                      })}
                    />
                  </div>

                  <div className={cls.formGrid}>
                    <InputField
                      label="Email Address"
                      id="infoEmail"
                      value={profile.personal_info.email}
                      onChange={(e) => setProfile({
                        ...profile,
                        personal_info: { ...profile.personal_info, email: e.target.value }
                      })}
                    />
                    <InputField
                      label="Phone Number"
                      id="infoPhone"
                      placeholder="e.g. +1 555-0199"
                      value={profile.personal_info.phone}
                      onChange={(e) => setProfile({
                        ...profile,
                        personal_info: { ...profile.personal_info, phone: e.target.value }
                      })}
                    />
                  </div>

                  <InputField
                    label="Location (City, Country)"
                    id="infoLoc"
                    placeholder="e.g. Berlin, Germany"
                    value={profile.personal_info.location}
                    onChange={(e) => setProfile({
                      ...profile,
                      personal_info: { ...profile.personal_info, location: e.target.value }
                    })}
                  />

                  <div className={cls.formGrid}>
                    <InputField
                      label="Date of Birth"
                      id="infoDOB"
                      placeholder="e.g. January 4th, 1985"
                      value={profile.personal_info.date_of_birth || ''}
                      onChange={(e) => setProfile({
                        ...profile,
                        personal_info: { ...profile.personal_info, date_of_birth: e.target.value }
                      })}
                    />
                    <InputField
                      label="Nationality"
                      id="infoNationality"
                      placeholder="e.g. Guatemala"
                      value={profile.personal_info.nationality || ''}
                      onChange={(e) => setProfile({
                        ...profile,
                        personal_info: { ...profile.personal_info, nationality: e.target.value }
                      })}
                    />
                  </div>

                  <div className={cls.formGrid}>
                    <InputField
                      label="LinkedIn Profile URL"
                      id="infoLinkedIn"
                      placeholder="e.g. linkedin.com/in/username"
                      value={profile.personal_info.linkedin || ''}
                      onChange={(e) => setProfile({
                        ...profile,
                        personal_info: { ...profile.personal_info, linkedin: e.target.value }
                      })}
                    />
                    <InputField
                      label="GitHub Profile URL"
                      id="infoGitHub"
                      placeholder="e.g. github.com/username"
                      value={profile.personal_info.github || ''}
                      onChange={(e) => setProfile({
                        ...profile,
                        personal_info: { ...profile.personal_info, github: e.target.value }
                      })}
                    />
                  </div>

                  <div className={cls.formGrid}>
                    <InputField
                      label="Website / Portfolio URL"
                      id="infoWebsite"
                      placeholder="e.g. portfolio.com"
                      value={profile.personal_info.website || ''}
                      onChange={(e) => setProfile({
                        ...profile,
                        personal_info: { ...profile.personal_info, website: e.target.value }
                      })}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label htmlFor="infoImageUpload" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main, #1e293b)' }}>Profile Image</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {profile.personal_info.image_url && (
                          <img
                            src={profile.personal_info.image_url}
                            alt="Preview"
                            style={{ width: '40px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--card-border, #e2e8f0)' }}
                          />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                          <input
                            type="file"
                            accept="image/*"
                            id="infoImageUpload"
                            onChange={handleImageUpload}
                            style={{ fontSize: '11px', width: '100%' }}
                          />
                          <input
                            type="text"
                            placeholder="Or paste image URL..."
                            value={profile.personal_info.image_url && !profile.personal_info.image_url.startsWith('data:') ? profile.personal_info.image_url : ''}
                            onChange={(e) => setProfile({
                              ...profile,
                              personal_info: { ...profile.personal_info, image_url: e.target.value }
                            })}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--card-border, #e2e8f0)',
                              fontSize: '12px',
                              outline: 'none',
                              background: 'transparent',
                              width: '100%',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                        {profile.personal_info.image_url && (
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => setProfile({
                              ...profile,
                              personal_info: { ...profile.personal_info, image_url: '' }
                            })}
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={cls.formGrid} style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                      <label htmlFor="infoSignatureUpload" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main, #1e293b)' }}>Signature Image</label>
                      {profile.personal_info.signature_image ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px' }}>
                          <div
                            style={{
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '16px',
                              borderRadius: '8px',
                              border: '1px solid var(--card-border, #e2e8f0)',
                              backgroundColor: '#ffffff',
                              backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px), radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
                              backgroundSize: '12px 12px',
                              backgroundPosition: '0 0, 6px 6px',
                              minHeight: '60px',
                              boxSizing: 'border-box'
                            }}
                          >
                            <img
                              src={profile.personal_info.signature_image}
                              alt="Signature Preview"
                              style={{ maxHeight: '44px', maxWidth: '100%', objectFit: 'contain' }}
                            />
                          </div>
                          
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => setProfile({
                              ...profile,
                              personal_info: { ...profile.personal_info, signature_image: '' }
                            })}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              width: '100%',
                              padding: '8px',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            Remove Signature
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px' }}>
                          <input
                            type="file"
                            accept="image/*"
                            id="infoSignatureUpload"
                            onChange={handleSignatureUpload}
                            style={{ display: 'none' }}
                          />
                          <div
                            onClick={() => document.getElementById('infoSignatureUpload')?.click()}
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
                                processAndSetSignatureFile(file);
                              }
                            }}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '16px',
                              borderRadius: '8px',
                              border: isSigDragOver ? '1.5px dashed var(--primary, #6366f1)' : '1.5px dashed var(--card-border, #cbd5e1)',
                              backgroundColor: isSigDragOver ? '#e0e7ff22' : '#f8fafc',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'var(--primary, #6366f1)';
                              e.currentTarget.style.backgroundColor = '#e0e7ff22';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSigDragOver) {
                                e.currentTarget.style.borderColor = 'var(--card-border, #cbd5e1)';
                                e.currentTarget.style.backgroundColor = '#f8fafc';
                              }
                            }}
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary, #6366f1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '6px' }}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary, #4f46e5)' }}>Upload Signature</span>
                            <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Transparent background-removed canvas output.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Compact Executive Profile Summary AI Generator Widget */}
                  <div className={cls.aiSummaryWidgetCompact}>
                    <div className={cls.aiCompactLeft}>
                      <Sparkles size={16} className={cls.aiSparkleIcon} />
                      <span className={cls.aiCompactTitle}>AI Executive Summary Assistant</span>
                      {isSummaryAiUnlocked ? (
                        <span className={cls.tagDoneCompact}>✓ All sections ready</span>
                      ) : (
                        <span className={cls.tagMissingCompact}>
                          {3 - missingSummarySections.length}/3 sections completed
                        </span>
                      )}
                    </div>
                    <div>
                      {isSummaryAiUnlocked ? (
                        <Button
                          type="button"
                          onClick={handleGenerateSummaryAI}
                          isLoading={isGeneratingSummary}
                          variant="secondary"
                          className={cls.generateAiBtnCompact}
                        >
                          <Wand2 size={13} /> Generate with AI
                        </Button>
                      ) : (
                        <div className={cls.lockedBadgeCompact} title={`Add at least 1 item to: ${missingSummarySections.join(', ')}`}>
                          <Lock size={12} /> AI Locked
                        </div>
                      )}
                    </div>
                  </div>

                  {!isSummaryAiUnlocked && (
                    <div className={cls.missingInlineNotice}>
                      <span>Required to unlock AI: </span>
                      <span className={profile.work_experiences.length > 0 ? cls.tagDone : cls.tagMissing}>
                        {profile.work_experiences.length > 0 ? '✓' : '✓'} Work History
                      </span>
                      <span className={profile.projects.length > 0 ? cls.tagDone : cls.tagMissing}>
                        {profile.projects.length > 0 ? '✓' : '✓'} Projects
                      </span>
                      <span className={profile.skills.length > 0 ? cls.tagDone : cls.tagMissing}>
                        {profile.skills.length > 0 ? '✓' : '✓'} Skills
                      </span>
                    </div>
                  )}

                  <div className={cls.summaryContainer}>
                    {isGeneratingSummary && (
                      <div className={cls.skeletonOverlay}>
                        <div className={cls.skeletonHeader}>
                          <Wand2 size={16} /> Synthesizing your work history, projects & skills...
                        </div>
                        <div className={cls.skeletonShimmerLine} style={{ width: '96%' }} />
                        <div className={cls.skeletonShimmerLine} style={{ width: '88%' }} />
                        <div className={cls.skeletonShimmerLine} style={{ width: '74%' }} />
                      </div>
                    )}
                    <div style={isGeneratingSummary ? { opacity: 0, filter: 'blur(4px)', pointerEvents: 'none' } : undefined}>
                      <InputField
                        label="Executive Profile Summary"
                        id="infoSummary"
                        type="textarea"
                        placeholder="Write a brief professional summary describing your core value proposition..."
                        value={isGeneratingSummary ? '' : profile.personal_info.summary}
                        onChange={(e) => setProfile({
                          ...profile,
                          personal_info: { ...profile.personal_info, summary: e.target.value }
                        })}
                        disabled={isGeneratingSummary}
                      />
                    </div>
                  </div>

                  <Button type="submit" isLoading={isSaving} className={cls.saveBtn}>
                    Save Changes
                  </Button>
                </form>
              )}

              {/* Experience Tab */}
              {activeTab === 'experience' && (
                <div className={cls.listSection}>
                  <div className={cls.sectionHeader}>
                    <h3>Work History ({profile.work_experiences.length})</h3>
                    {!isAdding && (
                      <Button onClick={() => setIsAdding(true)} variant="secondary">
                        <Plus size={16} /> Add Job
                      </Button>
                    )}
                  </div>

                  {isAdding && (
                    <form onSubmit={handleAddExperience} className={`${cls.inlineForm} glass-card`}>
                      <h4>{editingId ? 'Edit Work Experience' : 'Add Work Experience'}</h4>
                      <div className={cls.formGrid}>
                        <InputField label="Company Name *" id="addExpCompany" value={expCompany} onChange={e => setExpCompany(e.target.value)} />
                        <InputField label="Job Title *" id="addExpPosition" value={expPosition} onChange={e => setExpPosition(e.target.value)} />
                      </div>
                      <div className={cls.formGrid}>
                        <InputField label="Start Date" id="addExpStart" placeholder="e.g. Jan 2022" value={expStart} onChange={e => setExpStart(e.target.value)} />
                        <InputField label="End Date" id="addExpEnd" placeholder="e.g. Present" value={expEnd} onChange={e => setExpEnd(e.target.value)} disabled={expCurrent} />
                      </div>
                      <label className={cls.checkboxLabel}>
                        <input type="checkbox" checked={expCurrent} onChange={e => {
                          setExpCurrent(e.target.checked);
                          if (e.target.checked) setExpEnd('Present');
                        }} />
                        <span>I currently work here</span>
                      </label>

                      <InputField
                        label="Achievements / Bullet Points (one per line)"
                        id="addExpBullets"
                        type="textarea"
                        placeholder="Optimized loading speeds by 40% using SSR.&#10;Mentored 4 junior frontend developers."
                        value={expBullets}
                        onChange={e => setExpBullets(e.target.value)}
                      />

                      <div className={cls.formActions}>
                        <Button variant="ghost" type="button" onClick={() => {
                          setIsAdding(false);
                          setEditingId(null);
                          setExpCompany(''); setExpPosition(''); setExpLocation(''); setExpStart(''); setExpEnd(''); setExpCurrent(false); setExpBullets('');
                        }}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving}>{editingId ? 'Update Job' : 'Save Job'}</Button>
                      </div>
                    </form>
                  )}

                  <div className={cls.itemsList}>
                    {profile.work_experiences.map((exp) => (
                      <div key={exp.id} className={`${cls.listItem} glass-card`}>
                        <div className={cls.itemHeader}>
                          <div>
                            <h4>{exp.position}</h4>
                            <p className={cls.itemSub}>{exp.company} | {exp.start_date} - {exp.end_date}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={() => handleStartEditExperience(exp)} className={cls.deleteBtn} style={{ color: 'var(--primary-color, #4f46e5)' }} title="Edit experience">
                              <Edit3 size={16} />
                            </button>
                            <button type="button" onClick={() => handleDeleteExperience(exp.id!)} className={cls.deleteBtn}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        {exp.bullets.length > 0 && (
                          <ul className={cls.itemBullets}>
                            {exp.bullets.map((b, i) => <li key={i}>{b}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects Tab */}
              {activeTab === 'projects' && (
                <div className={cls.listSection}>
                  <div className={cls.sectionHeader}>
                    <h3>Featured Projects ({profile.projects.length})</h3>
                    {!isAdding && (
                      <Button onClick={() => setIsAdding(true)} variant="secondary">
                        <Plus size={16} /> Add Project
                      </Button>
                    )}
                  </div>

                  {isAdding && (
                    <form onSubmit={handleAddProject} className={`${cls.inlineForm} glass-card`}>
                      <h4>{editingId ? 'Edit Project Details' : 'Add Project Details'}</h4>
                      <div className={cls.formGrid}>
                        <InputField label="Project Title *" id="addProjTitle" value={projTitle} onChange={e => setProjTitle(e.target.value)} />
                        <InputField label="Role" id="addProjRole" value={projRole} onChange={e => setProjRole(e.target.value)} />
                      </div>
                      <div className={cls.formGrid}>
                        <InputField label="Link / URL" id="addProjLink" placeholder="https://github.com/..." value={projLink} onChange={e => setProjLink(e.target.value)} />
                        <InputField label="Year / Date" id="addProjDate" placeholder="e.g. 2017" value={projDate} onChange={e => setProjDate(e.target.value)} />
                      </div>
                      <InputField label="Technologies Used (comma separated)" id="addProjTech" placeholder="React, TypeScript, CSS Modules" value={projTech} onChange={e => setProjTech(e.target.value)} />

                      <InputField
                        label="Project Scope & Contributions (one per line)"
                        id="addProjBullets"
                        type="textarea"
                        placeholder="Built state engine using Zustand.&#10;Integrated REST controllers."
                        value={projBullets}
                        onChange={e => setProjBullets(e.target.value)}
                      />

                      <div className={cls.formActions}>
                        <Button variant="ghost" type="button" onClick={() => {
                          setIsAdding(false);
                          setEditingId(null);
                          setProjTitle(''); setProjRole(''); setProjTech(''); setProjBullets(''); setProjLink(''); setProjDate('');
                        }}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving}>{editingId ? 'Update Project' : 'Save Project'}</Button>
                      </div>
                    </form>
                  )}

                  <div className={cls.itemsList}>
                    {profile.projects.map((proj) => (
                      <div key={proj.id} className={`${cls.listItem} glass-card`}>
                        <div className={cls.itemHeader}>
                          <div>
                            <h4>{proj.title} {proj.role && <span className={cls.subtext}>({proj.role})</span>}</h4>
                            {proj.technologies.length > 0 && (
                              <div className={cls.tags}>
                                {proj.technologies.map((t, i) => <span key={i} className={cls.tag}>{t}</span>)}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={() => handleStartEditProject(proj)} className={cls.deleteBtn} style={{ color: 'var(--primary-color, #4f46e5)' }} title="Edit project">
                              <Edit3 size={16} />
                            </button>
                            <button type="button" onClick={() => handleDeleteProject(proj.id!)} className={cls.deleteBtn}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        {proj.bullets.length > 0 && (
                          <ul className={cls.itemBullets}>
                            {proj.bullets.map((b, i) => <li key={i}>{b}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills Tab */}
              {activeTab === 'skills' && (
                <div className={cls.listSection}>
                  <div className={cls.sectionHeader}>
                    <h3>Skills Registry ({profile.skills.length})</h3>
                    {!isAdding && (
                      <Button onClick={() => setIsAdding(true)} variant="secondary">
                        <Plus size={16} /> Add Skill
                      </Button>
                    )}
                  </div>

                  {isAdding && (
                    <form onSubmit={handleAddSkill} className={`${cls.inlineForm} glass-card`}>
                      <h4>{editingId ? 'Edit Skill Tag' : 'Add Skill Tag'}</h4>
                      <div className={cls.formGrid}>
                        <InputField label="Skill Name *" id="addSkillName" placeholder="e.g. React" value={skillName} onChange={e => setSkillName(e.target.value)} />

                        <div className={cls.selectGroup}>
                          <label htmlFor="addSkillCat">Category / Group *</label>
                          <select id="addSkillCat" value={skillCategory} onChange={e => {
                            const val = e.target.value;
                            const PRESET_CATEGORIES = [
                              'Programming Languages',
                              'Frameworks & Libraries',
                              'Databases',
                              'Cloud & DevOps',
                              'Development Tools',
                              'Testing',
                              'Languages'
                            ];
                            const profileCats = Array.from(new Set(profile.skills.map(s => s.category).filter(Boolean)));
                            const customCatsInProfile = profileCats.filter(c => !PRESET_CATEGORIES.includes(c));
                            const allCats = [
                              ...PRESET_CATEGORIES,
                              ...Array.from(new Set([...customCatsInProfile, ...sessionCustomCats]))
                            ];
                            if (val === '__add_custom__') {
                              setPromptValue('');
                              setPromptModal({
                                title: 'Add Custom Category',
                                description: 'Enter custom category name:',
                                defaultValue: '',
                                onConfirm: (customCatName) => {
                                  if (customCatName && customCatName.trim()) {
                                    const trimmed = customCatName.trim();
                                    if (!allCats.includes(trimmed)) {
                                      setSessionCustomCats(prev => [...prev, trimmed]);
                                    }
                                    setSkillCategory(trimmed);
                                    setSkillLevel('intermediate');
                                  } else {
                                    setSkillCategory('');
                                  }
                                }
                              });
                            } else {
                              setSkillCategory(val);
                              if (val === 'Languages') {
                                setSkillLevel('B2');
                              } else {
                                setSkillLevel('intermediate');
                              }
                            }
                          }}>
                            <option value="">-- Select Category --</option>
                            {[
                              'Programming Languages',
                              'Frameworks & Libraries',
                              'Databases',
                              'Cloud & DevOps',
                              'Development Tools',
                              'Testing',
                              'Languages',
                              ...Array.from(new Set([
                                ...profile.skills.map(s => s.category).filter(c => c && ![
                                  'Programming Languages',
                                  'Frameworks & Libraries',
                                  'Databases',
                                  'Cloud & DevOps',
                                  'Development Tools',
                                  'Testing',
                                  'Languages'
                                ].includes(c)),
                                ...sessionCustomCats
                              ]))
                            ].map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="__add_custom__">+ Add Custom Category...</option>
                          </select>
                        </div>
                      </div>

                      <div className={cls.formActions}>
                        <Button variant="ghost" type="button" onClick={() => {
                          setIsAdding(false);
                          setEditingId(null);
                          setSkillName(''); setSkillCategory('');
                        }}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving}>{editingId ? 'Update Skill' : 'Save Skill'}</Button>
                      </div>
                    </form>
                  )}

                  <div className={cls.skillsRegistry}>
                    {/* Render grouped skills */}
                    {Object.entries(
                      localSkills.reduce((acc, curr) => {
                        const cat = curr.category || 'Other';
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(curr);
                        return acc;
                      }, {} as Record<string, Skill[]>)
                    )
                      .sort(([catA], [catB]) => {
                        const getCategoryOrderScore = (cat: string) => {
                          const order = [
                            'Programming Languages',
                            'Frameworks & Libraries',
                            'Databases',
                            'Cloud & DevOps',
                            'Development Tools',
                            'Testing'
                          ];
                          const idx = order.indexOf(cat);
                          if (idx !== -1) return idx;
                          if (cat === 'Languages') return 999;
                          return 100;
                        };
                        return getCategoryOrderScore(catA) - getCategoryOrderScore(catB);
                      })
                      .map(([category, skills]) => {
                        const sortedSkills = [...skills].sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
                        const isDropTarget = dragOverCategory === category && dragSkillId !== null;
                        return (
                          <div
                            key={category}
                            className={cls.skillCategoryBlock}
                            style={isDropTarget ? { outline: '2px dashed var(--primary-color, #4f46e5)', outlineOffset: '4px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.04)' } : undefined}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              if (dragOverCategory !== category) setDragOverCategory(category);
                            }}
                            onDragLeave={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                setDragOverCategory(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleDropSkillToCategory(dragSkillId, category);
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                              <h4 className={cls.categoryTitle} style={{ marginBottom: 0 }}>{category}</h4>
                              <button
                                type="button"
                                className={cls.categoryActionBtn}
                                onClick={() => handleRenameCategory(category)}
                                title="Rename Category"
                              >
                                <Edit3 size={14} />
                              </button>
                            </div>
                            <div className={cls.skillsGrid}>
                              {sortedSkills.map((s, idx) => {
                                const isAnimating = s.id === animatingSkillId || s.id === animatingPartnerSkillId;
                                const animationClass = isAnimating ? cls.animateFadeOut : '';

                                return (
                                  <div
                                    key={s.id}
                                    className={`${cls.skillTagCard} ${animationClass}`}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', opacity: dragSkillId === s.id ? 0.4 : 1, transition: 'opacity 0.15s ease' }}
                                    draggable
                                    onDragStart={(e) => {
                                      setDragSkillId(s.id!);
                                      e.dataTransfer.effectAllowed = 'move';
                                      e.dataTransfer.setData('text/plain', s.id || '');
                                    }}
                                    onDragEnd={() => {
                                      setDragSkillId(null);
                                      setDragOverCategory(null);
                                    }}
                                    title="Drag to another category"
                                  >
                                    <span>{s.name}</span>
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    {idx > 0 && (
                                      <button type="button" onClick={() => handleMoveSkill(s.id!, 'left')} className={cls.iconOrderBtn} title="Move left">
                                        <ChevronLeft size={12} />
                                      </button>
                                    )}
                                    {idx < sortedSkills.length - 1 && (
                                      <button type="button" onClick={() => handleMoveSkill(s.id!, 'right')} className={cls.iconOrderBtn} title="Move right">
                                        <ChevronRight size={12} />
                                      </button>
                                    )}
                                    <button type="button" onClick={() => handleStartEditSkill(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--primary-color, #4f46e5)' }} title="Edit skill">
                                      <Edit3 size={12} />
                                    </button>
                                    <button onClick={() => handleDeleteSkill(s.id!)} className={cls.skillDeleteBtn}>X</button>
                                  </div>
                                </div>
                              );
                              })}

                            {inlineCategoryInput === category ? (
                              <div className={cls.inlineSkillInputContainer}>
                                <input
                                  type="text"
                                  className={cls.inlineSkillInput}
                                  placeholder="Type skill name..."
                                  value={inlineSkillName}
                                  onChange={(e) => setInlineSkillName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveInlineSkill(category);
                                    } else if (e.key === 'Escape') {
                                      setInlineCategoryInput(null);
                                      setInlineSkillName('');
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  className={cls.inlineSkillActionBtn}
                                  onClick={() => handleSaveInlineSkill(category)}
                                  title="Save"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  className={cls.inlineSkillActionBtn}
                                  onClick={() => {
                                    setInlineCategoryInput(null);
                                    setInlineSkillName('');
                                  }}
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className={cls.addSkillTriggerBtn}
                                onClick={() => {
                                  setInlineCategoryInput(category);
                                  setInlineSkillName('');
                                }}
                              >
                                <Plus size={14} /> Add Skill
                              </button>
                            )}
                          </div>
                        </div>
                      );
                      })}
                  </div>
                </div>
              )}

              {/* Education Tab */}
              {activeTab === 'education' && (
                <div className={cls.listSection}>
                  <div className={cls.sectionHeader}>
                    <h3>Education History ({profile.educations.length})</h3>
                    {!isAdding && (
                      <Button onClick={() => setIsAdding(true)} variant="secondary">
                        <Plus size={16} /> Add Education
                      </Button>
                    )}
                  </div>

                  {isAdding && (
                    <form onSubmit={handleAddEducation} className={`${cls.inlineForm} glass-card`}>
                      <h4>{editingId ? 'Edit Education Detail' : 'Add Education Detail'}</h4>
                      <div className={cls.formGrid}>
                        <InputField label="Institution Name *" id="addEduInst" value={eduInstitution} onChange={e => setEduInstitution(e.target.value)} />
                        <InputField label="Degree / Qualification" id="addEduDegree" placeholder="e.g. Bachelor of Science" value={eduDegree} onChange={e => setEduDegree(e.target.value)} />
                      </div>
                      <div className={cls.formGrid}>
                        <InputField label="Field of Study / Description" id="addEduField" placeholder="e.g. Computer Science or Graduated Cum Laude" value={eduFieldOfStudy} onChange={e => setEduFieldOfStudy(e.target.value)} />
                        <InputField label="Location" id="addEduLoc" placeholder="e.g. San Francisco, CA" value={eduLocation} onChange={e => setEduLocation(e.target.value)} />
                      </div>
                      <div className={cls.formGrid}>
                        <InputField label="Start Date" id="addEduStart" placeholder="e.g. 2012" value={eduStart} onChange={e => setEduStart(e.target.value)} />
                        <InputField label="End Date" id="addEduEnd" placeholder="e.g. 2016" value={eduEnd} onChange={e => setEduEnd(e.target.value)} disabled={eduCurrent} />
                      </div>
                      <label className={cls.checkboxLabel}>
                        <input type="checkbox" checked={eduCurrent} onChange={e => {
                          setEduCurrent(e.target.checked);
                          if (e.target.checked) setEduEnd('Present');
                        }} />
                        <span>I currently study here</span>
                      </label>

                      <div className={cls.formActions}>
                        <Button variant="ghost" type="button" onClick={() => {
                          setIsAdding(false);
                          setEditingId(null);
                          setEduInstitution(''); setEduDegree(''); setEduFieldOfStudy(''); setEduLocation(''); setEduStart(''); setEduEnd(''); setEduCurrent(false);
                        }}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving}>{editingId ? 'Update Education' : 'Save Education'}</Button>
                      </div>
                    </form>
                  )}

                  <div className={cls.itemsList}>
                    {profile.educations.map((edu) => (
                      <div key={edu.id} className={`${cls.listItem} glass-card`}>
                        <div className={cls.itemHeader}>
                          <div>
                            <h4>{edu.degree || 'Degree/Qualification'}</h4>
                            <p className={cls.itemSub}>
                              {edu.institution} {edu.location ? `| ${edu.location}` : ''} {edu.start_date ? `| ${edu.start_date} - ${edu.end_date}` : ''}
                            </p>
                            {edu.field_of_study && (
                              <p className={cls.fieldOfStudyText} style={{ marginTop: '4px', fontStyle: 'italic', fontSize: '0.9em', color: 'var(--muted)' }}>
                                {edu.field_of_study}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={() => handleStartEditEducation(edu)} className={cls.deleteBtn} style={{ color: 'var(--primary-color, #4f46e5)' }} title="Edit education">
                              <Edit3 size={16} />
                            </button>
                            <button type="button" onClick={() => handleDeleteEducation(edu.id!)} className={cls.deleteBtn}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isImportModalOpen && (
        <div className={cls.modalOverlay}>
          <div className={`${cls.modal} glass`}>
            <div className={cls.modalHeader}>
              <h3>Import Data from CV</h3>
              <button className={cls.closeBtn} onClick={() => {
                setIsImportModalOpen(false);
                setImportStep(1);
                setCvText('');
                setSelectedFile(null);
                setParsedData(null);
                setParseError(null);
              }}>
                <X size={20} />
              </button>
            </div>

            {importStep === 1 ? (
              <div className={cls.wizardStep}>
                <p className={cls.stepDesc}>
                  Upload your CV text (.txt) or PDF (.pdf) file or paste your CV raw text details here to trigger automatic AI parsing.
                </p>

                {parseError && (
                  <div className={cls.errorAlertBanner}>
                    <AlertCircle size={18} className={cls.errorAlertIcon} />
                    <div className={cls.errorAlertContent}>
                      <strong>AI Parsing Error</strong>
                      <span>{parseError}</span>
                    </div>
                    <button className={cls.errorDismissBtn} onClick={() => setParseError(null)}>
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className={cls.fileInputGroup}>
                  <label htmlFor="cvUpload" className={cls.fileLabel}>
                    <Upload size={16} /> {selectedFile ? selectedFile.name : 'Choose text or PDF CV file...'}
                  </label>
                  <input id="cvUpload" type="file" accept=".txt,.json,.pdf" onChange={(e) => {
                    setParseError(null);
                    handleFileUpload(e);
                  }} style={{ display: 'none' }} />
                </div>
                <textarea
                  className={cls.cvTextarea}
                  placeholder="Or paste your raw CV text here (Experiences, Education, Skills, etc.)..."
                  value={cvText}
                  onChange={(e) => {
                    setParseError(null);
                    setCvText(e.target.value);
                    if (selectedFile) setSelectedFile(null);
                  }}
                />
                <div className={cls.modalFooter}>
                  <Button variant="ghost" onClick={() => {
                    setIsImportModalOpen(false);
                    setImportStep(1);
                    setCvText('');
                    setSelectedFile(null);
                    setParsedData(null);
                    setParseError(null);
                  }}>Cancel</Button>
                  <Button onClick={handleParseCV} isLoading={isParsing} disabled={!cvText.trim() && !selectedFile}>
                    <Brain size={16} /> Parse CV
                  </Button>
                </div>
              </div>
            ) : (
              <div className={cls.wizardStep}>
                <p className={cls.stepDesc}>
                  Select and edit the parsed sections below. Only checked items will be saved to your Master Profile.
                </p>

                <div className={cls.wizardScroller}>
                  {/* 1. Personal Info */}
                  {parsedData?.personal_info && (
                    <div className={cls.parsedCard}>
                      <h4>Personal Information</h4>
                      <div className={cls.formGrid}>
                        <InputField
                          label="Full Name"
                          id="parsedName"
                          value={parsedData.personal_info.full_name || ''}
                          onChange={(e) => setParsedData(prev => prev ? {
                            ...prev,
                            personal_info: { ...prev.personal_info!, full_name: e.target.value }
                          } : null)}
                        />
                        <InputField
                          label="Title"
                          id="parsedTitle"
                          value={parsedData.personal_info.title || ''}
                          onChange={(e) => setParsedData(prev => prev ? {
                            ...prev,
                            personal_info: { ...prev.personal_info!, title: e.target.value }
                          } : null)}
                        />
                      </div>
                      <div className={cls.formGrid}>
                        <InputField
                          label="Email"
                          id="parsedEmail"
                          value={parsedData.personal_info.email || ''}
                          onChange={(e) => setParsedData(prev => prev ? {
                            ...prev,
                            personal_info: { ...prev.personal_info!, email: e.target.value }
                          } : null)}
                        />
                        <InputField
                          label="Phone"
                          id="parsedPhone"
                          value={parsedData.personal_info.phone || ''}
                          onChange={(e) => setParsedData(prev => prev ? {
                            ...prev,
                            personal_info: { ...prev.personal_info!, phone: e.target.value }
                          } : null)}
                        />
                      </div>
                    </div>
                  )}

                  {/* 2. Experiences */}
                  {parsedData?.work_experiences && parsedData.work_experiences.length > 0 && (
                    <div className={cls.parsedCard}>
                      <h4>Work Experiences</h4>
                      {parsedData.work_experiences.map((exp, idx) => (
                        <div key={idx} className={cls.reviewItem}>
                          <label className={cls.reviewCheckbox}>
                            <input
                              type="checkbox"
                              checked={!!selectedExperiences[idx]}
                              onChange={(e) => setSelectedExperiences(prev => ({ ...prev, [idx]: e.target.checked }))}
                            />
                            <span>Import Job {idx + 1} ({exp.company})</span>
                          </label>

                          {selectedExperiences[idx] && (
                            <div className={cls.reviewFields}>
                              <div className={cls.formGrid}>
                                <InputField
                                  label="Company"
                                  id={`expCompany_${idx}`}
                                  value={exp.company || ''}
                                  onChange={(e) => setParsedData(prev => {
                                    if (!prev || !prev.work_experiences) return prev;
                                    const list = [...prev.work_experiences];
                                    list[idx] = { ...list[idx], company: e.target.value };
                                    return { ...prev, work_experiences: list };
                                  })}
                                />
                                <InputField
                                  label="Position"
                                  id={`expPosition_${idx}`}
                                  value={exp.position || ''}
                                  onChange={(e) => setParsedData(prev => {
                                    if (!prev || !prev.work_experiences) return prev;
                                    const list = [...prev.work_experiences];
                                    list[idx] = { ...list[idx], position: e.target.value };
                                    return { ...prev, work_experiences: list };
                                  })}
                                />
                              </div>
                              <div className={cls.formGrid}>
                                <InputField
                                  label="Location"
                                  id={`expLoc_${idx}`}
                                  value={exp.location || ''}
                                  onChange={(e) => setParsedData(prev => {
                                    if (!prev || !prev.work_experiences) return prev;
                                    const list = [...prev.work_experiences];
                                    list[idx] = { ...list[idx], location: e.target.value };
                                    return { ...prev, work_experiences: list };
                                  })}
                                />
                                <InputField
                                  label="Duration (e.g. 2024-01 - Present)"
                                  id={`expDur_${idx}`}
                                  value={`${exp.start_date || ''} - ${exp.end_date || ''}`}
                                  onChange={(e) => setParsedData(prev => {
                                    if (!prev || !prev.work_experiences) return prev;
                                    const parts = e.target.value.split('-');
                                    const list = [...prev.work_experiences];
                                    list[idx] = {
                                      ...list[idx],
                                      start_date: parts[0]?.trim() || '',
                                      end_date: parts[1]?.trim() || ''
                                    };
                                    return { ...prev, work_experiences: list };
                                  })}
                                />
                              </div>
                              <textarea
                                className={cls.bulletsEdit}
                                placeholder="Job Bullets (one per line)..."
                                value={exp.bullets?.join('\n') || ''}
                                onChange={(e) => setParsedData(prev => {
                                  if (!prev || !prev.work_experiences) return prev;
                                  const list = [...prev.work_experiences];
                                  list[idx] = { ...list[idx], bullets: e.target.value.split('\n') };
                                  return { ...prev, work_experiences: list };
                                })}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 3. Projects */}
                  {parsedData?.projects && parsedData.projects.length > 0 && (
                    <div className={cls.parsedCard}>
                      <h4>Projects</h4>
                      {parsedData.projects.map((proj, idx) => (
                        <div key={idx} className={cls.reviewItem}>
                          <label className={cls.reviewCheckbox}>
                            <input
                              type="checkbox"
                              checked={!!selectedProjects[idx]}
                              onChange={(e) => setSelectedProjects(prev => ({ ...prev, [idx]: e.target.checked }))}
                            />
                            <span>Import Project {idx + 1} ({proj.title})</span>
                          </label>

                          {selectedProjects[idx] && (
                            <div className={cls.reviewFields}>
                              <div className={cls.formGrid}>
                                <InputField
                                  label="Project Title"
                                  id={`projTitle_${idx}`}
                                  value={proj.title || ''}
                                  onChange={(e) => setParsedData(prev => {
                                    if (!prev || !prev.projects) return prev;
                                    const list = [...prev.projects];
                                    list[idx] = { ...list[idx], title: e.target.value };
                                    return { ...prev, projects: list };
                                  })}
                                />
                                <InputField
                                  label="Role"
                                  id={`projRole_${idx}`}
                                  value={proj.role || ''}
                                  onChange={(e) => setParsedData(prev => {
                                    if (!prev || !prev.projects) return prev;
                                    const list = [...prev.projects];
                                    list[idx] = { ...list[idx], role: e.target.value };
                                    return { ...prev, projects: list };
                                  })}
                                />
                              </div>
                              <textarea
                                className={cls.bulletsEdit}
                                placeholder="Project Bullets (one per line)..."
                                value={proj.bullets?.join('\n') || ''}
                                onChange={(e) => setParsedData(prev => {
                                  if (!prev || !prev.projects) return prev;
                                  const list = [...prev.projects];
                                  list[idx] = { ...list[idx], bullets: e.target.value.split('\n') };
                                  return { ...prev, projects: list };
                                })}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 4. Education */}
                  {parsedData?.educations && parsedData.educations.length > 0 && (
                    <div className={cls.parsedCard}>
                      <h4>Education</h4>
                      {parsedData.educations.map((edu, idx) => (
                        <div key={idx} className={cls.reviewItem}>
                          <label className={cls.reviewCheckbox}>
                            <input
                              type="checkbox"
                              checked={!!selectedEducations[idx]}
                              onChange={(e) => setSelectedEducations(prev => ({ ...prev, [idx]: e.target.checked }))}
                            />
                            <span>Import Education {idx + 1} ({edu.institution})</span>
                          </label>

                          {selectedEducations[idx] && (
                            <div className={cls.reviewFields}>
                              <div className={cls.formGrid}>
                                <InputField
                                  label="Institution"
                                  id={`eduInst_${idx}`}
                                  value={edu.institution || ''}
                                  onChange={(e) => setParsedData(prev => {
                                    if (!prev || !prev.educations) return prev;
                                    const list = [...prev.educations];
                                    list[idx] = { ...list[idx], institution: e.target.value };
                                    return { ...prev, educations: list };
                                  })}
                                />
                                <InputField
                                  label="Degree"
                                  id={`eduDegree_${idx}`}
                                  value={edu.degree || ''}
                                  onChange={(e) => setParsedData(prev => {
                                    if (!prev || !prev.educations) return prev;
                                    const list = [...prev.educations];
                                    list[idx] = { ...list[idx], degree: e.target.value };
                                    return { ...prev, educations: list };
                                  })}
                                />
                              </div>
                              <div className={cls.formGrid}>
                                <InputField
                                  label="Location"
                                  id={`eduLoc_${idx}`}
                                  value={edu.location || ''}
                                  onChange={(e) => setParsedData(prev => {
                                    if (!prev || !prev.educations) return prev;
                                    const list = [...prev.educations];
                                    list[idx] = { ...list[idx], location: e.target.value };
                                    return { ...prev, educations: list };
                                  })}
                                />
                                <InputField
                                  label="Duration (e.g. 2012 - 2016)"
                                  id={`eduDur_${idx}`}
                                  value={`${edu.start_date || ''} - ${edu.end_date || ''}`}
                                  onChange={(e) => setParsedData(prev => {
                                    if (!prev || !prev.educations) return prev;
                                    const parts = e.target.value.split('-');
                                    const list = [...prev.educations];
                                    list[idx] = {
                                      ...list[idx],
                                      start_date: parts[0]?.trim() || '',
                                      end_date: parts[1]?.trim() || ''
                                    };
                                    return { ...prev, educations: list };
                                  })}
                                />
                              </div>
                              <InputField
                                label="Field of Study / Description"
                                id={`eduField_${idx}`}
                                value={edu.field_of_study || ''}
                                onChange={(e) => setParsedData(prev => {
                                  if (!prev || !prev.educations) return prev;
                                  const list = [...prev.educations];
                                  list[idx] = { ...list[idx], field_of_study: e.target.value };
                                  return { ...prev, educations: list };
                                })}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 5. Skills */}
                  {parsedData?.skills && parsedData.skills.length > 0 && (
                    <div className={cls.parsedCard}>
                      <h4>Skills Tags</h4>
                      <div className={cls.skillsReviewGrid}>
                        {parsedData.skills.map((skill, idx) => (
                          <label key={idx} className={cls.skillCheckCard}>
                            <input
                              type="checkbox"
                              checked={!!selectedSkills[idx]}
                              onChange={(e) => setSelectedSkills(prev => ({ ...prev, [idx]: e.target.checked }))}
                            />
                            <span>{skill.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className={cls.modalFooter}>
                  <Button variant="ghost" onClick={() => setImportStep(1)}>Back</Button>
                  <Button onClick={handleConfirmImport} isLoading={isSaving}>
                    Confirm & Save to Profile
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
