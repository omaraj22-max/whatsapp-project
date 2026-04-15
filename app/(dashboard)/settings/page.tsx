"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, ExternalLink, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface Settings {
  META_ACCESS_TOKEN: string;
  META_PHONE_NUMBER_ID: string;
  META_WHATSAPP_BUSINESS_ACCOUNT_ID: string;
  META_WEBHOOK_VERIFY_TOKEN: string;
  MONDAY_API_TOKEN: string;
  MONDAY_BOARD_ID: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  OPENAI_SYSTEM_PROMPT: string;
}

interface SettingFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secret?: boolean;
  multiline?: boolean;
  hint?: string;
}

function SettingField({ label, value, onChange, placeholder, secret, multiline, hint }: SettingFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[80px] text-sm font-mono"
        />
      ) : (
        <div className="relative">
          <Input
            type={secret && !show ? "password" : "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="pr-9 font-mono text-sm"
          />
          {secret && (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ConnectionStatus({ connected, label }: { connected: boolean | null; label: string }) {
  if (connected === null) return null;
  return (
    <div className={`flex items-center gap-1.5 text-xs ${connected ? "text-emerald-600" : "text-red-500"}`}>
      {connected ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {connected ? `${label} conectado` : `${label} sin conectar`}
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    META_ACCESS_TOKEN: "",
    META_PHONE_NUMBER_ID: "",
    META_WHATSAPP_BUSINESS_ACCOUNT_ID: "",
    META_WEBHOOK_VERIFY_TOKEN: "",
    MONDAY_API_TOKEN: "",
    MONDAY_BOARD_ID: "",
    OPENAI_API_KEY: "",
    OPENAI_MODEL: "gpt-4o",
    OPENAI_SYSTEM_PROMPT: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Record<string, boolean | null>>({
    whatsapp: null,
    monday: null,
    openai: null,
  });
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((data) => {
      if (data) setSettings((prev) => ({ ...prev, ...data }));
    });
    // Derive webhook URL from current host
    setWebhookUrl(`${window.location.origin}/api/webhooks/whatsapp`);
  }, []);

  const set = (key: keyof Settings) => (value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const saveSettings = async () => {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const testConnection = async (service: "whatsapp" | "monday" | "openai") => {
    setTesting((p) => ({ ...p, [service]: true }));
    const res = await fetch(`/api/settings/test/${service}`, { method: "POST" });
    setStatus((p) => ({ ...p, [service]: res.ok }));
    setTesting((p) => ({ ...p, [service]: false }));
  };

  const setupMondayWebhook = async () => {
    const res = await fetch("/api/monday/setup-webhook", { method: "POST" });
    if (res.ok) alert("Webhook de Monday configurado correctamente");
    else alert("Error al configurar webhook de Monday");
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4 bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Ajustes</h1>
            <p className="text-xs text-gray-500 mt-0.5">Configura tus conexiones a WhatsApp, Monday y OpenAI</p>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? "Guardando..." : saved ? "Guardado ✓" : "Guardar todo"}
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-2xl">
        {/* WhatsApp / Meta */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-sm">📱</span>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">WhatsApp Business API</h2>
                <p className="text-xs text-gray-400">Meta Cloud API</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ConnectionStatus connected={status.whatsapp} label="WhatsApp" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnection("whatsapp")}
                disabled={testing.whatsapp}
              >
                {testing.whatsapp ? "Probando..." : "Probar"}
              </Button>
            </div>
          </div>

          <SettingField
            label="Access Token"
            value={settings.META_ACCESS_TOKEN}
            onChange={set("META_ACCESS_TOKEN")}
            placeholder="EAAxxxxxx..."
            secret
            hint="Token permanente de Meta"
          />
          <SettingField
            label="Phone Number ID"
            value={settings.META_PHONE_NUMBER_ID}
            onChange={set("META_PHONE_NUMBER_ID")}
            placeholder="123456789"
            hint="En Meta Business Manager"
          />
          <SettingField
            label="WhatsApp Business Account ID"
            value={settings.META_WHATSAPP_BUSINESS_ACCOUNT_ID}
            onChange={set("META_WHATSAPP_BUSINESS_ACCOUNT_ID")}
            placeholder="WABA ID"
          />

          {/* Webhook info */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-2">
            <p className="text-xs font-medium text-blue-800">Configuración de Webhook en Meta</p>
            <p className="text-xs text-blue-600">
              En tu Meta App → WhatsApp → Configuration → Webhook, usa:
            </p>
            <div className="bg-white rounded border border-blue-200 px-3 py-2 flex items-center justify-between gap-2">
              <code className="text-xs text-gray-700 truncate">{webhookUrl}</code>
              <button
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
                className="text-blue-500 hover:text-blue-700 text-xs shrink-0"
              >
                Copiar
              </button>
            </div>
            <SettingField
              label="Verify Token"
              value={settings.META_WEBHOOK_VERIFY_TOKEN}
              onChange={set("META_WEBHOOK_VERIFY_TOKEN")}
              placeholder="tu_token_de_verificacion"
              hint="El mismo que configuras en Meta"
            />
          </div>

          <a
            href="https://developers.facebook.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            Ir a Meta Developer Portal
            <ExternalLink className="w-3 h-3" />
          </a>
        </section>

        {/* Monday.com */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <span className="text-sm">📋</span>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Monday.com</h2>
                <p className="text-xs text-gray-400">CRM de leads</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ConnectionStatus connected={status.monday} label="Monday" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnection("monday")}
                disabled={testing.monday}
              >
                {testing.monday ? "Probando..." : "Probar"}
              </Button>
            </div>
          </div>

          <SettingField
            label="API Token"
            value={settings.MONDAY_API_TOKEN}
            onChange={set("MONDAY_API_TOKEN")}
            placeholder="eyJhbGciOi..."
            secret
          />
          <SettingField
            label="Board ID principal"
            value={settings.MONDAY_BOARD_ID}
            onChange={set("MONDAY_BOARD_ID")}
            placeholder="123456789"
            hint="ID del tablero de leads"
          />

          <Button variant="outline" size="sm" onClick={setupMondayWebhook}>
            Configurar Webhook de Monday automáticamente
          </Button>

          <a
            href="https://developer.monday.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            Ir a Monday Developer Center
            <ExternalLink className="w-3 h-3" />
          </a>
        </section>

        {/* OpenAI */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-sm">🤖</span>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">OpenAI</h2>
                <p className="text-xs text-gray-400">Agente de IA para conversaciones</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ConnectionStatus connected={status.openai} label="OpenAI" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnection("openai")}
                disabled={testing.openai}
              >
                {testing.openai ? "Probando..." : "Probar"}
              </Button>
            </div>
          </div>

          <SettingField
            label="API Key"
            value={settings.OPENAI_API_KEY}
            onChange={set("OPENAI_API_KEY")}
            placeholder="sk-..."
            secret
          />
          <SettingField
            label="Modelo"
            value={settings.OPENAI_MODEL}
            onChange={set("OPENAI_MODEL")}
            placeholder="gpt-4o"
            hint="Recomendado: gpt-4o"
          />
          <SettingField
            label="System Prompt del agente"
            value={settings.OPENAI_SYSTEM_PROMPT}
            onChange={set("OPENAI_SYSTEM_PROMPT")}
            placeholder="Eres un asistente de ventas amable..."
            multiline
          />

          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600 space-y-1">
            <p className="font-medium">Modos del agente de IA (por conversación):</p>
            <p>• <strong>Humano:</strong> Solo el operador responde</p>
            <p>• <strong>IA:</strong> El agente responde automáticamente</p>
            <p>• <strong>Auto:</strong> Se activa según keyword o timeout (configurable en cada conversación)</p>
          </div>
        </section>
      </div>
    </div>
  );
}
