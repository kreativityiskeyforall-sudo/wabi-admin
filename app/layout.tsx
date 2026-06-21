import type { Metadata } from 'next';
import './globals.css';
import ConditionalSidebar from '@/components/ConditionalSidebar';

export const metadata: Metadata = {
  title: 'decoreixy. Content Studio',
  description: 'Content production pipeline for decoreixy.com',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ConditionalSidebar />
        <div className="ws">
          {children}
        </div>
      </body>
    </html>
  );
}
