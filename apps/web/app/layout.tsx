import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BiliBili Lens',
  description: 'B站公开评论洞察与风险审查平台',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

