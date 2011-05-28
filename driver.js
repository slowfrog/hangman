//
// (c) 2011 Laurent Vaucher
// http://www.slowfrog.com
// This file is under Apache License V2
//
"use strict";

var pool;

var create = function() {
  if (pool) {
    alert("Pool already exists.\nPress \"Kill\" if you want to resize it.");
  } else {
    var count_txt = document.getElementById("worker_count").value;
    var count = parseInt(count_txt);
    if (!count) {
      alert("Invalid number of workers: " + count_txt);
      return;
    }
    
    try {
      pool = new Pool(count);
    } catch (e) {
      console.log("Exception", e);
    }
  }
};

var kill = function() {
  if (!pool) {
    return;
  }
  pool.broadcastMessage({cmd: "kill"});
  pool = null;
};


var Pool = function(count) {
  var that = this;
  this.queue = [];
  this.task_id = 0;
  this.callbacks = [];

  var status = document.getElementById("status");
  
  this.workers = [];
  for (var i = 0; i < count; ++i) {
    this.workers[i] = new Worker("webwork.js");
    this.workers[i].addEventListener("message", Pool.makeMessageHandler(that, i), false);
    this.workers[i].addEventListener("error", Pool.makeErrorHandler(that, i), false);
    this.workers[i].postMessage({cmd: "set_id", id: i});


    var indic = document.createElement("div");
    indic.id = "indic" + i;
    indic.className = "worker_indicator";
    indic.innerHTML = i;
    var style = indic.style;
    status.appendChild(indic);
  }
};

Pool.makeMessageHandler = function(that, i) {
  return function(ev) { that.handleMessage(ev, i); };
}

Pool.makeErrorHandler = function(that, i) {
  return function(ev) { that.handleError(ev, i); };
}

Pool.prototype.handleMessage = function(ev, i) {
  var data = ev.data;
  if (data.cmd) {
    switch (data.cmd) {
    case "request_task":
      this.provideTask(i);
      break;

    case "busy":
      this.showBusy(i);
      break;

    case "idle":
      this.showIdle(i);
      break;

    case "task_result":
      this.receiveResults(data, i);
      break;

    case "worker_closed":
      this.closeWorker(i);
      break;
      
    default:
      console.log("Unknown command: " + data.cmd, data);
    }
    
  } else if (data.msg) {
    console.log("Message from " + i + ": ", data.msg);
  } else {
    console.log("Received from " + i, data);
  }
};

Pool.prototype.handleError = function(ev, i) {
  console.log("Error from " + i + ": ", ev);
};

Pool.prototype.broadcastMessage = function(msg) {
  for (var i = 0; i < this.workers.length; ++i) {
    this.postMessage(msg, i);
  }
};

Pool.prototype.postMessage = function(msg, i) {
  this.workers[i].postMessage(msg);
};

Pool.prototype.postTask = function(task, callback) {
  this.queue.push({task: task, callback: callback});
  if (this.queue.length == 1) {
    this.broadcastMessage({cmd: "new_task"});
  }
  this.showQueueInfo();
};

Pool.prototype.provideTask = function(i) {
  if (this.queue.length > 0) {
    console.log("#" + i + " requests task");
    var task_def = this.queue.shift();
    ++this.task_id;
    this.callbacks[this.task_id] = task_def.callback;
    this.postMessage({cmd: "start_task", id: this.task_id, task: task_def.task}, i);
    this.showQueueInfo();
  } else {
    console.log("#" + i + " no tasks available");
    this.postMessage({cmd: "no_task"}, i);
  }
};

Pool.prototype.receiveResults = function(res, i) {
  var task_id = res.id;
  if (task_id === undefined) {
    console.log("Unidentified task result from #" + i, res);
    return;
  }
  var callback = this.callbacks[task_id];
  if (callback) {
    this.callbacks[task_id] = null;
    callback.call(null, res.result);
  }
};

Pool.prototype.showQueueInfo = function() {
  console.log("Task queue: " + this.queue.length);
  var q = document.getElementById("queue");
  q.innerHTML = "" + this.queue.length;
  q.style.width = (20 * this.queue.length) + "px";
};

Pool.prototype.showBusy = function(i) {
  this.setColor(i, "red");
};

Pool.prototype.showIdle = function(i) {
  this.setColor(i, "#0c0");
};

Pool.prototype.setColor = function(i, color) {
  document.getElementById("indic" + i).style.backgroundColor = color;
};

Pool.prototype.closeWorker = function(i) {
  var div = document.getElementById("indic" + i);
  div.parentNode.removeChild(div);
};
