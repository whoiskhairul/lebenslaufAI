import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { InputField } from '../components/InputField';
import api from '../services/api';
import { 
  User, Briefcase, FolderGit2, Dumbbell, GraduationCap, Award, Trash2, Plus, Edit3, Check, X, Upload, Brain
} from 'lucide-react';
import styles from './MasterProfile.module.css';

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
      image_url: ''
    },
    work_experiences: [],
    projects: [],
    skills: [],
    educations: [],
    certifications: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

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

  const handleParseCV = async () => {
    if (!cvText.trim() && !selectedFile) return;
    setIsParsing(true);
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
    } catch (err) {
      console.error(err);
      alert('Failed to parse CV. Make sure the text is correct.');
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
      alert('CV details imported successfully!');
    } catch (err) {
      console.error(err);
      alert('An error occurred while importing CV data.');
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
        setProfile(res.data.data);
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
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName || !skillCategory) return;
    setIsSaving(true);
    try {
      const payload = {
        name: skillName,
        category: skillCategory,
        level: skillLevel
      };

      if (editingId) {
        await api.put(`/master-profile/skills/${editingId}`, payload);
      } else {
        await api.post('/master-profile/skills', payload);
      }

      setIsAdding(false);
      setEditingId(null);
      setSkillName(''); setSkillCategory('');
      fetchProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditSkill = (skill: Skill) => {
    setSkillName(skill.name);
    setSkillCategory(skill.category);
    setSkillLevel(skill.level || (skill.category === 'Languages' ? 'B2' : 'intermediate'));
    setEditingId(skill.id!);
    setIsAdding(true);
  };

  const handleDeleteSkill = async (id: string) => {
    try {
      await api.delete(`/master-profile/skills/${id}`);
      fetchProfile();
    } catch (err) {
      console.error(err);
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
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Master Profile Registry</h2>
          <p className={styles.subtitle}>Your career single-source-of-truth. Securely shielded from AI alterations.</p>
        </div>
        <Button onClick={() => setIsImportModalOpen(true)} className={styles.importBtn}>
          <Upload size={16} /> Import CV
        </Button>
      </div>

      <div className={styles.layout}>
        {/* Sub Navigation Tabs */}
        <div className={`${styles.tabs} glass-card`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`${styles.tabBtn} ${activeTab === tab.id ? styles.activeTab : ''}`}
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
        <div className={`${styles.viewport} glass-card`}>
          {isLoading ? (
            <div className={styles.loader}>Loading credentials...</div>
          ) : (
            <>
              {msg.text && (
                <div className={msg.type === 'success' ? styles.successBanner : styles.errorBanner}>
                  {msg.text}
                </div>
              )}

              {/* Personal Info Tab */}
              {activeTab === 'info' && (
                <form onSubmit={handleSaveInfo} className={styles.form}>
                  <div className={styles.formGrid}>
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

                  <div className={styles.formGrid}>
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

                  <div className={styles.formGrid}>
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

                  <div className={styles.formGrid}>
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

                  <div className={styles.formGrid}>
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

                  <InputField 
                    label="Executive Profile Summary" 
                    id="infoSummary"
                    type="textarea"
                    placeholder="Write a brief professional summary describing your core value proposition..."
                    value={profile.personal_info.summary}
                    onChange={(e) => setProfile({
                      ...profile,
                      personal_info: { ...profile.personal_info, summary: e.target.value }
                    })}
                  />

                  <Button type="submit" isLoading={isSaving} className={styles.saveBtn}>
                    Save Changes
                  </Button>
                </form>
              )}

              {/* Experience Tab */}
              {activeTab === 'experience' && (
                <div className={styles.listSection}>
                  <div className={styles.sectionHeader}>
                    <h3>Work History ({profile.work_experiences.length})</h3>
                    {!isAdding && (
                      <Button onClick={() => setIsAdding(true)} variant="secondary">
                        <Plus size={16} /> Add Job
                      </Button>
                    )}
                  </div>

                  {isAdding && (
                    <form onSubmit={handleAddExperience} className={`${styles.inlineForm} glass-card`}>
                      <h4>{editingId ? 'Edit Work Experience' : 'Add Work Experience'}</h4>
                      <div className={styles.formGrid}>
                        <InputField label="Company Name *" id="addExpCompany" value={expCompany} onChange={e => setExpCompany(e.target.value)} />
                        <InputField label="Job Title *" id="addExpPosition" value={expPosition} onChange={e => setExpPosition(e.target.value)} />
                      </div>
                      <div className={styles.formGrid}>
                        <InputField label="Start Date" id="addExpStart" placeholder="e.g. Jan 2022" value={expStart} onChange={e => setExpStart(e.target.value)} />
                        <InputField label="End Date" id="addExpEnd" placeholder="e.g. Present" value={expEnd} onChange={e => setExpEnd(e.target.value)} disabled={expCurrent} />
                      </div>
                      <label className={styles.checkboxLabel}>
                        <input type="checkbox" checked={expCurrent} onChange={e => {
                          setExpCurrent(e.target.checked);
                          if(e.target.checked) setExpEnd('Present');
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
                      
                      <div className={styles.formActions}>
                        <Button variant="ghost" type="button" onClick={() => {
                          setIsAdding(false);
                          setEditingId(null);
                          setExpCompany(''); setExpPosition(''); setExpLocation(''); setExpStart(''); setExpEnd(''); setExpCurrent(false); setExpBullets('');
                        }}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving}>{editingId ? 'Update Job' : 'Save Job'}</Button>
                      </div>
                    </form>
                  )}
 
                  <div className={styles.itemsList}>
                    {profile.work_experiences.map((exp) => (
                      <div key={exp.id} className={`${styles.listItem} glass-card`}>
                        <div className={styles.itemHeader}>
                          <div>
                            <h4>{exp.position}</h4>
                            <p className={styles.itemSub}>{exp.company} | {exp.start_date} - {exp.end_date}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={() => handleStartEditExperience(exp)} className={styles.deleteBtn} style={{ color: 'var(--primary-color, #4f46e5)' }} title="Edit experience">
                              <Edit3 size={16} />
                            </button>
                            <button type="button" onClick={() => handleDeleteExperience(exp.id!)} className={styles.deleteBtn}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        {exp.bullets.length > 0 && (
                          <ul className={styles.itemBullets}>
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
                <div className={styles.listSection}>
                  <div className={styles.sectionHeader}>
                    <h3>Featured Projects ({profile.projects.length})</h3>
                    {!isAdding && (
                      <Button onClick={() => setIsAdding(true)} variant="secondary">
                        <Plus size={16} /> Add Project
                      </Button>
                    )}
                  </div>

                  {isAdding && (
                    <form onSubmit={handleAddProject} className={`${styles.inlineForm} glass-card`}>
                      <h4>{editingId ? 'Edit Project Details' : 'Add Project Details'}</h4>
                      <div className={styles.formGrid}>
                        <InputField label="Project Title *" id="addProjTitle" value={projTitle} onChange={e => setProjTitle(e.target.value)} />
                        <InputField label="Role" id="addProjRole" value={projRole} onChange={e => setProjRole(e.target.value)} />
                      </div>
                      <div className={styles.formGrid}>
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

                      <div className={styles.formActions}>
                        <Button variant="ghost" type="button" onClick={() => {
                          setIsAdding(false);
                          setEditingId(null);
                          setProjTitle(''); setProjRole(''); setProjTech(''); setProjBullets(''); setProjLink(''); setProjDate('');
                        }}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving}>{editingId ? 'Update Project' : 'Save Project'}</Button>
                      </div>
                    </form>
                  )}

                  <div className={styles.itemsList}>
                    {profile.projects.map((proj) => (
                      <div key={proj.id} className={`${styles.listItem} glass-card`}>
                        <div className={styles.itemHeader}>
                          <div>
                            <h4>{proj.title} {proj.role && <span className={styles.subtext}>({proj.role})</span>}</h4>
                            {proj.technologies.length > 0 && (
                              <div className={styles.tags}>
                                {proj.technologies.map((t, i) => <span key={i} className={styles.tag}>{t}</span>)}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={() => handleStartEditProject(proj)} className={styles.deleteBtn} style={{ color: 'var(--primary-color, #4f46e5)' }} title="Edit project">
                              <Edit3 size={16} />
                            </button>
                            <button type="button" onClick={() => handleDeleteProject(proj.id!)} className={styles.deleteBtn}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        {proj.bullets.length > 0 && (
                          <ul className={styles.itemBullets}>
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
                <div className={styles.listSection}>
                  <div className={styles.sectionHeader}>
                    <h3>Skills Registry ({profile.skills.length})</h3>
                    {!isAdding && (
                      <Button onClick={() => setIsAdding(true)} variant="secondary">
                        <Plus size={16} /> Add Skill
                      </Button>
                    )}
                  </div>

                  {isAdding && (
                    <form onSubmit={handleAddSkill} className={`${styles.inlineForm} glass-card`}>
                      <h4>{editingId ? 'Edit Skill Tag' : 'Add Skill Tag'}</h4>
                      <div className={styles.formGrid}>
                        <InputField label="Skill Name *" id="addSkillName" placeholder="e.g. React" value={skillName} onChange={e => setSkillName(e.target.value)} />
                        
                        <div className={styles.selectGroup}>
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
                              const customCatName = window.prompt('Enter custom category name:');
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
                      
                      <div className={styles.selectGroup} style={{ marginTop: '16px' }}>
                        <label htmlFor="addSkillLevel">Proficiency Level</label>
                        <select id="addSkillLevel" value={skillLevel} onChange={e => setSkillLevel(e.target.value)}>
                          {skillCategory === 'Languages' ? (
                            <>
                              <option value="A1">A1 (Beginner)</option>
                              <option value="A2">A2 (Elementary)</option>
                              <option value="B1">B1 (Intermediate)</option>
                              <option value="B2">B2 (Upper Intermediate)</option>
                              <option value="C1">C1 (Advanced)</option>
                              <option value="C2">C2 (Proficiency)</option>
                              <option value="Native">Native Speaker</option>
                            </>
                          ) : (
                            <>
                              <option value="beginner">Beginner</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="expert">Expert</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className={styles.formActions}>
                        <Button variant="ghost" type="button" onClick={() => {
                          setIsAdding(false);
                          setEditingId(null);
                          setSkillName(''); setSkillCategory('');
                        }}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving}>{editingId ? 'Update Skill' : 'Save Skill'}</Button>
                      </div>
                    </form>
                  )}

                  <div className={styles.skillsRegistry}>
                    {/* Render grouped skills */}
                    {Object.entries(
                      profile.skills.reduce((acc, curr) => {
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
                      .map(([category, skills]) => (
                      <div key={category} className={styles.skillCategoryBlock}>
                        <h4 className={styles.categoryTitle}>{category}</h4>
                        <div className={styles.skillsGrid}>
                          {skills.map((s) => (
                            <div key={s.id} className={styles.skillTagCard} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                              <span>{s.name} <span className={styles.skillLevel}>({s.level})</span></span>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button type="button" onClick={() => handleStartEditSkill(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--primary-color, #4f46e5)' }} title="Edit skill">
                                  <Edit3 size={12} />
                                </button>
                                <button onClick={() => handleDeleteSkill(s.id!)} className={styles.skillDeleteBtn}>X</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education Tab */}
              {activeTab === 'education' && (
                <div className={styles.listSection}>
                  <div className={styles.sectionHeader}>
                    <h3>Education History ({profile.educations.length})</h3>
                    {!isAdding && (
                      <Button onClick={() => setIsAdding(true)} variant="secondary">
                        <Plus size={16} /> Add Education
                      </Button>
                    )}
                  </div>

                  {isAdding && (
                    <form onSubmit={handleAddEducation} className={`${styles.inlineForm} glass-card`}>
                      <h4>{editingId ? 'Edit Education Detail' : 'Add Education Detail'}</h4>
                      <div className={styles.formGrid}>
                        <InputField label="Institution Name *" id="addEduInst" value={eduInstitution} onChange={e => setEduInstitution(e.target.value)} />
                        <InputField label="Degree / Qualification" id="addEduDegree" placeholder="e.g. Bachelor of Science" value={eduDegree} onChange={e => setEduDegree(e.target.value)} />
                      </div>
                      <div className={styles.formGrid}>
                        <InputField label="Field of Study / Description" id="addEduField" placeholder="e.g. Computer Science or Graduated Cum Laude" value={eduFieldOfStudy} onChange={e => setEduFieldOfStudy(e.target.value)} />
                        <InputField label="Location" id="addEduLoc" placeholder="e.g. San Francisco, CA" value={eduLocation} onChange={e => setEduLocation(e.target.value)} />
                      </div>
                      <div className={styles.formGrid}>
                        <InputField label="Start Date" id="addEduStart" placeholder="e.g. 2012" value={eduStart} onChange={e => setEduStart(e.target.value)} />
                        <InputField label="End Date" id="addEduEnd" placeholder="e.g. 2016" value={eduEnd} onChange={e => setEduEnd(e.target.value)} disabled={eduCurrent} />
                      </div>
                      <label className={styles.checkboxLabel}>
                        <input type="checkbox" checked={eduCurrent} onChange={e => {
                          setEduCurrent(e.target.checked);
                          if(e.target.checked) setEduEnd('Present');
                        }} />
                        <span>I currently study here</span>
                      </label>

                      <div className={styles.formActions}>
                        <Button variant="ghost" type="button" onClick={() => {
                          setIsAdding(false);
                          setEditingId(null);
                          setEduInstitution(''); setEduDegree(''); setEduFieldOfStudy(''); setEduLocation(''); setEduStart(''); setEduEnd(''); setEduCurrent(false);
                        }}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving}>{editingId ? 'Update Education' : 'Save Education'}</Button>
                      </div>
                    </form>
                  )}

                  <div className={styles.itemsList}>
                    {profile.educations.map((edu) => (
                      <div key={edu.id} className={`${styles.listItem} glass-card`}>
                        <div className={styles.itemHeader}>
                          <div>
                            <h4>{edu.degree || 'Degree/Qualification'}</h4>
                            <p className={styles.itemSub}>
                              {edu.institution} {edu.location ? `| ${edu.location}` : ''} {edu.start_date ? `| ${edu.start_date} - ${edu.end_date}` : ''}
                            </p>
                            {edu.field_of_study && (
                              <p className={styles.fieldOfStudyText} style={{ marginTop: '4px', fontStyle: 'italic', fontSize: '0.9em', color: 'var(--muted)' }}>
                                {edu.field_of_study}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={() => handleStartEditEducation(edu)} className={styles.deleteBtn} style={{ color: 'var(--primary-color, #4f46e5)' }} title="Edit education">
                              <Edit3 size={16} />
                            </button>
                            <button type="button" onClick={() => handleDeleteEducation(edu.id!)} className={styles.deleteBtn}>
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
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} glass`}>
            <div className={styles.modalHeader}>
              <h3>Import Data from CV</h3>
              <button className={styles.closeBtn} onClick={() => {
                setIsImportModalOpen(false);
                setImportStep(1);
                setCvText('');
                setSelectedFile(null);
                setParsedData(null);
              }}>
                <X size={20} />
              </button>
            </div>

            {importStep === 1 ? (
              <div className={styles.wizardStep}>
                <p className={styles.stepDesc}>
                  Upload your CV text (.txt) or PDF (.pdf) file or paste your CV raw text details here to trigger automatic AI parsing.
                </p>
                <div className={styles.fileInputGroup}>
                  <label htmlFor="cvUpload" className={styles.fileLabel}>
                    <Upload size={16} /> {selectedFile ? selectedFile.name : 'Choose text or PDF CV file...'}
                  </label>
                  <input id="cvUpload" type="file" accept=".txt,.json,.pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
                </div>
                <textarea
                  className={styles.cvTextarea}
                  placeholder="Or paste your raw CV text here (Experiences, Education, Skills, etc.)..."
                  value={cvText}
                  onChange={(e) => {
                    setCvText(e.target.value);
                    if (selectedFile) setSelectedFile(null);
                  }}
                />
                <div className={styles.modalFooter}>
                  <Button variant="ghost" onClick={() => {
                    setIsImportModalOpen(false);
                    setImportStep(1);
                    setCvText('');
                    setSelectedFile(null);
                    setParsedData(null);
                  }}>Cancel</Button>
                  <Button onClick={handleParseCV} isLoading={isParsing} disabled={!cvText.trim() && !selectedFile}>
                    <Brain size={16} /> Parse CV
                  </Button>
                </div>
              </div>
            ) : (
              <div className={styles.wizardStep}>
                <p className={styles.stepDesc}>
                  Select and edit the parsed sections below. Only checked items will be saved to your Master Profile.
                </p>
                
                <div className={styles.wizardScroller}>
                  {/* 1. Personal Info */}
                  {parsedData?.personal_info && (
                    <div className={styles.parsedCard}>
                      <h4>Personal Information</h4>
                      <div className={styles.formGrid}>
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
                      <div className={styles.formGrid}>
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
                    <div className={styles.parsedCard}>
                      <h4>Work Experiences</h4>
                      {parsedData.work_experiences.map((exp, idx) => (
                        <div key={idx} className={styles.reviewItem}>
                          <label className={styles.reviewCheckbox}>
                            <input
                              type="checkbox"
                              checked={!!selectedExperiences[idx]}
                              onChange={(e) => setSelectedExperiences(prev => ({ ...prev, [idx]: e.target.checked }))}
                            />
                            <span>Import Job {idx + 1} ({exp.company})</span>
                          </label>
                          
                          {selectedExperiences[idx] && (
                            <div className={styles.reviewFields}>
                              <div className={styles.formGrid}>
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
                              <div className={styles.formGrid}>
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
                                className={styles.bulletsEdit}
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
                    <div className={styles.parsedCard}>
                      <h4>Projects</h4>
                      {parsedData.projects.map((proj, idx) => (
                        <div key={idx} className={styles.reviewItem}>
                          <label className={styles.reviewCheckbox}>
                            <input
                              type="checkbox"
                              checked={!!selectedProjects[idx]}
                              onChange={(e) => setSelectedProjects(prev => ({ ...prev, [idx]: e.target.checked }))}
                            />
                            <span>Import Project {idx + 1} ({proj.title})</span>
                          </label>

                          {selectedProjects[idx] && (
                            <div className={styles.reviewFields}>
                              <div className={styles.formGrid}>
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
                                className={styles.bulletsEdit}
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
                    <div className={styles.parsedCard}>
                      <h4>Education</h4>
                      {parsedData.educations.map((edu, idx) => (
                        <div key={idx} className={styles.reviewItem}>
                          <label className={styles.reviewCheckbox}>
                            <input
                              type="checkbox"
                              checked={!!selectedEducations[idx]}
                              onChange={(e) => setSelectedEducations(prev => ({ ...prev, [idx]: e.target.checked }))}
                            />
                            <span>Import Education {idx + 1} ({edu.institution})</span>
                          </label>

                          {selectedEducations[idx] && (
                            <div className={styles.reviewFields}>
                              <div className={styles.formGrid}>
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
                              <div className={styles.formGrid}>
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
                    <div className={styles.parsedCard}>
                      <h4>Skills Tags</h4>
                      <div className={styles.skillsReviewGrid}>
                        {parsedData.skills.map((skill, idx) => (
                          <label key={idx} className={styles.skillCheckCard}>
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

                <div className={styles.modalFooter}>
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
