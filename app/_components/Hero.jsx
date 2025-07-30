import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Typewriter } from "react-simple-typewriter";

export default function Hero() {
  const router = useRouter();

  return (
    <section className="pt-20 bg-gradient-to-b from-[#F8F9FF] to-white">
      <div className="container mx-auto px-4 -py-8 md:py-16">
        <div className="flex flex-col-reverse lg:flex-row items-center justify-center -gap-40 lg:ml-20">
          {/* Left: Text */}
          <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
            <h1 className="text-2xl md:text-5xl xl:text-6xl font-bold text-[#232C65] leading-tight mb-4">
              Cross-Border Shipping: <br />
              <span className="relative inline-block text-[#E31E24]">
                <Typewriter
                  words={[
                    "Made Affordable",
                    "Fast and Reliable",
                    "Secure and Efficient",
                    "Tailored for You",
                  ]}
                  loop
                  cursor
                  cursorStyle="_"
                  typeSpeed={70}
                  deleteSpeed={50}
                  delaySpeed={1000}
                />
                <span className="absolute inset-x-0 bottom-2 h-3 bg-yellow-300 -z-10"></span>
              </span>
            </h1>
            <p className="text-xs md:text-xl text-gray-700 mb-4">
              Affordable, reliable, and built for{" "}
              <span className="font-bold text-yellow-500">eCommerce businesses</span>
            </p>
            <div className="text-base text-[9.9px] md:text-lg font-semibold mb-4 md:mb-8 text-gray-900">
              <span className="font-bold">25000+</span> Exporters &nbsp;|&nbsp;
              <span className="font-bold">1 Crore+</span> Orders Shipped &nbsp;|&nbsp;
              <span className="font-bold">220+</span> Countries
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center lg:justify-start">
              <Button
                className="bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-3 px-8 rounded-lg text-lg shadow"
                onClick={() => router.push("/schedule-pickup")}
              >
                Schedule Pickup 🚚
              </Button>
              <Button
                variant="outline"
                className="border-gray-300 text-black font-semibold py-3 px-8 rounded-lg text-lg"
                onClick={() => router.push("/pricing")}
              >
                Calculate Pricing <span className="ml-2">₹</span>
              </Button>
            </div>
          </div>
          {/* Right: Image */}
          <div className="w-full lg:w-1/2 flex justify-center items-center mb-8 lg:mb-0">
            <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-[320px] sm:h-[400px] md:h-[450px] lg:h-[500px]">
              <Image
                src="/hero.png" // Place your image in public/hero.jpg
                alt="International shipping illustration"
                fill
                className="object-contain rounded-lg"
                priority
                sizes="(max-width: 1024px) 100vw, 500px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}