import Image from "next/image";
import { motion } from "framer-motion";

const features = [
  {
    title: "Hassle-Free Doorstep Pickup",
    desc: (
      <>
        Forget about “service not available” issues. Whether you’re in a metro city or a remote town, SunEx Services collects your parcels right from your door and delivers them directly to your global customers.<br /><br />
        <b>Truly door-to-door. No complications.</b><br />
        We bring the courier to you, so you can focus on growing your business.
      </>
    ),
    cta: (
      <a href="#" className="text-blue-600 font-medium hover:underline flex items-center gap-1">
        Book my Pickup <span>🚚</span>
      </a>
    ),
    img: "/hassle-free-pickup.png",
    imgAlt: "Hassle-Free Doorstep Pickup",
    badge: "PAN India Pickup",
    reverse: false,
  },
  {
    title: "Seamless eCommerce Logistics",
    desc: (
      <>
        Let us handle your shipping needs with easy marketplace integration, no hidden charges, and affordable rates starting at just ₹59.<br /><br />
        Ship any quantity—big or small—and expand your eCommerce reach without the wait or the worry.<br /><br />
        Take your business global, the smart way.
      </>
    ),
    cta: (
      <a href="#" className="text-blue-600 font-medium hover:underline flex items-center gap-1">
        Scale my eCommerce <span>🚀</span>
      </a>
    ),
    img: "/supply-chain.png",
    imgAlt: "Seamless eCommerce Logistics",
    badge: null,
    reverse: true,
  },
  {
    title: "Effortless Documentation & Customs",
    desc: (
      <>
        Our export specialists guide you through every document and compliance step, making international shipping paperwork simple and stress-free.<br /><br />
        No more delays or errors—just smooth, reliable customs clearance for your shipments.<br /><br />
        Focus on your business while we handle the paperwork.
      </>
    ),
    cta: (
      <a href="#" className="text-blue-600 font-medium hover:underline flex items-center gap-1">
        Get export help <span>📝</span>
      </a>
    ),
    img: "/custom.png",
    imgAlt: "Effortless Documentation & Customs",
    badge: null,
    reverse: false,
  },
];

const fadeIn = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export default function FeaturesSection() {
  return (
    <section className="py-16 bg-[#F8F9FF]">
      <div className="w-full px-4 md:px-12 xl:px-32 mx-auto space-y-20">
        {features.map((feature, idx) => (
          <motion.div
            key={feature.title}
            className={`flex flex-col md:flex-row items-center gap-8 md:gap-16 ${
              feature.reverse ? "md:flex-row-reverse" : ""
            }`}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, delay: idx * 0.2 }}
            variants={fadeIn}
          >
            {/* Image */}
            <div className="relative w-full md:w-1/2 max-w-md">
              <Image
                src={feature.img}
                alt={feature.imgAlt}
                width={480}
                height={320}
                className="rounded-xl object-cover w-full h-auto shadow-lg"
              />
              {feature.badge && (
                <span className="absolute top-4 left-4 bg-yellow-400 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                  {feature.badge}
                </span>
              )}
            </div>
            {/* Text */}
            <div className="w-full md:w-1/2">
              <h3 className="text-2xl md:text-3xl font-bold text-[#232C65] mb-3">
                {feature.title}
              </h3>
              <div className="text-gray-700 text-base md:text-lg mb-4 leading-relaxed">
                {feature.desc}
              </div>
              {feature.cta}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}