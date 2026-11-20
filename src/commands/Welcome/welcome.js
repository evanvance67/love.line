
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
            .setColor('#F46CAE')
            .setDescription(
                '_ _        . 　__ʚɞ__۫ ׅ     :         <:111cherryflower:1563743628411539628> \n' +
                `-# _ _ <a:32525325:1564654610856157214> ／  𓏼ωᥱℓᥴ tꪮ ꪮur **shꪮp**, ${member}﹒\n` +
                (verifyLink
                    ? `> -# _ _   <a:021pinkbowrz:1570774209922207897>.  ： [vꫀr͟ιfყ-hꫀrꫀ](${verifyLink}) *!*\n`
                    : '')
            )
            .setThumbnail(
                'https://cdn.discordapp.com/attachments/1568566280896909402/1571887315331190855/Untitled446_20261101185649.png?ex=6b00fae4&is=6affa964&hm=3a9b4a2fa4240d0965ac4d6b254ce91429df84c4b45b6b525c1cc2e66a473e62&'
            );

        await welcomeChannel.send({
            embeds: [embed]
        });

    } catch (error) {
        console.error('Welcome message failed:', error);
    }
});
