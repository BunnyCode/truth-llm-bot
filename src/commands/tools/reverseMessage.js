const {SlashCommandBuilder} = require('discord.js')
const { execute } = require('../../events/client/ready') 

const reverseCommand = new SlashCommandBuilder()
    .setName('reverse')
    .setDescription('sends back message in reverse.')
    .addStringOption(option =>
      option.setName('input')
        .setDescription('The input to echo back')
        .setRequired(true))

module.exports = {
  data: reverseCommand,
  async execute(interaction, client) {
    const message = await interaction.options.getString("input")
    const newMessage = [...message].reverse().join("")
    await interaction.reply(newMessage)
  }
}