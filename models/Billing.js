import mongoose, { Schema, models, model } from "mongoose";

const BillingSchema = new Schema({
  billNumber: { type: String, required: true, unique: true }, // e.g. 2025-26/0001
  financialYear: { type: String, required: true }, // e.g. 2025-26
  billingInfo: {
    name: String,
    address: String,
    gst: String,
  },
  awbs: [
    {
      awbId: { type: Schema.Types.ObjectId, ref: "Awb" },
      date: Date,
      trackingNumber: String,
      consigneeName: String,
      weight: Number,
      country: String,
      service: String,
      baseCharge: Number,
      fuelSurcharge: Number,
      otherCharges: Number,
      subtotal: Number,
    },
  ],
  subtotal: Number,
  cgst: Number,
  sgst: Number,
  igst: Number,
  cgstAmount: Number,
  sgstAmount: Number,
  igstAmount: Number,
  total: Number,
  paid: Number,
  balance: Number,
  createdAt: { type: Date, default: Date.now },
});

export default models.Billing || model("Billing", BillingSchema);
