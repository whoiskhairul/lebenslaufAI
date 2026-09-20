import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../services/api';
import { Printer, X, Loader2 } from 'lucide-react';
import { AdminCvDocument, prepareCvData } from './AdminCvDocument';
import cs from './CvViewerModal.module.css';

interface CvViewerModalProps {
  resumeId: string | null;
  onClose: () => void;
}

export const CvViewerModal: React.FC<CvViewerModalProps> = ({ resumeId, onClose }) => {
  const [cv, setCv] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resumeId) return;
    setLoading(true);
    setError(null);
    setCv(null);
    api.get(`/admin/resumes/${resumeId}`)
      .then((res) => setCv(res.data))
      .catch(() => setError('Failed to load this CV.'))
      .finally(() => setLoading(false));
  }, [resumeId]);

  useEffect(() => {
    if (!resumeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resumeId, onClose]);

  // Scope the print-hiding rules to this modal: CvViewerModal.module.css hides
  // everything on the page via `body * { visibility: hidden }` under @media print,
  // but compiled CSS Modules ship globally, so that rule also blanks the editor
  // canvas unless it is gated on this body class.
  useEffect(() => {
    if (!resumeId) return;
    document.body.classList.add('cv-viewer-print-open');
    return () => document.body.classList.remove('cv-viewer-print-open');
  }, [resumeId]);

  const docData = useMemo(() => (cv ? prepareCvData(cv) : null), [cv]);

  if (!resumeId) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center overflow-hidden"
      onClick={onClose}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: 210mm 297mm !important;
            margin: 0 !important;
          }
          /* Print-hiding trick, scoped to this modal via a literal (unhashed)
             body class + target class. CSS Modules selectors are hashed and
             shipped globally, so an unscoped "body * visibility hidden" rule
             in a module file blanks out the whole app (it broke the editor's
             Print/PDF output this way). */
          body.cv-viewer-print-open * {
            visibility: hidden;
          }
          body.cv-viewer-print-open .cv-print-target,
          body.cv-viewer-print-open .cv-print-target * {
            visibility: visible;
          }
          body.cv-viewer-print-open .cv-print-target {
            position: absolute !important;
            top: 0;
            left: 0;
            width: 100%;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          body.cv-viewer-print-open .cv-print-target > div:first-child {
            display: none !important;
          }
        }
      `}} />
      <div
        className="bg-card border border-cardline rounded-2xl w-full h-full sm:w-auto sm:h-auto sm:max-w-[95vw] sm:max-h-[95vh] flex flex-col overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${cs.chrome} no-print`}>
          <div style={{ minWidth: 0 }}>
            <p className={cs.chromeTitle}>{cv ? cv.title || 'Untitled CV' : 'Loading CV…'}</p>
            <p className={cs.chromeSub}>
              {cv
                ? `${cv.user_full_name || cv.user_email} · ${cv.target_role} @ ${cv.target_company} · ATS ${cv.ats_score}`
                : ''}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              className={cs.chromeBtn}
              onClick={() => window.print()}
              disabled={!cv || !docData}
            >
              <Printer size={14} /> Print / PDF
            </button>
            <button className={cs.chromeBtn} onClick={onClose} aria-label="Close">
              <X size={14} /> Close
            </button>
          </div>
        </div>

        <div className={`${cs.canvas} ${cs.printRoot} cv-print-target`}>
          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted py-16">
              <Loader2 size={16} className="animate-spin" /> Rendering CV…
            </div>
          )}
          {error && (
            <div className="text-sm text-danger text-center py-16">{error}</div>
          )}
          {!loading && !error && docData && (
            <AdminCvDocument key={resumeId} data={docData} />
          )}
        </div>
      </div>
    </div>
  );
};
