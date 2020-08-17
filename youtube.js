module.exports = {
    addToPlaylist: addVideoToPlaylistIfNotAlreadyThere
}

var fs = require('fs');
var readline = require('readline');
var { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
var OAuth2 = google.auth.OAuth2;

var SCOPES = ['https://www.googleapis.com/auth/youtube'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials';
var TOKEN_PATH = TOKEN_DIR + '/youtube-nodejs-quickstart.json';
var SERVICE = google.youtube('v3');

var OAUTH2CLIENT;
var PLAYLISTITEMS = [];

fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
    }

    authorize(JSON.parse(content));
});

function authorize(credentials){
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    OAUTH2CLIENT = new OAuth2(clientId, clientSecret, redirectUrl);

    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
            getNewToken(oauth2Client);
        } else {
            OAUTH2CLIENT.credentials = JSON.parse(token);
        }
    });
}

function getNewToken(oauth2Client) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });

    console.log('Authorize this app by visiting this url: ', authUrl);

    var rl = readline.createInterface({
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
        });
    });
}

function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) throw err;
        console.log('Token stored to ' + TOKEN_PATH);
    });
}

async function addVideoToPlaylistIfNotAlreadyThere(videoid, playlist) {
    var alreadyInPlaylist = await isVideoAlreadyInPlaylist(videoid, playlist);

        if (!alreadyInPlaylist){
            addVideoToPlaylist(videoid, playlist);
        }
}

async function isVideoAlreadyInPlaylist(videoid, playlist) {
    if (PLAYLISTITEMS.length == 0){
        var res = await SERVICE.playlistItems.list({
            auth: OAUTH2CLIENT,
            part: 'id,snippet',
            playlistId: playlist
        });

        PLAYLISTITEMS = res.data.items;
    }

    if (PLAYLISTITEMS.some(item => item.snippet.resourceId.videoId == videoid)){
        console.log('Video is already in playlist');
        return true;
    };

    console.log('Video is not already in playlist');
    return false;
}

function addVideoToPlaylist(videoid, playlist) {
    console.log('Adding video to playlist');

    SERVICE.playlistItems.insert({
        auth: OAUTH2CLIENT,
        part: 'id,snippet',
        resource: {
            snippet: {
                playlistId: playlist,
                resourceId: {
                    videoId: videoid,
                    kind: "youtube#video"
                }
            }
        }
    },
    function (err, data, response) {
        if (err){
            console.log('The API returned an error: ' + err);
            return;
        }
        else if (data) {
            console.log('Video successfully added! ' + data);
        }

        if (response) {
            console.log('The API returned status: ' + response.statusCode);
            return;
        }
    })
}