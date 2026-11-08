import { useState, type KeyboardEvent } from 'react';
import { type SelectOption } from '../api/types';

type EditableFieldProps = {
  label: string;
  value: string | null;
  displayValue?: string | null;
  placeholder?: string;
  isLink?: boolean;
  inputType?: 'text' | 'number' | 'date';
  options?: SelectOption[];
  onSave: (value: string) => Promise<void>;
};

export const EditableField = ({
  label,
  value,
  displayValue,
  placeholder = 'Vide',
  isLink,
  inputType = 'text',
  options,
  onSave,
}: EditableFieldProps) => {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (nextValue = draft) => {
    if (nextValue === null || nextValue.trim() === (value ?? '')) {
      setDraft(null);

      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(nextValue.trim());
      setDraft(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      void save();
    }

    if (event.key === 'Escape') {
      setDraft(null);
      setError(null);
    }
  };

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {draft !== null && options ? (
        <select
          className="field-input"
          autoFocus
          disabled={saving}
          value={draft}
          onChange={(event) => void save(event.target.value)}
          onBlur={() => setDraft(null)}
        >
          {!value && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : draft !== null ? (
        <input
          type={inputType}
          className="field-input"
          autoFocus
          disabled={saving}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.target.select()}
          onBlur={() => void save()}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <button
          type="button"
          className={`field-value ${value ? '' : 'field-value-empty'}`}
          title="Cliquer pour modifier"
          onClick={() => setDraft(value ?? '')}
        >
          {value ? (displayValue ?? (isLink ? value.replace(/^https?:\/\/(www\.)?/, '') : value)) : placeholder}
        </button>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
};
