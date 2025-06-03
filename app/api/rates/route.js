import { NextResponse } from "next/server"
import { connectToDB } from "@/app/_utils/mongodb";
import Rate from "@/models/Rate"

export async function GET() {
  try {
    await connectToDB()
    const rates = await Rate.find({}).lean()
    return NextResponse.json(rates)
  } catch (error) {
    console.error("Error fetching rates:", error)
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const newRateData = await request.json()

    const rate = new Rate(newRateData)
    const savedRate = await rate.save()

    return NextResponse.json({ success: true, rate: savedRate })
  } catch (error) {
    console.error("Error creating rate:", error)
    return NextResponse.json({ error: "Failed to create rate" }, { status: 500 })
  }
}
