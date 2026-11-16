
// LOVE LINE WELCOME SYSTEM ♡

client.on(Events.GuildMemberAdd, async member => {
    try {
        const welcomeChannel = await member.guild.channels.fetch(
            process.env.WELCOME_CHANNEL_ID
        );

        if (!welcomeChannel || !welcomeChannel.isTextBased()) return;

        const verifyChannelId = process.env.VERIFY_CHANNEL_ID;

        const verifyLink = verifyChannelId
            ? `https://discord.com/channels/${member.guild.id}/${verifyChannelId}`
            : null;

        const embed = new EmbedBuilder()
            .setColor('#F4A7C5')
            .setDescription(
                '˚ ༘♡ ⋆｡˚\n' +
                `🌸 / welcome to our shop, **${member.user.username}**!\n` +
                (verifyLink
                    ? `🎀 : [verify-here!](${verifyLink})`
                    : '')
            )
            .setThumbnail(member.user.displayAvatarURL({
                extension: 'png',
                size: 256
            }))
            .addFields({
                name: '♡ member',
                value: `#${member.guild.memberCount} · love.line!`,
                inline: true
            })
            .setFooter({
                text: 'thank you for joining us ♡'
            });

        await welcomeChannel.send({
            content: `Welcome, ${member}!`,
            embeds: [embed]
        });

    } catch (error) {
        console.error('Welcome message failed:', error);
    }
});
