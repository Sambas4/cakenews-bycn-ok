import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  // Explicitly declare props to satisfy TS in strict environments where React.Component inheritance might be ambiguous
  public declare props: Readonly<ErrorBoundaryProps>;

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
          return this.props.fallback;
      }
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-600 mb-6" />
          <h2 className="text-xl font-black uppercase text-white mb-2 tracking-tight">Signal Interrompu</h2>
          <p className="text-white/50 text-xs font-mono mb-8 uppercase">Une erreur critique est survenue dans ce module.</p>
          
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-black uppercase text-xs tracking-widest active:scale-95 transition-transform"
          >
            <RefreshCw className="w-4 h-4" /> Relancer l'app
          </button>
          
          {process.env.NODE_ENV === 'development' && (
              <pre className="mt-8 p-4 bg-zinc-900 rounded-lg text-[10px] text-red-400 text-left w-full overflow-auto max-h-40">
                  {this.state.error?.toString()}
              </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;