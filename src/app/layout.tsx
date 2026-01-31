import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CASL RBAC/ABAC Demo",
  description: "Minimal Next.js + CASL RBAC/ABAC example"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
