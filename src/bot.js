const dotenv = require("dotenv");
dotenv.config();
const path = require("node:path");
const { Client, Events, Collection, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;

const deployCommands = require("./functions/handlers/handleCommands");

const token = process.env.DISCORD_TOKEN;

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
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ("data" in command && "execute" in command) {
          client.commands.set(command.data.name, command);
          console.log("created " + command.data.name + " command");
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
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        }
      }
    });

    // When the client is ready, run this code (only once).
    // The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
    // It makes some properties non-nullable.
    client.once(Events.ClientReady, (readyClient) => {
      console.log(`Ready! Logged in as ${readyClient.user.tag}`);
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
