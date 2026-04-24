import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { GlassWater } from "lucide-react";

type Mode = "signin" | "signup";

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    if (!isSupabaseConfigured) {
      toast.error("Set your Supabase URL & anon key in src/lib/supabase.ts");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        console.log("[auth] signInWithPassword result:", { data, error });
        if (error) {
          setErrMsg(error.message);
          toast.error(error.message);
          return;
        }
        nav("/", { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        console.log("[auth] signUp result:", { data, error });
        if (error) {
          setErrMsg(error.message);
          toast.error(error.message);
          return;
        }
        if (data.session) {
          nav("/", { replace: true });
        } else {
          toast.success("Check your email to confirm your account.");
        }
      }
    } catch (err: any) {
      console.error("[auth] unexpected error:", err);
      setErrMsg(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase
        .from("glass_pieces")
        .select("code,width,height,thickness")
        .limit(1);
      console.log("[test] glass_pieces result:", { data, error });
      if (error) {
        setTestResult(`ERROR: ${error.message}`);
      } else {
        setTestResult(`OK: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      console.error("[test] unexpected error:", err);
      setTestResult(`THROWN: ${err?.message ?? String(err)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-header p-6">
      <Card className="w-full max-w-md p-8 shadow-elevated">
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

        <div className="mt-6 pt-6 border-t space-y-3">
          <Button
            type="button"
            variant="outline"
            disabled={testing}
            onClick={testConnection}
            className="w-full h-11"
          >
            {testing ? "Testing…" : "Test Supabase Connection"}
          </Button>
          {testResult && (
            <div className="rounded-md border bg-muted p-3 text-xs font-mono break-words whitespace-pre-wrap">
              {testResult}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
