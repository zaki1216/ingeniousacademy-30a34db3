import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & Security — Ingenious Academy" },
      {
        name: "description",
        content:
          "How Ingenious Academy handles student data, authentication, and access control on its private learning portal.",
      },
      { property: "og:title", content: "Privacy & Security — Ingenious Academy" },
      {
        property: "og:description",
        content:
          "How Ingenious Academy handles student data, authentication, and access control on its private learning portal.",
      },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <div className="text-sm leading-relaxed text-muted-foreground space-y-2">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Privacy & Security</h1>
          <p className="text-sm text-muted-foreground">
            This page is maintained by Ingenious Academy to answer common security and privacy
            questions about the student portal. It describes current practices and is not an
            independent certification.
          </p>
        </header>

        <Section title="What this app is">
          <p>
            Ingenious Academy Portal is a private learning platform used by enrolled students and
            academy staff. Access is restricted to invited accounts; there is no public sign-up.
          </p>
        </Section>

        <Section title="Access & authentication">
          <ul className="list-disc pl-5 space-y-1">
            <li>Accounts are created by academy administrators.</li>
            <li>Sign-in uses email/password authentication managed by our backend provider.</li>
            <li>
              Application data is protected by row-level security so each student can only read
              and modify their own records, except where an administrator role is required.
            </li>
            <li>Administrative roles are stored server-side and verified on every privileged action.</li>
          </ul>
        </Section>

        <Section title="Data we store">
          <ul className="list-disc pl-5 space-y-1">
            <li>Profile details provided by the academy (name, contact numbers, class/standard).</li>
            <li>Learning activity: lecture views, quiz attempts, test results, and gamification stats.</li>
            <li>Operational records such as attendance and announcements.</li>
          </ul>
          <p>
            Sensitive answer keys, role assignments, and reward calculations are processed
            server-side and are not exposed to the browser.
          </p>
        </Section>

        <Section title="Subprocessors & hosting">
          <p>
            The application is hosted on Lovable and uses a managed Postgres backend for storage,
            authentication, and serverless functions. No third-party advertising or analytics SDKs
            are bundled with the student app.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            We use first-party cookies and local storage only for authentication session
            persistence. No tracking or advertising cookies are set by this application.
          </p>
        </Section>

        <Section title="Data requests & contact">
          <p>
            For data access, correction, or deletion requests, please contact your academy
            administrator. They will coordinate with the portal operators on your behalf.
          </p>
        </Section>

        <footer className="pt-8 border-t text-xs text-muted-foreground">
          <Link to="/" className="underline">
            Back to home
          </Link>
        </footer>
      </div>
    </main>
  );
}
