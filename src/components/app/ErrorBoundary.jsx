import { Component } from "react";

// True if the two resetKeys arrays differ in length or in any entry.
// Object.is compares by value for primitives and by reference for objects.
function keysChanged(prev = [], next = []) {
    if (prev.length !== next.length) return true;
    return next.some((key, i) => !Object.is(key, prev[i]));
}

export class ErrorBoundary extends Component {
    state = { hasError: false, error: null };

    // Runs during render: the very next paint shows the fallback. Must stay pure.
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    // Side-effect hook: logging only, dev only. Never render the message or stack.
    componentDidCatch(error, info) {
        if (import.meta.env.DEV) {
            console.error(
                `[${this.props.name ?? "section"}]`,
                error,
                info.componentStack
            );
        }
    }

    // Auto-reset when resetKeys change, but ONLY if we were already errored
    // before this update. Otherwise a boundary that just caught an error in the
    // same update as a key change would reset itself immediately and loop.
    componentDidUpdate(prevProps, prevState) {
        if (
            this.state.hasError &&
            prevState.hasError &&
            keysChanged(prevProps.resetKeys, this.props.resetKeys)
        ) {
            this.reset();
        }
    }

    reset = () => this.setState({ hasError: false, error: null });

    render() {
        const { hasError, error } = this.state;
        const { children, fallback, name } = this.props;

        if (!hasError) return children;

        // Custom fallback as a function: it renders its own "Try again" button.
        if (typeof fallback === "function") {
            return fallback({ error, reset: this.reset, name });
        }

        // Custom fallback as a plain node.
        if (fallback != null) return fallback;

        // Minimal default. Kept dead simple: an error here would escape upward.
        return (
            <div role="alert">
                <p>This part of the page ran into a problem{name ? ` (${name})` : ""}.</p>
                <button type="button" onClick={this.reset}>
                    Try again
                </button>
            </div>
        );
    }
}