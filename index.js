const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, AttachmentBuilder, ChannelType, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const CHANNELS_FILE = './forumChannels.json';

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel]
});

const commands = [
    new SlashCommandBuilder()
        .setName('createtagpost')
        .setDescription('Creates a forum post with icon and tag')
        .addStringOption(option =>
            option.setName('tag-icon')
                .setDescription('Select the tag icon')
                .setRequired(true)
                .addChoices(
                    { name: 'Fire', value: 'swordNormal.png' },
                    { name: 'Ice', value: 'swordNormal.png' },
                    { name: 'Storm', value: 'swordNormal.png' },
                )
        )
        .addStringOption(option =>
            option.setName('guild-tag')
                .setDescription('The guild tag (e.g., ABC)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('invite-link')
                .setDescription('The invite link for the guild (DO NOT INCLUDE THE https://discord.gg/ PART)')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('setforumchannel')
        .setDescription('Sets the forum channel to be used for tag posts')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The forum channel')
                .setRequired(true)
        )
]
    .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(config.token);

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands }
        );
        console.log('Slash commands registered.');
    } catch (error) {
        console.error(error);
    }
});

function getForumChannelId(guildId) {
    if (!fs.existsSync(CHANNELS_FILE)) return null;
    try {
        const fileContent = fs.readFileSync(CHANNELS_FILE, 'utf8');
        const data = fileContent.trim() ? JSON.parse(fileContent) : {}; // Handle empty file
        return data[guildId] || null;
    } catch (error) {
        console.error('Error reading or parsing forumChannels.json:', error);
        return null;
    }
}

function setForumChannelId(guildId, channelId) {
    let data = {};
    if (fs.existsSync(CHANNELS_FILE)) {
        try {
            const fileContent = fs.readFileSync(CHANNELS_FILE, 'utf8');
            data = fileContent.trim() ? JSON.parse(fileContent) : {};
        } catch (error) {
            console.error('Error reading or parsing forumChannels.json:', error);
            data = {};
        }
    }
    data[guildId] = channelId;
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(data, null, 2));
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // Check if the user has the "Kick Members" permission
    if (!interaction.member.permissions.has('KickMembers')) {
        return interaction.reply({
            content: 'You do not have permission to use this command.',
            flags: MessageFlags.Ephemeral
        });
    }

    if (interaction.commandName === 'createtagpost') {
        const icon = interaction.options.getString('tag-icon');
        const tag = interaction.options.getString('guild-tag');
        const link = interaction.options.getString('invite-link');

        const forumChannelId = getForumChannelId(interaction.guild.id);
        if (!forumChannelId) {
            return interaction.reply({
                content: 'No forum channel set for this server. Use /setforumchannel first.',
                flags: MessageFlags.Ephemeral
            });
        }

        const forumChannel = await interaction.guild.channels.fetch(forumChannelId);
        if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
            return interaction.reply({ content: 'Forum channel not found or invalid type.', flags: MessageFlags.Ephemeral });
        }

        const title = `[${tag}]`;
        const imagePath = path.join(__dirname, 'icons', icon);
        if (!fs.existsSync(imagePath)) {
            return interaction.reply({
                content: `The icon file "${icon}" does not exist.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const image = new AttachmentBuilder(imagePath);

        await forumChannel.threads.create({
            name: title,
            message: {
                content: `<:bear_shroom:1372536537916375060> Guild tag: ${title}
<:bear_shroom:1372536537916375060> Invite link: https://discord.gg/${link}`,
                files: [image]
            }
        });

        await interaction.reply({ content: 'Forum post created!', flags: MessageFlags.Ephemeral });
    }

    if (interaction.commandName === 'setforumchannel') {
        const channel = interaction.options.getChannel('channel');
        if (channel.type !== ChannelType.GuildForum) {
            return interaction.reply({ content: 'Please select a valid forum channel.', flags: MessageFlags.Ephemeral });
        }

        setForumChannelId(interaction.guild.id, channel.id);
        await interaction.reply({ content: `Forum channel set to ${channel.name}`, flags: MessageFlags.Ephemeral });
    }
});

client.login(config.token);