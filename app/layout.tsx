import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DashboardHeader from "./components/DashboardHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DEBEN DEBEMOS",
  description: "Gestion de préstamos entre tiendas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
		<div className="bg-gray-200 min-h-screen lg:max-h-screen lg:overflow-hidden flex flex-col">
      <DashboardHeader title="DEBEN / DEBEMOS" />
			{children}
		</div>
	</body>
    </html>
  );
}
