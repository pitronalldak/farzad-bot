/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const moment = require('moment');
const { wrap: async } = require('co');

const Question = mongoose.model('Question');
const User = mongoose.model('User');
const uuid = require('uuid/v4');

exports.createQuestion = async(function* (text, ownAnswer) {
    const data = {};
    let preData = text.split('{');
    data.question = preData[0];

    if (preData[1]) {
        preData = preData[1].split('}')[0].split('/');
    } else {
        preData = [];
    }
    data.id = uuid.v4();
    data.answers = [];

    if (ownAnswer) data.ownAnswer = {text: ownAnswer, id: 0};
    preData.forEach((a, key) => data.answers.push({id: key + 1, text: a}));
    const question = new Question(data);

    this.getUsers()
        .then((users) => {
            for (let user of users) {
                user.answers.push({"answer":"","questionId": data.id,"question": data.question});
                user.save();
            }
        });

    try {
        yield question.save();
    } catch (err) {

        const errors = Object.keys(err.errors)
            .map(field => err.errors[field].message);

    }
});

exports.getQuestions = async(function* () {
    return Question.list();
});

exports.getUsers = async(function* () {
    return User.list();
});

exports.removeQuestions = async(function* () {
    Question.list()
        .then(questions => {
            questions.map((question) => {
                question.question = 'deleted';
                return question.save();
            });
        });
});

exports.findAndDeleteTheQuestion = async(function* (question) {
        Question.getQuestionByName(question)
        .then((thequestion) => {
            if (thequestion) {
                thequestion.question = 'deleted';
                return thequestion.save();
            } else {
                return 1;
            }
        });
});

// exports.removeTheQuestion = async(function* (question) {
//     Question.removeQuestionByName(question);
// });

exports.getUser = async(function* (telegramId) {
    return User.getUserById(telegramId);
});

exports.createUser = async(function* (data) {
    Question.list()
        .then(questions => {
            const userData = {
                date: moment().format('YYYY-MM-DDTHH:mm:ssZ'),
                username: data.from.username,
                telegramId: data.from.id,
                chatId: data.chat.id,
                answers: []
            };

            User.getUserById(data.from.id)
                .then(user => {
                    if (user) {
                        user.answers = [];
                        user.date = moment().format('YYYY-MM-DDTHH:mm:ssZ');
                        questions.forEach(q => user.answers.push({question: q.question, questionId: q.id}));
                        user.chatId = userData.chatId;
                        return user.save();
                    } else {
                        questions.forEach(q => userData.answers.push({question: q.question, questionId: q.id}));
                        const newUser = new User(userData);
                        return newUser.save();
                    }
                });
        })
});

exports.putAnswer = async(function* (telegramId, question, answer, answerId) {

    User.getUserById(telegramId)
        .then(user => {
            user.answers.find(a => a.question === question).answer = answer;
            user.answers.find(a => a.question === question).answerId = answerId;
            return user.save();
        });
});