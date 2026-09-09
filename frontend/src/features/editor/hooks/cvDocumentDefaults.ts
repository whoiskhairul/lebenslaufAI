import { CvSection } from '../state/cvDocumentStore';

export const DEFAULT_SECTIONS: CvSection[] = [
  { id: 'summary', name: 'Professional Summary', visible: true, type: 'summary' },
  { id: 'experience', name: 'Work Experience', visible: true, type: 'experience' },
  { id: 'projects', name: 'Projects', visible: true, type: 'projects' },
  { id: 'education', name: 'Education', visible: true, type: 'education' },
  { id: 'skills', name: 'Skills', visible: true, type: 'skills' }
];
