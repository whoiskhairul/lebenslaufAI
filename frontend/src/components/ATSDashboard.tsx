import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Brain, Sparkles, Plus, RefreshCw, CheckCircle2, XCircle, X
} from 'lucide-react';
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

interface ATSDashboardProps {
  report: ATSReport | null;
  onRefreshScore: () => void;
  onInjectSkill: (skillName: string, category: string) => void;
  onRemoveSkill?: (skillName: string) => void;
  existingCategories?: string[];
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

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '20px',
          width: '100%',
          maxWidth: '380px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8' }}>
            Choose Skill Category
          </h4>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
          Select category to add <strong>"{skillName}"</strong> to your CV:
        </div>

        <input
          type="text"
          placeholder="Filter or type custom category..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            background: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '6px',
            padding: '8px 12px',
            color: '#f8fafc',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
          {filteredCategories.map((cat, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelect(cat)}
                style={{
                  textAlign: 'left',
                  background: isSelected ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid #334155',
                  color: isSelected ? '#38bdf8' : '#f8fafc',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>📁 {cat}</span>
                {isSelected && <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>Press Enter</span>}
              </button>
            );
          })}

          {hasCustomOption && (
            <button
              type="button"
              onClick={() => onSelect(filterText.trim().toLowerCase())}
              style={{
                textAlign: 'left',
                background: selectedIndex === filteredCategories.length ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                border: selectedIndex === filteredCategories.length ? '1px solid #38bdf8' : '1px dashed #38bdf8',
                color: '#38bdf8',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              + Create "{filterText.trim()}"
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export const ATSDashboard: React.FC<ATSDashboardProps> = ({
  report,
  onRefreshScore,
  onInjectSkill,
  onRemoveSkill,
  existingCategories = []
}) => {
  const [keywordFilter, setKeywordFilter] = useState<'all' | 'matched' | 'missing'>('all');
  const [modalSkill, setModalSkill] = useState<string | null>(null);

  const score = report?.score ?? 0;

  const defaultCategories = ['technical', 'frameworks', 'tools', 'databases', 'cloud', 'soft_skills', 'languages'];
  const userCats = (existingCategories || []).map(c => c.toLowerCase().trim()).filter(Boolean);
  const availableCategories = Array.from(new Set([...userCats, ...defaultCategories]));

  const getScoreTheme = (s: number) => {
    if (s >= 80) return { color: '#34d399', label: 'ATS Ready', desc: 'High match probability with candidate tracking systems.' };
    if (s >= 60) return { color: '#f59e0b', label: 'Good Match', desc: 'Adding missing keywords will boost interview callbacks.' };
    return { color: '#f87171', label: 'Needs Optimization', desc: 'Missing key technical skills and structured section formatting required by JD.' };
  };

  const scoreTheme = getScoreTheme(score);

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const handleSelectCategory = (category: string) => {
    if (modalSkill) {
      onInjectSkill(modalSkill, category);
      setModalSkill(null);
    }
  };

  return (
    <aside className={styles.sidebar}>
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
          <Brain size={22} color="#38bdf8" />
          <span>ATS Optimizer</span>
        </div>
        <div className={styles.headerActions}>
          <button onClick={onRefreshScore} className={styles.iconBtn} title="Recalculate ATS Score">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {!report ? (
          <div className={styles.proposalCard} style={{ textAlign: 'center', padding: '36px 16px' }}>
            <Brain size={36} color="#38bdf8" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
              No ATS Analysis Available
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '8px', lineHeight: '1.5' }}>
              Paste a target Job Description and click <strong style={{ color: '#38bdf8' }}>"Analyze & Tailor"</strong> on the AI Tailoring tab to generate real-time ATS match scores and keyword breakdown.
            </div>
          </div>
        ) : (
          <>
            <div className={styles.scoreGaugeCard}>
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
                    {score}
                  </span>
                  <span className={styles.scoreLabel}>Score</span>
                </div>
              </div>
              <div className={styles.scoreDetails}>
                <div className={styles.scoreStatusTitle} style={{ color: scoreTheme.color }}>
                  {scoreTheme.label}
                </div>
                <div className={styles.scoreStatusDesc}>{scoreTheme.desc}</div>
              </div>
            </div>

            <div className={styles.breakdownCard}>
              <div className={styles.sectionTitle}>Score Breakdown</div>
              {[
                { name: 'Keyword Coverage', val: report?.breakdown?.keywords ?? 0, weight: '45%' },
                { name: 'Section Structure', val: report?.breakdown?.structure ?? 0, weight: '25%' },
                { name: 'Bullet Quality & Metrics', val: report?.breakdown?.bullets ?? 0, weight: '30%' }
              ].map((item, idx) => (
                <div key={idx} className={styles.barRow}>
                  <div className={styles.barMeta}>
                    <span className={styles.barName}>{item.name} ({item.weight})</span>
                    <span className={styles.barValue} style={{ color: item.val >= 75 ? '#34d399' : item.val >= 50 ? '#f59e0b' : '#f87171' }}>
                      {Math.round(item.val)}%
                    </span>
                  </div>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{
                        width: `${Math.min(100, Math.max(0, item.val))}%`,
                        backgroundColor: item.val >= 75 ? '#34d399' : item.val >= 50 ? '#f59e0b' : '#f87171'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.tagCloudCard}>
              <div className={styles.sectionTitle}>
                <span>Job Keywords Analysis</span>
              </div>

              <div className={styles.tagFilterRow}>
                <button
                  className={`${styles.tagFilterBtn} ${keywordFilter === 'all' ? styles.tagFilterBtnActive : ''}`}
                  onClick={() => setKeywordFilter('all')}
                >
                  All ({(report?.all_matched?.length ?? 0) + (report?.all_missing?.length ?? 0)})
                </button>
                <button
                  className={`${styles.tagFilterBtn} ${keywordFilter === 'matched' ? styles.tagFilterBtnActive : ''}`}
                  onClick={() => setKeywordFilter('matched')}
                >
                  Matched ({report?.all_matched?.length ?? 0})
                </button>
                <button
                  className={`${styles.tagFilterBtn} ${keywordFilter === 'missing' ? styles.tagFilterBtnActive : ''}`}
                  onClick={() => setKeywordFilter('missing')}
                >
                  Missing ({report?.all_missing?.length ?? 0})
                </button>
              </div>

              <div className={styles.tagsContainer}>
                {(keywordFilter === 'all' || keywordFilter === 'matched') &&
                  report?.all_matched?.map((k, i) => (
                    <span key={`m-${i}`} className={`${styles.tagPill} ${styles.tagMatched}`}>
                      <CheckCircle2 size={12} />
                      {k.name}
                      {onRemoveSkill && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveSkill(k.name);
                          }}
                          className={styles.tagActionBtn}
                          style={{ marginLeft: '4px', opacity: 0.8 }}
                          title={`Remove '${k.name}' from CV`}
                        >
                          <X size={12} />
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
                      <XCircle size={12} />
                      <span>{k.name}</span>
                      <span className={styles.tagActionBtn} style={{ marginLeft: '2px' }}>
                        <Plus size={12} />
                      </span>
                    </span>
                  ))}
              </div>
            </div>

            {report?.suggestions && report.suggestions.length > 0 && (
              <div className={styles.tagCloudCard}>
                <div className={styles.sectionTitle} style={{ color: '#f59e0b' }}>
                  <Sparkles size={14} /> Key Optimization Insights
                </div>
                {report.suggestions.map((sug, i) => (
                  <div key={i} className={styles.suggestionItem} style={{ marginBottom: '8px', lineHeight: '1.4' }}>
                    • {sug}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
