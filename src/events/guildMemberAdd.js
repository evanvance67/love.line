
import { Events, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig } from '../services/config/guildConfig.js';
import { getWelcomeConfig, setBirthday as dbSetBirthday } from '../utils/database.js';
import { formatWelcomeMessage } from '../utils/welcome.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { getServerCounters, updateCounter } from '../services/serverstatsService.js';
import { logger } from '../utils/logger.js';

export default {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member) {
        try {
            const { guild, user } = member;

            const config = await getGuildConfig(member.client, guild.id);
            const welcomeConfig = await getWelcomeConfig(member.client, guild.id);
            const welcomeChannelId = welcomeConfig?.channelId;

            if (welcomeConfig?.enabled && welcomeChannelId) {
                const channel = guild.channels.cache.get(welcomeChannelId);
                const me = guild.members.me;
                const permissions = channel?.isTextBased?.() && me
                    ? channel.permissionsFor(me)
                    : null;

                if (permissions?.has([
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages
                ])) {
                    const welcomeTemplate =
                        '_ _        . 　__ʚɞ__۫ ׅ     :         <:111cherryflower:1563743628411539628>\n' +
                        '-# _ _ <a:32525325:1564654610856157214> ／  𓏼ωᥱℓᥴ tꪮ ꪮur **shꪮp**, {user}﹒\n' +
                        '> -# _ _   <a:021pinkbowrz:1570774209922207897>.  ： [vꫀr͟ιfყ-hꫀrꫀ](https://discord.com/channels/1563736869362081935/1564899705463242783) *!*';

                    const welcomeMessage = formatWelcomeMessage(
                        welcomeTemplate,
                        { user, guild, member }
                    );

                    const messageContent = welcomeConfig.welcomePing
                        ? user.toString()
                        : null;

                    const canEmbed = permissions.has(
                        PermissionFlagsBits.EmbedLinks
                    );

                    if (!canEmbed) {
                        await channel.send({
                            content: `${messageContent || ''}\n${welcomeMessage}`
                        });
                    } else {
                        const embed = new EmbedBuilder()
                            .setColor('#F46CAE')
                            .setDescription(welcomeMessage)
                            .setThumbnail(
                                'https://cdn.discordapp.com/attachments/1568566280896909402/1571887315331190855/Untitled446_20261101185649.png?ex=6b00fae4&is=6affa964&hm=3a9b4a2fa4240d0965ac4d6b254ce91429df84c4b45b6b525c1cc2e66a473e62&'
                            );

                        await channel.send({
                            content: messageContent,
                            embeds: [embed]
                        });
                    }
                }
            }

            // AUTO ROLE
            if (welcomeConfig?.roleIds && welcomeConfig.roleIds.length > 0) {
                const delay = welcomeConfig.autoRoleDelay || 0;
                const singleRoleId = welcomeConfig.roleIds[0];

                if (delay > 0) {
                    const timeout = setTimeout(async () => {
                        const role = guild.roles.cache.get(singleRoleId);
                        if (role) {
                            await assignRoleSafely(member, role);
                        }
                    }, delay * 1000);

                    if (typeof timeout.unref === 'function') {
                        timeout.unref();
                    }
                } else {
                    const role = guild.roles.cache.get(singleRoleId);
                    if (role) {
                        await assignRoleSafely(member, role);
                    }
                }
            }

            // VERIFICATION
            if (config?.verification?.enabled || config?.verification?.autoVerify?.enabled) {
                await handleVerification(
                    member,
                    guild,
                    config.verification,
                    member.client
                );
            }

            // JOIN LOGGING
            try {
                await logEvent({
                    client: member.client,
                    guildId: guild.id,
                    eventType: EVENT_TYPES.MEMBER_JOIN,
                    data: {
                        title: 'User joined',
                        lines: [
                            `**User:** ${user.toString()} (${user.displayName !== user.username ? `@${user.displayName}` : user.tag})`,
                            `**ID:** \`${user.id}\``,
                            `**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
                            `**Members:** ${guild.memberCount}`,
                        ],
                        quoted: false,
                        thumbnail: user.displayAvatarURL({ dynamic: true }),
                        userId: user.id,
                    }
                });
            } catch (error) {
                logger.debug('Error logging member join:', error);
            }

            // SERVER COUNTERS
            try {
                const counters = await getServerCounters(member.client, guild.id);

                for (const counter of counters) {
                    if (counter && counter.type && counter.channelId && counter.enabled !== false) {
                        await updateCounter(member.client, guild, counter);
                    }
                }
            } catch (error) {
                logger.debug('Error updating counters on member join:', error);
            }

            // RESTORE BIRTHDAY
            try {
                const backupKey = `guild:${guild.id}:birthdays:left`;
                const backup = (await member.client.db.get(backupKey)) || {};

                if (backup[user.id]) {
                    const { month, day } = backup[user.id];

                    await dbSetBirthday(
                        member.client,
                        guild.id,
                        user.id,
                        month,
                        day
                    );

                    delete backup[user.id];
                    await member.client.db.set(backupKey, backup);

                    logger.debug(`Birthday restored for user ${user.id} in guild ${guild.id}`);
                }
            } catch (error) {
                logger.debug('Error restoring birthday on member join:', error);
            }

        } catch (error) {
            logger.error('Error in guildMemberAdd event:', error);
        }
    }
};

async function handleVerification(member, guild, verificationConfig, client) {
    const { autoVerifyOnJoin } = await import('../services/verificationService.js');

    try {
        const result = await autoVerifyOnJoin(
            client,
            guild,
            member,
            verificationConfig
        );

        if (result.autoVerified) {
            logger.info('User auto-verified on join', {
                guildId: guild.id,
                userId: member.id,
                userTag: member.user.tag,
                roleName: result.roleName,
                criteria: result.criteria
            });
        } else {
            logger.debug('User not auto-verified on join', {
                guildId: guild.id,
                userId: member.id,
                reason: result.reason
            });
        }

    } catch (error) {
        logger.error('Error in auto-verification for member', {
            guildId: guild.id,
            userId: member.id,
            userTag: member.user.tag,
            error: error.message
        });
    }
}

async function assignRoleSafely(member, role) {
    try {
        await member.roles.add(role);
    } catch (error) {
        logger.warn(
            `Failed to assign role ${role.id} to member ${member.id}:`,
            error
        );
    }
}
