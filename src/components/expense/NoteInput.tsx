import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNoteHistoryStore } from "@/stores/noteHistoryStore";

interface NoteInputProps {
  value: string;
  onChange: (value: string) => void;
}

const PREVIEW_COUNT = 3;

export function NoteInput({ value, onChange }: NoteInputProps) {
  const { t } = useTranslation();
  const noteHistory = useNoteHistoryStore((s) => s.notes);
  const removeNote = useNoteHistoryStore((s) => s.removeNote);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const previewNotes = noteHistory.slice(0, PREVIEW_COUNT);
  const restNotes = noteHistory.slice(PREVIEW_COUNT);
  const hasMore = restNotes.length > 0;

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {t('expense.noteOptional')}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 200))}
        placeholder={t('expense.notePlaceholder')}
        className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
          placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:bg-gray-700 dark:border-gray-600"
      />
      {value.length > 0 && (
        <span className="text-2xs text-gray-400 dark:text-gray-500">{value.length}/200</span>
      )}

      {/* Note history quick-select */}
      {noteHistory.length > 0 && (
        <div className="mt-1 space-y-1.5">
          {/* Always show first 3 notes */}
          <div className="flex flex-wrap gap-1.5">
            {previewNotes.map((n) => (
              <NoteTag key={n} note={n} onSelect={onChange} onRemove={removeNote} />
            ))}
          </div>

          {/* Expandable rest */}
          {hasMore && (
            <>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${isHistoryOpen ? "rotate-90" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                {isHistoryOpen ? t('expense.hideRecentNotes') : `${t('expense.showRecentNotes')} (${restNotes.length})`}
              </button>
              {isHistoryOpen && (
                <div className="flex flex-wrap gap-1.5">
                  {restNotes.map((n) => (
                    <NoteTag key={n} note={n} onSelect={onChange} onRemove={removeNote} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NoteTag({ note, onSelect, onRemove }: { note: string; onSelect: (v: string) => void; onRemove: (v: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(note)}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300
        rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors max-w-[160px]"
    >
      <span className="truncate">{note}</span>
      <span
        onClick={(e) => { e.stopPropagation(); onRemove(note); }}
        className="shrink-0 text-gray-400 dark:text-gray-500 hover:text-red-400 dark:hover:text-red-400 transition-colors"
      >
        ×
      </span>
    </button>
  );
}
