import { SlashCommandBuilder } from "discord.js";

const base64Command = new SlashCommandBuilder()
  .setName("base64")
  .setDescription("sends back message as base64.")
  .addStringOption((option) =>
    option
      .setName("input")
      .setDescription("The input converted to B64")
      .setRequired(true)
  );

export const data = base64Command;
export async function execute(interaction, client) {
  const message = interaction.options.getString("input");
  const newMessage = Buffer.from(message).toString("base64");
  await interaction.reply(newMessage);
}
