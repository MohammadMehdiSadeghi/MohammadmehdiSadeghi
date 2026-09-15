import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0F172B] min-h-[calc(100vh-116px)] text-[#90A1B9] gap-4">
          <p className="text-[16px]">Something went wrong.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-4 py-2 rounded-md border border-[#90A1B9] text-[#90A1B9] hover:text-white hover:border-white transition-all duration-200 cursor-pointer"
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
