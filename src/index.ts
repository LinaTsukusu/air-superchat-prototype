import axios from 'axios'
const Store = require('data-store');
require('dotenv').config();

const interval = 1000 * 5
const command = ['/superchatair', '/sa']

setInterval(async () => {
  const res = await axios.get('https://www.youtube.com/live_chat?v=OeNSwsqEmv4&pbj=1', {
    headers: {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36'}
  })

  const now = new Date().valueOf() - interval
  const actions: {authorName: string, message: string, time: Date}[] = res.data[1].response.contents.liveChatRenderer.actions.slice(0, -1).map((v: any) => {
    const item = v.addChatItemAction.item.liveChatTextMessageRenderer
    return {
      authorName: item.authorName.simpleText,
      message: item.message.runs[0].text,
      time: new Date(Number(item.timestampUsec) / 1000),
    }
  }).filter((v: {authorName: string, message: string, time: Date}) => v.time.valueOf() >= now && command.some((c: string) => v.message.startsWith(c)))

  actions.forEach((v) => {
    // console.log(v)
    const args = v.message.match(/^(.+?)\s([^\s]+)\s*(.*)$/)
    // console.log(args)
    if (args) {
      superChat(args[2], v.authorName, args[3])
    }
  })
}, interval)


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
  const store = new Store('tokens')
  const refreshToken = store.get('refresh_token')
  try {
    try {
      await sendAlert(store.get('token'), price, user, message)
    } catch (e) {
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

