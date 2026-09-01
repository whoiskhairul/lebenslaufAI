import { DeepAnalysis } from '../../../views/editor/types/editor.types';

export interface ChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  weight: 1 | 2;
}

const ACTION_VERBS = [
  'led', 'built', 'designed', 'developed', 'implemented', 'engineered', 'created', 'launched',
  'optimized', 'improved', 'reduced', 'increased', 'automated', 'migrated', 'architected',
  'delivered', 'managed', 'owned', 'drove', 'scaled', 'refactored', 'integrated', 'deployed',
  'mentored', 'coordinated', 'established', 'introduced', 'streamlined', 'accelerated', 'analyzed',
  'entwickelt', 'erstellt', 'geleitet', 'umgesetzt', 'optimiert', 'gestaltet', 'aufgebaut', 'designt',
];

const FIRST_PERSON = /\b(i|me|my|mine|ich|mein|meine)\b/i;

const hasNumber = (text: string): boolean => /\d/.test(text);

export function computeReadinessChecklist(data: {
  personalInfo: { full_name?: string; email?: string; phone?: string; location?: string; linkedin?: string; github?: string; website?: string };
  summary: string;
  experiences: Array<{ id: string; company?: string; position?: string; start_date?: string; end_date?: string; bullets: string[] }>;
  projects: Array<{ id: string; bullets?: string[] }>;
  skills: Array<{ id?: string; name: string }>;
  educations: Array<{ id: string }>;
  sections: Array<{ id: string; type: string }>;
}): ChecklistItem[] {
  const { personalInfo, summary, experiences, projects, skills, educations } = data;
  const items: ChecklistItem[] = [];

  const contactGaps: string[] = [];
  if (!personalInfo.email) contactGaps.push('email');
  if (!personalInfo.phone) contactGaps.push('phone');
  if (!personalInfo.location) contactGaps.push('location');
  items.push({
    id: 'contact-info',
    label: 'Complete contact details',
    passed: contactGaps.length === 0,
    detail: contactGaps.length === 0 ? 'Email, phone and location are present.' : `Missing: ${contactGaps.join(', ')}.`,
    weight: 2,
  });

  const summaryWords = summary.trim().split(/\s+/).filter(Boolean).length;
  items.push({
    id: 'summary-length',
    label: 'Professional summary (30-90 words)',
    passed: summaryWords >= 30 && summaryWords <= 90,
    detail: summaryWords === 0 ? 'No summary written yet.' : `Current length: ${summaryWords} words.`,
    weight: 2,
  });

  const bulletless = experiences.filter(e => (e.bullets || []).filter(b => b.trim()).length < 3);
  items.push({
    id: 'bullets-per-role',
    label: '3+ bullet points per role',
    passed: experiences.length > 0 && bulletless.length === 0,
    detail: bulletless.length === 0
      ? 'All roles have sufficient bullets.'
      : `${bulletless.length} role(s) with fewer than 3 bullets.`,
    weight: 2,
  });

  const allBullets = [
    ...experiences.flatMap(e => e.bullets || []),
    ...projects.flatMap(p => p.bullets || []),
  ].filter(b => b.trim());
  const quantified = allBullets.filter(hasNumber).length;
  const quantifiedRatio = allBullets.length > 0 ? quantified / allBullets.length : 0;
  items.push({
    id: 'quantified-results',
    label: '30%+ bullets with numbers/metrics',
    passed: allBullets.length > 0 && quantifiedRatio >= 0.3,
    detail: allBullets.length === 0
      ? 'No bullet points found.'
      : `${quantified}/${allBullets.length} bullets contain measurable results.`,
    weight: 2,
  });

  const weakVerbBullets = allBullets.filter(
    b => !ACTION_VERBS.some(v => b.toLowerCase().trimStart().startsWith(v))
  );
  items.push({
    id: 'action-verbs',
    label: 'Bullets start with action verbs',
    passed: allBullets.length > 0 && weakVerbBullets.length === 0,
    detail: weakVerbBullets.length === 0
      ? 'Every bullet starts with a strong action verb.'
      : `${weakVerbBullets.length} bullet(s) start weak (e.g. "Responsible for...").`,
    weight: 1,
  });

  const firstPersonHits = allBullets.filter(b => FIRST_PERSON.test(b)).length;
  items.push({
    id: 'no-first-person',
    label: 'No first-person pronouns',
    passed: firstPersonHits === 0,
    detail: firstPersonHits === 0
      ? 'Resume uses impersonal, professional phrasing.'
      : `${firstPersonHits} bullet(s) use "I/me/my" - remove for ATS-safe style.`,
    weight: 1,
  });

  const missingDates = experiences.filter(e => !e.start_date).length;
  items.push({
    id: 'dates-present',
    label: 'Employment dates on all roles',
    passed: experiences.length > 0 && missingDates === 0,
    detail: missingDates === 0
      ? 'All roles include start dates.'
      : `${missingDates} role(s) missing start dates.`,
    weight: 2,
  });

  items.push({
    id: 'skills-present',
    label: 'Skills section populated',
    passed: skills.length >= 5,
    detail: skills.length === 0 ? 'No skills listed.' : `${skills.length} skills listed.`,
    weight: 1,
  });

  items.push({
    id: 'education-present',
    label: 'Education section present',
    passed: educations.length > 0,
    detail: educations.length > 0 ? 'Education entries found.' : 'No education entries.',
    weight: 1,
  });

  const hasLinks = Boolean(personalInfo.linkedin || personalInfo.github || personalInfo.website);
  items.push({
    id: 'profile-links',
    label: 'Professional links (LinkedIn/GitHub)',
    passed: hasLinks,
    detail: hasLinks ? 'At least one professional link present.' : 'Adds credibility for recruiters.',
    weight: 1,
  });

  return items;
}

export function buildOptimizationMarkdown(opts: {
  targetRole: string;
  targetCompany: string;
  report: { score: number; all_matched: Array<{ name: string }>; all_missing: Array<{ name: string }> } | null;
  coverage: { matched: number; total: number; percent: number } | null;
  checklist: ChecklistItem[];
  deep?: DeepAnalysis | null;
}): string {
  const lines: string[] = [];
  const now = new Date().toLocaleString();

  lines.push(`# ATS Optimization Report`);
  lines.push(`**Target:** ${opts.targetRole || 'N/A'}${opts.targetCompany ? ` @ ${opts.targetCompany}` : ''}`);
  lines.push(`**Generated:** ${now}`);
  lines.push('');

  if (opts.report) {
    lines.push(`## Overall Score: ${opts.report.score}/100`);
    lines.push('');
  }

  if (opts.coverage) {
    lines.push(`## Keyword Coverage`);
    lines.push(`Matched **${opts.coverage.matched}/${opts.coverage.total}** job keywords (${opts.coverage.percent}%).`);
    lines.push('');
    lines.push(`### Matched`);
    opts.report?.all_matched.forEach(k => lines.push(`- ✅ ${k.name}`));
    lines.push('');
    lines.push(`### Missing`);
    opts.report?.all_missing.forEach(k => lines.push(`- ❌ ${k.name}`));
    lines.push('');
  }

  lines.push(`## Readiness Checklist`);
  opts.checklist.forEach(c => lines.push(`- ${c.passed ? '✅' : '❌'} ${c.label} — ${c.detail}`));
  lines.push('');

  const deep = opts.deep;
  if (deep?.section_scores?.length) {
    lines.push(`## Section Scores`);
    deep.section_scores.forEach(s => lines.push(`- **${s.section}**: ${s.score}/100${s.feedback ? ` — ${s.feedback}` : ''}`));
    lines.push('');
  }

  if (deep?.recommended_keywords?.length) {
    lines.push(`## Recommended Keywords (domain suggestions)`);
    deep.recommended_keywords.forEach(k => lines.push(`- 💡 **${k.name}** (${k.category}) — ${k.reason || ''}`));
    lines.push('');
  }

  if (deep?.recruiter_impression?.first_impression) {
    lines.push(`## Recruiter First Impression`);
    lines.push(deep.recruiter_impression.first_impression);
    (deep.recruiter_impression.strengths || []).forEach(s => lines.push(`- ✅ ${s}`));
    (deep.recruiter_impression.concerns || []).forEach(s => lines.push(`- ⚠️ ${s}`));
    if (deep.recruiter_impression.verdict) lines.push(`> ${deep.recruiter_impression.verdict}`);
    lines.push('');
  }

  if (deep?.fit_report) {
    lines.push(`## Job Fit Report`);
    lines.push(`- **Seniority match:** ${deep.fit_report.seniority_match || 'N/A'}`);
    if (typeof deep.fit_report.domain_overlap === 'number') {
      lines.push(`- **Domain overlap:** ${deep.fit_report.domain_overlap}%`);
    }
    (deep.fit_report.gaps || []).forEach(g => {
      lines.push(`- **Gap:** ${g.gap}`);
      if (g.cover_letter_tip) lines.push(`  - Cover letter tip: ${g.cover_letter_tip}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
