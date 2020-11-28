var iothub = require('azure-iothub');
var Message = require('azure-iot-device').Message;


const connectionString = process.env.IOT_CONNECTION_STRING || "";
const registry = iothub.Registry.fromConnectionString(connectionString);
const client = iothub.Client.fromConnectionString(connectionString);

function registerIfNotExists(device) {
    if(!connectionString) return;
    var iotDevice = {
        deviceId: getDeviceId(device.deviceId)
    };
    var device = registry.get(iotDevice.deviceId, (err, result) => {        
        if(err && err.name == "DeviceNotFoundError"){
            registry.create(iotDevice, function(err, deviceInfo, res) {
                });   
        }
    });
 
  }
function getDeviceId(deviceId){
    return 'NUCLEO_PLUG_'+deviceId;
}
  function log(deviceId, logEntry){
    if(!connectionString) return;
    var buf = Buffer.from(JSON.stringify(logEntry));
    client.send(getDeviceId(deviceId), new Message(buf));
  }

  
module.exports = {
    registerIfNotExists: registerIfNotExists,
    log: log 
  }
  