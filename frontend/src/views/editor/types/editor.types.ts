export interface ResumeVersion {
  id: string;
  title: string;
  target_company: string;
  target_role: string;
  ats_score: number;
  tailored_summary: string;
  tailored_details: {
    experiences: Array<{ id: string; bullets: string[] }>;
    skills?: Array<{ id?: string; name: string; category: string; level?: string }>;
    projects?: Array<{ id?: string; title: string; role?: string; technologies?: string[]; bullets?: string[]; link?: string; date?: string }>;
    ats_report: {
      score: number;
      matched_keywords: string[];
      missing_keywords: string[];
      suggestions: string[];
    };
    original_profile: {
      personal_info: {
        full_name: string;
        title: string;
        email: string;
        phone: string;
        location: string;
        summary: string;
        links: Array<{ label: string; url: string }>;
        date_of_birth?: string;
        nationality?: string;
        linkedin?: string;
        github?: string;
        website?: string;
        image_url?: string;
      };
      work_experiences: Array<{
        id: string;
        company: string;
        position: string;
        location?: string;
        start_date?: string;
        end_date?: string;
        bullets: string[];
      }>;
      projects: Array<{
        id: string;
        title: string;
        role?: string;
        technologies: string[];
        bullets: string[];
        link?: string;
        date?: string;
      }>;
      skills: Array<{ id: string; name: string; category: string; level?: string }>;
      educations?: Array<{
        id: string;
        institution: string;
        degree?: string;
        field_of_study?: string;
        location?: string;
        start_date?: string;
        end_date?: string;
        is_current?: boolean;
        bullets?: string[];
      }>;
      certifications?: Array<{
        id: string;
        name: string;
        authority?: string;
        issue_date?: string;
        credential_id?: string;
        credential_url?: string;
      }>;
    };
    customization?: {
      sections?: any[];
      customStyles?: any;
      headerStyles?: any;
    };
  };
  explanations: Array<{
    section: string;
    confidence_score: number;
    evidence_source: string;
    reason: string;
  }>;
  validation_alerts?: Array<{
    severity: string;
    section: string;
    section_label: string;
    value: string;
    message: string;
  }>;
  template: string;
  created_at: string;
  application?: string;
}

export interface EditorProps {
  initialJobParams?: { company?: string; position?: string; desc?: string; application_id?: string; tab?: string };
}

export interface RenderableUnit {
  type: 'header' | 'section-title' | 'summary' | 'experience-item' | 'project-item' | 'education-item' | 'skills-languages' | 'skills-category' | 'custom-content' | 'contacts-static';
  id: string;
  sectionId?: string;
  titleText?: string;
  itemIndex?: number;
  itemData?: any;
  skills?: any[];
  category?: string;
  bullets?: string[];
}
