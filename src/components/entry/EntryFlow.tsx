import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EntryStage } from "./EntryStage";
import { SplashScene } from "./SplashScene";
import { StoryIntroScene } from "./StoryIntroScene";
import { AcademyGateScene } from "./AcademyGateScene";
import { RegistrationScene } from "./RegistrationScene";
import { LoadingScene } from "./LoadingScene";

type Step = "splash" | "story" | "gate" | "auth" | "loading";
const SEEN_KEY = "entry.seen.v1";

export function EntryFlow({ initialMode = "student" }: { initialMode?: "student" | "admin" }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("splash");
  const [mode, setMode] = useState<"student" | "admin">(initialMode);
  const [loading, setLoading] = useState(false);

  // Skip splash/story if returning within same session
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SEEN_KEY)) {
      setStep("gate");
    }
  }, []);

  const advanceFromSplash = useCallback(() => setStep("story"), []);
  const advanceFromStory = useCallback(() => {
    if (typeof window !== "undefined") sessionStorage.setItem(SEEN_KEY, "1");
    setStep("gate");
  }, []);
  const advanceFromGate = useCallback(() => setStep("auth"), []);

  const handleAuth = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_active")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profile && profile.is_active === false) {
          await supabase.auth.signOut();
          throw new Error("Your account is disabled. Please contact your admin.");
        }
        setStep("loading");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Registration failed";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const finish = useCallback(() => {
    navigate({ to: "/app" });
  }, [navigate]);

  const variant = step === "auth" && mode === "admin" ? "office" : "night";

  return (
    <EntryStage variant={variant}>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="min-h-screen"
        >
          {step === "splash" && <SplashScene onDone={advanceFromSplash} />}
          {step === "story" && <StoryIntroScene onDone={advanceFromStory} />}
          {step === "gate" && <AcademyGateScene onEntered={advanceFromGate} />}
          {step === "auth" && (
            <RegistrationScene
              mode={mode}
              onModeChange={setMode}
              onSubmit={handleAuth}
              loading={loading}
            />
          )}
          {step === "loading" && <LoadingScene onDone={finish} />}
        </motion.div>
      </AnimatePresence>
    </EntryStage>
  );
}
