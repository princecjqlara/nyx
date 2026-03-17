'use client';
import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Upload,
  Users,
  PhoneCall,
  FileText,
  Settings,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload Leads', icon: Upload },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/calls', label: 'Call Queue', icon: PhoneCall },
  { href: '/logs', label: 'Call Logs', icon: FileText },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Nyx — AI Auto-Caller</title>
        <meta name="description" content="Automated AI phone calling system with lead management and real-time call tracking" />
      </head>
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="sidebar-header">
              <Link href="/" className="sidebar-logo">
                <div className="logo-icon">N</div>
                <div>
                  <div className="logo-text">Nyx</div>
                  <div className="logo-badge">AUTO-CALLER</div>
                </div>
              </Link>
            </div>

            <nav className="sidebar-nav">
              <div className="nav-section-label">Main</div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="nav-section-label" style={{ marginTop: 'auto' }}>System</div>
              <Link href="/settings" className={`nav-link ${pathname === '/settings' ? 'active' : ''}`}>
                <Settings />
                <span>Settings</span>
              </Link>
            </nav>

            <div className="sidebar-footer">
              <div className="agent-status">
                <div className="agent-dot"></div>
                <div className="agent-info">
                  <span className="agent-label">Phone Agent</span>
                  <span className="agent-sublabel">Termux · Online</span>
                </div>
              </div>
            </div>
          </aside>

          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
