var Twitter = require('twitter');
var config = require('./config.js');

var youtube = require('./youtube.js');

var T = new Twitter(config);
var params = {
    screen_name: '@hermitcraft_',
    count: 20
}

T.get('statuses/user_timeline', params, function(err, data,response) {
    data.forEach(tweet => {
        if (tweet.text.toLowerCase().includes('hermitcraft')){
            var videourl = tweet.entities.urls[0].expanded_url;
            if (videourl.toLowerCase().includes('youtu.be')){
                var videoid = videourl.match(/(\.be\/)+([^\/]+)/)[2];
                youtube.addToPlaylist(videoid, 'PLebMY5JwLV0Tmi6BjfGz7_PcdaX5gom4o');
            }
        }
    });
})