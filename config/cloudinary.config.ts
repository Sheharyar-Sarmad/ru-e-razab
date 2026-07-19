import { v2 as cloudinary } from "cloudinary";
import EnvSecrets from "./env.secrets";

// Validate all required Cloudinary env vars are present
const requiredCloudinaryVars = [
    EnvSecrets.cloudinaryCloudName,
    EnvSecrets.cloudinaryApiKey,
    EnvSecrets.cloudinaryApiSecret,
];

const missingVars = requiredCloudinaryVars.filter(v => !v);
if (missingVars.length > 0) {
    throw new Error(
        `Missing Cloudinary environment variables. Please check your .env file.`
    );
}

cloudinary.config({
    cloud_name: EnvSecrets.cloudinaryCloudName!,
    api_key: EnvSecrets.cloudinaryApiKey!,
    api_secret: EnvSecrets.cloudinaryApiSecret!,
    secure: true,
});

export default cloudinary;