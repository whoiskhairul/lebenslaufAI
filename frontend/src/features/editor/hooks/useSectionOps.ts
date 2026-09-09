import type React from 'react';
import api from '../../../services/api';
import { useCvDocumentStore } from '../state/cvDocumentStore';

export interface SectionOpsDeps {
  masterProfileData: any;
  targetLanguage: 'en' | 'de';
  sectionAiScope: string;
  sectionAiPrompt: string;
  sectionAiProposal: any;
  focusedBulletInfo: { type: 'experience' | 'project' | 'education' | 'custom'; itemId: string; bulletIdx: number } | null;
  setFocusedBulletInfo: (info: { type: 'experience' | 'project' | 'education' | 'custom'; itemId: string; bulletIdx: number } | null) => void;
  setSectionAiProposal: (p: any) => void;
  setIsGeneratingSectionAi: (v: boolean) => void;
  setOpenSectionAiModalId: (id: string | null) => void;
  setSectionAiPrompt: (v: string) => void;
  setActiveDetailSectionId: (id: string | null) => void;
  setPolishModalInfo: (info: { text: string; onAccept: (newText: string) => void } | null) => void;
}

/**
 * All section/item/bullet mutation logic for the CV editor.
 * Document state is read/written through the shared Zustand store; only
 * editor-UI concerns are injected via `deps`.
 */
export function useSectionOps(deps: SectionOpsDeps) {
  const {
    sections, setSections,
    editableSummary, setEditableSummary,
    editablePersonalInfo, setEditablePersonalInfo,
    editableExperiences, setEditableExperiences,
    editableProjects, setEditableProjects,
    editableEducations, setEditableEducations,
    editableSkills, setEditableSkills,
    categoryOrder, setCategoryOrder
  } = useCvDocumentStore();

  const {
    masterProfileData, targetLanguage,
    sectionAiScope, sectionAiPrompt,
    setFocusedBulletInfo, setSectionAiProposal, setIsGeneratingSectionAi,
    setOpenSectionAiModalId, setSectionAiPrompt, setActiveDetailSectionId, setPolishModalInfo
  } = deps;

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
          label: `Job #${expIdx + 1}: ${exp.position || 'Position'} @ ${exp.company || 'Company'}`
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
          label: `Project #${projIdx + 1}: ${proj.title || 'Project'}`
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
          label: `Education #${eduIdx + 1}: ${edu.degree || 'Degree'} - ${edu.institution || 'Institution'}`
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
    if (!deps.sectionAiProposal) return;
    const proposal = deps.sectionAiProposal;
    const { sectionId, type, scope, proposed } = proposal.payload;

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
      if (norm === 'cloud' || norm === 'cloud & devops' || norm === 'devops' || norm === 'cloud & infrastructure') return 'Cloud & DevOps';
      if (norm === 'tools' || norm === 'development tools' || norm === 'werkzeuge & tools' || norm === 'entwicklungswerkzeuge') return 'Werkzeuge & Tools';
      if (norm === 'testing' || norm === 'testen' || norm === 'quality assurance') return 'Testing & Qualitätssicherung';
      if (norm === 'soft_skills' || norm === 'soft skills') return 'Methodische & Soziale Kompetenzen';
      if (norm === 'other' || norm === 'sonstige' || norm === 'weitere') return 'Weitere Kenntnisse';
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

  return {
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
  };
}
