import { useState, useEffect, useCallback, Component } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Home, Layers, Wallet, Plus, X, Trash2, Pencil, ArrowLeft, Loader2,
  Scale, Syringe, ShoppingCart, Tag, ChevronRight, Settings, MapPin,
  TrendingUp, RefreshCw, AlertCircle,
} from "lucide-react";

// =====================================================================
// Conexão com o projeto Supabase real "rebanho360"
// =====================================================================
const SUPABASE_URL = "https://mvjtkxpspgexcuyzrcxe.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12anRreHBzcGdleGN1eXpyY3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4OTMyMzYsImV4cCI6MjEwNDQ2OTIzNn0.vvjgukrA9CEY47ROObTK8PivHUtECcd0_uI-Gl8jARU";

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

async function supaGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error((await res.json())?.message || "Erro ao buscar dados");
  return res.json();
}
async function supaInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json())?.message || "Erro ao salvar");
  return res.json();
}
async function supaUpdate(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json())?.message || "Erro ao atualizar");
  return res.json();
}
async function supaUpdateWhere(table, column, value, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json())?.message || "Erro ao atualizar registros relacionados");
  return res.json();
}
async function supaDelete(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error((await res.json())?.message || "Erro ao excluir");
}

// =====================================================================
// Cotação pública da arroba (API AgroDoc AI, dados CEPEA/Esalq)
// =====================================================================
const COTACAO_API_URL = "https://agrodocai.com.br/api/v1/cotacao";
const COTACAO_FONTE = "CEPEA/Esalq via AgroDoc AI";

async function fetchCotacaoArroba() {
  const res = await fetch(COTACAO_API_URL);
  if (!res.ok) throw new Error("Não foi possível obter a cotação agora");
  return res.json();
}

// =====================================================================
// Identidade visual (tokens definidos no PRD do Rebanho360)
// =====================================================================
const COLORS = {
  primary: "#0B0B59",
  primarySoft: "#E7E7F5",
  accent: "#00FF00",
  text: "#595959",
  textDark: "#1C1C1E",
  bg: "#F5F6F8",
  surface: "#FFFFFF",
  border: "#E2E4E9",
  danger: "#C0392B",
};

// =====================================================================
// Formatação
// =====================================================================
const formatBRL = (v) =>
  v === null || v === undefined || v === "" ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};
const formatKg = (v) => (v === null || v === undefined || v === "" ? "—" : `${Number(v).toLocaleString("pt-BR")} kg`);
const todayISO = () => new Date().toISOString().slice(0, 10);
const inDateRange = (dateStr, from, to) => {
  if (!dateStr) return false;
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
};
const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const formatCotacaoHora = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

// =====================================================================
// Rótulos e opções (banco guarda em snake_case, tela mostra em pt-BR)
// =====================================================================
const CATEGORIA_OPTS = ["Bezerro", "Bezerra", "Garrote", "Novilho", "Novilha", "Boi Magro", "Boi Gordo", "Vaca", "Touro"];
const ORIGEM_OPTS = [["compra", "Compra"], ["nascimento", "Nascimento"], ["transferencia", "Transferência"]];
const STATUS_OPTS = [["ativo", "Ativo"], ["vendido", "Vendido"], ["finalizado", "Finalizado"]];
const TIPO_EVENTO_OPTS = [["vacinacao", "Vacinação"], ["medicamento", "Medicamento"], ["manejo", "Manejo"], ["movimentacao", "Movimentação"], ["morte", "Morte"], ["outro", "Outro"]];
const TIPO_VENDA_OPTS = [["parcial", "Parcial"], ["total", "Total"]];
const METODO_RATEIO_OPTS = [["proporcional_cabecas", "Proporcional a cabeças"], ["proporcional_peso", "Proporcional a peso"], ["manual", "Manual"]];
// Sistema de engorda: enum fixo (ordem de intensidade), com regras de negócio não editáveis pelo usuário comum
const SISTEMA_ENGORDA_OPTS = [["pastagem", "Pastagem"], ["semi_confinamento", "Semi-confinamento"], ["confinamento", "Confinamento"]];
const SISTEMA_ENGORDA_LABELS = { pastagem: "Pastagem", semi_confinamento: "Semi-confinamento", confinamento: "Confinamento" };
const SISTEMA_ENGORDA_REGRAS = {
  pastagem: { ganhoDiarioKg: 0.5, pesoAlvoKg: 500 },
  semi_confinamento: { ganhoDiarioKg: 0.8, pesoAlvoKg: 500 },
  confinamento: { ganhoDiarioKg: 1.3, pesoAlvoKg: 500 },
};

const STATUS_LABELS = { ativo: "Ativo", vendido: "Vendido", finalizado: "Finalizado" };
const ORIGEM_LABELS = { compra: "Compra", nascimento: "Nascimento", transferencia: "Transferência" };
const TIPO_EVENTO_LABELS = { vacinacao: "Vacinação", medicamento: "Medicamento", manejo: "Manejo", movimentacao: "Movimentação", morte: "Morte", outro: "Outro" };
const TIPO_VENDA_LABELS = { parcial: "Parcial", total: "Total" };
const METODO_RATEIO_LABELS = { proporcional_cabecas: "Proporcional a cabeças", proporcional_peso: "Proporcional a peso", manual: "Manual" };

// =====================================================================
// Configuração de campos por entidade (usada pelo formulário genérico)
// =====================================================================
function loteFields(categorias, piquetes) {
  const categoriaOpts = categorias && categorias.length ? categorias.map((c) => c.nome) : CATEGORIA_OPTS;
  const piqueteOpts = (piquetes || []).map((p) => p.nome);
  return [
    { name: "identificador", label: "Identificador", type: "text", required: true },
    { name: "categoria", label: "Categoria", type: "select", options: categoriaOpts, required: true },
    { name: "quantidade_inicial", label: "Quantidade inicial (cabeças)", type: "number", step: "1", required: true },
    { name: "quantidade_atual", label: "Quantidade atual (cabeças)", type: "number", step: "1", required: true },
    { name: "peso_medio_atual", label: "Peso médio atual (kg)", type: "number" },
    { name: "data_entrada", label: "Data de entrada", type: "date", required: true },
    { name: "origem", label: "Origem", type: "select", options: ORIGEM_OPTS, required: true },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTS, required: true },
    piqueteOpts.length
      ? { name: "piquete", label: "Piquete / pasto", type: "select", options: piqueteOpts }
      : { name: "piquete", label: "Piquete / pasto", type: "text" },
    { name: "observacoes", label: "Observações", type: "textarea" },
  ];
}
const PESAGEM_FIELDS = [
  { name: "data_pesagem", label: "Data da pesagem", type: "date", required: true },
  { name: "peso_medio", label: "Peso médio (kg)", type: "number", required: true },
  { name: "quantidade_pesada", label: "Cabeças pesadas", type: "number", step: "1" },
  { name: "observacoes", label: "Observações", type: "textarea" },
];
const EVENTO_FIELDS = [
  { name: "tipo_evento", label: "Tipo de evento", type: "select", options: TIPO_EVENTO_OPTS, required: true },
  { name: "data_evento", label: "Data do evento", type: "date", required: true },
  { name: "quantidade_afetada", label: "Cabeças afetadas", type: "number", step: "1" },
  { name: "custo", label: "Despesa (R$)", type: "number" },
  { name: "descricao", label: "Descrição", type: "textarea" },
  { name: "retroativo", label: "Lançamento retroativo", type: "checkbox", checkboxLabel: "Sim, esse evento aconteceu antes de hoje" },
];
const COMPRA_FIELDS = [
  { name: "data_compra", label: "Data da compra", type: "date", required: true },
  { name: "quantidade", label: "Quantidade (cabeças)", type: "number", step: "1", required: true },
  { name: "peso_total", label: "Peso total (kg)", type: "number" },
  { name: "valor_arroba", label: "Valor da arroba (R$)", type: "number" },
  { name: "valor_total", label: "Valor total (R$)", type: "number", required: true },
  { name: "fornecedor", label: "Fornecedor", type: "text" },
  { name: "observacoes", label: "Observações", type: "textarea" },
];
const VENDA_FIELDS = [
  { name: "data_venda", label: "Data da venda", type: "date", required: true },
  { name: "tipo_venda", label: "Tipo de venda", type: "select", options: TIPO_VENDA_OPTS, required: true },
  { name: "quantidade", label: "Quantidade vendida (cabeças)", type: "number", step: "1", required: true },
  { name: "peso_total", label: "Peso total (kg)", type: "number" },
  { name: "valor_arroba", label: "Valor da arroba (R$)", type: "number" },
  { name: "valor_total", label: "Valor total (R$)", type: "number", required: true },
  { name: "comprador", label: "Comprador", type: "text" },
  { name: "observacoes", label: "Observações", type: "textarea" },
];
function despesaFields(categoriasDespesa, lotesAtivos) {
  const categoriaOpts = (categoriasDespesa || []).map((c) => c.nome);
  return [
    { name: "categoria", label: "Categoria", type: "select", options: categoriaOpts, required: true },
    { name: "descricao", label: "Descrição", type: "text", required: true },
    { name: "data_custo", label: "Data da despesa", type: "date", required: true },
    { name: "valor_total", label: "Valor total (R$)", type: "number", required: true },
    { name: "metodo_rateio", label: "Método de rateio", type: "select", options: METODO_RATEIO_OPTS, required: true },
    {
      name: "lotes_rateio_ids",
      label: "Ratear entre",
      type: "lotes",
      options: lotesAtivos || [],
      hint: "Deixe todos desmarcados para ratear entre todos os lotes ativos.",
    },
  ];
}
const CONFIGURACOES_FIELDS = [
  { name: "nome_fazenda", label: "Nome da fazenda", type: "text", required: true },
  { name: "proprietario", label: "Proprietário", type: "text" },
  { name: "metodo_rateio_padrao", label: "Método de rateio padrão para novas despesas", type: "select", options: METODO_RATEIO_OPTS, required: true },
];
const PIQUETE_FIELDS = [
  { name: "nome", label: "Nome do piquete", type: "text", required: true },
  { name: "sistema_engorda", label: "Sistema de engorda", type: "select", options: SISTEMA_ENGORDA_OPTS, required: true },
  { name: "capacidade_cabecas", label: "Capacidade (cabeças)", type: "number", step: "1" },
  { name: "observacoes", label: "Observações", type: "textarea" },
];
const CATEGORIA_FIELDS = [
  { name: "nome", label: "Nome da categoria", type: "text", required: true },
];
const RENOMEAR_RETROATIVO_FIELD = {
  name: "aplicar_retroativo",
  label: "Aplicar retroativamente",
  type: "checkbox",
  checkboxLabel: "Atualizar também os lançamentos já cadastrados com o nome anterior (senão, o novo nome vale só para lançamentos futuros)",
};

function prepareValues(fields, values) {
  const out = {};
  fields.forEach((f) => {
    const v = values[f.name];
    if (f.type === "number") out[f.name] = v === "" || v === undefined || v === null ? null : Number(v);
    else if (f.type === "checkbox") out[f.name] = !!v;
    else if (f.type === "lotes") out[f.name] = Array.isArray(v) && v.length ? v : null;
    else out[f.name] = v === "" || v === undefined ? null : v;
  });
  return out;
}

// =====================================================================
// Componentes de apoio
// =====================================================================
function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: COLORS.bg }}>
      <Loader2 size={28} className="animate-spin" color={COLORS.primary} />
      <p className="text-sm" style={{ color: COLORS.text }}>Carregando dados do Supabase…</p>
    </div>
  );
}

function Toast({ toast }) {
  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-lg text-center z-50"
      style={{ backgroundColor: toast.type === "error" ? COLORS.danger : COLORS.primary, maxWidth: "90%" }}
    >
      {toast.message}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-xl border border-dashed p-5 text-center" style={{ borderColor: COLORS.border }}>
      <p className="text-sm" style={{ color: COLORS.text }}>{text}</p>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
      <p className="text-xs" style={{ color: COLORS.text }}>{label}</p>
      <p className="text-xl font-semibold mt-1" style={{ color: COLORS.textDark }}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    ativo: { backgroundColor: "#E5FCE5", color: "#0B7A0B" },
    vendido: { backgroundColor: COLORS.primarySoft, color: COLORS.primary },
    finalizado: { backgroundColor: "#EDEDED", color: COLORS.text },
  };
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0" style={styles[status] || styles.finalizado}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ backgroundColor: "rgba(11,11,89,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-y-auto"
        style={{ backgroundColor: COLORS.surface, maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
          <h3 className="text-base font-semibold" style={{ color: COLORS.textDark }}>{title}</h3>
          <button onClick={onClose} aria-label="Fechar" className="p-1 rounded-full">
            <X size={20} color={COLORS.text} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function EntityForm({ fields, initialValues, onSubmit, onCancel, submitLabel = "Salvar" }) {
  const [values, setValues] = useState(initialValues || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const setField = (name, val) => setValues((v) => ({ ...v, [name]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((f) => (
        <div key={f.name}>
          {f.type !== "checkbox" && (
            <label className="block text-sm font-medium mb-1" style={{ color: COLORS.textDark }}>
              {f.label}{f.required ? " *" : ""}
            </label>
          )}
          {f.hint && (
            <p className="text-xs mb-1.5" style={{ color: COLORS.text }}>{f.hint}</p>
          )}
          {f.type === "lotes" ? (
            f.options.length === 0 ? (
              <p className="text-sm" style={{ color: COLORS.text }}>Nenhum lote ativo disponível.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border p-2.5" style={{ borderColor: COLORS.border }}>
                {f.options.map((lote) => {
                  const selecionados = values[f.name] || [];
                  const marcado = selecionados.includes(lote.id);
                  return (
                    <label key={lote.id} className="flex items-center gap-2 text-sm py-0.5" style={{ color: COLORS.textDark }}>
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={(e) =>
                          setField(
                            f.name,
                            e.target.checked ? [...selecionados, lote.id] : selecionados.filter((id) => id !== lote.id)
                          )
                        }
                      />
                      {lote.identificador}
                    </label>
                  );
                })}
              </div>
            )
          ) : f.type === "select" ? (
            <select
              required={f.required}
              value={values[f.name] ?? ""}
              onChange={(e) => setField(f.name, e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ borderColor: COLORS.border, color: COLORS.textDark, backgroundColor: COLORS.surface }}
            >
              <option value="" disabled>Selecione…</option>
              {f.options.map((opt) => {
                const [val, label] = Array.isArray(opt) ? opt : [opt, opt];
                return <option key={val} value={val}>{label}</option>;
              })}
            </select>
          ) : f.type === "textarea" ? (
            <textarea
              value={values[f.name] ?? ""}
              onChange={(e) => setField(f.name, e.target.value)}
              rows={3}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ borderColor: COLORS.border, color: COLORS.textDark }}
            />
          ) : f.type === "checkbox" ? (
            <label className="flex items-center gap-2 text-sm" style={{ color: COLORS.textDark }}>
              <input type="checkbox" checked={!!values[f.name]} onChange={(e) => setField(f.name, e.target.checked)} />
              {f.checkboxLabel || f.label}
            </label>
          ) : (
            <input
              required={f.required}
              type={f.type}
              step={f.type === "number" ? (f.step || "any") : undefined}
              value={values[f.name] ?? ""}
              onChange={(e) => setField(f.name, e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ borderColor: COLORS.border, color: COLORS.textDark }}
            />
          )}
        </div>
      ))}
      {error && <p className="text-sm" style={{ color: COLORS.danger }}>{error}</p>}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg py-2.5 text-sm font-medium border" style={{ borderColor: COLORS.border, color: COLORS.text }}>
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ backgroundColor: COLORS.primary, opacity: saving ? 0.7 : 1 }}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function ListSection({ items, emptyText, addLabel, onAdd, renderItem }) {
  return (
    <div className="space-y-3">
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold text-white"
        style={{ backgroundColor: COLORS.primary }}
      >
        <Plus size={16} /> {addLabel}
      </button>
      {items.length === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">{items.map(renderItem)}</div>
      )}
    </div>
  );
}

function ItemCard({ title, subtitle, icon: Icon, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between rounded-xl border p-3.5" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: COLORS.primarySoft }}>
          <Icon size={16} color={COLORS.primary} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: COLORS.textDark }}>{title}</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.text }}>{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {onEdit && (
          <button onClick={onEdit} aria-label="Editar" className="p-1.5">
            <Pencil size={16} color={COLORS.text} />
          </button>
        )}
        <button onClick={onDelete} aria-label="Excluir" className="p-1.5">
          <Trash2 size={16} color={COLORS.text} />
        </button>
      </div>
    </div>
  );
}

function DateRangeFilter({ from, to, onFromChange, onToChange, onClear }) {
  const hasFilter = !!(from || to);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5">
        <label className="text-xs" style={{ color: COLORS.text }}>De</label>
        <input
          type="date"
          value={from || ""}
          onChange={(e) => onFromChange(e.target.value)}
          className="rounded-lg border px-2.5 py-1.5 text-sm"
          style={{ borderColor: COLORS.border, color: COLORS.textDark }}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-xs" style={{ color: COLORS.text }}>Até</label>
        <input
          type="date"
          value={to || ""}
          onChange={(e) => onToChange(e.target.value)}
          className="rounded-lg border px-2.5 py-1.5 text-sm"
          style={{ borderColor: COLORS.border, color: COLORS.textDark }}
        />
      </div>
      {hasFilter && (
        <button onClick={onClear} className="text-xs font-medium" style={{ color: COLORS.primary }}>
          Limpar
        </button>
      )}
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 rounded-full transition-colors"
      style={{ width: 42, height: 24, backgroundColor: checked ? COLORS.primary : COLORS.border }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white transition-transform"
        style={{ width: 20, height: 20, left: 2, transform: checked ? "translateX(18px)" : "translateX(0)" }}
      />
    </button>
  );
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Painel", icon: Home },
  { id: "lotes", label: "Lotes", icon: Layers },
  { id: "custos", label: "Despesas", icon: Wallet },
  { id: "configuracoes", label: "Config.", icon: Settings },
];

function BottomNav({ tab, onChange }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t flex z-40" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
      {NAV_ITEMS.map((it) => {
        const Icon = it.icon;
        const active = tab === it.id;
        return (
          <button key={it.id} onClick={() => onChange(it.id)} className="flex-1 flex flex-col items-center gap-1 py-2.5">
            <Icon size={20} color={active ? COLORS.primary : COLORS.text} />
            <span className="text-xs" style={{ color: active ? COLORS.primary : COLORS.text, fontWeight: active ? 600 : 400 }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Sidebar({ tab, onChange }) {
  return (
    <nav
      className="hidden md:flex md:flex-col md:w-56 lg:w-64 flex-shrink-0 border-r overflow-y-auto"
      style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}
    >
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: COLORS.primary }}>
          <span className="text-sm font-bold" style={{ color: COLORS.accent }}>R</span>
        </div>
        <span className="font-bold text-base" style={{ color: COLORS.primary }}>Rebanho360</span>
      </div>
      <div className="flex-1 px-3 py-2 space-y-1">
        {NAV_ITEMS.map((it) => {
          const Icon = it.icon;
          const active = tab === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
              style={{
                backgroundColor: active ? COLORS.primarySoft : "transparent",
                color: active ? COLORS.primary : COLORS.text,
                fontWeight: active ? 600 : 400,
              }}
            >
              <Icon size={18} color={active ? COLORS.primary : COLORS.text} />
              {it.label === "Config." ? "Configurações" : it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// =====================================================================
// Painel (dashboard) — cotação pública, indicadores e gráficos
// =====================================================================
function buildSerieTemporal(custosBase, mode, temFiltro, dateFrom, dateTo) {
  let start, end;
  if (temFiltro) {
    end = dateTo ? new Date(`${dateTo}T00:00:00`) : new Date();
    start = dateFrom ? new Date(`${dateFrom}T00:00:00`) : new Date(end);
    if (!dateFrom) {
      if (mode === "mensal") start.setMonth(start.getMonth() - 11);
      else start.setFullYear(start.getFullYear() - 4);
    }
  } else {
    end = new Date();
    start = new Date(end);
    if (mode === "mensal") start.setMonth(start.getMonth() - 11);
    else start.setFullYear(start.getFullYear() - 4);
  }

  const buckets = [];
  if (mode === "mensal") {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endCursor = new Date(end.getFullYear(), end.getMonth(), 1);
    let guard = 0;
    while (cursor <= endCursor && guard < 60) {
      buckets.push({
        key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
        label: `${MESES_ABREV[cursor.getMonth()]}/${String(cursor.getFullYear()).slice(2)}`,
        total: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
      guard++;
    }
  } else {
    let y = start.getFullYear();
    const endY = end.getFullYear();
    let guard = 0;
    while (y <= endY && guard < 30) {
      buckets.push({ key: String(y), label: String(y), total: 0 });
      y++;
      guard++;
    }
  }

  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
  custosBase.forEach((c) => {
    const key = mode === "mensal" ? c.data_custo?.slice(0, 7) : c.data_custo?.slice(0, 4);
    if (key && byKey[key]) byKey[key].total += Number(c.valor_total || 0);
  });
  return buckets;
}
function buildComparativoLotes(lotesAtivos, rateios, custosById, temFiltro, dateFrom, dateTo, metrica) {
  return lotesAtivos
    .map((l) => {
      const custoTotal = rateios
        .filter((r) => r.lote_id === l.id)
        .filter((r) => !temFiltro || inDateRange(custosById[r.custo_id]?.data_custo, dateFrom, dateTo))
        .reduce((s, r) => s + Number(r.valor_rateado || 0), 0);
      const cabecas = l.quantidade_atual || 0;
      return {
        nome: l.identificador,
        valor: metrica === "porCabeca" ? (cabecas > 0 ? custoTotal / cabecas : 0) : custoTotal,
      };
    })
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, 8);
}
const compactBRL = (v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `${Math.round(v)}`);
const truncateLabel = (v, max = 16) => (v && v.length > max ? `${v.slice(0, max - 1)}…` : v);
// Tick customizado para eixos de categoria: evita o auto-wrap padrão do recharts, que
// quebra rótulos longos em várias linhas sem espaço entre elas (texto ilegível).
function CategoriaAxisTick({ x, y, payload }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill={COLORS.text}>
      {truncateLabel(payload.value)}
    </text>
  );
}

function CotacaoArrobaCard({ tipos, cotacao, onRetry }) {
  const tiposVisiveis = (tipos || []).filter((t) => t.exibir_dashboard).sort((a, b) => a.ordem - b.ordem);
  if (tiposVisiveis.length === 0) return null;
  const destaque = tiposVisiveis.slice(0, 2);
  const extras = tiposVisiveis.slice(2);
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: COLORS.primary }}>
      <div className="flex items-center gap-1.5">
        <TrendingUp size={16} color={COLORS.accent} />
        <p className="text-sm text-white opacity-80">Cotação da arroba — mercado</p>
      </div>
      {cotacao.loading ? (
        <div className="flex items-center gap-2 mt-3">
          <Loader2 size={16} className="animate-spin" color="#fff" />
          <p className="text-sm text-white opacity-70">Buscando cotação…</p>
        </div>
      ) : cotacao.error ? (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} color={COLORS.accent} />
            <p className="text-sm text-white opacity-80">Cotação indisponível no momento.</p>
          </div>
          <button onClick={onRetry} className="flex items-center gap-1.5 text-xs text-white opacity-70 mt-2">
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mt-3">
            {destaque.map((t) => {
              const valor = cotacao.payload?.[t.campo_api];
              return (
                <div key={t.id}>
                  <p className="text-2xl font-bold text-white">{valor != null ? formatBRL(valor) : "—"}</p>
                  <p className="text-xs text-white opacity-70 mt-0.5">{t.nome} · {t.unidade}</p>
                </div>
              );
            })}
          </div>
          {extras.length > 0 && (
            <div className="mt-4 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
              <div className="space-y-1.5">
                {extras.map((t) => {
                  const valor = cotacao.payload?.[t.campo_api];
                  return (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <span className="text-white opacity-70">{t.nome}</span>
                      <span className="text-white font-medium">
                        {valor != null ? formatBRL(valor) : "—"} <span className="opacity-50 font-normal">{t.unidade}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {cotacao.payload?.atualizado && (
            <p className="text-xs text-white opacity-50 mt-3">
              Atualizado {formatCotacaoHora(cotacao.payload.atualizado)} · Fonte: {COTACAO_FONTE}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Dashboard({ data, onNavigate }) {
  const { lotes, custos, eventos, compras, vendas, rateios, cotacoesTipos } = data;
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [chartMode, setChartMode] = useState("mensal");
  const [comparativoMetrica, setComparativoMetrica] = useState("total");
  const [cotacao, setCotacao] = useState({ loading: true, error: null, payload: null });

  const carregarCotacao = useCallback(() => {
    setCotacao({ loading: true, error: null, payload: null });
    fetchCotacaoArroba()
      .then((payload) => setCotacao({ loading: false, error: null, payload }))
      .catch((err) => setCotacao({ loading: false, error: err.message, payload: null }));
  }, []);
  useEffect(() => { carregarCotacao(); }, [carregarCotacao]);

  const lotesAtivos = lotes.filter((l) => l.status === "ativo");
  const totalCabecas = lotesAtivos.reduce((s, l) => s + (l.quantidade_atual || 0), 0);
  const pesoPonderado = totalCabecas > 0
    ? lotesAtivos.reduce((s, l) => s + (l.quantidade_atual || 0) * (l.peso_medio_atual || 0), 0) / totalCabecas
    : 0;
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const custoMes = custos.filter((c) => c.data_custo?.startsWith(mesAtual)).reduce((s, c) => s + Number(c.valor_total || 0), 0);
  const custoPorCabeca = totalCabecas > 0 ? custoMes / totalCabecas : 0;
  const eventosRecentes = eventos.slice(0, 5);

  const temFiltro = !!(dateFrom || dateTo);
  const custosPeriodo = custos.filter((c) => (temFiltro ? inDateRange(c.data_custo, dateFrom, dateTo) : true));
  const comprasPeriodo = compras.filter((c) => (temFiltro ? inDateRange(c.data_compra, dateFrom, dateTo) : true));
  const vendasPeriodo = vendas.filter((v) => (temFiltro ? inDateRange(v.data_venda, dateFrom, dateTo) : true));
  const custoPeriodoTotal = custosPeriodo.reduce((s, c) => s + Number(c.valor_total || 0), 0);
  const custoPorCabecaPeriodo = totalCabecas > 0 ? custoPeriodoTotal / totalCabecas : 0;
  const comprasValorPeriodo = comprasPeriodo.reduce((s, c) => s + Number(c.valor_total || 0), 0);
  const vendasValorPeriodo = vendasPeriodo.reduce((s, v) => s + Number(v.valor_total || 0), 0);

  const custosById = Object.fromEntries(custos.map((c) => [c.id, c]));
  const serieTemporal = buildSerieTemporal(temFiltro ? custosPeriodo : custos, chartMode, temFiltro, dateFrom, dateTo);
  const comparativoLotes = buildComparativoLotes(lotesAtivos, rateios, custosById, temFiltro, dateFrom, dateTo, comparativoMetrica);

  return (
    <div className="space-y-5 pt-1">
      <div>
        <h1 className="text-xl font-bold" style={{ color: COLORS.textDark }}>Painel</h1>
        <p className="text-sm" style={{ color: COLORS.text }}>
          {now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
        <CotacaoArrobaCard tipos={cotacoesTipos} cotacao={cotacao} onRetry={carregarCotacao} />

        <div className="rounded-2xl p-5 mt-5 lg:mt-0" style={{ backgroundColor: COLORS.primary }}>
          <p className="text-sm text-white opacity-80">Despesa do rebanho este mês</p>
          <p className="text-3xl font-bold text-white mt-1">{formatBRL(custoMes)}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.accent }} />
            <p className="text-sm text-white opacity-80">{formatBRL(custoPorCabeca)} por cabeça</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Lotes ativos" value={lotesAtivos.length} />
        <KpiCard label="Cabeças no rebanho" value={totalCabecas.toLocaleString("pt-BR")} />
        <KpiCard label="Peso médio geral" value={`${pesoPonderado.toFixed(0)} kg`} />
        <KpiCard label="Despesas lançadas" value={custos.length} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold" style={{ color: COLORS.textDark }}>Resumo do período</h2>
        </div>
        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} onClear={() => { setDateFrom(""); setDateTo(""); }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          <KpiCard label={temFiltro ? "Despesas no período" : "Despesas (total)"} value={formatBRL(custoPeriodoTotal)} />
          <KpiCard label={temFiltro ? "Custo/cabeça no período" : "Custo/cabeça (total)"} value={formatBRL(custoPorCabecaPeriodo)} />
          <KpiCard label={temFiltro ? "Compras no período" : "Compras (total)"} value={`${comprasPeriodo.length} · ${formatBRL(comprasValorPeriodo)}`} />
          <KpiCard label={temFiltro ? "Vendas no período" : "Vendas (total)"} value={`${vendasPeriodo.length} · ${formatBRL(vendasValorPeriodo)}`} />
        </div>
      </div>

      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
      <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold" style={{ color: COLORS.textDark }}>
            Despesas ao longo do tempo{temFiltro ? " (período filtrado)" : ""}
          </p>
          <div className="flex gap-1 flex-shrink-0">
            {[["mensal", "Mensal"], ["anual", "Anual"]].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setChartMode(val)}
                className="px-2.5 py-1 rounded-full text-xs whitespace-nowrap"
                style={{
                  backgroundColor: chartMode === val ? COLORS.primary : "transparent",
                  color: chartMode === val ? "#fff" : COLORS.text,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {custos.length === 0 ? (
          <EmptyState text="Nenhuma despesa lançada ainda." />
        ) : (
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={serieTemporal} margin={{ left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.text }} />
                <YAxis tick={{ fontSize: 11, fill: COLORS.text }} tickFormatter={compactBRL} width={40} />
                <Tooltip formatter={(v) => [formatBRL(v), "Despesa"]} />
                <Bar dataKey="total" fill={COLORS.primary} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold" style={{ color: COLORS.textDark }}>
            Despesa rateada por lote{temFiltro ? " (período filtrado)" : ""}
          </p>
          <div className="flex gap-1 flex-shrink-0">
            {[["total", "Total"], ["porCabeca", "Por cabeça"]].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setComparativoMetrica(val)}
                className="px-2.5 py-1 rounded-full text-xs whitespace-nowrap"
                style={{
                  backgroundColor: comparativoMetrica === val ? COLORS.primary : "transparent",
                  color: comparativoMetrica === val ? "#fff" : COLORS.text,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {comparativoLotes.length === 0 ? (
          <EmptyState text="Nenhum lote ativo para comparar." />
        ) : (
          <div style={{ width: "100%", height: Math.max(140, comparativoLotes.length * 34) }}>
            <ResponsiveContainer>
              <BarChart data={comparativoLotes} layout="vertical" margin={{ left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: COLORS.text }} tickFormatter={compactBRL} />
                <YAxis type="category" dataKey="nome" tick={<CategoriaAxisTick />} width={72} />
                <Tooltip formatter={(v) => [formatBRL(v), comparativoMetrica === "porCabeca" ? "Custo por cabeça" : "Despesa total rateada"]} />
                <Bar dataKey="valor" fill={COLORS.primary} radius={[0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start space-y-5 lg:space-y-0">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold" style={{ color: COLORS.textDark }}>Lotes ativos</h2>
          <button onClick={() => onNavigate("lotes")} className="text-sm font-medium" style={{ color: COLORS.primary }}>Ver todos</button>
        </div>
        {lotesAtivos.length === 0 ? (
          <EmptyState text="Nenhum lote ativo no momento." />
        ) : (
          <div className="space-y-2">
            {lotesAtivos.slice(0, 4).map((l) => (
              <button
                key={l.id}
                onClick={() => onNavigate("lotes", l.id)}
                className="w-full flex items-center justify-between rounded-xl border p-3.5 text-left"
                style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: COLORS.textDark }}>{l.identificador}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.text }}>
                    {l.categoria}, {l.quantidade_atual} cabeças{l.peso_medio_atual ? `, ${l.peso_medio_atual} kg` : ""}
                  </p>
                </div>
                <ChevronRight size={18} color={COLORS.text} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-2" style={{ color: COLORS.textDark }}>Eventos recentes</h2>
        {eventosRecentes.length === 0 ? (
          <EmptyState text="Nenhum evento registrado ainda." />
        ) : (
          <div className="space-y-2">
            {eventosRecentes.map((e) => {
              const lote = lotes.find((l) => l.id === e.lote_id);
              return (
                <div key={e.id} className="rounded-xl border p-3.5" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
                  <p className="text-sm font-medium" style={{ color: COLORS.textDark }}>
                    {TIPO_EVENTO_LABELS[e.tipo_evento] || e.tipo_evento}{lote ? ` em ${lote.identificador}` : ""}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: COLORS.text }}>
                    {formatDate(e.data_evento)}{e.descricao ? `, ${e.descricao}` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// =====================================================================
// Lista de lotes
// =====================================================================
function LotesList({ lotes, categorias, piquetes, onSelect, reload, showToast }) {
  const [filter, setFilter] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const filtered = (filter === "todos" ? lotes : lotes.filter((l) => l.status === filter))
    .filter((l) => inDateRange(l.data_entrada, dateFrom, dateTo));
  const fields = loteFields(categorias, piquetes);

  const handleCreate = async (values) => {
    await supaInsert("lotes", prepareValues(fields, values));
    await reload();
    setShowForm(false);
    showToast("Lote cadastrado com sucesso.");
  };

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: COLORS.textDark }}>Lotes</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: COLORS.primary }}
        >
          <Plus size={16} /> Novo lote
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {[["todos", "Todos"], ["ativo", "Ativos"], ["vendido", "Vendidos"], ["finalizado", "Finalizados"]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className="px-3 py-1.5 rounded-full text-sm whitespace-nowrap border flex-shrink-0"
            style={{
              borderColor: filter === val ? COLORS.primary : COLORS.border,
              backgroundColor: filter === val ? COLORS.primary : "transparent",
              color: filter === val ? "#fff" : COLORS.text,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} onClear={() => { setDateFrom(""); setDateTo(""); }} />

      {filtered.length === 0 ? (
        <EmptyState text="Nenhum lote encontrado." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((l) => (
            <button
              key={l.id}
              onClick={() => onSelect(l.id)}
              className="w-full text-left rounded-xl border p-4"
              style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: COLORS.textDark }}>{l.identificador}</p>
                  <p className="text-xs mt-0.5" style={{ color: COLORS.text }}>{l.categoria}, entrada em {formatDate(l.data_entrada)}</p>
                </div>
                <StatusBadge status={l.status} />
              </div>
              <div className="flex gap-4 mt-3 text-xs" style={{ color: COLORS.text }}>
                <span>{l.quantidade_atual} de {l.quantidade_inicial} cabeças</span>
                {l.peso_medio_atual ? <span>{l.peso_medio_atual} kg médio</span> : null}
              </div>
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="Novo lote" onClose={() => setShowForm(false)}>
          <EntityForm
            fields={fields}
            initialValues={{ status: "ativo", origem: "compra", data_entrada: todayISO() }}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            submitLabel="Cadastrar lote"
          />
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Estimativa de engorda (com base no sistema de engorda do piquete atual)
// =====================================================================
function calcularEstimativaEngorda(lote, piquetes) {
  const piqueteAtual = (piquetes || []).find((p) => p.nome === lote.piquete);
  if (!piqueteAtual) return null;
  const regra = SISTEMA_ENGORDA_REGRAS[piqueteAtual.sistema_engorda];
  if (!regra) return null;
  const pesoAtual = Number(lote.peso_medio_atual) || 0;
  if (pesoAtual <= 0) return { sistema: piqueteAtual.sistema_engorda, regra, semPeso: true };
  const diferencaKg = Math.max(0, regra.pesoAlvoKg - pesoAtual);
  const diasEstimados = Math.ceil(diferencaKg / regra.ganhoDiarioKg);
  const dataEstimada = new Date(Date.now() + diasEstimados * 86400000);
  return { sistema: piqueteAtual.sistema_engorda, regra, pesoAtual, diasEstimados, dataEstimada };
}

// =====================================================================
// Detalhe do lote
// =====================================================================
function LoteDetail({ lote, data, onBack, reload, showToast }) {
  const [subtab, setSubtab] = useState("geral");
  const [showLoteForm, setShowLoteForm] = useState(false);
  const [showDeleteLote, setShowDeleteLote] = useState(false);
  const [formFor, setFormFor] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const pesagensDesc = data.pesagens.filter((p) => p.lote_id === lote.id);
  const pesagensAsc = [...pesagensDesc].sort((a, b) => a.data_pesagem.localeCompare(b.data_pesagem));
  const eventos = data.eventos.filter((e) => e.lote_id === lote.id);
  const compras = data.compras.filter((c) => c.lote_id === lote.id);
  const vendas = data.vendas.filter((v) => v.lote_id === lote.id);
  const historicoPiquetes = (data.historicoPiquetes || [])
    .filter((h) => h.lote_id === lote.id)
    .sort((a, b) => b.data_inicio.localeCompare(a.data_inicio));
  const historicoFiltrado = historicoPiquetes.filter((h) => inDateRange(h.data_inicio, dateFrom, dateTo));
  const pesagensFiltradas = pesagensDesc.filter((p) => inDateRange(p.data_pesagem, dateFrom, dateTo));
  const eventosFiltrados = eventos.filter((e) => inDateRange(e.data_evento, dateFrom, dateTo));
  const comprasFiltradas = compras.filter((c) => inDateRange(c.data_compra, dateFrom, dateTo));
  const vendasFiltradas = vendas.filter((v) => inDateRange(v.data_venda, dateFrom, dateTo));
  const fields = loteFields(data.categorias, data.piquetes);
  const estimativa = calcularEstimativaEngorda(lote, data.piquetes);

  const handleUpdateLote = async (values) => {
    await supaUpdate("lotes", lote.id, prepareValues(fields, values));
    await reload();
    setShowLoteForm(false);
    showToast("Lote atualizado.");
  };
  const handleDeleteLote = async () => {
    await supaDelete("lotes", lote.id);
    await reload();
    showToast("Lote excluído.");
    onBack();
  };

  const handleCreatePesagem = async (values) => {
    const payload = { ...prepareValues(PESAGEM_FIELDS, values), lote_id: lote.id };
    await supaInsert("pesagens", payload);
    await supaUpdate("lotes", lote.id, { peso_medio_atual: payload.peso_medio });
    await reload();
    setFormFor(null);
    showToast("Pesagem registrada e peso do lote atualizado.");
  };
  const handleDeletePesagem = async (id) => { await supaDelete("pesagens", id); await reload(); showToast("Pesagem excluída."); };

  const handleCreateEvento = async (values) => {
    const payload = { ...prepareValues(EVENTO_FIELDS, values), lote_id: lote.id };
    await supaInsert("eventos", payload);
    if (payload.tipo_evento === "morte" && payload.quantidade_afetada) {
      const novaQtd = Math.max(0, (lote.quantidade_atual || 0) - payload.quantidade_afetada);
      await supaUpdate("lotes", lote.id, { quantidade_atual: novaQtd });
    }
    await reload();
    setFormFor(null);
    showToast("Evento registrado.");
  };
  const handleDeleteEvento = async (id) => { await supaDelete("eventos", id); await reload(); showToast("Evento excluído."); };

  const handleCreateCompra = async (values) => {
    const payload = { ...prepareValues(COMPRA_FIELDS, values), lote_id: lote.id };
    await supaInsert("compras", payload);
    await reload();
    setFormFor(null);
    showToast("Compra registrada.");
  };
  const handleDeleteCompra = async (id) => { await supaDelete("compras", id); await reload(); showToast("Compra excluída."); };

  const handleCreateVenda = async (values) => {
    const payload = { ...prepareValues(VENDA_FIELDS, values), lote_id: lote.id };
    await supaInsert("vendas", payload);
    const novaQtd = Math.max(0, (lote.quantidade_atual || 0) - payload.quantidade);
    const patch = { quantidade_atual: novaQtd };
    if (novaQtd === 0) patch.status = "vendido";
    await supaUpdate("lotes", lote.id, patch);
    await reload();
    setFormFor(null);
    showToast(novaQtd === 0 ? "Venda registrada. Lote marcado como vendido." : "Venda registrada.");
  };
  const handleDeleteVenda = async (id) => { await supaDelete("vendas", id); await reload(); showToast("Venda excluída."); };

  const SUBTABS = [
    { id: "geral", label: "Visão geral" },
    { id: "pesagens", label: "Pesagens" },
    { id: "eventos", label: "Eventos" },
    { id: "compras", label: "Compras" },
    { id: "vendas", label: "Vendas" },
    { id: "piquetes", label: "Piquetes" },
  ];

  return (
    <div className="space-y-4 pt-1">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: COLORS.text }}>
        <ArrowLeft size={16} /> Lotes
      </button>

      <div className="rounded-2xl p-4" style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate" style={{ color: COLORS.textDark }}>{lote.identificador}</h1>
            <p className="text-sm mt-0.5" style={{ color: COLORS.text }}>
              {lote.categoria}, {ORIGEM_LABELS[lote.origem]}, entrada em {formatDate(lote.data_entrada)}
            </p>
          </div>
          <StatusBadge status={lote.status} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div>
            <p className="text-xs" style={{ color: COLORS.text }}>Cabeças</p>
            <p className="text-sm font-semibold" style={{ color: COLORS.textDark }}>{lote.quantidade_atual} / {lote.quantidade_inicial}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: COLORS.text }}>Peso médio</p>
            <p className="text-sm font-semibold" style={{ color: COLORS.textDark }}>{formatKg(lote.peso_medio_atual)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: COLORS.text }}>Piquete</p>
            <p className="text-sm font-semibold truncate" style={{ color: COLORS.textDark }}>{lote.piquete || "—"}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setShowLoteForm(true)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium border" style={{ borderColor: COLORS.border, color: COLORS.textDark }}>
            <Pencil size={14} /> Editar
          </button>
          <button onClick={() => setShowDeleteLote(true)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium border" style={{ borderColor: COLORS.border, color: COLORS.danger }}>
            <Trash2 size={14} /> Excluir
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {SUBTABS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSubtab(s.id)}
            className="px-3 py-1.5 rounded-full text-sm whitespace-nowrap border flex-shrink-0"
            style={{
              borderColor: subtab === s.id ? COLORS.primary : COLORS.border,
              backgroundColor: subtab === s.id ? COLORS.primary : "transparent",
              color: subtab === s.id ? "#fff" : COLORS.text,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {subtab !== "geral" && (
        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} onClear={() => { setDateFrom(""); setDateTo(""); }} />
      )}

      {subtab === "geral" && (
        <div className="space-y-4">
          {estimativa && (
            <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
              <p className="text-sm font-semibold" style={{ color: COLORS.textDark }}>Estimativa de engorda</p>
              <p className="text-xs mt-0.5 mb-3" style={{ color: COLORS.text }}>
                Sistema {SISTEMA_ENGORDA_LABELS[estimativa.sistema]} · piquete {lote.piquete}
              </p>
              {estimativa.semPeso ? (
                <p className="text-sm" style={{ color: COLORS.text }}>Registre uma pesagem para calcular a estimativa.</p>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs" style={{ color: COLORS.text }}>Ganho diário estimado</p>
                    <p className="text-sm font-semibold" style={{ color: COLORS.textDark }}>{estimativa.regra.ganhoDiarioKg.toFixed(2)} kg/dia</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: COLORS.text }}>Peso alvo de venda</p>
                    <p className="text-sm font-semibold" style={{ color: COLORS.textDark }}>{estimativa.regra.pesoAlvoKg} kg</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: COLORS.text }}>Tempo estimado até a venda</p>
                    <p className="text-sm font-semibold" style={{ color: COLORS.textDark }}>{estimativa.diasEstimados === 0 ? "Já no peso alvo" : `${estimativa.diasEstimados} dias`}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: COLORS.text }}>Data estimada de venda</p>
                    <p className="text-sm font-semibold" style={{ color: COLORS.textDark }}>
                      {estimativa.diasEstimados === 0 ? "—" : formatDate(estimativa.dataEstimada.toISOString().slice(0, 10))}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          {!estimativa && lote.piquete && (
            <EmptyState text={`Não foi possível calcular a estimativa: o piquete "${lote.piquete}" não está mais cadastrado em Configurações.`} />
          )}
          {pesagensAsc.length >= 2 && (
            <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
              <p className="text-sm font-semibold mb-2" style={{ color: COLORS.textDark }}>Evolução do peso médio</p>
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer>
                  <LineChart data={pesagensAsc.map((p) => ({ data: formatDate(p.data_pesagem).slice(0, 5), peso: Number(p.peso_medio) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="data" tick={{ fontSize: 11, fill: COLORS.text }} />
                    <YAxis tick={{ fontSize: 11, fill: COLORS.text }} domain={["dataMin - 10", "dataMax + 10"]} />
                    <Tooltip formatter={(v) => [`${v} kg`, "Peso médio"]} />
                    <Line type="monotone" dataKey="peso" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3, fill: COLORS.primary }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Pesagens registradas" value={pesagensDesc.length} />
            <KpiCard label="Eventos registrados" value={eventos.length} />
            <KpiCard label="Compras" value={compras.length} />
            <KpiCard label="Vendas" value={vendas.length} />
          </div>
          {lote.observacoes && (
            <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
              <p className="text-sm font-semibold mb-1" style={{ color: COLORS.textDark }}>Observações</p>
              <p className="text-sm" style={{ color: COLORS.text }}>{lote.observacoes}</p>
            </div>
          )}
        </div>
      )}

      {subtab === "pesagens" && (
        <ListSection
          items={pesagensFiltradas}
          emptyText={dateFrom || dateTo ? "Nenhuma pesagem encontrada para o período." : "Nenhuma pesagem registrada para este lote."}
          addLabel="Nova pesagem"
          onAdd={() => setFormFor({ type: "pesagem" })}
          renderItem={(p) => (
            <ItemCard
              key={p.id}
              title={`${p.peso_medio} kg`}
              subtitle={`${formatDate(p.data_pesagem)}${p.quantidade_pesada ? `, ${p.quantidade_pesada} cabeças pesadas` : ""}`}
              icon={Scale}
              onDelete={() => handleDeletePesagem(p.id)}
            />
          )}
        />
      )}

      {subtab === "eventos" && (
        <ListSection
          items={eventosFiltrados}
          emptyText={dateFrom || dateTo ? "Nenhum evento encontrado para o período." : "Nenhum evento registrado para este lote."}
          addLabel="Novo evento"
          onAdd={() => setFormFor({ type: "evento" })}
          renderItem={(e) => (
            <ItemCard
              key={e.id}
              title={TIPO_EVENTO_LABELS[e.tipo_evento] || e.tipo_evento}
              subtitle={`${formatDate(e.data_evento)}${e.descricao ? `, ${e.descricao}` : ""}${e.retroativo ? ", retroativo" : ""}`}
              icon={Syringe}
              onDelete={() => handleDeleteEvento(e.id)}
            />
          )}
        />
      )}

      {subtab === "compras" && (
        <ListSection
          items={comprasFiltradas}
          emptyText={dateFrom || dateTo ? "Nenhuma compra encontrada para o período." : "Nenhuma compra registrada para este lote."}
          addLabel="Nova compra"
          onAdd={() => setFormFor({ type: "compra" })}
          renderItem={(c) => (
            <ItemCard
              key={c.id}
              title={formatBRL(c.valor_total)}
              subtitle={`${formatDate(c.data_compra)}, ${c.quantidade} cabeças${c.fornecedor ? `, ${c.fornecedor}` : ""}`}
              icon={ShoppingCart}
              onDelete={() => handleDeleteCompra(c.id)}
            />
          )}
        />
      )}

      {subtab === "vendas" && (
        <ListSection
          items={vendasFiltradas}
          emptyText={dateFrom || dateTo ? "Nenhuma venda encontrada para o período." : "Nenhuma venda registrada para este lote."}
          addLabel="Nova venda"
          onAdd={() => setFormFor({ type: "venda" })}
          renderItem={(v) => (
            <ItemCard
              key={v.id}
              title={formatBRL(v.valor_total)}
              subtitle={`${formatDate(v.data_venda)}, ${v.quantidade} cabeças, ${TIPO_VENDA_LABELS[v.tipo_venda]}${v.comprador ? `, ${v.comprador}` : ""}`}
              icon={Tag}
              onDelete={() => handleDeleteVenda(v.id)}
            />
          )}
        />
      )}

      {subtab === "piquetes" && (
        historicoFiltrado.length === 0 ? (
          <EmptyState text={dateFrom || dateTo ? "Nenhuma movimentação encontrada para o período." : "Nenhuma movimentação de piquete registrada para este lote."} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {historicoFiltrado.map((h) => {
              const piqueteInfo = data.piquetes.find((p) => p.nome === h.piquete);
              return (
                <div key={h.id} className="rounded-xl border p-3.5" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium" style={{ color: COLORS.textDark }}>{h.piquete || "Sem piquete"}</p>
                    {!h.data_fim && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#E5FCE5", color: "#0B7A0B" }}>Atual</span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: COLORS.text }}>
                    {piqueteInfo ? SISTEMA_ENGORDA_LABELS[piqueteInfo.sistema_engorda] : "Sistema de engorda não identificado"}
                  </p>
                  <p className="text-xs mt-1" style={{ color: COLORS.text }}>
                    {formatDate(h.data_inicio)} até {h.data_fim ? formatDate(h.data_fim) : "hoje"}
                  </p>
                </div>
              );
            })}
          </div>
        )
      )}

      {showLoteForm && (
        <Modal title="Editar lote" onClose={() => setShowLoteForm(false)}>
          <EntityForm fields={fields} initialValues={lote} onSubmit={handleUpdateLote} onCancel={() => setShowLoteForm(false)} submitLabel="Salvar alterações" />
        </Modal>
      )}

      {showDeleteLote && (
        <Modal title="Excluir lote" onClose={() => setShowDeleteLote(false)}>
          <p className="text-sm mb-4" style={{ color: COLORS.text }}>
            Tem certeza que deseja excluir o lote "{lote.identificador}"? Todas as pesagens, eventos e vendas ligados a ele também serão excluídos. Essa ação não pode ser desfeita.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteLote(false)} className="flex-1 rounded-lg py-2.5 text-sm font-medium border" style={{ borderColor: COLORS.border, color: COLORS.text }}>Cancelar</button>
            <button onClick={handleDeleteLote} className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: COLORS.danger }}>Excluir</button>
          </div>
        </Modal>
      )}

      {formFor?.type === "pesagem" && (
        <Modal title="Nova pesagem" onClose={() => setFormFor(null)}>
          <EntityForm fields={PESAGEM_FIELDS} initialValues={{ data_pesagem: todayISO() }} onSubmit={handleCreatePesagem} onCancel={() => setFormFor(null)} submitLabel="Registrar pesagem" />
        </Modal>
      )}
      {formFor?.type === "evento" && (
        <Modal title="Novo evento" onClose={() => setFormFor(null)}>
          <EntityForm fields={EVENTO_FIELDS} initialValues={{ data_evento: todayISO() }} onSubmit={handleCreateEvento} onCancel={() => setFormFor(null)} submitLabel="Registrar evento" />
        </Modal>
      )}
      {formFor?.type === "compra" && (
        <Modal title="Nova compra" onClose={() => setFormFor(null)}>
          <EntityForm fields={COMPRA_FIELDS} initialValues={{ data_compra: todayISO() }} onSubmit={handleCreateCompra} onCancel={() => setFormFor(null)} submitLabel="Registrar compra" />
        </Modal>
      )}
      {formFor?.type === "venda" && (
        <Modal title="Nova venda" onClose={() => setFormFor(null)}>
          <EntityForm fields={VENDA_FIELDS} initialValues={{ data_venda: todayISO(), tipo_venda: "parcial" }} onSubmit={handleCreateVenda} onCancel={() => setFormFor(null)} submitLabel="Registrar venda" />
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Despesas e rateio
// =====================================================================
function buildComparativoCategorias(custosFiltrados) {
  const porCategoria = {};
  custosFiltrados.forEach((c) => {
    const key = c.categoria || "Sem categoria";
    porCategoria[key] = (porCategoria[key] || 0) + Number(c.valor_total || 0);
  });
  return Object.entries(porCategoria)
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor || a.categoria.localeCompare(b.categoria, "pt-BR"));
}

function DespesasScreen({ custos, rateios, lotes, categoriasDespesa, metodoRateioPadrao, reload, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const custosFiltrados = custos.filter((c) => inDateRange(c.data_custo, dateFrom, dateTo));
  const lotesAtivos = lotes.filter((l) => l.status === "ativo");
  const fields = despesaFields(categoriasDespesa, lotesAtivos);

  const handleCreate = async (values) => {
    const payload = prepareValues(fields, values);
    await supaInsert("custos", payload);
    await reload();
    setShowForm(false);
    showToast(
      payload.lotes_rateio_ids
        ? "Despesa lançada e rateada entre os lotes selecionados."
        : "Despesa lançada e rateada automaticamente entre todos os lotes ativos."
    );
  };
  const handleDelete = async (id) => { await supaDelete("custos", id); await reload(); showToast("Despesa excluída."); setSelected(null); };

  const totalGeral = custosFiltrados.reduce((s, c) => s + Number(c.valor_total || 0), 0);
  const comparativoCategorias = buildComparativoCategorias(custosFiltrados);
  const temFiltroPeriodo = !!(dateFrom || dateTo);

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: COLORS.textDark }}>Despesas</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: COLORS.primary }}
        >
          <Plus size={16} /> Nova despesa
        </button>
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: COLORS.primary }}>
        <p className="text-sm text-white opacity-80">Total no período filtrado</p>
        <p className="text-2xl font-bold text-white mt-1">{formatBRL(totalGeral)}</p>
      </div>

      <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} onClear={() => { setDateFrom(""); setDateTo(""); }} />

      {custosFiltrados.length > 0 && (
        <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
          <p className="text-sm font-semibold mb-2" style={{ color: COLORS.textDark }}>
            Despesas por categoria{temFiltroPeriodo ? " (período filtrado)" : ""}
          </p>
          <div style={{ width: "100%", height: Math.max(140, comparativoCategorias.length * 34) }}>
            <ResponsiveContainer>
              <BarChart data={comparativoCategorias} layout="vertical" margin={{ left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: COLORS.text }} tickFormatter={compactBRL} />
                <YAxis type="category" dataKey="categoria" tick={<CategoriaAxisTick />} width={110} />
                <Tooltip formatter={(v) => [formatBRL(v), "Despesa"]} />
                <Bar dataKey="valor" fill={COLORS.primary} radius={[0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {custosFiltrados.length === 0 ? (
        <EmptyState text="Nenhuma despesa encontrada para o período." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {custosFiltrados.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="w-full text-left flex items-center justify-between gap-3 rounded-xl border p-3.5"
              style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: COLORS.textDark }}>{c.descricao}</p>
                <p className="text-xs mt-0.5" style={{ color: COLORS.text }}>{c.categoria}, {formatDate(c.data_custo)}</p>
              </div>
              <p className="text-sm font-semibold flex-shrink-0" style={{ color: COLORS.textDark }}>{formatBRL(c.valor_total)}</p>
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="Nova despesa" onClose={() => setShowForm(false)}>
          <EntityForm
            fields={fields}
            initialValues={{ data_custo: todayISO(), metodo_rateio: metodoRateioPadrao || "proporcional_cabecas", lotes_rateio_ids: [] }}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            submitLabel="Lançar despesa"
          />
        </Modal>
      )}

      {selected && (
        <Modal title="Detalhe da despesa" onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: COLORS.textDark }}>{selected.descricao}</p>
              <p className="text-xs mt-0.5" style={{ color: COLORS.text }}>
                {selected.categoria}, {formatDate(selected.data_custo)} · Rateio {METODO_RATEIO_LABELS[selected.metodo_rateio] || selected.metodo_rateio}
              </p>
              <p className="text-lg font-bold mt-2" style={{ color: COLORS.textDark }}>{formatBRL(selected.valor_total)}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: COLORS.textDark }}>Rateio entre lotes</p>
              <div className="space-y-1.5">
                {rateios.filter((r) => r.custo_id === selected.id).sort((a, b) => b.valor_rateado - a.valor_rateado).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm py-1.5 border-b" style={{ borderColor: COLORS.border }}>
                    <span style={{ color: COLORS.textDark }}>{r.lotes?.identificador || "Lote removido"}</span>
                    <span style={{ color: COLORS.text }}>{formatBRL(r.valor_rateado)} ({r.percentual}%)</span>
                  </div>
                ))}
                {rateios.filter((r) => r.custo_id === selected.id).length === 0 && (
                  <p className="text-sm" style={{ color: COLORS.text }}>Nenhum lote elegível para ratear esta despesa.</p>
                )}
              </div>
            </div>
            <button onClick={() => handleDelete(selected.id)} className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium border" style={{ borderColor: COLORS.border, color: COLORS.danger }}>
              <Trash2 size={14} /> Excluir despesa
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Configurações
// =====================================================================
function ConfiguracoesScreen({ configuracoes, piquetes, categorias, categoriasDespesa, cotacoesTipos, reload, showToast }) {
  const [showEditFazenda, setShowEditFazenda] = useState(false);
  const [piqueteForm, setPiqueteForm] = useState(null);
  const [categoriaForm, setCategoriaForm] = useState(null);
  const [categoriaDespesaForm, setCategoriaDespesaForm] = useState(null);

  const handleToggleCotacao = async (tipo, exibir) => {
    await supaUpdate("cotacoes_tipos", tipo.id, { exibir_dashboard: exibir });
    await reload();
  };

  const handleUpdateFazenda = async (values) => {
    await supaUpdate("configuracoes", configuracoes.id, prepareValues(CONFIGURACOES_FIELDS, values));
    await reload();
    setShowEditFazenda(false);
    showToast("Configurações da fazenda atualizadas.");
  };

  const handleSavePiquete = async (values) => {
    const payload = prepareValues(PIQUETE_FIELDS, values);
    let msg = "Piquete cadastrado.";
    if (piqueteForm?.id) {
      const nomeAnterior = piqueteForm.nome;
      await supaUpdate("piquetes", piqueteForm.id, payload);
      if (payload.nome && payload.nome !== nomeAnterior) {
        if (values.aplicar_retroativo) {
          const atualizados = await supaUpdateWhere("lotes", "piquete", nomeAnterior, { piquete: payload.nome });
          msg = `Piquete atualizado. ${atualizados.length} lote(s) já cadastrados foram atualizados para o novo nome.`;
        } else {
          msg = "Piquete atualizado. O novo nome vale só para lançamentos futuros.";
        }
      } else {
        msg = "Piquete atualizado.";
      }
    } else {
      await supaInsert("piquetes", payload);
    }
    await reload();
    setPiqueteForm(null);
    showToast(msg);
  };
  const handleDeletePiquete = async (id) => { await supaDelete("piquetes", id); await reload(); showToast("Piquete excluído."); };

  const handleSaveCategoria = async (values) => {
    const payload = prepareValues(CATEGORIA_FIELDS, values);
    let msg = "Categoria cadastrada.";
    if (categoriaForm?.id) {
      const nomeAnterior = categoriaForm.nome;
      await supaUpdate("categorias_gado", categoriaForm.id, payload);
      if (payload.nome && payload.nome !== nomeAnterior) {
        if (values.aplicar_retroativo) {
          const atualizados = await supaUpdateWhere("lotes", "categoria", nomeAnterior, { categoria: payload.nome });
          msg = `Categoria atualizada. ${atualizados.length} lote(s) já cadastrados foram atualizados para o novo nome.`;
        } else {
          msg = "Categoria atualizada. O novo nome vale só para lançamentos futuros.";
        }
      } else {
        msg = "Categoria atualizada.";
      }
    } else {
      await supaInsert("categorias_gado", payload);
    }
    await reload();
    setCategoriaForm(null);
    showToast(msg);
  };
  const handleDeleteCategoria = async (id) => { await supaDelete("categorias_gado", id); await reload(); showToast("Categoria excluída."); };

  const handleSaveCategoriaDespesa = async (values) => {
    const payload = prepareValues(CATEGORIA_FIELDS, values);
    let msg = "Categoria de despesa cadastrada.";
    if (categoriaDespesaForm?.id) {
      const nomeAnterior = categoriaDespesaForm.nome;
      await supaUpdate("categorias_despesa", categoriaDespesaForm.id, payload);
      if (payload.nome && payload.nome !== nomeAnterior) {
        if (values.aplicar_retroativo) {
          const atualizados = await supaUpdateWhere("custos", "categoria", nomeAnterior, { categoria: payload.nome });
          msg = `Categoria de despesa atualizada. ${atualizados.length} despesa(s) já lançadas foram atualizadas para o novo nome.`;
        } else {
          msg = "Categoria de despesa atualizada. O novo nome vale só para lançamentos futuros.";
        }
      } else {
        msg = "Categoria de despesa atualizada.";
      }
    } else {
      await supaInsert("categorias_despesa", payload);
    }
    await reload();
    setCategoriaDespesaForm(null);
    showToast(msg);
  };
  const handleDeleteCategoriaDespesa = async (id) => { await supaDelete("categorias_despesa", id); await reload(); showToast("Categoria de despesa excluída."); };

  return (
    <div className="space-y-5 pt-1">
      <h1 className="text-xl font-bold" style={{ color: COLORS.textDark }}>Configurações</h1>

      <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: COLORS.textDark }}>Dados da fazenda</p>
            <p className="text-sm mt-1" style={{ color: COLORS.textDark }}>{configuracoes?.nome_fazenda || "—"}</p>
            {configuracoes?.proprietario && (
              <p className="text-xs mt-0.5" style={{ color: COLORS.text }}>Proprietário: {configuracoes.proprietario}</p>
            )}
            <p className="text-xs mt-2" style={{ color: COLORS.text }}>
              Método de rateio padrão: {METODO_RATEIO_LABELS[configuracoes?.metodo_rateio_padrao] || "—"}
            </p>
          </div>
          <button onClick={() => setShowEditFazenda(true)} aria-label="Editar dados da fazenda" className="p-1.5 flex-shrink-0">
            <Pencil size={16} color={COLORS.text} />
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-2" style={{ color: COLORS.textDark }}>Piquetes cadastrados</h2>
        <ListSection
          items={piquetes}
          emptyText="Nenhum piquete cadastrado ainda."
          addLabel="Novo piquete"
          onAdd={() => setPiqueteForm({ sistema_engorda: "pastagem" })}
          renderItem={(p) => (
            <ItemCard
              key={p.id}
              title={p.nome}
              subtitle={`${SISTEMA_ENGORDA_LABELS[p.sistema_engorda] || p.sistema_engorda}${p.capacidade_cabecas ? ` · Capacidade: ${p.capacidade_cabecas} cabeças` : ""}`}
              icon={MapPin}
              onEdit={() => setPiqueteForm(p)}
              onDelete={() => handleDeletePiquete(p.id)}
            />
          )}
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-2" style={{ color: COLORS.textDark }}>Categorias de gado</h2>
        <ListSection
          items={categorias}
          emptyText="Nenhuma categoria cadastrada ainda."
          addLabel="Nova categoria"
          onAdd={() => setCategoriaForm({})}
          renderItem={(c) => (
            <ItemCard key={c.id} title={c.nome} subtitle="Categoria de gado" icon={Tag} onEdit={() => setCategoriaForm(c)} onDelete={() => handleDeleteCategoria(c.id)} />
          )}
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-2" style={{ color: COLORS.textDark }}>Categorias de despesa</h2>
        <ListSection
          items={categoriasDespesa || []}
          emptyText="Nenhuma categoria de despesa cadastrada ainda."
          addLabel="Nova categoria"
          onAdd={() => setCategoriaDespesaForm({})}
          renderItem={(c) => (
            <ItemCard key={c.id} title={c.nome} subtitle="Categoria de despesa" icon={Wallet} onEdit={() => setCategoriaDespesaForm(c)} onDelete={() => handleDeleteCategoriaDespesa(c.id)} />
          )}
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-2" style={{ color: COLORS.textDark }}>Cotação da arroba no Painel</h2>
        <p className="text-xs mb-3" style={{ color: COLORS.text }}>
          Escolha quais tipos de gado aparecem no card de cotação do Painel. Os 2 primeiros selecionados aparecem em destaque; os demais aparecem em uma tabela ao lado. Valores vêm de uma API pública (CEPEA/Esalq via AgroDoc AI).
        </p>
        {(cotacoesTipos || []).length === 0 ? (
          <EmptyState text="Nenhum tipo de cotação disponível." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {cotacoesTipos.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border p-3.5" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: COLORS.textDark }}>{t.nome}</p>
                  <p className="text-xs mt-0.5" style={{ color: COLORS.text }}>{t.unidade}</p>
                </div>
                <Switch checked={t.exibir_dashboard} onChange={(v) => handleToggleCotacao(t, v)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {showEditFazenda && (
        <Modal title="Editar dados da fazenda" onClose={() => setShowEditFazenda(false)}>
          <EntityForm
            fields={CONFIGURACOES_FIELDS}
            initialValues={configuracoes}
            onSubmit={handleUpdateFazenda}
            onCancel={() => setShowEditFazenda(false)}
            submitLabel="Salvar alterações"
          />
        </Modal>
      )}
      {piqueteForm && (
        <Modal title={piqueteForm.id ? "Editar piquete" : "Novo piquete"} onClose={() => setPiqueteForm(null)}>
          <EntityForm
            fields={piqueteForm.id ? [...PIQUETE_FIELDS, RENOMEAR_RETROATIVO_FIELD] : PIQUETE_FIELDS}
            initialValues={{ ...piqueteForm, aplicar_retroativo: true }}
            onSubmit={handleSavePiquete}
            onCancel={() => setPiqueteForm(null)}
            submitLabel={piqueteForm.id ? "Salvar alterações" : "Cadastrar piquete"}
          />
        </Modal>
      )}
      {categoriaForm && (
        <Modal title={categoriaForm.id ? "Editar categoria" : "Nova categoria"} onClose={() => setCategoriaForm(null)}>
          <EntityForm
            fields={categoriaForm.id ? [...CATEGORIA_FIELDS, RENOMEAR_RETROATIVO_FIELD] : CATEGORIA_FIELDS}
            initialValues={{ ...categoriaForm, aplicar_retroativo: true }}
            onSubmit={handleSaveCategoria}
            onCancel={() => setCategoriaForm(null)}
            submitLabel={categoriaForm.id ? "Salvar alterações" : "Cadastrar categoria"}
          />
        </Modal>
      )}
      {categoriaDespesaForm && (
        <Modal title={categoriaDespesaForm.id ? "Editar categoria" : "Nova categoria"} onClose={() => setCategoriaDespesaForm(null)}>
          <EntityForm
            fields={categoriaDespesaForm.id ? [...CATEGORIA_FIELDS, RENOMEAR_RETROATIVO_FIELD] : CATEGORIA_FIELDS}
            initialValues={{ ...categoriaDespesaForm, aplicar_retroativo: true }}
            onSubmit={handleSaveCategoriaDespesa}
            onCancel={() => setCategoriaDespesaForm(null)}
            submitLabel={categoriaDespesaForm.id ? "Salvar alterações" : "Cadastrar categoria"}
          />
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Proteção contra tela em branco: mostra o erro em vez de sumir a tela
// =====================================================================
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Rebanho360 — erro no protótipo:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 10, padding: 24, textAlign: "center",
            backgroundColor: COLORS.bg, fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <p style={{ fontWeight: 700, color: COLORS.textDark, fontSize: 15 }}>Algo deu errado ao carregar o protótipo</p>
          <p style={{ fontSize: 13, color: COLORS.text, maxWidth: 340 }}>
            {String((this.state.error && this.state.error.message) || this.state.error)}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// =====================================================================
// App principal
// =====================================================================
function Rebanho360App() {
  const [tab, setTab] = useState("dashboard");
  const [selectedLoteId, setSelectedLoteId] = useState(null);
  const [data, setData] = useState({ lotes: [], pesagens: [], eventos: [], compras: [], vendas: [], custos: [], rateios: [], configuracoes: null, piquetes: [], categorias: [], categoriasDespesa: [], cotacoesTipos: [], historicoPiquetes: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadAll = useCallback(async () => {
    try {
      const [lotes, pesagens, eventos, compras, vendas, custos, rateios, configuracoesRows, piquetes, categorias, categoriasDespesa, cotacoesTipos, historicoPiquetes] = await Promise.all([
        supaGet("lotes?select=*&order=data_entrada.desc"),
        supaGet("pesagens?select=*&order=data_pesagem.desc"),
        supaGet("eventos?select=*&order=data_evento.desc"),
        supaGet("compras?select=*&order=data_compra.desc"),
        supaGet("vendas?select=*&order=data_venda.desc"),
        supaGet("custos?select=*&order=data_custo.desc"),
        supaGet("rateio_custos?select=*,lotes(identificador)"),
        supaGet("configuracoes?select=*&limit=1"),
        supaGet("piquetes?select=*&order=nome.asc"),
        supaGet("categorias_gado?select=*&order=ordem.asc,nome.asc"),
        supaGet("categorias_despesa?select=*&order=ordem.asc,nome.asc"),
        supaGet("cotacoes_tipos?select=*&order=ordem.asc"),
        supaGet("lote_piquete_historico?select=*&order=data_inicio.desc"),
      ]);
      setData({ lotes, pesagens, eventos, compras, vendas, custos, rateios, configuracoes: configuracoesRows[0] || null, piquetes, categorias, categoriasDespesa, cotacoesTipos, historicoPiquetes });
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const navigate = (t, loteId) => {
    setTab(t);
    setSelectedLoteId(loteId || null);
  };

  if (loading) return <LoadingScreen />;

  const selectedLote = data.lotes.find((l) => l.id === selectedLoteId);

  return (
    <div
      className="min-h-screen md:h-screen flex flex-col md:flex-row"
      style={{ backgroundColor: COLORS.bg, fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      <Sidebar tab={selectedLote ? "lotes" : tab} onChange={(t) => navigate(t)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden px-5 pt-5 pb-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS.primary }}>
            <span className="text-sm font-bold" style={{ color: COLORS.accent }}>R</span>
          </div>
          <span className="font-bold text-base" style={{ color: COLORS.primary }}>Rebanho360</span>
        </header>

        <main className="flex-1 px-5 md:px-8 lg:px-10 md:py-8 overflow-y-auto pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto">
            {selectedLote ? (
              <LoteDetail lote={selectedLote} data={data} onBack={() => navigate("lotes")} reload={loadAll} showToast={showToast} />
            ) : tab === "dashboard" ? (
              <Dashboard data={data} onNavigate={navigate} />
            ) : tab === "lotes" ? (
              <LotesList lotes={data.lotes} categorias={data.categorias} piquetes={data.piquetes} onSelect={(id) => navigate("lotes", id)} reload={loadAll} showToast={showToast} />
            ) : tab === "custos" ? (
              <DespesasScreen
                custos={data.custos}
                rateios={data.rateios}
                lotes={data.lotes}
                categoriasDespesa={data.categoriasDespesa}
                metodoRateioPadrao={data.configuracoes?.metodo_rateio_padrao}
                reload={loadAll}
                showToast={showToast}
              />
            ) : (
              <ConfiguracoesScreen
                configuracoes={data.configuracoes}
                piquetes={data.piquetes}
                categorias={data.categorias}
                categoriasDespesa={data.categoriasDespesa}
                cotacoesTipos={data.cotacoesTipos}
                reload={loadAll}
                showToast={showToast}
              />
            )}
          </div>
        </main>

        <BottomNav tab={selectedLote ? "lotes" : tab} onChange={(t) => navigate(t)} />
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );
}

export default function Rebanho360() {
  return (
    <ErrorBoundary>
      <Rebanho360App />
    </ErrorBoundary>
  );
}
