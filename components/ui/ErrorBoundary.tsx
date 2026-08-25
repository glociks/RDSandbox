import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './Shared';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-zinc-950/90 backdrop-blur-xl p-4 font-normal text-zinc-100">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-400 pb-3 border-b border-zinc-800">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Simulation Render Exception</h2>
                <p className="text-xs text-zinc-400">An unexpected error interrupted the simulation interface.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-light">
              We encountered a runtime graphics or simulation error. You can reset to default parameters or reload the application below.
            </p>

            {this.state.error && (
              <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-3 text-xs space-y-2">
                <div className="flex items-center justify-between text-zinc-300 font-mono text-[11px]">
                  <span className="text-red-400 truncate">{this.state.error.name}: {this.state.error.message}</span>
                  <button
                    type="button"
                    onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                    className="text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer"
                  >
                    {this.state.showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
                {this.state.showDetails && this.state.error.stack && (
                  <pre className="text-[10px] text-zinc-400 overflow-x-auto max-h-36 custom-scrollbar whitespace-pre-wrap font-mono pt-2 border-t border-zinc-800/60">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button
                size="sm"
                variant="secondary"
                onClick={this.handleReset}
                className="gap-1.5 font-normal text-xs cursor-pointer"
              >
                <RotateCcw size={12} /> Reset Simulation State
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={this.handleReload}
                className="gap-1.5 font-normal text-xs bg-indigo-600 hover:bg-indigo-500 cursor-pointer shadow"
              >
                <RefreshCw size={12} /> Reload Sandbox
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
