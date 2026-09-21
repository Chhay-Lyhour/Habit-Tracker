import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
    const isOnline = useOnlineStatus();

    // The wrapper with role="status" always stays mounted. Only its contents
    // change, so screen readers announce the swap. While online it is empty
    // and takes no space.
    return (
        <div role="status">
            {!isOnline && (
                <div className="flex items-start gap-3 border-b border-streak/30 bg-streak/10 px-4 py-3">
                    <WifiOff
                        className="mt-0.5 h-5 w-5 shrink-0 text-streak"
                        aria-hidden="true"
                    />
                    <p className="min-w-0 break-words text-sm font-semibold text-foreground">
                        {"You're offline. New habits will be saved and synced when you're back."}
                    </p>
                </div>
            )}
        </div>
    );
}