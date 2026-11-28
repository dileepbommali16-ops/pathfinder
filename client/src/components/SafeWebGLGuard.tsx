import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from "react";

let cachedWebGLSupport: boolean | null = null;

export function isWebGLAvailable(forceRecheck = false): boolean {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return false;
    }
    if (!forceRecheck && cachedWebGLSupport !== null) {
        return cachedWebGLSupport;
    }

    try {
        const canvas = document.createElement("canvas");
        const opts: WebGLContextAttributes = { failIfMajorPerformanceCaveat: false };
        const gl =
            (canvas.getContext("webgl2", opts) as WebGL2RenderingContext | null) ||
            (canvas.getContext("webgl", opts) as WebGLRenderingContext | null) ||
            (canvas.getContext("experimental-webgl", opts) as WebGLRenderingContext | null);

        if (!gl || gl.isContextLost()) {
            cachedWebGLSupport = false;
            return false;
        }

        const loseContext = gl.getExtension("WEBGL_lose_context");
        if (loseContext) loseContext.loseContext();

        cachedWebGLSupport = true;
        return true;
    } catch {
        cachedWebGLSupport = false;
        return false;
    }
}

interface WebGLErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface WebGLErrorBoundaryState {
    hasError: boolean;
}

export class WebGLErrorBoundary extends Component<
    WebGLErrorBoundaryProps,
    WebGLErrorBoundaryState
> {
    state: WebGLErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): WebGLErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
        console.warn("[Pathfinder] 3D scene fell back to 2D:", error.message);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return this.props.fallback ?? null;
        }
        return this.props.children;
    }
}

interface SafeWebGLGuardProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export const SafeWebGLGuard: React.FC<SafeWebGLGuardProps> = ({
    children,
    fallback,
}) => {
    const [supported, setSupported] = useState<boolean | null>(null);

    useEffect(() => {
        setSupported(isWebGLAvailable());
    }, []);

    if (!supported) {
        return <>{fallback ?? null}</>;
    }

    return <WebGLErrorBoundary fallback={fallback}>{children}</WebGLErrorBoundary>;
};

export default SafeWebGLGuard;