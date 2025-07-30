"use client";

import CTA from "../_components/Cta";
import Experience from "../_components/Experience";
import Features from "../_components/Features";
import Footer from "../_components/Footer";
import FrontHeader from "../_components/FrontHeader";
import GetQuote from "../_components/GetQuote";
import Testimonial from "../_components/testimonial";
import GlobalStage from "../_components/GlobalStage";
import Hero from "../_components/Hero";
import HowWeDoIt from "../_components/HowWeDoIt";
import Partners from "../_components/Partners";
import Services from "../_components/Services";
import WhatWeOffer from "../_components/WhatWeOffer";
import FAQ from "../_components/Faq";

export default function Home() {
  return (
    <main className="min-h-screen">
      <FrontHeader />
      <Hero />
      <Partners />
      <Features />
      <GlobalStage />
      <Services />
      {/* <GetQuote /> */}
      <Testimonial />
      <FAQ />
      <Footer />
    </main>
  );
}
