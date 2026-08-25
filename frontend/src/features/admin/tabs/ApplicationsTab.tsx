import React, { useEffect, useState } from 'react';
import { Badge, EmptyState, ListSkeleton, PaginationBar, SearchInput, Select, Td, Th } from '../components/AdminUi';
import { STATUS_COLORS, fmtDate } from '../constants';
import { usePaginatedFetch } from '../hooks/usePaginatedFetch';
import styles from '../AdminPanel.module.css';
import { AdminApplication } from '../types';

export const ApplicationsTab: React.FC = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const params: Record<string, string> = { page: String(page) };
  if (debouncedSearch) params.search = debouncedSearch;
  if (statusFilter) params.status = statusFilter;

  useEffect(() => { setPage(1); }, [statusFilter]);

  const { rows, pagination, loading } = usePaginatedFetch<AdminApplication>('/admin/applications', params);

  return (
    <div className="space-y-3">
      <div className={styles.filterRow}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by company, position or owner…" />
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter(v)}
          options={[
            ['', 'All statuses'], ['wishlist', 'Wishlist'], ['preparing', 'Preparing'],
            ['applied', 'Applied'], ['interview', 'Interview'], ['offer', 'Offer'], ['rejected', 'Rejected'],
          ]}
        />
      </div>

      <div className={styles.tableWrap}>
        <table className={`w-full md:min-w-[720px] ${styles.responsiveTable}`}>
          <thead><tr className="border-b border-cardline">
            <Th>Position</Th><Th>Owner</Th><Th>Status</Th><Th>Location</Th><Th>Tailored CVs</Th><Th>Updated</Th>
          </tr></thead>
          {loading && <ListSkeleton cols={6} />}
          {!loading && rows.length === 0 && (
            <tbody><tr><Td className="!text-muted"><EmptyState message="No applications found." /></Td></tr></tbody>
          )}
          {!loading && rows.length > 0 && (
            <tbody className="divide-y divide-cardline">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-mutedlight/50">
                  <Td>
                    <span className="block font-medium">{a.position}</span>
                    <span className="block text-xs text-muted">{a.company}</span>
                  </Td>
                  <Td label="Owner"><span className="text-xs text-muted">{a.user_email}</span></Td>
                  <Td label="Status"><Badge tone={STATUS_COLORS[a.status]}><span className="capitalize">{a.status}</span></Badge></Td>
                  <Td label="Location"><span className="text-xs text-muted">{a.location || '—'}</span></Td>
                  <Td label="CVs"><Badge tone="text-primary bg-primary/10">{a.resume_count}</Badge></Td>
                  <Td label="Updated"><span className="text-xs text-muted">{fmtDate(a.created_at)}</span></Td>
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
