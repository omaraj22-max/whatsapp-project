"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Power, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  conditions: Record<string, string> | null;
  actions: Action[];
  enabled: boolean;
  createdAt: string;
}

interface Action {
  type: string;
  templateName?: string;
  languageCode?: string;
  message?: string;
  agentMode?: string;
}

const TRIGGER_OPTIONS = [
  { value: "monday_lead_created", label: "Monday: Nuevo lead creado", group: "Monday.com" },
  { value: "monday_status_changed", label: "Monday: Status cambiado", group: "Monday.com" },
  { value: "message_received", label: "WhatsApp: Mensaje recibido", group: "WhatsApp" },
  { value: "keyword_received", label: "WhatsApp: Palabra clave recibida", group: "WhatsApp" },
];

const ACTION_OPTIONS = [
  { value: "send_template", label: "Enviar template de WhatsApp" },
  { value: "send_message", label: "Enviar mensaje de texto" },
  { value: "assign_ai", label: "Asignar agente IA" },
  { value: "assign_human", label: "Asignar a humano" },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [wfName, setWfName] = useState("");
  const [wfDesc, setWfDesc] = useState("");
  const [trigger, setTrigger] = useState("monday_lead_created");
  const [conditions, setConditions] = useState<Record<string, string>>({});
  const [actions, setActions] = useState<Action[]>([{ type: "send_template" }]);

  const fetchWorkflows = async () => {
    const res = await fetch("/api/workflows");
    if (res.ok) setWorkflows(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const openNew = () => {
    setWfName("");
    setWfDesc("");
    setTrigger("monday_lead_created");
    setConditions({});
    setActions([{ type: "send_template" }]);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: wfName,
        description: wfDesc,
        trigger,
        conditions,
        actions,
      }),
    });
    if (res.ok) {
      setOpen(false);
      fetchWorkflows();
    }
    setSaving(false);
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, enabled } : w)));
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm("¿Eliminar este workflow?")) return;
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    fetchWorkflows();
  };

  const addAction = () => setActions((prev) => [...prev, { type: "send_message" }]);
  const removeAction = (i: number) => setActions((prev) => prev.filter((_, idx) => idx !== i));
  const updateAction = (i: number, patch: Partial<Action>) =>
    setActions((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

  const triggerLabel = (t: string) => TRIGGER_OPTIONS.find((o) => o.value === t)?.label || t;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Workflows</h1>
          <p className="text-xs text-gray-500 mt-0.5">Automatiza acciones basadas en eventos de Monday o WhatsApp</p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1.5" />
          Nuevo workflow
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loading ? (
          <div className="text-center text-sm text-gray-400 py-12">Cargando...</div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            No hay workflows. Crea uno para automatizar tus procesos.
          </div>
        ) : (
          workflows.map((wf) => (
            <div key={wf.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => setExpanded((e) => (e === wf.id ? null : wf.id))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {expanded === wf.id ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{wf.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-xs">
                      <Power className="w-2.5 h-2.5 mr-1" />
                      {triggerLabel(wf.trigger)}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {(wf.actions as Action[]).length} acción(es)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={wf.enabled}
                    onCheckedChange={(v) => toggleEnabled(wf.id, v)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteWorkflow(wf.id)}
                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {expanded === wf.id && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
                  {wf.description && (
                    <p className="text-xs text-gray-500">{wf.description}</p>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Trigger</p>
                    <p className="text-xs text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2">
                      {triggerLabel(wf.trigger)}
                    </p>
                  </div>
                  {wf.conditions && Object.keys(wf.conditions).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Condiciones</p>
                      <div className="text-xs text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 space-y-1">
                        {Object.entries(wf.conditions as Record<string, string>).map(([k, v]) => (
                          <div key={k}>
                            <span className="font-medium">{k}:</span> {v}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Acciones</p>
                    <div className="space-y-1">
                      {(wf.actions as Action[]).map((action, i) => (
                        <div
                          key={i}
                          className="text-xs text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2"
                        >
                          <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-medium text-xs shrink-0">
                            {i + 1}
                          </span>
                          <span>
                            {ACTION_OPTIONS.find((o) => o.value === action.type)?.label || action.type}
                            {action.templateName && `: ${action.templateName}`}
                            {action.message && `: "${action.message.slice(0, 40)}..."`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create workflow dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo workflow</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Nombre</label>
              <Input placeholder="Nombre del workflow" value={wfName} onChange={(e) => setWfName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Descripción (opcional)</label>
              <Input placeholder="Descripción breve" value={wfDesc} onChange={(e) => setWfDesc(e.target.value)} />
            </div>

            {/* Trigger */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Trigger</label>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="text-xs text-gray-400 mr-1">[{o.group}]</span>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Conditions depending on trigger */}
            {trigger === "monday_status_changed" && (
              <div className="space-y-3 rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-medium text-gray-700">Condiciones del trigger</p>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500">ID del Column en Monday</label>
                  <Input
                    placeholder="ej. status"
                    value={conditions.columnId || ""}
                    onChange={(e) => setConditions((p) => ({ ...p, columnId: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-500">Valor del status (dejar vacío para cualquiera)</label>
                  <Input
                    placeholder="ej. Contactado"
                    value={conditions.statusValue || ""}
                    onChange={(e) => setConditions((p) => ({ ...p, statusValue: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {trigger === "keyword_received" && (
              <div className="space-y-1.5 rounded-lg border border-gray-200 p-3">
                <label className="text-xs font-medium text-gray-700">Palabra clave</label>
                <Input
                  placeholder="ej. precio, cotización, ayuda"
                  value={conditions.keyword || ""}
                  onChange={(e) => setConditions((p) => ({ ...p, keyword: e.target.value }))}
                />
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Acciones</label>
                <Button variant="ghost" size="sm" onClick={addAction} className="h-6 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Agregar
                </Button>
              </div>

              {actions.map((action, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">#{i + 1}</span>
                    <Select value={action.type} onValueChange={(v) => updateAction(i, { type: v })}>
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {actions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAction(i)}
                        className="h-8 w-8 shrink-0 text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  {action.type === "send_template" && (
                    <div className="space-y-1.5">
                      <Input
                        placeholder="Nombre del template"
                        className="h-7 text-xs"
                        value={action.templateName || ""}
                        onChange={(e) => updateAction(i, { templateName: e.target.value })}
                      />
                      <Input
                        placeholder="Código de idioma (ej. es)"
                        className="h-7 text-xs"
                        value={action.languageCode || ""}
                        onChange={(e) => updateAction(i, { languageCode: e.target.value })}
                      />
                    </div>
                  )}

                  {action.type === "send_message" && (
                    <Textarea
                      placeholder="Mensaje a enviar..."
                      className="text-xs min-h-[60px]"
                      value={action.message || ""}
                      onChange={(e) => updateAction(i, { message: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !wfName}>
              {saving ? "Guardando..." : "Crear workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
