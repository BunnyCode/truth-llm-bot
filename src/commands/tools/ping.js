import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Return ping for the bot");

export async function execute(interaction) {
  await interaction.deferReply({ fetchReply: true }).then(async (message) => {
    const newMessage = `API latency: ${interaction.client.ws.ping}\nClient Ping: ${message.createdTimestamp - interaction.createdTimestamp}`;
    await interaction.editReply({
      content: newMessage,
    });
  });
}
