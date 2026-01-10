import { createRequire } from 'node:module'
import express, { Express } from 'express'

const require = createRequire(import.meta.url)
const Logs = require('../../lang/logs.json')
import { Webhook } from '../webhooks/webhook.js'
import { type Client } from 'discord.js'

export class WebhookService {
  private app: Express
  constructor(
    private webhooks: Webhook[],
    private client: Client,
  ) {}

  public start(): void {
    this.app = express()
    this.app.use(express.json())
    for (const webhook of this.webhooks) {
      this.app.post(webhook.endpoint, async (req, res) => {
        await webhook.run(req, res, this.client)
        res.status(200).send('')
      })
    }
    this.app.listen(3000, () => {})
  }
}
