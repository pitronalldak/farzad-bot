/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const moment = require('moment');
const { wrap: async } = require('co');

const Question = mongoose.model('Question');
const User = mongoose.model('User');
const Survey = mongoose.model('Survey');
const uuid = require('uuid/v4');

exports.createQuestion = async(function* (survey, text, ownAnswer) {
    const data = {};
    let preData = text.split('{');
    data.question = preData[0];

    if (preData[1]) {
        preData = preData[1].split('}')[0].split('/');
    } else {
        preData = [];
    }
    data.id = uuid.v4();
    data.survey = survey;
    data.answers = [];

    if (ownAnswer) data.ownAnswer = {text: ownAnswer, id: 0};
    preData.forEach((a, key) => data.answers.push({id: key + 1, text: a}));
    const question = new Question(data);

    try {
        yield question.save();
    } catch (err) {
        const errors = Object.keys(err.errors)
            .map(field => err.errors[field].message);
        console.log(errors);
    }
});

exports.createSurvey = async(function* (name, thankYou) {
  const data = {};
  data.id = uuid.v4();
  data.name = name;
  data.thankYou = thankYou;

  const survey = new Survey(data);

  try {
    yield survey.save();
  } catch (err) {
    const errors = Object.keys(err.errors)
        .map(field => err.errors[field].message);
    console.log(errors);
  }
});

exports.initializeUserAnswers = async(function* (surveyName, telegramId) {
	this.getQuestions()
		.then(questions => {
			this.getUser(telegramId)
				.then((user) => {
			        let questionsFiltered = questions.filter(q => q.survey === surveyName);
					user.answers = [];
                    user.survey = surveyName;
                    questionsFiltered.map(q => {
                        user.answers.push({"answer":"","questionId": q.id,"question": q.question});
                    });
					return user.save();
				})
		})
});

exports.getQuestions = async(function* () {
    return Question.list();
});

exports.getSurveys = async(function* () {
  return Survey.list();
});

exports.getUsers = async(function* () {
    return User.list();
});

exports.removeSurvey = async(function* (name) {
    Question.list()
        .then(questions => {
	        Survey.list()
		        .then(surveys => {
			        const deletingSurvey = surveys.find(survey => survey.name = name);
			        Survey.removeSurveyByName(deletingSurvey)
				        .then(() => {
                            questions.map((question) => {
                                if (question.survey === survey) {
                                    question.question = 'deleted';
                                }
                                return question.save();
                            });
				        });
                });
        });
});

exports.findAndDeleteTheQuestion = async(function* (question) {
    return Question.getQuestionByName(question)
        .then(thequestion => {
            if (thequestion) {
                thequestion.question = 'deleted';
                return thequestion.save();
            } else {
                throw 'No such question!';
            }
        });
});

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
                        // questions.forEach(q => user.answers.push({question: q.question, questionId: q.id}));
                        user.chatId = userData.chatId;
                        return user.save();
                    } else {
                        // questions.forEach(q => userData.answers.push({question: q.question, questionId: q.id}));
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