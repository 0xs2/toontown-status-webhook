
require('dotenv').config()

const { EmbedBuilder, WebhookClient } = require('discord.js');

const moment = require('moment');
var momentDurationFormatSetup = require("moment-duration-format");
 
momentDurationFormatSetup(moment);

const axios = require('axios');
const webhookClient = new WebhookClient({ url: process.env.WEBHOOK_URL });
const cron = require('node-cron');

async function request(url) {
    let data = '';
    try {
    await axios.get(url, {headers: { 'User-Agent':'TT Status Webhook, https://github.com/0xs2/tt-status' }})
        .then(async function (response) {

            if (response.status != 200) {
                data = false;
            } else {
                data = response.data;
            }
        });
    }
    catch(e) {
        data = false;
    }
    return data
}

async function getTTREmbed() {
    const embed2 = new EmbedBuilder();

    let main = await request("https://www.toontownrewritten.com/api/population");
    let inv = await request("https://www.toontownrewritten.com/api/invasions");

    if(main && inv) {

        // why the api structured like this?.......
        let mainBuilder = [];


        Object.keys(main.populationByDistrict).forEach((element) => {
            let i = '';
            let t = '';
            let type = '';
            let p = '';


            let arr = Object.keys(inv.invasions);

            if(arr.includes(element)) {
                i = true;
                t = inv.invasions[element]['asOf'];
                type = inv.invasions[element]['type'];
                p = inv.invasions[element]['progress'];
            }
            else {
                i = false;
                t = null;
                type = null;
                p = null;
            }

            mainBuilder.push({
                "distinct": element,
                "population": main.populationByDistrict[element],
                "status": main.statusByDistrict[element],
                "invasion": i,
                "type": type,
                "time": t,
                "progress": p
            })
 
        });

        let builder = [];
        let ins = 0;
        mainBuilder.forEach(element => {

            let cogs = '';
            if(!element.invasion) { 
                cogs = `No Invasion`;
            }
            else {
                ins++;
                cogs = `Attacking: \`${element.type}\`\nProgress: \`${element.progress}\``
            }


            builder.push(
                { name: element.distinct, value: `${cogs}\nStatus: \`${element.status}\`\nPopulation: \`${element.population}\``, inline: true }
            )
        });
        embed2.setThumbnail(process.env.TTR_WEBHOOK_AVATAR)
        embed2.setFooter({text: `TT Status Webhook By ${process.env.WEBHOOK_AUTHOR}`, iconURL: process.env.WEBHOOK_AUTHOR_AVATAR})
        embed2.setTimestamp();
        embed2.setColor("#1a5493");
    
        embed2.setTitle('Toontown Rewritten Status');
        embed2.addFields(builder);
        embed2.setDescription(`**${main.totalPopulation}** online, **${ins}** Invasions`);
    }
    else {
        embed2.setTitle('Toontown Rewritten Status Error')
        embed2.setDescription('Error getting status from the API :(')  
    }

    return embed2;
}

async function getCCEmbed() {

    const embed = new EmbedBuilder();

    let data = await request("https://corporateclash.net/api/v1/districts.js");

    embed.setThumbnail(process.env.CC_WEBHOOK_AVATAR)
    embed.setFooter({text: `TT Status Webhook By ${process.env.WEBHOOK_AUTHOR}`, iconURL: process.env.WEBHOOK_AUTHOR_AVATAR})
    embed.setTimestamp();
    embed.setColor("#f9d805");

    if(data) { 

        // handle the data stuff
        let online = 0;
        let invasions = 0;
        let builder = [];

        data.forEach(function(element) {
            online += element.population;

            let cogs = '';

            if(element.invasion_online) {
                invasions++;
                var duration = moment.duration(element.remaining_time, 'seconds');
                var formatted = duration.format("hh:mm:ss");
                cogs = `Attacking: \`${element.cogs_attacking}\`\nDefeated: \`${element.count_defeated}\`\nTotal: \`${element.count_total}\`\nRemaining Time: \`${formatted}\``
            }
            else {
                cogs = 'No Invasion'
            }

            builder.push(
                { name: element.name, value: `${cogs}\nOnline: \`${element.online}\`\nPopulation: \`${element.population}\``, inline: true }
            )

        })

        embed.setTitle('Corporate Clash Status')
        embed.addFields(builder);
        embed.setDescription(`**${online}** online, **${invasions}** Invasions`);
        
    }
    else {
        embed.setTitle('Corporate Clash Status Error')
        embed.setDescription('Error getting district status from the API :(')
    }

    return embed;
}


async function main() {
    let cc = await getCCEmbed();
    let tt = await getTTREmbed();

    webhookClient.edit(process.env.MESSAGE_ID,{
        username: process.env.WEBBOOK_NAME,
        avatarURL: process.env.WEBBOOK_AVATAR,
        embeds: [tt,cc],
    });
}

cron.schedule('*/5 * * * *', async () => {
    main();
});