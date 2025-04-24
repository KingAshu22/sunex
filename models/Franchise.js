import mongoose, { Schema, model, models } from "mongoose";

const FranchiseSchema = new Schema({
    name: String,
    code: String,
    mobile: String,
    percent: Number,
});

const Franchise = models.Franchise || model("Franchise", FranchiseSchema);

export default Franchise;
