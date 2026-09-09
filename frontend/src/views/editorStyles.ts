import base from './EditorNew.module.css';
import pp from './EditorNewPixelPerfect.module.css';
import de from './EditorNewGerman.module.css';

/**
 * Merged style namespace for the CV editor. Template-specific rules live in
 * their own modules (Pixel Perfect, German-Style) while shared/base classes
 * remain in EditorNew.module.css. Consumers import this single object.
 *
 * Note: classes that participate in cross-template compound selectors
 * (e.g. `.ppHeader:hover .sectionControls`) must stay defined in the base
 * module so their hashed name matches the DOM.
 */
const editorStyles = { ...base, ...de, ...pp } as Record<string, string>;

export default editorStyles;
