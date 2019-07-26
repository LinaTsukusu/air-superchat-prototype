import axios from 'axios'
const Store = require('data-store');
const YouTube = require('youtube-live-chat')

const yt = new YouTube('UCoztvTULBYd3WmStqYeoHcA', process.env.YOUTUBE_TOKEN)

yt.on('ready', () => {
  console.log('ready!')
  yt.listen(1000)
})

yt.on('message', (data: any) => {
  // console.log(data.snippet.displayMessage)
  console.log(data)
})

yt.on('error', (error: Error) => {
  console.error(error)
})

async function sendAlert(token: string) {
  return axios.post('https://streamlabs.com/api/v1.0/alerts', {
    access_token: token,
    type: "donation",
    message: 'Air Super Chat<br><span>¥100</span> by <span>エアスパ茶</span>',
    user_message: 'これはメッセージ',
    duration: 5000,
    special_text_color: "Orange",
  })
}


(async () => {
  const store = new Store('tokens')
  const refreshToken = store.get('refresh_token')
  try {
    try {
      await sendAlert(store.get('token'))
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

      await sendAlert(store.get('token'))

    }
  } catch (e) {
    console.error('error')
    console.error(e)
  }

})()
