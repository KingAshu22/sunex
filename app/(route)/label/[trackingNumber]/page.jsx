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

        // Determine if we should use a 2-column layout
        const useDoubleColumn = totalBoxes > 2

        // Create a print-optimized layout
        let allLabels = `<div class="label-container${useDoubleColumn ? " two-column" : ""}">`

        for (let i = 0; i < totalBoxes; i++) {
            allLabels += `
        <div class="label">
          <div class="box-number">Box No: ${i + 1}/${totalBoxes}</div>
          <div class="barcode-container">
            <svg class="barcode-svg"></svg>
          </div>
          <div class="address-section">
            <h2>Receiver:</h2>
            <p class="name">${awbData?.receiver?.name || ""}</p>
            <p class="address">${awbData?.receiver?.address || ""}</p>
            <p class="location">${awbData?.receiver?.zip || ""}, ${awbData?.receiver?.country || ""}</p>
            <p class="contact">Cont No: ${awbData?.receiver?.contact || ""}</p>
          </div>
        </div>
      `
        }

        allLabels += `</div>`

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
        width: 100%;
        height: 100%;
      }
      .label-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }
      .label-container.two-column {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-gap: 0.2cm;
      }
      .label {
        border: 1px solid #000;
        border-radius: 5px;
        padding: 0.5cm;
        box-sizing: border-box;
        position: relative;
        page-break-inside: avoid;
        overflow: hidden;
      }
      /* Single column layout */
      .label-container:not(.two-column) .label {
        width: 100%;
        height: ${Math.floor(26.7 / totalBoxes)}cm;
        margin-bottom: 0.2cm;
      }
      .label-container:not(.two-column) .label:last-child {
        margin-bottom: 0;
      }
      /* Two column layout */
      .label-container.two-column .label {
        height: ${Math.floor(26.7 / Math.ceil(totalBoxes / 2))}cm;
      }
      .box-number {
        position: absolute;
        top: 0.3cm;
        left: 0.5cm;
        font-weight: bold;
        font-size: ${useDoubleColumn ? "90%" : "100%"};
      }
      .barcode-container {
        position: absolute;
        top: 0.3cm;
        right: 0.3cm;
        width: 20%;
        text-align: right;
        margin-right: 10%;
      }
      .address-section {
        width: 75%;
        padding-top: ${useDoubleColumn ? "1.2cm" : "1.5cm"};
      }
      
      /* Dynamic font sizes based on number of labels and layout */
      h2 { 
        margin: 0 0 0.2cm 0;
        font-weight: bold;
        font-size: ${useDoubleColumn
                ? totalBoxes <= 4
                    ? "120%"
                    : "100%"
                : totalBoxes === 1
                    ? "200%"
                    : totalBoxes === 2
                        ? "160%"
                        : "140%"
            }; 
      }
      .name { 
        font-weight: bold;
        text-transform: uppercase;
        font-size: ${useDoubleColumn
                ? totalBoxes <= 4
                    ? "140%"
                    : "120%"
                : totalBoxes === 1
                    ? "260%"
                    : totalBoxes === 2
                        ? "220%"
                        : "180%"
            }; 
        margin: 0 0 0.2cm 0;
        line-height: 1.2;
      }
      .address { 
        margin: 0 0 0.1cm 0;
        font-size: ${useDoubleColumn
                ? totalBoxes <= 4
                    ? "120%"
                    : "100%"
                : totalBoxes === 1
                    ? "340%"
                    : totalBoxes === 2
                        ? "180%"
                        : "150%"
            }; 
        line-height: 1.3;
      }
      .location, .contact { 
        margin: 0 0 0.1cm 0;
        font-size: ${useDoubleColumn
                ? totalBoxes <= 4
                    ? "110%"
                    : "90%"
                : totalBoxes === 1
                    ? "200%"
                    : totalBoxes === 2
                        ? "140%"
                        : "120%"
            }; 
        line-height: 1.3;
      }
    </style>
    ${allLabels}
  `

        // Render barcodes after the HTML is set
        const barcodeElements = document.querySelectorAll(".barcode-svg")
        barcodeElements.forEach((element) => {
            // Adjust barcode size based on label size and layout
            let barcodeHeight, barcodeWidth

            if (useDoubleColumn) {
                // Two-column layout - smaller barcodes
                if (totalBoxes <= 4) {
                    barcodeHeight = 35
                    barcodeWidth = 1.2
                } else {
                    barcodeHeight = 30
                    barcodeWidth = 1
                }
            } else {
                // Single-column layout - larger barcodes
                if (totalBoxes === 1) {
                    barcodeHeight = 50
                    barcodeWidth = 1.8
                } else if (totalBoxes === 2) {
                    barcodeHeight = 45
                    barcodeWidth = 1.6
                } else {
                    barcodeHeight = 40
                    barcodeWidth = 1.4
                }
            }

            JsBarcode(element, awbData?.trackingNumber || "N/A", {
                format: "CODE128",
                width: barcodeWidth,
                height: barcodeHeight,
                displayValue: false,
                margin: 0,
            })
        })

        // Print and restore with a slightly longer timeout
        setTimeout(() => {
            window.print()
            document.body.innerHTML = originalContent
            window.location.reload()
        }, 800)
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

    // Determine if we should show a 2-column preview
    const useDoubleColumn = totalBoxes > 2

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
                                max="8"
                                value={totalBoxes}
                                onChange={(e) => setTotalBoxes(Math.max(1, Math.min(8, Number.parseInt(e.target.value) || 1)))}
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
                        This will generate {totalBoxes} shipping label{totalBoxes > 1 ? "s" : ""} with a barcode in the top right
                        corner.{" "}
                        {useDoubleColumn
                            ? "Labels will be arranged in a 2-column layout for optimal space usage."
                            : "Labels will be stacked vertically on a single A4 page."}{" "}
                        The font size will automatically scale to maximize readability based on the number of labels.
                    </p>
                </div>

                <div
                    ref={printableAreaRef}
                    className={`max-w-[21cm] mx-auto ${useDoubleColumn ? "grid grid-cols-2 gap-4" : "flex flex-col gap-4"}`}
                >
                    {Array.from({ length: Math.min(totalBoxes, useDoubleColumn ? 4 : 2) }).map((_, index) => (
                        <div
                            key={index}
                            className="border border-gray-300 rounded-lg p-4 relative"
                            style={{
                                height: useDoubleColumn
                                    ? `${Math.min(totalBoxes <= 4 ? "6cm" : "4cm", "6cm")}`
                                    : `${Math.min(totalBoxes === 1 ? "12cm" : "6cm", "12cm")}`,
                            }}
                        >
                            <div className="absolute top-2 left-2 font-bold text-sm">
                                Box No: {index + 1}/{totalBoxes}
                            </div>
                            <div className="absolute top-2 right-2" style={{ width: "20%" }}>
                                <Barcode
                                    height={useDoubleColumn ? 25 : totalBoxes === 1 ? 40 : 30}
                                    width={useDoubleColumn ? 1 : totalBoxes === 1 ? 1.5 : 1}
                                    fontSize={0}
                                    value={awbData?.trackingNumber}
                                    displayValue={false}
                                />
                            </div>
                            <div className="pt-10 w-3/4">
                                <h2
                                    className={`font-bold mb-2 ${useDoubleColumn ? "text-base" : totalBoxes === 1 ? "text-2xl" : "text-xl"}`}
                                >
                                    Receiver:
                                </h2>
                                <p
                                    className={`font-bold uppercase ${useDoubleColumn ? "text-base" : totalBoxes === 1 ? "text-xl" : "text-lg"}`}
                                >
                                    {awbData.receiver?.name}
                                </p>
                                <p className={useDoubleColumn ? "text-sm" : totalBoxes === 1 ? "text-lg" : "text-base"}>
                                    {awbData.receiver?.address}
                                </p>
                                <p className={useDoubleColumn ? "text-sm" : totalBoxes === 1 ? "text-lg" : "text-base"}>
                                    {awbData.receiver?.zip}, {awbData.receiver?.country}
                                </p>
                                <p className={useDoubleColumn ? "text-sm" : totalBoxes === 1 ? "text-lg" : "text-base"}>
                                    Cont No: {awbData.receiver?.contact}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}
