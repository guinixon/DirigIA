import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Scale, Loader2, ArrowRight, UserPlus } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isGoogleFlow = searchParams.get("google") === "true";
  const [name, setName] = useState(searchParams.get("name") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !isGoogleFlow) {
        navigate("/home");
      }
    };
    checkUser();
  }, [navigate, isGoogleFlow]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      if (isGoogleFlow) {
        // User already authenticated via Google — set password and update profile name
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) throw pwError;

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase
            .from("profiles")
            .update({ name: name.trim() })
            .eq("id", session.user.id);
        }

        toast.success("Conta configurada com sucesso!");
        navigate("/home");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/home`,
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Este email já está cadastrado");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Cadastro realizado! Verifique seu email para confirmar sua conta.", { duration: 6000 });
          setTimeout(() => navigate("/login"), 3000);
        }
      }
    } catch (error: any) {
      toast.error(error?.message || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background bg-mesh">
      {/* Decorative elements */}
      <div className="fixed inset-0 bg-pattern opacity-50 pointer-events-none" />
      
      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-primary rounded-2xl shadow-lg mb-6">
            <Scale className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            dirigIA
          </h1>
          <p className="mt-2 text-muted-foreground">
            Crie sua conta gratuita
          </p>
        </div>

        <Card className="border-border/50 shadow-xl bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-center flex items-center justify-center gap-2">
              <UserPlus className="h-5 w-5" />
              Criar Conta
            </CardTitle>
            <CardDescription className="text-center">
              Preencha seus dados para começar
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nome Completo
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                  className="h-12 px-4 input-premium"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || isGoogleFlow}
                  required
                  className="h-12 px-4 input-premium"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="h-12 px-4 input-premium"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar Senha
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="h-12 px-4 input-premium"
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex-col space-y-5 pt-2">
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium btn-premium" 
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    Criar minha conta
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
              
              {!isGoogleFlow && (
                <>
                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        ou continue com
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 text-base font-medium"
                    disabled={loading}
                    onClick={async () => {
                      const { error } = await supabase.auth.signInWithOAuth({
                        provider: "google",
                        options: {
                          redirectTo: window.location.origin,
                        },
                      });
                      if (error) {
                        toast.error("Erro ao entrar com Google. Tente novamente.");
                      }
                    }}
                  >
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Criar conta com Google
                  </Button>
                </>
              )}

              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Já tem conta?
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                <Link 
                  to="/login" 
                  className="text-primary font-medium hover:text-primary-hover transition-colors duration-200 hover:underline underline-offset-4"
                >
                  Fazer login
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
        
        {/* Trust badge */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 bg-success rounded-full" />
            Seus dados estão protegidos
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;
