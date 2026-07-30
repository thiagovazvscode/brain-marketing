import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Briefing",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BriefingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#000000] text-white">{children}</div>;
}
