import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { DbProvider } from "@/components/DbProvider";
import "./globals.css";

const fontDisplay = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const fontSans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IB Life Planner",
  description: "Task, Deadline, and CAS Management App for IB Students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontDisplay.variable}`}>
      <body className="font-sans antialiased min-h-screen">
        <DbProvider>{children}</DbProvider>
      </body>
    </html>
  );
}
