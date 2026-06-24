import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/campusfix";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then(async (mongooseInstance) => {
      try {
        const { seedCategories } = await import("../models/Category");
        await seedCategories();

        const { default: User } = await import("../models/User");
        const { default: bcrypt } = await import("bcryptjs");
        const existingOperator = await User.findOne({ email: "operator@campus.edu" });
        if (!existingOperator) {
          const hashedPassword = await bcrypt.hash("securepassword123", 10);
          await User.create({
            fullName: "Operator John",
            email: "operator@campus.edu",
            password: hashedPassword,
            role: "FieldTechnician"
          });
          console.log("Seeded default operator account for load testing");
        }
      } catch (err) {
        console.error("Database seeding failed:", err);
      }
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
