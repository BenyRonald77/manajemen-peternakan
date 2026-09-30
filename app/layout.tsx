import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manajemen Peternakan",
  description: "Siklus produksi, pakan, mortalitas, FCR, dan proyeksi panen",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="bg-emerald-700 text-white">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <h1 className="text-lg font-bold">🐔 Manajemen Peternakan</h1>
            <nav className="flex gap-4 text-sm">
              <a href="/" className="hover:underline">Dashboard</a>
              <a href="/kandang" className="hover:underline">Kandang</a>
              <a href="/siklus" className="hover:underline">Siklus</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
