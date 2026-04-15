import Link from "next/link";
import { MessageSquare, FileText, Workflow, Settings } from "lucide-react";

const navItems = [
  { href: "/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-16 md:w-56 flex flex-col bg-white border-r border-gray-200 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-200">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="hidden md:block text-sm font-semibold text-gray-900 truncate">
            WA Leads
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors group"
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="hidden md:block">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200">
          <div className="hidden md:block px-3 py-2 text-xs text-gray-400">
            WhatsApp Lead Manager
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
