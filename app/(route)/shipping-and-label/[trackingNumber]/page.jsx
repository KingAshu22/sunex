"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import axios from "axios"
import { Loader2, Printer, FileText, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import JsBarcode from "jsbarcode"

export default function CombinedShippingPage() {
  const { trackingNumber } = useParams()
  const [awbData, setAwbData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const invoiceRef = useRef(null)
  const labelRef = useRef(null)
  const [invoiceCopies, setInvoiceCopies] = useState(1)
  const [totalBoxes, setTotalBoxes] = useState(1)

  useEffect(() => {
    const fetchAWBData = async () => {
      console.log(`AWB fetching data ${trackingNumber}`)
      setLoading(true)
      try {
        const response = await axios.get(`/api/awb/${trackingNumber}`)
        setAwbData(response.data[0])
        setTotalBoxes(response.data[0]?.boxes.length || 1)
        setLoading(false)
      } catch (err) {
        setError("Failed to fetch AWB data")
        setLoading(false)
      }
    }

    if (trackingNumber) {
      fetchAWBData()
    }
  }, [trackingNumber])

  // Function to convert number to words
  const numberToWords = (num) => {
    const units = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ]
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    if (num === 0) return "Zero"

    const convertLessThanOneThousand = (num) => {
      if (num === 0) return ""
      if (num < 20) return units[num]

      const digit = num % 10
      if (num < 100) return tens[Math.floor(num / 10)] + (digit ? " " + units[digit] : "")

      return units[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + convertLessThanOneThousand(num % 100) : "")
    }

    let words = ""
    let chunk = 0

    chunk = Math.floor(num / 10000000)
    if (chunk > 0) {
      words += convertLessThanOneThousand(chunk) + " Crore "
      num %= 10000000
    }

    chunk = Math.floor(num / 100000)
    if (chunk > 0) {
      words += convertLessThanOneThousand(chunk) + " Lakh "
      num %= 100000
    }

    chunk = Math.floor(num / 1000)
    if (chunk > 0) {
      words += convertLessThanOneThousand(chunk) + " Thousand "
      num %= 1000
    }

    if (num > 0) {
      words += convertLessThanOneThousand(num)
    }

    return words.trim()
  }

  // Calculate total amount
  const calculateTotal = () => {
    if (!awbData || !awbData.boxes) return 0

    let total = 0
    awbData.boxes.forEach((box) => {
      box.items.forEach((item) => {
        total += Number(item.price) * Number(item.quantity)
      })
    })

    return total
  }

  const generateInvoiceHTML = () => {
    const totalAmount = calculateTotal()
    const amountInWords =
      numberToWords(Math.round(totalAmount)) + " " + (awbData.shippingCurrency === "₹" ? "Rupees" : "Dollars") + " Only"

    return `
            <div class="text-center mb-6">
                <h1 class="text-2xl font-bold">SHIPPING INVOICE</h1>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6 text-[12px]">
                <div>
                    <p><strong>Date:</strong> ${awbData.date ? format(new Date(awbData.date), "dd/MM/yyyy") : "N/A"}</p>
                    <p><strong>Pre Carriage By:</strong> ${awbData.via || "N/A"}</p>
                    <p><strong>Vessel/Flight No:</strong> ${awbData.forwardingNo || "N/A"}</p>
                    <p><strong>Port of Discharge:</strong> ${awbData.sender?.country || "N/A"}</p>
                    <p><strong>Country of Origin of Goods:</strong> ${awbData.sender?.country || "INDIA"}</p>
                </div>
                <div>
                    <p><strong>EXP. REF-</strong> ${awbData.trackingNumber}</p>
                    <p><strong>Place of Receipt by Pre-carrier:</strong></p>
                    <p><strong>Port of Loading:</strong> ${awbData.sender?.country || "N/A"}</p>
                    <p><strong>Final Destination:</strong> ${awbData.receiver?.country || "N/A"}</p>
                    <p><strong>Country of Final Destination:</strong> ${awbData.receiver?.country || "N/A"}</p>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2 mb-6 text-[12px]">
                <div class="border border-gray-300 p-1 rounded-lg">
                    <h2 class="font-bold mb-2">Sender:</h2>
                    <p class="font-bold uppercase">${awbData.sender?.name}</p>
                    ${awbData.sender?.companyName ? `<p class="font-bold uppercase">C/O ${awbData.sender?.companyName}</p>` : ""}
                    <p>${awbData.sender?.address}</p>
                    <p class="flex flex-row gap-2">
                        <strong>Zip Code:</strong> ${awbData.sender?.zip}
                        <strong>Country:</strong>${awbData.sender?.country}
                    </p>
                    <p><strong>Cont No:</strong> ${awbData.sender?.contact}</p>
                    <p><strong>Email:</strong> ${awbData.sender?.email || "yourship.sunexpress@gmail.com"}</p>
                    <p><strong>${awbData.sender.kyc.type}</strong> ${awbData.sender.kyc.kyc}</p>
                </div>
                <div class="border border-gray-300 rounded-lg p-1">
                    <h2 class="font-bold mb-2">Receiver:</h2>
                    <p class="font-bold uppercase">${awbData.receiver?.name}</p>
                    ${awbData.receiver?.companyName ? `<p class="font-bold uppercase">C/O ${awbData.receiver?.companyName}</p>` : ""}
                    <p>${awbData.receiver?.address}</p>
                    <p class="flex flex-row gap-2">
                        <strong>Zip Code:</strong> ${awbData.receiver?.zip}
                        <strong>Country:</strong>${awbData.receiver?.country}
                    </p>
                    <p><strong>Cont No:</strong> ${awbData.receiver?.contact}</p>
                    <p><strong>Email:</strong> ${awbData.receiver?.email || "yourship.sunexpress@gmail.com"}</p>
                </div>
            </div>

            <div class="h-[540px]">
                <table class="w-full border-collapse mb-2 text-[12px]">
                    <thead>
                        <tr class="bg-gray-100">
                            <th class="border border-gray-300 px-2 text-left w-[10px] whitespace-nowrap">Sr No.</th>
                            <th class="border border-gray-300 px-2 text-left">Description of Goods</th>
                            <th class="border border-gray-300 px-2 text-left w-[80px]">HSN Code</th>
                            <th class="border border-gray-300 px-2 text-left w-[20px]">Quantity</th>
                            <th class="border border-gray-300 px-2 text-left w-[40px]">Rate</th>
                            <th class="border border-gray-300 px-2 text-left w-[40px]">Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${awbData.boxes
                          ?.flatMap((box, boxIndex) => [
                            `<tr class="bg-gray-200">
                                <td colspan="6" class="border border-gray-300 py-0 font-bold text-center text-[10px]">
                                    Box No ${boxIndex + 1}
                                </td>
                            </tr>`,
                            ...box.items.map(
                              (item, itemIndex) => `
                                <tr>
                                    <td class="border border-gray-300 px-2 w-[10px]">${itemIndex + 1}</td>
                                    <td class="border border-gray-300 px-2">${item.name}</td>
                                    <td class="border border-gray-300 px-2 w-[80px] text-center">${item.hsnCode || "N/A"}</td>
                                    <td class="border border-gray-300 px-2 w-[20px]">${item.quantity}</td>
                                    <td class="border border-gray-300 px-2 w-[40px] whitespace-nowrap">
                                        ${awbData.shippingCurrency || "₹"}${item.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td class="border border-gray-300 px-2 w-[40px] whitespace-nowrap">
                                        ${awbData.shippingCurrency || "₹"}${(Number(item.price) * Number(item.quantity)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            `,
                            ),
                          ])
                          .join("")}
                        <tr class="font-bold text-[12px]">
                            <td colspan="5" class="border border-gray-300 p-0 text-[10px] whitespace-nowrap text-right pr-2">
                                Total Amount:
                            </td>
                            <td class="border border-gray-300 px-2 whitespace-nowrap">
                                ${awbData.shippingCurrency || "₹"}${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                        </tr>
                        <tr class="font-bold text-[12px]">
                            <td class="border border-gray-300 p-0 text-[10px] whitespace-nowrap text-center">In Words:</td>
                            <td colspan="5" class="border border-gray-300 px-2">${amountInWords}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mt-2 pt-1 text-justify italic text-[12px] border-t border-gray-400">
                <p class="font-bold">Declaration:</p>
                <p>We certify that the information given above is true and correct to the best of our knowledge</p>
            </div>

            <div class="mt-2 mr-4 text-right text-[12px]">
                <p class="mr-12">Signature & Date</p>
                <div class="h-10"></div>
                <div class="border-t border-gray-400 w-48 ml-auto"></div>
            </div>
        `
  }

  const generateLabelHTML = (boxNumber) => {
    return `
            <div class="barcode-top-right">
                <svg class="barcode-svg" data-box="${awbData?.trackingNumber}"></svg>
                <p class="pr-1 whitespace-nowrap">Box No - ${boxNumber}/${awbData.boxes.length}</p>
            </div>
            <div class="address-section">
                <h2 class="font-bold mb-2">Receiver:</h2>
                <p class="font-bold uppercase">${awbData?.receiver?.name || ""}</p>
                ${awbData?.receiver?.companyName ? `<p class="font-bold uppercase">C/O ${awbData?.receiver?.companyName}</p>` : ""}
                <p>${awbData?.receiver?.address || ""}</p>
                <div class="contact-info">
                    <p><strong>Zip Code:</strong> ${awbData?.receiver?.zip || ""}</p>
                    <p><strong>Country:</strong> ${awbData?.receiver?.country || ""}</p>
                </div>
                <p>Cont No: ${awbData?.receiver?.contact || ""}</p>
            </div>
        `
  }

  const generatePageLayout = (boxesOnPage, startBox) => {
    const boxCount = Math.min(boxesOnPage, 4)

    if (boxCount === 1) {
      return `
                <div class="page">
                    <div class="label-full">
                        ${generateLabelHTML(startBox)}
                    </div>
                </div>
            `
    } else if (boxCount === 2) {
      return `
                <div class="page">
                    <div class="label-half">
                        ${generateLabelHTML(startBox)}
                    </div>
                    <div class="label-half">
                        ${generateLabelHTML(startBox + 1)}
                    </div>
                </div>
            `
    } else if (boxCount === 3) {
      return `
                <div class="page">
                    <div class="top-half">
                        <div class="label-quarter">
                            ${generateLabelHTML(startBox)}
                        </div>
                        <div class="label-quarter">
                            ${generateLabelHTML(startBox + 1)}
                        </div>
                    </div>
                    <div class="bottom-half">
                        <div class="label-half-full">
                            ${generateLabelHTML(startBox + 2)}
                        </div>
                    </div>
                </div>
            `
    } else if (boxCount === 4) {
      return `
                <div class="page">
                    <div class="top-half">
                        <div class="label-quarter">
                            ${generateLabelHTML(startBox)}
                        </div>
                        <div class="label-quarter">
                            ${generateLabelHTML(startBox + 1)}
                        </div>
                    </div>
                    <div class="bottom-half">
                        <div class="label-quarter">
                            ${generateLabelHTML(startBox + 2)}
                        </div>
                        <div class="label-quarter">
                            ${generateLabelHTML(startBox + 3)}
                        </div>
                    </div>
                </div>
            `
    }
  }

  const handleCombinedPrint = () => {
    const originalContent = document.body.innerHTML

    // Generate invoice copies
    let allInvoices = ""
    for (let i = 0; i < invoiceCopies; i++) {
      allInvoices += `
      <div class="invoice-page">
        ${generateInvoiceHTML()}
      </div>
    `
      // Add page break after each invoice except the last one
      if (i < invoiceCopies - 1) {
        allInvoices += '<div class="page-break"></div>'
      }
    }

    // Generate label pages
    const totalPages = Math.ceil(totalBoxes / 4)
    let allLabels = ""

    for (let page = 0; page < totalPages; page++) {
      const startBox = page * 4 + 1
      const boxesOnThisPage = Math.min(4, totalBoxes - page * 4)

      allLabels += generatePageLayout(boxesOnThisPage, startBox)

      // Add page break after each label page except the last one
      if (page < totalPages - 1) {
        allLabels += '<div class="page-break"></div>'
      }
    }

    // Combine content with proper page break between sections
    let combinedContent = ""

    if (invoiceCopies > 0) {
      combinedContent += allInvoices
    }

    if (invoiceCopies > 0 && totalBoxes > 0) {
      combinedContent += '<div class="page-break"></div>'
    }

    if (totalBoxes > 0) {
      combinedContent += allLabels
    }

    document.body.innerHTML = `
    <style>
      @page {
        size: A4;
        margin: 10mm;
      }
      
      * {
        box-sizing: border-box;
      }
      
      body {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
        line-height: 1.2;
      }
      
      .page-break {
        page-break-after: always;
        height: 0;
        margin: 0;
        padding: 0;
      }
      
      /* Invoice Styles */
      .invoice-page {
        width: 100%;
        min-height: 95vh;
        border: 1px solid #666;
        border-radius: 8px;
        padding: 15px;
        margin: 0;
        background: white;
        page-break-inside: avoid;
      }
      
      .invoice-page .text-center {
        text-align: center;
      }
      
      .invoice-page .grid {
        display: grid;
      }
      
      .invoice-page .grid-cols-2 {
        grid-template-columns: 1fr 1fr;
      }
      
      .invoice-page .gap-4 {
        gap: 16px;
      }
      
      .invoice-page .gap-2 {
        gap: 8px;
      }
      
      .invoice-page .mb-6 {
        margin-bottom: 24px;
      }
      
      .invoice-page .mb-2 {
        margin-bottom: 8px;
      }
      
      .invoice-page .mt-2 {
        margin-top: 8px;
      }
      
      .invoice-page .p-1 {
        padding: 4px;
      }
      
      .invoice-page .px-2 {
        padding-left: 8px;
        padding-right: 8px;
      }
      
      .invoice-page .border {
        border: 1px solid #d1d5db;
      }
      
      .invoice-page .border-gray-300 {
        border-color: #d1d5db;
      }
      
      .invoice-page .border-gray-400 {
        border-color: #9ca3af;
      }
      
      .invoice-page .rounded-lg {
        border-radius: 8px;
      }
      
      .invoice-page .font-bold {
        font-weight: bold;
      }
      
      .invoice-page .uppercase {
        text-transform: uppercase;
      }
      
      .invoice-page .text-right {
        text-align: right;
      }
      
      .invoice-page .text-center {
        text-align: center;
      }
      
      .invoice-page .text-justify {
        text-align: justify;
      }
      
      .invoice-page .italic {
        font-style: italic;
      }
      
      .invoice-page .flex {
        display: flex;
      }
      
      .invoice-page .flex-row {
        flex-direction: row;
      }
      
      .invoice-page table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8px;
      }
      
      .invoice-page th,
      .invoice-page td {
        border: 1px solid #d1d5db;
        padding: 4px 8px;
        text-align: left;
        font-size: 12px;
      }
      
      .invoice-page th {
        background-color: #f3f4f6;
        font-weight: bold;
      }
      
      .invoice-page .bg-gray-100 {
        background-color: #f3f4f6;
      }
      
      .invoice-page .bg-gray-200 {
        background-color: #e5e7eb;
      }
      
      .invoice-page .whitespace-nowrap {
        white-space: nowrap;
      }
      
      .invoice-page .border-t {
        border-top: 1px solid #9ca3af;
      }
      
      .invoice-page .ml-auto {
        margin-left: auto;
      }
      
      .invoice-page .mr-4 {
        margin-right: 16px;
      }
      
      .invoice-page .mr-12 {
        margin-right: 48px;
      }
      
      .invoice-page .pt-1 {
        padding-top: 4px;
      }
      
      .invoice-page .h-10 {
        height: 40px;
      }
      
      .invoice-page .w-48 {
        width: 192px;
      }
      
      /* Label Styles */
      .page {
        width: 100%;
        height: 100vh;
        display: flex;
        flex-direction: column;
        margin: 0;
        padding: 0;
        page-break-inside: avoid;
      }
      
      .label-full {
        width: 100%;
        height: 100%;
        border: 2px solid #000;
        border-radius: 15px;
        padding: 20px;
        position: relative;
        background: white;
      }
      
      .label-half {
        width: 100%;
        height: calc(50% - 5px);
        border: 2px solid #000;
        border-radius: 10px;
        padding: 15px;
        position: relative;
        margin-bottom: 10px;
        background: white;
      }
      
      .label-half:last-child {
        margin-bottom: 0;
      }
      
      .top-half, .bottom-half {
        width: 100%;
        height: calc(50% - 5px);
        display: flex;
        flex-direction: row;
        gap: 10px;
      }
      
      .bottom-half {
        margin-top: 10px;
      }
      
      .label-quarter {
        width: calc(50% - 5px);
        height: 100%;
        border: 2px solid #000;
        border-radius: 8px;
        padding: 12px;
        position: relative;
        background: white;
      }
      
      .label-half-full {
        width: 100%;
        height: 100%;
        border: 2px solid #000;
        border-radius: 10px;
        padding: 15px;
        position: relative;
        background: white;
      }
      
      .address-section {
        width: 70%;
        padding-top: 10px;
      }
      
      .barcode-top-right {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 25%;
        text-align: right;
      }
      
      .contact-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      /* Responsive font sizes for labels */
      .label-full h2 { font-size: 28pt; margin: 0 0 10px 0; }
      .label-full p { font-size: 24pt; margin: 4px 0; line-height: 1.2; }
      
      .label-half h2 { font-size: 20pt; margin: 0 0 8px 0; }
      .label-half p { font-size: 18pt; margin: 3px 0; line-height: 1.2; }
      
      .label-half-full h2 { font-size: 20pt; margin: 0 0 8px 0; }
      .label-half-full p { font-size: 18pt; margin: 3px 0; line-height: 1.2; }
      
      .label-quarter h2 { font-size: 14pt; margin: 0 0 6px 0; }
      .label-quarter p { font-size: 12pt; margin: 2px 0; line-height: 1.1; }
      
      .address-section p {
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      .address-section .font-bold {
        font-weight: bold;
      }
      
      .address-section .uppercase {
        text-transform: uppercase;
      }
    </style>
    ${combinedContent}
  `

    // Render barcodes for labels
    setTimeout(() => {
      const barcodeElements = document.querySelectorAll(".barcode-svg")
      barcodeElements.forEach((element) => {
        const boxNumber = element.getAttribute("data-box")

        let barcodeHeight = 40
        let barcodeWidth = 1.2

        const labelParent = element.closest(".label-full, .label-half, .label-quarter, .label-half-full")

        if (labelParent?.classList.contains("label-full")) {
          barcodeHeight = 60
          barcodeWidth = 2
        } else if (
          labelParent?.classList.contains("label-half") ||
          labelParent?.classList.contains("label-half-full")
        ) {
          barcodeHeight = 45
          barcodeWidth = 1.5
        } else if (labelParent?.classList.contains("label-quarter")) {
          barcodeHeight = 35
          barcodeWidth = 1
        }

        JsBarcode(element, awbData?.trackingNumber || "N/A", {
          format: "CODE128",
          width: barcodeWidth,
          height: barcodeHeight,
          displayValue: false,
          fontSize: 0,
          margin: 2,
        })
      })

      setTimeout(() => {
        window.print()
        document.body.innerHTML = originalContent
        window.location.reload()
      }, 300)
    }, 200)
  }

  const getLayoutDescription = () => {
    if (totalBoxes === 1) return "One full-page label"
    if (totalBoxes === 2) return "Two half-page labels (stacked vertically)"
    if (totalBoxes === 3) return "Two labels on top half (side by side), one full-width label on bottom half"
    if (totalBoxes === 4) return "Four quarter-page labels in a 2×2 grid"

    const pages = Math.ceil(totalBoxes / 4)
    return `${totalBoxes} labels across ${pages} page${pages > 1 ? "s" : ""} (max 4 labels per page)`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-indigo-50 to-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 bg-gradient-to-b from-indigo-50 to-white min-h-screen">
        <h1 className="text-4xl font-bold mb-8 text-center text-red-600">Error</h1>
        <p className="text-center text-xl">{error}</p>
      </div>
    )
  }

  if (!awbData) {
    return (
      <div className="container mx-auto px-4 py-8 bg-gradient-to-b from-indigo-50 to-white min-h-screen">
        <h1 className="text-4xl font-bold mb-8 text-center text-indigo-800">No Data Found</h1>
        <p className="text-center text-xl">No tracking information found for the given tracking number.</p>
      </div>
    )
  }

  const totalAmount = calculateTotal()
  const amountInWords =
    numberToWords(Math.round(totalAmount)) + " " + (awbData.shippingCurrency === "₹" ? "Rupees" : "Dollars") + " Only"

  return (
    <div className="container mx-auto px-4 py-6 bg-gradient-to-b from-indigo-50 to-white min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center text-[#232C65] mb-2">Shipping Documents</h1>
        <p className="text-center text-gray-600">
          Generate and print shipping invoices and labels for tracking number: {trackingNumber}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Invoice Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Shipping Invoice
            </CardTitle>
            <CardDescription>Configure and preview shipping invoice copies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <label htmlFor="invoiceCopies" className="text-sm font-medium">
                Number of Copies:
              </label>
              <input
                id="invoiceCopies"
                type="number"
                min="1"
                max="10"
                value={invoiceCopies}
                onChange={(e) => setInvoiceCopies(Math.max(1, Math.min(10, Number.parseInt(e.target.value) || 1)))}
                className="w-16 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="text-sm text-gray-600">
              <p>• Each copy will be printed on a separate page</p>
              <p>• Contains detailed item breakdown and pricing</p>
              <p>
                • Total Amount: {awbData.shippingCurrency || "₹"}
                {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Labels Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Shipping Labels
            </CardTitle>
            <CardDescription>Configure and preview shipping label layout</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <label htmlFor="totalBoxes" className="text-sm font-medium">
                Total Boxes:
              </label>
              <input
                id="totalBoxes"
                type="number"
                min="1"
                max="100"
                value={totalBoxes}
                onChange={(e) => setTotalBoxes(Math.max(1, Math.min(100, Number.parseInt(e.target.value) || 1)))}
                className="w-16 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="text-sm text-gray-600">
              <p>• Layout: {getLayoutDescription()}</p>
              <p>• Each label includes barcode and receiver address</p>
              <p>• Optimized for efficient page usage</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6" />

      {/* Print Section */}
      <div className="text-center">
        <div className="bg-blue-50 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-3 text-[#232C65]">Print Summary</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Invoices: {invoiceCopies} copies</p>
              <p className="text-gray-600">Each invoice on separate page</p>
            </div>
            <div>
              <p className="font-medium">Labels: {totalBoxes} labels</p>
              <p className="text-gray-600">
                {Math.ceil(totalBoxes / 4)} page{Math.ceil(totalBoxes / 4) > 1 ? "s" : ""} total
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Print order: All invoice copies first, then all labels</p>
        </div>

        <Button
          onClick={handleCombinedPrint}
          size="lg"
          className="flex items-center gap-2 bg-[#232C65] hover:bg-[#1a2150] px-8 py-3"
        >
          <Printer className="h-5 w-5" />
          Print All Documents
        </Button>
      </div>

      {/* Hidden preview areas */}
      <div className="hidden">
        <div ref={invoiceRef} className="printableArea bg-white p-1 border border-gray-200 rounded-lg shadow-sm">
          {/* Invoice preview content would go here */}
        </div>
        <div ref={labelRef}>{/* Label preview content would go here */}</div>
      </div>
    </div>
  )
}
