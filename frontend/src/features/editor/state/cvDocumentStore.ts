import { create } from 'zustand';
import { DEFAULT_SECTIONS } from '../hooks/cvDocumentDefaults';

export interface CustomStyles {
  fontSize: number;
  headingSize: number;
  lineHeight: number;
  sectionSpacing: number;
  accentColor: string;
  headingSecondaryColor?: string;
  textColor: string;
  alignment: string;
  pageMargin?: number;
  bulletSpacing?: number;
  personalDetailsOffset?: number;
  dateFormat: 'MM/YYYY' | 'MMM YYYY' | 'YYYY';
  pageSize: 'A4';
  fontFamily?: string;
  signatureHeight?: number;
}

export interface CvSection {
  id: string;
  name: string;
  visible: boolean;
  type: 'summary' | 'experience' | 'skills' | 'projects' | 'education' | 'custom';
  bullets?: string[];
  customStyles?: {
    fontSize?: number;
    spacing?: number;
    alignment?: string;
    headingSize?: number;
    headingColor?: string;
    headingSecondaryColor?: string;
    headingWeight?: string;
    headingStyle?: string;
    headingAlignment?: string;
    lineHeight?: number;
    textColor?: string;
    fontStyle?: string;
    fontWeight?: string;
    itemGap?: number;
    bulletSpacing?: number;
  };
  customFormat?: 'bullets' | 'keyvalue' | 'entries' | 'paragraph';
  keyValuePairs?: Array<{ key: string; value: string }>;
  entries?: any[];
  paragraphText?: string;
  originalSnapshot?: any;
  aiSnapshot?: any;
  activeVersion?: 'original' | 'ai';
}

export interface EditablePersonalInfo {
  id?: string;
  full_name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  date_of_birth?: string;
  nationality?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  image_url?: string;
  signature_image?: string;
}

export const DEFAULT_CUSTOM_STYLES: CustomStyles = {
  fontSize: 13,
  headingSize: 1.4,
  lineHeight: 1.4,
  sectionSpacing: 20,
  accentColor: '#0f172a',
  headingSecondaryColor: '#3d7ee6',
  textColor: '#334155',
  alignment: 'left',
  pageMargin: 48,
  bulletSpacing: 4,
  personalDetailsOffset: 16,
  dateFormat: 'MM/YYYY',
  pageSize: 'A4',
  fontFamily: '',
  signatureHeight: 48
};

export const DEFAULT_PERSONAL_INFO: EditablePersonalInfo = {
  full_name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  date_of_birth: '',
  nationality: '',
  linkedin: '',
  github: '',
  website: '',
  image_url: '',
  signature_image: ''
};

/**
 * Document-level editor state (sections, editable content grids and styling),
 * shared by the editor canvas, panels and unit renderers.
 *
 * Every setter mimics React's Dispatch<SetStateAction<T>> contract so call
 * sites can be swapped from useState without touching updater logic
 * (`setSections(prev => ...)` keeps working).
 */
interface CvDocumentState {
  template: string;
  sections: CvSection[];
  customStyles: CustomStyles;
  headerStyles: any;
  editableSummary: string;
  editablePersonalInfo: EditablePersonalInfo;
  editableExperiences: Array<{ id: string; bullets: string[]; company?: string; position?: string; location?: string; start_date?: string; end_date?: string }>;
  editableProjects: Array<{ id: string; bullets: string[]; title?: string; role?: string; technologies?: string[] | string; date?: string; link?: string; github_url?: string; demo_url?: string }>;
  editableEducations: Array<{ id: string; institution: string; degree?: string; field_of_study?: string; start_date?: string; end_date?: string; location?: string; bullets?: string[] }>;
  editableSkills: Array<{ id: string; name: string; category: string }>;
  languagesFirst: boolean;
  languagesTitle: string;
  categoryOrder: string[];

  setTemplate: React.Dispatch<React.SetStateAction<string>>;
  setSections: React.Dispatch<React.SetStateAction<CvSection[]>>;
  setCustomStyles: React.Dispatch<React.SetStateAction<CustomStyles>>;
  setHeaderStyles: React.Dispatch<React.SetStateAction<any>>;
  setEditableSummary: React.Dispatch<React.SetStateAction<string>>;
  setEditablePersonalInfo: React.Dispatch<React.SetStateAction<EditablePersonalInfo>>;
  setEditableExperiences: React.Dispatch<React.SetStateAction<Array<{ id: string; bullets: string[]; company?: string; position?: string; location?: string; start_date?: string; end_date?: string }>>>;
  setEditableProjects: React.Dispatch<React.SetStateAction<Array<{ id: string; bullets: string[]; title?: string; role?: string; technologies?: string[] | string; date?: string; link?: string; github_url?: string; demo_url?: string }>>>;
  setEditableEducations: React.Dispatch<React.SetStateAction<Array<{ id: string; institution: string; degree?: string; field_of_study?: string; start_date?: string; end_date?: string; location?: string; bullets?: string[] }>>>;
  setEditableSkills: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; category: string }>>>;
  setLanguagesFirst: React.Dispatch<React.SetStateAction<boolean>>;
  setLanguagesTitle: React.Dispatch<React.SetStateAction<string>>;
  setCategoryOrder: React.Dispatch<React.SetStateAction<string[]>>;

  resetDocument: () => void;
}

function dispatchSetter<T>(
  set: (fn: (state: CvDocumentState) => Partial<CvDocumentState>) => void,
  key: keyof CvDocumentState
): React.Dispatch<React.SetStateAction<T>> {
  return ((action: React.SetStateAction<T>) => {
    set((state) => {
      const currentValue = state[key] as unknown as T;
      const nextValue = typeof action === 'function' ? (action as (prev: T) => T)(currentValue) : action;
      return { [key]: nextValue } as Partial<CvDocumentState>;
    });
  }) as React.Dispatch<React.SetStateAction<T>>;
}

const defaults = () => ({
  template: 'pixel_perfect_pdf',
  sections: DEFAULT_SECTIONS.map((s) => ({ ...s })),
  customStyles: { ...DEFAULT_CUSTOM_STYLES },
  headerStyles: {},
  editableSummary: '',
  editablePersonalInfo: { ...DEFAULT_PERSONAL_INFO },
  editableExperiences: [],
  editableProjects: [],
  editableEducations: [],
  editableSkills: [],
  languagesFirst: false,
  languagesTitle: '',
  categoryOrder: []
});

export const useCvDocumentStore = create<CvDocumentState>((set) => ({
  ...defaults(),

  setTemplate: dispatchSetter<string>(set, 'template'),
  setSections: dispatchSetter(set, 'sections'),
  setCustomStyles: dispatchSetter(set, 'customStyles'),
  setHeaderStyles: dispatchSetter(set, 'headerStyles'),
  setEditableSummary: dispatchSetter<string>(set, 'editableSummary'),
  setEditablePersonalInfo: dispatchSetter(set, 'editablePersonalInfo'),
  setEditableExperiences: dispatchSetter(set, 'editableExperiences'),
  setEditableProjects: dispatchSetter(set, 'editableProjects'),
  setEditableEducations: dispatchSetter(set, 'editableEducations'),
  setEditableSkills: dispatchSetter(set, 'editableSkills'),
  setLanguagesFirst: dispatchSetter<boolean>(set, 'languagesFirst'),
  setLanguagesTitle: dispatchSetter<string>(set, 'languagesTitle'),
  setCategoryOrder: dispatchSetter<string[]>(set, 'categoryOrder'),

  resetDocument: () => set(defaults())
}));
