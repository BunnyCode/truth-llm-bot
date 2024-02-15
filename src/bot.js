import { config } from "dotenv";
import {
  Client,
  IntentsBitField,
  Collection,
  GatewayIntentBits,
} from "discord.js";
import fs from "fs";

console.log("Starting TruGPT Bot...");

config(); // Initialize dotenv
const token = process.env.DISCORD_TOKEN;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
client.commandArray = [];

const functionFolders = fs.readdirSync("./src/functions").filter((file) => {
  return fs.statSync(`./src/functions/${file}`).isDirectory();
});

for (const folder of functionFolders) {
  const functionFiles = fs
    .readdirSync(`./src/functions/${folder}`)
    .filter((file) => file.endsWith(".js"));
  for (const file of functionFiles) {
    import("./functions/handlers/handleCommands.js").then(
      (module) => (client.handleCommands = module.default)
    );
  }
}

// Assuming handleEvents and handleCommands are properly exported as ES Modules
import("./functions/handlers/handleEvents.js").then(
  (module) => (client.handleEvents = module.default)
);
import("./functions/handlers/handleCommands.js").then(
  (module) => (client.handleCommands = module.default)
);

client.login(token);
