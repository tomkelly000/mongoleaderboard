# mongoleaderboard

A node.js module for implementing a simple leaderboard with mongodb

## Usage

``` js
var Leaderboard = require('mongoleaderboard');
var mongoUri = 'mongodb://localhost/mydb';
var leaderboard = new Leaderboard(mongoUri);
```

You can also specify options
``` js
var options = {};
// specify a leaderboard at collection named highscores
// with page sizes of 5, 2 pages, that refreshes daily at 5:00
options.collection = 'highscores'; // defaults to 'leaderboard'
options.page_size = 5; // defaults to 20
options.num_pages = 2; // defaults to 1
options.start_time = { // time of day to refresh
        'milliseconds':0,
        'seconds':0,
        'minutes':0,
        'hours':5
    }; // defaults to midnight
options.duration = 1000 * 60 * 60 * 24; // time in milliseconds
var leaderboard = new Leaderboard(mongoUri, options);
```

## API
``` js
// executes the callback passing the argument true (1) 
// if the score is a high score, otherwise pass  false (0)
leaderboard.check(score, callback);

// overwrites the lowest score on the leaderboard if the given score 
// is larger. if the force parameter is supplied, it will overwrite
// no matter what. member is an object with the other info a highscore needs
// e.g. member = {'initials':'TJK'}
// executes the callback with two arguments, err and the saved member object
leaderboard.postHighScore(highscore, member, callback, force);
// also aliased as
leaderboard.post(highscore, member, callback, force);

// executes the callback on the two arguments err and scores,
// where scores is an array of objects
leaderboard.getHighScores(callback)
```



