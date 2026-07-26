import React from 'react';
import { RotateCcw, Clock, X } from 'lucide-react';
import styles from './ATSDashboard.module.css';

export interface Snapshot {
  id: string;
  timestamp: string;
  label: string;
  score: number;
  data: any;
}

interface VersionSnapshotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: Snapshot[];
  onRevert: (snapshot: Snapshot) => void;
}

export const VersionSnapshotDrawer: React.FC<VersionSnapshotDrawerProps> = ({
  isOpen,
  onClose,
  snapshots,
  onRevert
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.proposalCard} style={{ background: '#090d16', border: '1px solid #38bdf8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={styles.proposalTitle} style={{ color: '#f8fafc' }}>
          <Clock size={16} color="#38bdf8" /> Version Snapshots ({snapshots.length})
        </div>
        <button onClick={onClose} className={styles.iconBtn} style={{ padding: '2px 6px' }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
        {snapshots.length === 0 ? (
          <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
            No snapshots recorded yet. Snapshots are created automatically when applying AI structural updates or manual changes.
          </div>
        ) : (
          snapshots.map((snap) => (
            <div
              key={snap.id}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                  {snap.label}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', gap: '8px', marginTop: '2px' }}>
                  <span>{snap.timestamp}</span>
                  <span>•</span>
                  <span style={{ color: snap.score >= 80 ? '#34d399' : '#f59e0b' }}>ATS Score: {snap.score}</span>
                </div>
              </div>
              <button
                onClick={() => onRevert(snap)}
                className={styles.acceptBtn}
                style={{ background: '#3b82f6', fontSize: '0.7rem', padding: '4px 8px' }}
              >
                <RotateCcw size={12} /> Revert
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
