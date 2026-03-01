import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Scale, Loader2, CheckCircle } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setCheckingToken(false);
      }
    });

    // Timeout fallback caso o evento já tenha sido disparado antes do listener
    const timeout = setTimeout(() => {
      setCheckingToken(false);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Senha atualizada com sucesso!");
        setTimeout(() => navigate("/home"), 1500);
      }
    } catch {
      toast.error("Erro ao atualizar senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background bg-mesh">
        <div className="fixed inset-0 bg-pattern opacity-50 pointer-events-none" />
        <div className="relative w-full max-w-md animate-fade-in text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando token de recuperação...</p>
        </div>
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background bg-mesh">
        <div className="fixed inset-0 bg-pattern opacity-50 pointer-events-none" />
        <div className="relative w-full max-w-md animate-fade-in text-center">
          <div className="inline-flex items-center justify-center p-4 bg-primary rounded-2xl shadow-lg mb-6">
            <Scale className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Link inválido ou expirado</h2>
          <p className="text-muted-foreground mb-6">Solicite um novo link de recuperação de senha.</p>
          <Button onClick={() => navigate("/forgot-password")} className="btn-premium">
            Solicitar novo link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background bg-mesh">
      <div className="fixed inset-0 bg-pattern opacity-50 pointer-events-none" />

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-primary rounded-2xl shadow-lg mb-6">
            <Scale className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">dirigIA</h1>
          <p className="mt-2 text-muted-foreground">Criar nova senha</p>
        </div>

        <Card className="border-border/50 shadow-xl bg-card/95 backdrop-blur-sm">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-semibold text-center">Nova senha</CardTitle>
              <CardDescription className="text-center">
                Defina sua nova senha para acessar sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="h-12 px-4 input-premium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar nova senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="h-12 px-4 input-premium"
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button type="submit" className="w-full h-12 text-base font-medium btn-premium" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Salvar nova senha
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
