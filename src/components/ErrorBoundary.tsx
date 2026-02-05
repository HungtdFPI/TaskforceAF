import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui/button";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                    <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg border border-red-100 text-center">
                        <h1 className="text-2xl font-bold text-red-600 mb-4">Đã xảy ra lỗi!</h1>
                        <p className="text-slate-600 mb-6">Xin lỗi, ứng dụng đã gặp sự cố không mong muốn.</p>
                        <div className="bg-slate-100 p-4 rounded text-left text-xs font-mono text-slate-700 overflow-auto max-h-40 mb-6">
                            {this.state.error?.message}
                        </div>
                        <Button onClick={() => window.location.reload()} className="w-full">
                            Tải lại trang
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
