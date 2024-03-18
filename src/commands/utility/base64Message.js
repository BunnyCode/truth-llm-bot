const { SlashCommandBuilder } = require('discord.js');

const base64Command = new SlashCommandBuilder()
  .setName('base64')
  .setDescription('sends back message as base64.')
  .addStringOption((option) =>
    option
      .setName('input')
      .setDescription('The input converted to B64')
      .setRequired(true),
  );

// Exporting the command data and execute function using CommonJS syntax
module.exports = {
  data: base64Command,
  async execute(interaction) {
    const message = interaction.options.getString('input');
    const newMessage = Buffer.from(message).toString('base64');
    await interaction.reply(newMessage);
  },
};
