'use client';

import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <title>AIRGUARD — Real-Time Air Intelligence</title>
        <meta name="description" content="Predictive Air Quality Intelligence, Exposure Engine, Clean-Air Navigation, and Multi-Agent Action Platform powered by AWS." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#0F172A" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${inter.className} bg-[#F5F7FB] text-[#1E293B] min-h-screen antialiased overflow-x-hidden`}>
        {children}
      </body>
    </html>
  );
}
