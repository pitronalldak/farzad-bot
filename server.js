const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment');
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
    // return mongoose.connect('mongodb://bot:bot@127.0.0.1:27017/bot').connection;
}

function listen () {
    if (app.get('env') === 'test') return;
    app.listen(port);
    console.log('Express app started on port ' + port);
}

const TelegramBot = require('node-telegram-bot-api');

// replace the value below with the Telegram token you receive from @BotFather
const token = '330486268:AAEEi7yURFX0EZQRE7EhylamB1-WaJi5ljg'; //test: 330486268:AAEEi7yURFX0EZQRE7EhylamB1-WaJi5ljg origin: 350720484:AAEgITsnyA0ZIFgQ46ivEq7Sp2VTrt4YDUg

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});


//Show info on screen
bot.onText(/info (.+)/, function (msg, match) {
    const password = match[1];
    const chatId = msg.chat.id;
    if (password === PASSWORD) {
        const text = '-start- Started your interview \n \n' +
            '-add_question: password|question{answer/answer/answer}- Create new question with options.\n \n' +
            '-add_question: password|question- Create new question without input answer.\n \n' +
            '-add_question: password|question{answer/answer/answer}|own custom variant- Create new question with options and input answer.\n \n' +
            '-remove password- Remove all questions from interview.\n \n' +
            '-removequestionbyname: password|question- Remove the question with typed name from an interview.\n \n' +
            '-info password- Get commands list.\n \n' +
            '-google password- Download database to google spreadsheet.\n \n' +
            '-send password- Send all unanswered questions and added afterwards to all users have ever participated.';
        bot.sendMessage(chatId, text);
    } else {
        bot.sendMessage(chatId, `Wrong password!`)
    }
});

//Bot reaction to msg, put answer to the db, send next question or thank you
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

//Bot reaction to button tap, put answer to the db, send next question or thank you
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
                action.putAnswer(telegramId, question, answer, answerId)
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

// Create interview, put question to the db (questions)
bot.onText(/add_question: (.+)/, function (msg, match) {
    const data = match[1].split('|');
    const password = data[0];
    const question = data[1];
    const questionitself = question.split('{')[0];
    const ownAnswer = data[2];
    const chatId = msg.chat.id;
    let stopadding = false;
    action.getQuestions()
        .then((questions) => {
            for (let q of questions) {
                if (q.question == questionitself) {
                    stopadding = true;
                }
            }
            if (stopadding) {
                bot.sendMessage(chatId, `This question already exists!`);
            } else {
                if (password === PASSWORD) {
                    action.createQuestion(question, ownAnswer).then(() => bot.sendMessage(chatId, `Question added!`));
                } else {
                    bot.sendMessage(chatId, `Wrong password!`)
                }
            }
        });

});

// Remove all questions from the db
bot.onText(/remove (.+)/, function (msg, match) {
    const password = match[1];
    const chatId = msg.chat.id;
    if (password === PASSWORD) {
        action.removeQuestions().then(() => bot.sendMessage(chatId, `Question list is empty!`));
    } else {
        bot.sendMessage(chatId, `Wrong password!`)
    }
});

// Remove last question from the db (questions)
bot.onText(/removequestionbyname: (.+)/, function (msg, match) {
    const data = match[1].split('|');
    const password = data[0];
    const question = data[1];
    const chatId = msg.chat.id;
    if (password === PASSWORD) {
        action.findTheQuestion(question)
            .then((thequestion) => {
            if (thequestion) {
                action.removeTheQuestion(question).then(() => bot.sendMessage(chatId, `The question was removed!`));
            }
            else {bot.sendMessage(chatId, `No such question!`)}
            });
    } else {
        bot.sendMessage(chatId, `Wrong password!`)
    }
});

//Send all unanswered questions and added afterwards to all users have ever participated, looks for users, who has unanswered question, takes them and sends first unanswered question
bot.onText(/send (.+)/, function (msg, match) {
    const password = match[1];
    const chatId = msg.chat.id;
    if (password === PASSWORD) {
        action.getUsers()
            .then((users) => {
                let unfinishedUsers = [];
                for (let user of users) {
                    for (let answer of user.answers) {
                        if (!answer.answer) {
                            unfinishedUsers.push(user);
                        }
                    }
                }
                action.getQuestions()
                    .then((questions) => {
                        for (let user of unfinishedUsers) {
                            let qid = user.answers.filter(answer => !answer.answer)[0].questionId;
                            console.log(qid);
                            const reply_markup = {
                                inline_keyboard: []
                            };

                                let nextQuestion = (questions.find(question => question.id == qid));
                                    console.log(nextQuestion);
                                if ((nextQuestion === undefined) || (nextQuestion === null)) {
                                    nextQuestion = questions[0];
                                }
                                if (nextQuestion.answers.length) {
                                    nextQuestion.answers.forEach(answer => {
                                        reply_markup.inline_keyboard.push([{
                                            text: answer.text,
                                            callback_data: `${nextQuestion.id}|${answer.id}`,
                                            resize_keyboard: true
                                        }]);
                                    });
                                    if (nextQuestion.ownAnswer.text) {
                                        reply_markup.inline_keyboard.push([{
                                            text: nextQuestion.ownAnswer.text,
                                            callback_data: `${nextQuestion.id}|${nextQuestion.ownAnswer.id}|true`,
                                            resize_keyboard: true
                                        }]);
                                    }
                                    const opts = {
                                        "parse_mode": "Markdown",
                                        "reply_markup": JSON.stringify(reply_markup)
                                    };

                                    bot.sendMessage(user.chatId, nextQuestion.question, opts);
                                } else {
                                    const opts = {
                                        reply_markup: {
                                            force_reply: true,
                                        }
                                    };
                                    bot.sendMessage(user.chatId, nextQuestion.question, opts);
                                }
                        }
                });
                bot.sendMessage(chatId, `Sent successfully!`);
            });
    } else {
        bot.sendMessage(chatId, `Wrong password!`)
    }
});

//Export to google spreadsheet, takes info from the DB(users), sort it and insert it in the google spreadsheet
bot.onText(/google (.+)/, function (msg, match) {
    const password = match[1];
    const chatId = msg.chat.id;
    if (password === PASSWORD) {
        action.getQuestions()
            .then((questions) => {
                action.getUsers()
                    .then((users) => {
                        let userList = [];
                        let columns = [];
                        for (let user of users) {
                            let juser = [];
                            juser.push(user.telegramId);
                            juser.push(user.date);
                            juser.push(user.username);
                            for (let answer of user.answers) {
                                let answ = '';
                                if (answer.answerId) {answ = answer.answerId} else {answ = answer.answer};
                                juser.push(answ);
                            }
                            userList.push(juser);
                            userList.sort(function (a, b) {
                                if (moment().diff(a[1]) > moment().diff(b[1])) {
                                    return -1;
                                }
                                if (moment().diff(a[1]) < moment().diff(b[1])) {
                                    return 1;
                                }
                            })
                        }
                        columns.push('telegramId', 'date','Username');
                        for (let a of questions) {
                            columns.push(a.question);
                        }
                        columns.push('total number of questions - ' + String(questions.length),'total number of users - ' + String(users.length))
                        postSpreadSheets(userList, columns);
                        bot.sendMessage(chatId, `Migration complete!`)
                    });
            });
    } else {
        bot.sendMessage(chatId, `Wrong password!`)
    }
});

//start the survey, gets all questions from the DB(questions), send first to the user with params
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


