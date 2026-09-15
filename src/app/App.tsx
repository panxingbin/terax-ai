import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { CloseDialogs } from "./components/CloseDialogs";
import { OsIcon } from "./components/OsIcon";
import { WindowControls } from "./components/WindowControls";
import { useWorkspaceCwd } from "@/modules/tabs";
import { useSettings } from "@/modules/settings";
import { useTheme } from "@/modules/theme";
import { useVibrancy } from "@/lib/vibrancy";
import { cn } from "@/lib/utils";

export default function App() {
  const { ready } = useSettings();
  const { theme } = useTheme();
  const { vibrancy } = useVibrancy();
  const { cwd } = useWorkspaceCwd();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (ready) {
      setIsReady(true);
    }
  }, [ready]);

  if (!isReady) {
    return null;
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "h-screen w-screen overflow-hidden",
          theme === "dark" ? "dark" : "light"
        )}
        data-vibrancy={vibrancy}
      >
        <WindowControls />
        <AppShell />
        <Toaster />
        <CloseDialogs />
        <OsIcon />
      </div>
    </TooltipProvider>
  );
}