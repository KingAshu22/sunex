import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function FrontHeader() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white z-50 shadow-sm transition-all">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2">
            {/* <Image src="/logo.svg" alt="SunEx Logo" width={36} height={36} /> */}
            <span className="text-2xl font-extrabold text-[#E31E24] tracking-tight">
              SunEx <span className="text-[#232C65]">Services</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center space-x-8 font-semibold">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[#232C65] hover:text-[#E31E24] transition-colors px-2 py-1 rounded-md hover:bg-[#f8f9ff]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <Link
              href="https://wa.me/919004405236"
              className="hidden md:flex items-center gap-2 text-sm text-white bg-[#25D366] hover:bg-[#1ebe57] px-3 py-2 rounded-lg transition"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/whatsapp.svg"
                alt="Whatsapp Icon"
                width={18}
                height={18}
              />
              Whatsapp Us
            </Link>
            <Link
              href="/dashboard"
              className="hidden md:inline-block text-sm text-[#232C65] hover:text-[#E31E24] transition-colors font-semibold px-2"
            >
              Login
            </Link>
            <Button
              className="bg-[#E31E24] hover:bg-[#C71D23] text-white rounded-md px-5 font-semibold shadow transition-transform duration-150 hover:scale-105"
              onClick={() => router.push("/track")}
            >
              Track Parcel
            </Button>
            {/* Mobile Menu Button */}
            <button
              className="lg:hidden ml-2 p-2 rounded-md hover:bg-gray-100 transition"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-[#232C65]" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex">
          <div className="bg-white w-64 h-full shadow-lg flex flex-col p-6 animate-slideInLeft">
            <div className="flex items-center justify-between mb-8">
              <span className="text-xl font-extrabold text-[#E31E24]">
                SunEx <span className="text-[#232C65]">Services</span>
              </span>
              <button
                className="p-2 rounded-md hover:bg-gray-100 transition"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-6 h-6 text-[#232C65]" />
              </button>
            </div>
            <nav className="flex flex-col gap-4 font-semibold">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[#232C65] hover:text-[#E31E24] transition-colors px-2 py-1 rounded-md hover:bg-[#f8f9ff]"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="https://wa.me/919004405236"
                className="flex items-center gap-2 text-sm text-white bg-[#25D366] hover:bg-[#1ebe57] px-3 py-2 rounded-lg transition"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
              >
                <Image
                  src="/whatsapp.svg"
                  alt="Whatsapp Icon"
                  width={18}
                  height={18}
                />
                Whatsapp Us
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-[#232C65] hover:text-[#E31E24] transition-colors font-semibold px-2"
                onClick={() => setMobileOpen(false)}
              >
                Login
              </Link>
              <Button
                className="bg-[#E31E24] hover:bg-[#C71D23] text-white rounded-md px-5 font-semibold shadow mt-2"
                onClick={() => {
                  setMobileOpen(false);
                  router.push("/track");
                }}
              >
                Track Parcel
              </Button>
            </nav>
          </div>
          {/* Click outside to close */}
          <div className="flex-1" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Mobile menu animation */}
      <style jsx global>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </header>
  );
}