import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  DEBUGGER_LANGUAGES,
  getDebuggerLanguage,
  type DebuggerLanguage,
} from '../../data/languages';

interface LanguageDropdownProps {
  value: DebuggerLanguage;
  onChange: (language: DebuggerLanguage) => void;
  /** Languages without content remain visible but are marked as unavailable. */
  available?: readonly DebuggerLanguage[];
  ariaLabel?: string;
}

/** Shared selector for reference implementations and custom Judge0 submissions. */
export function LanguageDropdown({
  value,
  onChange,
  available = DEBUGGER_LANGUAGES.map(({ id }) => id),
  ariaLabel = 'Programming language',
}: LanguageDropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = getDebuggerLanguage(value);

  return (
    <div className="lang-dropdown">
      <button type="button" className="lang-dropdown-trigger" aria-haspopup="listbox"
        aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen((isOpen) => !isOpen)}>
        <span className="lang-dropdown-icon">{selected.icon}</span>
        <span className="lang-dropdown-label">{selected.label}</span>
        <ChevronDown size={14} className={`lang-chevron ${open ? 'open' : ''}`} />
      </button>
      {open && <>
        <div className="lang-dropdown-backdrop" onClick={() => setOpen(false)} />
        <ul className="lang-dropdown-menu" role="listbox" aria-label={ariaLabel}>
          {DEBUGGER_LANGUAGES.map((language) => {
            const isAvailable = available.includes(language.id);
            return <li key={language.id} role="option" aria-selected={language.id === value}>
              <button type="button" disabled={!isAvailable}
                className={`lang-dropdown-item ${language.id === value ? 'active' : ''} ${!isAvailable ? 'unavailable' : ''}`}
                onClick={() => { onChange(language.id); setOpen(false); }}>
                <span className="lang-dropdown-icon">{language.icon}</span>
                <span>{language.label}</span>
                {!isAvailable && <small>Coming soon</small>}
                {language.id === value && <Check size={14} className="lang-check" />}
              </button>
            </li>;
          })}
        </ul>
      </>
      }
    </div>
  );
}
