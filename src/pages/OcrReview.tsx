import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface OcrData {
  aitNumber: string;
  dataInfracao: string;
  local: string;
  placa: string;
  renavam: string;
  artigo: string;
  orgaoAutuador: string;
  nomeCondutor?: string;
  cpfCondutor?: string;
  enderecoCondutor?: string;
}

const OcrReview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<OcrData>({
    aitNumber: "",
    dataInfracao: "",
    local: "",
    placa: "",
    renavam: "",
    artigo: "",
    orgaoAutuador: "",
    nomeCondutor: "",
    cpfCondutor: "",
    enderecoCondutor: "",
  });

  useEffect(() => {
    const extractedData = location.state?.extractedData;
    if (extractedData) {
      setFormData(extractedData);
    }
  }, [location]);

  const handleChange = (field: keyof OcrData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContinue = () => {
    navigate("/details", { state: { ocrData: formData } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/home")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Revisar Dados Extraídos</CardTitle>
            <CardDescription>
              Confira e edite os dados extraídos da notificação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aitNumber">Número do Auto de Infração (AIT)</Label>
              <Input
                id="aitNumber"
                value={formData.aitNumber}
                onChange={(e) => handleChange("aitNumber", e.target.value)}
                placeholder="Ex: 12345678"
              />
              {!formData.aitNumber && (
                <p className="text-xs text-muted-foreground">
                  ⚠️ IA não conseguiu extrair. Preencha manualmente.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataInfracao">Data da Infração</Label>
              <Input
                id="dataInfracao"
                type="date"
                value={formData.dataInfracao}
                onChange={(e) => handleChange("dataInfracao", e.target.value)}
              />
              {!formData.dataInfracao && (
                <p className="text-xs text-muted-foreground">
                  ⚠️ IA não conseguiu extrair. Preencha manualmente.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="local">Local da Infração</Label>
              <Input
                id="local"
                value={formData.local}
                onChange={(e) => handleChange("local", e.target.value)}
                placeholder="Ex: Av. Paulista, 1000 - São Paulo/SP"
              />
              {!formData.local && (
                <p className="text-xs text-muted-foreground">
                  ⚠️ IA não conseguiu extrair. Preencha manualmente.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="placa">Placa</Label>
                <Input
                  id="placa"
                  value={formData.placa}
                  onChange={(e) => handleChange("placa", e.target.value)}
                  placeholder="ABC-1234"
                />
                {!formData.placa && (
                  <p className="text-xs text-muted-foreground">
                    ⚠️ IA não conseguiu extrair. Preencha manualmente.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="renavam">RENAVAM</Label>
                <Input
                  id="renavam"
                  value={formData.renavam}
                  onChange={(e) => handleChange("renavam", e.target.value)}
                  placeholder="12345678901"
                />
                {!formData.renavam && (
                  <p className="text-xs text-muted-foreground">
                    ⚠️ IA não conseguiu extrair. Preencha manualmente.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="artigo">Artigo/Código da Infração</Label>
              <Input
                id="artigo"
                value={formData.artigo}
                onChange={(e) => handleChange("artigo", e.target.value)}
                placeholder="Ex: Art. 218, III do CTB"
              />
              {!formData.artigo && (
                <p className="text-xs text-muted-foreground">
                  ⚠️ IA não conseguiu extrair. Preencha manualmente.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgaoAutuador">Órgão Autuador</Label>
              <Input
                id="orgaoAutuador"
                value={formData.orgaoAutuador}
                onChange={(e) => handleChange("orgaoAutuador", e.target.value)}
                placeholder="Ex: DETRAN-SP"
              />
              {!formData.orgaoAutuador && (
                <p className="text-xs text-muted-foreground">
                  ⚠️ IA não conseguiu extrair. Preencha manualmente.
                </p>
              )}
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-4">Dados do Condutor (Opcional)</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeCondutor">Nome Completo</Label>
                  <Input
                    id="nomeCondutor"
                    value={formData.nomeCondutor}
                    onChange={(e) => handleChange("nomeCondutor", e.target.value)}
                    placeholder="Ex: João da Silva"
                  />
                  {!formData.nomeCondutor && (
                    <p className="text-xs text-muted-foreground">
                      ⚠️ IA não conseguiu extrair. Preencha manualmente se disponível.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpfCondutor">CPF</Label>
                  <Input
                    id="cpfCondutor"
                    value={formData.cpfCondutor}
                    onChange={(e) => handleChange("cpfCondutor", e.target.value)}
                    placeholder="Ex: 123.456.789-00"
                  />
                  {!formData.cpfCondutor && (
                    <p className="text-xs text-muted-foreground">
                      ⚠️ IA não conseguiu extrair. Preencha manualmente se disponível.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enderecoCondutor">Endereço</Label>
                  <Input
                    id="enderecoCondutor"
                    value={formData.enderecoCondutor}
                    onChange={(e) => handleChange("enderecoCondutor", e.target.value)}
                    placeholder="Ex: Rua das Flores, 123 - São Paulo/SP"
                  />
                  {!formData.enderecoCondutor && (
                    <p className="text-xs text-muted-foreground">
                      ⚠️ IA não conseguiu extrair. Preencha manualmente se disponível.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={handleContinue}
              className="w-full mt-6"
              size="lg"
            >
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OcrReview;