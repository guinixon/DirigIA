import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Crown, Sparkles } from "lucide-react";

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPlan: (plan: "monthly" | "annual") => void;
}

export const SubscriptionDialog = ({ open, onOpenChange, onSelectPlan }: SubscriptionDialogProps) => {
  const plans = [
    {
      id: "monthly" as const,
      name: "Mensal",
      price: "R$ 49,90",
      period: "/mês",
      features: [
        "Recursos ilimitados",
        "Geração com IA avançada",
        "Download em TXT e PDF",
        "Suporte prioritário"
      ],
      icon: Sparkles,
      color: "text-primary"
    },
    {
      id: "annual" as const,
      name: "Anual",
      price: "R$ 149,90",
      period: "/ano",
      pricePerMonth: "R$ 12,49/mês",
      features: [
        "Recursos ilimitados",
        "Geração com IA avançada",
        "Download em TXT e PDF",
        "Suporte prioritário",
        "2 meses grátis"
      ],
      icon: Crown,
      color: "text-primary",
      recommended: true
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Escolha seu plano</DialogTitle>
          <DialogDescription>
            Assine para fazer download dos seus recursos
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.id}
                className={`p-6 relative ${plan.recommended ? "border-2 border-primary shadow-lg" : ""}`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold">
                    RECOMENDADO
                  </div>
                )}
                
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`h-6 w-6 ${plan.color}`} />
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  {plan.pricePerMonth && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.pricePerMonth}
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => onSelectPlan(plan.id)}
                  className="w-full"
                  variant={plan.recommended ? "default" : "outline"}
                  size="lg"
                >
                  Assinar {plan.name}
                </Button>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
