export default function Footer() {
  return (
    <footer className="bg-[#232C65] text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <div>
            <h3 className="text-xl font-bold mb-4">About Us</h3>
            <p className="text-gray-300">
              SunEx Services is a trusted provider of reliable and
              cost-effective cross-border shipping solutions for businesses and
              individuals. We specialize in delivering parcels and cargo quickly
              and securely, ensuring your shipments reach their destination on
              time. With a commitment to excellence and customer satisfaction,
              we simplify global shipping to connect people and businesses
              worldwide.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Services</h3>
            <ul className="space-y-2">
              <li>International Shipping</li>
              <li>Express Delivery</li>
              <li>Cargo Services</li>
              <li>Business Solutions</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="/terms-and-conditions">Terms & Conditions</a></li>
              <li><a href="/privacy-policy">Privacy Policy</a></li>
              <li><a href="/merchant-agreement">Merchant Agreement</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Contact Us</h3>
            <p className="text-gray-300 mb-2">
              <span className="font-semibold">Phone:</span> +91 90044 05236
            </p>
            <div className="mb-4">
              <p className="font-semibold text-white">Registered Address</p>
              <p className="text-gray-300">
                901, 9th Floor, Emerald 2 CHS LTD, Royal Palms, Aarey Milk Colony, Goregaon East, Mumbai 400 065
              </p>
            </div>
            <div>
              <p className="font-semibold text-white">Andheri Branch</p>
              <p className="text-gray-300">
                Shop No 2, Bhuta Industriak Estate, Near Gupta Tea House, Parsi Panchayat Road, Opp. ICICI Call Center, Andheri East, Mumbai 400 099
              </p>
            </div>
            <div>
              <p className="font-semibold text-white">Goregaon Branch</p>
              <p className="text-gray-300">
                237/1890, Motilal Nagar No 1, Road No 4, Near Ganesh Mandir, Goregaon West, Mumbai 400 104
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
          <p>
            &copy; {new Date().getFullYear()} Sunex Services Private Limited. All rights
            reserved | Created by{" "}
            <a
              className="text-[#F44336]"
              href="/"
            >
              M Kumars Tech Pvt Ltd
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
