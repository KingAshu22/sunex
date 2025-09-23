import mongoose, { Schema, model, models } from "mongoose";

export const EstimateSchema = new Schema({
    code: String,
    date: Date,
    name: String,
    country: String,
    weight: Number,
    rate: Number
});

const Estimate = models.Estimate || model("Estimate", EstimateSchema);

export default Estimate;
