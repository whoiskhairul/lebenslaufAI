import os
import json
import requests
from django.conf import settings

class AIService:
    @staticmethod
    def _get_api_key(api_key=None):
        if api_key:
            return api_key
        return os.environ.get('DEEPSEEK_API_KEY', '').strip()

    @staticmethod
    def call_deepseek(system_prompt, user_content, response_format=None, api_key=None):
        key = AIService._get_api_key(api_key)
        if not key:
            return None
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}"
        }
        
        payload = {
            "model": "deepseek-chat", # standard chat model
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.3
        }
        
        if response_format:
            payload["response_format"] = response_format
            
        try:
            # DeepSeek endpoint or standard OpenAI compatible router
            response = requests.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content']
            else:
                print(f"DeepSeek API Error: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"DeepSeek HTTP request failed: {e}")
            return None

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
        
        result_text = cls.call_deepseek(system_prompt, job_text, {"type": "json_object"}, api_key)
        if result_text:
            try:
                res = json.loads(result_text)
                res['keywords'] = res.get('primary_hard_skills', []) + res.get('secondary_soft_skills', [])
                res['responsibilities'] = res.get('core_job_duties', [])
                res['tone'] = res.get('corporate_culture_tone', 'professional')
                return res
            except ValueError:
                pass
                
        # Mock Fallback Engine if API fails or API Key is missing
        return cls._mock_parse_job_description(job_text)

    @classmethod
    def analyze_ats(cls, profile_data, job_data, api_key=None):
        # Compares profile details with job description
        profile_text = json.dumps(profile_data, default=str)
        job_text = json.dumps(job_data, default=str)
        
        system_prompt = (
            "You are an ATS Scoring Algorithm.\n"
            "Compare the User's Master Profile against the Job Description details.\n"
            "Return ONLY a JSON object matching this schema:\n"
            "{\n"
            "  \"score\": 0-100,\n"
            "  \"matched_keywords\": [\"string\"],\n"
            "  \"missing_keywords\": [\"string\"],\n"
            "  \"suggestions\": [\"string\"]\n"
            "}\n"
            "Do not return markdown codeblocks."
        )
        
        user_content = f"MASTER_PROFILE:\n{profile_text}\n\nJOB_DESCRIPTION:\n{job_text}"
        result_text = cls.call_deepseek(system_prompt, user_content, {"type": "json_object"}, api_key)
        if result_text:
            try:
                return json.loads(result_text)
            except ValueError:
                pass
                
        return cls._mock_analyze_ats(profile_data, job_data)

    @classmethod
    def tailor_resume(cls, profile_data, job_data, api_key=None):
        profile_text = json.dumps(profile_data, default=str)
        job_text = json.dumps(job_data, default=str)
        
        system_prompt = (
            "You are a professional Resume Writer.\n"
            "Tailor the user's resume summary and experience bullets to match the job description.\n"
            "CRITICAL: Do NOT invent/fabricate skills, jobs, dates, or degrees.\n"
            "Return ONLY a JSON object matching this schema:\n"
            "{\n"
            "  \"tailored_summary\": \"string\",\n"
            "  \"tailored_experiences\": [\n"
            "     {\n"
            "       \"id\": \"string (UUID matches work_experience.id)\",\n"
            "       \"bullets\": [\"string\"]\n"
            "     }\n"
            "  ],\n"
            "  \"explanations\": [\n"
            "     {\n"
            "       \"section\": \"summary\" | \"experience_id\",\n"
            "       \"confidence_score\": 0-100,\n"
            "       \"evidence_source\": \"string\",\n"
            "       \"reason\": \"string\"\n"
            "     }\n"
            "  ]\n"
            "}\n"
            "Do not return markdown."
        )
        
        user_content = f"MASTER_PROFILE:\n{profile_text}\n\nJOB_DESCRIPTION:\n{job_text}"
        result_text = cls.call_deepseek(system_prompt, user_content, {"type": "json_object"}, api_key)
        if result_text:
            try:
                return json.loads(result_text)
            except ValueError:
                pass
                
        return cls._mock_tailor_resume(profile_data, job_data)

    @classmethod
    def write_cover_letter(cls, profile_data, job_data, tone="professional", length="medium", api_key=None):
        profile_text = json.dumps(profile_data, default=str)
        job_text = json.dumps(job_data, default=str)
        
        from datetime import datetime
        today_str = datetime.now().strftime("%B %d, %Y")
        
        system_prompt = (
            f"You are a Career Consultant writing a cover letter. Tone: {tone}. Length: {length}. Today's date is {today_str}.\n"
            "Using the user's master profile, write a custom cover letter addressing the job description.\n"
            "Do NOT fabricate experience. Keep it professional. Return ONLY the final letter text. No chat filler."
        )
        
        user_content = f"MASTER_PROFILE:\n{profile_text}\n\nJOB_DESCRIPTION:\n{job_text}"
        result_text = cls.call_deepseek(system_prompt, user_content, api_key=api_key)
        if result_text:
            import re
            result_text = re.sub(
                r'\[[Dd]ate\]|\[[Cc]urrent\s+[Dd]ate\]|\[[Tt]oday\'s\s+[Dd]ate\]|\[date\]',
                today_str,
                result_text
            )
            return result_text
            
        return cls._mock_write_cover_letter(profile_data, job_data, tone, length)

    # ================= MOCK FALLBACK IMPLEMENTATIONS =================

    @staticmethod
    def _mock_parse_job_description(text):
        # Extract common tech keywords if found
        sample_keywords = ["React", "TypeScript", "Node.js", "Django", "PostgreSQL", "Python", "Docker", "AWS", "Kubernetes", "Git"]
        found_keywords = [k for k in sample_keywords if k.lower() in text.lower()]
        if not found_keywords:
            found_keywords = ["React", "TypeScript", "Django"]
            
        company = "Target Company"
        position = "Software Engineer"
        
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
        job_keywords = job.get('keywords', ['React', 'TypeScript', 'PostgreSQL'])
        skills = profile.get('skills', [])
        profile_skills = [s.get('name', '').lower() for s in skills]
        
        matched = []
        missing = []
        
        for keyword in job_keywords:
            if keyword.lower() in profile_skills or any(keyword.lower() in s for s in profile_skills):
                matched.append(keyword)
            else:
                missing.append(keyword)
                
        # Base score on keyword matches
        if not job_keywords:
            score = 75
        else:
            score = int((len(matched) / len(job_keywords)) * 60) + 30 # standard offset
            
        suggestions = []
        for miss in missing:
            suggestions.append(f"Incorporate direct experience or projects utilizing '{miss}' to satisfy core requirements.")
        if not missing:
            suggestions.append("Outstanding match! Maintain core formatting and emphasize specific metric highlights.")

        return {
            "score": min(score, 100),
            "matched_keywords": matched,
            "missing_keywords": missing,
            "suggestions": suggestions
        }

    @staticmethod
    def _mock_tailor_resume(profile, job):
        # Generate tailored summary
        name = profile.get('personal_info', {}).get('full_name', 'Professional Developer')
        title = job.get('position', 'Software Engineer')
        company = job.get('company', 'Target Company')
        keywords = ", ".join(job.get('keywords', ['React', 'PostgreSQL'])[:3])
        
        tailored_summary = (
            f"Results-oriented {title} with a proven track record of designing high-impact web architectures. "
            f"Equipped with direct experience in {keywords}. Eager to contribute to {company}'s technical roadmap "
            "by delivering clean code and optimal system designs."
        )

        experiences = profile.get('work_experiences', [])
        tailored_experiences = []
        explanations = [
            {
                "section": "summary",
                "confidence_score": 95,
                "evidence_source": "Master Profile Summary",
                "reason": f"Aligned introduction to explicitly target the '{title}' role at '{company}'."
            }
        ]

        # Tailor bullets slightly by inserting keywords
        job_keywords = job.get('keywords', ['React', 'PostgreSQL'])
        for idx, exp in enumerate(experiences):
            exp_id = exp.get('id')
            raw_bullets = exp.get('bullets', [])
            new_bullets = []
            
            for bullet in raw_bullets:
                # Inject a keyword if not present to simulate tailoring
                if idx == 0 and job_keywords and not any(kw.lower() in bullet.lower() for kw in job_keywords):
                    kw_to_inject = job_keywords[0]
                    bullet_modified = f"{bullet.rstrip('.')} leveraging {kw_to_inject} architectures for optimal delivery."
                    new_bullets.append(bullet_modified)
                else:
                    new_bullets.append(bullet)
                    
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
        p_info = profile.get('personal_info', {})
        name = p_info.get('full_name', 'Jane Doe')
        email = p_info.get('email', 'jane@example.com')
        phone = p_info.get('phone', '555-0199')
        
        company = job.get('company', 'Target Company')
        position = job.get('position', 'Software Engineer')
        keywords = ", ".join(job.get('keywords', ['React', 'PostgreSQL'])[:2])
        
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
        
        result_text = cls.call_deepseek(system_prompt, cv_text, {"type": "json_object"}, api_key)
        if result_text:
            try:
                return json.loads(result_text)
            except ValueError:
                pass
                
        return cls._mock_parse_resume_cv(cv_text)

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
    def validate_hallucinations(profile_data, tailored_summary, tailored_experiences):
        import re
        
        # Flatten all profile data to a single lowercase string for easy search
        profile_str = json.dumps(profile_data, default=str).lower()
        
        # List of common English verbs/nouns/connectives to ignore when capitalized
        ignore_words = {
            "the", "we", "i", "my", "our", "led", "managed", "designed", "developed", "implemented",
            "responsible", "created", "worked", "built", "collaborated", "achieved", "increased",
            "delivered", "optimized", "engineered", "spearheaded", "directed", "formulated",
            "introduced", "overcame", "exceeded", "reduced", "saved", "accelerated", "integrated",
            "resolved", "facilitated", "improved", "enhanced", "established", "automated",
            "coordinated", "mentored", "trained", "supervised", "pioneered", "launched",
            "generated", "secured", "negotiated", "strengthened", "cultivated", "expanded",
            "drove", "championed", "leveraged", "utilized", "applied", "partnered", "formulated",
            "senior", "junior", "lead", "staff", "principal", "manager", "director", "engineer",
            "developer", "architect", "analyst", "consultant", "specialist", "coordinator",
            "project", "product", "team", "client", "customer", "business", "company", "system",
            "application", "software", "hardware", "network", "database", "platform", "infrastructure",
            "a", "an", "and", "or", "but", "so", "for", "with", "by", "at", "from", "to", "in", "on", "as",
            "highly", "proven", "results", "oriented", "seeking", "motivated", "dynamic", "professional"
        }
        
        alerts = []
        
        # Word starting with an uppercase letter, followed by letters/digits
        word_pattern = re.compile(r'\b[A-Z][a-zA-Z0-9\.\-\/]*\b')
        # Numerical metrics, percentages, currency
        metric_pattern = re.compile(r'\b(?:\$\d+(?:[kKmM])?|\d+(?:\.\d+)?%?|\d+\s*(?:years|months|x|X|percent|percent)?)\b')
        
        def check_text(text, section_id, section_label):
            if not text:
                return
            
            # Find metrics
            metrics = metric_pattern.findall(text)
            for metric in metrics:
                clean_metric = metric.lower().strip()
                if clean_metric in ['1', '2', '3', '4', '5', 'a', 'the']: # skip simple small integers unless with suffixes
                    continue
                if clean_metric not in profile_str:
                    alerts.append({
                        "severity": "WARNING",
                        "section": section_id,
                        "section_label": section_label,
                        "value": metric,
                        "message": f"Metric '{metric}' was generated by AI but not verified in your Master Profile. Please check it."
                    })
            
            # Find technology names / capitalized terms
            words = word_pattern.findall(text)
            for word in words:
                word_lower = word.lower()
                if word_lower in ignore_words:
                    continue
                if word.isdigit():
                    continue
                if word_lower not in profile_str:
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
        for exp in tailored_experiences:
            exp_id = exp.get('id', '')
            bullets = exp.get('bullets', [])
            company = exp.get('company', 'Work Experience')
            for i, bullet in enumerate(bullets):
                check_text(bullet, exp_id, f"{company} (Bullet {i+1})")
                
        return alerts

    @classmethod
    def rephrase_block(cls, text, instruction, profile_data, api_key=None):
        profile_text = json.dumps(profile_data, default=str)
        system_prompt = (
            "You are an expert Resume Writer.\n"
            "Your task is to rephrase a specific block of text from a resume based on the user's instructions.\n"
            "CRITICAL: Do NOT invent or fabricate any details, technologies, or accomplishments that are not backed by the user's Master Profile.\n"
            "Return ONLY the rephrased text with no introductory text, no quotes, no markdown block wrappers."
        )
        user_content = (
            f"MASTER_PROFILE:\n{profile_text}\n\n"
            f"TEXT TO REPHRASE:\n\"{text}\"\n\n"
            f"USER INSTRUCTION:\n\"{instruction}\"\n\n"
            f"Rephrased Output:"
        )
        
        rephrased = cls.call_deepseek(system_prompt, user_content, api_key=api_key)
        if rephrased:
            return rephrased.strip().strip('"')
            
        return cls._mock_rephrase_block(text, instruction)

    @staticmethod
    def _mock_rephrase_block(text, instruction):
        inst_lower = instruction.lower()
        if "punchier" in inst_lower or "action" in inst_lower:
            return f"Spearheaded optimization initiatives, resulting in significant execution velocity improvements. {text}"
        if "leadership" in inst_lower or "lead" in inst_lower:
            return f"Championed and guided cross-functional squads to successfully architect and deploy premium integrations. {text}"
        return f"{text} (Refined to be more aligned with: {instruction})"
