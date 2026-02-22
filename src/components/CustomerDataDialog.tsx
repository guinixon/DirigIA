import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; phone: string; cpf: string }) => void;
  isLoading?: boolean;
}

const CustomerDataDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: CustomerDataDialogProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})/, "($1) ")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
    return value;
  };

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpf(e.target.value));
  };

  const isValid = name.trim().length >= 3 && 
    phone.replace(/\D/g, "").length >= 10 && 
    cpf.replace(/\D/g, "").length === 11;

  const handleSubmit = () => {
    if (isValid) {
      onSubmit({
        name: name.trim(),
        phone: phone.replace(/\D/g, ""),
        cpf: cpf.replace(/\D/g, ""),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dados para Pagamento PIX</DialogTitle>
          <DialogDescription>
            Informe seus dados para gerar o QR Code do PIX
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={handlePhoneChange}
              disabled={isLoading}
              maxLength={15}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={handleCpfChange}
              disabled={isLoading}
              maxLength={14}
            />
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className="w-full"
        >
          {isLoading ? "Gerando QR Code..." : "Gerar QR Code PIX"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDataDialog;