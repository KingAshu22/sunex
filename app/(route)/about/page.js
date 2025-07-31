"use client";

import Image from "next/image";
import { Users, Globe, ShieldCheck, Rocket, Smile } from "lucide-react";
import FrontHeader from "@/app/_components/FrontHeader";
import Footer from "@/app/_components/Footer";

export default function About() {
  return (
    <>
    <FrontHeader />
    <main className="bg-[#f8f9ff] pt-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#2563eb]/10 to-white py-16 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#232C65] mb-4">
              About <span className="text-[#2563eb]">SunEx Services</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-700 mb-6">
              Empowering businesses and individuals to connect with the world—one shipment at a time.
            </p>
            <div className="flex flex-wrap gap-6 justify-center md:justify-start">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-[#2563eb]">25,000+</span>
                <span className="text-gray-600 text-sm">Exporters</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-[#2563eb]">1 Crore+</span>
                <span className="text-gray-600 text-sm">Orders Shipped</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-[#2563eb]">220+</span>
                <span className="text-gray-600 text-sm">Countries</span>
              </div>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <Image
              src="/about-hero.png"
              alt="About SunEx"
              width={400}
              height={400}
              className="rounded-2xl shadow-lg object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#232C65] mb-4">Our Mission</h2>
          <p className="text-gray-700 text-lg mb-8">
            At SunEx Services, our mission is to make global shipping simple, transparent, and accessible for everyone. We believe in breaking barriers and building bridges—helping businesses and families connect across borders with ease and confidence.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center w-64">
              <Globe className="w-10 h-10 text-[#2563eb] mb-2" />
              <span className="font-semibold text-[#232C65] mb-1">Global Reach</span>
              <span className="text-gray-600 text-sm">Delivering to 220+ countries worldwide</span>
            </div>
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center w-64">
              <ShieldCheck className="w-10 h-10 text-[#2563eb] mb-2" />
              <span className="font-semibold text-[#232C65] mb-1">Trust & Security</span>
              <span className="text-gray-600 text-sm">Your shipments are safe and insured</span>
            </div>
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center w-64">
              <Rocket className="w-10 h-10 text-[#2563eb] mb-2" />
              <span className="font-semibold text-[#232C65] mb-1">Speed & Reliability</span>
              <span className="text-gray-600 text-sm">Fast, on-time deliveries every time</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-12 px-4 bg-[#f4f8ff]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#232C65] mb-8 text-center">
            Why Choose SunEx?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center hover:scale-105 transition-transform duration-200">
              <Smile className="w-10 h-10 text-yellow-400 mb-2" />
              <span className="font-semibold text-[#232C65] mb-1">Customer-First Approach</span>
              <span className="text-gray-600 text-sm">24/7 support and a dedicated team to help you at every step.</span>
            </div>
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center hover:scale-105 transition-transform duration-200">
              <Users className="w-10 h-10 text-yellow-400 mb-2" />
              <span className="font-semibold text-[#232C65] mb-1">For Everyone</span>
              <span className="text-gray-600 text-sm">From small businesses to large enterprises and families—SunEx is for all.</span>
            </div>
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center hover:scale-105 transition-transform duration-200">
              <Globe className="w-10 h-10 text-yellow-400 mb-2" />
              <span className="font-semibold text-[#232C65] mb-1">Seamless Technology</span>
              <span className="text-gray-600 text-sm">Easy-to-use dashboard, real-time tracking, and transparent pricing.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#232C65] mb-8">Meet Our Team</h2>
          <div className="flex flex-wrap justify-center gap-8">
            {/* Replace with your real team! */}
            <div className="flex flex-col items-center">
              <Image src="/team/user1.jpg" alt="Team Member" width={96} height={96} className="rounded-full mb-2 border-4 border-yellow-400 object-cover" />
              <span className="font-semibold text-[#232C65]">Amit Sharma</span>
              <span className="text-gray-500 text-sm">Founder & CEO</span>
            </div>
            <div className="flex flex-col items-center">
              <Image src="/team/user2.jpg" alt="Team Member" width={96} height={96} className="rounded-full mb-2 border-4 border-yellow-400 object-cover" />
              <span className="font-semibold text-[#232C65]">Priya Verma</span>
              <span className="text-gray-500 text-sm">Head of Operations</span>
            </div>
            <div className="flex flex-col items-center">
              <Image src="/team/user3.jpg" alt="Team Member" width={96} height={96} className="rounded-full mb-2 border-4 border-yellow-400 object-cover" />
              <span className="font-semibold text-[#232C65]">Rahul Singh</span>
              <span className="text-gray-500 text-sm">Tech Lead</span>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 px-4 bg-gradient-to-r from-[#2563eb]/10 to-[#f8f9ff]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#232C65] mb-4">
            Ready to ship with SunEx?
          </h2>
          <p className="text-gray-700 mb-6">
            Join thousands of happy customers and experience hassle-free, global shipping today.
          </p>
          <a
            href="/"
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-3 px-8 rounded-xl text-lg shadow transition"
          >
            Get Started
          </a>
        </div>
      </section>
    </main>
    <Footer />
    </>
  );
}