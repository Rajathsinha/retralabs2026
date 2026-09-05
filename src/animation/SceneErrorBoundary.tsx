import { Component, type ReactNode } from 'react';

interface SceneErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
}

/** Catches WebGL/Three.js failures and renders static fallback instead of crashing the page. */
export class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
