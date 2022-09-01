const {SlashCommandBuilder} = require('discord.js')
const { execute } = require('../../events/client/ready')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Return ping for the bot'),
  async execute(interaction, client) {
    const message = await interaction.deferReply({
      fetchReply: true
    })

    const newMessage = `API latency: ${client.ws.ping}\nClient Ping: ${message.createdTimestamp - interaction.createdTimestamp}`
    await interaction.editReply({
      content: newMessage
    })
  }
}