import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import AutoplayPlugin from "embla-carousel-autoplay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Upload, History, User, LogOut, Scale, Moon, Sun, Sparkles, FileText, Download } from "lucide-react";
import { useTheme } from "next-themes";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import OcrLoadingOverlay from "@/components/OcrLoadingOverlay";
import CameraPermissionDialog from "@/components/upload/CameraPermissionDialog";
import PermissionDeniedDialog from "@/components/upload/PermissionDeniedDialog";
import CameraCapture from "@/components/upload/CameraCapture";
import FilePermissionDialog from "@/components/upload/FilePermissionDialog";
import FileUploadPreview, { validateFile } from "@/components/upload/FileUploadPreview";

const CAMERA_PERMISSION_KEY = "dirigia_camera_granted";
const FILE_PERMISSION_KEY = "dirigia_file_granted";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [uploading, setUploading] = useState(false);
  const { theme, setTheme } = useTheme();

  const [showCameraPermission, setShowCameraPermission] = useState(false);
  const [showPermissionDenied, setShowPermissionDenied] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const [showFilePermission, setShowFilePermission] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const legalNotices = [
    "Este aplicativo não substitui advogado. O usuário é responsável por verificar prazos e documentos exigidos pelo órgão de trânsito.",
    "Conduzir um veículo é mais do que um direito, é um compromisso social. Que cada trajeto seja guiado pela prudência, pela paciência e pelo respeito à vida.",
    "O celular pode esperar, a mensagem pode esperar, a ligação pode esperar. A vida de alguém não pode. No trânsito, atenção total é um dever, não uma opção."
  ];

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUser(session.user);
    };
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) { navigate("/login"); } else { setUser(session.user); }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);


  const handleLogout = async () => { await supabase.auth.signOut(); toast.success("Logout realizado"); };

  const processFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Sessão expirada. Faça login novamente."); navigate("/login"); return; }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-ocr`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}` }, body: formData,
      });
      if (!response.ok) { 
        const errorData = await response.json(); 
        if (errorData.isTrafficFine === false) {
          toast.error("Este documento não é uma multa de trânsito. Envie uma notificação válida.", { duration: 5000 });
          return;
        }
        throw new Error(errorData.error || 'Erro ao processar arquivo'); 
      }
      const { extractedData } = await response.json();
      let convertedDate = extractedData.dataInfracao || "";
      if (convertedDate && /^\d{2}\/\d{2}\/\d{4}$/.test(convertedDate)) {
        const [day, month, year] = convertedDate.split('/');
        convertedDate = `${year}-${month}-${day}`;
      }
      toast.success("Dados extraídos com sucesso!");
      navigate("/ocr-review", {
        state: { extractedData: { aitNumber: extractedData.aitNumber || "", dataInfracao: convertedDate, local: extractedData.local || "", placa: extractedData.placa || "", renavam: extractedData.renavam || "", artigo: extractedData.artigo || "", orgaoAutuador: extractedData.orgaoAutuador || "", nomeCondutor: extractedData.nomeCondutor || "", cpfCondutor: extractedData.cpfCondutor || "", enderecoCondutor: extractedData.enderecoCondutor || "" } }
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar arquivo");
    } finally { setUploading(false); }
  };

  // ---- Camera flow ----
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      localStorage.setItem(CAMERA_PERMISSION_KEY, "true");
      setShowCamera(true);
    } catch {
      setShowPermissionDenied(true);
    }
  };

  const handleCameraClick = () => {
    if (localStorage.getItem(CAMERA_PERMISSION_KEY) === "true") {
      openCamera();
    } else {
      setShowCameraPermission(true);
    }
  };

  const handleCameraPermissionConfirm = async () => {
    setShowCameraPermission(false);
    openCamera();
  };

  const handleCameraCapture = (file: File) => { setShowCamera(false); processFile(file); };

  // ---- File flow ----
  const openFilePicker = () => {
    localStorage.setItem(FILE_PERMISSION_KEY, "true");
    fileInputRef.current?.click();
  };

  const handleFileClick = () => {
    if (localStorage.getItem(FILE_PERMISSION_KEY) === "true") {
      openFilePicker();
    } else {
      setShowFilePermission(true);
    }
  };

  const handleFilePermissionConfirm = () => { setShowFilePermission(false); openFilePicker(); };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = "";
    setPendingFile(file);
  };

  const handleFileConfirm = () => {
    if (!pendingFile) return;
    const error = validateFile(pendingFile);
    if (error) { toast.error(error); return; }
    const file = pendingFile;
    setPendingFile(null);
    processFile(file);
  };

  const handleFileReplace = () => { setPendingFile(null); fileInputRef.current?.click(); };

  return (
    <>
      {uploading && <OcrLoadingOverlay />}
      {showCamera && <CameraCapture onCapture={handleCameraCapture} onCancel={() => setShowCamera(false)} />}

      <div className="min-h-screen bg-background bg-mesh">
        <div className="fixed inset-0 bg-pattern opacity-30 pointer-events-none" />
        <header className="relative border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-xl"><Scale className="h-5 w-5 text-primary-foreground" /></div>
              <h1 className="text-xl font-bold tracking-tight">dirigIA</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title={theme === "dark" ? "Modo claro" : "Modo escuro"} className="hover:bg-muted/60 transition-colors">
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/export")} title="Exportar Dados" className="hover:bg-muted/60 transition-colors"><Download className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/historic")} title="Histórico" className="hover:bg-muted/60 transition-colors"><History className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} title="Perfil" className="hover:bg-muted/60 transition-colors"><User className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair" className="hover:bg-destructive/10 hover:text-destructive transition-colors"><LogOut className="h-5 w-5" /></Button>
            </div>
          </div>
        </header>

        <main className="relative container mx-auto px-4 py-12 max-w-4xl">
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent rounded-full text-accent-foreground text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Inteligência Artificial Jurídica
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Gere seu Recurso de Multa</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Envie a notificação da sua multa e deixe nossa IA criar um recurso profissional em segundos
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <Card className="group card-elevated cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl" onClick={handleCameraClick}>
              <CardHeader className="pb-4">
                <div className="p-4 bg-primary/10 rounded-xl w-fit mb-2 group-hover:bg-primary/20 transition-colors duration-200"><Camera className="h-8 w-8 text-primary" /></div>
                <CardTitle className="text-xl">Tirar Foto</CardTitle>
                <CardDescription className="text-muted-foreground">Use a câmera do celular para fotografar a notificação de multa</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full h-12 text-base font-medium btn-premium" size="lg" disabled={uploading}>
                  <Camera className="h-5 w-5 mr-2" />Abrir Câmera
                </Button>
              </CardContent>
            </Card>

            <Card className="group card-elevated cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl" onClick={handleFileClick}>
              <CardHeader className="pb-4">
                <div className="p-4 bg-secondary/10 rounded-xl w-fit mb-2 group-hover:bg-secondary/20 transition-colors duration-200"><Upload className="h-8 w-8 text-secondary-foreground" /></div>
                <CardTitle className="text-xl">Enviar Arquivo</CardTitle>
                <CardDescription className="text-muted-foreground">Envie um PDF, JPG ou PNG da notificação de multa</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full h-12 text-base font-medium" size="lg" disabled={uploading} variant="secondary">
                  <FileText className="h-5 w-5 mr-2" />Selecionar Arquivo
                </Button>
              </CardContent>
            </Card>
          </div>

          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleFileSelected} className="hidden" />

          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Aviso Legal</h3>
              </div>
              <Carousel opts={{ loop: true }} plugins={[AutoplayPlugin({ delay: 8000, stopOnInteraction: false })]} className="w-full">
                <CarouselContent>
                  {legalNotices.map((notice, i) => (
                    <CarouselItem key={i}>
                      <p className="text-sm text-muted-foreground leading-relaxed min-h-[60px]">{notice}</p>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="flex items-center justify-end gap-2 mt-3">
                  <CarouselPrevious className="static translate-y-0 h-8 w-8" />
                  <CarouselNext className="static translate-y-0 h-8 w-8" />
                </div>
              </Carousel>
            </div>
          </div>
        </main>
      </div>

      <CameraPermissionDialog open={showCameraPermission} onConfirm={handleCameraPermissionConfirm} onCancel={() => setShowCameraPermission(false)} />
      <PermissionDeniedDialog open={showPermissionDenied} onRetry={() => { setShowPermissionDenied(false); setShowCameraPermission(true); }} onClose={() => setShowPermissionDenied(false)} />
      <FilePermissionDialog open={showFilePermission} onConfirm={handleFilePermissionConfirm} onCancel={() => setShowFilePermission(false)} />
      {pendingFile && <FileUploadPreview file={pendingFile} onConfirm={handleFileConfirm} onReplace={handleFileReplace} onCancel={() => setPendingFile(null)} />}
    </>
  );
};

export default Home;
