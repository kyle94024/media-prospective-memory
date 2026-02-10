import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prospective Memory Study",
  description:
    "Lexical Decision and Prospective Memory task — based on Chiossi et al. (CHI 2023)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-neutral-950">
        {children}
      </body>
    </html>
  );
}
