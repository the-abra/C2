'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: React.ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Tactical error boundary that catches rendering failures in volatile
 * visual components (ReactFlow graph, timeline, etc.) and renders a
 * recovery UI instead of crashing the entire dashboard.
 */
export class TacticalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[TacticalErrorBoundary] Component crash:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-card/50 border border-destructive/20 rounded-lg p-8">
          <div className="size-16 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center justify-center">
            <AlertTriangle className="size-8 text-destructive" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-sm font-black font-mono uppercase tracking-wider text-destructive">
              {this.props.fallbackTitle || 'Render Fault Detected'}
            </h3>
            <p className="text-[10px] font-mono text-muted-foreground max-w-sm">
              {this.state.error?.message || 'An unexpected error occurred in this component.'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="font-mono text-xs uppercase gap-2"
          >
            <RefreshCw className="size-3" />
            Attempt Recovery
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
