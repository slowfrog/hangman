//
// (c) 2011 Laurent Vaucher
// http://www.slowfrog.com
// This file is under Apache License V2.
//
"use strict";

// Some ugly global variables
var start;
var results;

var run = function(input, output, use_workers) {
  start = new Date().getTime();
  results = [];
  var lines = input.value.split(/\n/);
  var l = 0;
  var T = parseInt(lines[l++]);
  for (var index = 1; index <= T; ++index) {
    var line = lines[l++].split(/\s/);
    var N = parseInt(line[0]);
    var M = parseInt(line[1]);
    var dic = [];
    var lists = [];
    for (var i = 0; i < N; ++i) {
      dic.push(lines[l++]);
    }
    for (i = 0; i < M; ++i) {
      lists.push(lines[l++]);
    }
    if (use_workers) {
      pool.postTask({index: index, dic: dic, lists: lists},
                    function(res) { receive_result(T, output, res) });
    } else {
      receive_result(T, output, {index: index, result: solve_case(dic, lists)});
    }
  }
};


var receive_result = function(T, output, result) {
  results[result.index] = result.result;
  for (var i = 1; i <= T; ++i) {
    if (!results[i]) {
      return;
    }
  }
  // All results have arrived
  var res = "";
  for (var i = 1; i <= T; ++i) {
    res += "Case #" + i + ": " + results[i].join(" ") + "\n";
  }
  output.value = res;
  
  var end = new Date().getTime();
  var p = document.getElementById("runtime");
  p.innerHTML = "Runtime: " + ((end - start) / 1000) + " s.";
};

var run_all = function() {
  if (!pool) {
    alert("You should create a pool first");
    return;
  }
  var input = document.getElementById("input");
  var output = document.getElementById("output");
  output.value = "";
  run(input, output, true);
};

var run_without_workers = function() {
  var input = document.getElementById("input");
  var output = document.getElementById("output");
  output.value = "";
  run(input, output, false);
};