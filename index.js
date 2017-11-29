if (process.argv.length !== 5) {
  console.error('Usage: node ./index.js CHANNEL_ID USER_ID DISCORD_TOKEN')
  process.exit(1)
}

const SA = require('superagent')
const Spinner = require('cli-spinner').Spinner;
const DISCORD_TOKEN = 'Bot ' + process.argv[4]
const CHANNEL_ID = process.argv[2]
const USER_ID = process.argv[3]
let result = []
let offset = null

async function dataCheck() {
  const me = await SA('https://canary.discordapp.com/api/v6/users/@me').set('Authorization', DISCORD_TOKEN).catch(dataFail)
  const user = await SA('https://canary.discordapp.com/api/v6/users/' + USER_ID).set('Authorization', DISCORD_TOKEN).catch(dataFail)
  const channel = await SA('https://canary.discordapp.com/api/v6/channels/' + CHANNEL_ID).set('Authorization', DISCORD_TOKEN).catch(dataFail)
  const message = await SA('https://canary.discordapp.com/api/v6/channels/' + CHANNEL_ID + '/messages?limit=50').set('Authorization', DISCORD_TOKEN).catch(dataFail)
  console.log(`Fetching data as ${me.body.username}#${me.body.discriminator}\nFetching messages for ${user.body.username}#${user.body.discriminator} in channel ${channel.body.name} (${message.body[0].channel_id})\n`) // we use the message object here purely to use all objects
}

function dataFail(args) {
  console.log('\nSome of your data was invalid: \n' + args.response.body.message)
  process.exit(1)
}

function ENDPOINT(id) {
  return `https://canary.discordapp.com/api/v6/channels/${id}/messages`
}

const spin = new Spinner('Getting messages...')

async function getMessages(id, offset = null) {
  const route = await ENDPOINT(id)
  const res = await SA(route + (offset === null ? '' : '?limit=100&before=' + offset)).set('Authorization', DISCORD_TOKEN)
  return res.body
}

async function getEverything() {
  if (offset !== null) spin.setSpinnerTitle(`Fetching messages with offset ${offset}, got ${result.length} messages so far...`)
  const messages = await getMessages(CHANNEL_ID, offset)
  if (messages.length === 0) finalize()
  else {
    offset = messages[messages.length - 1].id
    let filtered = messages.filter(g => g.author.id === USER_ID)
    filtered.map(o => {
      result.push(o.content)
    })
    setTimeout(() => getEverything(), 750)
  }
}

function finalize() {
  spin.stop()
  spin.clearLine()
  console.log(`\nDone! Dumping ${result.length} messages to file...`)
  require('fs').writeFileSync(`./output/${USER_ID}_${CHANNEL_ID}.txt`, result.join('\n'))
}

dataCheck().then(() => {
  spin.start()
  getEverything()
})