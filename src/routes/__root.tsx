import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Ingenious Academy — Learn Smart. Understand Better. Score Higher." },
      {
        name: "description",
        content:
          "Ingenious Academy private learning platform: lectures, notes, tests and results for students.",
      },
      { property: "og:title", content: "Ingenious Academy — Learn Smart. Understand Better. Score Higher." },
      { name: "twitter:title", content: "Ingenious Academy — Learn Smart. Understand Better. Score Higher." },
      { name: "description", content: "Ingenious Academy Portal is a private educational web app for coaching academies." },
      { property: "og:description", content: "Ingenious Academy Portal is a private educational web app for coaching academies." },
      { name: "twitter:description", content: "Ingenious Academy Portal is a private educational web app for coaching academies." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/exNH2WDgBAaypl0grsnFWLUAV3j1/social-images/social-1780916141020-1775563207182.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/exNH2WDgBAaypl0grsnFWLUAV3j1/social-images/social-1780916141020-1775563207182.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthReactiveInvalidator() {
  const router = useRouter();
  useEffect(() => {
    let lastUserId: string | null | undefined = undefined;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Only react to actual sign-in / sign-out transitions to avoid
      // invalidation loops from INITIAL_SESSION / TOKEN_REFRESHED events.
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
      const nextUserId = session?.user?.id ?? null;
      if (lastUserId === undefined) {
        lastUserId = nextUserId;
        return;
      }
      if (nextUserId === lastUserId) return;
      lastUserId = nextUserId;
      router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthReactiveInvalidator />
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
