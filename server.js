const express = require('express');
const mongoose = require('mongoose');
const join = require('path').join;
const app = express();

require("./messages/bot_app/models");

const port = process.env.PORT || 3000;

const action = require('./messages/bot_app/actions');

module.exports = app;

connect()
    .on('error', console.log)
    .on('disconnected', connect)
    .once('open', listen);


function connect () {
    const options = { server: { socketOptions: { keepAlive: 1 } } };
    return mongoose.connect('mongodb://bot:Matwey12@ds145019.mlab.com:45019/heroku_zlrrx207').connection;
}

function listen () {
    if (app.get('env') === 'test') return;

    app.listen(port);
    console.log('Express app started on port ' + port);
}




var TelegramBot = require('node-telegram-bot-api');

// replace the value below with the Telegram token you receive from @BotFather
var token = '330486268:AAEEi7yURFX0EZQRE7EhylamB1-WaJi5ljg';

// Create a bot that uses 'polling' to fetch new updates

var bot = new TelegramBot(token, {polling: true});

bot.onText(/test/, function (msg, match) {
    var chatId = msg.chat.id;

    // send back the matched "whatever" to the chat
    bot.sendMessage(chatId, 'test compited');
});

bot.on('callback_query', callbackQuery => {
    const telegramId = callbackQuery.from.id;
    const message = callbackQuery.message;

    const callback_data = callbackQuery.data.split('|');
    const question = callback_data[0];
    const answer = callback_data[1];

    action.getQuestions()
        .then((questions) => {
            action.putAnswer(telegramId, question, answer)
                .then(() => {
                    action.getUser(telegramId)
                        .then((user) => {

                            const chatId = message.chat.id;
                            const opts = {
                                reply_markup: {
                                    inline_keyboard: [[]]
                                }
                            };

                            let question;
                            let isNext = false;

                            for (let item of user.answers) {
                                if (!item.answer) {
                                    question = questions.find(q => q.question == item.question);
                                }
                            }

                            for (let item of user.answers) {
                                if (!item.answer && item.question !== question.question) {
                                    isNext =true;
                                }
                            }

                            if (isNext) {
                                question.answers.forEach(answer => {
                                    opts.reply_markup.inline_keyboard[0].push({
                                        text: answer,
                                        callback_data: `${question.question}|${answer}`
                                    })
                                });
                                bot.sendMessage(chatId, question.question, opts);
                            } else {
                                bot.sendMessage(chatId, 'Thank!');
                            }
                        })
                })
        })
});



// Create interview

bot.onText(/Add question: (.+)/, function (msg, match) {
    const chatId = msg.chat.id;
    action.createQuestion(match[1]).then(() => bot.sendMessage(chatId, `Question added!`));
});


bot.onText(/start/, function (msg, match) {
    action.createUser(msg)
        .then(() =>
            action.getQuestions()
                .then((questions) => {
                    const chatId = msg.chat.id;
                    const opts = {
                        reply_markup: {
                            inline_keyboard: [[]]
                        }
                    };
                    questions[0].answers.forEach(answer => {
                        opts.reply_markup.inline_keyboard[0].push({text: answer, callback_data: `${questions[0].question}|${answer}`})
                    });
                    bot.sendMessage(chatId, questions[0].question, opts);
                })
        )
});

