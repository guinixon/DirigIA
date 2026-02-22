import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CameraPermissionDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const CameraPermissionDialog = ({ open, onConfirm, onCancel }: CameraPermissionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto p-4 bg-primary/10 rounded-2xl w-fit">
            <Camera className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Acesso à Câmera</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            Para fotografar sua multa com clareza, precisamos acessar a câmera do seu dispositivo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={onCancel} className="sm:flex-1">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={onConfirm} className="sm:flex-1 btn-premium">
            <Camera className="h-4 w-4 mr-2" />
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CameraPermissionDialog;
