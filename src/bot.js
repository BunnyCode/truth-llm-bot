const dotenv = require("dotenv");
dotenv.config();
const path = require("node:path");
const { Client, Events, Collection, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;

const deployCommands = require("./functions/handlers/handleCommands");
const discordFunctions = require(path.join(__dirname, "./helpers/discordFunctions"));
const dF = new discordFunctions();

const token = process.env.DISCORD_TOKEN;

// Revised splitMessage function with a check for undefined content

try {
  console.log("Starting TruGPT Bot...");
  deployCommands().then(() => {
    // Health check endpoint
    app.get("/health", (req, res) => {
      res.status(200).send("OK");
    });

    // Create a new client instance
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.commands = new Collection();
    const foldersPath = path.join(__dirname, "./commands");
    // Filter out all non-directories
    const commandFolders = fs.readdirSync(foldersPath).filter((folder) => {
      return fs.statSync(path.join(foldersPath, folder)).isDirectory();
    });

    for (const folder of commandFolders) {
      const commandsPath = path.join(foldersPath, folder);
      const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));
      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection
        if ("data" in command && "execute" in command) {
          client.commands.set(command.data.name, command);
          console.log(`Created "${command.data.name}" command.`);
        } else {
          console.log(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
          );
        }
      }
    }

    // Handle slash commands
    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        // Acknowledge the interaction immediately to avoid "Unknown Interaction" error
        await interaction.deferReply().catch(console.error);
        const responses = await command.execute(interaction);
        // Check and split the message if it's too long
        (Array.isArray(responses) ? responses : [responses]).forEach(async response => {
          dF.splitMessage(response).forEach(async part => {
            await interaction.followUp({ content: part, ephemeral: true }).catch(console.error);
          });
        });
      } catch (error) {
        console.error(error);
        await interaction.followUp({
          content: "There was an error while executing this command!",
          ephemeral: true,
        }).catch(console.error);
      }
    });

    // When the client is ready, run this code (only once).
    client.once(Events.ClientReady, () => {
      console.log(`Ready! Logged in as ${client.user.tag}`);
    });

    // Log in to Discord with your client's token
    client.login(token);

    // Start Health Check Server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  });
} catch (error) {
  console.error(error);
}
