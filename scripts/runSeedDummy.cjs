// Register ts-node with safe defaults for CommonJS execution
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: { module: "CommonJS", moduleResolution: "bundler" },
});

// Ensure we target the local Firebase emulator by default
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || "demo-project";

// Run the TypeScript seeder
require("./seedDummyData.ts");
