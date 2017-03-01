const mongoose = require('mongoose');
const uuidV1 = require('uuid/v1');

// const Imager = require('imager');
// const config = require('../../config');
// const imagerConfig = require(config.root + '/config/imager.js');

const Schema = mongoose.Schema;

const getTags = tags => tags.join(',');
const setTags = tags => tags.split(',');

const QuestionSchema = new Schema({
    question: { type : String, default : ''},
    answers: { type : [] }}
);

const UserSchema = new Schema({
    date: {type: String, default: ''},
    username: {type: String, default: ''},
    telegramId: {type: String, default: ''},
    answers: [{
        question: {type: String, default: ''},
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
    }
};

mongoose.model('Question', QuestionSchema);
mongoose.model('User', UserSchema);
