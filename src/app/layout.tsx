import type { Metadata } from "next";
import "./globals.css";
import { DataProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "Career Ops — Dashboard",
  description:
    "Track job applications from Gmail, time, SOPs, contracts, applicants and insights.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DataProvider>{children}</DataProvider>
      </body>
    </html>
  );
}
