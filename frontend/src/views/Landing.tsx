import React, { useState } from 'react';
import { navigateTo } from '../utils/navigation';
import { Logo } from '../components/Logo';
import styles from './Landing.module.css';

type Lang = 'de' | 'en';

const COPY: Record<Lang, {
  nav: { signIn: string; start: string };
  hero: { sub: string; cta: string; secondary: string; note: string; h1: React.ReactNode };
  sections: string[];
  features: { t: string; d: string }[];
  extras: { t: string; d: string }[];
  cta: { h: string; p: string; btn: string; alt: string };
  footer: string;
}> = {
  de: {
    nav: { signIn: 'Anmelden', start: 'Anfangen' },
    hero: {
      h1: (
        <>
          Der Lebenslauf richtet sich nach der{' '}
          <em className="not-italic underline decoration-2 underline-offset-8 decoration-muted">Anzeige</em> — nicht umgekehrt.
        </>
      ),
      sub: 'LebenslaufAI pflegt dein Profil an einem Ort und erstellt daraus pro Stelle eine passende Fassung plus Anschreiben — auf Deutsch oder Englisch, druckfertig auf A4. Die KI arbeitet nur mit deinen Angaben.',
      cta: 'Kostenlos anfangen',
      secondary: 'Anmelden',
      note: 'Ein Profil. Eine Fassung pro Stelle.',
    },
    sections: ['Funktionen', 'Dazu gehört', 'Anfangen'],
    features: [
      {
        t: 'Master-Profil',
        d: 'Erfahrung, Projekte, Kenntnisse, Ausbildung — einmal gepflegt. Neue Fassungen sind Schnappschüsse, dein Original bleibt unangetastet.',
      },
      {
        t: 'Anzeige einfügen',
        d: 'Stellenanzeige hinein, passende CV-Fassung und Anschreiben heraus. Standard- oder aggressive Keyword-Strategie, Deutsch oder Englisch.',
      },
      {
        t: 'A4-Editor',
        d: 'Echte A4-Seiten mit automatischem Umbruch. Direkt auf dem Blatt bearbeiten, reinzoomen, über mehrere Seiten arbeiten.',
      },
      {
        t: 'Vorlagen & Format',
        d: 'Ruhige Vorlagen plus Feinregler für Schrift, Größe, Abstände und Farben. Abschnitte ausblenden, verschieben, dichter oder luftiger setzen.',
      },
      {
        t: 'Feinschliff pro Abschnitt',
        d: 'Vorschläge Abschnitt für Abschnitt, Original und Entwurf nebeneinander. Übernehmen oder verwerfen — du entscheidest.',
      },
      {
        t: 'Stichwort-Abgleich',
        d: 'Abgleich mit der Anzeige: welche Stichwörter drin sind, welche fehlen. Fehlende bei Bedarf einsetzen.',
      },
      {
        t: 'Bewerbungs-Tracker',
        d: 'Kanban-Board von der Wunschliste bis zur Zusage. Jede Karte hängt an ihrer CV-Fassung und ihrem Anschreiben.',
      },
      {
        t: 'Druck & PDF',
        d: 'Exakt A4 aus dem Browser — Umbrüche bleiben, wo sie sind.',
      },
    ],
    extras: [
      {
        t: 'Sicherheit',
        d: 'Zwei-Faktor-Authentifizierung, E-Mail-Verifizierung und eine Geräteliste mit Sitzungen, die du einzeln widerrufen kannst.',
      },
      {
        t: 'Browser-Erweiterung',
        d: 'Für Chrome: Stellenanzeige auf LinkedIn, Xing oder Indeed aufgreifen und die fertige Fassung direkt im Editor öffnen.',
      },
      {
        t: 'Für Betreiber',
        d: 'Admin-Bereich mit Nutzungszahlen, Nutzerverwaltung und Einsicht in jede erzeugte Fassung.',
      },
    ],
    cta: {
      h: 'Profil anlegen, erste Fassung schreiben.',
      p: 'Dein Profil bleibt deins — jede Fassung ist nur ein Schnappschuss davon.',
      btn: 'Kostenlos anfangen',
      alt: 'Ich habe schon ein Konto',
    },
    footer: 'Deutsch · English · A4',
  },
  en: {
    nav: { signIn: 'Sign in', start: 'Start' },
    hero: {
      h1: (
        <>
          The CV follows the{' '}
          <em className="not-italic underline decoration-2 underline-offset-8 decoration-muted">job ad</em> — not the other way round.
        </>
      ),
      sub: 'LebenslaufAI keeps your profile in one place and produces a matching version plus cover letter per job — in German or English, print-ready on A4. The AI only works with what you gave it.',
      cta: 'Start free',
      secondary: 'Sign in',
      note: 'One profile. One version per job.',
    },
    sections: ['What it does', 'Also part of it', 'Get going'],
    features: [
      {
        t: 'Master profile',
        d: 'Experience, projects, skills, education — entered once. New versions are snapshots; your original stays untouched.',
      },
      {
        t: 'Paste the ad',
        d: 'Job ad in, matching CV version and cover letter out. Standard or aggressive keyword strategy, German or English.',
      },
      {
        t: 'A4 editor',
        d: 'True A4 pages with automatic pagination. Edit on the sheet, zoom in, work across pages.',
      },
      {
        t: 'Templates & format',
        d: 'Quiet templates plus fine controls for font, size, spacing and color. Hide or reorder sections, set the density.',
      },
      {
        t: 'Polish per section',
        d: 'Suggestions section by section, original and draft side by side. Accept or discard — you decide.',
      },
      {
        t: 'Keyword match',
        d: 'Checked against the ad: which keywords are in, which are missing. Inject the missing ones if needed.',
      },
      {
        t: 'Application tracker',
        d: 'Kanban board from wishlist to offer. Each card is linked to its CV version and its letter.',
      },
      {
        t: 'Print & PDF',
        d: 'Exact A4 from the browser — page breaks stay where they are.',
      },
    ],
    extras: [
      {
        t: 'Security',
        d: 'Two-factor authentication, email verification and a device list with sessions you can revoke one by one.',
      },
      {
        t: 'Browser extension',
        d: 'For Chrome: pick up the job ad on LinkedIn, Xing or Indeed and open the finished version straight in the editor.',
      },
      {
        t: 'For operators',
        d: 'Staff area with usage metrics, user management and a viewer for every generated version.',
      },
    ],
    cta: {
      h: 'Create your profile, write your first version.',
      p: 'Your profile stays yours — every version is only a snapshot of it.',
      btn: 'Start free',
      alt: 'I already have an account',
    },
    footer: 'German · English · A4',
  },
};

export const Landing: React.FC = () => {
  const [lang, setLang] = useState<Lang>('de');
  const t = COPY[lang];

  return (
    <div className={`min-h-screen bg-background font-body text-foreground ${styles.light}`}>
      {/* Header */}
      <header className="border-b border-cardline">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <p className="flex items-center gap-2 font-header text-lg font-bold tracking-tight">
            <Logo size={20} />
            LebenslaufAI
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <button
                onClick={() => setLang('de')}
                aria-pressed={lang === 'de'}
                className={lang === 'de' ? 'font-semibold underline underline-offset-4' : 'text-muted hover:text-foreground'}
              >
                DE
              </button>
              <span className="text-muted">/</span>
              <button
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
                className={lang === 'en' ? 'font-semibold underline underline-offset-4' : 'text-muted hover:text-foreground'}
              >
                EN
              </button>
            </span>
            <button onClick={() => navigateTo('login')} className="text-muted hover:text-foreground">
              {t.nav.signIn}
            </button>
            <button
              onClick={() => navigateTo('register')}
              className="rounded-sm bg-foreground px-3.5 py-2 font-medium text-background"
            >
              {t.nav.start}
            </button>
          </div>
        </div>
      </header>

      {/* 00 — Hero */}
      <section className="mx-auto max-w-4xl px-5 pb-16 pt-14 sm:pt-20">
        <p className="text-xs uppercase tracking-widest text-muted">Lebenslauf · Anschreiben · {lang === 'de' ? 'A4' : 'A4'}</p>
        <h1 className="mt-4 max-w-2xl font-header text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl">{t.hero.h1}</h1>
        <p className="mt-5 max-w-xl leading-relaxed text-muted">{t.hero.sub}</p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <button
            onClick={() => navigateTo('register')}
            className="rounded-sm bg-foreground px-5 py-3 text-sm font-medium text-background"
          >
            {t.hero.cta}
          </button>
          <button onClick={() => navigateTo('login')} className="text-sm text-muted hover:text-foreground">
            {t.hero.secondary}
          </button>
        </div>
        <p className="mt-4 text-xs text-muted">{t.hero.note}</p>
      </section>

      {/* Features */}
      <section className="border-t border-cardline">
        <div className="mx-auto max-w-4xl px-5 py-12">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">{t.sections[0]}</h2>
          <div className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {t.features.map((f) => (
              <div key={f.t} className="border-t border-cardline pt-4">
                <p className="font-semibold">{f.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extras */}
      <section className="border-t border-cardline bg-card">
        <div className="mx-auto max-w-4xl px-5 py-12">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">{t.sections[1]}</h2>
          <div className="mt-6 divide-y divide-cardline">
            {t.extras.map((e) => (
              <div key={e.t} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr] sm:gap-6">
                <p className="font-semibold">{e.t}</p>
                <p className="text-sm leading-relaxed text-muted">{e.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-cardline">
        <div className="mx-auto max-w-4xl px-5 py-16">
          <h2 className="max-w-xl font-header text-3xl font-bold leading-snug tracking-tight sm:text-4xl">{t.cta.h}</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{t.cta.p}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={() => navigateTo('register')}
              className="rounded-sm bg-foreground px-5 py-3 text-sm font-medium text-background"
            >
              {t.cta.btn}
            </button>
            <button onClick={() => navigateTo('login')} className="text-sm text-muted hover:text-foreground">
              {t.cta.alt}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cardline">
        <div className="mx-auto flex max-w-4xl flex-col gap-1 px-5 py-4 text-xs text-muted sm:flex-row sm:justify-between">
          <span className="font-header font-bold tracking-tight">LebenslaufAI</span>
          <span>{t.footer}</span>
        </div>
      </footer>
    </div>
  );
};
