import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Download, Home, CheckCircle2, Lock, Copy, Edit3, Save, X, FileText, ArrowRight, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

const CAKTO_CHECKOUT_URL = "https://pay.cakto.com.br/ctkescx_758613";

const AiResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [generatedText, setGeneratedText] = useState("");
  const [editedText, setEditedText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isCheckingPlan, setIsCheckingPlan] = useState(true);

  useEffect(() => {
    const text = location.state?.generatedText;
    if (!text) {
      navigate("/home");
      return;
    }
    setGeneratedText(text);
    setEditedText(text);
    checkUserPlan();
  }, [location, navigate]);

  const checkUserPlan = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsCheckingPlan(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', session.user.id)
        .single();

      setIsPremium(profile?.plan === 'premium');
    } catch (error) {
      console.error('Error checking plan:', error);
    } finally {
      setIsCheckingPlan(false);
    }
  };

  const handleDownloadClick = () => {
    if (isPremium) {
      const text = isEditing ? editedText : generatedText;
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      const lineHeight = 7;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      
      const lines = doc.splitTextToSize(text, maxWidth);
      let y = margin;
      
      for (const line of lines) {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }
      
      doc.save(`recurso-multa-${Date.now()}.pdf`);
      toast.success("Recurso baixado em PDF com sucesso!");
    } else {
      toast.info("Redirecionando para pagamento...");
      window.location.href = CAKTO_CHECKOUT_URL;
    }
  };

  const handleCopyClick = () => {
    navigator.clipboard.writeText(isEditing ? editedText : generatedText);
    toast.success("Recurso copiado para a área de transferência!");
  };

  const handleStartEditing = () => {
    setIsEditing(true);
  };

  const handleSaveEditing = () => {
    setGeneratedText(editedText);
    setIsEditing(false);
    toast.success("Alterações salvas!");
  };

  const handleCancelEditing = () => {
    setEditedText(generatedText);
    setIsEditing(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isPremium) {
      e.preventDefault();
      toast.error("Cópia desabilitada. Assine o plano premium para baixar o recurso.");
    }
  };

  const handleCopyEvent = (e: React.ClipboardEvent) => {
    if (!isPremium) {
      e.preventDefault();
      toast.error("Cópia desabilitada. Assine o plano premium para baixar o recurso.");
    }
  };

  const getPreviewText = () => {
    if (isPremium) return isEditing ? editedText : generatedText;
    
    const textToShow = generatedText;
    const visiblePart = textToShow.substring(0, 500);
    const hiddenLength = Math.max(0, textToShow.length - 500);
    const placeholder = hiddenLength > 0 ? `\n\n[... ${hiddenLength} caracteres restantes - Assine para ver o conteúdo completo ...]` : '';
    return visiblePart + placeholder;
  };

  return (
    <div className="min-h-screen bg-background bg-mesh p-4 md:p-8">
      <div className="fixed inset-0 bg-pattern opacity-30 pointer-events-none" />
      
      <div className="relative container mx-auto max-w-4xl animate-fade-in">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/home")}
            className="hover:bg-muted/60 transition-colors gap-2"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Início</span>
          </Button>
          
          {isPremium && !isCheckingPlan && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/10 text-success rounded-full text-sm font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Premium
            </span>
          )}
        </div>

        {/* Success Banner */}
        <div className="success-banner mb-8 animate-scale-in">
          <div className="p-2 bg-success/20 rounded-lg">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-success">Recurso Gerado com Sucesso!</p>
            <p className="text-sm text-success/80">
              {isPremium 
                ? "Seu recurso foi criado e salvo no histórico" 
                : "Assine o plano premium para baixar o recurso completo"}
            </p>
          </div>
        </div>

        {/* Main Document Card */}
        <Card className="shadow-xl border-border/50 bg-card/95 backdrop-blur-sm mb-8 animate-slide-up">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Seu Recurso de Multa</CardTitle>
                  {!isPremium && !isCheckingPlan && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                      <Lock className="h-3 w-3" />
                      Prévia do documento
                    </span>
                  )}
                </div>
              </div>
              
              {isPremium && !isCheckingPlan && (
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEditing}
                        className="hover:bg-muted/60"
                      >
                        <X className="mr-1.5 h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEditing}
                        className="btn-premium"
                      >
                        <Save className="mr-1.5 h-4 w-4" />
                        Salvar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopyClick}
                        className="hover:bg-muted/60"
                      >
                        <Copy className="mr-1.5 h-4 w-4" />
                        Copiar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleStartEditing}
                        className="hover:bg-muted/60"
                      >
                        <Edit3 className="mr-1.5 h-4 w-4" />
                        Editar
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Document Viewer */}
            <div 
              className="relative"
              onContextMenu={handleContextMenu}
              onCopy={handleCopyEvent}
              style={{ 
                userSelect: isPremium ? 'text' : 'none',
                WebkitUserSelect: isPremium ? 'text' : 'none',
              }}
            >
              {isPremium && isEditing ? (
                <div className="p-6">
                  <Textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="min-h-[500px] font-serif text-base leading-relaxed resize-none border-0 bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl p-6"
                  />
                </div>
              ) : (
                <div className="document-viewer max-h-[600px] overflow-y-auto m-6 rounded-xl">
                  <pre className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                    {getPreviewText()}
                  </pre>
                </div>
              )}
              
              {!isPremium && !isCheckingPlan && generatedText.length > 500 && (
                <div className="absolute bottom-0 left-6 right-6 h-32 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none rounded-b-xl" />
              )}
            </div>

            {/* Protected Content Warning */}
            {!isPremium && !isCheckingPlan && (
              <div className="px-6 pb-6">
                <div className="warning-banner">
                  <div className="p-3 bg-amber-500/10 rounded-full mx-auto mb-3">
                    <Lock className="h-8 w-8" />
                  </div>
                  <p className="font-semibold text-lg">Conteúdo Protegido</p>
                  <p className="text-sm mt-2 max-w-md mx-auto opacity-90">
                    Assine o plano premium para baixar o recurso completo e ter acesso ilimitado a todos os recursos.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-6 pt-0 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleDownloadClick}
                  className="flex-1 h-12 text-base font-medium btn-premium"
                  size="lg"
                  disabled={isCheckingPlan}
                >
                  {isPremium ? (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      Baixar Recurso
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-5 w-5" />
                      Assinar e Baixar
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => navigate("/historic")}
                  variant="secondary"
                  className="flex-1 h-12 text-base font-medium"
                  size="lg"
                >
                  Ver Histórico
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <div className="legal-notice animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-muted rounded-lg shrink-0">
              <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground mb-3">Próximos Passos</p>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed">
                <li>Revise todo o conteúdo do recurso</li>
                <li>Imprima o documento</li>
                <li>Assine e date o recurso</li>
                <li>Anexe os documentos mencionados</li>
                <li>Protocole dentro do prazo legal</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiResult;
