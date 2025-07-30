import { NextResponse } from "next/server"
import Rate from "@/models/Rate"
import { connectToDB } from "@/app/_utils/mongodb"

export async function PUT(request, { params }) {
  try {
    await connectToDB()
    const { id } = await params;
    const body = await request.json()

    if (!body.rates || !Array.isArray(body.rates)) {
      return NextResponse.json({ error: "Invalid rates format" }, { status: 400 })
    }

    const updated = await Rate.findByIdAndUpdate(id, { rates: body.rates }, {
      new: true,
      runValidators: true,
    })

    if (!updated) {
      return NextResponse.json({ error: "Rate not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, rate: updated })
  } catch (err) {
    console.error("PUT /api/rates/:id error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectToDB()
    const { id } = params

    const deleted = await Rate.findByIdAndDelete(id)
    if (!deleted) {
      return NextResponse.json({ error: "Rate not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/rates/:id error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
