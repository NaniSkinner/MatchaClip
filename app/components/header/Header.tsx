'use client'
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
    const pathname = usePathname();

    // Hide header in project editor view
    if (pathname.startsWith("/projects/")) {
        return null;
    }

    return (
        <header className="bg-black border-b border-gray-800 shadow-sm">
            <div className="container mx-auto px-4 py-4 flex justify-center items-center">
                <Link href="/" className="text-3xl font-bold text-white hover:text-gray-300 transition-colors">
                    ClipForge
                </Link>
            </div>
        </header>
    );
}
