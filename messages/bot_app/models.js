const mongoose = require('mongoose');

const Schema = mongoose.Schema;
var ObjectIdSchema = Schema.ObjectId;
var ObjectId = mongoose.Types.ObjectId;

const QuestionSchema = new Schema({
    id: {type: String, default: Math.random()},
    question: { type : String, default : ''},
    answers: { type : [] }}
);

const UserSchema = new Schema({
    date: {type: String, default: ''},
    username: {type: String, default: ''},
    telegramId: {type: String, default: ''},
    answers: [{
        answerId: {type: String, default: ''},
        question: {type: String, default: ''},
        questionId: {type: String, default: ''},
        answer: {type: String, default: ''}
    }]
});

QuestionSchema.methods = {
    remove: function () {
        return this.remove()
            .exec();
    }
};

QuestionSchema.statics = {

    list: function (options) {
        return this.find()
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
