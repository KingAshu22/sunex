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

        // Create labels for each box, 2 per page
        let allLabels = ""
        for (let i = 0; i < totalBoxes; i++) {
            // Add label
            allLabels += `
        <div class="label">
          <div class="address-section">
            <h2 class="font-bold mb-2">Receiver:</h2>
            <p class="font-bold uppercase">${awbData?.receiver?.name || ""}</p>
            <p>${awbData?.receiver?.address || ""}</p>
            <p>${awbData?.receiver?.zip || ""}, ${awbData?.receiver?.country || ""}</p>
            <p>Cont No: ${awbData?.receiver?.contact || ""}</p>
          </div>
          <div class="barcode-section">
            <div class="box-number">Box - ${i + 1}/${totalBoxes}</div>
            <div class="barcode-container">
              <svg class="barcode-svg"></svg>
            </div>
          </div>
        </div>
      `

            // Add page break after every 2 labels (except the last page)
            if (i % 2 === 1 && i < totalBoxes - 1) {
                allLabels += '<div class="page-break"></div>'
            }
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
        .label {
          width: 100%;
          height: 14cm;
          border: 1px solid #000;
          border-radius: 5px;
          padding: 0.5cm;
          margin-bottom: 0.5cm;
          display: flex;
          flex-direction: row;
          box-sizing: border-box;
        }
        .address-section {
          flex: 0.8;
          font-size: 30pt;
          line-height: 1.3;
          padding-right: 0.5cm;
        }
        .barcode-section {
          flex: 0.2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-left: 1px dashed #999;
          padding-left: 0.3cm;
        }
        .box-number {
          font-size: 24pt;
          font-weight: bold;
          margin-bottom: 0.5cm;
          text-align: center;
        }
        .barcode-container {
          width: 100%;
          text-align: center;
        }
        .page-break {
          page-break-after: always;
        }
        h2 {
          margin-top: 0;
          font-size: 30pt;
        }
        p {
          margin: 0.2cm 0;
          font-size: 30pt;
        }
        .font-bold {
          font-weight: bold;
        }
        .uppercase {
          text-transform: uppercase;
        }
      </style>
      ${allLabels}
    `

        // Render barcodes after the HTML is set
        const barcodeElements = document.querySelectorAll(".barcode-svg")
        barcodeElements.forEach((element) => {
            JsBarcode(element, awbData?.trackingNumber || "N/A", {
                format: "CODE128",
                width: 2,
                height: 80,
                displayValue: true,
                fontSize: 14,
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
                        This will generate {totalBoxes} shipping label{totalBoxes > 1 ? "s" : ""} with box numbering (e.g., "Box -
                        1/{totalBoxes}"). Labels will be formatted with 2 per page for A4 printing.
                    </p>
                </div>

                <div ref={printableAreaRef} className="flex flex-col gap-4">
                    {Array.from({ length: Math.min(totalBoxes, 2) }).map((_, index) => (
                        <div key={index} className="border border-gray-300 rounded-lg p-4 flex flex-row">
                            <div className="flex-grow pr-4" style={{ width: "80%" }}>
                                <h2 className="font-bold mb-2">Receiver:</h2>
                                <p className="font-bold uppercase">{awbData.receiver?.name}</p>
                                <p>{awbData.receiver?.address}</p>
                                <p>
                                    {awbData.receiver?.zip}, {awbData.receiver?.country}
                                </p>
                                <p>Cont No: {awbData.receiver?.contact}</p>
                            </div>
                            <div
                                className="border-l border-gray-300 pl-4 flex flex-col items-center justify-center"
                                style={{ width: "20%" }}
                            >
                                <div className="text-xl font-bold mb-2">
                                    Box - {index + 1}/{totalBoxes}
                                </div>
                                <Barcode height={60} width={1.5} fontSize={12} value={awbData?.trackingNumber} displayValue={true} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}
