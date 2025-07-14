import React from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
}

class RouteErrorBoundary extends React.Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Route Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
          <div className="max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="mb-8">
              <Icons.AlertTriangle className="w-24 h-24 text-red-400 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Route Error</h1>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Something went wrong</h2>
            </div>

            {/* Error Message */}
            <div className="mb-8">
              <p className="text-gray-600 mb-4">
                There was an error loading this page. This might be due to a routing issue or a temporary problem.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                  <div className="flex items-start">
                    <Icons.Bug className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-red-700">
                      <p className="font-medium mb-1">Debug Information:</p>
                      <pre className="text-xs bg-red-100 p-2 rounded mt-2 overflow-x-auto">
                        {this.state.error.message}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
              >
                <Icons.RefreshCw className="w-5 h-5 mr-2" />
                Refresh Page
              </button>
              
              <Link
                to="/"
                className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
              >
                <Icons.Home className="w-5 h-5 mr-2" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
