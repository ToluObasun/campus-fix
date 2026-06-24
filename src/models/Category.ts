import mongoose, { Schema, Document, model, models } from "mongoose";

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: "Electrical" | "Facilities" | "DataLines" | "Appliance" | "Structural";
}

const CategorySchema = new Schema<ICategory>({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ["Electrical", "Facilities", "DataLines", "Appliance", "Structural"],
  },
});

const Category = models.Category || model<ICategory>("Category", CategorySchema);

export async function seedCategories() {
  const categories = ["Electrical", "Facilities", "DataLines", "Appliance", "Structural"];
  for (const cat of categories) {
    try {
      await Category.findOneAndUpdate(
        { name: cat },
        { name: cat },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("Failed to seed category:", cat, err);
    }
  }
}

export default Category;
