const fs = require('fs');
const readline = require('readline');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const moment = require('moment');
// test: 15xQEWvKK88W4eALxThmtHIzsdPXFqfYHir8QvjH8Jq0
// origin: 1LOUGqVKIm-crpOjIgTPUY7QlY6ubaSyclRZjqsGUx2U
// dev: 1TAidjIed5goBfdtIk81L955tSx-zyChioCHT2VzkdBg
// v2 dev: 1-ZFmyF-Iz7wyzdMLGEI9IjBbxL9l_FSFG8ogqWLVJc8
const spreadsheet = '1TAidjIed5goBfdtIk81L955tSx-zyChioCHT2VzkdBg';

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-quickstart.json';

// Load client secrets from a local file.
exports.postSpreadSheets = (questions, users, surveys) =>  fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
    }
    // Authorize a client with the loaded credentials, then call the
    // Google Sheets API.
    authorize(JSON.parse(content), listMajors(questions, users, surveys));
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const clientSecret = credentials.installed.client_secret;
    const clientId = credentials.installed.client_id;
    const redirectUrl = credentials.installed.redirect_uris[0];
    const auth = new googleAuth();
    const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function(code) {
        rl.close();
        oauth2Client.getToken(code, function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Helper mapping count to letter
 * It's one-based, so 1 is A, 26 is Z, 27 is AA.
 */
function toLetters(num) {
    "use strict";
    var mod = num % 26,
        pow = num / 26 | 0,
        out = mod ? String.fromCharCode(64 + mod) : (--pow, 'Z');
    return pow ? toLetters(pow) + out : out;
}

/**
 * Print the data in a spreadsheet:
 */
function writeDataToSheets(users, questions, survey) {
	let userList = [];
	let columns = [];
	let userQuantity = 0;
	let questionQuantity = 0;
	for (let user of users) {
		if (user.survey === survey.name) {
			userQuantity++;
			let juser = [];
			juser.push({
				userEnteredValue: {
					stringValue: user.telegramId,
				}
			});
			juser.push({
				userEnteredValue: {
					stringValue: user.date,
				}
			});
			juser.push({
				userEnteredValue: {
					stringValue: user.username,
				}
			});
			for (let answer of user.answers) {
				let answ = '';
				if (answer.answerId) {answ = answer.answerId} else {answ = answer.answer}
				juser.push({
					userEnteredValue: {
						stringValue: answ,
					}
				});
			}
			userList.push({
				values: juser
			});
		}
	}
	userList.sort(function (a, b) {
		if (moment().diff(a.values[1].userEnteredValue.stringValue) > moment().diff(b.values[1].userEnteredValue.stringValue)) {
			return -1;
		}
		if (moment().diff(a.values[1].userEnteredValue.stringValue) < moment().diff(b.values[1].userEnteredValue.stringValue)) {
			return 1;
		}
	});
	columns.push({
			userEnteredValue: {
				stringValue: 'telegramId',
			}
		},
		{
			userEnteredValue: {
				stringValue: 'date',
			}
		},
		{
			userEnteredValue: {
				stringValue: 'Username',
			}
		});
	for (let q of questions) {
		if (q.survey === survey.name) {
			questionQuantity++;
			columns.push({
				userEnteredValue: {
					stringValue: q.question,
				}
			});
		}
	}
	columns.push({
			userEnteredValue: {
				stringValue: 'total number of questions - ' + questionQuantity,
			}
		},
		{
			userEnteredValue: {
				stringValue: 'total number of users - ' + userQuantity,
			}
		});
	sheets.spreadsheets.get({
		spreadsheetId: spreadsheet,
		includeGridData: true,
		auth: auth,
	}, function(err, receivedSpreadsheet) {
		if (err) {
			console.log(err);
			return;
		}
		let sheetId = receivedSpreadsheet.sheets.find(sheet => sheet.properties.title === survey.name).properties.sheetId;
		let values= [{
			values: columns,
		}];
		userList.forEach(user => values.push(user));
		sheets.spreadsheets.batchUpdate({
			spreadsheetId: spreadsheet,
			resource: {
				requests: [{
					updateCells: {
						fields: '*',
						start: {
							sheetId: sheetId,
							rowIndex: 0,
							columnIndex: 0,
						},
						rows: values,
					}
				}],
			},
			auth: auth,
		}, function (err, response) {
			if (err) {
				console.log('The API returned an error: ' + err);
				return;
			}
			console.log(response);
		});
	});
}

const listMajors = (questions, users, surveys) => (
    (auth) => {
        const sheets = google.sheets('v4');
        sheets.spreadsheets.get({
	        spreadsheetId: spreadsheet,
	        includeGridData: true,
	        auth: auth,
        }, function(err, receivedSpreadsheet) {
            if (err) {
                console.log(err);
                return;
            }
	        surveys.forEach(survey => {
		        if (!receivedSpreadsheet.sheets.some(sheet => sheet.properties.title === survey.name)) {
			        sheets.spreadsheets.batchUpdate({
				        spreadsheetId: spreadsheet,
				        resource: {
					        requests: [{
						        addSheet: {
							        properties: {
							            title: survey.name,
						            },
						        }
					        }],
				        },
				        auth: auth,
			        }, function(err, response) {
				        if (err) {
					        console.log(err);
					        return;
				        }
				        writeDataToSheets(users, questions, survey);
			        })
		        } else {
			        writeDataToSheets(users, questions, survey);
		        }
	        });
        });
    }
);