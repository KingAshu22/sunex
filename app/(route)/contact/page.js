"use client";

import { Mail, Phone, MapPin, Send } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import FrontHeader from "@/app/_components/FrontHeader";
import Footer from "@/app/_components/Footer";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // You can add your form submission logic here (API call, etc.)
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <>
    <FrontHeader />
    <main className="bg-[#f8f9ff] pt-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#2563eb]/10 to-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#232C65] mb-4">
            Contact <span className="text-[#2563eb]">SunEx Services</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-2">
            We’re here to help! Reach out to us for any shipping queries, partnership opportunities, or just to say hello.
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-2xl font-bold text-[#232C65] mb-4">Send us a Message</h2>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Name</label>
                <input
                  type="text"
                  required
                  className="w-full border-b border-gray-200 focus:border-blue-500 outline-none py-2 transition"
                  placeholder="Your Name"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full border-b border-gray-200 focus:border-blue-500 outline-none py-2 transition"
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Message</label>
                <textarea
                  required
                  className="w-full border-b border-gray-200 focus:border-blue-500 outline-none py-2 transition min-h-[100px]"
                  placeholder="How can we help you?"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#2563eb] hover:bg-[#232C65] text-white font-bold py-3 rounded-xl text-lg flex items-center justify-center gap-2 transition-all duration-200 shadow hover:shadow-lg"
              >
                <Send className="w-5 h-5" /> Send Message
              </button>
              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-green-600 font-semibold text-center pt-2"
                >
                  Thank you! We’ve received your message.
                </motion.div>
              )}
            </form>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            viewport={{ once: true }}
            className="flex flex-col gap-8"
          >
            <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
              <Mail className="w-8 h-8 text-[#2563eb]" />
              <div>
                <div className="font-semibold text-[#232C65]">Email</div>
                <a href="mailto:hello@sunexservices.com" className="text-blue-600 hover:underline text-sm">
                  sunexservicespl@gmail.com
                </a>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
              <Phone className="w-8 h-8 text-[#2563eb]" />
              <div>
                <div className="font-semibold text-[#232C65]">Phone</div>
                <a href="tel:+919004405236" className="text-blue-600 hover:underline text-sm">
                  +91 90044 05236
                </a>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
              <MapPin className="w-8 h-8 text-[#2563eb]" />
              <div>
                <div className="font-semibold text-[#232C65]">Andheri Branch</div>
                <div className="text-gray-600 text-sm">
                  Shop No 2, Bhuta Industriak Estate, Near Gupta Tea House, Parsi Panchayat Road, Opp. ICICI Call Center, Andheri East, Mumbai 400 099
                </div>
              </div>
            </div>
                        <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
              <MapPin className="w-8 h-8 text-[#2563eb]" />
              <div>
                <div className="font-semibold text-[#232C65]">Goregaon Branch</div>
                <div className="text-gray-600 text-sm">
                  237/1890, Motilal Nagar No 1, Road No 4, Near Ganesh Mandir, Goregaon West, Mumbai 400 104
                </div>
              </div>
            </div>
            {/* Optional: Google Maps Embed */}
            <div className="rounded-2xl overflow-hidden shadow">
              <iframe
                title="SunEx Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241317.1160982606!2d72.7410992!3d19.0821978!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7b63b0e6b0b0b%3A0x1a1a1a1a1a1a1a1a!2sMumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1680000000000!5m2!1sen!2sin"
                width="100%"
                height="180"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </motion.div>
        </div>
      </section>
    </main>
    <Footer />
    </>
  );
}