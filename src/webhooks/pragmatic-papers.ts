import { type Client } from 'discord.js'
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
    // Implement the logic to handle the webhook request and send
    let body = req.body
    const channel = client.channels.cache.get('1084243505230127236')
    if (channel?.isTextBased() && !channel.isDMBased()) {
      await channel.send(JSON.stringify(body))
    }
  }
}
