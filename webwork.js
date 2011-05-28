//
// (c) 2011 Laurent Vaucher
// http://www.slowfrog.com
// This file is under Apache License V2.
//
importScripts("hangman_task.js");

var Slave = function() {
  this.request_pending = false;
};


var slave = new Slave();

self.addEventListener('message', function(e) { slave.handleMessage(e); }, false);

Slave.prototype.postMessage = function(msg) {
  self.postMessage(msg);
};

Slave.prototype.postText = function(msg) {
  this.postMessage({msg: msg});
};

Slave.prototype.postCommand = function(cmd, args) {
  this.postMessage({cmd: cmd, args: args});
};


Slave.prototype.handleMessage = function(e) {
  var data = e.data;
  if (data.cmd === undefined) {
    this.postText("#" + this.id + " Unknown message: " + data);
    return;
  }
  switch (data.cmd) {
  case "set_id":
    this.id = data.id;
    this.postText("Slave #" + this.id + " allocated");
    break;
    
  case "new_task":
    this.requestTask();
    break;

  case "start_task":
    this.doTask(data);
    break;

  case "no_task":
    this.noTask();
    break;

  case "kill":
    this.postCommand("worker_closed");
    self.close();
    break;
    
  default:
    this.postText("#" + this.id + " Unknown command: " + data.cmd);
  }
};

Slave.prototype.requestTask = function() {
  if (!this.request_pending) {
    this.request_pending = true;
    this.postCommand("request_task");
  }
};

Slave.prototype.setBusy = function(busy) {
  this.postCommand(busy ? "busy" : "idle");
  if (!busy) {
    this.requestTask();
  }
};
  

Slave.prototype.doTask = function(task) {
  this.request_pending = false;
  
  // might use task object
  this.setBusy(true);
  var id = task.id;
  var cas = task.task;
  var res = solve_case(cas.dic, cas.lists);
  this.postMessage({cmd: "task_result", id: id, result: {index: cas.index, result: res}});
  this.setBusy(false);

  this.requestTask();
};

Slave.prototype.noTask = function() {
  this.request_pending = false;
};
