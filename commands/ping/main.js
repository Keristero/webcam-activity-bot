import { SlashCommandBuilder } from '@discordjs/builders';

const pingCommand = {
  data: new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Replies with Pong!'),
  async execute(interaction) {
      console.log('ping executed')
      await interaction.reply('Pong!');
  }
};

export default pingCommand;