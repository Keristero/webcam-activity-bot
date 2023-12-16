import { SlashCommandBuilder } from '@discordjs/builders';
import {playAudioFile} from 'audic'

let knights_of_the_round_id = '1185485748095430677'

const pingCommand = {
  data: new SlashCommandBuilder()
      .setName('spook')
      .setDescription('Scares off cats! use responsibly'),
  async execute(interaction) {
      const user = interaction.user;
      const member = interaction.member;
      if (!member.roles.cache.has(knights_of_the_round_id)) {
        await interaction.reply('Only Knights of the Round are allowed to spook.');
        return
      }
      console.log('spook executed')
      await interaction.reply('Spooking!');
      await playAudioFile('spook.m4a')
  }
};

export default pingCommand;