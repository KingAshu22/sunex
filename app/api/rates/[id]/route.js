import { NextResponse } from "next/server"
import Rate from "@/models/Rate"
import { connectToDB } from "@/app/_utils/mongodb";

export async function PUT(request, { params }) {
  try {
    await connectToDB()
    const { id } = params
    const updatedRateData = await request.json()

    const updatedRate = await Rate.findByIdAndUpdate(id, updatedRateData, { new: true, runValidators: true })

    if (!updatedRate) {
      return NextResponse.json({ error: "Rate not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, rate: updatedRate })
  } catch (error) {
    console.error("Error updating rate:", error)
    return NextResponse.json({ error: "Failed to update rate" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectToDB()
    const { id } = params

    const deletedRate = await Rate.findByIdAndDelete(id)

    if (!deletedRate) {
      return NextResponse.json({ error: "Rate not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting rate:", error)
    return NextResponse.json({ error: "Failed to delete rate" }, { status: 500 })
  }
}
