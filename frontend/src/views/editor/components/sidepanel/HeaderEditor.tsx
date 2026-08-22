import React from 'react';
import { User, Mail, Phone, MapPin, Globe, Linkedin, Github, Calendar, Flag, Sparkles } from 'lucide-react';
import styles from '../../../EditorNew.module.css';

export interface HeaderEditorProps {
  personalInfo: {
    full_name: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    date_of_birth: string;
    nationality: string;
    linkedin: string;
    github: string;
    website: string;
    image_url: string;
    signature_image?: string;
  };
  setPersonalInfo: React.Dispatch<React.SetStateAction<any>>;
  onPolishField?: (fieldName: string, text: string) => void;
}

export const HeaderEditor: React.FC<HeaderEditorProps> = ({
  personalInfo,
  setPersonalInfo,
  onPolishField
}) => {
  const handleChange = (field: string, value: string) => {
    setPersonalInfo((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className={styles.sideEditorContent}>
      <div className={styles.sideEditorIntro}>
        <span className={styles.sideEditorIntroIcon}>👤</span>
        <div>
          <h4 className={styles.sideEditorTitle}>Personal & Contact Information</h4>
          <p className={styles.sideEditorSubtitle}>
            Update your core identity, headline, contact channels, and portfolio links.
          </p>
        </div>
      </div>

      {/* Primary Identity Section */}
      <div className={styles.sideFieldGroupCard}>
        <div className={styles.sideFieldGroupHeader}>
          <User size={14} className={styles.sideFieldGroupIcon} />
          <span>Core Identity</span>
        </div>

        <div className={styles.sideFieldRow}>
          <label className={styles.sideFieldLabel}>Full Name</label>
          <div className={styles.sideInputWrapper}>
            <input
              type="text"
              className={styles.sideTextInput}
              placeholder="e.g. Alexander Weber"
              value={personalInfo.full_name || ''}
              onChange={(e) => handleChange('full_name', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.sideFieldRow}>
          <div className={styles.sideFieldLabelRow}>
            <label className={styles.sideFieldLabel}>Professional Headline / Role</label>
            {onPolishField && personalInfo.title && (
              <button
                type="button"
                className={styles.sideInlineAiBtn}
                onClick={() => onPolishField('Job Title', personalInfo.title)}
                title="AI Polish Headline"
              >
                <Sparkles size={11} /> Polish
              </button>
            )}
          </div>
          <div className={styles.sideInputWrapper}>
            <input
              type="text"
              className={styles.sideTextInput}
              placeholder="e.g. Senior Full-Stack Engineer | Cloud Architect"
              value={personalInfo.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Contact Channels Section */}
      <div className={styles.sideFieldGroupCard}>
        <div className={styles.sideFieldGroupHeader}>
          <Mail size={14} className={styles.sideFieldGroupIcon} />
          <span>Contact Channels</span>
        </div>

        <div className={styles.sideFieldRow}>
          <label className={styles.sideFieldLabel}>
            <Mail size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Email Address
          </label>
          <input
            type="email"
            className={styles.sideTextInput}
            placeholder="e.g. alexander.weber@example.com"
            value={personalInfo.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
          />
        </div>

        <div className={styles.sideFieldRow}>
          <label className={styles.sideFieldLabel}>
            <Phone size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Phone Number
          </label>
          <input
            type="text"
            className={styles.sideTextInput}
            placeholder="e.g. +49 170 1234567"
            value={personalInfo.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
          />
        </div>

        <div className={styles.sideFieldRow}>
          <label className={styles.sideFieldLabel}>
            <MapPin size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Location (City, Country)
          </label>
          <input
            type="text"
            className={styles.sideTextInput}
            placeholder="e.g. Berlin, Germany"
            value={personalInfo.location || ''}
            onChange={(e) => handleChange('location', e.target.value)}
          />
        </div>
      </div>

      {/* Social & Portfolio Links */}
      <div className={styles.sideFieldGroupCard}>
        <div className={styles.sideFieldGroupHeader}>
          <Globe size={14} className={styles.sideFieldGroupIcon} />
          <span>Profiles & Web Presence</span>
        </div>

        <div className={styles.sideFieldRow}>
          <label className={styles.sideFieldLabel}>
            <Linkedin size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            LinkedIn URL / Handle
          </label>
          <input
            type="text"
            className={styles.sideTextInput}
            placeholder="e.g. linkedin.com/in/alexander-weber"
            value={personalInfo.linkedin || ''}
            onChange={(e) => handleChange('linkedin', e.target.value)}
          />
        </div>

        <div className={styles.sideFieldRow}>
          <label className={styles.sideFieldLabel}>
            <Github size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            GitHub Profile
          </label>
          <input
            type="text"
            className={styles.sideTextInput}
            placeholder="e.g. github.com/alexweber"
            value={personalInfo.github || ''}
            onChange={(e) => handleChange('github', e.target.value)}
          />
        </div>

        <div className={styles.sideFieldRow}>
          <label className={styles.sideFieldLabel}>
            <Globe size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Personal Website / Portfolio
          </label>
          <input
            type="text"
            className={styles.sideTextInput}
            placeholder="e.g. alexweber.dev"
            value={personalInfo.website || ''}
            onChange={(e) => handleChange('website', e.target.value)}
          />
        </div>
      </div>

      {/* Additional Personal Details */}
      <div className={styles.sideFieldGroupCard}>
        <div className={styles.sideFieldGroupHeader}>
          <Calendar size={14} className={styles.sideFieldGroupIcon} />
          <span>Additional Demographics (Optional)</span>
        </div>

        <div className={styles.sideFieldRow}>
          <label className={styles.sideFieldLabel}>
            <Flag size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Nationality
          </label>
          <input
            type="text"
            className={styles.sideTextInput}
            placeholder="e.g. German / EU Citizen"
            value={personalInfo.nationality || ''}
            onChange={(e) => handleChange('nationality', e.target.value)}
          />
        </div>

        <div className={styles.sideFieldRow}>
          <label className={styles.sideFieldLabel}>
            <Calendar size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Date of Birth
          </label>
          <input
            type="text"
            className={styles.sideTextInput}
            placeholder="e.g. 15.04.1992"
            value={personalInfo.date_of_birth || ''}
            onChange={(e) => handleChange('date_of_birth', e.target.value)}
          />
        </div>

        <div className={styles.sideFieldRow}>
          <label className={styles.sideFieldLabel}>Profile Photo URL</label>
          <input
            type="text"
            className={styles.sideTextInput}
            placeholder="e.g. https://... or leave empty"
            value={personalInfo.image_url || ''}
            onChange={(e) => handleChange('image_url', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
