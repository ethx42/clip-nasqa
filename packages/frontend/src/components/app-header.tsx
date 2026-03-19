"use client";

import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { HamburgerMenu } from "@/components/hamburger-menu";
import { IdentityEditor } from "@/components/session/identity-editor";
import { useIdentity } from "@/hooks/use-identity";

interface AppHeaderProps {
  /** Session title + live indicator, rendered only when inside a session. */
  sessionContext?: React.ReactNode;
  /** Host share button — only provided on host pages. */
  shareSlot?: React.ReactNode;
}

const LOGO_PATHS = {
  path1:
    "M582.687,151.44c88.633,46.208 124.112,154.761 79.876,244.395c-51.925,105.214 -114.549,232.104 -139.582,282.828c-6.796,13.77 -20.916,22.393 -36.269,22.151c-53.688,-0.848 -182.101,-2.876 -273.696,-4.323c-22.082,-0.349 -42.459,-11.945 -54.037,-30.752c-11.578,-18.807 -12.754,-42.223 -3.12,-62.096c50.081,-103.308 132.337,-272.989 191.142,-394.294c18.364,-37.882 51.28,-66.717 91.248,-79.936c39.969,-13.219 83.586,-9.697 120.916,9.764c7.802,4.067 15.667,8.168 23.523,12.263Z",
  path2:
    "M422.18,872.922c-89.217,-45.069 -126.083,-153.16 -82.998,-243.352c50.574,-105.87 111.568,-233.551 135.95,-284.592c6.619,-13.856 20.627,-22.659 35.983,-22.613c53.694,0.161 182.123,0.545 273.729,0.819c22.085,0.066 42.609,11.401 54.426,30.058c11.817,18.657 13.294,42.056 3.915,62.051c-48.754,103.941 -128.831,274.661 -186.078,396.708c-17.877,38.114 -50.421,67.368 -90.217,81.098c-39.796,13.73 -83.455,10.767 -121.031,-8.215c-7.853,-3.967 -15.771,-7.967 -23.678,-11.961Z",
};

function ClipLogo() {
  return (
    <svg
      viewBox="100 85 824 855"
      className="h-6 w-auto"
      fill="none"
      stroke="currentColor"
      strokeWidth={65}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={LOGO_PATHS.path1} />
      <path d={LOGO_PATHS.path2} />
    </svg>
  );
}

/**
 * Unified 56px application header bar.
 *
 * Left: Logo + "CLIP" text + optional session context (title + live indicator)
 * Right: Optional share slot + HamburgerMenu + IdentityEditor (profile)
 *
 * When sessionContext is provided, clicking the logo shows a confirmation dialog
 * before navigating home (to prevent accidental session exit).
 */
export function AppHeader({ sessionContext, shareSlot }: AppHeaderProps) {
  const router = useRouter();
  const { name: savedName } = useIdentity();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const firstName = savedName?.split(" ")[0] ?? null;

  function handleLogoClick(e: React.MouseEvent) {
    if (sessionContext) {
      e.preventDefault();
      setLeaveDialogOpen(true);
    }
  }

  function handleLeaveConfirm() {
    setLeaveDialogOpen(false);
    router.push("/");
  }

  return (
    <>
      <header className="flex h-14 w-full items-center justify-between bg-muted px-4 shadow-sm sm:px-6">
        {/* Left: Logo + brand + session context */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/"
            onClick={handleLogoClick}
            className="flex shrink-0 items-center gap-2 text-indigo-500 dark:text-amber-400 transition-opacity hover:opacity-80"
            aria-label="clip — go home"
          >
            <ClipLogo />
            <span className="hidden font-bold tracking-tight text-indigo-500 dark:text-amber-400 sm:inline">
              CLIP
            </span>
          </Link>

          {sessionContext && (
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-muted-foreground/40 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <div className="flex min-w-0 items-center gap-2">{sessionContext}</div>
            </div>
          )}
        </div>

        {/* Right: share + profile + hamburger (hamburger at the end) */}
        <div className="flex shrink-0 items-center gap-1">
          {shareSlot && <div className="mr-2">{shareSlot}</div>}
          <div className="flex items-center gap-1.5">
            {firstName && (
              <span className="hidden text-sm font-medium text-foreground sm:inline">
                {firstName}
              </span>
            )}
            <IdentityEditor />
          </div>
          <HamburgerMenu />
        </div>
      </header>

      {/* Leave session confirmation dialog */}
      <Dialog.Root open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-xs rounded-2xl border border-border bg-card p-6 shadow-xl">
              <Dialog.Title className="mb-2 text-lg font-bold text-foreground">
                Leave this session?
              </Dialog.Title>
              <Dialog.Description className="mb-5 text-sm text-muted-foreground">
                You will be taken back to the home page.
              </Dialog.Description>
              <div className="flex gap-2">
                <button
                  onClick={handleLeaveConfirm}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  Leave
                </button>
                <button
                  onClick={() => setLeaveDialogOpen(false)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
