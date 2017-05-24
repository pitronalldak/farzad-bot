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

exports.createQuestion = async(function* (surveyId, text, ownAnswer, questionsQuantity) {
    const data = {};
    let preData = text.split('{');
    data.question = preData[0];
    if (preData[1]) {
        preData = preData[1].split('}')[0].split('/');
    } else {
        preData = [];
    }
    data.id = uuid.v4();
    data.survey = surveyId;
    data.answers = [];
    data.index = questionsQuantity + 1;
    if (ownAnswer) data.ownAnswer = {text: ownAnswer, id: ''};
    preData.forEach((a, key) => data.answers.push({id: key + 1, text: a}));
	if (data.ownAnswer) {
		if (data.answers.length) {
			data.type = 'ownAndOptions';
		} else {
			data.type = 'own';
		}
	} else {
		data.type = 'options';
	}
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

exports.initializeAddedQuestionUserAnswers = async(function* (surveyName) {
	this.getQuestions()
		.then(questions => {
			this.getUsers()
				.then(users => {
					users.forEach(user => {
					    if (user.survey === surveyName) {
						    questions.forEach(q => {
							    if (!user.answers.some(answer => answer.questionId === q.id)) {
							        user.answers.push({"answer":"","questionId": q.id,"question": q.question});
								    return user.save();
							    }
						    })
                        }
                    })
		        })
		})
});

exports.initializeUserAnswers = async(function* (surveyId, telegramId) {
	this.getQuestions()
		.then(questions => {
			this.getUser(telegramId)
				.then((user) => {
			        let questionsFiltered = questions.filter(q => q.survey === surveyId);
					user.answers = [];
                    user.survey = surveyId;
                    questionsFiltered.map(q => {
                        user.answers.push({"answer": "","questionId": q.id,"question": q.question});
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
    Survey.list()
        .then(surveys => {
	        const deletingSurvey = surveys.find(survey => survey.name = name);
	        return Survey.removeSurveyByName(deletingSurvey)
        });
});

// exports.findAndDeleteTheQuestion = async(function* (question) {
//     return Question.getQuestionByName(question)
//         .then(thequestion => {
//             if (thequestion) {
//                 thequestion.isDeleted = true;
//                 return thequestion.save();
//             } else {
//                 throw 'No such question!';
//             }
//         });
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