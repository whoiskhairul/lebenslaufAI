import os
import re
import json
import requests
from django.conf import settings

class AIService:
    @staticmethod
    def _get_api_key(api_key=None):
        if api_key:
            return api_key
        provider = os.environ.get('ACTIVE_AI_PROVIDER', 'deepseek').lower().strip()
        if provider == 'gemini':
            return os.environ.get('GEMINI_API_KEY', '').strip()
        return os.environ.get('DEEPSEEK_API_KEY', '').strip()

    @staticmethod
    def call_deepseek(system_prompt, user_content, response_format=None, api_key=None, temperature=0.3, timeout=None, max_tokens=None):
        provider = os.environ.get('ACTIVE_AI_PROVIDER', 'deepseek').lower().strip()
        key = AIService._get_api_key(api_key)
        if not key:
            print(f"AI Service Error: API key missing for provider '{provider}'")
            return None

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}"
        }

        if provider == 'gemini':
            model = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
            base_url = os.environ.get('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai/').rstrip('/')
            url = f"{base_url}/chat/completions"
        else:
            model = os.environ.get('DEEPSEEK_MODEL', 'deepseek-chat')
            base_url = os.environ.get('DEEPSEEK_BASE_URL', 'https://api.deepseek.com').rstrip('/')
            if not base_url.endswith('/v1'):
                url = f"{base_url}/v1/chat/completions"
            else:
                url = f"{base_url}/chat/completions"

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "temperature": temperature
        }

        if max_tokens:
            payload["max_tokens"] = max_tokens

        if response_format:
            payload["response_format"] = response_format

        timeout_sec = int(timeout or os.environ.get('DEEPSEEK_TIMEOUT', '60'))

        try:
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=timeout_sec
            )
            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content']
            else:
                print(f"AI API Error ({provider}): {response.status_code} - {response.text}")
                return None
        except requests.exceptions.Timeout:
            print(f"AI API ({provider}) read timed out ({timeout_sec}s). Retrying once with extended timeout...")
            try:
                response = requests.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=timeout_sec + 15
                )
                if response.status_code == 200:
                    result = response.json()
                    return result['choices'][0]['message']['content']
            except Exception as retry_err:
                print(f"AI API ({provider}) retry failed: {retry_err}")
                return None
        except Exception as e:
            print(f"AI HTTP request failed ({provider}): {e}")
            return None

    # ================= SHARED HELPERS (JSON integrity, payload hygiene) =================

    @staticmethod
    def _strip_json_fences(text):
        """Remove markdown code fences (```json ... ```) that models sometimes wrap around JSON."""
        if not text:
            return text
        t = text.strip()
        if t.startswith("```"):
            first_newline = t.find('\n')
            t = t[first_newline + 1:] if first_newline != -1 else t[3:]
            t = t.rstrip()
            if t.endswith("```"):
                t = t[:-3]
        return t.strip()

    @classmethod
    def _parse_json_result(cls, result_text):
        """Parse an AI response as JSON, tolerating markdown fences. Returns None on failure."""
        if not result_text:
            return None
        try:
            return json.loads(cls._strip_json_fences(result_text))
        except ValueError:
            return None

    @classmethod
    def _call_json(cls, system_prompt, user_content, api_key=None, temperature=0.1, timeout=None):
        """
        Deterministic JSON call: low temperature, fence-tolerant parsing,
        and ONE automatic retry demanding raw JSON if the first parse fails.
        Returns parsed dict/list or None.
        """
        result_text = cls.call_deepseek(
            system_prompt, user_content, {"type": "json_object"},
            api_key, temperature=temperature, timeout=timeout
        )
        parsed = cls._parse_json_result(result_text)
        if parsed is not None:
            return parsed

        retry_system = (
            f"{system_prompt}\n\n"
            "STRICT OUTPUT REQUIREMENT: Respond with ONLY a single valid raw JSON object. "
            "No markdown code fences, no explanations, no trailing commas."
        )
        retry_content = (
            f"{user_content}\n\n"
            "IMPORTANT: The previous response was not valid JSON. "
            "Return ONLY a valid raw JSON object matching the requested schema."
        )
        result_text = cls.call_deepseek(
            retry_system, retry_content, {"type": "json_object"},
            api_key, temperature=temperature, timeout=timeout
        )
        return cls._parse_json_result(result_text)

    # Fields that must never be shipped to the AI provider (base64 images etc.)
    _AI_PAYLOAD_DENY_KEYS = {
        'image', 'signature_image', 'image_url', 'signature_image_url',
        'avatar', 'photo', 'logo', 'base64', 'data_uri'
    }

    @classmethod
    def _clean_profile_for_ai(cls, profile_data):
        """
        Deep-copy profile payload safe for LLM consumption:
        strips image/signature/base64 blobs and huge data-URI strings to
        avoid token explosions. Keeps all textual resume content.
        """
        if not isinstance(profile_data, dict):
            return profile_data

        def clean(obj):
            if isinstance(obj, dict):
                return {
                    k: clean(v)
                    for k, v in obj.items()
                    if k not in cls._AI_PAYLOAD_DENY_KEYS
                }
            if isinstance(obj, list):
                return [clean(item) for item in obj]
            if isinstance(obj, str) and len(obj) > 2048:
                # Drop likely base64 / data-URI blobs
                if obj.startswith(('data:', '/9j/', 'iVBOR', 'data:image')):
                    return ''
            return obj

        return clean(profile_data)

    @classmethod
    def parse_job_description(cls, job_text, api_key=None):
        system_prompt = (
            "You are an expert ATS (Applicant Tracking System) parser.\n"
            "Extract details from the job advertisement and return ONLY a JSON object matching this schema:\n"
            "{\n"
            "  \"company\": \"string\",\n"
            "  \"position\": \"string\",\n"
            "  \"primary_hard_skills\": [\"string\"],\n"
            "  \"secondary_soft_skills\": [\"string\"],\n"
            "  \"core_job_duties\": [\"string\"],\n"
            "  \"corporate_culture_tone\": \"startup\" | \"corporate\" | \"professional\" | \"academic\"\n"
            "}\n"
            "Do not return any introductory text, preambles, or markdown."
        )
        
        result = cls._call_json(system_prompt, job_text, api_key, temperature=0.1)
        if result and isinstance(result, dict):
            result['keywords'] = result.get('primary_hard_skills', []) + result.get('secondary_soft_skills', [])
            result['responsibilities'] = result.get('core_job_duties', [])
            result['tone'] = result.get('corporate_culture_tone', 'professional')
            return result

        raise ValueError("AI Service failed to parse job description. Please ensure a valid API key is configured.")

    # Shared JSON schema fragment for the deep ATS analysis blocks.
    # Used by both analyze_ats (recheck) and tailor_resume (single combined call)
    # so every AI-powered insight is produced in ONE request.
    # This is a top-level key; it MUST be the last entry in the JSON schema object.
    DEEP_ANALYSIS_SCHEMA = (
        '"deep_analysis": {\n'
        '   "section_scores": [\n'
        '      {"section": "summary" | "experience" | "projects" | "skills" | "education", "score": 0-100, "feedback": "string (English, one sentence)"}\n'
        '   ],\n'
        '   "weak_bullets": [\n'
        '      {"id": "string (UUID of the work experience or project)", "type": "experience" | "project", "bullet_index": 0, "improved": "string (rewritten bullet with metric/action verb/keyword, same language as the resume)", "reason": "string (English, why the original was weak)"}\n'
        '   ],\n'
        '   "recommended_keywords": [\n'
        '      {"name": "string", "category": "hard_skills" | "tools" | "soft_skills", "reason": "string (English, why this strengthens THIS CV for THIS job domain, even though not explicitly required by the JD)"}\n'
        '   ],\n'
        '   "recruiter_impression": {\n'
        '      "first_impression": "string (English, 2-3 sentences simulating a recruiter 6-second scan of the top third of the resume)",\n'
        '      "strengths": ["string"],\n'
        '      "concerns": ["string"],\n'
        '      "verdict": "string (English, one sentence: would the recruiter shortlist?)"\n'
        '   },\n'
        '   "fit_report": {\n'
        '      "seniority_match": "below" | "at" | "above",\n'
        '      "domain_overlap": 0-100,\n'
        '      "gaps": [\n'
        '         {"gap": "string (missing requirement or experience gap)", "cover_letter_tip": "string (English, how to address this gap in the cover letter)"}\n'
        '      ]\n'
        '   }\n'
        '}\n'
    )

    DEEP_ANALYSIS_INSTRUCTIONS = (
        "DEEP ANALYSIS REQUIREMENTS:\n"
        "- 'section_scores': score each resume section independently (0-100) based on quality, completeness and relevance to the job.\n"
        "- 'weak_bullets': identify the 3-6 WEAKEST bullets (no quantifiable metric, no strong action verb, or missing relevant keyword) from the resume's work experience and project bullets. For each, provide an improved rewrite that stays grounded in the original facts (never invent jobs, metrics, dates or degrees).\n"
        "- 'recommended_keywords': suggest 5-8 domain-relevant skill keywords that are NOT explicitly required in the job description but would make this candidate's CV stronger for this specific role domain (e.g. for a backend engineering role suggest complementary tools/methodologies the candidate plausibly has). Prefer keywords supported by the candidate's actual profile; each must include a short reason.\n"
        "- 'recruiter_impression': simulate a busy technical recruiter's 6-second first scan.\n"
        "- 'fit_report': assess seniority alignment and domain overlap; list concrete gaps with actionable cover-letter tips.\n"
        "- ALL analysis text (feedback, reasons, tips, impressions) MUST be in ENGLISH regardless of resume language. 'improved' bullets keep the resume's language.\n\n"
    )

    @classmethod
    def analyze_ats(cls, profile_data, job_data, api_key=None):
        # Compares active candidate CV details against job description
        profile_text = json.dumps(cls._clean_profile_for_ai(profile_data), default=str)
        job_text = json.dumps(job_data, default=str)

        system_prompt = (
            "You are an objective ATS (Applicant Tracking System) Scoring Algorithm.\n"
            "Compare the Candidate's Active CV Details (including summary, work experience, projects, and skills) against the target Job Description.\n"
            "CRITICAL REQUIREMENT - SEMANTIC MATCHING:\n"
            "- Perform semantic synonym matching (e.g. count 'React.js', 'ReactJS', and 'React' as matching; count 'Amazon Web Services' and 'AWS' as matching).\n"
            "- 'matched_keywords' MUST contain all job requirements that are semantically present in the candidate's active profile.\n"
            "- 'missing_keywords' MUST contain only job requirement keywords that are NOT semantically present in the profile.\n\n"
            "SCORING METRICS (Strict 50/30/20 Weights):\n"
            "Calculate the final 'score' (0-100 scale) as a weighted combination of:\n"
            "1. Keyword Match (50%): Ratio of semantically matched keywords to total required job description keywords.\n"
            "2. Experience Depth (30%): Evaluation of whether the critical matched skills are actively demonstrated in the work experience descriptions/bullets rather than just listed in a static skills block.\n"
            "3. Structural & Formatting Quality (20%): Presence of contact details, professional summary, structured work experiences (with bullets), projects, and general compliance with resume length/layout guidelines.\n\n"
            f"{cls.DEEP_ANALYSIS_INSTRUCTIONS}"
            "Return ONLY a JSON object matching this schema:\n"
            "{\n"
            "  \"score\": 0-100,\n"
            "  \"matched_keywords\": [\"string\"],\n"
            "  \"missing_keywords\": [\"string\"],\n"
            "  \"all_missing\": [\n"
            "     {\"name\": \"string\", \"category\": \"hard_skills\" | \"tools\" | \"soft_skills\"}\n"
            "  ],\n"
            "  \"breakdown\": {\n"
            "     \"keywords\": 0-100,\n"
            "     \"structure\": 0-100,\n"
            "     \"bullets\": 0-100\n"
            "  },\n"
            "  \"suggestions\": [\"string\"],\n"
            f"  {cls.DEEP_ANALYSIS_SCHEMA}"
            "}\n"
            "Do not return markdown codeblocks."
        )
        
        user_content = f"CANDIDATE_ACTIVE_CV:\n{profile_text}\n\nTARGET_JOB_DESCRIPTION:\n{job_text}"
        result = cls._call_json(system_prompt, user_content, api_key, temperature=0.1)
        if result and isinstance(result, dict):
            return result

        raise ValueError("AI Service failed to analyze ATS compatibility. Please check your API key or try again later.")

    @classmethod
    def generate_executive_summary(cls, profile_data, api_key=None):
        profile_text = json.dumps(profile_data, default=str)
        system_prompt = (
            "You are an expert executive resume writer.\n"
            "Write a smart, 3-sentence professional summary grounded STRICTLY in concrete evidence from the provided candidate profile.\n\n"
            "CRITICAL RULES FOR SMART SUMMARY:\n"
            "1. NO GENERIC BUZZWORDS: Never use empty claims like 'highly motivated', 'passionate', 'results-oriented', 'hardworking', or 'proven leader'.\n"
            "2. SENTENCE 1 (Role & Core Tech Stack): State the candidate's exact title and top 3-4 specific technical tools/frameworks (e.g. React, Node.js, PostgreSQL) demonstrated in their experience.\n"
            "3. SENTENCE 2 (Action + Tech + Metric/Outcome): Highlight a specific technical accomplishment using an Action Verb + Tool/Methodology + Quantifiable Impact or measurable output (e.g., 'Engineered automated CI/CD pipelines reducing deployment latency by 35%').\n"
            "4. SENTENCE 3 (Domain Engineering Focus): State candidate's core domain engineering strength (e.g., microservice architecture, frontend performance optimization, or REST API design) grounded in actual master profile projects/roles.\n"
            "5. Concise Length: Keep under 65 words total."
        )
        user_content = f"MASTER_PROFILE:\n{profile_text}\n\nExecutive Summary:"
        res = cls.call_deepseek(system_prompt, user_content, api_key=api_key)
        if res:
            return res.strip().strip('"')
            
        raise ValueError("AI Service failed to generate executive summary. Please check your API key or try again later.")

    @staticmethod
    def _mock_generate_executive_summary(profile_data):
        p_info = profile_data.get('personal_info', {})
        title = p_info.get('title') or "Software Engineer"
        skills = profile_data.get('skills', [])
        skill_names = ", ".join([s.get('name') for s in skills[:3] if s.get('name')]) or "TypeScript, React, Node.js"
        exps = profile_data.get('work_experiences', [])
        projs = profile_data.get('projects', [])
        
        top_exp = exps[0] if exps else {}
        exp_comp = top_exp.get('company') or "production environment"
        exp_pos = top_exp.get('position') or title
        
        return (
            f"Results-driven {title} specializing in {skill_names} across scalable web platforms. "
            f"Engineered high-performance web components and automated data workflows at {exp_comp}, delivering reliable end-to-end system features. "
            f"Focused on clean code architecture, API integration, and continuous deployment across multi-tier software projects."
        )

    @staticmethod
    def _date_sort_key(date_str):
        """
        Parse a date string into a sortable (year, month) tuple for
        reverse-chronological ordering. Handles 'YYYY-MM', 'MM/YYYY',
        'Mon YYYY' and bare 'YYYY'. Unparseable/missing dates sort oldest.
        """
        if not date_str:
            return (0, 0)
        s = str(date_str).strip()
        year_match = re.search(r'(\d{4})', s)
        if not year_match:
            return (0, 0)
        year = int(year_match.group(1))
        month = 0

        month_names = {
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
            'januar': 1, 'februar': 2, 'maerz': 3, 'märz': 3, 'mai': 5,
            'juni': 6, 'juli': 7, 'oktober': 10, 'dezember': 12
        }
        # MM/YYYY or MM-YYYY
        m = re.search(r'\b(\d{1,2})[./-](\d{4})\b', s)
        if m and 1 <= int(m.group(1)) <= 12:
            month = int(m.group(1))
        else:
            # YYYY-MM
            m = re.search(r'\b(\d{4})[-./](\d{1,2})\b', s)
            if m and 1 <= int(m.group(2)) <= 12:
                month = int(m.group(2))
            else:
                s_lower = s.lower()
                for name, num in month_names.items():
                    if name in s_lower:
                        month = num
                        break
        return (year, month)

    @staticmethod
    def prioritize_items(profile_data, job_data):
        keywords = [k.lower() for k in job_data.get('keywords', []) if k]
        primary_skills = [k.lower() for k in job_data.get('primary_hard_skills', []) if k]
        all_target_terms = list(set(keywords + primary_skills))

        skills = profile_data.get('skills', [])
        def skill_relevance(s):
            s_name = (s.get('name') or '').lower()
            if s_name in primary_skills:
                return 3
            if any(term in s_name or s_name in term for term in all_target_terms):
                return 2
            return 0
        sorted_skills = sorted(skills, key=skill_relevance, reverse=True)

        # IMPORTANT: keep experiences/projects in REVERSE-CHRONOLOGICAL order
        # (standard resume convention). Do NOT reorder them by keyword relevance,
        # as that breaks the timeline the recruiter expects to see.
        experiences = profile_data.get('work_experiences', [])
        sorted_experiences = sorted(
            experiences,
            key=lambda e: AIService._date_sort_key(e.get('start_date')),
            reverse=True
        )

        projects = profile_data.get('projects', [])
        sorted_projects = sorted(
            projects,
            key=lambda p: AIService._date_sort_key(p.get('date') or p.get('start_date')),
            reverse=True
        )

        return sorted_skills, sorted_experiences, sorted_projects

    @classmethod
    def tailor_resume(cls, profile_data, job_data, api_key=None, target_language="en", aggressive_mode=False):
        # Normalize language input: accept 'DE', 'German', 'deutsch', 'de', etc.
        target_language = (target_language or 'en').strip().lower()
        profile_data = cls._clean_profile_for_ai(profile_data)
        profile_text = json.dumps(profile_data, default=str)
        job_text = json.dumps(job_data, default=str)

        is_german = target_language in ['de', 'deutsch', 'german']
        lang_instruction = (
            "CRITICAL LANGUAGE MANDATE: TARGET LANGUAGE IS GERMAN (Deutsch).\n"
            "- You MUST translate and write ALL tailored_summary text, ALL experience positions, experience locations, and ALL experience bullet points in GERMAN.\n"
            "- You MUST translate and write ALL project titles, roles, and ALL project bullet points in GERMAN.\n"
            "- You MUST translate education degrees, locations, fields of study, and personal info fields into GERMAN (e.g. 'Computer Science' -> 'Informatik', 'Germany' -> 'Deutschland').\n"
            "- TECHNICAL NAMES RULE: Keep established technical names (programming languages, frameworks, tools, products, standards) EXACTLY as they are - never translate them. 'React', 'Docker', 'Kubernetes', 'PostgreSQL', 'REST API', 'CI/CD', 'Scrum' etc. must remain unchanged in skill names and bullets.\n"
            "- SKILL CATEGORY RULE: skill 'category' values are INTERNAL CANONICAL KEYS (e.g. 'languages', 'tools', 'frameworks', 'technical') and MUST be copied EXACTLY as provided in the MASTER_PROFILE - never translated, never renamed. Spoken languages MUST keep category 'languages' so they stay in the dedicated Languages subsection. Only non-technical skill NAMES may be translated.\n"
            "- Never mix English sentences into the output under any circumstances. Everything returned inside tailored_summary, tailored_experiences, tailored_projects, tailored_educations, tailored_skills, and tailored_personal_info MUST be strictly in German.\n"
            "- For EVERY project in MASTER_PROFILE, you MUST provide a corresponding entry in 'tailored_projects' with its 'id', 'title', 'role', and an array of 'bullets' translated and tailored entirely in German.\n"
            "- The tailored_section_names dictionary keys MUST map to German values: summary -> 'Zusammenfassung', experience -> 'Berufserfahrung', projects -> 'Projekte', education -> 'Ausbildung', skills -> 'Kenntnisse'.\n\n"
            if is_german
            else "Write ALL tailored summary, experience bullets, and project bullets in ENGLISH. Skill 'category' values MUST be copied EXACTLY from the MASTER_PROFILE (internal canonical keys like 'languages', 'tools' - never translated or renamed; spoken languages keep category 'languages').\n\n"
        )

        aggressive_instruction = (
            "CRITICAL ATS MANDATE: AGGRESSIVE ATS OPTIMIZATION IS ENABLED.\n"
            "- Goal: make the candidate's GENUINE experience visible to ATS by naming required technologies where they plausibly apply. This is natural keyword integration, NEVER keyword stuffing.\n"
            "- PLACEMENT PRIORITY:\n"
            "  1. tailored_summary: integrate the 2-3 most critical missing keywords into the existing claims, woven into real statements about the candidate's background.\n"
            "  2. work experience and project bullets: mention a required tool/method ONLY where the described activity plausibly involved it (e.g. 'Built a REST API' may become 'Built a REST API with Django').\n"
            "- INTEGRATION RULES (STRICT):\n"
            "  * Integrate each missing keyword AT MOST ONCE across the entire resume - ATS deduplicates, repetition reads as stuffing.\n"
            "  * At most ONE keyword per bullet, and modify at most ONE THIRD of all bullets.\n"
            "  * The keyword must be grammatically integrated as the tool/method actually used for the described task. NEVER append keyword lists like '(Python, Docker, AWS)', never use tacked-on clauses like 'utilizing X, Y and Z', and never create sentences whose only purpose is naming a tool.\n"
            "  * If a keyword cannot be integrated plausibly into any existing achievement, LEAVE the text unchanged - do not force it in.\n"
            "- PRESERVATION: keep the same number of bullets per experience/project, keep each bullet within ~25% of its original length, and never remove or weaken existing achievements or metrics to make room for keywords.\n"
            "- GROUNDING: you may specify which of the candidate's existing tools/methodologies were used for their existing achievements, but never claim new jobs, employers, dates, degrees, certifications, or invented metrics.\n"
            "- QUALITY BAR: every modified sentence must remain natural, grammatically correct and professional. If a recruiter would raise an eyebrow, rewrite it or revert to the original.\n\n"
            if aggressive_mode
            else "STANDARD PROFILE ALIGNMENT (STRICT):\n"
            "- Do NOT invent/fabricate new unlisted tools, jobs, dates, or degrees.\n"
            "- Rephrase candidate's existing experience to align strictly with job keywords.\n\n"
        )
        
        system_prompt = (
            "You are an expert Resume Writer and ATS Auditor.\n"
            f"{lang_instruction}"
            f"{aggressive_instruction}"
            "Tailor the user's resume summary, experience bullets, and project bullets to match the job description.\n"
            "Simultaneously audit the tailored resume against the job description and calculate an accurate ATS match report.\n"
            "CRITICAL REQUIREMENT - SEMANTIC MATCHING:\n"
            "- Perform semantic synonym matching when checking keywords (e.g. 'React.js' and 'React' are considered matching).\n"
            "- 'matched_keywords' MUST contain all job requirements that are semantically present in the candidate's active profile.\n"
            "- 'missing_keywords' MUST contain only job requirement keywords that are NOT semantically present in the profile.\n\n"
            "SCORING METRICS (Strict 50/30/20 Weights):\n"
            "Calculate the final ats_report 'score' (0-100 scale) as a weighted combination of:\n"
            "1. Keyword Match (50%): Ratio of semantically matched keywords to total required job description keywords.\n"
            "2. Experience Depth (30%): Evaluation of whether the critical matched skills are actively demonstrated in the work experience descriptions/bullets rather than just listed in a static skills block.\n"
            "3. Structural & Formatting Quality (20%): Presence of contact details, professional summary, structured work experiences (with bullets), projects, and general compliance with resume length/layout guidelines.\n\n"
            f"{cls.DEEP_ANALYSIS_INSTRUCTIONS}"
            f"CRITICAL: {'Attribute existing achievements ONLY to tools/methods that plausibly were used, following the AGGRESSIVE ATS integration rules above - never fabricate jobs, employers, dates, degrees, certifications, or metrics.' if aggressive_mode else 'Do NOT invent/fabricate skills, jobs, dates, or degrees.'}\n"
            "Return ONLY a JSON object matching this schema:\n"
            "{\n"
            "  \"tailored_summary\": \"string\",\n"
            "  \"tailored_experiences\": [\n"
            "     {\n"
            "       \"id\": \"string (UUID matches work_experience.id)\",\n"
            "       \"position\": \"string (MUST be in target language)\",\n"
            "       \"location\": \"string (MUST be in target language)\",\n"
            "       \"bullets\": [\"string (MUST be in target language)\"]\n"
            "     }\n"
            "  ],\n"
            "  \"tailored_projects\": [\n"
            "     {\n"
            "       \"id\": \"string (UUID matches project.id)\",\n"
            "       \"title\": \"string (MUST be in target language)\",\n"
            "       \"role\": \"string (MUST be in target language)\",\n"
            "       \"bullets\": [\"string (MUST be in target language)\"]\n"
            "     }\n"
            "  ],\n"
            "  \"tailored_educations\": [\n"
            "     {\n"
            "       \"id\": \"string (UUID matches education.id)\",\n"
            "       \"degree\": \"string (MUST be in target language)\",\n"
            "       \"field_of_study\": \"string (MUST be in target language)\",\n"
            "       \"location\": \"string (MUST be in target language)\"\n"
            "     }\n"
            "  ],\n"
            "  \"tailored_skills\": [\n"
            "     {\n"
            "       \"id\": \"string (UUID matches skill.id)\",\n"
            "       \"name\": \"string (MUST be in target language)\",\n"
            "       \"category\": \"string (MUST be copied EXACTLY from MASTER_PROFILE - internal canonical key like 'languages', 'tools' - NEVER translated)\"\n"
            "     }\n"
            "  ],\n"
            "  \"tailored_personal_info\": {\n"
            "     \"title\": \"string (MUST be in target language)\",\n"
            "     \"location\": \"string (MUST be in target language)\"\n"
            "  },\n"
            "  \"tailored_section_names\": {\n"
            "     \"summary\": \"string\",\n"
            "     \"experience\": \"string\",\n"
            "     \"projects\": \"string\",\n"
            "     \"education\": \"string\",\n"
            "     \"skills\": \"string\"\n"
            "  },\n"
            "  \"ats_report\": {\n"
            "     \"score\": 0-100,\n"
            "     \"matched_keywords\": [\"string\"],\n"
            "     \"missing_keywords\": [\"string\"],\n"
            "     \"all_missing\": [\n"
            "        {\"name\": \"string\", \"category\": \"hard_skills\" | \"tools\" | \"soft_skills\"}\n"
            "     ],\n"
            "     \"breakdown\": {\n"
            "        \"keywords\": 0-100,\n"
            "        \"structure\": 0-100,\n"
            "        \"bullets\": 0-100\n"
            "     },\n"
            "     \"suggestions\": [\"string\"]\n"
            "  },\n"
            "  \"explanations\": [\n"
            "     {\n"
            "       \"section\": \"summary\" | \"experience_id\",\n"
            "       \"confidence_score\": 0-100,\n"
            "       \"evidence_source\": \"string\",\n"
            "       \"reason\": \"string\"\n"
            "     }\n"
            "  ],\n"
            f"  {cls.DEEP_ANALYSIS_SCHEMA}"
            "}\n"
            "Do not return markdown."
        )
        
        user_content = f"MASTER_PROFILE:\n{profile_text}\n\nJOB_DESCRIPTION:\n{job_text}"
        tailor_timeout = int(os.environ.get('DEEPSEEK_TIMEOUT_TAILOR', '120'))
        res = cls._call_json(system_prompt, user_content, api_key, temperature=0.3, timeout=tailor_timeout)
        
        sorted_skills, sorted_experiences, sorted_projects = cls.prioritize_items(profile_data, job_data)
        
        if res and isinstance(res, dict):
            # ---------- COVERAGE-ENFORCED MERGING ----------
            # Every master-profile item MUST appear in the tailored output.
            # AI entries update matching items by id; missing items fall back
            # to the master profile original (never dropped, never reordered).

            def merge_by_id(orig_list, ai_list, str_fields):
                ai_map = {}
                if isinstance(ai_list, list):
                    for item in ai_list:
                        if isinstance(item, dict) and item.get('id') is not None:
                            ai_map[str(item.get('id'))] = item
                merged = []
                for orig in orig_list:
                    if not isinstance(orig, dict) or orig.get('id') is None:
                        continue
                    ai_item = ai_map.pop(str(orig.get('id')), None)
                    if ai_item is None:
                        # AI skipped this item -> keep the master original intact
                        merged.append(dict(orig))
                        continue
                    merged_item = dict(orig)
                    for field in str_fields:
                        val = ai_item.get(field)
                        if isinstance(val, (str, list)) and (val or isinstance(val, str)):
                            merged_item[field] = val
                    merged.append(merged_item)
                return merged

            # Skills: always derived from the master list, AI only refines
            # the name (never adds, never drops, never reorders).
            # NOTE: 'category' is a canonical internal key the frontend relies on
            # (e.g. exact match 'languages' renders the dedicated Languages
            # subsection), so the AI's category output is deliberately ignored.
            ai_skills = res.get('tailored_skills', [])
            merged_skills = []
            if isinstance(ai_skills, list) and ai_skills:
                ai_skill_map = {
                    str(s.get('id')): s for s in ai_skills
                    if isinstance(s, dict) and s.get('id') is not None
                }
            else:
                ai_skill_map = {}
            for s in sorted_skills:
                if not isinstance(s, dict):
                    continue
                ai_s = ai_skill_map.get(str(s.get('id')))
                if ai_s:
                    merged_skills.append({
                        **s,
                        "name": ai_s.get('name', s.get('name'))
                    })
                else:
                    merged_skills.append(s)
            res['tailored_skills'] = merged_skills

            res['tailored_experiences'] = merge_by_id(
                sorted_experiences,
                res.get('tailored_experiences', []),
                ['bullets', 'position', 'location']
            )

            res['tailored_projects'] = merge_by_id(
                sorted_projects,
                res.get('tailored_projects', []),
                ['bullets', 'title', 'role']
            )

            res['tailored_educations'] = merge_by_id(
                profile_data.get('educations', []) or [],
                res.get('tailored_educations', []),
                ['degree', 'field_of_study', 'location']
            )

            # Personal info: only title/location are tailored; never blank out
            ai_pi = res.get('tailored_personal_info', {})
            if isinstance(ai_pi, dict) and ai_pi:
                res['tailored_personal_info'] = {
                    "title": ai_pi.get('title', profile_data.get('personal_info', {}).get('title', '')),
                    "location": ai_pi.get('location', profile_data.get('personal_info', {}).get('location', ''))
                }
            else:
                res['tailored_personal_info'] = {}

            # ---------- EXPLANATIONS SANITIZATION (fix 13) ----------
            valid_ids = set()
            for collection in ('work_experiences', 'projects', 'educations', 'skills'):
                for item in profile_data.get(collection, []) or []:
                    if isinstance(item, dict) and item.get('id') is not None:
                        valid_ids.add(str(item.get('id')))
            sanitized_explanations = []
            for ex in (res.get('explanations') or []):
                if not isinstance(ex, dict):
                    continue
                section = str(ex.get('section', '')).strip()
                if section != 'summary' and section not in valid_ids:
                    continue
                try:
                    confidence = int(float(ex.get('confidence_score', 70)))
                except (TypeError, ValueError):
                    confidence = 70
                sanitized_explanations.append({
                    "section": section,
                    "confidence_score": max(0, min(100, confidence)),
                    "evidence_source": str(ex.get('evidence_source', '')),
                    "reason": str(ex.get('reason', ''))
                })
            res['explanations'] = sanitized_explanations

            # Normalize deep analysis block (defensive defaults for frontend)
            deep = res.get('deep_analysis')
            if not isinstance(deep, dict):
                deep = {}
            deep.setdefault('section_scores', [])
            deep.setdefault('weak_bullets', [])
            deep.setdefault('recommended_keywords', [])
            deep.setdefault('recruiter_impression', {})
            deep.setdefault('fit_report', {})
            res['deep_analysis'] = deep

            return res

        raise ValueError("AI Service failed to tailor resume. Please check your API key or try again later.")

    @classmethod
    def write_cover_letter(cls, profile_data, job_data, tone="professional", length="medium", api_key=None, target_language="en"):
        from datetime import datetime
        # Normalize language input: accept 'DE', 'German', 'deutsch', 'de', etc.
        target_language = (target_language or 'en').strip().lower()
        profile_data = cls._clean_profile_for_ai(profile_data)

        is_german = target_language in ['de', 'deutsch', 'german']
        app_language = 'GERMAN' if is_german else 'ENGLISH'

        if is_german:
            # German convention: "15. März 2025" (never the US format)
            german_months = {
                1: 'Januar', 2: 'Februar', 3: 'März', 4: 'April', 5: 'Mai', 6: 'Juni',
                7: 'Juli', 8: 'August', 9: 'September', 10: 'Oktober', 11: 'November', 12: 'Dezember'
            }
            now = datetime.now()
            today_str = f"{now.day}. {german_months[now.month]} {now.year}"
        else:
            today_str = datetime.now().strftime("%B %d, %Y")
        
        # Extract metadata from job_data
        position = job_data.get('position', '') or 'Not Provided'
        company = job_data.get('company', '') or 'Not Provided'
        job_description = job_data.get('job_description', '') or 'Not Provided'
        company_url = job_data.get('url', '') or 'NOT PROVIDED'
        contact_person = job_data.get('contact_name', '') or 'NOT PROVIDED'
        salary_expectation = job_data.get('salary', '') or 'NOT PROVIDED'
        notes_text = job_data.get('notes', '') or ''
        
        ref_number = 'NOT PROVIDED'
        starting_date = 'NOT PROVIDED'
        relocation = 'NOT APPLICABLE'
        referral = 'NONE'
        motivation = 'NOT PROVIDED'
        
        # Format candidate's resume/profile details nicely for the LLM
        personal_info = profile_data.get('personal_info', {}) or {}
        full_name = personal_info.get('full_name', '') or ''
        email = personal_info.get('email', '') or ''
        phone = personal_info.get('phone', '') or ''
        location = personal_info.get('location', '') or ''
        
        profile_text = json.dumps(profile_data, default=str)
        
        system_prompt = (
            "You are an expert German application writer, senior technology recruiter and hiring manager specializing in software-development roles in Germany.\n\n"
            "Create a highly tailored German or English application cover letter for the position and company provided below.\n\n"
            "CRITICAL: The cover letter must be highly concise, realistic, and direct. Absolutely NO exaggeration, boastful marketing adjectives, or empty hype is allowed. Keep the tone strictly honest, calm, professional, and evidence-based.\n\n"
            "The letter must follow current German Bewerbungsschreiben conventions. It must be a natural, credible and individually written application—not a literal translation, a generic template or exaggerated marketing copy.\n\n"
            "CORE RULES:\n"
            "1. Never invent achievements, metrics, responsibilities, technologies, qualifications, company facts, language levels, employment dates or motivations.\n"
            "2. Use only:\n"
            "   - information supported by the resume,\n"
            "   - information explicitly provided in the additional facts,\n"
            "   - requirements stated in the job advertisement,\n"
            "   - verified company information from an official source.\n"
            "3. If the job description, company name or resume is missing, do not generate a generic letter. Ask for the missing information first.\n"
            "4. If a useful metric, result or motivation is missing, do not invent it. Either omit it or mark it privately in the verification notes as information that could strengthen the letter.\n"
            "5. Match the letter to the advertised role:\n"
            "   - identify the three to five most important requirements;\n"
            "   - select the two or three strongest pieces of evidence from the applicant’s background;\n"
            "   - connect each selected example directly to an employer requirement;\n"
            "   - prioritize relevant evidence over general claims.\n"
            "6. Do not repeat the complete resume in prose. The letter must add context, explain motivation and interpret the most relevant evidence.\n"
            "7. For a software-development position:\n"
            "   - demonstrate technical ability through concrete projects or professional experience;\n"
            "   - explain what the applicant implemented, developed, integrated or led;\n"
            "   - mention technologies only in connection with actual work;\n"
            "   - show problem-solving, ownership or teamwork through a concrete example;\n"
            "   - avoid a long technology list.\n"
            "8. Use a professional, precise and calmly confident tone. The language should be active, concise and evidence-based.\n"
            "9. Avoid:\n"
            "   - “Hiermit bewerbe ich …” or any variation.\n"
            "   - generic praise such as “Ihr innovatives Unternehmen”\n"
            "   - unsupported adjectives such as “excellent,” “outstanding,” “passionate” or “perfect candidate”\n"
            "   - clichés such as “team player” without evidence\n"
            "   - excessive enthusiasm\n"
            "   - desperate or apologetic language\n"
            "   - unnecessary conditional constructions such as “würde” and “könnte”\n"
            "   - a literal translation from English into German\n"
            "   - American-style self-promotion\n"
            "   - keyword stuffing\n"
            "   - invented company-specific motivation\n"
            "10. Use natural German employment terminology if the output is German. Keep established technical names such as Python, Django, PostgreSQL, Redis, WebSockets, REST API, Docker and CI/CD in their normal technical form.\n"
            "11. The final letter must fit on one A4 page:\n"
            "   - approximately 250–350 words;\n"
            "   - never more than 400 words;\n"
            "   - four content paragraphs;\n"
            "   - no paragraph longer than approximately six lines;\n"
            "   - short, readable sentences.\n"
            "12. The fields and notes inside the 'verification_notes' JSON block MUST ALWAYS be written in English, regardless of the language of the cover letter or resume. Do NOT translate verification_notes values into German or any other language.\n\n"
            "REQUIRED STRUCTURE (JSON FORMAT):\n"
            "You must return ONLY a raw JSON object matching the keys listed below. Do not wrap the JSON object in markdown blocks (such as ```json). The output must start with '{' and end with '}'. Do not include any title labels like 'BEWERBUNGSSCHREIBEN' or markdown formatting like bold '**' around names, subjects, or companies.\n\n"
            "JSON structure:\n"
            "{\n"
            "  \"sender_name\": \"Applicant's full name\",\n"
            "  \"sender_address\": \"Applicant's address EXACTLY as provided in the resume (Do NOT invent or mock this; leave empty if not provided)\",\n"
            "  \"sender_phone\": \"Applicant's phone number\",\n"
            "  \"sender_email\": \"Applicant's email address\",\n"
            "  \"recipient_contact\": \"Contact person name and title (e.g., Herr Dr. Müller or Frau Schmidt if known, else 'NOT PROVIDED')\",\n"
            "  \"recipient_company\": \"Target company name (plain text, no bold asterisks '**')\",\n"
            "  \"recipient_department\": \"Department name (e.g., Human Resources or Engineering) if known, else empty\",\n"
            "  \"recipient_address\": \"Company street address, postal code, city\",\n"
            "  \"location\": \"City from which the applicant is applying, taken EXACTLY from the applicant's resume location field. Do NOT invent a location; leave empty if not in the resume\",\n"
            "  \"date\": \"Today's date EXACTLY as provided in the prompt inputs\",\n"
            "  \"subject\": \"Subject line without bold markdown asterisks '**' or beta/title prefixes (e.g., 'Bewerbung als [EXACT POSITION] - [REFERENCE NUMBER]')\",\n"
            "  \"salutation\": \"Formal salutation (e.g., Sehr geehrte Frau Müller, or Sehr geehrte Damen und Herren,)\",\n"
            "  \"body\": \"The 4 content paragraphs separated by double newlines (\\n\\n). Strictly no bold asterisks '**' anywhere in the body!\",\n"
            "  \"closing_salutation\": \"Closing formula (e.g., Mit freundlichen Grüßen or Sincerely)\",\n"
            "  \"candidate_name\": \"Applicant's full name (plain text)\",\n"
            "  \"verification_notes\": {\n"
            "    \"requirements_emphasized\": [\"Requirement 1 (MUST BE IN ENGLISH)\", \"Requirement 2 (MUST BE IN ENGLISH)\"],\n"
            "    \"resume_evidence_used\": [\"Evidence 1 (MUST BE IN ENGLISH)\", \"Evidence 2 (MUST BE IN ENGLISH)\"],\n"
            "    \"placeholders\": [\"Placeholders or missing facts in English (if any) (MUST BE IN ENGLISH)\"],\n"
            "    \"confirmation_needed\": [\"Sentences needing verification in English (if any) (MUST BE IN ENGLISH)\"]\n"
            "  }\n"
            "}\n"
        )
        
        user_content = (
            f"INPUTS\n\n"
            f"Today's date:\n{today_str}\n\n"
            f"Target position:\n{position}\n\n"
            f"Company:\n{company}\n\n"
            f"Job advertisement:\n{job_description}\n\n"
            f"Company website or verified company information:\n{company_url}\n\n"
            f"Contact person:\n{contact_person}\n\n"
            f"Application language:\n{app_language}\n\n"
            f"Job reference number:\n{ref_number}\n\n"
            f"Applicant’s current resume:\n{profile_text}\n\n"
            f"Verified additional information:\n"
            f"- Earliest starting date: {starting_date}\n"
            f"- Salary expectation: {salary_expectation}\n"
            f"- Relocation requirement: {relocation}\n"
            f"- Work authorization information: ONLY IF RELEVANT AND VERIFIED\n"
            f"- Referral or previous contact with the company: {referral}\n"
            f"- Additional motivation for this company: {motivation}\n"
            f"- Additional notes/context from applicant: {notes_text or 'None'}\n"
        )
        
        result_text = cls.call_deepseek(system_prompt, user_content, {"type": "json_object"}, api_key=api_key)
        if result_text:
            today_str_escaped = today_str
            result_text = re.sub(
                r'\[[Dd]ate\]|\[[Cc]urrent\s+[Dd]ate\]|\[[Tt]oday\'s\s+[Dd]ate\]|\[date\]',
                today_str_escaped,
                result_text
            )
            return cls._strip_json_fences(result_text)

        raise ValueError("AI Service failed to generate cover letter. Please check your API key or try again later.")

    # ================= MOCK FALLBACK IMPLEMENTATIONS =================

    @staticmethod
    def _mock_parse_job_description(text):
        company = "Target Company"
        position = "Software Engineer"
        sample_keywords = ["React", "TypeScript", "Node.js", "Django", "PostgreSQL", "Python", "Docker", "AWS", "Kubernetes", "Git"]
        found_keywords = [k for k in sample_keywords if k.lower() in text.lower()]
        
        # Simple regex approximation
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        for line in lines[:5]:
            if "at" in line.lower():
                parts = line.split(" at ")
                if len(parts) > 1:
                    position = parts[0]
                    company = parts[1].split(" ")[0].strip(",.")
            if "hiring" in line.lower() or "looking for" in line.lower():
                company = line.split()[-1].strip(",.")

        hard_skills = [k for k in found_keywords if k in ["React", "TypeScript", "Node.js", "Django", "PostgreSQL", "Python", "Docker", "AWS", "Kubernetes"]]
        soft_skills = ["Collaborative Problem Solving", "Agile Execution", "Communication"]
        duties = [
            "Collaborate with multi-disciplinary teams to release premium digital products.",
            "Build scaleable API architectures and clean frontend components.",
            "Write structured tests to verify application state and integrity."
        ]

        return {
            "company": company,
            "position": position,
            "primary_hard_skills": hard_skills,
            "secondary_soft_skills": soft_skills,
            "core_job_duties": duties,
            "corporate_culture_tone": "startup" if "fast-paced" in text.lower() or "startup" in text.lower() else "professional",
            # backwards compat
            "keywords": found_keywords,
            "responsibilities": duties,
            "tone": "startup" if "fast-paced" in text.lower() or "startup" in text.lower() else "professional"
        }

    @staticmethod
    def _mock_analyze_ats(profile, job):
        if isinstance(job, dict):
            job_keywords = job.get('keywords', ['React', 'TypeScript', 'PostgreSQL'])
        elif isinstance(job, str):
            import re
            found = re.findall(r'\b[A-Za-z0-9+#\.-]{3,}\b', job)
            common_tech = {'react', 'python', 'javascript', 'typescript', 'sql', 'postgresql', 'docker', 'aws', 'node.js', 'html', 'css', 'git', 'django', 'fastapi', 'devops', 'c++', 'java'}
            job_keywords = [w for w in set(found) if w.lower() in common_tech]
            if not job_keywords:
                job_keywords = ['React', 'TypeScript', 'Python', 'SQL']
        else:
            job_keywords = ['React', 'TypeScript', 'PostgreSQL']

        if isinstance(profile, dict):
            skills = profile.get('skills', [])
            profile_skills = []
            if isinstance(skills, list):
                for s in skills:
                    if isinstance(s, dict):
                        profile_skills.append(str(s.get('name', '')).lower())
                    elif isinstance(s, str):
                        profile_skills.append(s.lower())
            profile_str = json.dumps(profile, default=str).lower()
            personal = profile.get('personal_info', {}) or {}
            experiences = profile.get('work_experiences', []) or []
            projects = profile.get('projects', []) or []
            educations = profile.get('educations', []) or []
            summary = profile.get('summary', '') or personal.get('summary', '') or ''
        elif isinstance(profile, str):
            profile_str = profile.lower()
            profile_skills = []
            personal = {}
            experiences = []
            projects = []
            educations = []
            summary = ""
        else:
            profile_str = ""
            profile_skills = []
            personal = {}
            experiences = []
            projects = []
            educations = []
            summary = ""

        # 1. Structural Score (Max 20 points)
        struct_score = 0
        
        # Check contact details (max 5 pts)
        contact_pts = 0
        if personal.get('email'): contact_pts += 2
        if personal.get('phone'): contact_pts += 2
        if personal.get('location'): contact_pts += 1
        struct_score += contact_pts
        
        # Check professional summary (max 5 pts)
        if summary.strip():
            struct_score += 5
            
        # Check work experiences & bullets structure (max 5 pts)
        if experiences:
            struct_score += 2
            has_bullets = any(exp.get('bullets') for exp in experiences if isinstance(exp, dict))
            if has_bullets:
                struct_score += 3
                
        # Check projects/educations presence (max 5 pts)
        proj_edu_pts = 0
        if projects: proj_edu_pts += 3
        if educations: proj_edu_pts += 2
        struct_score += proj_edu_pts

        # 2. Keyword Match Score (Max 50 points) and Experience Depth Score (Max 30 points)
        matched = []
        missing = []
        exp_matched_count = 0
        
        exp_text = " ".join([json.dumps(exp, default=str) for exp in experiences]).lower()

        for keyword in job_keywords:
            kw_lower = keyword.lower()
            is_matched = (kw_lower in profile_skills or 
                          any(kw_lower in s for s in profile_skills) or 
                          kw_lower in profile_str)
            if is_matched:
                matched.append(keyword)
                if kw_lower in exp_text:
                    exp_matched_count += 1
            else:
                missing.append(keyword)

        if not job_keywords:
            keyword_score = 40
            depth_score = 20
        else:
            keyword_score = (len(matched) / len(job_keywords)) * 50
            depth_score = (exp_matched_count / len(job_keywords)) * 30

        final_score = int(struct_score + keyword_score + depth_score)

        suggestions = []
        for miss in missing:
            suggestions.append(f"Incorporate direct experience or projects utilizing '{miss}' to satisfy core requirements.")
        if not missing:
            suggestions.append("Outstanding match! Maintain core formatting and emphasize specific metric highlights.")

        return {
            "score": min(final_score, 100),
            "matched_keywords": matched,
            "missing_keywords": missing,
            "suggestions": suggestions
        }

    @staticmethod
    def _mock_tailor_resume(profile, job):
        if not isinstance(profile, dict):
            profile = {}
        if not isinstance(job, dict):
            job = {'position': 'Software Engineer', 'company': 'Target Company', 'keywords': ['React', 'PostgreSQL']}

        p_info = profile.get('personal_info', {}) if isinstance(profile.get('personal_info'), dict) else {}
        name = p_info.get('full_name', 'Professional Developer')
        title = job.get('position', 'Software Engineer')
        company = job.get('company', 'Target Company')
        job_kw_list = job.get('keywords', ['React', 'PostgreSQL'])
        keywords = ", ".join(job_kw_list[:3]) if isinstance(job_kw_list, list) else 'React, PostgreSQL'

        tailored_summary = (
            f"Results-oriented {title} with a proven track record of designing high-impact web architectures. "
            f"Equipped with direct experience in {keywords}. Eager to contribute to {company}'s technical roadmap "
            "by delivering clean code and optimal system designs."
        )

        experiences = profile.get('work_experiences', []) if isinstance(profile.get('work_experiences'), list) else []
        tailored_experiences = []
        explanations = [
            {
                "section": "summary",
                "confidence_score": 95,
                "evidence_source": "Master Profile Summary",
                "reason": f"Aligned introduction to explicitly target the '{title}' role at '{company}'."
            }
        ]

        job_keywords = job.get('keywords', ['React', 'PostgreSQL']) if isinstance(job.get('keywords'), list) else ['React', 'PostgreSQL']
        for idx, exp in enumerate(experiences):
            if not isinstance(exp, dict):
                continue
            exp_id = exp.get('id')
            raw_bullets = exp.get('bullets', []) if isinstance(exp.get('bullets'), list) else []
            new_bullets = []

            for bullet in raw_bullets:
                if idx == 0 and job_keywords and not any(kw.lower() in str(bullet).lower() for kw in job_keywords):
                    kw_to_inject = job_keywords[0]
                    bullet_modified = f"{str(bullet).rstrip('.')} leveraging {kw_to_inject} architectures for optimal delivery."
                    new_bullets.append(bullet_modified)
                else:
                    new_bullets.append(str(bullet))

            tailored_experiences.append({
                "id": exp_id,
                "bullets": new_bullets
            })

            explanations.append({
                "section": exp_id,
                "confidence_score": 90,
                "evidence_source": f"Work Experience at {exp.get('company')}",
                "reason": f"Slightly refined bullet details to align with the core requirements of {company}."
            })

        return {
            "tailored_summary": tailored_summary,
            "tailored_experiences": tailored_experiences,
            "explanations": explanations
        }

    @staticmethod
    def _mock_write_cover_letter(profile, job, tone, length):
        if not isinstance(profile, dict):
            profile = {}
        if not isinstance(job, dict):
            job = {'position': 'Software Engineer', 'company': 'Target Company', 'keywords': ['React', 'PostgreSQL']}

        p_info = profile.get('personal_info', {}) if isinstance(profile.get('personal_info'), dict) else {}
        name = p_info.get('full_name', 'Jane Doe')
        email = p_info.get('email', 'jane@example.com')
        phone = p_info.get('phone', '555-0199')

        company = job.get('company', 'Target Company')
        position = job.get('position', 'Software Engineer')
        job_kw_list = job.get('keywords', ['React', 'PostgreSQL'])
        keywords = ", ".join(job_kw_list[:2]) if isinstance(job_kw_list, list) else 'React, PostgreSQL'

        intro_salutation = f"Dear Hiring Team at {company},"

        body_startup = (
            f"I was incredibly excited to see the opening for the {position} role. "
            f"My master profile aligns perfectly with your team's stack—particularly with my experience in {keywords}. "
            "I love building premium products from scratch and adapting quickly in collaborative environments. "
            "I'm eager to bring this energy to your engineering goals."
        )

        body_corp = (
            f"I am writing to express my formal interest in the position of {position} at {company}. "
            f"With a robust background in scalable development and a solid mastery of {keywords}, "
            "I am confident in my capacity to enhance your enterprise operations. I look forward to "
            "discussing how my engineering philosophy matches your corporate benchmarks."
        )

        body = body_corp if tone == "corporate" else body_startup

        from datetime import datetime
        today_str = datetime.now().strftime("%B %d, %Y")

        letter = f"""{name}
{email} | {phone}

Date: {today_str}

{intro_salutation}

{body}

Sincerely,
{name}"""
        return letter

    @classmethod
    def parse_resume_cv(cls, cv_text, api_key=None):
        # Parses a raw resume text to extract structured sections
        system_prompt = (
            "You are a professional Resume parser AI.\n"
            "Analyze the raw resume text and extract its sections into a clean structured JSON.\n"
            "CRITICAL: Spoken languages (e.g. English, German, Spanish) MUST be extracted into the 'skills' list with the category set to 'languages'. Technical/programming skills (e.g. React, TypeScript, Java) MUST be categorized into specific categories such as 'Programming Languages', 'Frontend', 'Backend', 'Database', 'Tools', etc.\n"
            "Return ONLY a JSON object matching this schema:\n"
            "{\n"
            "  \"personal_info\": {\n"
            "     \"full_name\": \"string\",\n"
            "     \"title\": \"string\",\n"
            "     \"email\": \"string\",\n"
            "     \"phone\": \"string\",\n"
            "     \"location\": \"string\",\n"
            "     \"links\": [{\"label\": \"string\", \"url\": \"string\"}]\n"
            "  },\n"
            "  \"work_experiences\": [\n"
            "     {\n"
            "       \"company\": \"string\",\n"
            "       \"position\": \"string\",\n"
            "       \"location\": \"string\",\n"
            "       \"start_date\": \"string\",\n"
            "       \"end_date\": \"string\",\n"
            "       \"bullets\": [\"string\"]\n"
            "     }\n"
            "  ],\n"
            "  \"projects\": [\n"
            "     {\n"
            "       \"title\": \"string\",\n"
            "       \"role\": \"string\",\n"
            "       \"technologies\": [\"string\"],\n"
            "       \"bullets\": [\"string\"]\n"
            "     }\n"
            "  ],\n"
            "  \"skills\": [\n"
            "     {\"name\": \"string\", \"category\": \"string\"}\n"
            "  ],\n"
            "  \"educations\": [\n"
            "     {\n"
            "       \"institution\": \"string\",\n"
            "       \"degree\": \"string\",\n"
            "       \"field_of_study\": \"string\",\n"
            "       \"location\": \"string\",\n"
            "       \"start_date\": \"string\",\n"
            "       \"end_date\": \"string\"\n"
            "     }\n"
            "  ],\n"
            "  \"certifications\": [\n"
            "     {\n"
            "       \"name\": \"string\",\n"
            "       \"issuer\": \"string\",\n"
            "       \"date_obtained\": \"string\"\n"
            "     }\n"
            "  ]\n"
            "}\n"
            "Do not return markdown headers or preambles."
        )
        
        result = cls._call_json(system_prompt, cv_text, api_key, temperature=0.1)
        if result and isinstance(result, dict):
            return result

        raise ValueError("AI Service failed to parse resume content. Please check your API key configuration or try again later.")

    @classmethod
    def _mock_parse_resume_cv(cls, cv_text):
        # A lightweight fallback CV parser utilizing regex and keyword matching
        import re
        
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', cv_text)
        email = email_match.group(0) if email_match else "extracted@example.com"
        
        phone_match = re.search(r'\+?\d[\d -]{7,14}\d', cv_text)
        phone = phone_match.group(0) if phone_match else "555-0100"
        
        # Simple line parsing for full name (usually first line)
        lines = [line.strip() for line in cv_text.split('\n') if line.strip()]
        full_name = lines[0] if lines else "Imported Candidate"
        
        # Parse basic sections to return simulated structure
        return {
            "personal_info": {
                "full_name": full_name,
                "title": "Software Developer",
                "email": email,
                "phone": phone,
                "location": "San Francisco, CA",
                "links": [{"label": "LinkedIn", "url": "https://linkedin.com"}]
            },
            "work_experiences": [
                {
                    "company": "Tech Corp",
                    "position": "Frontend Engineer",
                    "location": "New York, NY",
                    "start_date": "2024-01",
                    "end_date": "Present",
                    "bullets": [
                        "Developed responsive client platforms using React and TypeScript.",
                        "Optimized page load speeds by 40% using code splitting."
                    ]
                },
                {
                    "company": "Startup Hub",
                    "position": "Junior Engineer",
                    "location": "Boston, MA",
                    "start_date": "2022-06",
                    "end_date": "2023-12",
                    "bullets": [
                        "Maintained central component libraries with CSS Modules.",
                        "Collaborated with project managers to release updates weekly."
                    ]
                }
            ],
            "projects": [
                {
                    "title": "Interactive Analytics Dash",
                    "role": "Lead Architect",
                    "technologies": ["React", "Zustand", "ChartJS"],
                    "bullets": [
                        "Configured complex metrics pipelines with drag-and-drop support."
                    ]
                }
            ],
            "skills": [
                {"name": "React", "category": "Frontend"},
                {"name": "TypeScript", "category": "Programming Languages"},
                {"name": "Django", "category": "Backend"},
                {"name": "PostgreSQL", "category": "Database"},
                {"name": "English", "category": "languages"},
                {"name": "German", "category": "languages"}
            ],
            "educations": [
                {
                    "institution": "State University",
                    "degree": "Bachelor of Science",
                    "field_of_study": "Computer Science",
                    "location": "San Francisco, CA",
                    "start_date": "2018",
                    "end_date": "2022"
                }
            ],
            "certifications": [
                {
                    "name": "AWS Certified Practitioner",
                    "issuer": "Amazon Web Services",
                    "date_obtained": "2023"
                }
            ]
        }

    @staticmethod
    def validate_hallucinations(profile_data, tailored_summary, tailored_experiences, tailored_projects=None, target_language='en'):
        # Normalize language (accepts 'DE', 'German', 'deutsch', 'de', etc.)
        target_language = (target_language or 'en').strip().lower()
        is_german = target_language in ['de', 'deutsch', 'german']

        # Strip image/base64 blobs from the matching haystack
        profile_data = AIService._clean_profile_for_ai(profile_data)

        # Flatten all profile data to a single lowercase string for easy search
        profile_str = json.dumps(profile_data, default=str).lower()
        # Normalized copy for metric comparisons ('50,000'/'50.000' -> '50000')
        profile_norm = re.sub(r'(?<=\d)[.,](?=\d)', '', profile_str)

        # List of common English verbs/nouns/connectives to ignore when capitalized
        ignore_words = {
            "the", "we", "i", "my", "our", "led", "managed", "designed", "developed", "implemented",
            "responsible", "created", "worked", "built", "collaborated", "achieved", "increased",
            "delivered", "optimized", "engineered", "spearheaded", "directed", "formulated",
            "introduced", "overcame", "exceeded", "reduced", "saved", "accelerated", "integrated",
            "resolved", "facilitated", "improved", "enhanced", "established", "automated",
            "coordinated", "mentored", "trained", "supervised", "pioneered", "launched",
            "generated", "secured", "negotiated", "strengthened", "cultivated", "expanded",
            "drove", "championed", "leveraged", "utilized", "applied", "partnered",
            "senior", "junior", "lead", "staff", "principal", "manager", "director", "engineer",
            "developer", "architect", "analyst", "consultant", "specialist", "coordinator",
            "project", "product", "team", "client", "customer", "business", "company", "system",
            "application", "software", "hardware", "network", "database", "platform", "infrastructure",
            "a", "an", "and", "or", "but", "so", "for", "with", "by", "at", "from", "to", "in", "on", "as",
            "highly", "proven", "results", "oriented", "seeking", "motivated", "dynamic", "professional"
        }

        alerts = []
        seen_alerts = set()
        MAX_ALERTS = 15

        # Meaningful metrics ONLY: percentages, currency, multipliers ('3x'),
        # and numbers with explicit units. Bare integers/years are ignored to
        # avoid flooding users with false positives ('2020', version numbers...).
        metric_pattern = re.compile(
            r'(?:\d[\d.,]*\s?(?:%|percent|x\b|k\b|m\b|bn\b|billion|million|thousand'
            r'|users|customers|clients|requests|records|transactions|hours|hrs|days|weeks|months|years'
            r'|jahren|monaten|tagen|stunden|kunden|nutzer)'
            r'|(?:\$|€|£)\s?\d[\d.,]*)',
            re.IGNORECASE
        )

        def normalize_metric(metric):
            m = metric.lower().strip()
            m = re.sub(r'(?<=\d)[.,](?=\d)', '', m)   # 50,000 / 50.000 -> 50000
            m = re.sub(r'\s+', '', m)                  # '35 %' -> '35%'
            m = m.rstrip('.')                          # sentence periods
            return m

        # Word starting with an uppercase letter, followed by letters/digits
        word_pattern = re.compile(r'\b[A-Z][a-zA-Z0-9\.\-\/]*\b')

        def check_text(text, section_id, section_label):
            if not text or len(alerts) >= MAX_ALERTS:
                return

            # Find meaningful metrics
            for metric in metric_pattern.findall(text):
                normalized = normalize_metric(metric)
                if not normalized:
                    continue
                # Skip trivial multipliers and years accidentally caught
                if normalized in ('1x', '2x', '3x'):
                    continue
                year_only = re.fullmatch(r'\d{4}', re.sub(r'[^\d]', '', normalized))
                if year_only:
                    continue
                # Present if found raw OR in normalized profile (separator variants)
                if normalized in profile_str or normalized in profile_norm:
                    continue
                key = (section_id, normalized)
                if key in seen_alerts:
                    continue
                seen_alerts.add(key)
                alerts.append({
                    "severity": "WARNING",
                    "section": section_id,
                    "section_label": section_label,
                    "value": metric.strip(),
                    "message": f"Metric '{metric.strip()}' was generated by AI but not verified in your Master Profile. Please check it."
                })
                if len(alerts) >= MAX_ALERTS:
                    return

            # Capitalized-term check: English only. German nouns are always
            # capitalized, so this check would flag every ordinary word.
            if is_german:
                return

            for word in word_pattern.findall(text):
                if len(alerts) >= MAX_ALERTS:
                    return
                word_lower = word.lower()
                if word_lower in ignore_words:
                    continue
                if word.isdigit():
                    continue
                if word_lower in profile_str:
                    continue
                key = (section_id, word_lower)
                if key in seen_alerts:
                    continue
                seen_alerts.add(key)
                alerts.append({
                    "severity": "WARNING",
                    "section": section_id,
                    "section_label": section_label,
                    "value": word,
                    "message": f"Technology or term '{word}' was generated by AI but not verified in your Master Profile. Please check it."
                })

        # Check summary
        check_text(tailored_summary, "summary", "Professional Summary")

        # Check experience bullets
        for exp in tailored_experiences or []:
            exp_id = exp.get('id', '')
            bullets = exp.get('bullets', [])
            company = exp.get('company', 'Work Experience')
            for i, bullet in enumerate(bullets):
                check_text(bullet, exp_id, f"{company} (Bullet {i+1})")

        # Check project bullets too (previously missed entirely)
        for proj in tailored_projects or []:
            proj_id = proj.get('id', '')
            bullets = proj.get('bullets', [])
            title = proj.get('title', 'Project')
            for i, bullet in enumerate(bullets):
                check_text(bullet, proj_id, f"{title} (Bullet {i+1})")

        return alerts

    @classmethod
    def rephrase_block(cls, text, instruction, profile_data, api_key=None):
        profile_text = json.dumps(cls._clean_profile_for_ai(profile_data), default=str)
        system_prompt = (
            "You are an expert Resume Writer.\n"
            "Your task is to rephrase a specific block of text from a resume based on the user's instructions.\n"
            "CRITICAL: Do NOT invent or fabricate any details, technologies, metrics, or accomplishments that are not backed by the user's Master Profile.\n"
            "CRITICAL LANGUAGE RULE: Respond in the SAME language as the input text (German input -> German output, English input -> English output). Keep established technical names (React, Docker, PostgreSQL, CI/CD, etc.) unchanged.\n"
            "CRITICAL LENGTH RULE: Keep the output roughly the same length as the input (within ~25%). It must remain a single bullet/sentence - never merge, split, or add multiple sentences.\n"
            "Return ONLY the rephrased text with no introductory text, no quotes, no markdown block wrappers."
        )
        user_content = (
            f"MASTER_PROFILE:\n{profile_text}\n\n"
            f"TEXT TO REPHRASE:\n\"{text}\"\n\n"
            f"USER INSTRUCTION:\n\"{instruction}\"\n\n"
            f"Rephrased Output:"
        )
        
        rephrased = cls.call_deepseek(system_prompt, user_content, api_key=api_key, temperature=0.3)
        if rephrased:
            return cls._strip_json_fences(rephrased).strip().strip('"')
            
        raise ValueError("AI Service failed to rephrase text block. Please check your API key configuration or try again.")

    @staticmethod
    def _mock_rephrase_block(text, instruction):
        inst_lower = instruction.lower()
        if "punchier" in inst_lower or "action" in inst_lower:
            return f"Spearheaded optimization initiatives, resulting in significant execution velocity improvements. {text}"
        if "leadership" in inst_lower or "lead" in inst_lower:
            return f"Championed and guided cross-functional squads to successfully architect and deploy premium integrations. {text}"
        return f"{text} (Refined to be more aligned with: {instruction})"
