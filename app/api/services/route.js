import { NextResponse } from "next/server";
import { connectToDB } from "@/app/_utils/mongodb";
import Rate from "@/models/Rate";

export async function GET(req) { // 1. Add 'req' as a parameter
  try {
    await connectToDB();

    const userType = req.headers.get("userType");
    const userId = req.headers.get("userId");
    console.log("Server User Type - ", userType)

    // 2. Create a dynamic query object
    let query = {};

    // 3. Build the query based on the userType
    if (userType === "admin") {
      // Admin sees all rates, so the query remains empty to fetch all documents.
      // No changes needed for the query object.
      console.log("User is Admin: fetching all rates.");
    } else if (userType === "branch") {
      // Branch sees all rates, so the query remains empty to fetch all documents.
      console.log("User is Branch: fetching all rates.");
    } else if (userType === "franchise") {
      // Franchise user must have a userId
      if (!userId) {
        return NextResponse.json(
          { error: "Franchise user must have a userId header" },
          { status: 400 }
        );
      }
      
      console.log(`User is Franchise (${userId}): fetching specific rates.`);
      // Franchise sees public rates (no refCode) OR rates matching their userId.
      // We use the $or operator to combine these two conditions.
      query = {
        $or: [
          // Condition 1: refCode is not defined or is null
          { refCode: { $in: [null, undefined] } },
          // Condition 2: refCode matches the franchise's userId
          { refCode: userId },
        ],
      };
    } else if (userType === "client") {
      // Client user must have a userId
      if (!userId) {
        return NextResponse.json(
          { error: "Client user must have a userId header" },
          { status: 400 }
        );
      }

      console.log(`User is Client (${userId}): fetching specific rates.`);
      // Client sees public rates (no refCode), OR rates matching their userId, OR rates matching their franchise's userId.
      query = {
        $or: [
          { refCode: { $in: [null, undefined] } },
          { refCode: userId },
        ],
      };
    } else {
      // For any other user (or unauthenticated users), only show public rates.
      console.log("User is public/unknown: fetching only public rates.");
      query = { refCode: { $in: [null, undefined] } };
    }

    // 4. Execute the query and select only the fields you need
    const rates = await Rate.find(query, { originalName: 1, refCode: 1 });

    // The rest of your logic to get unique services remains the same
    const services = [
      ...new Set(
        rates
          .map((rate) => rate.originalName)
          .filter(Boolean)
      ),
    ].sort();

    return NextResponse.json(services);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}