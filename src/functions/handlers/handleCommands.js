const { REST, Routes } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();
const fs = require('node:fs');
const path = require('node:path');
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

async function deployCommands() {
  // console.log({ clientId, guildId, token }); // Add this to debug

  const commands = [];
  const foldersPath = path.join(__dirname, '../../commands');
  // Ensure we only process directories within the commands folder
  const commandFolders = fs.readdirSync(foldersPath).filter((folder) => {
    const folderPath = path.join(foldersPath, folder);
    return fs.statSync(folderPath).isDirectory();
  });

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    // Read directory contents and filter out non-JS files and ensure it's a file not a directory
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => {
      const filePath = path.join(commandsPath, file);
      return file.endsWith('.js') && fs.statSync(filePath).isFile();
    });

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      }
      else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
        );
      }
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`,
    );

    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`,
    );
  }
  catch (error) {
    console.error(error);
  }
}

module.exports = deployCommands;
