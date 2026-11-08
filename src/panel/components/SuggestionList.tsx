import { AddButton } from './AddButton';

export type Suggestion = {
  key: string;
  title: string;
  detail: string;
  actionLabel: string;
  onAction: () => Promise<void>;
};

type SuggestionListProps = {
  suggestions: Suggestion[];
};

export const SuggestionList = ({ suggestions }: SuggestionListProps) => {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section className="section">
      <h3>Depuis LinkedIn</h3>
      <ul className="suggestion-list">
        {suggestions.map((suggestion) => (
          <li key={suggestion.key} className="suggestion">
            <span className="suggestion-text">
              <span className="suggestion-title">{suggestion.title}</span>
              <span className="suggestion-detail">{suggestion.detail}</span>
            </span>
            <AddButton label={suggestion.actionLabel} onAdd={suggestion.onAction} />
          </li>
        ))}
      </ul>
    </section>
  );
};
