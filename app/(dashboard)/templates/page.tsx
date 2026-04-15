"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, RefreshCw, CheckCircle, XCircle, Clock, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Template {
  id: string;
  waId: string | null;
  name: string;
  category: string;
  language: string;
  status: string;
  components: Component[];
  rejectedReason: string | null;
  createdAt: string;
}

interface Component {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  text?: string;
  buttons?: { type: string; text: string; url?: string; phone?: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: string }> = {
  approved: { label: "Aprobado", icon: CheckCircle, variant: "approved" },
  rejected: { label: "Rechazado", icon: XCircle, variant: "rejected" },
  pending: { label: "Pendiente", icon: Clock, variant: "pending" },
  paused: { label: "Pausado", icon: PauseCircle, variant: "paused" },
  in_appeal: { label: "En apelación", icon: Clock, variant: "in_appeal" },
  disabled: { label: "Deshabilitado", icon: XCircle, variant: "disabled" },
};

const CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];
const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "es_MX", label: "Español (México)" },
  { code: "en_US", label: "English (US)" },
  { code: "pt_BR", label: "Português (BR)" },
];

const defaultComponents: Component[] = [
  { type: "HEADER", text: "" },
  { type: "BODY", text: "" },
  { type: "FOOTER", text: "" },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("es");
  const [components, setComponents] = useState<Component[]>(defaultComponents);

  const fetchTemplates = async () => {
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
    setLoading(false);
  };

  const syncFromMeta = async () => {
    setSyncing(true);
    await fetch("/api/templates/sync", { method: "POST" });
    await fetchTemplates();
    setSyncing(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openNew = () => {
    setEditing(null);
    setName("");
    setCategory("MARKETING");
    setLanguage("es");
    setComponents(defaultComponents);
    setOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setName(t.name);
    setCategory(t.category);
    setLanguage(t.language);
    setComponents(t.components as Component[]);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const payload = { name, category, language, components };
    const url = editing ? `/api/templates/${editing.id}` : "/api/templates";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setOpen(false);
      fetchTemplates();
    }
    setSaving(false);
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("¿Eliminar este template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    fetchTemplates();
  };

  const updateComponent = (index: number, text: string) => {
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, text } : c)));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Templates</h1>
          <p className="text-xs text-gray-500 mt-0.5">Plantillas de mensajes de WhatsApp Business</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={syncFromMeta} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            Sincronizar con Meta
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo template
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center text-sm text-gray-400 py-12">Cargando...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">No hay templates. Crea uno o sincroniza desde Meta.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => {
              const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;
              const body = (t.components as Component[]).find((c) => c.type === "BODY");

              return (
                <div
                  key={t.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{t.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {t.category}
                        </span>
                        <span className="text-xs text-gray-400">{t.language}</span>
                      </div>
                    </div>
                    <Badge variant={statusCfg.variant as "approved" | "rejected" | "pending"}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusCfg.label}
                    </Badge>
                  </div>

                  {body?.text && (
                    <p className="text-xs text-gray-600 line-clamp-3 bg-gray-50 rounded-lg p-2.5">
                      {body.text}
                    </p>
                  )}

                  {t.rejectedReason && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2.5">
                      <span className="font-medium">Razón de rechazo:</span> {t.rejectedReason}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)} className="flex-1 h-7 text-xs">
                      <Pencil className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplate(t.id)}
                      className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar template" : "Nuevo template"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Nombre</label>
              <Input
                placeholder="nombre_template (sin espacios)"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                disabled={!!editing}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Categoría</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Idioma</label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {components.map((comp, idx) => (
              <div key={comp.type} className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">{comp.type}</label>
                <Textarea
                  placeholder={
                    comp.type === "BODY"
                      ? "Cuerpo del mensaje. Usa {{1}}, {{2}} para variables."
                      : comp.type === "HEADER"
                      ? "Encabezado (opcional)"
                      : "Pie de página (opcional)"
                  }
                  value={comp.text || ""}
                  onChange={(e) => updateComponent(idx, e.target.value)}
                  className={comp.type === "BODY" ? "min-h-[100px]" : "min-h-[60px]"}
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !name}>
              {saving ? "Guardando..." : editing ? "Actualizar" : "Crear y enviar a Meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
