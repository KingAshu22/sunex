import { connectToDB } from "@/app/_utils/mongodb";
import Customer from "@/models/Customer";
import { NextResponse } from "next/server";

export async function GET() {
    console.log("Inside get /api/customer");
    await connectToDB();
    try {
        const customers = await Customer.find({}).sort({ _id: -1 });
        return NextResponse.json(customers);
    } catch (error) {
        console.error("Error fetching Customers:", error.message);
        return NextResponse.json({ error: "Failed to fetch Customers" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        console.log("Inside /api/customers");
        await connectToDB();
        const data = await req.json(); // Parse JSON body from the request

        console.log(data);

        const customer = new Customer(data);
        await customer.save();

        return NextResponse.json(
            { message: "Customer added successfully!", customer },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error in POST /api/customer:", error.message);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
