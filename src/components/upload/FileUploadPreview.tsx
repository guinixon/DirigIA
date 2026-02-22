import { useState, useEffect } from "react";
import { FileText, Image, X, Check, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FileUploadPreviewProps {
  file: File;
  onConfirm: () => void;
  onReplace: () => void;
  onCancel: () => void;
}

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Formato não suportado. Envie um PDF, JPG ou PNG.";
  }
  if (file.size > MAX_SIZE) {
    return "O arquivo excede o tamanho máximo permitido (10MB).";
  }
  return null;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FileUploadPreview = ({ file, onConfirm, onReplace, onCancel }: FileUploadPreviewProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const error = validateFile(file);
  const isImage = file.type.startsWith("image/");

  useEffect(() => {
    if (isImage && !error) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage, error]);

  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center space-y-3">
          <DialogTitle className="text-xl">
            {error ? "Arquivo Inválido" : "Confirmar Envio"}
          </DialogTitle>
          <DialogDescription>
            {error
              ? "O arquivo selecionado não pode ser utilizado."
              : "Verifique o arquivo antes de enviar."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="p-4 bg-destructive/10 rounded-2xl">
                <AlertTriangle className="h-10 w-10 text-destructive" />
              </div>
              <p className="text-sm text-destructive text-center font-medium">{error}</p>
            </div>
          ) : (
            <>
              {/* Preview area */}
              <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                {isImage && preview ? (
                  <img
                    src={preview}
                    alt="Preview do documento"
                    className="w-full max-h-[300px] object-contain bg-muted/50"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="p-4 bg-primary/10 rounded-2xl">
                      <FileText className="h-10 w-10 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">Documento PDF</p>
                  </div>
                )}
              </div>

              {/* File info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                {isImage ? (
                  <Image className="h-5 w-5 text-muted-foreground shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {error ? (
            <>
              <Button variant="outline" onClick={onCancel} className="sm:flex-1">
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={onReplace} className="sm:flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Escolher outro arquivo
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onReplace} className="sm:flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Escolher outro
              </Button>
              <Button onClick={onConfirm} className="sm:flex-1 btn-premium">
                <Check className="h-4 w-4 mr-2" />
                Confirmar envio
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadPreview;
