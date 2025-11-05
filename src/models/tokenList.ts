import mongoose from "mongoose";

const tokenListSchema = new mongoose.Schema({
  creator: { type: String, required: true },
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  uri: { type: String, required: true },
  mint: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "4h",
    require: false
  },
});

const TokenListModel = mongoose.model("token-list", tokenListSchema);

export default TokenListModel;
