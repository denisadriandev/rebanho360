import { useState, useEffect, useCallback, Component } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Home, Layers, Wallet, Plus, X, Trash2, Pencil, ArrowLeft, Loader2,
  Scale, Syringe, ShoppingCart, Tag, ChevronRight,
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
async function supaDelete(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error((await res.json())?.message || "Erro ao excluir");
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

// =====================================================================
// Rótulos e opções (banco guarda em snake_case, tela mostra em pt-BR)
// =====================================================================
const CATEGORIA_OPTS = ["Bezerro", "Bezerra", "Garrote", "Novilho", "Novilha", "Boi Magro", "Boi Gordo", "Vaca", "Touro"];
const ORIGEM_OPTS = [["compra", "Compra"], ["nascimento", "Nascimento"], ["transferencia", "Transferência"]];
const STATUS_OPTS = [["ativo", "Ativo"], ["vendido", "Vendido"], ["finalizado", "Finalizado"]];
const TIPO_EVENTO_OPTS = [["vacinacao", "Vacinação"], ["medicamento", "Medicamento"], ["manejo", "Manejo"], ["movimentacao", "Movimentação"], ["morte", "Morte"], ["outro", "Outro"]];
const TIPO_VENDA_OPTS = [["parcial", "Parcial"], ["total", "Total"]];
const CATEGORIA_CUSTO_OPTS = [["alimentacao", "Alimentação"], ["sanidade", "Sanidade"], ["mao_de_obra", "Mão de obra"], ["infraestrutura", "Infraestrutura"], ["outro", "Outro"]];

const STATUS_LABELS = { ativo: "Ativo", vendido: "Vendido", finalizado: "Finalizado" };
const ORIGEM_LABELS = { compra: "Compra", nascimento: "Nascimento", transferencia: "Transferência" };
const TIPO_EVENTO_LABELS = { vacinacao: "Vacinação", medicamento: "Medicamento", manejo: "Manejo", movimentacao: "Movimentação", morte: "Morte", outro: "Outro" };
const TIPO_VENDA_LABELS = { parcial: "Parcial", total: "Total" };
const CATEGORIA_CUSTO_LABELS = { alimentacao: "Alimentação", sanidade: "Sanidade", mao_de_obra: "Mão de obra", infraestrutura: "Infraestrutura", outro: "Outro" };

// =====================================================================
// Configuração de campos por entidade (usada pelo formulário genérico)
// =====================================================================
const LOTE_FIELDS = [
  { name: "identificador", label: "Identificador", type: "text", required: true },
  { name: "categoria", label: "Categoria", type: "select", options: CATEGORIA_OPTS, required: true },
  { name: "quantidade_inicial", label: "Quantidade inicial (cabeças)", type: "number", step: "1", required: true },
  { name: "quantidade_atual", label: "Quantidade atual (cabeças)", type: "number", step: "1", required: true },
  { name: "peso_medio_atual", label: "Peso médio atual (kg)", type: "number" },
  { name: "data_entrada", label: "Data de entrada", type: "date", required: true },
  { name: "origem", label: "Origem", type: "select", options: ORIGEM_OPTS, required: true },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTS, required: true },
  { name: "piquete", label: "Piquete / pasto", type: "text" },
  { name: "observacoes", label: "Observações", type: "textarea" },
];
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
  { name: "custo", label: "Custo (R$)", type: "number" },
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
const CUSTO_FIELDS = [
  { name: "categoria", label: "Categoria", type: "select", options: CATEGORIA_CUSTO_OPTS, required: true },
  { name: "descricao", label: "Descrição", type: "text", required: true },
  { name: "data_custo", label: "Data do custo", type: "date", required: true },
  { name: "valor_total", label: "Valor total (R$)", type: "number", required: true },
];

function prepareValues(fields, values) {
  const out = {};
  fields.forEach((f) => {
    const v = values[f.name];
    if (f.type === "number") out[f.name] = v === "" || v === undefined || v === null ? null : Number(v);
    else if (f.type === "checkbox") out[f.name] = !!v;
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
          {f.type === "select" ? (
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
      {items.length === 0 ? <EmptyState text={emptyText} /> : <div className="space-y-2">{items.map(renderItem)}</div>}
    </div>
  );
}

function ItemCard({ title, subtitle, icon: Icon, onDelete }) {
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
      <button onClick={onDelete} aria-label="Excluir" className="p-1.5 flex-shrink-0">
        <Trash2 size={16} color={COLORS.text} />
      </button>
    </div>
  );
}

function BottomNav({ tab, onChange }) {
  const items = [
    { id: "dashboard", label: "Painel", icon: Home },
    { id: "lotes", label: "Lotes", icon: Layers },
    { id: "custos", label: "Custos", icon: Wallet },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t flex z-40" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.border }}>
      {items.map((it) => {
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

// =====================================================================
// Painel (dashboard)
// =====================================================================
function Dashboard({ data, onNavigate }) {
  const { lotes, custos, eventos } = data;
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

  return (
    <div className="space-y-5 pt-1">
      <div>
        <h1 className="text-xl font-bold" style={{ color: COLORS.textDark }}>Painel</h1>
        <p className="text-sm" style={{ color: COLORS.text }}>
          {now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Lotes ativos" value={lotesAtivos.length} />
        <KpiCard label="Cabeças no rebanho" value={totalCabecas.toLocaleString("pt-BR")} />
        <KpiCard label="Peso médio geral" value={`${pesoPonderado.toFixed(0)} kg`} />
        <KpiCard label="Custos lançados" value={custos.length} />
      </div>

      <div className="rounded-2xl p-5" style={{ backgroundColor: COLORS.primary }}>
        <p className="text-sm text-white opacity-80">Custo do rebanho este mês</p>
        <p className="text-3xl font-bold text-white mt-1">{formatBRL(custoMes)}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.accent }} />
          <p className="text-sm text-white opacity-80">{formatBRL(custoPorCabeca)} por cabeça</p>
        </div>
      </div>

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
  );
}

// =====================================================================
// Lista de lotes
// =====================================================================
function LotesList({ lotes, onSelect, reload, showToast }) {
  const [filter, setFilter] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const filtered = filter === "todos" ? lotes : lotes.filter((l) => l.status === filter);

  const handleCreate = async (values) => {
    await supaInsert("lotes", prepareValues(LOTE_FIELDS, values));
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

      {filtered.length === 0 ? (
        <EmptyState text="Nenhum lote encontrado." />
      ) : (
        <div className="space-y-2">
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
            fields={LOTE_FIELDS}
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
// Detalhe do lote
// =====================================================================
function LoteDetail({ lote, data, onBack, reload, showToast }) {
  const [subtab, setSubtab] = useState("geral");
  const [showLoteForm, setShowLoteForm] = useState(false);
  const [showDeleteLote, setShowDeleteLote] = useState(false);
  const [formFor, setFormFor] = useState(null);

  const pesagensDesc = data.pesagens.filter((p) => p.lote_id === lote.id);
  const pesagensAsc = [...pesagensDesc].sort((a, b) => a.data_pesagem.localeCompare(b.data_pesagem));
  const eventos = data.eventos.filter((e) => e.lote_id === lote.id);
  const compras = data.compras.filter((c) => c.lote_id === lote.id);
  const vendas = data.vendas.filter((v) => v.lote_id === lote.id);

  const handleUpdateLote = async (values) => {
    await supaUpdate("lotes", lote.id, prepareValues(LOTE_FIELDS, values));
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

      {subtab === "geral" && (
        <div className="space-y-4">
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
          <div className="grid grid-cols-2 gap-3">
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
          items={pesagensDesc}
          emptyText="Nenhuma pesagem registrada para este lote."
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
          items={eventos}
          emptyText="Nenhum evento registrado para este lote."
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
          items={compras}
          emptyText="Nenhuma compra registrada para este lote."
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
          items={vendas}
          emptyText="Nenhuma venda registrada para este lote."
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

      {showLoteForm && (
        <Modal title="Editar lote" onClose={() => setShowLoteForm(false)}>
          <EntityForm fields={LOTE_FIELDS} initialValues={lote} onSubmit={handleUpdateLote} onCancel={() => setShowLoteForm(false)} submitLabel="Salvar alterações" />
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
// Custos e rateio
// =====================================================================
function CustosScreen({ custos, rateios, reload, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  const handleCreate = async (values) => {
    const payload = prepareValues(CUSTO_FIELDS, values);
    payload.metodo_rateio = "proporcional_cabecas";
    await supaInsert("custos", payload);
    await reload();
    setShowForm(false);
    showToast("Custo lançado e rateado automaticamente entre os lotes ativos.");
  };
  const handleDelete = async (id) => { await supaDelete("custos", id); await reload(); showToast("Custo excluído."); setSelected(null); };

  const totalGeral = custos.reduce((s, c) => s + Number(c.valor_total || 0), 0);

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: COLORS.textDark }}>Custos</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: COLORS.primary }}
        >
          <Plus size={16} /> Novo custo
        </button>
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: COLORS.primary }}>
        <p className="text-sm text-white opacity-80">Total lançado no histórico</p>
        <p className="text-2xl font-bold text-white mt-1">{formatBRL(totalGeral)}</p>
      </div>

      {custos.length === 0 ? (
        <EmptyState text="Nenhum custo lançado ainda." />
      ) : (
        <div className="space-y-2">
          {custos.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="w-full text-left flex items-center justify-between gap-3 rounded-xl border p-3.5"
              style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: COLORS.textDark }}>{c.descricao}</p>
                <p className="text-xs mt-0.5" style={{ color: COLORS.text }}>{CATEGORIA_CUSTO_LABELS[c.categoria]}, {formatDate(c.data_custo)}</p>
              </div>
              <p className="text-sm font-semibold flex-shrink-0" style={{ color: COLORS.textDark }}>{formatBRL(c.valor_total)}</p>
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="Novo custo" onClose={() => setShowForm(false)}>
          <EntityForm fields={CUSTO_FIELDS} initialValues={{ data_custo: todayISO() }} onSubmit={handleCreate} onCancel={() => setShowForm(false)} submitLabel="Lançar custo" />
          <p className="text-xs mt-3" style={{ color: COLORS.text }}>
            O valor é rateado automaticamente entre os lotes ativos, proporcional à quantidade de cabeças de cada um.
          </p>
        </Modal>
      )}

      {selected && (
        <Modal title="Detalhe do custo" onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: COLORS.textDark }}>{selected.descricao}</p>
              <p className="text-xs mt-0.5" style={{ color: COLORS.text }}>{CATEGORIA_CUSTO_LABELS[selected.categoria]}, {formatDate(selected.data_custo)}</p>
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
                  <p className="text-sm" style={{ color: COLORS.text }}>Nenhum lote ativo para ratear na data deste custo.</p>
                )}
              </div>
            </div>
            <button onClick={() => handleDelete(selected.id)} className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium border" style={{ borderColor: COLORS.border, color: COLORS.danger }}>
              <Trash2 size={14} /> Excluir custo
            </button>
          </div>
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
  const [data, setData] = useState({ lotes: [], pesagens: [], eventos: [], compras: [], vendas: [], custos: [], rateios: [] });
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
      const [lotes, pesagens, eventos, compras, vendas, custos, rateios] = await Promise.all([
        supaGet("lotes?select=*&order=data_entrada.desc"),
        supaGet("pesagens?select=*&order=data_pesagem.desc"),
        supaGet("eventos?select=*&order=data_evento.desc"),
        supaGet("compras?select=*&order=data_compra.desc"),
        supaGet("vendas?select=*&order=data_venda.desc"),
        supaGet("custos?select=*&order=data_custo.desc"),
        supaGet("rateio_custos?select=*,lotes(identificador)"),
      ]);
      setData({ lotes, pesagens, eventos, compras, vendas, custos, rateios });
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: COLORS.bg, fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <header className="px-5 pt-5 pb-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS.primary }}>
          <span className="text-sm font-bold" style={{ color: COLORS.accent }}>R</span>
        </div>
        <span className="font-bold text-base" style={{ color: COLORS.primary }}>Rebanho360</span>
      </header>

      <main className="flex-1 px-5 overflow-y-auto pb-24">
        {selectedLote ? (
          <LoteDetail lote={selectedLote} data={data} onBack={() => navigate("lotes")} reload={loadAll} showToast={showToast} />
        ) : tab === "dashboard" ? (
          <Dashboard data={data} onNavigate={navigate} />
        ) : tab === "lotes" ? (
          <LotesList lotes={data.lotes} onSelect={(id) => navigate("lotes", id)} reload={loadAll} showToast={showToast} />
        ) : (
          <CustosScreen custos={data.custos} rateios={data.rateios} reload={loadAll} showToast={showToast} />
        )}
      </main>

      <BottomNav tab={selectedLote ? "lotes" : tab} onChange={(t) => navigate(t)} />
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
