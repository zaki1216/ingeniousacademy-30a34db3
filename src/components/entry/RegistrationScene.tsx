import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@tanstack/react-router";
import { LumiAvatar } from "@/components/lumi/LumiAvatar";
import { playSfx } from "@/lib/entry/sfx";

type Props = {
  mode: "student" | "admin";
  onModeChange: (m: "student" | "admin") => void;
  onSubmit: (email: string, password: string) => Promise<void>;
  loading: boolean;
};

export function RegistrationScene({ mode, onModeChange, onSubmit, loading }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isAdmin = mode === "admin";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    playSfx("click");
    await onSubmit(email, password);
  };

  return (
    <div className="min-h-full grid place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-md"
      >
        {/* Mode tabs */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            onClick={() => onModeChange("student")}
            className={`px-4 py-2 text-xs uppercase tracking-[0.25em] rounded-full border transition ${
              mode === "student"
                ? "border-amber-400 text-amber-200 bg-amber-500/10"
                : "border-white/10 text-white/50 hover:text-white/80"
            }`}
          >
            ⚔ Cadet
          </button>
          <button
            onClick={() => onModeChange("admin")}
            className={`px-4 py-2 text-xs uppercase tracking-[0.25em] rounded-full border transition ${
              mode === "admin"
                ? "border-amber-400 text-amber-200 bg-amber-500/10"
                : "border-white/10 text-white/50 hover:text-white/80"
            }`}
          >
            🏛 Headmaster
          </button>
        </div>

        {/* Lumi welcome (student only) */}
        {!isAdmin && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-3 mb-4 px-4 py-3 rounded-2xl border border-indigo-300/20 bg-indigo-500/5 backdrop-blur"
          >
            <LumiAvatar size="sm" />
            <div className="flex-1 text-sm">
              <p className="text-indigo-100 leading-relaxed">
                Welcome, Cadet. Before you begin your journey, the Academy must recognize you.
              </p>
            </div>
          </motion.div>
        )}

        <div
          className="rounded-2xl border p-6 md:p-8 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur"
          style={{
            background: isAdmin
              ? "linear-gradient(180deg, rgba(40,32,18,0.85), rgba(20,16,10,0.9))"
              : "linear-gradient(180deg, rgba(30,25,60,0.75), rgba(15,12,30,0.85))",
            borderColor: isAdmin ? "rgba(251,191,36,0.3)" : "rgba(180,170,255,0.2)",
          }}
        >
          <div className="text-center mb-6">
            <h1
              className="text-2xl md:text-3xl font-black tracking-[0.2em] bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 bg-clip-text text-transparent"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {isAdmin ? "HEADMASTER AUTHENTICATION" : "ACADEMY REGISTRATION"}
            </h1>
            <p className="mt-2 text-xs italic text-amber-200/60 tracking-widest">
              {isAdmin ? "Enter the Academy Office" : "Present your credentials"}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-amber-200/70">
                {isAdmin ? "Headmaster Email" : "Academy ID"}
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                maxLength={255}
                className="bg-black/40 border-amber-500/20 text-amber-50 placeholder:text-amber-100/30"
                placeholder="cadet@ingenious.academy"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-widest text-amber-200/70">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-black/40 border-amber-500/20 text-amber-50"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-b from-amber-300 via-amber-500 to-amber-800 text-amber-950 hover:brightness-110 font-bold tracking-[0.2em] py-6 shadow-[0_0_40px_-8px_rgba(251,191,36,0.7)]"
            >
              {loading
                ? "Recognizing..."
                : isAdmin
                  ? "ENTER THE ACADEMY OFFICE"
                  : "ENTER THE ACADEMY"}
            </Button>
            <div className="text-center pt-1">
              <Link
                to="/forgot-password"
                className="text-xs text-amber-200/60 hover:text-amber-200 tracking-widest uppercase"
              >
                Forgotten Rune?
              </Link>
            </div>
          </form>
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.3em] text-white/30">
          {isAdmin
            ? "Restricted • Headmaster access only"
            : "Cadet accounts are granted by the Academy"}
        </p>
      </motion.div>
    </div>
  );
}
