import { type Client, EmbedBuilder } from 'discord.js'
import { createRequire } from 'node:module'
import { type Request, type Response } from 'express'

import { Webhook } from './index.js'

const require = createRequire(import.meta.url)
const Config = require('../../config/config.json')
const Logs = require('../../lang/logs.json')

export class PragmaticPapersWebhook extends Webhook {
  public name = 'Pragmatic Papers'
  public log: boolean = true
  public override endpoint: string = '/pragmatic-papers'

  public async run(req: Request, res: Response, client: Client): Promise<void> {
    let ppVolumeData = req.body

    // Generate the Volume URL
    const volumeUrl = `https://pragmaticpapers.com/volumes/${ppVolumeData.volumeNumber}`

    // Format the article list into a single string of links
    const articleList = ppVolumeData.articles
      .map((art) => `• [${art.name}](https://pragmaticpapers.com/articles/${art.slug})`)
      .join('\n')

    const embed = new EmbedBuilder()
      .setColor('#1A1A1A') // Deep dark grey to match the image background
      .setTitle(`Pragmatic Papers: Volume ${ppVolumeData.volumeNumber}`)
      .setURL(volumeUrl)
      .setAuthor({
        name: 'Pragmatic Papers',
        iconURL: 'https://pragmaticpapers.com/favicon-32x32.png',
        url: 'https://pragmaticpapers.com',
      })
      .addFields({ name: 'Articles in this Volume', value: articleList })
      .setTimestamp()

    const channel = client.channels.cache.get('1084243505230127236')
    if (channel?.isTextBased() && !channel.isDMBased()) {
      await channel.send({ embeds: [embed] })
    }
  }
}
