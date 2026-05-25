import { useTranslation } from "react-i18next";

interface NoteInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function NoteInput({ value, onChange }: NoteInputProps) {
  const { t } = useTranslation();

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
    </div>
  );
}
