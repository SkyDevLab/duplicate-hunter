import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Duplicate Hunter — Find the issue before you create the duplicate',
  description: 'AI-assisted GitHub App that detects duplicate or related GitHub Issues and Pull Requests.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gh-bg text-gh-text antialiased selection:bg-gh-blue/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
