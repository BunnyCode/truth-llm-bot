console.log("Starting TruGPT Bot...");

require("dotenv").config();
const { token } = process.env.DISCORD_TOKEN;
const {
  Client,
  IntentsBitField,
  Collection,
  GatewayIntentBits,
  SlashCommandBuilder,
} = require("discord.js");
const fs = require("fs");

const client = new Client({ intents: GatewayIntentBits.Guilds });
client.commands = new Collection();
client.commandArray = [];

const functionFolders = fs.readdirSync("./src/functions");
for (const folder of functionFolders) {
  const functionFiles = fs
    .readdirSync(`./src/functions/${folder}`)
    .filter((file) => file.endsWith(".js"));
  for (const file of functionFiles)
    require(`./functions/${folder}/${file}`)(client);
}

client.handleEvents();
client.handleCommands();
client.login(token);
