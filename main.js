const bleServiceGuid = '19b10000-e8f2-537e-4f6c-d104768a1214';
const temperatureSensorCharacteristicGuid = '19b10001-e8f2-537e-4f6c-d104768a1214';
const heatingToggleCharacteristicGuid = '19b10002-e8f2-537e-4f6c-d104768a1214';
const powerDropCharacteristicGuid = '19b10003-e8f2-537e-4f6c-d104768a1214';

let bleService;


const devicesContainerElement = document.getElementById("connectedDevicesContainer")
const addNewDeviceButton = document.getElementById("addNewDeviceButton");

const connectedDeviceTemplate = document.getElementById('connected-device-template').content;

addNewDeviceButton.addEventListener("click", () => addConnectedDevice(devicesContainerElement));

function tryAddNewDevice() {
    if (!isWebBluetoothEnabled()){
        return null;
    }
    
    return connectToDevice();
}

function isWebBluetoothEnabled() {
    if (!navigator.bluetooth) {
        console.log('Web Bluetooth API is not available in this browser!');
        bleStateContainer.innerHTML = "Web Bluetooth API is not available in this browser/device!";
        return false
    }
    console.log('Web Bluetooth API supported in this browser.');
    return true
}

function connectToDevice(){
    console.log('Initializing Bluetooth...');
    navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        // filters: [{name: deviceName}],
        optionalServices: [bleService]
    })
        .then(gattServer => {
            addConnectedDevice(gattServer);
            return gattServer;
        })
        .then(gattServer =>{
            console.log("Connected to GATT Server");
            return gattServer.getPrimaryService(bleServiceGuid);
        })
        .then(service =>{
            bleService = service;
            console.log("Service discovered:", service.uuid);
            
            return Promise.all
            (
                () => connectTemperatureSensorCharacteristic(service)
            );
        })
        .then(characteristicInitResults => {
            
        })
        .catch(error => {
            console.log('Error: ', error);
        })
}

function addConnectedDevice(bleServer): DocumentFragment {
    const clone = document.importNode(connectedDeviceTemplate, true);
    devicesContainerElement.appendChild(clone);
}

function connectTemperatureSensorCharacteristic(service){
    service.getCharacteristic(temperatureSensorCharacteristicGuid)
        .then(characteristic => {
            console.log("Characteristic discovered:", characteristic.uuid);
            characteristic.addEventListener('characteristicvaluechanged', handleTemperatureSensorUpdate);
            characteristic.startNotifications();
            console.log("Notifications Started.");
            return characteristic.readValue();
        })
}

function handleTemperatureSensorUpdate(event) {
    const newValueReceived = new TextDecoder().decode(event.target.value);
    console.log("Temperature sensor value changed: ", newValueReceived);
    retrievedValue.innerHTML = newValueReceived + "°C";
    timestampContainer.innerHTML = getDateTime();
}


function getDateTime() {
    const currentDate = new Date();
    const day = ("00" + currentDate.getDate()).slice(-2); // Convert day to string and slice
    const month = ("00" + (currentDate.getMonth() + 1)).slice(-2);
    const year = currentDate.getFullYear();
    const hours = ("00" + currentDate.getHours()).slice(-2);
    const minutes = ("00" + currentDate.getMinutes()).slice(-2);
    const seconds = ("00" + currentDate.getSeconds()).slice(-2);

    return day + "/" + month + "/" + year + " at " + hours + ":" + minutes + ":" + seconds;
}