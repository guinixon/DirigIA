import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreditCard, Smartphone, QrCode } from "lucide-react";

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMethod: (method: "PIX" | "CREDIT_CARD" | "DEBIT_CARD") => void;
  plan: "monthly" | "annual";
}

export const PaymentMethodDialog = ({ open, onOpenChange, onSelectMethod, plan }: PaymentMethodDialogProps) => {
  const paymentMethods = [
    {
      id: "PIX" as const,
      name: "PIX",
      description: "Pagamento instantâneo",
      icon: QrCode,
      color: "text-emerald-600"
    },
    {
      id: "CREDIT_CARD" as const,
      name: "Cartão de Crédito",
      description: "Parcelamento disponível",
      icon: CreditCard,
      color: "text-blue-600"
    },
    {
      id: "DEBIT_CARD" as const,
      name: "Cartão de Débito",
      description: "Débito em conta corrente",
      icon: Smartphone,
      color: "text-purple-600"
    }
  ];

  const planName = plan === "monthly" ? "Mensal" : "Anual";
  const planPrice = plan === "monthly" ? "R$ 49,90" : "R$ 149,90";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Selecione a forma de pagamento</DialogTitle>
          <DialogDescription>
            Plano {planName} - {planPrice}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 mt-4">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <Card
                key={method.id}
                className="p-4 hover:border-primary transition-colors cursor-pointer"
                onClick={() => onSelectMethod(method.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full bg-muted ${method.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{method.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {method.description}
                    </p>
                  </div>
                  <Button variant="outline">Selecionar</Button>
                </div>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
