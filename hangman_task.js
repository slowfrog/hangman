//
// (c) 2011 Laurent Vaucher
// http://www.slowfrog.com
// This file is under Apache License V2.
//
"use strict";

var play_letter = function(state, word, l) {
  var ret = "";
  var lose = true;
  for (var i = 0; i < state.length; ++i) {
    if (word[i] == l) {
      ret += l;
      lose = false;
    } else {
      ret += state[i];
    }
  }
  return {state: ret, lose: lose};
};

var playable = function(dic, l) {
  for (var i = 0; i < dic.length; ++i) {
    if (dic[i].indexOf(l) >= 0) {
      return true;
    }
  }
  return false;
};

var next_letter = function(dic, lis) {
  for (var i = 0; i < lis.length; ++i) {
    var l = lis.charAt(i);
    if (playable(dic, l)) {
      return {letter: l, next_letters: lis.substring(i + 1)};
    }
  }
};

var is_empty = function(obj) {
  for (var k in obj) {
    return false;
  }
  return true;
};

var solve = function(dic, lis) {
  var wordpos = {};
  var status = {};
  for (var i = 0; i < dic.length; ++i) {
    var w = dic[i];
    var state = "__________".substring(0, w.length);
    if (!status[state]) {
      status[state] = {score: 0, letters: lis, words: [w]};
    } else {
      status[state].words.push(w);
    }
    wordpos[w] = i;
  }

  var maxscore = -1;
  var maxword = "";
  while (!is_empty(status)) {
    var new_status = {};
    for (state in status) {
      var obj = status[state];
      if (obj.words.length == 1) {
        if ((obj.score > maxscore) ||
            ((obj.score == maxscore) && (wordpos[obj.words[0]] < wordpos[maxword]))) {
          maxscore = obj.score;
          maxword = obj.words[0];
        }
      } else {
        var tmp = next_letter(obj.words, obj.letters);
        for (i = 0; i < obj.words.length; ++i) {
          w = obj.words[i];
          var tmp2 = play_letter(state, w, tmp.letter);
          if (!new_status[tmp2.state]) {
            new_status[tmp2.state] = {score: obj.score + (tmp2.lose ? 1 : 0),
                                      letters: tmp.next_letters,
                                      words: [w]};
          } else {
            new_status[tmp2.state].words.push(w);
          }
        }
      }
    }

    status = new_status;
  }
  
  return maxword;
};

var solve_case = function(dic, lis) {
  var ret = [];
  for (var i = 0; i < lis.length; ++i) {
    ret.push(solve(dic, lis[i]));
  }
  return ret;
};
