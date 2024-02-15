const { SlashCommandBuilder } = require("discord.js");
const { execute } = require("../../events/client/ready");

const reverseCommand = new SlashCommandBuilder()
  .setName("base64")
  .setDescription("sends back message as base64.")
  .addStringOption((option) =>
    option
      .setName("input")
      .setDescription("The input converted to B64")
      .setRequired(true)
  );

module.exports = {
  data: reverseCommand,
  async execute(interaction, client) {
    const message = await interaction.options.getString("input");
    const newMessage = Buffer.from(message).toString("base64");
    await interaction.reply(newMessage);
  },
};
