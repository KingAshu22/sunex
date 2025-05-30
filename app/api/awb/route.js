import { connectToDB } from "@/app/_utils/mongodb";
import Awb from "@/models/Awb";
import Customer from "@/models/Customer";
import { NextResponse } from "next/server";

export async function GET(req) {
  console.log("Inside get /api/awb");
  await connectToDB();

  try {
    // Extract userType and id from the request headers
    const userType = req.headers.get("userType");
    const userId = req.headers.get("userId");

    let query = {};
    if (userType === "client") {
      // If the user is a client, filter AWBs by staffId
      query = { staffId: userId };
    } else if (userType === "franchise") {
      query = { staffId: userId };
    }

    // Fetch AWBs based on the query
    const awbs = await Awb.find(query).sort({ _id: -1 });

    return NextResponse.json(awbs);
  } catch (error) {
    console.error("Error fetching Awb:", error.message);
    return NextResponse.json({ error: "Failed to fetch Awb" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    console.log("Inside /api/awb");
    await connectToDB();
    const data = await req.json(); // Parse JSON body from the request

    console.log(data);

    const awb = new Awb(data);
    await awb.save();

    const customer1 = new Customer({
      name: data.sender.name,
      companyName: data.sender.companyName,
      email: data.sender.email,
      address: data.sender.address,
      country: data.sender.country,
      zip: data.sender.zip,
      contact: data.sender.contact,
      kyc: data.sender.kyc,
      gst: data.sender.gst,
      role: "customer",
      owner: data.sender.owner,
    });

    const customer2 = new Customer({
      name: data.receiver.name,
      companyName: data.receiver.companyName,
      email: data.receiver.email,
      address: data.receiver.address,
      country: data.receiver.country,
      zip: data.receiver.zip,
      contact: data.receiver.contact,
      role: "customer",
      owner: data.receiver.owner,
    });

    // Check if a customer with the same name already exists for customer1
    Customer.findOne({ name: data.sender.name })
      .then((existingCustomer) => {
        if (existingCustomer) {
          // A customer with the same name already exists, do not save customer1
          console.log("Customer with the same name already exists.");
          return; // Skip saving customer1
        } else {
          // No customer with the same name exists, save customer1
          return customer1.save();
        }
      })
      .then(() => {
        // Now, check if a customer with the same name exists for customer2
        return Customer.findOne({ name: data.receiver.name });
      })
      .then((existingCustomer2) => {
        if (existingCustomer2) {
          // A customer with the same name already exists for customer2
          console.log(
            "Customer with the same name already exists for customer2."
          );
          return; // Skip saving customer2
        } else {
          // No customer with the same name exists for customer2, save customer2
          return customer2.save();
        }
      })

    return NextResponse.json(
      { message: "Parcel added successfully!", awb },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/awb:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
