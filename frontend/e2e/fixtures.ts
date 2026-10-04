// Canned backend payloads for the tailor → edit → print smoke test.
// Shapes mirror what EditorNew consumes (see initializeVersionFields):
// POST /resume/tailor -> { success: true, data: ResumeVersion }.

export const SMOKE_USER = {
  id: 'smoke-user-1',
  email: 'smoke@example.com',
  full_name: 'Smoke Tester',
  two_factor_enabled: false,
  email_verified: true,
  is_active: true,
};

export const SMOKE_MASTER_PROFILE = {
  success: true,
  data: {
    personal_info: {
      id: 'pi-1',
      full_name: 'Smoke Tester',
      title: 'Software Engineer',
      email: 'smoke@example.com',
      phone: '',
      location: 'Berlin',
      summary: 'Pre-tailor summary.',
    },
    work_experiences: [],
    projects: [],
    skills: [{ name: 'Python', category: 'Languages' }],
    educations: [],
    certifications: [],
  },
};

export const SMOKE_TAILORED_VERSION = {
  id: 'smoke-version-1',
  template: 'pixel_perfect_pdf',
  target_company: 'Smoke Corp',
  target_role: 'Smoke Engineer',
  tailored_summary: 'Smoke tailored summary for Playwright.',
  application: null,
  tailored_details: {
    target_language: 'en',
    personal_info: { title: 'Smoke Engineer', location: 'Berlin' },
    experiences: [],
    skills: [{ name: 'Python', category: 'Languages' }],
    projects: [],
    educations: [],
    original_profile: {
      personal_info: {
        id: 'pi-1',
        full_name: 'Smoke Tester',
        title: 'Software Engineer',
        email: 'smoke@example.com',
        phone: '',
        location: 'Berlin',
      },
      work_experiences: [],
      skills: [{ name: 'Python', category: 'Languages' }],
      projects: [],
      educations: [],
    },
  },
};

export const SMOKE_TAILOR_RESPONSE = {
  success: true,
  data: SMOKE_TAILORED_VERSION,
};
