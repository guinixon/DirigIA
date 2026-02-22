import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SubscriptionDialog } from "@/components/SubscriptionDialog";
import { PaymentMethodDialog } from "@/components/PaymentMethodDialog";
import CustomerDataDialog from "@/components/CustomerDataDialog";

interface OcrData {
  aitNumber?: string;
  dataInfracao?: string;
  local?: string;
  placa?: string;
  renavam?: string;
  artigo?: string;
  orgaoAutuador?: string;
  nomeCondutor?: string;
  cpfCondutor?: string;
  enderecoCondutor?: string;
}

const argumentOptions = [
  "Erro de enquadramento",
  "Ausência de sinalização",
  "Equipamento irregular",
  "Veículo não estava no local",
  "Notificação recebida fora do prazo",
];

const Details = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [explanation, setExplanation] = useState("");
  const [selectedArguments, setSelectedArguments] = useState<string[]>([]);
  const [otherArgument, setOtherArgument] = useState("");
  const [loading, setLoading] = useState(false);
  const [ocrData, setOcrData] = useState<OcrData | null>(null);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCustomerDataDialog, setShowCustomerDataDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"PIX" | "CREDIT_CARD" | "DEBIT_CARD">("PIX");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    const data = location.state?.ocrData;
    if (!data) {
      navigate("/home");
      return;
    }
    setOcrData(data);
  }, [location, navigate]);

  const toggleArgument = (arg: string) => {
    setSelectedArguments(prev =>
      prev.includes(arg)
        ? prev.filter(a => a !== arg)
        : [...prev, arg]
    );
  };

  const handleSelectPlan = (plan: "monthly" | "annual") => {
    setSelectedPlan(plan);
    setShowSubscriptionDialog(false);
    setShowPaymentDialog(true);
  };

  const handleSelectPaymentMethod = async (method: "PIX" | "CREDIT_CARD" | "DEBIT_CARD") => {
    setSelectedPaymentMethod(method);
    setShowPaymentDialog(false);

    // Se for PIX, mostrar dialog para coletar dados do cliente
    if (method === "PIX") {
      setShowCustomerDataDialog(true);
      return;
    }

    // Para cartão, processar diretamente
    await processPayment(method);
  };

  const handleCustomerDataSubmit = async (customerData: { name: string; phone: string; cpf: string }) => {
    setShowCustomerDataDialog(false);
    await processPayment(selectedPaymentMethod, customerData);
  };

  const processPayment = async (
    method: "PIX" | "CREDIT_CARD" | "DEBIT_CARD",
    customerData?: { name: string; phone: string; cpf: string }
  ) => {
    setIsProcessingPayment(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-billing', {
        body: {
          plan: selectedPlan,
          paymentMethod: method,
          customerData: customerData
        }
      });

      if (error) throw error;

      if (data.success && data.billingUrl) {
        toast.success("Redirecionando para pagamento...");
        window.open(data.billingUrl, '_blank');
        
        // Após abrir o link, resetar o estado
        setTimeout(() => {
          setIsProcessingPayment(false);
          toast.info("Complete o pagamento na janela aberta para continuar");
        }, 1000);
      } else {
        throw new Error(data.error || "Erro ao criar cobrança");
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error("Erro ao processar pagamento. Tente novamente.");
      setIsProcessingPayment(false);
    }
  };

  const handleGenerate = async () => {
    if (!explanation.trim()) {
      toast.error("Por favor, explique o que aconteceu");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/login");
        return;
      }

      // Limit check disabled for testing

      const allArguments = otherArgument.trim()
        ? [...selectedArguments, otherArgument]
        : selectedArguments;

      const { data, error } = await supabase.functions.invoke("generate-resource", {
        body: {
          ocrData,
          userExplanation: explanation,
          selectedArguments: allArguments,
        },
      });

      if (error) {
        console.error('Function invocation error:', error);
        
        // Verificar se é erro de limite (403)
        if (error.message?.includes("limitReached") || error.message?.includes("Limite de recursos")) {
          setLoading(false);
          setShowSubscriptionDialog(true);
          return;
        }
        
        throw error;
      }

      if (data?.limitReached) {
        setLoading(false);
        setShowSubscriptionDialog(true);
        return;
      }

      if (data?.error) {
        if (data.error.includes("Limite de recursos")) {
          setLoading(false);
          setShowSubscriptionDialog(true);
          return;
        }
        toast.error(data.error);
        return;
      }

      navigate("/ai-result", {
        state: {
          generatedText: data.generatedText,
          resourceId: data.resourceId,
        },
      });
    } catch (error: any) {
      console.error("Error generating resource:", error);
      toast.error("Erro ao gerar recurso. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/ocr-review")}
          className="mb-6"
          disabled={loading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Conte o que Aconteceu</CardTitle>
            <CardDescription>
              Forneça detalhes para fortalecer seu recurso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="explanation">Explicação Detalhada *</Label>
              <Textarea
                id="explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Descreva em detalhes o que aconteceu, suas circunstâncias e por que você acredita que a multa é indevida..."
                rows={6}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Quanto mais detalhes você fornecer, melhor será o recurso gerado
              </p>
            </div>

            <div className="space-y-4">
              <Label>Argumentos Comuns (opcional)</Label>
              <div className="space-y-3">
                {argumentOptions.map((arg) => (
                  <div key={arg} className="flex items-center space-x-2">
                    <Checkbox
                      id={arg}
                      checked={selectedArguments.includes(arg)}
                      onCheckedChange={() => toggleArgument(arg)}
                      disabled={loading}
                    />
                    <label
                      htmlFor={arg}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {arg}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="other">Outro Argumento</Label>
              <Textarea
                id="other"
                value={otherArgument}
                onChange={(e) => setOtherArgument(e.target.value)}
                placeholder="Descreva outro argumento que você deseja incluir..."
                rows={3}
                disabled={loading}
              />
            </div>

            <Button
              onClick={handleGenerate}
              className="w-full mt-6"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando Recurso...
                </>
              ) : (
                <>
                  Gerar Recurso com IA
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <SubscriptionDialog
        open={showSubscriptionDialog}
        onOpenChange={setShowSubscriptionDialog}
        onSelectPlan={handleSelectPlan}
      />

      <PaymentMethodDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onSelectMethod={handleSelectPaymentMethod}
        plan={selectedPlan}
      />

      <CustomerDataDialog
        open={showCustomerDataDialog}
        onOpenChange={setShowCustomerDataDialog}
        onSubmit={handleCustomerDataSubmit}
        isLoading={isProcessingPayment}
      />
    </div>
  );
};

export default Details;