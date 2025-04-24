"use client";

import { useState, useEffect, use } from "react";
import axios from "axios";
import Image from "next/image";
import { Mail, MapPin, MoveRight, Phone, Printer } from "lucide-react";
import Barcode from "react-barcode"; // Import the barcode package

export default function AWBView({ params }) {
  const { trackingNumber } = use(params);
  console.log("Tracking number: " + trackingNumber);

  const [awbData, setAwbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAWBData = async () => {
      console.log(`AWB fetching data ${trackingNumber}`);
      setLoading(true);
      try {
        const response = await axios.get(`/api/awb/${trackingNumber}`);
        setAwbData(response.data[0]);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch AWB data");
        setLoading(false);
      }
    };

    if (trackingNumber) {
      fetchAWBData();
    }
  }, [trackingNumber]);

  if (loading) return <div className="text-center mt-8">Loading...</div>;
  if (error)
    return <div className="text-center mt-8 text-[#E31E24]">{error}</div>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto px-1 max-w-4xl -pt-4 mt-0">
      <style>
        {`
    @page {
      size: A6 portrait;
      margin: 5mm;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }

      body * {
        visibility: hidden;
      }

      .arrow {
          margin-top: -8px;
      }

      #printable {
          border: 1px solid grey;
          border-radius: 16px;
      }

      #printable, #printable * {
        visibility: visible;
      }

      #printable {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        font-size: 9px;
        line-height: 1.2;
        background: white;
        padding: 4mm;
        box-sizing: border-box;
      }

      h1, h2 {
        font-size: 10px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        border-radius: 5px;
        font-size: 8px;
      }

      th, td {
        border: 1px solid #ccc;
        padding: 2px;
      }

      thead tr:first-child th:first-child {
        border-top-left-radius: 4px;
      }

      thead tr:first-child th:last-child {
        border-top-right-radius: 4px;
      }

      tbody tr:last-child td:first-child {
        border-bottom-left-radius: 4px;
      }

      tbody tr:last-child td:last-child {
        border-bottom-right-radius: 4px;
      }

      .print\\:hidden {
        display: none !important;
      }

      .barcode svg {
        width: 100% !important;
        height: auto !important;
      }
    }
  `}
      </style>
      <div id="printable" className="bg-white rounded-lg overflow-hidden px-2">
        <div className="p-4 pt-0 mt-2">
          {/* Flex container for logo, barcode, and title */}
          <div className="flex items-center justify-between">
            <div>
              <Image
                src="/Sun.jpg"
                alt="Sun Express Services"
                width={200}
                height={60}
                className=""
              />
              {/* Add contact info below the logo */}
              <div className="text-left mt-2">
                <p className="text-sm text-gray-500 flex flex-row">
                  <Phone className="h-4" /> +91 90044 05236
                </p>
                <p className="text-sm text-gray-500 flex flex-row">
                  <Mail className="h-4" /> sunexpress1511@gmail.com
                </p>
                <p className="text-sm text-gray-500 flex flex-row">
                  <MapPin className="h-4" /> Mumbai
                </p>
              </div>
            </div>

            {/* Barcode Section */}
            <div className="mx-4">
              <Barcode
                height={60}
                fontSize={15}
                value={awbData?.trackingNumber}
              />
            </div>

            <div className="text-right">
              <h1 className="text-xl font-bold text-[#232C65]">Air Waybill</h1>
              <p className="text-[#E31E24] font-semibold">
                {awbData?.trackingNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center -mt-2">
            <div className="flex items-center justify-between">
              <p className="flex gap-2 text-[#E31E24] font-bold ml-24">
                {awbData?.sender?.country} <MoveRight className="arrow" />{" "}
                {awbData?.receiver?.country}
              </p>
            </div>
          </div>
          <hr className="w-full pb-4" />

          {/* The rest of the content */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-2 text-xs">
            <div>
              <h2 className="text-md font-semibold text-[#232C65] mb-2">
                Sender Information
              </h2>
              <AddressBox data={awbData?.sender} />
            </div>
            <div>
              <h2 className="text-md font-semibold text-[#232C65] mb-2">
                Receiver Information
              </h2>
              <AddressBox data={awbData?.receiver} />
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-[#232C65] mb-2">
              Shipment Details
            </h2>
            <div className="grid grid-cols-4 gap-1 text-xs">
              <InfoItem label="Invoice Number" value={awbData?.invoiceNumber} />
              <InfoItem
                label="Date"
                value={
                  awbData?.date
                    ? new Date(awbData?.date).toLocaleDateString("en-GB")
                    : "Not available"
                }
              />
              <InfoItem label="Parcel Type" value={awbData?.parcelType} />
              <InfoItem
                label="Status"
                value={
                  awbData?.parcelStatus[awbData?.parcelStatus.length - 1]
                    ?.status
                }
              />
            </div>
          </div>
        </div>

        <div className="text-xs px-2">
          <p className="text-[#232C65] font-semibold text-justify">
            Terms & Conditions
          </p>
          <ul>
            <li>
              Any Extra Charges (Remote Area Charges, Pickup Charges, etc) would
              be charged extra.
            </li>
            <li>
              If the consignment is lost or damaged in transit by Sun Express
              Services Company, the maximum claim payable by Sun Express
              Services will be Rs. 100/- per kg or Rs. 5,000, whichever is
              lower.
            </li>
            <li>
              Sun Express Services will not be responsible for delayed delivery
              due to fire, accidents, riots, strikes, and natural calamities,
              flight delay, offloading of cargo, airlines space problem,
              airlines bagging mis-routing, customs process delay, lockdown,
              war, civil war, disturbed area.
            </li>
            <li>No claim would be accepted after 48 hours of delivery.</li>
            <li>
              The consignor is responsible for all the consequences if any
              incorrect/false declaration is given.
            </li>
            <li>
              Any dispute, controversy, or claim arising out of this shipment
              shall be subject to the jurisdiction of courts in Mumbai only,
              irrespective of the place of origin, payment, and destination of
              the consignment.
            </li>
            <li>
              The consignments handed over to Sun Express Services do not
              violate the rules and regulations of the Post & Telegraph
              Department and IATA under the Geneva Convention.
            </li>
            <li>
              No delivery time is given or committed for shipments booked for
              economy services.
            </li>
            <li>
              Sun Express Services is not responsible for any duties/penalties
              or charges applied to any shipment by any government authorities
              of the destination country.
            </li>
          </ul>
        </div>

        <div className="bg-gray-50 p-1 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center w-full md:w-auto px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-[#E31E24] hover:bg-[#C71D23] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E31E24]"
          >
            <Printer className="mr-2" size={20} />
            Print AWB
          </button>
        </div>
      </div>
    </div>
  );
}

function AddressBox({ data }) {
  return (
    <div className="border border-gray-200 rounded p-4 py-1">
      <p className="font-semibold text-[#E31E24]">{data?.name}</p>
      <p>{data?.address}</p>
      <p>{data?.zip}</p>
      <p>{data?.country}</p>
      <p>Contact: {data?.contact}</p>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
