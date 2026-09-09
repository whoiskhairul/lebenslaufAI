import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ATSDashboardSkeleton } from './skeleton/ATSDashboardSkeleton';
import {
  Brain, Sparkles, Plus, RefreshCw, CheckCircle2, XCircle, X, Download,
  Target, FileText, Lightbulb, Eye, TrendingUp, AlertTriangle, Award, Circle, RotateCcw, Zap, ListChecks, ChevronDown
} from 'lucide-react';
import { DeepAnalysis } from '../views/editor/types/editor.types';
import { ChecklistItem } from '../features/editor/utils/atsLocal';
import styles from './ATSDashboard.module.css';

export interface ATSReport {
  score: number;
  breakdown: {
    keywords: number;
    structure: number;
    bullets: number;
    format: number;
    semantics: number;
  };
  matched_keywords: {
    hard_skills: string[];
    tools: string[];
    soft_skills: string[];
    action_verbs: string[];
  };
  missing_keywords: {
    hard_skills: string[];
    tools: string[];
    soft_skills: string[];
    action_verbs: string[];
  };
  all_matched: Array<{ name: string; category: string }>;
  all_missing: Array<{ name: string; category: string }>;
  suggestions: string[];
  stats?: {
    word_count: number;
    bullet_count: number;
    sections_detected: string[];
  };
}

export interface Proposal {
  id: string;
  type: string;
  title: string;
  description: string;
  skills_to_add?: string[];
  experience_id?: string;
  original_bullet?: string;
  proposed_bullet?: string;
  target_section?: string;
  new_index?: number;
}

export interface WeakBulletWithOriginal {
  id: string;
  type: 'experience' | 'project';
  bullet_index: number;
  improved: string;
  reason?: string;
  original: string;
  contextLabel: string;
}

export interface RecommendedKeyword {
  name: string;
  category: string;
  reason?: string;
  applied: boolean;
}

export interface KeywordCoverage {
  matched: number;
  total: number;
  percent: number;
}

export interface BeforeAfterSnapshot {
  originalSummary: string;
  currentSummary: string;
  changedBullets: number;
  totalBullets: number;
  originalSkillCount: number;
  currentSkillCount: number;
}

interface ATSDashboardProps {
  report: ATSReport | null;
  onRefreshScore: () => void;
  onInjectSkill: (skillName: string, category: string) => void;
  onRemoveSkill?: (skillName: string) => void;
  existingCategories?: string[];
  deepAnalysis?: DeepAnalysis | null;
  checklist?: ChecklistItem[];
  dismissedIds?: string[];
  onDismiss?: (id: string) => void;
  onApplyBulletFix?: (wb: WeakBulletWithOriginal) => void;
  onExportReport?: () => void;
  isRefreshing?: boolean;
  coverage?: KeywordCoverage | null;
  recommendedKeywords?: RecommendedKeyword[];
  weakBullets?: WeakBulletWithOriginal[];
  jobDescription?: string;
  beforeAfter?: BeforeAfterSnapshot | null;
}

interface CategoryModalProps {
  skillName: string;
  availableCategories: string[];
  onSelect: (category: string) => void;
  onClose: () => void;
}

const CategoryPickerModal: React.FC<CategoryModalProps> = ({
  skillName,
  availableCategories,
  onSelect,
  onClose
}) => {
  const [filterText, setFilterText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCategories = availableCategories.filter(cat =>
    cat.toLowerCase().includes(filterText.toLowerCase().trim())
  );

  const hasCustomOption = filterText.trim() && !filteredCategories.some(c => c.toLowerCase() === filterText.trim().toLowerCase());
  const totalOptionsCount = filteredCategories.length + (hasCustomOption ? 1 : 0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filterText]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, totalOptionsCount));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + totalOptionsCount) % Math.max(1, totalOptionsCount));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (hasCustomOption && selectedIndex === filteredCategories.length) {
          onSelect(filterText.trim().toLowerCase());
        } else if (filteredCategories[selectedIndex]) {
          onSelect(filteredCategories[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalOptionsCount, selectedIndex, filteredCategories, hasCustomOption, filterText, onSelect, onClose]);

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h4 className={styles.modalTitle}>Choose Skill Category</h4>
          <button type="button" onClick={onClose} className={styles.iconBtn} title="Close">
            <X size={15} />
          </button>
        </div>

        <div className={styles.modalHint}>
          Select a category to add <strong style={{ color: 'var(--primary)' }}>"{skillName}"</strong> to your CV:
        </div>

        <input
          type="text"
          placeholder="Filter or type custom category..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          autoFocus
          className={styles.modalInput}
        />

        <div className={styles.modalList}>
          {filteredCategories.map((cat, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelect(cat)}
                className={`${styles.modalOption} ${isSelected ? styles.modalOptionActive : ''}`}
              >
                <span>📁 {cat}</span>
                {isSelected && <span className={styles.modalEnterHint}>Press Enter</span>}
              </button>
            );
          })}

          {hasCustomOption && (
            <button
              type="button"
              onClick={() => onSelect(filterText.trim().toLowerCase())}
              className={styles.modalCustomOption}
            >
              + Create "{filterText.trim()}"
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const HighlightedJD: React.FC<{ text: string; matched: string[]; missing: string[] }> = ({ text, matched, missing }) => {
  const items = [
    ...matched.map(k => ({ kw: k, cls: styles.jdhMatched })),
    ...missing.map(k => ({ kw: k, cls: styles.jdhMissing }))
  ].filter(t => t.kw && t.kw.length >= 2);

  if (items.length === 0) return <>{text}</>;

  const sorted = [...items].sort((a, b) => b.kw.length - a.kw.length);
  const classMap = new Map<string, string>();
  sorted.forEach(t => classMap.set(t.kw.toLowerCase(), t.cls));
  const pattern = new RegExp(`(${sorted.map(t => escapeRegExp(t.kw)).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((p, i) => {
        const cls = classMap.get(p.toLowerCase());
        return cls ? <mark key={i} className={cls}>{p}</mark> : <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
};

const scoreColor = (s: number) =>
  s >= 80 ? 'var(--success)' : s >= 50 ? 'var(--warning)' : 'var(--danger)';

type SectionId = 'keywords' | 'fixes' | 'readiness' | 'insights';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  badge?: { text: string; color?: string } | null;
  open: boolean;
  onToggle: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, badge, open, onToggle }) => (
  <button type="button" className={styles.sectionHeaderBtn} onClick={onToggle}>
    <span className={styles.sectionIcon}>{icon}</span>
    <span className={styles.sectionHeaderText}>{title}</span>
    {badge && (
      <span className={styles.sectionBadge} style={badge.color ? { color: badge.color, borderColor: badge.color } : undefined}>
        {badge.text}
      </span>
    )}
    <ChevronDown size={14} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
  </button>
);

export const ATSDashboard: React.FC<ATSDashboardProps> = ({
  report,
  onRefreshScore,
  onInjectSkill,
  onRemoveSkill,
  existingCategories = [],
  deepAnalysis,
  checklist = [],
  dismissedIds = [],
  onDismiss,
  onApplyBulletFix,
  onExportReport,
  isRefreshing,
  coverage,
  recommendedKeywords = [],
  weakBullets = [],
  jobDescription,
  beforeAfter
}) => {
  const [keywordFilter, setKeywordFilter] = useState<'all' | 'matched' | 'missing' | 'recommended'>('all');
  const [modalSkill, setModalSkill] = useState<string | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [jdExpanded, setJdExpanded] = useState(false);
  const [beforeAfterExpanded, setBeforeAfterExpanded] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    keywords: true,
    fixes: false,
    readiness: false,
    insights: false
  });
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  const score = report?.score ?? 0;

  // Score count-up micro-animation
  useEffect(() => {
    let start = 0;
    const end = score;
    if (start === end) {
      setDisplayScore(end);
      return;
    }

    const duration = 750;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / (end - start)));

    const timer = setInterval(() => {
      start += increment;
      setDisplayScore(start);
      if (start === end) {
        clearInterval(timer);
      }
    }, Math.max(stepTime, 6));

    return () => clearInterval(timer);
  }, [score]);

  const isDismissed = (id: string) => dismissedIds.includes(id);

  const visibleSuggestions = (report?.suggestions || []).filter((_, i) => !isDismissed(`sug:${i}`));
  const visibleWeakBullets = weakBullets.filter(wb => !isDismissed(`bullet:${wb.id}:${wb.bullet_index}`));
  const visibleRecommended = recommendedKeywords.filter(rk => !rk.applied && !isDismissed(`rec:${rk.name.toLowerCase()}`));
  const passedChecks = checklist.filter(c => c.passed).length;
  const failedChecks = checklist.length - passedChecks;

  // Apply smart defaults once, when analysis data first arrives:
  // open only the sections that actually need attention.
  useEffect(() => {
    if (!report || defaultsApplied) return;
    setOpenSections({
      keywords: true,
      fixes: visibleWeakBullets.length > 0,
      readiness: failedChecks > 0,
      insights: false
    });
    setDefaultsApplied(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, defaultsApplied]);

  const toggleSection = (id: SectionId) =>
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));

  const defaultCategories = ['technical', 'frameworks', 'tools', 'databases', 'cloud', 'soft_skills', 'languages'];
  const userCats = (existingCategories || []).map(c => c.toLowerCase().trim()).filter(Boolean);
  const availableCategories = Array.from(new Set([...userCats, ...defaultCategories]));

  const getScoreTheme = (s: number) => {
    const color = scoreColor(s);
    if (s >= 80) return { color, label: 'ATS Ready', desc: 'High match probability with applicant tracking systems.' };
    if (s >= 60) return { color, label: 'Good Match', desc: 'Adding missing keywords will boost interview callbacks.' };
    return { color, label: 'Needs Optimization', desc: 'Missing key skills and structure required by this job description.' };
  };

  const scoreTheme = getScoreTheme(score);

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const handleSelectCategory = (category: string) => {
    if (modalSkill) {
      onInjectSkill(modalSkill, category);
      if (onDismiss) onDismiss(`rec:${modalSkill.toLowerCase()}`);
      setModalSkill(null);
    }
  };

  /* ============ HERO (score + breakdown, always visible) ============ */
  const renderHero = () => (
    <div className={`${styles.card} ${styles.hero}`}>
      <div className={styles.heroTop}>
        <div className={styles.gaugeContainer}>
          <svg className={styles.scoreSvg} viewBox="0 0 100 100">
            <circle className={styles.scoreBg} cx="50" cy="50" r={radius} />
            <circle
              className={styles.scoreProgress}
              cx="50"
              cy="50"
              r={radius}
              style={{
                stroke: scoreTheme.color,
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset
              }}
            />
          </svg>
          <div className={styles.scoreText}>
            <span className={styles.scoreValue} style={{ color: scoreTheme.color }}>
              {displayScore}
            </span>
            <span className={styles.scoreLabel}>Score</span>
          </div>
        </div>
        <div className={styles.heroDetails}>
          <span
            className={styles.statusBadge}
            style={{ color: scoreTheme.color, borderColor: scoreTheme.color }}
          >
            <Zap size={11} />
            {scoreTheme.label}
          </span>
          <div className={styles.heroDesc}>{scoreTheme.desc}</div>
          {[
            { name: 'Keywords', val: report?.breakdown?.keywords ?? 0, weight: '50%' },
            { name: 'Experience', val: report?.breakdown?.bullets ?? 0, weight: '30%' },
            { name: 'Structure', val: report?.breakdown?.structure ?? 0, weight: '20%' }
          ].map((item, idx) => (
            <div key={idx} className={styles.barRow} style={{ marginBottom: '0' }}>
              <div className={styles.barMeta}>
                <span className={styles.barName}>{item.name} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>({item.weight})</span></span>
                <span className={styles.barValue} style={{ color: scoreColor(item.val) }}>
                  {Math.round(item.val)}%
                </span>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{
                    width: `${Math.min(100, Math.max(0, item.val))}%`,
                    backgroundColor: scoreColor(item.val)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {(coverage || checklist.length > 0) && (
        <div className={styles.heroStats}>
          {coverage && (
            <button
              type="button"
              className={`${styles.statChip} ${styles.statChipBtn}`}
              onClick={() => toggleSection('keywords')}
              title="Jump to keywords"
            >
              <Target size={11} color="var(--primary)" />
              Coverage <span className={styles.statChipValue}>{coverage.matched}/{coverage.total}</span>
            </button>
          )}
          {checklist.length > 0 && (
            <button
              type="button"
              className={`${styles.statChip} ${styles.statChipBtn}`}
              onClick={() => toggleSection('readiness')}
              title="Jump to readiness checklist"
            >
              <ListChecks size={11} color={failedChecks > 0 ? 'var(--warning)' : 'var(--success)'} />
              Ready <span className={styles.statChipValue} style={{ color: failedChecks > 0 ? 'var(--warning)' : 'var(--success)' }}>{passedChecks}/{checklist.length}</span>
            </button>
          )}
          {visibleRecommended.length > 0 && (
            <button
              type="button"
              className={`${styles.statChip} ${styles.statChipBtn}`}
              onClick={() => { setKeywordFilter('recommended'); setOpenSections(prev => ({ ...prev, keywords: true })); }}
              title="Jump to AI keyword picks"
            >
              <Lightbulb size={11} color="var(--primary)" />
              <span className={styles.statChipValue}>{visibleRecommended.length}</span> AI picks
            </button>
          )}
          {visibleWeakBullets.length > 0 && (
            <button
              type="button"
              className={`${styles.statChip} ${styles.statChipBtn}`}
              onClick={() => setOpenSections(prev => ({ ...prev, fixes: true }))}
              title="Jump to bullet fixes"
            >
              <AlertTriangle size={11} color="var(--warning)" />
              <span className={styles.statChipValue}>{visibleWeakBullets.length}</span> bullet fixes
            </button>
          )}
        </div>
      )}
    </div>
  );

  /* ============ KEYWORDS (collapsible) ============ */
  const renderKeywordsBody = () => (
    <>
      {coverage && (
        <div style={{ marginBottom: '12px' }}>
          <div className={styles.barTrack} style={{ height: '8px' }}>
            <div
              className={styles.barFill}
              style={{
                width: `${coverage.percent}%`,
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))'
              }}
            />
          </div>
          <div className={styles.barFeedback} style={{ marginTop: '6px' }}>
            {coverage.percent >= 80
              ? 'Excellent — your resume speaks the job ad\'s language.'
              : coverage.percent >= 50
                ? 'Decent foundation — inject the missing keywords below to climb higher.'
                : 'Low coverage — your resume shares few keywords with this job ad.'}
          </div>
        </div>
      )}

      <div className={styles.tagFilterRow}>
        <button
          className={`${styles.tagFilterBtn} ${keywordFilter === 'all' ? styles.tagFilterBtnActive : ''}`}
          onClick={() => setKeywordFilter('all')}
        >
          All {(report?.all_matched?.length ?? 0) + (report?.all_missing?.length ?? 0) + visibleRecommended.length}
        </button>
        <button
          className={`${styles.tagFilterBtn} ${keywordFilter === 'matched' ? styles.tagFilterBtnActive : ''}`}
          onClick={() => setKeywordFilter('matched')}
        >
          ✓ Matched {report?.all_matched?.length ?? 0}
        </button>
        <button
          className={`${styles.tagFilterBtn} ${keywordFilter === 'missing' ? styles.tagFilterBtnActive : ''}`}
          onClick={() => setKeywordFilter('missing')}
        >
          ✕ Missing {report?.all_missing?.length ?? 0}
        </button>
        <button
          className={`${styles.tagFilterBtn} ${keywordFilter === 'recommended' ? styles.tagFilterBtnActive : ''}`}
          onClick={() => setKeywordFilter('recommended')}
        >
          <Lightbulb size={10} /> AI Picks {visibleRecommended.length}
        </button>
      </div>

      <div className={styles.tagsContainer}>
        {(keywordFilter === 'all' || keywordFilter === 'matched') &&
          report?.all_matched?.map((k, i) => (
            <span key={`m-${i}`} className={`${styles.tagPill} ${styles.tagMatched}`}>
              <CheckCircle2 size={11} />
              {k.name}
              {onRemoveSkill && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSkill(k.name);
                  }}
                  className={styles.tagActionBtn}
                  style={{ marginLeft: '3px' }}
                  title={`Remove '${k.name}' from CV`}
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}

        {(keywordFilter === 'all' || keywordFilter === 'missing') &&
          report?.all_missing?.map((k, i) => (
            <span
              key={`miss-${i}`}
              className={`${styles.tagPill} ${styles.tagMissing}`}
              onClick={() => setModalSkill(k.name)}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              title={`Click to add '${k.name}' to CV Skills`}
            >
              <XCircle size={11} />
              <span>{k.name}</span>
              <span className={styles.tagActionBtn} style={{ marginLeft: '2px' }}>
                <Plus size={11} />
              </span>
            </span>
          ))}

        {(keywordFilter === 'all' || keywordFilter === 'recommended') &&
          recommendedKeywords.map((rk, i) => {
            if (rk.applied) {
              if (keywordFilter !== 'all' && keywordFilter !== 'recommended') return null;
              return (
                <span
                  key={`rec-applied-${i}`}
                  className={`${styles.tagPill} ${styles.tagMatched}`}
                  title="AI recommended — added to your skills"
                >
                  <CheckCircle2 size={11} />
                  {rk.name}
                  {onRemoveSkill && (
                    <button
                      type="button"
                      className={styles.tagActionBtn}
                      style={{ marginLeft: '3px' }}
                      title="Remove from CV"
                      onClick={(e) => { e.stopPropagation(); onRemoveSkill(rk.name); }}
                    >
                      <X size={11} />
                    </button>
                  )}
                </span>
              );
            }
            if (isDismissed(`rec:${rk.name.toLowerCase()}`)) return null;
            if (keywordFilter !== 'all' && keywordFilter !== 'recommended') return null;
            return (
              <span
                key={`rec-${i}`}
                className={`${styles.tagPill} ${styles.tagRecommended}`}
                onClick={() => setModalSkill(rk.name)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                title={rk.reason || 'AI recommended keyword for this job domain'}
              >
                <Lightbulb size={11} />
                <span>{rk.name}</span>
                <span className={styles.tagActionBtn} style={{ marginLeft: '2px' }}>
                  <Plus size={11} />
                </span>
              </span>
            );
          })}
      </div>

      {visibleRecommended.length > 0 && (keywordFilter === 'all' || keywordFilter === 'recommended') && (
        <div className={styles.keywordReasons}>
          <div className={styles.keywordReasonsTitle}>
            <Lightbulb size={11} /> Why these help
          </div>
          {visibleRecommended.map((rk, i) => (
            <div key={i} className={styles.keywordReasonItem}>
              <span style={{ flex: 1 }}>
                <strong>{rk.name}</strong> — {rk.reason || 'Strengthens your profile for this job domain.'}
              </span>
              {onDismiss && (
                <button
                  type="button"
                  className={styles.tagActionBtn}
                  style={{ flexShrink: 0 }}
                  title="Dismiss this recommendation"
                  onClick={() => onDismiss(`rec:${rk.name.toLowerCase()}`)}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {jobDescription && (
        <div className={styles.jdSection}>
          <button
            type="button"
            className={styles.jdToggle}
            onClick={() => setJdExpanded(prev => !prev)}
          >
            <Eye size={11} />
            {jdExpanded ? 'Hide' : 'Show'} job description match view
          </button>
          {jdExpanded && (
            <>
              <div className={styles.jdLegend}>
                <span><mark className={styles.jdhMatched}>green</mark> resume matches</span>
                <span><mark className={styles.jdhMissing}>red</mark> missing from resume</span>
              </div>
              <div className={styles.jdText}>
                <HighlightedJD
                  text={jobDescription}
                  matched={(report?.all_matched || []).map(k => k.name)}
                  missing={(report?.all_missing || []).map(k => k.name)}
                />
              </div>
            </>
          )}
        </div>
      )}
    </>
  );

  /* ============ BULLET FIXES (collapsible) ============ */
  const renderFixesBody = () => {
    if (visibleWeakBullets.length === 0) {
      return (
        <div className={styles.emptyState} style={{ padding: '18px 12px' }}>
          <Award size={20} color="var(--success)" style={{ marginBottom: '6px' }} />
          <div className={styles.emptyDesc}>
            No weak bullets detected. Run a manual recheck after major edits to re-evaluate.
          </div>
        </div>
      );
    }
    return (
      <>
        <div className={styles.sectionInlineActions}>
          <span className={styles.proposalDesc}>
            ⚠️ {visibleWeakBullets.length} bullet{visibleWeakBullets.length > 1 ? 's' : ''} flagged as weak
          </span>
          {onApplyBulletFix && (
            <button
              type="button"
              className={styles.acceptBtn}
              style={{ padding: '5px 11px', fontSize: '0.68rem' }}
              onClick={() => visibleWeakBullets.forEach(wb => onApplyBulletFix(wb))}
              title="Apply every suggestion below"
            >
              <CheckCircle2 size={11} /> Apply all
            </button>
          )}
        </div>
        {visibleWeakBullets.map((wb) => (
          <div key={`${wb.id}-${wb.bullet_index}`} className={styles.proposalCard}>
            <div className={styles.proposalTitle}>
              <FileText size={12} color="var(--primary)" /> {wb.contextLabel} · Bullet {wb.bullet_index + 1}
            </div>
            {wb.reason && <div className={styles.proposalDesc}>⚠️ {wb.reason}</div>}
            <div className={styles.bulletDiffOriginal}>
              <div className={styles.diffLabel}>Current</div>
              {wb.original || '(empty)'}
            </div>
            <div className={styles.bulletDiffImproved}>
              <div className={styles.diffLabel}>Proposed</div>
              {wb.improved}
            </div>
            <div className={styles.proposalActions}>
              <button
                type="button"
                className={styles.acceptBtn}
                onClick={() => onApplyBulletFix && onApplyBulletFix(wb)}
              >
                <CheckCircle2 size={11} /> Apply
              </button>
              {onDismiss && (
                <button
                  type="button"
                  className={styles.rejectBtn}
                  onClick={() => onDismiss(`bullet:${wb.id}:${wb.bullet_index}`)}
                >
                  Discard
                </button>
              )}
            </div>
          </div>
        ))}
      </>
    );
  };

  /* ============ READINESS (collapsible) ============ */
  const renderReadinessBody = () => (
    <>
      {checklist.map(item => (
        <div key={item.id} className={styles.checklistRow}>
          {item.passed
            ? <CheckCircle2 size={14} color="var(--success)" style={{ flexShrink: 0, marginTop: '1px' }} />
            : <XCircle size={14} color={item.weight === 2 ? 'var(--danger)' : 'var(--warning)'} style={{ flexShrink: 0, marginTop: '1px' }} />}
          <div className={styles.checklistBody}>
            <div className={`${styles.checklistLabel} ${item.passed ? styles.checklistPassed : ''}`}>
              {item.label}
            </div>
            {!item.passed && <div className={styles.checklistDetail}>{item.detail}</div>}
          </div>
        </div>
      ))}
    </>
  );

  /* ============ DEEP INSIGHTS (collapsible) ============ */
  const renderInsightsBody = () => {
    const ri = deepAnalysis?.recruiter_impression;
    const fr = deepAnalysis?.fit_report;
    const ss = deepAnalysis?.section_scores || [];
    const hasAny = Boolean(ri?.first_impression || ri?.verdict || ss.length > 0 || fr?.gaps?.length || fr?.seniority_match || beforeAfter);
    if (!hasAny) {
      return (
        <div className={styles.emptyState} style={{ padding: '18px 12px' }}>
          <Eye size={20} color="var(--primary)" style={{ marginBottom: '6px' }} />
          <div className={styles.emptyDesc}>
            Recruiter simulation, section scores and job-fit analysis appear here. Run <strong style={{ color: 'var(--primary)' }}>Analyze &amp; Tailor</strong> or a manual recheck to generate them.
          </div>
        </div>
      );
    }
    return (
      <>
        {ri && (ri.first_impression || ri.verdict) && (
          <div className={styles.insightBlock}>
            <div className={styles.insightBlockTitle} style={{ color: 'var(--primary)' }}>
              <Eye size={12} /> Recruiter 6-Second Scan
            </div>
            {ri.first_impression && (
              <div className={styles.recruiterImpression}>{ri.first_impression}</div>
            )}
            {(ri.strengths || []).length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {(ri.strengths || []).map((s, i) => (
                  <div key={`s-${i}`} className={styles.fitItem}>
                    <CheckCircle2 size={12} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
            {(ri.concerns || []).length > 0 && (
              <div style={{ marginTop: '4px' }}>
                {(ri.concerns || []).map((s, i) => (
                  <div key={`c-${i}`} className={styles.fitItem}>
                    <AlertTriangle size={12} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
            {ri.verdict && (
              <div className={styles.recruiterVerdict}>{ri.verdict}</div>
            )}
          </div>
        )}

        {ss.length > 0 && (
          <div className={styles.insightBlock}>
            <div className={styles.insightBlockTitle}>
              <TrendingUp size={12} /> Section Scores
            </div>
            {ss.map((s, i) => (
              <div key={i} className={styles.barRow}>
                <div className={styles.barMeta}>
                  <span className={styles.barName} style={{ textTransform: 'capitalize' }}>{s.section}</span>
                  <span className={styles.barValue} style={{ color: scoreColor(s.score) }}>
                    {Math.round(s.score)}
                  </span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${Math.min(100, Math.max(0, s.score))}%`,
                      backgroundColor: scoreColor(s.score)
                    }}
                  />
                </div>
                {s.feedback && <div className={styles.barFeedback}>{s.feedback}</div>}
              </div>
            ))}
          </div>
        )}

        {beforeAfter && (
          <div className={styles.insightBlock}>
            <div className={styles.insightBlockTitle}>
              <RotateCcw size={12} /> Before vs After
            </div>
            <div className={styles.baStats}>
              <span className={styles.baStat}>
                {beforeAfter.changedBullets}/{beforeAfter.totalBullets} bullets rewritten
              </span>
              <span className={styles.baStat}>
                {beforeAfter.originalSkillCount} → {beforeAfter.currentSkillCount} skills
              </span>
              <span className={styles.baStat}>
                {beforeAfter.currentSummary !== beforeAfter.originalSummary ? 'Summary tailored' : 'Summary unchanged'}
              </span>
            </div>
            {beforeAfter.currentSummary !== beforeAfter.originalSummary && (
              <>
                <button
                  type="button"
                  className={styles.jdToggle}
                  onClick={() => setBeforeAfterExpanded(prev => !prev)}
                >
                  <Eye size={11} /> {beforeAfterExpanded ? 'Hide' : 'Show'} original summary
                </button>
                {beforeAfterExpanded && (
                  <div style={{ marginTop: '9px' }}>
                    <div className={styles.bulletDiffOriginal}>
                      <div className={styles.diffLabel}>Before</div>
                      {beforeAfter.originalSummary || '(empty)'}
                    </div>
                    <div className={styles.bulletDiffImproved} style={{ marginTop: '8px' }}>
                      <div className={styles.diffLabel}>After</div>
                      {beforeAfter.currentSummary || '(empty)'}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {fr && (fr.gaps?.length || fr.seniority_match) ? (
          <div className={styles.insightBlock}>
            <div className={styles.insightBlockTitle}>
              <Target size={12} /> Job Fit Report
            </div>
            <div className={styles.fitBadges}>
              {fr.seniority_match && (
                <span
                  className={styles.fitBadge}
                  style={{
                    background: fr.seniority_match === 'at' ? 'rgba(16, 185, 129, 0.1)' : fr.seniority_match === 'above' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                    color: fr.seniority_match === 'at' ? 'var(--success)' : fr.seniority_match === 'above' ? 'var(--secondary-hover)' : 'var(--danger)',
                    borderColor: fr.seniority_match === 'at' ? 'rgba(16, 185, 129, 0.35)' : fr.seniority_match === 'above' ? 'rgba(6, 182, 212, 0.35)' : 'rgba(239, 68, 68, 0.35)'
                  }}
                >
                  Seniority: {fr.seniority_match === 'at' ? 'Match' : fr.seniority_match === 'above' ? 'Above role' : 'Below role'}
                </span>
              )}
              {typeof fr.domain_overlap === 'number' && (
                <span className={styles.fitBadge} style={{ background: 'rgba(99, 102, 241, 0.08)', color: 'var(--primary)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                  <Circle size={9} style={{ marginRight: '4px' }} /> Domain overlap: {Math.round(fr.domain_overlap)}%
                </span>
              )}
            </div>
            {(fr.gaps || []).map((g, i) => (
              <div key={i} className={styles.gapCard}>
                <div className={styles.gapTitle}>
                  <AlertTriangle size={11} /> Gap {i + 1}
                </div>
                <div className={styles.gapText}>{g.gap}</div>
                {g.cover_letter_tip && (
                  <div className={styles.gapTip}>
                    <Sparkles size={11} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Cover letter tip:</strong> {g.cover_letter_tip}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </>
    );
  };

  return (
    <aside className={styles.dash}>
      {modalSkill && (
        <CategoryPickerModal
          skillName={modalSkill}
          availableCategories={availableCategories}
          onSelect={handleSelectCategory}
          onClose={() => setModalSkill(null)}
        />
      )}

      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.brandIcon}>
            <Brain size={18} />
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>ATS Optimizer</span>
            <span className={styles.brandSub}>Resume ↔ Job Match Intelligence</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          {onExportReport && report && (
            <button onClick={onExportReport} className={styles.iconBtn} title="Export optimization report (Markdown)">
              <Download size={14} />
            </button>
          )}
          <button onClick={onRefreshScore} className={styles.iconBtn} title="Recalculate ATS Score (uses 1 AI call)">
            <RefreshCw size={14} className={isRefreshing ? styles.spin : ''} />
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {!report ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Brain size={26} color="var(--primary)" />
            </div>
            <div className={styles.emptyTitle}>No ATS Analysis Available</div>
            <div className={styles.emptyDesc}>
              Paste a target Job Description and click <strong style={{ color: 'var(--primary)' }}>"Analyze &amp; Tailor"</strong> on the AI Tailoring tab to generate match scores, keyword breakdown and deep insights.
            </div>
          </div>
        ) : (
          <>
            {renderHero()}

            <div className={styles.card}>
              <SectionHeader
                icon={<Lightbulb size={13} />}
                title="Keywords"
                badge={{
                  text: `${(report?.all_matched?.length ?? 0)}/${(report?.all_matched?.length ?? 0) + (report?.all_missing?.length ?? 0)}`,
                  color: 'var(--success)'
                }}
                open={openSections.keywords}
                onToggle={() => toggleSection('keywords')}
              />
              {openSections.keywords && <div className={styles.sectionBody}>{renderKeywordsBody()}</div>}
            </div>

            {(visibleWeakBullets.length > 0 || openSections.fixes) && (
              <div className={styles.card}>
                <SectionHeader
                  icon={<FileText size={13} />}
                  title="Bullet Fixes"
                  badge={visibleWeakBullets.length > 0 ? { text: `${visibleWeakBullets.length}`, color: 'var(--warning)' } : null}
                  open={openSections.fixes}
                  onToggle={() => toggleSection('fixes')}
                />
                {openSections.fixes && <div className={styles.sectionBody}>{renderFixesBody()}</div>}
              </div>
            )}

            {checklist.length > 0 && (
              <div className={styles.card}>
                <SectionHeader
                  icon={<ListChecks size={13} />}
                  title="Readiness"
                  badge={{
                    text: `${passedChecks}/${checklist.length}`,
                    color: failedChecks > 0 ? 'var(--warning)' : 'var(--success)'
                  }}
                  open={openSections.readiness}
                  onToggle={() => toggleSection('readiness')}
                />
                {openSections.readiness && <div className={styles.sectionBody}>{renderReadinessBody()}</div>}
              </div>
            )}

            {visibleSuggestions.length > 0 && (
              <div className={styles.card}>
                <div className={styles.sectionTitle} style={{ marginBottom: '10px' }}>
                  <span className={styles.titleLead}><Sparkles size={13} /> Quick Tips</span>
                </div>
                {visibleSuggestions.map((sug) => (
                  <div key={sug} className={styles.suggestionItem}>
                    <span className={styles.suggestionText}>• {sug}</span>
                    {onDismiss && (
                      <button
                        type="button"
                        className={styles.tagActionBtn}
                        title="Dismiss this tip"
                        onClick={() => onDismiss(`sug:${(report?.suggestions || []).indexOf(sug)}`)}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className={styles.card}>
              <SectionHeader
                icon={<Eye size={13} />}
                title="Deep Insights"
                badge={deepAnalysis && (deepAnalysis.section_scores?.length || deepAnalysis.recommended_keywords?.length) ? { text: 'AI', color: 'var(--primary)' } : null}
                open={openSections.insights}
                onToggle={() => toggleSection('insights')}
              />
              {openSections.insights && <div className={styles.sectionBody}>{renderInsightsBody()}</div>}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
