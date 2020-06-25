var fs = require('fs');
var readline = require('readline');
var { google } = require('googleapis');
var OAuth2 = google.auth.OAuth2;

var SCOPES = ['https://www.googleapis.com/auth/youtube'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials';
var TOKEN_PATH = TOKEN_DIR + '/youtube-nodejs-quickstart.json';
var PLAYLISTID = 'PLebMY5JwLV0Tmi6BjfGz7_PcdaX5gom4o';
var SERVICE = google.youtube('v3');

var PLAYLISTITEMS = [];

fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
    }

    authorize(JSON.parse(content), listVideos);
});

function authorize(credentials, callback){
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}

function getNewToken(oauth2Client, callback) {
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
            callback(oauth2Client);
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

async function listVideos(auth, pageToken) {
    var nextPageToken = '';
    var recurse = true;

    var query = {
        auth: auth,
        order: 'date',
        part: 'id,snippet',
        q: 'Hermitcraft 7|VII',
        type: 'video',
        maxResults: 20
    };

    if (pageToken){
        PLAYLISTITEMS = [];
        query.pageToken = pageToken;
    }

    var res = await SERVICE.search.list(query);

    nextPageToken = res.data.nextPageToken;
    var videos = res.data.items;
    videos.sort((a,b) => (a.snippet.publishedAt < b.snippet.publishedAt) ? 1 : -1);

    console.log('Videos in this page: ' + videos.length);

    for (const element of videos) {
        console.log('Channel: ' + element.snippet.channelTitle);
        console.log('Title: ' + element.snippet.title);
        console.log('Published: ' + element.snippet.publishedAt);
        console.log('');

        var alreadyInPlaylist = await isVideoAlreadyInPlaylist(auth, element.id);

        if (alreadyInPlaylist){
            recurse = false;
            return;
        } else {
            addVideoToPlaylist(auth, element.id);
        }

        console.log('');
        console.log('');
    };

    if (!recurse){
        listVideos(auth, nextPageToken);
    }
}

async function isVideoAlreadyInPlaylist(auth, video) {
    if (PLAYLISTITEMS.length == 0){
        var res = await SERVICE.playlistItems.list({
            auth: auth,
            part: 'id,snippet',
            playlistId: PLAYLISTID
        });

        PLAYLISTITEMS = res.data.items;
    }

    if (PLAYLISTITEMS.some(item => item.snippet.resourceId.videoId == video.videoId)){
        console.log('Video is already in playlist');
        return true;
    };

    console.log('Video is not already in playlist');
    return false;
}

function addVideoToPlaylist(auth, video) {
    console.log('Adding video to playlist');

    if(video.kind == 'youtube#video'){
        SERVICE.playlistItems.insert({
            auth: auth,
            part: 'id,snippet',
            resource: {
                snippet: {
                    playlistId: PLAYLISTID,
                    resourceId: {
                        videoId: video.videoId,
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
}