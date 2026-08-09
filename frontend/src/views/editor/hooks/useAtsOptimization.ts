import { useState, useRef, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import { ATSReport, Proposal } from '../../../components/ATSDashboard';
import { Snapshot } from '../../../components/VersionSnapshotDrawer';
import { ResumeVersion } from '../types/editor.types';

export const useAtsOptimization = (
  currentVersion: ResumeVersion | null,
  editableSummary: string,
  editableExperiences: any[],
  editableSkills: any[],
  editableProjects: any[],
  editableEducations: any[],
  sections: any[],
  jobDescription: string,
  position: string,
  company: string,
  setEditableSummary: (s: string) => void,
  setEditableExperiences: (e: any) => void,
  setEditableSkills: (s: any) => void,
  setEditableProjects: (p: any) => void,
  setEditableEducations: (e: any) => void,
  setSections: (s: any) => void
) => {
  const [atsReport, setAtsReport] = useState<ATSReport | null>(null);
  const [atsProposals, setAtsProposals] = useState<Proposal[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isAtsOptimizing, setIsAtsOptimizing] = useState<boolean>(false);
  const [userInjectedSkills, setUserInjectedSkills] = useState<string[]>([]);
  const [userRemovedSkills, setUserRemovedSkills] = useState<string[]>([]);
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

  useEffect(() => {
    if (scoreDebounceTimerRef.current) clearTimeout(scoreDebounceTimerRef.current);
    scoreDebounceTimerRef.current = setTimeout(() => {
      fetchATSScore();
    }, 500);
    return () => {
      if (scoreDebounceTimerRef.current) clearTimeout(scoreDebounceTimerRef.current);
    };
  }, [editableSummary, editableExperiences, editableSkills, editableProjects, editableEducations, sections, jobDescription, position, company]);

  const handleInjectSkill = (skillName: string, category?: string) => {
    createSnapshot(`Before inject skill '${skillName}'`);
    const catNormalized = (category || 'technical').toLowerCase().trim();
    const normalized = skillName.trim();

    setUserRemovedSkills(prev => prev.filter(s => s.toLowerCase() !== normalized.toLowerCase()));
    setUserInjectedSkills(prev => Array.from(new Set([...prev, normalized])));

    setEditableSkills((prev: any[]) => {
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
    setEditableSkills((prev: any[]) => prev.filter(s => s.name.toLowerCase() !== normalized.toLowerCase()));
  };

  const handleAcceptProposal = (proposal: Proposal) => {
    createSnapshot(`Before apply proposal '${proposal.title}'`);
    if (proposal.type === 'add_skills' && proposal.skills_to_add) {
      setEditableSkills((prev: any[]) => [
        ...prev,
        ...proposal.skills_to_add!.map((s: string, idx: number) => ({ id: `sk_${Date.now()}_${idx}`, name: s, category: 'technical' }))
      ]);
    } else if (proposal.type === 'section_reorder' && proposal.target_section) {
      setSections((prev: any[]) => {
        const reordered = [...prev];
        const targetIdx = reordered.findIndex(s => s.id === proposal.target_section);
        if (targetIdx !== -1) {
          const [item] = reordered.splice(targetIdx, 1);
          reordered.splice(proposal.new_index || 0, 0, item);
        }
        return reordered;
      });
    } else if (proposal.type === 'bullet_rephrase' && proposal.experience_id && proposal.proposed_bullet) {
      setEditableExperiences((prev: any[]) => prev.map(exp => {
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

  const liveAtsReport: ATSReport | null = useMemo(() => {
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

    rawMatched.forEach(kw => {
      const isRemoved = userRemovedSkills.some(s => s.toLowerCase() === kw.toLowerCase());
      if (isRemoved) {
        missingList.push({ name: kw, category: 'missing' });
      } else {
        matchedList.push({ name: kw, category: 'matched' });
      }
    });

    rawMissing.forEach(kw => {
      const injected = userInjectedSkills.some(s => s.toLowerCase() === kw.toLowerCase());
      if (injected) {
        matchedList.push({ name: kw, category: 'matched' });
      } else {
        missingList.push({ name: kw, category: 'missing' });
      }
    });

    userInjectedSkills.forEach(kw => {
      if (!matchedList.some(m => m.name.toLowerCase() === kw.toLowerCase())) {
        matchedList.push({ name: kw, category: 'matched' });
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

  return {
    atsReport,
    atsProposals,
    snapshots,
    isAtsOptimizing,
    userInjectedSkills,
    userRemovedSkills,
    liveAtsReport,
    activeAtsScore,
    createSnapshot,
    revertSnapshot,
    handleInjectSkill,
    handleRemoveSkill,
    handleAcceptProposal,
    handleRequestOptimization
  };
};
