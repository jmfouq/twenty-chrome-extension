import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { type TwentyClient } from '../api/TwentyClient';
import { createNote, createTask, findActivities } from '../api/twentyApi';
import { type ActivityItem, type ActivityTarget } from '../api/types';

type ActivityPanelProps = {
  client: TwentyClient;
  target: ActivityTarget;
  defaultTitle: string | null;
};

type DraftKind = 'note' | 'task';

const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminée',
};

export const ActivityPanel = ({ client, target, defaultTitle }: ActivityPanelProps) => {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftKind, setDraftKind] = useState<DraftKind | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);
  const targetKey = JSON.stringify(target);

  const load = useCallback(async () => {
    try {
      setItems(await findActivities(client, target));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
    // `target` is compared through `targetKey`.
  }, [client, targetKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDraft = (kind: DraftKind) => {
    setDraftKind(kind);
    setTitle(defaultTitle ?? '');
    setBody('');
    setDueAt('');
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (draftKind === 'note') {
        await createNote(client, target, { title, body });
      } else {
        await createTask(client, target, {
          title,
          body,
          dueAt: dueAt ? new Date(`${dueAt}T09:00:00`).toISOString() : null,
        });
      }

      setDraftKind(null);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="subsection">
      <div className="subsection-header">
        <h4>Notes et tâches</h4>
        <div className="inline-actions">
          <button type="button" className="button-small" onClick={() => openDraft('note')}>
            + Note
          </button>
          <button type="button" className="button-small" onClick={() => openDraft('task')}>
            + Tâche
          </button>
        </div>
      </div>

      {draftKind && (
        <form className="draft-form" onSubmit={(event) => void submit(event)}>
          <input
            autoFocus
            required
            placeholder={draftKind === 'note' ? 'Titre de la note' : 'Titre de la tâche'}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            rows={4}
            placeholder="Contenu (optionnel)"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          {draftKind === 'task' && (
            <label className="date-label">
              Échéance
              <input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
            </label>
          )}
          <div className="inline-actions">
            <button type="button" className="button-ghost" onClick={() => setDraftKind(null)}>
              Annuler
            </button>
            <button type="submit" className="button-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="error-text">{error}</p>}
      {!error && items === null && <p className="muted">Chargement…</p>}
      {items?.length === 0 && !draftKind && <p className="muted">Aucune note ni tâche.</p>}
      <ul className="item-list">
        {items?.slice(0, 8).map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <span className={`activity-kind activity-kind-${item.kind}`}>
              {item.kind === 'note' ? 'Note' : 'Tâche'}
            </span>
            <span className="activity-title">{item.title || 'Sans titre'}</span>
            <span className="item-meta">
              {item.kind === 'task'
                ? [
                    item.status && (TASK_STATUS_LABELS[item.status] ?? item.status),
                    item.dueAt && `échéance ${new Date(item.dueAt).toLocaleDateString('fr-FR')}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : new Date(item.createdAt).toLocaleDateString('fr-FR')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
