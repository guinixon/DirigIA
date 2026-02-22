import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, CheckCircle2, Loader2, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PixQrCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCodeBase64: string;
  brCode: string;
  amount: string;
  billingId: string;
  onPaymentConfirmed?: () => void;
}

export function PixQrCodeDialog({
  open,
  onOpenChange,
  qrCodeBase64,
  brCode,
  amount,
  billingId,
  onPaymentConfirmed,
}: PixQrCodeDialogProps) {
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PAID' | 'EXPIRED'>('PENDING');
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (!open || !billingId) return;

    // Subscribe to payment status changes
    const channel = supabase
      .channel(`payment-${billingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `billing_id=eq.${billingId}`
        },
        (payload) => {
          console.log('Payment update received:', payload);
          const newStatus = payload.new.status as 'PENDING' | 'PAID' | 'EXPIRED';
          setPaymentStatus(newStatus);
          
          if (newStatus === 'PAID') {
            toast.success("Pagamento confirmado! Seu plano foi ativado.");
            onPaymentConfirmed?.();
          } else if (newStatus === 'EXPIRED') {
            toast.error("O QR Code expirou. Gere um novo.");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, billingId, onPaymentConfirmed]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(brCode);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error("Erro ao copiar código");
    }
  };

  const handleSimulatePayment = async () => {
    setSimulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('simulate-payment', {
        body: { pixQrCodeId: billingId }
      });
      
      if (error) {
        console.error('Simulate payment error:', error);
        toast.error("Erro ao simular pagamento");
        return;
      }
      
      console.log('Simulate payment response:', data);
      toast.success("Pagamento simulado! Aguarde a confirmação...");
    } catch (error) {
      console.error('Simulate payment error:', error);
      toast.error("Erro ao simular pagamento");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {paymentStatus === 'PAID' ? 'Pagamento Confirmado!' : 'Pagamento PIX'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {paymentStatus === 'PAID' 
              ? 'Seu pagamento foi processado com sucesso'
              : paymentStatus === 'EXPIRED'
              ? 'O QR Code expirou. Feche e tente novamente.'
              : 'Escaneie o QR Code ou copie o código para pagar'
            }
          </DialogDescription>
        </DialogHeader>

        {paymentStatus === 'PAID' ? (
          <div className="flex flex-col items-center space-y-4 py-8">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-green-600">Pagamento Aprovado</p>
            <p className="text-sm text-muted-foreground text-center">
              Seu plano premium foi ativado. Agora você pode baixar seus recursos!
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-4">
              Continuar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="text-2xl font-bold text-primary">{amount}</div>
            
            {qrCodeBase64 && (
              <div className="bg-white p-4 rounded-lg shadow-inner relative">
                <img
                  src={qrCodeBase64}
                  alt="QR Code PIX"
                  className="w-48 h-48"
                />
                {paymentStatus === 'PENDING' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Aguardando pagamento...
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="w-full space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Ou copie o código PIX:
              </p>
              <div className="flex gap-2">
                <Input
                  value={brCode}
                  readOnly
                  className="text-xs font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>⏱️ O código expira em 1 hora</p>
              <p>Após o pagamento, a confirmação é automática</p>
            </div>

            {/* Test Button - Remove in production */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSimulatePayment}
              disabled={simulating || paymentStatus !== 'PENDING'}
              className="mt-2 text-xs border-dashed border-amber-500 text-amber-600 hover:bg-amber-50"
            >
              {simulating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Simulando...
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 mr-1" />
                  Simular Pagamento (Teste)
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
