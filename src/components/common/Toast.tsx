import { useUIStore } from "@/stores/uiStore";

const typeStyles = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-gray-800",
};

export function Toast() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`px-4 py-2 rounded-lg text-white text-sm shadow-lg cursor-pointer transition-all animate-[slideUp_0.3s_ease-out] ${typeStyles[toast.type]}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
