import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Crown, Sparkles } from "lucide-react";

const Subscribe = () => {
  const navigate = useNavigate();

  const freePlan = [
    "1 recurso por mês",
    "Geração com IA",
    "Download em TXT",
    "Histórico limitado"
  ];

  const premiumPlan = [
    "Recursos ilimitados",
    "Geração com IA avançada",
    "Download em TXT e PDF",
    "Histórico completo",
    "Suporte prioritário",
    "Modelos personalizados"
  ];

  const handleSubscribe = () => {
    // Redirect to Cakto sales page
    window.location.href = 'https://pay.cakto.com.br/ctkescx_758613';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Escolha Seu Plano
          </h1>
          <p className="text-muted-foreground">
            Gere recursos de multas de forma profissional
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
                Gratuito
              </CardTitle>
              <CardDescription>
                Para experimentar o serviço
              </CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ 0</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {freePlan.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                disabled
              >
                Plano Atual
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="shadow-xl border-2 border-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold rounded-bl-lg">
              RECOMENDADO
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Premium
              </CardTitle>
              <CardDescription>
                Para uso profissional ilimitado
              </CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ 49,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {premiumPlan.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={handleSubscribe}
                className="w-full"
                size="lg"
              >
                Assinar Premium
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Cancele quando quiser
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Subscribe;