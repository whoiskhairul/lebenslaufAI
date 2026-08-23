import React, { useState } from 'react';
import { ArrowRight, Globe, Sparkles, CheckCircle2, Command, FileText, Code2, Briefcase } from 'lucide-react';
import { navigateTo } from '../utils/navigation';

interface Preset {
  title: string;
  motto: string;
  skills: string[];
  resume: {
    en: {
      position: string;
      summary: string;
      experience: {
        company: string;
        position: string;
        location: string;
        dates: string;
        bullets: string[];
      }[];
    };
    de: {
      position: string;
      summary: string;
      experience: {
        company: string;
        position: string;
        location: string;
        dates: string;
        bullets: string[];
      }[];
    };
  };
}

const PRESETS: Record<string, Preset> = {
  react: {
    title: "Senior React Architect",
    motto: "Designing performant, scalable UI structures.",
    skills: ["React 19", "TypeScript", "TailwindCSS", "Zustand", "Next.js"],
    resume: {
      en: {
        position: "Senior React Architect",
        summary: "Results-driven UI Engineer with 6+ years of experience building scalable design systems and modular web applications. Proven track record of optimizing client-side performance and state managers.",
        experience: [
          {
            company: "TechNova Solutions",
            position: "Lead UI Engineer",
            location: "San Francisco, CA",
            dates: "Oct 2022 - Present",
            bullets: [
              "Architected core design systems utilizing [React 19] and [TailwindCSS] to unify UI components across 4 product lines.",
              "Migrated legacy Redux modules to [Zustand], reducing global state boilerplate by 60%.",
              "Implemented server-side rendering routes via [Next.js], improving initial page loads by 45%.",
              "Led a frontend team of 5, enforcing strict [TypeScript] typings and automated testing suites."
            ]
          }
        ]
      },
      de: {
        position: "Senior React-Architekt",
        summary: "Ergebnisorientierter UI-Entwickler mit mehr als 6 Jahren Erfahrung im Aufbau skalierbarer Design-Systeme und modularer Webanwendungen. Nachgewiesene Erfolge bei der Optimierung clientseitiger Performance und Zustandsverwaltungen.",
        experience: [
          {
            company: "TechNova Solutions",
            position: "Leitender UI-Entwickler",
            location: "San Francisco, CA",
            dates: "Okt 2022 - Heute",
            bullets: [
              "Entwicklung von Core-Design-Systemen unter Verwendung von [React 19] und [TailwindCSS] zur Vereinheitlichung der UI-Komponenten über 4 Produktlinien hinweg.",
              "Migration älterer Redux-Module zu [Zustand], was den Boilerplate-Code für den globalen Zustand um 60% reduzierte.",
              "Implementierung von serverseitigen Rendering-Routen über [Next.js], wodurch die Ladezeiten der ersten Seiten um 45% verbessert wurden.",
              "Leitung eines Frontend-Teams von 5 Entwicklern unter Durchsetzung strenger [TypeScript]-Typisierungen und automatisierter Test-Suites."
            ]
          }
        ]
      }
    }
  },
  cloud: {
    title: "Cloud Infrastructure Engineer",
    motto: "Orchestrating high-availability container clouds.",
    skills: ["Docker", "Kubernetes", "AWS Cloud", "Terraform", "CI/CD Pipelines"],
    resume: {
      en: {
        position: "Cloud Infrastructure Engineer",
        summary: "Cloud Architect specializing in infrastructure automation, container orchestration, and continuous delivery. Experienced in managing zero-downtime microservices across global AWS environments.",
        experience: [
          {
            company: "GlobalNet Corp",
            position: "Senior DevOps Specialist",
            location: "Austin, TX",
            dates: "Jan 2023 - Present",
            bullets: [
              "Orchestrated containerized environments using [Docker] and [Kubernetes] across multi-cluster zones.",
              "Automated provisioning of resources on [AWS Cloud] utilizing modular [Terraform] scripts.",
              "Configured optimized [CI/CD Pipelines] to deploy builds instantly, minimizing deployment downtime to zero.",
              "Designed robust backup workflows and cloud policies that increased data reliability by 99.9%."
            ]
          }
        ]
      },
      de: {
        position: "Cloud-Infrastruktur-Ingenieur",
        summary: "Cloud-Architekt mit Spezialisierung auf Infrastrukturautomatisierung, Container-Orchestrierung und kontinuierliche Bereitstellung. Erfahren in der Verwaltung ausfallsicherer Mikroservices in globalen AWS-Umgebungen.",
        experience: [
          {
            company: "GlobalNet Corp",
            position: "Senior DevOps-Spezialist",
            location: "Austin, TX",
            dates: "Jan 2023 - Heute",
            bullets: [
              "Orchestrierung containerisierter Umgebungen unter Verwendung von [Docker] und [Kubernetes] über Multi-Cluster-Zonen hinweg.",
              "Automatisierung der Ressourcenbereitstellung in der [AWS Cloud] unter Verwendung modularer [Terraform]-Skripte.",
              "Konfiguration optimierter [CI/CD Pipelines] zur sofortigen Bereitstellung von Builds, was die Ausfallzeiten bei Deployments auf Null reduzierte.",
              "Entwurf robuster Backup-Workflows und Cloud-Richtlinien, die die Datenzuverlässigkeit um 99,9% erhöhten."
            ]
          }
        ]
      }
    }
  }
};

export const Landing: React.FC = () => {
  const [selectedPresetKey, setSelectedPresetKey] = useState<keyof typeof PRESETS>('react');
  const [enabledKeywords, setEnabledKeywords] = useState<Record<string, boolean>>({
    "React 19": true,
    "TypeScript": true,
    "TailwindCSS": false,
    "Zustand": false,
    "Next.js": false,
    "Docker": true,
    "Kubernetes": true,
    "AWS Cloud": false,
    "Terraform": false,
    "CI/CD Pipelines": false
  });
  const [targetLanguage, setTargetLanguage] = useState<'en' | 'de'>('en');

  const preset = PRESETS[selectedPresetKey];
  const activeResume = preset.resume[targetLanguage];

  // Calculate ATS match score based on selected keywords for the preset
  const presetSkills = preset.skills;
  const matchedCount = presetSkills.filter(skill => enabledKeywords[skill]).length;
  const atsScore = Math.round(50 + (matchedCount / presetSkills.length) * 45);

  const toggleKeyword = (skill: string) => {
    setEnabledKeywords(prev => ({ ...prev, [skill]: !prev[skill] }));
  };

  const selectPreset = (key: keyof typeof PRESETS) => {
    setSelectedPresetKey(key);
  };

  // Helper to render resume bullet points with yellow text highlighting for matching keywords
  const renderHighlightedText = (text: string) => {
    // Matches bracketed words, e.g. [React 19]
    const parts = text.split(/(\[[^\]]+\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const skill = part.slice(1, -1);
        const isActive = enabledKeywords[skill];
        if (isActive) {
          return (
            <span
              key={i}
              className="bg-amber-400/20 text-amber-300 font-semibold px-1 rounded transition-all duration-300 shadow-[0_0_8px_rgba(251,191,36,0.3)] border border-amber-500/30"
            >
              {skill}
            </span>
          );
        }
        return <span key={i} className="text-gray-400/80 italic">{skill} (missing)</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col font-sans overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="border-b border-white/5 bg-[#07070a]/90 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="bg-indigo-600 p-1.5 sm:p-2 rounded-lg text-white shadow-lg shadow-indigo-600/30 shrink-0">
            <Command size={18} />
          </div>
          <span className="font-bold text-base sm:text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 truncate">
            LebenslaufAI
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={() => navigateTo('login')}
            className="text-slate-400 hover:text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
          >
            Sign In
          </button>
          <button
            onClick={() => navigateTo('register')}
            className="bg-white hover:bg-slate-100 text-slate-900 text-xs sm:text-sm font-semibold px-3 py-2 sm:px-4 rounded-lg transition-all shadow-md shadow-white/5 whitespace-nowrap"
          >
            Launch Workspace
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Control Panel */}
        <section className="lg:col-span-5 p-5 sm:p-8 lg:p-12 flex flex-col justify-between border-r border-white/5 bg-[#09090d] overflow-y-auto">
          <div>
            {/* Title Brand & Motto */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4 border border-indigo-500/20">
                <Sparkles size={12} /> Live Interactive Playground
              </div>
              <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-none text-white mb-3">
                LebenslaufAI
              </h1>
              <p className="text-lg text-slate-400 font-medium">
                The Intelligent Job Search Command Center.
              </p>
            </div>

            {/* Step 1: Preset Selectors */}
            <div className="space-y-4 mb-8">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                1. Select Target Job Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => selectPreset('react')}
                  className={`p-4 rounded-xl text-left border transition-all duration-300 ${
                    selectedPresetKey === 'react'
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <Code2 className={`mb-2 ${selectedPresetKey === 'react' ? 'text-indigo-400' : 'text-slate-400'}`} size={20} />
                  <div className="font-bold text-sm text-white">Frontend Architect</div>
                  <div className="text-xs text-slate-400 mt-1 line-clamp-1">React, Next.js, UI</div>
                </button>

                <button
                  onClick={() => selectPreset('cloud')}
                  className={`p-4 rounded-xl text-left border transition-all duration-300 ${
                    selectedPresetKey === 'cloud'
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <Briefcase className={`mb-2 ${selectedPresetKey === 'cloud' ? 'text-indigo-400' : 'text-slate-400'}`} size={20} />
                  <div className="font-bold text-sm text-white">Cloud Engineer</div>
                  <div className="text-xs text-slate-400 mt-1 line-clamp-1">Docker, Kubernetes, AWS</div>
                </button>
              </div>
            </div>

            {/* Step 2: Language & Keyword Checklist */}
            <div className="space-y-6 mb-10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                  2. Optimize Keywords
                </label>
                
                {/* Language Toggle Selector */}
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                  <button
                    onClick={() => setTargetLanguage('en')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      targetLanguage === 'en' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setTargetLanguage('de')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      targetLanguage === 'de' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Deutsch
                  </button>
                </div>
              </div>

              {/* Keyword Checklist Pills */}
              <div className="flex flex-wrap gap-2">
                {preset.skills.map((skill) => {
                  const active = enabledKeywords[skill];
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleKeyword(skill)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${
                        active
                          ? 'bg-amber-400/10 text-amber-300 border-amber-400/30 shadow-[0_0_10px_rgba(251,191,36,0.1)]'
                          : 'bg-white/[0.02] text-slate-400 border-white/5 hover:border-white/10 hover:text-white'
                      }`}
                    >
                      <CheckCircle2 size={12} className={active ? 'text-amber-400' : 'text-slate-600'} />
                      {skill}
                    </button>
                  );
                })}
              </div>

              {/* Sleek Horizontal ATS Score Bar */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculated ATS Score</span>
                  <span className="text-xl font-black text-white">{atsScore}%</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
                    style={{ width: `${atsScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Score updates live as keywords are dynamically integrated into the document.
                </p>
              </div>
            </div>
          </div>

          {/* Action Footer Call to Action */}
          <div className="pt-6 border-t border-white/5">
            <button
              onClick={() => navigateTo('register')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group text-base"
            >
              Start Tailoring Your CV
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-center text-xs text-slate-500 mt-3">
              No credit card required. Import existing PDF/Word profiles instantly.
            </p>
          </div>
        </section>

        {/* Right Preview Sheet Pane */}
        <section className="lg:col-span-7 p-4 sm:p-6 lg:p-12 bg-[#050508] flex items-center justify-center overflow-y-auto">
          {/* Mock CV Paper */}
          <div className="w-full max-w-[700px] bg-white text-slate-800 p-5 sm:p-8 lg:p-12 rounded-xl shadow-2xl border border-slate-200/80 font-serif leading-relaxed animate-fade-in relative">
            
            {/* Real-time indicator flag */}
            <div className="absolute top-4 right-4 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded border border-indigo-100 flex items-center gap-1">
              <Globe size={10} /> {targetLanguage === 'en' ? 'English CV' : 'Deutscher Lebenslauf'}
            </div>

            {/* Profile Header */}
            <div className="border-b-2 border-slate-800 pb-5 mb-6">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1.5 font-sans">
                Alex Mercer
              </h2>
              <h3 className="text-md font-bold text-indigo-600 uppercase tracking-widest font-sans">
                {activeResume.position}
              </h3>
              
              {/* Localized Contacts Bar */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-3 font-sans">
                <div>
                  <strong className="text-slate-800">{targetLanguage === 'de' ? 'Handy:' : 'Phone:'}</strong> +49 176 8920 1202
                </div>
                <div>
                  <strong className="text-slate-800">Email:</strong> contact@alexmercer.dev
                </div>
                <div>
                  <strong className="text-slate-800">{targetLanguage === 'de' ? 'Adresse:' : 'Address:'}</strong> Berlin, Germany
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="mb-6">
              <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2 font-sans">
                {targetLanguage === 'de' ? 'Zusammenfassung' : 'Professional Summary'}
              </h4>
              <p className="text-sm text-slate-700 text-justify leading-relaxed">
                {activeResume.summary}
              </p>
            </div>

            {/* Work Experience */}
            <div>
              <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-3 font-sans">
                {targetLanguage === 'de' ? 'Berufserfahrung' : 'Work Experience'}
              </h4>
              
              {activeResume.experience.map((exp, idx) => (
                <div key={idx} className="mb-4">
                  <div className="flex justify-between items-baseline mb-1">
                    <h5 className="font-bold text-slate-900 text-sm">
                      {exp.position} — <span className="font-normal text-slate-600">{exp.company}</span>
                    </h5>
                    <span className="text-[11px] text-slate-500 font-sans italic">{exp.dates}</span>
                  </div>
                  <div className="text-xs text-slate-500 mb-2 font-sans">{exp.location}</div>
                  <ul className="list-disc list-outside pl-4 space-y-1.5 text-xs text-slate-700">
                    {exp.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="leading-relaxed">
                        {renderHighlightedText(bullet)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Education Placeholder */}
            <div className="mt-6">
              <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2 font-sans">
                {targetLanguage === 'de' ? 'Ausbildung' : 'Education'}
              </h4>
              <div className="flex justify-between items-baseline text-xs">
                <span className="font-bold text-slate-900">
                  {targetLanguage === 'de' ? 'B.Sc. Informatik' : 'B.Sc. in Computer Science'}
                </span>
                <span className="text-slate-500 italic">2018 - 2021</span>
              </div>
              <div className="text-[11px] text-slate-500 font-sans">Technical University of Munich</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
