import { useState } from 'react';

type AddButtonProps = {
  label: string;
  title?: string;
  onAdd: () => Promise<void>;
};

export const AddButton = ({ label, title, onAdd }: AddButtonProps) => {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setAdding(true);
    setError(null);

    try {
      await onAdd();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : String(addError));
    } finally {
      setAdding(false);
    }
  };

  return (
    <span className="add-button-wrapper">
      <button
        type="button"
        className="button-secondary"
        title={error ?? title}
        disabled={adding}
        onClick={() => void handleClick()}
      >
        {adding ? '…' : label}
      </button>
      {error && <span className="field-error">{error}</span>}
    </span>
  );
};
