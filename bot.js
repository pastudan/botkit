const env = require('node-env-file')
const Botkit = require('botkit')
const debug = require('debug')('botkit:main')
env(__dirname + '/.env')

if (!process.env.clientId || !process.env.clientSecret || !process.env.PORT) {
  usage_tip()
  // process.exit(1);
}

const bot_options = {
  clientId: process.env.clientId,
  clientSecret: process.env.clientSecret,
  clientSigningSecret: process.env.clientSigningSecret,
  // debug: true,
  scopes: ['bot'],
  studio_token: process.env.studio_token,
  studio_command_uri: process.env.studio_command_uri
}

// Use a mongo database if specified, otherwise store in a JSON file local to the app.
// Mongo is automatically configured when deploying to Heroku
if (process.env.MONGO_URI) {
  const mongoStorage = require('botkit-storage-mongo')({ mongoUri: process.env.MONGO_URI })
  bot_options.storage = mongoStorage
} else {
  bot_options.json_file_store = __dirname + '/.data/db/' // store user data in a simple JSON format
}

// Create the Botkit controller, which controls all instances of the bot.
const controller = Botkit.slackbot(bot_options)

controller.startTicking()

// Set up an Express-powered webserver to expose oauth and webhook endpoints
const webserver = require(__dirname + '/components/express_webserver.js')(controller)

webserver.get('/', function(req, res) {
  res.render('index', {
    domain: req.get('host'),
    protocol: req.protocol,
    glitch_domain: process.env.PROJECT_DOMAIN,
    layout: 'layouts/default'
  })
})
// Set up a simple storage backend for keeping a record of customers
// who sign up for the app via the oauth
require(__dirname + '/components/user_registration.js')(controller)

// Send an onboarding message when a new team joins
require(__dirname + '/components/onboarding.js')(controller)

// Load in some helpers that make running Botkit on Glitch.com better
require(__dirname + '/components/plugin_glitch.js')(controller)

const normalizedPath = require('path').join(__dirname, 'skills')
require('fs')
  .readdirSync(normalizedPath)
  .forEach(function(file) {
    require('./skills/' + file)(controller)
  })

/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

controller.hears(
  [
    `Let's go`,
    `lets go`,
    `let's gooo`,
    `lets gooo`,
    `let's goooo`,
    `lets goooo`,
    `lets gooooo`,
    `let's gooooo`
  ],
  'ambient', // listen to all messages, not just bot mentions
  function(bot, message) {
    bot.reply(message, '<@UG3HF7NNT>')
  }
)
