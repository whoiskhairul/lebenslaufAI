import React, { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { Badge, EmptyState, ListSkeleton, PaginationBar, SearchInput, Select, Td, Th } from '../components/AdminUi';
import { TEMPLATE_LABELS, fmtDate } from '../constants';
import { usePaginatedFetch } from '../hooks/usePaginatedFetch';
import styles from '../AdminPanel.module.css';
import { AdminResume } from '../types';

interface ResumesTabProps {
  onViewCv: (id: string) => void;
}

export const ResumesTab: React.FC<ResumesTabProps> = ({ onViewCv }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [template, setTemplate] = useState('');
  const [ordering, setOrdering] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const params: Record<string, string> = { page: String(page) };
  if (debouncedSearch) params.search = debouncedSearch;
  if (template) params.template = template;
  if (ordering) params.ordering = ordering;

  useEffect(() => { setPage(1); }, [template, ordering]);

  const { rows, pagination, loading } = usePaginatedFetch<AdminResume>('/admin/resumes', params);

  return (
    <div className="space-y-3">
      <div className={styles.filterRow}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by title, company or owner…" />
        <Select
          value={template}
          onChange={(v) => setTemplate(v)}
          options={[['', 'All templates'], ...Object.entries(TEMPLATE_LABELS) as [string, string][]]}
        />
        <Select
          value={ordering}
          onChange={(v) => setOrdering(v)}
          options={[['', 'Newest first'], ['-ats', 'Highest ATS'], ['ats', 'Lowest ATS']]}
        />
      </div>

      <div className={styles.tableWrap}>
        <table className={`w-full md:min-w-[720px] ${styles.responsiveTable}`}>
          <thead><tr className="border-b border-cardline">
            <Th>Title</Th><Th>Owner</Th><Th>Target</Th><Th>Template</Th><Th>ATS</Th><Th>Created</Th><Th />
          </tr></thead>
          {loading && <ListSkeleton cols={7} />}
          {!loading && rows.length === 0 && (
            <tbody><tr><Td className="!text-muted"><EmptyState message="No CVs generated yet." /></Td></tr></tbody>
          )}
          {!loading && rows.length > 0 && (
            <tbody className="divide-y divide-cardline">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-mutedlight/50 cursor-pointer"
                  onClick={() => onViewCv(r.id)}
                >
                  <Td><span className="font-medium">{r.title || 'Untitled'}</span></Td>
                  <Td label="Owner"><span className="text-xs text-muted">{r.user_email}</span></Td>
                  <Td label="Target">
                    <span className="block text-xs text-foreground font-medium">{r.target_company}</span>
                    <span className="block text-xs text-muted">{r.target_role}</span>
                  </Td>
                  <Td label="Template"><Badge>{TEMPLATE_LABELS[r.template] || r.template}</Badge></Td>
                  <Td label="ATS">
                    <Badge tone={r.ats_score >= 70 ? 'text-success bg-success/10' : r.ats_score >= 40 ? 'text-warning bg-warning/10' : 'text-danger bg-danger/10'}>
                      {r.ats_score}
                    </Badge>
                  </Td>
                  <Td label="Created"><span className="text-xs text-muted">{fmtDate(r.created_at)}</span></Td>
                  <Td>
                    <button
                      className={`${styles.viewBtn} inline-flex items-center gap-1`}
                      onClick={(e) => { e.stopPropagation(); onViewCv(r.id); }}
                    >
                      <Eye size={13} /> View
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
        {pagination && <PaginationBar pagination={pagination} onPage={(p) => setPage(p)} />}
      </div>
    </div>
  );
};
