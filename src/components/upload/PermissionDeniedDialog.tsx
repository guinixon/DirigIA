import { ShieldAlert, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PermissionDeniedDialogProps {
  open: boolean;
  onRetry: () => void;
  onClose: () => void;
}

const PermissionDeniedDialog = ({ open, onRetry, onClose }: PermissionDeniedDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto p-4 bg-destructive/10 rounded-2xl w-fit">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <DialogTitle className="text-xl">Permissão Negada</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            Não foi possível acessar a câmera. Verifique as permissões nas configurações do dispositivo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="sm:flex-1">
            Fechar
          </Button>
          <Button variant="outline" onClick={onRetry} className="sm:flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionDeniedDialog;
