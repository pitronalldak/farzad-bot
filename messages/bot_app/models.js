const mongoose = require('mongoose');

const Schema = mongoose.Schema;
var ObjectIdSchema = Schema.ObjectId;
var ObjectId = mongoose.Types.ObjectId;

const SurveySchema = new Schema({
    id: { type: String, default: '' },
    name: { type : String, default : '' },
    thankYou: { type : String, default : '' },
		isActive: { type : Boolean, default : true }
});

const QuestionSchema = new Schema({
    id: { type: String, default: '' },
		index: { type: Number },
    survey: { type : String, default: '' },
    question: { type : String, default : ''},
		type: { type : String, default : '' },
    answers: { type : [] },
    ownAnswer: {
        id: { type: String, default: '' },
        text: { type: String, default: '' },
    },
		isDeleted: { type : Boolean, default : false }
});

const UserSchema = new Schema({
    date: { type: String, default: '' },
    username: { type: String, default: '' },
    telegramId: { type: String, default: '' },
    chatId: { type: String, default: '' },
		survey: { type: String, default: '' },
    answers: [{
        answerId: { type: String, default: '' },
        question: { type: String, default: '' },
        questionId: { type: String, default: '' },
        answer: { type: String, default: '' },
	    isDeleted: { type : Boolean, default : false }
    }]
});

SurveySchema.methods = {
  remove: function () {
    return this.remove()
        .exec();
  }
};

SurveySchema.statics = {
    list: function (options) {
    return this.find()
        .exec();
    },
    removeSurveyByName: function (survey) {
        return this.findOne(survey).remove()
            .exec();
    },
};

QuestionSchema.methods = {
    remove: function () {
        return this.remove()
            .exec();
    }
};

QuestionSchema.statics = {

    getQuestionByName: function (question) {
        return (this.findOne({question}));
    },
    list: function (options) {
        return this.find().sort({ "index": 1 })
            .exec();
    }
};

UserSchema.statics = {

    /**
     * List questions
     *
     * @param {Object} telegramId
     * @api private
     */

    getUserById: function (telegramId) {
        return this.findOne({telegramId})
            .exec();
    },
    list: function (options) {
        return this.find()
        .exec();
    }
};

mongoose.model('Question', QuestionSchema);
mongoose.model('User', UserSchema);
mongoose.model('Survey', SurveySchema);
