import { Component, type ReactNode } from "react";
import i18n from "@/i18n";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-4 bg-red-50 border border-red-200 rounded-xl dark:bg-red-900/30 dark:border-red-700">
          <h2 className="text-lg font-bold text-red-700 mb-2 dark:text-red-300">
            {i18n.t('common.error')}
          </h2>
          <pre className="text-sm text-red-600 whitespace-pre-wrap break-all bg-red-100 p-3 rounded-lg dark:text-red-400 dark:bg-red-900/40">
            {this.state.error?.message}
          </pre>
          <pre className="text-xs text-red-500 mt-2 whitespace-pre-wrap break-all bg-red-50 p-2 rounded dark:text-red-400 dark:bg-red-900/30">
            {this.state.error?.stack?.slice(0, 500)}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
          >
            {i18n.t('common.retry')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
