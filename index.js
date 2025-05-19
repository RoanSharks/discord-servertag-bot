const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, AttachmentBuilder, ChannelType, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const CHANNELS_FILE = './forumChannels.json';
const BROADCAST_CHANNELS_FILE = './broadcastChannels.json';

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel]
});

const commands = [
    new SlashCommandBuilder()
        .setName('createtagpost')
        .setDescription('Creates a forum post with icon and tag')
        .addStringOption(option =>
            option.setName('icon-color')
                .setDescription('Select the tag color')
                .setRequired(true)
                .addChoices(
                    { name: 'pink', value: 'pink' },
                    { name: 'orange', value: 'orange' },
                    { name: 'yellow', value: 'yellow' },
                    { name: 'green', value: 'green' },
                    { name: 'blue', value: 'blue' },
                    { name: 'blurple', value: 'blurple' },
                    { name: 'dark-purple', value: 'dark-purple' },
                    { name: 'red', value: 'red' },
                    { name: 'brown', value: 'brown' },
                    { name: 'dark-green', value: 'dark-green' },
                    { name: 'gray', value: 'gray' },
                    { name: 'black', value: 'black' },
                )
        )
        .addStringOption(option =>
            option.setName('tag-icon')
                .setDescription('Select the tag icon')
                .setRequired(true)
                .addChoices(
                    { name: 'Leaf', value: 'leaf.png' },
                    { name: 'Sword', value: 'sword.png' },
                    { name: 'Heart', value: 'heart.png' },
                    { name: 'Fire', value: 'Fire.png' },
                    { name: 'Water', value: 'Water.png' },
                    { name: 'Skull', value: 'skull.png' },
                    { name: 'Moon', value: 'moon.png' },
                    { name: 'Bolt', value: 'bolt.png' },
                    { name: 'Arrows', value: 'arrows.png' },
                    { name: 'Mushroom', value: 'mushroom.png' }
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
    ),
    new SlashCommandBuilder()
        .setName('setbroadcastchannel')
        .setDescription('Sets the broadcast channel to be used for status updates')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The broadcast channel')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('restart')
        .setDescription('Restarts the bot (Kick Members permission required)'),
    new SlashCommandBuilder()
        .setName('removebroadcastchannel')
        .setDescription('Removes the broadcast channel for this guild (Kick Members permission required)')
]
    .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(config.token);

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Read broadcastChannels.json safely
    let broadcastChannels = [];
    if (fs.existsSync(BROADCAST_CHANNELS_FILE)) {
        try {
            broadcastChannels = JSON.parse(fs.readFileSync(BROADCAST_CHANNELS_FILE, 'utf8'));
        } catch (e) {
            console.error('Error reading broadcastChannels.json:', e);
        }
    }
    console.log('Broadcast channels loaded:', broadcastChannels);

    for (const channelId of broadcastChannels) {
        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel) {
                console.log(`Channel ${channelId} not found.`);
                continue;
            }
            console.log(`Fetched channel ${channelId} of type ${channel.type}`);
            if (channel.isTextBased && channel.isTextBased()) {
                // Check permissions
                const permissions = channel.permissionsFor(client.user);
                if (!permissions || !permissions.has('SendMessages')) {
                    console.log(`No permission to send messages in channel ${channelId}`);
                    continue;
                }
                let message = 'Bot is now online!';
                if (process.env.USERNAME === 'rkuge' || process.env.COMPUTERNAME === 'RKU-LAPTOP') {
                    message += ' (testing mode)';
                    console.log('Running in testing mode');

                }
                await channel.send(message);
                console.log(`Sent online message to channel ${channelId}`);
            } else {
                console.log(`Channel ${channelId} is not text-based.`);
            }
        } catch (err) {
            console.error(`Failed to send startup message to channel ${channelId}:`, err);
        }
    }

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

function setBroadcastChannelId(channelId) {
    let data = [];
    if (fs.existsSync(BROADCAST_CHANNELS_FILE)) {
        try {
            data = JSON.parse(fs.readFileSync(BROADCAST_CHANNELS_FILE, 'utf8'));
        } catch (error) {
            console.error('Error reading or parsing broadcastChannels.json:', error);
            data = [];
        }
    }
    if (!data.includes(channelId)) {
        data.push(channelId);
        fs.writeFileSync(BROADCAST_CHANNELS_FILE, JSON.stringify(data, null, 2));
    }
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
        const color = interaction.options.getString('icon-color');
        const icon = interaction.options.getString('tag-icon');
        const tag = interaction.options.getString('guild-tag');
        const link = interaction.options.getString('invite-link');

        // Debug: log received values
        console.log('Received values:', { color, icon, tag, link });

        // Improved validation for color and icon
        const validColors = [
            'pink', 'orange', 'yellow', 'green', 'blue', 'blurple', 'purple',
            'dark-purple', 'red', 'brown', 'dark-green', 'gray', 'black'
        ];
        const validIcons = [
            'leaf.png', 'sword.png', 'heart.png', 'Fire.png', 'Water.png',
            'skull.png', 'moon.png', 'bolt.png', 'arrows.png', 'mushroom.png'
        ];

        if (!color || !icon || !validColors.includes(color) || !validIcons.includes(icon)) {
            return interaction.reply({
                content: `Invalid icon or color selection.
You provided: icon-color = "${color}", tag-icon = "${icon}"
Valid colors: ${validColors.join(', ')}
Valid icons: ${validIcons.join(', ')}
Please use the provided choices in the slash command. Note: values are case-sensitive.`,
                flags: MessageFlags.Ephemeral
            });
        }

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
        const imagePath = path.join(__dirname, 'icons', `${color}`.replace(/[\\/]+/g, ''), icon.replace(/[\\/]+/g, ''));
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
    if (interaction.commandName === 'setbroadcastchannel') {
        const channel = interaction.options.getChannel('channel');
        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'Please select a valid broadcast channel (must be a normal text channel).', flags: MessageFlags.Ephemeral });
        }

        setBroadcastChannelId(channel.id);
        await interaction.reply({ content: `Broadcast channel set to ${channel.name}`, flags: MessageFlags.Ephemeral });
    }
    if (interaction.commandName === 'restart') {
        await interaction.reply({ content: 'Restarting bot...', flags: MessageFlags.Ephemeral });
        await notifyOfflineAndExit(2); // Use exit code 2 for restart
        return;
    }
    if (interaction.commandName === 'removebroadcastchannel') {
        // Find all text channels in this guild that are in broadcastChannels.json
        let broadcastChannels = [];
        if (fs.existsSync(BROADCAST_CHANNELS_FILE)) {
            try {
                broadcastChannels = JSON.parse(fs.readFileSync(BROADCAST_CHANNELS_FILE, 'utf8'));
            } catch (e) {
                console.error('Error reading broadcastChannels.json:', e);
            }
        }
        // Get all text channels in this guild
        const guildTextChannels = interaction.guild.channels.cache
            .filter(ch => ch.type === ChannelType.GuildText)
            .map(ch => ch.id);

        // Remove all broadcast channels that are in this guild
        const newBroadcastChannels = broadcastChannels.filter(id => !guildTextChannels.includes(id));
        if (newBroadcastChannels.length === broadcastChannels.length) {
            await interaction.reply({ content: 'No broadcast channel was set for this guild.', flags: MessageFlags.Ephemeral });
        } else {
            fs.writeFileSync(BROADCAST_CHANNELS_FILE, JSON.stringify(newBroadcastChannels, null, 2));
            await interaction.reply({ content: 'Broadcast channel removed for this guild.', flags: MessageFlags.Ephemeral });
        }
    }
});

// Graceful shutdown: send "Bot is now offline!" to all broadcast channels
let shuttingDown = false;
async function notifyOfflineAndExit(exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    let broadcastChannels = [];
    if (fs.existsSync(BROADCAST_CHANNELS_FILE)) {
        try {
            broadcastChannels = JSON.parse(fs.readFileSync(BROADCAST_CHANNELS_FILE, 'utf8'));
        } catch (e) {
            console.error('Error reading broadcastChannels.json:', e);
        }
    }
    console.log('Broadcast channels loaded for shutdown:', broadcastChannels);

    for (const channelId of broadcastChannels) {
        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel) {
                console.log(`Channel ${channelId} not found (shutdown).`);
                continue;
            }
            console.log(`Fetched channel ${channelId} of type ${channel.type} (shutdown)`);
            if (channel.isTextBased && channel.isTextBased()) {
                // Check permissions
                const permissions = channel.permissionsFor(client.user);
                if (!permissions || !permissions.has('SendMessages')) {
                    console.log(`No permission to send messages in channel ${channelId} (shutdown)`);
                    continue;
                }
                await channel.send('Bot is now offline!');
                console.log(`Sent offline message to channel ${channelId}`);
            } else {
                console.log(`Channel ${channelId} is not text-based.`);
            }
        } catch (err) {
            console.error(`Failed to send shutdown message to channel ${channelId}:`, err);
        }
    }
    try {
        await client.destroy();
    } catch (e) {
        // ignore
    }
    // Remove setTimeout, call process.exit immediately after all async work is done
    process.exit(exitCode);
}

process.on('SIGINT', async () => {
    await notifyOfflineAndExit(0);
});
process.on('SIGTERM', async () => {
    await notifyOfflineAndExit(0);
});
process.on('uncaughtException', async (err) => {
    console.error('Uncaught Exception:', err);
    await notifyOfflineAndExit(1);
});
process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
    await notifyOfflineAndExit(1);
});

client.login(config.token);