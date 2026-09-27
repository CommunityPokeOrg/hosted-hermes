import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-ink-700 bg-ink-900 p-5 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">{children}</h2>;
}

const statusColors: Record<string, string> = {
  running: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  stopped: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  provisioning: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  pending: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
  deleting: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] ?? statusColors.pending;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = { sm: "px-2.5 py-1 text-xs", md: "px-4 py-2 text-sm" };
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-soft",
    ghost: "border border-ink-600 text-zinc-300 hover:bg-ink-700",
    danger: "border border-red-500/40 text-red-400 hover:bg-red-500/10",
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-accent ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-accent ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-accent ${props.className ?? ""}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed border-ink-600 p-8 text-center text-sm text-zinc-500">{children}</div>;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

export function formatUptime(startedAt: string | null): string {
  if (!startedAt) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}
