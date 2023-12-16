import { REST } from 'discord.js';
import { Routes } from 'discord.js';
import { CLIENT_ID, GUILD_ID, DISCORD_TOKEN } from './environment.js';
import fs from 'node:fs';
import path from 'node:path';

const commands = [];
const command_objects = {}
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join('.', 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    // Grab all the command files from the commands directory you created earlier
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('main.js'));
    // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        // Use dynamic import to load the module
        const commandModule = await import(`./${filePath}`);
        const command = commandModule.default; // Adjust if your module exports differently
        console.log('command',command)
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            command_objects[command.data.name] = command
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '9' }).setToken(DISCORD_TOKEN);

// and deploy your commands!
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();

export {command_objects};