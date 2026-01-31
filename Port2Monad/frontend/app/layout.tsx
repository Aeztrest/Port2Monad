import type { Metadata } from 'next';
import { ThemeProvider } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Monad - AI Blockchain Migration',
  description: 'Developer-facing frontend for AI-powered blockchain migration system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
