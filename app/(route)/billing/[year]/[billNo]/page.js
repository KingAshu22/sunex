"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { ToWords } from "to-words"

export default function BillPage() {
  const { year, billNo } = useParams()
  const [bill, setBill] = useState(null)
  const invoiceRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true);

  const toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
      currency: true,
      ignoreDecimal: false,
      ignoreZeroCurrency: false,
      doNotAddOnly: false,
      currencyOptions: {
        // can be used to override defaults for the selected locale
        name: 'Rupee',
        plural: 'Rupees',
        symbol: '₹',
        fractionalUnit: {
          name: 'Paisa',
          plural: 'Paise',
          symbol: '',
        },
      },
    },
  });

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const res = await fetch(`/api/billing/year/${year}/${billNo}`)
        if (res.ok) {
          const data = await res.json()
          setBill(data)
        }
      } catch (error) {
        console.error("Error fetching bill:", error)
      } finally {
        setIsLoading(false)
      }
    }
    if (year && billNo) fetchBill()
  }, [year, billNo])

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return
    try {
      const elements = invoiceRef.current.querySelectorAll("[data-page]")
      const pdf = new jsPDF("p", "mm", "a4")
      let pageNum = 0

      for (const element of elements) {
        if (pageNum > 0) pdf.addPage()

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          allowTaint: true,
        })

        const imgData = canvas.toDataURL("image/png")
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight()

        // Calculate proper image dimensions to maintain aspect ratio without zooming
        const imgWidth = pdfWidth - 4 // 2mm margin on each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        // Position image with small margins
        const yPosition = 2

        pdf.addImage(imgData, "PNG", 2, yPosition, imgWidth, imgHeight)
        pageNum++
      }

      pdf.save(`${bill?.billNumber || "invoice"}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
    }
  }

  const handleDownloadImage = async () => {
    if (!invoiceRef.current) return
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true,
      })
      const link = document.createElement("a")
      link.href = canvas.toDataURL("image/png")
      link.download = `${bill?.billNumber || "invoice"}.png`
      link.click()
    } catch (error) {
      console.error("Error generating image:", error)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600 text-lg">Loading invoice...</p>
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600 text-lg">Invoice not found</p>
      </div>
    )
  }

  return (
    <>
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-wrap gap-2 sm:gap-3 p-3 sm:p-4 justify-end">
          <button
            onClick={handlePrint}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm sm:text-base transition"
          >
            Print
          </button>
          <button
            onClick={handleDownloadImage}
            className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm sm:text-base transition"
          >
            Download Image
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm sm:text-base transition"
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="bg-gray-50 py-4 px-2 sm:py-6 sm:px-4 print:py-0 print:px-0 print:bg-white">
        <div ref={invoiceRef} className="max-w-4xl mx-auto bg-white print:max-w-full print:shadow-none">
          <div data-page="1" className="p-4 sm:p-6 md:p-8 text-xs sm:text-sm print:p-6 print:pb-2">
            <div className="border-b-2 border-gray-300 pb-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                    SunEx Services Pvt. Ltd.
                  </h1>
                  <p className="text-gray-700 text-xs sm:text-sm mt-1">
                    Shop No 2, Bhuta Industrial Estate, Near Gupta Tea House, Parsi Panchayat Road, Opp. ICICI Call Center, Andheri East, Mumbai 400 099
                  </p>
                  <p className="text-gray-600 text-xs mt-1">Email: sunexservicespl@gmail.com</p>
                  <p className="text-gray-600 text-xs mt-1">GST No.: 27ABPCS6262F1ZX</p>
                  <p className="text-gray-600 text-xs mt-1">PAN No.: ABPCS6262F</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 border-2 border-gray-900 inline-block px-3 py-2">
                    TAX INVOICE
                  </h2>
                  <p className="text-gray-600 text-xs mt-2">
                    Reg. Add: 901, 9th Floor, Emerald 2 CHS LTD, Royal Palms, Aarey Milk Colony, Goregaon East, Mumbai 400 065
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded border border-gray-300">
              <div>
                <h3 className="font-bold text-xs sm:text-sm mb-2">BILL TO</h3>
                <p className="font-semibold text-xs sm:text-sm">{bill.billingInfo?.name}</p>
                <p className="text-xs text-gray-700">{bill.billingInfo?.address}</p>
                <p className="text-xs text-gray-700 mt-2">GST No.: {bill.billingInfo?.gst}</p>
                <p className="text-xs text-gray-700">PAN No.: {bill.billingInfo?.pan}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="font-bold">Invoice No.:</p>
                  <p>{bill.billNumber}</p>
                </div>
                <div>
                  <p className="font-bold">Invoice Date:</p>
                  <p>{new Date(bill.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <div>
                  <p className="font-bold">A/C Code:</p>
                  <p>{bill.acCode || "-"}</p>
                </div>
                <div>
                  <p className="font-bold">State Code:</p>
                  <p>{bill.billingInfo?.gst.slice(0, 2)}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-bold text-xs sm:text-sm mb-2 bg-gray-200 p-2 border border-gray-300">
                INVOICE SUMMARY
              </h3>
              <table className="w-full text-xs border-collapse mb-3">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">Service</th>
                    <th className="border border-gray-300 p-2 text-left">Total AWBs</th>
                    <th className="border border-gray-300 p-2 text-right">Total Weight</th>
                    <th className="border border-gray-300 p-2 text-right">Taxable Amount</th>
                    <th className="border border-gray-300 p-2 text-right">CGST ({bill.cgst}%)</th>
                    <th className="border border-gray-300 p-2 text-right">SGST ({bill.sgst}%)</th>
                    <th className="border border-gray-300 p-2 text-right">IGST ({bill.igst}%)</th>
                    <th className="border border-gray-300 p-2 text-right">G. Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.awbs && bill.awbs.length > 0 ? (
                    <tr className="border">
                      <td className="border border-gray-300 p-2">Courier Service</td>
                      <td className="border border-gray-300 p-2">{bill.awbs.length}</td>
                      <td className="border border-gray-300 p-2 text-right">
                        {bill.awbs?.reduce((sum, a) => sum + (a.weight || 0), 0).toFixed(2)} kg
                      </td>
                      <td className="border border-gray-300 p-2 text-right">₹{bill.subtotal?.toFixed(2)}</td>
                      <td className="border border-gray-300 p-2 text-right">₹{bill.cgstAmount}</td>
                      <td className="border border-gray-300 p-2 text-right">₹{bill.sgstAmount}</td>
                      <td className="border border-gray-300 p-2 text-right">₹{bill.igstAmount}</td>
                      <td className="border border-gray-300 p-2 text-right font-bold">₹{bill.total?.toFixed(2)}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-300">
              <p className="text-xs font-semibold">
                Amount in Words: {toWords.convert(bill.total)}
              </p>
            </div>

            <div className="flex flex-col md:flex-row md:space-x-6 justify-between">
              <div className="mb-4">
                <h3 className="font-bold text-xs sm:text-sm mb-2 bg-gray-200 p-2 border border-gray-300">
                  OUR BANK DETAILS
                </h3>
                <table className="w-full text-xs border border-gray-300">
                  <tbody>
                    <tr className="border-b border-gray-300">
                      <td className="font-bold py-2 px-3 w-1/3">Bank Name:</td>
                      <td className="py-2 px-3">IDFC FIRST BANK</td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="font-bold py-2 px-3 w-1/3">Banking Name:</td>
                      <td className="py-2 px-3">SUNEX SERVICES PRIVATE LIMITED</td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="font-bold py-2 px-3">A/C No.:</td>
                      <td className="py-2 px-3 font-mono">10227270147</td>
                    </tr>
                    <tr>
                      <td className="font-bold py-2 px-3">IFSC Code:</td>
                      <td className="py-2 px-3 font-mono">IDFB0040178</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mb-4">
                <h3 className="font-bold text-xs sm:text-sm mb-2 bg-gray-200 p-2 border border-gray-300">
                  TAX CALCULATION
                </h3>
                <table className="w-full sm:w-80 text-xs border-collapse">
                  <tbody>
                    <tr className="border border-gray-300">
                      <td className="border border-gray-300 p-2 font-bold w-3/5">Taxable Amount:</td>
                      <td className="border border-gray-300 p-2 text-right font-semibold">
                        ₹{bill.subtotal?.toFixed(2)}
                      </td>
                    </tr>
                    {bill.cgstAmount > 0 && (
                      <tr className="border border-gray-300">
                        <td className="border border-gray-300 p-2 font-bold">CGST @ {bill.cgst || 9}%:</td>
                        <td className="border border-gray-300 p-2 text-right">₹{bill.cgstAmount?.toFixed(2)}</td>
                      </tr>
                    )}
                    {bill.sgstAmount > 0 && (
                      <tr className="border border-gray-300">
                        <td className="border border-gray-300 p-2 font-bold">SGST @ {bill.sgst || 9}%:</td>
                        <td className="border border-gray-300 p-2 text-right">₹{bill.sgstAmount?.toFixed(2)}</td>
                      </tr>
                    )}
                    {bill.igstAmount > 0 && (
                      <tr className="border border-gray-300">
                        <td className="border border-gray-300 p-2 font-bold">IGST @ {bill.igst || 18}%:</td>
                        <td className="border border-gray-300 p-2 text-right">₹{bill.igstAmount?.toFixed(2)}</td>
                      </tr>
                    )}
                    <tr className="border border-gray-300 bg-gray-100 font-bold">
                      <td className="border border-gray-300 p-2">Grand Total:</td>
                      <td className="border border-gray-300 p-2 text-right">₹{bill.total?.toFixed(2)}</td>
                    </tr>
                    <tr className="border border-gray-300">
                      <td className="border border-gray-300 p-2">Round Off:</td>
                      <td className="border border-gray-300 p-2 text-right">{bill.roundOff || "-0.18"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* take 2 cols space for terms and conditions and 1 cols space for signature */}
            <div className="grid grid-cols-3 md:space-x-6 justify-between">
              <div className="mb-4 col-span-2">
                <h3 className="font-bold text-xs sm:text-sm mb-2 bg-gray-200 p-2 border border-gray-300">
                  TERMS & CONDITIONS
                </h3>
                <div className="p-3 bg-white border border-gray-300 text-xs space-y-1 text-gray-700">
                  <p className="font-semibold pt-2">E.&O.E</p>
                  <p>
                    1. On receipt of the invoice the payment should be remitted within 24 hours, otherwise interest @18%
                    p.a. shall be applicable.
                  </p>
                  <p>2. Company liability is restricted as per the stipulations specified in airway bill.</p>
                  <p>3. Cheque/DD should be in Favour of SUNEX SERVICES PRIVATE LIMITED</p>
                  <p>4. All disputes are subject to Mumbai Jurisdication only.</p>
                  <p>5. This is a computer generated invoice and it does not require signature.</p>
                </div>
              </div>

              <div className="pt-4 border border-gray-300 flex items-center justify-center bg-white">
                <div className="text-right">
                  <p className="text-xs font-semibold mb-1">For SunEx Services Pvt. Ltd.</p>
                  <div className="mt-8 pt-2 border-t border-gray-400 inline-block w-40">
                    <p className="text-xs font-semibold">Stamp & Signature</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div data-page="2" className="p-4 sm:p-6 md:p-8 text-xs sm:text-sm print:p-6 print:pt-8 min-h-0">
            <div className="mb-4 pb-4 border-b-2 border-gray-300">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">Invoice No.: {bill.billNumber}</p>
                  <p className="text-xs text-gray-600">Page 2 of 2</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">
                    Reg. Off: 901, 9th Floor, Emerald 2 CHS LTD, Royal Palms, Aarey Milk Colony, Goregaon East, Mumbai 400 065
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <h3 className="font-bold text-xs sm:text-sm mb-2 bg-gray-200 p-2 border border-gray-300">
                SHIPMENT DETAILS
              </h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left whitespace-nowrap">Sr. No.</th>
                    <th className="border border-gray-300 p-2 text-left whitespace-nowrap">AWB No.</th>
                    <th className="border border-gray-300 p-2 text-left whitespace-nowrap">Date</th>
                    <th className="border border-gray-300 p-2 text-left whitespace-nowrap">Destination</th>
                    <th className="border border-gray-300 p-2 text-left whitespace-nowrap">Service</th>
                    <th className="border border-gray-300 p-2 text-right whitespace-nowrap">Weight</th>
                    <th className="border border-gray-300 p-2 text-right whitespace-nowrap">Base Charge</th>
                    <th className="border border-gray-300 p-2 text-right whitespace-nowrap">Other Charges</th>
                    <th className="border border-gray-300 p-2 text-right whitespace-nowrap">Fuel Surcharge</th>
                    <th className="border border-gray-300 p-2 text-right whitespace-nowrap">Taxable Amount</th>

                  </tr>
                </thead>
                <tbody>
                  {bill.awbs &&
                    bill.awbs.map((awb, idx) => (
                      <tr key={idx} className="border">
                        <td className="border border-gray-300 p-2">{idx + 1}</td>
                        <td className="border border-gray-300 p-2 font-mono">{awb.trackingNumber}</td>
                        <td className="border border-gray-300 p-2 whitespace-nowrap">
                          {new Date(awb.date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="border border-gray-300 p-2">{awb.country}</td>
                        <td className="border border-gray-300 p-2">{awb.service}</td>
                        <td className="border border-gray-300 p-2 text-right">{awb.weight?.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2 text-right font-semibold">
                          ₹{awb.baseCharge?.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 p-2 text-right">₹{awb.otherCharges?.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2 text-right">₹{awb.fuelSurcharge?.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2 text-right">₹{awb.subtotal?.toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-300">
              <p className="text-xs text-gray-600 mb-2">
                Other Charges include: Go Green Charges, Demand Surcharge, etc
              </p>
              <p className="text-xs text-gray-600">Page 2 of 2</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:bg-white {
            background-color: white !important;
          }
          
          .print\\:py-0 {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          
          .print\\:px-0 {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          
          .print\\:max-w-full {
            max-width: 100% !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:p-6 {
            padding: 1.5rem !important;
          }
          
          .print\\:pb-2 {
            padding-bottom: 0.5rem !important;
          }
          
          .print\\:pt-8 {
            padding-top: 2rem !important;
          }
          
          @page {
            margin: 0;
            padding: 0;
          }
          
          div[data-page] {
            page-break-after: always !important;
            page-break-inside: avoid !important;
            break-after: page !important;
            break-inside: avoid !important;
          }
          
          div[data-page]:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          
          table {
            page-break-inside: avoid !important;
          }
          
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </>
  )
}
