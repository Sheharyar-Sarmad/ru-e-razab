const EnvSecrets = {
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    mongoUsername: process.env.MONGO_DB_USERNAME,
    mongoPassword: process.env.MONGO_DB_PASSWORD,
    mongoName: process.env.MONGO_DB_NAME,
    appEnv: process.env.APP_ENV,
    appUrl: process.env.APP_URL,
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET, 
};

const requiredEnvVariables: {
    [key in keyof typeof EnvSecrets]: string;
} = {
    mongoUri: "string",
    jwtSecret: "string",
    mongoUsername: "string",
    mongoPassword: "string",
    mongoName: "string",
    appEnv: "string",
    appUrl: "string",
    cloudinaryCloudName: "string",
    cloudinaryApiKey: "string",
    cloudinaryApiSecret: "string",  
};

for (const variable of Object.keys(
    requiredEnvVariables
) as Array<keyof typeof EnvSecrets>) {
    if (!EnvSecrets[variable]) {
        throw new Error(`Missing environment variable: ${variable}`);
    }
}

export default EnvSecrets;