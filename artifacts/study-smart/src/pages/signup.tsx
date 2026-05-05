import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2, ChevronLeft, Search, ChevronRight, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COUNTRIES, searchCountries, type CountryDef, type Grade, GROUP_LABELS, type GradeGroup,
} from "@/lib/countries-grades";
import { useLanguage } from "@/lib/language-context";

type Step = "country" | "grade" | "account";
const STEPS: Step[] = ["country", "grade", "account"];

function PasswordStrength({ password, checks }: { password: string; checks: { length: string; number: string; letter: string } }) {
  if (!password) return null;
  const items = [
    { label: checks.length, ok: password.length >= 6 },
    { label: checks.number, ok: /\d/.test(password) },
    { label: checks.letter, ok: /[a-zA-Z]/.test(password) },
  ];
  const score = items.filter((c) => c.ok).length;
  const colors = ["bg-destructive", "bg-orange-400", "bg-amber-400", "bg-emerald-500"];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < score ? colors[score] : "bg-muted"}`} />
        ))}
      </div>
      <div className="space-y-0.5">
        {items.map((c) => (
          <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
            <CheckCircle2 className={`w-3 h-3 ${c.ok ? "" : "opacity-30"}`} />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const { register, authError, clearAuthError, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const [step, setStep] = useState<Step>("country");
  const [country, setCountry] = useState<CountryDef | null>(null);
  const [gradeIndex, setGradeIndex] = useState<number | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);

  useEffect(() => {
    if (isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (step === "country") {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [step]);

  useEffect(() => {
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setUsernameAvailable(null);
      setUsernameChecking(false);
      return;
    }
    setUsernameChecking(true);
    setUsernameAvailable(null);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setUsernameAvailable(data.available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const filteredCountries = searchCountries(countrySearch);

  const selectedGrade: Grade | null = country && gradeIndex !== null ? country.grades[gradeIndex] ?? null : null;

  const gradesByGroup = country?.grades.reduce<Partial<Record<GradeGroup, { grade: Grade; index: number }[]>>>((acc, g, i) => {
    if (!acc[g.group]) acc[g.group] = [];
    acc[g.group]!.push({ grade: g, index: i });
    return acc;
  }, {}) ?? {};

  const handleCountrySelect = (c: CountryDef) => {
    setCountry(c);
    setGradeIndex(null);
    setStep("grade");
  };

  const handleGradeSelect = (idx: number) => {
    setGradeIndex(idx);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setConfirmError("");

    if (password !== confirmPassword) {
      setConfirmError(t.signup.passwordsNoMatch);
      return;
    }
    if (password.length < 6) {
      setConfirmError(t.signup.passwordTooShort);
      return;
    }
    if (!disclaimerAccepted) {
      setConfirmError("You must accept the disclaimer before creating an account.");
      return;
    }

    setLoading(true);
    try {
      await register({
        username,
        password,
        country: country?.code,
        gradeIndex: gradeIndex ?? undefined,
      });
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const stepIdx = STEPS.indexOf(step);

  const stepIcon = step === "country" ? <span className="text-xl">🌍</span>
    : step === "grade" ? <span className="text-xl">🎓</span>
    : <UserPlus className="w-6 h-6 text-white" />;

  const stepLabel = step === "country" ? t.signup.country
    : step === "grade" ? t.signup.grade
    : t.signup.account;

  const stepSub = step === "country" ? t.signup.countrySub
    : step === "grade" ? `${t.signup.grade} — ${country?.name ?? ""}`
    : t.signup.accountSub;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      <nav className="flex items-center justify-between px-6 py-5">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Mind Forge</span>
          </div>
        </Link>
        <Link href="/login">
          <Button variant="outline" className="rounded-full px-5">{t.common.login}</Button>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-card border border-border/60 rounded-3xl shadow-2xl shadow-primary/5 p-8"
        >
          {/* Step progress bars */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <div key={s} className={cn(
                "h-1.5 rounded-full flex-1 transition-all duration-300",
                i <= stepIdx ? "bg-primary" : "bg-muted"
              )} />
            ))}
          </div>

          {/* Header */}
          <div className="mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/20 mb-4">
              {stepIcon}
            </div>
            <h1 className="text-xl font-bold tracking-tight mb-0.5">{stepLabel}</h1>
            <p className="text-muted-foreground text-sm">{stepSub}</p>
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1: Country */}
            {step === "country" && (
              <motion.div key="country" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    placeholder={t.signup.searchCountry}
                    value={countrySearch}
                    onChange={e => setCountrySearch(e.target.value)}
                    className="pl-9 rounded-xl h-11"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                  {filteredCountries.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-6">{t.signup.noResults}</p>
                  )}
                  {filteredCountries.map(c => (
                    <button
                      key={c.code}
                      onClick={() => handleCountrySelect(c)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all text-left"
                    >
                      <span className="text-xl shrink-0">{c.flag}</span>
                      <span className="font-medium text-sm">{c.name}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Grade */}
            {step === "grade" && country && (
              <motion.div key="grade" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button
                  onClick={() => setStep("country")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> {country.flag} {country.name}
                </button>

                <div className="max-h-72 overflow-y-auto space-y-4 pr-1">
                  {(["preschool", "primary", "secondary", "university"] as GradeGroup[]).map(group => {
                    const items = gradesByGroup[group];
                    if (!items?.length) return null;
                    return (
                      <div key={group}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 pl-1">{GROUP_LABELS[group]}</p>
                        <div className="grid grid-cols-1 gap-1">
                          {items.map(({ grade, index }) => (
                            <button
                              key={grade.code}
                              onClick={() => handleGradeSelect(index)}
                              className={cn(
                                "flex items-center justify-between px-3 py-2.5 rounded-xl border text-left text-sm transition-all",
                                gradeIndex === index
                                  ? "border-primary bg-primary/5 font-semibold text-primary"
                                  : "border-transparent hover:border-primary/20 hover:bg-primary/3"
                              )}
                            >
                              <span>{grade.name}</span>
                              {gradeIndex === index && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  className="w-full h-11 rounded-xl mt-4 text-sm font-semibold"
                  disabled={gradeIndex === null}
                  onClick={() => setStep("account")}
                >
                  {gradeIndex !== null ? `${t.common.continue} — ${selectedGrade?.name}` : t.signup.selectGrade}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {/* STEP 4: Account */}
            {step === "account" && (
              <motion.div key="account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button
                  onClick={() => setStep("grade")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {country?.flag} {selectedGrade?.name}
                </button>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="username">{t.signup.username}</Label>
                    <div className="relative">
                      <Input
                        id="username"
                        type="text"
                        placeholder={t.signup.usernamePlaceholder}
                        value={username}
                        onChange={e => { setUsername(e.target.value.replace(/[^a-zA-Z0-9_. ]/g, "")); clearAuthError(); setUsernameAvailable(null); }}
                        required
                        autoComplete="username"
                        className="rounded-xl h-11 pr-10"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {usernameChecking && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        {!usernameChecking && usernameAvailable === true && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {!usernameChecking && usernameAvailable === false && <XCircle className="w-4 h-4 text-destructive" />}
                      </div>
                    </div>
                    {!usernameChecking && usernameAvailable === true && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Username is available</p>
                    )}
                    {!usernameChecking && usernameAvailable === false && (
                      <p className="text-xs text-destructive">This username is already taken</p>
                    )}
                    {(usernameAvailable === null && !usernameChecking) && (
                      <p className="text-xs text-muted-foreground">Letters, numbers, spaces, underscores, and dots. At least 3 characters.</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">{t.signup.password}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t.signup.passwordPlaceholder}
                        value={password}
                        onChange={e => { setPassword(e.target.value); clearAuthError(); setConfirmError(""); }}
                        required
                        autoComplete="new-password"
                        className="rounded-xl h-11 pr-11"
                      />
                      <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordStrength password={password} checks={t.signup.passwordChecks} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm">{t.signup.confirmPassword}</Label>
                    <div className="relative">
                      <Input
                        id="confirm"
                        type={showConfirm ? "text" : "password"}
                        placeholder={t.signup.confirmPasswordPlaceholder}
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setConfirmError(""); }}
                        required
                        autoComplete="new-password"
                        className="rounded-xl h-11 pr-11"
                      />
                      <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Disclaimer checkbox */}
                  <div className="flex items-start gap-3 bg-muted/50 border border-border rounded-xl px-4 py-3">
                    <input
                      id="disclaimer"
                      type="checkbox"
                      checked={disclaimerAccepted}
                      onChange={e => { setDisclaimerAccepted(e.target.checked); setConfirmError(""); }}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
                    />
                    <label htmlFor="disclaimer" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                      I understand that if this app is hacked or suffers a security breach, any personal information I have stored may be lost or exposed. <span className="font-semibold text-foreground">The app and its developers accept no responsibility</span> for any such loss or exposure of personal data.
                    </label>
                  </div>

                  {(authError || confirmError) && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl px-4 py-3 text-sm"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {confirmError || authError}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 mt-1"
                    disabled={loading}
                  >
                    {loading ? t.signup.creating : t.signup.account}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t.common.alreadyHaveAccount}{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">{t.common.logIn}</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
