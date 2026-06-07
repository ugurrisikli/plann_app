"use client";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-6">
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-red-600 text-lg font-bold">!</span>
              </div>
              <h2 className="font-semibold text-zinc-900">Bir şeyler ters gitti</h2>
              <p className="text-sm text-zinc-500">{this.state.message || "Beklenmedik bir hata oluştu."}</p>
              <button
                onClick={() => this.setState({ hasError: false, message: "" })}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm hover:bg-zinc-700"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
