import "./globals.css";
import "react-datepicker/dist/react-datepicker.css";

export const metadata = {
  title: "SoulCross",
  description: "SoulCross 命盘分析",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
