const express = require('express');
const mongoose = require('mongoose');
const app = express();
const {postSpreadSheets} = require('./messages/bot_app/google-spreadsheets');

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
    // return mongoose.connect('mongodb://admin:127.0.0.1:27017/bot').connection;
}

function listen () {
    if (app.get('env') === 'test') return;

    app.listen(port);
    console.log('Express app started on port ' + port);
}

const TelegramBot = require('node-telegram-bot-api');

// replace the value below with the Telegram token you receive from @BotFather
const token = '350720484:AAEgITsnyA0ZIFgQ46ivEq7Sp2VTrt4YDUg';

// Create a bot that uses 'polling' to fetch new updates

const bot = new TelegramBot(token, {polling: true});

bot.onText(/info/, function (msg, match) {
    const chatId = msg.chat.id;

    const text = '-start- Started your interview \n \n' +
        '-add_question: password|question{answer/answer/answer}- Create new question with options.\n \n' +
        '-add_question: password|question- Create new question without input answer.\n \n' +
        '-add_question: password|question{answer/answer/answer}|own custom variant- Create new question with options and input answer.\n \n' +
        '-remove password- Remove all questions from interview.\n \n' +
        '-info- Get commands list.\n \n' +
        '-google password- Download database to google doc.';
    bot.sendMessage(chatId, text);
});

bot.on('callback_query', callbackQuery => {
    const telegramId = callbackQuery.from.id;
    const message = callbackQuery.message;
    const callback_data = callbackQuery.data.split('|');

    const questionId = callback_data[0];
    const answerId = callback_data[1];
    const isOwnAnswer = !!callback_data[2];
    const chatId = message.chat.id;

    action.getQuestions()
        .then(questions => {

            const question = questions.find(q => q.id == questionId).question;

            if (isOwnAnswer) {
                const opts = {
                    reply_markup: {
                        force_reply: true,

                    }
                };
                bot.sendMessage(chatId, question, opts)
            } else {
                const answer = questions.find(q => q.id == questionId).answers
                    .find(a => a.id == answerId).text;
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
                                                text: answer.text,
                                                callback_data: `${responseQuestion.id}|${answer.id}`,
                                                resize_keyboard: true
                                            }])
                                        });
                                        if (responseQuestion.ownAnswer.text) {
                                            opts.reply_markup.inline_keyboard.push([{
                                                text: responseQuestion.ownAnswer.text,
                                                callback_data: `${responseQuestion.id}|${responseQuestion.ownAnswer.id}|true`,
                                                resize_keyboard: true
                                            }]);
                                        }
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
                                    bot.sendMessage(chatId, 'Thank you!');
                                }
                            })
                    })
            }
        })
});

// Create interview
bot.onText(/add_question: (.+)/, function (msg, match) {
    const data = match[1].split('|');
    const password = data[0];
    const question = data[1];
    const ownAnswer = data[2];
    const chatId = msg.chat.id;
    if (password === PASSWORD) {
        action.createQuestion(question, ownAnswer).then(() => bot.sendMessage(chatId, `Question added!`));
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
        const chatId = msg.chat.id;

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
                                            text: answer.text,
                                            callback_data: `${responseQuestion.id}|${answer.id}`,
                                            resize_keyboard: true
                                        }])
                                    });
                                    if (responseQuestion.ownAnswer.text) {
                                        opts.reply_markup.inline_keyboard.push([{
                                            text: responseQuestion.ownAnswer.text,
                                            callback_data: `${responseQuestion.id}|${responseQuestion.ownAnswer.id}|true`
                                        }]);
                                    }
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
                                bot.sendMessage(chatId, 'Thank you!');
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
                let userList = [];
                let columns = [];
                let answerList = [];
                for (let user of users) {
                    let juser = [];
                    juser.push(user.telegramId);
                    juser.push(user.date);
                    let answers = user.answers;
                    if (!answerList.length) {
                        answerList = user.answers;
                    }
                    for (let answer of answers) {
                        juser.push(answer.answer);
                    }
                    userList.push(juser);
                }

                columns.push('telegramId', 'date');
                for (let a of answerList) {
                    columns.push(a.question);
                }
                postSpreadSheets(userList, columns);
                bot.sendMessage(chatId, `Migration complete!`)
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

                    const reply_markup = {
                        inline_keyboard: []
                    };

                    if (questions[0].answers.length) {
                        questions[0].answers.forEach(answer => {
                            reply_markup.inline_keyboard.push([{
                                text: answer.text,
                                callback_data: `${questions[0].id}|${answer.id}`,
                                resize_keyboard: true
                            }]);
                        });
                        if (questions[0].ownAnswer.text) {
                            reply_markup.inline_keyboard.push([{
                                text: questions[0].ownAnswer.text,
                                callback_data: `${questions[0].id}|${questions[0].ownAnswer.id}|true`,
                                resize_keyboard: true
                            }]);
                        }

                        const opts = {
                            "parse_mode": "Markdown",
                            "reply_markup": JSON.stringify(reply_markup)
                        };

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
