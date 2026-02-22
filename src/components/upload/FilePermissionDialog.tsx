import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FilePermissionDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const FilePermissionDialog = ({ open, onConfirm, onCancel }: FilePermissionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto p-4 bg-primary/10 rounded-2xl w-fit">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Acesso aos Arquivos</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            Precisamos acessar seus arquivos para importar a multa.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={onCancel} className="sm:flex-1">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={onConfirm} className="sm:flex-1 btn-premium">
            <FileText className="h-4 w-4 mr-2" />
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FilePermissionDialog;
