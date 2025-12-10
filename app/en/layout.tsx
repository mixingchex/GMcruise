import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "CruiseDot AI - Seoul Survival Tool",
  description: "Navigate the neon nights of Seoul.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function EnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
