import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("reverse")
  .setDescription("sends back message in reverse.")
  .addStringOption((option) =>
    option
      .setName("input")
      .setDescription("The input to echo back")
      .setRequired(true)
  );

export async function execute(interaction) {
  const message = interaction.options.getString("input");
  const newMessage = [...message].reverse().join("");
  await interaction.reply(newMessage);
}
