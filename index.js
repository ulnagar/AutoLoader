var fs = require('fs');
var readline = require('readline');
var { google } = require('googleapis');
const { auth } = require('google-auth-library');
const { youtube } = google.youtube('v3');
var OAuth2 = google.auth.OAuth2;

var SCOPES = ['https://www.googleapis.com/auth/youtube'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials';
var TOKEN_PATH = TOKEN_DIR + '/youtube-nodejs-quickstart.json';
var PLAYLISTID = 'PLebMY5JwLV0Tmi6BjfGz7_PcdaX5gom4o';
var SERVICE = google.youtube('v3');

fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
    }

    authorize(JSON.parse(content), listVideos);
    //authorize(JSON.parse(content), getPlaylists);
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

function getChannel(auth) {
    SERVICE.channels.list({
        auth: auth,
        part: 'snippet,contentDetails,statistics',
        forUsername: 'ulnagar'
    }, function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var channels = response.data.items;
        if (channels.length == 0){
            console.log('No channel found.');
        } else {
            console.log('This channel\'s ID is %s. Its title is \'%s\', and it has %s views.', channels[0].id, channels[0].snippet.title, channels[0].statistics.viewCount);
        }
    });
}

function getPlaylists(auth) {
    SERVICE.playlists.list({
        auth: auth,
        part: 'id,snippet',
        mine: true
    }, function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var playlists = response.data.items;
        if (playlists.length == 0){
            console.log('No playlists found.');
        } else {
            for (const list in playlists){
                console.log('Playlist found: ' + list.id);
            }
        }
    });
}

async function listVideos(auth) {
    var res = await SERVICE.search.list({
        auth: auth,
        part: 'id,snippet',
        q: 'Hermitcraft 7|VII',
        maxResults: 20
    });

    var videos = res.data.items;
    videos.sort((a,b) => (a.snippet.publishedAt < b.snippet.publishedAt) ? 1 : -1);

    for (const element of videos) {
        console.log('Channel: ' + element.snippet.channelTitle);
        console.log('Title: ' + element.snippet.title);
        console.log('Published: ' + element.snippet.publishedAt);
        console.log('');

        var alreadyInPlaylist = await isVideoAlreadyInPlaylist(auth, element.id);

        if (alreadyInPlaylist){
            return;
        } else {
            await addVideoToPlaylist(auth, element.id);
        }
    };
}

async function isVideoAlreadyInPlaylist(auth, video) {
    var res = await SERVICE.playlistItems.list({
        auth: auth,
        part: 'id',
        playlistId: PLAYLISTID
    });

    var items = res.data.items;
    //This step may not be working.
    // This compares the playlistitemid with the videoid. Need to make sure I get the videoid from the items array.
    if (items.some(item => item.id == video.videoId)){
        console.log('Video is already in playlist');
        return true;
    };

    console.log('Video is not already in playlist');
    return false;
}

async function addVideoToPlaylist(auth, video) {
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