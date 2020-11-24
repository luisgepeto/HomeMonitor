const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const dataBroadcaster = require('./data-broadcaster');
const { DateTime } = require('luxon');
const glob = require('glob');

let logDirPath;
let logIntervalMs;

loadLogConfig();

function loadLogConfig() {
  logDirPath = process.env.LOG_DIR_PATH || '.';
  logIntervalMs = (process.env.LOG_INTERVAL_SECONDS || 60 )* 1000;
}

function startLogging(device) {
  setInterval(() => { log(device); }, logIntervalMs);
  console.log('Logging started for ' + device.alias + ' [' + device.deviceId + '] every ' + (logIntervalMs/1000) + ' seconds');
}

function writeLog(filePath, log) {
  try {
    // Switched to sync write for now. TODO investigate issue from PR #19
    fs.writeFileSync(filePath, JSON.stringify(log), { flag: 'w' });
  }
  catch (err) {
    console.warn('Error writing log for ' + device.alias + ' [' + device.deviceId + ']', err);
  }
}

function getLogEntriesForList(filePaths, callback) {
  let logs = [];
  filePaths.forEach(filePath => {
    var hasError = false;
    try{
      var contents = fs.accessSync(filePath,fs.constants.F_OK);
    }
    catch(err){
      hasError = true;
      writeLog(filePath, []);
    }
    
    if(!hasError){
      hasError= false;
      try{
        contents = fs.readFileSync(filePath, 'utf8');
      }
      catch(err){
        hasError = true;
        console.warn('Error reading usage log ' + filePath, err);            
      }

      if(!hasError){
        var parsedData = JSON.parse(contents);
        console.log('appending data', parsedData);
        logs = logs.concat(parsedData);            
      }      
    }
  });  
  callback(logs);
}

function getLogEntries(filePath, callback) {

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if(err) {
      // No log file, init empty one
      writeLog(filePath, []);
      callback([]);
    }
    else {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.warn('Error reading usage log ' + filePath, err);
          callback([]);
        }
        else {
          callback(JSON.parse(data));
        }
      });
    }
  });
}

function log(device) {

  device.emeter.getRealtime().then(response => {

    let logEntry = {
      ts: Date.now(),
      pw: (('power_mw' in response) ? (response.power_mw / 1000) : response.power)
    }

    let filePath = getLogPath(device.deviceId);

    getLogEntries(filePath, (entries) => {
      entries.push(logEntry);      
      writeLog(filePath, entries);
      dataBroadcaster.broadcastNewLogEntry(device.deviceId, logEntry);
    })

  });
}

function getLogPath(deviceId) {
  var currentDate = DateTime.local().toFormat('yyyyMMdd');
  return path.join(logDirPath, deviceId + '_'+currentDate+'_log.json');
}

function getAllLogPaths(deviceId){  
  var searchPattern = path.join(logDirPath, deviceId + '_*_log.json');
  var foundFiles = glob.sync(searchPattern);
  return foundFiles;
}

function getLogEntriesForDevice(deviceId, callback) {  
  return getLogEntriesForList(getAllLogPaths(deviceId), callback);
}

module.exports = {
  startLogging: startLogging,
  log: log,
  getLogEntriesForDevice: getLogEntriesForDevice
}
