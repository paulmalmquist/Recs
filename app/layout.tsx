import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
    title: "AIM · Dreamcatcher",
    description: "Discover the apps for your work. Personalized recommendations and My List.",
    icons: {
        icon: "/favicon.svg",
        shortcut: "/favicon.svg",
    },
};
export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="en">
      <body className="antialiased">{children}</body>
    </html>);
}
