const express = require('express');
const mongoose = require('mongoose');
const app = express();

require("./messages/bot_app/models");

const port = process.env.PORT || 3000;

const action = require('./messages/bot_app/actions');

const PASSWORD = 'Survey2017';

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

bot.onText(/info/, function (msg, match) {
    var chatId = msg.chat.id;

    const text = 'Hi. Farzad bot can help you with your interview.\n \n' +
        '-start- Started your interview \n \n' +
        '-add_question: password|question{answer/answer/answer}- Created new question for your interview.\n \n' +
        '-add_question: password|question- Created new question for your interview without variants.\n \n' +
        '-remove password- Remove all questions from interview.\n \n' +
        '-info- Get commands list.';
        '-google password- Download database to google doc.';
    bot.sendMessage(chatId, text);
});

bot.on('callback_query', callbackQuery => {
    const telegramId = callbackQuery.from.id;
    const message = callbackQuery.message;

    const callback_data = callbackQuery.data.split('|');

    const question = callback_data[0];
    const answer = callback_data[1];
    const chatId = message.chat.id;

    action.getQuestions()
        .then((questions) => {
            if (answer === 'Own answer') {
                const opts = {
                    reply_markup: {
                        force_reply: true,

                    }
                };
                bot.sendMessage(chatId, question, opts)
            } else {
                action.putAnswer(telegramId, question, answer)
                    .then(() => {
                        action.getUser(telegramId)
                            .then((user) => {

                                const chatId = message.chat.id;
                                const opts = {
                                    reply_markup: {
                                        inline_keyboard: []
                                    }
                                };
                                let responseQuestion;
                                let isNext = false;

                                for (let item of user.answers) {
                                    if (!item.answer && item.question !== question) {
                                        responseQuestion = questions.find(q => q.question == item.question);
                                        isNext = true;
                                        break
                                    }
                                }

                                if (isNext) {
                                    if (responseQuestion.answers.length) {
                                        responseQuestion.answers.forEach(answer => {
                                            opts.reply_markup.inline_keyboard.push([{
                                                text: answer,
                                                callback_data: `${responseQuestion.question}|${answer}`,
                                                resize_keyboard: true
                                            }])
                                        });
                                        opts.reply_markup.inline_keyboard.push([{
                                            text: 'Own answer.',
                                            callback_data: `${responseQuestion.question}|Own answer`,
                                            resize_keyboard: true
                                        }]);
                                        bot.sendMessage(chatId, responseQuestion.question, opts);
                                    }
                                    else {
                                        const opts = {
                                            reply_markup: {
                                                force_reply: true,

                                            }
                                        };
                                        bot.sendMessage(chatId, responseQuestion.question, opts)
                                    }
                                } else {
                                    bot.sendMessage(chatId, 'Thank!');
                                }
                            })
                    })
            }
        })
});



// Create interview

bot.onText(/add_question: (.+)/, function (msg, match) {
    const data = match[1];
    const password = data.split('|')[0];
    const question = data.split('|')[1];
    const chatId = msg.chat.id;
    if (password === PASSWORD) {
        action.createQuestion(question).then(() => bot.sendMessage(chatId, `Question added!`));
    } else {
        bot.sendMessage(chatId, `Wrong password!`)
    }

});

// Remove all questions

bot.onText(/remove (.+)/, function (msg, match) {
    const password = match[1];
    const chatId = msg.chat.id;
    if (password === PASSWORD) {
        action.removeQuestions().then(() => bot.sendMessage(chatId, `Question list is empty!`));
    } else {
        bot.sendMessage(chatId, `Wrong password!`)
    }
});


bot.on('message', msg => {
    if (msg.reply_to_message) {

        const telegramId = msg.reply_to_message.chat.id;
        const question = msg.reply_to_message.text;
        const answer = msg.text;

        action.getQuestions()
            .then((questions) => {
                action.putAnswer(telegramId, question, answer)
                    .then(() => {
                        action.getUser(telegramId)
                            .then((user) => {

                                const chatId = msg.chat.id;
                                const opts = {
                                    reply_markup: {
                                        inline_keyboard: []
                                    }
                                };
                                let responseQuestion;
                                let isNext = false;

                                for (let item of user.answers) {
                                    if (!item.answer && item.question !== question) {
                                        responseQuestion = questions.find(q => q.question == item.question);
                                        isNext = true;
                                        break
                                    }
                                }

                                if (isNext) {
                                    if (responseQuestion.answers.length) {
                                        responseQuestion.answers.forEach(answer => {
                                            opts.reply_markup.inline_keyboard.push([{
                                                text: answer,
                                                callback_data: `${responseQuestion.question}|${answer}`,
                                                resize_keyboard: true
                                            }])
                                        });
                                        opts.reply_markup.inline_keyboard.push([{
                                            text: 'Own answer',
                                            callback_data: `${responseQuestion.question}|Own answer`
                                        }]);
                                        bot.sendMessage(chatId, responseQuestion.question, opts);
                                    }
                                    else {
                                        const opts = {
                                            reply_markup: {
                                                force_reply: true,

                                            }
                                        };
                                        bot.sendMessage(chatId, responseQuestion.question, opts)
                                    }
                                } else {
                                    bot.sendMessage(chatId, 'Thank!');
                                }
                            })
                    })
            })
    }
});

//object for google docs

bot.onText(/google (.+)/, function (msg, match) {
    const password = match[1];
    const chatId = msg.chat.id;
    if (password === PASSWORD) {
        action.getUsers()
            .then((users) => {
                let jusers = [];
                for (let user of users) {
                    let juser = {};
                    juser.telegramId = user.telegramId;
                    juser.date = user.date;
                    let answers = user.answers;
                    for (let answer of answers) {
                        juser[answer.question] = answer.answer;
                    }
                    jusers.push(juser);
                }
                console.log(jusers);
            });
    } else {
        bot.sendMessage(chatId, `Wrong password!`)
    }
});

bot.onText(/start/, function (msg, match) {
    action.createUser(msg)
        .then(() =>
            action.getQuestions()
                .then((questions) => {
                    const chatId = msg.chat.id;
                    const opts = {
                        reply_markup: {
                            inline_keyboard: []
                        }
                    };
                    if (questions[0].answers.length) {
                        questions[0].answers.forEach(answer => {
                            opts.reply_markup.inline_keyboard.push([{
                                text: answer,
                                callback_data: `${questions[0].question}|${answer}`
                            }]);
                        });
                        opts.reply_markup.inline_keyboard.push([{
                            text: 'Own answer',
                            callback_data: `${questions[0].question}|Own answer`
                        }]);
                        console.log(opts.reply_markup.inline_keyboard);
                        console.log(questions[0].question);
                        bot.sendMessage(chatId, questions[0].question, opts);
                    } else {
                        const opts = {
                            reply_markup: {
                                force_reply: true,

                            }
                        };
                        bot.sendMessage(chatId, questions[0].question, opts)
                    }
                })
        )
});
