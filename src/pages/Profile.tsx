import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User, Mail, Crown, FileText, Loader2, Pencil, Check, X, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface Profile {
  name: string;
  email: string;
  plan: string;
  resources_count: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSavingName(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("profiles")
        .update({ name: newName.trim() })
        .eq("id", session.user.id);

      if (error) throw error;
      setProfile((prev) => prev ? { ...prev, name: newName.trim() } : prev);
      setEditingName(false);
      toast.success("Nome atualizado com sucesso");
    } catch (error) {
      console.error("Error updating name:", error);
      toast.error("Erro ao atualizar nome");
    } finally {
      setSavingName(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmed) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;

      await supabase.auth.signOut();
      toast.success("Conta excluída com sucesso");
      navigate("/login");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Erro ao excluir conta");
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
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

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Meu Perfil</CardTitle>
                <CardDescription>
                  Informações da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Nome</p>
                    {editingName ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="h-8"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveName} disabled={savingName}>
                          {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingName(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{profile?.name}</p>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setNewName(profile?.name || ""); setEditingName(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{profile?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Recursos Gerados</p>
                    <p className="font-medium">{profile?.resources_count || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Plano Atual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                  <p className="font-bold text-lg capitalize">
                    {profile?.plan === "free" ? "Gratuito" : "Premium"}
                  </p>
                  {profile?.plan === "free" ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      1 recurso por mês
                    </p>
                  ) : (
                    <p className="text-sm text-success mt-1">
                      Recursos ilimitados
                    </p>
                  )}
                </div>

                {profile?.plan === "free" && (
                  <Button
                    onClick={() => navigate("/subscribe")}
                    className="w-full"
                    size="lg"
                  >
                    Fazer Upgrade para Premium
                  </Button>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={() => { setShowDeleteDialog(true); setDeleteConfirmed(false); }}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Conta
            </Button>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Sair da Conta
            </Button>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Excluir Conta
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-left space-y-3">
                    <p>
                      Tem certeza que deseja excluir sua conta? <strong>Todos os seus dados serão permanentemente apagados</strong>, incluindo:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Seus recursos gerados</li>
                      <li>Histórico de pagamentos</li>
                      <li>Dados do perfil</li>
                    </ul>
                    <p className="font-semibold">Esta ação não pode ser desfeita.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <Checkbox
                    id="confirm-delete"
                    checked={deleteConfirmed}
                    onCheckedChange={(checked) => setDeleteConfirmed(checked === true)}
                  />
                  <label htmlFor="confirm-delete" className="text-sm leading-tight cursor-pointer">
                    Estou ciente de que todos os meus dados serão apagados permanentemente e desejo prosseguir com a exclusão da conta.
                  </label>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    disabled={!deleteConfirmed || deleting}
                    onClick={handleDeleteAccount}
                  >
                    {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Excluir Conta
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;