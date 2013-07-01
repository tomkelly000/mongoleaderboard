/* 
 * module for maintaining a leaderboard
 */

var mongodb = require('mongojs');
var assert = require('assert');

var default_options = {
    'collection':['leaderboard'],
    'page_size':20,
    'num_pages':1,
    'start_time': { // time of day to refresh
	'milliseconds':0,
	'seconds':0,
	'minutes':0,
	'hours':0
    },
     // milliseconds leaderboard should last before resetting 
    'duration':Number.POSITIVE_INFINITY,

};

// constructor for making a new leaderboard
function LeaderBoard(dburi, _options) {

    // set the options
    this.options = default_options;
    if (_options) {
	if (_options.collection) 
	    this.options.collection = [_options.collection];
	if (_options.page_size) {
	    assert(_options.page_size > 0, 'Page size must be nonnegative');
	    this.options.page_size = _options.page_size;
	}
	if (_options.num_pages) {
	    assert(_options.num_pages > 0, 'Number of pages must be nonnegative');
	    this.options.num_pages = _options.num_pages;
	}
	if (_options.start_time) {
	    var time = _options.start_time;
	    if (time.milliseconds) {
		assert(time.milliseconds >= 0 && 
		       time.milliseconds < 1000,
		       'Invalid millisecond time');
		this.options.milliseconds = time.milliseconds;
	    }
	    if (time.seconds) {
		assert(time.seconds >= 0 && 
		       time.seconds < 1000,
		       'Invalid second time');
		this.options.seconds = time.seconds;
	    }
	    if (time.minutes) {
		assert(time.minutes >= 0 && 
		       time.minutes < 1000,
		       'Invalid minute time');
		this.options.minutes = time.minutes;
	    }
	    if (time.hours) {
		assert(time.hours >= 0 && 
		       time.hours < 1000,
		       'Invalid hour time');
		this.options.hours = time.hours;
	    }
	}
	if (_options.duration) {
	    assert(_options.duration > 0, 'Duration must be nonnegative');
	    this.options.duration = _options.duration;
	}
    }
    this.options.collection.push(this.options.collection + 'refresh');
    this.db = mongodb.connect(dburi, this.options.collection);
    this.highscores = this.db.collection(this.options.collection[0]);
    this.refresh = this.db.collection(this.options.collection[1]);
    
    this.refresh.find(null, function(er, time) {
	    if (!time || time.length == 0) {
		// first time launch
		// calculate time for next refresh
		var firstRefresh = new Date(); // starting point
		firstRefresh.setMilliseconds(options.start_time.milliseconds);
		firstRefresh.setSeconds(options.start_time.seconds);
		firstRefresh.setMinutes(options.start_time.minutes);
		firstRefresh.setHours(options.start_time.hours);
		var nextRefresh;
		if (this.options.duration === Number.POSITIVE_INFINITY) {
		    nextRefresh = Number.POSITIVE_INFINITY;
		} else {
		    var nextRefresh = firstRefresh.getTime() +
			Math.ceil(((new Date()).getTime() - firstRefresh.getTime())
				  / this.options.duration) * this.options.duration;
		}
		this.refresh.save({'nextRefresh':nextRefresh});	
	    }
	});

    // functions
    this.test = function() {
	return { 'options':this.options, 'db':this.db, 
		 'collection':this.highscores };
    }


    var limit = options.page_size * options.num_pages;

    this.refresher = function(callback) {
	var curTime = (new Date()).getTime();
	this.refresh.find({}, function(err, date) {
		date = date[0];
	if (curTime > date.nextRefresh) {
	    var nextRefresh = date.nextRefresh +
		Math.ceil((curTime - date.nextRefresh) / this.options.duration)
		* this.options.duration;
	    // update next refresh in database
	    this.refresh.update({}, {$set:{'nextRefresh':nextRefresh}});
	    // it's time to refresh
	    this.highscores.remove(callback);
	} else {
	    callback();
	}
	});
    }

    // executes the callback passing the argument true (1) 
    // if the score is a high score, otherwise
    // pass  false (0)
    this.check = function(score, callback) {
      this.refresher(function() {
	this.highscores.find().sort({score:1}, function(err, scores) {
		if (!scores || scores.length < limit) {
		    // we'll take any scores at this point!
		    callback(1);
		} else {
		    if (score > scores[0].score) {
			// larger than lowest score on leaderboard
			callback(1);
		    } else 
			callback(0);
		} 
	    });
	  });
    }

    // overwrites the lowest score on the leaderboard if the given score 
    // is larger. if the force parameter is supplied, it will overwrite
    // no matter what
    this.postHighScore = function(highscore, member, callback, force) {
	if (arguments.length <= 3) force = false;
	member.score = highscore; // set the score 
      this.refresher(function() {
	this.highscores.find().sort({score:1}, function(err, scores) {
		if (!scores || scores.length < limit) {
		    // leaderboard isn't full yet go ahead and save
		    this.highscores.save(member, {safe:true},
				    function(err, score)
				    {callback(err, score)});
		} else {
		    // overwrite lowest score unless force is supplied
		    if (highscore > scores[0].score || force) {
			this.highscores.update({_id:scores[0]._id},
					  member, {safe:true},
					  function(err, score)
					  {callback(err, score)});
		    } else {
			callback(null, member);
		    }
		}
	    });
	  });
    }

    // an alias
    this.post = this.postHighScore;

    // executes the callback on the two arguments err and scores,
    // where scores is an array of objects
    this.getHighScores = function(callback) {
      this.refresher(function() {
	this.highscores.find().sort({score:-1}, function(err, scores)
                                            {callback(err, scores)});
	  });
    }
    
    // an alias
    this.get = this.getHighScores;

    // execute the callback on only the highscores on page number page_num
    this.getPage = function(page_num, callback) {
	page_num = page_num - 1; // pages start at 1 instead of 0
	assert(page_num >= 0 && page_num < options.num_pages, 
	       'Invalid page number');
      this.refresher(function() {
	this.highscores.find().sort({score:-1}, function(err, scores) {
		if (scores) {
		    var index = page_num * options.page_size;
		    var page = scores.splice(index, options.page_size);
		    callback(err, page);
		} else {
		    callback(null, []);
		}
	    });
	  });
    }
}

module.exports = LeaderBoard; // a constructor 