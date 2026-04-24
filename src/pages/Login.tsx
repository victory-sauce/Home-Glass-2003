import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { GlassWater } from "lucide-react";

type Mode = "signin" | "signup";

function serializeError(value: unknown) {
  if (!value) return "null";

  if (value instanceof Error) {
    const details = Object.fromEntries(
      Object.getOwnPropertyNames(value).map((key) => [key, (value as Record<string, unknown>)[key]]),
    );
    return JSON.stringify(details, null, 2);
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [rawFetchResult, setRawFetchResult] = useState<string | null>(null);
  const [rawFetchLoading, setRawFetchLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [lastRequestUrl, setLastRequestUrl] = useState<string | null>(null);

  const authRequestUrl = useMemo(
    () => (mode === "signin" ? `${SUPABASE_URL}/auth/v1/token?grant_type=password` : `${SUPABASE_URL}/auth/v1/signup`),
    [mode],
  );
  const queryRequestUrl = `${SUPABASE_URL}/rest/v1/glass_pieces?select=code,width,height,thickness&limit=1`;
  const rawFetchUrl = `${SUPABASE_URL}/rest/v1/glass_pieces?select=code&limit=1`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    setDebugError(null);

    if (!isSupabaseConfigured) {
      toast.error("Set your Supabase URL & anon key in src/lib/supabase.ts");
      return;
    }

    setLoading(true);
    setLastRequestUrl(authRequestUrl);

    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        console.log("[auth] signInWithPassword result:", { data, error });

        if (error) {
          console.error("[auth] signInWithPassword error object:", error);
          setErrMsg(error.message);
          setDebugError(serializeError(error));
          setLastRequestUrl((error as { url?: string }).url ?? authRequestUrl);
          toast.error(error.message);
          return;
        }

        nav("/", { replace: true });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      console.log("[auth] signUp result:", { data, error });

      if (error) {
        console.error("[auth] signUp error object:", error);
        setErrMsg(error.message);
        setDebugError(serializeError(error));
        setLastRequestUrl((error as { url?: string }).url ?? authRequestUrl);
        toast.error(error.message);
        return;
      }

      if (data.session) {
        nav("/", { replace: true });
      } else {
        toast.success("Check your email to confirm your account.");
      }
    } catch (err: unknown) {
      console.error("[auth] unexpected error:", err);
      setErrMsg(err instanceof Error ? err.message : String(err));
      setDebugError(serializeError(err));
      setLastRequestUrl((err as { url?: string } | null)?.url ?? authRequestUrl);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setLastRequestUrl(queryRequestUrl);

    try {
      const { data, error } = await supabase
        .from("glass_pieces")
        .select("code,width,height,thickness")
        .limit(1);

      console.log("[test] glass_pieces result:", { data, error });

      if (error) {
        console.error("[test] glass_pieces error object:", error);
        setDebugError(serializeError(error));
        setLastRequestUrl((error as { url?: string }).url ?? queryRequestUrl);
        setTestResult(`ERROR: ${error.message}`);
        return;
      }

      setDebugError(null);
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      console.error("[test] unexpected error:", err);
      setDebugError(serializeError(err));
      setLastRequestUrl((err as { url?: string } | null)?.url ?? queryRequestUrl);
      setTestResult(`THROWN: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTesting(false);
    }
  };

  const runRawFetchTest = async () => {
    setRawFetchLoading(true);
    setRawFetchResult(null);
    setLastRequestUrl(rawFetchUrl);

    try {
      const response = await fetch(rawFetchUrl, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      const bodyText = await response.text();
      const result = {
        status: response.status,
        statusText: response.statusText,
        bodyText,
      };
      console.log("[raw-fetch] result:", result);
      setRawFetchResult(JSON.stringify(result, null, 2));
    } catch (err: unknown) {
      console.error("[raw-fetch] error:", err);
      setRawFetchResult(
        JSON.stringify(
          {
            errorMessage: err instanceof Error ? err.message : String(err),
          },
          null,
          2,
        ),
      );
    } finally {
      setRawFetchLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-header p-6">
      <Card className="w-full max-w-2xl p-8 shadow-elevated">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-12 rounded-xl bg-gradient-accent flex items-center justify-center text-primary-foreground">
            <GlassWater className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Glass Shop</h1>
            <p className="text-sm text-muted-foreground">Order & inventory system</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            type="button"
            variant={mode === "signin" ? "default" : "outline"}
            className="flex-1"
            onClick={() => {
              setMode("signin");
              setErrMsg(null);
            }}
          >
            Sign in
          </Button>
          <Button
            type="button"
            variant={mode === "signup" ? "default" : "outline"}
            className="flex-1"
            onClick={() => {
              setMode("signup");
              setErrMsg(null);
            }}
          >
            Sign up
          </Button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
            />
          </div>

          {errMsg && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive break-words">
              {errMsg}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full h-12 text-base font-semibold">
            {loading ? "Working…" : mode === "signin" ? "Sign in" : "Sign up"}
          </Button>
        </form>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            disabled={testing}
            onClick={testConnection}
            className="h-11"
          >
            {testing ? "Testing…" : "Test Supabase Connection"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={rawFetchLoading}
            onClick={runRawFetchTest}
            className="h-11"
          >
            {rawFetchLoading ? "Running raw fetch…" : "Run Raw Fetch Test"}
          </Button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Debug panel</h2>
            <div className="grid gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">SUPABASE_URL</div>
                <div className="break-all text-foreground">{SUPABASE_URL}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Anon key exists</div>
                <div className="text-foreground">{SUPABASE_ANON_KEY ? "Yes" : "No"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Anon key prefix</div>
                <div className="break-all font-mono text-foreground">{SUPABASE_ANON_KEY.slice(0, 20)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Last request URL</div>
                <div className="break-all font-mono text-foreground">{lastRequestUrl ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Last Supabase error object</h2>
            <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground whitespace-pre-wrap break-words">
              {debugError ?? "No Supabase error captured yet."}
            </pre>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Supabase query result</h2>
            <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground whitespace-pre-wrap break-words">
              {testResult ?? "No query run yet."}
            </pre>
          </div>

          <div className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Raw fetch result</h2>
            <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground whitespace-pre-wrap break-words">
              {rawFetchResult ?? "No raw fetch run yet."}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
}
