import React from 'react';
import { Settings } from 'lucide-react';
import styles from '../../../../views/editorStyles';
import { AutoSizeTextarea } from '../AutoSizeTextarea';
import { HeaderSettingsPopover } from '../HeaderSettingsPopover';
import { formatPhoneNumber } from '../../utils/phoneUtils';
import type { UnitRendererProps } from '../UnitRendererProps';
import type { UnitContext } from './shared';
import { ensureAbsoluteUrl } from './helpers';

export const HeaderUnit: React.FC<{ p: UnitRendererProps; ctx: UnitContext }> = ({ p, ctx }) => {
  const {
    unit, isMeasuring, headerStyles,
    editablePersonalInfo, setEditablePersonalInfo,
    activeSectionSettings, setActiveSectionSettings, popoverPosition, setPopoverPosition,
    setHeaderStyles, targetLanguage
  } = p;
  const { isPP, isGerman, mergedStyles } = ctx;

  if (unit.type !== 'header') return null;
  const isHeaderSettingsOpen = activeSectionSettings === 'header';

  const headerControls = !isMeasuring && (
    <div className={`${styles.sectionControls} no-print`} style={{ top: '-28px', left: '0', right: 'auto' }}>
      <button
        type="button"
        className={styles.itemSortBtn}
        title="Customize Header Styles"
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          setPopoverPosition({ top: rect.top, left: rect.left });
          setActiveSectionSettings(isHeaderSettingsOpen ? null : 'header');
        }}
      >
        <Settings size={13} />
      </button>
    </div>
  );

  const nameStyleOverride = {
    fontSize: headerStyles.nameSize ? `${headerStyles.nameSize}px` : undefined,
    fontWeight: headerStyles.nameWeight ? headerStyles.nameWeight : undefined,
    fontStyle: headerStyles.nameStyle ? headerStyles.nameStyle : undefined,
    color: headerStyles.nameColor ? headerStyles.nameColor : undefined,
  };

  const titleStyleOverride = {
    fontSize: headerStyles.titleSize ? `${headerStyles.titleSize}px` : undefined,
    fontWeight: headerStyles.titleWeight ? headerStyles.titleWeight : undefined,
    fontStyle: headerStyles.titleStyle ? headerStyles.titleStyle : undefined,
    color: headerStyles.titleColor ? headerStyles.titleColor : '#3d7ee6',
  };

  const contactsStyleOverride = {
    fontSize: headerStyles.contactsSize ? `${headerStyles.contactsSize}px` : undefined,
    color: headerStyles.contactsColor ? headerStyles.contactsColor : undefined,
    gap: headerStyles.contactsGap ? `${headerStyles.contactsGap}px` : undefined,
    marginTop: headerStyles.contactsMarginTop !== undefined ? `${headerStyles.contactsMarginTop}px` : undefined,
  };

  const headerContainerStyle = {
    ...mergedStyles,
    marginBottom: headerStyles.spacing !== undefined ? `${headerStyles.spacing}px` : undefined,
    position: 'relative' as const,
  };

  if (isPP) {
    return (
      <div className={styles.ppHeader} style={headerContainerStyle} data-section-id="header">
        {headerControls}
        {!isMeasuring && isHeaderSettingsOpen && (
          <HeaderSettingsPopover
            popoverPosition={popoverPosition}
            headerStyles={headerStyles}
            setHeaderStyles={setHeaderStyles}
            onClose={() => setActiveSectionSettings(null)}
            editablePersonalInfo={editablePersonalInfo}
            setEditablePersonalInfo={setEditablePersonalInfo}
          />
        )}
        <div className={styles.ppHeaderLeft}>
          <h1 className={styles.ppName} style={nameStyleOverride}>
            <AutoSizeTextarea
              style={nameStyleOverride}
              value={editablePersonalInfo.full_name}
              onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, full_name: val }))}
            />
          </h1>
          <h2 className={styles.ppTitle} style={titleStyleOverride}>
            <AutoSizeTextarea
              style={titleStyleOverride}
              value={editablePersonalInfo.title}
              onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, title: val }))}
            />
          </h2>
          <div className={styles.ppContactGrid} style={contactsStyleOverride}>
            <div className={styles.ppContactCol}>
              {!!editablePersonalInfo.location?.trim() && (
                <div className={styles.ppContactItem}>
                  <span className={styles.ppContactLabel}>{targetLanguage === 'de' ? 'Adresse:' : 'Address:'}</span>
                  <span className={styles.ppContactVal}>
                    <AutoSizeTextarea
                      value={editablePersonalInfo.location}
                      onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, location: val }))}
                    />
                  </span>
                </div>
              )}
              {!!editablePersonalInfo.email?.trim() && (
                <div className={styles.ppContactItem}>
                  <span className={styles.ppContactLabel}>{targetLanguage === 'de' ? 'E-Mail:' : 'Email:'}</span>
                  <span className={styles.ppContactVal}>
                    <AutoSizeTextarea
                      value={editablePersonalInfo.email}
                      onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, email: val }))}
                    />
                  </span>
                </div>
              )}
              {!!editablePersonalInfo.website?.trim() && (
                <div className={styles.ppContactItem}>
                  <span className={styles.ppContactLabel}>{targetLanguage === 'de' ? 'Website:' : 'Website:'}</span>
                  <span className={styles.ppContactVal}>
                    <a href={ensureAbsoluteUrl(editablePersonalInfo.website)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'block', width: '100%' }}>
                      <AutoSizeTextarea
                        value={editablePersonalInfo.website}
                        onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, website: val }))}
                      />
                    </a>
                  </span>
                </div>
              )}
            </div>
            <div className={styles.ppContactCol}>
              {!!editablePersonalInfo.phone?.trim() && (
                <div className={styles.ppContactItem}>
                  <span className={styles.ppContactLabel}>{targetLanguage === 'de' ? 'Handy:' : 'Phone:'}</span>
                  <span className={styles.ppContactVal}>
                    <AutoSizeTextarea
                      value={formatPhoneNumber(editablePersonalInfo.phone)}
                      onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, phone: val }))}
                      onBlur={() => setEditablePersonalInfo((p: any) => ({ ...p, phone: formatPhoneNumber(p.phone) }))}
                    />
                  </span>
                </div>
              )}
              {!!editablePersonalInfo.linkedin?.trim() && (
                <div className={styles.ppContactItem}>
                  <span className={styles.ppContactLabel}>{targetLanguage === 'de' ? 'LinkedIn:' : 'LinkedIn:'}</span>
                  <span className={styles.ppContactVal}>
                    <a href={ensureAbsoluteUrl(editablePersonalInfo.linkedin)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'block', width: '100%' }}>
                      <AutoSizeTextarea
                        value={editablePersonalInfo.linkedin}
                        onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, linkedin: val }))}
                      />
                    </a>
                  </span>
                </div>
              )}
              {!!editablePersonalInfo.github?.trim() && (
                <div className={styles.ppContactItem}>
                  <span className={styles.ppContactLabel}>{targetLanguage === 'de' ? 'GitHub:' : 'GitHub:'}</span>
                  <span className={styles.ppContactVal}>
                    <a href={ensureAbsoluteUrl(editablePersonalInfo.github)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'block', width: '100%' }}>
                      <AutoSizeTextarea
                        value={editablePersonalInfo.github}
                        onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, github: val }))}
                      />
                    </a>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        {editablePersonalInfo.image_url ? (
          <div className={styles.ppHeaderRight}>
            <img src={editablePersonalInfo.image_url} alt="Profile" className={styles.ppAvatar} />
          </div>
        ) : null}
      </div>
    );
  }

  if (isGerman) {
    return (
      <div className={styles.germanHeader} style={headerContainerStyle} data-section-id="header">
        {headerControls}
        {!isMeasuring && isHeaderSettingsOpen && (
          <HeaderSettingsPopover
            popoverPosition={popoverPosition}
            headerStyles={headerStyles}
            setHeaderStyles={setHeaderStyles}
            onClose={() => setActiveSectionSettings(null)}
            editablePersonalInfo={editablePersonalInfo}
            setEditablePersonalInfo={setEditablePersonalInfo}
          />
        )}
        <div className={styles.germanHeaderLeft}>
          <h1 className={styles.germanName} style={nameStyleOverride}>
            <AutoSizeTextarea
              style={nameStyleOverride}
              value={editablePersonalInfo.full_name}
              onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, full_name: val }))}
            />
          </h1>
          <h2 className={styles.germanTitle} style={titleStyleOverride}>
            <AutoSizeTextarea
              style={titleStyleOverride}
              value={editablePersonalInfo.title}
              onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, title: val }))}
            />
          </h2>
          <div className={styles.germanContactGrid} style={contactsStyleOverride}>
            <div className={styles.germanContactCol}>
              {editablePersonalInfo.location && (
                <div className={styles.germanContactItem}>
                  <span className={styles.germanContactLabel}>Anschrift:</span>
                  <span className={styles.germanContactVal}>
                    <AutoSizeTextarea
                      value={editablePersonalInfo.location}
                      onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, location: val }))}
                    />
                  </span>
                </div>
              )}
              {editablePersonalInfo.email && (
                <div className={styles.germanContactItem}>
                  <span className={styles.germanContactLabel}>E-Mail:</span>
                  <span className={styles.germanContactVal}>
                    <AutoSizeTextarea
                      value={editablePersonalInfo.email}
                      onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, email: val }))}
                    />
                  </span>
                </div>
              )}
              {editablePersonalInfo.website && (
                <div className={styles.germanContactItem}>
                  <span className={styles.germanContactLabel}>Website:</span>
                  <span className={styles.germanContactVal}>
                    <a href={ensureAbsoluteUrl(editablePersonalInfo.website)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'block', width: '100%' }}>
                      <AutoSizeTextarea
                        value={editablePersonalInfo.website}
                        onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, website: val }))}
                      />
                    </a>
                  </span>
                </div>
              )}
            </div>
            <div className={styles.germanContactCol}>
              {editablePersonalInfo.phone && (
                <div className={styles.germanContactItem}>
                  <span className={styles.germanContactLabel}>Handy:</span>
                  <span className={styles.germanContactVal}>
                    <AutoSizeTextarea
                      value={formatPhoneNumber(editablePersonalInfo.phone)}
                      onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, phone: val }))}
                      onBlur={() => setEditablePersonalInfo((p: any) => ({ ...p, phone: formatPhoneNumber(p.phone) }))}
                    />
                  </span>
                </div>
              )}
              {editablePersonalInfo.linkedin && (
                <div className={styles.germanContactItem}>
                  <span className={styles.germanContactLabel}>LinkedIn:</span>
                  <span className={styles.germanContactVal}>
                    <a href={ensureAbsoluteUrl(editablePersonalInfo.linkedin)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'block', width: '100%' }}>
                      <AutoSizeTextarea
                        value={editablePersonalInfo.linkedin}
                        onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, linkedin: val }))}
                      />
                    </a>
                  </span>
                </div>
              )}
              {editablePersonalInfo.github && (
                <div className={styles.germanContactItem}>
                  <span className={styles.germanContactLabel}>GitHub:</span>
                  <span className={styles.germanContactVal}>
                    <a href={ensureAbsoluteUrl(editablePersonalInfo.github)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'block', width: '100%' }}>
                      <AutoSizeTextarea
                        value={editablePersonalInfo.github}
                        onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, github: val }))}
                      />
                    </a>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        {editablePersonalInfo.image_url ? (
          <div className={styles.germanHeaderRight}>
            <img src={editablePersonalInfo.image_url} alt="Profilbild" className={styles.germanAvatar} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.resumeHeader} style={headerContainerStyle} data-section-id="header">
      {headerControls}
      {!isMeasuring && isHeaderSettingsOpen && (
        <HeaderSettingsPopover
          popoverPosition={popoverPosition}
          headerStyles={headerStyles}
          setHeaderStyles={setHeaderStyles}
          onClose={() => setActiveSectionSettings(null)}
          editablePersonalInfo={editablePersonalInfo}
          setEditablePersonalInfo={setEditablePersonalInfo}
        />
      )}
      <div className={styles.headerMain}>
        {editablePersonalInfo.image_url && (
          <img src={editablePersonalInfo.image_url} alt="Profile" className={styles.profileAvatar} />
        )}
        <div className={styles.headerText}>
          <h2 style={nameStyleOverride}>
            <AutoSizeTextarea
              style={nameStyleOverride}
              value={editablePersonalInfo.full_name}
              onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, full_name: val }))}
            />
          </h2>
          <p className={styles.resumeTitle} style={titleStyleOverride}>
            <AutoSizeTextarea
              style={titleStyleOverride}
              value={editablePersonalInfo.title}
              onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, title: val }))}
            />
          </p>
        </div>
      </div>
      <div className={styles.resumeContacts} style={contactsStyleOverride}>
        {editablePersonalInfo.location && (
          <AutoSizeTextarea
            singleLine
            value={editablePersonalInfo.location}
            onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, location: val }))}
          />
        )}
        {editablePersonalInfo.email && (
          <>
            {editablePersonalInfo.location && <span>â€¢</span>}
            <a href={`mailto:${editablePersonalInfo.email}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'inline-block', verticalAlign: 'baseline' }}>
              <AutoSizeTextarea
                singleLine
                value={editablePersonalInfo.email}
                onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, email: val }))}
              />
            </a>
          </>
        )}
        {editablePersonalInfo.website && (
          <>
            {(editablePersonalInfo.location || editablePersonalInfo.email) && <span>â€¢</span>}
            <a href={ensureAbsoluteUrl(editablePersonalInfo.website)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'inline-block', verticalAlign: 'baseline' }}>
              <AutoSizeTextarea
                singleLine
                value={editablePersonalInfo.website}
                onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, website: val }))}
              />
            </a>
          </>
        )}
        {editablePersonalInfo.phone && (
          <>
            {(editablePersonalInfo.location || editablePersonalInfo.email || editablePersonalInfo.website) && <span>â€¢</span>}
            <a href={`tel:${editablePersonalInfo.phone}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'inline-block', verticalAlign: 'baseline' }}>
              <AutoSizeTextarea
                singleLine
                value={formatPhoneNumber(editablePersonalInfo.phone)}
                onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, phone: val }))}
                onBlur={() => setEditablePersonalInfo((p: any) => ({ ...p, phone: formatPhoneNumber(p.phone) }))}
              />
            </a>
          </>
        )}
        {editablePersonalInfo.linkedin && (
          <>
            {(editablePersonalInfo.location || editablePersonalInfo.email || editablePersonalInfo.website || editablePersonalInfo.phone) && <span>â€¢</span>}
            <a href={ensureAbsoluteUrl(editablePersonalInfo.linkedin)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'inline-block', verticalAlign: 'baseline' }}>
              <AutoSizeTextarea
                singleLine
                value={editablePersonalInfo.linkedin}
                onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, linkedin: val }))}
              />
            </a>
          </>
        )}
        {editablePersonalInfo.github && (
          <>
            {(editablePersonalInfo.location || editablePersonalInfo.email || editablePersonalInfo.website || editablePersonalInfo.phone || editablePersonalInfo.linkedin) && <span>â€¢</span>}
            <a href={ensureAbsoluteUrl(editablePersonalInfo.github)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'inline-block', verticalAlign: 'baseline' }}>
              <AutoSizeTextarea
                singleLine
                value={editablePersonalInfo.github}
                onChange={(val) => setEditablePersonalInfo((p: any) => ({ ...p, github: val }))}
              />
            </a>
          </>
        )}
      </div>
    </div>
  );
};
