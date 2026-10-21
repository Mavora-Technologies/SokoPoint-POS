import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SokoPoint-POS | Commerce Operating System',
  description: 'AI-Powered Commerce Resource Management System',
  icons: {
    icon: '/SokoPoint POS Logo.png', // This changes the browser tab icon
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} antialiased bg-slate-50 text-slate-900 min-h-[100dvh] flex flex-col selection:bg-blue-600 selection:text-white overflow-x-hidden`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}