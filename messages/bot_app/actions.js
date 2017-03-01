/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const moment = require('moment');
const { wrap: async } = require('co');

const Question = mongoose.model('Question');
const User = mongoose.model('User');


exports.createQuestion = async(function* (text) {
    const data = {};

    let preData = text.split('{');
    data.question = preData[0];
    if (preData[1]) {
        preData = preData[1].split('}');
        preData = preData[0].split('/');
    } else {
        yield
    }

    data.answers = [];
    preData.forEach(a => data.answers.push(a));

    const question = new Question(data);

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


exports.removeQuestions = async(function* () {
    return Question.remove();
});

exports.getUser = async(function* (telegramId) {
    return User.getUserById(telegramId);
});

exports.createUser = async(function* (data) {
    Question.list()
        .then(questions => {
            const userData = {
                date: moment().format('MMMM Do YYYY, h:mm:ss a'),
                username: data.from.username,
                telegramId: data.from.id,
                answers: []
            };

            User.getUserById(data.from.id)
                .then(user => {
                    if (user) {
                        user.answers = [];
                        user.date = moment().format('MMMM Do YYYY, h:mm:ss a');
                        questions.forEach(q => user.answers.push({question: q.question}));

                        return user.save();
                    } else {
                        const newUser = new User(userData);

                        return newUser.save();
                    }
                });
        })
});

exports.putAnswer = async(function* (telegramId, question, answer) {

    User.getUserById(telegramId)
        .then(user => {

            user.answers.find(a => a.question === question).answer = answer;
            return user.save();
        });
});