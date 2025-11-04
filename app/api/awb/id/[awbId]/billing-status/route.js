import { NextResponse } from "next/server"
import { connectToDB } from "@/app/_utils/mongodb"
import Billing from "@/models/Billing"

export async function GET(req, { params }) {
  try {
    await connectToDB()
    const { awbId } = await params

    // Check if this AWB ID exists in any billing record
    const billing = await Billing.findOne({
      "awbs.awbId": awbId,
    })

    return NextResponse.json({
      billed: !!billing,
      billNumber: billing?.billNumber || null,
    })
  } catch (error) {
    console.error("Error checking billing status:", error)
    return NextResponse.json({ error: "Failed to check billing status" }, { status: 500 })
  }
}
