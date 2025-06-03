"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import axios from "axios"
import { Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import Barcode from "react-barcode"
import JsBarcode from "jsbarcode"

export default function Label() {
  const { trackingNumber } = useParams()
  const [awbData, setAwbData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const printableAreaRef = useRef(null)
  const [totalBoxes, setTotalBoxes] = useState(1)

  useEffect(() => {
    const fetchAWBData = async () => {
      console.log(`AWB fetching data ${trackingNumber}`)
      setLoading(true)
      try {
        const response = await axios.get(`/api/awb/${trackingNumber}`)
        setAwbData(response.data[0])
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

  const handlePrint = () => {
    const originalContent = document.body.innerHTML

    // Create labels for all boxes on a single A4 page
    let allLabels = ""

    // Determine layout based on total boxes
    let labelClass = "label-full"
    if (totalBoxes === 2) {
      labelClass = "label-half"
    } else if (totalBoxes === 3) {
      // Special case for 3 boxes
      allLabels = `
      <div class="label-container flex flex-row">
        <div class="label-full-half">
          <div class="barcode-top-right">
            <svg class="barcode-svg"></svg>
          </div>
          <div class="address-section-full">
            <h2 class="font-bold mb-2">Receiver:</h2>
            <p class="font-bold uppercase">${awbData?.receiver?.name || ""}</p>
            <p>${awbData?.receiver?.address || ""}</p>
            <p>${awbData?.receiver?.zip || ""}, ${awbData?.receiver?.country || ""}</p>
            <p>Cont No: ${awbData?.receiver?.contact || ""}</p>
          </div>
        </div>
        <div class="label-full-half">
          <div class="barcode-top-right">
            <svg class="barcode-svg"></svg>
          </div>
          <div class="address-section-full">
            <h2 class="font-bold mb-2">Receiver:</h2>
            <p class="font-bold uppercase">${awbData?.receiver?.name || ""}</p>
            <p>${awbData?.receiver?.address || ""}</p>
            <p>${awbData?.receiver?.zip || ""}, ${awbData?.receiver?.country || ""}</p>
            <p>Cont No: ${awbData?.receiver?.contact || ""}</p>
          </div>
        </div>
        <div class="label-half">
          <div class="barcode-top-right">
            <svg class="barcode-svg"></svg>
          </div>
          <div class="address-section-full">
            <h2 class="font-bold mb-2">Receiver:</h2>
            <p class="font-bold uppercase">${awbData?.receiver?.name || ""}</p>
            <p>${awbData?.receiver?.address || ""}</p>
            <p>${awbData?.receiver?.zip || ""}, ${awbData?.receiver?.country || ""}</p>
            <p>Cont No: ${awbData?.receiver?.contact || ""}</p>
          </div>
        </div>
      </div>
    `
    } else if (totalBoxes === 4) {
      labelClass = "label-quarter"
    } else if (totalBoxes > 4) {
      labelClass = "label-eighth"
    }

    // Generate labels for all cases except the special case of 3 boxes
    if (totalBoxes !== 3) {
      allLabels = `<div class="label-container">`
      for (let i = 0; i < totalBoxes; i++) {
        allLabels += `
        <div class="${labelClass}">
          <div class="barcode-top-right">
            <svg class="barcode-svg"></svg>
          </div>
          <div class="address-section-full">
            <h2 class="font-bold mb-2">Receiver:</h2>
            <p class="font-bold uppercase">${awbData?.receiver?.name || ""}</p>
            <p class="font-bold uppercase">${awbData?.receiver?.companyName ? `C/O ${awbData?.receiver?.companyName}` : ""}</p>
            <p>${awbData?.receiver?.address || ""}</p>
            <p class="flex flex-col gap-2">
                <strong>Zip Code: ${awbData?.receiver?.zip || ""}</strong>
                <strong>Country: ${awbData?.receiver?.country || ""}</strong>
            </p>
            <p>Cont No: ${awbData?.receiver?.contact || ""}</p>
          </div>
        </div>
      `
      }
      allLabels += `</div>`
    }

    document.body.innerHTML = `
    <style>
      @page {
        size: A4;
        margin: 0.5cm;
      }
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
      }
      .label-container {
        width: 100%;
        height: 29.7cm;
        display: flex;
        flex-wrap: wrap;
        box-sizing: border-box;
      }
      .label-full {
        width: 100%;
        height: 80%;
        border: 1px solid #000;
        border-radius: 25px;
        padding: 0.5cm;
        box-sizing: border-box;
        position: relative;
      }
      .label-half {
        width: 100%;
        height: 40%;
        border: 1px solid #000;
        border-radius: 25px;
        padding: 0.5cm;
        box-sizing: border-box;
        position: relative;
      }
      .label-full-half {
        width: 60%;
        height: 40%;
        border: 1px solid #000;
        border-radius: 5px;
        padding: 0.5cm;
        box-sizing: border-box;
        position: relative;
      }
      .label-quarter {
        width: 50%;
        height: 14.85cm;
        border: 1px solid #000;
        border-radius: 5px;
        padding: 0.5cm;
        box-sizing: border-box;
        position: relative;
      }
      .label-eighth {
        width: 50%;
        height: 7.425cm;
        border: 1px solid #000;
        border-radius: 5px;
        padding: 0.3cm;
        box-sizing: border-box;
        position: relative;
      }
      .address-section-full {
        width: 100%;
        padding-top: 1cm;
      }
      .barcode-top-right {
        position: absolute;
        top: 0.5cm;
        right: 0.5cm;
        width: 25%;
        text-align: right;
      }
      .page-break {
        page-break-after: always;
      }
      h2 {
        margin-top: 0;
      }
      p {
        margin: 0.2cm 0;
      }
      .font-bold {
        font-weight: bold;
      }
      .uppercase {
        text-transform: uppercase;
      }
      
      /* Responsive font sizes based on label size */
      .label-full h2 { font-size: 30pt; }
      .label-full p { font-size: 30pt; line-height: 1.3; }
      
      .label-half h2 { font-size: 24pt; }
      .label-half p { font-size: 24pt; line-height: 1.3; }
      .label-full-half h2 { font-size: 24pt; }
      .label-full-half p { font-size: 24pt; line-height: 1.3; }
      
      .label-quarter h2 { font-size: 16pt; }
      .label-quarter p { font-size: 16pt; line-height: 1.2; }
      
      .label-eighth h2 { font-size: 12pt; }
      .label-eighth p { font-size: 12pt; line-height: 1.1; }
    </style>
    ${allLabels}
  `

    // Render barcodes after the HTML is set
    const barcodeElements = document.querySelectorAll(".barcode-svg")
    barcodeElements.forEach((element, index) => {
      // Adjust barcode size based on label size
      let barcodeHeight = 40
      let barcodeWidth = 1
      const fontSize = 0 // Set to 0 to hide the number below barcode

      if (totalBoxes === 1) {
        barcodeHeight = 50
        barcodeWidth = 1.5
      } else if (totalBoxes === 2 || totalBoxes === 3) {
        barcodeHeight = 40
        barcodeWidth = 1.2
      } else if (totalBoxes === 4) {
        barcodeHeight = 30
        barcodeWidth = 1
      } else {
        barcodeHeight = 25
        barcodeWidth = 0.8
      }

      JsBarcode(element, awbData?.trackingNumber || "N/A", {
        format: "CODE128",
        width: barcodeWidth,
        height: barcodeHeight,
        displayValue: false, // Don't show the number below barcode
        fontSize: fontSize,
        margin: 0,
      })
    })

    // Print and restore
    setTimeout(() => {
      window.print()
      document.body.innerHTML = originalContent
      window.location.reload()
    }, 500)
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

  return (
    <>
      <div className="container mx-auto px-4 py-6 bg-white">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#232C65]">Shipping Labels</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="totalBoxes" className="text-sm font-medium">
                Total Boxes:
              </label>
              <input
                id="totalBoxes"
                type="number"
                min="1"
                value={totalBoxes}
                onChange={(e) => setTotalBoxes(Math.max(1, Number.parseInt(e.target.value) || 1))}
                className="w-16 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button onClick={handlePrint} className="flex items-center gap-2 bg-[#232C65] hover:bg-[#1a2150]">
              <Printer className="h-4 w-4" />
              Print Labels
            </Button>
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-medium mb-2">Preview:</h2>
          <p className="text-sm text-gray-600">
            This will generate {totalBoxes} shipping label{totalBoxes > 1 ? "s" : ""} with a small barcode in the top
            right corner. All labels will be formatted to fit on a single A4 page with the following layout:
            {totalBoxes === 1 && " One full-page label"}
            {totalBoxes === 2 && " Two half-page labels"}
            {totalBoxes === 3 && " Two labels on the top half, one full-width label on the bottom half"}
            {totalBoxes === 4 && " Four quarter-page labels in a 2×2 grid"}
            {totalBoxes > 4 && ` ${totalBoxes} labels arranged symmetrically`}
          </p>
        </div>

        <div ref={printableAreaRef} className="flex flex-col gap-4">
          {Array.from({ length: Math.min(totalBoxes, 2) }).map((_, index) => (
            <div key={index} className="border border-gray-300 rounded-lg p-4 relative">
              <div className="absolute top-2 right-2" style={{ width: "20%" }}>
                <Barcode height={30} width={1} fontSize={0} value={awbData?.trackingNumber} displayValue={false} />
              </div>
              <div className="pt-10">
                <h2 className="font-bold mb-2">Receiver:</h2>
                <p className="font-bold uppercase">{awbData.receiver?.name}</p>
                {awbData.receiver?.companyName && <p className="font-bold uppercase">C/O {awbData.receiver?.companyName}</p>}
                <p>{awbData.receiver?.address}</p>
                <p className="flex flex-row gap-2">
                                <strong>Zip Code:</strong> {awbData.receiver?.zip}
                                <strong>Country:</strong>{awbData.receiver?.country}
                            </p>
                <p>Cont No: {awbData.receiver?.contact}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
