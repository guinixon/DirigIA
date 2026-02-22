import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, FileText, Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Resource {
  id: string;
  ait_number: string;
  placa: string;
  artigo: string;
  data_infracao: string;
  local: string;
  generated_text: string;
  created_at: string;
}

const Historic = () => {
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetchResources();
  }, []);

  const checkAuthAndFetchResources = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    fetchResources();
  };

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (resource: Resource) => {
    const element = document.createElement("a");
    const file = new Blob([resource.generated_text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `recurso-${resource.ait_number || resource.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Recurso baixado!");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este recurso?")) return;

    try {
      const { error } = await supabase
        .from("resources")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setResources(prev => prev.filter(r => r.id !== id));
      toast.success("Recurso excluído");
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast.error("Erro ao excluir recurso");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto max-w-4xl">
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
            <CardTitle>Histórico de Recursos</CardTitle>
            <CardDescription>
              Todos os recursos que você gerou
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : resources.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Você ainda não gerou nenhum recurso
                </p>
                <Button
                  onClick={() => navigate("/home")}
                  className="mt-4"
                >
                  Gerar Primeiro Recurso
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {resources.map((resource) => (
                  <Card key={resource.id} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <p className="font-semibold">
                              {resource.ait_number || "Recurso"}
                            </p>
                          </div>
                          {resource.placa && (
                            <p className="text-sm text-muted-foreground">
                              Placa: {resource.placa}
                            </p>
                          )}
                          {resource.artigo && (
                            <p className="text-sm text-muted-foreground">
                              {resource.artigo}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Criado em {format(new Date(resource.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleDownload(resource)}
                            title="Baixar"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleDelete(resource.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Historic;