import { Component, type ReactNode } from "react";

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
        <div className="p-8 m-4 bg-red-50 border border-red-200 rounded-xl">
          <h2 className="text-lg font-bold text-red-700 mb-2">应用出错了</h2>
          <pre className="text-sm text-red-600 whitespace-pre-wrap break-all bg-red-100 p-3 rounded-lg">
            {this.state.error?.message}
          </pre>
          <pre className="text-xs text-red-500 mt-2 whitespace-pre-wrap break-all bg-red-50 p-2 rounded">
            {this.state.error?.stack?.slice(0, 500)}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
