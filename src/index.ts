import axios from 'axios'
import {LiveChat} from 'youtube-chat'
const Store = require('data-store');
require('dotenv').config();


const command = ['/superchatair', '/sa']

async function main(args: string[]) {
  const channelId = args[2] || process.env.CHANNEL_ID

  if (!channelId) {
    console.error('Channel ID is nothing.')
    return
  }

  const chat = new LiveChat({channelId: channelId})

  chat.on('start', (liveId) => {
    console.log(`Successful connect stream [${liveId}]`)
  })

  chat.on('end', () => {
    console.log('Finished.')
  })

  chat.on('comment', (comment) => {
    const message = comment.message.map((v) => {
      if ('text' in v) {
        return v.text
      } else {
        return v.alt
      }
    }).join()

    if (command.some((c) => message.startsWith(c))) {
      const args = message.match(/^(\/.+?)\s([^\s]+)\s*(.*)$/)
      if (args) {
        superChat(args[2], comment.author.name, args[3])
      }
    }
  })

  chat.on('error', (err) => {
    console.error(err)
  })

  chat.start()
}


async function sendAlert(token: string, price: string, user: string, messageText: string) {
  return axios.post('https://streamlabs.com/api/v1.0/alerts', {
    access_token: token,
    type: "donation",
    message: `SuperChat Air<br><span>${price}</span> by <span>${user}</span>`,
    user_message: messageText || ' ',
    duration: 5000,
    special_text_color: "Orange",
  })
}


async function superChat(price: string, user: string, message: string) {
  const store = new Store({path: `${process.cwd()}/.tokens.json`})
  try {
    try {
      await sendAlert(store.get('token'), price, user, message)
    } catch (e) {

      const refreshToken = store.get('refresh_token')
      const data: {grant_type: string, client_id: string, client_secret: string, redirect_uri: string, code?: string, refresh_token?: string} = {
        grant_type: 'refresh_token',
        client_id: process.env.SL_CLIENT_ID!,
        client_secret: process.env.SL_CLIENT_SECRET!,
        redirect_uri: process.env.SL_REDIRECT_URI!,
        refresh_token: refreshToken,
      }

      if (!store.get('refresh_token')) {
        data.grant_type = 'authorization_code'
        data.refresh_token = undefined
        data.code = process.env.SL_CODE
      }
      const token = await axios.post('https://streamlabs.com/api/v1.0/token', data)

      store.set('refresh_token', token.data.refresh_token)
      store.set('token', token.data.access_token)

      await sendAlert(store.get('token'), price, user, message)

    }
  } catch (e) {
    console.error('error')
    console.error(e)
  }
}

main(process.argv)
