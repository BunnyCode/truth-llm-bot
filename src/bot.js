console.log('Starting Stealth-Bot')

require('dotenv').config()
const { Client, IntentsBitField, Collection, SlashCommandBuilder} = require('discord.js')
const { Routes } = require('discord.js');
const myIntents = new IntentsBitField()
myIntents.add(IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers)

await rest.put(
	Routes.applicationCommands(clientId),
	{ body: commands },
)

const client = new Client({ intents: myIntents })

client.commands = new Collection()

const data = new SlashCommandBuilder()
	.setName('echo')
	.setDescription('Replies with your input!')
	.addStringOption(option =>
		option.setName('input')
			.setDescription('The input to echo back')
			.setRequired(true));

client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'ping') {
		await interaction.reply('Pong!');
	}
})

client.login(process.env.DISCORD_TOKEN)
