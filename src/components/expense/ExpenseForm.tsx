import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { SourcePicker } from "./SourcePicker";
import { CategoryPicker } from "./CategoryPicker";
import { NoteInput } from "./NoteInput";
import { DateQuickSelect } from "./DateQuickSelect";
import { useExpenseStore } from "@/stores/expenseStore";
import { useUIStore } from "@/stores/uiStore";
import { formatAmount } from "@/utils/format";
import { useSettingsStore, CURRENCY_SYMBOLS } from "@/stores/settingsStore";
import { formatDate } from "date-fns";

export function ExpenseForm() {
  const { t } = useTranslation();
  const currentCurrency = useSettingsStore((s) => s.settings?.defaultCurrency || "CNY");
  const [amount, setAmount] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const selectedDate = useUIStore((s) => s.selectedDate);
  const setSelectedDate = useUIStore((s) => s.setSelectedDate);
  const [date, setDate] = useState(selectedDate);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDateChange = useCallback((d: string) => {
    setDate(d);
    setSelectedDate(d);
  }, [setSelectedDate]);

  const addExpense = useExpenseStore((s) => s.addExpense);
  const addToast = useUIStore((s) => s.addToast);

  // Parse display amount to cents
  const handleAmountChange = useCallback((value: string) => {
    // Only allow digits and at most one dot
    const cleaned = value.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;

    setDisplayAmount(cleaned);

    if (cleaned === "" || cleaned === ".") {
      setAmount("");
      return;
    }
    const num = parseFloat(cleaned);
    if (isNaN(num)) return;
    setAmount(String(Math.round(num * 100)));
  }, []);

  const handleNumpadInput = useCallback((key: string) => {
    if (key === "backspace") {
      setDisplayAmount((prev) => prev.slice(0, -1));
      setAmount((prev) => {
        if (prev.length <= 1) return "";
        return prev.slice(0, -1);
      });
      return;
    }
    if (key === "." && displayAmount.includes(".")) return;
    if (key === "." && displayAmount === "") {
      setDisplayAmount("0.");
      setAmount("0");
      return;
    }
    const newDisplay = displayAmount + key;
    handleAmountChange(newDisplay);
  }, [displayAmount, handleAmountChange]);

  const handleSubmit = async () => {
    if (!amount || !sourceId) {
      addToast(t('expense.needAmount'), "error");
      return;
    }
    setIsSubmitting(true);
    try {
      await addExpense({
        amount: Number(amount),
        currency: "CNY",
        sourceId,
        categoryId,
        note,
        date,
      });
      addToast(t('expense.success'), "success");
      // Reset form for next entry
      setAmount("");
      setDisplayAmount("");
      setCategoryId(null);
      setNote("");
      const today = formatDate(new Date(), "yyyy-MM-dd");
      setDate(today);
      setSelectedDate(today);
    } catch (e) {
      addToast(t('expense.fail', { error: String(e) }), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut: Enter (or Ctrl+Enter) to submit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "NumpadEnter") {
        e.preventDefault();
        handleSubmit();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [amount, sourceId, categoryId, note, date]);

  const amountInYuan = amount ? (Number(amount) / 100).toFixed(2) : "0.00";

  return (
    <div className="p-4 space-y-4">
      {/* Amount Display & Input */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-gray-400 dark:text-gray-500 text-sm">{CURRENCY_SYMBOLS[currentCurrency]}</span>
          <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {displayAmount || "0"}
          </span>
          <span className="text-gray-400 dark:text-gray-500 text-sm ml-auto">
            = {amountInYuan}
          </span>
        </div>

        {/* Numpad for mobile */}
        <div className="grid grid-cols-3 gap-2 lg:hidden">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map(
            (key) => (
              <button
                key={key}
                type="button"
                onTouchStart={(e) => e.preventDefault()}
                onClick={() =>
                  key === "⌫"
                    ? handleNumpadInput("backspace")
                    : handleNumpadInput(key)
                }
                className="h-12 flex items-center justify-center text-lg font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg
                  active:bg-gray-200 dark:active:bg-gray-600 transition-colors select-none"
              >
                {key}
              </button>
            ),
          )}
        </div>

        {/* Desktop: regular input */}
        <input
          type="text"
          inputMode="decimal"
          value={displayAmount}
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder={t('expense.amount')}
          className="hidden lg:block w-full mt-2 text-2xl bg-transparent border-none outline-none
            placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100 font-bold text-center"
        />
      </div>

      {/* Payment Source Picker */}
      <SourcePicker selectedId={sourceId} onSelect={setSourceId} />

      {/* Category Picker */}
      <CategoryPicker selectedId={categoryId} onSelect={setCategoryId} />

      {/* Note Input */}
      <NoteInput value={note} onChange={setNote} />

      {/* Date Quick Select */}
      <DateQuickSelect value={date} onChange={handleDateChange} />

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !amount || !sourceId}
        className="w-full py-3 bg-primary-600 text-white font-semibold rounded-xl
          hover:bg-primary-700 active:bg-primary-800 disabled:opacity-40
          disabled:cursor-not-allowed transition-colors text-base"
      >
        {isSubmitting ? t('expense.submitting') : amount ? `${t('expense.record')} ${formatAmount(Number(amount))}` : t('expense.submit')}
      </button>
    </div>
  );
}
